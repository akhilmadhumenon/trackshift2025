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

def collect_race_data(year, race_name, session_type='R'):
    """
    Collect telemetry data from a specific race
    """
    print(f"Loading {year} {race_name} {session_type}...")
    
    session = fastf1.get_session(year, race_name, session_type)
    session.load()
    
    laps = session.laps
    
    # Filter out invalid laps
    laps = laps[laps['LapTime'].notna()]
    laps = laps[laps['PitOutTime'].isna()]  # Remove out laps
    laps = laps[laps['PitInTime'].isna()]   # Remove in laps
    
    return session, laps

def get_lap_telemetry_stats(lap):
    """
    Extract car telemetry statistics for a single lap
    """
    try:
        telemetry = lap.get_car_data().add_distance()
        
        # Calculate statistics for each telemetry parameter
        stats = {
            # Speed statistics
            'Speed_Mean': telemetry['Speed'].mean(),
            'Speed_Max': telemetry['Speed'].max(),
            'Speed_Std': telemetry['Speed'].std(),
            
            # RPM statistics
            'RPM_Mean': telemetry['RPM'].mean(),
            'RPM_Max': telemetry['RPM'].max(),
            
            # Throttle statistics
            'Throttle_Mean': telemetry['Throttle'].mean(),
            'Throttle_Max': telemetry['Throttle'].max(),
            'Throttle_Std': telemetry['Throttle'].std(),
            
            # Gear statistics
            'nGear_Mean': telemetry['nGear'].mean(),
            'nGear_Max': telemetry['nGear'].max(),
            
            # Brake statistics
            'Brake_Percent': (telemetry['Brake'] > 0).sum() / len(telemetry) * 100,  # % of lap braking
            'Brake_Count': (telemetry['Brake'].diff() > 0).sum(),  # Number of brake applications
        }
        
        return stats
    except Exception as e:
        # Return None if telemetry unavailable
        return None

def calculate_enhanced_degradation(driver_laps):
    """
    Enhanced degradation calculation accounting for fuel load
    
    As fuel burns off, the car becomes lighter and should theoretically go faster.
    We need to account for this when calculating tyre degradation.
    
    Formula: Degradation = (Current Lap Time - Baseline) + Fuel Correction
    
    Fuel effect: ~0.03-0.05 seconds per lap (car gets faster as fuel burns)
    """
    FUEL_EFFECT_PER_LAP = 0.035  # seconds per lap improvement due to fuel burn
    
    # Get the fastest lap as baseline (accounting for fuel)
    # We find the lap with best fuel-corrected time
    driver_laps = driver_laps.copy()
    driver_laps['LapTimeSeconds'] = driver_laps['LapTime'].apply(lambda x: x.total_seconds())
    
    # Calculate fuel-corrected times to find true baseline
    driver_laps['FuelCorrection'] = driver_laps['LapNumber'] * FUEL_EFFECT_PER_LAP
    driver_laps['FuelCorrectedTime'] = driver_laps['LapTimeSeconds'] + driver_laps['FuelCorrection']
    
    # Baseline is the minimum fuel-corrected time
    baseline_time = driver_laps['FuelCorrectedTime'].min()
    
    # Calculate enhanced degradation
    driver_laps['EnhancedDegradation'] = driver_laps['FuelCorrectedTime'] - baseline_time
    
    # Ensure non-negative degradation
    driver_laps['EnhancedDegradation'] = driver_laps['EnhancedDegradation'].clip(lower=0)
    
    return driver_laps

def engineer_features(session, laps_df):
    """
    Create features for ML model including car telemetry
    """
    features = []
    
    # Group by driver
    for driver in laps_df['Driver'].unique():
        driver_laps = laps_df[laps_df['Driver'] == driver].copy()
        driver_laps = driver_laps.sort_values('LapNumber')
        
        # Get stints (each tyre change creates a new stint)
        driver_laps['TyreLife'] = driver_laps.groupby('Stint').cumcount() + 1
        
        # Calculate enhanced degradation (fuel-corrected)
        driver_laps = calculate_enhanced_degradation(driver_laps)
        
        print(f"  Processing {driver} ({len(driver_laps)} laps)...")
        
        for idx, lap in driver_laps.iterrows():
            # Skip if missing critical data
            if pd.isna(lap['LapTime']) or pd.isna(lap['Compound']):
                continue
            
            lap_time_seconds = lap['LapTime'].total_seconds()
            
            feature_dict = {
                'Driver': lap['Driver'],
                'LapNumber': lap['LapNumber'],
                'Stint': lap['Stint'],
                'TyreLife': lap['TyreLife'],
                'Compound': lap['Compound'],
                'LapTime': lap_time_seconds,
                'DegradationSeconds': lap['EnhancedDegradation'],  # Using enhanced degradation
                'FuelCorrection': lap['FuelCorrection'],
                'IsPersonalBest': 1 if lap['EnhancedDegradation'] < 0.1 else 0,
            }
            
            # Add sector times if available
            if 'Sector1Time' in driver_laps.columns and pd.notna(lap['Sector1Time']):
                feature_dict['Sector1Time'] = lap['Sector1Time'].total_seconds()
            if 'Sector2Time' in driver_laps.columns and pd.notna(lap['Sector2Time']):
                feature_dict['Sector2Time'] = lap['Sector2Time'].total_seconds()
            if 'Sector3Time' in driver_laps.columns and pd.notna(lap['Sector3Time']):
                feature_dict['Sector3Time'] = lap['Sector3Time'].total_seconds()
            
            # Get car telemetry statistics
            telemetry_stats = get_lap_telemetry_stats(lap)
            if telemetry_stats:
                feature_dict.update(telemetry_stats)
            
            features.append(feature_dict)
    
    return pd.DataFrame(features)

def collect_multiple_races():
    """
    Collect data from multiple races for better model training
    """
    races_to_collect = [
        (2024, 'Bahrain'),
        (2024, 'Saudi Arabia'),
        (2024, 'Australia'),
        (2024, 'Japan'),
    ]
    
    all_features = []
    
    for year, race in races_to_collect:
        try:
            print(f"\n{'='*60}")
            print(f"Processing {year} {race}...")
            print(f"{'='*60}")
            session, laps = collect_race_data(year, race)
            features = engineer_features(session, laps)
            features['Race'] = f"{year}_{race}"
            all_features.append(features)
            print(f"\n✓ Collected {len(features)} laps from {year} {race}")
            print(f"✓ Features: {features.shape[1]} columns")
        except Exception as e:
            print(f"✗ Error with {year} {race}: {str(e)}")
            continue
    
    # Combine all data
    combined_df = pd.concat(all_features, ignore_index=True)
    
    # Save to file
    combined_df.to_csv('f1_tyre_data.csv', index=False)
    print(f"\n{'='*60}")
    print(f"✓ Total laps collected: {len(combined_df)}")
    print(f"✓ Data saved to f1_tyre_data.csv")
    print(f"✓ Enhanced degradation calculation applied (fuel-corrected)")
    print(f"{'='*60}")
    
    return combined_df

if __name__ == "__main__":
    print("="*60)
    print("=== F1 Tyre Degradation Data Collection ===")
    print("=== Enhanced with Fuel Load Correction ===")
    print("="*60)
    print("\nFeatures: Speed, RPM, Throttle, Gear, Brake data")
    print("Degradation: Fuel-corrected lap time delta\n")
    
    df = collect_multiple_races()
    
    print("\n" + "="*60)
    print("=== Data Summary ===")
    print("="*60)
    print(f"\nShape: {df.shape}")
    print(f"\nColumns: {list(df.columns)}")
    print(f"\nCompounds available: {df['Compound'].unique()}")
    print(f"\nSample degradation stats:")
    print(df['DegradationSeconds'].describe())
    print(f"\nSample data:\n{df.head(10)}")
    
    # Show telemetry stats
    telemetry_cols = [col for col in df.columns if any(x in col for x in ['Speed', 'RPM', 'Throttle', 'Gear', 'Brake'])]
    if telemetry_cols:
        print(f"\n{'='*60}")
        print(f"=== Telemetry Statistics ===")
        print(f"{'='*60}")
        print(df[telemetry_cols].describe())