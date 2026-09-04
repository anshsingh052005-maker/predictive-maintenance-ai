from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ml_model.predict import predict_failure
from backend.database import (
    initialize_database,
    save_prediction,
    get_predictions,
    delete_predictions
)


app = FastAPI(
    title="PredictX API",
    description="AI-Based Predictive Maintenance System",
    version="1.0.0"
)


# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Initialize database when API starts
initialize_database()


class MachineData(BaseModel):
    air_temperature: float
    process_temperature: float
    rotational_speed: float
    torque: float
    tool_wear: float


@app.get("/")
def root():
    return {
        "message": "PredictX API is running!",
        "status": "success"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }

@app.get("/predictions")
def get_prediction_history():
    predictions = get_predictions()

    return {
        "count": len(predictions),
        "predictions": predictions
    }

@app.delete("/predictions")
def clear_prediction_history():
    delete_predictions()

    return {
        "message": "Prediction history cleared successfully.",
        "status": "success"
    }

@app.post("/predict")
def predict(machine: MachineData):

    # Get prediction from ML model
    result = predict_failure(
        air_temperature=machine.air_temperature,
        process_temperature=machine.process_temperature,
        rotational_speed=machine.rotational_speed,
        torque=machine.torque,
        tool_wear=machine.tool_wear
    )

    # Save prediction to SQLite database
    prediction_id = save_prediction(
        air_temperature=machine.air_temperature,
        process_temperature=machine.process_temperature,
        rotational_speed=machine.rotational_speed,
        torque=machine.torque,
        tool_wear=machine.tool_wear,
        prediction=result["prediction"],
        failure_probability=result["failure_probability"],
        risk_level=result["risk_level"],
        maintenance_required=result["maintenance_required"]
    )

    # Return database ID along with prediction
    result["prediction_id"] = prediction_id

    return result