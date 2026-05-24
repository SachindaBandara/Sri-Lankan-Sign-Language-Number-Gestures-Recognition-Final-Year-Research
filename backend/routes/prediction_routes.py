from pathlib import Path

from flask import Blueprint, jsonify, request

from utils.inference_engine import InferenceManager


prediction_bp = Blueprint("prediction", __name__)
project_root = Path(__file__).resolve().parents[2]
models_dir = project_root / "Models"
inference_manager = InferenceManager(models_dir=models_dir)


@prediction_bp.post("/predict-number")
def predict_number():
    payload = request.get_json(silent=True) or {}
    frame_base64 = payload.get("frame")
    model_key = payload.get("model_key", "auto")

    if not frame_base64:
        return jsonify({"error": "Missing frame payload"}), 400

    try:
        result = inference_manager.predict_frame(frame_base64=frame_base64, model_key=model_key)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if result is None:
        return jsonify({"error": "No hand landmarks detected"}), 422

    return jsonify({"predicted_number": result.predicted_number})
