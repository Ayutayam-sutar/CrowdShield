import argparse
from collections import defaultdict, deque
import math
import os
import sys
import threading
import time
import shutil
import cv2
import numpy as np
import pandas as pd
import requests
import uvicorn
import xgboost as xgb
from ultralytics import YOLO
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# ---------------------------------------------------------
# ARGUMENT PARSING (Multi-Camera Support)
# ---------------------------------------------------------
parser = argparse.ArgumentParser(description="CrowdShield Edge Inference Node")
parser.add_argument(
    "--video",
    type=str,
    default="video.mp4",
    help="Path to video file or camera index",
)
parser.add_argument(
    "--zone", type=str, default="z-1", help="Target Zone ID for backend telemetry"
)
parser.add_argument(
    "--venue", type=str, default="soa-iter-01", help="Target Venue ID for backend telemetry"  # 🚨 NEW: Added venue argument
)
parser.add_argument(
    "--port", type=int, default=5000, help="Local port to stream MJPEG video"
)
args = parser.parse_args()

VIDEO_SOURCE = args.video
ZONE_ID = args.zone
VENUE_ID = args.venue 
PORT = args.port

# ---------------------------------------------------------
# BACKEND TARGETS (Dual-Broadcast: Local + Cloud)
# ---------------------------------------------------------
load_dotenv()
raw_backend_urls = os.getenv(
    "BACKEND_URLS", 
    "http://localhost:8000,https://crowdshield-uw8r.onrender.com"
)
BACKEND_URLS = [url.strip().rstrip("/") for url in raw_backend_urls.split(",") if url.strip()]
NODE_TOKEN = os.getenv("NODE_AUTH_TOKEN", "technova_demo_key_9988")

# ---------------------------------------------------------
# CONSTANTS & PHYSICAL CALIBRATION (IPM)
# ---------------------------------------------------------
FPS = 30.0
TELEMETRY_INTERVAL_FRAMES = int(FPS * 4)

# 🚨 FIX: Expanded polygon to cover almost the entire 1280x720 frame
ZONE_POLYGON = np.array(
    [[10, 10], [1270, 10], [1270, 710], [10, 710]], np.float32
)
ZONE_POLYGON_INT = ZONE_POLYGON.astype(np.int32)

REAL_WORLD_WIDTH_M = 10.0
REAL_WORLD_HEIGHT_M = 10.0
METRIC_POLYGON = np.array(
    [
        [0.0, 0.0],
        [REAL_WORLD_WIDTH_M, 0.0],
        [REAL_WORLD_WIDTH_M, REAL_WORLD_HEIGHT_M],
        [0.0, REAL_WORLD_HEIGHT_M],
    ],
    np.float32,
)

HOMOGRAPHY_MATRIX = cv2.getPerspectiveTransform(ZONE_POLYGON, METRIC_POLYGON)
ZONE_AREA_SQM = REAL_WORLD_WIDTH_M * REAL_WORLD_HEIGHT_M

EXIT_VECTOR = np.array([0, 1]) 

# ---------------------------------------------------------
# MODEL INITIALIZATION
# ---------------------------------------------------------
print(f"[Init] Starting node for Zone: {ZONE_ID}, Source: {VIDEO_SOURCE}, Port: {PORT}")
print("[Init] Loading YOLOv11 and XGBoost models...")

yolo_path = "weights/best (1).pt"
if not os.path.exists(yolo_path):
    yolo_path = "weights/best.pt" if os.path.exists("weights/best.pt") else "yolov11m.pt"

try:
    model = YOLO(yolo_path)
    print(f"[Init] Vision model loaded successfully from '{yolo_path}'.")
except Exception as e:
    print(f"[Warning] Failed to load custom YOLO. Falling back to default YOLOv8n. Error: {e}")
    model = YOLO("yolov8n.pt")

xgb_path = "weights/crowdshield_xgb_model.json"
if not os.path.exists(xgb_path):
    xgb_path = "weights/xgboost_crowd_risk.json"

try:
    risk_model = xgb.XGBRegressor()
    risk_model.load_model(xgb_path)
    print(f"[Init] XGBoost risk model loaded successfully from '{xgb_path}'.")
except Exception as e:
    print(f"[Warning] Failed to load XGBoost model from '{xgb_path}'. Will use fallback heuristics. Error: {e}")
    risk_model = None

pixel_history = defaultdict(lambda: deque(maxlen=15))
metric_history = defaultdict(lambda: deque(maxlen=15))


# ---------------------------------------------------------
# ASYNC TELEMETRY DISPATCHERS (Dual Broadcasting)
# ---------------------------------------------------------
def send_telemetry_to_single_backend(backend_url: str, payload: dict, token: str):
    """Sends telemetry data to a single backend target with graceful timeout handling."""
    try:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        url = f"{backend_url}/api/v1/telemetry/"
        
        res = requests.post(url, json=payload, headers=headers, timeout=5.0)
        
        if res.status_code in [200, 201]:
            print(f"[Telemetry Sync -> {backend_url}] Success (200)")
        else:
            print(f"[Telemetry Warning -> {backend_url}] HTTP {res.status_code}: {res.text}")
            
    except requests.exceptions.Timeout:
        print(f"[Telemetry Lag -> {backend_url}] Latency spike (request timed out)")
    except requests.exceptions.RequestException:
        print(f"[Telemetry Offline -> {backend_url}] Server unreachable")

def broadcast_telemetry_async(payload: dict, token: str, backend_urls: list):
    """Broadcasts telemetry to all configured backends concurrently."""
    for url in backend_urls:
        threading.Thread(
            target=send_telemetry_to_single_backend,
            args=(url, payload, token),
            daemon=True,
        ).start()

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

ACTIVE_SOURCE = VIDEO_SOURCE
RELOAD_SOURCE_FLAG = False


def generate_mjpeg_stream():
    """Generator yielding AI-annotated frames in MJPEG format."""
    global ACTIVE_SOURCE, RELOAD_SOURCE_FLAG

    current_src = ACTIVE_SOURCE
    if isinstance(current_src, str) and current_src.isdigit():
        current_src = int(current_src)
    elif isinstance(current_src, str) and not os.path.exists(current_src):
        print(f"[Warning] Source file '{current_src}' not found. Falling back to webcam (0).")
        current_src = 0

    cap = cv2.VideoCapture(current_src)
    if not cap.isOpened():
        print(f"[Error] Failed to open video source: {current_src}")
        return

    frame_count = 0
    latest_surge_score = 0.0
    latest_density = 0.0
    latest_avg_speed = 0.0  

    print(f"[Init] Starting inference generator loop on active source: {current_src}...")

    try:
        while True:
            if RELOAD_SOURCE_FLAG:
                print(f"[Hot-Swap] Switching active video feed dynamically to: {ACTIVE_SOURCE}")
                if cap.isOpened():
                    cap.release()

                new_src = ACTIVE_SOURCE
                if isinstance(new_src, str) and new_src.isdigit():
                    new_src = int(new_src)

                cap = cv2.VideoCapture(new_src)
                RELOAD_SOURCE_FLAG = False
                if not cap.isOpened():
                    print(f"[Error] Hot-swap failed. Cannot open new source: {ACTIVE_SOURCE}")
                    break
                continue

            if not cap.isOpened():
                break

            time.sleep(0.01)  

            success, frame = cap.read()
            if not success:
                if isinstance(ACTIVE_SOURCE, str):
                    print("[System] Video reached end. Reloading source to preserve memory...")
                    cap.release()
                    cap = cv2.VideoCapture(ACTIVE_SOURCE)
                    continue
                else:
                    break

            if frame.shape[1] != 1280 or frame.shape[0] != 720:
                frame = cv2.resize(frame, (1280, 720))

            frame_count += 1

            # 🚨 FIX: Lowered confidence to 0.15 to prevent hardware bottlenecks
            results = model.track(
                frame,
                tracker="bytetrack.yaml",
                persist=True,
                classes=[0, 2],
                conf=0.15, 
                verbose=False,
            )

            inference_ms = 0.0
            if results and len(results) > 0 and hasattr(results[0], "speed"):
                if isinstance(results[0].speed, dict):
                    inference_ms = results[0].speed.get("inference", 0.0)

            people_in_zone = 0
            zone_speeds = []
            reverse_flow_count = 0
            movement_vectors = []
            current_frame_ids = set()

            if results[0].boxes is not None and results[0].boxes.id is not None:
                boxes = results[0].boxes.xywh.cpu().numpy()
                track_ids = results[0].boxes.id.cpu().numpy().astype(int)

                for box, track_id in zip(boxes, track_ids):
                    cx, cy, w, h = box
                    current_frame_ids.add(track_id)

                    pt1 = (int(cx - w / 2), int(cy - h / 2))
                    pt2 = (int(cx + w / 2), int(cy + h / 2))

                    inside_zone = (
                        cv2.pointPolygonTest(
                            ZONE_POLYGON_INT, (int(cx), int(cy)), False
                        )
                        >= 0
                    )
                    box_color = (0, 255, 0) if inside_zone else (200, 200, 200)

                    cv2.rectangle(frame, pt1, pt2, box_color, 2)
                    cv2.putText(
                        frame,
                        f"ID: {track_id}",
                        (pt1[0], pt1[1] - 8),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        box_color,
                        2,
                    )

                    if inside_zone:
                        people_in_zone += 1

                        p_hist = pixel_history[track_id]
                        p_hist.append((int(cx), int(cy)))
                        for i in range(1, len(p_hist)):
                            cv2.line(frame, p_hist[i - 1], p_hist[i], (255, 255, 0), 2)

                        foot_x, foot_y = float(cx), float(cy + h / 2)
                        pts = np.array([[[foot_x, foot_y]]], dtype=np.float32)
                        metric_pts = cv2.perspectiveTransform(pts, HOMOGRAPHY_MATRIX)
                        mx, my = metric_pts[0][0]

                        m_hist = metric_history[track_id]
                        m_hist.append((mx, my))

                        if len(m_hist) >= 2:
                            start_pt = m_hist[0]
                            end_pt = m_hist[-1]
                            dx = end_pt[0] - start_pt[0]
                            dy = end_pt[1] - start_pt[1]

                            dist_meters = math.hypot(dx, dy)
                            frames_passed = len(m_hist) - 1
                            time_seconds = frames_passed / FPS

                            if time_seconds > 0:
                                speed_mps = dist_meters / time_seconds
                                zone_speeds.append(speed_mps)

                            move_vec = np.array([dx, dy])
                            vec_norm = np.linalg.norm(move_vec)

                            if vec_norm > 0.1:
                                move_vec_normalized = move_vec / vec_norm
                                movement_vectors.append(move_vec_normalized)

                                dot_prod = np.dot(move_vec_normalized, EXIT_VECTOR)
                                if dot_prod < -0.2:
                                    reverse_flow_count += 1

            stale_ids = set(metric_history.keys()) - current_frame_ids
            for sid in stale_ids:
                if len(metric_history[sid]) > 0:
                    metric_history[sid].popleft()
                    pixel_history[sid].popleft()
                if len(metric_history[sid]) == 0:
                    del metric_history[sid]
                    del pixel_history[sid]

            if frame_count % TELEMETRY_INTERVAL_FRAMES == 0:
                density = (
                    float(people_in_zone) / ZONE_AREA_SQM if people_in_zone > 0 else 0.0
                )
                avg_speed = float(np.mean(zone_speeds)) if zone_speeds else 0.0

                reverse_flow_detected = bool(
                    people_in_zone > 3 and (reverse_flow_count / people_in_zone) > 0.20
                )
                flow_conflict = False

                if len(movement_vectors) > 3:
                    angles = [np.arctan2(v[1], v[0]) for v in movement_vectors]
                    std_angle = np.std(angles)
                    if std_angle > 1.0:
                        flow_conflict = True

                capacity_ratio = min(density / 5.0, 1.0)
                estimated_surge_input = min(density / 4.0, 1.0)

                surge_score = 0.0
                if risk_model:
                    try:
                        features = pd.DataFrame([{
                            "density": density,
                            "avg_speed": avg_speed,
                            "flow_conflict": int(flow_conflict),
                            "reverse_flow_detected": int(reverse_flow_detected),
                            "capacity_ratio": capacity_ratio,
                            "surge_score": estimated_surge_input,
                        }])

                        raw_pred = float(risk_model.predict(features)[0])
                        surge_score = float(np.clip(raw_pred / 100.0, 0.0, 1.0))
                    except Exception as e:
                        print(f"[Error] XGBoost inference failed: {e}")
                else:
                    score = (
                        (density * 0.15)
                        + (1.0 - min(avg_speed, 1.0)) * 0.10
                        + (0.25 if flow_conflict else 0.0)
                        + (0.20 if reverse_flow_detected else 0.0)
                    )
                    surge_score = float(np.clip(score, 0.0, 1.0))

                latest_density = density
                latest_surge_score = surge_score
                latest_avg_speed = avg_speed

                payload = {
                    "zone_id": ZONE_ID,
                    "venue_id": VENUE_ID,
                    "person_count": people_in_zone,
                    "density": round(density, 3),
                    "avg_speed": round(avg_speed, 3),
                    "flow_conflict": bool(flow_conflict),
                    "surge_score": round(surge_score, 3),
                    "reverse_flow_detected": bool(reverse_flow_detected),
                    "inference_ms": round(inference_ms, 1),
                }

                threading.Thread(
                    target=broadcast_telemetry_async,
                    args=(payload, NODE_TOKEN, BACKEND_URLS),
                    daemon=True,
                ).start()

            cv2.polylines(frame, [ZONE_POLYGON_INT], True, (0, 255, 255), 2)

            overlay = frame.copy()
            cv2.rectangle(overlay, (20, 20), (760, 75), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
            hud_color = (0, 0, 255) if latest_surge_score > 0.70 else (0, 255, 0)
            overlay_text = (
                f"Zone: {ZONE_ID} | Risk: {latest_surge_score*100:.1f}/100 | "
                f"Density: {latest_density:.2f} p/m2 | Vel: {latest_avg_speed:.2f} m/s"
            )
            cv2.putText(
                frame,
                overlay_text,
                (30, 55),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                hud_color,
                2,
            )
            ret, buffer = cv2.imencode(
                ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 55]
            )
            if not ret:
                continue
            yield (
                b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
                + buffer.tobytes()
                + b"\r\n"
            )
    finally:
        print("[Cleanup] Releasing video capture resource...")
        if cap and cap.isOpened():
            cap.release()


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Receives a new video file from frontend and hot-swaps the live feed."""
    global ACTIVE_SOURCE, RELOAD_SOURCE_FLAG

    os.makedirs("uploads", exist_ok=True)
    file_location = f"uploads/{file.filename}"

    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    ACTIVE_SOURCE = file_location
    RELOAD_SOURCE_FLAG = True

    return {
        "status": "success",
        "message": "Video hot-swapped successfully",
        "file": file.filename,
    }


@app.get("/video_feed")
def video_feed():
    """MJPEG Live Streaming Endpoint."""
    return StreamingResponse(
        generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/health")
def health_check():
    return {
        "status": "online",
        "zone_id": ZONE_ID,
        "stream_url": f"http://localhost:{PORT}/video_feed",
    }


if __name__ == "__main__":
    os.makedirs("weights", exist_ok=True)
    print(
        f"Starting CrowdShield Edge MJPEG Streamer on http://0.0.0.0:{PORT}/video_feed ..."
    )
    uvicorn.run(app, host="0.0.0.0", port=PORT)