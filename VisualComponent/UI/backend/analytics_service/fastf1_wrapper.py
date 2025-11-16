"""
FastF1 library wrapper for race data access
Handles session loading, lap data extraction, and telemetry processing
"""
import fastf1
import pandas as pd
from typing import Dict, List, Any
import logging
import warnings

# Suppress FastF1 telemetry merge warnings
warnings.filterwarnings('ignore', message='Failed to preserve data type.*while merging telemetry')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FastF1Wrapper:
    """Wrapper for FastF1 library functionality"""
    
    # Supported races for each year
    RACES = {
        2023: [
            "Bahrain", "Saudi Arabia", "Australia", "Japan", 
            "Monaco", "Spain", "Canada"
        ],
        2024: [
            "Bahrain", "Saudi Arabia", "Australia", "Japan",
            "Monaco", "Spain", "Canada"
        ]
    }
    
    def __init__(self, cache_dir: str):
        """
        Initialize FastF1 wrapper
        
        Args:
            cache_dir: Directory for FastF1 cache
        """
        self.cache_dir = cache_dir
        fastf1.Cache.enable_cache(cache_dir)
        logger.info(f"FastF1 cache enabled at: {cache_dir}")
    
    def get_available_races(self, year: int) -> List[Dict[str, Any]]:
        """
        Get list of available races for a year
        
        Args:
            year: Season year
        
        Returns:
            List of race dictionaries with name and metadata
        """
        if year not in self.RACES:
            raise ValueError(f"Year {year} not supported. Supported years: {list(self.RACES.keys())}")
        
        races = []
        for race_name in self.RACES[year]:
            races.append({
                "name": race_name,
                "year": year,
                "round": self.RACES[year].index(race_name) + 1
            })
        
        return races
    
    def load_race_data(self, year: int, race: str) -> Dict[str, Any]:
        """
        Load race session and extract driver/lap information
        
        Args:
            year: Season year
            race: Race name
        
        Returns:
            Dictionary with session data, drivers, and laps
        """
        if year not in self.RACES:
            raise ValueError(f"Year {year} not supported")
        
        if race not in self.RACES[year]:
            raise ValueError(f"Race '{race}' not found for {year}. Available: {self.RACES[year]}")
        
        logger.info(f"Loading race data: {year} {race}")
        
        try:
            # Load race session
            session = fastf1.get_session(year, race, 'R')
            session.load()
            
            # Extract drivers and their stints
            drivers = []
            stints = {}
            
            for driver_abbr in session.drivers:
                driver_info = session.get_driver(driver_abbr)
                drivers.append({
                    "abbreviation": driver_abbr,
                    "full_name": driver_info.get("FullName", driver_abbr),
                    "team": driver_info.get("TeamName", "Unknown")
                })
                
                # Get unique stints for this driver
                driver_laps = session.laps.pick_driver(driver_abbr)
                if not driver_laps.empty:
                    unique_stints = sorted(driver_laps['Stint'].dropna().unique().astype(int).tolist())
                    stints[driver_abbr] = unique_stints
                else:
                    stints[driver_abbr] = []
            
            # Get lap count
            laps = session.laps
            total_laps = len(laps) if laps is not None else 0
            
            logger.info(f"Loaded {len(drivers)} drivers, {total_laps} total laps")
            
            return {
                "year": year,
                "race": race,
                "drivers": drivers,
                "stints": stints,
                "total_laps": total_laps,
                "session_loaded": True
            }
        
        except Exception as e:
            logger.error(f"Failed to load race data: {e}")
            raise
    
    def extract_telemetry(self, year: int, race: str, driver: str, stint: int) -> Dict[str, Any]:
        """
        Extract telemetry statistics for a specific driver stint
        
        Args:
            year: Season year
            race: Race name
            driver: Driver abbreviation
            stint: Stint number
        
        Returns:
            Dictionary with stint metadata and lap-by-lap telemetry
        """
        logger.info(f"Extracting telemetry: {year} {race} - {driver} stint {stint}")
        
        try:
            # Load session
            session = fastf1.get_session(year, race, 'R')
            session.load()
            
            # Get driver laps
            driver_laps = session.laps.pick_driver(driver)
            
            if driver_laps.empty:
                raise ValueError(f"No laps found for driver {driver}")
            
            # Filter by stint
            stint_laps = driver_laps[driver_laps['Stint'] == stint]
            
            if stint_laps.empty:
                raise ValueError(f"No laps found for driver {driver} in stint {stint}")
            
            # Get compound
            compound = stint_laps.iloc[0]['Compound']
            
            # Extract lap-by-lap data
            laps_data = []
            for idx, lap in stint_laps.iterrows():
                lap_number = int(lap['LapNumber'])
                tyre_life = int(lap['TyreLife'])
                lap_time = lap['LapTime'].total_seconds() if pd.notna(lap['LapTime']) else None
                
                # Skip invalid laps
                if lap_time is None or lap_time <= 0:
                    continue
                
                # Get telemetry for this lap
                try:
                    telemetry = lap.get_telemetry()
                    
                    if telemetry is not None and not telemetry.empty:
                        telemetry_stats = {
                            "speed_mean": float(telemetry['Speed'].mean()) if 'Speed' in telemetry else 0.0,
                            "speed_max": float(telemetry['Speed'].max()) if 'Speed' in telemetry else 0.0,
                            "speed_std": float(telemetry['Speed'].std()) if 'Speed' in telemetry else 0.0,
                            "rpm_mean": float(telemetry['RPM'].mean()) if 'RPM' in telemetry else 0.0,
                            "rpm_max": float(telemetry['RPM'].max()) if 'RPM' in telemetry else 0.0,
                            "throttle_mean": float(telemetry['Throttle'].mean()) if 'Throttle' in telemetry else 0.0,
                            "throttle_max": float(telemetry['Throttle'].max()) if 'Throttle' in telemetry else 0.0,
                            "throttle_std": float(telemetry['Throttle'].std()) if 'Throttle' in telemetry else 0.0,
                            "n_gear_mean": float(telemetry['nGear'].mean()) if 'nGear' in telemetry else 0.0,
                            "n_gear_max": float(telemetry['nGear'].max()) if 'nGear' in telemetry else 0.0,
                            "brake_percent": float((telemetry['Brake'] > 0).sum() / len(telemetry) * 100) if 'Brake' in telemetry else 0.0,
                            "brake_count": int((telemetry['Brake'] > 0).sum()) if 'Brake' in telemetry else 0
                        }
                    else:
                        telemetry_stats = self._get_default_telemetry()
                
                except Exception as e:
                    logger.warning(f"Failed to get telemetry for lap {lap_number}: {e}")
                    telemetry_stats = self._get_default_telemetry()
                
                laps_data.append({
                    "lap_number": lap_number,
                    "tyre_life": tyre_life,
                    "lap_time": lap_time,
                    "telemetry": telemetry_stats
                })
            
            logger.info(f"Extracted {len(laps_data)} laps for stint {stint}")
            
            return {
                "driver": driver,
                "stint": stint,
                "compound": compound,
                "laps": laps_data
            }
        
        except Exception as e:
            logger.error(f"Failed to extract telemetry: {e}")
            raise
    
    def _get_default_telemetry(self) -> Dict[str, float]:
        """Return default telemetry values when data is unavailable"""
        return {
            "speed_mean": 0.0,
            "speed_max": 0.0,
            "speed_std": 0.0,
            "rpm_mean": 0.0,
            "rpm_max": 0.0,
            "throttle_mean": 0.0,
            "throttle_max": 0.0,
            "throttle_std": 0.0,
            "n_gear_mean": 0.0,
            "n_gear_max": 0.0,
            "brake_percent": 0.0,
            "brake_count": 0
        }
