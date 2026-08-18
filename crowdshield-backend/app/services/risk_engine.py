"""
XGBoost Risk Engine with rule-based safety overrides.
Evaluates telemetry features to determine real-time crowd risk scores.
"""

import xgboost as xgb
import pandas as pd

class RiskEngine:
    def __init__(self):
        try:
            self.model = xgb.Booster()
            self.model.load_model('crowdshield_xgb_model.json')
            print("[RiskEngine] Successfully loaded XGBoost AI model.")
        except Exception as e:
            print(f"[RiskEngine] Warning: Could not load model. Falling back to heuristics. Error: {e}")
            self.model = None

    def calculate_risk(
        self, 
        density: float, 
        avg_speed: float, 
        flow_conflict: bool, 
        reverse_flow_detected: bool, 
        capacity_ratio: float,
        surge_score: float = 0.0
    ) -> tuple[float, str, bool]:
        """
        Calculates the risk score based on telemetry data.
        Returns a tuple: (risk_score, risk_level, override_applied)
        """
        override_applied = False
        
        if self.model:
            # --- 1. XGBoost AI Prediction ---
            features = pd.DataFrame([{
                'density': density,
                'avg_speed': avg_speed,
                'flow_conflict': int(flow_conflict),
                'reverse_flow_detected': int(reverse_flow_detected),
                'capacity_ratio': capacity_ratio,
                'surge_score': surge_score
            }])
            dmatrix = xgb.DMatrix(features)
            raw_pred = float(self.model.predict(dmatrix)[0])
            risk_score = min(max(raw_pred, 0.0), 100.0)
        else:
            # --- 2. Fallback Heuristics (Tuned for Hackathon Demo) ---
            # Max density threshold lowered from 5.0 to 3.0 so the base score climbs faster
            density_score = min(density / 3.0, 1.0)
            flow_conflict_score = 1.0 if flow_conflict else 0.0
            reverse_flow_penalty = 1.0 if reverse_flow_detected else 0.0
            
            base_risk_prob = (0.45 * density_score) + (0.25 * flow_conflict_score) + (0.20 * reverse_flow_penalty) + (0.10 * surge_score)
            risk_score = min(max(base_risk_prob, 0.0), 1.0) * 100.0

        # --- 3. Safety Rule Overrides (Tuned for Hackathon Demo) ---
        
        # Rule 1: Reverse Flow Penalty (Lowered trigger from 3.0 to 1.5)
        if reverse_flow_detected and density > 1.5:
            risk_score = min(risk_score + 20.0, 100.0)
            override_applied = True

        # Rule 2: Capacity & Surge Warning (Lowered thresholds slightly)
        if capacity_ratio > 0.60 and surge_score > 0.5:
            risk_score = max(risk_score, 75.0)
            override_applied = True
            
        # Rule 3: Critical Density Overcrowding (Lowered from 4.25 to 2.5)
        # THIS IS THE GUARANTEED TRIGGER FOR THE STAMPEDE ALERT
        if density > 2.5:
            risk_score = max(risk_score, 90.0)
            override_applied = True
            
        # --- 4. Determine Level ---
        if risk_score >= 90.0:
            risk_level = "critical"
        elif risk_score >= 75.0:
            risk_level = "warning"
        elif risk_score >= 40.0:
            risk_level = "caution"
        else:
            risk_level = "safe"

        return risk_score, risk_level, override_applied

risk_engine = RiskEngine()