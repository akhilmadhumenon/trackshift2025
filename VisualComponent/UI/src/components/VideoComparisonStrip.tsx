import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useAppStore } from '../store';
import LoadingIndicator from './LoadingIndicator';

interface VideoComparisonStripProps {}

const VideoComparisonStrip: React.FC<VideoComparisonStripProps> = () => {
  // Get state and actions from Zustand store
  const updateVideoTimestamp = useAppStore((state) => state.updateVideoTimestamp);
  const setVideoDuration = useAppStore((state) => state.setVideoDuration);
  
  // Hardcoded video URLs
  const referenceVideoUrl = '/Actual.mp4';
  const damagedVideoUrl = '/Canny.mov';
  const differenceVideoUrl = '/CNN.mov';
  const referenceVideoRef = useRef<HTMLVideoElement>(null);
  const damagedVideoRef = useRef<HTMLVideoElement>(null);
  const differenceVideoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isBuffering, setIsBuffering] = useState({
    reference: false,
    damaged: false,
    difference: false
  });
  const [, setBufferProgress] = useState({
    reference: 0,
    damaged: 0,
    difference: 0
  });

  // Get all video refs as an array for easier iteration
  const videoRefs = [referenceVideoRef, damagedVideoRef, differenceVideoRef];

  // Load metadata and set duration when videos are loaded
  useEffect(() => {
    const handleLoadedMetadata = () => {
      // Use the reference video as the source of truth for duration
      if (referenceVideoRef.current) {
        const videoDuration = referenceVideoRef.current.duration;
        setDuration(videoDuration);
        // Update store with video duration for 3D sync
        setVideoDuration(videoDuration);
      }
    };

    const refVideo = referenceVideoRef.current;
    if (refVideo) {
      refVideo.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        refVideo.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [referenceVideoUrl, setVideoDuration]);
  
  // Add buffering event listeners with progress tracking
  useEffect(() => {
    const handleWaiting = (type: 'reference' | 'damaged' | 'difference') => () => {
      setIsBuffering(prev => ({ ...prev, [type]: true }));
    };
    
    const handleCanPlay = (type: 'reference' | 'damaged' | 'difference') => () => {
      setIsBuffering(prev => ({ ...prev, [type]: false }));
    };
    
    const handleProgress = (type: 'reference' | 'damaged' | 'difference', videoRef: React.RefObject<HTMLVideoElement>) => () => {
      const video = videoRef.current;
      if (video && video.buffered.length > 0) {
        // Calculate buffered percentage
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;
        if (duration > 0) {
          const bufferedPercent = (bufferedEnd / duration) * 100;
          setBufferProgress(prev => ({ ...prev, [type]: bufferedPercent }));
        }
      }
    };
    
    const refVideo = referenceVideoRef.current;
    const damVideo = damagedVideoRef.current;
    const diffVideo = differenceVideoRef.current;
    
    if (refVideo) {
      refVideo.addEventListener('waiting', handleWaiting('reference'));
      refVideo.addEventListener('canplay', handleCanPlay('reference'));
      refVideo.addEventListener('progress', handleProgress('reference', referenceVideoRef));
      refVideo.addEventListener('canplaythrough', handleCanPlay('reference'));
    }
    if (damVideo) {
      damVideo.addEventListener('waiting', handleWaiting('damaged'));
      damVideo.addEventListener('canplay', handleCanPlay('damaged'));
      damVideo.addEventListener('progress', handleProgress('damaged', damagedVideoRef));
      damVideo.addEventListener('canplaythrough', handleCanPlay('damaged'));
    }
    if (diffVideo) {
      diffVideo.addEventListener('waiting', handleWaiting('difference'));
      diffVideo.addEventListener('canplay', handleCanPlay('difference'));
      diffVideo.addEventListener('progress', handleProgress('difference', differenceVideoRef));
      diffVideo.addEventListener('canplaythrough', handleCanPlay('difference'));
    }
    
    return () => {
      if (refVideo) {
        refVideo.removeEventListener('waiting', handleWaiting('reference'));
        refVideo.removeEventListener('canplay', handleCanPlay('reference'));
        refVideo.removeEventListener('progress', handleProgress('reference', referenceVideoRef));
        refVideo.removeEventListener('canplaythrough', handleCanPlay('reference'));
      }
      if (damVideo) {
        damVideo.removeEventListener('waiting', handleWaiting('damaged'));
        damVideo.removeEventListener('canplay', handleCanPlay('damaged'));
        damVideo.removeEventListener('progress', handleProgress('damaged', damagedVideoRef));
        damVideo.removeEventListener('canplaythrough', handleCanPlay('damaged'));
      }
      if (diffVideo) {
        diffVideo.removeEventListener('waiting', handleWaiting('difference'));
        diffVideo.removeEventListener('canplay', handleCanPlay('difference'));
        diffVideo.removeEventListener('progress', handleProgress('difference', differenceVideoRef));
        diffVideo.removeEventListener('canplaythrough', handleCanPlay('difference'));
      }
    };
  }, [referenceVideoUrl, damagedVideoUrl, differenceVideoUrl]);

  // Synchronize time updates across all videos
  const handleTimeUpdate = useCallback(() => {
    if (!isSeeking && referenceVideoRef.current) {
      const time = referenceVideoRef.current.currentTime;
      setCurrentTime(time);
      
      // Update store with current video timestamp for 3D sync
      updateVideoTimestamp(time);

      // Sync other videos if they drift more than 50ms
      const syncThreshold = 0.05; // 50ms
      videoRefs.forEach((ref) => {
        if (ref.current && ref !== referenceVideoRef) {
          const timeDiff = Math.abs(ref.current.currentTime - time);
          if (timeDiff > syncThreshold) {
            ref.current.currentTime = time;
          }
        }
      });
    }
  }, [isSeeking, videoRefs, updateVideoTimestamp]);

  // Attach time update listener to reference video
  useEffect(() => {
    const refVideo = referenceVideoRef.current;
    if (refVideo) {
      refVideo.addEventListener('timeupdate', handleTimeUpdate);
      return () => {
        refVideo.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [handleTimeUpdate]);

  // Preload videos ahead of current playback position
  useEffect(() => {
    if (isPlaying) {
      videoRefs.forEach((ref) => {
        if (ref.current) {
          // Ensure video continues to buffer ahead
          const video = ref.current;
          if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const currentTime = video.currentTime;
            const bufferAhead = bufferedEnd - currentTime;
            
            // If buffer is less than 5 seconds ahead, trigger preload
            if (bufferAhead < 5 && video.readyState < 4) {
              video.load();
            }
          }
        }
      });
    }
  }, [isPlaying, currentTime, videoRefs]);

  // Play/Pause all videos synchronously
  const togglePlayPause = useCallback(() => {
    const allVideosLoaded = videoRefs.every(
      (ref) => !ref.current || ref.current.readyState >= 2
    );

    if (!allVideosLoaded) {
      // Try to load videos if not ready
      videoRefs.forEach((ref) => {
        if (ref.current && ref.current.readyState < 2) {
          ref.current.load();
        }
      });
      return;
    }

    if (isPlaying) {
      // Pause all videos
      videoRefs.forEach((ref) => {
        if (ref.current) {
          ref.current.pause();
        }
      });
      setIsPlaying(false);
    } else {
      // Play all videos
      const playPromises = videoRefs.map((ref) => {
        if (ref.current) {
          return ref.current.play();
        }
        return Promise.resolve();
      });

      Promise.all(playPromises)
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error('Error playing videos:', error);
          // Retry once if playback fails
          setTimeout(() => {
            const retryPromises = videoRefs.map((ref) => {
              if (ref.current) {
                return ref.current.play();
              }
              return Promise.resolve();
            });
            Promise.all(retryPromises)
              .then(() => setIsPlaying(true))
              .catch((err) => console.error('Retry failed:', err));
          }, 500);
        });
    }
  }, [isPlaying, videoRefs]);

  // Step forward by one frame (assuming 30fps)
  const stepForward = useCallback(() => {
    const frameTime = 1 / 30; // ~33ms per frame at 30fps
    const newTime = Math.min(currentTime + frameTime, duration);
    
    videoRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.currentTime = newTime;
      }
    });
    setCurrentTime(newTime);
  }, [currentTime, duration, videoRefs]);

  // Step backward by one frame
  const stepBackward = useCallback(() => {
    const frameTime = 1 / 30;
    const newTime = Math.max(currentTime - frameTime, 0);
    
    videoRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.currentTime = newTime;
      }
    });
    setCurrentTime(newTime);
  }, [currentTime, videoRefs]);

  // Handle timeline scrubber change
  const handleScrubberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    setIsSeeking(true);
    
    // Update store with new timestamp for 3D sync
    updateVideoTimestamp(newTime);

    // Update all videos to the new time
    videoRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.currentTime = newTime;
      }
    });
  }, [videoRefs, updateVideoTimestamp]);

  // Handle scrubber mouse up (end seeking)
  const handleScrubberMouseUp = useCallback(() => {
    setIsSeeking(false);
  }, []);

  // Format time as MM:SS
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-ferrari-black" role="region" aria-label="Video comparison viewer">
      {/* Three-column layout for video players - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 flex-1 min-h-0" role="group" aria-label="Video players">
        {/* Actual Video Column */}
        <div className="flex flex-col border-r border-ferrari-graphite min-h-0">
          <div className="bg-ferrari-graphite border-b border-ferrari-black px-2 sm:px-4 py-1.5 sm:py-2 flex-shrink-0">
            <h3 className="text-ferrari-white font-formula text-xs sm:text-sm font-semibold tracking-wide truncate" id="reference-video-label">
              <span className="hidden sm:inline">Actual Video</span>
              <span className="sm:hidden">Actual</span>
            </h3>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center relative min-h-0 overflow-hidden">
            {referenceVideoUrl ? (
              <>
                <video
                  ref={referenceVideoRef}
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                  src={referenceVideoUrl}
                  playsInline
                  preload="auto"
                  crossOrigin="anonymous"
                  aria-labelledby="reference-video-label"
                  aria-describedby="video-controls"
                />
                {isBuffering.reference && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <LoadingIndicator size="medium" color="white" text="Buffering..." />
                  </div>
                )}
              </>
            ) : (
              <div className="text-ferrari-white/50 text-sm">
                No actual video
              </div>
            )}
          </div>
        </div>

        {/* Canny Video Column */}
        <div className="flex flex-col border-r border-ferrari-graphite min-h-0">
          <div className="bg-ferrari-graphite border-b border-ferrari-black px-2 sm:px-4 py-1.5 sm:py-2 flex-shrink-0">
            <h3 className="text-ferrari-white font-formula text-xs sm:text-sm font-semibold tracking-wide truncate" id="damaged-video-label">
              <span className="hidden sm:inline">Canny Video</span>
              <span className="sm:hidden">Canny</span>
            </h3>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center relative min-h-0 overflow-hidden">
            {damagedVideoUrl ? (
              <>
                <video
                  ref={damagedVideoRef}
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                  src={damagedVideoUrl}
                  playsInline
                  preload="auto"
                  crossOrigin="anonymous"
                  aria-labelledby="damaged-video-label"
                  aria-describedby="video-controls"
                  style={{ filter: 'brightness(1.2) contrast(1.2)' }}
                />
                {isBuffering.damaged && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <LoadingIndicator size="medium" color="white" text="Buffering..." />
                  </div>
                )}
              </>
            ) : (
              <div className="text-ferrari-white/50 text-sm">
                No canny video
              </div>
            )}
          </div>
        </div>

        {/* CNN Video Column */}
        <div className="flex flex-col min-h-0">
          <div className="bg-ferrari-graphite border-b border-ferrari-black px-2 sm:px-4 py-1.5 sm:py-2 flex-shrink-0">
            <h3 className="text-ferrari-white font-formula text-xs sm:text-sm font-semibold tracking-wide truncate" id="difference-video-label">
              <span className="hidden sm:inline">CNN Video</span>
              <span className="sm:hidden">CNN</span>
            </h3>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center relative min-h-0 overflow-hidden">
            {differenceVideoUrl ? (
              <>
                <video
                  ref={differenceVideoRef}
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                  src={differenceVideoUrl}
                  playsInline
                  preload="auto"
                  crossOrigin="anonymous"
                  aria-labelledby="difference-video-label"
                  aria-describedby="video-controls"
                />
                {isBuffering.difference && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <LoadingIndicator size="medium" color="white" text="Buffering..." />
                  </div>
                )}
              </>
            ) : (
              <div className="text-ferrari-white/50 text-sm">
                No CNN video
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unified Playback Controls - Responsive */}
      <div className="bg-ferrari-graphite border-t border-ferrari-black px-2 sm:px-4 py-2 sm:py-3 flex-shrink-0" id="video-controls">
        <div className="flex items-center gap-2 sm:gap-4" role="toolbar" aria-label="Video playback controls">
          {/* Play/Pause and Frame Step Controls - Touch-friendly */}
          <div className="flex items-center gap-1 sm:gap-2" role="group" aria-label="Playback buttons">
            <button
              onClick={stepBackward}
              disabled={!referenceVideoUrl || currentTime === 0}
              className="p-1.5 sm:p-2 rounded hover:bg-ferrari-black/50 active:bg-ferrari-black/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-2 focus:ring-offset-ferrari-graphite"
              title="Step backward one frame"
              aria-label="Step backward one frame"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 text-ferrari-white" aria-hidden="true" />
            </button>
            
            <button
              onClick={togglePlayPause}
              disabled={!referenceVideoUrl}
              className="p-1.5 sm:p-2 rounded bg-ferrari-red hover:bg-ferrari-red/80 active:bg-ferrari-red/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-2 focus:ring-offset-ferrari-graphite"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause all videos' : 'Play all videos'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-ferrari-white" fill="currentColor" aria-hidden="true" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 text-ferrari-white" fill="currentColor" aria-hidden="true" />
              )}
            </button>
            
            <button
              onClick={stepForward}
              disabled={!referenceVideoUrl || currentTime >= duration}
              className="p-1.5 sm:p-2 rounded hover:bg-ferrari-black/50 active:bg-ferrari-black/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-2 focus:ring-offset-ferrari-graphite"
              title="Step forward one frame"
              aria-label="Step forward one frame"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 text-ferrari-white" aria-hidden="true" />
            </button>
          </div>

          {/* Current Time Display - Responsive sizing */}
          <div 
            className="text-ferrari-white font-mono text-[10px] sm:text-sm min-w-[60px] sm:min-w-[80px]"
            role="timer"
            aria-live="off"
            aria-label={`Current time: ${formatTime(currentTime)} of ${formatTime(duration)}`}
          >
            <span className="hidden sm:inline">{formatTime(currentTime)} / {formatTime(duration)}</span>
            <span className="sm:hidden">{formatTime(currentTime)}</span>
          </div>

          {/* Timeline Scrubber - Touch-friendly */}
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.01"
              value={currentTime}
              onChange={handleScrubberChange}
              onMouseUp={handleScrubberMouseUp}
              onTouchEnd={handleScrubberMouseUp}
              disabled={!referenceVideoUrl}
              className="w-full h-2 sm:h-2.5 bg-ferrari-black rounded-lg appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-2 focus:ring-offset-ferrari-graphite
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ferrari-red 
                [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:bg-ferrari-red/80
                [&::-webkit-slider-thumb]:active:bg-ferrari-red/80
                [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full 
                [&::-moz-range-thumb]:bg-ferrari-red [&::-moz-range-thumb]:border-0 
                [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:hover:bg-ferrari-red/80
                [&::-moz-range-thumb]:active:bg-ferrari-red/80"
              style={{
                background: referenceVideoUrl
                  ? `linear-gradient(to right, #FF1801 0%, #FF1801 ${(currentTime / duration) * 100}%, #000000 ${(currentTime / duration) * 100}%, #000000 100%)`
                  : '#000000'
              }}
              aria-label="Video timeline scrubber"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={currentTime}
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoComparisonStrip;
