import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types/profile';

interface UseWatchlistMembersReturn {
    members: Profile[];
    membersWatchedMediaMap: Map<string, Set<string>>; // Key: media_id, Value: Set of user_ids who watched
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useWatchlistMembers(watchlistId: string | undefined): UseWatchlistMembersReturn {
    const [members, setMembers] = useState<Profile[]>([]);
    const [membersWatchedMediaMap, setMembersWatchedMediaMap] = useState<Map<string, Set<string>>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMembers = useCallback(async () => {
        if (!watchlistId) {
            setLoading(false);
            setMembers([]);
            setMembersWatchedMediaMap(new Map());
            return;
        }

        setLoading(true);
        setError(null);
        setMembers([]);
        setMembersWatchedMediaMap(new Map());

        try {
            // Fetch All Members
            const { data: allMembersData, error: allMembersError } = await supabase
                .from('watchlist_members')
                .select(`user_id, role, profile:profiles!inner(id, display_name, avatar_url)`)
                .eq('watchlist_id', watchlistId);

            if (allMembersError) throw allMembersError;

            const fetchedMemberProfiles: Profile[] = [];
            const fetchedMemberIds: string[] = [];
            (allMembersData || []).forEach(m => {
                // Handle potential array/object difference for profile relation
                const profileData = Array.isArray(m.profile) ? m.profile[0] : m.profile;
                if (profileData?.id && profileData.display_name) {
                    fetchedMemberProfiles.push(profileData);
                    if (m.user_id) fetchedMemberIds.push(m.user_id);
                } else {
                    console.warn("Invalid profile data for member:", m);
                }
            });
            setMembers(fetchedMemberProfiles);

            // Fetch Watched Status for these members
            if (fetchedMemberIds.length > 0) {
                const { data: fetchedMembersWatchedData, error: mwError } = await supabase
                    .from('user_watched_items')
                    .select('user_id, media_id')
                    .in('user_id', fetchedMemberIds); // Fetch only for members of this list

                if (mwError) {
                    console.error("Error fetching members' watched media:", mwError);
                    // Decide if this is a critical error or just affects the watchedBy display
                    setError("Failed to load watched status for members.");
                    setMembersWatchedMediaMap(new Map()); // Ensure map is empty on error
                } else {
                    const mwMap = new Map<string, Set<string>>();
                    (fetchedMembersWatchedData || []).forEach(watched => {
                        if (!mwMap.has(watched.media_id)) {
                            mwMap.set(watched.media_id, new Set());
                        }
                        // Ensure user_id is not null before adding
                        if (watched.user_id) {
                             mwMap.get(watched.media_id)?.add(watched.user_id);
                        }
                    });
                    setMembersWatchedMediaMap(mwMap);
                }
            } else {
                // No members, so map should be empty
                setMembersWatchedMediaMap(new Map());
            }

        } catch (err: unknown) {
            console.error("Error fetching watchlist members:", err);
            setError(err instanceof Error ? err.message : 'Failed to load watchlist members.');
            setMembers([]); // Clear data on error
            setMembersWatchedMediaMap(new Map());
        } finally {
            setLoading(false);
        }
    }, [watchlistId]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    return { members, membersWatchedMediaMap, loading, error, refetch: fetchMembers };
}