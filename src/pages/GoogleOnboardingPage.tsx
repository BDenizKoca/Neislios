import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

// Force Vite cache bust
function GoogleOnboardingPage() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Check if user exists and redirect if not
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Make sure user exists before accessing user.id
      if (!user) {
        throw new Error("User is not authenticated");
      }
      
      // Create or update profile with the custom display name
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: displayName.trim(),
          updated_at: new Date().toISOString(),
        });
        
      if (updateError) throw updateError;
      
      // Also update auth metadata to store display name
      await supabase.auth.updateUser({
        data: { display_name: displayName.trim() }
      });
      
      // Redirect to home page after successful setup
      navigate('/');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to set up your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#0b0f17] px-4">
      <div className="max-w-md w-full space-y-8 p-8 glass-modal rounded-3xl">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            Welcome to Neislios!
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
            Please choose a display name that your friends will see
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="display-name" className="sr-only">Display Name</label>
            <input
              id="display-name"
              name="display-name"
              type="text"
              required
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 sm:text-sm bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Continue to App'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GoogleOnboardingPage;
