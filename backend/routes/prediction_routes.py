"""
prediction_routes.py

Flask translation of numbers_inference_component.py.

Original FastAPI design kept exactly:
  - Same model registry dict (keys, filenames, models_dir)
  - Same endpoint contract: multipart form with `file`, `expected_number`, `model_key`
  - Same response shape: {"predicted_number": ..., "correct": ...}
  - Same error shape:    {"error": "..."}
  - Same temp-file lifecycle (write → predict → unlink in finally)
"""

import base64
import shutil
import tempfile
from pathlib import Path

import cv2
import numpy as np
from flask import Blueprint, jsonify, request

from utils.inference_engine import SignNumberInference


prediction_bp = Blueprint("prediction", __name__)

# ── Model registry ────────────────────────────────────────────────────────────
# Mirror numbers_inference_component.py exactly.

script_dir = Path(__file__).resolve().parent
project_root = script_dir.parent
models_dir = project_root.parent / "models"

model_filenames = {
    "0-9": "0-9_numbers_model.joblib",
    "10-19": "10-19_numbers_model.joblib",
    "20-29": "20-29_numbers_model.joblib",
    "30-39": "30-39_numbers_model.joblib",
    "40-50": "40-50_numbers_model.joblib",
}


class InferenceManager:
    def __init__(self):
        self._models = {}

    def model_key_for_number(self, number: int) -> str:
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
        raise ValueError("Number must be between 0 and 50.")

    def _get_model(self, model_key: str) -> SignNumberInference:
        if model_key not in model_filenames:
            raise ValueError("Invalid model range selected.")

        if model_key not in self._models:
            model_file = models_dir / model_filenames[model_key]
            if not model_file.is_file():
                raise FileNotFoundError(f"[{model_key}] model not found: {model_file}")
            self._models[model_key] = SignNumberInference(model_file)

        return self._models[model_key]

    def predict_video(self, video_path: str, model_key: str):
        model = self._get_model(model_key)
        predicted_number = model.predict(video_path)
        return int(predicted_number) if isinstance(predicted_number, np.integer) else predicted_number

    def predict_frame(self, frame_base64: str, model_key: str):
        if "," in frame_base64:
            frame_base64 = frame_base64.split(",", 1)[1]

        frame_bytes = base64.b64decode(frame_base64)
        frame_array = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(frame_array, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Invalid frame data.")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".avi") as temp:
            temp_path = temp.name

        try:
            height, width = frame.shape[:2]
            writer = cv2.VideoWriter(temp_path, cv2.VideoWriter_fourcc(*"MJPG"), 5, (width, height))
            if not writer.isOpened():
                raise RuntimeError("Unable to encode frame for prediction.")

            for _ in range(8):
                writer.write(frame)
            writer.release()
            return self.predict_video(temp_path, model_key)
        finally:
            Path(temp_path).unlink(missing_ok=True)


inference_manager = InferenceManager()


# ── Route ─────────────────────────────────────────────────────────────────────

@prediction_bp.post("/validate_number/")
def validate_number():
    """
    Validate predicted number using the selected model.

    Form fields (multipart/form-data):
        file            – video file (.mp4 or compatible)
        expected_number – int, the number the user is expected to have signed
        model_key       – str, one of the keys in model_filenames

    Response JSON:
        {"predicted_number": <int>, "correct": <bool>}
        {"error": "<message>"}
    """
    file            = request.files.get("file")
    expected_number = request.form.get("expected_number")
    model_key       = request.form.get("model_key")

    # ── Input validation ──────────────────────────────────────────────────────
    if file is None:
        return jsonify({"error": "Missing file."}), 400

    if expected_number is None:
        return jsonify({"error": "Missing expected_number."}), 400

    try:
        expected_number = int(expected_number)
    except ValueError:
        return jsonify({"error": "expected_number must be an integer."}), 400

    if model_key is None:
        return jsonify({"error": "Missing model_key."}), 400

    # ── Model lookup (matches original behaviour exactly) ─────────────────────
    try:
        model = inference_manager._get_model(model_key)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 503
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    # ── Temp-file lifecycle (matches original exactly) ────────────────────────
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp:
        temp_path = temp.name
        shutil.copyfileobj(file.stream, temp)

    try:
        predicted_number = model.predict(temp_path)
        # Cast numpy integer to plain int, same as original
        predicted_number = int(predicted_number) if isinstance(predicted_number, np.integer) else predicted_number
        correct = predicted_number == expected_number
        print(f"Predicted: {predicted_number}, Correct: {correct}")
        return jsonify({"predicted_number": predicted_number, "correct": correct})
    finally:
        Path(temp_path).unlink(missing_ok=True)