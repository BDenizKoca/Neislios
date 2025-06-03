import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  // Function to check if user profile exists and create it if not
  const checkAndCreateUserProfile = useCallback(async (userId: string) => {
    try {
      // Check if user has a profile in the profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Get the user data to extract Google profile information
      const { data: userData } = await supabase.auth.getUser();        if (userData && userData.user) {
        /**
         * We're not using user metadata directly here, but we'll check account status
         * const user = userData.user;
         * const userMetadata = user.user_metadata;
         */
          
        // Check if this is a new Google account (no profile or empty display_name)
        if (profileError || !profile || !profile.display_name) {
          // Instead of auto-creating profile with Google name, redirect to onboarding
          // to let user choose a custom display name
          navigate('/google-onboarding');
          return;
        }
      }
        // If profile exists with display name, continue to home page
      navigate('/');
    } catch {
      navigate('/login'); // Redirect back to login on error
    }
  }, [navigate]);

  useEffect(() => {
    // Handle the auth redirect process
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Check if the user metadata exists in the profile table
        checkAndCreateUserProfile(session.user.id);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate, checkAndCreateUserProfile]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center p-6 max-w-sm rounded-lg border shadow-md bg-white dark:bg-gray-800">
        <h2 className="mb-2 text-2xl font-bold dark:text-white">Completing sign-in</h2>
        <p className="mb-5 text-gray-500 dark:text-gray-400">Please wait while we complete your sign-in process...</p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
