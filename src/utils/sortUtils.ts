import { WatchlistItemWithDetails } from '../hooks/useWatchlistItems';
import { isMovieDetails } from './tmdbUtils';

export type SortOption =
  | 'item_order'
  | 'title_asc'
  | 'title_desc'
  | 'rating_asc'
  | 'rating_desc'
  | 'added_at_desc'
  | 'added_at_asc';

export function sortWatchlistItems(
  items: WatchlistItemWithDetails[],
  sortBy: SortOption | string,
  hideWatched: boolean,
  watchedMediaSet: Set<string>
): WatchlistItemWithDetails[] {
  let processed = [...items];

  if (hideWatched) {
    processed = processed.filter(
      item => item.media_id && !watchedMediaSet.has(item.media_id)
    );
  }

  processed.sort((a, b) => {
    const aDetails = a.tmdbDetails;
    const bDetails = b.tmdbDetails;

    switch (sortBy) {
      case 'title_asc': {
        const aTitle = aDetails ? (isMovieDetails(aDetails) ? aDetails.title : aDetails.name) : '';
        const bTitle = bDetails ? (isMovieDetails(bDetails) ? bDetails.title : bDetails.name) : '';
        return aTitle.localeCompare(bTitle);
      }
      case 'title_desc': {
        const aTitle = aDetails ? (isMovieDetails(aDetails) ? aDetails.title : aDetails.name) : '';
        const bTitle = bDetails ? (isMovieDetails(bDetails) ? bDetails.title : bDetails.name) : '';
        return bTitle.localeCompare(aTitle);
      }
      case 'rating_asc': {
        const aRating = aDetails?.vote_average || 0;
        const bRating = bDetails?.vote_average || 0;
        return aRating - bRating;
      }
      case 'rating_desc': {
        const aRating = aDetails?.vote_average || 0;
        const bRating = bDetails?.vote_average || 0;
        return bRating - aRating;
      }
      case 'added_at_desc':
        return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
      case 'added_at_asc':
        return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
      case 'item_order':
      default: {
        const orderA = a.item_order ?? Infinity;
        const orderB = b.item_order ?? Infinity;
        return orderA - orderB;
      }
    }
  });

  return processed;
}
