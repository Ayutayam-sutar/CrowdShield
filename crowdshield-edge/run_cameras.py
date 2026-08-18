import os
import signal
import subprocess
import sys
import time
cameras = [
    # 📷 Camera 1: ITER Campus
    {
        "video": "passage.mp4",
        "zone": "gate_1",             # ITER Zone ID
        "venue": "soa-iter-01",        # ITER Venue ID
        "port": 5000
    },

    # 📷 Camera 2: Kalinga Stadium Gate 3
    {
        "video": "street.mp4",
        "zone": "ks_gate_3",           # 🚨 MATCHES mockData.ts ('ks_gate_3')
        "venue": "kalinga-stadium-01", # Kalinga Venue ID
        "port": 5001
    },
    # {"video": "video3.mp4", "zone": "zone_sports_complex_rd", "port": 5002},
        # {"video": "video4.mp4", "zone": "zone_e_block_lawn_rd", "port": 5003},
        # {"video": "video.mp4",  "zone": "zone_admin_block_rd", "port": 5004},
        # {"video": "exit.mp4", "zone": "gate_2", "port": 5005},
]
# cameras = [
#     {"video": "passage.mp4",  "zone": "gate_1", "port": 5000},
#     {"video": "street.mp4", "zone": "zone_library_roundabout", "port": 5001},
#     # {"video": "video3.mp4", "zone": "zone_sports_complex_rd", "port": 5002},
#     # {"video": "video4.mp4", "zone": "zone_e_block_lawn_rd", "port": 5003},
#     # {"video": "video.mp4",  "zone": "zone_admin_block_rd", "port": 5004},
#     # {"video": "exit.mp4", "zone": "gate_2", "port": 5005},
# ]

processes = []


def cleanup_processes(signum=None, frame=None):
  """Safely terminates all running camera subprocesses on exit or CTRL+C."""
  print("\n🛑 Shutting down all 6 CrowdShield camera streams...")
  for p in processes:
    if p.poll() is None:
      try:
        p.terminate()
      except Exception:
        pass

  time.sleep(2)

  for p in processes:
    if p.poll() is None:
      try:
        p.kill()
      except Exception:
        pass

  print("✅ Cleanup complete. All edge nodes stopped.")
  sys.exit(0)
signal.signal(signal.SIGINT, cleanup_processes)
signal.signal(signal.SIGTERM, cleanup_processes)

if __name__ == "__main__":
  print("🚀 Booting up CrowdShield Multi-Venue Matrix...")
  env = os.environ.copy()
  env["PYTHONUNBUFFERED"] = "1"
  for idx, cam in enumerate(cameras, start=1):
    cmd = [
        sys.executable,
        "edge_inference.py",
        "--video", cam["video"],
        "--zone", cam["zone"],
        "--venue", cam["venue"], 
        "--port", str(cam["port"]),
    ]

    p = subprocess.Popen(cmd, env=env)
    processes.append(p)
    print(f"✅ Started Camera: {cam['zone']} at {cam['venue']} (Port: {cam['port']})")
    time.sleep(3)

  print(
      "\n📡 All 6 Edge streams are live! Press CTRL+C to shut them all down.\n"
  )
  try:
    while True:
      time.sleep(2)
      for idx, p in enumerate(processes):
        poll = p.poll()
        if poll is not None:
          print(
              f"⚠️ Warning: Camera Node Zone {cameras[idx]['zone']} (Port:"
              f" {cameras[idx]['port']}) exited unexpectedly with code {poll}."
          )
  except KeyboardInterrupt:
    cleanup_processes()