import { useState, useEffect, useRef, useCallback } from 'react';
import { searchMulti, TmdbSearchResult } from '../services/tmdbService';
import MediaCard from '../components/movies/MediaCard';
import AddToListModal from '../components/movies/AddToListModal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types/profile';
import { Watchlist } from '../types/watchlist';
import WatchlistCard from '../components/watchlists/WatchlistCard';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

type SearchType = 'media' | 'watchlists';

// Store last known scroll position in sessionStorage to persist between page navigations
const SCROLL_STORAGE_KEY = 'searchPageScrollPosition';

function MovieSearchPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Custom navigation function that saves scroll position before navigating
  const navigateWithScrollSave = useCallback((to: string) => {
    // Save scroll position directly from the container ref
    if (pageRef.current) {
      const currentScroll = pageRef.current.scrollTop;
      sessionStorage.setItem(SCROLL_STORAGE_KEY, currentScroll.toString());
    }
    navigate(to);
  }, [navigate]);
  
  // Initialize state from sessionStorage if available, otherwise use defaults
  const [searchTerm, setSearchTerm] = useState<string>(() => {
    const savedSearch = sessionStorage.getItem('movieSearchTerm');
    return savedSearch || '';
  });
  
  const [searchType, setSearchType] = useState<SearchType>(() => {
    const savedType = sessionStorage.getItem('movieSearchType') as SearchType;
    return savedType === 'watchlists' ? 'watchlists' : 'media';
  });
  
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [watchlistResults, setWatchlistResults] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<TmdbSearchResult | null>(null);
  const [watchedMedia, setWatchedMedia] = useState<Set<string>>(new Set());
  const [friendsWatchedMediaMap, setFriendsWatchedMediaMap] = useState<Map<string, Set<string>>>(new Map());
  const [friends, setFriends] = useState<Profile[]>([]);
  const [favoriteWatchlistIds, setFavoriteWatchlistIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  // Debounced search effect
  useEffect(() => {
    const handleSearch = async () => {
        if (searchTerm.trim().length < 2) {
            setResults([]); setWatchlistResults([]); setError(null); return;
        }
        setLoading(true); setError(null);

        if (searchType === 'media') {
            setWatchlistResults([]);
            try {
                const response = await searchMulti(searchTerm, 1);
                setResults(response.results);
                if (response.results.length === 0) setError('No movies or TV shows found.');
            } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to search media.'); setResults([]); }
            finally { setLoading(false); }
        } else { // searchType === 'watchlists'
            setResults([]);
            try {
                const { data, error: searchError } = await supabase
                    .from('watchlists')
                    .select(`*, owner:profiles!watchlists_owner_id_fkey(id, display_name)`)
                    .eq('is_public', true)
                    .ilike('title', `%${searchTerm}%`)
                    .limit(20);
                if (searchError) throw searchError;
                const processedResults = data?.map(list => ({
                    ...list,
                    owner: Array.isArray(list.owner) ? list.owner[0] : list.owner
                })) || [];
                setWatchlistResults(processedResults);
                if (processedResults.length === 0) setError('No public watchlists found.');
            } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to search watchlists.'); setWatchlistResults([]); }
            finally { setLoading(false); }
        }
    };

    const delayDebounceFn = setTimeout(() => { handleSearch(); }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchType]);

  // Save search state to sessionStorage whenever it changes
  useEffect(() => {
    if (searchTerm) {
      sessionStorage.setItem('movieSearchTerm', searchTerm);
    }
  }, [searchTerm]);

  useEffect(() => {
    sessionStorage.setItem('movieSearchType', searchType);
  }, [searchType]);

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

  // Fetch friends and their watched media
  useEffect(() => {
    const fetchFriendsAndWatched = async () => {
        if (!user) return;
        try {
            const { data: friendships1, error: error1 } = await supabase.from('friendships').select('user_id_2').eq('user_id_1', user.id);
            if (error1) throw error1;
            const { data: friendships2, error: error2 } = await supabase.from('friendships').select('user_id_1').eq('user_id_2', user.id);
            if (error2) throw error2;
            const friendIds = [...(friendships1?.map(f => f.user_id_2) || []), ...(friendships2?.map(f => f.user_id_1) || [])];

            if (friendIds.length === 0) { setFriends([]); setFriendsWatchedMediaMap(new Map()); return; }

            const { data: friendProfiles, error: profileError } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', friendIds);
            if (profileError) throw profileError;
            setFriends(friendProfiles || []);

            const { data: friendsWatchedData, error: watchedError } = await supabase
                .from('user_watched_items')
                .select('user_id, media_id')
                .in('user_id', friendIds);
            if (watchedError) throw watchedError;

            const watchedMap = new Map<string, Set<string>>();
            (friendsWatchedData || []).forEach(watched => {
                if (!watchedMap.has(watched.media_id)) watchedMap.set(watched.media_id, new Set());
                watchedMap.get(watched.media_id)?.add(watched.user_id);
            });
            setFriendsWatchedMediaMap(watchedMap);

        } catch (err) { console.error("Failed to fetch friends' watched media:", err); setFriends([]); setFriendsWatchedMediaMap(new Map()); }
    };
    fetchFriendsAndWatched();
  }, [user]);

  // Fetch favorite watchlists
  useEffect(() => {
    const fetchFavoriteWatchlists = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('user_favorite_watchlists')
          .select('watchlist_id')
          .eq('user_id', user.id);
        if (error) throw error;
        setFavoriteWatchlistIds(new Set(data?.map(f => f.watchlist_id) || []));
      } catch (err) { console.error("Failed to fetch favorite watchlists:", err); }
    };
    fetchFavoriteWatchlists();
  }, [user]);

  // Set up scroll event listener on the container div
  useEffect(() => {
    const containerElement = pageRef.current;
    if (!containerElement) return;
    
    const handleScroll = () => {
      const newPosition = containerElement.scrollTop;
      sessionStorage.setItem(SCROLL_STORAGE_KEY, newPosition.toString());
    };
    
    containerElement.addEventListener('scroll', handleScroll);
    return () => {
      if (containerElement) {
        containerElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Restore scroll position when component mounts and content is loaded
  useEffect(() => {
    if (!loading && (results.length > 0 || watchlistResults.length > 0)) {
      const savedPosition = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (savedPosition && pageRef.current) {
        const position = parseInt(savedPosition, 10);
        if (position > 0) {
          setTimeout(() => {
            if (pageRef.current) {
              pageRef.current.scrollTop = position;
            }
          }, 300);
        }
      }
    }
  }, [loading, results.length, watchlistResults.length]);

  // Handle popstate event (browser back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const savedPosition = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (savedPosition && pageRef.current) {
        const position = parseInt(savedPosition, 10);
        if (position > 0) {
          setTimeout(() => {
            if (pageRef.current) {
              pageRef.current.scrollTop = position;
            }
          }, 300);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // --- Modal Handlers ---
  const handleOpenAddToListModal = (item: TmdbSearchResult) => {
    setSelectedMedia(item);
    setIsAddToListModalOpen(true);
  };

  const handleCloseAddToListModal = () => {
    setSelectedMedia(null);
    setIsAddToListModalOpen(false);
  };

  // --- Watched Toggle Handler ---
   const handleToggleWatched = async (item: TmdbSearchResult, currentState: boolean) => {
        if (!user) return;
        const mediaId = `${item.media_type === 'movie' ? 'tmdb:movie' : 'tmdb:tv'}:${item.id}`;
        setWatchedMedia(prev => { const ns = new Set(prev); if (currentState) ns.delete(mediaId); else ns.add(mediaId); return ns; });
        const toastId = toast.loading(currentState ? 'Marking as unwatched...' : 'Marking as watched...');
        try {
            if (currentState) {
                const { error } = await supabase.from('user_watched_items').delete().match({ user_id: user.id, media_id: mediaId });
                if (error) throw error;
                toast.success('Marked as unwatched.', { id: toastId });
            } else {
                const { error } = await supabase.from('user_watched_items').insert({ user_id: user.id, media_id: mediaId });
                if (error) throw error;
                toast.success('Marked as watched.', { id: toastId });
            }
        } catch (err: unknown) {
            console.error("Failed to toggle watched status:", err);
            setWatchedMedia(prev => { const ns = new Set(prev); if (currentState) ns.add(mediaId); else ns.delete(mediaId); return ns; }); // Revert
            toast.error(err instanceof Error ? err.message : 'Failed to update watched status.', { id: toastId });
        }
   };

   // --- Toggle Favorite Handler ---
   const handleToggleFavorite = async (watchlistId: string, isCurrentlyFavorite: boolean) => {
     if (!user) return;
     const toastId = toast.loading(isCurrentlyFavorite ? 'Removing from favorites...' : 'Adding to favorites...');
     try {
        if (isCurrentlyFavorite) {
            const { error } = await supabase.from('user_favorite_watchlists').delete().match({ user_id: user.id, watchlist_id: watchlistId });
            if (error) throw error;
        } else {
            const { error } = await supabase.from('user_favorite_watchlists').insert({ user_id: user.id, watchlist_id: watchlistId });
            if (error) throw error;
        }
        toast.success(isCurrentlyFavorite ? 'Removed from favorites.' : 'Added to favorites.', { id: toastId });
        if (searchType === 'watchlists') {
             setWatchlistResults(prev => prev.map(list =>
                list.id === watchlistId ? { ...list, is_favorite: !isCurrentlyFavorite } : list
             ));
        }
     } catch (err: unknown) {
        console.error("Error toggling favorite:", err);
        toast.error(err instanceof Error ? err.message : 'Failed to update favorite status.', { id: toastId });
     }
  };
  // Placeholder Edit handler
  const handleEditWatchlist = (watchlistId: string) => {
      toast.error(`Edit clicked for ${watchlistId}. Navigation not implemented from search.`);
  };


  return (
    <div 
      className="p-4 h-[calc(100vh-64px)] overflow-y-auto" 
      ref={pageRef}
      style={{ position: 'relative' }}
    >
      {/* Removed redundant h2 title */}

      {/* Search Type Toggle */}
      <div className="mb-4 flex justify-center space-x-2 border-b dark:border-gray-700 pb-2">
          <button onClick={() => setSearchType('media')} className={`py-2 px-4 rounded-t-md text-sm font-medium ${searchType === 'media' ? 'bg-white dark:bg-gray-800 border-x border-t dark:border-gray-700 text-primary dark:text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
            Media
          </button>
           <button onClick={() => setSearchType('watchlists')} className={`py-2 px-4 rounded-t-md text-sm font-medium ${searchType === 'watchlists' ? 'bg-white dark:bg-gray-800 border-x border-t dark:border-gray-700 text-primary dark:text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
            Public Watchlists
          </button>
      </div>

      <input
        type="text"
        placeholder={`Search ${searchType === 'media' ? 'Movies & TV Shows...' : 'Public Watchlists...'}`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary"
      />

      {loading && <p className="text-center">Loading results...</p>}
      {error && !loading && <p className="text-center text-red-600">{error}</p>}

      {/* Conditional Rendering */}
      {searchType === 'media' && !loading && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
            {results.map(item => {
                const mediaIdStr = `${item.media_type === 'movie' ? 'tmdb:movie' : 'tmdb:tv'}:${item.id}`;
                const friendWatcherIds = friendsWatchedMediaMap.get(mediaIdStr) || new Set<string>();
                const friendsWhoWatched = friends.filter(f => friendWatcherIds.has(f.id));
                return (
                  <MediaCard
                    key={mediaIdStr}
                    mediaItem={item}
                    onAddToListClick={handleOpenAddToListModal}
                    isWatched={watchedMedia.has(mediaIdStr)}
                    onToggleWatched={handleToggleWatched}
                    watchedByFriends={friendsWhoWatched}
                    onNavigate={navigateWithScrollSave}
                  />
                );
            })}
          </div>
      )}

      {searchType === 'watchlists' && !loading && watchlistResults.length > 0 && (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
             {watchlistResults.map(list => {
                 const isFavorite = favoriteWatchlistIds.has(list.id);
                 return (
                    <WatchlistCard
                        key={list.id}
                        watchlist={{...list, is_favorite: isFavorite}}
                        onToggleFavorite={handleToggleFavorite}
                        onEdit={handleEditWatchlist}
                    />
                 );
             })}
           </div>
      )}

      {/* Add To List Modal */}
      {selectedMedia && (
          <AddToListModal
            isOpen={isAddToListModalOpen}
            onClose={handleCloseAddToListModal}
            mediaItem={selectedMedia}
          />
      )}
    </div>
  );
}

export default MovieSearchPage;