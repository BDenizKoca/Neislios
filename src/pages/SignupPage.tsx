import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth'; // Updated import path
import { useNavigate, Link } from 'react-router-dom';
import { logger } from '../utils/logger';

function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null); // For success/info messages
  const [loading, setLoading] = useState(false);
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

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
      // Construct the credentials object according to the AuthContext definition
      const credentials = {
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim(),
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

  const handleGoogleLogin = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      // Redirect/session update handled by Supabase & AuthContext listener
    } catch (err: unknown) { // Use unknown
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google.'); // Check error type
      logger.error("Google login error:", err);
      setLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Create Account</h2>
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Your Name"
            />
          </div>
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="you@example.com"
            />
          </div>
          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6} // Supabase default minimum password length
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="••••••••"
            />
             <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Minimum 6 characters</p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}

          {/* Signup Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google Signin Button */}
        <div>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
             <svg className="w-5 h-5 mr-2" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 256S109.8 0 244 0c73 0 135.7 29.1 182.4 76.3l-66.3 66.3C314.6 100.7 282.7 80 244 80 149.9 80 72 158.3 72 256s77.9 176 172 176c61.8 0 104.1-25.8 132.1-53.1 21.9-21.1 33.9-51.4 37.9-86.4H244v-71.4h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
            Sign up with Google
          </button>
        </div>

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