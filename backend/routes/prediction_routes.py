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

import tempfile
import shutil
from pathlib import Path

import numpy as np
from flask import Blueprint, jsonify, request

from utils.inference_engine import SignNumberInference


prediction_bp = Blueprint("prediction", __name__)

# ── Model registry ────────────────────────────────────────────────────────────
# Mirror numbers_inference_component.py exactly.

script_dir   = Path(__file__).resolve().parent
project_root = script_dir.parent
models_dir   = project_root / "models"

model_filenames = {
    "0-9":  "0-9_numbers_model.joblib",
    "10-19": "10-19_numbers_model.joblib",
    "20-29": "20-29_numbers_model.joblib",
    "30-39": "30-39_numbers_model.joblib",
    "40-50": "40-50_numbers_model.joblib",
}

inference_models = {}
for key, fname in model_filenames.items():
    model_file = models_dir / fname
    if not model_file.is_file():
        raise FileNotFoundError(f"[{key}] model not found: {model_file}")
    inference_models[key] = SignNumberInference(model_file)


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
    model = inference_models.get(model_key)
    if model is None:
        return jsonify({"error": "Invalid model range selected."}), 400

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