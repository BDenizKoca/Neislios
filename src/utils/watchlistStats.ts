import { WatchlistItemWithDetails } from '../hooks/useWatchlistItems';
import { isMovieDetails } from '../utils/tmdbUtils';

export interface WatchlistStats {
  total: number;
  watched: number;
  percentage: number;
  totalRuntimeMinutes: number;
  formattedRuntime: string;
  movieCount: number;
  tvCount: number;
}

export function computeWatchlistStats(
  items: WatchlistItemWithDetails[],
  watchedMediaIds?: Set<string>
): WatchlistStats {
  const total = items.length;
  if (total === 0) {
    return {
      total: 0,
      watched: 0,
      percentage: 0,
      totalRuntimeMinutes: 0,
      formattedRuntime: '0 min',
      movieCount: 0,
      tvCount: 0,
    };
  }

  let watched = 0;
  let totalRuntimeMinutes = 0;
  let movieCount = 0;
  let tvCount = 0;

  for (const item of items) {
    const isWatched = watchedMediaIds?.has(item.media_id) ?? false;
    if (isWatched) {
      watched++;
    }

    if (item.tmdbDetails) {
      if (isMovieDetails(item.tmdbDetails)) {
        movieCount++;
        if (item.tmdbDetails.runtime) {
          totalRuntimeMinutes += item.tmdbDetails.runtime;
        }
      } else {
        tvCount++;
      }
    }
  }

  const percentage = Math.round((watched / total) * 100);

  // Format runtime to "Xh Ym" or "Xm"
  const hours = Math.floor(totalRuntimeMinutes / 60);
  const minutes = totalRuntimeMinutes % 60;
  let formattedRuntime = '';
  if (hours > 0) {
    formattedRuntime = `${hours}h ${minutes}m`;
  } else {
    formattedRuntime = `${minutes}m`;
  }

  return {
    total,
    watched,
    percentage,
    totalRuntimeMinutes,
    formattedRuntime,
    movieCount,
    tvCount,
  };
}
