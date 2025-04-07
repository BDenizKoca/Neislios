import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Watchlist, WatchlistItem, WatchlistRole } from '../types/watchlist';
import { Profile } from '../types/profile';
import { TmdbMediaDetails, getMediaDetails, TmdbMovieDetails, TmdbTvDetails } from '../services/tmdbService';
import MediaListItem from '../components/movies/MovieListItem';
import MovieListItemSkeleton from '../components/movies/MovieListItemSkeleton';
import Skeleton from 'react-loading-skeleton';
import toast from 'react-hot-toast';
import { useLayoutActions } from '../context/LayoutActionContext';
import { useHeader } from '../context/HeaderContext';

// Helper type guards
function isMovieDetails(details: TmdbMediaDetails): details is TmdbMovieDetails {
  return details.media_type === 'movie';
}
export function isTvDetails(details: TmdbMediaDetails): details is TmdbTvDetails {
  return details.media_type === 'tv';
}

function WatchlistDetailPage() {
  const { id: watchlistId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { registerRandomPickTrigger } = useLayoutActions();
  const { setHeaderTitle } = useHeader();
  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<(WatchlistItem & { tmdbDetails?: TmdbMediaDetails })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<WatchlistRole | null>(null);
  const [watchedMedia, setWatchedMedia] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<Profile[]>([]);
  const [membersWatchedMediaMap, setMembersWatchedMediaMap] = useState<Map<string, Set<string>>>(new Map());
  const [hideWatched, setHideWatched] = useState(false);
  const [sortBy, setSortBy] = useState<string>('item_order');
  const [randomPick, setRandomPick] = useState<TmdbMediaDetails | null>(null);
  const [showRandomPick, setShowRandomPick] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showPickerContent, setShowPickerContent] = useState(false);
  const [spinningTitle, setSpinningTitle] = useState<string | null>(null);
  const [sortedAndFilteredItems, setSortedAndFilteredItems] = useState<(WatchlistItem & { tmdbDetails?: TmdbMediaDetails })[]>([]);
  const [spinProgress, setSpinProgress] = useState(0);
  const spinDuration = 2000; // Spin for 2 seconds
  const [availableTitles, setAvailableTitles] = useState<string[]>([]); // Store titles for slot machine

  // --- Sorting Logic ---
  const sortAndFilterItems = useCallback(() => {
    let processedItems = [...watchlistItems];
    if (hideWatched) {
      processedItems = processedItems.filter(item =>
        item.media_id && !watchedMedia.has(item.media_id)
      );
    }
    processedItems.sort((a, b) => {
      const aDetails = a.tmdbDetails;
      const bDetails = b.tmdbDetails;
      const aTitle = aDetails ? (isMovieDetails(aDetails) ? aDetails.title : aDetails.name) : '';
      const bTitle = bDetails ? (isMovieDetails(bDetails) ? bDetails.title : bDetails.name) : '';
      const aRating = aDetails?.vote_average || 0;
      const bRating = bDetails?.vote_average || 0;
      switch (sortBy) {
        case 'title_asc': return aTitle.localeCompare(bTitle);
        case 'title_desc': return bTitle.localeCompare(aTitle);
        case 'rating_asc': return aRating - bRating;
        case 'rating_desc': return bRating - aRating;
        case 'added_at_desc': return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
        case 'added_at_asc': return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
        case 'item_order':
        default:
            const orderA = a.item_order ?? Infinity;
            const orderB = b.item_order ?? Infinity;
            if (orderA === orderB) {
                return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
            }
            return orderA - orderB;
      }
    });
    setSortedAndFilteredItems(processedItems);
  }, [watchlistItems, sortBy, hideWatched, watchedMedia]);

  useEffect(() => {
    sortAndFilterItems();
  }, [sortAndFilterItems]);


  // --- Data Fetching ---
  const fetchDetails = useCallback(async () => {
    if (!watchlistId || !user) return;
    setLoading(true); setError(null); setMembers([]); setMembersWatchedMediaMap(new Map());

    try {
      // Fetch Watchlist, Owner, User Role
      const { data: watchlistData, error: watchlistError } = await supabase
        .from('watchlists').select('*, owner:profiles!watchlists_owner_id_fkey(id, display_name, avatar_url)').eq('id', watchlistId).maybeSingle();
      if (watchlistError) throw watchlistError;
      if (!watchlistData) throw new Error("Watchlist not found or access denied.");

      const ownerProfile = Array.isArray(watchlistData.owner) ? watchlistData.owner[0] : watchlistData.owner;

      const { data: memberData, error: memberError } = await supabase
        .from('watchlist_members').select('role').eq('watchlist_id', watchlistId).eq('user_id', user.id).maybeSingle();
      if (memberError) throw memberError;
      const currentUserRole = (memberData?.role as WatchlistRole) || null;

      if (!watchlistData.is_public && !currentUserRole) {
        throw new Error("Access denied. This watchlist is private.");
      }

      setWatchlist({ ...watchlistData, owner: ownerProfile || undefined });
      setUserRole(currentUserRole);
      setHeaderTitle(watchlistData.title); // Set header title

      // Fetch Watchlist Items
      const { data: itemsData, error: itemsError } = await supabase
        .from('watchlist_items').select('*').eq('watchlist_id', watchlistId)
        .order('item_order', { ascending: true, nullsFirst: false })
        .order('added_at', { ascending: true });
      if (itemsError) throw itemsError;

      // Fetch TMDB details for each item
      const itemsWithDetails = await Promise.all(
        (itemsData || []).map(async (item) => {
          let tmdbDetails: TmdbMediaDetails | undefined | null = undefined;
          try {
            tmdbDetails = await getMediaDetails(item.media_id);
          } catch (tmdbError) { console.error(`Failed fetch TMDB for ${item.media_id}:`, tmdbError); }
          return { ...item, tmdbDetails: tmdbDetails || undefined };
        })
      );
      setWatchlistItems(itemsWithDetails);

      // Fetch All Members & Their Watched Status
      const { data: allMembersData, error: allMembersError } = await supabase
        .from('watchlist_members').select(`user_id, role, profile:profiles!inner(id, display_name, avatar_url)`)
        .eq('watchlist_id', watchlistId);
      if (allMembersError) throw allMembersError;

      const fetchedMemberProfiles: Profile[] = [];
      const fetchedMemberIds: string[] = [];
      (allMembersData || []).forEach(m => {
        const profileData = Array.isArray(m.profile) ? m.profile[0] : m.profile;
        if (profileData?.id && profileData.display_name) {
          fetchedMemberProfiles.push(profileData);
          if (m.user_id) fetchedMemberIds.push(m.user_id);
        } else { console.warn("Invalid profile data for member:", m); }
      });
      setMembers(fetchedMemberProfiles);

      if (fetchedMemberIds.length > 0) {
        const { data: fetchedMembersWatchedData, error: mwError } = await supabase
          .from('user_watched_items').select('user_id, media_id').in('user_id', fetchedMemberIds);
        if (mwError) {
          console.error("Error fetching members' watched media:", mwError);
          setMembersWatchedMediaMap(new Map());
        } else {
          const mwMap = new Map<string, Set<string>>();
          (fetchedMembersWatchedData || []).forEach(watched => {
            if (!mwMap.has(watched.media_id)) mwMap.set(watched.media_id, new Set());
            mwMap.get(watched.media_id)?.add(watched.user_id);
          });
          setMembersWatchedMediaMap(mwMap);
        }
      } else { setMembersWatchedMediaMap(new Map()); }

    } catch (err: any) {
      console.error("Error fetching watchlist details:", err);
      setError(err.message || 'Failed to load watchlist details.');
    } finally {
      setLoading(false);
    }
  }, [watchlistId, user, setHeaderTitle]); // Added setHeaderTitle dependency

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

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
    } catch (err: any) {
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
        toast.error(err.message || 'Failed to update watched status.', { id: toastId });
    }
  };

  // --- Random Picker Logic ---
  const handlePickRandom = useCallback(() => {
    setError(null);
    setRandomPick(null);
    setShowPickerContent(false);
    setIsSpinning(false);
    setSpinProgress(0);

    const availableItems = sortedAndFilteredItems.filter(item => item.tmdbDetails);

    if (availableItems.length === 0) {
      toast.error("No available items to pick from (check filters).");
      setShowRandomPick(false);
      return;
    }
    if (availableItems.length === 1) {
        const singleItemDetails = availableItems[0].tmdbDetails;
        if (singleItemDetails) {
            setRandomPick(singleItemDetails);
            setShowRandomPick(true);
            setShowPickerContent(true);
        } else {
             toast.error("Could not display the only available item.");
             setShowRandomPick(false);
        }
        return;
    }

    // Generate the titles array and set it in state
    const titles = availableItems.map(item => 
      item.tmdbDetails ? (isMovieDetails(item.tmdbDetails) ? item.tmdbDetails.title : item.tmdbDetails.name) : 'Unknown'
    );
    setAvailableTitles(titles);
    
    setIsSpinning(true);
    setShowRandomPick(true);

    let spinIndex = 0;
    const spinInterval = setInterval(() => {
        setSpinningTitle(titles[spinIndex % titles.length]);
        spinIndex++;
        setSpinProgress(Math.min(spinIndex * 50, spinDuration)); // Update progress with a cap
    }, 50); // Match CSS animation duration (0.05s = 50ms)

    // Increase total spin duration
    setTimeout(() => {
        clearInterval(spinInterval);
        setIsSpinning(false);
        const finalRandomIndex = Math.floor(Math.random() * availableItems.length);
        const finalPickedItem = availableItems[finalRandomIndex].tmdbDetails;

        if (finalPickedItem) {
            setRandomPick(finalPickedItem);
            setTimeout(() => setShowPickerContent(true), 50);
        } else {
            toast.error("An error occurred selecting the final random item.");
            setShowRandomPick(false);
        }
    }, spinDuration); // Spin for 2 seconds
  }, [sortedAndFilteredItems, spinDuration]);

  const closeRandomPick = () => {
    setShowRandomPick(false);
    setShowPickerContent(false);
    setTimeout(() => { setRandomPick(null); }, 300);
  };

  // --- Register/Unregister Random Pick Trigger ---
  useEffect(() => {
    console.log("WatchlistDetail mounting/updating, registering trigger");
    registerRandomPickTrigger(handlePickRandom);
    return () => {
      console.log("WatchlistDetail unmounting, unregistering trigger");
      registerRandomPickTrigger(null);
    };
  }, [registerRandomPickTrigger, handlePickRandom]);


  // --- Render ---
  if (loading && watchlistItems.length === 0) return (
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
  if (error && !watchlist) return <div className="text-center p-4 text-red-600">Error: {error}</div>;
  if (!watchlist) return <div className="text-center p-4">Watchlist not found or access denied.</div>;

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
      {error && !loading && <p className="text-center p-4 text-red-600">{error}</p>}
      {watchlistItems.length === 0 && !loading ? (
        <p className="text-gray-500 dark:text-gray-400">No items added yet.</p>
      ) : sortedAndFilteredItems.length === 0 && !loading ? (
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

       {/* Random Pick Result Overlay/Modal */}
       {showRandomPick && (
            <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${showRandomPick ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeRandomPick}>
                <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full text-center transform transition-all duration-300 ease-in-out ${showRandomPick ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} animate-hype`} onClick={(e) => e.stopPropagation()}>
                    {isSpinning ? (
                        <div className="flex flex-col items-center">
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Picking Random Item...</h3>
                            <div className="slot-machine-container mb-4 w-full">
                                <div className={`slot-reel ${isSpinning ? 'animate-slot-spin' : ''}`}>
                                    {/* We'll populate this dynamically with items */}
                                    {availableTitles.map((title, index) => (
                                        <div 
                                            key={`slot-${index}`} 
                                            className="slot-item"
                                            style={{ 
                                                top: `${(index * 40)}px`,
                                                fontSize: '1.2rem'
                                            }}
                                        >
                                            {title}
                                        </div>
                                    ))}
                                    {/* Duplicate the first few items to make the animation loop smoothly */}
                                    {availableTitles.slice(0, 5).map((title, index) => (
                                        <div 
                                            key={`slot-dup-${index}`} 
                                            className="slot-item"
                                            style={{ 
                                                top: `${(availableTitles.length * 40) + (index * 40)}px`,
                                                fontSize: '1.2rem'
                                            }}
                                        >
                                            {title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="h-2 w-full bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary transition-all duration-100 ease-linear rounded-full"
                                    style={{ width: `${(spinProgress / spinDuration) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ) : (
                        <div className={`transition-opacity duration-300 ease-in ${showPickerContent ? 'opacity-100' : 'opacity-0'}`}>
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Your Random Pick!</h3>
                            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{randomPick ? (isMovieDetails(randomPick) ? randomPick.title : randomPick.name) : ''}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{randomPick ? (isMovieDetails(randomPick) ? randomPick.release_date?.substring(0,4) : randomPick.first_air_date?.substring(0,4)) : ''}</p>
                            <button onClick={closeRandomPick} className="mt-6 bg-primary hover:bg-opacity-80 text-white py-2 px-4 rounded">Close</button>
                        </div>
                    )}
                </div>
            </div>
       )}
    </div>
  );
}

export default WatchlistDetailPage;