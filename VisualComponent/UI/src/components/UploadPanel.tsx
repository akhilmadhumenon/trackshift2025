import React, { useState, useRef, useEffect } from 'react';
import { TyreMetadata } from '../types';
import { validateVideoAngle, ValidationResult } from '../utils/videoValidation';
import { useAppStore } from '../store';
import LoadingIndicator from './LoadingIndicator';

interface UploadPanelProps {
  onReconstruct: () => void;
}

interface UploadZoneProps {
  title: string;
  onFileSelect: (file: File) => void;
  uploadedFile: File | null;
  previewUrl: string | null;
  isDragActive: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  validationResult: ValidationResult | null;
  isValidating: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({
  title,
  onFileSelect,
  uploadedFile,
  previewUrl,
  isDragActive,
  onDragEnter,
  onDragLeave,
  validationResult,
  isValidating,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragLeave();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        onFileSelect(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mb-6">
      <h3 
        className="text-ferrari-white font-semibold mb-2 text-sm uppercase tracking-wide"
        id={`${title.toLowerCase().replace(/\s+/g, '-')}-label`}
      >
        {title}
      </h3>
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200 focus-within:ring-2 focus-within:ring-ferrari-red focus-within:ring-offset-2 focus-within:ring-offset-ferrari-black
          ${isDragActive 
            ? 'border-ferrari-red bg-ferrari-red bg-opacity-10' 
            : 'border-ferrari-graphite hover:border-ferrari-red'
          }
          ${uploadedFile ? 'bg-ferrari-black' : 'bg-ferrari-graphite'}
        `}
        onDragEnter={onDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={onDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`Upload ${title}`}
        aria-describedby={`${title.toLowerCase().replace(/\s+/g, '-')}-label`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label={`Select ${title} file`}
        />
        
        {uploadedFile ? (
          <div className="space-y-3">
            {previewUrl && (
              <div className="relative w-full h-32 bg-ferrari-black rounded overflow-hidden">
                <video
                  src={previewUrl}
                  className="w-full h-full object-cover"
                  muted
                />
              </div>
            )}
            <div className="text-ferrari-white text-sm">
              <p className="font-semibold truncate">{uploadedFile.name}</p>
              <p className="text-xs text-ferrari-white opacity-70 mt-1">
                {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            
            {/* Validation Status */}
            {isValidating && (
              <div className="flex items-center justify-center space-x-2 py-2">
                <div className="w-4 h-4 border-2 border-ferrari-red border-t-transparent rounded-full animate-spin"></div>
                <span className="text-ferrari-white text-xs">Validating angle...</span>
              </div>
            )}
            
            {!isValidating && validationResult && (
              <div className={`
                p-3 rounded border text-xs
                ${validationResult.isValid 
                  ? 'bg-green-900 bg-opacity-20 border-green-500 text-green-400' 
                  : 'bg-red-900 bg-opacity-20 border-ferrari-red text-ferrari-red'
                }
              `}>
                <div className="flex items-start space-x-2">
                  {validationResult.isValid ? (
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{validationResult.message}</p>
                    {validationResult.angle && (
                      <p className="mt-1 opacity-80">
                        Estimated angle: {validationResult.angle.toFixed(1)}°
                      </p>
                    )}
                  </div>
                </div>
                {!validationResult.isValid && (
                  <button
                    type="button"
                    className="mt-2 text-ferrari-white bg-ferrari-red px-3 py-1 rounded text-xs hover:bg-opacity-90"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileSelect(null as any);
                    }}
                  >
                    Upload Different Video
                  </button>
                )}
              </div>
            )}
            
            <button
              type="button"
              className="text-ferrari-red text-xs hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect(null as any);
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="py-4">
            <svg
              className="mx-auto h-12 w-12 text-ferrari-white opacity-50"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm text-ferrari-white">
              <span className="font-semibold text-ferrari-red">Click to upload</span>
              {' '}or drag and drop
            </p>
            <p className="text-xs text-ferrari-white opacity-70 mt-1">
              Video files only (MP4, MOV, AVI)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const UploadPanel: React.FC<UploadPanelProps> = ({
  onReconstruct,
}) => {
  // Get state and actions from Zustand store
  const uploadReferenceVideo = useAppStore((state) => state.uploadReferenceVideo);
  const uploadDamagedVideo = useAppStore((state) => state.uploadDamagedVideo);
  const processingStatus = useAppStore((state) => state.processingStatus);
  const processingProgress = useAppStore((state) => state.processingProgress);
  const referenceVideo = useAppStore((state) => state.referenceVideo);
  const damagedVideo = useAppStore((state) => state.damagedVideo);
  
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [damagedFile, setDamagedFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [damagedPreview, setDamagedPreview] = useState<string | null>(null);
  
  const [referenceDragActive, setReferenceDragActive] = useState(false);
  const [damagedDragActive, setDamagedDragActive] = useState(false);

  // Validation states
  const [referenceValidation, setReferenceValidation] = useState<ValidationResult | null>(null);
  const [damagedValidation, setDamagedValidation] = useState<ValidationResult | null>(null);
  const [isValidatingReference, setIsValidatingReference] = useState(false);
  const [isValidatingDamaged, setIsValidatingDamaged] = useState(false);
  
  // Upload tracking
  const [referenceUploaded, setReferenceUploaded] = useState(false);
  const [damagedUploaded, setDamagedUploaded] = useState(false);
  
  // Error tracking
  const [referenceUploadError, setReferenceUploadError] = useState<string | null>(null);
  const [damagedUploadError, setDamagedUploadError] = useState<string | null>(null);
  const [isRetryingReference, setIsRetryingReference] = useState(false);
  const [isRetryingDamaged, setIsRetryingDamaged] = useState(false);

  // Metadata states
  const [referenceMetadata, setReferenceMetadata] = useState<TyreMetadata>({
    tyreType: '',
    compound: '',
    lapsUsed: 0,
  });

  const [damagedMetadata, setDamagedMetadata] = useState<TyreMetadata>({
    tyreType: '',
    compound: '',
    lapsUsed: 0,
  });
  
  // Derived state
  const isProcessing = processingStatus === 'processing' || processingStatus === 'queued';

  // Upload reference video when file and metadata are ready
  React.useEffect(() => {
    if (referenceFile && referenceValidation?.isValid && 
        referenceMetadata.tyreType && referenceMetadata.compound && 
        !referenceUploaded && !referenceUploadError) {
      uploadReferenceVideo(referenceFile, referenceMetadata)
        .then(() => {
          setReferenceUploaded(true);
          setReferenceUploadError(null);
        })
        .catch((error) => {
          console.error('Failed to upload reference video:', error);
          const errorMessage = error.response?.data?.error || error.message || 'Failed to upload reference video';
          setReferenceUploadError(errorMessage);
        });
    }
  }, [referenceFile, referenceValidation, referenceMetadata, referenceUploaded, referenceUploadError, uploadReferenceVideo]);

  // Upload damaged video when file and metadata are ready
  React.useEffect(() => {
    if (damagedFile && damagedValidation?.isValid && 
        damagedMetadata.tyreType && damagedMetadata.compound && 
        !damagedUploaded && !damagedUploadError) {
      uploadDamagedVideo(damagedFile, damagedMetadata)
        .then(() => {
          setDamagedUploaded(true);
          setDamagedUploadError(null);
        })
        .catch((error) => {
          console.error('Failed to upload damaged video:', error);
          const errorMessage = error.response?.data?.error || error.message || 'Failed to upload damaged video';
          setDamagedUploadError(errorMessage);
        });
    }
  }, [damagedFile, damagedValidation, damagedMetadata, damagedUploaded, damagedUploadError, uploadDamagedVideo]);

  const handleReferenceFileSelect = async (file: File | null) => {
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setReferenceUploadError('Invalid file type. Please upload a video file.');
        return;
      }
      
      // Validate file size (500MB max)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        setReferenceUploadError('File size exceeds 500MB limit. Please upload a smaller video.');
        return;
      }
      
      setReferenceFile(file);
      setReferenceUploaded(false);
      setReferenceUploadError(null);
      const url = URL.createObjectURL(file);
      setReferencePreview(url);
      
      // Validate video angle
      setIsValidatingReference(true);
      setReferenceValidation(null);
      
      try {
        const result = await validateVideoAngle(file);
        setReferenceValidation(result);
      } catch (error) {
        setReferenceValidation({
          isValid: false,
          confidence: 0,
          message: 'Error validating video angle',
        });
      } finally {
        setIsValidatingReference(false);
      }
    } else {
      setReferenceFile(null);
      setReferenceValidation(null);
      setReferenceUploaded(false);
      setReferenceUploadError(null);
      if (referencePreview) {
        URL.revokeObjectURL(referencePreview);
      }
      setReferencePreview(null);
    }
  };

  const handleDamagedFileSelect = async (file: File | null) => {
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setDamagedUploadError('Invalid file type. Please upload a video file.');
        return;
      }
      
      // Validate file size (500MB max)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        setDamagedUploadError('File size exceeds 500MB limit. Please upload a smaller video.');
        return;
      }
      
      setDamagedFile(file);
      setDamagedUploaded(false);
      setDamagedUploadError(null);
      const url = URL.createObjectURL(file);
      setDamagedPreview(url);
      
      // Validate video angle
      setIsValidatingDamaged(true);
      setDamagedValidation(null);
      
      try {
        const result = await validateVideoAngle(file);
        setDamagedValidation(result);
      } catch (error) {
        setDamagedValidation({
          isValid: false,
          confidence: 0,
          message: 'Error validating video angle',
        });
      } finally {
        setIsValidatingDamaged(false);
      }
    } else {
      setDamagedFile(null);
      setDamagedValidation(null);
      setDamagedUploaded(false);
      setDamagedUploadError(null);
      if (damagedPreview) {
        URL.revokeObjectURL(damagedPreview);
      }
      setDamagedPreview(null);
    }
  };

  const handleRetryReferenceUpload = async () => {
    if (!referenceFile) return;
    
    setIsRetryingReference(true);
    setReferenceUploadError(null);
    setReferenceUploaded(false);
    
    try {
      await uploadReferenceVideo(referenceFile, referenceMetadata);
      setReferenceUploaded(true);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload reference video';
      setReferenceUploadError(errorMessage);
    } finally {
      setIsRetryingReference(false);
    }
  };

  const handleRetryDamagedUpload = async () => {
    if (!damagedFile) return;
    
    setIsRetryingDamaged(true);
    setDamagedUploadError(null);
    setDamagedUploaded(false);
    
    try {
      await uploadDamagedVideo(damagedFile, damagedMetadata);
      setDamagedUploaded(true);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload damaged video';
      setDamagedUploadError(errorMessage);
    } finally {
      setIsRetryingDamaged(false);
    }
  };

  const canReconstruct = referenceFile && damagedFile && 
    referenceMetadata.tyreType && referenceMetadata.compound &&
    damagedMetadata.tyreType && damagedMetadata.compound &&
    referenceValidation?.isValid && damagedValidation?.isValid &&
    !isValidatingReference && !isValidatingDamaged &&
    !referenceUploadError && !damagedUploadError;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ferrari-white mb-4 uppercase tracking-wider">
          Upload Videos
        </h2>
        
        {/* Reference Video Upload */}
        <UploadZone
          title="Reference Tyre Video"
          onFileSelect={handleReferenceFileSelect}
          uploadedFile={referenceFile}
          previewUrl={referencePreview}
          isDragActive={referenceDragActive}
          onDragEnter={() => setReferenceDragActive(true)}
          onDragLeave={() => setReferenceDragActive(false)}
          validationResult={referenceValidation}
          isValidating={isValidatingReference}
        />

        {/* Reference Metadata */}
        {referenceFile && (
          <div className="mb-6 p-4 bg-ferrari-black rounded-lg border border-ferrari-graphite">
            <h4 className="text-ferrari-white text-sm font-semibold mb-3 uppercase">
              Reference Tyre Metadata
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-ferrari-white text-xs mb-1">
                  Tyre Type *
                </label>
                <input
                  type="text"
                  value={referenceMetadata.tyreType}
                  onChange={(e) => setReferenceMetadata({ ...referenceMetadata, tyreType: e.target.value })}
                  placeholder="e.g., Front Left, Rear Right"
                  className="w-full px-3 py-2 bg-ferrari-graphite text-ferrari-white text-sm rounded border border-ferrari-graphite focus:border-ferrari-red focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-ferrari-white text-xs mb-1">
                  Compound *
                </label>
                <select
                  value={referenceMetadata.compound}
                  onChange={(e) => setReferenceMetadata({ ...referenceMetadata, compound: e.target.value })}
                  className="w-full px-3 py-2 bg-ferrari-graphite text-ferrari-white text-sm rounded border border-ferrari-graphite focus:border-ferrari-red focus:outline-none"
                >
                  <option value="">Select compound</option>
                  <option value="C1">C1 (Hard)</option>
                  <option value="C2">C2 (Medium)</option>
                  <option value="C3">C3 (Medium)</option>
                  <option value="C4">C4 (Soft)</option>
                  <option value="C5">C5 (Soft)</option>
                </select>
              </div>
              <div>
                <label className="block text-ferrari-white text-xs mb-1">
                  Laps Used
                </label>
                <input
                  type="number"
                  value={referenceMetadata.lapsUsed}
                  onChange={(e) => setReferenceMetadata({ ...referenceMetadata, lapsUsed: parseInt(e.target.value) || 0 })}
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2 bg-ferrari-graphite text-ferrari-white text-sm rounded border border-ferrari-graphite focus:border-ferrari-red focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Damaged Video Upload */}
        <UploadZone
          title="Damaged Tyre Video"
          onFileSelect={handleDamagedFileSelect}
          uploadedFile={damagedFile}
          previewUrl={damagedPreview}
          isDragActive={damagedDragActive}
          onDragEnter={() => setDamagedDragActive(true)}
          onDragLeave={() => setDamagedDragActive(false)}
          validationResult={damagedValidation}
          isValidating={isValidatingDamaged}
        />

        {/* Damaged Metadata */}
        {damagedFile && (
          <div className="mb-6 p-4 bg-ferrari-black rounded-lg border border-ferrari-graphite">
            <h4 className="text-ferrari-white text-sm font-semibold mb-3 uppercase">
              Damaged Tyre Metadata
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-ferrari-white text-xs mb-1">
                  Tyre Type *
                </label>
                <input
                  type="text"
                  value={damagedMetadata.tyreType}
                  onChange={(e) => setDamagedMetadata({ ...damagedMetadata, tyreType: e.target.value })}
                  placeholder="e.g., Front Left, Rear Right"
                  className="w-full px-3 py-2 bg-ferrari-graphite text-ferrari-white text-sm rounded border border-ferrari-graphite focus:border-ferrari-red focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-ferrari-white text-xs mb-1">
                  Compound *
                </label>
                <select
                  value={damagedMetadata.compound}
                  onChange={(e) => setDamagedMetadata({ ...damagedMetadata, compound: e.target.value })}
                  className="w-full px-3 py-2 bg-ferrari-graphite text-ferrari-white text-sm rounded border border-ferrari-graphite focus:border-ferrari-red focus:outline-none"
                >
                  <option value="">Select compound</option>
                  <option value="C1">C1 (Hard)</option>
                  <option value="C2">C2 (Medium)</option>
                  <option value="C3">C3 (Medium)</option>
                  <option value="C4">C4 (Soft)</option>
                  <option value="C5">C5 (Soft)</option>
                </select>
              </div>
              <div>
                <label className="block text-ferrari-white text-xs mb-1">
                  Laps Used
                </label>
                <input
                  type="number"
                  value={damagedMetadata.lapsUsed}
                  onChange={(e) => setDamagedMetadata({ ...damagedMetadata, lapsUsed: parseInt(e.target.value) || 0 })}
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2 bg-ferrari-graphite text-ferrari-white text-sm rounded border border-ferrari-graphite focus:border-ferrari-red focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reconstruct Button */}
      <div className="pt-4 border-t border-ferrari-graphite">
        <button
          onClick={onReconstruct}
          disabled={!canReconstruct || isProcessing}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold uppercase tracking-wide text-sm
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-2 focus:ring-offset-ferrari-black
            ${canReconstruct && !isProcessing
              ? 'bg-ferrari-red text-ferrari-white hover:bg-opacity-90 cursor-pointer'
              : 'bg-ferrari-graphite text-ferrari-white opacity-50 cursor-not-allowed'
            }
          `}
          aria-label={isProcessing ? `Processing 3D reconstruction: ${Math.round(processingProgress)}% complete` : 'Start 3D reconstruction'}
          aria-disabled={!canReconstruct || isProcessing}
        >
          {isProcessing ? (
            <LoadingIndicator 
              size="small" 
              color="white" 
              text={`Processing... ${Math.round(processingProgress)}%`}
            />
          ) : (
            'Reconstruct 3D Model'
          )}
        </button>
      </div>
    </div>
  );
};

export default UploadPanel;
