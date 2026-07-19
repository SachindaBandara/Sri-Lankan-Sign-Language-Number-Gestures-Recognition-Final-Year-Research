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
# CONSTANTS — these MUST match the training pipeline
# (research_sign_language_20_29_number_classifier_v2.py)
# exactly, or the feature vectors won't line up with what
# the model was fit on.
# ==========================================================

LANDMARK_NAMES = [
    "WRIST",
    "THUMB_CMC",
    "THUMB_MCP",
    "THUMB_IP",
    "THUMB_TIP",
    "INDEX_FINGER_MCP",
    "INDEX_FINGER_PIP",
    "INDEX_FINGER_DIP",
    "INDEX_FINGER_TIP",
    "MIDDLE_FINGER_MCP",
    "MIDDLE_FINGER_PIP",
    "MIDDLE_FINGER_DIP",
    "MIDDLE_FINGER_TIP",
    "RING_FINGER_MCP",
    "RING_FINGER_PIP",
    "RING_FINGER_DIP",
    "RING_FINGER_TIP",
    "PINKY_MCP",
    "PINKY_PIP",
    "PINKY_DIP",
    "PINKY_TIP",
]

# Fixed number of temporal segments — training always produces exactly this
# many `segment{n}_mean_*` columns, regardless of clip length.
NUM_SEGMENTS = 5

LANDMARK_COLUMNS: list[str] = []
for _name in LANDMARK_NAMES:
    LANDMARK_COLUMNS.extend([f"{_name}_x", f"{_name}_y", f"{_name}_z"])


# ==========================================================
# RESULT STRUCTURE
# ==========================================================

@dataclass
class PredictionResult:
    predicted_number: int
    model_key: str
    confidence: float


# ==========================================================
# SINGLE MODEL ENGINE
# ==========================================================

class SignNumberInference:
    """
    Runs one range-specific model (e.g. "20-29") end-to-end: raw video frames
    → normalized hand landmarks → hybrid per-video feature vector → learned
    feature selection → class probabilities.

    Every step below is a direct mirror of the corresponding step in the
    training notebook. If you ever retrain / change the training feature
    engineering, this class must be updated to match, or predictions will
    silently be wrong (no shape/name errors — just garbage confidence).
    """

    def __init__(self, model_path: Path):
        # NOTE: max_num_hands=2 matches LandmarkDatasetCreator's config used
        # during training. Only hand index 0 is ever used (same as training),
        # but keeping the detector config identical avoids subtle differences
        # in how MediaPipe ranks/orders detected hands.
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5,
        )

        payload = joblib.load(model_path)

        if not isinstance(payload, dict):
            raise ValueError(
                f"Unexpected model bundle format in {model_path}: expected the "
                f"dict produced by SignLanguageRandomForest's training script "
                f"(with 'model', 'label_encoder', 'feature_names', ...), got "
                f"{type(payload)!r}."
            )

        self.model = payload.get("model")
        self.label_encoder = payload.get("label_encoder")

        # Full raw feature column order produced by _build_sequence_features,
        # BEFORE the two-stage feature selector reduces it.
        self.feature_names: list[str] = payload.get("feature_names") or []

        # Feature-selection artifacts. If feature_selection_threshold was
        # None at training time, `selector` will be None and the raw
        # features (reindexed to feature_names) are used as-is.
        self.selector = payload.get("selector")
        self.keep_var_cols: list[str] = payload.get("keep_var_cols") or self.feature_names
        self.selected_feature_names: list[str] = (
            payload.get("selected_feature_names") or self.feature_names
        )

        if self.model is None:
            raise ValueError(f"Model bundle at {model_path} is missing a 'model' entry")
        if self.label_encoder is None:
            raise ValueError(f"Model bundle at {model_path} is missing a 'label_encoder' entry")
        if not self.feature_names:
            raise ValueError(
                f"Model bundle at {model_path} is missing 'feature_names' — "
                f"cannot reconstruct the training feature layout."
            )

    # ======================================================
    # LANDMARK EXTRACTION (mirrors LandmarkDatasetCreator)
    # ======================================================

    @staticmethod
    def _normalize_landmark_vector(coords) -> np.ndarray:
        """Center landmarks at the wrist and scale for pose-invariant learning.

        This step was silently missing from the old inference code, which
        fed raw absolute image-space coordinates into a model trained on
        wrist-centered, scale-normalized ones.
        """
        points = np.asarray(coords, dtype=np.float32).reshape(-1, 3)
        wrist = points[0].copy()
        points = points - wrist
        scale = np.max(np.linalg.norm(points, axis=1))
        if scale > 1e-6:
            points = points / scale
        return points.reshape(-1)

    def _extract_landmarks(self, frame) -> np.ndarray | None:
        """Extract and normalize hand landmarks from one frame.

        Returns a 1-D float32 array of length 63 (21 landmarks x 3 coords),
        or None when no hand is detected.
        """
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(image)

        if not results.multi_hand_landmarks:
            return None

        hand = results.multi_hand_landmarks[0]
        coords = []
        for lm in hand.landmark:
            coords.extend([lm.x, lm.y, lm.z])

        return self._normalize_landmark_vector(coords)

    def _extract_sequence(self, frames) -> tuple[list[np.ndarray], int]:
        """Build the per-frame landmark sequence for a whole clip.

        Unlike the old implementation, frames with no detected hand are
        simply dropped rather than filled in with a stale/zero landmark
        vector — training never saw padded frames, so we shouldn't
        manufacture them here either.
        """
        sequence: list[np.ndarray] = []
        valid_count = 0

        for frame in frames:
            landmarks = self._extract_landmarks(frame)
            if landmarks is not None:
                sequence.append(landmarks)
                valid_count += 1

        return sequence, valid_count

    # ======================================================
    # FEATURE ENGINEERING (mirrors _build_sequence_features)
    # ======================================================

    def _build_sequence_features(self, sequence_array: np.ndarray) -> dict:
        """Convert a (T x 63) frame sequence into one hybrid feature row.

        This is a line-for-line port of
        SignLanguageRandomForest._build_sequence_features. A whole clip
        becomes exactly ONE feature vector, matching how the model was
        trained (one row per video, not one row per frame).
        """
        T = sequence_array.shape[0]
        feature_row: dict[str, float] = {}

        # --- Static pose summary (mean / std / min / max per coordinate) ---
        for idx, col in enumerate(LANDMARK_COLUMNS):
            col_data = sequence_array[:, idx]
            feature_row[f"mean_{col}"] = float(col_data.mean())
            feature_row[f"std_{col}"] = float(col_data.std())
            feature_row[f"min_{col}"] = float(col_data.min())
            feature_row[f"max_{col}"] = float(col_data.max())

        # --- Dynamic motion descriptors (inter-frame deltas) ---------------
        if T > 1:
            diffs = np.diff(sequence_array, axis=0)
            frame_norms = np.linalg.norm(diffs, axis=1)
            feature_row["motion_energy"] = float(np.mean(frame_norms))
            feature_row["motion_variability"] = float(np.std(frame_norms))
            feature_row["start_end_drift"] = float(
                np.linalg.norm(sequence_array[-1] - sequence_array[0])
            )
            for idx, col in enumerate(LANDMARK_COLUMNS):
                feature_row[f"delta_mean_{col}"] = float(diffs[:, idx].mean())
                feature_row[f"delta_std_{col}"] = float(diffs[:, idx].std())
        else:
            feature_row["motion_energy"] = 0.0
            feature_row["motion_variability"] = 0.0
            feature_row["start_end_drift"] = 0.0
            for col in LANDMARK_COLUMNS:
                feature_row[f"delta_mean_{col}"] = 0.0
                feature_row[f"delta_std_{col}"] = 0.0

        # --- Temporal segments ----------------------------------------------
        if T < NUM_SEGMENTS:
            repeats = -(-NUM_SEGMENTS // T)  # ceiling division
            padded = np.tile(sequence_array, (repeats, 1))[:NUM_SEGMENTS]
            split_source = padded
        else:
            split_source = sequence_array

        for seg_idx, segment in enumerate(np.array_split(split_source, NUM_SEGMENTS)):
            for idx, col in enumerate(LANDMARK_COLUMNS):
                feature_row[f"segment{seg_idx + 1}_mean_{col}"] = float(segment[:, idx].mean())

        return feature_row

    # ======================================================
    # FEATURE SELECTION (mirrors transform_features)
    # ======================================================

    def _select_features(self, X_raw: pd.DataFrame) -> pd.DataFrame:
        """Apply the fitted two-stage selector saved in the model bundle.

        The old code built its own (unrelated) feature set and never
        touched the selector at all, so the model was effectively being
        fed the wrong number of columns in the wrong order.
        """
        if self.selector is None:
            return X_raw.reindex(columns=self.feature_names, fill_value=0.0)

        X_var = X_raw.reindex(columns=self.keep_var_cols, fill_value=0.0)
        X_sel = self.selector.transform(X_var)
        return pd.DataFrame(X_sel, columns=self.selected_feature_names)

    # ======================================================
    # PREDICTION
    # ======================================================

    def predict_from_frames(self, frames) -> tuple[int | None, float]:
        """
        Run the full clip -> single prediction pipeline.

        Returns (predicted_number, confidence). If too few frames had a
        detectable hand, returns (None, 0.0) so callers can distinguish
        "no hand detected" from a real (possibly low-confidence) prediction.
        """
        sequence, valid = self._extract_sequence(frames)

        if valid < 3:
            return None, 0.0

        sequence_array = np.asarray(sequence, dtype=np.float32)

        raw_row = self._build_sequence_features(sequence_array)
        X_raw = pd.DataFrame([raw_row]).reindex(columns=self.feature_names, fill_value=0.0)
        X = self._select_features(X_raw)

        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(X)[0]
            best_idx = int(np.argmax(probs))
            confidence = float(probs[best_idx])
            encoded_pred = self.model.classes_[best_idx]
        else:
            encoded_pred = self.model.predict(X)[0]
            confidence = 0.70  # no probability estimate available

        pred = self.label_encoder.inverse_transform([encoded_pred])[0]
        return int(pred), confidence


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

    MODEL_RANGES = {
        "0-9": (0, 9),
        "10-19": (10, 19),
        "20-29": (20, 29),
        "30-39": (30, 39),
        "40-50": (40, 50),
    }

    SAMPLE_FPS = 10

    def __init__(self, models_dir: Path):
        self.models: dict[str, SignNumberInference] = {}

        for key, file in self.MODEL_FILES.items():
            path = models_dir / file

            if not path.exists():
                raise FileNotFoundError(path)

            self.models[key] = SignNumberInference(path)

    @classmethod
    def prediction_belongs_to_model(cls, pred: int, model_key: str) -> bool:
        low, high = cls.MODEL_RANGES[model_key]
        return low <= pred <= high

    # ======================================================
    # VIDEO DECODER
    # ======================================================

    @staticmethod
    def decode_base64_video(video_base64: str):
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
    # MAIN PREDICTION — used by /predict-number
    # ======================================================

    def predict_video(self, video_base64: str) -> PredictionResult | None:
        """
        Decode the video once, then let every range model score the SAME
        clip and keep the highest-confidence prediction whose value
        actually falls inside that model's own number range (guards
        against a model confidently predicting a number outside its
        training range, e.g. the "20-29" model outputting 5).
        """
        frames = self.decode_base64_video(video_base64)

        if len(frames) < 10:
            return None

        results: list[PredictionResult] = []

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

        results.sort(key=lambda r: r.confidence, reverse=True)

        print("\n===== MODEL RESULTS =====")
        for r in results:
            print(
                f"{r.model_key} | "
                f"Prediction={r.predicted_number} | "
                f"Confidence={r.confidence:.4f}"
            )
        print("=========================\n")

        return results[0]

    # ======================================================
    # TARGETED PREDICTION — used by /activity/validate-answer
    # when the expected answer (and therefore the correct
    # range model) is already known.
    # ======================================================

    def predict_with_model(self, model_key: str, video_base64: str) -> tuple[int | None, float]:
        if model_key not in self.models:
            raise ValueError(f"Unknown model_key: {model_key}")

        frames = self.decode_base64_video(video_base64)
        return self.models[model_key].predict_from_frames(frames)