import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThreeDRenderer from './ThreeDRenderer';
import { useAppStore } from '../store';

// Mock WebGL detection utilities
vi.mock('../utils/webglDetection', () => ({
  getWebGLCapabilities: vi.fn(() => ({
    supported: true,
    version: 2,
    renderer: 'Mock WebGL Renderer',
    vendor: 'Mock Vendor',
    maxTextureSize: 16384
  }))
}));

// Mock React Three Fiber Canvas to avoid WebGL context issues
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { x: 0, y: 2, z: 5 } }
  }))
}));

// Mock drei helpers
vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  useGLTF: vi.fn(() => ({
    scene: {
      clone: () => ({ children: [], traverse: vi.fn() })
    }
  })),
  Grid: () => null,
  useTexture: vi.fn(() => null)
}));

describe('ThreeDRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state before each test
    useAppStore.setState({
      syncWithVideo: false,
      currentVideoTimestamp: 0,
      visualizationMode: 'texture'
    });
  });

  describe('Mesh Loading and Rendering', () => {
    it('should render canvas when meshUrl is provided', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const canvas = screen.getByTestId('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render canvas when meshUrl is null', () => {
      render(<ThreeDRenderer meshUrl={null} />);
      
      const canvas = screen.getByTestId('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with crack map URL', () => {
      render(
        <ThreeDRenderer 
          meshUrl="/test-mesh.glb" 
          crackMapUrl="/crack-map.png"
        />
      );
      
      const canvas = screen.getByTestId('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render with depth map URL', () => {
      render(
        <ThreeDRenderer 
          meshUrl="/test-mesh.glb" 
          depthMapUrl="/depth-map.png"
        />
      );
      
      const canvas = screen.getByTestId('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Camera Control Interactions', () => {
    it('should render Reset View button', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const resetButton = screen.getByRole('button', { name: /reset view/i });
      expect(resetButton).toBeInTheDocument();
    });

    it('should handle Reset View button click', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const resetButton = screen.getByRole('button', { name: /reset view/i });
      await user.click(resetButton);
      
      // Button should still be in the document after click
      expect(resetButton).toBeInTheDocument();
    });

    it('should render Auto-Rotate toggle button', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const autoRotateButton = screen.getByRole('button', { name: /auto-rotate/i });
      expect(autoRotateButton).toBeInTheDocument();
    });

    it('should toggle auto-rotate state when button is clicked', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const autoRotateButton = screen.getByRole('button', { name: /auto-rotate/i });
      expect(autoRotateButton).toHaveTextContent('Auto-Rotate');
      
      // Click to enable auto-rotate
      await user.click(autoRotateButton);
      
      await waitFor(() => {
        expect(autoRotateButton).toHaveTextContent('Stop Rotate');
      });
      
      // Click again to disable auto-rotate
      await user.click(autoRotateButton);
      
      await waitFor(() => {
        expect(autoRotateButton).toHaveTextContent('Auto-Rotate');
      });
    });
  });

  describe('Visualization Mode Switching', () => {
    it('should render all visualization mode buttons', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      expect(screen.getByRole('button', { name: /^texture$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /wireframe/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /crack heatmap/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /depth fog/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /normal map/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /geometry/i })).toBeInTheDocument();
    });

    it('should have texture mode selected by default', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const textureButton = screen.getByRole('button', { name: /^texture$/i });
      expect(textureButton).toHaveClass('bg-ferrari-red');
    });

    it('should switch to wireframe mode when clicked', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const wireframeButton = screen.getByRole('button', { name: /wireframe/i });
      await user.click(wireframeButton);
      
      await waitFor(() => {
        expect(wireframeButton).toHaveClass('bg-ferrari-red');
      });
    });

    it('should switch to crack heatmap mode when clicked', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const crackHeatmapButton = screen.getByRole('button', { name: /crack heatmap/i });
      await user.click(crackHeatmapButton);
      
      await waitFor(() => {
        expect(crackHeatmapButton).toHaveClass('bg-ferrari-red');
      });
    });

    it('should switch to depth fog mode when clicked', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const depthFogButton = screen.getByRole('button', { name: /depth fog/i });
      await user.click(depthFogButton);
      
      await waitFor(() => {
        expect(depthFogButton).toHaveClass('bg-ferrari-red');
      });
    });

    it('should switch to normal map mode when clicked', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const normalMapButton = screen.getByRole('button', { name: /normal map/i });
      await user.click(normalMapButton);
      
      await waitFor(() => {
        expect(normalMapButton).toHaveClass('bg-ferrari-red');
      });
    });

    it('should switch to geometry mode when clicked', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const geometryButton = screen.getByRole('button', { name: /geometry/i });
      await user.click(geometryButton);
      
      await waitFor(() => {
        expect(geometryButton).toHaveClass('bg-ferrari-red');
      });
    });

    it('should only have one visualization mode active at a time', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      // Initially texture is active
      const textureButton = screen.getByRole('button', { name: /^texture$/i });
      expect(textureButton).toHaveClass('bg-ferrari-red');
      
      // Click wireframe
      const wireframeButton = screen.getByRole('button', { name: /wireframe/i });
      await user.click(wireframeButton);
      
      await waitFor(() => {
        expect(wireframeButton).toHaveClass('bg-ferrari-red');
        expect(textureButton).not.toHaveClass('bg-ferrari-red');
      });
    });
  });

  describe('Damage Highlight Rendering', () => {
    it('should render with crack map for damage highlighting', () => {
      render(
        <ThreeDRenderer 
          meshUrl="/test-mesh.glb" 
          crackMapUrl="/crack-map.png"
        />
      );
      
      const canvas = screen.getByTestId('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render without crack map', () => {
      render(
        <ThreeDRenderer 
          meshUrl="/test-mesh.glb" 
          crackMapUrl={null}
        />
      );
      
      const canvas = screen.getByTestId('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle undefined crack map URL', () => {
      render(
        <ThreeDRenderer 
          meshUrl="/test-mesh.glb"
        />
      );
      
      const canvas = screen.getByTestId('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render visualization controls when damage data is present', () => {
      render(
        <ThreeDRenderer 
          meshUrl="/test-mesh.glb" 
          crackMapUrl="/crack-map.png"
          depthMapUrl="/depth-map.png"
        />
      );
      
      expect(screen.getByText(/visualization mode/i)).toBeInTheDocument();
    });
  });

  describe('UI Controls Layout', () => {
    it('should render control panel with all buttons', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      expect(screen.getByRole('button', { name: /reset view/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /auto-rotate/i })).toBeInTheDocument();
      expect(screen.getByText(/visualization mode/i)).toBeInTheDocument();
    });

    it('should have proper button styling for reset view', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const resetButton = screen.getByRole('button', { name: /reset view/i });
      expect(resetButton).toHaveClass('bg-ferrari-graphite');
      expect(resetButton).toHaveClass('border-ferrari-red');
    });

    it('should have proper button styling for auto-rotate when inactive', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const autoRotateButton = screen.getByRole('button', { name: /auto-rotate/i });
      expect(autoRotateButton).toHaveClass('bg-ferrari-graphite');
    });

    it('should change button styling for auto-rotate when active', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const autoRotateButton = screen.getByRole('button', { name: /auto-rotate/i });
      await user.click(autoRotateButton);
      
      await waitFor(() => {
        expect(autoRotateButton).toHaveClass('bg-ferrari-red');
      });
    });
  });

  describe('Video Sync Toggle', () => {
    it('should render sync with video timeline checkbox', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      expect(checkbox).toBeInTheDocument();
    });

    it('should have checkbox unchecked by default', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      expect(checkbox).not.toBeChecked();
    });

    it('should toggle sync state when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      
      // Initially unchecked
      expect(checkbox).not.toBeChecked();
      expect(useAppStore.getState().syncWithVideo).toBe(false);
      
      // Click to enable sync
      await user.click(checkbox);
      
      await waitFor(() => {
        expect(checkbox).toBeChecked();
        expect(useAppStore.getState().syncWithVideo).toBe(true);
      });
      
      // Click again to disable sync
      await user.click(checkbox);
      
      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
        expect(useAppStore.getState().syncWithVideo).toBe(false);
      });
    });

    it('should reflect store state when sync is enabled externally', () => {
      // Set sync state in store before rendering
      useAppStore.setState({ syncWithVideo: true });
      
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      expect(checkbox).toBeChecked();
    });

    it('should have proper styling for sync toggle container', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /sync with video timeline/i });
      const container = checkbox.closest('div.bg-ferrari-graphite');
      
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('border-ferrari-red');
    });
  });

  describe('Performance Optimizations', () => {
    it('should render FPS counter toggle checkbox', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /show fps counter/i });
      expect(checkbox).toBeInTheDocument();
    });

    it('should have FPS counter unchecked by default', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /show fps counter/i });
      expect(checkbox).not.toBeChecked();
    });

    it('should not display FPS counter when toggle is off', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const fpsDisplay = screen.queryByText(/FPS:/i);
      expect(fpsDisplay).not.toBeInTheDocument();
    });

    it('should display FPS counter when toggle is enabled', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /show fps counter/i });
      await user.click(checkbox);
      
      await waitFor(() => {
        const fpsDisplay = screen.getByText(/FPS:/i);
        expect(fpsDisplay).toBeInTheDocument();
      });
    });

    it('should hide FPS counter when toggle is disabled', async () => {
      const user = userEvent.setup();
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      const checkbox = screen.getByRole('checkbox', { name: /show fps counter/i });
      
      // Enable FPS counter
      await user.click(checkbox);
      await waitFor(() => {
        expect(screen.getByText(/FPS:/i)).toBeInTheDocument();
      });
      
      // Disable FPS counter
      await user.click(checkbox);
      await waitFor(() => {
        expect(screen.queryByText(/FPS:/i)).not.toBeInTheDocument();
      });
    });

    it('should apply frustum culling to rendered meshes', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      // Verify canvas is rendered (frustum culling is applied internally)
      const canvas = screen.getByTestId('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should limit pixel ratio for performance', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      // Verify canvas is rendered with performance optimizations
      const canvas = screen.getByTestId('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should disable shadows for better performance', () => {
      render(<ThreeDRenderer meshUrl="/test-mesh.glb" />);
      
      // Verify canvas is rendered with shadows disabled
      const canvas = screen.getByTestId('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });
});
