import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThreeDRenderer from './ThreeDRenderer';
import { useAppStore } from '../store';
import { calculateRotationFromTimestamp, RotationLookupTable } from '../utils/rotationCalculation';

// Mock React Three Fiber Canvas and hooks
let mockUseFrameCallback: ((state: any, delta: number) => void) | null = null;

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
  useFrame: (callback: (state: any, delta: number) => void) => {
    mockUseFrameCallback = callback;
  },
  useThree: vi.fn(() => ({
    camera: { position: { x: 0, y: 2, z: 5 } }
  }))
}));

// Mock drei helpers
const mockScene = {
  clone: vi.fn(() => ({
    children: [],
    traverse: vi.fn()
  }))
};

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  useGLTF: vi.fn(() => ({ scene: mockScene })),
  Grid: () => null,
  useTexture: vi.fn(() => null)
}));

describe('ThreeDRenderer - Sync Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFrameCallback = null;
    
    // Reset store state before each test
    useAppStore.setState({
      syncWithVideo: false,
      currentVideoTimestamp: 0,
      videoDuration: 10,
      visualizationMode: 'texture'
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rotation Calculation Accuracy', () => {
    it('should calculate correct rotation at start of video', () => {
      const rotation = calculateRotationFromTimestamp(0, 10);
      expect(rotation).toBe(0);
    });

    it('should calculate correct rotation at middle of video', () => {
      const rotation = calculateRotationFromTimestamp(5, 10);
      expect(rotation).toBeCloseTo(Math.PI);
    });

    it('should calculate correct rotation at end of video', () => {
      const rotation = calculateRotationFromTimestamp(10, 10);
      expect(rotation).toBeCloseTo(Math.PI * 2);
    });

    it('should calculate correct rotation at quarter point', () => {
      const rotation = calculateRotationFromTimestamp(2.5, 10);
      expect(rotation).toBeCloseTo(Math.PI / 2);
    });

    it('should calculate correct rotation at three-quarter point', () => {
      const rotation = calculateRotationFromTimestamp(7.5, 10);
      expect(rotation).toBeCloseTo(Math.PI * 1.5);
    });

    it('should use RotationLookupTable for accurate interpolation', () => {
      const table = new RotationLookupTable(10);
      
      const rotation0 = table.getRotationAtTimestamp(0);
      const rotation5 = table.getRotationAtTimestamp(5);
      const rotation10 = table.getRotationAtTimestamp(10);
      
      expect(rotation0).toBeCloseTo(0);
      expect(rotation5).toBeCloseTo(Math.PI);
      expect(rotation10).toBeCloseTo(Math.PI * 2);
    });

    it('should handle fractional timestamps accurately', () => {
      const table = new RotationLookupTable(10);
      
      const rotation = table.getRotationAtTimestamp(3.7);
      const expectedRotation = (3.7 / 10) * Math.PI * 2;
      
      expect(rotation).toBeCloseTo(expectedRotation, 2);
    });
  });

  describe('3D Model Rotation Updates', () => {
    it('should not rotate model when sync is disabled', async () => {
      useAppStore.setState({
        syncWithVideo: false,
        currentVideoTimestamp: 5,
        videoDuration: 10
      });

      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      });

      // Verify sync checkbox is unchecked
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      expect(checkbox).not.toBeChecked();
    });

    it('should update rotation when video timestamp changes with sync enabled', async () => {
      useAppStore.setState({
        syncWithVideo: true,
        currentVideoTimestamp: 0,
        videoDuration: 10
      });

      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      });

      // Update timestamp to middle of video
      useAppStore.setState({ currentVideoTimestamp: 5 });

      // Wait for state update to propagate
      await waitFor(() => {
        expect(useAppStore.getState().currentVideoTimestamp).toBe(5);
      });
    });

    it('should calculate target rotation based on video timestamp', () => {
      const timestamp = 5;
      const duration = 10;
      
      const expectedRotation = calculateRotationFromTimestamp(timestamp, duration);
      expect(expectedRotation).toBeCloseTo(Math.PI);
    });

    it('should update rotation smoothly as video plays', async () => {
      useAppStore.setState({
        syncWithVideo: true,
        currentVideoTimestamp: 0,
        videoDuration: 10
      });

      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      });

      // Simulate video playback by updating timestamps
      const timestamps = [0, 2.5, 5, 7.5, 10];
      
      for (const timestamp of timestamps) {
        useAppStore.setState({ currentVideoTimestamp: timestamp });
        
        await waitFor(() => {
          expect(useAppStore.getState().currentVideoTimestamp).toBe(timestamp);
        });
        
        const expectedRotation = calculateRotationFromTimestamp(timestamp, 10);
        expect(expectedRotation).toBeCloseTo((timestamp / 10) * Math.PI * 2);
      }
    });

    it('should handle rapid timestamp changes', async () => {
      useAppStore.setState({
        syncWithVideo: true,
        currentVideoTimestamp: 0,
        videoDuration: 10
      });

      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      });

      // Rapidly change timestamps (simulating scrubbing)
      const rapidTimestamps = [0, 3, 1, 7, 4, 9, 2];
      
      for (const timestamp of rapidTimestamps) {
        useAppStore.setState({ currentVideoTimestamp: timestamp });
      }

      // Verify final state
      await waitFor(() => {
        expect(useAppStore.getState().currentVideoTimestamp).toBe(2);
      });
    });

    it('should respect video duration boundaries', () => {
      const duration = 10;
      
      // Test timestamp before start
      const rotationBefore = calculateRotationFromTimestamp(-5, duration);
      expect(rotationBefore).toBe(0);
      
      // Test timestamp after end
      const rotationAfter = calculateRotationFromTimestamp(15, duration);
      expect(rotationAfter).toBeCloseTo(Math.PI * 2);
    });

    it('should handle zero duration gracefully', () => {
      const rotation = calculateRotationFromTimestamp(5, 0);
      expect(rotation).toBe(0);
    });
  });

  describe('Sync Toggle Behavior', () => {
    it('should render sync toggle checkbox', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      expect(checkbox).toBeInTheDocument();
    });

    it('should have sync disabled by default', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      expect(checkbox).not.toBeChecked();
      expect(useAppStore.getState().syncWithVideo).toBe(false);
    });

    it('should enable sync when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      
      await user.click(checkbox);
      
      await waitFor(() => {
        expect(checkbox).toBeChecked();
        expect(useAppStore.getState().syncWithVideo).toBe(true);
      });
    });

    it('should disable sync when checkbox is clicked again', async () => {
      const user = userEvent.setup();
      
      // Start with sync enabled
      useAppStore.setState({ syncWithVideo: true });
      
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      expect(checkbox).toBeChecked();
      
      await user.click(checkbox);
      
      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
        expect(useAppStore.getState().syncWithVideo).toBe(false);
      });
    });

    it('should toggle sync state multiple times', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      
      // Toggle on
      await user.click(checkbox);
      await waitFor(() => expect(useAppStore.getState().syncWithVideo).toBe(true));
      
      // Toggle off
      await user.click(checkbox);
      await waitFor(() => expect(useAppStore.getState().syncWithVideo).toBe(false));
      
      // Toggle on again
      await user.click(checkbox);
      await waitFor(() => expect(useAppStore.getState().syncWithVideo).toBe(true));
    });

    it('should reflect external sync state changes', () => {
      const { rerender } = render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      expect(checkbox).not.toBeChecked();
      
      // Change sync state externally
      useAppStore.setState({ syncWithVideo: true });
      
      rerender(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      expect(checkbox).toBeChecked();
    });

    it('should disable auto-rotate when sync is enabled', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      // Enable auto-rotate first
      const autoRotateButton = screen.getByRole('button', { name: /auto-rotate/i });
      await user.click(autoRotateButton);
      
      await waitFor(() => {
        expect(autoRotateButton).toHaveTextContent('Stop Rotate');
      });
      
      // Enable sync
      const syncCheckbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      await user.click(syncCheckbox);
      
      await waitFor(() => {
        expect(syncCheckbox).toBeChecked();
        expect(useAppStore.getState().syncWithVideo).toBe(true);
      });
    });

    it('should maintain sync state when switching visualization modes', async () => {
      const user = userEvent.setup();
      
      // Enable sync
      useAppStore.setState({ syncWithVideo: true });
      
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const syncCheckbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      expect(syncCheckbox).toBeChecked();
      
      // Switch visualization mode
      const wireframeButton = screen.getByRole('button', { name: /wireframe/i });
      await user.click(wireframeButton);
      
      // Sync should still be enabled
      await waitFor(() => {
        expect(syncCheckbox).toBeChecked();
        expect(useAppStore.getState().syncWithVideo).toBe(true);
      });
    });
  });

  describe('Integration: Sync with Video Timeline', () => {
    it('should synchronize rotation with video playback', async () => {
      useAppStore.setState({
        syncWithVideo: true,
        currentVideoTimestamp: 0,
        videoDuration: 10
      });

      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      });

      // Simulate video playing from 0 to 10 seconds
      const playbackSteps = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      for (const timestamp of playbackSteps) {
        useAppStore.setState({ currentVideoTimestamp: timestamp });
        
        const expectedRotation = calculateRotationFromTimestamp(timestamp, 10);
        const expectedDegrees = (expectedRotation * 180) / Math.PI;
        
        // Verify rotation is calculated correctly
        expect(expectedRotation).toBeCloseTo((timestamp / 10) * Math.PI * 2, 2);
        expect(expectedDegrees).toBeCloseTo((timestamp / 10) * 360, 1);
      }
    });

    it('should handle timeline scrubbing', async () => {
      useAppStore.setState({
        syncWithVideo: true,
        currentVideoTimestamp: 0,
        videoDuration: 10
      });

      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      });

      // Simulate scrubbing to different positions
      const scrubPositions = [5, 2, 8, 1, 9, 0];
      
      for (const position of scrubPositions) {
        useAppStore.setState({ currentVideoTimestamp: position });
        
        await waitFor(() => {
          expect(useAppStore.getState().currentVideoTimestamp).toBe(position);
        });
        
        const rotation = calculateRotationFromTimestamp(position, 10);
        expect(rotation).toBeCloseTo((position / 10) * Math.PI * 2, 2);
      }
    });

    it('should not update rotation when sync is disabled', async () => {
      useAppStore.setState({
        syncWithVideo: false,
        currentVideoTimestamp: 0,
        videoDuration: 10
      });

      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      });

      // Update timestamp
      useAppStore.setState({ currentVideoTimestamp: 5 });

      // Verify sync is still disabled
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      expect(checkbox).not.toBeChecked();
      expect(useAppStore.getState().syncWithVideo).toBe(false);
    });

    it('should handle sync toggle during video playback', async () => {
      const user = userEvent.setup();
      
      useAppStore.setState({
        syncWithVideo: false,
        currentVideoTimestamp: 3,
        videoDuration: 10
      });

      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      
      // Enable sync mid-playback
      await user.click(checkbox);
      
      await waitFor(() => {
        expect(checkbox).toBeChecked();
        expect(useAppStore.getState().syncWithVideo).toBe(true);
      });

      // Continue playback
      useAppStore.setState({ currentVideoTimestamp: 6 });
      
      await waitFor(() => {
        expect(useAppStore.getState().currentVideoTimestamp).toBe(6);
      });
    });

    it('should maintain correct rotation when video loops', async () => {
      useAppStore.setState({
        syncWithVideo: true,
        currentVideoTimestamp: 10,
        videoDuration: 10
      });

      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      });

      // At end of video
      let rotation = calculateRotationFromTimestamp(10, 10);
      expect(rotation).toBeCloseTo(Math.PI * 2);

      // Loop back to start
      useAppStore.setState({ currentVideoTimestamp: 0 });
      
      await waitFor(() => {
        expect(useAppStore.getState().currentVideoTimestamp).toBe(0);
      });

      rotation = calculateRotationFromTimestamp(0, 10);
      expect(rotation).toBe(0);
    });
  });
});
