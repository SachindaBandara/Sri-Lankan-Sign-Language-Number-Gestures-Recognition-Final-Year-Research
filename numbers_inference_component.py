from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form
from ModalTraning.NumbersIdentification.number_inference import SignNumberInference
import numpy as np
import tempfile
import shutil

# Initialize FastAPI app
app = FastAPI()

# locate script, project root, and models folder
script_dir   = Path(__file__).resolve().parent
project_root = script_dir.parent
models_dir   = project_root / "Number"

# just the filenames
model_filenames = {
    "0-10":  "0-10_numbers_model.joblib",
    "11-20": "11-20_numbers_model.joblib",
    "21-30": "21-30_numbers_model.joblib",
    "31-40": "31-40_numbers_model.joblib",
    "41-50": "41-50_numbers_model.joblib",
}

# build full path for each, check existence, and instantiate
inference_models = {}
for key, fname in model_filenames.items():
    model_file = models_dir / fname
    if not model_file.is_file():
        raise FileNotFoundError(f"[{key}] model not found: {model_file}")
    inference_models[key] = SignNumberInference(model_file)

@app.post("/validate_number/")
async def validate_number(file: UploadFile = File(...), expected_number: int = Form(...), model_key: str = Form(...)):
    """Validate predicted number using selected model."""
    model = inference_models.get(model_key)

    if model is None:
        return {"error": "Invalid model range selected."}

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp:
        temp_path = temp.name
        shutil.copyfileobj(file.file, temp)

    try:
        predicted_number = model.predict(temp_path)
        predicted_number = int(predicted_number) if isinstance(predicted_number, np.integer) else predicted_number
        correct = predicted_number == expected_number
        print(f"Predicted: {predicted_number}, Correct: {correct}")
        return {"predicted_number": predicted_number, "correct": correct}
    finally:
        Path(temp_path).unlink(missing_ok=True)
