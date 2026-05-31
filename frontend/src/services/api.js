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
 * Predict number from video (3–5 sec)
 */
export function predictNumber(videoBase64) {
  if (!videoBase64 || videoBase64.length < 1000) {
    throw new Error("Video too short or invalid");
  }

  return postJson("/predict-number", {
    video: videoBase64,
  });
}

/**
 * Generate arithmetic question
 */
export function generateQuestion(operation) {
  return postJson("/activity/generate-question", {
    operation,
  });
}

/**
 * Validate answer (FIXED FIELD NAME)
 */
export function validateActivityAnswer({
  operation,
  left,
  right,
  predicted_number,
}) {
  return postJson("/activity/validate-answer", {
    operation,
    left,
    right,
    predicted_number, // ✅ FIXED
  });
}