import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoComparisonStrip from './VideoComparisonStrip';

describe('VideoComparisonStrip', () => {
  const mockOnTimeUpdate = vi.fn();

  const defaultProps = {
    referenceVideoUrl: null,
    damagedVideoUrl: null,
    differenceVideoUrl: null,
    onTimeUpdate: mockOnTimeUpdate,
  };

  // Mock video element methods
  const createMockVideoElement = () => {
    const mockVideo = document.createElement('video');
    mockVideo.play = vi.fn().mockResolvedValue(undefined);
    mockVideo.pause = vi.fn();
    Object.defineProperty(mockVideo, 'duration', { value: 10, writable: true });
    Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true });
    Object.defineProperty(mockVideo, 'readyState', { value: 4, writable: true });
    return mockVideo;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render three video player columns', () => {
      render(<VideoComparisonStrip {...defaultProps} />);

      expect(screen.getByText('Reference Video')).toBeInTheDocument();
      expect(screen.getByText('Damaged Video')).toBeInTheDocument();
      expect(screen.getByText('Difference Video')).toBeInTheDocument();
    });

    it('should display empty state when no videos are provided', () => {
      render(<VideoComparisonStrip {...defaultProps} />);

      expect(screen.getByText('No reference video')).toBeInTheDocument();
      expect(screen.getByText('No damaged video')).toBeInTheDocument();
      expect(screen.getByText('No difference video')).toBeInTheDocument();
    });

    it('should render video elements when URLs are provided', () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
        damagedVideoUrl: 'http://example.com/damaged.mp4',
        differenceVideoUrl: 'http://example.com/difference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElements = document.querySelectorAll('video');
      expect(videoElements).toHaveLength(3);
      expect(videoElements[0]).toHaveAttribute('src', 'http://example.com/reference.mp4');
      expect(videoElements[1]).toHaveAttribute('src', 'http://example.com/damaged.mp4');
      expect(videoElements[2]).toHaveAttribute('src', 'http://example.com/difference.mp4');
    });

    it('should render playback controls', () => {
      render(<VideoComparisonStrip {...defaultProps} />);

      expect(screen.getByTitle('Step backward one frame')).toBeInTheDocument();
      expect(screen.getByTitle('Play')).toBeInTheDocument();
      expect(screen.getByTitle('Step forward one frame')).toBeInTheDocument();
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });
  });

  describe('Play/Pause Synchronization', () => {
    it('should have play button disabled when no videos are loaded', () => {
      render(<VideoComparisonStrip {...defaultProps} />);

      const playButton = screen.getByTitle('Play');
      expect(playButton).toBeDisabled();
    });

    it('should enable play button when reference video is loaded', () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const playButton = screen.getByTitle('Play');
      expect(playButton).not.toBeDisabled();
    });

    it('should play all videos when play button is clicked', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
        damagedVideoUrl: 'http://example.com/damaged.mp4',
        differenceVideoUrl: 'http://example.com/difference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((video) => {
        video.play = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(video, 'readyState', { value: 4, writable: true });
      });

      const playButton = screen.getByTitle('Play');
      fireEvent.click(playButton);

      await waitFor(() => {
        videoElements.forEach((video) => {
          expect(video.play).toHaveBeenCalled();
        });
      });
    });

    it('should change play button to pause button when playing', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((video) => {
        video.play = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(video, 'readyState', { value: 4, writable: true });
      });

      const playButton = screen.getByTitle('Play');
      fireEvent.click(playButton);

      await waitFor(() => {
        expect(screen.getByTitle('Pause')).toBeInTheDocument();
      });
    });

    it('should pause all videos when pause button is clicked', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
        damagedVideoUrl: 'http://example.com/damaged.mp4',
        differenceVideoUrl: 'http://example.com/difference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((video) => {
        video.play = vi.fn().mockResolvedValue(undefined);
        video.pause = vi.fn();
        Object.defineProperty(video, 'readyState', { value: 4, writable: true });
      });

      const playButton = screen.getByTitle('Play');
      fireEvent.click(playButton);

      await waitFor(() => {
        expect(screen.getByTitle('Pause')).toBeInTheDocument();
      });

      const pauseButton = screen.getByTitle('Pause');
      fireEvent.click(pauseButton);

      await waitFor(() => {
        videoElements.forEach((video) => {
          expect(video.pause).toHaveBeenCalled();
        });
      });
    });

    it('should synchronize video playback when time drift exceeds threshold', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
        damagedVideoUrl: 'http://example.com/damaged.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElements = document.querySelectorAll('video');
      const referenceVideo = videoElements[0];
      const damagedVideo = videoElements[1];

      // Set reference video time to 5 seconds
      Object.defineProperty(referenceVideo, 'currentTime', { value: 5.0, writable: true });
      // Set damaged video time to 5.1 seconds (drift > 50ms threshold)
      Object.defineProperty(damagedVideo, 'currentTime', { value: 5.1, writable: true });

      // Trigger timeupdate event
      fireEvent.timeUpdate(referenceVideo);

      await waitFor(() => {
        // Damaged video should be synced to reference video time
        expect(damagedVideo.currentTime).toBe(5.0);
      });
    });
  });

  describe('Timeline Scrubber Accuracy', () => {
    it('should display current time and duration', () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElement = document.querySelector('video');
      if (videoElement) {
        Object.defineProperty(videoElement, 'duration', { value: 120, writable: true });
        fireEvent.loadedMetadata(videoElement);
      }

      expect(screen.getByText(/00:00 \/ 02:00/)).toBeInTheDocument();
    });

    it('should update all videos when scrubber is moved', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
        damagedVideoUrl: 'http://example.com/damaged.mp4',
        differenceVideoUrl: 'http://example.com/difference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElements = document.querySelectorAll('video');
      const currentTimes: number[] = [];
      
      videoElements.forEach((video, index) => {
        Object.defineProperty(video, 'duration', { value: 10, writable: true });
        currentTimes[index] = 0;
        Object.defineProperty(video, 'currentTime', {
          get: () => currentTimes[index],
          set: (value) => { currentTimes[index] = value; },
          configurable: true
        });
      });

      const scrubber = screen.getByRole('slider') as HTMLInputElement;
      fireEvent.change(scrubber, { target: { value: '5' } });

      await waitFor(() => {
        videoElements.forEach((video) => {
          expect(video.currentTime).toBe(5);
        });
      });
    });

    it('should call onTimeUpdate when scrubber is moved', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElement = document.querySelector('video');
      if (videoElement) {
        Object.defineProperty(videoElement, 'duration', { value: 10, writable: true });
        Object.defineProperty(videoElement, 'currentTime', { value: 3, writable: true });
        fireEvent.timeUpdate(videoElement);
      }

      await waitFor(() => {
        expect(mockOnTimeUpdate).toHaveBeenCalledWith(3);
      });
    });

    it('should disable scrubber when no videos are loaded', () => {
      render(<VideoComparisonStrip {...defaultProps} />);

      const scrubber = screen.getByRole('slider');
      expect(scrubber).toBeDisabled();
    });

    it('should enable scrubber when reference video is loaded', () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const scrubber = screen.getByRole('slider');
      expect(scrubber).not.toBeDisabled();
    });

    it('should update time display when scrubber is moved', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElement = document.querySelector('video');
      if (videoElement) {
        Object.defineProperty(videoElement, 'duration', { value: 120, writable: true });
        fireEvent.loadedMetadata(videoElement);
      }

      const scrubber = screen.getByRole('slider') as HTMLInputElement;
      fireEvent.change(scrubber, { target: { value: '75' } });

      await waitFor(() => {
        expect(screen.getByText(/01:15 \/ 02:00/)).toBeInTheDocument();
      });
    });
  });

  describe('Frame Stepping', () => {
    it('should disable step backward button when at start', () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const stepBackButton = screen.getByTitle('Step backward one frame');
      expect(stepBackButton).toBeDisabled();
    });

    it('should enable step backward button when not at start', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElement = document.querySelector('video');
      if (videoElement) {
        Object.defineProperty(videoElement, 'currentTime', { value: 5, writable: true });
        fireEvent.timeUpdate(videoElement);
      }

      await waitFor(() => {
        const stepBackButton = screen.getByTitle('Step backward one frame');
        expect(stepBackButton).not.toBeDisabled();
      });
    });

    it('should step forward by one frame when step forward button is clicked', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
        damagedVideoUrl: 'http://example.com/damaged.mp4',
        differenceVideoUrl: 'http://example.com/difference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElements = document.querySelectorAll('video');
      const currentTimes: number[] = [];
      
      videoElements.forEach((video, index) => {
        Object.defineProperty(video, 'duration', { value: 10, writable: true });
        currentTimes[index] = 0;
        Object.defineProperty(video, 'currentTime', {
          get: () => currentTimes[index],
          set: (value) => { currentTimes[index] = value; },
          configurable: true
        });
      });

      const stepForwardButton = screen.getByTitle('Step forward one frame');
      fireEvent.click(stepForwardButton);

      await waitFor(() => {
        const frameTime = 1 / 30; // ~0.033 seconds
        videoElements.forEach((video) => {
          expect(video.currentTime).toBeCloseTo(frameTime, 3);
        });
      });
    });

    it('should step backward by one frame when step backward button is clicked', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
        damagedVideoUrl: 'http://example.com/damaged.mp4',
        differenceVideoUrl: 'http://example.com/difference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((video) => {
        Object.defineProperty(video, 'duration', { value: 10, writable: true });
        Object.defineProperty(video, 'currentTime', { value: 5, writable: true });
      });

      const videoElement = videoElements[0];
      fireEvent.timeUpdate(videoElement);

      await waitFor(() => {
        const stepBackButton = screen.getByTitle('Step backward one frame');
        expect(stepBackButton).not.toBeDisabled();
      });

      const stepBackButton = screen.getByTitle('Step backward one frame');
      fireEvent.click(stepBackButton);

      await waitFor(() => {
        const frameTime = 1 / 30;
        const expectedTime = 5 - frameTime;
        videoElements.forEach((video) => {
          expect(video.currentTime).toBeCloseTo(expectedTime, 3);
        });
      });
    });

    it('should not step forward beyond video duration', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElement = document.querySelector('video');
      if (videoElement) {
        Object.defineProperty(videoElement, 'duration', { value: 10, writable: true });
        Object.defineProperty(videoElement, 'currentTime', { value: 10, writable: true });
        fireEvent.timeUpdate(videoElement);
      }

      await waitFor(() => {
        const stepForwardButton = screen.getByTitle('Step forward one frame');
        expect(stepForwardButton).toBeDisabled();
      });
    });

    it('should not step backward below zero', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElement = document.querySelector('video');
      let currentTime = 0.01;
      
      if (videoElement) {
        Object.defineProperty(videoElement, 'duration', { value: 10, writable: true });
        Object.defineProperty(videoElement, 'currentTime', {
          get: () => currentTime,
          set: (value) => { currentTime = value; },
          configurable: true
        });
      }

      const stepBackButton = screen.getByTitle('Step backward one frame');
      fireEvent.click(stepBackButton);

      await waitFor(() => {
        if (videoElement) {
          expect(videoElement.currentTime).toBe(0);
        }
      });
    });

    it('should synchronize all videos when stepping frames', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
        damagedVideoUrl: 'http://example.com/damaged.mp4',
        differenceVideoUrl: 'http://example.com/difference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElements = document.querySelectorAll('video');
      const currentTimes: number[] = [];
      
      videoElements.forEach((video, index) => {
        Object.defineProperty(video, 'duration', { value: 10, writable: true });
        currentTimes[index] = 2;
        Object.defineProperty(video, 'currentTime', {
          get: () => currentTimes[index],
          set: (value) => { currentTimes[index] = value; },
          configurable: true
        });
      });

      const stepForwardButton = screen.getByTitle('Step forward one frame');
      fireEvent.click(stepForwardButton);

      await waitFor(() => {
        const frameTime = 1 / 30;
        const expectedTime = 2 + frameTime;
        videoElements.forEach((video) => {
          expect(video.currentTime).toBeCloseTo(expectedTime, 3);
        });
      });
    });
  });

  describe('Difference Video Generation', () => {
    it('should display difference video when URL is provided', () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
        damagedVideoUrl: 'http://example.com/damaged.mp4',
        differenceVideoUrl: 'http://example.com/difference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElements = document.querySelectorAll('video');
      expect(videoElements).toHaveLength(3);
      const differenceVideo = videoElements[2];
      expect(differenceVideo).toHaveAttribute('src', 'http://example.com/difference.mp4');
    });

    it('should synchronize difference video with reference and damaged videos', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
        damagedVideoUrl: 'http://example.com/damaged.mp4',
        differenceVideoUrl: 'http://example.com/difference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElements = document.querySelectorAll('video');
      const referenceVideo = videoElements[0];
      const differenceVideo = videoElements[2];

      Object.defineProperty(referenceVideo, 'currentTime', { value: 3.5, writable: true });
      Object.defineProperty(differenceVideo, 'currentTime', { value: 3.6, writable: true });

      fireEvent.timeUpdate(referenceVideo);

      await waitFor(() => {
        expect(differenceVideo.currentTime).toBe(3.5);
      });
    });

    it('should include difference video in play/pause synchronization', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
        damagedVideoUrl: 'http://example.com/damaged.mp4',
        differenceVideoUrl: 'http://example.com/difference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((video) => {
        video.play = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(video, 'readyState', { value: 4, writable: true });
      });

      const playButton = screen.getByTitle('Play');
      fireEvent.click(playButton);

      await waitFor(() => {
        const differenceVideo = videoElements[2];
        expect(differenceVideo.play).toHaveBeenCalled();
      });
    });

    it('should include difference video in frame stepping', async () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
        damagedVideoUrl: 'http://example.com/damaged.mp4',
        differenceVideoUrl: 'http://example.com/difference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElements = document.querySelectorAll('video');
      const currentTimes: number[] = [];
      
      videoElements.forEach((video, index) => {
        Object.defineProperty(video, 'duration', { value: 10, writable: true });
        currentTimes[index] = 1;
        Object.defineProperty(video, 'currentTime', {
          get: () => currentTimes[index],
          set: (value) => { currentTimes[index] = value; },
          configurable: true
        });
      });

      const stepForwardButton = screen.getByTitle('Step forward one frame');
      fireEvent.click(stepForwardButton);

      await waitFor(() => {
        const frameTime = 1 / 30;
        const expectedTime = 1 + frameTime;
        const differenceVideo = videoElements[2];
        expect(differenceVideo.currentTime).toBeCloseTo(expectedTime, 3);
      });
    });
  });

  describe('Time Formatting', () => {
    it('should format time correctly in MM:SS format', () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElement = document.querySelector('video');
      if (videoElement) {
        Object.defineProperty(videoElement, 'duration', { value: 185, writable: true });
        Object.defineProperty(videoElement, 'currentTime', { value: 65, writable: true });
        fireEvent.loadedMetadata(videoElement);
        fireEvent.timeUpdate(videoElement);
      }

      expect(screen.getByText(/01:05 \/ 03:05/)).toBeInTheDocument();
    });

    it('should pad single digit seconds with zero', () => {
      const props = {
        ...defaultProps,
        referenceVideoUrl: 'http://example.com/reference.mp4',
      };

      render(<VideoComparisonStrip {...props} />);

      const videoElement = document.querySelector('video');
      if (videoElement) {
        Object.defineProperty(videoElement, 'duration', { value: 125, writable: true });
        Object.defineProperty(videoElement, 'currentTime', { value: 5, writable: true });
        fireEvent.loadedMetadata(videoElement);
        fireEvent.timeUpdate(videoElement);
      }

      expect(screen.getByText(/00:05 \/ 02:05/)).toBeInTheDocument();
    });
  });
});
