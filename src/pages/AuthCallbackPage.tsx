import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  const checkAndCreateUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (currentUser) {
        if (!profile) {
          // New user (Google or Email) - Auto-create profile from Auth metadata
          const googleName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
          const googleAvatar = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null;

          const { error: insertError } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              display_name: googleName || currentUser.email?.split('@')[0] || 'User',
              avatar_url: googleAvatar,
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error('Error auto-creating profile:', insertError);
          }

          // Route to onboarding so user can customize display name
          navigate('/google-onboarding');
          return;
        }

        if (!profile.display_name) {
          navigate('/google-onboarding');
          return;
        }
      }

      navigate('/');
    } catch (err) {
      console.error('Error in checkAndCreateUserProfile:', err);
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    let processed = false;

    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback and get the session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate('/login');
          return;
        }

        if (data.session && data.session.user && !processed) {
          processed = true;
          await checkAndCreateUserProfile(data.session.user.id);
        } else if (!processed) {
          // No session found, redirect to login
          navigate('/login');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        navigate('/login');
      }
    };

    // Add a small delay to ensure the auth state is properly set
    const timeoutId = setTimeout(handleAuthCallback, 100);

    // Fallback timeout to prevent infinite hanging (10 seconds)
    const fallbackTimeoutId = setTimeout(() => {
      if (!processed) {
        console.warn('Auth callback timeout - redirecting to login');
        navigate('/login');
      }
    }, 10000);

    // Also listen for auth state changes as fallback
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session && !processed) {
        processed = true;
        await checkAndCreateUserProfile(session.user.id);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(fallbackTimeoutId);
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
