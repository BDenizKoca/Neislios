import React from 'react';
import Skeleton from 'react-loading-skeleton';

const WatchlistCardSkeleton: React.FC = () => {
  return (
    <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center space-x-1.5">
            <Skeleton circle height={16} width={16} /> {/* Icon placeholder */}
            <Skeleton width={120} height={20} /> {/* Title placeholder */}
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton circle height={20} width={20} /> {/* Favorite icon placeholder */}
            {/* Optionally add edit icon placeholder if needed */}
          </div>
        </div>
        <Skeleton count={2} height={14} className="mb-1"/> {/* Description placeholder */}
      </div>
      <div className="text-xs mt-auto pt-2">
        <Skeleton width={100} height={12} className="mb-1"/> {/* Owner placeholder */}
        <Skeleton width={80} height={12} /> {/* Role placeholder */}
      </div>
    </div>
  );
};

export default WatchlistCardSkeleton;