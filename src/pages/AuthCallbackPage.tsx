import React, { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const processedRef = useRef(false);

  const checkAndCreateUserProfile = useCallback(async (userId: string) => {
    if (processedRef.current) return;
    processedRef.current = true;

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
    // 1. Listen for Auth State Changes (PKCE Code exchange)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user && !processedRef.current) {
        await checkAndCreateUserProfile(session.user.id);
      }
    });

    // 2. Check existing session immediately
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        console.error('Auth getSession error:', error);
        navigate('/login');
        return;
      }
      if (data.session?.user && !processedRef.current) {
        await checkAndCreateUserProfile(data.session.user.id);
      } else {
        // Check URL search & hash parameters
        const hasAuthParams = window.location.search.includes('code=') || 
                              window.location.hash.includes('access_token=');
        const hasError = window.location.search.includes('error=') || 
                         window.location.hash.includes('error=');

        if (hasError) {
          navigate('/login');
        } else if (!hasAuthParams && !processedRef.current) {
          // If no auth parameters in URL and no session, redirect to login
          navigate('/login');
        }
      }
    });

    // 3. Fallback timeout safety (8 seconds max wait for slow network)
    const fallbackTimeoutId = setTimeout(() => {
      if (!processedRef.current) {
        console.warn('Auth callback timeout - redirecting to login');
        navigate('/login');
      }
    }, 8000);

    return () => {
      clearTimeout(fallbackTimeoutId);
      authListener?.subscription.unsubscribe();
    };
  }, [navigate, checkAndCreateUserProfile]);

  return (
    <div className="flex justify-center items-center h-screen bg-slate-950 text-white">
      <div className="text-center p-8 max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
        <h2 className="mb-2 text-2xl font-bold gradient-text">Completing Sign-In</h2>
        <p className="mb-6 text-sm text-slate-400">Please wait while we log you in...</p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-indigo-500"></div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
