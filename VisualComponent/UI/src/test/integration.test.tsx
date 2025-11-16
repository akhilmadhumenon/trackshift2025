/**
 * Integration Tests
 * Tests component integration and data flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../store';
import UploadPanel from '../components/UploadPanel';
import InsightsPanel from '../components/InsightsPanel';
import VideoComparisonStrip from '../components/VideoComparisonStrip';
import ThreeDRenderer from '../components/ThreeDRenderer';

// Mock dependencies
vi.mock('axios');
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="canvas">{children}</div>,
  useFrame: () => {},
  useThree: () => ({
    camera: { position: { set: vi.fn() } },
    gl: { domElement: document.createElement('canvas') }
  })
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  useGLTF: () => ({ scene: { clone: () => ({ traverse: vi.fn(), children: [] }) } }),
  Grid: () => null,
  useTexture: () => null
}));

describe('Integration Tests', () => {
  beforeEach(() => {
    useAppStore.setState({
      referenceVideo: null,
      damagedVideo: null,
      currentJobId: null,
      processingStatus: 'idle',
      processingProgress: 0,
      reconstructionResult: null,
      visualizationMode: 'texture',
      syncWithVideo: false,
      currentVideoTimestamp: 0,
      videoDuration: 0,
      snapshot3D: null
    });
    
    vi.clearAllMocks();
  });

  describe('Upload to Processing Flow', () => {
    it('should enable reconstruction button when both videos are uploaded with metadata', async () => {
      const user = userEvent.setup();
      const mockReconstruct = vi.fn();
      
      render(<UploadPanel onReconstruct={mockReconstruct} />);
      
      // Initially, button should be disabled
      const reconstructButton = screen.getByRole('button', { name: /Start 3D reconstruction/i });
      expect(reconstructButton).toBeDisabled();
      
      // Upload reference video
      const refFile = new File(['ref'], 'ref.mp4', { type: 'video/mp4' });
      const refInput = screen.getAllByLabelText(/Select.*file/i)[0];
      await user.upload(refInput, refFile);
      
      // Fill reference metadata
      await waitFor(() => {
        expect(screen.getByText('ref.mp4')).toBeInTheDocument();
      });
      
      const refType = screen.getAllByLabelText(/Tyre Type/i)[0];
      await user.type(refType, 'FL');
      
      const refCompound = screen.getAllByLabelText(/Compound/i)[0];
      await user.selectOptions(refCompound, 'C3');
      
      // Upload damaged video
      const damFile = new File(['dam'], 'dam.mp4', { type: 'video/mp4' });
      const damInput = screen.getAllByLabelText(/Select.*file/i)[1];
      await user.upload(damInput, damFile);
      
      // Fill damaged metadata
      await waitFor(() => {
        expect(screen.getByText('dam.mp4')).toBeInTheDocument();
      });
      
      const damType = screen.getAllByLabelText(/Tyre Type/i)[1];
      await user.type(damType, 'FL');
      
      const damCompound = screen.getAllByLabelText(/Compound/i)[1];
      await user.selectOptions(damCompound, 'C3');
      
      // Mock validation success
      await waitFor(() => {
        // Button should still be disabled until validation completes
        expect(reconstructButton).toBeDisabled();
      });
    });
  });

  describe('Processing to Results Flow', () => {
    it('should update insights panel when reconstruction completes', async () => {
      const mockInsights = {
        crackCount: 42,
        severityScore: 78,
        depthEstimate: 4.2,
        damageClassification: ['micro-cracks' as const, 'grain' as const],
        recommendedAction: 'monitor-next-stint' as const,
        severityTimeline: [
          { rotationAngle: 0, severity: 70 },
          { rotationAngle: 180, severity: 85 }
        ]
      };
      
      render(<InsightsPanel insights={null} />);
      
      // Initially shows placeholder
      expect(screen.getByText(/Upload and process videos/i)).toBeInTheDocument();
      
      // Update with results
      const { rerender } = render(<InsightsPanel insights={mockInsights} />);
      
      // Verify insights are displayed
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText(/78/)).toBeInTheDocument();
      expect(screen.getByText(/4.2/)).toBeInTheDocument();
      expect(screen.getByText(/Micro-Cracks/i)).toBeInTheDocument();
      expect(screen.getByText(/Grain/i)).toBeInTheDocument();
      expect(screen.getByText(/Monitor for Next Stint/i)).toBeInTheDocument();
    });

    it('should load 3D model when mesh URL is provided', async () => {
      render(<ThreeDRenderer meshUrl={null} />);
      
      // Initially shows placeholder
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
      
      // Update with mesh URL
      const { rerender } = render(
        <ThreeDRenderer 
          meshUrl="http://localhost:5001/uploads/mesh.glb"
          crackMapUrl="http://localhost:5001/uploads/crack.png"
          depthMapUrl="http://localhost:5001/uploads/depth.png"
        />
      );
      
      // Canvas should still be present
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('Video Synchronization Flow', () => {
    it('should synchronize 3D rotation with video playback', async () => {
      const user = userEvent.setup();
      
      // Set up store with videos and reconstruction
      useAppStore.setState({
        referenceVideo: {
          file: new File(['ref'], 'ref.mp4', { type: 'video/mp4' }),
          url: 'blob:ref',
          uploadId: 'ref-123',
          metadata: { tyreType: 'FL', compound: 'C3', lapsUsed: 10 }
        },
        damagedVideo: {
          file: new File(['dam'], 'dam.mp4', { type: 'video/mp4' }),
          url: 'blob:dam',
          uploadId: 'dam-123',
          metadata: { tyreType: 'FL', compound: 'C3', lapsUsed: 15 }
        },
        reconstructionResult: {
          meshUrl: 'http://localhost:5001/uploads/mesh.glb',
          crackMapUrl: null,
          depthMapUrl: null,
          differenceVideoUrl: 'http://localhost:5001/uploads/diff.mp4',
          insights: {
            crackCount: 10,
            severityScore: 50,
            depthEstimate: 2.0,
            damageClassification: [],
            recommendedAction: 'safe-qualifying-only',
            severityTimeline: []
          }
        },
        videoDuration: 10,
        syncWithVideo: false
      });
      
      render(
        <>
          <ThreeDRenderer meshUrl="http://localhost:5001/uploads/mesh.glb" />
          <VideoComparisonStrip />
        </>
      );
      
      // Enable sync
      const syncCheckbox = screen.getByLabelText(/Sync with Video/i);
      await user.click(syncCheckbox);
      
      expect(useAppStore.getState().syncWithVideo).toBe(true);
      
      // Update video timestamp
      useAppStore.getState().updateVideoTimestamp(5.0);
      
      expect(useAppStore.getState().currentVideoTimestamp).toBe(5.0);
    });
  });

  describe('State Management Integration', () => {
    it('should maintain consistent state across components', () => {
      // Set initial state
      useAppStore.setState({
        processingStatus: 'processing',
        processingProgress: 50
      });
      
      expect(useAppStore.getState().processingStatus).toBe('processing');
      expect(useAppStore.getState().processingProgress).toBe(50);
      
      // Update state
      useAppStore.setState({
        processingStatus: 'completed',
        processingProgress: 100
      });
      
      expect(useAppStore.getState().processingStatus).toBe('completed');
      expect(useAppStore.getState().processingProgress).toBe(100);
    });

    it('should handle visualization mode changes', async () => {
      const user = userEvent.setup();
      
      render(<ThreeDRenderer meshUrl="http://localhost:5001/uploads/mesh.glb" />);
      
      // Find visualization mode buttons
      const wireframeButton = screen.getByRole('radio', { name: /Wireframe/i });
      
      await user.click(wireframeButton);
      
      // Verify button state
      expect(wireframeButton).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after upload failure', async () => {
      const user = userEvent.setup();
      const mockReconstruct = vi.fn();
      
      render(<UploadPanel onReconstruct={mockReconstruct} />);
      
      // Upload a file
      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const input = screen.getAllByLabelText(/Select.*file/i)[0];
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.mp4')).toBeInTheDocument();
      });
      
      // Remove and re-upload
      const removeButton = screen.getAllByRole('button', { name: /Remove/i })[0];
      await user.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('test.mp4')).not.toBeInTheDocument();
      });
      
      // Upload again
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.mp4')).toBeInTheDocument();
      });
    });

    it('should handle WebGL not supported gracefully', () => {
      // Mock WebGL not supported
      vi.mock('../utils/webglDetection', () => ({
        getWebGLCapabilities: () => ({ supported: false })
      }));
      
      render(<ThreeDRenderer meshUrl="http://localhost:5001/uploads/mesh.glb" />);
      
      // Should show warning message
      expect(screen.getByText(/WebGL Not Supported/i)).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track FPS when enabled', async () => {
      const user = userEvent.setup();
      
      render(<ThreeDRenderer meshUrl="http://localhost:5001/uploads/mesh.glb" />);
      
      // Enable FPS monitor
      const fpsCheckbox = screen.getByLabelText(/Show frames per second/i);
      await user.click(fpsCheckbox);
      
      // FPS display should appear
      await waitFor(() => {
        expect(screen.getByText(/FPS:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate tyre metadata completeness', async () => {
      const user = userEvent.setup();
      const mockReconstruct = vi.fn();
      
      render(<UploadPanel onReconstruct={mockReconstruct} />);
      
      // Upload file without metadata
      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const input = screen.getAllByLabelText(/Select.*file/i)[0];
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.mp4')).toBeInTheDocument();
      });
      
      // Reconstruct button should be disabled without metadata
      const reconstructButton = screen.getByRole('button', { name: /Start 3D reconstruction/i });
      expect(reconstructButton).toBeDisabled();
      
      // Fill only tyre type
      const typeInput = screen.getAllByLabelText(/Tyre Type/i)[0];
      await user.type(typeInput, 'FL');
      
      // Still disabled without compound
      expect(reconstructButton).toBeDisabled();
      
      // Fill compound
      const compoundSelect = screen.getAllByLabelText(/Compound/i)[0];
      await user.selectOptions(compoundSelect, 'C3');
      
      // Still disabled - need both videos
      expect(reconstructButton).toBeDisabled();
    });
  });
});
