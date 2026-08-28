from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ml_model.predict import predict_failure


app = FastAPI(
    title="PredictX API",
    description="AI-Based Predictive Maintenance System",
    version="1.0.0"
)

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


@app.post("/predict")
def predict(machine: MachineData):
    result = predict_failure(
        air_temperature=machine.air_temperature,
        process_temperature=machine.process_temperature,
        rotational_speed=machine.rotational_speed,
        torque=machine.torque,
        tool_wear=machine.tool_wear
    )

    result["maintenance_required"] = result["prediction"] == 1

    if result["prediction"] == 1:
        result["message"] = "Machine requires maintenance."
    else:
        result["message"] = "Machine is operating normally."

    return result