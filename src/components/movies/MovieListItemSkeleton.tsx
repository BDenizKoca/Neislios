import React from 'react';
import Skeleton from 'react-loading-skeleton';

const MovieListItemSkeleton: React.FC = () => {
  return (
    <div className="flex items-start p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-x-4">
      {/* Poster Skeleton */}
      <div className="flex-shrink-0 w-16">
        <Skeleton height={96} className="rounded" /> {/* Approximate height of poster */}
      </div>

      {/* Details Skeleton */}
      <div className="flex-grow min-w-0">
        <Skeleton width={`80%`} height={20} className="mb-1"/> {/* Title */}
        <Skeleton width={`60%`} height={14} count={1} className="mb-1"/> {/* Metadata */}
        <Skeleton width={`50%`} height={12} count={1} /> {/* Watched/Added By */}
      </div>

      {/* Action Button Skeleton */}
      <div className="ml-auto flex-shrink-0">
         <Skeleton circle height={32} width={32} /> {/* Watched toggle placeholder */}
      </div>
    </div>
  );
};

export default MovieListItemSkeleton;