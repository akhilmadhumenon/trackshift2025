import React from 'react';
import { useAnalyticsStore } from '../../store/analyticsStore';
import MetricsBar from './MetricsBar';
import TabPanel from './TabPanel';
import StrategyRecommendations from './StrategyRecommendations';

const AnalyticsContent: React.FC = () => {
  const {
    raceSession,
    stintData,
    isLoading,
    loadingMessage,
    error,
    selectedRace,
    selectedYear,
    selectedDriver,
    showSimpleDegradation,
    showFuelImpact,
    loadRaceData,
  } = useAnalyticsStore();

  // Welcome message when no data is loaded
  if (!raceSession && !isLoading && !error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold text-ferrari-red mb-4">
            F1 Tyre Degradation Predictor
          </h1>
          <p className="text-ferrari-white text-lg mb-6">
            Analyze F1 race data with ML-powered pit strategy recommendations and fuel-corrected telemetry analysis.
          </p>
          <div className="bg-ferrari-graphite rounded-lg p-6 text-left">
            <h2 className="text-xl font-semibold text-ferrari-white mb-4">
              Getting Started
            </h2>
            <ol className="space-y-3 text-ferrari-white">
              <li className="flex items-start">
                <span className="text-ferrari-red font-bold mr-3">1.</span>
                <span>Select a year and Grand Prix from the sidebar</span>
              </li>
              <li className="flex items-start">
                <span className="text-ferrari-red font-bold mr-3">2.</span>
                <span>Click "Load Race Data" to fetch race session information</span>
              </li>
              <li className="flex items-start">
                <span className="text-ferrari-red font-bold mr-3">3.</span>
                <span>Choose a driver and stint to analyze</span>
              </li>
              <li className="flex items-start">
                <span className="text-ferrari-red font-bold mr-3">4.</span>
                <span>View degradation curves, telemetry data, and strategic recommendations</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block relative" role="status" aria-label="Loading">
            <svg 
              className="animate-spin h-16 w-16 text-ferrari-red" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p 
            className="text-ferrari-white text-xl mt-4 font-semibold"
            aria-live="polite"
            aria-atomic="true"
          >
            {loadingMessage || 'Loading...'}
          </p>
          <div className="mt-2 text-ferrari-white/70 text-sm" aria-live="polite">
            Please wait while we process your request
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="max-w-md w-full">
          <div 
            className="bg-ferrari-graphite border-2 border-ferrari-red rounded-lg p-6"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center mb-4">
              <svg 
                className="h-8 w-8 text-ferrari-red mr-3" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <h2 className="text-xl font-bold text-ferrari-red">
                Error
              </h2>
            </div>
            <p className="text-ferrari-white mb-6">
              {error}
            </p>
            <button
              onClick={loadRaceData}
              className="w-full bg-ferrari-red text-ferrari-white font-semibold py-2 px-4 rounded 
                         hover:bg-ferrari-red/80 active:bg-ferrari-red/70 transition-colors duration-200 
                         focus:outline-none focus:ring-2 focus:ring-ferrari-red 
                         focus:ring-offset-2 focus:ring-offset-ferrari-graphite
                         min-h-[44px] touch-manipulation"
              aria-label="Retry loading race data"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Data view - race loaded but no stint selected yet
  if (raceSession && !stintData) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-xl">
          <div className="bg-ferrari-graphite rounded-lg p-8" role="status" aria-live="polite">
            <svg 
              className="h-16 w-16 text-ferrari-red mx-auto mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <h2 className="text-2xl font-bold text-ferrari-white mb-3">
              Race Data Loaded
            </h2>
            <p className="text-ferrari-white mb-6">
              {selectedRace} {raceSession.year} session data is ready for analysis.
            </p>
            <div className="bg-ferrari-black rounded p-4 text-left">
              <p className="text-ferrari-white text-sm">
                <span className="text-ferrari-red font-semibold">Next step:</span> Select a driver and stint from the sidebar to view detailed tyre degradation analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Data view with stint analysis
  if (stintData) {
    return (
      <div className="h-full flex flex-col">
        {/* Metrics Bar */}
        <MetricsBar metrics={stintData.metrics} />

        {/* Strategy Recommendations */}
        <div className="px-4 pt-4">
          <StrategyRecommendations metrics={stintData.metrics} />
        </div>

        {/* Tabbed Content Area */}
        <div className="flex-1 overflow-hidden">
          <TabPanel
            stintData={stintData}
            driverName={selectedDriver || 'Unknown'}
            compound={stintData.metrics.compound}
            showSimpleDegradation={showSimpleDegradation}
            showFuelImpact={showFuelImpact}
            raceName={selectedRace}
            year={selectedYear}
          />
        </div>
      </div>
    );
  }

  return null;
};

export default AnalyticsContent;
