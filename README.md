AlignAI (by GymGenius)

Real-Time AI Fitness & Posture Correction Assistant

AlignAI is a browser-based AI fitness app that provides instant posture correction during workouts using real-time pose estimation and biomechanics-based feedback — no sensors, wearables, or backend required.

Features

AI Pose Detection: Real-time keypoint tracking using TensorFlow.js MoveNet / MediaPipe BlazePose.

Instant Feedback: Audio-visual alerts (beeps, color overlays, hints) for incorrect posture.

Biomechanics-Aware Analysis: Validates joint angles and body alignment using physiotherapy standards.

Session Analytics: Local dashboard showing total reps, correct form %, and top errors.

Privacy by Design: Entirely client-side — no data leaves your browser.

One-Click Setup: Just open, allow camera access, and start moving.

Scientific Basis

Grounded in Exercise Science: Joint angle thresholds and feedback derived from sports biomechanics and physiotherapy research.

Clinically Validated Demos: Certified physiotherapist-approved reference videos for benchmark accuracy.

Data Sources: COCO Keypoints, InfiniteForm, Fitness-AQA datasets.

Tech Stack

Frontend:

HTML5, CSS3, JavaScript (or React for scalable builds)

TensorFlow.js (MoveNet Lightning / Thunder)

Canvas API for skeleton overlay

Web Audio API for alert beeps

LocalStorage for analytics

(Future Expansion):

Node.js + Express backend

MongoDB for user data & progress tracking

PWA version for offline workouts

UI/UX Highlights

Color-coded Joints: Green = correct, Red = incorrect.

Live Pose Skeleton: Overlaid on webcam feed.

End-of-Session Card: Displays accuracy metrics and improvement suggestions.

Demo Comparison Mode: Watch expert form beside your real-time posture.

Usage

Clone repo & open index.html in browser.

Allow webcam access.

Select exercise (e.g., Squat).

Perform movement — app gives instant feedback.

End session to view analytics summary.

Future Roadmap

Voice-based coaching assistant

Calorie estimation model

Cloud sync for progress tracking

Mobile-native (TensorFlow Lite) integration

References

TensorFlow.js MoveNet Docs

NSCA Exercise Form Guidelines

USC Biokinesiology & PT Research
