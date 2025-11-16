import React from 'react';

export interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  onUploadDifferent?: () => void;
  errorType: 'upload' | 'processing' | 'network' | 'timeout' | 'invalid-format' | 'generic';
  errorMessage: string;
  details?: string;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  onUploadDifferent,
  errorType,
  errorMessage,
  details,
}) => {
  if (!isOpen) return null;

  const getErrorIcon = () => {
    switch (errorType) {
      case 'timeout':
        return (
          <svg className="w-12 h-12 text-ferrari-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'network':
        return (
          <svg className="w-12 h-12 text-ferrari-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        );
      case 'invalid-format':
        return (
          <svg className="w-12 h-12 text-ferrari-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-12 h-12 text-ferrari-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'timeout':
        return 'Processing Timeout';
      case 'network':
        return 'Network Error';
      case 'invalid-format':
        return 'Invalid File Format';
      case 'upload':
        return 'Upload Failed';
      case 'processing':
        return 'Processing Failed';
      default:
        return 'Error';
    }
  };

  const getErrorDescription = () => {
    switch (errorType) {
      case 'timeout':
        return 'The reconstruction process took too long to complete. This may be due to large video files or high server load.';
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case 'invalid-format':
        return 'The uploaded file format is not supported or the video is corrupted.';
      case 'upload':
        return 'Failed to upload the video file. Please check your connection and try again.';
      case 'processing':
        return 'An error occurred while processing your videos. This may be due to invalid video format or corrupted data.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="bg-ferrari-graphite border-2 border-ferrari-red rounded-lg max-w-md w-full p-6 shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          {getErrorIcon()}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-ferrari-white text-center mb-2 uppercase tracking-wide">
          {getErrorTitle()}
        </h2>

        {/* Description */}
        <p className="text-ferrari-white text-center mb-4 text-sm opacity-90">
          {getErrorDescription()}
        </p>

        {/* Error Message */}
        <div className="bg-ferrari-black border border-ferrari-red rounded p-3 mb-4">
          <p className="text-ferrari-red text-xs font-mono break-words">
            {errorMessage}
          </p>
          {details && (
            <p className="text-ferrari-white text-xs font-mono mt-2 opacity-70 break-words">
              {details}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-ferrari-red text-ferrari-white py-3 px-4 rounded-lg font-semibold uppercase tracking-wide text-sm hover:bg-opacity-90 transition-all duration-200"
            >
              Retry
            </button>
          )}
          
          {onUploadDifferent && (
            <button
              onClick={onUploadDifferent}
              className="w-full bg-ferrari-black text-ferrari-white py-3 px-4 rounded-lg font-semibold uppercase tracking-wide text-sm border border-ferrari-red hover:bg-ferrari-graphite transition-all duration-200"
            >
              Upload Different Videos
            </button>
          )}
          
          <button
            onClick={onClose}
            className="w-full bg-transparent text-ferrari-white py-3 px-4 rounded-lg font-semibold uppercase tracking-wide text-sm border border-ferrari-graphite hover:border-ferrari-white transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
