import React from 'react';
import { StarIcon as StarIconSolid, PencilSquareIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline, GlobeAltIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useNavigate, Link } from 'react-router-dom';
import { Watchlist } from '../../types/watchlist';
import { useAuth } from '../../hooks/useAuth';

import { useWatchlistPreviewPosters } from '../../hooks/useWatchlistPreviewPosters';

interface WatchlistCardProps {
  watchlist: Watchlist;
  onToggleFavorite: (watchlistId: string, isCurrentlyFavorite: boolean) => void;
  onEdit: (watchlistId: string) => void;
  onDelete?: (watchlistId: string) => void;
}

const WatchlistCard: React.FC<WatchlistCardProps> = ({
  watchlist,
  onToggleFavorite,
  onEdit,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const posters = useWatchlistPreviewPosters(watchlist.id);
  const isOwner = user?.id === watchlist.owner_id;

  const cardBgColor = watchlist.card_color || undefined;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(watchlist.id, watchlist.is_favorite ?? false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(watchlist.id);
  };

  const handleCardClick = () => {
    navigate(`/watchlist/${watchlist.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative rounded-3xl p-5 border cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[240px] overflow-hidden glass-panel hover:border-red-500/40 dark:hover:border-red-500/40 shadow-sm hover:shadow-xl hover:-translate-y-1"
    >
      {/* Card Theme Accent Bar */}
      {cardBgColor && (
        <div 
          className="absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl" 
          style={{ backgroundColor: cardBgColor }} 
        />
      )}

      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-xl bg-slate-200/50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 shrink-0">
              {watchlist.is_public ? (
                <GlobeAltIcon className="h-4 w-4" title="Public Watchlist" />
              ) : (
                <LockClosedIcon className="h-4 w-4" title="Private Watchlist" />
              )}
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
              {watchlist.title}
            </h3>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={handleFavoriteClick}
              className={`p-2 rounded-xl transition-transform active:scale-95 focus:outline-none ${
                watchlist.is_favorite
                  ? 'text-amber-400 hover:text-amber-500 bg-amber-400/10'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-label={watchlist.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {watchlist.is_favorite ? (
                <StarIconSolid className="h-5 w-5" />
              ) : (
                <StarIconOutline className="h-5 w-5" />
              )}
            </button>

            {isOwner && (
              <button
                onClick={handleEditClick}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                aria-label="Edit watchlist"
              >
                <PencilSquareIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-1 font-medium mb-2.5">
          {watchlist.description || 'No description provided.'}
        </p>

        {/* Poster Previews Row */}
        {posters.length > 0 ? (
          <div className="flex items-center gap-2 overflow-hidden py-1">
            {posters.slice(0, 4).map((posterUrl, idx) => (
              <img
                key={idx}
                src={posterUrl}
                alt="Watchlist item preview"
                className="w-10 h-14 sm:w-11 sm:h-16 object-cover rounded-xl shadow-md border border-slate-200/60 dark:border-slate-700/60 shrink-0 transform transition-transform group-hover:scale-105"
                loading="lazy"
              />
            ))}
          </div>
        ) : (
          <div className="h-14 flex items-center text-xs text-slate-400/80 font-medium italic">
            No media items added yet
          </div>
        )}
      </div>



      {/* Footer Details */}
      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center space-x-2 min-w-0">
          {watchlist.owner?.avatar_url ? (
            <img
              src={watchlist.owner.avatar_url}
              alt={watchlist.owner.display_name || 'Owner avatar'}
              className="h-6 w-6 rounded-full object-cover border border-white/20 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(watchlist.owner?.display_name || 'User')}&background=e50914&color=fff&bold=true`;
              }}
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-red-600/10 text-red-500 flex items-center justify-center font-bold text-xs shrink-0">
              {(watchlist.owner?.display_name || 'U')[0].toUpperCase()}
            </div>
          )}
          <Link
            to={`/user/${watchlist.owner?.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-slate-800 dark:text-slate-200 font-semibold truncate hover:underline hover:text-red-500"
          >
            {watchlist.owner?.display_name || 'Unknown'}
          </Link>
        </div>

        <span className="text-xs px-3 py-1 rounded-xl font-bold bg-slate-200/60 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 capitalize shrink-0">
          {watchlist.member_role || 'Viewer'}
        </span>
      </div>
    </div>
  );
};

export default React.memo(WatchlistCard);
