import pandas as pd
import numpy as np

print("Generating synthetic crowd telemetry data...")

# Generate 2000 rows of simulated stadium data
data = []
for _ in range(2000):
    density = np.random.uniform(0.5, 6.0)
    avg_speed = np.random.uniform(0.1, 1.5)
    flow_conflict = np.random.choice([0, 1], p=[0.8, 0.2])
    reverse_flow = np.random.choice([0, 1], p=[0.9, 0.1])
    capacity_ratio = min(density / 5.0, 1.0)
    surge_score = np.random.uniform(0.0, 1.0)

    # Calculate target risk score with some random noise for realism
    base_risk = (0.45 * (density / 5.0)) + (0.25 * flow_conflict) + (0.20 * reverse_flow) + (0.10 * surge_score)
    risk_score = min(max(base_risk * 100 + np.random.normal(0, 5), 0), 100)

    # Apply safety overrides to the training data
    if reverse_flow == 1 and density > 3.0:
        risk_score = min(risk_score + 20.0, 100.0)
    if density > 4.25:
        risk_score = max(risk_score, 90.0)

    data.append([density, avg_speed, flow_conflict, reverse_flow, capacity_ratio, surge_score, risk_score])

# Save to CSV
df = pd.DataFrame(data, columns=['density', 'avg_speed', 'flow_conflict', 'reverse_flow_detected', 'capacity_ratio', 'surge_score', 'risk_score'])
df.to_csv('crowdshield_training_data.csv', index=False)
print("Success: Saved to crowdshield_training_data.csv")