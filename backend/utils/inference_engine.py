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
# SINGLE MODEL ENGINE (RF PRODUCTION FIX)
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

        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.feature_names = None

        # ---------------- SAFE LOAD ----------------
        if isinstance(payload, dict):
            self.model = (
                payload.get("model")
                or payload.get("rf_model")
                or payload.get("classifier")
            )
            self.scaler = payload.get("scaler")
            self.label_encoder = payload.get("label_encoder")
            self.feature_names = payload.get("feature_names")

        elif isinstance(payload, (list, tuple)):
            self.model = payload[0]
            self.scaler = payload[1] if len(payload) > 1 else None
            self.label_encoder = payload[2] if len(payload) > 2 else None
            self.feature_names = payload[3] if len(payload) > 3 else None

        else:
            self.model = payload

        if self.model is None:
            raise ValueError("Model loading failed")

    # ======================================================
    # LANDMARK EXTRACTION
    # ======================================================

    def extract_landmarks(self, frame):

        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(image)

        if not results.multi_hand_landmarks:
            return None

        hand = results.multi_hand_landmarks[0]

        return [v for lm in hand.landmark for v in (lm.x, lm.y, lm.z)]

    # ======================================================
    # TEMPORAL STABILITY
    # ======================================================

    def extract_landmarks_from_frames(self, frames):

        processed = []
        previous = None
        valid_count = 0

        for frame in frames:

            landmarks = self.extract_landmarks(frame)

            if landmarks is not None:
                valid_count += 1

            if landmarks is None:
                landmarks = previous if previous is not None else [0.0] * 63

            if previous is not None:
                landmarks = [
                    p * 0.7 + c * 0.3
                    for p, c in zip(previous, landmarks)
                ]

            processed.append(landmarks)
            previous = landmarks

        return processed, valid_count

    # ======================================================
    # FEATURE ENGINEERING (CRITICAL FIX)
    # ======================================================

    def build_features(self, seq):

        if self.feature_names:
            base_cols = self.feature_names[:63]
        else:
            base_cols = [f"f{i}" for i in range(63)]

        df = pd.DataFrame(seq, columns=base_cols)

        for axis in ("x", "y", "z"):

            cols = [c for c in df.columns if c.endswith(f"_{axis}")]

            if cols:
                df[f"mean_{axis}"] = df[cols].mean(axis=1)
                df[f"std_{axis}"] = df[cols].std(axis=1).fillna(0)
                df[f"max_{axis}"] = df[cols].max(axis=1)
                df[f"min_{axis}"] = df[cols].min(axis=1)

        # 🔥 CRITICAL FIX: enforce exact feature order
        if self.feature_names:
            df = df.reindex(columns=self.feature_names, fill_value=0)

        return df

    # ======================================================
    # PREDICTION
    # ======================================================

    def predict_from_frames(self, frames):

        seq, valid = self.extract_landmarks_from_frames(frames)

        if len(seq) < 5 or valid < 3:
            return None, 0.0

        X_df = self.build_features(seq)

        X = X_df

        if self.scaler is not None:
            X_scaled = self.scaler.transform(X_df)
            X = pd.DataFrame(
                X_scaled,
                columns=X_df.columns
            )

    # --------------------------------------------------
    # Aggregate probabilities over all frames
    # --------------------------------------------------

        if hasattr(self.model, "predict_proba"):

            probs = self.model.predict_proba(X)

            avg_probs = probs.mean(axis=0)

            best_idx = np.argmax(avg_probs)

            confidence = float(avg_probs[best_idx])

            pred = self.model.classes_[best_idx]

            if self.label_encoder is not None:
                pred = self.label_encoder.inverse_transform([pred])[0]

            return int(pred), confidence

    # --------------------------------------------------
    # Fallback
    # --------------------------------------------------

        preds = self.model.predict(X)

        if self.label_encoder is not None:
            preds = self.label_encoder.inverse_transform(preds)

        unique, counts = np.unique(preds, return_counts=True)

        best_label = int(unique[np.argmax(counts)])

        confidence = counts.max() / counts.sum()

        return best_label, float(confidence)

    # ======================================================
    # CONFIDENCE (RF FIXED)
    # ======================================================

    def _confidence(self, X):

        try:

            if hasattr(self.model, "predict_proba"):

                probs = self.model.predict_proba(X)

                avg_probs = probs.mean(axis=0)

                return float(np.max(avg_probs))

        except Exception:
            pass

        return 0.70


# ==========================================================
# MULTI-MODEL MANAGER
# ==========================================================

class InferenceManager:

    MODEL_FILES = {
        "0-9": "0-9_numbers_rf_model.joblib",
        "10-19": "10-19_numbers_rf_model.joblib",
        "20-29": "20-29_numbers_rf_model.joblib",
        "30-39": "30-39_numbers_rf_model.joblib",
        "40-50": "40-50_numbers_rf_model.joblib",
    }

    SAMPLE_FPS = 10

    def __init__(self, models_dir: Path):

        self.models = {}

        for key, file in self.MODEL_FILES.items():

            path = models_dir / file

            if not path.exists():
                raise FileNotFoundError(path)

            self.models[key] = SignNumberInference(path)

    @staticmethod
    def prediction_belongs_to_model(pred, model_key):

        ranges = {
            "0-9": (0, 9),
            "10-19": (10, 19),
            "20-29": (20, 29),
            "30-39": (30, 39),
            "40-50": (40, 50),
        }

        low, high = ranges[model_key]

        return low <= pred <= high

    # ======================================================
    # VIDEO DECODER
    # ======================================================

    @staticmethod
    def decode_base64_video(video_base64):

        payload = video_base64.split(",", 1)[1] if "," in video_base64 else video_base64
        video_bytes = base64.b64decode(payload)

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(video_bytes)
            path = tmp.name

        cap = cv2.VideoCapture(path)

        frames = []
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        step = max(1, round(fps / InferenceManager.SAMPLE_FPS))

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
    # MAIN PREDICTION
    # ======================================================

    def predict_video(self, video_base64):

        frames = self.decode_base64_video(video_base64)

        if len(frames) < 10:
            return None

        results = []

        for key, model in self.models.items():

            try:

                pred, conf = model.predict_from_frames(frames)

                if pred is None:
                    continue

                if not self.prediction_belongs_to_model(pred, key):
                    continue

                results.append(
                    PredictionResult(
                        predicted_number=int(pred),
                        model_key=key,
                        confidence=float(conf),
                    )
                )

            except Exception as e:
                print(f"[ERROR] {key}: {e}")

        if not results:
            return None

        results.sort(
            key=lambda r: r.confidence,
            reverse=True
        )

        print("\n===== MODEL RESULTS =====")

        for r in results:
            print(
                f"{r.model_key} | "
                f"Prediction={r.predicted_number} | "
                f"Confidence={r.confidence:.4f}"
            )

        print("=========================\n")

        return results[0]