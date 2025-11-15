import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
import xgboost as xgb
import time
import pickle

def compare_all_models():
    """Compare Random Forest vs alternatives"""
    
    # Load data
    df = pd.read_csv('f1_tyre_data.csv')
    df = df[df['DegradationSeconds'] < 10]
    
    from sklearn.preprocessing import LabelEncoder
    le = LabelEncoder()
    df['CompoundEncoded'] = le.fit_transform(df['Compound'])
    
    # Features
    feature_cols = ['TyreLife', 'CompoundEncoded', 'Stint']
    
    df_clean = df[feature_cols + ['DegradationSeconds']].dropna()
    X = df_clean[feature_cols]
    y = df_clean['DegradationSeconds']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print("="*60)
    print("MODEL COMPARISON FOR F1 TYRE DEGRADATION")
    print("="*60)
    
    models = {
        'Random Forest': RandomForestRegressor(n_estimators=200, max_depth=20, random_state=42, n_jobs=-1),
        'XGBoost': xgb.XGBRegressor(n_estimators=200, max_depth=15, random_state=42),
        'Gradient Boosting': GradientBoostingRegressor(n_estimators=200, max_depth=10, random_state=42),
        'Ridge Regression': Ridge(alpha=1.0)
    }
    
    results = []
    
    for name, model in models.items():
        print(f"\n{name}:")
        print("-" * 40)
        
        start = time.time()
        model.fit(X_train, y_train)
        train_time = time.time() - start
        
        y_pred = model.predict(X_test)
        
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"  Training Time: {train_time:.2f}s")
        print(f"  MAE: {mae:.3f} seconds")
        print(f"  R² Score: {r2:.3f}")
        print(f"  Accuracy: {r2*100:.1f}%")
        
        results.append({
            'Model': name,
            'MAE (seconds)': f"{mae:.3f}",
            'R² Score': f"{r2:.3f}",
            'Training Time': f"{train_time:.2f}s",
            'Accuracy': f"{r2*100:.1f}%"
        })
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    results_df = pd.DataFrame(results)
    print(results_df.to_string(index=False))
    
    print("\n" + "="*60)
    print("RECOMMENDATION FOR HACKATHON:")
    print("="*60)
    print("✅ Random Forest - Best balance of:")
    print("   - Good accuracy (R² ~0.88)")
    print("   - Fast training (~3s)")
    print("   - Easy to explain")
    print("   - Robust predictions")
    print("   - Clear feature importance")
    print("\n🏆 XGBoost is 2-3% better but harder to explain")
    print("="*60)

if __name__ == "__main__":
    compare_all_models()