import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getMediaDetails, getMoviePosterUrl, getProfilePictureUrl, TmdbMediaDetails, TmdbMovieDetails, TmdbTvDetails, TmdbSearchResult, TmdbCastMember } from '../services/tmdbService';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types/profile';
import AddToListModal from '../components/movies/AddToListModal';
import { EyeIcon, EyeSlashIcon, ArrowTopRightOnSquareIcon, ListBulletIcon, CalendarDaysIcon, StarIcon, ClockIcon, TvIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import { useHeader } from '../context/HeaderContext'; // Import useHeader

// Helper type guards
function isMovieDetails(details: TmdbMediaDetails): details is TmdbMovieDetails {
  return details.media_type === 'movie';
}
function isTvDetails(details: TmdbMediaDetails): details is TmdbTvDetails {
  return details.media_type === 'tv';
}

function MovieDetailsPage() {
  const location = useLocation();
  const { user } = useAuth();
  const { setHeaderTitle } = useHeader(); // Get setter

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

  // Extract mediaType and id from path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const mediaType = pathSegments.length >= 2 ? pathSegments[pathSegments.length - 2] : null;
  const mediaIdParam = pathSegments.length >= 1 ? pathSegments[pathSegments.length - 1] : null;
  const mediaId = mediaIdParam ? parseInt(mediaIdParam, 10) : null;
  const fullMediaId = mediaType && mediaId ? `tmdb:${mediaType}:${mediaId}` : null;

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
        } catch (friendErr: any) { console.error("Error fetching friends watched status:", friendErr); setFriendsWhoWatched([]); }
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

    } catch (err: any) {
      console.error("Error fetching media details:", err);
      setError(err.message || 'Failed to load media details.');
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
    } catch (err: any) {
        console.error("Supabase Error (Toggle Watched):", err);
        // Revert UI state using functional update
        setIsWatched(prev => !prev); // Toggle back
        toast.error(err.message || 'Failed to update watched status.', { id: toastId });
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
      } catch (err: any) {
          console.error("Error removing item from list:", err);
          toast.error(err.message || 'Failed to remove item from list.', { id: toastId });
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
    <div className="p-4 dark:bg-gray-900 min-h-screen">
       {error && !loading && <p className="text-center p-2 text-red-600 bg-red-100 rounded mb-4">{error}</p>}

       {/* Top Section */}
       <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-6">
            <div className="md:w-1/4 flex-shrink-0 mx-auto md:mx-0">
                {posterUrl ? (
                    <img src={posterUrl} alt={`${title} poster`} className="w-48 md:w-full h-auto rounded-lg shadow-md" />
                ) : (
                    <div className="w-48 h-72 md:w-full md:h-auto md:aspect-[2/3] bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 rounded-lg shadow-md">No Poster</div>
                )}
            </div>
            <div className="md:w-3/4 flex flex-col">
                {/* Removed redundant h1 title */}
                {mediaDetails.tagline && <p className="text-md italic text-gray-600 dark:text-gray-400 mt-1">{mediaDetails.tagline}</p>}
                <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400 mt-2 mb-2">
                    <span className="flex items-center"><CalendarDaysIcon className="h-4 w-4 mr-1"/>{year}</span>
                    {mediaDetails.vote_average > 0 && <span className="flex items-center"><StarIcon className="h-4 w-4 mr-1 text-yellow-500"/>{mediaDetails.vote_average.toFixed(1)}</span>}
                    {runtime && <span className="flex items-center"><ClockIcon className="h-4 w-4 mr-1"/>{runtime}</span>}
                    {isTvDetails(mediaDetails) && mediaDetails.number_of_seasons && <span className="flex items-center"><TvIcon className="h-4 w-4 mr-1"/>{mediaDetails.number_of_seasons} Season{mediaDetails.number_of_seasons > 1 ? 's' : ''}</span>}
                </div>
                 {mediaDetails.genres && mediaDetails.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {mediaDetails.genres.map(genre => (
                            <span key={genre.id} className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-2 py-0.5 rounded-full">{genre.name}</span>
                        ))}
                    </div>
                 )}
                 {imdbUrl && (
                    <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-1.5 px-4 rounded-lg text-sm mt-1 w-fit">
                        <ArrowTopRightOnSquareIcon className="h-4 w-4"/> View on IMDb
                    </a>
                 )}
            </div>
       </div>

        {/* Overview */}
        <div className="mt-4">
            <h2 className="text-xl font-semibold mb-1 dark:text-white">Overview</h2>
            <p className="text-gray-700 dark:text-gray-300 text-sm">{mediaDetails.overview || 'No overview available.'}</p>
        </div>

        {/* Cast Section */}
        {cast.length > 0 && (
            <div className="mt-6">
                <h2 className="text-xl font-semibold mb-2 dark:text-white">Cast</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {cast.map((member) => (
                        <div key={member.id} className="text-center">
                            <img
                                src={getProfilePictureUrl(member.profile_path, 'w185') || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&size=185`}
                                alt={member.name}
                                className="w-full h-auto aspect-[2/3] object-cover rounded-md shadow mb-1"
                                loading="lazy"
                            />
                            <p className="text-sm font-medium dark:text-gray-200 truncate" title={member.name}>{member.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={member.character}>{member.character}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Actions */}
        <div className="mt-6 grid grid-cols-2 gap-3">
             <button onClick={handleToggleWatched} className={`py-2.5 px-4 rounded-lg shadow flex items-center justify-center text-sm font-medium ${isWatched ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                {isWatched ? <EyeIcon className="h-5 w-5 mr-2"/> : <EyeSlashIcon className="h-5 w-5 mr-2"/>}
                {isWatched ? 'Watched' : 'Mark Watched'}
            </button>
            {/* Contextual Add/Remove Button */}
            {!loadingEditableLists && containingEditableLists.length > 0 ? (
                 <button onClick={() => handleRemoveFromList(containingEditableLists[0])} className="py-2.5 px-4 rounded-lg shadow flex items-center justify-center text-sm font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200">
                    <ListBulletIcon className="h-5 w-5 mr-2"/> Remove from List
                 </button>
            ) : (
                 <button onClick={handleOpenAddToListModal} className="py-2.5 px-4 rounded-lg shadow flex items-center justify-center text-sm font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200">
                    <ListBulletIcon className="h-5 w-5 mr-2"/> Add to List
                 </button>
            )}
        </div>

         {/* Friends Who Watched */}
         <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2 dark:text-white">Friends Who Watched</h2>
            {loadingFriends ? ( <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p> )
             : friendsWhoWatched.length > 0 ? (
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 text-sm">
                    {friendsWhoWatched.map(friend => ( <li key={friend.id}>{friend.display_name}</li> ))}
                </ul>
            ) : ( <p className="text-gray-500 dark:text-gray-400 text-sm">None of your friends have marked this as watched yet.</p> )}
         </div>

         {/* Trailer Section */}
         {trailer && (
            <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-semibold dark:text-white">Trailer</h2>
                    <button onClick={() => setShowTrailer(!showTrailer)} className="flex items-center text-sm text-primary dark:text-primary hover:underline">
                         <EyeIcon className="h-4 w-4 mr-1"/> {showTrailer ? 'Hide' : 'Show'} Trailer
                    </button>
                </div>
                {showTrailer && (
                    <div className="mt-2">
                        <iframe src={`https://www.youtube.com/embed/${trailer.key}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-64 md:h-80 rounded"></iframe>
                    </div>
                )}
            </div>
         )}

         {/* Photos Section */}
         {photos.length > 0 && (
            <div className="mt-6">
                <h2 className="text-xl font-semibold mb-2 dark:text-white">Photos</h2>
                <div className="flex space-x-2 overflow-x-auto pb-2 -mb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
                    {photos.map((img, index) => (
                        <img
                            key={index}
                            src={img.url!}
                            alt={`Scene ${index + 1}`}
                            className="h-28 sm:h-32 md:h-40 w-auto rounded shadow-md object-cover flex-shrink-0"
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