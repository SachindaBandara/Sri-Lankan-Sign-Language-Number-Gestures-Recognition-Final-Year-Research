# Sign Language Number Recognition (0-50)

Full-stack application for recognizing sign language numbers from **0 to 50** using webcam input.

- **Backend:** Flask, MediaPipe, OpenCV, NumPy/Pandas, Joblib
- **Frontend:** React (Vite), Tailwind, webcam capture via browser APIs
- **Models:** five range-based trained models (`0-9`, `10-19`, `20-29`, `30-39`, `40-50`)

In addition to direct number prediction, the app includes arithmetic learning activities (addition, subtraction, multiplication, division) that validate answers using recognized signs.

## Features

- Real-time webcam-based number recognition
- Automatic model selection across all number ranges (`model_key: auto`)
- Optional fixed-range model selection (`0-9`, `10-19`, `20-29`, `30-39`, `40-50`)
- Arithmetic question generation for four operations
- Answer validation workflow for activity mode

## Project Structure

```text
backend/
  routes/
    prediction_routes.py
    activity_routes.py
  utils/
    inference_engine.py
    activity_engine.py
  app.py
  flask_app.py
  run.py
  requirements.txt
frontend/
  src/
    components/
    pages/
    services/
  package.json
  vite.config.js
Models/
  0-9_numbers_svm_model.joblib
  10-19_numbers_svm_model.joblib
  20-29_numbers_svm_model.joblib
  30-39_numbers_svm_model.joblib
  40-50_numbers_svm_model.joblib
```

## Prerequisites

- **Python** 3.9+ recommended
- **Node.js** 18+ and npm
- Webcam/camera access enabled in browser

## Setup

### 1) Backend (Flask API)

From the project root:

```bash
cd backend
python -m venv .venv
```

Activate virtual environment:

- **Windows (PowerShell):**
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
- **macOS/Linux:**
  ```bash
  source .venv/bin/activate
  ```

Install dependencies and run:

```bash
pip install -r requirements.txt
python run.py
```

Backend runs on `http://localhost:5000`.

Health check:

```bash
curl http://localhost:5000/health
```

### 2) Frontend (React + Vite)

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## API Endpoints

### `POST /predict-number`

Predict sign number from a base64 frame.

Request body:

```json
{
  "frame": "<base64-image-data>",
  "model_key": "auto"
}
```

`model_key` supports:
- `auto`
- `0-9`
- `10-19`
- `20-29`
- `30-39`
- `40-50`

Response:

```json
{
  "predicted_number": 17
}
```

### `POST /activity/generate-question`

Generate arithmetic question.

Request body:

```json
{
  "operation": "addition"
}
```

Supported `operation` values:
- `addition`
- `subtraction`
- `multiplication`
- `division`

Response example:

```json
{
  "operation": "addition",
  "left": 4,
  "right": 2,
  "operator": "+",
  "answer": 6
}
```

### `POST /activity/validate-answer`

Validate predicted answer for a generated question.

You can send either:
- `predicted_number` directly, or
- `frame` and let backend infer prediction automatically

Request body example:

```json
{
  "operation": "addition",
  "left": 4,
  "right": 2,
  "predicted_number": 6
}
```

Response example:

```json
{
  "left": 4,
  "right": 2,
  "operator": "+",
  "expected_answer": 6,
  "predicted_answer": 6,
  "is_correct": true
}
```

## Model Selection Logic

- `auto` mode runs inference across all 5 models and returns the prediction with highest confidence.
- In activity validation with frame input, backend chooses model range from expected answer (0-50) before inference.

## Notes and Troubleshooting

- Ensure all model files are present in `Models/` before starting backend.
- If camera does not start, check browser permissions and secure origin settings.
- Frontend currently uses API base URL `http://localhost:5000` in `frontend/src/services/api.js`.
- If you get `No hand landmarks detected`, improve lighting, hand visibility, and camera framing.

## License

Add your preferred license information here.
