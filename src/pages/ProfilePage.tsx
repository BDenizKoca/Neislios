import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth'; // Updated import path
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types/profile';
import toast from 'react-hot-toast';
import { logger } from '../utils/logger';
import { useHeader } from '../hooks/useHeader'; // Updated import path
import { AvatarPicker } from '../components/common';
import { fallbackAvatar } from '../utils/avatars';

function ProfilePage() {
  const { user, session } = useAuth();
  const { setHeaderTitle } = useHeader(); // Get setter
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingDisplayName, setUpdatingDisplayName] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  // Remove error and successMessage state
  // const [error, setError] = useState<string | null>(null);
  // const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // setError(null); // No longer needed
    try {
      const { data, error: profileError } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      if (profileError) throw profileError;
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (err: unknown) { // Use unknown
      logger.error("Error fetching profile:", err);
      toast.error(err instanceof Error ? err.message : 'Failed to load profile.'); // Check error type
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile, session]);

  // Set Header Title
  useEffect(() => {
    setHeaderTitle('Your Profile');
  }, [setHeaderTitle]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) {
        toast.error("Display name cannot be empty (min 3 chars enforced by DB).");
        return;
    }
    if (displayName.trim() === profile?.display_name) {
        toast.error("Display name hasn't changed.");
        return;
    }
    setUpdatingDisplayName(true);
    const toastId = toast.loading('Updating display name...');

    try {
        const { error: rpcError } = await supabase.rpc('update_display_name', {
            new_display_name: displayName.trim()
        });
        if (rpcError) throw rpcError;
        toast.success("Display name updated successfully!", { id: toastId });
        await fetchProfile(); // Re-fetch to update displayed name
  } catch (err: unknown) { // Use unknown
    logger.error("Error updating profile:", err);
        toast.error(err instanceof Error ? err.message : 'Failed to update display name.', { id: toastId }); // Check error type
    } finally {
        setUpdatingDisplayName(false);
    }
  };

  const handleUpdateAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (avatarUrl.trim() === (profile?.avatar_url || '')) {
        toast.error("Avatar URL hasn't changed.");
        return;
    }
    setUpdatingAvatar(true);
    const toastId = toast.loading('Updating avatar URL...');

    try {
        const { error: rpcError } = await supabase.rpc('update_avatar_url', {
            new_avatar_url: avatarUrl.trim()
        });
        if (rpcError) throw rpcError;
        toast.success("Avatar URL updated successfully!", { id: toastId });
        await fetchProfile(); // Re-fetch to update displayed avatar
  } catch (err: unknown) { // Use unknown
    logger.error("Error updating avatar URL:", err);
        toast.error(err instanceof Error ? err.message : 'Failed to update avatar URL.', { id: toastId }); // Check error type
    } finally {
        setUpdatingAvatar(false);
    }
  };

  if (loading) return <div className="text-center p-4">Loading profile...</div>;
  // Error handling is now done via toasts, so remove dedicated error display if profile exists
  if (!profile) return <div className="text-center p-4">Could not load profile.</div>;

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Removed redundant h2 title */}

      {/* Avatar Display */}
      <div className="flex justify-center mb-6">
        {profile.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt="User Avatar" 
              className="h-24 w-24 rounded-full object-cover shadow-md"
              onError={(e) => {
                // Fallback to deterministic avatar if main image fails
                const target = e.target as HTMLImageElement;
                target.src = fallbackAvatar(user?.id || user?.email || '');
              }}
            />
        ) : (
            <img 
              src={fallbackAvatar(user?.id || user?.email || '')} 
              alt="Default Avatar" 
              className="h-24 w-24 rounded-full object-cover shadow-md"
            />
        )}
      </div>

      {/* Display Info & Edit Forms */}
      <div className="space-y-6">
          {/* Display Info */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
             <p className="mb-2 dark:text-gray-300"><strong>Email:</strong> {user?.email || 'N/A'}</p>
             <p className="mb-2 dark:text-gray-300"><strong>Current Display Name:</strong> {profile.display_name}</p>
             {/* Avatar URL Form */}
             <form onSubmit={handleUpdateAvatar} className="space-y-4 pt-4 border-t dark:border-gray-600">
                 <h4 className="font-medium dark:text-gray-100">Update Avatar</h4>
                 
                 {/* Avatar Picker Option */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Choose from gallery:</label>
                   <AvatarPicker 
                     id={user?.id || user?.email || ''} 
                     onPick={setAvatarUrl}
                     className="justify-center"
                   />
                 </div>

                 <div className="text-center text-sm text-gray-500 dark:text-gray-400">— OR —</div>

                 {/* Manual URL Input */}
                 <div>
                    <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Custom Image URL</label>
                    <input 
                      id="avatarUrl" 
                      type="url" 
                      placeholder="https://example.com/image.png" 
                      value={avatarUrl} 
                      onChange={(e) => setAvatarUrl(e.target.value)} 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Enter a direct URL to a JPG, PNG, GIF, or WEBP image. Leave blank to remove.</p>
                 </div>
                 <button 
                   type="submit" 
                   disabled={updatingAvatar || avatarUrl.trim() === (profile.avatar_url || '')} 
                   className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                 >
                    {updatingAvatar ? 'Saving...' : 'Update Avatar'}
                  </button>
             </form>
          </div>

          {/* Update Display Name Form */}
          <form onSubmit={handleUpdateProfile} className="p-4 bg-white dark:bg-gray-800 rounded shadow space-y-4">
             <h3 className="text-lg font-semibold dark:text-gray-100">Update Display Name</h3>
             <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-200">New Display Name <span className="text-red-500">*</span> (min 3 chars)</label>
                <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary"/>
             </div>
             {/* Removed static error/success messages */}
             <button type="submit" disabled={updatingDisplayName || !displayName.trim() || displayName.trim() === profile.display_name} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
                {updatingDisplayName ? 'Saving...' : 'Save Display Name'}
              </button>
          </form>
      </div>
    </div>
  );
}

export default ProfilePage;