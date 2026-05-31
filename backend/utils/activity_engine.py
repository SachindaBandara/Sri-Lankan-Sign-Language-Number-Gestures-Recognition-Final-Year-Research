from __future__ import annotations
import random


# -----------------------------
# RANGE CONFIG (SYNC WITH ML)
# -----------------------------
MODEL_RANGES = {
    "0-9": (0, 9),
    "10-19": (10, 19),
    "20-29": (20, 29),
    "30-39": (30, 39),
    "40-50": (40, 50),
}


def generate_question(operation: str) -> dict:
    if operation == "addition":
        left = random.randint(0, 25)
        right = random.randint(0, 25)
        answer = left + right
        operator = "+"

    elif operation == "subtraction":
        left = random.randint(10, 50)
        right = random.randint(0, left)
        answer = left - right
        operator = "-"

    elif operation == "multiplication":
        left = random.randint(0, 10)
        right = random.randint(0, 10)
        answer = left * right
        operator = "x"

    elif operation == "division":
        right = random.randint(1, 10)
        answer = random.randint(0, 10)
        left = answer * right
        operator = "/"

    else:
        raise ValueError("Unsupported operation")

    return {
        "operation": operation,
        "left": left,
        "right": right,
        "operator": operator,
        "answer": answer,
    }


def validate_answer(operation: str, left: int, right: int, predicted_number: int) -> dict:

    if operation == "addition":
        expected = left + right
        operator = "+"

    elif operation == "subtraction":
        expected = left - right
        operator = "-"

    elif operation == "multiplication":
        expected = left * right
        operator = "x"

    elif operation == "division":
        expected = left // right
        operator = "/"

    else:
        raise ValueError("Unsupported operation")

    return {
        "left": left,
        "right": right,
        "operator": operator,
        "expected_answer": expected,
        "predicted_answer": predicted_number,
        "is_correct": int(predicted_number) == int(expected),
    }


# -----------------------------
# NEW: MODEL SELECTION HELPER
# -----------------------------
def get_model_key_for_number(number: int) -> str:
    for key, (low, high) in MODEL_RANGES.items():
        if low <= number <= high:
            return key
    return "10-19"  # fallback