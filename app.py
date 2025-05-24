from flask import Flask, request, jsonify
import os
import joblib
import numpy as np
import cv2
import dlib
from flask_cors import CORS
import shutil
import time
from datetime import datetime

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
TRAINING_FOLDER = 'training_data'
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['TRAINING_FOLDER'] = TRAINING_FOLDER

# Ensure the upload and training directories exist
for folder in [UPLOAD_FOLDER, TRAINING_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

# Create subdirectories for real and fake videos
for subfolder in ['real', 'fake']:
    path = os.path.join(TRAINING_FOLDER, subfolder)
    if not os.path.exists(path):
        os.makedirs(path)

# Load the trained model and dlib's components
model_path = "svm_face_classifier.pkl"
model = joblib.load(model_path)  # Ensure SVM was trained with probability=True
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor('deepfake_detection/shape_predictor_68_face_landmarks.dat')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def predict_video(video_path, frame_skip=30, max_frames=50):
    start_time = time.time()
    print(f"Starting video analysis for: {video_path}")
    
    # Corrected path to save frames within the frontend public directory
    frame_save_dir = os.path.join("frontend", "public", "static", "frames")
    # Clear the frames directory before saving new frames
    if os.path.exists(frame_save_dir):
        shutil.rmtree(frame_save_dir)
    os.makedirs(frame_save_dir)

    def extract_landmarks_from_frame(frame):
        try:
            resized_frame = cv2.resize(frame, (frame.shape[1] // 2, frame.shape[0] // 2))
            gray_resized = cv2.cvtColor(resized_frame, cv2.COLOR_BGR2GRAY)
            gray_resized = cv2.equalizeHist(gray_resized)

            faces = detector(gray_resized)
            if len(faces) == 0:
                print("No faces detected in frame")
                return None, None
            try:
                shape = predictor(gray_resized, faces[0])
                landmarks = [(shape.part(n).x, shape.part(n).y) for n in range(68)]
                return np.array(landmarks).flatten(), resized_frame
            except Exception as e:
                print(f"Error extracting landmarks: {str(e)}")
                return None, None
        except Exception as e:
            print(f"Error processing frame: {str(e)}")
            return None, None

    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"Error: Could not open video file: {video_path}")
            return "Error", 0.0, "Could not open video file.", [], 0, [], [], [], 0, ""

        features = []
        frame_count = 0
        processed_frames = 0
        saved_frames_paths = []
        frame_probs = []
        raw_output = []
        landmark_variance = []
        processing_time = 0

        while cap.isOpened() and processed_frames < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_skip == 0:
                landmarks, processed_frame = extract_landmarks_from_frame(frame)
                if landmarks is not None:
                    features.append(landmarks)
                    # Save frame to the corrected path
                    filename = f"frame_{processed_frames}.jpg"
                    filepath = os.path.join(frame_save_dir, filename)
                    cv2.imwrite(filepath, processed_frame)
                    # The URL path should still be relative to the public directory
                    saved_frames_paths.append(f"/static/frames/{filename}")
                    processed_frames += 1

            frame_count += 1

        cap.release()

        if len(features) == 0:
            print("No valid frames with faces detected")
            return "Undetermined", 0.0, "No valid frames with faces detected in the video.", [], 0, [], [], [], 0, ""

        print(f"Processed {processed_frames} frames with faces")
        print(f"Extracted {len(features)} feature vectors")

        frame_probs = []
        for f in features:
            try:
                p = model.predict_proba(f.reshape(1, -1))[0]
                frame_probs.append(p.tolist())  # [prob_real, prob_fake] for each frame
            except Exception as e:
                print(f"Error predicting frame probability: {str(e)}")
                continue

        if not frame_probs:
            print("No valid predictions made")
            return "Error", 0.0, "Error during model prediction.", [], 0, [], [], [], 0, ""

        avg_features = np.mean(features, axis=0).reshape(1, -1)
        try:
            probs = model.predict_proba(avg_features)
            confidence = abs(max(probs[0]) * 100)
            prediction = model.predict(avg_features)[0]
        except Exception as e:
            print(f"Error in final prediction: {str(e)}")
            return "Error", 0.0, "Error during final prediction.", [], 0, [], [], [], 0, ""

        processing_time = time.time() - start_time

        # Consistency/variance of landmarks
        landmark_variance = float(np.var(features)) if len(features) > 1 else 0.0

        # Model version (filename or timestamp)
        model_version = model_path

        # Raw output vector
        raw_output = probs[0].tolist()

        print(f"Prediction: {prediction}, Confidence: {confidence:.2f}%")
        print(f"Frames analyzed: {processed_frames}")
        print(f"Frame-wise probabilities: {frame_probs}")
        print(f"Probability vector: {raw_output}")
        print(f"Landmark variance: {landmark_variance}")
        print(f"Processing time: {processing_time:.2f} seconds")
        print(f"Model version: {model_version}")

        if prediction == 0:
            justification = f"The video appears to be authentic based on facial landmark analysis. The system analyzed {processed_frames} frames and found consistent facial features with {confidence:.2f}% confidence."
        else:
            justification = f"The video shows signs of manipulation based on facial landmark analysis. The system analyzed {processed_frames} frames and detected inconsistencies in facial features with {confidence:.2f}% confidence."
        
        return (
            "Real" if prediction == 0 else "Fake",
            confidence,
            justification,
            saved_frames_paths,
            processed_frames,
            frame_probs,
            raw_output,
            landmark_variance,
            processing_time,
            model_version
        )
    except Exception as e:
        print(f"Error in predict_video: {str(e)}")
        return "Error", 0.0, f"Error during video analysis: {str(e)}", [], 0, [], [], [], 0, ""

def retrain_model():
    """Retrain the model using all videos in the training folder."""
    from dataset_processing import process_dataset
    from model_training import train_model
    
    real_folder = os.path.join(TRAINING_FOLDER, 'real')
    fake_folder = os.path.join(TRAINING_FOLDER, 'fake')
    
    # Process the dataset
    X, y = process_dataset(real_folder, fake_folder)
    
    # Train new model
    new_model = train_model(X, y)
    
    # Save the model with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    new_model_path = f"svm_face_classifier_{timestamp}.pkl"
    joblib.dump(new_model, new_model_path)
    
    # Update the current model
    global model
    model = new_model
    
    return new_model_path

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
            result, confidence, justification, frames, processed_frames, frame_probs, raw_output, landmark_variance, processing_time, model_version = predict_video(filepath)
            return jsonify({
                'status': 'success',
                'prediction': result,
                'confidence': f"{confidence:.2f}%",
                'justification': justification,
                'frames': frames,
                'frames_analyzed': processed_frames,
                'frame_probs': frame_probs,
                'raw_output': raw_output,
                'landmark_variance': landmark_variance,
                'processing_time': processing_time,
                'model_version': model_version
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            # Clean up the uploaded file
            if os.path.exists(filepath):
                os.remove(filepath)

    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/store_for_training', methods=['POST'])
def store_for_training():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400

    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        # Get the prediction first
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filepath)

        try:
            result, _, _, _, _, _, _, _, _, _ = predict_video(filepath)
            
            # Store in appropriate folder based on prediction
            subfolder = 'real' if result == 'Real' else 'fake'
            training_path = os.path.join(app.config['TRAINING_FOLDER'], subfolder, file.filename)
            
            # Move the file to training folder
            shutil.move(filepath, training_path)
            
            return jsonify({
                'status': 'success',
                'message': f'Video stored for training in {subfolder} folder'
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            # Clean up if file still exists in uploads
            if os.path.exists(filepath):
                os.remove(filepath)

    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/retrain', methods=['POST'])
def retrain():
    try:
        new_model_path = retrain_model()
        return jsonify({
            'status': 'success',
            'message': 'Model retrained successfully',
            'model_path': new_model_path
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
