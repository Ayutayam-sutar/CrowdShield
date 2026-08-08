import numpy as np
import pandas as pd

# 1. Set seed for exact reproducibility across your team
np.random.seed(42)

print("Generating realistic synthetic crowd telemetry data...")

data = []
for _ in range(2500):
    density = np.random.uniform(0.5, 6.0)

    # 2. Physics Rule: Higher density naturally slows people down (stagnation)
    base_speed = max(1.5 - (density * 0.22), 0.1)
    avg_speed = max(
        0.05, base_speed + np.random.normal(0, 0.08)
    )  # Natural variation

    flow_conflict = np.random.choice([0, 1], p=[0.8, 0.2])
    reverse_flow = np.random.choice([0, 1], p=[0.9, 0.1])
    capacity_ratio = min(density / 5.0, 1.0)
    surge_score = np.random.uniform(0.0, 1.0)

    # 3. Speed/Stagnation Risk: Slow movement (<0.35 m/s) at high density adds risk
    stagnation_risk = 1.0 if (density > 3.0 and avg_speed < 0.35) else 0.0

    # 4. Calculate target risk score incorporating ALL features
    base_risk = (
        (0.35 * (density / 5.0))
        + (0.20 * flow_conflict)
        + (0.20 * reverse_flow)
        + (0.15 * surge_score)
        + (0.10 * stagnation_risk)
    )

    risk_score = min(max(base_risk * 100 + np.random.normal(0, 4), 0), 100)

    # Safety overrides
    if reverse_flow == 1 and density > 3.0:
        risk_score = min(risk_score + 20.0, 100.0)
    if density > 4.25:
        risk_score = max(risk_score, 90.0)

    data.append([
        density,
        avg_speed,
        flow_conflict,
        reverse_flow,
        capacity_ratio,
        surge_score,
        risk_score,
    ])

# Save dataset
df = pd.DataFrame(
    data,
    columns=[
        "density",
        "avg_speed",
        "flow_conflict",
        "reverse_flow_detected",
        "capacity_ratio",
        "surge_score",
        "risk_score",
    ],
)
df.to_csv("crowdshield_training_data.csv", index=False)
print("✅ Success: Saved realistic dataset to crowdshield_training_data.csv")