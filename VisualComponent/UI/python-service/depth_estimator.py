"""
Depth estimation module for F1 Tyre Visual Difference Engine.
Compares reference and damaged frames to calculate depth differences using stereo vision techniques.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import json


class DepthEstimator:
    """Estimates depth differences between reference and damaged tyre images."""
    
    def __init__(self, reference_frames_dir: str, damaged_frames_dir: str, output_dir: str):
        """
        Initialize the depth estimator.
        
        Args:
            reference_frames_dir: Directory containing reference tyre frames
            damaged_frames_dir: Directory containing damaged tyre frames
            output_dir: Directory to store depth maps and analysis results
        """
        self.reference_frames_dir = Path(reference_frames_dir)
        self.damaged_frames_dir = Path(damaged_frames_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.depth_maps_dir = self.output_dir / "depth_maps"
        self.depth_maps_dir.mkdir(exist_ok=True)
        
        # Calibration factor to convert pixel differences to millimeters
        # This is a simplified estimation - in production, this would be calibrated
        # based on camera parameters and known tyre dimensions
        self.mm_per_pixel_diff = 0.05  # Approximate conversion factor
    
    def compute_pixel_difference(
        self, 
        reference_image: np.ndarray, 
        damaged_image: np.ndarray
    ) -> np.ndarray:
        """
        Compute pixel-by-pixel difference between reference and damaged images.
        
        Args:
            reference_image: Reference tyre image (BGR format)
            damaged_image: Damaged tyre image (BGR format)
            
        Returns:
            Difference map (grayscale)
        """
        # Ensure images are the same size
        if reference_image.shape != damaged_image.shape:
            damaged_image = cv2.resize(
                damaged_image, 
                (reference_image.shape[1], reference_image.shape[0])
            )
        
        # Convert to grayscale for intensity comparison
        ref_gray = cv2.cvtColor(reference_image, cv2.COLOR_BGR2GRAY)
        dam_gray = cv2.cvtColor(damaged_image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        ref_blur = cv2.GaussianBlur(ref_gray, (5, 5), 1.0)
        dam_blur = cv2.GaussianBlur(dam_gray, (5, 5), 1.0)
        
        # Compute absolute difference
        diff = cv2.absdiff(ref_blur, dam_blur)
        
        return diff
    
    def estimate_depth_from_stereo(
        self, 
        reference_image: np.ndarray, 
        damaged_image: np.ndarray
    ) -> np.ndarray:
        """
        Estimate depth using stereo vision techniques.
        Uses block matching to compute disparity map.
        
        Args:
            reference_image: Reference tyre image
            damaged_image: Damaged tyre image
            
        Returns:
            Depth map (normalized float values)
        """
        # Ensure images are the same size
        if reference_image.shape != damaged_image.shape:
            damaged_image = cv2.resize(
                damaged_image, 
                (reference_image.shape[1], reference_image.shape[0])
            )
        
        # Convert to grayscale
        ref_gray = cv2.cvtColor(reference_image, cv2.COLOR_BGR2GRAY)
        dam_gray = cv2.cvtColor(damaged_image, cv2.COLOR_BGR2GRAY)
        
        # Create StereoBM (Block Matching) object for disparity computation
        # This simulates stereo vision by treating temporal differences as spatial disparity
        stereo = cv2.StereoBM_create(numDisparities=16, blockSize=15)
        
        # Compute disparity map
        disparity = stereo.compute(ref_gray, dam_gray)
        
        # Normalize disparity to 0-1 range
        disparity_normalized = cv2.normalize(
            disparity, 
            None, 
            alpha=0, 
            beta=1, 
            norm_type=cv2.NORM_MINMAX, 
            dtype=cv2.CV_32F
        )
        
        return disparity_normalized

    def calculate_depth_differences(
        self, 
        reference_image: np.ndarray, 
        damaged_image: np.ndarray
    ) -> Tuple[np.ndarray, float]:
        """
        Calculate depth differences using combined pixel difference and stereo estimation.
        
        Args:
            reference_image: Reference tyre image
            damaged_image: Damaged tyre image
            
        Returns:
            Tuple of (depth_map, max_depth_mm)
        """
        # Method 1: Pixel-by-pixel intensity difference
        pixel_diff = self.compute_pixel_difference(reference_image, damaged_image)
        
        # Method 2: Stereo vision disparity
        stereo_depth = self.estimate_depth_from_stereo(reference_image, damaged_image)
        
        # Combine both methods (weighted average)
        # Pixel difference gives us surface texture changes
        # Stereo depth gives us geometric displacement
        pixel_diff_normalized = pixel_diff.astype(np.float32) / 255.0
        combined_depth = (pixel_diff_normalized * 0.6 + stereo_depth * 0.4)
        
        # Apply morphological operations to smooth depth map
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        combined_depth_uint8 = (combined_depth * 255).astype(np.uint8)
        smoothed = cv2.morphologyEx(combined_depth_uint8, cv2.MORPH_CLOSE, kernel)
        combined_depth = smoothed.astype(np.float32) / 255.0
        
        # Calculate maximum depth in millimeters
        max_depth_normalized = np.max(combined_depth)
        max_depth_mm = max_depth_normalized * 255 * self.mm_per_pixel_diff
        
        return combined_depth, max_depth_mm
    
    def generate_depth_color_map(
        self, 
        depth_map: np.ndarray,
        colormap: int = cv2.COLORMAP_JET
    ) -> np.ndarray:
        """
        Generate color-coded depth map (blue=shallow, red=deep).
        
        Args:
            depth_map: Normalized depth map (0-1 range)
            colormap: OpenCV colormap to use (default: COLORMAP_JET)
            
        Returns:
            Color-coded depth map (BGR format)
        """
        # Convert to 8-bit for colormap application
        depth_uint8 = (depth_map * 255).astype(np.uint8)
        
        # Apply colormap (COLORMAP_JET: blue=low, red=high)
        colored_depth = cv2.applyColorMap(depth_uint8, colormap)
        
        return colored_depth
    
    def generate_depth_map(
        self, 
        frame_index: int,
        reference_image: np.ndarray,
        damaged_image: np.ndarray
    ) -> Dict[str, any]:
        """
        Generate depth map for a single frame pair.
        
        Args:
            frame_index: Index of the frame being processed
            reference_image: Reference tyre image
            damaged_image: Damaged tyre image
            
        Returns:
            Dictionary containing depth analysis results
        """
        # Calculate depth differences
        depth_map, max_depth_mm = self.calculate_depth_differences(
            reference_image, 
            damaged_image
        )
        
        # Generate color-coded visualization
        colored_depth = self.generate_depth_color_map(depth_map)
        
        # Save depth map visualization
        depth_map_path = self.depth_maps_dir / f"depth_map_{frame_index:04d}.png"
        cv2.imwrite(str(depth_map_path), colored_depth)
        
        # Save raw depth data
        depth_raw_path = self.depth_maps_dir / f"depth_raw_{frame_index:04d}.npy"
        np.save(str(depth_raw_path), depth_map)
        
        # Calculate depth statistics
        mean_depth = np.mean(depth_map)
        std_depth = np.std(depth_map)
        
        # Calculate depth in millimeters for statistics
        mean_depth_mm = mean_depth * 255 * self.mm_per_pixel_diff
        
        return {
            'frame_index': frame_index,
            'max_depth_mm': float(max_depth_mm),
            'mean_depth_mm': float(mean_depth_mm),
            'std_depth': float(std_depth),
            'depth_map_path': str(depth_map_path),
            'depth_raw_path': str(depth_raw_path)
        }
    
    def analyze_video_depth(self) -> Dict[str, any]:
        """
        Analyze depth differences across all frames in the video.
        
        Returns:
            Dictionary containing comprehensive depth analysis
        """
        print("Starting depth estimation analysis...")
        
        # Load reference and damaged frames
        reference_frames = sorted(self.reference_frames_dir.glob("*.png"))
        damaged_frames = sorted(self.damaged_frames_dir.glob("*.png"))
        
        if len(reference_frames) == 0:
            raise RuntimeError("No reference frames found")
        
        if len(damaged_frames) == 0:
            raise RuntimeError("No damaged frames found")
        
        # Use minimum number of frames available
        num_frames = min(len(reference_frames), len(damaged_frames))
        print(f"Analyzing {num_frames} frame pairs")
        
        # Process each frame pair
        frame_results = []
        max_depths = []
        
        for i in range(num_frames):
            # Load reference and damaged frames
            ref_img = cv2.imread(str(reference_frames[i]))
            dam_img = cv2.imread(str(damaged_frames[i]))
            
            if ref_img is None or dam_img is None:
                continue
            
            # Generate depth map for this frame pair
            result = self.generate_depth_map(i, ref_img, dam_img)
            frame_results.append(result)
            max_depths.append(result['max_depth_mm'])
        
        # Calculate aggregate statistics
        overall_max_depth_mm = max(max_depths) if max_depths else 0.0
        avg_max_depth_mm = np.mean(max_depths) if max_depths else 0.0
        
        # Create composite depth map (maximum depth across all frames)
        composite_depth_map = self._create_composite_depth_map(frame_results)
        
        # Save composite depth map
        composite_path = self.output_dir / "composite_depth_map.png"
        cv2.imwrite(str(composite_path), composite_depth_map)
        
        # Compile results
        analysis_results = {
            'total_frames_analyzed': len(frame_results),
            'max_depth_estimate_mm': float(overall_max_depth_mm),
            'average_max_depth_mm': float(avg_max_depth_mm),
            'composite_depth_map_path': str(composite_path),
            'frame_results': frame_results
        }
        
        # Save analysis results
        results_path = self.output_dir / "depth_analysis_results.json"
        with open(results_path, 'w') as f:
            json.dump(analysis_results, f, indent=2)
        
        print(f"Depth estimation complete. Max depth: {overall_max_depth_mm:.2f} mm")
        
        return analysis_results
    
    def _create_composite_depth_map(self, frame_results: List[Dict]) -> np.ndarray:
        """
        Create a composite depth map showing maximum depth across all frames.
        
        Args:
            frame_results: List of frame analysis results
            
        Returns:
            Composite depth map image
        """
        if not frame_results:
            return np.zeros((512, 512, 3), dtype=np.uint8)
        
        # Load all raw depth maps
        depth_maps = []
        for result in frame_results:
            depth_raw = np.load(result['depth_raw_path'])
            depth_maps.append(depth_raw)
        
        if not depth_maps:
            return np.zeros((512, 512, 3), dtype=np.uint8)
        
        # Stack and take maximum depth at each pixel
        depth_stack = np.stack(depth_maps, axis=0)
        composite_depth = np.max(depth_stack, axis=0)
        
        # Generate color-coded visualization
        colored_composite = self.generate_depth_color_map(composite_depth)
        
        return colored_composite


def estimate_tyre_depth(
    reference_frames_dir: str,
    damaged_frames_dir: str,
    output_dir: str
) -> Dict[str, any]:
    """
    Convenience function to estimate depth differences in tyre videos.
    
    Args:
        reference_frames_dir: Directory containing reference tyre frames
        damaged_frames_dir: Directory containing damaged tyre frames
        output_dir: Directory for output depth maps and analysis
        
    Returns:
        Depth analysis results dictionary
    """
    estimator = DepthEstimator(reference_frames_dir, damaged_frames_dir, output_dir)
    return estimator.analyze_video_depth()
