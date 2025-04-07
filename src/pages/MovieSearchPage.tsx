import { useState, useEffect } from 'react'; // Removed unused useCallback
import { searchMulti, TmdbSearchResult } from '../services/tmdbService'; // Removed unused TmdbMovieSearchResult, TmdbTvSearchResult
import MediaCard from '../components/movies/MediaCard';
import AddToListModal from '../components/movies/AddToListModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types/profile';
import { Watchlist } from '../types/watchlist';
import WatchlistCard from '../components/watchlists/WatchlistCard';
import toast from 'react-hot-toast';
import { useHeader } from '../context/HeaderContext'; // Import useHeader

type SearchType = 'media' | 'watchlists';

function MovieSearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [watchlistResults, setWatchlistResults] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<TmdbSearchResult | null>(null);
  const [watchedMedia, setWatchedMedia] = useState<Set<string>>(new Set());
  const [friendsWatchedMediaMap, setFriendsWatchedMediaMap] = useState<Map<string, Set<string>>>(new Map());
  const [friends, setFriends] = useState<Profile[]>([]);
  const [searchType, setSearchType] = useState<SearchType>('media');
  const { user } = useAuth();
  const { setHeaderTitle } = useHeader(); // Get setter

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
            } catch (err: any) { setError(err.message || 'Failed to search media.'); setResults([]); }
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
            } catch (err: any) { setError(err.message || 'Failed to search watchlists.'); setWatchlistResults([]); }
            finally { setLoading(false); }
        }
    };

    const delayDebounceFn = setTimeout(() => { handleSearch(); }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchType]);

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

  // Set Header Title
  useEffect(() => {
    setHeaderTitle('Search');
  }, [setHeaderTitle]);

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
        } catch (err: any) {
            console.error("Failed to toggle watched status:", err);
            setWatchedMedia(prev => { const ns = new Set(prev); if (currentState) ns.add(mediaId); else ns.delete(mediaId); return ns; }); // Revert
            toast.error('Failed to update watched status.', { id: toastId });
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
     } catch (err: any) {
        console.error("Error toggling favorite:", err);
        toast.error('Failed to update favorite status.', { id: toastId });
     }
  };
  // Placeholder Edit handler
  const handleEditWatchlist = (watchlistId: string) => {
      toast.error(`Edit clicked for ${watchlistId}. Navigation not implemented from search.`);
  };


  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Search</h2>

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
                  />
                );
            })}
          </div>
      )}

      {searchType === 'watchlists' && !loading && watchlistResults.length > 0 && (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
             {watchlistResults.map(list => {
                 const isFavorite = false; // Placeholder
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