"""
Predictive Engine using scikit-learn for time-series forecasting.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.telemetry import TelemetryLog
from sklearn.linear_model import Ridge
import numpy as np

async def predict_density(zone_id: str, db: AsyncSession):
    now = datetime.now(timezone.utc)
    thirty_mins_ago = now - timedelta(minutes=30)
    
    # Fetch telemetry for the zone for the last 30 minutes, ordered by time
    query = (
        select(TelemetryLog)
        .where(TelemetryLog.zone_id == zone_id)
        .where(TelemetryLog.timestamp >= thirty_mins_ago)
        .order_by(TelemetryLog.timestamp.asc())
    )
    result = await db.execute(query)
    logs = result.scalars().all()
    
    if len(logs) < 10:
        return {"error": "Not enough data for prediction"}
        
    # We will resample data to 1-minute intervals for simplicity
    # Map each minute to the max density in that minute
    resampled_data = {}
    for log in logs:
        # group by minute
        minute_ts = log.timestamp.replace(second=0, microsecond=0)
        if minute_ts not in resampled_data:
            resampled_data[minute_ts] = log.density
        else:
            resampled_data[minute_ts] = max(resampled_data[minute_ts], log.density)
            
    sorted_times = sorted(resampled_data.keys())
    densities = [resampled_data[t] for t in sorted_times]
    
    if len(densities) < 5:
        return {"error": "Not enough resampled data for prediction"}
        
    # Create lagged features (e.g., density at t-1, t-2, t-3)
    X = []
    y = []
    lags = 3
    for i in range(lags, len(densities)):
        X.append(densities[i-lags:i])
        y.append(densities[i])
        
    if len(X) < 2:
        # Fallback to simple exponential smoothing if not enough data to train
        last_val = densities[-1]
        return _generate_response(sorted_times, densities, [last_val]*4, now)
        
    model = Ridge(alpha=1.0)
    model.fit(X, y)
    
    # Predict future values iteratively
    future_densities = []
    current_features = densities[-lags:]
    
    # Predict for t+1, t+2, ... t+10
    for step in range(1, 11):
        pred = model.predict([current_features])[0]
        # ensure density is non-negative
        pred = max(0.0, pred)
        future_densities.append(pred)
        # Shift features
        current_features = current_features[1:] + [pred]
        
    # We want t+2m, t+5m, t+8m, t+10m
    forecast = [future_densities[1], future_densities[4], future_densities[7], future_densities[9]]
    
    return _generate_response(sorted_times, densities, forecast, now)

def _generate_response(historical_times, historical_densities, forecast, now):
    historical = [
        {"time": t.strftime('%H:%M:%S'), "density": d}
        for t, d in zip(historical_times, historical_densities)
    ]
    
    projected = [
        {"time": (now + timedelta(minutes=2)).strftime('%H:%M:%S'), "density": forecast[0]},
        {"time": (now + timedelta(minutes=5)).strftime('%H:%M:%S'), "density": forecast[1]},
        {"time": (now + timedelta(minutes=8)).strftime('%H:%M:%S'), "density": forecast[2]},
        {"time": (now + timedelta(minutes=10)).strftime('%H:%M:%S'), "density": forecast[3]},
    ]
    
    # Trigger Early Warning
    current_density = historical_densities[-1]
    predicted_10m = forecast[3]
    warning_triggered = False
    
    if current_density < 3.0 and predicted_10m >= 4.0:
        warning_triggered = True
        
    return {
        "historical": historical,
        "projected": projected,
        "warning_triggered": warning_triggered,
        "current_density": current_density,
        "predicted_10m": predicted_10m
    }
