import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth'; // Updated import path
import { Watchlist, WatchlistMember, WatchlistRole } from '../types/watchlist';
import { Profile } from '../types/profile';

function ManageCollaboratorsPage() {
  const { id: watchlistId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [members, setMembers] = useState<WatchlistMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [friendSearchTerm, setFriendSearchTerm] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]); // Store all friends
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchCollaboratorData = useCallback(async () => {
    if (!watchlistId || !user) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch watchlist to verify ownership (select all fields now)
      const { data: watchlistData, error: watchlistError } = await supabase
        .from('watchlists')
        .select('*') // Select all fields to match Watchlist type
        .eq('id', watchlistId)
        .single();

      if (watchlistError) throw watchlistError;
      if (!watchlistData || watchlistData.owner_id !== user.id) {
        throw new Error("Watchlist not found or you are not the owner.");
      }
      // No need to process owner here, just set the data
      setWatchlist(watchlistData);

      // 2. Fetch current members, including watchlist_id, and their profiles
      const { data: membersData, error: membersError } = await supabase
        .from('watchlist_members')
        .select(`
          watchlist_id,
          user_id,
          role,
          added_at,
          profile:profiles!inner ( id, display_name, avatar_url )
        `)
        .eq('watchlist_id', watchlistId);

      if (membersError) throw membersError;

      // Process profile data (handle potential array from join)
      const processedMembers = membersData?.map(m => ({
          ...m,
          profile: Array.isArray(m.profile) ? m.profile[0] : m.profile
      })) || [];

      setMembers(processedMembers);

      // 3. Fetch owner's friends (similar to FriendsPage, but just profiles)
      const { data: friendships1, error: error1 } = await supabase
        .from('friendships')
        .select('user_id_2')
        .eq('user_id_1', user.id);
      if (error1) throw error1;
      const { data: friendships2, error: error2 } = await supabase
        .from('friendships')
        .select('user_id_1')
        .eq('user_id_2', user.id);
      if (error2) throw error2;
      const friendIds = [
        ...(friendships1?.map(f => f.user_id_2) || []),
        ...(friendships2?.map(f => f.user_id_1) || [])
      ];
      if (friendIds.length > 0) {
        const { data: friendProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', friendIds);
        if (profileError) throw profileError;
        setFriends(friendProfiles || []);
      } else {
        setFriends([]);
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load collaborator data.');
    } finally {
      setLoading(false);
    }
  }, [watchlistId, user]);

  useEffect(() => {
    fetchCollaboratorData();
  }, [fetchCollaboratorData]);

  // Filter friends based on search term
  useEffect(() => {
    if (!friendSearchTerm.trim()) {
      setFriendSearchResults([]);
      setSearchError(null);
      return;
    }
    const currentMemberIds = new Set(members.map(m => m.user_id));
    const results = friends.filter(friend =>
        !currentMemberIds.has(friend.id) && // Exclude current members
        friend.display_name.toLowerCase().includes(friendSearchTerm.toLowerCase())
    );
    setFriendSearchResults(results);
    setSearchError(results.length === 0 ? 'No matching friends found or they are already members.' : null);

  }, [friendSearchTerm, friends, members]);

  // --- Action Handlers ---
  const handleRoleChange = async (userId: string, newRole: WatchlistRole) => {
    if (!watchlistId) return;
    setActionLoading(prev => ({ ...prev, [`role-${userId}`]: true }));
    setError(null);
    try {
        const { error: rpcError } = await supabase.rpc('update_watchlist_collaborator_role', {
            p_watchlist_id: watchlistId,
            p_user_id: userId,
            p_new_role: newRole
        });
        if (rpcError) throw rpcError;
        // Refresh data on success
        await fetchCollaboratorData();
    } catch (err: unknown) {
        console.error("Error changing role:", err);
        setError(err instanceof Error ? err.message : 'Failed to change role.');
        // Optionally revert UI optimistically if needed
    } finally {
        setActionLoading(prev => ({ ...prev, [`role-${userId}`]: false }));
    }
  };

  const handleRemoveMember = async (userId: string) => {
     if (!watchlistId) return;
     // Optional: Confirmation dialog
     // if (!window.confirm("Are you sure you want to remove this collaborator?")) return;

     setActionLoading(prev => ({ ...prev, [`remove-${userId}`]: true }));
     setError(null);
     try {
        const { error: rpcError } = await supabase.rpc('remove_watchlist_collaborator', {
            p_watchlist_id: watchlistId,
            p_user_id: userId
        });
        if (rpcError) throw rpcError;
        // Refresh data on success
        await fetchCollaboratorData();
     } catch (err: unknown) {
        console.error("Error removing member:", err);
        setError(err instanceof Error ? err.message : 'Failed to remove member.');
     } finally {
        setActionLoading(prev => ({ ...prev, [`remove-${userId}`]: false }));
     }
  };

  // Note: Friend search functionality would require additional search API
  const handleAddCollaborator = async (friendId: string) => {
     if (!watchlistId) return;
     setActionLoading(prev => ({ ...prev, [`add-${friendId}`]: true }));
     setError(null);
     try {
        const { error: rpcError } = await supabase.rpc('add_watchlist_collaborator', {
            p_watchlist_id: watchlistId,
            p_user_id: friendId
        });
        if (rpcError) throw rpcError;
        // Refresh data on success
        await fetchCollaboratorData();
        // Note: Would clear friend search results when implemented
     } catch (err: unknown) {
        console.error("Error adding collaborator:", err);
        setError(err instanceof Error ? err.message : 'Failed to add collaborator.');
        // Clear search term on error too? Maybe not.
     } finally {
        setActionLoading(prev => ({ ...prev, [`add-${friendId}`]: false }));
        setFriendSearchTerm(''); // Clear search term after attempting add
     }
  };

  if (loading) return <div className="text-center p-4">Loading collaborators...</div>;
  if (error) return <div className="text-center p-4 text-red-600">Error: {error}</div>;
  if (!watchlist) return <div className="text-center p-4">Watchlist not found or access denied.</div>;

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">Manage Collaborators for "{watchlist.title}"</h2>

      {/* Note: Friend Search Section would be added here when implemented */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Add Editor</h3>
        <input
          type="text"
          placeholder="Search your friends to add as editor..."
          value={friendSearchTerm}
          onChange={(e) => setFriendSearchTerm(e.target.value)}
          className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary"
        />
        {searchError && <p className="text-sm text-red-500 dark:text-red-400 mb-2">{searchError}</p>}
        <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
            {friendSearchResults.map(friend => (
                 <div key={friend.id} className="flex items-center justify-between p-1">
                    <span className="text-sm">{friend.display_name}</span>
                    <button
                        onClick={() => handleAddCollaborator(friend.id)}
                        disabled={actionLoading[`add-${friend.id}`]}
                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded disabled:opacity-50"
                    >
                         {actionLoading[`add-${friend.id}`] ? '...' : 'Add'}
                    </button>
                 </div>
            ))}
        </div>
      </div>


      {/* Current Collaborators List */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Current Collaborators</h3>
        <ul className="space-y-2">
          {members.map(member => (
            <li key={member.user_id} className="flex items-center justify-between p-2 border-b dark:border-gray-700">
              <div>
                <Link to={`/user/${member.user_id}`} className="font-medium hover:underline">{member.profile?.display_name || 'Unknown User'}</Link>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({member.role})</span>
              </div>
              {member.role !== 'owner' && ( // Can't change/remove owner
                <div className="space-x-2">
                  {/* Role Change Dropdown/Buttons */}
                  <select
                    value={member.role}
                    disabled={actionLoading[`role-${member.user_id}`] || actionLoading[`remove-${member.user_id}`]}
                    onChange={(e) => handleRoleChange(member.user_id, e.target.value as WatchlistRole)}
                    className="text-xs p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={actionLoading[`role-${member.user_id}`] || actionLoading[`remove-${member.user_id}`]}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded"
                  >
                    {actionLoading[`remove-${member.user_id}`] ? '...' : 'Remove'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ManageCollaboratorsPage;