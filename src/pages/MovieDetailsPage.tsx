import { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getMediaDetails, getMoviePosterUrl, getProfilePictureUrl, TmdbMediaDetails, TmdbSearchResult } from '../services/tmdbService';
import { isMovieDetails, isTvDetails } from '../utils/tmdbUtils';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types/profile';
import AddToListModal from '../components/movies/AddToListModal';
import { EyeIcon, EyeSlashIcon, ArrowTopRightOnSquareIcon, ListBulletIcon, CalendarDaysIcon, StarIcon, ClockIcon, TvIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import { useHeader } from '../hooks/useHeader';

function MovieDetailsPage() {
  const { tmdbId } = useParams<{ tmdbId: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const { setHeaderTitle } = useHeader();

  const [mediaDetails, setMediaDetails] = useState<TmdbMediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWatched, setIsWatched] = useState(false);
  const [friendsWhoWatched, setFriendsWhoWatched] = useState<Profile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [selectedMediaForModal, setSelectedMediaForModal] = useState<TmdbSearchResult | null>(null);
  const [containingEditableLists, setContainingEditableLists] = useState<string[]>([]);
  const [loadingEditableLists, setLoadingEditableLists] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);

  const mediaType = location.pathname.startsWith('/tv/') ? 'tv' : 'movie';
  const mediaId = tmdbId ? parseInt(tmdbId, 10) : null;
  const fullMediaId = mediaType && mediaId ? `tmdb:${mediaType}:${mediaId}` : null;

  // Parse query parameters to detect watchlist context
  const urlParams = new URLSearchParams(location.search);
  const isFromWatchlist = urlParams.get('from') === 'watchlist';
  const contextWatchlistId = urlParams.get('watchlistId');

  const fetchDetails = useCallback(async () => {
    if (!mediaType || !mediaId || !fullMediaId) {
      setError("Invalid media type or ID in URL.");
      setLoading(false); setLoadingFriends(false); setLoadingEditableLists(false);
      return;
    }
    setLoading(true); setLoadingFriends(true); setLoadingEditableLists(true);
    setError(null); setFriendsWhoWatched([]); setContainingEditableLists([]);

    try {
      const details = await getMediaDetails(fullMediaId);
      if (!details) throw new Error("Failed to load media details.");
      setMediaDetails(details);
      // Set header title after fetching details
      setHeaderTitle(isMovieDetails(details) ? details.title : details.name);

      if (user) {
        // Fetch watched status
        try {
          const { data, error: watchedError } = await supabase
            .from('user_watched_items').select('media_id')
            .eq('user_id', user.id).eq('media_id', fullMediaId)
            .maybeSingle();
          if (watchedError) throw watchedError;
          setIsWatched(!!data);
        } catch (watchedErr) { console.error("Error fetching watched status:", watchedErr); setIsWatched(false); }

        // Fetch friends who watched
        try {
          const { data: friendships1, error: fError1 } = await supabase.from('friendships').select('user_id_2').eq('user_id_1', user.id);
          if (fError1) throw fError1;
          const { data: friendships2, error: fError2 } = await supabase.from('friendships').select('user_id_1').eq('user_id_2', user.id);
          if (fError2) throw fError2;
          const friendIds = [...(friendships1?.map(f => f.user_id_2) || []), ...(friendships2?.map(f => f.user_id_1) || [])];

          if (friendIds.length > 0) {
            const { data: friendWatchData, error: fwError } = await supabase
              .from('user_watched_items').select('user_id')
              .in('user_id', friendIds).eq('media_id', fullMediaId);
            if (fwError) throw fwError;
            const friendWatcherIds = new Set(friendWatchData?.map(fw => fw.user_id) || []);
            if (friendWatcherIds.size > 0) {
              const { data: watcherProfiles, error: wpError } = await supabase
                .from('profiles').select('id, display_name, avatar_url')
                .in('id', Array.from(friendWatcherIds));
              if (wpError) throw wpError;
              setFriendsWhoWatched(watcherProfiles || []);
            } else { setFriendsWhoWatched([]); }
          } else { setFriendsWhoWatched([]); }
        } catch (friendErr: unknown) { console.error("Error fetching friends watched status:", friendErr instanceof Error ? friendErr.message : friendErr); setFriendsWhoWatched([]); }
        finally { setLoadingFriends(false); }

        // Fetch which editable lists contain this item
         try {
            const { data: editableListIdsData, error: editableListError } = await supabase
                .from('watchlist_members').select('watchlist_id')
                .eq('user_id', user.id).in('role', ['owner', 'editor']);
            if (editableListError) throw editableListError;
            const editableListIds = editableListIdsData?.map(l => l.watchlist_id) || [];

            if (editableListIds.length > 0) {
                 const { data: listData, error: listError } = await supabase
                    .from('watchlist_items')
                    .select('watchlist_id')
                    .eq('media_id', fullMediaId)
                    .in('watchlist_id', editableListIds);
                 if (listError) throw listError;
                 setContainingEditableLists(listData?.map(l => l.watchlist_id) || []);
            } else { setContainingEditableLists([]); }
        } catch (listCheckErr) { console.error("Error checking list membership:", listCheckErr); setContainingEditableLists([]); }
        finally { setLoadingEditableLists(false); }

      } else { // Not logged in
        setIsWatched(false); setFriendsWhoWatched([]); setContainingEditableLists([]);
        setLoadingFriends(false); setLoadingEditableLists(false);
      }

    } catch (err: unknown) {
      console.error("Error fetching media details:", err);
      setError(err instanceof Error ? err.message : 'Failed to load media details.');
      setHeaderTitle("Error"); // Set error title
    } finally {
      setLoading(false);
    }
  }, [mediaType, mediaId, fullMediaId, user, setHeaderTitle]); // Add setHeaderTitle dependency

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // --- Action Handlers ---
  const handleToggleWatched = async () => {
    if (!user || !mediaDetails || !fullMediaId) return;
    const currentState = isWatched;

    // Use functional update for optimistic UI change
    setIsWatched(prev => !prev);

    const toastId = toast.loading(currentState ? 'Marking as unwatched...' : 'Marking as watched...');
    try {
        let operationError;
        if (currentState) {
            const { error } = await supabase.from('user_watched_items').delete().match({ user_id: user.id, media_id: fullMediaId });
            operationError = error;
        } else {
            const { error } = await supabase.from('user_watched_items').insert({ user_id: user.id, media_id: fullMediaId });
            operationError = error;
        }
        if (operationError) throw operationError;
        toast.success(currentState ? 'Marked as unwatched.' : 'Marked as watched.', { id: toastId });
    } catch (err: unknown) {
        console.error("Supabase Error (Toggle Watched):", err);
        // Revert UI state using functional update
        setIsWatched(prev => !prev); // Toggle back
        toast.error(err instanceof Error ? err.message : 'Failed to update watched status.', { id: toastId });
    }
  };

   const handleRemoveFromList = async (listId: string) => {
      if (!user || !mediaDetails || !fullMediaId) return;
      const originalContainingLists = [...containingEditableLists];
      setContainingEditableLists(prev => prev.filter(id => id !== listId));
      const toastId = toast.loading('Removing from list...');
      try {
          const { data: wmEntry, error: findError } = await supabase
              .from('watchlist_items').select('id')
              .eq('watchlist_id', listId).eq('media_id', fullMediaId)
              .limit(1).maybeSingle();
          if (findError) throw findError;
          if (!wmEntry) { console.warn("Item already removed or not found in list", listId); toast.dismiss(toastId); return; }
          const { error: deleteError } = await supabase.from('watchlist_items').delete().eq('id', wmEntry.id);
          if (deleteError) throw deleteError;
          toast.success('Removed from list.', { id: toastId });
      } catch (err: unknown) {
          console.error("Error removing item from list:", err);
          toast.error(err instanceof Error ? err.message : 'Failed to remove item from list.', { id: toastId });
          setContainingEditableLists(originalContainingLists); // Revert
      }
  };

  const handleOpenAddToListModal = () => {
      if (!mediaDetails) return;
      const searchResultFormat: TmdbSearchResult = isMovieDetails(mediaDetails)
        ? { ...mediaDetails, media_type: 'movie' }
        : { ...mediaDetails, media_type: 'tv' };
      setSelectedMediaForModal(searchResultFormat);
      setIsAddToListModalOpen(true);
  };

   const handleCloseAddToListModal = () => {
    setSelectedMediaForModal(null);
    setIsAddToListModalOpen(false);
    fetchDetails();
  };

  // --- Render ---
  if (loading) return (
      <div className="p-4">
          <Skeleton height={40} width={200} className="mb-4" />
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-6">
              <Skeleton height={288} width={192} className="md:w-1/4" />
              <div className="md:w-3/4">
                  <Skeleton height={30} width={`80%`} className="mb-2"/>
                  <Skeleton height={16} width={`60%`} className="mb-3"/>
                  <Skeleton height={20} width={`40%`} count={2} className="mb-2"/>
                  <Skeleton height={36} width={150} />
              </div>
          </div>
          <Skeleton height={24} width={120} className="mb-2"/>
          <Skeleton count={3} />
      </div>
  );
  if (error && !mediaDetails) return <div className="text-center p-4 text-red-600">Error: {error}</div>;
  if (!mediaDetails) return <div className="text-center p-4">Media details not found.</div>;

  const title = isMovieDetails(mediaDetails) ? mediaDetails.title : mediaDetails.name;
  const year = isMovieDetails(mediaDetails)
    ? (mediaDetails.release_date ? new Date(mediaDetails.release_date).getFullYear() : 'N/A')
    : (mediaDetails.first_air_date ? new Date(mediaDetails.first_air_date).getFullYear() : 'N/A');
  const posterUrl = getMoviePosterUrl(mediaDetails.poster_path, 'w342');
  const imdbId = isMovieDetails(mediaDetails) ? mediaDetails.imdb_id : (isTvDetails(mediaDetails) ? mediaDetails.external_ids?.imdb_id : null);
  const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : null;
  const trailer = mediaDetails.videos?.results?.find(vid => vid.site === 'YouTube' && vid.type === 'Trailer');
  const runtime = isMovieDetails(mediaDetails) && mediaDetails.runtime ? `${mediaDetails.runtime} min` : (isTvDetails(mediaDetails) && mediaDetails.episode_run_time?.[0] ? `${mediaDetails.episode_run_time[0]} min/ep` : null);
  const photos = (mediaDetails.images?.backdrops || [])
      .map(img => ({ ...img, url: getMoviePosterUrl(img.file_path, 'w780') }))
      .filter(img => img.url !== null)
      .slice(0, 8);
  const cast = mediaDetails.credits?.cast?.slice(0, 6) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {error && !loading && (
        <p className="p-3 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl text-sm font-medium text-center">
          {error}
        </p>
      )}

      {/* Hero Header Panel */}
      <div className="glass-panel p-5 sm:p-8 rounded-3xl relative overflow-hidden">
        {/* Subtle Ambient Backdrop Overlay */}
        {photos[0]?.url && (
          <div
            className="absolute inset-0 z-0 opacity-10 dark:opacity-15 blur-2xl pointer-events-none bg-cover bg-center"
            style={{ backgroundImage: `url(${photos[0].url})` }}
          />
        )}

        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
          {/* Poster Image */}
          <div className="w-48 sm:w-56 md:w-64 flex-shrink-0">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={`${title} poster`}
                className="w-full h-auto rounded-2xl shadow-2xl border border-slate-200/40 dark:border-slate-700/60 object-cover"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 font-semibold shadow-xl">
                No Poster
              </div>
            )}
          </div>

          {/* Main Info Column */}
          <div className="flex-1 space-y-4 text-center md:text-left min-w-0">
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                {title}
              </h1>
              {mediaDetails.tagline && (
                <p className="text-sm sm:text-base italic text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  "{mediaDetails.tagline}"
                </p>
              )}
            </div>

            {/* Metadata Pills / Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
                <span>{year}</span>
              </span>

              {mediaDetails.vote_average > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <StarIcon className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{mediaDetails.vote_average.toFixed(1)}</span>
                </span>
              )}

              {runtime && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                  <ClockIcon className="h-4 w-4 text-slate-400" />
                  <span>{runtime}</span>
                </span>
              )}

              {isTvDetails(mediaDetails) && mediaDetails.number_of_seasons && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                  <TvIcon className="h-4 w-4 text-slate-400" />
                  <span>{mediaDetails.number_of_seasons} Season{mediaDetails.number_of_seasons > 1 ? 's' : ''}</span>
                </span>
              )}
            </div>

            {/* Genre Badges */}
            {mediaDetails.genres && mediaDetails.genres.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {mediaDetails.genres.map(genre => (
                  <span
                    key={genre.id}
                    className="text-xs bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-3 py-1 rounded-full border border-slate-300/50 dark:border-slate-700/50"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {/* Primary Action Buttons (Mark Watched, Add/Remove List, IMDb) */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <button
                onClick={handleToggleWatched}
                className={isWatched ? 'btn-secondary text-xs sm:text-sm px-4 py-2.5 flex items-center justify-center gap-2' : 'btn-primary text-xs sm:text-sm px-4 py-2.5 flex items-center justify-center gap-2'}
              >
                {isWatched ? <EyeIcon className="h-4 w-4 text-red-500" /> : <EyeSlashIcon className="h-4 w-4" />}
                <span>{isWatched ? 'Watched' : 'Mark Watched'}</span>
              </button>

              {!loadingEditableLists && isFromWatchlist && contextWatchlistId && containingEditableLists.includes(contextWatchlistId) ? (
                <button
                  onClick={() => handleRemoveFromList(contextWatchlistId)}
                  className="btn-secondary text-xs sm:text-sm px-4 py-2.5 flex items-center justify-center gap-2"
                >
                  <ListBulletIcon className="h-4 w-4" />
                  <span>Remove from List</span>
                </button>
              ) : (
                <button
                  onClick={handleOpenAddToListModal}
                  className="btn-secondary text-xs sm:text-sm px-4 py-2.5 flex items-center justify-center gap-2"
                >
                  <ListBulletIcon className="h-4 w-4" />
                  <span>Add to List</span>
                </button>
              )}

              {imdbUrl && (
                <a
                  href={imdbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-black font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md hover:shadow-lg shrink-0"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  <span>View on IMDb</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Card */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-2">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">Overview</h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-normal">
          {mediaDetails.overview || 'No overview available.'}
        </p>
      </div>

      {/* Cast Section */}
      {cast.length > 0 && (
        <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">Cast</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
            {cast.map((member) => (
              <div key={member.id} className="text-center group">
                <img
                  src={getProfilePictureUrl(member.profile_path, 'w185') || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&size=185`}
                  alt={member.name}
                  className="w-full h-auto aspect-[2/3] object-cover rounded-2xl shadow-md mb-2 group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={member.name}>{member.name}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate" title={member.character}>{member.character}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends Who Watched */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-2">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">Friends Who Watched</h2>
        {loadingFriends ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading...</p>
        ) : friendsWhoWatched.length > 0 ? (
          <div className="flex flex-wrap gap-2.5 pt-1">
            {friendsWhoWatched.map(friend => (
              <div key={friend.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
                {friend.avatar_url ? (
                  <img src={friend.avatar_url} alt={friend.display_name} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-red-600/20 text-red-500 font-bold text-[10px] flex items-center justify-center">
                    {friend.display_name?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{friend.display_name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-sm">None of your friends have marked this as watched yet.</p>
        )}
      </div>

      {/* Trailer Section */}
      {trailer && (
        <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">Trailer</h2>
            <button
              onClick={() => setShowTrailer(!showTrailer)}
              className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
            >
              <EyeIcon className="h-4 w-4" />
              <span>{showTrailer ? 'Hide Trailer' : 'Show Trailer'}</span>
            </button>
          </div>
          {showTrailer && (
            <div className="mt-2 rounded-2xl overflow-hidden shadow-xl aspect-video w-full max-w-4xl mx-auto">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      )}

      {/* Photos Gallery Section */}
      {photos.length > 0 && (
        <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">Photos</h2>
          <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-200 dark:scrollbar-thumb-slate-600 dark:scrollbar-track-slate-800">
            {photos.map((img, index) => (
              <img
                key={index}
                src={img.url!}
                alt={`Scene ${index + 1}`}
                className="h-28 sm:h-36 md:h-44 w-auto rounded-2xl shadow-md object-cover flex-shrink-0 hover:scale-102 transition-transform"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      )}

      {/* AddToListModal Instance */}
      {selectedMediaForModal && (
        <AddToListModal
          isOpen={isAddToListModalOpen}
          onClose={handleCloseAddToListModal}
          mediaItem={selectedMediaForModal}
        />
      )}
    </div>
  );
}

export default MovieDetailsPage;