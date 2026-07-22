import { useState, useEffect, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import CreateWatchlistModal from '../components/watchlists/CreateWatchlistModal';
import EditWatchlistModal from '../components/watchlists/EditWatchlistModal';
import WatchlistCard from '../components/watchlists/WatchlistCard';
import WatchlistCardSkeleton from '../components/watchlists/WatchlistCardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { Watchlist } from '../types/watchlist';
import { Profile } from '../types/profile';
import { logger } from '../utils/logger';
import { STORAGE_KEYS, storage } from '../utils/storage';
import { mapRawProfile, mapRawWatchlist } from '../utils/dataMappers';
import { FilmIcon, PlusIcon } from '@heroicons/react/24/outline';

type Tab = 'favorites' | 'yourLists' | 'sharedLists';

function HomePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    return (storage.local.get(STORAGE_KEYS.ACTIVE_HOME_TAB) as Tab) || 'favorites';
  });
  const [allWatchlists, setAllWatchlists] = useState<Watchlist[]>([]);
  const [favoriteLists, setFavoriteLists] = useState<Watchlist[]>([]);
  const [yourLists, setYourLists] = useState<Watchlist[]>([]);
  const [sharedLists, setSharedLists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWatchlist, setEditingWatchlist] = useState<Watchlist | null>(null);

  const fetchWatchlists = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch all watchlist memberships for current user
      const { data: memberships, error: memberError } = await supabase
        .from('watchlist_members')
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
            owner:profiles!watchlists_owner_id_fkey ( id, display_name, avatar_url )
          )
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const watchlistIds = memberships
        ?.map(m => {
          const w = Array.isArray(m.watchlist) ? m.watchlist[0] : m.watchlist;
          return (w as Record<string, unknown>)?.id as string | undefined;
        })
        .filter(Boolean) as string[] || [];

      let allMembersData: Array<{ watchlist_id: string; profile: unknown }> = [];
      if (watchlistIds.length > 0) {
        const { data: membersData, error: allMembersError } = await supabase
          .from('watchlist_members')
          .select(`
            watchlist_id,
            profile:profiles!inner ( id, display_name, avatar_url )
          `)
          .in('watchlist_id', watchlistIds);

        if (allMembersError) {
          logger.warn('Error fetching members data:', allMembersError);
        } else {
          allMembersData = membersData || [];
        }
      }

      // Group members by watchlist_id using helper
      const membersByWatchlist = new Map<string, Profile[]>();
      allMembersData.forEach(memberData => {
        const profileObj = mapRawProfile(memberData.profile);
        if (profileObj) {
          const watchlistId = memberData.watchlist_id;
          if (!membersByWatchlist.has(watchlistId)) {
            membersByWatchlist.set(watchlistId, []);
          }
          membersByWatchlist.get(watchlistId)?.push(profileObj);
        }
      });

      // Fetch user's favorite watchlist IDs
      const { data: favoritesData, error: favError } = await supabase
        .from('user_favorite_watchlists')
        .select('watchlist_id')
        .eq('user_id', user.id);

      if (favError) throw favError;
      const favoriteIds = new Set(favoritesData?.map(f => f.watchlist_id) || []);

      // Process lists using centralized data mapper
      const processedLists: Watchlist[] = memberships
        ?.map(m => mapRawWatchlist(m as unknown as Record<string, unknown>, favoriteIds, membersByWatchlist))
        .filter((list): list is Watchlist => list !== null) || [];

      setAllWatchlists(processedLists);
      setFavoriteLists(processedLists.filter(list => list.is_favorite));
      setYourLists(processedLists.filter(list => list.owner_id === user.id));
      setSharedLists(processedLists.filter(list => list.owner_id !== user.id && (list.member_role === 'editor' || list.member_role === 'viewer')));

    } catch (err: unknown) {
      logger.error('Error fetching watchlists:', err);
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

  useEffect(() => {
    storage.local.set(STORAGE_KEYS.ACTIVE_HOME_TAB, activeTab);
  }, [activeTab]);

  // Realtime updates (Consolidated 1 channel per session to save WebSocket connections)
  useEffect(() => {
    if (!user) return;

    const handleDbChange = (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
      logger.info('DB Change received! Refetching lists...', payload);
      fetchWatchlists();
    };

    const homeChannel = supabase.channel(`home-updates:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlists' }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist_members' }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_favorite_watchlists', filter: `user_id=eq.${user.id}` }, handleDbChange)
      .subscribe();

    return () => {
      supabase.removeChannel(homeChannel);
    };
  }, [user, fetchWatchlists]);

  // Clean react-swipeable handlers replacing raw touch math
  const swipeHandlers = useSwipeable({
    onSwipedLeft: (event) => {
      const el = event.event.target as HTMLElement;
      if (el && el.closest && el.closest('[data-no-swipe-navigate="true"]')) return;
      if (activeTab === 'favorites') setActiveTab('yourLists');
      else if (activeTab === 'yourLists') setActiveTab('sharedLists');
    },
    onSwipedRight: (event) => {
      const el = event.event.target as HTMLElement;
      if (el && el.closest && el.closest('[data-no-swipe-navigate="true"]')) return;
      if (activeTab === 'sharedLists') setActiveTab('yourLists');
      else if (activeTab === 'yourLists') setActiveTab('favorites');
    },
    preventScrollOnSwipe: false,
    trackMouse: false,
  });

  const handleToggleFavorite = async (watchlistId: string, isCurrentlyFavorite: boolean) => {
    if (!user) return;

    const optimisticUpdate = (list: Watchlist) =>
      list.id === watchlistId ? { ...list, is_favorite: !isCurrentlyFavorite } : list;

    setAllWatchlists(prev => prev.map(optimisticUpdate));
    setFavoriteLists(prev => isCurrentlyFavorite ? prev.filter(l => l.id !== watchlistId) : [...prev, allWatchlists.find(l => l.id === watchlistId)!].filter(Boolean).map(optimisticUpdate));
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
      logger.error('Error toggling favorite:', err);
      fetchWatchlists();
      setError('Failed to update favorite status.');
    }
  };

  const handleEdit = (watchlistId: string) => {
    const listToEdit = allWatchlists.find(list => list.id === watchlistId);
    if (listToEdit) {
      setEditingWatchlist(listToEdit);
      setIsEditModalOpen(true);
    }
  };

  const handleDeleteWatchlist = async (watchlistId: string) => {
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', watchlistId);

      if (deleteError) throw deleteError;
      if (editingWatchlist?.id === watchlistId) {
        setIsEditModalOpen(false);
        setEditingWatchlist(null);
      }
    } catch (err: unknown) {
      logger.error('Error deleting watchlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete watchlist.');
    }
  };

  const renderListContent = (lists: Watchlist[]) => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
          {[...Array(6)].map((_, index) => <WatchlistCardSkeleton key={index} />)}
        </div>
      );
    }
    if (error && lists.length === 0) {
      return <div className="text-center p-8 text-rose-500 font-medium">{error}</div>;
    }
    if (lists.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400">
            <FilmIcon className="w-8 h-8" />
          </div>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">No watchlists here yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            Create a new list or mark existing ones as favorite to organize your movies & shows.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 p-4 sm:p-6">
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

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'favorites', label: 'Favorites', count: favoriteLists.length },
    { id: 'yourLists', label: 'Your Lists', count: yourLists.length },
    { id: 'sharedLists', label: 'Shared with You', count: sharedLists.length },
  ];

  return (
    <div {...swipeHandlers} className="flex flex-col flex-1 h-full max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Desktop Hero Banner (Hidden on Mobile PWA to maximize screen space) */}
      <div className="hidden sm:flex sm:items-center justify-between gap-4 glass-panel p-6 sm:p-8 rounded-3xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Your Watchlists
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-1">
            Organize, share, and track movies & TV shows with your friends.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary shadow-lg shadow-red-600/20"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Create Watchlist</span>
        </button>
      </div>

      {/* Navigation Controls Bar (Tabs + Full Width Mobile Create Button) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex p-1.5 space-x-1 glass-panel rounded-2xl w-full sm:w-auto max-w-xl">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className="truncate">{t.label}</span>
                {!loading && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                      : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-500'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Full Width Mobile Create Button UNDER the tabs */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="sm:hidden btn-primary w-full py-2.5 px-4 rounded-2xl justify-center text-sm font-bold shadow-md shadow-red-600/20"
          aria-label="Create Watchlist"
        >
          <PlusIcon className="w-4 h-4" />
          <span>+ Create Watchlist</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto mt-2">
        {activeTab === 'favorites' && renderListContent(favoriteLists)}
        {activeTab === 'yourLists' && renderListContent(yourLists)}
        {activeTab === 'sharedLists' && renderListContent(sharedLists)}
      </div>

      {/* Modals */}
      <CreateWatchlistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onWatchlistCreated={() => setIsCreateModalOpen(false)}
      />

      <EditWatchlistModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingWatchlist(null);
        }}
        watchlist={editingWatchlist}
        onWatchlistUpdated={() => {
          setIsEditModalOpen(false);
          setEditingWatchlist(null);
        }}
        onDelete={handleDeleteWatchlist}
      />
    </div>
  );
}

export default HomePage;