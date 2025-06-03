const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

if (!TMDB_API_KEY) {
  console.error("TMDB API Key is missing. Please add VITE_TMDB_API_KEY to your .env file.");
}

// --- Interfaces ---

interface TmdbMediaBase {
  id: number;
  poster_path: string | null;
  vote_average: number;
  overview: string;
  backdrop_path: string | null;
  genre_ids?: number[];
  popularity?: number; // Add popularity field
}

export interface TmdbMovieSearchResult extends TmdbMediaBase {
  media_type: 'movie';
  title: string;
  release_date: string;
}

export interface TmdbTvSearchResult extends TmdbMediaBase {
  media_type: 'tv';
  name: string;
  first_air_date: string;
}

export type TmdbSearchResult = TmdbMovieSearchResult | TmdbTvSearchResult;

// --- Cast/Crew Interfaces ---
export interface TmdbCastMember {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number; // Order in the credits
}

// Add Crew interface if needed later

export interface TmdbCredits {
    cast: TmdbCastMember[];
    // crew: TmdbCrewMember[]; // Add if needed
}

// --- External IDs Interface ---
export interface TmdbExternalIds {
    imdb_id?: string | null;
    tvdb_id?: number | null;
    // Add other IDs like facebook, instagram, twitter if needed
}


// --- Details Interfaces ---

export interface TmdbMovieDetails extends TmdbMovieSearchResult {
  runtime: number | null;
  genres: { id: number; name: string }[];
  tagline?: string | null;
  videos?: { results: { id: string; key: string; name: string; site: string; type: string }[] };
  images?: { backdrops: { file_path: string }[]; posters: { file_path: string }[] };
  imdb_id?: string | null; // Direct IMDb ID for movies
  credits?: TmdbCredits; // Add credits
  // external_ids might also be available but imdb_id is usually direct
}

export interface TmdbTvDetails extends TmdbTvSearchResult {
  episode_run_time?: number[];
  genres: { id: number; name: string }[];
  tagline?: string | null;
  number_of_seasons?: number;
  number_of_episodes?: number;
  videos?: { results: { id: string; key: string; name: string; site: string; type: string }[] };
  images?: { backdrops: { file_path: string }[]; posters: { file_path: string }[] };
  external_ids?: TmdbExternalIds; // Add external IDs for TV
  credits?: TmdbCredits; // Add credits
}

export type TmdbMediaDetails = TmdbMovieDetails | TmdbTvDetails;

// --- API Fetching ---

const fetchTmdb = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  if (!TMDB_API_KEY) throw new Error("TMDB API Key is not configured.");
  const urlParams = new URLSearchParams({ api_key: TMDB_API_KEY, ...params });
  const url = `${TMDB_BASE_URL}/${endpoint}?${urlParams.toString()}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`TMDB API Error (${response.status}): ${errorData?.status_message || 'Unknown error'}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching from TMDB:", error);
    throw error;
  }
};

export const searchMulti = async (query: string, page: number = 1): Promise<{ results: TmdbSearchResult[], total_pages: number, total_results: number }> => {
  if (!query.trim()) return { results: [], total_pages: 0, total_results: 0 };
  const data = await fetchTmdb<{ results: (TmdbMovieSearchResult | TmdbTvSearchResult | { media_type: 'person' })[], total_pages: number, total_results: number }>('search/multi', { query, page: String(page) });
  const filteredResults = data.results
    .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
    .map(item => ({ ...item, media_type: item.media_type as 'movie' | 'tv' }));
  return { ...data, results: filteredResults as TmdbSearchResult[] };
};

export const getMovieDetails = async (movieId: number): Promise<TmdbMovieDetails> => {
  // Append credits
  const details = await fetchTmdb<TmdbMovieDetails>(`movie/${movieId}`, { append_to_response: 'videos,images,credits' });
  return { ...details, media_type: 'movie' };
};

export const getTvDetails = async (tvId: number): Promise<TmdbTvDetails> => {
  // Append credits and external_ids
  const details = await fetchTmdb<TmdbTvDetails>(`tv/${tvId}`, { append_to_response: 'videos,images,credits,external_ids' });
  return { ...details, media_type: 'tv' };
};

export const getMediaDetails = async (mediaId: string): Promise<TmdbMediaDetails | null> => {
    const parts = mediaId.split(':');
    let mediaType: string | null = null;
    let id: number | null = null;

    if (parts.length === 3 && parts[0] === 'tmdb') {
        mediaType = parts[1];
        id = parseInt(parts[2], 10);
    } else if (parts.length === 2 && parts[0] === 'tmdb') {
        console.warn(`Handling legacy media ID format for ${mediaId}. Assuming type 'movie'.`);
        mediaType = 'movie';
        id = parseInt(parts[1], 10);
    } else {
        console.error("Invalid media ID format:", mediaId);
        return null;
    }

    if (isNaN(id) || id === null) {
        console.error("Invalid numeric ID in media ID:", mediaId);
        return null;
    }

    try {
        if (mediaType === 'movie') {
            return await getMovieDetails(id);
        } else if (mediaType === 'tv') {
            return await getTvDetails(id);
        } else {
            console.error("Unsupported media type:", mediaType);
            return null;
        }
    } catch (error) {
        console.error(`Failed to fetch details for ${mediaId}:`, error);
        return null;
    }
};

export const getMoviePosterUrl = (path: string | null | undefined, size: string = "w342"): string | null => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}${size}${path}`;
};

// Helper to get profile picture URL
export const getProfilePictureUrl = (path: string | null | undefined, size: string = "w185"): string | null => {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE_URL}${size}${path}`;
};

// Add movie keyword retrieval functionality
export const getMovieKeywords = async (movieId: number): Promise<{keywords: {id: number, name: string}[]}> => {
  return fetchTmdb<{keywords: {id: number, name: string}[]}>(`movie/${movieId}/keywords`);
};

// Add TV keywords functionality
export const getTvKeywords = async (tvId: number): Promise<{results: {id: number, name: string}[]}> => {
  return fetchTmdb<{results: {id: number, name: string}[]}>(`tv/${tvId}/keywords`);
};

// Add movie recommendations functionality
export const getMovieRecommendations = async (movieId: number): Promise<{results: TmdbMovieSearchResult[]}> => {
  const data = await fetchTmdb<{results: TmdbMovieSearchResult[]}>(`movie/${movieId}/recommendations`);
  // Ensure all results have media_type set to 'movie'
  return {
    results: data.results.map(movie => ({
      ...movie,
      media_type: 'movie' as const
    }))
  };
};

// Add TV recommendations functionality
export const getTvRecommendations = async (tvId: number): Promise<{results: TmdbTvSearchResult[]}> => {
  const data = await fetchTmdb<{results: TmdbTvSearchResult[]}>(`tv/${tvId}/recommendations`);
  // Ensure all results have media_type set to 'tv'
  return {
    results: data.results.map(tv => ({
      ...tv,
      media_type: 'tv' as const
    }))
  };
};