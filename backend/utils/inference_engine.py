from __future__ import annotations

import base64
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
    """Inference pipeline for the sign language number models."""

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

    def extract_landmarks(self, frame: np.ndarray) -> list[float] | None:
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(image)
        if not results.multi_hand_landmarks:
            return None

        landmarks = results.multi_hand_landmarks[0]
        coords: list[float] = []
        for landmark in landmarks.landmark:
            coords.extend([landmark.x, landmark.y, landmark.z])
        return coords

    def predict_from_landmarks_batch(self, frames_data: list[list[float]]) -> tuple[int | None, float]:
        if not frames_data:
            return None, 0.0

        df = pd.DataFrame(frames_data, columns=self.feature_names[:-12])
        for coord in ("x", "y", "z"):
            coord_cols = [col for col in df.columns if col.endswith(f"_{coord}")]
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

    def _prediction_confidence(
        self, X_scaled: np.ndarray, labels: np.ndarray, best_label: int, counts: np.ndarray
    ) -> float:
        # Prefer probability confidence when available (e.g., calibrated SVM),
        # because majority-vote confidence is not meaningful for single-frame input.
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

        # Fallback for models exposing decision_function but not probabilities.
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

    def predict_from_frame(self, frame: np.ndarray) -> tuple[int | None, float]:
        landmarks = self.extract_landmarks(frame)
        if landmarks is None:
            return None, 0.0
        return self.predict_from_landmarks_batch([landmarks])


class InferenceManager:
    MODEL_FILES = {
        "0-9": "0-9_numbers_svm_model.joblib",
        "10-19": "10-19_numbers_svm_model.joblib",
        "20-29": "20-29_numbers_svm_model.joblib",
        "30-39": "30-39_numbers_svm_model.joblib",
        "40-50": "40-50_numbers_svm_model.joblib",
    }

    def __init__(self, models_dir: Path):
        self.models: dict[str, SignNumberInference] = {}
        for model_key, filename in self.MODEL_FILES.items():
            model_path = models_dir / filename
            if not model_path.exists():
                raise FileNotFoundError(f"Missing model for {model_key}: {model_path}")
            self.models[model_key] = SignNumberInference(model_path)

    @staticmethod
    def decode_base64_frame(frame_base64: str) -> np.ndarray | None:
        payload = frame_base64.split(",", 1)[1] if "," in frame_base64 else frame_base64
        try:
            frame_bytes = base64.b64decode(payload)
        except Exception:
            return None
        np_buffer = np.frombuffer(frame_bytes, np.uint8)
        return cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)

    @staticmethod
    def model_key_for_number(number: int) -> str:
        if 0 <= number <= 9:
            return "0-9"
        if 10 <= number <= 19:
            return "10-19"
        if 20 <= number <= 29:
            return "20-29"
        if 30 <= number <= 39:
            return "30-39"
        if 40 <= number <= 50:
            return "40-50"
        raise ValueError("Number outside supported range 0-50")

    @staticmethod
    def model_key_range(model_key: str) -> tuple[int, int]:
        try:
            low, high = model_key.split("-", maxsplit=1)
            return int(low), int(high)
        except Exception as exc:
            raise ValueError(f"Invalid model range key: {model_key}") from exc

    def predict_frame(self, frame_base64: str, model_key: str = "auto") -> PredictionResult | None:
        frame = self.decode_base64_frame(frame_base64)
        if frame is None:
            return None

        if model_key != "auto":
            model = self.models.get(model_key)
            if model is None:
                raise ValueError("Invalid model range selected.")
            predicted, confidence = model.predict_from_frame(frame)
            if predicted is None:
                return None
            return PredictionResult(predicted_number=predicted, model_key=model_key, confidence=confidence)

        candidates: list[PredictionResult] = []
        for key, model in self.models.items():
            predicted, confidence = model.predict_from_frame(frame)
            if predicted is None:
                continue
            low, high = self.model_key_range(key)
            if not (low <= predicted <= high):
                # Guardrail against cross-range drift when evaluating all models in auto mode.
                continue
            candidates.append(PredictionResult(predicted_number=predicted, model_key=key, confidence=confidence))

        if not candidates:
            return None
        return max(candidates, key=lambda item: item.confidence)
