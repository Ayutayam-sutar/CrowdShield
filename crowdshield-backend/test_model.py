import pandas as pd
import xgboost as xgb

# 1. Initialize an empty XGBoost Regressor
model = xgb.XGBRegressor()

# 2. Load the saved weights from Part 3
model.load_model("crowdshield_xgb_model.json")
print("✅ Model loaded successfully!")

# 3. Load sample test data (or take a few rows from your original CSV)
df = pd.read_csv("crowdshield_training_data.csv")

# Handle categorical columns if your training data used them
for col in df.select_dtypes(include=["object", "category"]).columns:
    df[col] = df[col].astype("category")

# Grab 5 sample rows (dropping the target column 'risk_score')
sample_inputs = df.drop("risk_score", axis=1).head(5)
actual_scores = df["risk_score"].head(5).values

# 4. Generate Predictions
predicted_scores = model.predict(sample_inputs)

# 5. Display Comparison
print("\n--- Model Verification Test ---")
for i in range(len(predicted_scores)):
    print(
        f"Row {i+1} | Predicted Risk: {predicted_scores[i]:.2f} | Actual Risk: {actual_scores[i]:.2f}"
    )