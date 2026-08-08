import os
import sys
import math
import cv2
import numpy as np
import pandas as pd
import requests
import xgboost as xgb
import threading
import argparse
from collections import defaultdict, deque
from dotenv import load_dotenv
from ultralytics import YOLO

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ---------------------------------------------------------
# ARGUMENT PARSING (Multi-Camera Support)
# ---------------------------------------------------------
parser = argparse.ArgumentParser(description="CrowdShield Edge Inference Node")
parser.add_argument("--video", type=str, default="video.mp4", help="Path to video file or camera index")
parser.add_argument("--zone", type=str, default="z-1", help="Target Zone ID for backend telemetry")
parser.add_argument("--port", type=int, default=5000, help="Local port to stream MJPEG video")
args = parser.parse_args()

VIDEO_SOURCE = args.video
ZONE_ID = args.zone
PORT = args.port

# Load environment variables
load_dotenv()
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
NODE_TOKEN = os.getenv("NODE_AUTH_TOKEN", "")

# ---------------------------------------------------------
# CONSTANTS & PHYSICAL CALIBRATION
# ---------------------------------------------------------
FPS = 30.0
TELEMETRY_INTERVAL_FRAMES = int(FPS * 2)  # Process and send every 2 seconds

# Mock Polygon for testing (x, y) - adjust to actual camera FOV
ZONE_POLYGON = np.array([[100, 100], [1180, 100], [1180, 620], [100, 620]], np.int32)
ZONE_AREA_SQM = 50.0       # Real-world area represented by the polygon
PIXELS_PER_METER = 35.0    # Approximate scale factor for velocity
EXIT_VECTOR = np.array([0, 1])

# ---------------------------------------------------------
# MODEL INITIALIZATION
# ---------------------------------------------------------
print(f"[Init] Starting node for Zone: {ZONE_ID}, Source: {VIDEO_SOURCE}, Port: {PORT}")
print("[Init] Loading YOLOv11 and XGBoost models...")
try:
    model = YOLO('weights/best (1).pt')
    print("[Init] Vision model loaded successfully.")
except Exception as e:
    print(f"[Warning] Failed to load custom YOLO (weights/best (1).pt). Falling back to default YOLOv8n. Error: {e}")
    model = YOLO('yolov11m.pt')

try:
    risk_model = xgb.Booster()
    risk_model.load_model('weights/xgboost_crowd_risk.json')
    print("[Init] XGBoost risk model loaded successfully.")
except Exception as e:
    print(f"[Warning] Failed to load XGBoost model. Will use fallback heuristics. Error: {e}")
    risk_model = None

# Track history: Map ByteTrack ID to a deque of (x,y) centroids over the last 10 frames
track_history = defaultdict(lambda: deque(maxlen=10))

def send_telemetry_async(payload, token, backend_url):
    try:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        url = f"{backend_url}/api/v1/telemetry/"
        res = requests.post(url, json=payload, headers=headers, timeout=2.0)
        if res.status_code == 200:
            print(f"[Telemetry Sync] {payload}")
        else:
            print(f"[Telemetry Error] Status {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[Telemetry Request Failed] Backend unreachable: {e}")

# ---------------------------------------------------------
# FASTAPI MJPEG STREAMING SERVER
# ---------------------------------------------------------
app = FastAPI(title=f"CrowdShield Edge - {ZONE_ID}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_mjpeg_stream(source):
    """
    Generator yielding AI-annotated frames in MJPEG format.
    Runs YOLO tracking & pushes telemetry to backend in parallel.
    """
    if isinstance(source, str) and not os.path.exists(source):
        print(f"[Warning] Source file '{source}' not found. Falling back to webcam (0).")
        source = 0

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"[Error] Failed to open video source: {source}")
        return

    frame_count = 0
    latest_surge_score = 0.0
    latest_density = 0.0
    print(f"[Init] Starting inference generator loop on source {source}...")

    try:
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                # Loop video if reading from file
                if isinstance(source, str):
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    break

            frame_count += 1

            # 1. ByteTrack YOLO Inference
            results = model.track(frame, tracker="bytetrack.yaml", persist=True, verbose=False)

            people_in_zone = 0
            zone_speeds = []
            reverse_flow_count = 0
            movement_vectors = []

            if results[0].boxes.id is not None:
                boxes = results[0].boxes.xywh.cpu().numpy()
                track_ids = results[0].boxes.id.cpu().numpy().astype(int)

                for box, track_id in zip(boxes, track_ids):
                    cx, cy, w, h = box
                    pt1 = (int(cx - w/2), int(cy - h/2))
                    pt2 = (int(cx + w/2), int(cy + h/2))

                    cv2.rectangle(frame, pt1, pt2, (0, 255, 0), 2)
                    cv2.putText(frame, f"ID: {track_id}", (pt1[0], pt1[1] - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

                    if cv2.pointPolygonTest(ZONE_POLYGON, (cx, cy), False) >= 0:
                        people_in_zone += 1
                        history = track_history[track_id]
                        history.append((cx, cy))

                        if len(history) >= 2:
                            start_pt = history[0]
                            end_pt = history[-1]
                            dx = end_pt[0] - start_pt[0]
                            dy = end_pt[1] - start_pt[1]
                            dist_pixels = math.hypot(dx, dy)
                            frames_passed = len(history) - 1
                            time_seconds = frames_passed / FPS

                            if time_seconds > 0:
                                speed_mps = (dist_pixels / PIXELS_PER_METER) / time_seconds
                                zone_speeds.append(speed_mps)

                            move_vec = np.array([dx, dy])
                            vec_norm = np.linalg.norm(move_vec)
                            if vec_norm > 1.0:
                                move_vec_normalized = move_vec / vec_norm
                                movement_vectors.append(move_vec_normalized)
                                dot_prod = np.dot(move_vec_normalized, EXIT_VECTOR)
                                if dot_prod < -0.2:
                                    reverse_flow_count += 1

            # 2. Telemetry Aggregation & Async Backend Sync
            if frame_count % TELEMETRY_INTERVAL_FRAMES == 0:
                density = people_in_zone / ZONE_AREA_SQM
                avg_speed = float(np.mean(zone_speeds)) if zone_speeds else 0.0

                reverse_flow_detected = bool(people_in_zone > 3 and (reverse_flow_count / people_in_zone) > 0.20)
                flow_conflict = False
                if len(movement_vectors) > 3:
                    angles = [np.arctan2(v[1], v[0]) for v in movement_vectors]
                    std_angle = np.std(angles)
                    if std_angle > 1.0:
                        flow_conflict = True

                surge_score = 0.0
                if risk_model:
                    try:
                        features = pd.DataFrame([{
                            'density': density,
                            'avg_speed': avg_speed,
                            'flow_conflict': int(flow_conflict),
                            'reverse_flow_detected': int(reverse_flow_detected)
                        }])
                        dmatrix = xgb.DMatrix(features)
                        surge_score_pred = risk_model.predict(dmatrix)[0]
                        surge_score = float(np.clip(surge_score_pred, 0.0, 1.0))
                    except Exception as e:
                        print(f"[Error] XGBoost inference failed: {e}")
                else:
                    score = (density * 0.15) + (1.0 - avg_speed) * 0.1 + (0.25 if flow_conflict else 0.0)
                    surge_score = float(np.clip(score, 0.0, 1.0))

                latest_density = density
                latest_surge_score = surge_score

                payload = {
                    "zone_id": ZONE_ID,
                    "person_count": people_in_zone,
                    "density": round(density, 3),
                    "avg_speed": round(avg_speed, 3),
                    "flow_conflict": bool(flow_conflict),
                    "surge_score": round(surge_score, 3),
                    "reverse_flow_detected": bool(reverse_flow_detected)
                }

                threading.Thread(target=send_telemetry_async, args=(payload, NODE_TOKEN, BACKEND_URL), daemon=True).start()

            # 3. Draw Polygon & Risk Overlay Text
            cv2.polylines(frame, [ZONE_POLYGON], True, (0, 255, 255), 2)
            overlay_text = f"Surge Score: {latest_surge_score:.2f} | Density: {latest_density:.2f}"
            cv2.putText(frame, overlay_text, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.0,
                        (0, 0, 255) if latest_surge_score > 0.7 else (0, 255, 0), 3)

            # 4. Encode frame to JPEG format
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 55])
            if not ret:
                continue

            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    finally:
        print("[Cleanup] Releasing video capture resource...")
        cap.release()

@app.get("/video_feed")
def video_feed():
    """
    MJPEG Live Streaming Endpoint.
    Returns HTTP 200 StreamingResponse with multipart/x-mixed-replace.
    """
    return StreamingResponse(
        content=generate_mjpeg_stream(VIDEO_SOURCE),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/health")
def health_check():
    return {"status": "online", "stream_url": f"http://localhost:{PORT}/video_feed"}

if __name__ == "__main__":
    os.makedirs('weights', exist_ok=True)
    print(f"Starting CrowdShield Edge MJPEG Streamer on http://0.0.0.0:{PORT}/video_feed ...")
    uvicorn.run(app, host="0.0.0.0", port=PORT)