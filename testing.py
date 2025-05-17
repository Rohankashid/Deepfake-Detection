from flask import Flask, render_template, request, jsonify
import os
import joblib
import numpy as np
import cv2
import dlib
from flask_cors import CORS
import shutil

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the upload directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Load the trained model and dlib's components
model_path = "svm_face_classifier.pkl"
model = joblib.load(model_path)  # Ensure SVM was trained with probability=True
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor('deepfake_detection/shape_predictor_68_face_landmarks.dat')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def predict_video(video_path, frame_skip=30, max_frames=50):
    frame_save_dir = os.path.join("static", "frames")
    # Clear the frames directory before saving new frames
    if os.path.exists(frame_save_dir):
        shutil.rmtree(frame_save_dir)
    os.makedirs(frame_save_dir)

    def extract_landmarks_from_frame(frame):
        resized_frame = cv2.resize(frame, (frame.shape[1] // 2, frame.shape[0] // 2))
        gray_resized = cv2.cvtColor(resized_frame, cv2.COLOR_BGR2GRAY)
        gray_resized = cv2.equalizeHist(gray_resized)

        faces = detector(gray_resized)
        if len(faces) == 0:
            return None, None
        try:
            shape = predictor(gray_resized, faces[0])
            landmarks = [(shape.part(n).x, shape.part(n).y) for n in range(68)]
            return np.array(landmarks).flatten(), resized_frame
        except:
            return None, None

    cap = cv2.VideoCapture(video_path)
    features = []
    frame_count = 0
    processed_frames = 0
    saved_frames_paths = []

    while cap.isOpened() and processed_frames < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % frame_skip == 0:
            landmarks, processed_frame = extract_landmarks_from_frame(frame)
            if landmarks is not None:
                features.append(landmarks)
                # Save frame
                filename = f"frame_{processed_frames}.jpg"
                filepath = os.path.join(frame_save_dir, filename)
                cv2.imwrite(filepath, processed_frame)
                saved_frames_paths.append(f"/static/frames/{filename}")
                processed_frames += 1

        frame_count += 1

    cap.release()

    if len(features) == 0:
        return "Undetermined", 0.0, "No valid frames with faces detected in the video.", []

    avg_features = np.mean(features, axis=0).reshape(1, -1)
    probs = model.predict_proba(avg_features)
    confidence = abs(max(probs[0]) * 100)
    prediction = model.predict(avg_features)[0]

    print(f"Prediction: {prediction}, Confidence: {confidence:.2f}%")

    if prediction == 0:
        justification = f"The video appears to be authentic based on facial landmark analysis. The system analyzed {processed_frames} frames and found consistent facial features with {confidence:.2f}% confidence."
    else:
        justification = f"The video shows signs of manipulation based on facial landmark analysis. The system analyzed {processed_frames} frames and detected inconsistencies in facial features with {confidence:.2f}% confidence."
    
    return ("Real", confidence, justification, saved_frames_paths) if prediction == 0 else ("Fake", confidence, justification, saved_frames_paths)

# Route for serving index.html
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400

    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filepath)

        try:
            # Run deepfake detection
            result, confidence, justification , frames = predict_video(filepath)  
            return jsonify({
                'status': 'success', 
                'prediction': result, 
                'confidence': f"{confidence:.2f}%",
                'justification': justification,
                'frames': frames
            })
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)}), 500

    return jsonify({'error': 'File type not allowed'}), 400

if __name__ == '__main__':
    app.run(debug=True)
