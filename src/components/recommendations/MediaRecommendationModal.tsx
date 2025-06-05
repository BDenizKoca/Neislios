import React, { useEffect, useState, useCallback } from 'react'; // Add useCallback
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'; // Add PlusIcon
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import toast from 'react-hot-toast'; // Import toast
import { supabase } from '../../lib/supabaseClient'; // Import supabase
import { useAuth } from '../../hooks/useAuth'; // Import useAuth
import { useAIRecommendations } from '../../hooks/useAIRecommendations';
import { getMoviePosterUrl } from '../../services/tmdbService';
import { useWatchlistItems } from '../../hooks/useWatchlistItems';

interface MediaRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlistId: string;
}

const MediaRecommendationModal: React.FC<MediaRecommendationModalProps> = ({
  isOpen,
  onClose,
  watchlistId
}) => {
  const { loading: recommendationsLoading, recommendations, error: recommendationsError, generateRecommendations, restoreRecommendations } = useAIRecommendations();
  const { items, loading: itemsLoading, error: itemsError, refetch: refetchWatchlistItems } = useWatchlistItems(watchlistId); // Add refetch
  const [isGenerating, setIsGenerating] = useState(false);
  const [addingItemId, setAddingItemId] = useState<number | null>(null); // State to track adding item
  const navigate = useNavigate();
  const { user } = useAuth();
  // Create a set of existing media IDs for quick lookup
  const existingMediaIds = React.useMemo(() => new Set(
    items
      .map(item => {
        const parts = item.media_id?.split(':'); // Extract from media_id (e.g., tmdb:movie:123 or tmdb:tv:456)
        if (parts && parts.length >= 3) {
          return `${parts[1]}:${parts[2]}`; // Return "movie:123" or "tv:456"
        }
        return null;
      })
      .filter(Boolean) // Filter out any null IDs
  ), [items]);  useEffect(() => {
    if (isOpen && !itemsLoading && items && items.length >= 10) {
      // Check if we have saved recommendations to restore
      const savedState = sessionStorage.getItem('recommendation-modal-state');
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          // Only restore if it's for the same watchlist and not too old (5 minutes)
          if (parsed.watchlistId === watchlistId && 
              parsed.recommendations && 
              parsed.recommendations.length > 0 &&
              Date.now() - parsed.timestamp < 300000) {
            console.log('Restoring previous recommendations');
            restoreRecommendations(parsed.recommendations);
            return;
          }        } catch {
          console.warn('Failed to parse saved recommendation state');
        }
      }
      
      setIsGenerating(true);
      generateRecommendations(items)
        .finally(() => setIsGenerating(false));
    } else if (isOpen && !itemsLoading && items && items.length < 10) {
      console.warn("Watchlist no longer eligible for recommendations.");
    }
    // Ensure effect runs when isOpen changes
  }, [isOpen, items, itemsLoading, generateRecommendations, restoreRecommendations, watchlistId]);
  const handleAddToList = useCallback(async (mediaId: number, mediaType: 'movie' | 'tv') => {
    if (!user) {
      toast.error("You must be logged in to add items.");
      return;
    }
    const mediaKey = `${mediaType}:${mediaId}`;
    if (existingMediaIds.has(mediaKey)) {
      const itemType = mediaType === 'movie' ? 'movie' : 'TV series';
      toast.error(`This ${itemType} is already in your watchlist.`);
      return;
    }

    setAddingItemId(mediaId); // Indicate loading state for this specific button
    const fullMediaId = `tmdb:${mediaType}:${mediaId}`;
    const itemType = mediaType === 'movie' ? 'movie' : 'TV series';
    const toastId = toast.loading(`Adding ${itemType} to watchlist...`);

    try {
      const { error } = await supabase.from('watchlist_items').insert({
        watchlist_id: watchlistId,
        media_id: fullMediaId,
        added_by_user_id: user.id,
        // item_order will likely be set by a trigger or needs manual handling
      });
      
      if (error) throw error;

      toast.success(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} added successfully!`, { id: toastId });
      // Refetch items to update the existingMediaIds set and ensure real-time updates
      await refetchWatchlistItems();
      
      // Emit an event to notify parent components that the watchlist has been updated
      const watchlistUpdateEvent = new CustomEvent('watchlist-updated', { 
        detail: { watchlistId, mediaId: fullMediaId }
      });
      window.dispatchEvent(watchlistUpdateEvent);
    } catch (err: unknown) {
      console.error("Error adding item to watchlist:", err);
      toast.error(err instanceof Error ? err.message : `Failed to add ${itemType}.`, { id: toastId });
    } finally {
      setAddingItemId(null); // Clear loading state for this button
    }
  }, [user, watchlistId, existingMediaIds, refetchWatchlistItems]);  const handleNavigateToDetails = (mediaId: number, mediaType: 'movie' | 'tv') => {
    // Save current modal state and recommendations before navigation
    sessionStorage.setItem('recommendation-modal-state', JSON.stringify({
      watchlistId,
      recommendations,
      timestamp: Date.now()
    }));
    
    // Navigate to appropriate details page
    if (mediaType === 'movie') {
      navigate(`/movie/${mediaId}`);
    } else {
      // For TV series, navigate to TV details page
      navigate(`/tv/${mediaId}`);
    }
  };
  // Manage body class and persisted state based on modal visibility
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      // Persist open state so navigating away and back reopens the modal
      sessionStorage.setItem('recommendation-modal-open', watchlistId);
    } else {
      document.body.classList.remove('modal-open');
      // Remove saved state when modal is intentionally closed
      sessionStorage.removeItem('recommendation-modal-open');
      sessionStorage.removeItem('recommendation-modal-state');
    }

    // On unmount, only clean up the body class so the saved state remains when
    // navigating to a movie page and returning via the browser back button.
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, watchlistId]);

  if (!isOpen) return null;

  const isLoading = isGenerating || recommendationsLoading || itemsLoading;
  const error = recommendationsError || itemsError;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"> {/* Increased z-index to maximum */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ... existing header ... */}        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            AI Media Recommendations
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {isLoading ? (
            // ... loading indicator ...
            <div className="flex flex-col items-center justify-center p-8">
              <div className="w-12 h-12 border-4 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">
                {itemsLoading ? 'Loading watchlist items...' : 'Analyzing your watchlist...'}
              </p>
            </div>
          ) : error ? (
            // ... error message ...
             <div className="text-red-500 p-4 text-center">
              {error}
            </div>
          ) : recommendations.length === 0 && !itemsLoading && items && items.length >= 10 ? (
            // ... no recommendations message ...
             <div className="text-gray-600 dark:text-gray-300 p-4 text-center">
              No recommendations found. Try adding more diverse movies to your list.
            </div>
          ) : !itemsLoading && items && items.length < 10 ? (
            // ... not eligible message ...
             <div className="text-gray-600 dark:text-gray-300 p-4 text-center">
               Add at least 10 items to this watchlist to get AI recommendations.
             </div>          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map(media => {
                const mediaKey = `${media.media_type}:${media.id}`;
                const isAlreadyAdded = existingMediaIds.has(mediaKey);
                const isCurrentlyAdding = addingItemId === media.id;
                return (
                  <div
                    key={`${media.media_type}-${media.id}`}
                    className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200" // Added shadow
                  >
                    <div
                      className="flex cursor-pointer" // Make main content area clickable
                      onClick={() => handleNavigateToDetails(media.id, media.media_type)}
                    >
                      <div className="w-1/3 flex-shrink-0"> {/* Adjusted width */}
                        {media.poster_path ? (
                          <img
                            src={getMoviePosterUrl(media.poster_path, 'w185') ?? undefined} // Smaller image size
                            alt={media.title}
                            className="w-full h-auto object-cover" // Removed rounded
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-700 aspect-[2/3]"> {/* Added aspect ratio */}
                            <span className="text-gray-500 dark:text-gray-400 text-xs text-center p-1">No image</span>
                          </div>
                        )}
                      </div>
                      <div className="w-2/3 p-3 flex flex-col justify-between"> {/* Adjusted width */}
                        <div>
                          <h3 className="font-semibold mb-1 text-gray-900 dark:text-white line-clamp-2"> {/* Allow two lines */}
                            {media.title}
                          </h3>
                          <div className="flex items-center mb-2 text-xs"> {/* Smaller text */}
                            <span className="text-yellow-500 mr-1">★</span>
                            <span className="text-gray-600 dark:text-gray-300">
                              {media.vote_average.toFixed(1)}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 ml-2">
                              {media.release_date?.substring(0, 4) || 'N/A'}
                            </span>
                            <span className="text-blue-600 dark:text-blue-400 ml-2 text-xs">
                              {media.media_type === 'movie' ? 'Movie' : 'TV Series'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">
                            {media.overview || 'No description available.'}
                          </p>
                        </div>
                      </div>
                    </div>
                     {/* Add Button Area */}
                     <div className="p-2 border-t border-gray-200 dark:border-gray-700 mt-auto">
                       <button
                         onClick={() => handleAddToList(media.id, media.media_type)}
                         disabled={isAlreadyAdded || isCurrentlyAdding}
                         className={`w-full flex items-center justify-center px-3 py-1.5 text-sm rounded transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${ 
                           isAlreadyAdded
                             ? 'bg-gray-400 dark:bg-gray-600 text-gray-700 dark:text-gray-400 cursor-not-allowed'
                             : isCurrentlyAdding
                             ? 'bg-blue-400 dark:bg-blue-700 text-white cursor-wait'
                             : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white focus:ring-blue-500'
                         }`}
                       >
                         {isCurrentlyAdding ? (
                           <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                         ) : (
                           <PlusIcon className="h-4 w-4 mr-1" />
                         )}
                         {isAlreadyAdded ? 'Added' : isCurrentlyAdding ? 'Adding...' : 'Add to List'}
                       </button>
                     </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ... existing footer (Close, Regenerate buttons) ... */}
         <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 mr-2"
          >
            Close
          </button>
          <button
            onClick={() => {
              if (items && items.length >= 10) {
                setIsGenerating(true);
                generateRecommendations(items)
                  .finally(() => setIsGenerating(false));
              }
            }}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            disabled={isLoading || !items || items.length < 10}
          >
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaRecommendationModal;
