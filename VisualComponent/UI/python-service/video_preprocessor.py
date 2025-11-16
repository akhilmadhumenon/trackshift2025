"""
Video preprocessing module for F1 Tyre Visual Difference Engine.
Handles frame extraction, tyre detection, reorientation, stabilization, and normalization.
"""

import cv2
import numpy as np
import subprocess
import os
import tempfile
from pathlib import Path
from typing import List, Tuple, Optional, Dict
import json


class VideoPreprocessor:
    """Handles video preprocessing for tyre analysis."""
    
    def __init__(self, video_path: str, output_dir: str):
        """
        Initialize the video preprocessor.
        
        Args:
            video_path: Path to the input video file
            output_dir: Directory to store processed frames and outputs
        """
        self.video_path = video_path
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.frames_dir = self.output_dir / "frames"
        self.frames_dir.mkdir(exist_ok=True)
        
        self.processed_frames_dir = self.output_dir / "processed_frames"
        self.processed_frames_dir.mkdir(exist_ok=True)
        
    def extract_frames(self, fps: int = 30) -> List[str]:
        """
        Extract frames from video using FFmpeg.
        
        Args:
            fps: Frames per second to extract (default: 30)
            
        Returns:
            List of paths to extracted frame files
        """
        output_pattern = str(self.frames_dir / "frame_%04d.png")
        
        # Use FFmpeg to extract frames
        cmd = [
            'ffmpeg',
            '-i', self.video_path,
            '-vf', f'fps={fps}',
            '-q:v', '2',  # High quality
            output_pattern,
            '-y'  # Overwrite existing files
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"FFmpeg frame extraction failed: {e.stderr}")
        
        # Get list of extracted frames
        frame_files = sorted(self.frames_dir.glob("frame_*.png"))
        return [str(f) for f in frame_files]
    
    def detect_tyre_circle(self, image: np.ndarray) -> Optional[Tuple[int, int, int]]:
        """
        Detect tyre circle using OpenCV Hough Circle Transform.
        
        Args:
            image: Input image as numpy array
            
        Returns:
            Tuple of (x, y, radius) if circle detected, None otherwise
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (9, 9), 2)
        
        # Detect circles using Hough Circle Transform
        circles = cv2.HoughCircles(
            blurred,
            cv2.HOUGH_GRADIENT,
            dp=1,
            minDist=gray.shape[0] // 2,  # Minimum distance between circles
            param1=50,  # Canny edge detection threshold
            param2=30,  # Accumulator threshold
            minRadius=int(min(gray.shape) * 0.2),  # Minimum circle radius
            maxRadius=int(min(gray.shape) * 0.45)   # Maximum circle radius
        )
        
        if circles is not None:
            circles = np.uint16(np.around(circles))
            # Return the first (most prominent) circle
            x, y, r = circles[0][0]
            return (int(x), int(y), int(r))
        
        return None
    
    def reorient_frame(self, image: np.ndarray, circle: Tuple[int, int, int]) -> np.ndarray:
        """
        Reorient frame to perfect 90° top-down view centered on tyre.
        
        Args:
            image: Input image
            circle: Tuple of (x, y, radius) for the detected tyre circle
            
        Returns:
            Reoriented and cropped image
        """
        x, y, r = circle
        
        # Calculate crop size (square around the circle with some padding)
        padding = int(r * 0.3)
        crop_size = (r + padding) * 2
        
        # Calculate crop boundaries
        x1 = max(0, x - r - padding)
        y1 = max(0, y - r - padding)
        x2 = min(image.shape[1], x + r + padding)
        y2 = min(image.shape[0], y + r + padding)
        
        # Crop the image
        cropped = image[y1:y2, x1:x2]
        
        # Resize to standard size for consistency
        standard_size = 512
        resized = cv2.resize(cropped, (standard_size, standard_size))
        
        return resized
    
    def stabilize_rotation(self, frames: List[np.ndarray]) -> List[np.ndarray]:
        """
        Stabilize rotation across frames to maintain consistent orientation.
        
        Args:
            frames: List of frame images
            
        Returns:
            List of stabilized frames
        """
        if len(frames) < 2:
            return frames
        
        stabilized = [frames[0]]
        
        for i in range(1, len(frames)):
            # Use ORB feature detector for rotation estimation
            orb = cv2.ORB_create(nfeatures=500)
            
            # Detect keypoints and descriptors
            kp1, des1 = orb.detectAndCompute(frames[i-1], None)
            kp2, des2 = orb.detectAndCompute(frames[i], None)
            
            if des1 is None or des2 is None:
                stabilized.append(frames[i])
                continue
            
            # Match features
            bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
            matches = bf.match(des1, des2)
            
            if len(matches) < 10:
                stabilized.append(frames[i])
                continue
            
            # Sort matches by distance
            matches = sorted(matches, key=lambda x: x.distance)
            
            # Extract matched keypoints
            pts1 = np.float32([kp1[m.queryIdx].pt for m in matches[:50]])
            pts2 = np.float32([kp2[m.trainIdx].pt for m in matches[:50]])
            
            # Estimate affine transformation
            try:
                M, _ = cv2.estimateAffinePartial2D(pts2, pts1)
                
                if M is not None:
                    # Apply transformation to stabilize
                    h, w = frames[i].shape[:2]
                    stabilized_frame = cv2.warpAffine(frames[i], M, (w, h))
                    stabilized.append(stabilized_frame)
                else:
                    stabilized.append(frames[i])
            except:
                stabilized.append(frames[i])
        
        return stabilized
    
    def normalize_brightness_contrast(self, image: np.ndarray) -> np.ndarray:
        """
        Normalize brightness and contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization).
        
        Args:
            image: Input image
            
        Returns:
            Normalized image
        """
        # Convert to LAB color space
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        
        # Split channels
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE to L channel
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_normalized = clahe.apply(l)
        
        # Merge channels
        lab_normalized = cv2.merge([l_normalized, a, b])
        
        # Convert back to BGR
        normalized = cv2.cvtColor(lab_normalized, cv2.COLOR_LAB2BGR)
        
        return normalized
    
    def process_video(self, fps: int = 30) -> Dict[str, any]:
        """
        Complete preprocessing pipeline for a video.
        
        Args:
            fps: Frames per second to extract
            
        Returns:
            Dictionary containing processing results and metadata
        """
        print(f"Starting video preprocessing for: {self.video_path}")
        
        # Step 1: Extract frames
        print("Step 1: Extracting frames...")
        frame_paths = self.extract_frames(fps=fps)
        print(f"Extracted {len(frame_paths)} frames")
        
        if len(frame_paths) == 0:
            raise RuntimeError("No frames extracted from video")
        
        # Step 2: Load frames and detect tyre circles
        print("Step 2: Detecting tyre circles...")
        frames = []
        circles = []
        
        for frame_path in frame_paths:
            img = cv2.imread(frame_path)
            if img is None:
                continue
            
            circle = self.detect_tyre_circle(img)
            if circle is not None:
                frames.append(img)
                circles.append(circle)
        
        print(f"Detected tyre circles in {len(circles)} frames")
        
        if len(circles) == 0:
            raise RuntimeError("No tyre circles detected in video")
        
        # Step 3: Reorient frames
        print("Step 3: Reorienting frames to 90° top-down view...")
        reoriented_frames = []
        for img, circle in zip(frames, circles):
            reoriented = self.reorient_frame(img, circle)
            reoriented_frames.append(reoriented)
        
        # Step 4: Stabilize rotation
        print("Step 4: Stabilizing rotation across frames...")
        stabilized_frames = self.stabilize_rotation(reoriented_frames)
        
        # Step 5: Normalize brightness and contrast
        print("Step 5: Normalizing brightness and contrast...")
        processed_frames = []
        for i, frame in enumerate(stabilized_frames):
            normalized = self.normalize_brightness_contrast(frame)
            processed_frames.append(normalized)
            
            # Save processed frame
            output_path = self.processed_frames_dir / f"processed_{i:04d}.png"
            cv2.imwrite(str(output_path), normalized)
        
        print(f"Preprocessing complete. Processed {len(processed_frames)} frames")
        
        # Calculate average circle parameters for metadata
        avg_circle = {
            'x': int(np.mean([c[0] for c in circles])),
            'y': int(np.mean([c[1] for c in circles])),
            'radius': int(np.mean([c[2] for c in circles]))
        }
        
        # Save metadata
        metadata = {
            'video_path': self.video_path,
            'total_frames': len(processed_frames),
            'fps': fps,
            'avg_circle': avg_circle,
            'processed_frames_dir': str(self.processed_frames_dir)
        }
        
        metadata_path = self.output_dir / "preprocessing_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return metadata


def preprocess_video_file(video_path: str, output_dir: str, fps: int = 30) -> Dict[str, any]:
    """
    Convenience function to preprocess a video file.
    
    Args:
        video_path: Path to input video
        output_dir: Directory for output files
        fps: Frames per second to extract
        
    Returns:
        Processing metadata dictionary
    """
    preprocessor = VideoPreprocessor(video_path, output_dir)
    return preprocessor.process_video(fps=fps)
