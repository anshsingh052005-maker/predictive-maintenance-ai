import joblib
import pandas as pd
from pathlib import Path

# Load trained model
MODEL_PATH = Path(__file__).parent / "predictive_maintenance_model.pkl"
model = joblib.load(MODEL_PATH)


def predict_failure(
    air_temperature,
    process_temperature,
    rotational_speed,
    torque,
    tool_wear
):
    # Create input data with the same feature names used during training
    input_data = pd.DataFrame([{
        "Air temperature [K]": air_temperature,
        "Process temperature [K]": process_temperature,
        "Rotational speed [rpm]": rotational_speed,
        "Torque [Nm]": torque,
        "Tool wear [min]": tool_wear
    }])

       # Get failure probability
    probability = model.predict_proba(input_data)[0][1]

    # Failure prediction threshold
    FAILURE_THRESHOLD = 0.60
    prediction = int(probability >= FAILURE_THRESHOLD)
    maintenance_required = prediction == 1

    # Determine risk level
        # Determine risk level
    if probability >= 0.70:
        risk = "HIGH"
    elif probability >= 0.40:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    return {
        "prediction": prediction,
        "failure_probability": round(float(probability) * 100, 2),
        "risk_level": risk,
        "maintenance_required": maintenance_required
    }