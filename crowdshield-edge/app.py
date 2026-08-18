import os
import cv2
import math
import numpy as np
import pandas as pd
import threading
import requests
import xgboost as xgb
from collections import defaultdict, deque
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from ultralytics import YOLO
from dotenv import load_dotenv
load_dotenv()
app = FastAPI(title="CrowdShield Edge - Railway Node")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 1. LOAD MODELS (Single Instance in Memory)
# ---------------------------------------------------------
print("[Init] Loading Vision and Risk Models...")
yolo_path = "weights/best (1).pt" if os.path.exists("weights/best (1).pt") else "yolov8n.pt"

try:
    model = YOLO(yolo_path)
    print(f"[Init] Vision model loaded from '{yolo_path}'.")
except Exception as e:
    print(f"[Warning] Loading fallback YOLOv8n: {e}")
    model = YOLO("yolov8n.pt")

xgb_path = "weights/crowdshield_xgb_model.json" if os.path.exists("weights/crowdshield_xgb_model.json") else "weights/xgboost_crowd_risk.json"
risk_model = None
if os.path.exists(xgb_path):
    try:
        risk_model = xgb.XGBRegressor()
        risk_model.load_model(xgb_path)
        print(f"[Init] XGBoost risk model loaded from '{xgb_path}'.")
    except Exception as e:
        print(f"[Warning] Failed to load XGBoost: {e}")

# ---------------------------------------------------------
# 2. ACTIVE CAMERAS CONFIGURATION (Only 2 Active)
# ---------------------------------------------------------
CAMERAS = {
    # Camera 1: ITER Campus
    "gate_1": {
        "video": "passage.mp4",
        "venue": "soa-iter-01",
    },
    # Camera 2: Kalinga Stadium Gate 3
    "ks_gate_3": {
        "video": "street.mp4",
        "venue": "kalinga-stadium-01",
    }
}
FPS = 30.0
TELEMETRY_INTERVAL_FRAMES = int(FPS * 2)
ZONE_POLYGON = np.array([[100, 100], [1180, 100], [1180, 620], [100, 620]], np.float32)
ZONE_POLYGON_INT = ZONE_POLYGON.astype(np.int32)
METRIC_POLYGON = np.array([[0.0, 0.0], [10.0, 0.0], [10.0, 10.0], [0.0, 10.0]], np.float32)
HOMOGRAPHY_MATRIX = cv2.getPerspectiveTransform(ZONE_POLYGON, METRIC_POLYGON)
ZONE_AREA_SQM = 100.0
EXIT_VECTOR = np.array([0, 1])
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
NODE_TOKEN = os.getenv("NODE_AUTH_TOKEN", "")
def send_telemetry_async(payload):
    """Sends telemetry payload asynchronously."""
    try:
        headers = {"Authorization": f"Bearer {NODE_TOKEN}"} if NODE_TOKEN else {}
        url = f"{BACKEND_URL}/api/v1/telemetry/"
        requests.post(url, json=payload, headers=headers, timeout=3.0)
    except Exception:
        pass

# ---------------------------------------------------------
# 3. STREAM GENERATOR
# ---------------------------------------------------------
def generate_camera_stream(zone_id: str):
    config = CAMERAS.get(zone_id)
    if not config or not os.path.exists(config["video"]):
        print(f"[Error] Video source for zone '{zone_id}' not found.")
        return

    cap = cv2.VideoCapture(config["video"])
    frame_count = 0

    pixel_history = defaultdict(lambda: deque(maxlen=15))
    metric_history = defaultdict(lambda: deque(maxlen=15))
    latest_density = 0.0
    latest_surge_score = 0.0
    latest_avg_speed = 0.0

    while True:
        success, frame = cap.read()
        if not success:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        if frame.shape[1] != 1280 or frame.shape[0] != 720:
            frame = cv2.resize(frame, (1280, 720))

        frame_count += 1

        results = model.track(
            frame,
            tracker="bytetrack.yaml",
            persist=True,
            classes=[0, 2],
            conf=0.25,
            verbose=False,
        )

        people_in_zone = 0
        zone_speeds = []
        reverse_flow_count = 0
        movement_vectors = []
        current_frame_ids = set()

        if results and results[0].boxes is not None and results[0].boxes.id is not None:
            boxes = results[0].boxes.xywh.cpu().numpy()
            track_ids = results[0].boxes.id.cpu().numpy().astype(int)

            for box, track_id in zip(boxes, track_ids):
                cx, cy, w, h = box
                current_frame_ids.add(track_id)

                inside = cv2.pointPolygonTest(ZONE_POLYGON_INT, (int(cx), int(cy)), False) >= 0
                box_color = (0, 255, 0) if inside else (200, 200, 200)

                pt1 = (int(cx - w / 2), int(cy - h / 2))
                pt2 = (int(cx + w / 2), int(cy + h / 2))
                cv2.rectangle(frame, pt1, pt2, box_color, 2)

                if inside:
                    people_in_zone += 1
                    
                    foot_x, foot_y = float(cx), float(cy + h / 2)
                    pts = np.array([[[foot_x, foot_y]]], dtype=np.float32)
                    metric_pts = cv2.perspectiveTransform(pts, HOMOGRAPHY_MATRIX)
                    mx, my = metric_pts[0][0]

                    m_hist = metric_history[track_id]
                    m_hist.append((mx, my))

                    if len(m_hist) >= 2:
                        dx = m_hist[-1][0] - m_hist[0][0]
                        dy = m_hist[-1][1] - m_hist[0][1]
                        dist = math.hypot(dx, dy)
                        time_sec = (len(m_hist) - 1) / FPS
                        if time_sec > 0:
                            zone_speeds.append(dist / time_sec)

                        move_vec = np.array([dx, dy])
                        vec_norm = np.linalg.norm(move_vec)
                        if vec_norm > 0.1:
                            norm_vec = move_vec / vec_norm
                            movement_vectors.append(norm_vec)
                            if np.dot(norm_vec, EXIT_VECTOR) < -0.2:
                                reverse_flow_count += 1

        for sid in set(metric_history.keys()) - current_frame_ids:
            del metric_history[sid]
            if sid in pixel_history:
                del pixel_history[sid]

        if frame_count % TELEMETRY_INTERVAL_FRAMES == 0:
            density = float(people_in_zone) / ZONE_AREA_SQM if people_in_zone > 0 else 0.0
            avg_speed = float(np.mean(zone_speeds)) if zone_speeds else 0.0
            reverse_flow_detected = bool(people_in_zone > 3 and (reverse_flow_count / people_in_zone) > 0.20)
            flow_conflict = False

            if len(movement_vectors) > 3:
                angles = [np.arctan2(v[1], v[0]) for v in movement_vectors]
                if np.std(angles) > 1.0:
                    flow_conflict = True

            surge_score = 0.0
            if risk_model:
                try:
                    feat = pd.DataFrame([{
                        "density": density,
                        "avg_speed": avg_speed,
                        "flow_conflict": int(flow_conflict),
                        "reverse_flow_detected": int(reverse_flow_detected),
                        "capacity_ratio": min(density / 5.0, 1.0),
                        "surge_score": min(density / 4.0, 1.0)
                    }])
                    surge_score = float(np.clip(risk_model.predict(feat)[0] / 100.0, 0.0, 1.0))
                except Exception:
                    pass
            else:
                score = (density * 0.15) + (1.0 - min(avg_speed, 1.0)) * 0.10 + (0.25 if flow_conflict else 0.0)
                surge_score = float(np.clip(score, 0.0, 1.0))

            latest_density = density
            latest_surge_score = surge_score
            latest_avg_speed = avg_speed

            payload = {
                "zone_id": zone_id,
                "venue_id": config["venue"],
                "person_count": people_in_zone,
                "density": round(density, 3),
                "avg_speed": round(avg_speed, 3),
                "flow_conflict": flow_conflict,
                "surge_score": round(surge_score, 3),
                "reverse_flow_detected": reverse_flow_detected,
            }
            threading.Thread(target=send_telemetry_async, args=(payload,), daemon=True).start()

        cv2.polylines(frame, [ZONE_POLYGON_INT], True, (0, 255, 255), 2)
        hud_text = f"Zone: {zone_id} | Risk: {latest_surge_score*100:.1f}/100 | Density: {latest_density:.2f} p/m2"
        cv2.putText(frame, hud_text, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 0), 2)

        _, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")

# ---------------------------------------------------------
# 4. FASTAPI ROUTES
# ---------------------------------------------------------
@app.get("/stream/{zone_id}")
def stream_feed(zone_id: str):
    """Access live stream by zone: 'gate_1' or 'ks_gate_3'."""
    return StreamingResponse(
        generate_camera_stream(zone_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/health")
def health():
    return {"status": "online", "active_cameras": list(CAMERAS.keys())}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)