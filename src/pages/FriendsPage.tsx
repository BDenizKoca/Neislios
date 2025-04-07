import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useHeader } from '../context/HeaderContext'; // Import useHeader

// Define types for clarity
interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface FriendRequest {
  id: string; // Request ID
  created_at: string;
  sender?: Profile; // Populated for incoming
  receiver?: Profile; // Populated for outgoing
}

interface Friendship {
  friend: Profile; // The profile of the friend
  created_at: string; // When the friendship was formed (from friend_requests ideally)
}


function FriendsPage() {
  const { user } = useAuth();
  const { setHeaderTitle } = useHeader(); // Get setter
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null); // Remove error state
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({}); // Loading state per item ID
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    // setError(null); // Remove error state reset

    try {
      // --- Fetch Friendships ---
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

      // --- Fetch Incoming Requests ---
      const { data: incoming, error: incomingError } = await supabase
        .from('friend_requests').select(`id, created_at, sender:sender_id ( id, display_name, avatar_url )`)
        .eq('receiver_id', user.id).eq('status', 'pending');
      if (incomingError) throw incomingError;
      const mappedIncoming = incoming?.map(req => ({ ...req, sender: Array.isArray(req.sender) ? req.sender[0] : req.sender })) || [];
      setIncomingRequests(mappedIncoming);

      // --- Fetch Outgoing Requests ---
      const { data: outgoing, error: outgoingError } = await supabase
        .from('friend_requests').select(`id, created_at, receiver:receiver_id ( id, display_name, avatar_url )`)
        .eq('sender_id', user.id).eq('status', 'pending');
      if (outgoingError) throw outgoingError;
      const mappedOutgoing = outgoing?.map(req => ({ ...req, receiver: Array.isArray(req.receiver) ? req.receiver[0] : req.receiver })) || [];
      setOutgoingRequests(mappedOutgoing);

    } catch (err: any) {
      console.error("Error fetching friends data:", err);
      toast.error(err.message || 'Failed to load friends data.'); // Use toast for fetch error
      setFriends([]); setIncomingRequests([]); setOutgoingRequests([]); // Clear data on error
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

  // Realtime subscription setup for friends and requests
  useEffect(() => {
    if (!user) return;
    const handleDbChange = (payload: any) => {
        console.log('DB change detected on FriendsPage:', payload);
        fetchData(); // Simple refetch on any relevant change
    };
    const requestChannel = supabase.channel('friend-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${user.id}` }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${user.id}` }, handleDbChange)
      .subscribe((status, err) => { if (status === 'CHANNEL_ERROR') console.error(`Request Subscription error: ${err?.message}`); });
    const friendshipChannel = supabase.channel('friendship-changes')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `user_id_1=eq.${user.id}` }, handleDbChange)
       .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `user_id_2=eq.${user.id}` }, handleDbChange)
       .subscribe((status, err) => { if (status === 'CHANNEL_ERROR') console.error(`Friendship Subscription error: ${err?.message}`); });

    return () => {
      console.log('Unsubscribing from friends page changes');
      supabase.removeChannel(requestChannel);
      supabase.removeChannel(friendshipChannel);
    };
  }, [user, fetchData]);

  // --- Action Handlers ---
  const handleAction = async (actionType: 'accept' | 'decline' | 'cancel' | 'remove', id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    // setError(null); // Remove error state reset
    const toastId = toast.loading(`${actionType.charAt(0).toUpperCase() + actionType.slice(1)}ing...`); // Generic loading message
    try {
      let rpcName: string; let params: any; let successMsg: string;

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

    } catch (err: any) {
      console.error(`Error performing action ${actionType} for ID ${id}:`, err);
      toast.error(err.message || `Failed to ${actionType}.`, { id: toastId });
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleAccept = (requestId: string) => handleAction('accept', requestId);
  const handleDecline = (requestId: string) => handleAction('decline', requestId);
  const handleCancel = (requestId: string) => handleAction('cancel', requestId);
  const handleRemove = (friendId: string) => handleAction('remove', friendId);

  // --- Search Functionality ---
  const handleSearch = async (term: string) => {
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

    } catch (err: any) {
      console.error("Error searching users:", err);
      setSearchError(err.message || 'Failed to search users.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { handleSearch(searchTerm); }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, user, friends, incomingRequests, outgoingRequests]); // Re-run search if dependencies change

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
     } catch (err: any) {
        console.error(`Error sending friend request to ${receiverId}:`, err);
        toast.error(err.message || 'Failed to send friend request.', { id: toastId });
     } finally {
        setActionLoading(prev => ({ ...prev, [receiverId]: false }));
     }
  };

  if (loading && friends.length === 0 && incomingRequests.length === 0 && outgoingRequests.length === 0) { // Show loading only on initial load
    return <div className="text-center p-4">Loading friends...</div>;
  }

  // Removed main error display, relying on toasts

  return (
    <div className="space-y-8 p-4"> {/* Added padding */}
      {/* Add Friend Search Section */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
        <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">Add Friends</h3>
        <input
          type="text" placeholder="Search by Display Name (min 3 chars)..."
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary"
        />
        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2"> {/* Added max height and scroll */}
            {searchLoading && <p className="text-gray-500 dark:text-gray-400 text-sm">Searching...</p>}
            {searchError && !searchLoading && <p className="text-sm text-red-600 dark:text-red-400">{searchError}</p>}
            {searchResults.map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-2 border-b dark:border-gray-700">
                    <Link to={`/user/${profile.id}`} className="hover:underline dark:text-gray-200">{profile.display_name}</Link> {/* Link profile name */}
                    <button onClick={() => handleSendRequest(profile.id)} disabled={actionLoading[profile.id]} className="text-xs bg-primary hover:bg-opacity-80 text-white py-1 px-2 rounded disabled:opacity-50"> {/* Use primary color */}
                        {actionLoading[profile.id] ? '...' : 'Send Request'}
                    </button>
                </div>
            ))}
        </div>
      </div>

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">Incoming Requests ({incomingRequests.length})</h3>
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