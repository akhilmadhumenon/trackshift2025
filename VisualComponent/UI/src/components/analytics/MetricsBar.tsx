import React from 'react';
import { StintMetrics } from '../../types/analytics';

interface MetricsBarProps {
  metrics: StintMetrics;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon }) => {
  return (
    <div 
      className="bg-ferrari-black rounded-lg p-4 border border-ferrari-graphite 
                 hover:border-ferrari-red/50 transition-colors duration-200"
      role="article"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span 
          className="text-ferrari-white/70 text-xs sm:text-sm font-medium uppercase tracking-wide"
          aria-hidden="true"
        >
          {label}
        </span>
        <span 
          className="text-2xl" 
          role="img" 
          aria-label={label}
        >
          {icon}
        </span>
      </div>
      <div className="text-ferrari-white text-xl sm:text-2xl font-bold font-formula">
        {value}
      </div>
    </div>
  );
};

const MetricsBar: React.FC<MetricsBarProps> = ({ metrics }) => {
  const {
    compound,
    stintLength,
    avgDegradation,
    totalFuelEffect,
    optimalPitLap,
  } = metrics;

  // Format values for display
  const formattedAvgDeg = avgDegradation.toFixed(3);
  const formattedFuelEffect = totalFuelEffect.toFixed(3);

  return (
    <div 
      className="bg-ferrari-graphite border-b border-ferrari-black p-4"
      role="region"
      aria-label="Stint metrics summary"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard 
          label="Compound" 
          value={compound} 
          icon="🛞" 
        />
        <MetricCard 
          label="Stint Length" 
          value={`${stintLength} laps`} 
          icon="📏" 
        />
        <MetricCard 
          label="Avg Deg." 
          value={`${formattedAvgDeg}s`} 
          icon="⏱️" 
        />
        <MetricCard 
          label="Fuel Effect" 
          value={`+${formattedFuelEffect}s`} 
          icon="⛽" 
        />
        <MetricCard 
          label="Optimal Pit" 
          value={`Lap ${optimalPitLap}`} 
          icon="🏁" 
        />
      </div>
    </div>
  );
};

export default MetricsBar;
