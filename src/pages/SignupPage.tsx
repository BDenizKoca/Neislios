import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth'; // Updated import path
import { useNavigate, Link } from 'react-router-dom';
import { logger } from '../utils/logger';
import { AvatarPicker } from '../components/common';
import { getDefaultAvatar } from '../utils/avatars';
import { useTheme } from '../hooks/useTheme';

function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null); // For success/info messages
  const [loading, setLoading] = useState(false);
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleGoogleSignup = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign up with Google.');
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!displayName.trim()) {
        setError("Display Name is required.");
        setLoading(false);
        return;
    }

    try {
      // Use selected avatar or default if none selected
      const finalAvatarUrl = avatarUrl || getDefaultAvatar(email || displayName);
      
      // Construct the credentials object according to the AuthContext definition
      const credentials = {
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            avatar_url: finalAvatarUrl,
          },
        },
      };
      const { data } = await signUpWithEmail(credentials);
      // Check if email confirmation is required (user might be null initially)
      if (data.user && data.user.identities?.length === 0) {
         setMessage('Signup successful! Please check your email to confirm your account.');
         // Optionally redirect to login or a confirmation pending page
         // navigate('/login');
      } else if (data.user) {
         setMessage('Signup successful! Redirecting...');
         // If auto-confirmed or already logged in (less common for email signup)
         setTimeout(() => navigate('/'), 1500); // Redirect home after a delay
      } else {
         // Handle cases where user is null but no specific confirmation needed (e.g., error during user creation after auth record)
         setMessage('Signup successful! Please check your email for a confirmation link.');
      }

    } catch (err: unknown) { // Use unknown
      setError(err instanceof Error ? err.message : 'Failed to sign up. Please try again.'); // Check error type
      logger.error("Signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? (
          // Sun icon for light mode
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          // Moon icon for dark mode
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="w-full max-w-md p-8 space-y-6 glass-modal rounded-3xl shadow-xl">
        <h2 className="text-2xl font-bold text-center gradient-text">Create Account</h2>
        
        {/* Google Signup */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 font-medium absolute uppercase tracking-wider">or email</span>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Display Name Input */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Display Name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="nickname"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 sm:text-sm bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              placeholder="Your Name"
            />
          </div>

          {/* Avatar Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
              Choose Your Avatar (Optional)
            </label>
            <AvatarPicker 
              id={email || displayName || 'preview'} 
              onPick={setAvatarUrl}
              className="justify-center"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
              {avatarUrl ? 'Avatar selected!' : 'A default avatar will be assigned if none selected'}
            </p>
          </div>

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 sm:text-sm bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              placeholder="you@example.com"
            />
          </div>
          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 sm:text-sm bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              placeholder="••••••••"
            />
             <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Minimum 6 characters</p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}

          {/* Signup Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        {/* Divider - Removed Google signup */}
        
        {/* Link to Login */}
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;