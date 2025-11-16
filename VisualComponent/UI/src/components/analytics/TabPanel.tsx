import React, { useState, useEffect } from 'react';
import { StintAnalysis } from '../../types/analytics';
import DegradationChart from './charts/DegradationChart';
import FuelImpactChart from './charts/FuelImpactChart';
import TelemetryCharts from './charts/TelemetryCharts';
import DataTable from './DataTable';

interface TabPanelProps {
  stintData: StintAnalysis;
  driverName: string;
  compound: string;
  showSimpleDegradation: boolean;
  showFuelImpact: boolean;
  raceName: string;
  year: number;
}

type TabType = 'degradation' | 'fuel' | 'telemetry' | 'data';

interface Tab {
  id: TabType;
  label: string;
  icon: string;
  mobileIcon: string;
}

const tabs: Tab[] = [
  { id: 'degradation', label: 'Degradation Curve', icon: '📈', mobileIcon: '📈' },
  { id: 'fuel', label: 'Fuel Impact', icon: '⛽', mobileIcon: '⛽' },
  { id: 'telemetry', label: 'Telemetry', icon: '📊', mobileIcon: '📊' },
  { id: 'data', label: 'Data Table', icon: '📋', mobileIcon: '📋' },
];

const TabPanel: React.FC<TabPanelProps> = ({
  stintData,
  driverName,
  compound,
  showSimpleDegradation,
  showFuelImpact,
  raceName,
  year,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('degradation');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Keyboard navigation support (arrow keys)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex].id);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        setActiveTab(tabs[prevIndex].id);
      }
    };

    // Only add listener if a tab button has focus
    const tabButtons = document.querySelectorAll('[role="tab"]');
    const hasFocus = Array.from(tabButtons).some(button => 
      document.activeElement === button
    );

    if (hasFocus) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeTab]);

  // Touch gesture handlers for swipe navigation
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    
    if (isLeftSwipe && currentIndex < tabs.length - 1) {
      // Swipe left - go to next tab
      setActiveTab(tabs[currentIndex + 1].id);
    }
    
    if (isRightSwipe && currentIndex > 0) {
      // Swipe right - go to previous tab
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'degradation':
        return (
          <DegradationChart
            data={stintData.degradationCurve}
            driverName={driverName}
            compound={compound}
            showSimple={showSimpleDegradation}
          />
        );
      
      case 'fuel':
        if (!showFuelImpact) {
          return (
            <div className="flex items-center justify-center h-96 text-ferrari-white/70">
              <div className="text-center">
                <p className="text-lg mb-2">Fuel Impact visualization is disabled</p>
                <p className="text-sm">Enable it in the sidebar to view this chart</p>
              </div>
            </div>
          );
        }
        return (
          <FuelImpactChart data={stintData.degradationCurve} />
        );
      
      case 'telemetry':
        if (!stintData.telemetry || stintData.telemetry.length === 0) {
          return (
            <div className="flex items-center justify-center h-96 text-ferrari-white/70">
              <div className="text-center">
                <p className="text-lg mb-2">Telemetry data unavailable</p>
                <p className="text-sm">No telemetry data available for this stint</p>
              </div>
            </div>
          );
        }
        return (
          <TelemetryCharts data={stintData.telemetry} />
        );
      
      case 'data':
        return (
          <DataTable
            stintData={stintData}
            driverName={driverName}
            raceName={raceName}
            year={year}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Tab Navigation */}
      <div
        className="flex border-b border-ferrari-black bg-ferrari-graphite"
        role="tablist"
        aria-label="Analytics tabs"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 px-4 py-3 font-medium text-sm transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-inset
              min-h-[44px] touch-manipulation active:scale-95
              ${
                activeTab === tab.id
                  ? 'bg-ferrari-red text-ferrari-white'
                  : 'bg-ferrari-graphite text-ferrari-white hover:bg-ferrari-red/20 active:bg-ferrari-red/30'
              }
            `}
          >
            {/* Desktop: Icon + Label */}
            <span className="hidden sm:inline">
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </span>
            
            {/* Mobile: Icon only */}
            <span className="sm:hidden flex flex-col items-center">
              <span className="text-xl mb-1">{tab.mobileIcon}</span>
              <span className="text-xs">{tab.label.split(' ')[0]}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content Area */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="flex-1 overflow-y-auto bg-ferrari-black"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {renderTabContent()}
      </div>
    </div>
  );
};

export default TabPanel;
