import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { StarIcon as StarIconSolid, PencilSquareIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline, GlobeAltIcon, LockClosedIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useNavigate, Link } from 'react-router-dom';
import { Watchlist } from '../../types/watchlist';
import { useAuth } from '../../hooks/useAuth';

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
  onDelete,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.id === watchlist.owner_id;
  const [swipeFeedback, setSwipeFeedback] = useState<'favorite' | 'delete' | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

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
    if (!isSwiping) {
      navigate(`/watchlist/${watchlist.id}`);
    }
  };

  const handlers = useSwipeable({
    onSwipedRight: (eventData) => {
      const touchStartX = eventData.initial[0];
      const cardRect = (eventData.event.target as Element).getBoundingClientRect();
      if (touchStartX - cardRect.left < 50) {
        setSwipeFeedback('favorite');
        onToggleFavorite(watchlist.id, watchlist.is_favorite ?? false);
        setTimeout(() => setSwipeFeedback(null), 600);
        eventData.event.stopPropagation();
      }
    },
    onSwipedLeft: (eventData) => {
      if (!onDelete) return;
      const touchStartX = eventData.initial[0];
      const cardRect = (eventData.event.target as Element).getBoundingClientRect();
      if (cardRect.right - touchStartX < 50) {
        setSwipeFeedback('delete');
        if (window.confirm(`Delete watchlist "${watchlist.title}"? This cannot be undone.`)) {
          onDelete(watchlist.id);
        } else {
          setSwipeFeedback(null);
        }
        setTimeout(() => setSwipeFeedback(null), 600);
        eventData.event.stopPropagation();
      }
    },
    onSwiping: () => setIsSwiping(true),
    onSwiped: () => setTimeout(() => setIsSwiping(false), 100),
    preventScrollOnSwipe: false,
    trackMouse: false,
    delta: 50,
  });

  return (
    <div
      {...handlers}
      data-no-swipe-navigate="true"
      onClick={handleCardClick}
      style={cardBgColor ? { backgroundColor: cardBgColor } : undefined}
      className={`group relative rounded-3xl p-5 border cursor-pointer transition-all duration-200 flex flex-col justify-between h-56 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 ${
        cardBgColor
          ? 'border-black/10 dark:border-white/10 text-white'
          : 'glass-panel hover:border-violet-500/40 dark:hover:border-violet-500/40'
      }`}
    >
      {/* Background Subtle Gradient Overlay */}
      {!cardBgColor && (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}

      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 shrink-0">
              {watchlist.is_public ? (
                <GlobeAltIcon className="h-4 w-4" title="Public Watchlist" />
              ) : (
                <LockClosedIcon className="h-4 w-4" title="Private Watchlist" />
              )}
            </span>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
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
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
          {watchlist.description || 'No description provided.'}
        </p>
      </div>

      {/* Swipe Feedback Overlay */}
      {swipeFeedback === 'favorite' && (
        <div className="absolute inset-y-0 left-0 bg-amber-500/80 backdrop-blur-sm flex items-center justify-center w-20 transition-all duration-300">
          <StarIconSolid className="h-8 w-8 text-white animate-hype" />
        </div>
      )}
      {swipeFeedback === 'delete' && (
        <div className="absolute inset-y-0 right-0 bg-rose-500/80 backdrop-blur-sm flex items-center justify-center w-20 transition-all duration-300">
          <TrashIcon className="h-8 w-8 text-white animate-hype" />
        </div>
      )}

      {/* Footer Details */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 min-w-0">
          {watchlist.owner?.avatar_url ? (
            <img
              src={watchlist.owner.avatar_url}
              alt={watchlist.owner.display_name || 'Owner avatar'}
              className="h-5 w-5 rounded-full object-cover border border-white/20 shrink-0"
            />
          ) : (
            <div className="h-5 w-5 rounded-full bg-violet-600/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-[10px] shrink-0">
              {(watchlist.owner?.display_name || 'U')[0].toUpperCase()}
            </div>
          )}
          <Link
            to={`/user/${watchlist.owner?.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-slate-700 dark:text-slate-300 font-medium truncate hover:underline hover:text-violet-500"
          >
            {watchlist.owner?.display_name || 'Unknown'}
          </Link>
        </div>

        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize shrink-0">
          {watchlist.member_role || 'Viewer'}
        </span>
      </div>
    </div>
  );
};

export default WatchlistCard;
