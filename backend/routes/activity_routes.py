from flask import Blueprint, jsonify, request

from routes.prediction_routes import inference_manager
from utils.activity_engine import generate_question, validate_answer


activity_bp = Blueprint("activity", __name__)


@activity_bp.post("/activity/generate-question")
def generate_activity_question():
    payload = request.get_json(silent=True) or {}
    operation = payload.get("operation")
    if not operation:
        return jsonify({"error": "operation is required"}), 400

    try:
        return jsonify(generate_question(operation))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@activity_bp.post("/activity/validate-answer")
def validate_activity_answer():
    payload = request.get_json(silent=True) or {}
    operation = payload.get("operation")
    left = payload.get("left")
    right = payload.get("right")
    predicted_number = payload.get("predicted_number")
    frame_base64 = payload.get("frame")

    if operation is None or left is None or right is None:
        return jsonify({"error": "operation, left and right are required"}), 400

    try:
        left = int(left)
        right = int(right)
    except (TypeError, ValueError):
        return jsonify({"error": "left and right must be integers"}), 400

    if predicted_number is None:
        if not frame_base64:
            return jsonify({"error": "predicted_number or frame is required"}), 400

        try:
            expected_answer = validate_answer(operation, left, right, 0)["expected_answer"]
            model_key = inference_manager.model_key_for_number(expected_answer)
            prediction = inference_manager.predict_frame(frame_base64=frame_base64, model_key=model_key)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        if prediction is None:
            return jsonify({"error": "No hand landmarks detected"}), 422
        predicted_number = prediction.predicted_number

    try:
        result = validate_answer(operation, left, right, int(predicted_number))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(result)
