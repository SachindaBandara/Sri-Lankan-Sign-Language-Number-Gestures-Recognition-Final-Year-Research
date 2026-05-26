from __future__ import annotations

import base64
import tempfile
from dataclasses import dataclass
from pathlib import Path

import cv2
import joblib
import mediapipe as mp
import numpy as np
import pandas as pd


@dataclass
class PredictionResult:
    predicted_number: int
    model_key: str
    confidence: float


class SignNumberInference:
    """Inference pipeline for a single sign-language number model."""

    def __init__(self, model_path: Path):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5,
        )
        payload = joblib.load(model_path)
        if isinstance(payload, dict):
            self.model = payload["model"]
            self.scaler = payload["scaler"]
            self.label_encoder = payload["label_encoder"]
            self.feature_names = payload["feature_names"]
        elif isinstance(payload, (list, tuple)) and len(payload) >= 4:
            self.model, self.scaler, self.label_encoder, self.feature_names = payload[:4]
        else:
            raise ValueError(f"Unsupported model payload format in {model_path}")

    # ------------------------------------------------------------------
    # Landmark extraction
    # ------------------------------------------------------------------

    def extract_landmarks(self, frame: np.ndarray) -> list[float] | None:
        """Return 63 landmark floats (x, y, z) × 21 for the first detected hand."""
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(image)
        if not results.multi_hand_landmarks:
            return None
        landmarks = results.multi_hand_landmarks[0]
        coords: list[float] = []
        for lm in landmarks.landmark:
            coords.extend([lm.x, lm.y, lm.z])
        return coords

    def extract_landmarks_from_frames(self, frames: list[np.ndarray]) -> list[list[float]]:
        """Extract landmarks from every frame; silently skip frames with no hand."""
        return [lm for frame in frames if (lm := self.extract_landmarks(frame)) is not None]

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------

    def predict_from_landmarks_batch(self, frames_data: list[list[float]]) -> tuple[int | None, float]:
        """Majority-vote across all landmark rows; return (label, confidence)."""
        if not frames_data:
            return None, 0.0

        base_cols = self.feature_names[:-12]
        df = pd.DataFrame(frames_data, columns=base_cols)

        for coord in ("x", "y", "z"):
            coord_cols = [c for c in df.columns if c.endswith(f"_{coord}")]
            df[f"mean_{coord}"] = df[coord_cols].mean(axis=1)
            df[f"std_{coord}"] = df[coord_cols].std(axis=1).fillna(0.0)
            df[f"max_{coord}"] = df[coord_cols].max(axis=1)
            df[f"min_{coord}"] = df[coord_cols].min(axis=1)

        df = df[self.feature_names]
        X_scaled = self.scaler.transform(df)
        predictions = self.model.predict(X_scaled)
        labels = self.label_encoder.inverse_transform(predictions)
        unique_preds, counts = np.unique(labels, return_counts=True)
        best_label = int(unique_preds[np.argmax(counts)])
        confidence = self._prediction_confidence(X_scaled, labels, best_label, counts)
        return best_label, confidence

    def predict_from_frames(self, frames: list[np.ndarray]) -> tuple[int | None, float]:
        """High-level helper: extract landmarks then batch-predict."""
        frames_data = self.extract_landmarks_from_frames(frames)
        return self.predict_from_landmarks_batch(frames_data)

    # ------------------------------------------------------------------
    # Confidence helpers
    # ------------------------------------------------------------------

    def _prediction_confidence(
        self,
        X_scaled: np.ndarray,
        labels: np.ndarray,
        best_label: int,
        counts: np.ndarray,
    ) -> float:
        if hasattr(self.model, "predict_proba"):
            try:
                probabilities = self.model.predict_proba(X_scaled)
                best_class_idx = np.argmax(probabilities, axis=1)
                best_class_labels = self.label_encoder.inverse_transform(best_class_idx)
                matched = best_class_labels == best_label
                if np.any(matched):
                    return float(np.mean(probabilities[matched, best_class_idx[matched]]))
                return float(np.max(probabilities))
            except Exception:
                pass

        if hasattr(self.model, "decision_function"):
            try:
                scores = self.model.decision_function(X_scaled)
                if isinstance(scores, np.ndarray) and scores.ndim == 1:
                    probs = 1.0 / (1.0 + np.exp(-np.abs(scores)))
                    return float(np.mean(probs))
                if isinstance(scores, np.ndarray) and scores.ndim == 2:
                    exp_scores = np.exp(scores - np.max(scores, axis=1, keepdims=True))
                    softmax = exp_scores / np.sum(exp_scores, axis=1, keepdims=True)
                    return float(np.mean(np.max(softmax, axis=1)))
            except Exception:
                pass

        return float(np.max(counts) / len(labels))


class InferenceManager:
    """Loads all models and orchestrates multi-model prediction from a 5-second video."""

    MODEL_FILES = {
        "0-9": "0-9_numbers_svm_model.joblib",
        "10-19": "10-19_numbers_svm_model.joblib",
        "20-29": "20-29_numbers_svm_model.joblib",
        "30-39": "30-39_numbers_svm_model.joblib",
        "40-50": "40-50_numbers_svm_model.joblib",
    }

    # Target sample rate when decoding the uploaded video.
    # 5 s × 6 fps = 30 frames — enough for stable majority-vote without being slow.
    SAMPLE_FPS = 6

    def __init__(self, models_dir: Path):
        self.models: dict[str, SignNumberInference] = {}
        for model_key, filename in self.MODEL_FILES.items():
            model_path = models_dir / filename
            if not model_path.exists():
                raise FileNotFoundError(f"Missing model for {model_key}: {model_path}")
            self.models[model_key] = SignNumberInference(model_path)

    # ------------------------------------------------------------------
    # Video decoding
    # ------------------------------------------------------------------

    @staticmethod
    def decode_base64_video(video_base64: str) -> list[np.ndarray]:
        """
        Decode a base64-encoded video (any format OpenCV supports) and return
        frames sampled at SAMPLE_FPS.  Returns an empty list on failure.
        """
        payload = video_base64.split(",", 1)[1] if "," in video_base64 else video_base64
        try:
            video_bytes = base64.b64decode(payload)
        except Exception:
            return []

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            return []

        source_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        step = max(1, round(source_fps / InferenceManager.SAMPLE_FPS))

        frames: list[np.ndarray] = []
        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % step == 0:
                frames.append(frame)
            frame_idx += 1

        cap.release()
        Path(tmp_path).unlink(missing_ok=True)
        return frames

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------

    def predict_video(self, video_base64: str) -> PredictionResult | None:
        """
        Decode the 5-second video, run every model over the same frame set,
        and return the PredictionResult with the highest confidence.
        No range filtering is applied — each model competes purely on confidence.
        """
        frames = self.decode_base64_video(video_base64)
        if not frames:
            return None

        candidates: list[PredictionResult] = []
        for key, model in self.models.items():
            predicted, confidence = model.predict_from_frames(frames)
            if predicted is None:
                continue
            candidates.append(
                PredictionResult(
                    predicted_number=predicted,
                    model_key=key,
                    confidence=confidence,
                )
            )

        if not candidates:
            return None

        return max(candidates, key=lambda r: r.confidence)