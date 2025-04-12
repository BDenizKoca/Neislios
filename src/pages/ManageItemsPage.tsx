import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Removed unused Link
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'; // Import modifier
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '../components/common/SortableItem';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth'; // Updated import path
import { TmdbSearchResult, getMediaDetails, searchMulti, TmdbMediaDetails } from '../services/tmdbService';
import { Watchlist, WatchlistItem } from '../types/watchlist';
import { Profile } from '../types/profile';
import MediaListItem from '../components/movies/MovieListItem';
import MovieListItemSkeleton from '../components/movies/MovieListItemSkeleton';
import Skeleton from 'react-loading-skeleton';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline'; // Removed unused ArrowUturnLeftIcon

// CSS to hide FAB on this page
const hideFabStyle = `
  .manage-items-page ~ button[aria-label] {
    display: none !important;
  }
`;

function ManageItemsPage() {
  const { id: watchlistId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [items, setItems] = useState<(WatchlistItem & { tmdbDetails?: TmdbMediaDetails })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<Record<string, boolean>>({});
  const [members, setMembers] = useState<Profile[]>([]);
  const [watchedMedia, setWatchedMedia] = useState<Set<string>>(new Set());

  // --- Drag and Drop Sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor), // Keep for mouse/stylus input
    useSensor(TouchSensor, {
      // Reduce delay to make dragging easier to initiate on touch
      activationConstraint: {
        delay: 150, // Reduced from 250ms
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Inject FAB hiding CSS
  useEffect(() => {
    // Create style element
    const style = document.createElement('style');
    style.innerHTML = hideFabStyle;
    document.head.appendChild(style);

    // Cleanup on unmount
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // --- Data Fetching ---
  const fetchWatchlistAndItems = useCallback(async () => {
    if (!watchlistId || !user) return;
    setLoading(true); setError(null);
    try {
      // Fetch watchlist details
      const { data: listData, error: listError } = await supabase
        .from('watchlists').select('*').eq('id', watchlistId).single();
      if (listError) throw listError;
      // Basic permission check
      const { data: memberData, error: memberError } = await supabase
        .from('watchlist_members').select('role').eq('watchlist_id', watchlistId).eq('user_id', user.id).maybeSingle();
      if (memberError) throw memberError;
      if (!memberData || !['owner', 'editor'].includes(memberData.role)) {
          throw new Error("You don't have permission to manage this list.");
      }
      setWatchlist(listData);

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('watchlist_items').select('*').eq('watchlist_id', watchlistId)
        .order('item_order', { ascending: true, nullsFirst: false });
      if (itemsError) throw itemsError;

      // Fetch TMDB details
      const itemsWithDetails = await Promise.all(
        (itemsData || []).map(async (item) => {
          let tmdbDetails: TmdbMediaDetails | undefined | null = undefined;
          try {
            tmdbDetails = await getMediaDetails(item.media_id);
          } catch (tmdbError) { console.error(`Failed fetch TMDB for ${item.media_id}:`, tmdbError); }
          return { ...item, tmdbDetails: tmdbDetails || undefined };
        })
      );
      setItems(itemsWithDetails);

      // Fetch members
       const { data: allMembersData, error: allMembersError } = await supabase
        .from('watchlist_members').select(`profile:profiles!inner(id, display_name, avatar_url)`)
        .eq('watchlist_id', watchlistId);
       if (allMembersError) throw allMembersError;
       const fetchedMemberProfiles: Profile[] = (allMembersData || [])
            .map(m => m.profile)
            .flat()
            .filter(p => p !== null && typeof p === 'object' && 'id' in p && 'display_name' in p)
            .map(p => ({
                id: p.id as string,
                display_name: p.display_name as string,
                avatar_url: p.avatar_url as string | undefined
            }));
       setMembers(fetchedMemberProfiles);

    } catch (err: unknown) {
      console.error("Error fetching watchlist data:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load watchlist data.';
      setError(errorMessage);
      toast.error(errorMessage);
      if (errorMessage.includes("permission")) navigate('/');
    } finally {
      setLoading(false);
    }
  }, [watchlistId, user, navigate]);

  useEffect(() => {
    fetchWatchlistAndItems();
  }, [fetchWatchlistAndItems]);

   // Fetch watched media
   useEffect(() => {
    const fetchWatched = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('user_watched_items')
          .select('media_id')
          .eq('user_id', user.id);
        if (error) throw error;
        setWatchedMedia(new Set(data?.map(m => m.media_id) || []));
      } catch (err) { console.error("Failed to fetch watched media:", err); }
    };
    fetchWatched();
  }, [user]);


  // --- Search Functionality ---
  useEffect(() => {
    const handleSearch = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]); setSearchError(null); return;
      }
      setSearchLoading(true); setSearchError(null);
      try {
        const response = await searchMulti(searchTerm, 1);
        const currentMediaIds = new Set(items.map(i => i.media_id));
        const filteredResults = response.results.filter(
            (result): result is TmdbSearchResult =>
                (result.media_type === 'movie' || result.media_type === 'tv') &&
                !currentMediaIds.has(`${result.media_type === 'movie' ? 'tmdb:movie' : 'tmdb:tv'}:${result.id}`)
        );
        setSearchResults(filteredResults);
        if (filteredResults.length === 0) setSearchError('No new movies or TV shows found.');
      } catch (err: unknown) { setSearchError(err instanceof Error ? err.message : 'Failed to search.'); setSearchResults([]); }
      finally { setSearchLoading(false); }
    };

    const delayDebounceFn = setTimeout(() => { handleSearch(); }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, items]);

  // --- Add Item ---
  const handleAddItem = async (itemToAdd: TmdbSearchResult) => {
    if (!watchlistId || !user) return;
    const mediaId = `${itemToAdd.media_type === 'movie' ? 'tmdb:movie' : 'tmdb:tv'}:${itemToAdd.id}`;
    setIsAdding(prev => ({ ...prev, [mediaId]: true }));
    const toastId = toast.loading(`Adding ${itemToAdd.media_type === 'movie' ? itemToAdd.title : itemToAdd.name}...`);

    try {
        const { data: orderData, error: orderError } = await supabase
            .from('watchlist_items')
            .select('item_order')
            .eq('watchlist_id', watchlistId)
            .order('item_order', { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle();

        if (orderError) throw orderError;
        const nextOrder = (orderData?.item_order ?? -1) + 1;

        const { data: newItemData, error: insertError } = await supabase
            .from('watchlist_items')
            .insert({
                watchlist_id: watchlistId,
                media_id: mediaId,
                added_by_user_id: user.id,
                item_order: nextOrder
            })
            .select()
            .single();

        if (insertError) throw insertError;

        const tmdbDetails = await getMediaDetails(mediaId);
        const newItemWithDetails = { ...newItemData, tmdbDetails: tmdbDetails || undefined };

        setItems(prev => [...prev, newItemWithDetails]);
        setSearchResults(prev => prev.filter(r => r.id !== itemToAdd.id || r.media_type !== itemToAdd.media_type));
        toast.success('Item added!', { id: toastId });

    } catch (err: unknown) {
        console.error("Error adding item:", err);
        toast.error(err instanceof Error ? err.message : 'Failed to add item.', { id: toastId });
    } finally {
        setIsAdding(prev => ({ ...prev, [mediaId]: false }));
    }
  };

  // --- Remove Item ---
  const handleRemoveItem = async (itemId: string) => {
    const itemToRemove = items.find(i => i.id === itemId);
    if (!itemToRemove) return;

    setItems(prev => prev.filter(i => i.id !== itemId));
    const toastId = toast.loading('Removing item...');

    try {
      const { error: deleteError } = await supabase
        .from('watchlist_items')
        .delete()
        .eq('id', itemId);
      if (deleteError) throw deleteError;
      toast.success('Item removed.', { id: toastId });
    } catch (err: unknown) {
      console.error("Error removing item:", err);
      toast.error(err instanceof Error ? err.message : 'Failed to remove item.', { id: toastId });
      setItems(prev => [...prev, itemToRemove].sort((a, b) => (a.item_order ?? Infinity) - (b.item_order ?? Infinity)));
    }
  };

   // --- Toggle Watched ---
   const handleToggleWatched = async (item: TmdbMediaDetails, currentState: boolean) => {
        if (!user || !item) return;
        const mediaId = `${item.media_type === 'movie' ? 'tmdb:movie' : 'tmdb:tv'}:${item.id}`;

        // Use functional update for optimistic UI change
        setWatchedMedia(prevWatchedMedia => {
            const newSet = new Set(prevWatchedMedia);
            if (currentState) {
                newSet.delete(mediaId);
            } else {
                newSet.add(mediaId);
            }
            return newSet; // Return the new set to update state
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
            setWatchedMedia(prevWatchedMedia => {
                const revertedSet = new Set(prevWatchedMedia);
                if (currentState) {
                    revertedSet.add(mediaId); // Add back if delete failed
                } else {
                    revertedSet.delete(mediaId); // Remove if insert failed
                }
                return revertedSet;
            });
            toast.error(err instanceof Error ? err.message : 'Failed to update watched status.', { id: toastId });
        }
   };


  // --- Drag and Drop Handler ---
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(items, oldIndex, newIndex);
      setItems(newOrder); // Optimistic update

      const updates = newOrder.map((item, index) => ({
        id: item.id,
        item_order: index,
      }));

      try {
        const { error: rpcError } = await supabase.rpc('update_item_order', {
          p_watchlist_id: watchlistId,
          p_item_updates: updates,
        });
        if (rpcError) throw rpcError;
        // Success!
      } catch (err: unknown) {
        console.error('Error saving order:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to save new order.');
        setItems(arrayMove(newOrder, newIndex, oldIndex)); // Revert
      }
    }
  };

  // --- Render ---
  if (loading && items.length === 0) return (
      <div className="p-4">
          <Skeleton height={30} width={200} className="mb-1"/>
          <Skeleton height={20} width={150} className="mb-4"/>
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded shadow">
              <Skeleton height={20} width={150} className="mb-2"/>
              <Skeleton height={38} className="mb-2"/>
          </div>
          <Skeleton height={20} width={120} className="mb-2"/>
          <div className="space-y-3">
              {[...Array(5)].map((_, i) => <MovieListItemSkeleton key={i} />)}
          </div>
      </div>
  );
  if (error && !watchlist) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!watchlist) return <div className="p-4 text-center">Watchlist not found or permission denied.</div>;

  return (
    <div className="p-4 overflow-hidden manage-items-page"> {/* Added manage-items-page class */}
      
      {/* Removed redundant Back to Watchlist link */}
      <h2 className="text-2xl font-bold mb-1">Manage Items</h2>
      <h3 className="text-lg text-gray-600 dark:text-gray-400 mb-4">{watchlist.title}</h3>

      {error && !loading && <p className="text-red-500 mb-4">{error}</p>}

      {/* Add Items Section */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded shadow">
        <h4 className="text-lg font-semibold mb-2 dark:text-gray-100">Add Movies or TV Shows</h4>
        <input
          type="text"
          placeholder="Search TMDB..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 mb-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary"
        />
        <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
          {searchLoading && <p className="text-sm text-gray-500">Searching...</p>}
          {searchError && !searchLoading && <p className="text-sm text-red-500">{searchError}</p>}
          {searchResults.map(item => {
            const mediaId = `${item.media_type === 'movie' ? 'tmdb:movie' : 'tmdb:tv'}:${item.id}`;
            const title = item.media_type === 'movie' ? item.title : item.name;
            const year = item.media_type === 'movie'
              ? (item.release_date ? `(${new Date(item.release_date).getFullYear()})` : '')
              : (item.first_air_date ? `(${new Date(item.first_air_date).getFullYear()})` : '');
            return (
              <div key={mediaId} className="flex items-center justify-between text-sm p-1.5 bg-white dark:bg-gray-700 rounded">
                <span className="dark:text-gray-200 truncate pr-2" title={`${title} ${year}`}>{title} {year}</span>
                <button
                  onClick={() => handleAddItem(item)}
                  disabled={isAdding[mediaId]}
                  className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50 flex-shrink-0"
                  title="Add to list"
                >
                  {isAdding[mediaId] ? '...' : <PlusIcon className="h-5 w-5"/>}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Items List */}
      <h4 className="text-lg font-semibold mb-2 dark:text-gray-100">Current Items ({items.length})</h4>
      {!loading && items.length === 0 && <p className="text-gray-500 dark:text-gray-400">No items in this list yet.</p>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]} // Add modifier to restrict movement
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 overflow-x-hidden"> {/* Prevent horizontal overflow */}
            {items.map(item => (
              <SortableItem key={item.id} id={item.id}>
                {({ attributes, listeners, ref, style }) => (
                  <div ref={ref} style={style}>
                    {item.tmdbDetails ? (
                      <MediaListItem
                        mediaItem={item.tmdbDetails}
                        isWatched={user ? watchedMedia.has(item.media_id) : false}
                        onToggleWatched={handleToggleWatched}
                        addedBy={members.find(m => m.id === item.added_by_user_id)}
                        onRemoveClick={() => handleRemoveItem(item.id)}
                        showDragHandle={true}
                        attributes={attributes}
                        listeners={listeners}
                      />
                    ) : (
                      <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 flex items-center space-x-4">
                          <Skeleton circle height={24} width={24} />
                          <span>Loading details for {item.media_id}...</span>
                      </div>
                    )}
                  </div>
                )}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

    </div>
  );
}

export default ManageItemsPage;