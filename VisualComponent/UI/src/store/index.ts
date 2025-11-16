import { create } from 'zustand';
import { VisualizationMode, UploadedVideo, TyreInsights } from '../types';
import axios from 'axios';

export type ProcessingStatus = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'error';

export interface ReconstructionResult {
  meshUrl: string;
  crackMapUrl: string;
  depthMapUrl: string;
  differenceVideoUrl: string;
  insights: TyreInsights;
  snapshotUrl?: string;
}

interface AppState {
  // Upload state
  referenceVideo: UploadedVideo | null;
  damagedVideo: UploadedVideo | null;
  
  // Processing state
  currentJobId: string | null;
  processingStatus: ProcessingStatus;
  processingProgress: number;
  errorMessage: string | null;
  
  // Results
  reconstructionResult: ReconstructionResult | null;
  snapshot3D: string | null;
  
  // UI state
  visualizationMode: VisualizationMode;
  syncWithVideo: boolean;
  currentVideoTimestamp: number;
  videoDuration: number;
  isPlaying: boolean;
  
  // Actions - Upload
  setReferenceVideo: (video: UploadedVideo | null) => void;
  setDamagedVideo: (video: UploadedVideo | null) => void;
  uploadReferenceVideo: (file: File, metadata: any) => Promise<void>;
  uploadDamagedVideo: (file: File, metadata: any) => Promise<void>;
  
  // Actions - Reconstruction
  startReconstruction: () => Promise<void>;
  setCurrentJobId: (jobId: string | null) => void;
  updateProcessingStatus: (status: ProcessingStatus, progress: number) => void;
  setReconstructionResult: (result: ReconstructionResult | null) => void;
  setErrorMessage: (message: string | null) => void;
  
  // Actions - 3D Visualization
  set3DSnapshot: (snapshot: string | null) => void;
  setVisualizationMode: (mode: VisualizationMode) => void;
  
  // Actions - Video Sync
  toggleVideoSync: () => void;
  setSyncWithVideo: (sync: boolean) => void;
  updateVideoTimestamp: (timestamp: number) => void;
  setVideoDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  
  // Actions - Reset
  resetState: () => void;
}

// API base URL - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  referenceVideo: null,
  damagedVideo: null,
  currentJobId: null,
  processingStatus: 'idle',
  processingProgress: 0,
  errorMessage: null,
  reconstructionResult: null,
  snapshot3D: null,
  visualizationMode: 'texture',
  syncWithVideo: false,
  currentVideoTimestamp: 0,
  videoDuration: 0,
  isPlaying: false,
  
  // Actions - Upload
  setReferenceVideo: (video) => set({ referenceVideo: video }),
  setDamagedVideo: (video) => set({ damagedVideo: video }),
  
  uploadReferenceVideo: async (file: File, metadata: any) => {
    try {
      set({ processingStatus: 'uploading', errorMessage: null });
      
      const formData = new FormData();
      formData.append('video', file);
      formData.append('metadata', JSON.stringify(metadata));
      
      const response = await axios.post(`${API_BASE_URL}/api/upload/reference`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const uploadedVideo: UploadedVideo = {
        file,
        url: response.data.videoUrl,
        uploadId: response.data.uploadId,
        metadata,
      };
      
      set({ 
        referenceVideo: uploadedVideo,
        processingStatus: 'idle',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to upload reference video';
      set({ 
        processingStatus: 'error',
        errorMessage: errorMsg,
      });
      throw error;
    }
  },
  
  uploadDamagedVideo: async (file: File, metadata: any) => {
    try {
      set({ processingStatus: 'uploading', errorMessage: null });
      
      const formData = new FormData();
      formData.append('video', file);
      formData.append('metadata', JSON.stringify(metadata));
      
      const response = await axios.post(`${API_BASE_URL}/api/upload/damaged`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const uploadedVideo: UploadedVideo = {
        file,
        url: response.data.videoUrl,
        uploadId: response.data.uploadId,
        metadata,
      };
      
      set({ 
        damagedVideo: uploadedVideo,
        processingStatus: 'idle',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to upload damaged video';
      set({ 
        processingStatus: 'error',
        errorMessage: errorMsg,
      });
      throw error;
    }
  },
  
  // Actions - Reconstruction
  startReconstruction: async () => {
    const state = get();
    
    if (!state.referenceVideo || !state.damagedVideo) {
      const errorMsg = 'Both reference and damaged videos must be uploaded';
      set({ 
        processingStatus: 'error',
        errorMessage: errorMsg,
      });
      throw new Error(errorMsg);
    }
    
    try {
      set({ 
        processingStatus: 'queued',
        processingProgress: 0,
        errorMessage: null,
      });
      
      const response = await axios.post(`${API_BASE_URL}/api/reconstruct`, {
        referenceUploadId: state.referenceVideo.uploadId,
        damagedUploadId: state.damagedVideo.uploadId,
      });
      
      set({ 
        currentJobId: response.data.jobId,
        processingStatus: 'processing',
      });
      
      // Note: WebSocket updates will be handled separately via socket.io
      // This just initiates the reconstruction job
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start reconstruction';
      set({ 
        processingStatus: 'error',
        errorMessage: errorMsg,
      });
      throw error;
    }
  },
  
  setCurrentJobId: (jobId) => set({ currentJobId: jobId }),
  
  updateProcessingStatus: (status, progress) => 
    set({ 
      processingStatus: status, 
      processingProgress: progress,
      errorMessage: status === 'error' ? get().errorMessage : null,
    }),
  
  setReconstructionResult: (result) => set({ 
    reconstructionResult: result,
    processingStatus: result ? 'completed' : get().processingStatus,
  }),
  
  setErrorMessage: (message) => set({ errorMessage: message }),
  
  // Actions - 3D Visualization
  set3DSnapshot: (snapshot) => set({ snapshot3D: snapshot }),
  setVisualizationMode: (mode) => set({ visualizationMode: mode }),
  
  // Actions - Video Sync
  toggleVideoSync: () => set((state) => ({ syncWithVideo: !state.syncWithVideo })),
  setSyncWithVideo: (sync) => set({ syncWithVideo: sync }),
  updateVideoTimestamp: (timestamp) => set({ currentVideoTimestamp: timestamp }),
  setVideoDuration: (duration) => set({ videoDuration: duration }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  
  // Actions - Reset
  resetState: () => set({
    referenceVideo: null,
    damagedVideo: null,
    currentJobId: null,
    processingStatus: 'idle',
    processingProgress: 0,
    errorMessage: null,
    reconstructionResult: null,
    snapshot3D: null,
    visualizationMode: 'texture',
    syncWithVideo: false,
    currentVideoTimestamp: 0,
    videoDuration: 0,
    isPlaying: false,
  }),
}));
