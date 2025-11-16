# Requirements Document

## Introduction

This feature adds a new "Analytics" tab to the F1 Visual Difference Engine navigation bar. The Analytics tab will display an F1 Tyre Degradation Predictor that provides ML-powered pit strategy recommendations with fuel-corrected telemetry analysis. The feature converts existing Streamlit Python functionality into a React/TypeScript implementation while maintaining visual consistency with the existing application design system.

## Glossary

- **Analytics Tab**: A new navigation item in the main navbar that displays tyre degradation analytics
- **Navbar Component**: The top navigation bar component (Navbar.tsx) that contains navigation links and actions
- **App Component**: The main application component (App.tsx) that manages routing and state
- **Tyre Degradation Predictor**: An ML-powered tool that analyzes F1 race data to predict tyre wear and recommend pit stop timing
- **FastF1 API**: A Python library for accessing Formula 1 timing and telemetry data
- **Fuel Correction**: A calculation that adjusts lap times to account for fuel load reduction (~0.035s per lap)
- **Design System**: The existing Ferrari-themed color scheme and styling patterns (ferrari-red, ferrari-black, ferrari-graphite, ferrari-white)
- **Stint**: A continuous period of racing on the same set of tyres between pit stops
- **Degradation Curve**: A visualization showing how tyre performance decreases over laps

## Requirements

### Requirement 1

**User Story:** As a user, I want to see an "Analytics" tab in the navigation bar, so that I can access tyre degradation analysis tools

#### Acceptance Criteria

1. WHEN the application loads, THE Navbar Component SHALL display an "Analytics" navigation link between "Meet the Team" and "Download Report"
2. THE Navbar Component SHALL apply the same styling patterns to the Analytics link as existing navigation items (ferrari-white text, ferrari-red hover, responsive sizing)
3. THE Analytics link SHALL be keyboard accessible with focus indicators matching the existing design system
4. WHERE the viewport is mobile size, THE Analytics link SHALL display abbreviated text "Analytics" consistent with other mobile navigation patterns

### Requirement 2

**User Story:** As a user, I want to click the Analytics tab and see a dedicated analytics view, so that I can analyze F1 tyre degradation data

#### Acceptance Criteria

1. WHEN the user clicks the Analytics navigation link, THE App Component SHALL display the Analytics view in place of the main application layout
2. THE Analytics view SHALL occupy the full viewport area below the navbar
3. THE Analytics view SHALL maintain the ferrari-black background and ferrari-white text consistent with the application design system
4. WHEN the user navigates away from Analytics, THE App Component SHALL restore the previous view (3D renderer, upload panel, insights panel, video comparison)

### Requirement 3

**User Story:** As a user, I want to configure race parameters in the Analytics view, so that I can load specific F1 race data for analysis

#### Acceptance Criteria

1. THE Analytics Component SHALL display a configuration sidebar with year selection (2023, 2024)
2. THE Analytics Component SHALL display a Grand Prix selection dropdown with race options (Bahrain, Saudi Arabia, Australia, Japan, Monaco, Spain, Canada)
3. WHEN the user clicks "Load Race Data", THE Analytics Component SHALL fetch race session data from the FastF1 API
4. THE Analytics Component SHALL display loading indicators during data fetch operations
5. IF data loading fails, THEN THE Analytics Component SHALL display an error message with retry options

### Requirement 4

**User Story:** As a user, I want to select a driver and stint after loading race data, so that I can analyze specific tyre degradation patterns

#### Acceptance Criteria

1. WHEN race data is loaded, THE Analytics Component SHALL display a driver selection dropdown populated with all drivers from the race
2. WHEN a driver is selected, THE Analytics Component SHALL display a stint selection dropdown showing all stints for that driver
3. THE Analytics Component SHALL calculate tyre life for each lap within the selected stint
4. THE Analytics Component SHALL extract telemetry statistics (speed, RPM, throttle, brake) for each lap
5. THE Analytics Component SHALL generate synthetic F1 sensor data (tyre temps, brake temps, ERS, power unit temps) based on telemetry patterns

### Requirement 5

**User Story:** As a user, I want to see fuel-corrected degradation calculations, so that I can understand true tyre wear independent of fuel load effects

#### Acceptance Criteria

1. THE Analytics Component SHALL calculate fuel correction using the formula: Lap Number × 0.035 seconds
2. THE Analytics Component SHALL calculate fuel-corrected lap times by adding fuel correction to raw lap times
3. THE Analytics Component SHALL determine baseline time as the minimum fuel-corrected lap time
4. THE Analytics Component SHALL calculate enhanced degradation as: Fuel-Corrected Time - Baseline Time
5. THE Analytics Component SHALL clip degradation values to be non-negative (minimum 0)

### Requirement 6

**User Story:** As a user, I want to see ML predictions of tyre degradation, so that I can anticipate future tyre performance

#### Acceptance Criteria

1. THE Analytics Component SHALL load a pre-trained Random Forest model for degradation prediction
2. THE Analytics Component SHALL encode tyre compound types (SOFT, MEDIUM, HARD, INTERMEDIATE, WET) for model input
3. THE Analytics Component SHALL prepare feature vectors including tyre life, compound, stint, telemetry stats, and synthetic sensor data
4. THE Analytics Component SHALL generate degradation predictions for each lap in the stint
5. THE Analytics Component SHALL ensure predictions are non-negative values

### Requirement 7

**User Story:** As a user, I want to see an interactive degradation curve visualization, so that I can understand tyre wear progression over the stint

#### Acceptance Criteria

1. THE Analytics Component SHALL display a line chart with tyre life (laps) on the x-axis and degradation (seconds) on the y-axis
2. THE chart SHALL display actual fuel-corrected degradation as a solid red line with markers
3. THE chart SHALL display ML predicted degradation as a dashed cyan line
4. THE chart SHALL display a horizontal threshold line at 2.0 seconds marked as "Critical Threshold"
5. THE chart SHALL use the plotly-dark theme consistent with the ferrari-black background
6. WHEN the user hovers over data points, THE chart SHALL display unified tooltips showing lap number and degradation values

### Requirement 8

**User Story:** As a user, I want to see key metrics about the selected stint, so that I can quickly assess tyre performance

#### Acceptance Criteria

1. THE Analytics Component SHALL display the tyre compound type (SOFT, MEDIUM, HARD, etc.)
2. THE Analytics Component SHALL display the stint length in number of laps
3. THE Analytics Component SHALL calculate and display average degradation across the stint
4. THE Analytics Component SHALL calculate and display total fuel effect (correction at final lap)
5. THE Analytics Component SHALL calculate and display optimal pit lap recommendation based on 2.0s threshold

### Requirement 9

**User Story:** As a user, I want to see fuel impact analysis, so that I can understand how fuel load affects lap times

#### Acceptance Criteria

1. THE Analytics Component SHALL display a bar chart showing fuel correction per lap
2. THE bar chart SHALL use light blue bars with correction values displayed above each bar
3. THE Analytics Component SHALL display explanatory text about fuel load effects (~110kg at start, ~1.6-2kg per lap, ~0.035s improvement per lap)
4. THE Analytics Component SHALL calculate and display total fuel advantage over the stint
5. THE Analytics Component SHALL calculate and display estimated fuel burned (laps × 1.8kg)

### Requirement 10

**User Story:** As a user, I want to see telemetry visualizations, so that I can understand driving style impact on tyre degradation

#### Acceptance Criteria

1. THE Analytics Component SHALL display a 2×2 subplot grid showing Speed Profile, Throttle Usage, Braking Intensity, and Engine RPM
2. THE Speed Profile subplot SHALL plot average speed (km/h) over tyre life with cyan line color
3. THE Throttle Usage subplot SHALL plot average throttle percentage over tyre life with green line color
4. THE Braking Intensity subplot SHALL plot brake percentage over tyre life with red line color
5. THE Engine RPM subplot SHALL plot average RPM over tyre life with orange line color

### Requirement 11

**User Story:** As a user, I want to see thermal data visualizations, so that I can monitor component temperatures during the stint

#### Acceptance Criteria

1. THE Analytics Component SHALL display a tyre temperatures chart with four lines (FL, FR, RL, RR) in degrees Celsius
2. THE Analytics Component SHALL display a brake temperatures chart with four lines (FL, FR, RL, RR) in degrees Celsius
3. THE Analytics Component SHALL display an ERS & Battery chart showing ERS deployment ratio and battery state of charge percentage
4. THE Analytics Component SHALL display a power unit temperatures chart showing ICE, Oil, Coolant, MGUH, and MGUK temperatures
5. WHERE sensor data is unavailable, THE Analytics Component SHALL display an informational message instead of empty charts

### Requirement 12

**User Story:** As a user, I want to see strategic recommendations, so that I can make informed pit stop decisions

#### Acceptance Criteria

1. THE Analytics Component SHALL categorize degradation as "Low" (< 1.5s), "Moderate" (1.5-3.0s), or "High" (> 3.0s)
2. WHERE degradation is low, THE Analytics Component SHALL display a success message recommending stint extension
3. WHERE degradation is moderate, THE Analytics Component SHALL display a warning message recommending monitoring
4. WHERE degradation is high, THE Analytics Component SHALL display an error message recommending immediate pit stop
5. THE Analytics Component SHALL display optimal pit lap recommendation based on when predicted degradation exceeds 2.0 seconds

### Requirement 13

**User Story:** As a user, I want to view detailed lap-by-lap data in a table, so that I can analyze specific lap performance

#### Acceptance Criteria

1. THE Analytics Component SHALL display a data table with columns: Lap Number, Tyre Life, Lap Time, Enhanced Degradation, Simple Degradation, Fuel Correction, Predicted Degradation
2. WHERE telemetry data is available, THE table SHALL include Speed Mean, Throttle Mean, Brake Percent, and RPM Mean columns
3. THE table SHALL format lap times as readable time strings (MM:SS.mmm)
4. THE table SHALL round numeric values to 3 decimal places for readability
5. THE table SHALL support horizontal scrolling on smaller viewports

### Requirement 14

**User Story:** As a user, I want to download stint data as CSV, so that I can perform external analysis

#### Acceptance Criteria

1. THE Analytics Component SHALL provide a "Download Data as CSV" button below the data table
2. WHEN the user clicks the download button, THE Analytics Component SHALL generate a CSV file with all table data
3. THE CSV filename SHALL include driver name, race name, year, and stint number (format: {Driver}_{Race}_{Year}_stint{Stint}.csv)
4. THE CSV file SHALL use comma delimiters and include header row with column names
5. THE browser SHALL trigger a file download without requiring server interaction

### Requirement 15

**User Story:** As a user, I want to toggle visualization options, so that I can customize the analytics display

#### Acceptance Criteria

1. THE Analytics Component SHALL provide a checkbox to "Show simple degradation" for comparison with fuel-corrected values
2. WHEN simple degradation is enabled, THE degradation curve SHALL display an additional dotted orange line showing non-corrected degradation
3. THE Analytics Component SHALL provide a checkbox to "Show fuel impact" to display/hide fuel correction analysis
4. THE Analytics Component SHALL persist visualization preferences during the session
5. THE checkboxes SHALL use ferrari-red accent colors consistent with the design system

### Requirement 16

**User Story:** As a developer, I want the Analytics feature to integrate seamlessly with existing code, so that no other functionality is affected

#### Acceptance Criteria

1. THE implementation SHALL NOT modify existing components except Navbar.tsx and App.tsx
2. THE implementation SHALL NOT alter existing routes, state management, or API integrations for the main application
3. THE implementation SHALL use the existing Zustand store pattern if state management is needed
4. THE implementation SHALL follow the existing TypeScript, React, and Tailwind CSS patterns
5. THE implementation SHALL maintain all existing accessibility features (ARIA labels, keyboard navigation, focus management)
