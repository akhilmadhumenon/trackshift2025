# Difference Video Generator

## Overview

The Difference Video Generator creates a visual comparison video that highlights differences between reference and damaged tyre videos. It applies multiple computer vision techniques to make damage visible and easy to analyze.

## Features

### 1. Edge Detection (Canny Algorithm)
- Applies Canny edge detection to identify structural features
- Highlights edges in white for clear visibility
- Uses Gaussian blur preprocessing to reduce noise
- Configurable thresholds (default: 50-150)

### 2. Crack Map Overlay
- Overlays detected crack maps in red
- Configurable alpha blending (default: 0.3)
- Highlights crack locations for easy identification
- Works with crack maps from crack detection module

### 3. Depth Color Mapping
- Applies blue-to-red gradient to visualize depth differences
- Blue = shallow differences (minor wear)
- Red = deep differences (significant damage)
- Blends with original frame for context

### 4. Frame-by-Frame Difference Computation
- Computes pixel-wise differences between reference and damaged frames
- Normalizes differences for consistent visualization
- Generates depth estimation from intensity differences

## API Endpoints

### POST /difference-video

Start a difference video generation job.

**Request Body:**
```json
{
  "reference_frames_dir": "/path/to/reference/frames",
  "damaged_frames_dir": "/path/to/damaged/frames",
  "crack_maps_dir": "/path/to/crack/maps",  // optional
  "depth_maps_dir": "/path/to/depth/maps",  // optional
  "output_video_path": "/path/to/output.mp4",
  "fps": 30,
  "apply_edges": true,
  "apply_crack_overlay": true,
  "apply_depth_colors": true
}
```

**Alternative (from raw videos):**
```json
{
  "reference_video_path": "/path/to/reference.mp4",
  "damaged_video_path": "/path/to/damaged.mp4",
  "crack_maps_dir": "/path/to/crack/maps",  // optional
  "depth_maps_dir": "/path/to/depth/maps",  // optional
  "output_video_path": "/path/to/output.mp4",
  "fps": 30,
  "apply_edges": true,
  "apply_crack_overlay": true,
  "apply_depth_colors": true
}
```

**Response:**
```json
{
  "job_id": "uuid-string",
  "status": "queued",
  "message": "Difference video generation job started"
}
```

### GET /difference-video/status/{job_id}

Get the status of a difference video generation job.

**Response:**
```json
{
  "job_id": "uuid-string",
  "status": "completed",
  "progress": 1.0,
  "metadata": {
    "output_path": "/path/to/output.mp4",
    "num_frames": 150,
    "fps": 30,
    "resolution": {
      "width": 1920,
      "height": 1080
    },
    "applied_effects": {
      "edge_detection": true,
      "crack_overlay": true,
      "depth_colors": true
    }
  },
  "error": null
}
```

## Usage Examples

### Python Direct Usage

```python
from difference_video_generator import generate_difference_video

# Generate from preprocessed frames
metadata = generate_difference_video(
    reference_frames_dir="./uploads/preprocessed/ref_id",
    damaged_frames_dir="./uploads/preprocessed/damaged_id",
    crack_maps_dir="./uploads/crack_maps/job_id",
    depth_maps_dir="./uploads/depth_maps/job_id",
    output_video_path="./uploads/difference_videos/output.mp4",
    fps=30,
    apply_edges=True,
    apply_crack_overlay=True,
    apply_depth_colors=True
)

print(f"Generated video with {metadata['num_frames']} frames")
```

### Backend Integration

The difference video generation is integrated into the reconstruction pipeline:

```typescript
// In backend/src/routes/reconstruct.ts
const differenceVideoPath = `${uploadDir}/difference_videos/${job.jobId}.mp4`;
const diffVideoMetadata = await generateDifferenceVideo(
  pythonServiceUrl,
  referenceOutputDir,
  damagedOutputDir,
  crackOutputDir,
  depthOutputDir,
  differenceVideoPath
);
```

## Technical Details

### Video Encoding
- Codec: MP4V (MPEG-4)
- Container: MP4
- Configurable FPS (default: 30)
- Maintains original video resolution

### Processing Pipeline

1. **Frame Loading**: Load reference and damaged frames
2. **Difference Computation**: Calculate pixel-wise differences
3. **Edge Detection**: Apply Canny edge detection (if enabled)
4. **Depth Coloring**: Apply blue-to-red gradient (if enabled)
5. **Crack Overlay**: Overlay crack maps in red (if enabled)
6. **Video Encoding**: Encode processed frames to MP4

### Performance Considerations

- Processes frames sequentially to manage memory
- Progress updates every 10 frames (for frame-based) or 30 frames (for video-based)
- Typical processing time: ~1-2 seconds per frame
- Memory usage: ~100MB for 1080p video processing

## Testing

Run the test suite:

```bash
cd python-service
python test_difference_video.py
```

Tests cover:
- Depth colormap application
- Edge detection
- Crack map overlay
- Frame difference computation
- Full video generation pipeline

## Requirements

- opencv-python >= 4.9.0
- numpy >= 1.26.0
- FFmpeg (for video encoding)

## Error Handling

Common errors and solutions:

1. **"No frames found in input directories"**
   - Ensure frame directories contain .png, .jpg, or .jpeg files
   - Check directory paths are correct

2. **"Failed to create video writer"**
   - Ensure output directory exists and is writable
   - Check FFmpeg is installed

3. **"Failed to open reference video"**
   - Verify video file exists and is readable
   - Check video codec is supported

## Integration with Reconstruction Pipeline

The difference video generator is called during the reconstruction process:

1. Videos are uploaded and preprocessed
2. Crack detection runs on damaged frames
3. Depth estimation compares reference and damaged frames
4. **Difference video generation** combines all results
5. Final video is served to frontend for synchronized playback

## Output Format

The generated difference video includes:
- White edges highlighting structural features
- Red overlays showing detected cracks
- Blue-to-red gradient showing depth differences
- Original damaged frame as base layer

This multi-layered visualization makes it easy to identify and assess tyre damage at a glance.
