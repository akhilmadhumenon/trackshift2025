# Design Document

## Overview

The Analytics tab feature adds F1 tyre degradation prediction capabilities to the existing F1 Visual Difference Engine. This feature converts Streamlit Python functionality into a React/TypeScript implementation that integrates seamlessly with the existing application architecture. The design maintains visual consistency with the Ferrari-themed design system and follows established patterns for state management, component structure, and user interaction.

The feature introduces a new navigation mode where clicking "Analytics" replaces the main 3-panel layout with a dedicated analytics interface. This approach minimizes changes to existing code while providing a focused environment for data analysis.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Navbar                               │
│  [F1 VDE] [Meet Team] [Analytics] [Download Report]        │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
         [Main View]            [Analytics View]
                │                       │
    ┌───────────┴────────┐             │
    │ AppLayout          │      ┌──────┴──────┐
    │ - Upload Panel     │      │ Analytics   │
    │ - 3D Renderer      │      │ Component   │
    │ - Insights Panel   │      │             │
    │ - Video Strip      │      └─────────────┘
    └────────────────────┘
```

### Component Hierarchy

```
App.tsx
├── Navbar (modified)
│   └── Analytics button
├── AppLayout (existing - shown when not in analytics mode)
│   ├── UploadPanel
│   ├── ThreeDRenderer
│   ├── InsightsPanel
│   └── VideoComparisonStrip
└── AnalyticsView (new - shown when in analytics mode)
    ├── AnalyticsSidebar
    │   ├── RaceConfiguration
    │   └── VisualizationOptions
    └── AnalyticsContent
        ├── MetricsBar
        ├── TabPanel
        │   ├── DegradationTab
        │   ├── FuelImpactTab
        │   ├── TelemetryTab
        │   └── DataTab
        └── InfoSection
```


### State Management Strategy

The Analytics feature uses a dedicated Zustand store (`useAnalyticsStore`) to manage analytics-specific state independently from the main application state. This separation ensures no interference with existing functionality.

**Analytics Store Structure:**
```typescript
interface AnalyticsState {
  // Configuration
  selectedYear: number;
  selectedRace: string;
  selectedDriver: string | null;
  selectedStint: number | null;
  
  // Data
  raceSession: any | null;
  lapsData: any[] | null;
  stintData: StintAnalysis | null;
  
  // UI State
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  showSimpleDegradation: boolean;
  showFuelImpact: boolean;
  
  // Actions
  setConfiguration: (year, race) => void;
  loadRaceData: () => Promise<void>;
  setDriver: (driver) => void;
  setStint: (stint) => void;
  analyzeStint: () => void;
  toggleVisualizationOption: (option) => void;
  resetAnalytics: () => void;
}
```

### Data Flow

1. **User Configuration** → Store updates → API call to FastF1 backend
2. **Race Data Loaded** → Store updates → Driver/Stint selectors populate
3. **Stint Selected** → Telemetry extraction → Degradation calculation → ML prediction
4. **Results Ready** → Store updates → Components re-render with visualizations


## Components and Interfaces

### 1. Navbar Component (Modified)

**File:** `src/components/Navbar.tsx`

**Changes:**
- Add `onAnalyticsClick` prop
- Add Analytics button between "Meet the Team" and "Download Report"
- Apply consistent styling with existing navigation items

**Interface:**
```typescript
interface NavbarProps {
  onMeetTeamClick: () => void;
  onAnalyticsClick: () => void; // NEW
  onDownloadReport: () => void;
  isReportReady: boolean;
  isDownloading?: boolean;
}
```

**Styling Pattern:**
```tsx
<button
  onClick={onAnalyticsClick}
  className="text-ferrari-white hover:text-ferrari-red transition-colors duration-200 
             font-medium text-xs sm:text-sm md:text-base whitespace-nowrap 
             focus:outline-none focus:ring-2 focus:ring-ferrari-red 
             focus:ring-offset-2 focus:ring-offset-ferrari-black rounded"
  aria-label="View analytics"
>
  <span className="hidden sm:inline">Analytics</span>
  <span className="sm:hidden">Analytics</span>
</button>
```

### 2. App Component (Modified)

**File:** `src/App.tsx`

**Changes:**
- Add `isAnalyticsView` state
- Add `handleAnalyticsClick` handler
- Conditionally render AppLayout or AnalyticsView

**Key Logic:**
```typescript
const [isAnalyticsView, setIsAnalyticsView] = useState(false);

const handleAnalyticsClick = () => {
  setIsAnalyticsView(true);
};

const handleExitAnalytics = () => {
  setIsAnalyticsView(false);
};

return (
  <>
    <Navbar 
      onAnalyticsClick={handleAnalyticsClick}
      // ... other props
    />
    {isAnalyticsView ? (
      <AnalyticsView onExit={handleExitAnalytics} />
    ) : (
      <AppLayout>
        {/* existing layout */}
      </AppLayout>
    )}
  </>
);
```


### 3. AnalyticsView Component (New)

**File:** `src/components/AnalyticsView.tsx`

**Purpose:** Main container for analytics interface

**Interface:**
```typescript
interface AnalyticsViewProps {
  onExit?: () => void;
}
```

**Layout Structure:**
```tsx
<div className="w-full h-screen bg-ferrari-black text-ferrari-white font-formula overflow-hidden">
  <div className="h-full grid grid-cols-1 lg:grid-cols-[300px_1fr]">
    {/* Sidebar */}
    <AnalyticsSidebar />
    
    {/* Main Content */}
    <div className="overflow-y-auto">
      <AnalyticsContent />
    </div>
  </div>
</div>
```

### 4. AnalyticsSidebar Component (New)

**File:** `src/components/analytics/AnalyticsSidebar.tsx`

**Purpose:** Configuration panel for race selection and visualization options

**Features:**
- Year selector (dropdown)
- Grand Prix selector (dropdown)
- Load Race Data button
- Driver selector (populated after data load)
- Stint selector (populated after driver selection)
- Visualization toggles (checkboxes)

**Styling:**
- Background: `bg-ferrari-graphite`
- Border: `border-r border-ferrari-black`
- Inputs: Ferrari-red accents on focus
- Buttons: Ferrari-red primary, graphite secondary

**Interface:**
```typescript
interface AnalyticsSidebarProps {
  // No props - uses store directly
}
```

### 5. AnalyticsContent Component (New)

**File:** `src/components/analytics/AnalyticsContent.tsx`

**Purpose:** Main content area displaying metrics, tabs, and visualizations

**Conditional Rendering:**
- No data loaded: Show welcome message with instructions
- Data loading: Show loading spinner with progress message
- Error state: Show error message with retry button
- Data ready: Show metrics bar, tabs, and visualizations

**Interface:**
```typescript
interface AnalyticsContentProps {
  // No props - uses store directly
}
```


### 6. MetricsBar Component (New)

**File:** `src/components/analytics/MetricsBar.tsx`

**Purpose:** Display key stint metrics in a horizontal bar

**Layout:**
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 p-4 
                bg-ferrari-graphite border-b border-ferrari-black">
  <MetricCard label="Compound" value={compound} icon="🛞" />
  <MetricCard label="Stint Length" value={`${laps} laps`} icon="📏" />
  <MetricCard label="Avg Deg." value={`${avgDeg}s`} icon="⏱️" />
  <MetricCard label="Fuel Effect" value={`+${fuelEffect}s`} icon="⛽" />
  <MetricCard label="Optimal Pit" value={`Lap ${pitLap}`} icon="🏁" />
</div>
```

**Interface:**
```typescript
interface MetricsBarProps {
  compound: string;
  stintLength: number;
  avgDegradation: number;
  fuelEffect: number;
  optimalPitLap: number;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: string;
}
```

### 7. TabPanel Component (New)

**File:** `src/components/analytics/TabPanel.tsx`

**Purpose:** Tabbed interface for different visualization categories

**Tabs:**
1. Degradation Curve (default)
2. Fuel Impact
3. Telemetry
4. Data Table

**Styling:**
- Active tab: `bg-ferrari-red text-ferrari-white`
- Inactive tab: `bg-ferrari-graphite text-ferrari-white hover:bg-ferrari-red/20`
- Tab content: Full width, scrollable

**Interface:**
```typescript
interface TabPanelProps {
  stintData: StintAnalysis;
  driverName: string;
  compound: string;
  showSimpleDegradation: boolean;
  showFuelImpact: boolean;
}
```


### 8. Chart Components (New)

**Files:** `src/components/analytics/charts/`

**DegradationChart.tsx**
- Uses Plotly.js or Recharts for interactive line charts
- Three series: Actual (red), Predicted (cyan), Simple (orange, optional)
- Horizontal threshold line at 2.0s
- Dark theme with Ferrari colors
- Responsive sizing

**FuelImpactChart.tsx**
- Bar chart showing fuel correction per lap
- Light blue bars with value labels
- Dark theme

**TelemetryCharts.tsx**
- 2x2 grid of line charts
- Speed (cyan), Throttle (green), Braking (red), RPM (orange)
- Shared x-axis (Tyre Life)

**ThermalCharts.tsx**
- Multiple line charts for temperature data
- Tyre temps, brake temps, ERS, power unit temps
- Color-coded by component

**Interface:**
```typescript
interface DegradationChartProps {
  data: DegradationData[];
  driverName: string;
  compound: string;
  showSimple: boolean;
}

interface FuelImpactChartProps {
  data: FuelCorrectionData[];
}

interface TelemetryChartsProps {
  data: TelemetryData[];
}

interface ThermalChartsProps {
  data: ThermalData[];
  chartType: 'tyre' | 'brake' | 'ers' | 'powerunit';
}
```


### 9. DataTable Component (New)

**File:** `src/components/analytics/DataTable.tsx`

**Purpose:** Display lap-by-lap data in tabular format with export capability

**Features:**
- Sortable columns
- Horizontal scroll on mobile
- Sticky header
- CSV export button

**Styling:**
- Header: `bg-ferrari-graphite text-ferrari-white`
- Rows: Alternating `bg-ferrari-black` and `bg-ferrari-graphite/50`
- Hover: `hover:bg-ferrari-red/10`

**Interface:**
```typescript
interface DataTableProps {
  data: LapData[];
  driverName: string;
  raceName: string;
  year: number;
  stint: number;
}

interface LapData {
  lapNumber: number;
  tyreLife: number;
  lapTime: string;
  enhancedDegradation: number;
  simpleDegradation: number;
  fuelCorrection: number;
  predictedDegradation: number;
  speedMean?: number;
  throttleMean?: number;
  brakePercent?: number;
  rpmMean?: number;
}
```

### 10. StrategyRecommendations Component (New)

**File:** `src/components/analytics/StrategyRecommendations.tsx`

**Purpose:** Display strategic insights and pit recommendations

**Layout:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
  <div className="bg-ferrari-graphite p-4 rounded">
    <h3>Degradation Analysis</h3>
    {maxDeg < 1.5 ? (
      <div className="text-green-500">✓ Low degradation - extend stint</div>
    ) : maxDeg < 3.0 ? (
      <div className="text-yellow-500">⚠️ Moderate degradation - monitor</div>
    ) : (
      <div className="text-red-500">❌ High degradation - pit ASAP</div>
    )}
  </div>
  
  <div className="bg-ferrari-graphite p-4 rounded">
    <h3>Pit Window</h3>
    <div className="text-ferrari-red text-2xl">Lap {optimalPitLap}</div>
    <p className="text-sm">Based on 2.0s degradation threshold</p>
  </div>
</div>
```

**Interface:**
```typescript
interface StrategyRecommendationsProps {
  maxDegradation: number;
  optimalPitLap: number;
  fuelCorrectionImpact: number;
}
```


## Data Models

### Core Data Types

```typescript
// Analytics Store Types
export interface StintAnalysis {
  stintNumber: number;
  compound: string;
  laps: LapAnalysis[];
  metrics: StintMetrics;
  degradationCurve: DegradationPoint[];
  telemetry: TelemetryStats[];
  thermal: ThermalData[];
}

export interface LapAnalysis {
  lapNumber: number;
  tyreLife: number;
  lapTime: number; // seconds
  lapTimeFormatted: string;
  fuelCorrection: number;
  fuelCorrectedTime: number;
  enhancedDegradation: number;
  simpleDegradation: number;
  predictedDegradation: number;
  telemetry: LapTelemetry;
  synthetic: SyntheticSensorData;
}

export interface StintMetrics {
  compound: string;
  stintLength: number;
  avgDegradation: number;
  maxDegradation: number;
  totalFuelEffect: number;
  optimalPitLap: number;
}

export interface DegradationPoint {
  tyreLife: number;
  actual: number;
  predicted: number;
  simple: number;
  fuelCorrection: number;
}

export interface LapTelemetry {
  speedMean: number;
  speedMax: number;
  speedStd: number;
  rpmMean: number;
  rpmMax: number;
  throttleMean: number;
  throttleMax: number;
  throttleStd: number;
  nGearMean: number;
  nGearMax: number;
  brakePercent: number;
  brakeCount: number;
}

export interface SyntheticSensorData {
  tyreTempFL: number;
  tyreTempFR: number;
  tyreTempRL: number;
  tyreTempRR: number;
  tyrePressureFL: number;
  tyrePressureFR: number;
  tyrePressureRL: number;
  tyrePressureRR: number;
  brakeTempFL: number;
  brakeTempFR: number;
  brakeTempRL: number;
  brakeTempRR: number;
  iceTemperature: number;
  oilTemp: number;
  coolantTemp: number;
  mguhTemp: number;
  mgukTemp: number;
  ersDeploymentRatio: number;
  batterySoc: number;
  sidepodTempLeft: number;
  sidepodTempRight: number;
  floorTemp: number;
  brakeDuctTemp: number;
  lateralGLoad: number;
  longitudinalGLoad: number;
  tyreWearIndex: number;
}

export interface ThermalData {
  tyreLife: number;
  tyreTempFL: number;
  tyreTempFR: number;
  tyreTempRL: number;
  tyreTempRR: number;
  brakeTempFL: number;
  brakeTempFR: number;
  brakeTempRL: number;
  brakeTempRR: number;
  ersDeploymentRatio: number;
  batterySoc: number;
  iceTemperature: number;
  oilTemp: number;
  coolantTemp: number;
  mguhTemp: number;
  mgukTemp: number;
}

export interface TelemetryStats {
  tyreLife: number;
  speedMean: number;
  throttleMean: number;
  brakePercent: number;
  rpmMean: number;
}
```


## Backend Integration

### FastF1 API Service

Since FastF1 is a Python library, we need a backend service to provide race data to the React frontend.

**Option 1: Python Backend Service (Recommended)**

Create a separate Python Flask/FastAPI service that wraps FastF1 functionality:

**Endpoints:**
- `GET /api/analytics/races?year={year}` - List available races for a year
- `GET /api/analytics/race-data?year={year}&race={race}` - Load race session and laps
- `GET /api/analytics/telemetry?year={year}&race={race}&driver={driver}&stint={stint}` - Get telemetry for specific stint
- `POST /api/analytics/predict` - Run ML prediction on stint data

**Service Structure:**
```
backend/
├── analytics_service/
│   ├── __init__.py
│   ├── app.py (Flask/FastAPI app)
│   ├── fastf1_wrapper.py (FastF1 integration)
│   ├── ml_model.py (Model loading and prediction)
│   ├── degradation_calculator.py (Fuel correction logic)
│   └── synthetic_sensors.py (Synthetic data generation)
├── models/
│   └── tyre_degradation_model.pkl
├── cache/ (FastF1 cache directory)
└── requirements.txt
```

**Option 2: Pre-computed Data (Alternative)**

If real-time FastF1 access is not feasible:
- Pre-compute race data for supported races
- Store as JSON files in `public/analytics-data/`
- Load via fetch() in frontend
- Trade-off: Limited to pre-computed races, but no backend needed

**Chosen Approach:** Option 1 (Python Backend Service)
- Provides flexibility for real-time data
- Supports ML model inference
- Allows future expansion (more races, live data)


## Error Handling

### Error States

1. **Network Errors**
   - Display: "Unable to connect to analytics service"
   - Action: Retry button
   - Styling: Red border, error icon

2. **Data Loading Errors**
   - Display: "Failed to load race data: {error message}"
   - Action: Change race selection or retry
   - Styling: Yellow warning banner

3. **Model Prediction Errors**
   - Display: "Prediction unavailable - showing actual data only"
   - Action: Continue with limited functionality
   - Styling: Info banner, hide prediction line

4. **Invalid Selection**
   - Display: "Please select a driver and stint"
   - Action: Highlight required fields
   - Styling: Subtle red border on selectors

### Error Handling Pattern

```typescript
try {
  setIsLoading(true);
  setError(null);
  const data = await fetchRaceData(year, race);
  setRaceData(data);
} catch (error) {
  const errorMessage = error instanceof Error 
    ? error.message 
    : 'An unexpected error occurred';
  setError(errorMessage);
  console.error('Analytics error:', error);
} finally {
  setIsLoading(false);
}
```

### Loading States

- **Initial Load**: Spinner with "Loading race data..."
- **Telemetry Processing**: Progress bar with "Analyzing telemetry data..."
- **ML Prediction**: Spinner with "Generating predictions..."


## Testing Strategy

### Unit Tests

**Components to Test:**
1. `AnalyticsSidebar` - Configuration interactions
2. `MetricsBar` - Metric calculations and display
3. `DataTable` - Data formatting and CSV export
4. `StrategyRecommendations` - Degradation categorization logic

**Test Cases:**
- Render with empty state
- Render with populated data
- User interactions (button clicks, dropdown changes)
- Data transformations (lap time formatting, degradation calculations)
- CSV export functionality

### Integration Tests

**Scenarios:**
1. Full analytics workflow: Load race → Select driver → Select stint → View results
2. Visualization toggle interactions
3. Tab switching behavior
4. Error recovery flows

### Visual Regression Tests

**Key Views:**
- Analytics sidebar (empty and populated)
- Metrics bar with various values
- Degradation chart with all series
- Data table with scrolling
- Mobile responsive layouts

### Accessibility Tests

**Requirements:**
- Keyboard navigation through all controls
- Screen reader announcements for state changes
- Focus indicators on all interactive elements
- ARIA labels on charts and data visualizations
- Color contrast compliance (WCAG AA)


## Performance Considerations

### Optimization Strategies

1. **Data Caching**
   - Cache loaded race data in store
   - Avoid re-fetching when switching between drivers/stints
   - Clear cache on race change

2. **Lazy Loading**
   - Load chart libraries only when Analytics view is opened
   - Use React.lazy() for analytics components
   - Code-split analytics bundle from main app

3. **Memoization**
   - Memoize expensive calculations (degradation, predictions)
   - Use useMemo for chart data transformations
   - Use React.memo for chart components

4. **Virtual Scrolling**
   - Implement virtual scrolling for large data tables
   - Render only visible rows
   - Use react-window or similar library

5. **Debouncing**
   - Debounce chart re-renders on window resize
   - Debounce search/filter inputs if added

### Bundle Size Management

- Analytics feature should be code-split
- Chart library (Plotly/Recharts) loaded on-demand
- Target: < 200KB additional bundle size for analytics

### Rendering Performance

- Target: 60fps for chart interactions
- Smooth tab transitions (< 100ms)
- Fast data table rendering (< 500ms for 100 rows)


## Responsive Design

### Breakpoints

Following existing Tailwind config:
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md/lg)
- Desktop: > 1024px (lg+)

### Layout Adaptations

**Mobile (< 640px):**
- Sidebar becomes collapsible drawer
- Metrics bar: 2-column grid
- Charts: Full width, stacked vertically
- Data table: Horizontal scroll
- Tab labels: Icons only

**Tablet (640px - 1024px):**
- Sidebar: Fixed 250px width
- Metrics bar: 3-column grid
- Charts: Full width
- Data table: Horizontal scroll
- Tab labels: Full text

**Desktop (> 1024px):**
- Sidebar: Fixed 300px width
- Metrics bar: 5-column grid
- Charts: Optimized aspect ratios
- Data table: Full width, no scroll
- Tab labels: Full text with icons

### Touch Interactions

- Larger touch targets (min 44x44px)
- Swipe gestures for tab navigation
- Pull-to-refresh for data reload
- Touch-friendly chart interactions


## Design Decisions and Rationales

### 1. Separate View vs. Integrated Panel

**Decision:** Use a separate full-screen view for Analytics

**Rationale:**
- Analytics requires significant screen space for charts and data
- Avoids cluttering the main 3D visualization interface
- Easier to implement without modifying AppLayout
- Clear separation of concerns (inspection vs. analysis)
- Follows single-responsibility principle

### 2. Zustand Store vs. Component State

**Decision:** Create dedicated analytics store

**Rationale:**
- Separates analytics state from main app state
- Prevents interference with existing functionality
- Easier to test and maintain
- Supports future expansion (multiple analytics features)
- Follows existing state management pattern

### 3. Python Backend vs. Frontend-Only

**Decision:** Use Python backend service for FastF1 integration

**Rationale:**
- FastF1 is Python-only, no JavaScript equivalent
- ML model (pickle) requires Python runtime
- Backend can handle heavy computations
- Enables real-time data access
- Supports future ML model updates

### 4. Plotly vs. Recharts for Charts

**Decision:** Use Recharts (React-native charting library)

**Rationale:**
- Better React integration
- Smaller bundle size than Plotly
- Easier to style with Tailwind
- Good performance for our data sizes
- Active maintenance and community

**Alternative:** Plotly.js if advanced interactivity is required

### 5. Tab-Based vs. Scrolling Layout

**Decision:** Use tab-based layout for different visualizations

**Rationale:**
- Reduces initial cognitive load
- Better mobile experience
- Focuses user attention on one analysis at a time
- Easier to navigate
- Follows common analytics dashboard patterns

### 6. Real-Time vs. Cached Data

**Decision:** Cache race data after initial load

**Rationale:**
- FastF1 API can be slow (10-30 seconds)
- Race data doesn't change once loaded
- Better user experience (instant driver/stint switching)
- Reduces API load
- Acceptable memory usage (< 10MB per race)


## Security Considerations

### API Security

1. **Rate Limiting**
   - Limit race data requests to prevent abuse
   - Implement exponential backoff on failures
   - Cache responses to reduce load

2. **Input Validation**
   - Validate year (2023-2024 only)
   - Validate race names against whitelist
   - Sanitize driver names and stint numbers

3. **CORS Configuration**
   - Restrict backend API to known frontend origins
   - Use environment variables for API URLs
   - No credentials in frontend code

### Data Privacy

- No personal user data collected
- Race data is public (from FastF1)
- No tracking or analytics on user interactions
- Local storage only for UI preferences

### Model Security

- ML model file served from backend only
- No model weights exposed to frontend
- Predictions run server-side
- Model versioning for updates

## Accessibility Compliance

### WCAG 2.1 AA Requirements

1. **Perceivable**
   - Color contrast: 4.5:1 for text, 3:1 for UI components
   - Text alternatives for charts (data tables)
   - Captions for chart axes and legends

2. **Operable**
   - Keyboard navigation for all controls
   - Focus indicators (2px ferrari-red outline)
   - No keyboard traps
   - Skip links for long content

3. **Understandable**
   - Clear labels and instructions
   - Error messages with guidance
   - Consistent navigation patterns
   - Predictable behavior

4. **Robust**
   - Valid HTML5 markup
   - ARIA labels and roles
   - Screen reader tested
   - Works with assistive technologies

### Specific Implementations

- Charts: Provide data table alternative
- Dropdowns: ARIA-expanded, aria-haspopup
- Loading states: aria-live regions
- Error messages: role="alert"
- Metrics: aria-label with full context


## Future Enhancements

### Phase 2 Features (Not in Initial Implementation)

1. **Comparison Mode**
   - Compare multiple drivers side-by-side
   - Compare different stints for same driver
   - Overlay degradation curves

2. **Historical Analysis**
   - Track driver performance across races
   - Compound performance trends
   - Team strategy patterns

3. **Advanced Predictions**
   - Predict optimal pit windows for race strategy
   - Weather impact on degradation
   - Tyre life remaining estimates

4. **Export Options**
   - PDF report generation
   - PNG chart exports
   - Share analysis via URL

5. **Real-Time Mode**
   - Live race data integration
   - Real-time degradation tracking
   - Push notifications for critical thresholds

6. **Custom Thresholds**
   - User-defined degradation limits
   - Team-specific strategy rules
   - Compound-specific adjustments

### Technical Debt to Address

- Add comprehensive error boundaries
- Implement retry logic with exponential backoff
- Add telemetry for performance monitoring
- Create Storybook stories for all components
- Add E2E tests with Playwright
- Optimize bundle size further
- Add service worker for offline support

