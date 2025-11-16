"""
F1 Tyre Degradation Data Collection Script
Collects telemetry data from multiple races with synthetic sensor data
Enhanced with fuel load correction
"""
import fastf1
import pandas as pd
import numpy as np
from datetime import datetime
import pickle
import os

# Create cache directory if it doesn't exist
if not os.path.exists('cache'):
    os.makedirs('cache')

# Enable cache for faster loading
fastf1.Cache.enable_cache('cache')

# ===============================================================
# SYNTHETIC DATA GENERATOR FOR F1 SENSOR DATA
# ===============================================================
def generate_synthetic_f1_sensors(telemetry, compound):
    """Generates realistic synthetic F1 sensor data based on telemetry stats."""
    speed_mean = telemetry['Speed'].mean()
    brake_ratio = (telemetry['Brake'] > 0).sum() / len(telemetry)
    
    # Tyre temperature ranges by compound
    compound_temp_base = {
        'SOFT': 102,
        'MEDIUM': 97,
        'HARD': 92,
        'INTERMEDIATE': 80,
        'WET': 65
    }
    base_temp = compound_temp_base.get(compound.upper(), 95)
    
    # Generate temps with random fluctuation + correlation on speed/braking
    tyre_temps = {
        f"TyreTemp_{pos}": np.random.normal(base_temp + speed_mean*0.05 + brake_ratio*30, 2)
        for pos in ['FL','FR','RL','RR']
    }
    
    tyre_pressure_base = 23.0  # psi baseline
    tyre_pressures = {
        f"TyrePressure_{pos}": np.random.normal(tyre_pressure_base + (tyre_temps[f'TyreTemp_{pos}'] - 90)*0.02, 0.1)
        for pos in ['FL','FR','RL','RR']
  