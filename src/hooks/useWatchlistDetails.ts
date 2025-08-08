import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth'; // Corrected import path
import { Watchlist, WatchlistRole } from '../types/watchlist';
import { Profile } from '../types/profile';
import { logger } from '../utils/logger';

interface UseWatchlistDetailsReturn {
    watchlist: (Watchlist & { owner?: Profile }) | null;
    userRole: WatchlistRole | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useWatchlistDetails(watchlistId: string | undefined): UseWatchlistDetailsReturn {
    const { user } = useAuth();
    const [watchlist, setWatchlist] = useState<(Watchlist & { owner?: Profile }) | null>(null);
    const [userRole, setUserRole] = useState<WatchlistRole | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDetails = useCallback(async () => {
        if (!watchlistId || !user) {
            // Don't set loading to true here if we are just waiting for IDs
            if (!watchlistId) setError("Watchlist ID is missing.");
            if (!user) setError("User not authenticated."); // Or handle appropriately
            setLoading(false); // Ensure loading is false if prerequisites aren't met
            return;
        }

        setLoading(true);
        setError(null);
        setWatchlist(null); // Reset state before fetching
        setUserRole(null);

        try {
            // Fetch Watchlist, Owner, User Role in parallel
            const [watchlistResult, memberResult] = await Promise.all([
                supabase
                    .from('watchlists')
                    .select('*, owner:profiles!watchlists_owner_id_fkey(id, display_name, avatar_url)')
                    .eq('id', watchlistId)
                    .maybeSingle(),
                supabase
                    .from('watchlist_members')
                    .select('role')
                    .eq('watchlist_id', watchlistId)
                    .eq('user_id', user.id)
                    .maybeSingle()
            ]);

            const { data: watchlistData, error: watchlistError } = watchlistResult;
            if (watchlistError) throw watchlistError;
            if (!watchlistData) throw new Error("Watchlist not found.");

            const { data: memberData, error: memberError } = memberResult;
            if (memberError) throw memberError;

            const currentUserRole = (memberData?.role as WatchlistRole) || null;

            // Check privacy after fetching role
            if (!watchlistData.is_public && !currentUserRole && watchlistData.owner_id !== user.id) {
                 throw new Error("Access denied. This watchlist is private.");
            }

            // Process owner data (can be object or array depending on relationship settings)
            const ownerProfile = Array.isArray(watchlistData.owner)
                ? watchlistData.owner[0]
                : watchlistData.owner;

            setWatchlist({ ...watchlistData, owner: ownerProfile || undefined });
            setUserRole(currentUserRole);

        } catch (err: unknown) {
            logger.error("Error fetching watchlist details:", err);
            setError(err instanceof Error ? err.message : 'Failed to load watchlist details.');
            setWatchlist(null); // Clear data on error
            setUserRole(null);
        } finally {
            setLoading(false);
        }
    }, [watchlistId, user]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    return { watchlist, userRole, loading, error, refetch: fetchDetails };
}