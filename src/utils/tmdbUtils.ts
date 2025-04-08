import { TmdbMediaDetails, TmdbMovieDetails, TmdbTvDetails } from '../services/tmdbService';

// Helper type guards
export function isMovieDetails(details: TmdbMediaDetails): details is TmdbMovieDetails {
  return details.media_type === 'movie';
}

export function isTvDetails(details: TmdbMediaDetails): details is TmdbTvDetails {
  return details.media_type === 'tv';
}