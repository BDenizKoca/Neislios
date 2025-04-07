import React from 'react';
import { Link } from 'react-router-dom';
import { TmdbSearchResult, getMoviePosterUrl } from '../../services/tmdbService'; // Use union type
import { Profile } from '../../types/profile';
import { EyeIcon, EyeSlashIcon, PlusIcon, StarIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

interface MediaCardProps {
  mediaItem: TmdbSearchResult; // Use union type
  onAddToListClick?: (item: TmdbSearchResult) => void; // Pass the item
  isWatched?: boolean;
  onToggleWatched?: (item: TmdbSearchResult, currentState: boolean) => void; // Pass the item
  watchedByFriends?: Profile[];
  // Removed watchedByMembers and addedBy as they are list-context specific
}

const MediaCard: React.FC<MediaCardProps> = ({
  mediaItem,
  onAddToListClick,
  isWatched,
  onToggleWatched,
  watchedByFriends,
}) => {
  const posterUrl = getMoviePosterUrl(mediaItem.poster_path, 'w342');

  // Determine title and year based on media type
  const title = mediaItem.media_type === 'movie' ? mediaItem.title : mediaItem.name;
  const year = mediaItem.media_type === 'movie'
    ? (mediaItem.release_date ? new Date(mediaItem.release_date).getFullYear() : 'N/A')
    : (mediaItem.first_air_date ? new Date(mediaItem.first_air_date).getFullYear() : 'N/A');
  const rating = mediaItem.vote_average ? mediaItem.vote_average.toFixed(1) : 'N/A';

  // Construct the correct link based on media type
  const detailLink = `/${mediaItem.media_type}/${mediaItem.id}`;

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    e.preventDefault();
    if (onAddToListClick) {
      onAddToListClick(mediaItem);
    }
  };

  const handleWatchedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onToggleWatched) {
      onToggleWatched(mediaItem, !!isWatched);
    }
  };

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-200">
      <Link to={detailLink}>
        {/* Image Container */}
        <div className="relative aspect-[2/3] w-full bg-gray-200 dark:bg-gray-700">
          {posterUrl ? (
            <img src={posterUrl} alt={`${title} poster`} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">No Poster</div>
          )}
          {/* Watched Overlay */}
          {isWatched && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
              <EyeIcon className="h-12 w-12 text-white opacity-80" />
            </div>
          )}
        </div>
      </Link>

      {/* Content Below Image */}
      <div className="p-4"> {/* Consistent padding */}
        <Link to={detailLink} className="block hover:text-primary dark:hover:text-primary">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary dark:group-hover:text-primary" title={title}>
              {title}
            </h3>
        </Link>
        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span className="flex items-center"><CalendarDaysIcon className="h-3 w-3 mr-1"/>{year}</span>
          {rating !== 'N/A' && <span className="flex items-center"><StarIcon className="h-3 w-3 mr-1 text-yellow-500"/>{rating}</span>}
        </div>
        {/* Friends Watched */}
        {watchedByFriends && watchedByFriends.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate" title={`Watched by: ${watchedByFriends.map(f => f.display_name).join(', ')}`}>
                Watched by {watchedByFriends.length} friend{watchedByFriends.length > 1 ? 's' : ''}
            </p>
        )}
      </div>

      {/* Action Buttons - Absolute positioned */}
      <div className="absolute top-2 right-2 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {onAddToListClick && (
          <button
            onClick={handleAddClick}
            className="p-2 bg-black bg-opacity-60 text-white rounded-full hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Add to list"
            title="Add to list"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        )}
        {onToggleWatched && (
           <button
            onClick={handleWatchedClick}
            className={`p-2 rounded-full focus:outline-none ${isWatched ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-black bg-opacity-60 text-white hover:bg-gray-700'}`}
            aria-label={isWatched ? 'Mark unwatched' : 'Mark watched'}
            title={isWatched ? 'Mark unwatched' : 'Mark watched'}
          >
            {isWatched ? <EyeSlashIcon className="h-4 w-4"/> : <EyeIcon className="h-4 w-4"/>}
          </button>
        )}
      </div>
    </div>
  );
};

export default MediaCard;