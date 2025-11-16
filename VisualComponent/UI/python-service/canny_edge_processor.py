"""
Canny Edge Detection Video Processor
Processes uploaded damaged video with Canny edge detection for real-time visualization.
"""

import cv2
import numpy as np
import os
from pathlib import Path
from typing import Dict, Optional


def process_canny_edge_video(
    input_video_path: str,
    output_video_path: str,
    clip_limit: float = 2.0,
    blur_kernel_size: int = 5,
    canny_threshold1: int = 50,
    canny_threshold2: int = 150
) -> Dict:
    """
    Process video with Canny edge detection pipeline.
    
    Pipeline:
    1. Read video frame-by-frame
    2. Convert to grayscale
    3. Apply CLAHE enhancement (clipLimit=2.0)
    4. Apply Gaussian blur (5x5)
    5. Apply Canny edge detection (thresholds: 50, 150)
    6. Convert edge frames to BGR format for video encoding
    7. Encode to output video (mp4v codec)
    
    Args:
        input_video_path: Path to input damaged video
        output_video_path: Path to save edge detection video
        clip_limit: CLAHE clip limit (default: 2.0)
        blur_kernel_size: Gaussian blur kernel size (default: 5)
        canny_threshold1: Canny lower threshold (default: 50)
        canny_threshold2: Canny upper threshold (default: 150)
    
    Returns:
        Dictionary with processing metadata
    """
    
    # Validate input video exists
    if not os.path.exists(input_video_path):
        raise FileNotFoundError(f"Input video not found: {input_video_path}")
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(output_video_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    # Open input video
    cap = cv2.VideoCapture(input_video_path)
    if not cap.isOpened():
        raise ValueError(f"Failed to open video: {input_video_path}")
    
    # Get video properties
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Initialize video writer with mp4v codec
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
    
    if not out.isOpened():
        cap.release()
        raise ValueError(f"Failed to create output video: {output_video_path}")
    
    # Create CLAHE object for contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
    
    # Process frames
    frame_count = 0
    processed_frames = 0
    
    print(f"Processing video: {input_video_path}")
    print(f"Resolution: {width}x{height}, FPS: {fps}, Total frames: {total_frames}")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1
        
        # Step 1: Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Step 2: Apply CLAHE enhancement
        enhanced = clahe.apply(gray)
        
        # Step 3: Apply Gaussian blur
        blurred = cv2.GaussianBlur(enhanced, (blur_kernel_size, blur_kernel_size), 0)
        
        # Step 4: Apply Canny edge detection
        edges = cv2.Canny(blurred, canny_threshold1, canny_threshold2)
        
        # Step 5: Convert edge frames to BGR format for video encoding
        # White edges on black background
        edges_bgr = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
        
        # Write frame to output video
        out.write(edges_bgr)
        processed_frames += 1
        
        # Progress logging
        if frame_count % 30 == 0:
            progress = (frame_count / total_frames) * 100
            print(f"Progress: {progress:.1f}% ({frame_count}/{total_frames} frames)")
    
    # Release resources
    cap.release()
    out.release()
    
    print(f"Canny edge detection complete: {processed_frames} frames processed")
    
    # Return metadata
    metadata = {
        "input_video": input_video_path,
        "output_video": output_video_path,
        "resolution": f"{width}x{height}",
        "fps": fps,
        "total_frames": processed_frames,
        "processing_params": {
            "clahe_clip_limit": clip_limit,
            "blur_kernel_size": blur_kernel_size,
            "canny_threshold1": canny_threshold1,
            "canny_threshold2": canny_threshold2
        }
    }
    
    return metadata


def validate_video_file(video_path: str) -> bool:
    """
    Validate that the video file exists and can be opened.
    
    Args:
        video_path: Path to video file
    
    Returns:
        True if valid, False otherwise
    """
    if not os.path.exists(video_path):
        return False
    
    cap = cv2.VideoCapture(video_path)
    is_valid = cap.isOpened()
    cap.release()
    
    return is_valid
