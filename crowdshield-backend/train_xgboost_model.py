
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import KFold, train_test_split

print("Loading training data...")
df = pd.read_csv("crowdshield_training_data.csv")

# 1. Handle Categorical Columns automatically if present
for col in df.select_dtypes(include=["object", "category"]).columns:
    df[col] = df[col].astype("category")

X = df.drop("risk_score", axis=1)
y = df["risk_score"]

# 2. Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 3. Define Optimized XGBoost Model
model = xgb.XGBRegressor(
    objective="reg:squarederror",
    n_estimators=1000,  # High limit; early stopping will pick the best number
    learning_rate=0.03,  # Smaller step size for better generalization
    max_depth=6,  # Allow model to learn deeper feature interactions
    subsample=0.8,  # Row sampling to prevent overfitting
    colsample_bytree=0.8,  # Column sampling per tree
    reg_alpha=0.1,  # L1 Regularization
    reg_lambda=1.0,  # L2 Regularization
    tree_method="hist",  # Fast histogram method
    enable_categorical=True,  # Built-in handling for categorical columns
    early_stopping_rounds=20,  # Stop if test score doesn't improve for 20 trees
    random_state=42,
)

print("Training XGBoost Regressor with Early Stopping...")
# Fit model using evaluation set
model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=50)

# 4. Model Evaluation
predictions = model.predict(X_test)
rmse = mean_squared_error(y_test, predictions) ** 0.5
r2 = r2_score(y_test, predictions)

print(f"\n--- Evaluation Results ---")
print(f"Best Iteration (Trees Used): {model.best_iteration}")
print(f"Test RMSE: {rmse:.4f}")
print(f"R² Score: {r2:.4f}")

# 5. Save Model Output
model.save_model("crowdshield_xgb_model.json")
print("✅ Success: Model saved to crowdshield_xgb_model.json")