"""
Severity score calculation module for F1 Tyre Visual Difference Engine.
Combines crack count, depth, and damage types into a 0-100 severity score.
Generates severity timeline by rotation angle.
"""

import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import json


class SeverityCalculator:
    """Calculates tyre damage severity score and timeline."""
    
    # Damage type severity weights (0-1 scale)
    DAMAGE_TYPE_SEVERITY = {
        'blistering': 0.7,
        'micro-cracks': 0.5,
        'grain': 0.4,
        'cuts': 0.8,
        'flat-spots': 0.9,
        'chunking': 1.0
    }
    
    # Weight factors for severity calculation
    CRACK_DENSITY_WEIGHT = 0.40  # 40%
    DEPTH_WEIGHT = 0.30           # 30%
    DAMAGE_TYPE_WEIGHT = 0.30     # 30%
    
    def __init__(self, output_dir: str):
        """
        Initialize the severity calculator.
        
        Args:
            output_dir: Directory to store severity analysis results
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def normalize_crack_density(self, crack_density: float, max_density: float = 10.0) -> float:
        """
        Normalize crack density to 0-1 scale.
        
        Args:
            crack_density: Crack density percentage (0-100)
            max_density: Maximum expected crack density for normalization
            
        Returns:
            Normalized crack density (0-1)
        """
        # Clamp to max_density and normalize
        normalized = min(crack_density / max_density, 1.0)
        return normalized
    
    def normalize_depth(self, depth_mm: float, max_depth: float = 5.0) -> float:
        """
        Normalize depth estimate to 0-1 scale.
        
        Args:
            depth_mm: Depth estimate in millimeters
            max_depth: Maximum expected depth for normalization (5mm is severe)
            
        Returns:
            Normalized depth (0-1)
        """
        # Clamp to max_depth and normalize
        normalized = min(depth_mm / max_depth, 1.0)
        return normalized
    
    def calculate_damage_type_severity(self, damage_types: List[str]) -> float:
        """
        Calculate severity score based on detected damage types.
        
        Args:
            damage_types: List of detected damage type strings
            
        Returns:
            Damage type severity score (0-1)
        """
        if not damage_types:
            return 0.0
        
        # Get severity values for each detected damage type
        severities = []
        for damage_type in damage_types:
            severity = self.DAMAGE_TYPE_SEVERITY.get(damage_type, 0.5)
            severities.append(severity)
        
        # Use maximum severity among detected types
        # (most severe damage determines the score)
        max_severity = max(severities)
        
        return max_severity
    
    def calculate_severity_score(
        self,
        crack_density: float,
        depth_mm: float,
        damage_types: List[str]
    ) -> float:
        """
        Calculate overall severity score (0-100) using weighted factors.
        
        Weight factors:
        - Crack density: 40%
        - Depth: 30%
        - Damage type severity: 30%
        
        Args:
            crack_density: Crack density percentage
            depth_mm: Maximum depth estimate in millimeters
            damage_types: List of detected damage types
            
        Returns:
            Severity score (0-100)
        """
        # Normalize each factor to 0-1 scale
        crack_score = self.normalize_crack_density(crack_density)
        depth_score = self.normalize_depth(depth_mm)
        damage_type_score = self.calculate_damage_type_severity(damage_types)
        
        # Calculate weighted severity score
        severity = (
            crack_score * self.CRACK_DENSITY_WEIGHT +
            depth_score * self.DEPTH_WEIGHT +
            damage_type_score * self.DAMAGE_TYPE_WEIGHT
        )
        
        # Convert to 0-100 scale
        severity_score = severity * 100.0
        
        return severity_score
    
    def calculate_frame_severity(
        self,
        crack_density: float,
        depth_mm: float,
        damage_types: List[str]
    ) -> Dict[str, float]:
        """
        Calculate severity score and component scores for a single frame.
        
        Args:
            crack_density: Crack density percentage
            depth_mm: Depth estimate in millimeters
            damage_types: List of detected damage types
            
        Returns:
            Dictionary with severity score and component scores
        """
        # Calculate normalized component scores
        crack_score = self.normalize_crack_density(crack_density)
        depth_score = self.normalize_depth(depth_mm)
        damage_type_score = self.calculate_damage_type_severity(damage_types)
        
        # Calculate overall severity
        severity_score = self.calculate_severity_score(
            crack_density,
            depth_mm,
            damage_types
        )
        
        return {
            'severity_score': severity_score,
            'crack_density_score': crack_score * 100.0,
            'depth_score': depth_score * 100.0,
            'damage_type_score': damage_type_score * 100.0
        }
    
    def generate_severity_timeline(
        self,
        crack_results: Dict[str, any],
        depth_results: Dict[str, any],
        damage_results: Dict[str, any]
    ) -> List[Dict[str, float]]:
        """
        Generate severity timeline by rotation angle.
        
        Args:
            crack_results: Crack detection results with frame data
            depth_results: Depth estimation results with frame data
            damage_results: Damage classification results with frame data
            
        Returns:
            List of timeline points with rotation angle and severity
        """
        # Extract frame results from each analysis
        crack_frames = crack_results.get('frame_results', [])
        depth_frames = depth_results.get('frame_results', [])
        damage_frames = damage_results.get('frame_results', [])
        
        # Determine number of frames to process
        num_frames = min(
            len(crack_frames),
            len(depth_frames),
            len(damage_frames)
        )
        
        if num_frames == 0:
            return []
        
        timeline = []
        
        for i in range(num_frames):
            # Get data for this frame
            crack_data = crack_frames[i] if i < len(crack_frames) else {}
            depth_data = depth_frames[i] if i < len(depth_frames) else {}
            damage_data = damage_frames[i] if i < len(damage_frames) else {}
            
            # Extract metrics
            crack_density = crack_data.get('crack_density', 0.0)
            depth_mm = depth_data.get('max_depth_mm', 0.0)
            damage_types = damage_data.get('damage_types', [])
            
            # Calculate severity for this frame
            frame_severity = self.calculate_frame_severity(
                crack_density,
                depth_mm,
                damage_types
            )
            
            # Calculate rotation angle (assuming uniform distribution across 360°)
            rotation_angle = (i / num_frames) * 360.0
            
            timeline.append({
                'rotation_angle': rotation_angle,
                'severity': frame_severity['severity_score'],
                'crack_density_score': frame_severity['crack_density_score'],
                'depth_score': frame_severity['depth_score'],
                'damage_type_score': frame_severity['damage_type_score']
            })
        
        return timeline
    
    def get_recommended_action(self, severity_score: float) -> str:
        """
        Generate recommended action based on severity score.
        
        Rules:
        - Score > 80: Replace immediately
        - Score 50-80: Monitor for next stint
        - Score < 50: Safe for qualifying laps only
        
        Args:
            severity_score: Overall severity score (0-100)
            
        Returns:
            Recommended action string
        """
        if severity_score > 80:
            return 'replace-immediately'
        elif severity_score >= 50:
            return 'monitor-next-stint'
        else:
            return 'safe-qualifying-only'
    
    def calculate_overall_severity(
        self,
        crack_results: Dict[str, any],
        depth_results: Dict[str, any],
        damage_results: Dict[str, any]
    ) -> Dict[str, any]:
        """
        Calculate overall severity score and generate timeline.
        
        Args:
            crack_results: Crack detection analysis results
            depth_results: Depth estimation analysis results
            damage_results: Damage classification analysis results
            
        Returns:
            Dictionary containing severity analysis
        """
        print("Calculating severity score...")
        
        # Extract aggregate metrics
        avg_crack_density = crack_results.get('average_crack_density', 0.0)
        max_depth_mm = depth_results.get('max_depth_estimate_mm', 0.0)
        damage_types = damage_results.get('detected_damage_types', [])
        
        # Calculate overall severity score
        overall_severity = self.calculate_severity_score(
            avg_crack_density,
            max_depth_mm,
            damage_types
        )
        
        # Calculate component scores
        crack_score = self.normalize_crack_density(avg_crack_density) * 100.0
        depth_score = self.normalize_depth(max_depth_mm) * 100.0
        damage_type_score = self.calculate_damage_type_severity(damage_types) * 100.0
        
        # Generate severity timeline
        timeline = self.generate_severity_timeline(
            crack_results,
            depth_results,
            damage_results
        )
        
        # Calculate timeline statistics
        if timeline:
            timeline_severities = [point['severity'] for point in timeline]
            max_timeline_severity = max(timeline_severities)
            min_timeline_severity = min(timeline_severities)
            avg_timeline_severity = np.mean(timeline_severities)
        else:
            max_timeline_severity = overall_severity
            min_timeline_severity = overall_severity
            avg_timeline_severity = overall_severity
        
        # Generate recommended action
        recommended_action = self.get_recommended_action(overall_severity)
        
        # Compile results
        severity_analysis = {
            'overall_severity_score': float(overall_severity),
            'recommended_action': recommended_action,
            'component_scores': {
                'crack_density_score': float(crack_score),
                'depth_score': float(depth_score),
                'damage_type_score': float(damage_type_score)
            },
            'severity_timeline': timeline,
            'timeline_statistics': {
                'max_severity': float(max_timeline_severity),
                'min_severity': float(min_timeline_severity),
                'average_severity': float(avg_timeline_severity)
            },
            'input_metrics': {
                'average_crack_density': float(avg_crack_density),
                'max_depth_mm': float(max_depth_mm),
                'damage_types': damage_types
            }
        }
        
        # Save severity analysis results
        results_path = self.output_dir / "severity_analysis_results.json"
        with open(results_path, 'w') as f:
            json.dump(severity_analysis, f, indent=2)
        
        print(f"Severity calculation complete. Overall score: {overall_severity:.1f}/100")
        print(f"Recommended action: {recommended_action}")
        
        return severity_analysis


def calculate_severity_score(
    crack_results: Dict[str, any],
    depth_results: Dict[str, any],
    damage_results: Dict[str, any],
    output_dir: str
) -> Dict[str, any]:
    """
    Convenience function to calculate severity score and timeline.
    
    Args:
        crack_results: Crack detection analysis results
        depth_results: Depth estimation analysis results
        damage_results: Damage classification analysis results
        output_dir: Directory for output severity analysis
        
    Returns:
        Severity analysis results dictionary
    """
    calculator = SeverityCalculator(output_dir)
    return calculator.calculate_overall_severity(
        crack_results,
        depth_results,
        damage_results
    )
