# Severity Calculator Implementation

## Overview

The severity calculator module combines crack count, depth, and damage types into a comprehensive 0-100 severity score with timeline analysis by rotation angle.

## Features

### 1. Severity Score Calculation (0-100)

The severity score uses weighted factors:
- **Crack Density: 40%** - Percentage of pixels containing cracks
- **Depth: 30%** - Maximum depth estimate in millimeters
- **Damage Type: 30%** - Severity based on detected damage types

### 2. Damage Type Severity Weights

Each damage type has an associated severity weight:
- **Chunking**: 1.0 (most severe)
- **Flat Spots**: 0.9
- **Cuts**: 0.8
- **Blistering**: 0.7
- **Micro-cracks**: 0.5
- **Grain**: 0.4 (least severe)

### 3. Severity Timeline

Generates a timeline showing severity score at each rotation angle (0-360°):
- Maps frame index to rotation angle
- Calculates severity for each frame
- Provides component scores (crack, depth, damage type)

## API Endpoints

### POST /severity-calculation

Start a severity calculation job.

**Request Body:**
```json
{
  "crack_results_path": "/path/to/crack_analysis_results.json",
  "depth_results_path": "/path/to/depth_analysis_results.json",
  "damage_results_path": "/path/to/damage_classification_results.json",
  "output_dir": "/path/to/output"
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "queued",
  "message": "Severity calculation job started"
}
```

### GET /severity-calculation/status/{job_id}

Get the status of a severity calculation job.

**Response:**
```json
{
  "job_id": "uuid",
  "status": "completed",
  "progress": 1.0,
  "metadata": {
    "overall_severity_score": 62.0,
    "component_scores": {
      "crack_density_score": 32.0,
      "depth_score": 84.0,
      "damage_type_score": 80.0
    },
    "severity_timeline": [
      {
        "rotation_angle": 0.0,
        "severity": 52.0,
        "crack_density_score": 28.0,
        "depth_score": 70.0,
        "damage_type_score": 80.0
      }
    ],
    "timeline_statistics": {
      "max_severity": 71.8,
      "min_severity": 33.7,
      "average_severity": 55.2
    },
    "input_metrics": {
      "average_crack_density": 3.2,
      "max_depth_mm": 4.2,
      "damage_types": ["micro-cracks", "grain", "cuts", "blistering"]
    }
  },
  "error": null
}
```

## Python Module Usage

### Direct Function Call

```python
from severity_calculator import calculate_severity_score

# Load analysis results
crack_results = {...}  # From crack detection
depth_results = {...}  # From depth estimation
damage_results = {...}  # From damage classification

# Calculate severity
analysis = calculate_severity_score(
    crack_results=crack_results,
    depth_results=depth_results,
    damage_results=damage_results,
    output_dir="/path/to/output"
)

print(f"Severity Score: {analysis['overall_severity_score']:.1f}/100")
```

### Using SeverityCalculator Class

```python
from severity_calculator import SeverityCalculator

calculator = SeverityCalculator(output_dir="/path/to/output")

# Calculate overall severity
analysis = calculator.calculate_overall_severity(
    crack_results=crack_results,
    depth_results=depth_results,
    damage_results=damage_results
)

# Generate timeline
timeline = calculator.generate_severity_timeline(
    crack_results=crack_results,
    depth_results=depth_results,
    damage_results=damage_results
)
```

## Output Files

The module generates the following output:

### severity_analysis_results.json

Complete severity analysis including:
- Overall severity score (0-100)
- Component scores (crack density, depth, damage type)
- Severity timeline with rotation angles
- Timeline statistics (max, min, average)
- Input metrics used for calculation

## Severity Score Interpretation

- **0-30**: Minor damage - Safe for qualifying laps
- **30-50**: Light damage - Monitor for next stint
- **50-80**: Moderate damage - Monitor closely, consider replacement
- **80-100**: Severe damage - Replace immediately

## Testing

Run the test suite:

```bash
# Unit tests
python python-service/test_severity_calculator.py

# Integration tests
python python-service/test_severity_integration.py
```

## Requirements Satisfied

✓ **Requirement 5.2**: Calculate severity score (0-100) combining crack count, depth, and damage types
✓ **Requirement 5.6**: Generate severity timeline by rotation angle (0-360°)

### Weight Factors (as specified):
- Crack density: 40%
- Depth: 30%
- Damage type severity: 30%

## Example Results

### Input Metrics:
- Average Crack Density: 3.2%
- Max Depth Estimate: 4.2 mm
- Detected Damage Types: micro-cracks, grain, cuts, blistering

### Output:
- **Overall Severity Score**: 62.0/100
- **Component Scores**:
  - Crack Density: 32.0/100
  - Depth: 84.0/100
  - Damage Type: 80.0/100
- **Timeline**: 36 points from 0° to 360°
- **Timeline Statistics**:
  - Max Severity: 71.8/100
  - Min Severity: 33.7/100
  - Average Severity: 55.2/100
