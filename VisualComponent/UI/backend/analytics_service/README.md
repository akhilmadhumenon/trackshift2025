# F1 Analytics Service

Backend service for F1 tyre degradation analysis using FastF1 library.

## Setup

1. Install dependencies:
```bash
cd backend/analytics_service
pip install -r requirements.txt
```

2. Run the service:
```bash
python app.py
```

The service will start on `http://localhost:8001`

## API Endpoints

### GET /api/analytics/races
Get available races for a year.

**Query Parameters:**
- `year` (required): Season year (2023 or 2024)

**Example:**
```bash
curl "http://localhost:8001/api/analytics/races?year=2023"
```

### GET /api/analytics/race-data
Load race session and driver data.

**Query Parameters:**
- `year` (required): Season year
- `race` (required): Race name (e.g., "Bahrain", "Monaco")

**Example:**
```bash
curl "http://localhost:8001/api/analytics/race-data?year=2023&race=Bahrain"
```

### GET /api/analytics/telemetry
Extract telemetry and calculate degradation for a stint.

**Query Parameters:**
- `year` (required): Season year
- `race` (required): Race name
- `driver` (required): Driver abbreviation (e.g., "VER", "HAM")
- `stint` (required): Stint number

**Example:**
```bash
curl "http://localhost:8001/api/analytics/telemetry?year=2023&race=Bahrain&driver=VER&stint=1"
```

### POST /api/analytics/predict
Generate ML predictions for degradation.

**Request Body:**
```json
{
  "laps": [...],
  "degradation": {...},
  "synthetic_sensors": [...],
  "compound": "SOFT",
  "stint": 1
}
```

**Example:**
```bash
curl -X POST "http://localhost:8001/api/analytics/predict" \
  -H "Content-Type: application/json" \
  -d @stint_data.json
```

## Architecture

- `app.py` - FastAPI application with endpoints
- `fastf1_wrapper.py` - FastF1 library integration
- `degradation_calculator.py` - Fuel-corrected degradation calculations
- `synthetic_sensors.py` - Synthetic F1 sensor data generation
- `ml_model.py` - ML model loading and prediction
- `cache/` - FastF1 data cache directory

## Environment Variables

- `FRONTEND_URL` - Frontend origin for CORS (default: http://localhost:5173)

## Notes

- First data load for a race may take 10-30 seconds as FastF1 downloads data
- Subsequent loads are cached for faster access
- ML model is optional - service uses fallback predictions if model file not found
