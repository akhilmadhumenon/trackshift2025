"""
FastAPI application for F1 Analytics Service
Provides endpoints for race data, telemetry, and ML predictions
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path

# Import service modules
from fastf1_wrapper import FastF1Wrapper
from degradation_calculator import DegradationCalculator
from synthetic_sensors import SyntheticSensorGenerator
from ml_model import MLPredictor

# Initialize FastAPI app
app = FastAPI(
    title="F1 Analytics Service",
    description="Backend service for F1 tyre degradation analysis",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternative dev port
    os.getenv("FRONTEND_URL", "http://localhost:5173")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize service components
cache_dir = Path(__file__).parent / "cache"
cache_dir.mkdir(exist_ok=True)

# Path to the trained model
model_path = "/Users/thushara/SampleUI/trackshift2025/VisualComponent/UI/tyre_degradation_model.pkl"

fastf1_wrapper = FastF1Wrapper(cache_dir=str(cache_dir))
degradation_calc = DegradationCalculator()
sensor_gen = SyntheticSensorGenerator()
ml_predictor = MLPredictor(model_path=model_path)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "F1 Analytics Service",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/api/analytics/races")
async def get_races(year: int = Query(..., ge=2023, le=2024)):
    """
    Get list of available races for a given year
    
    Args:
        year: Season year (2023 or 2024)
    
    Returns:
        List of race names and metadata
    """
    try:
        races = fastf1_wrapper.get_available_races(year)
        return {
            "year": year,
            "races": races
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch races: {str(e)}")

@app.get("/api/analytics/race-data")
async def get_race_data(
    year: int = Query(..., ge=2023, le=2024),
    race: str = Query(..., min_length=1)
):
    """
    Load race session and laps data
    
    Args:
        year: Season year
        race: Race name (e.g., "Bahrain", "Monaco")
    
    Returns:
        Race session data with drivers and laps
    """
    try:
        race_data = fastf1_wrapper.load_race_data(year, race)
        return race_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load race data: {str(e)}")

@app.get("/api/analytics/telemetry")
async def get_telemetry(
    year: int = Query(..., ge=2023, le=2024),
    race: str = Query(..., min_length=1),
    driver: str = Query(..., min_length=1),
    stint: int = Query(..., ge=1)
):
    """
    Extract telemetry and calculate degradation for a specific stint
    
    Args:
        year: Season year
        race: Race name
        driver: Driver abbreviation (e.g., "VER", "HAM")
        stint: Stint number
    
    Returns:
        Telemetry data, degradation analysis, and synthetic sensor data
    """
    try:
        # Extract telemetry from FastF1
        telemetry_data = fastf1_wrapper.extract_telemetry(year, race, driver, stint)
        
        # Calculate degradation
        degradation_data = degradation_calc.calculate_degradation(telemetry_data)
        
        # Generate synthetic sensor data
        synthetic_data = sensor_gen.generate_sensors(telemetry_data, degradation_data)
        
        # Combine all data
        result = {
            **telemetry_data,
            "degradation": degradation_data,
            "synthetic_sensors": synthetic_data
        }
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract telemetry: {str(e)}")

@app.post("/api/analytics/predict")
async def predict_degradation(stint_data: dict):
    """
    Generate ML predictions for tyre degradation
    
    Args:
        stint_data: Dictionary containing telemetry, degradation, and synthetic sensor data
    
    Returns:
        Predicted degradation values for each lap
    """
    try:
        predictions = ml_predictor.predict(stint_data)
        return {
            "predictions": predictions,
            "model_version": ml_predictor.get_model_version()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
