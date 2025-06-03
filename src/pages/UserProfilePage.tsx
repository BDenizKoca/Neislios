import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth'; // Updated import path
import { Profile } from '../types/profile';
import { Watchlist } from '../types/watchlist';
import WatchlistCard from '../components/watchlists/WatchlistCard'; // To display public lists

function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth(); // Current logged-in user
  const [profile, setProfile] = useState<Profile | null>(null);
  const [publicWatchlists, setPublicWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(false); // Is the viewed profile a friend?
  const [friendRequestStatus, setFriendRequestStatus] = useState<'sent' | 'received' | 'none'>('none'); // Friend request status

  const isOwnProfile = user?.id === userId;

  // Fetch profile, public lists, and friendship status
  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    setIsFriend(false);
    setFriendRequestStatus('none');
    setPublicWatchlists([]);

    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        throw new Error("Profile not found.");
      }
      setProfile(profileData);

      // 2. Fetch Public Watchlists owned by this user
      const { data: listsData, error: listsError } = await supabase
        .from('watchlists')
        .select('*, owner:profiles!watchlists_owner_id_fkey(id, display_name)') // Fetch owner for card
        .eq('owner_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (listsError) throw listsError;
       const processedLists = listsData?.map(list => ({
            ...list,
            owner: Array.isArray(list.owner) ? list.owner[0] : list.owner
       })) || [];
      setPublicWatchlists(processedLists);

      // 3. Check Friendship/Request Status (only if not viewing own profile and logged in)
      if (user && !isOwnProfile) {
        // Check friendship
        const { data: friendshipData, error: friendError } = await supabase
            .rpc('are_friends', { user_id_1: user.id, user_id_2: userId }); // Assumes an 'are_friends' function exists or check table directly
        if (friendError) console.error("Error checking friendship:", friendError);
        else if (friendshipData) setIsFriend(true);

        // If not friends, check for pending requests
        if (!friendshipData) {
             const { data: requestData, error: requestError } = await supabase
                .from('friend_requests')
                .select('id, sender_id')
                .eq('status', 'pending')
                .or(`(sender_id.eq.${user.id},receiver_id.eq.${userId}),(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
                .maybeSingle();

             if (requestError) console.error("Error checking friend request:", requestError);
             else if (requestData) {
                 setFriendRequestStatus(requestData.sender_id === user.id ? 'sent' : 'received');
             }
        }
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  }, [userId, user, isOwnProfile]); // Add isOwnProfile dependency

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Action Handlers ---
  // Note: Friend request handlers (Send/Cancel/Accept/Decline) would require
  // additional API endpoints and state management
  const handleSendRequest = async () => {
      if (!userId || isOwnProfile) return;
      setError(null);
      try {
          const { error } = await supabase.rpc('send_friend_request', { receiver_profile_id: userId });
          if (error) throw error;
          setFriendRequestStatus('sent'); // Optimistic update
      } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to send request.'); }
  };
  // Add handleCancelRequest, handleAcceptRequest, handleDeclineRequest similarly...

  // Placeholder handlers for watchlist card actions on this page
  const handleToggleFavorite = (id: string, state: boolean) => alert(`Toggle favorite ${id} (state: ${state}) - Not implemented on this view`);
  const handleEdit = (id: string) => alert(`Edit ${id} - Not applicable on this view`);


  if (loading) return <div className="text-center p-4">Loading profile...</div>;
  if (error) return <div className="text-center p-4 text-red-600">Error: {error}</div>;
  if (!profile) return <div className="text-center p-4">Profile not found.</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
       {/* Profile Header */}
       <div className="flex items-center space-x-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded shadow">
            {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={`${profile.display_name}'s Avatar`} className="h-20 w-20 rounded-full object-cover"/>
            ) : (
                <div className="h-20 w-20 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-500">No Avatar</div>
            )}
            <div>
                <h1 className="text-3xl font-bold">{profile.display_name}</h1>
                {/* Friend Status / Actions */}
                {!isOwnProfile && user && (
                    <div className="mt-2">                        {isFriend ? (
                             <>
                                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Already Friends</span>
                                {/* Note: Remove Friend button would require additional API */}
                             </>
                        ) : friendRequestStatus === 'sent' ? (
                             <>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Friend Request Sent</span>
                                {/* Note: Cancel Request button would require additional API */}
                             </>
                        ) : friendRequestStatus === 'received' ? (
                             <>
                                <span className="text-sm text-yellow-600 dark:text-yellow-400">Friend Request Received</span>
                                {/* Note: Accept/Decline buttons would require additional API */}
                             </>
                        ) : (
                             <button onClick={handleSendRequest} className="text-sm bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded">
                                Add Friend
                             </button>
                        )}
                    </div>
                )}
            </div>
       </div>

       {/* Public Watchlists */}
       <div>
            <h2 className="text-2xl font-semibold mb-3">Public Watchlists</h2>
            {publicWatchlists.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">This user has no public watchlists.</p>
            ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {publicWatchlists.map(list => (
                        <WatchlistCard
                            key={list.id}
                            watchlist={list}
                            onToggleFavorite={handleToggleFavorite} // Pass appropriate handler
                            onEdit={handleEdit} // Pass placeholder/disabled handler
                        />
                    ))}
                 </div>
            )}
       </div>
    </div>
  );
}

export default UserProfilePage;