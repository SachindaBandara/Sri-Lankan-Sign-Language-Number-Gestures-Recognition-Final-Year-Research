const API_BASE = "http://localhost:5000";

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }
  return data;
}

async function postFormData(path, formData) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }
  return data;
}

export function validateNumber({ videoFile, expectedNumber, modelKey = "auto" }) {
  const formData = new FormData();
  formData.append("file", videoFile);
  formData.append("expected_number", String(expectedNumber));
  formData.append("model_key", modelKey);
  return postFormData("/validate_number/", formData);
}

export function generateQuestion(operation) {
  return postJson("/activity/generate-question", { operation });
}

export function validateActivityAnswer({ operation, left, right, predictedNumber, frame }) {
  return postJson("/activity/validate-answer", {
    operation,
    left,
    right,
    predicted_number: predictedNumber,
    frame,
  });
}
