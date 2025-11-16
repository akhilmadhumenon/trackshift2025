# TripoSR 3D Reconstruction Integration

This document describes the TripoSR integration for 3D tyre reconstruction in the F1 Tyre Visual Difference Engine.

## Overview

TripoSR is a state-of-the-art 3D reconstruction model that generates 3D meshes from 2D images. We use it to reconstruct 3D models of tyres from preprocessed video frames.

## Architecture

```
Preprocessed Frames → TripoSR Model → 3D Mesh (GLB)
```

### Pipeline Steps

1. **Frame Selection**: Select 8 evenly distributed frames from preprocessed video
2. **Image Preprocessing**: Resize and normalize frames for TripoSR input (512x512)
3. **3D Reconstruction**: Run TripoSR inference on each frame
4. **Mesh Merging**: Combine multiple reconstructions into final mesh
5. **Export**: Save as GLB file for web rendering

## Installation

### Prerequisites

- Python 3.8+
- PyTorch 2.0+
- CUDA (optional, for GPU acceleration)

### Setup

Run the setup script:

```bash
cd python-service
./setup_triposr.sh
```

Or install manually:

```bash
pip install -r requirements.txt
pip install git+https://github.com/VAST-AI-Research/TripoSR.git
```

### Model Weights

TripoSR automatically downloads model weights from HuggingFace on first use:
- Model: `stabilityai/TripoSR`
- Size: ~1.5GB
- Location: `~/.cache/huggingface/`

## API Endpoints

### POST /reconstruct

Start a 3D reconstruction job.

**Request Body:**
```json
{
  "preprocessing_output_dir": "/path/to/preprocessed/frames",
  "output_glb_path": "/path/to/output.glb",
  "num_frames": 8,
  "mc_resolution": 256
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "queued",
  "message": "3D reconstruction job started"
}
```

### GET /reconstruct/status/{job_id}

Get reconstruction job status.

**Response:**
```json
{
  "job_id": "uuid",
  "status": "completed",
  "progress": 1.0,
  "metadata": {
    "output_path": "/path/to/output.glb",
    "num_frames_used": 8,
    "num_vertices": 50000,
    "num_faces": 100000,
    "bounds": [[x_min, y_min, z_min], [x_max, y_max, z_max]],
    "center": [x, y, z]
  },
  "error": null
}
```

## Configuration

### Parameters

- **num_frames** (default: 8): Number of frames to use for reconstruction
  - More frames = better quality but slower processing
  - Recommended: 6-12 frames

- **mc_resolution** (default: 256): Marching cubes resolution for mesh extraction
  - Higher resolution = more detailed mesh but larger file size
  - Recommended: 128-512

### Device Selection

The system automatically selects the best available device:
1. CUDA (NVIDIA GPU) - Fastest
2. MPS (Apple Silicon) - Fast on M1/M2/M3 Macs
3. CPU - Slowest (fallback)

## Performance

### Processing Time (approximate)

| Device | Time per Frame | Total (8 frames) |
|--------|---------------|------------------|
| CUDA (RTX 3090) | 2-3s | 16-24s |
| MPS (M1 Max) | 5-8s | 40-64s |
| CPU (8-core) | 30-60s | 4-8 min |

### Memory Requirements

- GPU VRAM: 4-8GB recommended
- System RAM: 8GB minimum, 16GB recommended

## Output Format

The reconstruction generates a GLB (GL Transmission Format Binary) file containing:
- 3D mesh geometry (vertices and faces)
- Texture coordinates (if available)
- Material properties

GLB files can be loaded directly in Three.js for web rendering.

## Troubleshooting

### Out of Memory Errors

If you encounter OOM errors:
1. Reduce `num_frames` (try 4-6 instead of 8)
2. Reduce `mc_resolution` (try 128 instead of 256)
3. Use CPU instead of GPU (slower but uses system RAM)

### Model Download Issues

If model download fails:
1. Check internet connection
2. Manually download from HuggingFace: https://huggingface.co/stabilityai/TripoSR
3. Set `HF_HOME` environment variable to custom cache location

### Poor Reconstruction Quality

If mesh quality is poor:
1. Ensure video preprocessing completed successfully
2. Check that tyre circles were detected correctly
3. Increase `num_frames` for more views
4. Verify frames are properly normalized and stabilized

## Integration with Backend

The Node.js backend calls the Python service via HTTP:

```typescript
// Start reconstruction
const response = await axios.post('http://python-service:8000/reconstruct', {
  preprocessing_output_dir: '/path/to/preprocessed',
  output_glb_path: '/path/to/output.glb',
  num_frames: 8,
  mc_resolution: 256
});

// Poll for completion
const jobId = response.data.job_id;
let status = 'queued';

while (status !== 'completed' && status !== 'failed') {
  await sleep(1000);
  const statusResponse = await axios.get(
    `http://python-service:8000/reconstruct/status/${jobId}`
  );
  status = statusResponse.data.status;
}
```

## Future Enhancements

1. **Multi-view Fusion**: Better merge multiple reconstructions
2. **Texture Mapping**: Apply original video textures to mesh
3. **Mesh Optimization**: Reduce polygon count while preserving detail
4. **Batch Processing**: Process multiple tyres in parallel
5. **Quality Metrics**: Automatic quality assessment of reconstructions

## References

- TripoSR Paper: https://arxiv.org/abs/2403.02151
- TripoSR GitHub: https://github.com/VAST-AI-Research/TripoSR
- HuggingFace Model: https://huggingface.co/stabilityai/TripoSR
