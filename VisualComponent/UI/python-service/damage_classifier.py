"""
Damage classification module for F1 Tyre Visual Difference Engine.
Classifies tyre damage into types: blistering, micro-cracks, grain, cuts, flat spots, chunking.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import json
from enum import Enum


class DamageType(str, Enum):
    """Enumeration of tyre damage types."""
    BLISTERING = "blistering"
    MICRO_CRACKS = "micro-cracks"
    GRAIN = "grain"
    CUTS = "cuts"
    FLAT_SPOTS = "flat-spots"
    CHUNKING = "chunking"


class DamageClassifier:
    """Classifies tyre damage into specific damage types."""
    
    def __init__(self, damaged_frames_dir: str, crack_maps_dir: str, output_dir: str):
        """
        Initialize the damage classifier.
        
        Args:
            damaged_frames_dir: Directory containing damaged tyre frames
            crack_maps_dir: Directory containing crack detection binary maps
            output_dir: Directory to store classification results
        """
        self.damaged_frames_dir = Path(damaged_frames_dir)
        self.crack_maps_dir = Path(crack_maps_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def analyze_texture_roughness(self, image: np.ndarray) -> float:
        """
        Analyze surface texture roughness using standard deviation of gradients.
        High roughness indicates grain or blistering.
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            Roughness score (0-1 normalized)
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Calculate gradients
        grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        
        # Calculate gradient magnitude
        gradient_magnitude = np.sqrt(grad_x**2 + grad_y**2)
        
        # Roughness is the standard deviation of gradient magnitudes
        roughness = np.std(gradient_magnitude)
        
        # Normalize to 0-1 range (empirically determined max value)
        roughness_normalized = min(roughness / 50.0, 1.0)
        
        return roughness_normalized
    
    def detect_circular_patterns(self, crack_binary: np.ndarray) -> Tuple[int, float]:
        """
        Detect circular or bubble-like patterns indicating blistering.
        
        Args:
            crack_binary: Binary crack map
            
        Returns:
            Tuple of (number of circular patterns, average circularity)
        """
        # Find contours in crack map
        contours, _ = cv2.findContours(
            crack_binary, 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        circular_patterns = 0
        circularities = []
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            # Filter small noise
            if area < 50:
                continue
            
            # Calculate circularity: 4π * area / perimeter²
            perimeter = cv2.arcLength(contour, True)
            if perimeter == 0:
                continue
            
            circularity = 4 * np.pi * area / (perimeter ** 2)
            
            # Circular patterns have circularity close to 1.0
            if circularity > 0.7:
                circular_patterns += 1
                circularities.append(circularity)
        
        avg_circularity = np.mean(circularities) if circularities else 0.0
        
        return circular_patterns, avg_circularity
    
    def detect_linear_cracks(self, crack_binary: np.ndarray) -> Tuple[int, float]:
        """
        Detect linear crack patterns indicating cuts or micro-cracks.
        
        Args:
            crack_binary: Binary crack map
            
        Returns:
            Tuple of (number of linear cracks, average linearity)
        """
        # Use Hough Line Transform to detect lines
        lines = cv2.HoughLinesP(
            crack_binary,
            rho=1,
            theta=np.pi/180,
            threshold=30,
            minLineLength=20,
            maxLineGap=10
        )
        
        if lines is None:
            return 0, 0.0
        
        # Count lines and calculate average length
        num_lines = len(lines)
        line_lengths = []
        
        for line in lines:
            x1, y1, x2, y2 = line[0]
            length = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
            line_lengths.append(length)
        
        avg_length = np.mean(line_lengths) if line_lengths else 0.0
        
        # Normalize linearity score (longer lines = more linear)
        linearity = min(avg_length / 100.0, 1.0)
        
        return num_lines, linearity
    
    def detect_fine_crack_network(self, crack_binary: np.ndarray) -> float:
        """
        Detect fine network of small cracks indicating micro-cracks or grain.
        
        Args:
            crack_binary: Binary crack map
            
        Returns:
            Density of fine cracks (0-1 normalized)
        """
        # Apply morphological operations to isolate fine structures
        kernel_small = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        
        # Erode to remove thick cracks, leaving only fine ones
        fine_cracks = cv2.erode(crack_binary, kernel_small, iterations=1)
        
        # Calculate density of fine cracks
        total_pixels = crack_binary.shape[0] * crack_binary.shape[1]
        fine_crack_pixels = np.sum(fine_cracks > 0)
        
        density = fine_crack_pixels / total_pixels
        
        return density
    
    def detect_large_missing_chunks(self, crack_binary: np.ndarray, image: np.ndarray) -> int:
        """
        Detect large missing chunks of rubber indicating chunking damage.
        
        Args:
            crack_binary: Binary crack map
            image: Original damaged image
            
        Returns:
            Number of large chunks detected
        """
        # Find contours
        contours, _ = cv2.findContours(
            crack_binary, 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        large_chunks = 0
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            # Large chunks have significant area
            if area > 500:
                # Check if it's an irregular shape (not circular)
                perimeter = cv2.arcLength(contour, True)
                if perimeter == 0:
                    continue
                
                circularity = 4 * np.pi * area / (perimeter ** 2)
                
                # Chunks are irregular (low circularity)
                if circularity < 0.5:
                    large_chunks += 1
        
        return large_chunks
    
    def detect_flat_spot_pattern(self, image: np.ndarray) -> float:
        """
        Detect flat spot patterns (localized wear in specific region).
        
        Args:
            image: Damaged tyre image
            
        Returns:
            Flat spot score (0-1)
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Divide image into angular sectors
        height, width = gray.shape
        center_x, center_y = width // 2, height // 2
        
        # Calculate intensity variance across angular sectors
        num_sectors = 12
        sector_variances = []
        
        for i in range(num_sectors):
            angle_start = i * (360 / num_sectors)
            angle_end = (i + 1) * (360 / num_sectors)
            
            # Create sector mask
            mask = np.zeros_like(gray)
            cv2.ellipse(
                mask, 
                (center_x, center_y), 
                (width // 3, height // 3),
                0, 
                angle_start, 
                angle_end, 
                255, 
                -1
            )
            
            # Calculate variance in this sector
            sector_pixels = gray[mask > 0]
            if len(sector_pixels) > 0:
                variance = np.var(sector_pixels)
                sector_variances.append(variance)
        
        if not sector_variances:
            return 0.0
        
        # Flat spots show as localized high variance
        max_variance = max(sector_variances)
        avg_variance = np.mean(sector_variances)
        
        # Flat spot score: ratio of max to average variance
        if avg_variance > 0:
            flat_spot_score = min((max_variance / avg_variance - 1.0) / 2.0, 1.0)
        else:
            flat_spot_score = 0.0
        
        return flat_spot_score
    
    def classify_damage(
        self, 
        damaged_image: np.ndarray, 
        crack_binary: np.ndarray
    ) -> List[DamageType]:
        """
        Classify damage types based on image analysis.
        
        Args:
            damaged_image: Damaged tyre image
            crack_binary: Binary crack map
            
        Returns:
            List of detected damage types
        """
        detected_damages = []
        
        # Analyze texture roughness
        roughness = self.analyze_texture_roughness(damaged_image)
        
        # Detect circular patterns (blistering)
        num_circular, avg_circularity = self.detect_circular_patterns(crack_binary)
        
        # Detect linear cracks (cuts)
        num_linear, linearity = self.detect_linear_cracks(crack_binary)
        
        # Detect fine crack network (micro-cracks, grain)
        fine_crack_density = self.detect_fine_crack_network(crack_binary)
        
        # Detect large chunks (chunking)
        num_chunks = self.detect_large_missing_chunks(crack_binary, damaged_image)
        
        # Detect flat spots
        flat_spot_score = self.detect_flat_spot_pattern(damaged_image)
        
        # Classification rules based on feature thresholds
        
        # Blistering: circular patterns with high circularity
        if num_circular >= 3 and avg_circularity > 0.75:
            detected_damages.append(DamageType.BLISTERING)
        
        # Micro-cracks: high density of fine cracks
        if fine_crack_density > 0.02:
            detected_damages.append(DamageType.MICRO_CRACKS)
        
        # Grain: high texture roughness with fine cracks
        if roughness > 0.6 and fine_crack_density > 0.01:
            detected_damages.append(DamageType.GRAIN)
        
        # Cuts: linear cracks with high linearity
        if num_linear >= 2 and linearity > 0.5:
            detected_damages.append(DamageType.CUTS)
        
        # Flat spots: localized wear pattern
        if flat_spot_score > 0.3:
            detected_damages.append(DamageType.FLAT_SPOTS)
        
        # Chunking: large missing chunks
        if num_chunks >= 1:
            detected_damages.append(DamageType.CHUNKING)
        
        return detected_damages
    
    def analyze_frame_damage(
        self, 
        frame_index: int,
        damaged_image: np.ndarray,
        crack_binary: np.ndarray
    ) -> Dict[str, any]:
        """
        Analyze damage classification for a single frame.
        
        Args:
            frame_index: Index of the frame
            damaged_image: Damaged tyre image
            crack_binary: Binary crack map
            
        Returns:
            Dictionary containing damage classification results
        """
        # Classify damage types
        damage_types = self.classify_damage(damaged_image, crack_binary)
        
        return {
            'frame_index': frame_index,
            'damage_types': [dt.value for dt in damage_types],
            'num_damage_types': len(damage_types)
        }
    
    def analyze_video_damage_classification(self) -> Dict[str, any]:
        """
        Analyze damage classification across all frames in the video.
        
        Returns:
            Dictionary containing comprehensive damage classification
        """
        print("Starting damage classification analysis...")
        
        # Load damaged frames and crack maps
        damaged_frames = sorted(self.damaged_frames_dir.glob("*.png"))
        crack_binaries = sorted(self.crack_maps_dir.glob("crack_binary_*.png"))
        
        if len(damaged_frames) == 0:
            raise RuntimeError("No damaged frames found")
        
        if len(crack_binaries) == 0:
            raise RuntimeError("No crack binary maps found")
        
        print(f"Analyzing {len(damaged_frames)} frames for damage classification")
        
        # Process each frame
        frame_results = []
        damage_type_counts = {dt.value: 0 for dt in DamageType}
        
        for i, damaged_frame_path in enumerate(damaged_frames):
            # Load damaged frame
            damaged_img = cv2.imread(str(damaged_frame_path))
            if damaged_img is None:
                continue
            
            # Load corresponding crack binary map
            if i < len(crack_binaries):
                crack_binary = cv2.imread(str(crack_binaries[i]), cv2.IMREAD_GRAYSCALE)
                if crack_binary is None:
                    continue
            else:
                continue
            
            # Analyze damage classification for this frame
            result = self.analyze_frame_damage(i, damaged_img, crack_binary)
            frame_results.append(result)
            
            # Count damage types
            for damage_type in result['damage_types']:
                damage_type_counts[damage_type] += 1
        
        # Determine overall detected damage types
        # A damage type is considered present if detected in at least 20% of frames
        threshold = len(frame_results) * 0.2
        overall_damage_types = [
            damage_type 
            for damage_type, count in damage_type_counts.items() 
            if count >= threshold
        ]
        
        # Compile results
        analysis_results = {
            'total_frames_analyzed': len(frame_results),
            'detected_damage_types': overall_damage_types,
            'damage_type_frame_counts': damage_type_counts,
            'frame_results': frame_results
        }
        
        # Save analysis results
        results_path = self.output_dir / "damage_classification_results.json"
        with open(results_path, 'w') as f:
            json.dump(analysis_results, f, indent=2)
        
        print(f"Damage classification complete. Detected types: {overall_damage_types}")
        
        return analysis_results


def classify_tyre_damage(
    damaged_frames_dir: str,
    crack_maps_dir: str,
    output_dir: str
) -> Dict[str, any]:
    """
    Convenience function to classify tyre damage types.
    
    Args:
        damaged_frames_dir: Directory containing damaged tyre frames
        crack_maps_dir: Directory containing crack detection binary maps
        output_dir: Directory for output classification results
        
    Returns:
        Damage classification results dictionary
    """
    classifier = DamageClassifier(damaged_frames_dir, crack_maps_dir, output_dir)
    return classifier.analyze_video_damage_classification()
