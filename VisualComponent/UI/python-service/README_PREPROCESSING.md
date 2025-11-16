# Video Preprocessing Pipeline

## Overview

The video preprocessing pipeline is responsible for preparing tyre videos for 3D reconstruction and analysis. It performs the following operations:

1. **Frame Extraction** - Extracts frames from video using FFmpeg
2. **Tyre Circle Detection** - Detects the tyre circle using OpenCV Hough Circle Transform
3. **Frame Reorientation** - Reorients frames to perfect 90° top-down view
4. **Rotation Stabilization** - Stabilizes rotation across frames for consistency
5. **Brightness/Contrast Normalization** - Normalizes lighting using CLAHE

## Architecture

### VideoPreprocessor Class

The main class that handles all preprocessing operations.

**Key Methods:**
- `extract_frames(fps)` - Extracts frames from video at specified FPS
- `detect_tyre_circle(image)` - Detects tyre circle using Hough Transform
- `reorient_frame(image, circle)` - Crops and centers frame on tyre
- `stabilize_rotation(frames)` - Stabilizes rotation using ORB feature matching
- `normalize_brightness_contrast(image)` - Applies CLAHE normalization
- `process_video(fps)` - Runs complete preprocessing pipeline

## API Endpoints

### POST /preprocess

Start a video preprocessing job.

**Request Body:**
```json
{
  "video_path": "/path/to/video.mp4",
  "output_dir": "/path/to/output",
  "fps": 30
}
```

**Response:**
```json
{
  "job_id": "uuid-string",
  "status": "queued",
  "message": "Video preprocessing job started"
}
```

### GET /preprocess/status/{job_id}

Get the status of a preprocessing job.

**Response:**
```json
{
  "job_id": "uuid-string",
  "status": "completed",
  "progress": 1.0,
  "metadata": {
    "video_path": "/path/to/video.mp4",
    "total_frames": 150,
    "fps": 30,
    "avg_circle": {
      "x": 640,
      "y": 480,
      "radius": 300
    },
    "processed_frames_dir": "/path/to/output/processed_frames"
  },
  "error": null
}
```

## Technical Details

### Frame Extraction

Uses FFmpeg to extract frames at specified FPS with high quality settings:
```bash
ffmpeg -i input.mp4 -vf fps=30 -q:v 2 output_%04d.png
```

### Tyre Circle Detection

Uses OpenCV's Hough Circle Transform with parameters optimized for tyre detection:
- Minimum radius: 20% of image dimension
- Maximum radius: 45% of image dimension
- Gaussian blur applied for noise reduction

### Frame Reorientation

- Crops image around detected circle with 30% padding
- Resizes to standard 512x512 pixels for consistency
- Centers tyre in frame

### Rotation Stabilization

- Uses ORB (Oriented FAST and Rotated BRIEF) feature detector
- Matches features between consecutive frames
- Estimates affine transformation to align frames
- Applies transformation to stabilize rotation

### Brightness/Contrast Normalization

- Converts to LAB color space
- Applies CLAHE (Contrast Limited Adaptive Histogram Equalization) to L channel
- Clip limit: 2.0
- Tile grid size: 8x8
- Converts back to BGR

## Testing

### Manual Testing

Run the test script with a sample video:

```bash
python test_preprocessor.py /path/to/video.mp4
```

This will:
1. Process the video through the complete pipeline
2. Save processed frames to `./test_output/processed_frames/`
3. Save metadata to `./test_output/preprocessing_metadata.json`
4. Print processing statistics

### Integration Testing

The preprocessing pipeline is integrated into the reconstruction workflow:

1. Backend receives reconstruction request
2. Backend calls Python service `/preprocess` endpoint for both videos
3. Python service processes videos asynchronously
4. Backend polls for completion
5. Processed frames are used for 3D reconstruction

## Dependencies

- **FFmpeg** - Video frame extraction
- **OpenCV** - Computer vision operations
- **NumPy** - Numerical operations
- **FastAPI** - API framework
- **Pydantic** - Data validation

## Performance Considerations

- Frame extraction is I/O bound (depends on video size and disk speed)
- Circle detection is CPU bound (can be parallelized for multiple frames)
- Stabilization is computationally expensive (uses feature matching)
- Typical processing time: 30-60 seconds for a 30-second video at 30 FPS

## Error Handling

The pipeline handles various error conditions:
- Video file not found
- No frames extracted (invalid video format)
- No tyre circles detected (invalid camera angle)
- Feature matching failures (falls back to unstabilized frames)

## Future Enhancements

- GPU acceleration for OpenCV operations
- Parallel frame processing
- Adaptive circle detection parameters based on video quality
- Support for multiple tyres in single frame
- Real-time processing for live camera feeds
