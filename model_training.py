import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import pickle
import matplotlib.pyplot as plt

def load_and_prepare_data(filepath='f1_tyre_data.csv'):
    """
    Load and prepare data for modeling
    """
    df = pd.read_csv(filepath)
    
    print(f"Original data: {len(df)} laps")
    
    # Remove outliers (degradation > 10 seconds is likely anomaly)
    df = df[df['DegradationSeconds'] < 10]
    df = df[df['DegradationSeconds'] >= 0]
    
    print(f"After filtering: {len(df)} laps")
    
    # Encode compound type
    le = LabelEncoder()
    df['CompoundEncoded'] = le.fit_transform(df['Compound'])
    
    print(f"Compounds: {dict(zip(le.classes_, le.transform(le.classes_)))}")
    
    return df, le

def train_degradation_model(df):
    """
    Train ML model to predict tyre degradation with car telemetry
    """
    # Base features
    feature_cols = ['TyreLife', 'CompoundEncoded', 'Stint']
    
    # Add sector times if available
    if 'Sector1Time' in df.columns:
        feature_cols.extend(['Sector1Time', 'Sector2Time', 'Sector3Time'])
    
    # Add fuel correction as a feature
    if 'FuelCorrection' in df.columns:
        feature_cols.append('FuelCorrection')
    
    # Add car telemetry features if available
    telemetry_features = [
        'Speed_Mean', 'Speed_Max', 'Speed_Std',
        'RPM_Mean', 'RPM_Max',
        'Throttle_Mean', 'Throttle_Max', 'Throttle_Std',
        'nGear_Mean', 'nGear_Max',
        'Brake_Percent', 'Brake_Count'
    ]
    
    available_telemetry = [f for f in telemetry_features if f in df.columns]
    if available_telemetry:
        feature_cols.extend(available_telemetry)
        print(f"\n✓ Using {len(available_telemetry)} telemetry features:")
        for f in available_telemetry:
            print(f"  - {f}")
    
    # Remove rows with missing values
    df_clean = df[feature_cols + ['DegradationSeconds']].dropna()
    
    print(f"\n✓ Training data: {len(df_clean)} laps with {len(feature_cols)} features")
    print(f"✓ Degradation range: {df_clean['DegradationSeconds'].min():.3f}s to {df_clean['DegradationSeconds'].max():.3f}s")
    
    X = df_clean[feature_cols]
    y = df_clean['DegradationSeconds']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train Random Forest with enhanced parameters
    print("\nTraining Random Forest model...")
    rf_model = RandomForestRegressor(
        n_estimators=200,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
        verbose=0
    )
    rf_model.fit(X_train, y_train)
    
    # Evaluate
    y_pred_train = rf_model.predict(X_train)
    y_pred_test = rf_model.predict(X_test)
    
    train_mae = mean_absolute_error(y_train, y_pred_train)
    train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
    train_r2 = r2_score(y_train, y_pred_train)
    
    test_mae = mean_absolute_error(y_test, y_pred_test)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
    test_r2 = r2_score(y_test, y_pred_test)
    
    print(f"\n{'='*60}")
    print(f"=== Model Performance (Enhanced Degradation) ===")
    print(f"{'='*60}")
    print(f"\nTraining Set:")
    print(f"  MAE:  {train_mae:.3f} seconds")
    print(f"  RMSE: {train_rmse:.3f} seconds")
    print(f"  R²:   {train_r2:.3f}")
    print(f"\nTest Set:")
    print(f"  MAE:  {test_mae:.3f} seconds")
    print(f"  RMSE: {test_rmse:.3f} seconds")
    print(f"  R²:   {test_r2:.3f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'Feature': feature_cols,
        'Importance': rf_model.feature_importances_
    }).sort_values('Importance', ascending=False)
    
    print(f"\n{'='*60}")
    print(f"=== Top 15 Feature Importance ===")
    print(f"{'='*60}")
    print(feature_importance.head(15).to_string(index=False))
    
    # Group telemetry importance
    if available_telemetry:
        telemetry_importance = feature_importance[feature_importance['Feature'].isin(available_telemetry)]
        total_telemetry_importance = telemetry_importance['Importance'].sum()
        print(f"\n✓ Total telemetry features importance: {total_telemetry_importance:.1%}")
        print(f"✓ TyreLife importance: {feature_importance[feature_importance['Feature']=='TyreLife']['Importance'].values[0]:.1%}")
    
    return rf_model, feature_cols

def save_model(model, label_encoder, feature_cols):
    """
    Save trained model and artifacts
    """
    model_artifacts = {
        'model': model,
        'label_encoder': label_encoder,
        'feature_cols': feature_cols,
        'fuel_effect_per_lap': 0.035  # Store fuel correction constant
    }
    
    with open('tyre_degradation_model.pkl', 'wb') as f:
        pickle.dump(model_artifacts, f)
    
    print(f"\n{'='*60}")
    print("✓ Model saved to tyre_degradation_model.pkl")
    print("✓ Includes fuel correction constant (0.035s/lap)")
    print(f"{'='*60}")

if __name__ == "__main__":
    print("="*60)
    print("=== F1 Tyre Degradation Model Training ===")
    print("=== Enhanced with Fuel Load Correction ===")
    print("="*60)
    
    # Load data
    print("\nLoading data...")
    df, le = load_and_prepare_data()
    print(f"✓ Loaded {len(df)} laps")
    
    # Show available features
    print(f"\nAvailable columns: {df.shape[1]}")
    telemetry_cols = [col for col in df.columns if any(x in col for x in ['Speed', 'RPM', 'Throttle', 'Gear', 'Brake'])]
    if telemetry_cols:
        print(f"✓ Found {len(telemetry_cols)} telemetry features")
    
    # Train model
    model, feature_cols = train_degradation_model(df)
    
    # Save model
    save_model(model, le, feature_cols)
    
    print("\n" + "="*60)
    print("✓ Training complete!")
    print("="*60)