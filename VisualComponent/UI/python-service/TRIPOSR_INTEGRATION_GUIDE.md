# TripoSR Integration Guide

## Overview

This guide explains how the TripoSR 3D reconstruction has been integrated into the F1 Tyre Visual Difference Engine.

## What Was Implemented

### 1. Core TripoSR Module (`triposr_reconstructor.py`)

A complete Python module that handles:
- TripoSR model loading and initialization
- Image preprocessing for TripoSR input
- Frame selection from preprocessed videos
- 3D mesh generation using TripoSR
- Mesh merging and export to GLB format

**Key Classes:**
- `TripoSRReconstructor`: Main class for 3D reconstruction
  - Automatic device detection (CUDA/MPS/CPU)
  - Model loading from HuggingFace
  - Frame-by-frame reconstruction
  - Mesh merging and optimization

**Key Functions:**
- `reconstruct_tyre_3d()`: Convenience function for end-to-end reconstruction

### 2. FastAPI Endpoints (`main.py`)

Added two new endpoints to the Python service:

**POST /reconstruct**
- Starts a 3D reconstruction job
- Accepts preprocessing output directory and GLB output path
- Returns job ID for status tracking
- Runs reconstruction in background

**GET /reconstruct/status/{job_id}**
- Returns reconstruction job status
- Provides progress updates
- Returns metadata on completion

### 3. Backend Integration (`backend/src/routes/reconstruct.ts`)

Updated the Node.js backend to:
- Call Python TripoSR service during reconstruction pipeline
- Create meshes directory for GLB storage
- Poll reconstruction status until completion
- Handle errors and timeouts
- Return mesh URL to frontend

### 4. Dependencies (`requirements.txt`)

Added required packages:
- `torch>=2.0.0` - PyTorch for deep learning
- `torchvision>=0.15.0` - Vision utilities
- `trimesh>=4.0.0` - Mesh processing
- `rembg>=2.0.50` - Background removal
- `omegaconf>=2.3.0` - Configuration management
- `einops>=0.7.0` - Tensor operations
- `transformers>=4.35.0` - HuggingFace transformers
- `diffusers>=0.25.0` - Diffusion models

### 5. Docker Support (`Dockerfile`)

Updated Dockerfile to:
- Install git for cloning TripoSR
- Install TripoSR from GitHub
- Support GPU acceleration (if available)

### 6. Setup Scripts

**`setup_triposr.sh`**
- Automated installation script
- Installs all dependencies
- Clones and installs TripoSR
- Provides setup instructions

### 7. Testing (`test_triposr.py`)

Comprehensive test suite:
- Import validation
- Model loading test
- Frame selection test
- Full reconstruction test (optional)
- Synthetic test frame generation

### 8. Documentation

**`README_TRIPOSR.md`**
- Complete API documentation
- Configuration guide
- Performance benchmarks
- Troubleshooting tips

**`TRIPOSR_INTEGRATION_GUIDE.md`** (this file)
- Integration overview
- Setup instructions
- Usage examples

## Setup Instructions

### Local Development

1. **Install Dependencies**
   ```bash
   cd python-service
   ./setup_triposr.sh
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env to set TRIPOSR_DEVICE if needed
   ```

3. **Test Installation**
   ```bash
   python test_triposr.py
   ```

4. **Run Service**
   ```bash
   python main.py
   ```

### Docker Deployment

1. **Build Image**
   ```bash
   docker build -t f1-python-service python-service/
   ```

2. **Run Container**
   ```bash
   docker run -p 8000:8000 \
     -v $(pwd)/uploads:/app/uploads \
     -e TRIPOSR_DEVICE=cpu \
     f1-python-service
   ```

### With GPU Support

For NVIDIA GPU:
```bash
docker run --gpus all -p 8000:8000 \
  -v $(pwd)/uploads:/app/uploads \
  -e TRIPOSR_DEVICE=cuda \
  f1-python-service
```

## Usage Examples

### Python API

```python
from triposr_reconstructor import reconstruct_tyre_3d

# Reconstruct 3D mesh from preprocessed video
metadata = reconstruct_tyre_3d(
    preprocessing_output_dir="/path/to/preprocessed",
    output_glb_path="/path/to/output.glb",
    device="cuda",  # or "mps", "cpu"
    num_frames=8,
    mc_resolution=256
)

print(f"Mesh saved to: {metadata['output_path']}")
print(f"Vertices: {metadata['num_vertices']}")
print(f"Faces: {metadata['num_faces']}")
```

### REST API

```bash
# Start reconstruction
curl -X POST http://localhost:8000/reconstruct \
  -H "Content-Type: application/json" \
  -d '{
    "preprocessing_output_dir": "/app/uploads/preprocessed/abc123",
    "output_glb_path": "/app/uploads/meshes/abc123.glb",
    "num_frames": 8,
    "mc_resolution": 256
  }'

# Response: {"job_id": "xyz789", "status": "queued", ...}

# Check status
curl http://localhost:8000/reconstruct/status/xyz789

# Response: {"job_id": "xyz789", "status": "completed", "progress": 1.0, ...}
```

### Backend Integration

```typescript
// In backend/src/routes/reconstruct.ts
const meshOutputPath = `${uploadDir}/meshes/${job.jobId}.glb`;
const reconstructionMetadata = await runTripoSRReconstruction(
  pythonServiceUrl,
  damagedOutputDir,
  meshOutputPath
);

// Use mesh URL in response
job.result = {
  meshUrl: `/uploads/meshes/${job.jobId}.glb`,
  // ... other results
};
```

## Architecture Flow

```
1. User uploads videos
   ↓
2. Backend receives upload
   ↓
3. Backend calls Python service: POST /preprocess
   ↓
4. Python service extracts and processes frames
   ↓
5. Backend calls Python service: POST /reconstruct
   ↓
6. Python service runs TripoSR on processed frames
   ↓
7. TripoSR generates 3D mesh
   ↓
8. Mesh saved as GLB file
   ↓
9. Backend receives mesh URL
   ↓
10. Frontend loads and renders GLB in Three.js
```

## Configuration Options

### Device Selection

```python
# Auto-detect (recommended)
device = None  # or "auto"

# Force specific device
device = "cuda"  # NVIDIA GPU
device = "mps"   # Apple Silicon
device = "cpu"   # CPU fallback
```

### Reconstruction Quality

```python
# Fast (lower quality)
num_frames = 4
mc_resolution = 128

# Balanced (recommended)
num_frames = 8
mc_resolution = 256

# High quality (slower)
num_frames = 12
mc_resolution = 512
```

## Performance Optimization

### GPU Acceleration

For best performance, use CUDA-enabled GPU:
- RTX 3090: ~2-3s per frame
- RTX 4090: ~1-2s per frame

### Memory Management

If running out of memory:
1. Reduce `num_frames`
2. Reduce `mc_resolution`
3. Process frames in smaller batches
4. Use CPU with more RAM

### Batch Processing

For multiple tyres:
```python
# Process in parallel (if multiple GPUs)
import multiprocessing

def process_tyre(args):
    return reconstruct_tyre_3d(*args)

with multiprocessing.Pool(processes=2) as pool:
    results = pool.map(process_tyre, tyre_args_list)
```

## Troubleshooting

### Common Issues

**1. TripoSR not found**
```bash
pip install git+https://github.com/VAST-AI-Research/TripoSR.git
```

**2. CUDA out of memory**
- Reduce `num_frames` to 4-6
- Reduce `mc_resolution` to 128
- Use CPU instead

**3. Model download fails**
- Check internet connection
- Set HF_HOME to writable directory
- Manually download from HuggingFace

**4. Poor mesh quality**
- Ensure preprocessing completed successfully
- Increase `num_frames` to 10-12
- Check frame quality and tyre detection

### Debug Mode

Enable verbose logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Testing

### Unit Tests

```bash
# Basic tests
python test_triposr.py

# Full reconstruction test (slow)
python test_triposr.py --full
```

### Integration Tests

```bash
# Test full pipeline
cd ..
npm run test:integration
```

## Monitoring

### Metrics to Track

- Reconstruction time per tyre
- GPU/CPU utilization
- Memory usage
- Mesh quality (vertex/face count)
- Error rates

### Logging

All reconstruction jobs log to:
- Console output
- Job status in memory
- Error messages in job metadata

## Future Improvements

1. **Multi-view Fusion**: Better merge multiple reconstructions
2. **Texture Mapping**: Apply video textures to mesh
3. **Mesh Optimization**: Reduce polygon count
4. **Quality Metrics**: Automatic quality assessment
5. **Caching**: Cache model weights and intermediate results
6. **Streaming**: Stream reconstruction progress to frontend

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 2.4**: TripoSR 3D reconstruction integration ✓
- **Requirement 2.5**: GLB mesh file generation ✓

## Files Modified/Created

### Created:
- `python-service/triposr_reconstructor.py` - Core reconstruction module
- `python-service/setup_triposr.sh` - Installation script
- `python-service/test_triposr.py` - Test suite
- `python-service/README_TRIPOSR.md` - API documentation
- `python-service/TRIPOSR_INTEGRATION_GUIDE.md` - This guide

### Modified:
- `python-service/main.py` - Added reconstruction endpoints
- `python-service/requirements.txt` - Added TripoSR dependencies
- `python-service/Dockerfile` - Added TripoSR installation
- `python-service/.env.example` - Added TripoSR configuration
- `backend/src/routes/reconstruct.ts` - Integrated TripoSR calls

## Next Steps

After this task, the following tasks should be completed:

1. **Task 4.5**: Implement WebSocket status updates
2. **Task 5.x**: Build 3D renderer with Three.js
3. **Task 6.x**: Implement computer vision analysis engine

The TripoSR integration is now complete and ready for use in the reconstruction pipeline!
