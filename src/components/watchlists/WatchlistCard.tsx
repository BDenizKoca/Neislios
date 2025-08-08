import { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { StarIcon as StarIconSolid, PencilSquareIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline, GlobeAltIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useNavigate, Link } from 'react-router-dom';
import { Watchlist } from '../../types/watchlist';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';

interface WatchlistCardProps {
  watchlist: Watchlist;
  onToggleFavorite: (watchlistId: string, isCurrentlyFavorite: boolean) => void;
  onEdit: (watchlistId: string) => void;
  onDelete?: (watchlistId: string) => void; // Add onDelete prop (optional)
}

// Function to determine text color based on background hex color
const getContrastingTextColor = (hexColor: string | null | undefined): 'text-black' | 'text-white' => {
    if (!hexColor || hexColor === '#ffffff') return 'text-black'; // Default black for white/missing bg
    if (hexColor === '#000000') return 'text-white'; // Default white for black bg

    try {
        // Basic luminance calculation (simplified)
        const rgb = parseInt(hexColor.substring(1), 16); // Convert hex to integer
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per WCAG
        return luminance > 140 ? 'text-black' : 'text-white'; // Threshold might need adjustment
    } catch (e) {
        logger.error("Error parsing color:", hexColor, e);
        return 'text-black'; // Default to black on error
    }
};

const WatchlistCard = ({
  watchlist,
  onToggleFavorite,
  onEdit,
  onDelete, // Destructure onDelete
}: WatchlistCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.id === watchlist.owner_id;

  const cardBgColor = watchlist.card_color || '#ffffff'; // Default white if null/undefined
  const cardTextColorClass = getContrastingTextColor(cardBgColor); // Returns 'text-black' or 'text-white'
  
  // Note: Inline style required for user-customizable background color
  // The background color is stored in the database and set by users
  const cardStyle: React.CSSProperties = {
    backgroundColor: cardBgColor,
  };

  // Determine secondary text color based on primary text color
  const secondaryTextColorClass = cardTextColorClass === 'text-white' ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400';

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(watchlist.id, watchlist.is_favorite ?? false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
     e.stopPropagation();
     onEdit(watchlist.id);
  };

   const handleCardClick = () => {
    // Only navigate if not currently swiping (to avoid accidental navigation)
    if (!isSwiping) {
        navigate(`/watchlist/${watchlist.id}`);
    }
  };

  const [swipeFeedback, setSwipeFeedback] = useState<'favorite' | 'delete' | null>(null);
  const [isSwiping, setIsSwiping] = useState(false); // Track swipe state

  // Swipe Handlers
  const handlers = useSwipeable({
    onSwipedRight: (eventData) => {
        // Only handle swipes that start from the left edge of the card
        const touchStartX = eventData.initial[0];
        const cardRect = (eventData.event.target as Element).getBoundingClientRect();
        const isFromLeftEdge = touchStartX - cardRect.left < 50; // 50px from left edge

        if (isFromLeftEdge) {
            // Handle right swipe from edge
            setSwipeFeedback('favorite');
            onToggleFavorite(watchlist.id, watchlist.is_favorite ?? false);
            setTimeout(() => setSwipeFeedback(null), 600);
            // Stop event propagation
            eventData.event.stopPropagation();
        }
    },
    onSwipedLeft: (eventData) => {
        if (!onDelete) return;

        // Only handle swipes that start from the right edge of the card
        const touchStartX = eventData.initial[0];
        const cardRect = (eventData.event.target as Element).getBoundingClientRect();
        const isFromRightEdge = cardRect.right - touchStartX < 50; // 50px from right edge

        if (isFromRightEdge) {
            // Handle left swipe from edge
            setSwipeFeedback('delete');
            if (window.confirm(`Delete watchlist "${watchlist.title}"? This cannot be undone.`)) {
                onDelete(watchlist.id);
            } else {
                setSwipeFeedback(null);
            }
            setTimeout(() => setSwipeFeedback(null), 600);
            // Stop event propagation
            eventData.event.stopPropagation();
        }
    },
    onSwiping: () => setIsSwiping(true),
    onSwiped: () => setTimeout(() => setIsSwiping(false), 100),
    preventScrollOnSwipe: false, // Allow swipes to propagate
    trackMouse: false, // Only handle touch events
    delta: 50 // Minimum swipe distance
  });

  return (
    // Apply swipe handlers to the main div
    <div
      {...handlers}
      data-no-swipe-navigate="true" // Add data attribute to identify this element
      className={`relative rounded-lg shadow-md p-4 border border-transparent cursor-pointer hover:shadow-lg hover:brightness-95 dark:hover:brightness-110 transition-all duration-200 flex flex-col justify-between h-full overflow-hidden`} // Use brightness instead of bg change due to dynamic color
      /* Inline style required for user-customizable card background color */
      /* The background color is stored in the database and set by users */
      style={cardStyle}
      onClick={handleCardClick}
    >
      <div className="overflow-hidden"> {/* Prevent content overflow */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center space-x-1.5"> {/* Wrap title and icon */}
                {watchlist.is_public
                    ? <GlobeAltIcon className={`h-4 w-4 ${secondaryTextColorClass}`} title="Public" aria-label="Public watchlist"/>
                    : <LockClosedIcon className={`h-4 w-4 ${secondaryTextColorClass}`} title="Private" aria-label="Private watchlist"/>
                }
                <h3 className={`text-lg font-semibold ${cardTextColorClass}`}>{watchlist.title}</h3>
            </div>
            <div className="flex items-center space-x-2">
               {/* Favorite Icon */}
               <button
                 onClick={handleFavoriteClick}
                 className={`p-1 rounded-full focus:outline-none ${watchlist.is_favorite ? 'text-yellow-400 hover:text-yellow-500' : `${secondaryTextColorClass} hover:text-yellow-400`}`}
                 aria-label={watchlist.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
               >
                 {watchlist.is_favorite ? (
                    <StarIconSolid className="h-5 w-5" aria-hidden="true" />
                 ) : (
                    <StarIconOutline className="h-5 w-5" aria-hidden="true" />
                 )}
               </button>
               {/* Quick Edit Button (if Owner) */}
               {isOwner && (
                 <button
                   onClick={handleEditClick}
                   className={`p-1 rounded-full focus:outline-none ${secondaryTextColorClass} hover:${cardTextColorClass}`}
                   aria-label="Edit watchlist"
                 >
                    <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                 </button>
               )}
            </div>
            {/* Swipe Feedback Indicator */}
            {swipeFeedback === 'favorite' && (
                <div className="absolute inset-y-0 left-0 bg-yellow-400 bg-opacity-70 flex items-center justify-center w-16 transition-opacity duration-300 ease-in-out">
                    <StarIconSolid className="h-8 w-8 text-white" />
                </div>
            )}
             {swipeFeedback === 'delete' && (
                <div className="absolute inset-y-0 right-0 bg-red-500 bg-opacity-70 flex items-center justify-center w-16 transition-opacity duration-300 ease-in-out">
                    {/* Add Trash Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                       <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </div>
            )}
          </div>
          {/* Apply primary contrasting color to description */}
          <p className={`text-sm mb-3 ${cardTextColorClass} break-words`}>
            {watchlist.description || ''}
          </p>
          
      </div>
      {/* Bottom section for owner/role */}
      {/* Apply primary contrasting color to owner/role text */}
      <div className={`text-xs mt-auto pt-2 ${cardTextColorClass}`}> {/* Apply base color here */}
        <p className="flex items-center space-x-1">
            {/* Keep secondary color for the label potentially? Or use primary? Let's use primary for consistency. */}
            <span>Owner:</span>
            {watchlist.owner?.avatar_url && (
                 <img
                    src={watchlist.owner.avatar_url}
                    alt={`${watchlist.owner.display_name}'s avatar`}
                    className="h-4 w-4 rounded-full object-cover inline-block"
                 />
            )}
            {/* Apply hover effect based on primary text color */}
            <Link
                to={`/user/${watchlist.owner?.id}`}
                onClick={(e) => e.stopPropagation()}
                className={`${cardTextColorClass === 'text-white' ? 'hover:text-gray-300' : 'hover:text-gray-600'} hover:underline`}
            >
                {watchlist.owner?.display_name || 'Unknown'}
            </Link>
        </p>
        <p>Your Role: <span className="font-medium capitalize">{watchlist.member_role || 'Viewer'}</span></p>
      </div>
    </div>
  );
};

export default WatchlistCard;
