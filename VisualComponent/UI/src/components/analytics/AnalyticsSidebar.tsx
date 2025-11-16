import React from 'react';
import { useAnalyticsStore } from '../../store/analyticsStore';

interface AnalyticsSidebarProps {
  onClose?: () => void;
}

const AnalyticsSidebar: React.FC<AnalyticsSidebarProps> = ({ onClose }) => {
  const {
    selectedYear,
    selectedRace,
    selectedDriver,
    selectedStint,
    isLoading,
    raceSession,
    setConfiguration,
    loadRaceData,
    setDriver,
    setStint,
    showSimpleDegradation,
    showFuelImpact,
    toggleVisualizationOption,
  } = useAnalyticsStore();

  const years = [2023, 2024];
  const races = [
    'Bahrain',
    'Saudi Arabia',
    'Australia',
    'Japan',
    'Monaco',
    'Spain',
    'Canada',
  ];

  // Get drivers from race session data
  const drivers = raceSession?.drivers?.map((d: any) => d.abbreviation) || [];
  
  // Get stints for selected driver from race session
  const stints = selectedDriver && raceSession?.stints?.[selectedDriver] 
    ? raceSession.stints[selectedDriver] 
    : [];

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfiguration(parseInt(e.target.value), selectedRace);
  };

  const handleRaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfiguration(selectedYear, e.target.value);
  };



  const handleLoadRaceData = () => {
    loadRaceData();
    // Close sidebar on mobile after loading data
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  };

  const handleDriverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDriver(e.target.value);
    // Close sidebar on mobile after selection
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  };

  const handleStintChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStint(parseInt(e.target.value));
    // Close sidebar on mobile after selection
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <div className="bg-ferrari-graphite border-r border-ferrari-black p-4 md:p-6 overflow-y-auto h-full">
      {/* Close button for mobile */}
      <div className="flex items-center justify-between mb-6 md:block">
        <h2 className="text-xl md:text-2xl font-bold text-ferrari-red">
          Analytics Configuration
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-ferrari-white hover:text-ferrari-red transition-colors
                       focus:outline-none focus:ring-2 focus:ring-ferrari-red rounded p-1
                       min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Year Selector */}
      <div className="mb-4">
        <label 
          htmlFor="year-select" 
          className="block text-sm font-medium text-ferrari-white mb-2"
        >
          Year
        </label>
        <select
          id="year-select"
          value={selectedYear}
          onChange={handleYearChange}
          disabled={isLoading}
          className="w-full bg-ferrari-black text-ferrari-white border border-ferrari-graphite 
                     rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ferrari-red 
                     focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed
                     min-h-[44px] text-base"
          aria-label="Select year"
        >
          {years.map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Grand Prix Selector */}
      <div className="mb-4">
        <label 
          htmlFor="race-select" 
          className="block text-sm font-medium text-ferrari-white mb-2"
        >
          Grand Prix
        </label>
        <select
          id="race-select"
          value={selectedRace}
          onChange={handleRaceChange}
          disabled={isLoading}
          className="w-full bg-ferrari-black text-ferrari-white border border-ferrari-graphite 
                     rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ferrari-red 
                     focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed
                     min-h-[44px] text-base"
          aria-label="Select Grand Prix"
        >
          <option value="">Select a race...</option>
          {races.map(race => (
            <option key={race} value={race}>
              {race}
            </option>
          ))}
        </select>
      </div>

      {/* Load Race Data Button */}
      <button
        onClick={handleLoadRaceData}
        disabled={!selectedRace || isLoading}
        className="w-full bg-ferrari-red text-ferrari-white font-semibold py-2 px-4 rounded 
                   hover:bg-ferrari-red/80 active:bg-ferrari-red/70 transition-colors duration-200 
                   disabled:opacity-50 disabled:cursor-not-allowed 
                   focus:outline-none focus:ring-2 focus:ring-ferrari-red 
                   focus:ring-offset-2 focus:ring-offset-ferrari-graphite mb-6
                   min-h-[44px] text-base touch-manipulation"
        aria-label="Load race data"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg 
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-ferrari-white" 
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
            Loading...
          </span>
        ) : (
          'Load Race Data'
        )}
      </button>

      {/* Driver Selector */}
      <div className="mb-4">
        <label 
          htmlFor="driver-select" 
          className="block text-sm font-medium text-ferrari-white mb-2"
        >
          Driver
        </label>
        <select
          id="driver-select"
          value={selectedDriver || ''}
          onChange={handleDriverChange}
          disabled={!raceSession || isLoading}
          className="w-full bg-ferrari-black text-ferrari-white border border-ferrari-graphite 
                     rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ferrari-red 
                     focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed
                     min-h-[44px] text-base"
          aria-label="Select driver"
        >
          <option value="">Select a driver...</option>
          {drivers.map(driver => (
            <option key={driver} value={driver}>
              {driver}
            </option>
          ))}
        </select>
      </div>

      {/* Stint Selector */}
      <div className="mb-6">
        <label 
          htmlFor="stint-select" 
          className="block text-sm font-medium text-ferrari-white mb-2"
        >
          Stint
        </label>
        <select
          id="stint-select"
          value={selectedStint || ''}
          onChange={handleStintChange}
          disabled={!selectedDriver || isLoading}
          className="w-full bg-ferrari-black text-ferrari-white border border-ferrari-graphite 
                     rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ferrari-red 
                     focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed
                     min-h-[44px] text-base"
          aria-label="Select stint"
        >
          <option value="">Select a stint...</option>
          {stints.map(stint => (
            <option key={stint} value={stint}>
              Stint {stint}
            </option>
          ))}
        </select>
      </div>

      {/* Visualization Options */}
      <div className="border-t border-ferrari-black pt-6">
        <h3 className="text-lg font-semibold text-ferrari-white mb-4">
          Visualization Options
        </h3>

        {/* Show Simple Degradation Checkbox */}
        <div className="mb-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showSimpleDegradation}
              onChange={() => toggleVisualizationOption('simpleDegradation')}
              className="w-5 h-5 text-ferrari-red bg-ferrari-black border-ferrari-graphite 
                         rounded focus:ring-2 focus:ring-ferrari-red focus:ring-offset-0 
                         cursor-pointer touch-manipulation"
              aria-label="Show simple degradation"
            />
            <span className="ml-2 text-sm text-ferrari-white">
              Show simple degradation
            </span>
          </label>
        </div>

        {/* Show Fuel Impact Checkbox */}
        <div className="mb-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showFuelImpact}
              onChange={() => toggleVisualizationOption('fuelImpact')}
              className="w-5 h-5 text-ferrari-red bg-ferrari-black border-ferrari-graphite 
                         rounded focus:ring-2 focus:ring-ferrari-red focus:ring-offset-0 
                         cursor-pointer touch-manipulation"
              aria-label="Show fuel impact"
            />
            <span className="ml-2 text-sm text-ferrari-white">
              Show fuel impact
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSidebar;
