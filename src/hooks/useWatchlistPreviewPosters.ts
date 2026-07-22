import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getMediaDetails, getMoviePosterUrl } from '../services/tmdbService';

export function useWatchlistPreviewPosters(watchlistId: string): string[] {
  const [posters, setPosters] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchPosters = async () => {
      if (!watchlistId) return;

      try {
        const { data: itemsData, error } = await supabase
          .from('watchlist_items')
          .select('media_id')
          .eq('watchlist_id', watchlistId)
          .order('item_order', { ascending: true, nullsFirst: false })
          .limit(4);

        if (error || !itemsData || itemsData.length === 0) return;

        const posterUrls = await Promise.all(
          itemsData.map(async (item) => {
            if (!item.media_id) return null;
            try {
              const details = await getMediaDetails(item.media_id);
              if (details?.poster_path) {
                return getMoviePosterUrl(details.poster_path, 'w185');
              }
            } catch {
              // Ignore individual TMDB fetch error
            }
            return null;
          })
        );

        if (isMounted) {
          const validPosters = posterUrls.filter((url): url is string => Boolean(url));
          setPosters(validPosters);
        }
      } catch (err) {
        console.error('Error loading watchlist poster previews:', err);
      }
    };

    fetchPosters();

    return () => {
      isMounted = false;
    };
  }, [watchlistId]);

  return posters;
}
