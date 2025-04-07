import React from 'react';
import { Link } from 'react-router-dom';
import { TmdbMediaDetails, getMoviePosterUrl, TmdbMovieDetails, TmdbTvDetails } from '../../services/tmdbService';
import { Profile } from '../../types/profile';
import { EyeIcon, EyeSlashIcon, CalendarDaysIcon, StarIcon, ClockIcon, UserGroupIcon, MinusCircleIcon, TvIcon, Bars3Icon } from '@heroicons/react/24/outline';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

// Helper type guards
function isMovieDetails(details: TmdbMediaDetails): details is TmdbMovieDetails {
  return details.media_type === 'movie';
}
function isTvDetails(details: TmdbMediaDetails): details is TmdbTvDetails {
  return details.media_type === 'tv';
}

interface MediaListItemProps {
  mediaItem: TmdbMediaDetails;
  isWatched?: boolean;
  onToggleWatched?: (item: TmdbMediaDetails, currentState: boolean) => void;
  watchedByMembers?: Profile[];
  addedBy?: Profile | null;
  onRemoveClick?: () => void;
  showDragHandle?: boolean;
  attributes?: DraggableAttributes;
  listeners?: SyntheticListenerMap | undefined;
}

const MediaListItem: React.FC<MediaListItemProps> = ({
  mediaItem,
  isWatched,
  onToggleWatched,
  watchedByMembers,
  addedBy,
  onRemoveClick,
  showDragHandle,
  attributes,
  listeners,
}) => {
  const posterUrl = getMoviePosterUrl(mediaItem.poster_path, 'w185');

  const title = isMovieDetails(mediaItem) ? mediaItem.title : mediaItem.name;
  const year = isMovieDetails(mediaItem)
    ? (mediaItem.release_date ? new Date(mediaItem.release_date).getFullYear() : 'N/A')
    : (mediaItem.first_air_date ? new Date(mediaItem.first_air_date).getFullYear() : 'N/A');
  const rating = mediaItem.vote_average ? mediaItem.vote_average.toFixed(1) : 'N/A';
  const runtime = isMovieDetails(mediaItem) && mediaItem.runtime ? `${mediaItem.runtime} min` : (isTvDetails(mediaItem) && mediaItem.episode_run_time?.[0] ? `${mediaItem.episode_run_time[0]} min/ep` : null);

  const watchedByText = watchedByMembers && watchedByMembers.length > 0
    ? `Watched by: ${watchedByMembers.map(m => m.display_name).slice(0, 2).join(', ')}${watchedByMembers.length > 2 ? '...' : ''}`
    : null;

  // Correct handler for watch toggle button
  const handleWatchedToggleClick = (e: React.MouseEvent) => {
    // Prevent navigation ONLY if drag handle is shown (meaning we are in manage page)
    // On other pages, the button click should not interfere with link navigation
    if (showDragHandle) {
        e.stopPropagation();
        e.preventDefault();
    }
    if (onToggleWatched) {
        onToggleWatched(mediaItem, !!isWatched);
    }
  };

  // Correct handler for remove button
  const handleRemoveClick = (e: React.MouseEvent) => {
    // Always prevent navigation when clicking remove
    e.stopPropagation();
    e.preventDefault();
    if (onRemoveClick) {
        onRemoveClick();
    }
  };


  const detailLink = `/${mediaItem.media_type}/${mediaItem.id}`;

  return (
    <div className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 space-x-2">
        {/* Drag Handle (receives listeners) */}
        {showDragHandle && (
            <div
                className="flex-shrink-0 cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                title="Drag to reorder"
                {...attributes} // Spread attributes onto the handle
                {...listeners}  // Spread listeners onto the handle
            >
                <Bars3Icon className="h-5 w-5" />
            </div>
        )}
        {/* Link wraps only the clickable content area */}
        <Link to={detailLink} className="flex items-start flex-grow space-x-4 min-w-0">
          <div className="flex-shrink-0 w-16">
            {posterUrl ? (
              <img src={posterUrl} alt={`${title} poster`} className="w-full h-auto object-cover rounded" />
            ) : (
              <div className="w-16 h-24 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-xs text-center rounded">No Poster</div>
            )}
          </div>
          <div className="flex-grow min-w-0">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white truncate" title={title}>
              {title}
            </h3>
            <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
              <span className="flex items-center"><CalendarDaysIcon className="h-3 w-3 mr-1 inline-block"/>{year}</span>
              {rating !== 'N/A' && <span className="flex items-center"><StarIcon className="h-3 w-3 mr-1 inline-block text-yellow-500"/>{rating}</span>}
              {runtime && <span className="flex items-center"><ClockIcon className="h-3 w-3 mr-1 inline-block"/>{runtime}</span>}
              {isTvDetails(mediaItem) && <span className="flex items-center"><TvIcon className="h-3 w-3 mr-1 inline-block"/>TV</span>}
            </div>
            {watchedByText && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                     <UserGroupIcon className="h-3 w-3 mr-1 inline-block"/>
                     <span className="truncate" title={watchedByText || undefined}>{watchedByText}</span>
                </div>
            )}
            {addedBy && (
                 <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                     <span>Added by: {addedBy.display_name}</span>
                 </div>
            )}
          </div>
        </Link>

        {/* Action Buttons (outside the link) */}
        <div className="flex flex-col sm:flex-row items-center flex-shrink-0 space-y-1 sm:space-y-0 sm:space-x-2">
            {onToggleWatched && (
                <button
                    onClick={handleWatchedToggleClick} // Use corrected handler
                    className={`p-2 rounded-full focus:outline-none transition-colors duration-200 ${
                        isWatched
                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
                >
                    {isWatched ? <EyeIcon className="h-5 w-5"/> : <EyeSlashIcon className="h-5 w-5"/>}
                </button>
            )}
            {onRemoveClick && (
                 <button
                      onClick={handleRemoveClick} // Use corrected handler
                      className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900 focus:outline-none"
                      aria-label="Remove item from list"
                  >
                       <MinusCircleIcon className="h-5 w-5" />
                  </button>
            )}
        </div>
    </div>
  );
};

export default MediaListItem;