# Implementation Plan

- [x] 1. Set up analytics state management and types
  - Create `src/store/analyticsStore.ts` with Zustand store for analytics state management
  - Create `src/types/analytics.ts` with all TypeScript interfaces (StintAnalysis, LapAnalysis, StintMetrics, DegradationPoint, LapTelemetry, SyntheticSensorData, ThermalData, TelemetryStats)
  - Define store actions: setConfiguration, loadRaceData, setDriver, setStint, analyzeStint, toggleVisualizationOption, resetAnalytics
  - _Requirements: 16.3_

- [x] 2. Modify existing components for analytics navigation
  - [x] 2.1 Update Navbar component to include Analytics button
    - Add `onAnalyticsClick` prop to NavbarProps interface
    - Add Analytics button between "Meet the Team" and "Download Report" with Ferrari-themed styling
    - Implement keyboard accessibility with focus indicators
    - Add responsive text display (full text on desktop, abbreviated on mobile)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 2.2 Update App component for view switching
    - Add `isAnalyticsView` state to App component
    - Create `handleAnalyticsClick` and `handleExitAnalytics` handlers
    - Implement conditional rendering: AppLayout vs AnalyticsView
    - Pass onAnalyticsClick to Navbar component
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 16.1, 16.2_

- [x] 3. Create main analytics view structure
  - [x] 3.1 Implement AnalyticsView component
    - Create `src/components/AnalyticsView.tsx` with full-screen layout
    - Implement grid layout: sidebar (300px) and main content area
    - Apply Ferrari-black background and Ferrari-white text
    - Add overflow handling for scrollable content
    - _Requirements: 2.2, 2.3_
  
  - [x] 3.2 Implement AnalyticsSidebar component
    - Create `src/components/analytics/AnalyticsSidebar.tsx`
    - Add year selector dropdown (2023, 2024)
    - Add Grand Prix selector dropdown (Bahrain, Saudi Arabia, Australia, Japan, Monaco, Spain, Canada)
    - Add "Load Race Data" button with loading state
    - Add driver selector (populated after data load)
    - Add stint selector (populated after driver selection)
    - Add visualization toggle checkboxes (Show simple degradation, Show fuel impact)
    - Apply Ferrari-graphite background with Ferrari-red accents
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [x] 3.3 Implement AnalyticsContent component
    - Create `src/components/analytics/AnalyticsContent.tsx`
    - Implement conditional rendering: welcome message, loading state, error state, data view
    - Add error display with retry button
    - Add loading spinner with progress messages
    - Connect to analytics store for state management
    - _Requirements: 3.4, 3.5_

- [x] 4. Create backend service for FastF1 integration
  - [x] 4.1 Set up Python analytics service structure
    - Create `backend/analytics_service/` directory
    - Create `app.py` with Flask/FastAPI application
    - Create `fastf1_wrapper.py` for FastF1 library integration
    - Create `requirements.txt` with dependencies (fastf1, flask/fastapi, scikit-learn, pandas, numpy)
    - Set up FastF1 cache directory
    - _Requirements: 3.3, 3.4_
  
  - [x] 4.2 Implement race data endpoints
    - Create `GET /api/analytics/races?year={year}` endpoint to list available races
    - Create `GET /api/analytics/race-data?year={year}&race={race}` endpoint to load race session and laps
    - Implement error handling and validation for year and race parameters
    - Add CORS configuration for frontend origin
    - _Requirements: 3.3, 3.4, 3.5_
  
  - [x] 4.3 Implement telemetry extraction endpoint
    - Create `GET /api/analytics/telemetry?year={year}&race={race}&driver={driver}&stint={stint}` endpoint
    - Extract telemetry statistics: speed, RPM, throttle, brake for each lap
    - Calculate tyre life for each lap within stint
    - Return structured telemetry data
    - _Requirements: 4.3, 4.4, 4.5_
  
  - [x] 4.4 Implement synthetic sensor data generation
    - Create `synthetic_sensors.py` module
    - Generate tyre temperatures (FL, FR, RL, RR) based on telemetry patterns
    - Generate brake temperatures based on braking intensity
    - Generate ERS data (deployment ratio, battery SOC)
    - Generate power unit temperatures (ICE, Oil, Coolant, MGUH, MGUK)
    - _Requirements: 4.5_
  
  - [x] 4.5 Implement degradation calculation logic
    - Create `degradation_calculator.py` module
    - Implement fuel correction calculation: Lap Number × 0.035 seconds
    - Calculate fuel-corrected lap times
    - Determine baseline time (minimum fuel-corrected lap time)
    - Calculate enhanced degradation: Fuel-Corrected Time - Baseline Time
    - Clip degradation values to non-negative
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 4.6 Implement ML prediction endpoint
    - Create `ml_model.py` module for model loading and inference
    - Load pre-trained Random Forest model from pickle file
    - Create `POST /api/analytics/predict` endpoint
    - Encode tyre compound types (SOFT, MEDIUM, HARD, INTERMEDIATE, WET)
    - Prepare feature vectors with tyre life, compound, stint, telemetry, and synthetic data
    - Generate degradation predictions for each lap
    - Ensure predictions are non-negative
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Implement metrics display components
  - [x] 5.1 Create MetricsBar component
    - Create `src/components/analytics/MetricsBar.tsx`
    - Implement responsive grid layout (2/3/5 columns based on viewport)
    - Create MetricCard sub-component with label, value, and icon
    - Display: Compound, Stint Length, Avg Degradation, Fuel Effect, Optimal Pit Lap
    - Apply Ferrari-graphite background with border
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 5.2 Create StrategyRecommendations component
    - Create `src/components/analytics/StrategyRecommendations.tsx`
    - Implement degradation categorization: Low (< 1.5s), Moderate (1.5-3.0s), High (> 3.0s)
    - Display success message for low degradation (green)
    - Display warning message for moderate degradation (yellow)
    - Display error message for high degradation (red)
    - Display optimal pit lap recommendation with 2.0s threshold explanation
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 6. Implement chart components
  - [x] 6.1 Create DegradationChart component
    - Create `src/components/analytics/charts/DegradationChart.tsx`
    - Install and configure Recharts library
    - Implement line chart with tyre life (x-axis) and degradation (y-axis)
    - Add actual degradation series (solid red line with markers)
    - Add predicted degradation series (dashed cyan line)
    - Add optional simple degradation series (dotted orange line)
    - Add horizontal threshold line at 2.0 seconds
    - Apply dark theme with Ferrari colors
    - Implement unified tooltips on hover
    - Make chart responsive
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [x] 6.2 Create FuelImpactChart component
    - Create `src/components/analytics/charts/FuelImpactChart.tsx`
    - Implement bar chart showing fuel correction per lap
    - Use light blue bars with value labels above each bar
    - Add explanatory text about fuel load effects
    - Display total fuel advantage and estimated fuel burned
    - Apply dark theme
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 6.3 Create TelemetryCharts component
    - Create `src/components/analytics/charts/TelemetryCharts.tsx`
    - Implement 2×2 subplot grid layout
    - Create Speed Profile chart (cyan line, km/h)
    - Create Throttle Usage chart (green line, percentage)
    - Create Braking Intensity chart (red line, percentage)
    - Create Engine RPM chart (orange line)
    - Share x-axis (Tyre Life) across all subplots
    - Apply dark theme
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 6.4 Create ThermalCharts component
    - Create `src/components/analytics/charts/ThermalCharts.tsx`
    - Implement tyre temperatures chart (4 lines: FL, FR, RL, RR in °C)
    - Implement brake temperatures chart (4 lines: FL, FR, RL, RR in °C)
    - Implement ERS & Battery chart (deployment ratio and SOC percentage)
    - Implement power unit temperatures chart (ICE, Oil, Coolant, MGUH, MGUK)
    - Add informational message when sensor data is unavailable
    - Apply dark theme with color-coded lines
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 7. Implement tabbed interface
  - Create `src/components/analytics/TabPanel.tsx`
  - Implement tab navigation: Degradation Curve, Fuel Impact, Telemetry, Data Table
  - Style active tab with Ferrari-red background
  - Style inactive tabs with Ferrari-graphite background and hover effects
  - Implement tab content area with proper component rendering
  - Add keyboard navigation support (arrow keys)
  - Make tabs responsive (icons only on mobile)
  - _Requirements: 7.1, 9.1, 10.1, 13.1_

- [x] 8. Implement data table and export
  - [x] 8.1 Create DataTable component
    - Create `src/components/analytics/DataTable.tsx`
    - Implement table with columns: Lap Number, Tyre Life, Lap Time, Enhanced Degradation, Simple Degradation, Fuel Correction, Predicted Degradation
    - Add optional telemetry columns: Speed Mean, Throttle Mean, Brake Percent, RPM Mean
    - Format lap times as MM:SS.mmm
    - Round numeric values to 3 decimal places
    - Implement sticky header
    - Add alternating row colors (Ferrari-black and Ferrari-graphite)
    - Add hover effects
    - Support horizontal scrolling on mobile
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 8.2 Implement CSV export functionality
    - Add "Download Data as CSV" button below data table
    - Implement CSV generation from table data
    - Format filename: {Driver}_{Race}_{Year}_stint{Stint}.csv
    - Use comma delimiters with header row
    - Trigger browser download without server interaction
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 9. Integrate frontend with backend API
  - Create `src/services/analyticsApi.ts` for API calls
  - Implement fetchRaces(year) function
  - Implement fetchRaceData(year, race) function
  - Implement fetchTelemetry(year, race, driver, stint) function
  - Implement predictDegradation(stintData) function
  - Add error handling and retry logic
  - Configure API base URL from environment variables
  - Connect API functions to analytics store actions
  - _Requirements: 3.3, 3.4, 3.5_

- [x] 10. Implement responsive design and accessibility
  - [x] 10.1 Add responsive layouts
    - Implement mobile layout: collapsible sidebar drawer, 2-column metrics, stacked charts
    - Implement tablet layout: 250px sidebar, 3-column metrics
    - Implement desktop layout: 300px sidebar, 5-column metrics
    - Add touch-friendly interactions (larger targets, swipe gestures)
    - Test all breakpoints (< 640px, 640-1024px, > 1024px)
    - _Requirements: 1.4_
  
  - [x] 10.2 Implement accessibility features
    - Add ARIA labels to all interactive elements
    - Implement keyboard navigation for all controls
    - Add focus indicators (2px Ferrari-red outline)
    - Add screen reader announcements for state changes (aria-live regions)
    - Add role="alert" to error messages
    - Provide data table as alternative to charts
    - Test with screen reader
    - Verify color contrast compliance (WCAG AA: 4.5:1 for text)
    - _Requirements: 1.3, 16.5_

- [ ] 11. Add comprehensive testing
  - [ ] 11.1 Write unit tests for analytics components
    - Test AnalyticsSidebar: configuration interactions, dropdown changes
    - Test MetricsBar: metric calculations and display
    - Test DataTable: data formatting, CSV export
    - Test StrategyRecommendations: degradation categorization logic
    - Test chart components: data transformations, rendering
    - _Requirements: 16.4_
  
  - [ ] 11.2 Write integration tests
    - Test full analytics workflow: Load race → Select driver → Select stint → View results
    - Test visualization toggle interactions
    - Test tab switching behavior
    - Test error recovery flows
    - Test API integration with mock responses
    - _Requirements: 16.2_
  
  - [ ] 11.3 Add accessibility tests
    - Test keyboard navigation through all controls
    - Test screen reader announcements
    - Test focus indicators
    - Verify ARIA labels on charts
    - Check color contrast compliance
    - _Requirements: 16.5_

- [ ] 12. Final integration and polish
  - Verify no modifications to existing components except Navbar and App
  - Test analytics view doesn't affect main application functionality
  - Verify all Ferrari-themed styling is consistent
  - Test loading states and error handling
  - Verify responsive design on multiple devices
  - Test keyboard accessibility end-to-end
  - Add code comments and documentation
  - _Requirements: 16.1, 16.2, 16.4, 16.5_
