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


# ==========================================================
# RESULT STRUCTURE
# ==========================================================

@dataclass
class PredictionResult:
    predicted_number: int
    model_key: str
    confidence: float


# ==========================================================
# SINGLE MODEL ENGINE (75-FEATURE COMPATIBLE)
# ==========================================================

class SignNumberInference:

    def __init__(self, model_path: Path):

        self.mp_hands = mp.solutions.hands

        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5,
        )

        payload = joblib.load(model_path)

        if isinstance(payload, dict):
            self.model = payload["model"]
            self.scaler = payload["scaler"]
            self.label_encoder = payload["label_encoder"]
            self.feature_names = payload["feature_names"]
        else:
            self.model, self.scaler, self.label_encoder, self.feature_names = payload[:4]

    # ======================================================
    # LANDMARK EXTRACTION
    # ======================================================

    def extract_landmarks(self, frame: np.ndarray) -> list[float] | None:

        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(image)

        if not results.multi_hand_landmarks:
            return None

        hand = results.multi_hand_landmarks[0]

        return [
            coord
            for lm in hand.landmark
            for coord in (lm.x, lm.y, lm.z)
        ]

    # ======================================================
    # TEMPORAL STABILITY
    # ======================================================

    def extract_landmarks_from_frames(
        self,
        frames: list[np.ndarray]
    ) -> list[list[float]]:

        processed = []
        previous = None
        valid_count = 0

        for frame in frames:

            landmarks = self.extract_landmarks(frame)

            if landmarks is not None:
                valid_count += 1

            if landmarks is None:
                landmarks = previous if previous is not None else [0.0] * 63

            # smoothing for motion stability
            if previous is not None:
                landmarks = [
                    p * 0.7 + c * 0.3
                    for p, c in zip(previous, landmarks)
                ]

            processed.append(landmarks)
            previous = landmarks

        return processed, valid_count

    # ======================================================
    # PREDICTION PIPELINE
    # ======================================================

    def predict_from_frames(
        self,
        frames: list[np.ndarray]
    ) -> tuple[int | None, float]:

        landmarks_seq, valid_count = self.extract_landmarks_from_frames(frames)

        if not landmarks_seq:
            return None, 0.0

        # reject poor-quality video
        if valid_count < max(5, int(len(frames) * 0.3)):
            return None, 0.0

        base_cols = self.feature_names[:-12]

        df = pd.DataFrame(landmarks_seq, columns=base_cols)

        # statistical features (same training pipeline)
        for axis in ("x", "y", "z"):

            cols = [c for c in df.columns if c.endswith(f"_{axis}")]

            df[f"mean_{axis}"] = df[cols].mean(axis=1)
            df[f"std_{axis}"] = df[cols].std(axis=1).fillna(0)
            df[f"max_{axis}"] = df[cols].max(axis=1)
            df[f"min_{axis}"] = df[cols].min(axis=1)

        df = df[self.feature_names]

        X = self.scaler.transform(df)

        preds = self.model.predict(X)
        labels = self.label_encoder.inverse_transform(preds)

        # weighted majority voting
        vote_scores = {}

        for label in labels:
            vote_scores[label] = vote_scores.get(label, 0) + 1

        best_label = int(max(vote_scores, key=vote_scores.get))

        confidence = self._confidence(X)

        return best_label, confidence

    # ======================================================
    # CONFIDENCE
    # ======================================================

    def _confidence(self, X: np.ndarray) -> float:

        try:
            if hasattr(self.model, "predict_proba"):

                probs = self.model.predict_proba(X)

                frame_conf = np.max(probs, axis=1)

                return float(np.mean(frame_conf))

            if hasattr(self.model, "decision_function"):

                scores = np.abs(self.model.decision_function(X))

                return float(
                    np.mean(scores) / (np.max(scores) + 1e-6)
                )

        except Exception:
            pass

        return 0.70


# ==========================================================
# MULTI-MODEL MANAGER
# ==========================================================

class InferenceManager:

    MODEL_FILES = {
        "0-9": "0-9_numbers_svm_model.joblib",
        "10-19": "10-19_numbers_svm_model.joblib",
        "20-29": "20-29_numbers_svm_model.joblib",
        "30-39": "30-39_numbers_svm_model.joblib",
        "40-50": "40-50_numbers_svm_model.joblib",
    }

    SAMPLE_FPS = 10

    def __init__(self, models_dir: Path):

        self.models = {}

        for key, file in self.MODEL_FILES.items():

            path = models_dir / file

            if not path.exists():
                raise FileNotFoundError(f"Missing model: {path}")

            self.models[key] = SignNumberInference(path)

    # ======================================================
    # VIDEO DECODER
    # ======================================================

    @staticmethod
    def decode_base64_video(video_base64: str) -> list[np.ndarray]:

        payload = video_base64.split(",", 1)[1] if "," in video_base64 else video_base64

        try:
            video_bytes = base64.b64decode(payload)
        except Exception:
            return []

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(video_bytes)
            path = tmp.name

        cap = cv2.VideoCapture(path)

        if not cap.isOpened():
            return []

        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 30

        step = max(1, round(fps / InferenceManager.SAMPLE_FPS))

        frames = []
        i = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if i % step == 0:
                frames.append(frame)

            i += 1

        cap.release()
        Path(path).unlink(missing_ok=True)

        return frames

    # ======================================================
    # RANGE VALIDATION
    # ======================================================

    def is_valid_range(self, model_key: str, number: int) -> bool:

        if model_key == "0-9":
            return 0 <= number <= 9
        if model_key == "10-19":
            return 10 <= number <= 19
        if model_key == "20-29":
            return 20 <= number <= 29
        if model_key == "30-39":
            return 30 <= number <= 39
        if model_key == "40-50":
            return 40 <= number <= 50

        return False

    # ======================================================
    # MAIN PREDICTION
    # ======================================================

    def predict_video(self, video_base64: str) -> PredictionResult | None:

        frames = self.decode_base64_video(video_base64)

        if len(frames) < 10:
            return None

        results = []

        for key, model in self.models.items():

            try:
                pred, conf = model.predict_from_frames(frames)

                if pred is None:
                    continue

                # penalize wrong range predictions
                if not self.is_valid_range(key, pred):
                    conf *= 0.5

                results.append(
                    PredictionResult(
                        predicted_number=pred,
                        model_key=key,
                        confidence=conf,
                    )
                )

            except Exception as e:
                print(f"[ERROR] {key}: {e}")

        if not results:
            return None

        # confidence filtering
        results = [r for r in results if r.confidence >= 0.55]

        if not results:
            return None

        # final selection
        return max(results, key=lambda x: x.confidence)