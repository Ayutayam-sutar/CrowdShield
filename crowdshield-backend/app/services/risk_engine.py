"""
XGBoost Risk Engine with rule-based safety overrides.
Evaluates telemetry features to determine real-time crowd risk scores.
"""

import xgboost as xgb
import numpy as np

class RiskEngine:
    def __init__(self):
        # Placeholder for XGBoost model loading
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
        
        # Base ML Feature engineered scoring (Fallback if XGBoost isn't loaded)
        # Normalize features
        density_score = min(density / 5.0, 1.0) # Assume 5.0 is max safe density
        flow_conflict_score = 1.0 if flow_conflict else 0.0
        reverse_flow_penalty = 1.0 if reverse_flow_detected else 0.0
        
        # Risk = (0.45 * Density_Score) + (0.25 * Flow_Conflict_Score) + (0.20 * Reverse_Flow_Penalty) + (0.10 * Surge_Score)
        base_risk_prob = (0.45 * density_score) + (0.25 * flow_conflict_score) + (0.20 * reverse_flow_penalty) + (0.10 * surge_score)
        
        risk_score = min(max(base_risk_prob, 0.0), 1.0) * 100.0

        # Safety Rule Overrides (Non-negotiable life safety checks)
        
        # Rule 1: Reverse Flow Penalty
        if reverse_flow_detected and density > 3.0:
            risk_score = min(risk_score + 20.0, 100.0)
            override_applied = True

        # Rule 2: Capacity & Surge Warning
        if capacity_ratio > 0.85 and surge_score > 0.7:
            risk_score = max(risk_score, 75.0)
            override_applied = True
            
        # Rule 3: Critical Density Overcrowding
        if density > 4.25:
            risk_score = max(risk_score, 90.0)
            override_applied = True
            
        # Determine Level
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
