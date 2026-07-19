# Detailed Architecture & Development Notes

This document expands on the high-level README and provides developer-focused details: architecture, dataflow, inference steps, model layout, and extension points.

## High-level Architecture

- Frontend (React + Vite): captures camera stream, records short video clips for a gesture, and calls the backend prediction API. Activity UI handles question generation, answer submission, and local attempt storage for the report page.
- Backend (Flask): receives video payloads, runs a preprocessing pipeline (frame extraction → MediaPipe hand landmarks → feature normalization), runs scikit-learn RandomForest models saved with Joblib, and returns aggregated predictions.
- Models: five range-partitioned RandomForest models for number groups (0–9, 10–19, ... 40–50).

## File map (important files)

- `backend/run.py` — entrypoint for running the Flask server.
- `backend/app.py` — Flask application and blueprint registration.
- `backend/routes/prediction_routes.py` — `/predict-number` endpoint handler.
- `backend/routes/activity_routes.py` — activity endpoints (`/activity/*`).
- `backend/utils/inference_engine.py` — feature extraction and model loading.
- `backend/utils/activity_engine.py` — question generation and validation logic.
- `frontend/src/services/api.js` — the frontend API wrapper and base URL.
- `frontend/src/components/WebcamRecorder.jsx` — camera capture and video recording component.

## Inference pipeline (detailed)

1. Frontend records a short webm video from the webcam and sends it as a base64 `data:video/webm` payload to `/predict-number`.
2. Backend decodes the video and samples frames (configurable sample rate in `inference_engine`).
3. For each frame, MediaPipe detects hands and returns 21 landmarks per hand. If a hand is detected, landmarks are normalized (translation + scale) and converted into a flat feature vector (x/y/z coordinates and relative angles/distances as implemented in `inference_engine`).
4. The feature vector is passed to the appropriate RandomForest model. Model selection heuristics use either a primary coarse classifier or heuristics based on previous predictions (see `inference_engine` for exact logic).
5. Frame-level predictions are aggregated (majority vote, confidence averaging, or temporal smoothing) to compute a final predicted number and a confidence score.
6. Response payload includes `predicted_number`, `model_key`, and `confidence`.

## Models and training notes

- Models in `models/` are standard scikit-learn RandomForest classifiers saved with Joblib. Each model covers a contiguous number range to improve per-range accuracy.
- To retrain or add a model:
  - Prepare labeled landmarks data (CSV or NumPy arrays) where each sample is a feature vector matching `inference_engine`'s output.
  - Train a RandomForest with cross-validation. Keep the same feature order and normalization steps. Save using `joblib.dump(model, 'X-Y_numbers_rf_model.joblib')`.
  - Place the new model file in `models/` and ensure `inference_engine` can discover it by filename.

## Extending or improving accuracy

- Improve preprocessing: add better frame selection (motion detection), hand confidence thresholding, or include temporal features (delta angles between frames).
- Replace RandomForest with a small neural network if richer temporal modeling is needed (e.g., 1D CNN or LSTM over frame sequences). For that, export a model that the backend can load (Torch/ONNX) or add a small TensorFlow serving path.
- Augment training data with mirrored hands, different backgrounds, and various camera positions.

## API contract (examples)

POST /predict-number

Request JSON:

```json
{
  "video": "data:video/webm;base64,<BASE64_PAYLOAD>",
  "sample_rate": 5
}
```

Response JSON:

```json
{
  "predicted_number": 17,
  "model_key": "10-19",
  "confidence": 0.92,
  "frame_count": 18
}
```

POST /activity/generate-question

Request JSON:

```json
{ "operation": "addition" }
```

Response JSON:

```json
{
  "operation": "addition",
  "left": 7,
  "right": 3,
  "operator": "+",
  "answer": 10
}
```

POST /activity/validate-answer

Request JSON:

```json
{
  "operation": "addition",
  "left": 7,
  "right": 3,
  "predicted_number": 10
}
```

Response JSON:

```json
{
  "left": 7,
  "right": 3,
  "operator": "+",
  "expected_answer": 10,
  "predicted_answer": 10,
  "is_correct": true,
  "points": 10
}
```

## Debugging tips

- To reproduce prediction failures, capture the raw video payload sent by the frontend (console.log the base64 string or save to a file) and run the backend endpoint locally with the payload.
- Add logging in `inference_engine` to dump per-frame landmark counts and model confidences when `DEBUG` is enabled.
- If MediaPipe does not detect a hand frequently, ensure frames are clear and hands are not occluded; check lighting and camera resolution.

## Tests & Validation

- There are no automated tests included by default. Recommended tests:
  - Unit tests for `activity_engine` logic (question generation, scoring).
  - Integration tests: a sample video payload asserted to return a known prediction.

## CI / Deployment

- A simple CI pipeline should:
  1. Run Python linters and unit tests.
  2. Build the frontend and run a smoke test against the backend running in a test container.

## Where to start as a new contributor

1. Run the backend locally and call `/health` to verify the server spins up.
2. Start the frontend and use the camera UI to reproduce existing flows.
3. Implement a small fix or enhancement (e.g., increase frame sample rate or improve UI feedback) and open a PR.

---

If you want, I can also add a basic Dockerfile for the backend and a production build flow for the frontend — tell me which container style you prefer (single container or split frontend/backend). 
