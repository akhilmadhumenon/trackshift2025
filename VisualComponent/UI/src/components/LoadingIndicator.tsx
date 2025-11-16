import React from 'react';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'red' | 'white';
  text?: string;
  progress?: number;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'medium',
  color = 'red',
  text,
  progress
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const colorClasses = {
    red: 'border-ferrari-red',
    white: 'border-ferrari-white'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      {/* Circular spinner */}
      <div
        className={`
          ${sizeClasses[size]} 
          border-2 
          ${colorClasses[color]} 
          border-t-transparent 
          rounded-full 
          animate-spin
        `}
      />
      
      {/* Progress percentage */}
      {progress !== undefined && (
        <div className="text-center">
          <div className="text-ferrari-white font-bold text-2xl">
            {Math.round(progress)}%
          </div>
          <div className="w-48 h-2 bg-ferrari-graphite rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-ferrari-red transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Loading text */}
      {text && (
        <p className="text-ferrari-white text-sm font-formula">
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingIndicator;
