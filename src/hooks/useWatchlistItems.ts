import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { WatchlistItem } from '../types/watchlist';
import { TmdbMediaDetails, getMediaDetails } from '../services/tmdbService';

export type WatchlistItemWithDetails = WatchlistItem & { tmdbDetails?: TmdbMediaDetails };

interface UseWatchlistItemsReturn {
    items: WatchlistItemWithDetails[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useWatchlistItems(watchlistId: string | undefined): UseWatchlistItemsReturn {
    const [items, setItems] = useState<WatchlistItemWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = useCallback(async () => {
        if (!watchlistId) {
            setLoading(false); // Not loading if no ID
            setItems([]); // Clear items if no ID
            return;
        }

        setLoading(true);
        setError(null);
        setItems([]); // Reset state

        try {
            // Fetch Watchlist Items
            const { data: itemsData, error: itemsError } = await supabase
                .from('watchlist_items')
                .select('*')
                .eq('watchlist_id', watchlistId)
                .order('item_order', { ascending: true, nullsFirst: false })
                .order('added_at', { ascending: true });

            if (itemsError) throw itemsError;

            // Fetch TMDB details for each item
            // Consider adding error handling per item or batching if many items
            const itemsWithDetails = await Promise.all(
                (itemsData || []).map(async (item) => {
                    let tmdbDetails: TmdbMediaDetails | undefined | null = undefined;
                    try {
                        // Only fetch if media_id is present
                        if (item.media_id) {
                            tmdbDetails = await getMediaDetails(item.media_id);
                        } else {
                            console.warn(`Item ${item.id} is missing media_id.`);
                        }
                    } catch (tmdbError) {
                        console.error(`Failed fetch TMDB for ${item.media_id}:`, tmdbError);
                        // Keep the item in the list but without details
                    }
                    return { ...item, tmdbDetails: tmdbDetails || undefined };
                })
            );
            setItems(itemsWithDetails);

        } catch (err: unknown) {
            console.error("Error fetching watchlist items:", err);
            setError(err instanceof Error ? err.message : 'Failed to load watchlist items.');
            setItems([]); // Clear items on error
        } finally {
            setLoading(false);
        }
    }, [watchlistId]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    return { items, loading, error, refetch: fetchItems };
}