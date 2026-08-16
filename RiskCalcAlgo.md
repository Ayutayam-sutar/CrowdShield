### XGBoost Risk Engine

**Input Features:**

| Feature | Source | Description |
|---|---|---|
| `density` | Camera headcount / zone area | Persons per m² |
| `avg_speed` | Optical flow estimation | Average pedestrian speed |
| `flow_conflict` | Directional analysis | Counter-flows detected (bool) |
| `reverse_flow_detected` | Optical flow | Crowd moving against expected direction |
| `capacity_ratio` | headcount / max_capacity | Zone fill percentage |
| `surge_score` | Δ headcount / Δ time | Rate of crowd inflow |

**Deterministic Safety Overrides (non-negotiable):**

| Condition | Override | Rationale |
|---|---|---|
| Reverse flow AND density > 3.0 p/m² | Risk score += 20.0 | Stampede precursor pattern |
| Capacity ratio > 0.85 AND surge > 0.7 | Minimum risk = 75.0 (Warning) | Overcapacity with rapid inflow |
| Density > 4.25 p/m² | Minimum risk = 90.0 (Critical) | Lethal crush threshold |

### Risk Classification

| Density (p/m²) | Risk Level | Color | Response |
|---|---|---|---|
| < 2.0 | **Safe** | 🟢 `#3F7D5C` | Normal operations |
| 2.0 – 3.0 | **Caution** | 🟡 `#D9A02D` | Increased monitoring |
| 3.0 – 4.0 | **Warning** | 🟠 `#C9501C` | Flow control + gate restrictions |
| > 4.0 | **Critical** | 🔴 `#B3242E` | Emergency evacuation |

---

### A* Pathfinding Cost Function

Edge traversal cost is dynamically weighted by live crowd density:

$$\text{Cost}(u, v) = d_{\text{physical}} \times \exp\!\bigl(\min(\rho \times 0.4,\; 10.0)\bigr) \times R$$

Where:
- $d_{\text{physical}}$ = Euclidean distance between nodes
- $\rho$ = Current density (p/m²) of the target zone
- $R$ = Risk multiplier: **Critical** = $8.0\times$, **Warning/Caution** = $2.5\times$, **Safe** = $1.0\times$

### Multi-Camera Overlap Deduplication

$$\text{True Headcount} = \sum_{i} C_i - \sum_{(A,B) \in \text{overlaps}} \alpha_{AB} \times \min(C_A, C_B)$$

Where $\alpha_{AB}$ is the pre-calibrated overlap ratio between adjacent camera zones defined in `venue_graph.json`.