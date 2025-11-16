import React from 'react';
import { StintMetrics } from '../../types/analytics';

interface StrategyRecommendationsProps {
  metrics: StintMetrics;
}

type DegradationLevel = 'low' | 'moderate' | 'high';

interface DegradationCategory {
  level: DegradationLevel;
  color: string;
  bgColor: string;
  icon: string;
  title: string;
  message: string;
}

const StrategyRecommendations: React.FC<StrategyRecommendationsProps> = ({ metrics }) => {
  const { maxDegradation, optimalPitLap, totalFuelEffect } = metrics;

  // Categorize degradation level based on max degradation
  const getDegradationCategory = (maxDeg: number): DegradationCategory => {
    if (maxDeg < 1.5) {
      return {
        level: 'low',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10 border-green-500/30',
        icon: '✓',
        title: 'Low Degradation',
        message: 'Tyres are performing well. Consider extending the stint to maximize track position and minimize pit stops.',
      };
    } else if (maxDeg < 3.0) {
      return {
        level: 'moderate',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10 border-yellow-500/30',
        icon: '⚠️',
        title: 'Moderate Degradation',
        message: 'Tyre performance is declining. Monitor lap times closely and prepare for pit stop within the optimal window.',
      };
    } else {
      return {
        level: 'high',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10 border-red-500/30',
        icon: '❌',
        title: 'High Degradation',
        message: 'Critical tyre wear detected. Immediate pit stop recommended to avoid significant time loss and potential safety concerns.',
      };
    }
  };

  const category = getDegradationCategory(maxDegradation);

  return (
    <div 
      className="p-4 space-y-4"
      role="region"
      aria-label="Strategy recommendations"
    >
      <h3 className="text-xl font-bold text-ferrari-white mb-4">
        Strategic Recommendations
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Degradation Analysis Card */}
        <div 
          className={`${category.bgColor} border rounded-lg p-6 transition-all duration-200`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start mb-3">
            <span 
              className={`${category.color} text-3xl mr-3`}
              role="img"
              aria-label={category.level}
            >
              {category.icon}
            </span>
            <div className="flex-1">
              <h4 className={`${category.color} text-lg font-bold mb-1`}>
                {category.title}
              </h4>
              <p className="text-ferrari-white/90 text-sm leading-relaxed">
                {category.message}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-ferrari-white/10">
            <div className="flex justify-between items-center text-sm">
              <span className="text-ferrari-white/70">Max Degradation:</span>
              <span className={`${category.color} font-bold font-formula`}>
                {maxDegradation.toFixed(3)}s
              </span>
            </div>
          </div>
        </div>

        {/* Pit Window Recommendation Card */}
        <div 
          className="bg-ferrari-graphite border border-ferrari-red/30 rounded-lg p-6"
          role="complementary"
          aria-label="Pit stop recommendation"
        >
          <div className="flex items-start mb-3">
            <span 
              className="text-ferrari-red text-3xl mr-3"
              role="img"
              aria-label="pit stop"
            >
              🏁
            </span>
            <div className="flex-1">
              <h4 className="text-ferrari-red text-lg font-bold mb-1">
                Optimal Pit Window
              </h4>
              <p className="text-ferrari-white/90 text-sm leading-relaxed">
                Based on the 2.0s degradation threshold, the optimal pit stop timing is calculated to maximize performance.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-ferrari-white/10">
            <div className="text-center">
              <div className="text-ferrari-red text-4xl font-bold font-formula mb-1">
                Lap {optimalPitLap}
              </div>
              <div className="text-ferrari-white/70 text-xs uppercase tracking-wide">
                Recommended Pit Lap
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-ferrari-white/10">
            <div className="flex justify-between items-center text-sm">
              <span className="text-ferrari-white/70">Fuel Advantage:</span>
              <span className="text-ferrari-white font-bold font-formula">
                +{totalFuelEffect.toFixed(3)}s
              </span>
            </div>
            <p className="text-ferrari-white/60 text-xs mt-2">
              Total lap time improvement from fuel load reduction over the stint
            </p>
          </div>
        </div>
      </div>

      {/* Additional Context */}
      <div className="bg-ferrari-black border border-ferrari-graphite rounded-lg p-4">
        <div className="flex items-start">
          <span 
            className="text-ferrari-red text-xl mr-3 mt-0.5"
            role="img"
            aria-label="information"
          >
            ℹ️
          </span>
          <div className="flex-1">
            <h5 className="text-ferrari-white font-semibold text-sm mb-2">
              Understanding the Analysis
            </h5>
            <ul className="text-ferrari-white/80 text-xs space-y-1.5 leading-relaxed">
              <li>
                <span className="text-ferrari-red font-semibold">Degradation:</span> Measures tyre performance loss over time, accounting for fuel load effects
              </li>
              <li>
                <span className="text-ferrari-red font-semibold">2.0s Threshold:</span> Industry standard for critical degradation requiring pit stop consideration
              </li>
              <li>
                <span className="text-ferrari-red font-semibold">Fuel Correction:</span> Adjusts lap times for ~0.035s/lap improvement as fuel burns off
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyRecommendations;
