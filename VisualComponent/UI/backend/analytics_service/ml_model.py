"""
ML model for tyre degradation prediction
Loads and runs Random Forest model for degradation forecasting
"""
import numpy as np
import pickle
from pathlib import Path
from typing import Dict, List, Any
import logging
import warnings

# Suppress sklearn version warnings when loading pickled models
warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')

logger = logging.getLogger(__name__)


class MLPredictor:
    """ML-based tyre degradation predictor"""
    
    # Compound encoding
    COMPOUND_ENCODING = {
        "SOFT": 0,
        "MEDIUM": 1,
        "HARD": 2,
        "INTERMEDIATE": 3,
        "WET": 4
    }
    
    def __init__(self, model_path: str = None):
        """
        Initialize ML predictor
        
        Args:
            model_path: Path to pickled model file (optional)
        """
        self.model = None
        self.label_encoder = None
        self.feature_cols = []
        self.fuel_effect_per_lap = 0.035
        self.model_version = "1.0.0"
        self.model_path = model_path
        
        if model_path and Path(model_path).exists():
            self._load_model(model_path)
        else:
            logger.warning("No model file provided or found. Predictions will use fallback method.")
    
    def _load_model(self, model_path: str):
        """
        Load pre-trained model from pickle file
        
        Args:
            model_path: Path to model file
        """
        try:
            with open(model_path, 'rb') as f:
                artifact = pickle.load(f)
            
            # Extract model and metadata from artifact
            if isinstance(artifact, dict):
                self.model = artifact.get('model')
                self.label_encoder = artifact.get('label_encoder')
                self.feature_cols = artifact.get('feature_cols', [])
                self.fuel_effect_per_lap = artifact.get('fuel_effect_per_lap', 0.035)
                logger.info(f"Model loaded from {model_path}")
                logger.info(f"Features: {len(self.feature_cols)}")
            else:
                # Legacy format - just the model
                self.model = artifact
                self.label_encoder = None
                self.feature_cols = []
                logger.info(f"Model loaded from {model_path} (legacy format)")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model = None
    
    def predict(self, stint_data: Dict[str, Any]) -> List[float]:
        """
        Generate degradation predictions for a stint
        
        Args:
            stint_data: Dictionary containing telemetry, degradation, and synthetic sensor data
        
        Returns:
            List of predicted degradation values (one per lap)
        """
        # Extract data
        laps = stint_data.get("laps", [])
        degradation_laps = stint_data.get("degradation", {}).get("laps", [])
        synthetic_sensors = stint_data.get("synthetic_sensors", [])
        compound = stint_data.get("compound", "MEDIUM")
        stint_number = stint_data.get("stint", 1)
        
        if not laps:
            raise ValueError("No laps data provided")
        
        # If model is available, use it
        if self.model is not None:
            predictions = self._predict_with_model(
                laps, degradation_laps, synthetic_sensors, compound, stint_number
            )
        else:
            # Fallback: Use enhanced degradation with slight smoothing
            predictions = self._predict_fallback(degradation_laps)
        
        # Ensure predictions are non-negative
        predictions = [max(0.0, pred) for pred in predictions]
        
        return predictions
    
    def _predict_with_model(
        self,
        laps: List[Dict[str, Any]],
        degradation_laps: List[Dict[str, Any]],
        synthetic_sensors: List[Dict[str, Any]],
        compound: str,
        stint_number: int
    ) -> List[float]:
        """
        Generate predictions using ML model
        
        Args:
            laps: Telemetry laps data
            degradation_laps: Degradation calculations
            synthetic_sensors: Synthetic sensor data
            compound: Tyre compound
            stint_number: Stint number
        
        Returns:
            List of predictions
        """
        # Encode compound
        compound_encoded = self.COMPOUND_ENCODING.get(compound.upper(), 1)
        
        predictions = []
        
        for i in range(len(laps)):
            lap_data = laps[i]
            deg_data = degradation_laps[i] if i < len(degradation_laps) else {}
            sensor_data = synthetic_sensors[i] if i < len(synthetic_sensors) else {}
            
            # Prepare feature vector
            features = self._prepare_features(
                lap_data, deg_data, sensor_data, compound_encoded, stint_number
            )
            
            # Make prediction
            try:
                prediction = self.model.predict([features])[0]
                predictions.append(float(prediction))
            except Exception as e:
                logger.warning(f"Prediction failed for lap {i}: {e}")
                # Fallback to enhanced degradation
                predictions.append(deg_data.get("enhanced_degradation", 0.0))
        
        return predictions
    
    def _prepare_features(
        self,
        lap_data: Dict[str, Any],
        deg_data: Dict[str, Any],
        sensor_data: Dict[str, Any],
        compound_encoded: int,
        stint_number: int
    ) -> List[float]:
        """
        Prepare feature vector for model input
        
        Args:
            lap_data: Lap telemetry data
            deg_data: Degradation data
            sensor_data: Synthetic sensor data
            compound_encoded: Encoded compound type
            stint_number: Stint number
        
        Returns:
            Feature vector matching the trained model's expected features
        """
        telemetry = lap_data.get("telemetry", {})
        tyre_life = lap_data.get("tyre_life", 1)
        
        # Create a feature map with all possible features
        feature_map = {
            'TyreLife': float(tyre_life),
            'CompoundEncoded': float(compound_encoded),
            'Stint': float(stint_number),
            'FuelCorrection': deg_data.get("fuel_correction", 0.0),
            
            # Telemetry features (matching training script naming)
            'Speed_Mean': telemetry.get("speed_mean", 0.0),
            'Speed_Max': telemetry.get("speed_max", 0.0),
            'Speed_Std': telemetry.get("speed_std", 0.0),
            'RPM_Mean': telemetry.get("rpm_mean", 0.0),
            'RPM_Max': telemetry.get("rpm_max", 0.0),
            'Throttle_Mean': telemetry.get("throttle_mean", 0.0),
            'Throttle_Max': telemetry.get("throttle_max", 0.0),
            'Throttle_Std': telemetry.get("throttle_std", 0.0),
            'nGear_Mean': telemetry.get("n_gear_mean", 0.0),
            'nGear_Max': telemetry.get("n_gear_max", 0.0),
            'Brake_Percent': telemetry.get("brake_percent", 0.0),
            'Brake_Count': telemetry.get("brake_count", 0.0),
            
            # Synthetic sensor features (matching training script naming)
            'TyreTemp_FL': sensor_data.get("tyre_temp_fl", 95.0),
            'TyreTemp_FR': sensor_data.get("tyre_temp_fr", 95.0),
            'TyreTemp_RL': sensor_data.get("tyre_temp_rl", 90.0),
            'TyreTemp_RR': sensor_data.get("tyre_temp_rr", 90.0),
            'TyrePressure_FL': sensor_data.get("tyre_pressure_fl", 21.5),
            'TyrePressure_FR': sensor_data.get("tyre_pressure_fr", 21.5),
            'TyrePressure_RL': sensor_data.get("tyre_pressure_rl", 21.5),
            'TyrePressure_RR': sensor_data.get("tyre_pressure_rr", 21.5),
            'BrakeTemp_FL': sensor_data.get("brake_temp_fl", 350.0),
            'BrakeTemp_FR': sensor_data.get("brake_temp_fr", 350.0),
            'BrakeTemp_RL': sensor_data.get("brake_temp_rl", 280.0),
            'BrakeTemp_RR': sensor_data.get("brake_temp_rr", 280.0),
            'ICE_Temperature': sensor_data.get("ice_temperature", 95.0),
            'Oil_Temp': sensor_data.get("oil_temp", 110.0),
            'Coolant_Temp': sensor_data.get("coolant_temp", 85.0),
            'MGUH_Temp': sensor_data.get("mguh_temp", 120.0),
            'MGUK_Temp': sensor_data.get("mguk_temp", 115.0),
            'ERS_Deployment_Ratio': sensor_data.get("ers_deployment_ratio", 0.5),
            'Battery_SOC': sensor_data.get("battery_soc", 50.0),
            'Sidepod_Temp_Left': sensor_data.get("sidepod_temp_left", 40.0),
            'Sidepod_Temp_Right': sensor_data.get("sidepod_temp_right", 40.0),
            'Floor_Temp': sensor_data.get("floor_temp", 45.0),
            'Brake_Duct_Temp': sensor_data.get("brake_duct_temp", 35.0),
            'Lateral_G_Load': sensor_data.get("lateral_g_load", 0.0),
            'Longitudinal_G_Load': sensor_data.get("longitudinal_g_load", 0.0),
            'Tyre_Wear_Index': sensor_data.get("tyre_wear_index", 0.0),
        }
        
        # If we have feature columns from the model, use them in order
        if self.feature_cols:
            features = [feature_map.get(col, 0.0) for col in self.feature_cols]
        else:
            # Fallback to basic features
            features = [
                feature_map['TyreLife'],
                feature_map['CompoundEncoded'],
                feature_map['Stint'],
                feature_map['Speed_Mean'],
                feature_map['Throttle_Mean'],
                feature_map['Brake_Percent'],
            ]
        
        return features
    
    def _predict_fallback(self, degradation_laps: List[Dict[str, Any]]) -> List[float]:
        """
        Fallback prediction method when model is unavailable
        Uses enhanced degradation with slight smoothing
        
        Args:
            degradation_laps: Degradation calculations
        
        Returns:
            List of predictions
        """
        if not degradation_laps:
            return []
        
        # Extract enhanced degradation values
        degradations = [lap.get("enhanced_degradation", 0.0) for lap in degradation_laps]
        
        # Apply simple moving average smoothing (window size 3)
        predictions = []
        for i in range(len(degradations)):
            if i == 0:
                predictions.append(degradations[i])
            elif i == 1:
                predictions.append((degradations[i-1] + degradations[i]) / 2)
            else:
                window = degradations[max(0, i-2):i+1]
                predictions.append(sum(window) / len(window))
        
        return predictions
    
    def get_model_version(self) -> str:
        """
        Get model version
        
        Returns:
            Model version string
        """
        return self.model_version
