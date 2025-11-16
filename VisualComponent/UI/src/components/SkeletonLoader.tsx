import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'card' | 'metric' | 'graph' | 'badge';
  width?: string;
  height?: string;
  count?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width = 'w-full',
  height = 'h-4',
  count = 1
}) => {
  const baseClasses = 'bg-ferrari-graphite animate-pulse rounded';

  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return (
          <div className={`${baseClasses} ${width} ${height}`} />
        );
      
      case 'card':
        return (
          <div className={`${baseClasses} p-4 border border-ferrari-graphite`}>
            <div className="space-y-3">
              <div className="h-4 bg-ferrari-black rounded w-3/4" />
              <div className="h-3 bg-ferrari-black rounded w-1/2" />
              <div className="h-3 bg-ferrari-black rounded w-full" />
            </div>
          </div>
        );
      
      case 'metric':
        return (
          <div className={`${baseClasses} p-4 border border-ferrari-graphite`}>
            <div className="space-y-2">
              <div className="h-3 bg-ferrari-black rounded w-1/3" />
              <div className="h-8 bg-ferrari-black rounded w-2/3" />
            </div>
          </div>
        );
      
      case 'graph':
        return (
          <div className={`${baseClasses} ${width} h-48 border border-ferrari-graphite`}>
            <div className="h-full flex items-end justify-around p-4 space-x-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-ferrari-black rounded-t w-full"
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                />
              ))}
            </div>
          </div>
        );
      
      case 'badge':
        return (
          <div className={`${baseClasses} h-6 w-24 inline-block`} />
        );
      
      default:
        return (
          <div className={`${baseClasses} ${width} ${height}`} />
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={count > 1 ? 'mb-3' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};

export default SkeletonLoader;
