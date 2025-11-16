"""
Synthetic F1 sensor data generator
Generates realistic sensor data based on telemetry patterns
"""
import numpy as np
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


class SyntheticSensorGenerator:
    """Generate synthetic F1 sensor data from telemetry"""
    
    def __init__(self):
        """Initialize synthetic sensor generator"""
        self.base_temps = {
            "tyre_fl": 95.0,
            "tyre_fr": 95.0,
            "tyre_rl": 90.0,
            "tyre_rr": 90.0,
            "brake_fl": 350.0,
            "brake_fr": 350.0,
            "brake_rl": 280.0,
            "brake_rr": 280.0,
            "ice": 95.0,
            "oil": 110.0,
            "coolant": 85.0,
            "mguh": 120.0,
            "mguk": 115.0
        }
    
    def generate_sensors(self, telemetry_data: Dict[str, Any], degradation_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate synthetic sensor data for each lap
        
        Args:
            telemetry_data: Telemetry data from FastF1
            degradation_data: Degradation calculations
        
        Returns:
            List of synthetic sensor readings per lap
        """
        laps = telemetry_data.get("laps", [])
        degradation_laps = degradation_data.get("laps", [])
        
        synthetic_data = []
        
        for i, lap_data in enumerate(laps):
            telemetry = lap_data.get("telemetry", {})
            tyre_life = lap_data.get("tyre_life", 1)
            
            # Get degradation for this lap if available
            degradation = 0.0
            if i < len(degradation_laps):
                degradation = degradation_laps[i].get("enhanced_degradation", 0.0)
            
            # Generate sensor data
            sensors = self._generate_lap_sensors(telemetry, tyre_life, degradation)
            
            synthetic_data.append({
                "lap_number": lap_data.get("lap_number"),
                "tyre_life": tyre_life,
                **sensors
            })
        
        return synthetic_data
    
    def _generate_lap_sensors(self, telemetry: Dict[str, float], tyre_life: int, degradation: float) -> Dict[str, float]:
        """
        Generate sensor readings for a single lap
        
        Args:
            telemetry: Telemetry statistics
            tyre_life: Current tyre life in laps
            degradation: Current degradation value
        
        Returns:
            Dictionary of synthetic sensor values
        """
        # Extract telemetry values
        speed_mean = telemetry.get("speed_mean", 200.0)
        throttle_mean = telemetry.get("throttle_mean", 50.0)
        brake_percent = telemetry.get("brake_percent", 15.0)
        rpm_mean = telemetry.get("rpm_mean", 11000.0)
        
        # Tyre temperatures (increase with tyre life and speed)
        tyre_temp_base = 95.0 + (tyre_life * 0.5) + (speed_mean / 10.0)
        tyre_temp_variation = np.random.normal(0, 3.0)
        
        tyre_temp_fl = max(70.0, min(120.0, tyre_temp_base + tyre_temp_variation + 2.0))
        tyre_temp_fr = max(70.0, min(120.0, tyre_temp_base + tyre_temp_variation + 1.5))
        tyre_temp_rl = max(70.0, min(120.0, tyre_temp_base + tyre_temp_variation - 3.0))
        tyre_temp_rr = max(70.0, min(120.0, tyre_temp_base + tyre_temp_variation - 2.5))
        
        # Tyre pressures (slight increase with temperature)
        pressure_base = 21.5 + (tyre_temp_base - 95.0) * 0.02
        tyre_pressure_fl = max(20.0, min(24.0, pressure_base + np.random.normal(0, 0.2)))
        tyre_pressure_fr = max(20.0, min(24.0, pressure_base + np.random.normal(0, 0.2)))
        tyre_pressure_rl = max(20.0, min(24.0, pressure_base + np.random.normal(0, 0.2)))
        tyre_pressure_rr = max(20.0, min(24.0, pressure_base + np.random.normal(0, 0.2)))
        
        # Brake temperatures (based on braking intensity)
        brake_temp_base = 300.0 + (brake_percent * 5.0)
        brake_temp_fl = max(200.0, min(800.0, brake_temp_base + np.random.normal(0, 20.0) + 50.0))
        brake_temp_fr = max(200.0, min(800.0, brake_temp_base + np.random.normal(0, 20.0) + 45.0))
        brake_temp_rl = max(200.0, min(800.0, brake_temp_base + np.random.normal(0, 20.0) - 30.0))
        brake_temp_rr = max(200.0, min(800.0, brake_temp_base + np.random.normal(0, 20.0) - 35.0))
        
        # Power unit temperatures (based on RPM and throttle)
        ice_temp = max(80.0, min(110.0, 90.0 + (rpm_mean / 1000.0) + (throttle_mean / 10.0) + np.random.normal(0, 2.0)))
        oil_temp = max(90.0, min(140.0, 105.0 + (rpm_mean / 800.0) + (throttle_mean / 8.0) + np.random.normal(0, 3.0)))
        coolant_temp = max(70.0, min(100.0, 82.0 + (rpm_mean / 1200.0) + (throttle_mean / 12.0) + np.random.normal(0, 2.0)))
        mguh_temp = max(100.0, min(150.0, 115.0 + (rpm_mean / 900.0) + np.random.normal(0, 4.0)))
        mguk_temp = max(95.0, min(145.0, 110.0 + (throttle_mean / 5.0) + np.random.normal(0, 3.5)))
        
        # ERS data (deployment ratio and battery SOC)
        ers_deployment_ratio = max(0.0, min(1.0, (throttle_mean / 100.0) * 0.7 + np.random.normal(0, 0.1)))
        battery_soc = max(0.0, min(100.0, 50.0 + np.random.normal(0, 15.0)))
        
        # Additional sensors
        sidepod_temp_left = max(30.0, min(60.0, 40.0 + (speed_mean / 15.0) + np.random.normal(0, 2.0)))
        sidepod_temp_right = max(30.0, min(60.0, 40.0 + (speed_mean / 15.0) + np.random.normal(0, 2.0)))
        floor_temp = max(35.0, min(70.0, 45.0 + (speed_mean / 12.0) + np.random.normal(0, 2.5)))
        brake_duct_temp = max(25.0, min(55.0, 35.0 + (brake_percent * 0.5) + np.random.normal(0, 2.0)))
        
        # G-loads (simplified based on speed and braking)
        lateral_g_load = max(-5.0, min(5.0, (speed_mean / 100.0) + np.random.normal(0, 0.5)))
        longitudinal_g_load = max(-5.0, min(5.0, (brake_percent / 20.0) - (throttle_mean / 50.0) + np.random.normal(0, 0.3)))
        
        # Tyre wear index (increases with tyre life and degradation)
        tyre_wear_index = min(100.0, (tyre_life * 2.0) + (degradation * 10.0) + np.random.normal(0, 3.0))
        
        return {
            "tyre_temp_fl": round(tyre_temp_fl, 2),
            "tyre_temp_fr": round(tyre_temp_fr, 2),
            "tyre_temp_rl": round(tyre_temp_rl, 2),
            "tyre_temp_rr": round(tyre_temp_rr, 2),
            "tyre_pressure_fl": round(tyre_pressure_fl, 2),
            "tyre_pressure_fr": round(tyre_pressure_fr, 2),
            "tyre_pressure_rl": round(tyre_pressure_rl, 2),
            "tyre_pressure_rr": round(tyre_pressure_rr, 2),
            "brake_temp_fl": round(brake_temp_fl, 2),
            "brake_temp_fr": round(brake_temp_fr, 2),
            "brake_temp_rl": round(brake_temp_rl, 2),
            "brake_temp_rr": round(brake_temp_rr, 2),
            "ice_temperature": round(ice_temp, 2),
            "oil_temp": round(oil_temp, 2),
            "coolant_temp": round(coolant_temp, 2),
            "mguh_temp": round(mguh_temp, 2),
            "mguk_temp": round(mguk_temp, 2),
            "ers_deployment_ratio": round(ers_deployment_ratio, 3),
            "battery_soc": round(battery_soc, 2),
            "sidepod_temp_left": round(sidepod_temp_left, 2),
            "sidepod_temp_right": round(sidepod_temp_right, 2),
            "floor_temp": round(floor_temp, 2),
            "brake_duct_temp": round(brake_duct_temp, 2),
            "lateral_g_load": round(lateral_g_load, 2),
            "longitudinal_g_load": round(longitudinal_g_load, 2),
            "tyre_wear_index": round(tyre_wear_index, 2)
        }
