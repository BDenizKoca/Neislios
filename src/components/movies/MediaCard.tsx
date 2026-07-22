import React from 'react';
import { Link } from 'react-router-dom';
import { TmdbSearchResult, getMoviePosterUrl } from '../../services/tmdbService';
import { Profile } from '../../types/profile';
import { EyeIcon, EyeSlashIcon, PlusIcon, StarIcon, CalendarDaysIcon, FilmIcon } from '@heroicons/react/24/outline';

interface MediaCardProps {
  mediaItem: TmdbSearchResult;
  onAddToListClick?: (item: TmdbSearchResult) => void;
  isWatched?: boolean;
  onToggleWatched?: (item: TmdbSearchResult, currentState: boolean) => void;
  watchedByFriends?: Profile[];
  onNavigate?: (path: string) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({
  mediaItem,
  onAddToListClick,
  isWatched,
  onToggleWatched,
  watchedByFriends,
  onNavigate,
}) => {
  const posterUrl = getMoviePosterUrl(mediaItem.poster_path, 'w342');

  const title = mediaItem.media_type === 'movie' ? mediaItem.title : mediaItem.name;
  const year = mediaItem.media_type === 'movie'
    ? (mediaItem.release_date ? new Date(mediaItem.release_date).getFullYear() : 'N/A')
    : (mediaItem.first_air_date ? new Date(mediaItem.first_air_date).getFullYear() : 'N/A');
  const rating = mediaItem.vote_average ? mediaItem.vote_average.toFixed(1) : 'N/A';

  const detailLink = `/${mediaItem.media_type}/${mediaItem.id}`;

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAddToListClick) onAddToListClick(mediaItem);
  };

  const handleWatchedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onToggleWatched) onToggleWatched(mediaItem, !!isWatched);
  };

  const handleNavigate = (e: React.MouseEvent) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(detailLink);
    }
  };

  return (
    <div className="group relative glass-panel rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full border border-slate-200/80 dark:border-slate-800/80">
      <Link to={detailLink} onClick={handleNavigate} className="block relative aspect-[2/3] w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={`${title} poster`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-400 bg-slate-100 dark:bg-slate-900">
            <FilmIcon className="w-8 h-8 mb-2 text-slate-400" />
            <span className="text-xs font-semibold">{title}</span>
          </div>
        )}

        {/* Media Type Badge */}
        <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-slate-100 uppercase tracking-wider">
          {mediaItem.media_type}
        </span>

        {/* Rating Badge */}
        {rating !== 'N/A' && (
          <span className="absolute bottom-3 left-3 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 flex items-center gap-1">
            <StarIcon className="w-3 h-3 fill-slate-950 text-slate-950" />
            {rating}
          </span>
        )}

        {/* Watched Indicator */}
        {isWatched && (
          <div className="absolute bottom-3 right-3 bg-red-600 border border-white/20 text-white rounded-full p-2">
            <EyeIcon className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Hover Action Overlay Buttons */}
        <div className="absolute top-3 right-3 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onAddToListClick && (
            <button
              onClick={handleAddClick}
              className="p-2.5 bg-slate-900 hover:bg-red-600 text-white rounded-xl transition-all active:scale-95 border border-slate-700"
              aria-label="Add to list"
              title="Add to list"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          )}
          {onToggleWatched && (
            <button
              onClick={handleWatchedClick}
              className={`p-2.5 rounded-xl transition-all active:scale-95 border border-slate-700 ${
                isWatched
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-900 hover:bg-red-600 text-white'
              }`}
              aria-label={isWatched ? 'Mark unwatched' : 'Mark watched'}
              title={isWatched ? 'Mark unwatched' : 'Mark watched'}
            >
              {isWatched ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          )}
        </div>
      </Link>

      {/* Card Info Section */}
      <div className="p-4 flex flex-col justify-between flex-1">
        <div>
          <Link to={detailLink} onClick={handleNavigate} className="block group-hover:text-red-500 transition-colors">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1" title={title}>
              {title}
            </h3>
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="flex items-center gap-1">
              <CalendarDaysIcon className="h-3.5 w-3.5" />
              {year}
            </span>
          </div>
        </div>

        {watchedByFriends && watchedByFriends.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Watched by {watchedByFriends.length} friend{watchedByFriends.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(MediaCard);
