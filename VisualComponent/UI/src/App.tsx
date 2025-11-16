import { useState, useEffect } from 'react';
import AppLayout from './components/AppLayout';
import Navbar from './components/Navbar';
import MeetTheTeamModal from './components/MeetTheTeamModal';
import ErrorModal from './components/ErrorModal';
import UploadPanel from './components/UploadPanel';
import ThreeDRenderer from './components/ThreeDRenderer';
import InsightsPanel from './components/InsightsPanel';
import VideoComparisonStrip from './components/VideoComparisonStrip';
import AnalyticsView from './components/AnalyticsView';
import { useAppStore } from './store';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function App() {
  const [isMeetTeamModalOpen, setIsMeetTeamModalOpen] = useState(false);
  const [isAnalyticsView, setIsAnalyticsView] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorType, setErrorType] = useState<'upload' | 'processing' | 'network' | 'timeout' | 'invalid-format' | 'generic'>('generic');
  const [errorDetails, setErrorDetails] = useState<string>('');
  
  // Get state and actions from Zustand store
  const currentJobId = useAppStore((state) => state.currentJobId);
  const processingStatus = useAppStore((state) => state.processingStatus);
  const processingProgress = useAppStore((state) => state.processingProgress);
  const reconstructionResult = useAppStore((state) => state.reconstructionResult);
  const errorMessage = useAppStore((state) => state.errorMessage);
  const setCurrentJobId = useAppStore((state) => state.setCurrentJobId);
  const updateProcessingStatus = useAppStore((state) => state.updateProcessingStatus);
  const setReconstructionResult = useAppStore((state) => state.setReconstructionResult);
  const setErrorMessage = useAppStore((state) => state.setErrorMessage);
  const startReconstruction = useAppStore((state) => state.startReconstruction);
  const resetState = useAppStore((state) => state.resetState);
  
  // Socket.io connection
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Derived state
  const isProcessing = processingStatus === 'processing' || processingStatus === 'queued';
  const isReportReady = processingStatus === 'completed' && reconstructionResult !== null;

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Listen to socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('reconstruction:progress', (data: { jobId: string; progress: number; stage: string }) => {
      if (data.jobId === currentJobId) {
        updateProcessingStatus('processing', data.progress);
      }
    });

    socket.on('reconstruction:complete', (data: { jobId: string; result: any }) => {
      if (data.jobId === currentJobId) {
        updateProcessingStatus('completed', 100);
        console.log('Reconstruction complete:', data.result);
        
        // Store reconstruction result in Zustand store
        if (data.result) {
          setReconstructionResult({
            meshUrl: data.result.meshUrl || '',
            crackMapUrl: data.result.crackMapUrl || '',
            depthMapUrl: data.result.depthMapUrl || '',
            differenceVideoUrl: data.result.differenceVideoUrl || '',
            insights: data.result.insights || null,
            snapshotUrl: data.result.snapshotUrl
          });
        }
      }
    });

    socket.on('reconstruction:error', (data: { jobId: string; error: string }) => {
      if (data.jobId === currentJobId) {
        updateProcessingStatus('error', 0);
        setErrorMessage(data.error);
        console.error('Reconstruction error:', data.error);
        
        // Determine error type based on error message
        let type: typeof errorType = 'processing';
        if (data.error.toLowerCase().includes('timeout')) {
          type = 'timeout';
        } else if (data.error.toLowerCase().includes('network') || data.error.toLowerCase().includes('connection')) {
          type = 'network';
        } else if (data.error.toLowerCase().includes('format') || data.error.toLowerCase().includes('invalid')) {
          type = 'invalid-format';
        }
        
        setErrorType(type);
        setErrorDetails(data.error);
        setIsErrorModalOpen(true);
      }
    });

    return () => {
      socket.off('reconstruction:progress');
      socket.off('reconstruction:complete');
      socket.off('reconstruction:error');
    };
  }, [socket, currentJobId, updateProcessingStatus, setReconstructionResult, setErrorMessage]);

  const handleMeetTeamClick = () => {
    setIsMeetTeamModalOpen(true);
  };

  const handleAnalyticsClick = () => {
    setIsAnalyticsView(true);
  };

  const handleExitAnalytics = () => {
    setIsAnalyticsView(false);
  };

  const handleDownloadReport = async () => {
    if (!isReportReady || !currentJobId) {
      return;
    }

    try {
      setIsDownloading(true);

      // Make request to download report
      const response = await axios.get(`${API_URL}/api/report/${currentJobId}`, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          // Optional: Could show download progress here
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Download progress: ${percentCompleted}%`);
          }
        }
      });

      // Create blob from response
      const blob = new Blob([response.data], { type: 'application/pdf' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `F1-Tyre-Inspection-Report-${currentJobId}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      const errorMsg = axios.isAxiosError(error) 
        ? error.response?.data?.error || error.message 
        : 'Failed to download report';
      
      let type: typeof errorType = 'generic';
      if (axios.isAxiosError(error) && !error.response) {
        type = 'network';
      }
      
      setErrorType(type);
      setErrorDetails(errorMsg);
      setErrorMessage(errorMsg);
      setIsErrorModalOpen(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReconstruct = async () => {
    try {
      await startReconstruction();
      const jobId = useAppStore.getState().currentJobId;
      console.log('Reconstruction job started:', jobId);
    } catch (error) {
      console.error('Error starting reconstruction:', error);
      
      // Determine error type
      let type: typeof errorType = 'processing';
      const errorMsg = axios.isAxiosError(error) 
        ? error.response?.data?.error || error.message 
        : error instanceof Error ? error.message : 'Unknown error';
      
      if (axios.isAxiosError(error) && !error.response) {
        type = 'network';
      }
      
      setErrorType(type);
      setErrorDetails(errorMsg);
      setIsErrorModalOpen(true);
    }
  };

  const handleErrorModalClose = () => {
    setIsErrorModalOpen(false);
    setErrorMessage(null);
  };

  const handleRetryReconstruction = async () => {
    setIsErrorModalOpen(false);
    setErrorMessage(null);
    await handleReconstruct();
  };

  const handleUploadDifferent = () => {
    setIsErrorModalOpen(false);
    setErrorMessage(null);
    resetState();
  };

  return (
    <>
      <Navbar
        onMeetTeamClick={handleMeetTeamClick}
        onAnalyticsClick={handleAnalyticsClick}
        onDownloadReport={handleDownloadReport}
        isReportReady={isReportReady}
        isDownloading={isDownloading}
      />
      
      {isAnalyticsView ? (
        <AnalyticsView onExit={handleExitAnalytics} />
      ) : (
        <AppLayout
          navbar={null}
          leftPanel={
            <UploadPanel
              onReconstruct={handleReconstruct}
            />
          }
          centerRenderer={
            <ThreeDRenderer 
              meshUrl={reconstructionResult?.meshUrl || "/tyre-model.glb"}
              crackMapUrl={reconstructionResult?.crackMapUrl || null}
              depthMapUrl={reconstructionResult?.depthMapUrl || null}
            />
          }
          rightPanel={
            <InsightsPanel insights={reconstructionResult?.insights || null} />
          }
          bottomStrip={
            <VideoComparisonStrip />
          }
        />
      )}
      
      <MeetTheTeamModal
        isOpen={isMeetTeamModalOpen}
        onClose={() => setIsMeetTeamModalOpen(false)}
      />
      
      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={handleErrorModalClose}
        onRetry={handleRetryReconstruction}
        onUploadDifferent={handleUploadDifferent}
        errorType={errorType}
        errorMessage={errorMessage || errorDetails}
        details={errorDetails !== errorMessage ? errorDetails : undefined}
      />
    </>
  );
}

export default App;
