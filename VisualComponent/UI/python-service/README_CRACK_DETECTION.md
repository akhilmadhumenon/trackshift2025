# Crack Detection Module

## Overview

The crack detection module analyzes tyre images to identify and quantify crack patterns using computer vision techniques. It implements Canny edge detection and morphological operations to detect cracks, generate crack maps, and count the total number of cracks.

## Features

- **Canny Edge Detection**: Applies Canny algorithm to detect edges in tyre images
- **Morphological Operations**: Uses closing, opening, and dilation to identify crack patterns
- **Difference Analysis**: Compares reference and damaged images to isolate new damage
- **Crack Counting**: Counts distinct crack regions using connected component analysis
- **Crack Map Generation**: Creates visual crack maps with highlighted cracks in red
- **Composite Analysis**: Generates composite crack maps across all video frames

## API Endpoints

### Start Crack Detection Job

```http
POST /crack-detection
Content-Type: application/json

{
  "reference_frames_dir": "/path/to/reference/frames",
  "damaged_frames_dir": "/path/to/damaged/frames",
  "output_dir": "/path/to/output"
}
```

**Response:**
```json
{
  "job_id": "uuid-string",
  "status": "queued",
  "message": "Crack detection job started"
}
```

### Get Crack Detection Status

```http
GET /crack-detection/status/{job_id}
```

**Response:**
```json
{
  "job_id": "uuid-string",
  "status": "completed",
  "progress": 1.0,
  "metadata": {
    "total_frames_analyzed": 10,
    "total_crack_count": 45,
    "average_crack_count_per_frame": 4.5,
    "average_crack_density": 0.23,
    "composite_crack_map_path": "/path/to/composite_crack_map.png",
    "frame_results": [...]
  },
  "error": null
}
```

## Python API

### Basic Usage

```python
from crack_detector import detect_tyre_cracks

# Analyze cracks in tyre videos
results = detect_tyre_cracks(
    reference_frames_dir="/path/to/reference/frames",
    damaged_frames_dir="/path/to/damaged/frames",
    output_dir="/path/to/output"
)

print(f"Total cracks detected: {results['total_crack_count']}")
print(f"Average crack density: {results['average_crack_density']:.2f}%")
```

### Advanced Usage

```python
from crack_detector import CrackDetector
import cv2

# Initialize detector
detector = CrackDetector(
    reference_frames_dir="/path/to/reference/frames",
    damaged_frames_dir="/path/to/damaged/frames",
    output_dir="/path/to/output"
)

# Load images
damaged_img = cv2.imread("damaged_tyre.png")
reference_img = cv2.imread("reference_tyre.png")

# Detect cracks
crack_binary, crack_viz = detector.detect_cracks(damaged_img, reference_img)

# Count cracks
crack_count = detector.count_cracks(crack_binary)

print(f"Detected {crack_count} cracks")
```

## Output Files

The crack detection module generates the following outputs:

### Per-Frame Outputs
- `crack_map_XXXX.png`: Visual crack map with cracks highlighted in red
- `crack_binary_XXXX.png`: Binary crack map (white = crack, black = no crack)

### Aggregate Outputs
- `composite_crack_map.png`: Composite of all detected cracks across frames
- `crack_analysis_results.json`: JSON file with detailed analysis results

## Algorithm Details

### 1. Canny Edge Detection
- Converts image to grayscale
- Applies Gaussian blur (5x5 kernel, σ=1.4)
- Runs Canny edge detection (thresholds: 50, 150)

### 2. Morphological Operations
- **Closing**: Fills small gaps in crack lines (3x3 kernel, 1 iteration)
- **Opening**: Removes small noise (3x3 kernel, 1 iteration)
- **Dilation**: Makes cracks more visible (3x3 kernel, 1 iteration)

### 3. Difference Analysis
- Computes absolute difference between reference and damaged images
- Thresholds difference at 30 to get significant changes
- Combines with edge detection to isolate new cracks

### 4. Crack Counting
- Uses connected component analysis (8-connectivity)
- Filters components by minimum area (default: 20 pixels)
- Counts distinct crack regions

## Configuration Parameters

### Edge Detection
- `low_threshold`: Lower Canny threshold (default: 50)
- `high_threshold`: Upper Canny threshold (default: 150)

### Crack Counting
- `min_crack_area`: Minimum pixel area to count as crack (default: 20)

## Testing

Run the test suite:

```bash
python test_crack_simple.py
```

Expected output:
```
Running crack detection tests...

Testing Canny edge detection...
✓ Canny edge detection test passed
Testing crack counting...
✓ Crack counting test passed
Testing crack detection...
✓ Crack detection test passed
Testing full video crack analysis...
✓ Full analysis test passed

Tests passed: 4/4
```

## Requirements

The crack detection module requires:
- OpenCV (opencv-python >= 4.9.0)
- NumPy (numpy >= 1.26.0)
- Python 3.8+

## Integration with F1 Tyre Visual Difference Engine

The crack detection module integrates with the preprocessing and 3D reconstruction pipeline:

1. **Preprocessing**: Extract and process frames from videos
2. **Crack Detection**: Analyze frames to detect and count cracks
3. **3D Reconstruction**: Generate 3D models with crack overlays
4. **Insights Generation**: Combine crack data with depth and severity analysis

## Performance

- Processing time: ~0.5-1 second per frame (512x512 images)
- Memory usage: ~100MB for typical video analysis
- Scales linearly with number of frames

## Troubleshooting

### No cracks detected
- Check that images have sufficient contrast
- Adjust Canny thresholds (lower for more sensitivity)
- Verify that damaged frames actually contain visible cracks

### Too many false positives
- Increase `min_crack_area` parameter
- Use reference image for difference analysis
- Adjust Canny thresholds (higher for less sensitivity)

### Poor crack visualization
- Ensure input images are properly preprocessed
- Check that tyre is centered and properly oriented
- Verify lighting normalization was applied
