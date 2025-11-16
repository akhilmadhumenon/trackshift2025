import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import InsightsPanel from './InsightsPanel';
import { TyreInsights, DamageType, RecommendedAction } from '../types';

describe('InsightsPanel', () => {
  describe('Empty State', () => {
    it('should display empty state when no insights are provided', () => {
      render(<InsightsPanel insights={null} />);

      expect(screen.getByText('AI Insights')).toBeInTheDocument();
      expect(screen.getByText('Upload and process videos to see insights')).toBeInTheDocument();
    });
  });

  describe('Metric Display Formatting', () => {
    it('should display crack count correctly', () => {
      const insights: TyreInsights = {
        crackCount: 42,
        severityScore: 35,
        depthEstimate: 2.5,
        damageClassification: [],
        recommendedAction: 'safe-qualifying-only',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('Crack Count')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Total detected cracks')).toBeInTheDocument();
    });

    it('should display severity score with low severity styling', () => {
      const insights: TyreInsights = {
        crackCount: 10,
        severityScore: 35,
        depthEstimate: 1.2,
        damageClassification: [],
        recommendedAction: 'safe-qualifying-only',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('Severity Score')).toBeInTheDocument();
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('/100')).toBeInTheDocument();
      expect(screen.getByText('Low severity')).toBeInTheDocument();
      
      const scoreElement = screen.getByText('35');
      expect(scoreElement).toHaveClass('text-green-500');
    });

    it('should display severity score with moderate severity styling', () => {
      const insights: TyreInsights = {
        crackCount: 50,
        severityScore: 65,
        depthEstimate: 3.5,
        damageClassification: [],
        recommendedAction: 'monitor-next-stint',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('65')).toBeInTheDocument();
      expect(screen.getByText('Moderate severity')).toBeInTheDocument();
      
      const scoreElement = screen.getByText('65');
      expect(scoreElement).toHaveClass('text-yellow-500');
    });

    it('should display severity score with high severity styling', () => {
      const insights: TyreInsights = {
        crackCount: 120,
        severityScore: 85,
        depthEstimate: 5.8,
        damageClassification: [],
        recommendedAction: 'replace-immediately',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('High severity')).toBeInTheDocument();
      
      const scoreElement = screen.getByText('85');
      expect(scoreElement).toHaveClass('text-ferrari-red');
    });

    it('should display depth estimate with correct formatting', () => {
      const insights: TyreInsights = {
        crackCount: 25,
        severityScore: 45,
        depthEstimate: 3.456789,
        damageClassification: [],
        recommendedAction: 'safe-qualifying-only',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('Depth Estimate')).toBeInTheDocument();
      expect(screen.getByText('3.46')).toBeInTheDocument();
      expect(screen.getByText('mm')).toBeInTheDocument();
      expect(screen.getByText('Maximum depth detected')).toBeInTheDocument();
    });

    it('should format depth estimate to two decimal places', () => {
      const insights: TyreInsights = {
        crackCount: 15,
        severityScore: 30,
        depthEstimate: 1.1,
        damageClassification: [],
        recommendedAction: 'safe-qualifying-only',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('1.10')).toBeInTheDocument();
    });
  });

  describe('Damage Badge Rendering', () => {
    it('should not display damage classification section when no damage types are present', () => {
      const insights: TyreInsights = {
        crackCount: 5,
        severityScore: 20,
        depthEstimate: 0.8,
        damageClassification: [],
        recommendedAction: 'safe-qualifying-only',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.queryByText('Damage Classification')).not.toBeInTheDocument();
    });

    it('should display single damage type badge', () => {
      const insights: TyreInsights = {
        crackCount: 30,
        severityScore: 55,
        depthEstimate: 2.8,
        damageClassification: ['blistering'],
        recommendedAction: 'monitor-next-stint',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('Damage Classification')).toBeInTheDocument();
      expect(screen.getByText('Blistering')).toBeInTheDocument();
      expect(screen.getByText('1 damage type detected')).toBeInTheDocument();
    });

    it('should display multiple damage type badges', () => {
      const insights: TyreInsights = {
        crackCount: 75,
        severityScore: 70,
        depthEstimate: 4.2,
        damageClassification: ['blistering', 'micro-cracks', 'grain'],
        recommendedAction: 'monitor-next-stint',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('Blistering')).toBeInTheDocument();
      expect(screen.getByText('Micro-Cracks')).toBeInTheDocument();
      expect(screen.getByText('Grain')).toBeInTheDocument();
      expect(screen.getByText('3 damage types detected')).toBeInTheDocument();
    });

    it('should display all damage type badges with correct formatting', () => {
      const allDamageTypes: DamageType[] = [
        'blistering',
        'micro-cracks',
        'grain',
        'cuts',
        'flat-spots',
        'chunking',
      ];

      const insights: TyreInsights = {
        crackCount: 150,
        severityScore: 95,
        depthEstimate: 6.5,
        damageClassification: allDamageTypes,
        recommendedAction: 'replace-immediately',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('Blistering')).toBeInTheDocument();
      expect(screen.getByText('Micro-Cracks')).toBeInTheDocument();
      expect(screen.getByText('Grain')).toBeInTheDocument();
      expect(screen.getByText('Cuts')).toBeInTheDocument();
      expect(screen.getByText('Flat Spots')).toBeInTheDocument();
      expect(screen.getByText('Chunking')).toBeInTheDocument();
      expect(screen.getByText('6 damage types detected')).toBeInTheDocument();
    });

    it('should apply Ferrari red styling to damage badges', () => {
      const insights: TyreInsights = {
        crackCount: 40,
        severityScore: 60,
        depthEstimate: 3.0,
        damageClassification: ['cuts'],
        recommendedAction: 'monitor-next-stint',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      const badge = screen.getByText('Cuts');
      expect(badge).toHaveClass('bg-ferrari-red');
      expect(badge).toHaveClass('text-ferrari-white');
    });
  });

  describe('Recommended Actions Display', () => {
    it('should not display recommended action section when action is not provided', () => {
      const insights: TyreInsights = {
        crackCount: 10,
        severityScore: 25,
        depthEstimate: 1.5,
        damageClassification: [],
        recommendedAction: null as any,
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.queryByText('Recommended Action')).not.toBeInTheDocument();
    });

    it('should display "Replace Immediately" action with correct styling', () => {
      const insights: TyreInsights = {
        crackCount: 150,
        severityScore: 92,
        depthEstimate: 7.2,
        damageClassification: ['chunking', 'cuts'],
        recommendedAction: 'replace-immediately',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('Recommended Action')).toBeInTheDocument();
      expect(screen.getByText('Replace Immediately')).toBeInTheDocument();
      expect(screen.getByText('Based on severity analysis')).toBeInTheDocument();
      
      const actionText = screen.getByText('Replace Immediately');
      expect(actionText).toHaveClass('text-ferrari-red');
      
      // Check for warning icon
      expect(screen.getByRole('img', { name: 'status-icon' })).toHaveTextContent('⚠️');
    });

    it('should display "Monitor for Next Stint" action with correct styling', () => {
      const insights: TyreInsights = {
        crackCount: 60,
        severityScore: 65,
        depthEstimate: 3.8,
        damageClassification: ['grain', 'micro-cracks'],
        recommendedAction: 'monitor-next-stint',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('Monitor for Next Stint')).toBeInTheDocument();
      
      const actionText = screen.getByText('Monitor for Next Stint');
      expect(actionText).toHaveClass('text-yellow-500');
      
      // Check for info icon
      expect(screen.getByRole('img', { name: 'status-icon' })).toHaveTextContent('ℹ️');
    });

    it('should display "Safe for Qualifying Laps Only" action with correct styling', () => {
      const insights: TyreInsights = {
        crackCount: 20,
        severityScore: 35,
        depthEstimate: 1.8,
        damageClassification: ['grain'],
        recommendedAction: 'safe-qualifying-only',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('Safe for Qualifying Laps Only')).toBeInTheDocument();
      
      const actionText = screen.getByText('Safe for Qualifying Laps Only');
      expect(actionText).toHaveClass('text-green-500');
      
      // Check for success icon
      expect(screen.getByRole('img', { name: 'status-icon' })).toHaveTextContent('✓');
    });
  });

  describe('Timeline Graph Data Visualization', () => {
    it('should not display timeline graph when severityTimeline is empty', () => {
      const insights: TyreInsights = {
        crackCount: 20,
        severityScore: 40,
        depthEstimate: 2.0,
        damageClassification: [],
        recommendedAction: 'safe-qualifying-only',
        severityTimeline: [],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.queryByText('Severity Timeline')).not.toBeInTheDocument();
    });

    it('should display timeline graph when severityTimeline has data', () => {
      const insights: TyreInsights = {
        crackCount: 50,
        severityScore: 60,
        depthEstimate: 3.2,
        damageClassification: ['grain'],
        recommendedAction: 'monitor-next-stint',
        severityTimeline: [
          { rotationAngle: 0, severity: 45 },
          { rotationAngle: 90, severity: 60 },
          { rotationAngle: 180, severity: 55 },
          { rotationAngle: 270, severity: 50 },
        ],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('Severity Timeline')).toBeInTheDocument();
      expect(screen.getByText('Severity distribution across tyre rotation')).toBeInTheDocument();
    });

    it('should render timeline graph with multiple data points', () => {
      const insights: TyreInsights = {
        crackCount: 75,
        severityScore: 70,
        depthEstimate: 4.5,
        damageClassification: ['blistering', 'micro-cracks'],
        recommendedAction: 'monitor-next-stint',
        severityTimeline: [
          { rotationAngle: 0, severity: 40 },
          { rotationAngle: 60, severity: 55 },
          { rotationAngle: 120, severity: 70 },
          { rotationAngle: 180, severity: 75 },
          { rotationAngle: 240, severity: 65 },
          { rotationAngle: 300, severity: 50 },
          { rotationAngle: 360, severity: 45 },
        ],
      };

      render(<InsightsPanel insights={insights} />);

      expect(screen.getByText('Severity Timeline')).toBeInTheDocument();
    });
  });

  describe('Complete Insights Display', () => {
    it('should display all metrics and sections together', () => {
      const insights: TyreInsights = {
        crackCount: 85,
        severityScore: 72,
        depthEstimate: 4.56,
        damageClassification: ['blistering', 'micro-cracks', 'cuts'],
        recommendedAction: 'monitor-next-stint',
        severityTimeline: [
          { rotationAngle: 0, severity: 45 },
          { rotationAngle: 90, severity: 72 },
          { rotationAngle: 180, severity: 68 },
          { rotationAngle: 270, severity: 55 },
        ],
      };

      render(<InsightsPanel insights={insights} />);

      // Check all main sections are present
      expect(screen.getByText('AI Insights')).toBeInTheDocument();
      expect(screen.getByText('Crack Count')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('Severity Score')).toBeInTheDocument();
      expect(screen.getByText('72')).toBeInTheDocument();
      expect(screen.getByText('Depth Estimate')).toBeInTheDocument();
      expect(screen.getByText('4.56')).toBeInTheDocument();
      expect(screen.getByText('Damage Classification')).toBeInTheDocument();
      expect(screen.getByText('Blistering')).toBeInTheDocument();
      expect(screen.getByText('Micro-Cracks')).toBeInTheDocument();
      expect(screen.getByText('Cuts')).toBeInTheDocument();
      expect(screen.getByText('Recommended Action')).toBeInTheDocument();
      expect(screen.getByText('Monitor for Next Stint')).toBeInTheDocument();
      expect(screen.getByText('Severity Timeline')).toBeInTheDocument();
    });
  });
});
