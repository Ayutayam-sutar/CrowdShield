import os
import signal
import subprocess
import sys
import time

# Define your 6 camera inputs, their target zones, and streaming ports
cameras = [
    {"video": "video.mp4",  "zone": "gate_1", "port": 5000},
    {"video": "video2.mp4", "zone": "zone_library_roundabout", "port": 5001},
    {"video": "video3.mp4", "zone": "zone_sports_complex_rd", "port": 5002},
    {"video": "video4.mp4", "zone": "zone_e_block_lawn_rd", "port": 5003},
    {"video": "video.mp4",  "zone": "zone_admin_block_rd", "port": 5004},
    {"video": "video2.mp4", "zone": "gate_2", "port": 5005},
]

processes = []


def cleanup_processes(signum=None, frame=None):
  """Safely terminates all running camera subprocesses on exit or CTRL+C."""
  print("\n🛑 Shutting down all 4 CrowdShield camera streams...")
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


# Register signal handlers for graceful shutdown
signal.signal(signal.SIGINT, cleanup_processes)
signal.signal(signal.SIGTERM, cleanup_processes)

if __name__ == "__main__":
  print("🚀 Booting up CrowdShield Multi-Camera Matrix...")

  # Unbuffered output environment
  env = os.environ.copy()
  env["PYTHONUNBUFFERED"] = "1"

  # Boot each camera as an independent process
  for idx, cam in enumerate(cameras, start=1):
    cmd = [
        sys.executable,
        "edge_inference.py",
        "--video",
        cam["video"],
        "--zone",
        cam["zone"],
        "--port",
        str(cam["port"]),
    ]

    p = subprocess.Popen(cmd, env=env)
    processes.append(p)
    print(
        f"✅ [{idx}/{len(cameras)}] Started Camera: {cam['video']} -> Zone:"
        f" {cam['zone']} (Port: {cam['port']})"
    )

    # Wait 3 seconds between launches to prevent RAM/GPU spike during load
    time.sleep(3)

  print(
      "\n📡 All 4 Edge streams are live! Press CTRL+C to shut them all down.\n"
  )

  # Active Health Monitoring Loop
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