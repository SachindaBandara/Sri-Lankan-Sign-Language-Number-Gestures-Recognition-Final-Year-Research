from flask import Blueprint, jsonify, request

from routes.prediction_routes import inference_manager
from utils.activity_engine import (
    generate_question,
    validate_answer,
    get_model_key_for_number,
)

activity_bp = Blueprint("activity", __name__)


# -------------------------
# GENERATE QUESTION
# -------------------------
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


# -------------------------
# VALIDATE ANSWER
# -------------------------
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
    except Exception:
        return jsonify({"error": "left and right must be integers"}), 400

    confidence = None

    # --------------------------------------------------
    # If ML prediction not provided -> run inference
    # --------------------------------------------------
    if predicted_number is None:
        if not frame_base64:
            return jsonify({"error": "predicted_number or frame is required"}), 400

        try:
            expected = validate_answer(operation, left, right, 0)["expected_answer"]
            model_key = get_model_key_for_number(expected)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        try:
            # predict_from_frames / predict_with_model always returns a
            # (predicted_number, confidence) tuple — it never returns a bare
            # None. The old code checked `if result is None`, which never
            # fired, so a failed detection ((None, 0.0)) fell through and
            # crashed on int(None) further down instead of returning a
            # clean 422.
            pred, conf = inference_manager.predict_with_model(model_key, frame_base64)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 400

        if pred is None:
            return jsonify({"error": "No hand landmarks detected"}), 422

        predicted_number = pred
        confidence = conf

    # --------------------------------------------------
    # VALIDATION
    # --------------------------------------------------
    try:
        result = validate_answer(operation, left, right, int(predicted_number))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if confidence is not None:
        result["confidence"] = round(confidence, 4)

    return jsonify(result)