from pathlib import Path

from flask import Blueprint, jsonify, request

from utils.inference_engine import InferenceManager


prediction_bp = Blueprint("prediction", __name__)
project_root = Path(__file__).resolve().parents[2]
models_dir = project_root / "Models"
inference_manager = InferenceManager(models_dir=models_dir)


@prediction_bp.post("/predict-number")
def predict_number():
    """
    Expect a JSON body:
        {
            "video": "<base64-encoded video, ~5 seconds>"
        }

    The endpoint decodes the video, samples frames at a fixed rate, runs all
    five models over the full frame set, and returns the number predicted by
    the model that achieved the highest confidence score.

    Response (200):
        { "predicted_number": <int>, "model_key": <str>, "confidence": <float> }

    Error responses:
        400  – missing or undecodable video payload
        422  – no hand landmarks detected in any frame
    """
    payload = request.get_json(silent=True) or {}
    video_base64 = payload.get("video")

    if not video_base64:
        return jsonify({"error": "Missing video payload"}), 400

    result = inference_manager.predict_video(video_base64)

    if result is None:
        return jsonify({"error": "No hand landmarks detected in the video"}), 422

    return jsonify(
        {
            "predicted_number": result.predicted_number,
            "model_key": result.model_key,
            "confidence": round(result.confidence, 4),
        }
    )