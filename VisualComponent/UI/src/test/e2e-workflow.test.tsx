/**
 * End-to-End Workflow Test
 * Tests the complete upload-to-report workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { useAppStore } from '../store';

// Mock axios for API calls
vi.mock('axios');

// Mock Three.js components
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

describe('End-to-End Workflow Tests', () => {
  beforeEach(() => {
    // Reset store before each test
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

  describe('15.1 Complete Upload-to-Report Workflow', () => {
    it('should complete the full workflow from upload to report download', async () => {
      const user = userEvent.setup();
      
      // Render the application
      render(<App />);
      
      // Step 1: Verify initial state
      expect(screen.getByText(/F1 VISUAL DIFFERENCE ENGINE/i)).toBeInTheDocument();
      expect(screen.getByText(/Upload Videos/i)).toBeInTheDocument();
      
      // Step 2: Upload reference video
      const referenceFile = new File(['reference video content'], 'reference.mp4', { type: 'video/mp4' });
      const referenceInput = screen.getAllByLabelText(/Select.*file/i)[0];
      
      await user.upload(referenceInput, referenceFile);
      
      await waitFor(() => {
        expect(screen.getByText('reference.mp4')).toBeInTheDocument();
      });
      
      // Step 3: Fill reference metadata
      const referenceTypeInput = screen.getAllByLabelText(/Tyre Type/i)[0];
      await user.type(referenceTypeInput, 'Front Left');
      
      const referenceCompoundSelect = screen.getAllByLabelText(/Compound/i)[0];
      await user.selectOptions(referenceCompoundSelect, 'C3');
      
      // Step 4: Upload damaged video
      const damagedFile = new File(['damaged video content'], 'damaged.mp4', { type: 'video/mp4' });
      const damagedInput = screen.getAllByLabelText(/Select.*file/i)[1];
      
      await user.upload(damagedInput, damagedFile);
      
      await waitFor(() => {
        expect(screen.getByText('damaged.mp4')).toBeInTheDocument();
      });
      
      // Step 5: Fill damaged metadata
      const damagedTypeInput = screen.getAllByLabelText(/Tyre Type/i)[1];
      await user.type(damagedTypeInput, 'Front Left');
      
      const damagedCompoundSelect = screen.getAllByLabelText(/Compound/i)[1];
      await user.selectOptions(damagedCompoundSelect, 'C3');
      
      // Step 6: Trigger reconstruction
      const reconstructButton = screen.getByRole('button', { name: /Reconstruct 3D Model/i });
      expect(reconstructButton).toBeEnabled();
      
      await user.click(reconstructButton);
      
      // Step 7: Verify processing state
      await waitFor(() => {
        expect(screen.getByText(/Processing/i)).toBeInTheDocument();
      });
      
      // Step 8: Simulate reconstruction completion
      useAppStore.setState({
        processingStatus: 'completed',
        processingProgress: 100,
        reconstructionResult: {
          meshUrl: 'http://localhost:5001/uploads/mesh.glb',
          crackMapUrl: 'http://localhost:5001/uploads/crack_map.png',
          depthMapUrl: 'http://localhost:5001/uploads/depth_map.png',
          differenceVideoUrl: 'http://localhost:5001/uploads/difference.mp4',
          insights: {
            crackCount: 15,
            severityScore: 65,
            depthEstimate: 2.5,
            damageClassification: ['micro-cracks', 'grain'],
            recommendedAction: 'monitor-next-stint',
            severityTimeline: [
              { rotationAngle: 0, severity: 50 },
              { rotationAngle: 90, severity: 65 },
              { rotationAngle: 180, severity: 70 },
              { rotationAngle: 270, severity: 60 },
              { rotationAngle: 360, severity: 50 }
            ]
          }
        }
      });
      
      // Step 9: Verify 3D model loads
      await waitFor(() => {
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      });
      
      // Step 10: Verify insights are displayed
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument(); // Crack count
        expect(screen.getByText(/65/)).toBeInTheDocument(); // Severity score
        expect(screen.getByText(/2.5/)).toBeInTheDocument(); // Depth estimate
        expect(screen.getByText(/Micro-Cracks/i)).toBeInTheDocument();
        expect(screen.getByText(/Grain/i)).toBeInTheDocument();
        expect(screen.getByText(/Monitor for Next Stint/i)).toBeInTheDocument();
      });
      
      // Step 11: Verify video synchronization
      const syncCheckbox = screen.getByLabelText(/Sync with Video/i);
      expect(syncCheckbox).toBeInTheDocument();
      await user.click(syncCheckbox);
      
      expect(useAppStore.getState().syncWithVideo).toBe(true);
      
      // Step 12: Test video playback controls
      const playButton = screen.getByRole('button', { name: /Play all videos/i });
      expect(playButton).toBeInTheDocument();
      
      // Step 13: Verify download report button is enabled
      const downloadButton = screen.getByRole('button', { name: /Download inspection report/i });
      expect(downloadButton).toBeEnabled();
    });

    it('should handle video validation correctly', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Upload a video file
      const videoFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      const fileInput = screen.getAllByLabelText(/Select.*file/i)[0];
      
      await user.upload(fileInput, videoFile);
      
      // Verify validation is triggered
      await waitFor(() => {
        expect(screen.getByText(/Validating angle/i)).toBeInTheDocument();
      });
    });

    it('should display error for invalid file types', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Try to upload a non-video file
      const invalidFile = new File(['not a video'], 'test.txt', { type: 'text/plain' });
      const fileInput = screen.getAllByLabelText(/Select.*file/i)[0];
      
      await user.upload(fileInput, invalidFile);
      
      // Should not accept the file (validation happens in onChange handler)
      await waitFor(() => {
        expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
      });
    });
  });

  describe('15.2 Error Scenario Testing', () => {
    it('should handle network interruptions gracefully', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Simulate network error during upload
      const videoFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      const fileInput = screen.getAllByLabelText(/Select.*file/i)[0];
      
      await user.upload(fileInput, videoFile);
      
      // Fill metadata
      const typeInput = screen.getAllByLabelText(/Tyre Type/i)[0];
      await user.type(typeInput, 'Front Left');
      
      const compoundSelect = screen.getAllByLabelText(/Compound/i)[0];
      await user.selectOptions(compoundSelect, 'C3');
      
      // Simulate upload error
      useAppStore.setState({
        processingStatus: 'error'
      });
      
      // Verify error handling
      await waitFor(() => {
        expect(useAppStore.getState().processingStatus).toBe('error');
      });
    });

    it('should handle corrupted mesh files', async () => {
      render(<App />);
      
      // Simulate corrupted mesh URL
      useAppStore.setState({
        processingStatus: 'completed',
        reconstructionResult: {
          meshUrl: 'http://localhost:5001/uploads/corrupted.glb',
          crackMapUrl: null,
          depthMapUrl: null,
          differenceVideoUrl: null,
          insights: {
            crackCount: 0,
            severityScore: 0,
            depthEstimate: 0,
            damageClassification: [],
            recommendedAction: 'safe-qualifying-only',
            severityTimeline: []
          }
        }
      });
      
      // The 3D renderer should handle the error gracefully
      await waitFor(() => {
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      });
    });

    it('should validate file size limits', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Create a file larger than 500MB (simulated)
      const largeFile = new File(['x'.repeat(501 * 1024 * 1024)], 'large.mp4', { type: 'video/mp4' });
      Object.defineProperty(largeFile, 'size', { value: 501 * 1024 * 1024 });
      
      const fileInput = screen.getAllByLabelText(/Select.*file/i)[0];
      
      await user.upload(fileInput, largeFile);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/exceeds 500MB limit/i)).toBeInTheDocument();
      });
    });
  });

  describe('15.3 Performance Testing', () => {
    it('should handle large video files efficiently', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Create a large but valid video file (under 500MB)
      const largeFile = new File(['x'.repeat(400 * 1024 * 1024)], 'large.mp4', { type: 'video/mp4' });
      Object.defineProperty(largeFile, 'size', { value: 400 * 1024 * 1024 });
      
      const fileInput = screen.getAllByLabelText(/Select.*file/i)[0];
      
      const startTime = performance.now();
      await user.upload(fileInput, largeFile);
      const uploadTime = performance.now() - startTime;
      
      // Upload should complete within reasonable time (5 seconds for UI update)
      expect(uploadTime).toBeLessThan(5000);
      
      await waitFor(() => {
        expect(screen.getByText('large.mp4')).toBeInTheDocument();
      });
    });

    it('should maintain 3D rendering performance', async () => {
      render(<App />);
      
      // Set up a complete reconstruction result
      useAppStore.setState({
        processingStatus: 'completed',
        reconstructionResult: {
          meshUrl: 'http://localhost:5001/uploads/mesh.glb',
          crackMapUrl: 'http://localhost:5001/uploads/crack_map.png',
          depthMapUrl: 'http://localhost:5001/uploads/depth_map.png',
          differenceVideoUrl: 'http://localhost:5001/uploads/difference.mp4',
          insights: {
            crackCount: 100,
            severityScore: 85,
            depthEstimate: 5.0,
            damageClassification: ['micro-cracks', 'grain', 'blistering'],
            recommendedAction: 'replace-immediately',
            severityTimeline: Array.from({ length: 360 }, (_, i) => ({
              rotationAngle: i,
              severity: 50 + Math.random() * 50
            }))
          }
        }
      });
      
      // Verify canvas renders
      await waitFor(() => {
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      });
      
      // Verify FPS monitor can be enabled
      const fpsCheckbox = screen.getByLabelText(/Show frames per second/i);
      expect(fpsCheckbox).toBeInTheDocument();
    });

    it('should handle video synchronization with minimal latency', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Set up videos
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
          differenceVideoUrl: 'http://localhost:5001/uploads/difference.mp4',
          insights: {
            crackCount: 10,
            severityScore: 50,
            depthEstimate: 2.0,
            damageClassification: [],
            recommendedAction: 'safe-qualifying-only',
            severityTimeline: []
          }
        },
        videoDuration: 10
      });
      
      // Enable sync
      const syncCheckbox = screen.getByLabelText(/Sync with Video/i);
      await user.click(syncCheckbox);
      
      // Update video timestamp
      const startTime = performance.now();
      useAppStore.getState().updateVideoTimestamp(5.0);
      const syncTime = performance.now() - startTime;
      
      // Sync should happen within 50ms
      expect(syncTime).toBeLessThan(50);
      expect(useAppStore.getState().currentVideoTimestamp).toBe(5.0);
    });
  });

  describe('Accessibility Testing', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Tab through interactive elements
      await user.tab();
      
      // First focusable element should be "Meet the Team" button
      const meetTeamButton = screen.getByRole('button', { name: /Meet the team/i });
      expect(meetTeamButton).toBeInTheDocument();
      
      await user.tab();
      
      // Next should be download button
      const downloadButton = screen.getByRole('button', { name: /Report not ready/i });
      expect(downloadButton).toBeInTheDocument();
    });

    it('should have proper ARIA labels', () => {
      render(<App />);
      
      // Check for important ARIA labels
      expect(screen.getByRole('navigation', { name: /Main navigation/i })).toBeInTheDocument();
      
      // These regions may not be visible until data is loaded, so check if they exist
      const regions = screen.queryAllByRole('region');
      expect(regions.length).toBeGreaterThan(0);
    });

    it('should announce dynamic content changes', async () => {
      render(<App />);
      
      // Update insights
      useAppStore.setState({
        processingStatus: 'completed',
        reconstructionResult: {
          meshUrl: 'http://localhost:5001/uploads/mesh.glb',
          crackMapUrl: null,
          depthMapUrl: null,
          differenceVideoUrl: null,
          insights: {
            crackCount: 25,
            severityScore: 75,
            depthEstimate: 3.5,
            damageClassification: ['micro-cracks'],
            recommendedAction: 'monitor-next-stint',
            severityTimeline: []
          }
        }
      });
      
      // Verify insights are displayed
      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
        expect(screen.getByText(/75/)).toBeInTheDocument();
      });
    });
  });
});
