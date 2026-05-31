# Sri Lankan Sign Language Number Gestures Recognition

A full-stack web application for recognizing Sri Lankan Sign Language number gestures from a webcam feed and supporting arithmetic practice with activity-based feedback.

## Highlights

- Real-time webcam-based number recognition for numbers 0 to 50
- Arithmetic activity practice for addition, subtraction, multiplication, and division
- Activity report page with question, correct answer, submitted answer, result, and points
- English and Sinhala language support
- Kid-friendly UI mode for a more playful learning experience
- Live camera preview with recording overlay and processing feedback

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router
- Backend: Flask, Flask-CORS
- Computer vision: MediaPipe, OpenCV
- Model/runtime: NumPy, Pandas, Joblib

## Project Structure

```text
Sri-Lankan-Sign-Language-Number-Gestures-Recognition-Final-Year-Research/
├─ backend/
│  ├─ app.py
│  ├─ run.py
│  ├─ requirements.txt
│  ├─ app/
│  │  ├─ routes/
│  │  ├─ services/
│  │  └─ utils/
│  ├─ routes/
│  │  ├─ __init__.py
│  │  ├─ activity_routes.py
│  │  └─ prediction_routes.py
│  └─ utils/
│     ├─ __init__.py
│     ├─ activity_engine.py
│     └─ inference_engine.py
├─ frontend/
│  ├─ index.html
│  ├─ package.json
│  ├─ postcss.config.js
│  ├─ tailwind.config.js
│  ├─ vite.config.js
│  └─ src/
│     ├─ App.jsx
│     ├─ main.jsx
│     ├─ styles.css
│     ├─ components/
│     │  ├─ LanguageSelector.jsx
│     │  ├─ WebcamRecorder.jsx
│     │  └─ ui/
│     ├─ i18n/
│     │  ├─ en.json
│     │  ├─ index.jsx
│     │  └─ si.json
│     ├─ lib/
│     │  └─ utils.js
│     ├─ pages/
│     │  ├─ ActivitiesPage.jsx
│     │  ├─ ActivityPage.jsx
│     │  ├─ ActivityReportPage.jsx
│     │  ├─ HomePage.jsx
│     │  └─ NumberIdentificationPage.jsx
│     └─ services/
│        └─ api.js
├─ models/
│  ├─ 0-9_numbers_rf_model.joblib
│  ├─ 10-19_numbers_rf_model.joblib
│  ├─ 20-29_numbers_rf_model.joblib
│  ├─ 30-39_numbers_rf_model.joblib
│  └─ 40-50_numbers_rf_model.joblib
└─ LICENSE
```

## Repository Map

| Area | Purpose |
| --- | --- |
| backend/ | Flask API, inference engine, and arithmetic activity logic |
| frontend/ | React application, UI components, translation files, and pages |
| models/ | Trained gesture recognition models used by the backend |
| README.md | Project overview, setup guide, API reference, and usage notes |
| LICENSE | Open-source license terms for reuse and distribution |

## Prerequisites

- Python 3.9 or newer
- Node.js 18 or newer
- npm
- A webcam
- A browser that allows camera access on localhost

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/SachindaBandara/Sri-Lankan-Sign-Language-Number-Gestures-Recognition-Final-Year-Research.git
cd Sri-Lankan-Sign-Language-Number-Gestures-Recognition-Final-Year-Research
```

### 2. Start the backend

```bash
cd backend
python -m venv .venv
```

PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies and run the API:

```bash
pip install -r requirements.txt
python run.py
```

The Flask server runs at `http://localhost:5000`.

### 3. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite app usually runs at `http://localhost:5173`.

## Usage

1. Open the frontend in your browser.
2. Allow camera access.
3. Use the Number Identification page to record a gesture and predict the number.
4. Use the Activities page to practice arithmetic with sign gestures.
5. Open the Activity Report page to review performance history.

## Frontend Scripts

From the frontend/ folder:

```bash
npm run dev
npm run build
npm run preview
```

## Backend API

### GET /health

Returns server health status.

Example response:

```json
{ "status": "ok" }
```

### POST /predict-number

Predicts a number from a webcam video payload.

Example request:

```json
{
  "video": "data:video/webm;base64,..."
}
```

Example response:

```json
{
  "predicted_number": 17,
  "model_key": "10-19",
  "confidence": 0.92
}
```

### POST /activity/generate-question

Generates a new arithmetic question.

Example request:

```json
{
  "operation": "addition"
}
```

Example response:

```json
{
  "operation": "addition",
  "left": 7,
  "right": 3,
  "operator": "+",
  "answer": 10
}
```

### POST /activity/validate-answer

Validates a submitted answer.

Example request:

```json
{
  "operation": "addition",
  "left": 7,
  "right": 3,
  "predicted_number": 10
}
```

Example response:

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

## Notes

- The frontend currently points to http://localhost:5000 in frontend/src/services/api.js.
- The model files must stay in the models/ folder with the expected filenames.
- Camera access generally works only on localhost or HTTPS.
- Activity attempts are stored in the browser and displayed on the report page.

## Troubleshooting

- Camera not starting: check browser permissions and make sure no other app is using the webcam.
- Prediction not working: confirm the backend is running and the model files are present.
- API errors: verify the frontend API base URL and backend port.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Author

Sachinda Bandara
