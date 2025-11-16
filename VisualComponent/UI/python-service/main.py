from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import json
from pathlib import Path
from typing import Optional, Dict
from video_preprocessor import preprocess_video_file
from triposr_reconstructor import reconstruct_tyre_3d
from crack_detector import detect_tyre_cracks
from depth_estimator import estimate_tyre_depth
from damage_classifier import classify_tyre_damage
from severity_calculator import calculate_severity_score
from difference_video_generator import generate_difference_video, generate_difference_video_from_videos
from canny_edge_processor import process_canny_edge_video

app = FastAPI(title="F1 Tyre CV Processing Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Storage for preprocessing jobs
preprocessing_jobs: Dict[str, Dict] = {}

# Storage for reconstruction jobs
reconstruction_jobs: Dict[str, Dict] = {}

# Storage for crack detection jobs
crack_detection_jobs: Dict[str, Dict] = {}

# Storage for depth estimation jobs
depth_estimation_jobs: Dict[str, Dict] = {}

# Storage for damage classification jobs
damage_classification_jobs: Dict[str, Dict] = {}

# Storage for severity calculation jobs
severity_calculation_jobs: Dict[str, Dict] = {}

# Storage for difference video generation jobs
difference_video_jobs: Dict[str, Dict] = {}

# Storage for Canny edge detection jobs
canny_edge_jobs: Dict[str, Dict] = {}

class HealthResponse(BaseModel):
    status: str
    message: str

class PreprocessRequest(BaseModel):
    video_path: str
    output_dir: str
    fps: int = 30

class PreprocessResponse(BaseModel):
    job_id: str
    status: str
    message: str

class PreprocessStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    metadata: Optional[Dict] = None
    error: Optional[str] = None

class ReconstructRequest(BaseModel):
    preprocessing_output_dir: str
    output_glb_path: str
    num_frames: int = 8
    mc_resolution: int = 256

class ReconstructResponse(BaseModel):
    job_id: str
    status: str
    message: str

class ReconstructStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    metadata: Optional[Dict] = None
    error: Optional[str] = None

class CrackDetectionRequest(BaseModel):
    reference_frames_dir: str
    damaged_frames_dir: str
    output_dir: str

class CrackDetectionResponse(BaseModel):
    job_id: str
    status: str
    message: str

class CrackDetectionStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    metadata: Optional[Dict] = None
    error: Optional[str] = None

class DepthEstimationRequest(BaseModel):
    reference_frames_dir: str
    damaged_frames_dir: str
    output_dir: str

class DepthEstimationResponse(BaseModel):
    job_id: str
    status: str
    message: str

class DepthEstimationStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    metadata: Optional[Dict] = None
    error: Optional[str] = None

class DamageClassificationRequest(BaseModel):
    damaged_frames_dir: str
    crack_maps_dir: str
    output_dir: str

class DamageClassificationResponse(BaseModel):
    job_id: str
    status: str
    message: str

class DamageClassificationStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    metadata: Optional[Dict] = None
    error: Optional[str] = None

class SeverityCalculationRequest(BaseModel):
    crack_results_path: str
    depth_results_path: str
    damage_results_path: str
    output_dir: str

class SeverityCalculationResponse(BaseModel):
    job_id: str
    status: str
    message: str

class SeverityCalculationStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    metadata: Optional[Dict] = None
    error: Optional[str] = None

class DifferenceVideoRequest(BaseModel):
    reference_frames_dir: Optional[str] = None
    damaged_frames_dir: Optional[str] = None
    reference_video_path: Optional[str] = None
    damaged_video_path: Optional[str] = None
    crack_maps_dir: Optional[str] = None
    depth_maps_dir: Optional[str] = None
    output_video_path: str
    fps: int = 30
    apply_edges: bool = True
    apply_crack_overlay: bool = True
    apply_depth_colors: bool = True

class DifferenceVideoResponse(BaseModel):
    job_id: str
    status: str
    message: str

class DifferenceVideoStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    metadata: Optional[Dict] = None
    error: Optional[str] = None

class CannyEdgeRequest(BaseModel):
    video_path: str
    output_video_path: str
    clip_limit: float = 2.0
    blur_kernel_size: int = 5
    canny_threshold1: int = 50
    canny_threshold2: int = 150

class CannyEdgeResponse(BaseModel):
    job_id: str
    status: str
    message: str

class CannyEdgeStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    metadata: Optional[Dict] = None
    error: Optional[str] = None

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        message="Python CV service is running"
    )

@app.post("/preprocess", response_model=PreprocessResponse)
async def preprocess_video(request: PreprocessRequest, background_tasks: BackgroundTasks):
    """
    Start video preprocessing job.
    Extracts frames, detects tyre circles, reorients, stabilizes, and normalizes.
    """
    import uuid
    
    job_id = str(uuid.uuid4())
    
    # Validate video file exists
    if not os.path.exists(request.video_path):
        raise HTTPException(status_code=404, detail=f"Video file not found: {request.video_path}")
    
    # Initialize job status
    preprocessing_jobs[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "metadata": None,
        "error": None
    }
    
    # Start preprocessing in background
    background_tasks.add_task(
        run_preprocessing,
        job_id,
        request.video_path,
        request.output_dir,
        request.fps
    )
    
    return PreprocessResponse(
        job_id=job_id,
        status="queued",
        message="Video preprocessing job started"
    )

@app.get("/preprocess/status/{job_id}", response_model=PreprocessStatusResponse)
async def get_preprocess_status(job_id: str):
    """Get the status of a preprocessing job."""
    if job_id not in preprocessing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = preprocessing_jobs[job_id]
    return PreprocessStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        metadata=job["metadata"],
        error=job["error"]
    )

async def run_preprocessing(job_id: str, video_path: str, output_dir: str, fps: int):
    """Background task to run video preprocessing."""
    try:
        preprocessing_jobs[job_id]["status"] = "processing"
        preprocessing_jobs[job_id]["progress"] = 0.1
        
        # Run preprocessing
        metadata = preprocess_video_file(video_path, output_dir, fps)
        
        # Update job status
        preprocessing_jobs[job_id]["status"] = "completed"
        preprocessing_jobs[job_id]["progress"] = 1.0
        preprocessing_jobs[job_id]["metadata"] = metadata
        
    except Exception as e:
        preprocessing_jobs[job_id]["status"] = "failed"
        preprocessing_jobs[job_id]["error"] = str(e)
        print(f"Preprocessing job {job_id} failed: {e}")

@app.post("/reconstruct", response_model=ReconstructResponse)
async def reconstruct_3d(request: ReconstructRequest, background_tasks: BackgroundTasks):
    """
    Start 3D reconstruction job using TripoSR.
    Generates GLB mesh file from preprocessed video frames.
    """
    import uuid
    
    job_id = str(uuid.uuid4())
    
    # Validate preprocessing output directory exists
    if not os.path.exists(request.preprocessing_output_dir):
        raise HTTPException(
            status_code=404, 
            detail=f"Preprocessing output directory not found: {request.preprocessing_output_dir}"
        )
    
    # Initialize job status
    reconstruction_jobs[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "metadata": None,
        "error": None
    }
    
    # Start reconstruction in background
    background_tasks.add_task(
        run_reconstruction,
        job_id,
        request.preprocessing_output_dir,
        request.output_glb_path,
        request.num_frames,
        request.mc_resolution
    )
    
    return ReconstructResponse(
        job_id=job_id,
        status="queued",
        message="3D reconstruction job started"
    )

@app.get("/reconstruct/status/{job_id}", response_model=ReconstructStatusResponse)
async def get_reconstruct_status(job_id: str):
    """Get the status of a 3D reconstruction job."""
    if job_id not in reconstruction_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = reconstruction_jobs[job_id]
    return ReconstructStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        metadata=job["metadata"],
        error=job["error"]
    )

async def run_reconstruction(
    job_id: str, 
    preprocessing_output_dir: str, 
    output_glb_path: str,
    num_frames: int,
    mc_resolution: int
):
    """Background task to run 3D reconstruction."""
    try:
        reconstruction_jobs[job_id]["status"] = "processing"
        reconstruction_jobs[job_id]["progress"] = 0.1
        
        # Run TripoSR reconstruction
        metadata = reconstruct_tyre_3d(
            preprocessing_output_dir=preprocessing_output_dir,
            output_glb_path=output_glb_path,
            device=None,  # Auto-detect device
            num_frames=num_frames,
            mc_resolution=mc_resolution
        )
        
        # Update job status
        reconstruction_jobs[job_id]["status"] = "completed"
        reconstruction_jobs[job_id]["progress"] = 1.0
        reconstruction_jobs[job_id]["metadata"] = metadata
        
    except Exception as e:
        reconstruction_jobs[job_id]["status"] = "failed"
        reconstruction_jobs[job_id]["error"] = str(e)
        print(f"Reconstruction job {job_id} failed: {e}")

@app.post("/crack-detection", response_model=CrackDetectionResponse)
async def detect_cracks(request: CrackDetectionRequest, background_tasks: BackgroundTasks):
    """
    Start crack detection job.
    Analyzes damaged tyre frames to detect and count cracks.
    """
    import uuid
    
    job_id = str(uuid.uuid4())
    
    # Validate directories exist
    if not os.path.exists(request.damaged_frames_dir):
        raise HTTPException(
            status_code=404, 
            detail=f"Damaged frames directory not found: {request.damaged_frames_dir}"
        )
    
    # Initialize job status
    crack_detection_jobs[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "metadata": None,
        "error": None
    }
    
    # Start crack detection in background
    background_tasks.add_task(
        run_crack_detection,
        job_id,
        request.reference_frames_dir,
        request.damaged_frames_dir,
        request.output_dir
    )
    
    return CrackDetectionResponse(
        job_id=job_id,
        status="queued",
        message="Crack detection job started"
    )

@app.get("/crack-detection/status/{job_id}", response_model=CrackDetectionStatusResponse)
async def get_crack_detection_status(job_id: str):
    """Get the status of a crack detection job."""
    if job_id not in crack_detection_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = crack_detection_jobs[job_id]
    return CrackDetectionStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        metadata=job["metadata"],
        error=job["error"]
    )

async def run_crack_detection(
    job_id: str,
    reference_frames_dir: str,
    damaged_frames_dir: str,
    output_dir: str
):
    """Background task to run crack detection."""
    try:
        crack_detection_jobs[job_id]["status"] = "processing"
        crack_detection_jobs[job_id]["progress"] = 0.1
        
        # Run crack detection
        metadata = detect_tyre_cracks(
            reference_frames_dir=reference_frames_dir,
            damaged_frames_dir=damaged_frames_dir,
            output_dir=output_dir
        )
        
        # Update job status
        crack_detection_jobs[job_id]["status"] = "completed"
        crack_detection_jobs[job_id]["progress"] = 1.0
        crack_detection_jobs[job_id]["metadata"] = metadata
        
    except Exception as e:
        crack_detection_jobs[job_id]["status"] = "failed"
        crack_detection_jobs[job_id]["error"] = str(e)
        print(f"Crack detection job {job_id} failed: {e}")

@app.post("/depth-estimation", response_model=DepthEstimationResponse)
async def estimate_depth(request: DepthEstimationRequest, background_tasks: BackgroundTasks):
    """
    Start depth estimation job.
    Compares reference and damaged frames to calculate depth differences.
    """
    import uuid
    
    job_id = str(uuid.uuid4())
    
    # Validate directories exist
    if not os.path.exists(request.reference_frames_dir):
        raise HTTPException(
            status_code=404, 
            detail=f"Reference frames directory not found: {request.reference_frames_dir}"
        )
    
    if not os.path.exists(request.damaged_frames_dir):
        raise HTTPException(
            status_code=404, 
            detail=f"Damaged frames directory not found: {request.damaged_frames_dir}"
        )
    
    # Initialize job status
    depth_estimation_jobs[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "metadata": None,
        "error": None
    }
    
    # Start depth estimation in background
    background_tasks.add_task(
        run_depth_estimation,
        job_id,
        request.reference_frames_dir,
        request.damaged_frames_dir,
        request.output_dir
    )
    
    return DepthEstimationResponse(
        job_id=job_id,
        status="queued",
        message="Depth estimation job started"
    )

@app.get("/depth-estimation/status/{job_id}", response_model=DepthEstimationStatusResponse)
async def get_depth_estimation_status(job_id: str):
    """Get the status of a depth estimation job."""
    if job_id not in depth_estimation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = depth_estimation_jobs[job_id]
    return DepthEstimationStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        metadata=job["metadata"],
        error=job["error"]
    )

async def run_depth_estimation(
    job_id: str,
    reference_frames_dir: str,
    damaged_frames_dir: str,
    output_dir: str
):
    """Background task to run depth estimation."""
    try:
        depth_estimation_jobs[job_id]["status"] = "processing"
        depth_estimation_jobs[job_id]["progress"] = 0.1
        
        # Run depth estimation
        metadata = estimate_tyre_depth(
            reference_frames_dir=reference_frames_dir,
            damaged_frames_dir=damaged_frames_dir,
            output_dir=output_dir
        )
        
        # Update job status
        depth_estimation_jobs[job_id]["status"] = "completed"
        depth_estimation_jobs[job_id]["progress"] = 1.0
        depth_estimation_jobs[job_id]["metadata"] = metadata
        
    except Exception as e:
        depth_estimation_jobs[job_id]["status"] = "failed"
        depth_estimation_jobs[job_id]["error"] = str(e)
        print(f"Depth estimation job {job_id} failed: {e}")

@app.post("/damage-classification", response_model=DamageClassificationResponse)
async def classify_damage(request: DamageClassificationRequest, background_tasks: BackgroundTasks):
    """
    Start damage classification job.
    Classifies tyre damage into types: blistering, micro-cracks, grain, cuts, flat spots, chunking.
    """
    import uuid
    
    job_id = str(uuid.uuid4())
    
    # Validate directories exist
    if not os.path.exists(request.damaged_frames_dir):
        raise HTTPException(
            status_code=404, 
            detail=f"Damaged frames directory not found: {request.damaged_frames_dir}"
        )
    
    if not os.path.exists(request.crack_maps_dir):
        raise HTTPException(
            status_code=404, 
            detail=f"Crack maps directory not found: {request.crack_maps_dir}"
        )
    
    # Initialize job status
    damage_classification_jobs[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "metadata": None,
        "error": None
    }
    
    # Start damage classification in background
    background_tasks.add_task(
        run_damage_classification,
        job_id,
        request.damaged_frames_dir,
        request.crack_maps_dir,
        request.output_dir
    )
    
    return DamageClassificationResponse(
        job_id=job_id,
        status="queued",
        message="Damage classification job started"
    )

@app.get("/damage-classification/status/{job_id}", response_model=DamageClassificationStatusResponse)
async def get_damage_classification_status(job_id: str):
    """Get the status of a damage classification job."""
    if job_id not in damage_classification_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = damage_classification_jobs[job_id]
    return DamageClassificationStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        metadata=job["metadata"],
        error=job["error"]
    )

async def run_damage_classification(
    job_id: str,
    damaged_frames_dir: str,
    crack_maps_dir: str,
    output_dir: str
):
    """Background task to run damage classification."""
    try:
        damage_classification_jobs[job_id]["status"] = "processing"
        damage_classification_jobs[job_id]["progress"] = 0.1
        
        # Run damage classification
        metadata = classify_tyre_damage(
            damaged_frames_dir=damaged_frames_dir,
            crack_maps_dir=crack_maps_dir,
            output_dir=output_dir
        )
        
        # Update job status
        damage_classification_jobs[job_id]["status"] = "completed"
        damage_classification_jobs[job_id]["progress"] = 1.0
        damage_classification_jobs[job_id]["metadata"] = metadata
        
    except Exception as e:
        damage_classification_jobs[job_id]["status"] = "failed"
        damage_classification_jobs[job_id]["error"] = str(e)
        print(f"Damage classification job {job_id} failed: {e}")

@app.post("/severity-calculation", response_model=SeverityCalculationResponse)
async def calculate_severity(request: SeverityCalculationRequest, background_tasks: BackgroundTasks):
    """
    Start severity calculation job.
    Combines crack count, depth, and damage types into 0-100 severity score.
    Generates severity timeline by rotation angle.
    """
    import uuid
    
    job_id = str(uuid.uuid4())
    
    # Validate result files exist
    if not os.path.exists(request.crack_results_path):
        raise HTTPException(
            status_code=404, 
            detail=f"Crack results file not found: {request.crack_results_path}"
        )
    
    if not os.path.exists(request.depth_results_path):
        raise HTTPException(
            status_code=404, 
            detail=f"Depth results file not found: {request.depth_results_path}"
        )
    
    if not os.path.exists(request.damage_results_path):
        raise HTTPException(
            status_code=404, 
            detail=f"Damage results file not found: {request.damage_results_path}"
        )
    
    # Initialize job status
    severity_calculation_jobs[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "metadata": None,
        "error": None
    }
    
    # Start severity calculation in background
    background_tasks.add_task(
        run_severity_calculation,
        job_id,
        request.crack_results_path,
        request.depth_results_path,
        request.damage_results_path,
        request.output_dir
    )
    
    return SeverityCalculationResponse(
        job_id=job_id,
        status="queued",
        message="Severity calculation job started"
    )

@app.get("/severity-calculation/status/{job_id}", response_model=SeverityCalculationStatusResponse)
async def get_severity_calculation_status(job_id: str):
    """Get the status of a severity calculation job."""
    if job_id not in severity_calculation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = severity_calculation_jobs[job_id]
    return SeverityCalculationStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        metadata=job["metadata"],
        error=job["error"]
    )

async def run_severity_calculation(
    job_id: str,
    crack_results_path: str,
    depth_results_path: str,
    damage_results_path: str,
    output_dir: str
):
    """Background task to run severity calculation."""
    try:
        severity_calculation_jobs[job_id]["status"] = "processing"
        severity_calculation_jobs[job_id]["progress"] = 0.1
        
        # Load analysis results
        with open(crack_results_path, 'r') as f:
            crack_results = json.load(f)
        
        with open(depth_results_path, 'r') as f:
            depth_results = json.load(f)
        
        with open(damage_results_path, 'r') as f:
            damage_results = json.load(f)
        
        # Run severity calculation
        metadata = calculate_severity_score(
            crack_results=crack_results,
            depth_results=depth_results,
            damage_results=damage_results,
            output_dir=output_dir
        )
        
        # Update job status
        severity_calculation_jobs[job_id]["status"] = "completed"
        severity_calculation_jobs[job_id]["progress"] = 1.0
        severity_calculation_jobs[job_id]["metadata"] = metadata
        
    except Exception as e:
        severity_calculation_jobs[job_id]["status"] = "failed"
        severity_calculation_jobs[job_id]["error"] = str(e)
        print(f"Severity calculation job {job_id} failed: {e}")

@app.post("/difference-video", response_model=DifferenceVideoResponse)
async def generate_diff_video(request: DifferenceVideoRequest, background_tasks: BackgroundTasks):
    """
    Start difference video generation job.
    Computes frame-by-frame differences with edge detection, crack overlay, and depth color mapping.
    
    Can work with either:
    - Preprocessed frame directories (reference_frames_dir + damaged_frames_dir)
    - Raw video files (reference_video_path + damaged_video_path)
    """
    import uuid
    
    job_id = str(uuid.uuid4())
    
    # Validate input: must provide either frame directories or video paths
    has_frames = request.reference_frames_dir and request.damaged_frames_dir
    has_videos = request.reference_video_path and request.damaged_video_path
    
    if not has_frames and not has_videos:
        raise HTTPException(
            status_code=400,
            detail="Must provide either (reference_frames_dir + damaged_frames_dir) or (reference_video_path + damaged_video_path)"
        )
    
    # Validate paths exist
    if has_frames:
        if not os.path.exists(request.reference_frames_dir):
            raise HTTPException(
                status_code=404,
                detail=f"Reference frames directory not found: {request.reference_frames_dir}"
            )
        if not os.path.exists(request.damaged_frames_dir):
            raise HTTPException(
                status_code=404,
                detail=f"Damaged frames directory not found: {request.damaged_frames_dir}"
            )
    
    if has_videos:
        if not os.path.exists(request.reference_video_path):
            raise HTTPException(
                status_code=404,
                detail=f"Reference video not found: {request.reference_video_path}"
            )
        if not os.path.exists(request.damaged_video_path):
            raise HTTPException(
                status_code=404,
                detail=f"Damaged video not found: {request.damaged_video_path}"
            )
    
    # Initialize job status
    difference_video_jobs[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "metadata": None,
        "error": None
    }
    
    # Start difference video generation in background
    background_tasks.add_task(
        run_difference_video_generation,
        job_id,
        request
    )
    
    return DifferenceVideoResponse(
        job_id=job_id,
        status="queued",
        message="Difference video generation job started"
    )

@app.get("/difference-video/status/{job_id}", response_model=DifferenceVideoStatusResponse)
async def get_difference_video_status(job_id: str):
    """Get the status of a difference video generation job."""
    if job_id not in difference_video_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = difference_video_jobs[job_id]
    return DifferenceVideoStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        metadata=job["metadata"],
        error=job["error"]
    )

async def run_difference_video_generation(job_id: str, request: DifferenceVideoRequest):
    """Background task to run difference video generation."""
    try:
        difference_video_jobs[job_id]["status"] = "processing"
        difference_video_jobs[job_id]["progress"] = 0.1
        
        # Choose generation method based on input type
        if request.reference_frames_dir and request.damaged_frames_dir:
            # Generate from preprocessed frames
            metadata = generate_difference_video(
                reference_frames_dir=request.reference_frames_dir,
                damaged_frames_dir=request.damaged_frames_dir,
                crack_maps_dir=request.crack_maps_dir,
                depth_maps_dir=request.depth_maps_dir,
                output_video_path=request.output_video_path,
                fps=request.fps,
                apply_edges=request.apply_edges,
                apply_crack_overlay=request.apply_crack_overlay,
                apply_depth_colors=request.apply_depth_colors
            )
        else:
            # Generate directly from video files
            metadata = generate_difference_video_from_videos(
                reference_video_path=request.reference_video_path,
                damaged_video_path=request.damaged_video_path,
                output_video_path=request.output_video_path,
                crack_maps_dir=request.crack_maps_dir,
                depth_maps_dir=request.depth_maps_dir,
                fps=request.fps,
                apply_edges=request.apply_edges,
                apply_crack_overlay=request.apply_crack_overlay,
                apply_depth_colors=request.apply_depth_colors
            )
        
        # Update job status
        difference_video_jobs[job_id]["status"] = "completed"
        difference_video_jobs[job_id]["progress"] = 1.0
        difference_video_jobs[job_id]["metadata"] = metadata
        
    except Exception as e:
        difference_video_jobs[job_id]["status"] = "failed"
        difference_video_jobs[job_id]["error"] = str(e)
        print(f"Difference video generation job {job_id} failed: {e}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
