import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useHeader } from '../hooks/useHeader';
import { Profile } from '../types/profile';
import { mapRawProfile } from '../utils/dataMappers';

interface FriendRequest {
  id: string;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

interface Friendship {
  friend: Profile;
  created_at: string;
}

function FriendsPage() {
  const { user } = useAuth();
  const { setHeaderTitle } = useHeader();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data: friendships1, error: error1 } = await supabase
        .from('friendships').select('user_id_2').eq('user_id_1', user.id);
      if (error1) throw error1;
      const { data: friendships2, error: error2 } = await supabase
        .from('friendships').select('user_id_1').eq('user_id_2', user.id);
      if (error2) throw error2;
      const friendIds = [...(friendships1?.map(f => f.user_id_2) || []), ...(friendships2?.map(f => f.user_id_1) || [])];

      if (friendIds.length > 0) {
        const { data: friendProfiles, error: profileError } = await supabase
          .from('profiles').select('id, display_name, avatar_url').in('id', friendIds);
        if (profileError) throw profileError;
        setFriends(friendProfiles?.map(p => ({ friend: p, created_at: '' })) || []);
      } else { setFriends([]); }

      const { data: incoming, error: incomingError } = await supabase
        .from('friend_requests').select(`id, created_at, sender:sender_id ( id, display_name, avatar_url )`)
        .eq('receiver_id', user.id).eq('status', 'pending');
      if (incomingError) throw incomingError;
      const mappedIncoming = incoming?.map(req => ({ ...req, sender: mapRawProfile(req.sender) })) || [];
      setIncomingRequests(mappedIncoming);

      const { data: outgoing, error: outgoingError } = await supabase
        .from('friend_requests').select(`id, created_at, receiver:receiver_id ( id, display_name, avatar_url )`)
        .eq('sender_id', user.id).eq('status', 'pending');
      if (outgoingError) throw outgoingError;
      const mappedOutgoing = outgoing?.map(req => ({ ...req, receiver: mapRawProfile(req.receiver) })) || [];
      setOutgoingRequests(mappedOutgoing);    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load friends data.');
      setFriends([]); setIncomingRequests([]); setOutgoingRequests([]);
    } finally {
      setLoading(false);
    }
  }, [user]); // Dependency on user

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set Header Title
  useEffect(() => {
    setHeaderTitle('Friends');
  }, [setHeaderTitle]);

  // Realtime subscription setup for friends and requests (Consolidated into 1 channel)
  useEffect(() => {
    if (!user) return;

    const handleDbChange = () => {
      fetchData();
    };

    const friendsChannel = supabase.channel(`friends-updates:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${user.id}` }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${user.id}` }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `user_id_1=eq.${user.id}` }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `user_id_2=eq.${user.id}` }, handleDbChange)
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') console.error(`Friends Subscription error: ${err?.message}`);
      });

    return () => {
      supabase.removeChannel(friendsChannel);
    };
  }, [user, fetchData]);

  // --- Action Handlers ---
  const handleAction = async (actionType: 'accept' | 'decline' | 'cancel' | 'remove', id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    // setError(null); // Remove error state reset
    const toastId = toast.loading(`${actionType.charAt(0).toUpperCase() + actionType.slice(1)}ing...`); // Generic loading message
    try {
      let rpcName: string; let params: unknown; let successMsg: string; // Use unknown for params

      switch (actionType) {
        case 'accept': rpcName = 'handle_friend_request'; params = { request_id: id, action: 'accept' }; successMsg = 'Friend request accepted!'; break;
        case 'decline': rpcName = 'handle_friend_request'; params = { request_id: id, action: 'decline' }; successMsg = 'Friend request declined.'; break;
        case 'cancel': rpcName = 'cancel_friend_request'; params = { request_id: id }; successMsg = 'Friend request cancelled.'; break;
        case 'remove': rpcName = 'remove_friend'; params = { friend_profile_id: id }; successMsg = 'Friend removed.'; break;
        default: throw new Error('Invalid action type');
      }

      const { error: rpcError } = await supabase.rpc(rpcName, params);
      if (rpcError) throw rpcError;

      toast.success(successMsg, { id: toastId });
      // Realtime should trigger fetchData, no manual call needed here

    } catch (err: unknown) { // Use unknown
      console.error(`Error performing action ${actionType} for ID ${id}:`, err);
      toast.error(err instanceof Error ? err.message : `Failed to ${actionType}.`, { id: toastId }); // Check error type
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleAccept = (requestId: string) => handleAction('accept', requestId);
  const handleDecline = (requestId: string) => handleAction('decline', requestId);
  const handleCancel = (requestId: string) => handleAction('cancel', requestId);
  const handleRemove = (friendId: string) => handleAction('remove', friendId);

  // --- Search Functionality ---
  const handleSearch = useCallback(async (term: string) => {
    if (!user || term.trim().length < 3) { // Minimum search term length
      setSearchResults([]);
      setSearchError(term.trim().length > 0 ? 'Search term must be at least 3 characters.' : null);
      return;
    }
    setSearchLoading(true); setSearchError(null); setSearchResults([]);

    try {
      const friendIds = friends.map(f => f.friend.id);
      const incomingRequestSenderIds = incomingRequests.map(r => r.sender?.id).filter(Boolean);
      const outgoingRequestReceiverIds = outgoingRequests.map(r => r.receiver?.id).filter(Boolean);
      const excludeIds = [...new Set([user.id, ...friendIds, ...incomingRequestSenderIds, ...outgoingRequestReceiverIds])];

      const { data, error } = await supabase
        .from('profiles').select('id, display_name, avatar_url')
        .ilike('display_name', `%${term}%`)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(10);
      if (error) throw error;

      setSearchResults(data || []);
      if (!data || data.length === 0) setSearchError('No matching users found.');

    } catch (err: unknown) { // Use unknown
      console.error("Error searching users:", err);
      setSearchError(err instanceof Error ? err.message : 'Failed to search users.'); // Check error type
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [user, friends, incomingRequests, outgoingRequests]); // Add dependencies for useCallback

  useEffect(() => {
    // Clear previous timeout if searchTerm changes
    const handler = setTimeout(() => {
      // Only trigger search if term is valid (not empty and long enough)
      if (searchTerm.trim().length >= 3) {
        handleSearch(searchTerm);
      } else if (searchTerm.trim().length > 0) {
        // If term is too short but not empty, clear results and show error
        setSearchResults([]);
        setSearchError('Search term must be at least 3 characters.');
      } else {
        // If term is empty, clear results and error
        setSearchResults([]);
        setSearchError(null);
      }
    }, 500); // 500ms debounce

    // Cleanup function
    return () => {
      clearTimeout(handler);
    };
    // Dependencies: Re-run effect only when searchTerm or user changes.
    // handleSearch is intentionally omitted to use the latest version when the timeout fires.
  }, [searchTerm, user, handleSearch]); // Add handleSearch to dependencies

  // --- Send Request Functionality ---
  const handleSendRequest = async (receiverId: string) => {
     setActionLoading(prev => ({ ...prev, [receiverId]: true }));
     setSearchError(null); // Clear search error
     const toastId = toast.loading('Sending request...');
     try {
        const { error: rpcError } = await supabase.rpc('send_friend_request', { receiver_profile_id: receiverId });
        if (rpcError) throw rpcError;
        toast.success('Friend request sent!', { id: toastId });
        setSearchResults(prev => prev.filter(p => p.id !== receiverId)); // Optimistic UI update
        // Realtime should trigger fetchData eventually
     } catch (err: unknown) { // Use unknown
        console.error(`Error sending friend request to ${receiverId}:`, err);
        toast.error(err instanceof Error ? err.message : 'Failed to send friend request.', { id: toastId }); // Check error type
     } finally {
        setActionLoading(prev => ({ ...prev, [receiverId]: false }));
     }
  };

  if (loading && friends.length === 0 && incomingRequests.length === 0 && outgoingRequests.length === 0) { // Show loading only on initial load
    return <div className="text-center p-4">Loading friends...</div>;
  }

  // Removed main error display, relying on toasts

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Add Friend Search Section */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-slate-100">Add Friends</h3>
        <input
          type="text" placeholder="Search by Display Name (min 3 chars)..."
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
        />
        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
            {searchLoading && <p className="text-slate-500 dark:text-slate-400 text-sm">Searching...</p>}
            {searchError && !searchLoading && <p className="text-sm text-red-500">{searchError}</p>}
            {searchResults.map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-800/50">
                    <Link to={`/user/${profile.id}`} className="hover:underline font-semibold text-sm text-slate-800 dark:text-slate-200">{profile.display_name}</Link>
                    <button onClick={() => handleSendRequest(profile.id)} disabled={actionLoading[profile.id]} className="btn-primary text-xs py-1.5 px-3">
                        {actionLoading[profile.id] ? '...' : 'Send Request'}
                    </button>
                </div>
            ))}
        </div>
      </div>

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-slate-100">Incoming Requests ({incomingRequests.length})</h3>
          <ul className="space-y-2">
            {incomingRequests.map(req => (
              <li key={req.id} className="flex items-center justify-between p-2 border-b dark:border-gray-700">
                <Link to={`/user/${req.sender?.id}`} className="hover:underline dark:text-gray-200">{req.sender?.display_name || 'Unknown User'}</Link>
                <div className="space-x-2">
                  <button onClick={() => handleAccept(req.id)} disabled={actionLoading[req.id]} className="text-xs bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded disabled:opacity-50">
                    {actionLoading[req.id] ? '...' : 'Accept'}
                  </button>
                  <button onClick={() => handleDecline(req.id)} disabled={actionLoading[req.id]} className="text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded disabled:opacity-50">
                    {actionLoading[req.id] ? '...' : 'Decline'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Outgoing Requests */}
      {outgoingRequests.length > 0 && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">Sent Requests ({outgoingRequests.length})</h3>
          <ul className="space-y-2">
            {outgoingRequests.map(req => (
              <li key={req.id} className="flex items-center justify-between p-2 border-b dark:border-gray-700">
                <Link to={`/user/${req.receiver?.id}`} className="hover:underline dark:text-gray-200">{req.receiver?.display_name || 'Unknown User'}</Link>
                <button onClick={() => handleCancel(req.id)} disabled={actionLoading[req.id]} className="text-xs bg-gray-500 hover:bg-gray-600 text-white py-1 px-2 rounded disabled:opacity-50">
                  {actionLoading[req.id] ? '...' : 'Cancel'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Current Friends */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
        <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">Your Friends ({friends.length})</h3>
        {friends.length === 0 && <p className="text-gray-500 dark:text-gray-400">You haven't added any friends yet.</p>}
        <ul className="space-y-2">
          {friends.map(f => (
            <li key={f.friend.id} className="flex items-center justify-between p-2 border-b dark:border-gray-700">
              <Link to={`/user/${f.friend.id}`} className="hover:underline dark:text-gray-200">{f.friend.display_name}</Link>
              <button onClick={() => handleRemove(f.friend.id)} disabled={actionLoading[f.friend.id]} className="text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded disabled:opacity-50">
                {actionLoading[f.friend.id] ? '...' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default FriendsPage;