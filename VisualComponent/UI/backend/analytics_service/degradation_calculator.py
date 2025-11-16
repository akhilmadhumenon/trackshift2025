"""
Tyre degradation calculator with fuel correction
Implements fuel-corrected degradation analysis
"""
import numpy as np
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


class DegradationCalculator:
    """Calculate tyre degradation with fuel correction"""
    
    # Fuel correction constant (seconds per lap)
    FUEL_CORRECTION_PER_LAP = 0.035
    
    def __init__(self):
        """Initialize degradation calculator"""
        pass
    
    def calculate_degradation(self, telemetry_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate fuel-corrected degradation for a stint
        
        Args:
            telemetry_data: Telemetry data with laps
        
        Returns:
            Dictionary with degradation analysis
        """
        laps = telemetry_data.get("laps", [])
        
        if not laps:
            raise ValueError("No laps data provided")
        
        # Calculate degradation for each lap
        degradation_laps = []
        lap_times = []
        
        for lap_data in laps:
            lap_time = lap_data.get("lap_time")
            tyre_life = lap_data.get("tyre_life", 1)
            
            if lap_time is None or lap_time <= 0:
                continue
            
            lap_times.append(lap_time)
            
            # Calculate fuel correction
            fuel_correction = self._calculate_fuel_correction(tyre_life)
            
            # Calculate fuel-corrected lap time
            fuel_corrected_time = lap_time + fuel_correction
            
            # Calculate simple degradation (without fuel correction)
            simple_degradation = 0.0  # Will be calculated after baseline
            
            degradation_laps.append({
                "lap_number": lap_data.get("lap_number"),
                "tyre_life": tyre_life,
                "lap_time": lap_time,
                "fuel_correction": fuel_correction,
                "fuel_corrected_time": fuel_corrected_time,
                "simple_degradation": simple_degradation,
                "enhanced_degradation": 0.0  # Will be calculated after baseline
            })
        
        if not degradation_laps:
            raise ValueError("No valid laps for degradation calculation")
        
        # Determine baseline time (minimum fuel-corrected lap time)
        fuel_corrected_times = [lap["fuel_corrected_time"] for lap in degradation_laps]
        baseline_time = min(fuel_corrected_times)
        
        # Determine simple baseline (minimum raw lap time)
        simple_baseline = min(lap_times)
        
        # Calculate enhanced degradation (fuel-corrected)
        for lap in degradation_laps:
            # Enhanced degradation: Fuel-Corrected Time - Baseline Time
            enhanced_deg = lap["fuel_corrected_time"] - baseline_time
            # Clip to non-negative
            lap["enhanced_degradation"] = max(0.0, enhanced_deg)
            
            # Simple degradation: Raw Time - Simple Baseline
            simple_deg = lap["lap_time"] - simple_baseline
            lap["simple_degradation"] = max(0.0, simple_deg)
        
        # Calculate metrics
        metrics = self._calculate_metrics(degradation_laps, telemetry_data)
        
        return {
            "laps": degradation_laps,
            "baseline_time": baseline_time,
            "simple_baseline": simple_baseline,
            "metrics": metrics
        }
    
    def _calculate_fuel_correction(self, tyre_life: int) -> float:
        """
        Calculate fuel correction for a given tyre life
        
        Formula: Lap Number × 0.035 seconds
        
        Args:
            tyre_life: Current tyre life (lap number on this set)
        
        Returns:
            Fuel correction in seconds
        """
        return tyre_life * self.FUEL_CORRECTION_PER_LAP
    
    def _calculate_metrics(self, degradation_laps: List[Dict[str, Any]], telemetry_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate stint metrics
        
        Args:
            degradation_laps: List of laps with degradation data
            telemetry_data: Original telemetry data
        
        Returns:
            Dictionary of stint metrics
        """
        if not degradation_laps:
            return {}
        
        # Extract degradation values
        enhanced_degradations = [lap["enhanced_degradation"] for lap in degradation_laps]
        simple_degradations = [lap["simple_degradation"] for lap in degradation_laps]
        fuel_corrections = [lap["fuel_correction"] for lap in degradation_laps]
        
        # Calculate average degradation
        avg_enhanced_degradation = np.mean(enhanced_degradations)
        avg_simple_degradation = np.mean(simple_degradations)
        
        # Calculate max degradation
        max_enhanced_degradation = max(enhanced_degradations)
        max_simple_degradation = max(simple_degradations)
        
        # Total fuel effect (correction at final lap)
        total_fuel_effect = fuel_corrections[-1] if fuel_corrections else 0.0
        
        # Calculate optimal pit lap (when degradation exceeds 2.0s threshold)
        optimal_pit_lap = self._calculate_optimal_pit_lap(degradation_laps)
        
        # Stint length
        stint_length = len(degradation_laps)
        
        # Compound
        compound = telemetry_data.get("compound", "UNKNOWN")
        
        return {
            "compound": compound,
            "stint_length": stint_length,
            "avg_enhanced_degradation": round(avg_enhanced_degradation, 3),
            "avg_simple_degradation": round(avg_simple_degradation, 3),
            "max_enhanced_degradation": round(max_enhanced_degradation, 3),
            "max_simple_degradation": round(max_simple_degradation, 3),
            "total_fuel_effect": round(total_fuel_effect, 3),
            "optimal_pit_lap": optimal_pit_lap
        }
    
    def _calculate_optimal_pit_lap(self, degradation_laps: List[Dict[str, Any]], threshold: float = 2.0) -> int:
        """
        Calculate optimal pit lap based on degradation threshold
        
        Args:
            degradation_laps: List of laps with degradation data
            threshold: Degradation threshold in seconds (default: 2.0)
        
        Returns:
            Lap number when degradation exceeds threshold, or last lap if never exceeded
        """
        for lap in degradation_laps:
            if lap["enhanced_degradation"] >= threshold:
                return lap["lap_number"]
        
        # If threshold never exceeded, return last lap + 1
        return degradation_laps[-1]["lap_number"] + 1 if degradation_laps else 1
