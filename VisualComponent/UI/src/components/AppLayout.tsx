import React from 'react';

interface AppLayoutProps {
  navbar?: React.ReactNode;
  leftPanel?: React.ReactNode;
  centerRenderer?: React.ReactNode;
  rightPanel?: React.ReactNode;
  bottomStrip?: React.ReactNode;
  children?: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  navbar,
  leftPanel,
  centerRenderer,
  rightPanel,
  bottomStrip,
  children 
}) => {
  const [showLeftPanel, setShowLeftPanel] = React.useState(false);
  const [showRightPanel, setShowRightPanel] = React.useState(false);

  return (
    <div className="w-full h-screen bg-ferrari-black text-ferrari-white font-formula overflow-hidden">
      <div className="h-full grid grid-rows-[auto_1fr_auto] md:grid-rows-[auto_1fr_auto] grid-cols-1">
        {/* Navbar - Full width at top */}
        <div className="col-span-1 border-b border-ferrari-graphite">
          {navbar}
        </div>

        {/* Main content area - Responsive grid layout */}
        <div className="relative grid grid-cols-1 md:grid-cols-[1fr] lg:grid-cols-[300px_1fr_350px] gap-0 overflow-hidden">
          {/* Left Panel - Upload controls */}
          <div className={`
            bg-ferrari-graphite border-r border-ferrari-black overflow-y-auto
            absolute md:relative inset-y-0 left-0 z-30 w-80 md:w-auto
            transform transition-transform duration-300 ease-in-out
            ${showLeftPanel ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0 md:block
            lg:static lg:transform-none
          `}>
            <div className="p-4">
              {/* Close button for mobile */}
              <button
                onClick={() => setShowLeftPanel(false)}
                className="md:hidden absolute top-2 right-2 p-2 text-ferrari-white hover:text-ferrari-red"
                aria-label="Close upload panel"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {leftPanel || (
                <div className="text-ferrari-white text-center py-8">
                  Upload Panel
                </div>
              )}
            </div>
          </div>

          {/* Center Renderer - 3D visualization */}
          <div className="bg-ferrari-black relative col-span-1">
            {/* Mobile toggle buttons */}
            <button
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              className="md:hidden lg:hidden absolute top-4 left-4 z-20 p-2 bg-ferrari-graphite border border-ferrari-red rounded text-ferrari-white hover:bg-ferrari-red transition-colors"
              aria-label="Toggle upload panel"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="md:hidden lg:hidden absolute top-4 right-4 z-20 p-2 bg-ferrari-graphite border border-ferrari-red rounded text-ferrari-white hover:bg-ferrari-red transition-colors"
              aria-label="Toggle insights panel"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>

            <div className="w-full h-full flex items-center justify-center">
              {centerRenderer || (
                <div className="text-ferrari-white text-center">
                  3D Renderer
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - AI Insights */}
          <div className={`
            bg-ferrari-graphite border-l border-ferrari-black overflow-y-auto
            absolute md:relative inset-y-0 right-0 z-30 w-80 md:w-auto
            transform transition-transform duration-300 ease-in-out
            ${showRightPanel ? 'translate-x-0' : 'translate-x-full'}
            md:translate-x-0 md:block
            lg:static lg:transform-none
          `}>
            <div className="p-4">
              {/* Close button for mobile */}
              <button
                onClick={() => setShowRightPanel(false)}
                className="md:hidden absolute top-2 left-2 p-2 text-ferrari-white hover:text-ferrari-red"
                aria-label="Close insights panel"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {rightPanel || (
                <div className="text-ferrari-white text-center py-8">
                  AI Insights Panel
                </div>
              )}
            </div>
          </div>

          {/* Overlay for mobile when panels are open */}
          {(showLeftPanel || showRightPanel) && (
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-20"
              onClick={() => {
                setShowLeftPanel(false);
                setShowRightPanel(false);
              }}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Bottom Strip - Video comparison - Responsive height */}
        <div className="col-span-1 h-48 sm:h-56 md:h-64 lg:h-72 bg-ferrari-graphite border-t border-ferrari-black">
          <div className="w-full h-full flex items-center justify-center">
            {bottomStrip || (
              <div className="text-ferrari-white text-center">
                Video Comparison Strip
              </div>
            )}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

export default AppLayout;
