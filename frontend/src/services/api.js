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

/**
 * Send a base64-encoded video (≈5 s) to the prediction endpoint.
 * The backend evaluates all models and returns the most confident result.
 *
 * @param {string} videoBase64 - data:<mime>;base64,<data> string from FileReader
 * @returns {Promise<{ predicted_number: number, model_key: string, confidence: number }>}
 */
export function predictNumber(videoBase64) {
  return postJson("/predict-number", { video: videoBase64 });
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