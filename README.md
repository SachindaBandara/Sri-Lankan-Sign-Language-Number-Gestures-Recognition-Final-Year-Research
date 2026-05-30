<!--
  Comprehensive README for
  "Sri-Lankan Sign Language Number Gestures Recognition"
  Replaces the previous brief README with detailed setup, API, and contribution notes.
-->

# Sri-Lankan Sign Language — Number Gestures Recognition (0–50)

Short project overview: a full-stack web application that recognizes Sri Lankan Sign Language number gestures (0 through 50) from a webcam feed and provides an interactive learning/assessment activity for basic arithmetic using recognized signs.

Key components:

- Backend: Flask API performing MediaPipe-based hand landmark extraction and prediction using range-based SVM models (Joblib).
- Frontend: React (Vite) single-page app with webcam capture, live preview, and activity UI using Tailwind CSS.
- Models: Five pre-trained models covering ranges 0–9, 10–19, 20–29, 30–39, 40–50 stored as Joblib files.

Table of contents
- Overview
- Features
- Project structure
- Getting started (quick start)
- Backend: install & run
- Frontend: install & run
- API reference
- Models & inference details
- Development notes
- Troubleshooting
- Contributing
- License & contact

## Features

- Real-time webcam number recognition (0–50)
- Automatic model selection (`auto`) or explicit range selection
- Arithmetic activity: generate questions and validate answers using recognized numbers
- Lightweight model architecture designed for real-time inference on CPU

## Project structure

Top-level layout (important files and folders):

```
README.md
backend/
  app.py
  run.py
  requirements.txt
  routes/
    prediction_routes.py
    activity_routes.py
  utils/
    inference_engine.py
    activity_engine.py
frontend/
  index.html
  package.json
  src/
    App.jsx
    main.jsx
    components/
    pages/
models/
  0-9_numbers_svm_model.joblib
  10-19_numbers_svm_model.joblib
  20-29_numbers_svm_model.joblib
  30-39_numbers_svm_model.joblib
  40-50_numbers_svm_model.joblib
```

Note: model files live in the `models/` folder (named above). The backend expects them accessible at startup.

## Getting started (Quick start)

Prerequisites

- Python 3.9+ (3.10 recommended)
- Node.js 18+ and npm or yarn
- A webcam and a browser that allows camera access (HTTPS or localhost)

1) Clone the repository

```bash
git clone https://github.com/SachindaBandara/Sri-Lankan-Sign-Language-Number-Gestures-Recognition-Final-Year-Research.git
cd Sri-Lankan-Sign-Language-Number-Gestures-Recognition-Final-Year-Research
```

2) Start the backend

```bash
cd backend
python -m venv .venv
# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1
# macOS / Linux
# source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

By default the API serves on `http://localhost:5000`.

3) Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open the frontend app at the Vite-provided URL (commonly `http://localhost:5173`). The frontend uses `http://localhost:5000` as the API base by default.

## Backend: install & run (details)

- Virtual environment recommended. Dependencies listed in `backend/requirements.txt` include `flask`, `mediapipe`, `opencv-python`, `numpy`, `scikit-learn`, `joblib`, etc.
- `run.py` boots the Flask app used by the frontend and for API testing.

Environment variables

- `FLASK_ENV` (optional): `development` or `production`.
- `MODEL_DIR` (optional): path to model files; defaults to `../models` relative to the `backend` folder.

Health check

```bash
curl http://localhost:5000/health
```

## Frontend: install & run (details)

- The frontend is a Vite React project under `frontend/`.
- The API base URL is configured in `frontend/src/services/api.js` — change it if your backend runs on a different host/port.

Common scripts

- `npm run dev` — start dev server
- `npm run build` — build production assets

## API reference

All endpoints are relative to the backend root (default `http://localhost:5000`).

1) POST /predict-number

Description: Submit a camera frame (base64) or request explicit model prediction.

Request JSON (frame mode):

```json
{
  "frame": "<base64-data>",
  "model_key": "auto"  // optional, or one of: "0-9","10-19","20-29","30-39","40-50"
}
```

Response (success):

```json
{
  "predicted_number": 17,
  "model_key": "10-19",
  "confidence": 0.92
}
```

2) POST /activity/generate-question

Description: Generate a random arithmetic question for learning or testing.

Request example:

```json
{ "operation": "addition" }
```

Response example:

```json
{
  "operation": "addition",
  "left": 7,
  "right": 3,
  "operator": "+",
  "answer": 10
}
```

3) POST /activity/validate-answer

Description: Validate a submitted answer — either provide `predicted_number` or a `frame`.

Request example (predicted number):

```json
{
  "operation": "addition",
  "left": 7,
  "right": 3,
  "predicted_number": 10
}
```

Response example:

```json
{
  "left": 7,
  "right": 3,
  "operator": "+",
  "expected_answer": 10,
  "predicted_answer": 10,
  "is_correct": true
}
```

Notes: See `backend/routes/` for implementation details and additional fields.

## Models & inference details

- Models are range-partitioned: the system uses five independent models covering 0–9, 10–19, 20–29, 30–39, and 40–50. Each model expects the same landmark-based feature vector produced by MediaPipe hand landmarks processing.
- `auto` mode runs inference across all models and picks the most confident prediction.
- Model files are in `models/` and are expected to be named like `0-9_numbers_svm_model.joblib`.

If you retrain or replace models, ensure they accept the same input vector shape.

## Development notes

- Main inference logic: [backend/utils/inference_engine.py](backend/utils/inference_engine.py#L1)
- Activity/question logic: [backend/utils/activity_engine.py](backend/utils/activity_engine.py#L1)
- API routes: [backend/routes/prediction_routes.py](backend/routes/prediction_routes.py#L1) and [backend/routes/activity_routes.py](backend/routes/activity_routes.py#L1)

When editing the inference pipeline, run the backend locally and use the frontend camera UI to validate predictions in real time.

## Troubleshooting

- "No hand landmarks detected": improve lighting, move hand closer to camera, ensure entire hand is in frame.
- Slow performance: try reducing input resolution or run the backend on a machine with better CPU; MediaPipe uses CPU by default.
- Model file not found: ensure `models/` exists and files are named exactly as expected.

## Docker (optional)

You can containerize backend and frontend separately. Example Dockerfile for backend is not included; to create one:

1. Create `backend/Dockerfile` using a Python base image, copy `backend/` and `models/`, install requirements and run `run.py`.
2. Build and run with docker build/run or docker-compose.

## Contributing

- Open issues for bugs or feature requests.
- For code changes, fork the repo, create a branch, and open a pull request with a clear summary of changes.

Suggested steps:

1. Create a branch: `git checkout -b feat/your-feature`
2. Implement and test changes
3. Run linters and formatters (if any)
4. Push and create a PR

## License

This repository does not include a license file by default. Add a `LICENSE` file with your preferred license (MIT, Apache-2.0, etc.).

## Contact / Acknowledgements

- Author: Sachinda Bandara
- Repository: https://github.com/SachindaBandara/Sri-Lankan-Sign-Language-Number-Gestures-Recognition-Final-Year-Research

If you'd like, I can also:

- add a short CONTRIBUTING.md
- create a Dockerfile for the backend
- add CI workflow to run lint/tests

---

If you want adjustments (more examples, expanded API docs, or Dockerfiles), tell me which sections to expand.
