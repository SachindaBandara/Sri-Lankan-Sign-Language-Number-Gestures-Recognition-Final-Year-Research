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

export function predictNumber(frame, modelKey = "auto") {
  return postJson("/predict-number", { frame, model_key: modelKey });
}

export function generateQuestion(operation) {
  return postJson("/activity/generate-question", { operation });
}

export function validateActivityAnswer({ operation, left, right, predictedNumber }) {
  return postJson("/activity/validate-answer", {
    operation,
    left,
    right,
    predicted_number: predictedNumber,
  });
}
