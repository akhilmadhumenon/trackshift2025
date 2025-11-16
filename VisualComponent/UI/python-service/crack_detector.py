"""
Crack detection module for F1 Tyre Visual Difference Engine.
Implements Canny edge detection and morphological operations to identify crack patterns.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import json


class CrackDetector:
    """Detects and analyzes cracks in tyre images."""
    
    def __init__(self, reference_frames_dir: str, damaged_frames_dir: str, output_dir: str):
        """
        Initialize the crack detector.
        
        Args:
            reference_frames_dir: Directory containing reference tyre frames
            damaged_frames_dir: Directory containing damaged tyre frames
            output_dir: Directory to store crack maps and analysis results
        """
        self.reference_frames_dir = Path(reference_frames_dir)
        self.damaged_frames_dir = Path(damaged_frames_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.crack_maps_dir = self.output_dir / "crack_maps"
        self.crack_maps_dir.mkdir(exist_ok=True)
    
    def apply_canny_edge_detection(
        self, 
        image: np.ndarray, 
        low_threshold: int = 50, 
        high_threshold: int = 150
    ) -> np.ndarray:
        """
        Apply Canny edge detection to detect edges in the image.
        
        Args:
            image: Input image (BGR format)
            low_threshold: Lower threshold for edge detection
            high_threshold: Upper threshold for edge detection
            
        Returns:
            Binary edge map
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 1.4)
        
        # Apply Canny edge detection
        edges = cv2.Canny(blurred, low_threshold, high_threshold)
        
        return edges
    
    def apply_morphological_operations(self, edges: np.ndarray) -> np.ndarray:
        """
        Apply morphological operations to identify crack patterns.
        
        Args:
            edges: Binary edge map from Canny detection
            
        Returns:
            Processed binary image with crack patterns
        """
        # Define morphological kernels
        # Line kernel to detect linear crack patterns
        line_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        
        # Close small gaps in cracks
        closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, line_kernel, iterations=1)
        
        # Remove small noise
        opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, line_kernel, iterations=1)
        
        # Dilate to make cracks more visible
        dilated = cv2.dilate(opened, line_kernel, iterations=1)
        
        return dilated
    
    def compute_difference_map(
        self, 
        reference_image: np.ndarray, 
        damaged_image: np.ndarray
    ) -> np.ndarray:
        """
        Compute difference between reference and damaged images to isolate new damage.
        
        Args:
            reference_image: Reference tyre image
            damaged_image: Damaged tyre image
            
        Returns:
            Difference map highlighting new damage
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
        
        # Compute absolute difference
        diff = cv2.absdiff(ref_gray, dam_gray)
        
        # Threshold to get significant differences
        _, diff_binary = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)
        
        return diff_binary
    
    def detect_cracks(
        self, 
        damaged_image: np.ndarray, 
        reference_image: Optional[np.ndarray] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Detect cracks in damaged tyre image.
        
        Args:
            damaged_image: Damaged tyre image
            reference_image: Optional reference image for difference analysis
            
        Returns:
            Tuple of (crack_binary_map, crack_visualization)
        """
        # Apply Canny edge detection
        edges = self.apply_canny_edge_detection(damaged_image)
        
        # Apply morphological operations
        crack_binary = self.apply_morphological_operations(edges)
        
        # If reference image provided, use difference to filter out normal features
        if reference_image is not None:
            diff_map = self.compute_difference_map(reference_image, damaged_image)
            
            # Combine edge detection with difference map
            # Only keep edges that appear in areas with significant differences
            crack_binary = cv2.bitwise_and(crack_binary, diff_map)
        
        # Create visualization with highlighted cracks (red on original image)
        crack_visualization = damaged_image.copy()
        crack_visualization[crack_binary > 0] = [0, 0, 255]  # Red color for cracks
        
        return crack_binary, crack_visualization
    
    def count_cracks(self, crack_binary: np.ndarray, min_crack_area: int = 20) -> int:
        """
        Count the number of distinct cracks in the binary crack map.
        
        Args:
            crack_binary: Binary crack map
            min_crack_area: Minimum area (in pixels) to consider as a crack
            
        Returns:
            Total number of detected cracks
        """
        # Find connected components (individual cracks)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            crack_binary, 
            connectivity=8
        )
        
        # Count cracks (excluding background label 0)
        crack_count = 0
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            if area >= min_crack_area:
                crack_count += 1
        
        return crack_count
    
    def generate_crack_map(
        self, 
        frame_index: int,
        damaged_image: np.ndarray,
        reference_image: Optional[np.ndarray] = None
    ) -> Dict[str, any]:
        """
        Generate crack map for a single frame.
        
        Args:
            frame_index: Index of the frame being processed
            damaged_image: Damaged tyre image
            reference_image: Optional reference image
            
        Returns:
            Dictionary containing crack analysis results
        """
        # Detect cracks
        crack_binary, crack_visualization = self.detect_cracks(
            damaged_image, 
            reference_image
        )
        
        # Count cracks
        crack_count = self.count_cracks(crack_binary)
        
        # Save crack map visualization
        crack_map_path = self.crack_maps_dir / f"crack_map_{frame_index:04d}.png"
        cv2.imwrite(str(crack_map_path), crack_visualization)
        
        # Save binary crack map
        crack_binary_path = self.crack_maps_dir / f"crack_binary_{frame_index:04d}.png"
        cv2.imwrite(str(crack_binary_path), crack_binary)
        
        # Calculate crack density (percentage of pixels that are cracks)
        total_pixels = crack_binary.shape[0] * crack_binary.shape[1]
        crack_pixels = np.sum(crack_binary > 0)
        crack_density = (crack_pixels / total_pixels) * 100
        
        return {
            'frame_index': frame_index,
            'crack_count': crack_count,
            'crack_density': crack_density,
            'crack_map_path': str(crack_map_path),
            'crack_binary_path': str(crack_binary_path)
        }
    
    def analyze_video_cracks(self) -> Dict[str, any]:
        """
        Analyze cracks across all frames in the video.
        
        Returns:
            Dictionary containing comprehensive crack analysis
        """
        print("Starting crack detection analysis...")
        
        # Load reference frames
        reference_frames = sorted(self.reference_frames_dir.glob("*.png"))
        damaged_frames = sorted(self.damaged_frames_dir.glob("*.png"))
        
        if len(damaged_frames) == 0:
            raise RuntimeError("No damaged frames found")
        
        print(f"Analyzing {len(damaged_frames)} damaged frames")
        
        # Process each frame
        frame_results = []
        total_cracks = 0
        
        for i, damaged_frame_path in enumerate(damaged_frames):
            # Load damaged frame
            damaged_img = cv2.imread(str(damaged_frame_path))
            if damaged_img is None:
                continue
            
            # Load corresponding reference frame if available
            reference_img = None
            if i < len(reference_frames):
                reference_img = cv2.imread(str(reference_frames[i]))
            
            # Generate crack map for this frame
            result = self.generate_crack_map(i, damaged_img, reference_img)
            frame_results.append(result)
            total_cracks += result['crack_count']
        
        # Calculate aggregate statistics
        avg_crack_count = total_cracks / len(frame_results) if frame_results else 0
        avg_crack_density = np.mean([r['crack_density'] for r in frame_results]) if frame_results else 0
        
        # Create composite crack map (overlay all cracks)
        composite_crack_map = self._create_composite_crack_map(frame_results)
        
        # Save composite crack map
        composite_path = self.output_dir / "composite_crack_map.png"
        cv2.imwrite(str(composite_path), composite_crack_map)
        
        # Compile results
        analysis_results = {
            'total_frames_analyzed': len(frame_results),
            'total_crack_count': total_cracks,
            'average_crack_count_per_frame': avg_crack_count,
            'average_crack_density': avg_crack_density,
            'composite_crack_map_path': str(composite_path),
            'frame_results': frame_results
        }
        
        # Save analysis results
        results_path = self.output_dir / "crack_analysis_results.json"
        with open(results_path, 'w') as f:
            json.dump(analysis_results, f, indent=2)
        
        print(f"Crack detection complete. Total cracks detected: {total_cracks}")
        
        return analysis_results
    
    def _create_composite_crack_map(self, frame_results: List[Dict]) -> np.ndarray:
        """
        Create a composite crack map by overlaying all detected cracks.
        
        Args:
            frame_results: List of frame analysis results
            
        Returns:
            Composite crack map image
        """
        if not frame_results:
            return np.zeros((512, 512, 3), dtype=np.uint8)
        
        # Load first crack map as base
        first_map_path = frame_results[0]['crack_map_path']
        composite = cv2.imread(first_map_path)
        
        if composite is None:
            return np.zeros((512, 512, 3), dtype=np.uint8)
        
        # Overlay all other crack maps
        for result in frame_results[1:]:
            crack_map = cv2.imread(result['crack_map_path'])
            if crack_map is not None:
                # Blend with maximum intensity (to show all cracks)
                composite = cv2.max(composite, crack_map)
        
        return composite


def detect_tyre_cracks(
    reference_frames_dir: str,
    damaged_frames_dir: str,
    output_dir: str
) -> Dict[str, any]:
    """
    Convenience function to detect cracks in tyre videos.
    
    Args:
        reference_frames_dir: Directory containing reference tyre frames
        damaged_frames_dir: Directory containing damaged tyre frames
        output_dir: Directory for output crack maps and analysis
        
    Returns:
        Crack analysis results dictionary
    """
    detector = CrackDetector(reference_frames_dir, damaged_frames_dir, output_dir)
    return detector.analyze_video_cracks()
