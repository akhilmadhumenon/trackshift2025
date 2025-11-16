import React, { useState } from 'react';
import AnalyticsSidebar from './analytics/AnalyticsSidebar';
import AnalyticsContent from './analytics/AnalyticsContent';

interface AnalyticsViewProps {
  onExit?: () => void;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="w-full h-screen bg-ferrari-black text-ferrari-white font-formula overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 bg-ferrari-red text-ferrari-white p-3 rounded-lg 
                   shadow-lg hover:bg-ferrari-red/80 transition-colors duration-200
                   focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-2 
                   focus:ring-offset-ferrari-black min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={isSidebarOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
        aria-expanded={isSidebarOpen}
        aria-controls="analytics-sidebar"
      >
        {isSidebarOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      <div className="h-full grid grid-cols-1 md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr]">
        {/* Sidebar - Desktop: always visible, Mobile/Tablet: drawer */}
        <div
          id="analytics-sidebar"
          className={`
            fixed md:relative inset-y-0 left-0 z-40 w-[280px] md:w-auto
            transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
          role="navigation"
          aria-label="Analytics configuration sidebar"
        >
          <AnalyticsSidebar onClose={closeSidebar} />
        </div>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}
        
        {/* Main Content */}
        <div className="overflow-y-auto">
          <AnalyticsContent />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
