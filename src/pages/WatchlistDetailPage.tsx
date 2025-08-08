import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '../components/common/SortableItem';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { TmdbMediaDetails } from '../services/tmdbService'; // Removed getMediaDetails
import { isMovieDetails } from '../utils/tmdbUtils';
import MediaListItem from '../components/movies/MovieListItem';
import MovieListItemSkeleton from '../components/movies/MovieListItemSkeleton';
import Skeleton from 'react-loading-skeleton';
import toast from 'react-hot-toast';
import { useLayoutActions } from '../hooks/useLayoutActions'; // Updated import path
import { useHeader } from '../hooks/useHeader'; // Updated import path
import { useWatchlistDetails } from '../hooks/useWatchlistDetails'; // Import hook
import { useWatchlistItems, WatchlistItemWithDetails } from '../hooks/useWatchlistItems'; // Import hook
import { useWatchlistMembers } from '../hooks/useWatchlistMembers'; // Import hook
import { RandomItemPickerModal } from '../components/watchlists/RandomItemPickerModal';
import { useWatchlistAI } from '../hooks/useWatchlistAI'; // Import AI hook
import MediaRecommendationModal from '../components/recommendations/MediaRecommendationModal'; // Import AI modal
import { LightBulbIcon } from '@heroicons/react/24/outline'; // Import icon

// Storage keys for state persistence
const SCROLL_STORAGE_KEY = 'watchlistDetailScrollPosition';

function WatchlistDetailPage() {
  const { id: watchlistId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  const { registerRandomPickTrigger } = useLayoutActions();
  const { setHeaderTitle } = useHeader();

  // Custom navigation function that saves scroll position before navigating
  const navigateWithScrollSave = useCallback((to: string) => {
    // Save scroll position from the main layout's scroll container
    const mainElement = document.querySelector('main');
    if (mainElement) {
      const currentScroll = mainElement.scrollTop;
      sessionStorage.setItem(SCROLL_STORAGE_KEY, currentScroll.toString());
    }
    navigate(to);
  }, [navigate]);

  // --- Use Custom Hooks for Data Fetching ---
  const {
    watchlist,
    userRole,
    loading: loadingDetails,
    error: errorDetails,
    // refetch: refetchDetails // If needed later
  } = useWatchlistDetails(watchlistId);

  const {
    items: watchlistItems,
    loading: loadingItems,
    error: errorItems,
    refetch: refetchItems // Uncommented to enable real-time updates
  } = useWatchlistItems(watchlistId);

  const {
    members,
    membersWatchedMediaMap,
    loading: loadingMembers,
    error: errorMembers,
    // refetch: refetchMembers // If needed later
  } = useWatchlistMembers(watchlistId);

  const { loading: checkingAIEligibility, error: errorAIEligibility, checkListEligibleForAI } = useWatchlistAI(watchlistId); // Use AI hook

  // Listen for watchlist update events to refresh data
  useEffect(() => {
    const handleWatchlistUpdate = (event: CustomEvent) => {
      const { watchlistId: updatedWatchlistId } = event.detail;
      if (updatedWatchlistId === watchlistId) {
        console.log('Watchlist update detected, refreshing watchlist items...');
        // Force a refresh of the watchlist items
        if (typeof refetchItems === 'function') {
          refetchItems();
        }
      }
    };

    window.addEventListener('watchlist-updated', handleWatchlistUpdate as EventListener);
    return () => {
      window.removeEventListener('watchlist-updated', handleWatchlistUpdate as EventListener);
    };
  }, [watchlistId, refetchItems]);

  // --- Local UI State ---
  const [watchedMedia, setWatchedMedia] = useState<Set<string>>(new Set()); // User's watched status
  const [hideWatched, setHideWatched] = useState(false);
  const [sortBy, setSortBy] = useState<string>('item_order');
  const [showRandomPickModal, setShowRandomPickModal] = useState(false);
  const [sortedAndFilteredItems, setSortedAndFilteredItems] = useState<WatchlistItemWithDetails[]>([]);
  const [isAIEligible, setIsAIEligible] = useState(false); // State for AI eligibility
  const [showAIRecommendModal, setShowAIRecommendModal] = useState(false); // State for AI modal

  // --- Drag and Drop Sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 1000, // 1 second hold to activate drag
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 1000, // 1 second hold to activate drag
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Drag End Handler ---
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !watchlistId || !user) return;

    if (active.id !== over.id) {
      const oldIndex = sortedAndFilteredItems.findIndex(item => item.id === active.id);
      const newIndex = sortedAndFilteredItems.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Optimistically update the UI
        const newItems = arrayMove(sortedAndFilteredItems, oldIndex, newIndex);
        setSortedAndFilteredItems(newItems);

        try {
          // Update the database with new positions
          const updates = newItems.map((item, index) => ({
            id: item.id,
            item_order: index + 1, // 1-based ordering
          }));

          const { error } = await supabase
            .from('watchlist_items')
            .upsert(updates, {
              onConflict: 'id'
            });

          if (error) throw error;

          // Emit update event for real-time sync
          const watchlistUpdateEvent = new CustomEvent('watchlist-updated', { 
            detail: { watchlistId }
          });
          window.dispatchEvent(watchlistUpdateEvent);
          
        } catch (error) {
          console.error('Error updating item order:', error);
          toast.error('Failed to save new order');
          // Revert the optimistic update by refetching
          if (typeof refetchItems === 'function') {
            refetchItems();
          }
        }
      }
    }
  }, [sortedAndFilteredItems, watchlistId, user, refetchItems]);

  // --- Check AI Eligibility ---
  useEffect(() => {
    if (watchlistId) {
      checkListEligibleForAI().then(eligible => {
        setIsAIEligible(eligible);
      }).catch(err => {
        console.error("Error checking AI eligibility:", err);
        setIsAIEligible(false);
      });
    }
  }, [watchlistId, checkListEligibleForAI]);

  // --- Restore Recommendation Modal State ---
  useEffect(() => {
    if (watchlistId) {
      // Only restore if we have both modal open flag AND saved recommendations
      const savedModalState = sessionStorage.getItem('recommendation-modal-open');
      const savedRecommendations = sessionStorage.getItem('recommendation-modal-state');
      
      if (savedModalState === watchlistId && savedRecommendations) {
        try {
          const parsed = JSON.parse(savedRecommendations);
          // Only restore if the saved data is recent (within 5 minutes) and for this watchlist
          if (parsed.watchlistId === watchlistId && 
              parsed.recommendations && 
              parsed.recommendations.length > 0 &&
              Date.now() - parsed.timestamp < 300000) {
            console.log('Restoring recommendation modal state for watchlist:', watchlistId);
            setShowAIRecommendModal(true);
            // Remove the restoration flag so it doesn't auto-open again
            sessionStorage.removeItem('recommendation-modal-open');
          }
        } catch {
          console.warn('Failed to parse saved recommendation state');
          // Clean up invalid state
          sessionStorage.removeItem('recommendation-modal-open');
          sessionStorage.removeItem('recommendation-modal-state');
        }
      }
    }
  }, [watchlistId]);

  // --- Sorting Logic ---
  const sortAndFilterItems = useCallback(() => {
    let processedItems = [...watchlistItems]; // Use items from useWatchlistItems hook
    if (hideWatched) {
      processedItems = processedItems.filter(item =>
        item.media_id && !watchedMedia.has(item.media_id)
      );
    }
    processedItems.sort((a, b) => {
      const aDetails = a.tmdbDetails;
      const bDetails = b.tmdbDetails;
      switch (sortBy) {
        case 'title_asc': {
          const aTitle = aDetails ? (isMovieDetails(aDetails) ? aDetails.title : aDetails.name) : '';
          const bTitle = bDetails ? (isMovieDetails(bDetails) ? bDetails.title : bDetails.name) : '';
          return aTitle.localeCompare(bTitle);
        }
        case 'title_desc': {
          const aTitle = aDetails ? (isMovieDetails(aDetails) ? aDetails.title : aDetails.name) : '';
          const bTitle = bDetails ? (isMovieDetails(bDetails) ? bDetails.title : bDetails.name) : '';
          return bTitle.localeCompare(aTitle);
        }
        case 'rating_asc': {
          const aRating = aDetails?.vote_average || 0;
          const bRating = bDetails?.vote_average || 0;
          return aRating - bRating;
        }
        case 'rating_desc': {
          const aRating = aDetails?.vote_average || 0;
          const bRating = bDetails?.vote_average || 0;
          return bRating - aRating;
        }
        case 'added_at_desc':
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
        case 'added_at_asc':
          return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
        case 'item_order':
        default: {
          const orderA = a.item_order ?? Infinity;
          const orderB = b.item_order ?? Infinity;
          if (orderA === orderB) {
            // Fallback sort by added date if order is the same
            return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
          }
          return orderA - orderB;
        }
      }
    });
    setSortedAndFilteredItems(processedItems);
  }, [watchlistItems, sortBy, hideWatched, watchedMedia]); // Dependency is watchlistItems from hook

  useEffect(() => {
    sortAndFilterItems();
  }, [sortAndFilterItems]); // This effect depends on the callback above

  // --- Set Header Title ---
  useEffect(() => {
    if (watchlist?.title) {
      setHeaderTitle(watchlist.title);
    }
    // Cleanup function to reset title if component unmounts or watchlist changes
    return () => setHeaderTitle('');
  }, [watchlist, setHeaderTitle]);


  // --- Removed Data Fetching Logic (now in hooks) ---

  // Fetch current user's watched media
  useEffect(() => {
    const fetchWatched = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.from('user_watched_items').select('media_id').eq('user_id', user.id);
        if (error) throw error;
        setWatchedMedia(new Set(data?.map(m => m.media_id) || []));
      } catch (err) { console.error("Failed to fetch watched media:", err); }
    };
    fetchWatched();
  }, [user]);

  // --- Action Handlers ---
  const handleToggleWatched = async (item: TmdbMediaDetails, currentState: boolean) => {
    if (!user || !item) return;
    const mediaId = `${item.media_type === 'movie' ? 'tmdb:movie' : 'tmdb:tv'}:${item.id}`;

    // Use functional update for optimistic UI change
    setWatchedMedia(prev => {
        const newSet = new Set(prev);
        if (currentState) {
            newSet.delete(mediaId);
        } else {
            newSet.add(mediaId);
        }
        return newSet;
    });

    const toastId = toast.loading(currentState ? 'Marking as unwatched...' : 'Marking as watched...');
    try {
        let operationError;
        if (currentState) {
            const { error } = await supabase.from('user_watched_items').delete().match({ user_id: user.id, media_id: mediaId });
            operationError = error;
        } else {
            const { error } = await supabase.from('user_watched_items').insert({ user_id: user.id, media_id: mediaId });
            operationError = error;
        }
        if (operationError) throw operationError;
        toast.success(currentState ? 'Marked as unwatched.' : 'Marked as watched.', { id: toastId });
    } catch (err: unknown) {
        console.error("Supabase Error (Toggle Watched):", err);
        // Revert UI state using functional update
        setWatchedMedia(prev => {
            const revertedSet = new Set(prev);
            if (currentState) {
                revertedSet.add(mediaId);
            } else {
                revertedSet.delete(mediaId);
            }
            return revertedSet;
        });
        toast.error(err instanceof Error ? err.message : 'Failed to update watched status.', { id: toastId });
    }
  };

  // --- Random Picker Trigger ---
  // This function now just opens the modal
  const handlePickRandom = useCallback(() => {
    // Check if there are items to pick from before opening
    const availableItems = sortedAndFilteredItems.filter(item => item.tmdbDetails);
    if (availableItems.length === 0) {
      toast.error("No available items to pick from (check filters).");
      return;
    }
    setShowRandomPickModal(true); // Open the modal
  }, [sortedAndFilteredItems]); // Depends on the items available

  // Function to close the modal, passed to the modal component
  const closeRandomPickModal = () => {
    setShowRandomPickModal(false);
  };

  // --- Register/Unregister Random Pick Trigger ---
  useEffect(() => {
    // Register trigger when component mounts or handler changes
    registerRandomPickTrigger(handlePickRandom);
    return () => {
      // Unregister trigger when component unmounts
      registerRandomPickTrigger(null);
    };
  }, [registerRandomPickTrigger, handlePickRandom]);

  // --- Combined Loading and Error Handling ---
  const isLoading = loadingDetails || loadingItems || loadingMembers;
  // Prioritize details error, then items, then members
  const overallError = errorDetails || errorItems || errorMembers || errorAIEligibility;

  // --- Scroll Position Tracking ---
  useEffect(() => {
    const handleScroll = () => {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        const newPosition = mainElement.scrollTop;
        sessionStorage.setItem(SCROLL_STORAGE_KEY, newPosition.toString());
      }
    };

    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => mainElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // --- Restore Scroll Position ---
  useEffect(() => {
    if (!isLoading && sortedAndFilteredItems.length > 0) {
      const savedPosition = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (savedPosition) {
        const position = parseInt(savedPosition, 10);
        if (position > 0) {
          setTimeout(() => {
            const mainElement = document.querySelector('main');
            if (mainElement) {
              mainElement.scrollTop = position;
            }
          }, 300);
        }
      }
    }
  }, [isLoading, sortedAndFilteredItems.length]);

  // --- Handle Browser Back/Forward ---
  useEffect(() => {
    const handlePopState = () => {
      const savedPosition = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (savedPosition) {
        const position = parseInt(savedPosition, 10);
        if (position > 0) {
          setTimeout(() => {
            const mainElement = document.querySelector('main');
            if (mainElement) {
              mainElement.scrollTop = position;
            }
          }, 300);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


  // --- Render ---
  if (isLoading && !watchlist) { // Show skeleton only on initial load
    return (
      <div className="container mx-auto p-4">
        <Skeleton height={30} width={200} className="mb-4" />
        <Skeleton height={20} width={150} className="mb-4" />
        <div className="mb-4 flex flex-wrap gap-2">
          <Skeleton height={36} width={140} />
          <Skeleton height={36} width={180} />
        </div>
        <Skeleton height={24} width={100} className="mb-3" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <MovieListItemSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (overallError) {
    return <div className="text-red-500 p-4">Error loading watchlist: {overallError}</div>;
  }

  if (!watchlist) {
    return <div className="p-4">Watchlist not found.</div>;
  }

  // Determine if the current user can access the manage page
  const canAccess = userRole === 'owner' || userRole === 'editor' || userRole === 'viewer';

  return (
    <div ref={pageRef} className="container mx-auto p-4 h-full">
      {/* Watchlist Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 break-words">
          {watchlist.title}
        </h1>
        <p className="mb-4 text-gray-600 dark:text-gray-400">{watchlist.description || 'No description.'}</p>
        
        {/* Action Buttons - Centered and below description */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {/* AI Recommendation Button - Conditionally Rendered */}
          {isAIEligible && (
            <button
              onClick={() => setShowAIRecommendModal(true)}
              className="flex items-center px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition duration-150 ease-in-out text-sm"
              disabled={checkingAIEligibility} // Disable while checking
              title="Get AI Recommendations"
            >
              <LightBulbIcon className="h-5 w-5 mr-1" />
              {checkingAIEligibility ? 'Checking...' : 'AI Recs'}
            </button>
          )}
          {/* Manage/View Buttons - Conditionally Rendered */}
          {canAccess && (
            <>
              <button
                onClick={() => navigateWithScrollSave(`/watchlist/${watchlistId}/manage`)}
                className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                {userRole === 'viewer' ? 'View List' : 'Manage List'}
              </button>
              {userRole === 'owner' && (
                <button
                  onClick={() => navigateWithScrollSave(`/watchlist/${watchlistId}/collaborators`)}
                  className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Collaborators
                </button>
              )}
            </>
          )}
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <p>Owner: {watchlist.owner?.display_name || 'Unknown'}</p>
          {userRole && <p>Your Role: <span className="font-medium capitalize">{userRole}</span></p>}
        </div>
      </div>

      {/* Controls (Sort, Filter) */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="flex items-center">
              <input id="hideWatchedToggle" type="checkbox" checked={hideWatched} onChange={(e) => setHideWatched(e.target.checked)} className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"/>
              <label htmlFor="hideWatchedToggle" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Hide Watched</label>
          </div>
          <div className="flex items-center">
               <label htmlFor="sortOrder" className="mr-2 text-sm text-gray-900 dark:text-gray-300">Sort by:</label>
               <select id="sortOrder" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm p-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-primary" aria-label="Sort movies by">
                  <option value="item_order">Manual Order</option>
                  <option value="added_at_asc">Added Date (Oldest)</option>
                  <option value="added_at_desc">Added Date (Newest)</option>
                  <option value="title_asc">Title (A-Z)</option>
                  <option value="title_desc">Title (Z-A)</option>
                  <option value="rating_desc">Rating (High-Low)</option>
                  <option value="rating_asc">Rating (Low-High)</option>
               </select>
          </div>
     </div>

      {/* Watchlist Items */}
      <h3 className="text-xl font-semibold mb-3">Items ({sortedAndFilteredItems.length})</h3>
      {/* Display item/member specific errors if needed, separate from the main loading/error state */}
      {errorItems && <p className="text-center p-2 text-orange-600">Could not load all item details.</p>}
      {errorMembers && <p className="text-center p-2 text-orange-600">Could not load member watched status.</p>}
      {watchlistItems.length === 0 && !isLoading ? ( // Use combined loading state
        <p className="text-gray-500 dark:text-gray-400">No items added yet.</p>
      ) : sortedAndFilteredItems.length === 0 && !isLoading ? ( // Use combined loading state
        <p className="text-gray-500 dark:text-gray-400">No items match the current filter.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={sortedAndFilteredItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sortedAndFilteredItems.map(item => {
                const addedByUser = members.find(m => m.id === item.added_by_user_id);
                const memberWatcherIds = membersWatchedMediaMap.get(item.media_id) || new Set<string>();
                const membersWhoWatched = members.filter(m => memberWatcherIds.has(m.id));
                
                return (
                  <SortableItem key={item.id} id={item.id}>
                    {({ attributes, listeners, ref, className }) => (
                      <div
                        ref={ref}
                        className={className}
                        {...attributes}
                        {...listeners}
                        style={{ touchAction: 'manipulation' }}
                      >
                      {item.tmdbDetails ? (
                        <MediaListItem
                          mediaItem={item.tmdbDetails}
                          isWatched={watchedMedia.has(item.media_id)}
                          onToggleWatched={handleToggleWatched}
                          addedBy={addedByUser}
                          watchedByMembers={membersWhoWatched}
                          watchlistId={watchlistId}
                        />
                      ) : (
                        <div className="p-3 border rounded dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center space-x-2">
                          <Skeleton circle height={24} width={24} />
                          <span>Could not load details for {item.media_id}</span>
                        </div>
                      )}
                      </div>
                    )}
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modals */}
      <RandomItemPickerModal
        isOpen={showRandomPickModal}
        onClose={closeRandomPickModal}
        items={sortedAndFilteredItems} // Pass the items to be picked from
      />
      {/* AI Recommendation Modal */}
      {watchlistId && (
        <MediaRecommendationModal
          isOpen={showAIRecommendModal}
          onClose={() => setShowAIRecommendModal(false)}
          watchlistId={watchlistId}
        />
      )}
    </div>
  );
}

export default WatchlistDetailPage;
