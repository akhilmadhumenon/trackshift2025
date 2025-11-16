import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './index';
import type { UploadedVideo, TyreInsights, VisualizationMode } from '../types';
import type { ReconstructionResult } from './index';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.getState().resetState();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAppStore.getState();
      
      expect(state.referenceVideo).toBeNull();
      expect(state.damagedVideo).toBeNull();
      expect(state.currentJobId).toBeNull();
      expect(state.processingStatus).toBe('idle');
      expect(state.processingProgress).toBe(0);
      expect(state.errorMessage).toBeNull();
      expect(state.reconstructionResult).toBeNull();
      expect(state.snapshot3D).toBeNull();
      expect(state.visualizationMode).toBe('texture');
      expect(state.syncWithVideo).toBe(false);
      expect(state.currentVideoTimestamp).toBe(0);
      expect(state.videoDuration).toBe(0);
      expect(state.isPlaying).toBe(false);
    });
  });

  describe('Upload Actions', () => {
    it('should set reference video', () => {
      const mockVideo: UploadedVideo = {
        file: new File([''], 'reference.mp4'),
        url: 'http://example.com/reference.mp4',
        uploadId: 'ref-123',
        metadata: { tyreType: 'soft', compound: 'C5', lapsUsed: 10 },
      };

      useAppStore.getState().setReferenceVideo(mockVideo);
      
      expect(useAppStore.getState().referenceVideo).toEqual(mockVideo);
    });

    it('should set damaged video', () => {
      const mockVideo: UploadedVideo = {
        file: new File([''], 'damaged.mp4'),
        url: 'http://example.com/damaged.mp4',
        uploadId: 'dam-456',
        metadata: { tyreType: 'medium', compound: 'C3', lapsUsed: 25 },
      };

      useAppStore.getState().setDamagedVideo(mockVideo);
      
      expect(useAppStore.getState().damagedVideo).toEqual(mockVideo);
    });

    it('should upload reference video successfully', async () => {
      const mockFile = new File(['video content'], 'reference.mp4', { type: 'video/mp4' });
      const mockMetadata = { tyreType: 'soft', compound: 'C5', lapsUsed: 10 };
      const mockResponse = {
        data: {
          uploadId: 'ref-123',
          videoUrl: 'http://example.com/reference.mp4',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await useAppStore.getState().uploadReferenceVideo(mockFile, mockMetadata);

      const state = useAppStore.getState();
      expect(state.referenceVideo).toBeDefined();
      expect(state.referenceVideo?.uploadId).toBe('ref-123');
      expect(state.referenceVideo?.url).toBe('http://example.com/reference.mp4');
      expect(state.processingStatus).toBe('idle');
    });

    it('should handle reference video upload error', async () => {
      const mockFile = new File(['video content'], 'reference.mp4', { type: 'video/mp4' });
      const mockMetadata = { tyreType: 'soft', compound: 'C5', lapsUsed: 10 };

      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        useAppStore.getState().uploadReferenceVideo(mockFile, mockMetadata)
      ).rejects.toThrow('Network error');

      const state = useAppStore.getState();
      expect(state.processingStatus).toBe('error');
      expect(state.errorMessage).toBe('Network error');
    });

    it('should upload damaged video successfully', async () => {
      const mockFile = new File(['video content'], 'damaged.mp4', { type: 'video/mp4' });
      const mockMetadata = { tyreType: 'medium', compound: 'C3', lapsUsed: 25 };
      const mockResponse = {
        data: {
          uploadId: 'dam-456',
          videoUrl: 'http://example.com/damaged.mp4',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await useAppStore.getState().uploadDamagedVideo(mockFile, mockMetadata);

      const state = useAppStore.getState();
      expect(state.damagedVideo).toBeDefined();
      expect(state.damagedVideo?.uploadId).toBe('dam-456');
      expect(state.damagedVideo?.url).toBe('http://example.com/damaged.mp4');
      expect(state.processingStatus).toBe('idle');
    });
  });

  describe('Reconstruction Actions', () => {
    it('should start reconstruction successfully', async () => {
      // Setup: Add both videos first
      const refVideo: UploadedVideo = {
        file: new File([''], 'reference.mp4'),
        url: 'http://example.com/reference.mp4',
        uploadId: 'ref-123',
        metadata: { tyreType: 'soft', compound: 'C5', lapsUsed: 10 },
      };
      const damVideo: UploadedVideo = {
        file: new File([''], 'damaged.mp4'),
        url: 'http://example.com/damaged.mp4',
        uploadId: 'dam-456',
        metadata: { tyreType: 'medium', compound: 'C3', lapsUsed: 25 },
      };

      useAppStore.getState().setReferenceVideo(refVideo);
      useAppStore.getState().setDamagedVideo(damVideo);

      const mockResponse = {
        data: { jobId: 'job-789' },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await useAppStore.getState().startReconstruction();

      const state = useAppStore.getState();
      expect(state.currentJobId).toBe('job-789');
      expect(state.processingStatus).toBe('processing');
    });

    it('should fail reconstruction when videos are missing', async () => {
      await expect(
        useAppStore.getState().startReconstruction()
      ).rejects.toThrow('Both reference and damaged videos must be uploaded');

      const state = useAppStore.getState();
      expect(state.processingStatus).toBe('error');
    });

    it('should update processing status and progress', () => {
      useAppStore.getState().updateProcessingStatus('processing', 50);

      const state = useAppStore.getState();
      expect(state.processingStatus).toBe('processing');
      expect(state.processingProgress).toBe(50);
    });

    it('should set reconstruction result', () => {
      const mockResult: ReconstructionResult = {
        meshUrl: 'http://example.com/mesh.glb',
        crackMapUrl: 'http://example.com/crack-map.png',
        depthMapUrl: 'http://example.com/depth-map.png',
        differenceVideoUrl: 'http://example.com/difference.mp4',
        insights: {
          crackCount: 15,
          severityScore: 75,
          depthEstimate: 2.5,
          damageClassification: ['micro-cracks', 'grain'],
          recommendedAction: 'monitor-next-stint',
          severityTimeline: [
            { rotationAngle: 0, severity: 70 },
            { rotationAngle: 90, severity: 80 },
          ],
        },
      };

      useAppStore.getState().setReconstructionResult(mockResult);

      const state = useAppStore.getState();
      expect(state.reconstructionResult).toEqual(mockResult);
      expect(state.processingStatus).toBe('completed');
    });

    it('should set current job ID', () => {
      useAppStore.getState().setCurrentJobId('job-999');
      expect(useAppStore.getState().currentJobId).toBe('job-999');
    });

    it('should set error message', () => {
      useAppStore.getState().setErrorMessage('Test error');
      expect(useAppStore.getState().errorMessage).toBe('Test error');
    });
  });

  describe('3D Visualization Actions', () => {
    it('should set visualization mode', () => {
      const modes: VisualizationMode[] = [
        'texture',
        'wireframe',
        'crackHeatmap',
        'depthFog',
        'normalMap',
        'geometry',
      ];

      modes.forEach((mode) => {
        useAppStore.getState().setVisualizationMode(mode);
        expect(useAppStore.getState().visualizationMode).toBe(mode);
      });
    });

    it('should set 3D snapshot', () => {
      const mockSnapshot = 'data:image/png;base64,iVBORw0KGgoAAAANS...';
      useAppStore.getState().set3DSnapshot(mockSnapshot);
      expect(useAppStore.getState().snapshot3D).toBe(mockSnapshot);
    });
  });

  describe('Video Sync Actions', () => {
    it('should toggle video sync', () => {
      expect(useAppStore.getState().syncWithVideo).toBe(false);
      
      useAppStore.getState().toggleVideoSync();
      expect(useAppStore.getState().syncWithVideo).toBe(true);
      
      useAppStore.getState().toggleVideoSync();
      expect(useAppStore.getState().syncWithVideo).toBe(false);
    });

    it('should set sync with video', () => {
      useAppStore.getState().setSyncWithVideo(true);
      expect(useAppStore.getState().syncWithVideo).toBe(true);
      
      useAppStore.getState().setSyncWithVideo(false);
      expect(useAppStore.getState().syncWithVideo).toBe(false);
    });

    it('should update video timestamp', () => {
      useAppStore.getState().updateVideoTimestamp(5.5);
      expect(useAppStore.getState().currentVideoTimestamp).toBe(5.5);
    });

    it('should set video duration', () => {
      useAppStore.getState().setVideoDuration(30);
      expect(useAppStore.getState().videoDuration).toBe(30);
    });

    it('should set is playing', () => {
      useAppStore.getState().setIsPlaying(true);
      expect(useAppStore.getState().isPlaying).toBe(true);
      
      useAppStore.getState().setIsPlaying(false);
      expect(useAppStore.getState().isPlaying).toBe(false);
    });
  });

  describe('Reset Action', () => {
    it('should reset all state to initial values', () => {
      // Set various state values
      useAppStore.getState().setReferenceVideo({
        file: new File([''], 'ref.mp4'),
        url: 'http://example.com/ref.mp4',
        uploadId: 'ref-123',
        metadata: { tyreType: 'soft', compound: 'C5', lapsUsed: 10 },
      });
      useAppStore.getState().setCurrentJobId('job-123');
      useAppStore.getState().updateProcessingStatus('processing', 50);
      useAppStore.getState().setVisualizationMode('wireframe');
      useAppStore.getState().setSyncWithVideo(true);
      useAppStore.getState().updateVideoTimestamp(10);

      // Reset
      useAppStore.getState().resetState();

      // Verify all state is reset
      const state = useAppStore.getState();
      expect(state.referenceVideo).toBeNull();
      expect(state.damagedVideo).toBeNull();
      expect(state.currentJobId).toBeNull();
      expect(state.processingStatus).toBe('idle');
      expect(state.processingProgress).toBe(0);
      expect(state.errorMessage).toBeNull();
      expect(state.reconstructionResult).toBeNull();
      expect(state.snapshot3D).toBeNull();
      expect(state.visualizationMode).toBe('texture');
      expect(state.syncWithVideo).toBe(false);
      expect(state.currentVideoTimestamp).toBe(0);
      expect(state.videoDuration).toBe(0);
      expect(state.isPlaying).toBe(false);
    });
  });
});
