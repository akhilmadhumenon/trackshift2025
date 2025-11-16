# Reconstruction Pipeline Tests

This document describes the test suite for the F1 Tyre Visual Difference Engine reconstruction pipeline.

## Overview

The test suite validates the core functionality of the reconstruction pipeline, covering:
- **Frame extraction accuracy** (Requirement 2.2)
- **Tyre circle detection** (Requirement 2.2)
- **TripoSR integration** (Requirements 2.4, 2.5)
- **Job queue management** (Requirements 2.2, 2.3)

## Test Files

### 1. `test_reconstruction_pipeline.py`
Pytest-based test suite with comprehensive test coverage. Requires pytest to be installed.

### 2. `run_reconstruction_tests.py`
Standalone test runner that doesn't require pytest plugins. This is the recommended way to run tests if you encounter dependency conflicts.

## Running the Tests

### Option 1: Standalone Test Runner (Recommended)

```bash
cd python-service
python run_reconstruction_tests.py
```

This runner:
- Doesn't require pytest plugins
- Provides clear output with pass/fail/skip status
- Handles missing dependencies gracefully
- Tests all core functionality

### Option 2: Pytest (if environment is properly configured)

```bash
cd python-service
python -m pytest test_reconstruction_pipeline.py -v
```

## Test Coverage

### Frame Extraction Tests (Requirement 2.2)
- ✓ `test_extract_frames_creates_output_directory` - Verifies output directories are created
- ✓ `test_extract_frames_returns_frame_paths` - Validates frame extraction returns valid paths
- ✓ `test_extract_frames_respects_fps_parameter` - Ensures FPS parameter affects frame count

### Tyre Circle Detection Tests (Requirement 2.2)
- ✓ `test_detect_circle_in_valid_image` - Tests Hough Circle Transform on clear circles
- ✓ `test_detect_circle_handles_multiple_circles` - Validates detection with multiple circles
- `test_detect_circle_returns_none_for_no_circle` - Tests behavior when no circle present

### TripoSR Integration Tests (Requirements 2.4, 2.5)
- `test_triposr_reconstructor_initialization` - Validates TripoSR model loading
- `test_select_best_frames` - Tests frame selection logic for reconstruction
- `test_select_best_frames_empty_directory` - Tests error handling for empty directories
- `test_preprocess_image` - Validates image preprocessing for TripoSR input

**Note:** TripoSR tests will be skipped if TripoSR is not installed. Run `./setup_triposr.sh` to install TripoSR dependencies.

### Job Queue Management Tests (Requirements 2.2, 2.3)
- `test_health_endpoint` - Validates API health check
- `test_preprocess_job_creation` - Tests preprocessing job creation
- `test_preprocess_job_status_tracking` - Validates job status tracking
- `test_preprocess_invalid_video_path` - Tests error handling for invalid paths
- `test_reconstruct_job_creation` - Tests reconstruction job creation
- `test_reconstruct_job_status_tracking` - Validates reconstruction status tracking
- `test_reconstruct_invalid_directory` - Tests error handling for invalid directories
- `test_job_status_not_found` - Tests 404 response for non-existent jobs

**Note:** Job queue tests require all dependencies (including trimesh) to be installed.

### Integration Tests
- ✓ `test_full_preprocessing_pipeline` - End-to-end preprocessing from video to frames
- ✓ `test_preprocessing_metadata_saved` - Validates metadata persistence

## Test Results

### Current Status (without full dependencies)
```
Total: 15 tests
Passed: 7
Failed: 5 (due to missing trimesh dependency)
Skipped: 3 (TripoSR not installed)
```

### With Full Dependencies
All tests should pass when:
1. All Python dependencies are installed: `pip install -r requirements.txt`
2. TripoSR is installed: `./setup_triposr.sh`
3. FFmpeg is available on the system

## Dependencies

### Required for Basic Tests
- opencv-python
- numpy
- Pillow
- fastapi
- httpx (for API tests)

### Required for TripoSR Tests
- torch
- trimesh
- TripoSR (install via setup_triposr.sh)

### System Dependencies
- FFmpeg (for video processing)

## Test Implementation Details

### Frame Extraction Tests
These tests create synthetic video files with circular patterns (simulating tyres) and validate:
- Directory structure creation
- Frame extraction using FFmpeg
- FPS parameter handling
- Error handling for invalid videos

### Tyre Circle Detection Tests
These tests use OpenCV's Hough Circle Transform to:
- Detect circular patterns in images
- Handle multiple circles
- Return accurate circle parameters (x, y, radius)

### TripoSR Integration Tests
These tests validate:
- Model initialization on CPU/GPU
- Frame selection algorithm (evenly distributed frames)
- Image preprocessing for TripoSR input
- Error handling for edge cases

### Job Queue Management Tests
These tests use FastAPI TestClient to:
- Create preprocessing and reconstruction jobs
- Track job status (queued, processing, completed, failed)
- Handle invalid inputs
- Return appropriate HTTP status codes

### Integration Tests
These tests run the complete pipeline:
- Video upload → Frame extraction → Circle detection → Reorientation → Stabilization → Normalization
- Metadata generation and persistence
- Output validation

## Troubleshooting

### ImportError: No module named 'trimesh'
Install missing dependencies:
```bash
pip install trimesh
```

### TripoSR tests skipped
Install TripoSR:
```bash
./setup_triposr.sh
```

### FFmpeg not found
Install FFmpeg:
- macOS: `brew install ffmpeg`
- Ubuntu: `sudo apt-get install ffmpeg`
- Windows: Download from https://ffmpeg.org/

### NumPy version conflicts
If you see NumPy compatibility warnings:
```bash
pip install "numpy<2.0"
```

## Adding New Tests

To add new tests:

1. Add test function to `test_reconstruction_pipeline.py` (pytest format)
2. Add corresponding test function to `run_reconstruction_tests.py` (standalone format)
3. Update this README with test description
4. Ensure test follows the pattern:
   - Create temporary resources
   - Run test logic
   - Assert expected behavior
   - Clean up resources

## Continuous Integration

These tests are designed to run in CI/CD pipelines. The standalone runner (`run_reconstruction_tests.py`) is recommended for CI as it:
- Handles missing dependencies gracefully
- Provides clear exit codes (0 = success, 1 = failure)
- Generates detailed output for debugging
- Skips optional tests (TripoSR) when dependencies unavailable
