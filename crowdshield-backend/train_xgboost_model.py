import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error

print("Loading training data...")
df = pd.read_csv('crowdshield_training_data.csv')

# Split features (X) and target (y)
X = df.drop('risk_score', axis=1)
y = df['risk_score']

# Train/Test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training XGBoost Regressor...")
model = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100, max_depth=4, learning_rate=0.1)
model.fit(X_train, y_train)

# Test accuracy
predictions = model.predict(X_test)
mse = mean_squared_error(y_test, predictions)
rmse = mse ** 0.5  # <--- Manually calculating the root to bypass the version error
print(f"Model trained successfully! RMSE: {rmse:.2f}")

# Save the model
model.save_model('crowdshield_xgb_model.json')
print("Success: Model weights saved to crowdshield_xgb_model.json")