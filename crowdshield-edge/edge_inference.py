import os
import sys
import math
import cv2
import numpy as np
import pandas as pd
import requests
import xgboost as xgb
import threading
from collections import defaultdict, deque
from dotenv import load_dotenv
from ultralytics import YOLO

# Load environment variables (API keys, backend URL)
load_dotenv()
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
NODE_TOKEN = os.getenv("NODE_AUTH_TOKEN", "")

# ---------------------------------------------------------
# CONSTANTS & PHYSICAL CALIBRATION
# ---------------------------------------------------------
ZONE_ID = "z-3"
FPS = 30.0
TELEMETRY_INTERVAL_FRAMES = int(FPS * 2)  # Process and send every 2 seconds

# Mock Polygon for testing (x, y) - adjust to actual camera FOV
ZONE_POLYGON = np.array([[100, 100], [1180, 100], [1180, 620], [100, 620]], np.int32)
ZONE_AREA_SQM = 50.0       # Real-world area represented by the polygon
PIXELS_PER_METER = 35.0    # Approximate scale factor for velocity

# Vector pointing towards the "Safe Exit"
# If exit is at the bottom of the screen, vector is [0, 1] (y increases downwards)
EXIT_VECTOR = np.array([0, 1])

# ---------------------------------------------------------
# MODEL INITIALIZATION
# ---------------------------------------------------------
print("[Init] Loading YOLOv11 and XGBoost models...")
try:
    model = YOLO('weights/yolo11_custom_best.pt')
    print("[Init] Vision model loaded successfully.")
except Exception as e:
    print(f"[Warning] Failed to load custom YOLO. Falling back to default YOLOv8n. Error: {e}")
    model = YOLO('yolov8n.pt') # Fallback for immediate testing if weights are absent

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
        url = f"{backend_url}/api/v1/telemetry"
        res = requests.post(url, json=payload, headers=headers, timeout=2.0)
        if res.status_code == 200:
            print(f"[Telemetry Sync] {payload}")
        else:
            print(f"[Telemetry Error] Status {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[Telemetry Request Failed] Backend unreachable: {e}")

def process_video(source=0):
    """
    Main Edge Inference Loop
    source: 0 for webcam, or path to video file (e.g. 'crowd_video.mp4')
    """
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"[Error] Failed to open video source: {source}")
        return

    frame_count = 0
    latest_surge_score = 0.0
    latest_density = 0.0
    print(f"[Init] Starting inference loop on source {source}...")

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            print("[Info] End of stream.")
            break
            
        frame_count += 1
        
        # 1. ByteTrack YOLO Inference
        # tracker="bytetrack.yaml" uses the built-in advanced tracker
        results = model.track(frame, tracker="bytetrack.yaml", persist=True, verbose=False)
        
        people_in_zone = 0
        zone_speeds = []
        reverse_flow_count = 0
        movement_vectors = []
        
        if results[0].boxes.id is not None:
            # Extract bounding boxes (cx, cy, w, h) and tracking IDs
            boxes = results[0].boxes.xywh.cpu().numpy()
            track_ids = results[0].boxes.id.cpu().numpy().astype(int)
            
            for box, track_id in zip(boxes, track_ids):
                cx, cy, w, h = box
                
                # Draw bounding box and ID
                pt1 = (int(cx - w/2), int(cy - h/2))
                pt2 = (int(cx + w/2), int(cy + h/2))
                cv2.rectangle(frame, pt1, pt2, (0, 255, 0), 2)
                cv2.putText(frame, f"ID: {track_id}", (pt1[0], pt1[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                
                # 2. Polygon Inclusion Test
                if cv2.pointPolygonTest(ZONE_POLYGON, (cx, cy), False) >= 0:
                    people_in_zone += 1
                    
                    history = track_history[track_id]
                    history.append((cx, cy))
                    
                    # 3. Calculate Velocity & Direction
                    if len(history) >= 2:
                        start_pt = history[0]
                        end_pt = history[-1]
                        
                        dx = end_pt[0] - start_pt[0]
                        dy = end_pt[1] - start_pt[1]
                        
                        # Distance in pixels
                        dist_pixels = math.hypot(dx, dy)
                        
                        # Time passed between start_pt and end_pt
                        frames_passed = len(history) - 1
                        time_seconds = frames_passed / FPS
                        
                        if time_seconds > 0:
                            speed_mps = (dist_pixels / PIXELS_PER_METER) / time_seconds
                            zone_speeds.append(speed_mps)
                            
                        # Extract movement vector
                        move_vec = np.array([dx, dy])
                        vec_norm = np.linalg.norm(move_vec)
                        
                        if vec_norm > 1.0: # Ignore micro-jitter
                            move_vec_normalized = move_vec / vec_norm
                            movement_vectors.append(move_vec_normalized)
                            
                            # Check reverse flow (Dot product)
                            # If dot product is negative, angle is > 90 deg (opposite direction)
                            dot_prod = np.dot(move_vec_normalized, EXIT_VECTOR)
                            if dot_prod < -0.2: # Slight tolerance
                                reverse_flow_count += 1

        # 4. Feature Aggregation & Backend Sync (Every 2 seconds)
        if frame_count % TELEMETRY_INTERVAL_FRAMES == 0:
            density = people_in_zone / ZONE_AREA_SQM
            avg_speed = float(np.mean(zone_speeds)) if zone_speeds else 0.0
            
            # Boolean Flags
            reverse_flow_detected = False
            if people_in_zone > 3 and (reverse_flow_count / people_in_zone) > 0.20:
                reverse_flow_detected = True
                
            flow_conflict = False
            if len(movement_vectors) > 3:
                # High standard deviation of movement angles indicates crossing paths
                angles = [np.arctan2(v[1], v[0]) for v in movement_vectors]
                std_angle = np.std(angles)
                if std_angle > 1.0: # High variance threshold
                    flow_conflict = True
                    
            # 5. Risk Inference
            surge_score = 0.0
            if risk_model:
                try:
                    # Construct feature frame matching exact training columns
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
                # Fallback arithmetic heuristic if model isn't loaded
                score = (density * 0.15) + (1.0 - avg_speed) * 0.1 + (0.25 if flow_conflict else 0.0)
                surge_score = float(np.clip(score, 0.0, 1.0))
                
            latest_density = density
            latest_surge_score = surge_score
                
            # Construct Payload
            payload = {
                "zone_id": ZONE_ID,
                "person_count": people_in_zone,
                "density": round(density, 3),
                "avg_speed": round(avg_speed, 3),
                "flow_conflict": bool(flow_conflict),
                "surge_score": round(surge_score, 3),
                "reverse_flow_detected": bool(reverse_flow_detected)
            }
            
            # Post to FastAPI Backend asynchronously
            threading.Thread(target=send_telemetry_async, args=(payload, NODE_TOKEN, BACKEND_URL), daemon=True).start()

        # 6. VISUALIZATION (Debug Mode)
        # Draw the zone polygon
        cv2.polylines(frame, [ZONE_POLYGON], True, (0, 255, 255), 2)
        
        # Overlay the XGBoost surge_score and current density
        overlay_text = f"Surge Score: {latest_surge_score:.2f} | Density: {latest_density:.2f}"
        cv2.putText(frame, overlay_text, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255) if latest_surge_score > 0.7 else (0, 255, 0), 3)
        
        cv2.imshow('CrowdShield Edge Inference', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    # Ensure weights directory exists
    os.makedirs('weights', exist_ok=True)
    
    # Run the processing loop (0 defaults to laptop webcam, or replace with video file path)
    try:
        process_video(source=0)
    except KeyboardInterrupt:
        print("\n[Exit] Edge inference terminated by user.")
