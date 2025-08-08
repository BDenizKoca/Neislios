import { TmdbMediaDetails, TmdbMovieDetails, TmdbTvDetails } from '../services/tmdbService';

// Helper type guards
export function isMovieDetails(details: TmdbMediaDetails): details is TmdbMovieDetails {
  return details.media_type === 'movie';
}

export function isTvDetails(details: TmdbMediaDetails): details is TmdbTvDetails {
  return details.media_type === 'tv';
}

// Enhanced utility functions
export function getMediaTitle(details: TmdbMediaDetails): string {
  return isMovieDetails(details) ? details.title : details.name;
}

export function getMediaYear(details: TmdbMediaDetails): string {
  const date = isMovieDetails(details) ? details.release_date : details.first_air_date;
  return date?.substring(0, 4) || '';
}

export function getMediaDisplayInfo(details: TmdbMediaDetails): { title: string; year: string; type: string } {
  return {
    title: getMediaTitle(details),
    year: getMediaYear(details),
    type: details.media_type
  };
}

export function createMediaKey(mediaType: 'movie' | 'tv', id: number): string {
  return `${mediaType}:${id}`;
}

export function parseMediaKey(mediaKey: string): { mediaType: 'movie' | 'tv'; id: number } | null {
  const parts = mediaKey.split(':');
  if (parts.length !== 2) return null;
  
  const [mediaType, idStr] = parts;
  const id = parseInt(idStr, 10);
  
  if ((mediaType !== 'movie' && mediaType !== 'tv') || isNaN(id)) {
    return null;
  }
  
  return { mediaType: mediaType as 'movie' | 'tv', id };
}