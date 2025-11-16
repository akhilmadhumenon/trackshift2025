import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TyreInsights, DamageType, RecommendedAction } from '../types';
import SkeletonLoader from './SkeletonLoader';
import { useAppStore } from '../store';

interface InsightsPanelProps {
  insights: TyreInsights | null;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights }) => {
  const processingStatus = useAppStore((state) => state.processingStatus);
  const isProcessing = processingStatus === 'processing' || processingStatus === 'queued';
  
  // Helper function to get severity color
  const getSeverityColor = (score: number): string => {
    if (score < 50) return 'text-green-500';
    if (score >= 50 && score < 80) return 'text-yellow-500';
    return 'text-ferrari-red';
  };

  // Helper function to get severity background color
  const getSeverityBgColor = (score: number): string => {
    if (score < 50) return 'bg-green-500/10 border-green-500';
    if (score >= 50 && score < 80) return 'bg-yellow-500/10 border-yellow-500';
    return 'bg-ferrari-red/10 border-ferrari-red';
  };

  // Helper function to format damage type labels
  const formatDamageType = (type: DamageType): string => {
    const labels: Record<DamageType, string> = {
      'blistering': 'Blistering',
      'micro-cracks': 'Micro-Cracks',
      'grain': 'Grain',
      'cuts': 'Cuts',
      'flat-spots': 'Flat Spots',
      'chunking': 'Chunking'
    };
    return labels[type];
  };

  // Helper function to get recommended action details
  const getActionDetails = (action: RecommendedAction) => {
    const details: Record<RecommendedAction, { text: string; color: string; bgColor: string; icon: string }> = {
      'replace-immediately': {
        text: 'Replace Immediately',
        color: 'text-ferrari-red',
        bgColor: 'bg-ferrari-red/10 border-ferrari-red',
        icon: '⚠️'
      },
      'monitor-next-stint': {
        text: 'Monitor for Next Stint',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10 border-yellow-500',
        icon: 'ℹ️'
      },
      'safe-qualifying-only': {
        text: 'Safe for Qualifying Laps Only',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10 border-green-500',
        icon: '✓'
      }
    };
    return details[action];
  };

  // Show skeleton loaders while processing
  if (isProcessing && !insights) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-ferrari-white mb-4 uppercase tracking-wider">
          AI Insights
        </h2>
        
        {/* Skeleton loaders for metrics */}
        <SkeletonLoader variant="metric" count={3} />
        
        {/* Skeleton loader for badges */}
        <div className="border-2 border-ferrari-graphite bg-ferrari-graphite rounded-lg p-4">
          <div className="h-3 bg-ferrari-black rounded w-1/3 mb-3" />
          <div className="flex flex-wrap gap-2">
            <SkeletonLoader variant="badge" count={4} />
          </div>
        </div>
        
        {/* Skeleton loader for action */}
        <SkeletonLoader variant="card" />
        
        {/* Skeleton loader for graph */}
        <SkeletonLoader variant="graph" />
      </div>
    );
  }
  
  if (!insights) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-ferrari-white mb-4 uppercase tracking-wider">
          AI Insights
        </h2>
        <div className="text-ferrari-white/60 text-center py-8">
          Upload and process videos to see insights
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4" role="region" aria-label="AI Insights Panel">
      <h2 className="text-lg sm:text-xl font-bold text-ferrari-white mb-3 sm:mb-4">AI Insights</h2>

      {/* Crack Count Card - Responsive padding and text */}
      <div 
        className="border-2 border-ferrari-red bg-ferrari-graphite rounded-lg p-3 sm:p-4"
        role="article"
        aria-label="Crack count metric"
      >
        <div className="text-ferrari-white/70 text-xs sm:text-sm uppercase tracking-wide mb-1.5 sm:mb-2">
          Crack Count
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-ferrari-white" aria-live="polite">
          {insights.crackCount}
        </div>
        <div className="text-ferrari-white/50 text-[10px] sm:text-xs mt-1">
          Total detected cracks
        </div>
      </div>

      {/* Severity Score Card - Responsive padding and text */}
      <div 
        className={`border-2 ${getSeverityBgColor(insights.severityScore)} rounded-lg p-3 sm:p-4`}
        role="article"
        aria-label="Severity score metric"
      >
        <div className="text-ferrari-white/70 text-xs sm:text-sm uppercase tracking-wide mb-1.5 sm:mb-2">
          Severity Score
        </div>
        <div className={`text-2xl sm:text-3xl font-bold ${getSeverityColor(insights.severityScore)}`} aria-live="polite">
          <span aria-label={`Severity score ${insights.severityScore} out of 100`}>
            {insights.severityScore}
            <span className="text-base sm:text-lg">/100</span>
          </span>
        </div>
        <div className="text-ferrari-white/50 text-[10px] sm:text-xs mt-1">
          {insights.severityScore < 50 && 'Low severity'}
          {insights.severityScore >= 50 && insights.severityScore < 80 && 'Moderate severity'}
          {insights.severityScore >= 80 && 'High severity'}
        </div>
      </div>

      {/* Depth Estimate Card - Responsive padding and text */}
      <div className="border-2 border-ferrari-red bg-ferrari-graphite rounded-lg p-3 sm:p-4">
        <div className="text-ferrari-white/70 text-xs sm:text-sm uppercase tracking-wide mb-1.5 sm:mb-2">
          Depth Estimate
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-ferrari-white">
          {insights.depthEstimate.toFixed(2)}
          <span className="text-base sm:text-lg ml-1">mm</span>
        </div>
        <div className="text-ferrari-white/50 text-[10px] sm:text-xs mt-1">
          Maximum depth detected
        </div>
      </div>

      {/* Damage Classification Card - Responsive */}
      {insights.damageClassification && insights.damageClassification.length > 0 && (
        <div className="border-2 border-ferrari-red bg-ferrari-graphite rounded-lg p-3 sm:p-4">
          <div className="text-ferrari-white/70 text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3">
            Damage Classification
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {insights.damageClassification.map((damageType) => (
              <span
                key={damageType}
                className="px-2 py-1 sm:px-3 sm:py-1.5 bg-ferrari-red text-ferrari-white text-[10px] sm:text-xs font-semibold rounded-full uppercase tracking-wide border border-ferrari-red hover:bg-ferrari-red/80 active:bg-ferrari-red/80 transition-colors"
              >
                {formatDamageType(damageType)}
              </span>
            ))}
          </div>
          <div className="text-ferrari-white/50 text-[10px] sm:text-xs mt-2 sm:mt-3">
            {insights.damageClassification.length} damage {insights.damageClassification.length === 1 ? 'type' : 'types'} detected
          </div>
        </div>
      )}

      {/* Recommended Action Card - Responsive */}
      {insights.recommendedAction && (
        <div className={`border-2 ${getActionDetails(insights.recommendedAction).bgColor} rounded-lg p-3 sm:p-4`}>
          <div className="text-ferrari-white/70 text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3">
            Recommended Action
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl" role="img" aria-label="status-icon">
              {getActionDetails(insights.recommendedAction).icon}
            </span>
            <div className="flex-1">
              <div className={`text-sm sm:text-lg font-bold ${getActionDetails(insights.recommendedAction).color}`}>
                {getActionDetails(insights.recommendedAction).text}
              </div>
            </div>
          </div>
          <div className="text-ferrari-white/50 text-[10px] sm:text-xs mt-2 sm:mt-3">
            Based on severity analysis
          </div>
        </div>
      )}

      {/* Severity Timeline Graph - Responsive */}
      {insights.severityTimeline && insights.severityTimeline.length > 0 && (
        <div 
          className="border-2 border-ferrari-red bg-ferrari-graphite rounded-lg p-3 sm:p-4"
          role="article"
          aria-label="Severity timeline graph"
        >
          <div className="text-ferrari-white/70 text-xs sm:text-sm uppercase tracking-wide mb-3 sm:mb-4">
            Severity Timeline
          </div>
          <div className="h-48 sm:h-56 md:h-64" role="img" aria-label="Line chart showing severity distribution across tyre rotation from 0 to 360 degrees">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={insights.severityTimeline}
                margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
                aria-label="Severity timeline chart"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="rotationAngle"
                  stroke="#F5F5F5"
                  tick={{ fill: '#F5F5F5', fontSize: 10 }}
                  label={{ value: 'Rotation Angle (°)', position: 'insideBottom', offset: -5, fill: '#F5F5F5', fontSize: 10 }}
                  domain={[0, 360]}
                  ticks={[0, 90, 180, 270, 360]}
                />
                <YAxis
                  stroke="#F5F5F5"
                  tick={{ fill: '#F5F5F5', fontSize: 10 }}
                  label={{ value: 'Severity', angle: -90, position: 'insideLeft', fill: '#F5F5F5', fontSize: 10 }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A1A',
                    border: '2px solid #FF1801',
                    borderRadius: '8px',
                    color: '#F5F5F5',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#F5F5F5', fontWeight: 'bold' }}
                  formatter={(value: number) => [`${value.toFixed(1)}`, 'Severity']}
                  labelFormatter={(label: number) => `Angle: ${label}°`}
                />
                <Line
                  type="monotone"
                  dataKey="severity"
                  stroke="#FF1801"
                  strokeWidth={2}
                  dot={{ fill: '#FF1801', r: 2 }}
                  activeDot={{ r: 4, fill: '#FF1801' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-ferrari-white/50 text-[10px] sm:text-xs mt-2 sm:mt-3">
            Severity distribution across tyre rotation
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsPanel;
