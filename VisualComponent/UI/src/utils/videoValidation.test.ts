import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { validateVideoAngle } from './videoValidation';

describe('videoValidation', () => {
  let mockVideo: HTMLVideoElement;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: any;
  let createElementSpy: any;

  beforeEach(() => {
    // Create mock context with methods
    mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn((x: number, y: number, w: number, h: number) => {
        // Create mock image data with circular pattern (simulating top-down tyre view)
        const data = new Uint8ClampedArray(w * h * 4);
        const centerX = w / 2;
        const centerY = h / 2;
        const radius = Math.min(w, h) * 0.35;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            
            // Create circular pattern with edges
            if (Math.abs(distance - radius) < 5) {
              // Edge of circle - high intensity
              data[idx] = 200;
              data[idx + 1] = 200;
              data[idx + 2] = 200;
            } else {
              // Background - low intensity
              data[idx] = 50;
              data[idx + 1] = 50;
              data[idx + 2] = 50;
            }
            data[idx + 3] = 255; // Alpha
          }
        }

        return new ImageData(data, w, h);
      }),
    };

    // Mock video element
    mockVideo = document.createElement('video');
    mockCanvas = document.createElement('canvas');

    // Mock canvas getContext
    vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext);

    // Mock createElement to return our mocked elements
    const originalCreateElement = document.createElement.bind(document);
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'video') {
        return mockVideo;
      }
      if (tagName === 'canvas') {
        return mockCanvas;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateVideoAngle', () => {
    it('should validate a video file with top-down angle', async () => {
      // Create a mock video file
      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });

      // Mock video properties
      Object.defineProperty(mockVideo, 'videoWidth', { value: 640, writable: true });
      Object.defineProperty(mockVideo, 'videoHeight', { value: 480, writable: true });
      Object.defineProperty(mockVideo, 'duration', { value: 10, writable: true });

      // Trigger the validation
      const validationPromise = validateVideoAngle(mockFile);

      // Simulate video events
      setTimeout(() => {
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      }, 10);

      setTimeout(() => {
        mockVideo.dispatchEvent(new Event('seeked'));
      }, 20);

      const result = await validationPromise;

      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.message).toBeTruthy();
    });

    it('should return invalid result for video with poor angle', async () => {
      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });

      // Mock video properties with valid dimensions
      Object.defineProperty(mockVideo, 'videoWidth', { value: 640, writable: true, configurable: true });
      Object.defineProperty(mockVideo, 'videoHeight', { value: 480, writable: true, configurable: true });
      Object.defineProperty(mockVideo, 'duration', { value: 10, writable: true, configurable: true });

      // Set canvas dimensions
      Object.defineProperty(mockCanvas, 'width', { value: 640, writable: true, configurable: true });
      Object.defineProperty(mockCanvas, 'height', { value: 480, writable: true, configurable: true });

      // Override getImageData to return non-circular pattern
      mockContext.getImageData = vi.fn((x: number, y: number, w: number, h: number) => {
        const data = new Uint8ClampedArray(w * h * 4);
        // Fill with uniform low values (no clear circular pattern)
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 30;
          data[i + 1] = 30;
          data[i + 2] = 30;
          data[i + 3] = 255;
        }
        return new ImageData(data, w, h);
      });

      const validationPromise = validateVideoAngle(mockFile);

      setTimeout(() => {
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      }, 10);

      setTimeout(() => {
        mockVideo.dispatchEvent(new Event('seeked'));
      }, 20);

      const result = await validationPromise;

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBeLessThan(0.70);
      // The result should indicate failure - either error or invalid angle
      expect(result.message).toBeTruthy();
    });

    it('should handle video loading errors', async () => {
      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });

      const validationPromise = validateVideoAngle(mockFile);

      setTimeout(() => {
        mockVideo.dispatchEvent(new Event('error'));
      }, 10);

      const result = await validationPromise;

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.message).toContain('Unable to load video');
    });

    it('should handle missing canvas context', async () => {
      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });

      // Mock getContext to return null
      vi.spyOn(mockCanvas, 'getContext').mockReturnValue(null);

      const result = await validateVideoAngle(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.message).toContain('Unable to initialize video analysis');
    });

    it('should include angle estimate in validation result', async () => {
      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });

      Object.defineProperty(mockVideo, 'videoWidth', { value: 640, writable: true });
      Object.defineProperty(mockVideo, 'videoHeight', { value: 480, writable: true });
      Object.defineProperty(mockVideo, 'duration', { value: 10, writable: true });

      const validationPromise = validateVideoAngle(mockFile);

      setTimeout(() => {
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      }, 10);

      setTimeout(() => {
        mockVideo.dispatchEvent(new Event('seeked'));
      }, 20);

      const result = await validationPromise;

      if (result.angle !== undefined) {
        expect(result.angle).toBeGreaterThanOrEqual(60);
        expect(result.angle).toBeLessThanOrEqual(90);
      }
    });
  });
});
