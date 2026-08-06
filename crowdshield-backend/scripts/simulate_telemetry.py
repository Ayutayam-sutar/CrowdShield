import time
import requests
import argparse
import random
import sys

BASE_URL = "http://localhost:8000/api/v1/telemetry"

# Mock zones to simulate
ZONES = [
    {"zone_id": "z-1", "capacity_limit": 2500},
    {"zone_id": "z-2", "capacity_limit": 1800},
    {"zone_id": "z-3", "capacity_limit": 4000}, # West Exit, prone to surge
    {"zone_id": "z-4", "capacity_limit": 3000}
]

def generate_normal_payload(zone):
    area_sqm = zone["capacity_limit"] / 5.0
    # Normal density ~ 1.2 p/m2
    target_density = random.uniform(1.0, 1.4)
    person_count = int(target_density * area_sqm)
    
    return {
        "zone_id": zone["zone_id"],
        "person_count": person_count,
        "avg_speed": random.uniform(1.2, 1.6),
        "flow_conflict": False,
        "reverse_flow_detected": False
    }

def generate_crisis_payload(zone, step_time):
    area_sqm = zone["capacity_limit"] / 5.0
    
    if step_time < 10:
        # Step 1: Normal
        target_density = random.uniform(1.0, 1.5)
        avg_speed = random.uniform(1.2, 1.5)
        reverse = False
    elif step_time < 20:
        # Step 2a: Gradual surge (1.5 -> 3.2)
        target_density = random.uniform(2.5, 3.2)
        avg_speed = random.uniform(0.6, 0.9)
        reverse = random.choice([True, False])
    elif step_time < 30:
        # Step 2b: Severe surge (3.2 -> 4.5)
        target_density = random.uniform(3.5, 4.5)
        avg_speed = random.uniform(0.2, 0.5)
        reverse = True
    else:
        # Step 3: Sustained Critical
        target_density = random.uniform(4.5, 5.2)
        avg_speed = random.uniform(0.1, 0.3)
        reverse = True

    person_count = int(target_density * area_sqm)
    return {
        "zone_id": zone["zone_id"],
        "person_count": person_count,
        "avg_speed": avg_speed,
        "flow_conflict": target_density > 3.0,
        "reverse_flow_detected": reverse
    }

def main():
    parser = argparse.ArgumentParser(description="Standalone Edge Telemetry Simulator")
    parser.add_argument("--crisis", action="store_true", help="Enable crisis mode escalation for Zone 3")
    args = parser.parse_args()

    print(f"Starting Telemetry Simulator... Crisis Mode: {'ON' if args.crisis else 'OFF'}")
    
    start_time = time.time()
    
    try:
        while True:
            elapsed = time.time() - start_time
            print(f"--- Tick [{int(elapsed)}s] ---")
            
            for zone in ZONES:
                if args.crisis and zone["zone_id"] == "z-3":
                    payload = generate_crisis_payload(zone, elapsed)
                else:
                    payload = generate_normal_payload(zone)
                    
                try:
                    response = requests.post(BASE_URL, json=payload, timeout=2)
                    if response.status_code == 200:
                        data = response.json()
                        risk = data.get("calculated_risk_score", 0)
                        density = payload["person_count"] / (zone["capacity_limit"] / 5.0)
                        print(f"[{zone['zone_id']}] POST OK - Density: {density:.2f}, Risk: {risk:.1f}")
                    else:
                        print(f"[{zone['zone_id']}] POST FAILED - {response.status_code}: {response.text}")
                except requests.exceptions.RequestException as e:
                    print(f"[{zone['zone_id']}] POST ERROR - {e}")
                    
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")
        sys.exit(0)

if __name__ == "__main__":
    main()
