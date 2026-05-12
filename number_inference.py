import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
import joblib
from pathlib import Path

class SignNumberInference:
    def __init__(self, model_path: Path):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        self.model, self.scaler, self.label_encoder, self.feature_names = joblib.load(model_path)

    def extract_landmarks(self, frame):
        """Extract hand landmarks from a single frame"""
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(image)

        if not results.multi_hand_landmarks:
            return None

        landmarks = results.multi_hand_landmarks[0]
        coords = []
        for landmark in landmarks.landmark:
            coords.extend([landmark.x, landmark.y, landmark.z])

        return coords

    def process_video(self, video_path):
        cap = cv2.VideoCapture(video_path)
        frames_data = []
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            landmarks = self.extract_landmarks(frame)
            if landmarks is not None:
                frames_data.append(landmarks)
        cap.release()
        if not frames_data:
            return None
        df = pd.DataFrame(frames_data, columns=self.feature_names[:-12])
        for coord in ['x', 'y', 'z']:
            coord_cols = [col for col in df.columns if col.endswith(f'_{coord}')]
            df[f'mean_{coord}'] = df[coord_cols].mean(axis=1)
            df[f'std_{coord}'] = df[coord_cols].std(axis=1)
            df[f'max_{coord}'] = df[coord_cols].max(axis=1)
            df[f'min_{coord}'] = df[coord_cols].min(axis=1)
        df = df[self.feature_names]
        X_scaled = self.scaler.transform(df)
        predictions = self.model.predict(X_scaled)
        return self.label_encoder.inverse_transform(predictions)

    def predict(self, video_path):
        predictions = self.process_video(video_path)
        if predictions is None:
            return "No hand landmarks detected"
        unique_preds, counts = np.unique(predictions, return_counts=True)
        return unique_preds[np.argmax(counts)]