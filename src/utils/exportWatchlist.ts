import { Watchlist } from '../types/watchlist';
import { WatchlistItemWithDetails } from '../hooks/useWatchlistItems';
import { isMovieDetails } from '../utils/tmdbUtils';

/**
 * Exports a watchlist to CSV format and triggers a browser download
 */
export function exportToCsv(watchlist: Watchlist, items: WatchlistItemWithDetails[]): void {
  const headers = ['Title', 'Type', 'Year', 'Rating (TMDB)', 'TMDB Link'];
  const rows = items.map((item) => {
    const details = item.tmdbDetails;
    if (!details) {
      return [item.media_id, 'Unknown', '', '', ''];
    }

    const title = isMovieDetails(details) ? details.title : details.name;
    const type = isMovieDetails(details) ? 'Movie' : 'TV Series';
    const year = isMovieDetails(details)
      ? details.release_date?.substring(0, 4) || ''
      : details.first_air_date?.substring(0, 4) || '';
    const rating = details.vote_average ? details.vote_average.toFixed(1) : '';
    const link = `https://www.themoviedb.org/${type === 'Movie' ? 'movie' : 'tv'}/${details.id}`;

    // Escape quotes for CSV format
    const safeTitle = `"${title.replace(/"/g, '""')}"`;
    return [safeTitle, type, year, rating, link];
  });

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  downloadFile(csvContent, `${sanitizeFilename(watchlist.title)}_watchlist.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Exports a watchlist to formatted JSON and triggers a browser download
 */
export function exportToJson(watchlist: Watchlist, items: WatchlistItemWithDetails[]): void {
  const exportData = {
    watchlist: {
      id: watchlist.id,
      title: watchlist.title,
      description: watchlist.description || null,
      created_at: watchlist.created_at,
    },
    items: items.map((item) => {
      const details = item.tmdbDetails;
      return {
        media_id: item.media_id,
        title: details ? (isMovieDetails(details) ? details.title : details.name) : null,
        media_type: details ? (isMovieDetails(details) ? 'movie' : 'tv') : null,
        vote_average: details?.vote_average || null,
        release_year: details
          ? isMovieDetails(details)
            ? details.release_date?.substring(0, 4)
            : details.first_air_date?.substring(0, 4)
          : null,
      };
    }),
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  downloadFile(jsonContent, `${sanitizeFilename(watchlist.title)}_watchlist.json`, 'application/json;charset=utf-8;');
}

/**
 * Formats a watchlist as plain text for quick copying to messaging apps / notes
 */
export function formatAsPlainText(watchlist: Watchlist, items: WatchlistItemWithDetails[]): string {
  let text = `🎬 ${watchlist.title}\n`;
  if (watchlist.description) {
    text += `${watchlist.description}\n`;
  }
  text += `Total items: ${items.length}\n\n`;

  items.forEach((item, index) => {
    const details = item.tmdbDetails;
    if (details) {
      const title = isMovieDetails(details) ? details.title : details.name;
      const year = isMovieDetails(details)
        ? details.release_date?.substring(0, 4)
        : details.first_air_date?.substring(0, 4);
      const rating = details.vote_average ? `${details.vote_average.toFixed(1)}★` : '';
      const yearStr = year ? `(${year})` : '';
      text += `${index + 1}. ${title} ${yearStr} ${rating}\n`;
    } else {
      text += `${index + 1}. ${item.media_id}\n`;
    }
  });

  return text.trim();
}

/**
 * Helper to download text file
 */
function downloadFile(content: string, filename: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
}
