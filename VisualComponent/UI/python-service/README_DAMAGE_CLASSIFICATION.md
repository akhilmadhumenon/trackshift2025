# Damage Classification Module

## Overview

The damage classification module analyzes tyre images and crack detection maps to classify damage into specific types:

- **Blistering**: Circular bubble-like patterns on the tyre surface
- **Micro-cracks**: Dense network of fine cracks
- **Grain**: Surface texture roughness with fine crack patterns
- **Cuts**: Linear crack patterns indicating deep cuts
- **Flat spots**: Localized wear in specific regions
- **Chunking**: Large missing chunks of rubber

## Usage

### Python API

```python
from damage_classifier import classify_tyre_damage

# Classify damage in tyre videos
results = classify_tyre_damage(
    damaged_frames_dir="path/to/damaged/frames",
    crack_maps_dir="path/to/crack/binary/maps",
    output_dir="path/to/output"
)

print(f"Detected damage types: {results['detected_damage_types']}")
print(f"Total frames analyzed: {results['total_frames_analyzed']}")
```

### REST API

Start the FastAPI service:

```bash
python main.py
```

Submit a damage classification job:

```bash
curl -X POST "http://localhost:8000/damage-classification" \
  -H "Content-Type: application/json" \
  -d '{
    "damaged_frames_dir": "/path/to/damaged/frames",
    "crack_maps_dir": "/path/to/crack/maps",
    "output_dir": "/path/to/output"
  }'
```

Response:
```json
{
  "job_id": "uuid-here",
  "status": "queued",
  "message": "Damage classification job started"
}
```

Check job status:

```bash
curl "http://localhost:8000/damage-classification/status/{job_id}"
```

Response:
```json
{
  "job_id": "uuid-here",
  "status": "completed",
  "progress": 1.0,
  "metadata": {
    "total_frames_analyzed": 30,
    "detected_damage_types": ["micro-cracks", "grain", "cuts"],
    "damage_type_frame_counts": {
      "blistering": 0,
      "micro-cracks": 25,
      "grain": 20,
      "cuts": 15,
      "flat-spots": 0,
      "chunking": 2
    }
  }
}
```

## Classification Algorithm

The classifier uses rule-based computer vision techniques to detect damage patterns:

### 1. Texture Roughness Analysis
- Calculates gradient magnitude standard deviation
- High roughness indicates grain or blistering

### 2. Circular Pattern Detection
- Uses contour analysis with circularity metric
- Detects bubble-like blistering patterns

### 3. Linear Crack Detection
- Applies Hough Line Transform
- Identifies long, straight cuts

### 4. Fine Crack Network Detection
- Analyzes density of small crack structures
- Indicates micro-cracks or grain

### 5. Large Chunk Detection
- Finds large irregular contours
- Identifies missing rubber chunks

### 6. Flat Spot Detection
- Analyzes angular sector variance
- Detects localized wear patterns

## Output

The module generates:

1. **JSON Results File**: `damage_classification_results.json`
   - Overall detected damage types
   - Per-frame damage classification
   - Damage type occurrence counts

## Testing

Run the test suite:

```bash
python test_damage_classifier.py
```

The test creates synthetic damage patterns and validates:
- Individual detection methods
- Full classification pipeline
- Convenience function API

## Integration with CV Pipeline

The damage classifier integrates with the crack detection module:

```python
# 1. Run crack detection
from crack_detector import detect_tyre_cracks

crack_results = detect_tyre_cracks(
    reference_frames_dir="ref_frames",
    damaged_frames_dir="dam_frames",
    output_dir="crack_output"
)

# 2. Run damage classification using crack maps
from damage_classifier import classify_tyre_damage

damage_results = classify_tyre_damage(
    damaged_frames_dir="dam_frames",
    crack_maps_dir="crack_output/crack_maps",
    output_dir="damage_output"
)

print(f"Detected damage types: {damage_results['detected_damage_types']}")
```

## Requirements

- OpenCV (cv2)
- NumPy
- Python 3.8+

## Notes

- The classifier uses empirically determined thresholds that may need tuning for production use
- A damage type is considered present if detected in at least 20% of frames
- For production deployment, consider training a machine learning model for more accurate classification
