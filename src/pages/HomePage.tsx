import { useState, useEffect, useCallback } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import CreateWatchlistModal from '../components/watchlists/CreateWatchlistModal';
import EditWatchlistModal from '../components/watchlists/EditWatchlistModal';
import WatchlistCard from '../components/watchlists/WatchlistCard';
import WatchlistCardSkeleton from '../components/watchlists/WatchlistCardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { Watchlist, WatchlistRole } from '../types/watchlist';
import { Profile } from '../types/profile';
import { logger } from '../utils/logger';
import { STORAGE_KEYS, storage } from '../utils/storage';

type Tab = 'favorites' | 'yourLists' | 'sharedLists';

// Type for the raw owner data structure from Supabase join
type RawOwnerData = {
    id: string;
    display_name: string | null;
} | Array<{
    id: string;
    display_name: string | null;
}> | null | undefined;

// Type for the raw watchlist data structure from Supabase join
type RawWatchlistData = {
    id: string;
    owner_id: string;
    title: string;
    description: string | null;
    card_color: string | null;
    is_public: boolean;
    created_at: string;
    updated_at: string | null;
    owner: RawOwnerData;
} | null | undefined;

function HomePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
      return (storage.local.get(STORAGE_KEYS.ACTIVE_HOME_TAB) as Tab) || 'favorites';
  });
  const [allWatchlists, setAllWatchlists] = useState<Watchlist[]>([]); // Store all relevant lists
  const [favoriteLists, setFavoriteLists] = useState<Watchlist[]>([]);
  const [yourLists, setYourLists] = useState<Watchlist[]>([]);
  const [sharedLists, setSharedLists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWatchlist, setEditingWatchlist] = useState<Watchlist | null>(null);
  // Remove unused deleteLoading state

  const fetchWatchlists = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch all watchlist memberships for the current user
      const { data: memberships, error: memberError } = await supabase
        .from('watchlist_members')
        // Select role from members, and watchlist details including owner_id
        // Then join profiles explicitly based on watchlists.owner_id
        .select(`
          role,
          watchlist:watchlists!inner (
            id,
            owner_id,
            title,
            description,
            card_color,
            is_public,
            created_at,
            updated_at,
            owner:profiles!watchlists_owner_id_fkey ( id, display_name )
          )
        `)
        // Alternative syntax if the above doesn't work:
        // .select(`
        //   role,
        //   watchlist:watchlists!inner (
        //     *,
        //     owner:profiles!inner(*)
        //   )
        // `)
        // .eq('watchlist.owner_id', 'watchlist.owner.id') // This condition is usually implicit
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      // Fetch favorite watchlist IDs for the current user
      const { data: favoritesData, error: favError } = await supabase
        .from('user_favorite_watchlists')
        .select('watchlist_id')
        .eq('user_id', user.id);

      if (favError) throw favError;
      const favoriteIds = new Set(favoritesData?.map(f => f.watchlist_id) || []);

      // Process the fetched data
      const processedLists: Watchlist[] = memberships
        ?.map(m => {
          // Define expected shape from Supabase query result more explicitly
          // Use 'any' for the initial access due to complex/unpredictable join types from Supabase
          // Handle potential array from Supabase join (though !inner should prevent it)
          const watchlistData = Array.isArray(m.watchlist) ? m.watchlist[0] : m.watchlist;
          const rawWatchlistData: RawWatchlistData = watchlistData;

          // Basic validation that we have *something* resembling watchlist data
          if (!rawWatchlistData || typeof rawWatchlistData !== 'object' || Array.isArray(rawWatchlistData) || !rawWatchlistData.id) {
            logger.warn("Skipping invalid or inaccessible watchlist data in membership:", m);
            return null;
          }

          // Handle nested owner profile carefully
          let ownerProfile: Profile | undefined = undefined;
          const rawOwnerData: RawOwnerData = rawWatchlistData?.owner; // Access owner data safely
          if (rawOwnerData) {
            // Check if owner data is an array (from join) or a single object
            const ownerData = Array.isArray(rawOwnerData) ? rawOwnerData[0] : rawOwnerData;
            // Validate the structure of the owner data before creating Profile
            if (ownerData && typeof ownerData === 'object' && ownerData.id && ownerData.display_name) {
                 ownerProfile = {
                    id: ownerData.id,
                    display_name: ownerData.display_name,
                    // avatar_url and updated_at are optional in Profile type
                 };
            } else {
                 logger.warn("Watchlist owner data is invalid or incomplete:", ownerData);
            }
          }

          // Construct the final Watchlist object, ensuring all required fields exist
          // and optional fields are handled correctly.
          const watchlist: Watchlist = {
            id: rawWatchlistData.id,
            owner_id: rawWatchlistData.owner_id,
            title: rawWatchlistData.title,
            description: rawWatchlistData.description,
            card_color: rawWatchlistData.card_color,
            is_public: rawWatchlistData.is_public,
            created_at: rawWatchlistData.created_at,
            // Provide fallback for updated_at to satisfy Watchlist type (which now allows null)
            updated_at: rawWatchlistData.updated_at,
            owner: ownerProfile, // Assign the processed owner profile
            member_role: m.role as WatchlistRole | undefined, // Cast role
            is_favorite: favoriteIds.has(rawWatchlistData.id), // Check favorite status
          };
          return watchlist;
        })
        .filter((list): list is Watchlist => list !== null) // Filter should now work correctly
         || []; // Default to empty array if memberships is null/undefined

      setAllWatchlists(processedLists);

      // Filter lists for each tab
      setFavoriteLists(processedLists.filter(list => list.is_favorite));
      setYourLists(processedLists.filter(list => list.owner_id === user.id));
      setSharedLists(processedLists.filter(list => list.owner_id !== user.id && (list.member_role === 'editor' || list.member_role === 'viewer')));

    } catch (err: unknown) {
      logger.error("Error fetching watchlists:", err);
      setError(err instanceof Error ? err.message : 'Failed to load watchlists.');
      setAllWatchlists([]);
      setFavoriteLists([]);
      setYourLists([]);
      setSharedLists([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWatchlists();
  }, [fetchWatchlists]);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    storage.local.set(STORAGE_KEYS.ACTIVE_HOME_TAB, activeTab);
  }, [activeTab]);

  // Removed useEffect that set header title to 'Your Watchlists'
  // Default 'Neislios' from HeaderProvider will be used unless another page sets it.

  // Realtime subscription setup - Simplified
  useEffect(() => {
    if (!user) return;

    const handleDbChange = (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => { // Use indexable unknown
        logger.info('DB Change received! Refetching lists...', payload); // Add more detail
        fetchWatchlists();
      };    // Subscribe to changes in relevant tables without complex filters
    const watchlistChannel = supabase.channel('public:watchlists')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlists' }, handleDbChange)
      .subscribe();

    const membersChannel = supabase.channel('public:watchlist_members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist_members' }, handleDbChange)
      .subscribe();

    const favoritesChannel = supabase.channel('public:user_favorite_watchlists')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_favorite_watchlists', filter: `user_id=eq.${user.id}` }, handleDbChange) // Keep filter here as it's user-specific
      .subscribe();


    // Cleanup function
    return () => {
      logger.info('Unsubscribing from homepage changes');
      supabase.removeChannel(watchlistChannel);
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(favoritesChannel);
    };

  }, [user, fetchWatchlists]);

  // --- Handle Tab Switching ---
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  // Touch handling state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Required minimum distance between touch start and end to be detected as swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    // Always capture the touch start position
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    
    // Don't prevent default to allow scrolling
    // But stop propagation to prevent other handlers from interfering
    e.stopPropagation();
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    setTouchEnd(e.targetTouches[0].clientX);
    // Stop propagation but don't prevent default (allows scrolling)
    e.stopPropagation();
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !touchEnd) return;

    // Calculate distance
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    // Only handle swipe if it's on a non-card element
    const target = e.target as Element;
    if (!target.closest('[data-no-swipe-navigate="true"]')) {
      // Handle left swipe
      if (isLeftSwipe) {
        if (activeTab === 'favorites') handleTabChange('yourLists');
        else if (activeTab === 'yourLists') handleTabChange('sharedLists');
      }
      
      // Handle right swipe
      if (isRightSwipe) {
        if (activeTab === 'sharedLists') handleTabChange('yourLists');
        else if (activeTab === 'yourLists') handleTabChange('favorites');
      }
    }
    
    // Stop event propagation
    e.stopPropagation();
  };

  // --- Placeholder Action Handlers ---
  const handleCloseCreateModal = () => setIsCreateModalOpen(false); // Close modal
  const handleWatchlistCreated = () => {
    // No need to call fetchWatchlists here, subscription should handle it
    handleCloseCreateModal();
  };
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingWatchlist(null); // Clear editing state
  };
  const handleWatchlistUpdated = () => {
      // No need to call fetchWatchlists here, subscription should handle it
      handleCloseEditModal();
  };
  const handleToggleFavorite = async (watchlistId: string, isCurrentlyFavorite: boolean) => {
    if (!user) return;
    // Implement logic to add/remove from user_favorite_watchlists table
    // Note: This would require database schema changes and API endpoints
    // Optimistically update UI first
    const optimisticUpdate = (list: Watchlist) =>
        list.id === watchlistId ? { ...list, is_favorite: !isCurrentlyFavorite } : list;

    setAllWatchlists(prev => prev.map(optimisticUpdate));
    setFavoriteLists(prev => isCurrentlyFavorite ? prev.filter(l => l.id !== watchlistId) : [...prev, allWatchlists.find(l => l.id === watchlistId)!].filter(Boolean).map(optimisticUpdate)); // Add/remove and update
    setYourLists(prev => prev.map(optimisticUpdate));
    setSharedLists(prev => prev.map(optimisticUpdate));


    try {
        if (isCurrentlyFavorite) {
            const { error } = await supabase
                .from('user_favorite_watchlists')
                .delete()
                .match({ user_id: user.id, watchlist_id: watchlistId });
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('user_favorite_watchlists')
                .insert({ user_id: user.id, watchlist_id: watchlistId });
            if (error) throw error;
        }
    } catch (err) {
        logger.error("Error toggling favorite:", err);
        // Revert optimistic update on error
        const revertUpdate = (list: Watchlist) =>
            list.id === watchlistId ? { ...list, is_favorite: isCurrentlyFavorite } : list;
        setAllWatchlists(prev => prev.map(revertUpdate));
        setFavoriteLists(prev => !isCurrentlyFavorite ? prev.filter(l => l.id !== watchlistId) : [...prev, allWatchlists.find(l => l.id === watchlistId)!].filter(Boolean).map(revertUpdate));
        setYourLists(prev => prev.map(revertUpdate));
        setSharedLists(prev => prev.map(revertUpdate));
        setError('Failed to update favorite status.');
    }

    // alert(`Toggle favorite for: ${watchlistId, currently: ${isCurrentlyFavorite}`);
  };
  const handleEdit = (watchlistId: string) => { // Opens Edit Modal
    const listToEdit = allWatchlists.find(list => list.id === watchlistId);
    if (listToEdit) {
        setEditingWatchlist(listToEdit);
        setIsEditModalOpen(true);
    } else {
        logger.error("Could not find watchlist to edit:", watchlistId);
        setError("Could not find watchlist to edit.");
    }
  };

  // --- Tab Content Rendering ---
  const renderListContent = (lists: Watchlist[]) => {
    // Show skeletons while loading
    if (loading) {
        return (
            <div className="space-y-3">
                {/* Render multiple skeletons */}
                {[...Array(5)].map((_, index) => <WatchlistCardSkeleton key={index} />)}
            </div>
        );
    }
    if (error && lists.length === 0 && activeTab !== 'favorites') return <p className="text-center p-4 text-red-600">{error}</p>;
    if (!loading && lists.length === 0) return <p className="text-center p-4 text-gray-500 dark:text-gray-400">No watchlists found.</p>; // Added dark mode text

    // Use a vertical list instead of a grid
    // Use a responsive grid layout
    return (
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1 touch-pan-y"
      > 
        {lists.map(list => {
            const onDeleteHandler = (activeTab === 'yourLists' && list.owner_id === user?.id)
                ? handleDeleteWatchlist
                : undefined;

            return (
              <WatchlistCard
                key={list.id}
                watchlist={list}
                onToggleFavorite={handleToggleFavorite}
                onEdit={handleEdit}
                onDelete={onDeleteHandler}
              />
            );
        })}
      </div>
    );
  };

  // --- Delete Watchlist Handler ---
  const handleDeleteWatchlist = async (watchlistId: string) => {
      // Confirmation is handled in the modal now
      setError(null);
      try {
          // RLS policy should enforce ownership, but we could double-check owner_id if needed
          const { error: deleteError } = await supabase
              .from('watchlists')
              .delete()
              .eq('id', watchlistId);

          if (deleteError) throw deleteError;

          // Success! Realtime subscription will trigger fetchWatchlists to update UI.
          // No need for optimistic UI update here if subscription is reliable.
          logger.info(`Watchlist ${watchlistId} delete initiated.`);
          // Close the edit modal if it was open for this list
          if (editingWatchlist?.id === watchlistId) {
              handleCloseEditModal();
          }

      } catch (err: unknown) {
          logger.error("Error deleting watchlist:", err);
          setError(err instanceof Error ? err.message : 'Failed to delete watchlist.');
      }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'favorites':
        return renderListContent(favoriteLists);
      case 'yourLists':
        return renderListContent(yourLists);
      case 'sharedLists':
        return renderListContent(sharedLists);
      default:
        return null;
    }
  };

  // Helper function for tab button classes (same as before)
  const getTabClass = (tabName: Tab): string => {
    const baseClass = "py-2 px-4 text-sm font-medium focus:outline-none";
    const activeClass = "text-blue-600 bg-gray-100 dark:bg-gray-700 dark:text-white border-b-2 border-blue-500";
    const inactiveClass = "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800";
    return `${baseClass} ${activeTab === tabName ? activeClass : inactiveClass}`;
  };

  return (
    <div 
      id="swipeable-home-container"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="flex flex-col flex-1 overflow-hidden h-full touch-pan-y"
    >
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex justify-center space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('favorites')} className={getTabClass('favorites')}>Favorites</button>
          <button onClick={() => setActiveTab('yourLists')} className={getTabClass('yourLists')}>Your Lists</button>
          <button onClick={() => setActiveTab('sharedLists')} className={getTabClass('sharedLists')}>Shared Lists</button>
        </nav>
      </div>

      {/* Tab Content Area - With proper flex and overflow settings */}
      <div className="flex-1 overflow-auto">
        {renderTabContent()}
      </div>

      {/* Floating Action Button is now handled in MainLayout */}

      {/* Create Watchlist Modal */}
      <CreateWatchlistModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onWatchlistCreated={handleWatchlistCreated}
      />

      {/* Edit Watchlist Modal */}
      <EditWatchlistModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        watchlist={editingWatchlist}
        onWatchlistUpdated={handleWatchlistUpdated}
        onDelete={handleDeleteWatchlist} // Pass delete handler
      />
    </div>
  );
}

export default HomePage;