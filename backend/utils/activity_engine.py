from __future__ import annotations

import random


def generate_question(operation: str) -> dict:
    if operation == "addition":
        left = random.randint(0, 25)
        right = random.randint(0, 25)
        answer = left + right
        operator = "+"
    elif operation == "subtraction":
        left = random.randint(0, 50)
        right = random.randint(0, left)
        answer = left - right
        operator = "-"
    elif operation == "multiplication":
        left = random.randint(0, 10)
        right = random.randint(0, 5)
        answer = left * right
        operator = "x"
    elif operation == "division":
        right = random.randint(1, 10)
        answer = random.randint(0, 5)
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
        "is_correct": predicted_number == expected,
    }
