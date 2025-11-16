"""
Difference Video Generator for F1 Tyre Visual Difference Engine.

This module generates a difference video by comparing reference and damaged tyre videos
frame-by-frame. It applies edge detection, overlays crack maps, and applies depth color
mapping to visualize differences.
"""

import cv2
import numpy as np
import os
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import json


def apply_depth_colormap(depth_map: np.ndarray) -> np.ndarray:
    """
    Apply blue-to-red gradient colormap to depth differences.
    Blue = shallow differences, Red = deep differences.
    
    Args:
        depth_map: Grayscale depth difference map (0-255)
        
    Returns:
        BGR color-mapped image
    """
    # Normalize depth map to 0-1 range
    normalized = depth_map.astype(np.float32) / 255.0
    
    # Create blue-to-red gradient
    # Blue (shallow): [255, 0, 0] in BGR
    # Red (deep): [0, 0, 255] in BGR
    colored = np.zeros((*depth_map.shape, 3), dtype=np.uint8)
    
    # Blue channel: high when depth is low
    colored[:, :, 0] = (255 * (1 - normalized)).astype(np.uint8)
    
    # Red channel: high when depth is high
    colored[:, :, 2] = (255 * normalized).astype(np.uint8)
    
    return colored


def apply_edge_detection(frame: np.ndarray, low_threshold: int = 50, high_threshold: int = 150) -> np.ndarray:
    """
    Apply Canny edge detection to a frame.
    
    Args:
        frame: Input BGR frame
        low_threshold: Lower threshold for Canny edge detection
        high_threshold: Upper threshold for Canny edge detection
        
    Returns:
        Binary edge map (0 or 255)
    """
    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 1.4)
    
    # Apply Canny edge detection
    edges = cv2.Canny(blurred, low_threshold, high_threshold)
    
    return edges


def overlay_crack_map(frame: np.ndarray, crack_map: np.ndarray, alpha: float = 0.5) -> np.ndarray:
    """
    Overlay crack map on frame with red highlighting.
    
    Args:
        frame: Input BGR frame
        crack_map: Binary crack map (0 or 255)
        alpha: Blending factor for overlay (0-1)
        
    Returns:
        Frame with crack overlay
    """
    # Create red overlay for cracks
    overlay = frame.copy()
    
    # Set crack pixels to red
    overlay[crack_map > 0] = [0, 0, 255]  # BGR red
    
    # Blend with original frame
    result = cv2.addWeighted(frame, 1 - alpha, overlay, alpha, 0)
    
    return result


def compute_frame_difference(ref_frame: np.ndarray, damaged_frame: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute pixel-wise difference between reference and damaged frames.
    
    Args:
        ref_frame: Reference frame (BGR)
        damaged_frame: Damaged frame (BGR)
        
    Returns:
        Tuple of (difference_map, depth_map)
        - difference_map: Absolute difference in grayscale
        - depth_map: Depth estimation based on intensity differences
    """
    # Convert to grayscale for comparison
    ref_gray = cv2.cvtColor(ref_frame, cv2.COLOR_BGR2GRAY)
    damaged_gray = cv2.cvtColor(damaged_frame, cv2.COLOR_BGR2GRAY)
    
    # Compute absolute difference
    difference = cv2.absdiff(ref_gray, damaged_gray)
    
    # Enhance differences
    difference = cv2.normalize(difference, None, 0, 255, cv2.NORM_MINMAX)
    
    # Estimate depth from difference (darker = deeper damage)
    # Invert so that larger differences = deeper
    depth_map = difference.copy()
    
    return difference, depth_map


def generate_difference_video(
    reference_frames_dir: str,
    damaged_frames_dir: str,
    crack_maps_dir: Optional[str],
    depth_maps_dir: Optional[str],
    output_video_path: str,
    fps: int = 30,
    apply_edges: bool = True,
    apply_crack_overlay: bool = True,
    apply_depth_colors: bool = True
) -> Dict:
    """
    Generate difference video from reference and damaged frame sequences.
    
    Args:
        reference_frames_dir: Directory containing reference frames
        damaged_frames_dir: Directory containing damaged frames
        crack_maps_dir: Optional directory containing crack maps
        depth_maps_dir: Optional directory containing depth maps
        output_video_path: Path to save output video
        fps: Frames per second for output video
        apply_edges: Whether to apply edge detection
        apply_crack_overlay: Whether to overlay crack maps
        apply_depth_colors: Whether to apply depth color mapping
        
    Returns:
        Dictionary with metadata about the generated video
    """
    # Get sorted list of frames
    ref_frames = sorted([f for f in os.listdir(reference_frames_dir) if f.endswith(('.png', '.jpg', '.jpeg'))])
    damaged_frames = sorted([f for f in os.listdir(damaged_frames_dir) if f.endswith(('.png', '.jpg', '.jpeg'))])
    
    if len(ref_frames) == 0 or len(damaged_frames) == 0:
        raise ValueError("No frames found in input directories")
    
    # Use minimum number of frames available
    num_frames = min(len(ref_frames), len(damaged_frames))
    
    if num_frames == 0:
        raise ValueError("No matching frames found")
    
    # Read first frame to get dimensions
    first_ref = cv2.imread(os.path.join(reference_frames_dir, ref_frames[0]))
    if first_ref is None:
        raise ValueError(f"Failed to read first reference frame: {ref_frames[0]}")
    
    height, width = first_ref.shape[:2]
    
    # Create output directory if needed
    os.makedirs(os.path.dirname(output_video_path), exist_ok=True)
    
    # Initialize video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    video_writer = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
    
    if not video_writer.isOpened():
        raise RuntimeError(f"Failed to create video writer for {output_video_path}")
    
    # Get crack maps if available
    crack_maps = []
    if crack_maps_dir and os.path.exists(crack_maps_dir):
        crack_maps = sorted([f for f in os.listdir(crack_maps_dir) if f.endswith(('.png', '.jpg', '.jpeg'))])
    
    # Get depth maps if available
    depth_maps = []
    if depth_maps_dir and os.path.exists(depth_maps_dir):
        depth_maps = sorted([f for f in os.listdir(depth_maps_dir) if f.endswith(('.png', '.jpg', '.jpeg'))])
    
    print(f"Generating difference video with {num_frames} frames...")
    
    # Process each frame
    for i in range(num_frames):
        # Read reference and damaged frames
        ref_frame = cv2.imread(os.path.join(reference_frames_dir, ref_frames[i]))
        damaged_frame = cv2.imread(os.path.join(damaged_frames_dir, damaged_frames[i]))
        
        if ref_frame is None or damaged_frame is None:
            print(f"Warning: Skipping frame {i} due to read error")
            continue
        
        # Ensure frames are same size
        if ref_frame.shape != damaged_frame.shape:
            damaged_frame = cv2.resize(damaged_frame, (ref_frame.shape[1], ref_frame.shape[0]))
        
        # Compute frame difference
        difference_map, computed_depth_map = compute_frame_difference(ref_frame, damaged_frame)
        
        # Start with the damaged frame as base
        result_frame = damaged_frame.copy()
        
        # Apply edge detection if requested
        if apply_edges:
            edges = apply_edge_detection(damaged_frame)
            # Overlay edges in white
            result_frame[edges > 0] = [255, 255, 255]
        
        # Apply depth color mapping if requested
        if apply_depth_colors:
            # Use provided depth map if available, otherwise use computed
            if i < len(depth_maps):
                depth_map_path = os.path.join(depth_maps_dir, depth_maps[i])
                depth_map = cv2.imread(depth_map_path, cv2.IMREAD_GRAYSCALE)
                if depth_map is not None:
                    depth_map = cv2.resize(depth_map, (width, height))
                else:
                    depth_map = computed_depth_map
            else:
                depth_map = computed_depth_map
            
            # Apply color mapping
            depth_colored = apply_depth_colormap(depth_map)
            
            # Blend with result frame
            result_frame = cv2.addWeighted(result_frame, 0.6, depth_colored, 0.4, 0)
        
        # Overlay crack map if requested and available
        if apply_crack_overlay and i < len(crack_maps):
            crack_map_path = os.path.join(crack_maps_dir, crack_maps[i])
            crack_map = cv2.imread(crack_map_path, cv2.IMREAD_GRAYSCALE)
            
            if crack_map is not None:
                # Resize crack map to match frame size
                crack_map = cv2.resize(crack_map, (width, height))
                result_frame = overlay_crack_map(result_frame, crack_map, alpha=0.3)
        
        # Write frame to video
        video_writer.write(result_frame)
        
        if (i + 1) % 10 == 0:
            print(f"Processed {i + 1}/{num_frames} frames")
    
    # Release video writer
    video_writer.release()
    
    print(f"Difference video saved to: {output_video_path}")
    
    # Return metadata
    metadata = {
        "output_path": output_video_path,
        "num_frames": num_frames,
        "fps": fps,
        "resolution": {"width": width, "height": height},
        "applied_effects": {
            "edge_detection": apply_edges,
            "crack_overlay": apply_crack_overlay,
            "depth_colors": apply_depth_colors
        }
    }
    
    return metadata


def generate_difference_video_from_videos(
    reference_video_path: str,
    damaged_video_path: str,
    output_video_path: str,
    crack_maps_dir: Optional[str] = None,
    depth_maps_dir: Optional[str] = None,
    fps: Optional[int] = None,
    apply_edges: bool = True,
    apply_crack_overlay: bool = True,
    apply_depth_colors: bool = True
) -> Dict:
    """
    Generate difference video directly from video files (without preprocessing).
    
    Args:
        reference_video_path: Path to reference video
        damaged_video_path: Path to damaged video
        output_video_path: Path to save output video
        crack_maps_dir: Optional directory containing crack maps
        depth_maps_dir: Optional directory containing depth maps
        fps: Output FPS (if None, uses source video FPS)
        apply_edges: Whether to apply edge detection
        apply_crack_overlay: Whether to overlay crack maps
        apply_depth_colors: Whether to apply depth color mapping
        
    Returns:
        Dictionary with metadata about the generated video
    """
    # Open video captures
    ref_cap = cv2.VideoCapture(reference_video_path)
    damaged_cap = cv2.VideoCapture(damaged_video_path)
    
    if not ref_cap.isOpened():
        raise ValueError(f"Failed to open reference video: {reference_video_path}")
    
    if not damaged_cap.isOpened():
        raise ValueError(f"Failed to open damaged video: {damaged_video_path}")
    
    # Get video properties
    if fps is None:
        fps = int(ref_cap.get(cv2.CAP_PROP_FPS))
    
    width = int(ref_cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(ref_cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Create output directory if needed
    os.makedirs(os.path.dirname(output_video_path), exist_ok=True)
    
    # Initialize video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    video_writer = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
    
    if not video_writer.isOpened():
        raise RuntimeError(f"Failed to create video writer for {output_video_path}")
    
    # Get crack maps if available
    crack_maps = []
    if crack_maps_dir and os.path.exists(crack_maps_dir):
        crack_maps = sorted([f for f in os.listdir(crack_maps_dir) if f.endswith(('.png', '.jpg', '.jpeg'))])
    
    # Get depth maps if available
    depth_maps = []
    if depth_maps_dir and os.path.exists(depth_maps_dir):
        depth_maps = sorted([f for f in os.listdir(depth_maps_dir) if f.endswith(('.png', '.jpg', '.jpeg'))])
    
    frame_count = 0
    print("Generating difference video from source videos...")
    
    while True:
        # Read frames
        ret_ref, ref_frame = ref_cap.read()
        ret_damaged, damaged_frame = damaged_cap.read()
        
        if not ret_ref or not ret_damaged:
            break
        
        # Ensure frames are same size
        if ref_frame.shape != damaged_frame.shape:
            damaged_frame = cv2.resize(damaged_frame, (ref_frame.shape[1], ref_frame.shape[0]))
        
        # Compute frame difference
        difference_map, computed_depth_map = compute_frame_difference(ref_frame, damaged_frame)
        
        # Start with the damaged frame as base
        result_frame = damaged_frame.copy()
        
        # Apply edge detection if requested
        if apply_edges:
            edges = apply_edge_detection(damaged_frame)
            result_frame[edges > 0] = [255, 255, 255]
        
        # Apply depth color mapping if requested
        if apply_depth_colors:
            # Use provided depth map if available, otherwise use computed
            if frame_count < len(depth_maps):
                depth_map_path = os.path.join(depth_maps_dir, depth_maps[frame_count])
                depth_map = cv2.imread(depth_map_path, cv2.IMREAD_GRAYSCALE)
                if depth_map is not None:
                    depth_map = cv2.resize(depth_map, (width, height))
                else:
                    depth_map = computed_depth_map
            else:
                depth_map = computed_depth_map
            
            # Apply color mapping
            depth_colored = apply_depth_colormap(depth_map)
            
            # Blend with result frame
            result_frame = cv2.addWeighted(result_frame, 0.6, depth_colored, 0.4, 0)
        
        # Overlay crack map if requested and available
        if apply_crack_overlay and frame_count < len(crack_maps):
            crack_map_path = os.path.join(crack_maps_dir, crack_maps[frame_count])
            crack_map = cv2.imread(crack_map_path, cv2.IMREAD_GRAYSCALE)
            
            if crack_map is not None:
                crack_map = cv2.resize(crack_map, (width, height))
                result_frame = overlay_crack_map(result_frame, crack_map, alpha=0.3)
        
        # Write frame to video
        video_writer.write(result_frame)
        
        frame_count += 1
        if frame_count % 30 == 0:
            print(f"Processed {frame_count} frames")
    
    # Release resources
    ref_cap.release()
    damaged_cap.release()
    video_writer.release()
    
    print(f"Difference video saved to: {output_video_path}")
    
    # Return metadata
    metadata = {
        "output_path": output_video_path,
        "num_frames": frame_count,
        "fps": fps,
        "resolution": {"width": width, "height": height},
        "applied_effects": {
            "edge_detection": apply_edges,
            "crack_overlay": apply_crack_overlay,
            "depth_colors": apply_depth_colors
        }
    }
    
    return metadata
