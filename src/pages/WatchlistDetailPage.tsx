import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
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
import { RandomItemPickerModal } from '../components/watchlists/RandomItemPickerModal'; // Import the modal component
function WatchlistDetailPage() {
  const { id: watchlistId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { registerRandomPickTrigger } = useLayoutActions();
  const { setHeaderTitle } = useHeader();

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
    // refetch: refetchItems // If needed later
  } = useWatchlistItems(watchlistId);

  const {
    members,
    membersWatchedMediaMap,
    loading: loadingMembers,
    error: errorMembers,
    // refetch: refetchMembers // If needed later
  } = useWatchlistMembers(watchlistId);

  // --- Local UI State ---
  const [watchedMedia, setWatchedMedia] = useState<Set<string>>(new Set()); // User's watched status
  const [hideWatched, setHideWatched] = useState(false);
  const [sortBy, setSortBy] = useState<string>('item_order');
  const [showRandomPickModal, setShowRandomPickModal] = useState(false); // State to control modal visibility
  const [sortedAndFilteredItems, setSortedAndFilteredItems] = useState<WatchlistItemWithDetails[]>([]);
  // Removed state related to picker internals: randomPick, isSpinning, showPickerContent, setSpinningTitle, spinProgress, availableTitles, spinDuration

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
  const overallError = errorDetails || errorItems || errorMembers;

  // --- Render ---
  if (isLoading && watchlistItems.length === 0) { // Show skeleton only on initial load
      return (
          <div className="p-4">
              <Skeleton height={30} width={200} className="mb-1"/>
              <Skeleton height={20} width={150} className="mb-4"/>
              <div className="mb-4 flex flex-wrap gap-2">
                  <Skeleton height={36} width={140} />
                  <Skeleton height={36} width={180} />
              </div>
              <Skeleton height={24} width={100} className="mb-3"/>
              <div className="space-y-3">
                  {[...Array(8)].map((_, i) => <MovieListItemSkeleton key={i} />)}
              </div>
          </div>
      );
  }

  if (overallError && !watchlist) { // Show error if details failed and we have no watchlist
      return <div className="text-center p-4 text-red-600">Error: {overallError}</div>;
  }

  if (!watchlist && !isLoading) { // Handle case where watchlist is null after loading (not found or access denied)
      return <div className="text-center p-4">Watchlist not found or access denied.</div>;
  }

  // If watchlist exists but other parts failed, we might still render partial data
  // Or show specific error messages for items/members if needed.
  // For now, we proceed if watchlist is available.
  if (!watchlist) return null; // Should not happen if logic above is correct, but acts as a safeguard

  return (
    <div className="p-4">
      {/* Header Info */}
      {/* Removed redundant h2 title */}
      <p className="mb-4 text-gray-600 dark:text-gray-400">{watchlist.description || 'No description.'}</p>
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        <p>Owner: {watchlist.owner?.display_name || 'Unknown'}</p>
        {userRole && <p>Your Role: <span className="font-medium capitalize">{userRole}</span></p>}
      </div>

      {/* Action Buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
          {(userRole === 'owner' || userRole === 'editor') && (
            <Link to={`/watchlist/${watchlistId}/manage`} className="inline-block bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white py-2 px-4 rounded shadow text-sm">Manage Items</Link>
          )}
          {userRole === 'owner' && (
            <Link to={`/watchlist/${watchlistId}/collaborators`} className="inline-block bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded shadow text-sm">Manage Collaborators</Link>
          )}
      </div>

       {/* Filters and Sorting */}
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

      {/* Item List */}
      <h3 className="text-xl font-semibold mb-3">Items ({sortedAndFilteredItems.length})</h3>
      {/* Display item/member specific errors if needed, separate from the main loading/error state */}
      {errorItems && <p className="text-center p-2 text-orange-600">Could not load all item details.</p>}
      {errorMembers && <p className="text-center p-2 text-orange-600">Could not load member watched status.</p>}
      {watchlistItems.length === 0 && !isLoading ? ( // Use combined loading state
        <p className="text-gray-500 dark:text-gray-400">No items added yet.</p>
      ) : sortedAndFilteredItems.length === 0 && !isLoading ? ( // Use combined loading state
        <p className="text-gray-500 dark:text-gray-400">No items match the current filter.</p>
      ) : (
        <div className="space-y-3">
          {sortedAndFilteredItems.map(item => {
                const addedByUser = members.find(m => m.id === item.added_by_user_id);
                const memberWatcherIds = membersWatchedMediaMap.get(item.media_id) || new Set<string>();
                const membersWhoWatched = members.filter(m => memberWatcherIds.has(m.id));

                return (
                 item.tmdbDetails ? (
                    <MediaListItem
                        key={item.id}
                        mediaItem={item.tmdbDetails}
                        isWatched={watchedMedia.has(item.media_id)}
                        onToggleWatched={handleToggleWatched}
                        addedBy={addedByUser}
                        watchedByMembers={membersWhoWatched}
                    />
                 ) : (
                    <div key={item.id} className="p-3 border rounded dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center space-x-2">
                        <Skeleton circle height={24} width={24} />
                        <span>Could not load details for {item.media_id}</span>
                    </div>
                 )
               );
            })}
        </div>
      )}

      {/* Render the Random Item Picker Modal */}
      <RandomItemPickerModal
        isOpen={showRandomPickModal}
        onClose={closeRandomPickModal}
        items={sortedAndFilteredItems} // Pass the items to be picked from
      />
    </div>
  );
}

export default WatchlistDetailPage;