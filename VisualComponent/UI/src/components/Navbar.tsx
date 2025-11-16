import React from 'react';

interface NavbarProps {
  onMeetTeamClick: () => void;
  onDownloadReport: () => void;
  isReportReady: boolean;
  isDownloading?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onMeetTeamClick, 
  onDownloadReport, 
  isReportReady,
  isDownloading = false
}) => {
  return (
    <nav 
      className="bg-ferrari-black px-3 sm:px-4 md:px-6 py-3 md:py-4 flex items-center justify-between"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Title - Responsive sizing */}
      <h1 className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-bold text-ferrari-red font-formula tracking-wide truncate">
        <span className="hidden sm:inline">F1 VISUAL DIFFERENCE ENGINE</span>
        <span className="sm:hidden">F1 VDE</span>
      </h1>

      {/* Navigation Links - Responsive layout */}
      <div className="flex items-center gap-2 sm:gap-4 md:gap-6" role="group" aria-label="Navigation actions">
        {/* Meet the Team Link */}
        <button
          onClick={onMeetTeamClick}
          className="text-ferrari-white hover:text-ferrari-red transition-colors duration-200 font-medium text-xs sm:text-sm md:text-base whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-2 focus:ring-offset-ferrari-black rounded"
          aria-label="Meet the team"
        >
          <span className="hidden sm:inline">Meet the Team</span>
          <span className="sm:hidden">Team</span>
        </button>

        {/* Download Report Button - Responsive sizing */}
        <button
          onClick={onDownloadReport}
          disabled={!isReportReady || isDownloading}
          className={`
            px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded font-medium text-xs sm:text-sm md:text-base transition-all duration-200 flex items-center gap-1 sm:gap-2 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-2 focus:ring-offset-ferrari-black
            ${isReportReady && !isDownloading
              ? 'bg-ferrari-red text-ferrari-white hover:bg-red-700 cursor-pointer' 
              : 'bg-ferrari-graphite text-gray-500 cursor-not-allowed opacity-50'
            }
          `}
          aria-label={isDownloading ? 'Downloading report' : isReportReady ? 'Download inspection report' : 'Report not ready'}
          aria-disabled={!isReportReady || isDownloading}
        >
          {isDownloading ? (
            <>
              <svg 
                className="animate-spin h-3 w-3 sm:h-4 sm:w-4 text-ferrari-white" 
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
              <span className="hidden sm:inline">Downloading...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Download Report</span>
              <span className="sm:hidden">Report</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
