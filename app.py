import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pickle
import fastf1
import os
import urllib.request
import gdown

# Create cache directory
if not os.path.exists('cache'):
    os.makedirs('cache')

# Enable cache
fastf1.Cache.enable_cache('cache')

# Page config
st.set_page_config(
    page_title="F1 Tyre Degradation Predictor",
    page_icon="🏎️",
    layout="wide"
)

# Constants
FUEL_EFFECT_PER_LAP = 0.035

# Your model URL
MODEL_URL = "https://drive.google.com/uc?export=download&id=11K7NQgec0tvEwZYX6ERf2A9tSHhV9Ot8"

@st.cache_resource
def download_and_load_model():
    """Download model if not present and load it"""
    model_path = 'tyre_degradation_model.pkl'
    
    if not os.path.exists(model_path):
        try:
            with st.spinner("📥 Downloading model (first time only, ~30 seconds)..."):
                # Use gdown for Google Drive downloads
                file_id = "1cwG60nPzBxZCfYdo1fxUCpZV09M_nlkN"
                gdown.download(f"https://drive.google.com/uc?id={file_id}", model_path, quiet=False)
                # st.success("✓ Model downloaded successfully!")
        except Exception as e:
            st.error(f"❌ Error downloading model: {e}")
            st.info("💡 Please check if the Google Drive link is publicly accessible")
            st.stop()
    
    try:
        with open(model_path, 'rb') as f:
            artifacts = pickle.load(f)
        
        return (artifacts['model'], 
                artifacts['label_encoder'], 
                artifacts['feature_cols'],
                artifacts.get('fuel_effect_per_lap', 0.035))
    except Exception as e:
        st.error(f"❌ Error loading model: {e}")
        st.stop()

# Rest of your functions remain the same...
@st.cache_data
def load_race_data(year, race_name):
    """Load race session data"""
    session = fastf1.get_session(year, race_name, 'R')
    session.load()
    return session, session.laps

def generate_synthetic_f1_sensors(telemetry, compound):
    """
    Generates realistic synthetic F1 sensor data based on telemetry stats.
    """
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
    }

    # Brake temperatures (very strongly correlated with braking)
    brake_temps = {
        f"BrakeTemp_{pos}": np.random.normal(350 + brake_ratio*900, 25)
        for pos in ['FL','FR','RL','RR']
    }

    # Power unit thermals
    engine_temp = np.random.normal(128 + speed_mean*0.02, 1.5)
    oil_temp = engine_temp + np.random.normal(18, 2)
    coolant_temp = engine_temp - np.random.normal(10, 1)

    # ERS
    ers_deploy = np.random.uniform(0.4, 0.95)
    battery_soc = np.random.normal(65 - ers_deploy*30 + brake_ratio*20, 3)
    
    # MGU temperatures
    mguh_temp = np.random.normal(165 + speed_mean*0.03, 3)
    mguk_temp = np.random.normal(155 + brake_ratio*80, 3)

    # Thermal camera synthetic values
    thermal_data = {
        'Sidepod_Temp_Left': np.random.normal(95 + speed_mean*0.02, 2),
        'Sidepod_Temp_Right': np.random.normal(96 + speed_mean*0.02, 2),
        'Floor_Temp': np.random.normal(85 + speed_mean*0.015, 2),
        'Brake_Duct_Temp': np.random.normal(150 + brake_ratio*300, 3),
    }

    # G Loads
    g_loads = {
        'Lateral_G_Load': np.random.normal(speed_mean * 0.012, 0.1),
        'Longitudinal_G_Load': np.random.normal(brake_ratio * 3.5, 0.1),
    }

    # Tyre wear estimation (very rough model)
    tyre_wear = np.clip(np.random.normal(brake_ratio*20 + speed_mean*0.1, 1), 0, 100)

    return {
        **tyre_temps,
        **tyre_pressures,
        **brake_temps,
        'ICE_Temperature': engine_temp,
        'Oil_Temp': oil_temp,
        'Coolant_Temp': coolant_temp,
        'MGUH_Temp': mguh_temp,
        'MGUK_Temp': mguk_temp,
        'ERS_Deployment_Ratio': ers_deploy,
        'Battery_SOC': battery_soc,
        **thermal_data,
        **g_loads,
        'Tyre_Wear_Index': tyre_wear
    }

def get_lap_telemetry_stats(lap):
    """Extract telemetry + synthetic F1 sensor statistics for prediction"""
    try:
        telemetry = lap.get_car_data().add_distance()

        base_stats = {
            'Speed_Mean': telemetry['Speed'].mean(),
            'Speed_Max': telemetry['Speed'].max(),
            'Speed_Std': telemetry['Speed'].std(),
            'RPM_Mean': telemetry['RPM'].mean(),
            'RPM_Max': telemetry['RPM'].max(),
            'Throttle_Mean': telemetry['Throttle'].mean(),
            'Throttle_Max': telemetry['Throttle'].max(),
            'Throttle_Std': telemetry['Throttle'].std(),
            'nGear_Mean': telemetry['nGear'].mean(),
            'nGear_Max': telemetry['nGear'].max(),
            'Brake_Percent': (telemetry['Brake'] > 0).sum() / len(telemetry) * 100,
            'Brake_Count': (telemetry['Brake'].diff() > 0).sum(),
        }

        # NEW — synthetic F1 sensor data for prediction
        synthetic_stats = generate_synthetic_f1_sensors(
            telemetry,
            lap['Compound']
        )

        return {**base_stats, **synthetic_stats}

    except Exception:
        return None

def calculate_enhanced_degradation(driver_laps, fuel_effect=FUEL_EFFECT_PER_LAP):
    """
    Enhanced degradation calculation accounting for fuel load
    """
    driver_laps = driver_laps.copy()
    driver_laps['LapTimeSeconds'] = driver_laps['LapTime'].apply(lambda x: x.total_seconds())
    
    # Calculate fuel-corrected times
    driver_laps['FuelCorrection'] = driver_laps['LapNumber'] * fuel_effect
    driver_laps['FuelCorrectedTime'] = driver_laps['LapTimeSeconds'] + driver_laps['FuelCorrection']
    
    # Baseline is the minimum fuel-corrected time
    baseline_time = driver_laps['FuelCorrectedTime'].min()
    
    # Calculate enhanced degradation
    driver_laps['EnhancedDegradation'] = driver_laps['FuelCorrectedTime'] - baseline_time
    driver_laps['EnhancedDegradation'] = driver_laps['EnhancedDegradation'].clip(lower=0)
    
    # Also calculate simple degradation for comparison
    baseline_simple = driver_laps['LapTimeSeconds'].min()
    driver_laps['SimpleDegradation'] = driver_laps['LapTimeSeconds'] - baseline_simple
    
    return driver_laps

def predict_degradation(model, lap_data, compound, stint, le, feature_cols):
    """Predict degradation using full feature set including synthetic sensors"""
    compound_encoded = le.transform([compound])[0]

    features = {
        'TyreLife': lap_data.get('TyreLife', 1),
        'CompoundEncoded': compound_encoded,
        'Stint': stint,
    }

    # Add ALL features from model in correct order
    for col in feature_cols:
        if col not in features:
            features[col] = lap_data.get(col, 0)

    X = pd.DataFrame([features])[feature_cols]
    return max(0, model.predict(X)[0])


def plot_degradation_curve(degradation_data, driver_name, compound, show_simple=False):
    """Create interactive degradation curve with fuel correction visualization"""
    fig = go.Figure()
    
    # Enhanced degradation (fuel-corrected)
    fig.add_trace(go.Scatter(
        x=degradation_data['TyreLife'],
        y=degradation_data['Actual'],
        mode='markers+lines',
        name='Actual (Fuel-Corrected)',
        line=dict(color='#FF1801', width=3),
        marker=dict(size=8, color='#FF1801')
    ))
    
    # ML Prediction
    fig.add_trace(go.Scatter(
        x=degradation_data['TyreLife'],
        y=degradation_data['Predicted'],
        mode='lines',
        name='ML Predicted',
        line=dict(color='#00D2BE', width=3, dash='dash')
    ))
    
    # Simple degradation (for comparison)
    if show_simple and 'Simple' in degradation_data.columns:
        fig.add_trace(go.Scatter(
            x=degradation_data['TyreLife'],
            y=degradation_data['Simple'],
            mode='lines',
            name='Simple (No Fuel Correction)',
            line=dict(color='#FFA500', width=2, dash='dot'),
            opacity=0.6
        ))
    
    # Add critical threshold line
    fig.add_hline(y=2.0, line_dash="dot", line_color="orange", 
                  annotation_text="Critical Threshold (2.0s)")
    
    fig.update_layout(
        title=f'{driver_name} - {compound} Compound Degradation (Enhanced)',
        xaxis_title='Tyre Life (Laps)',
        yaxis_title='Degradation (seconds)',
        hovermode='x unified',
        height=500,
        template='plotly_dark',
        legend=dict(
            yanchor="top",
            y=0.99,
            xanchor="left",
            x=0.01
        )
    )
    
    return fig

def plot_fuel_impact(stint_data):
    """Plot the impact of fuel correction"""
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        x=stint_data['TyreLife'],
        y=stint_data['FuelCorrection'],
        name='Fuel Correction',
        marker_color='lightblue',
        text=stint_data['FuelCorrection'].round(2),
        textposition='outside'
    ))
    
    fig.update_layout(
        title='Fuel Load Effect Over Stint',
        xaxis_title='Tyre Life (Laps)',
        yaxis_title='Time Correction (seconds)',
        height=300,
        template='plotly_dark',
        showlegend=False
    )
    
    return fig

def plot_tyre_temps(stint):
    cols = ['TyreTemp_FL','TyreTemp_FR','TyreTemp_RL','TyreTemp_RR']
    present = [c for c in cols if c in stint.columns]
    if not present:
        return None
    
    fig = go.Figure()
    for c in present:
        fig.add_trace(go.Scatter(
            x=stint['TyreLife'], y=stint[c], mode='lines', name=c
        ))
    fig.update_layout(
        title="Tyre Temperatures (°C)",
        template="plotly_dark",
        height=400
    )
    return fig

def plot_brake_temps(stint):
    cols = ['BrakeTemp_FL','BrakeTemp_FR','BrakeTemp_RL','BrakeTemp_RR']
    present = [c for c in cols if c in stint.columns]
    if not present:
        return None
    
    fig = go.Figure()
    for c in present:
        fig.add_trace(go.Scatter(
            x=stint['TyreLife'], y=stint[c], mode='lines', name=c
        ))
    fig.update_layout(
        title="Brake Temperatures (°C)",
        template="plotly_dark",
        height=400
    )
    return fig

def plot_ers_usage(stint):
    cols = ['ERS_Deployment_Ratio','Battery_SOC']
    present = [c for c in cols if c in stint.columns]
    if not present:
        return None

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=stint['TyreLife'], y=stint['ERS_Deployment_Ratio'],
        mode='lines', name='ERS Deployment'
    ))
    fig.add_trace(go.Scatter(
        x=stint['TyreLife'], y=stint['Battery_SOC'],
        mode='lines', name='Battery SOC (%)'
    ))
    fig.update_layout(
        title="ERS & Battery State",
        template="plotly_dark",
        height=350
    )
    return fig

def plot_engine_temps(stint):
    cols = ['ICE_Temperature','Oil_Temp','Coolant_Temp','MGUH_Temp','MGUK_Temp']
    present = [c for c in cols if c in stint.columns]
    if not present:
        return None

    fig = go.Figure()
    for c in present:
        fig.add_trace(go.Scatter(
            x=stint['TyreLife'], y=stint[c], mode='lines', name=c
        ))
    fig.update_layout(
        title="Power Unit Temperatures (°C)",
        template="plotly_dark",
        height=350
    )
    return fig


def plot_telemetry_comparison(stint_data):
    """Plot telemetry metrics over stint"""
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=('Speed Profile', 'Throttle Usage', 'Braking Intensity', 'Engine RPM')
    )
    
    # Speed
    if 'Speed_Mean' in stint_data.columns:
        fig.add_trace(
            go.Scatter(x=stint_data['TyreLife'], y=stint_data['Speed_Mean'], 
                      name='Avg Speed', line=dict(color='cyan')),
            row=1, col=1
        )
    
    # Throttle
    if 'Throttle_Mean' in stint_data.columns:
        fig.add_trace(
            go.Scatter(x=stint_data['TyreLife'], y=stint_data['Throttle_Mean'], 
                      name='Avg Throttle', line=dict(color='green')),
            row=1, col=2
        )
    
    # Braking
    if 'Brake_Percent' in stint_data.columns:
        fig.add_trace(
            go.Scatter(x=stint_data['TyreLife'], y=stint_data['Brake_Percent'], 
                      name='Brake %', line=dict(color='red')),
            row=2, col=1
        )
    
    # RPM
    if 'RPM_Mean' in stint_data.columns:
        fig.add_trace(
            go.Scatter(x=stint_data['TyreLife'], y=stint_data['RPM_Mean'], 
                      name='Avg RPM', line=dict(color='orange')),
            row=2, col=2
        )
    
    fig.update_xaxes(title_text="Tyre Life", row=2, col=1)
    fig.update_xaxes(title_text="Tyre Life", row=2, col=2)
    fig.update_yaxes(title_text="km/h", row=1, col=1)
    fig.update_yaxes(title_text="%", row=1, col=2)
    fig.update_yaxes(title_text="%", row=2, col=1)
    fig.update_yaxes(title_text="RPM", row=2, col=2)
    
    fig.update_layout(height=500, showlegend=False, template='plotly_dark')
    
    return fig

def recommend_pit_window(degradation_curve, threshold=2.0):
    """Recommend pit stop window based on degradation"""
    critical_lap = degradation_curve[degradation_curve['Predicted'] > threshold]
    
    if len(critical_lap) > 0:
        return critical_lap.iloc[0]['TyreLife']
    else:
        return len(degradation_curve)

# Main App
st.title("🏎️ F1 Tyre Degradation Predictor")
st.markdown("### ML-powered pit strategy with fuel-corrected telemetry")

# Info banner
st.info("🔬 **Enhanced Model**: Accounts for fuel load effects (~0.035s/lap improvement)")

# Sidebar
st.sidebar.header("⚙️ Race Configuration")

# Load model
try:
    model, le, feature_cols, fuel_effect = download_and_load_model()
    has_telemetry = any('Speed' in f or 'RPM' in f for f in feature_cols)
    has_fuel_correction = 'FuelCorrection' in feature_cols
    # st.sidebar.success("✓ Model loaded")
    st.sidebar.info(f"📊 Features: {len(feature_cols)}")
    # if has_fuel_correction:
    #     # st.sidebar.success("✓ Fuel correction enabled")
    # if has_telemetry:
    #     # st.sidebar.success("✓ Telemetry included")
except Exception as e:
    st.sidebar.error(f"⚠️ Error: {e}")
    st.stop()

# Race selection
year = st.sidebar.selectbox("Year", [2024, 2023])
race_options = ['Bahrain', 'Saudi Arabia', 'Australia', 'Japan', 'Monaco', 'Spain', 'Canada']
race = st.sidebar.selectbox("Grand Prix", race_options)

# Visualization options
st.sidebar.markdown("---")
st.sidebar.header("📊 Visualization Options")
show_simple_deg = st.sidebar.checkbox("Show simple degradation", value=False,
                                      help="Compare fuel-corrected vs non-corrected")
show_fuel_impact = st.sidebar.checkbox("Show fuel impact", value=True)

# Load data button
if st.sidebar.button("🔄 Load Race Data", type="primary"):
    with st.spinner(f"Loading {year} {race} GP..."):
        try:
            session, laps_data = load_race_data(year, race)
            st.session_state['session'] = session
            st.session_state['laps_data'] = laps_data
            st.sidebar.success(f"✓ Loaded {len(laps_data)} laps")
        except Exception as e:
            st.sidebar.error(f"Error: {str(e)}")

# Main content
if 'laps_data' in st.session_state:
    session = st.session_state['session']
    laps = st.session_state['laps_data']
    
    # Filter valid laps
    laps = laps[laps['LapTime'].notna()]
    laps = laps[laps['PitOutTime'].isna()]
    laps = laps[laps['PitInTime'].isna()]
    
    # Driver selection
    drivers = sorted(laps['Driver'].unique())
    selected_driver = st.selectbox("🏁 Select Driver", drivers)
    
    # Filter driver laps
    driver_laps = laps[laps['Driver'] == selected_driver].copy()
    driver_laps = driver_laps.sort_values('LapNumber')
    
    # Calculate tyre life
    driver_laps['TyreLife'] = driver_laps.groupby('Stint').cumcount() + 1
    
    # Stint selection
    stints = sorted(driver_laps['Stint'].unique())
    selected_stint = st.selectbox("🔧 Select Stint", stints)
    
    stint_data = driver_laps[driver_laps['Stint'] == selected_stint].copy()
    compound = stint_data['Compound'].iloc[0]
    
    # Calculate enhanced degradation
    stint_data = calculate_enhanced_degradation(stint_data, fuel_effect)
    
    # Extract telemetry for each lap
    with st.spinner("Analyzing telemetry data..."):
        telemetry_data = []
        for idx, lap in stint_data.iterrows():
            lap_telemetry = get_lap_telemetry_stats(lap)
            if lap_telemetry:
                telemetry_data.append(lap_telemetry)
            else:
                telemetry_data.append({})
        
        telemetry_df = pd.DataFrame(telemetry_data)
        stint_data = pd.concat([stint_data.reset_index(drop=True), telemetry_df], axis=1)
    
    # Create predictions
    predictions = []
    for idx, row in stint_data.iterrows():
        lap_data = {
            'TyreLife': row['TyreLife'],
            'FuelCorrection': row['FuelCorrection'],
        }
        # Add telemetry if available
        for col in telemetry_df.columns:
            if col in row and pd.notna(row[col]):
                lap_data[col] = row[col]
        
        # Add sector times if available
        if 'Sector1Time' in row and pd.notna(row['Sector1Time']):
            lap_data['Sector1Time'] = row['Sector1Time'].total_seconds()
        if 'Sector2Time' in row and pd.notna(row['Sector2Time']):
            lap_data['Sector2Time'] = row['Sector2Time'].total_seconds()
        if 'Sector3Time' in row and pd.notna(row['Sector3Time']):
            lap_data['Sector3Time'] = row['Sector3Time'].total_seconds()
        
        pred = predict_degradation(model, lap_data, compound, selected_stint, le, feature_cols)
        predictions.append(pred)
    
    stint_data['PredictedDegradation'] = predictions
    
    # Prepare plot data
    plot_data = pd.DataFrame({
        'TyreLife': stint_data['TyreLife'],
        'Actual': stint_data['EnhancedDegradation'],
        'Predicted': stint_data['PredictedDegradation'],
        'Simple': stint_data['SimpleDegradation'],
        'FuelCorrection': stint_data['FuelCorrection']
    })
    
    # Display metrics
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric("🛞 Compound", compound)
    with col2:
        st.metric("📏 Stint Length", f"{len(stint_data)} laps")
    with col3:
        avg_deg = plot_data['Actual'].mean()
        st.metric("⏱️ Avg Deg.", f"{avg_deg:.2f}s")
    with col4:
        fuel_saving = plot_data['FuelCorrection'].iloc[-1]
        st.metric("⛽ Fuel Effect", f"+{fuel_saving:.2f}s")
    with col5:
        pit_lap = recommend_pit_window(plot_data)
        st.metric("🏁 Optimal Pit", f"Lap {int(pit_lap)}")
    
    # Tabs for different visualizations
    tab1, tab2, tab3, tab4 = st.tabs(["📈 Degradation Curve", "⛽ Fuel Impact", "🚗 Telemetry", "📊 Data"])
    
    with tab1:
        st.plotly_chart(
            plot_degradation_curve(plot_data, selected_driver, compound, show_simple_deg), 
            use_container_width=True
        )
        
        # Strategy recommendations
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**🔍 Degradation Analysis**")
            max_deg = plot_data['Actual'].max()
            if max_deg < 1.5:
                st.success("✓ Low degradation - extend stint")
                st.caption(f"Max degradation: {max_deg:.2f}s")
            elif max_deg < 3.0:
                st.warning("⚠️ Moderate degradation - monitor")
                st.caption(f"Max degradation: {max_deg:.2f}s")
            else:
                st.error("❌ High degradation - pit ASAP")
                st.caption(f"Max degradation: {max_deg:.2f}s")
        
        with col2:
            st.markdown("**⏰ Pit Window**")
            pit_recommendation = recommend_pit_window(plot_data, threshold=2.0)
            st.info(f"Optimal pit stop: **Lap {int(pit_recommendation)}**")
            st.caption("Based on 2.0s degradation threshold")
            
            # Show comparison
            if show_simple_deg:
                simple_avg = plot_data['Simple'].mean()
                enhanced_avg = plot_data['Actual'].mean()
                diff = simple_avg - enhanced_avg
                st.caption(f"Fuel correction impact: {diff:.2f}s average")
    
    with tab2:
        if show_fuel_impact:
            st.plotly_chart(plot_fuel_impact(stint_data), use_container_width=True)
            
            st.markdown("**🔬 Fuel Load Correction Explained**")
            
            col1, col2 = st.columns(2)
            with col1:
                st.markdown("""
                **Why fuel correction matters:**
                - F1 cars carry ~110kg of fuel at race start
                - Fuel burns at ~1.6-2kg per lap
                - Lighter car = faster lap times
                - ~0.035s improvement per lap from fuel burn
                """)
            
            with col2:
                total_fuel_effect = plot_data['FuelCorrection'].iloc[-1]
                st.metric("Total Fuel Advantage", f"{total_fuel_effect:.2f}s", 
                         help="Theoretical time gain from fuel burn over this stint")
                st.markdown(f"""
                **This stint:**
                - Laps: {len(stint_data)}
                - Fuel burned: ~{len(stint_data) * 1.8:.1f}kg
                - Time advantage: {total_fuel_effect:.2f}s
                """)
        else:
            st.info("Enable 'Show fuel impact' in the sidebar to see fuel correction analysis")
    
    with tab3:
        st.subheader("🚗 Driving Telemetry")
        st.plotly_chart(plot_telemetry_comparison(stint_data), use_container_width=True)

        st.subheader("🌡️ Tyre Temperatures")
        fig = plot_tyre_temps(stint_data)
        if fig: st.plotly_chart(fig, use_container_width=True)

        st.subheader("🔥 Brake Temperatures")
        fig = plot_brake_temps(stint_data)
        if fig: st.plotly_chart(fig, use_container_width=True)

        st.subheader("⚡ ERS & Battery")
        fig = plot_ers_usage(stint_data)
        if fig: st.plotly_chart(fig, use_container_width=True)

        st.subheader("🏎️ Power Unit Temperatures")
        fig = plot_engine_temps(stint_data)
        if fig: st.plotly_chart(fig, use_container_width=True)

            
            # Telemetry insights
        st.markdown("**🔧 Driving Style Impact on Degradation**")
        col1, col2, col3, col4 = st.columns(4)
            
        with col1:
            if 'Throttle_Mean' in stint_data.columns:
                avg_throttle = stint_data['Throttle_Mean'].mean()
                st.metric("Avg Throttle", f"{avg_throttle:.1f}%")
        
        with col2:
            if 'Brake_Percent' in stint_data.columns:
                avg_brake = stint_data['Brake_Percent'].mean()
                st.metric("Braking Time", f"{avg_brake:.1f}%")
            
        with col3:
            if 'Speed_Mean' in stint_data.columns:
                avg_speed = stint_data['Speed_Mean'].mean()
                st.metric("Avg Speed", f"{avg_speed:.0f} km/h")
            
            with col4:
                if 'RPM_Mean' in stint_data.columns:
                    avg_rpm = stint_data['RPM_Mean'].mean()
                    st.metric("Avg RPM", f"{avg_rpm:.0f}")
                else:
                    st.info("Telemetry visualization available when model includes car data features")
    
    with tab4:
        display_cols = ['LapNumber', 'TyreLife', 'LapTime', 'EnhancedDegradation', 
                       'SimpleDegradation', 'FuelCorrection', 'PredictedDegradation']
        
        # Add telemetry columns if available
        telemetry_display = ['Speed_Mean', 'Throttle_Mean', 'Brake_Percent', 'RPM_Mean']
        for col in telemetry_display:
            if col in stint_data.columns:
                display_cols.append(col)
        
        display_df = stint_data[[c for c in display_cols if c in stint_data.columns]].copy()
        display_df['LapTime'] = display_df['LapTime'].apply(lambda x: str(x).split()[-1] if pd.notna(x) else '')
        
        # Rename columns for clarity
        display_df = display_df.rename(columns={
            'EnhancedDegradation': 'Deg_Enhanced',
            'SimpleDegradation': 'Deg_Simple',
            'FuelCorrection': 'FuelCorr',
            'PredictedDegradation': 'Deg_Predicted'
        })
        
        # Round numeric columns
        numeric_cols = display_df.select_dtypes(include=[np.number]).columns
        display_df[numeric_cols] = display_df[numeric_cols].round(3)
        
        st.dataframe(display_df, use_container_width=True, height=400)
        
        # Download button
        csv = display_df.to_csv(index=False)
        st.download_button(
            label="📥 Download Data as CSV",
            data=csv,
            file_name=f"{selected_driver}_{race}_{year}_stint{selected_stint}.csv",
            mime="text/csv"
        )

else:
    # st.info("👈 Configure race settings and click 'Load Race Data'")
    
    # Demo information
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        ## 🎯 How It Works
        
        **Enhanced Degradation Model:**
        1. 🏁 **Real F1 telemetry** from FastF1 API
        2. ⛽ **Fuel load correction** (~0.035s/lap)
        3. 🚗 **Car data**: Speed, RPM, Throttle, Brakes
        4. 🤖 **ML Model**: Random Forest prediction
        5. 📊 **Strategic recommendations**
        
        **Why Fuel Correction?**
        - F1 cars lose ~110kg fuel during race
        - Lighter car = faster lap times
        - Raw lap times hide tyre degradation
        - We correct for fuel to isolate tyre wear
        """)
    
    with col2:
        st.markdown("""
        ## 📊 Key Features
        
        ✅ **Multi-race training data**
        
        ✅ **Fuel-corrected degradation**
        
        ✅ **Compound-specific models**
        
        ✅ **Driving style correlation**
        
        ✅ **Live telemetry integration**
        
        ✅ **Strategic pit recommendations**
        
        ✅ **Interactive visualizations**
        
        ✅ **Data export capability**
        """)
    
    # Technical details
    with st.expander("🔬 Technical Details: Degradation Calculation"):
        st.markdown("""
        ### Enhanced Degradation Formula
```
        Fuel Correction = Lap Number × 0.035 seconds
        Fuel-Corrected Time = Raw Lap Time - Fuel Correction
        Baseline = Minimum Fuel-Corrected Time
        Degradation = Fuel-Corrected Time - Baseline
```
        
        **Example:**
        - **Lap 1**: 1:32.500 + 0.035 = 1:32.535 (baseline)
        - **Lap 20**: 1:33.800 + 0.700 = 1:34.500
        - **Enhanced Degradation**: 1:34.500 - 1:32.535 = **1.965s**
        - **Simple Degradation** (no correction): 1.300s
        
        The enhanced method reveals **0.665s more degradation** that was hidden by fuel burn!
        """)

# Footer
st.markdown("---")
st.caption("🏎️ Data: FastF1 | 🤖 Model: Random Forest | 🏆 Built for Trackshift")