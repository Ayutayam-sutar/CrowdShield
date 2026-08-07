import subprocess
import time
import sys

# Define your 4 camera inputs, their target zones, and streaming ports
cameras = [
    {"video": "video.mp4",  "zone": "z-01", "port": 5000},
    {"video": "video2.mp4", "zone": "z-02", "port": 5001},
    {"video": "video3.mp4", "zone": "z-03", "port": 5002},
    {"video": "video4.mp4", "zone": "z-04", "port": 5003},
]

processes = []

print("🚀 Booting up CrowdShield Multi-Camera Matrix...")

# Boot each camera as an independent process
for cam in cameras:
    cmd = [
        sys.executable, "edge_inference.py", 
        "--video", cam["video"], 
        "--zone", cam["zone"], 
        "--port", str(cam["port"])
    ]
    p = subprocess.Popen(cmd)
    processes.append(p)
    print(f"✅ Started Camera: {cam['video']} -> Zone: {cam['zone']} (Port: {cam['port']})")
    
    # Wait 3 seconds between launches to prevent crashing your CPU/RAM all at once
    time.sleep(3) 

print("\n📡 All 4 Edge streams are live! Press CTRL+C to shut them all down.")

# Keep the launcher running until you stop it
try:
    for p in processes:
        p.wait()
except KeyboardInterrupt:
    print("\n🛑 Shutting down all camera streams...")
    for p in processes:
        p.terminate()
    print("Cleanup complete.")