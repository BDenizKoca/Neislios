import React, { useState, useEffect, ReactNode } from 'react'; // Removed createContext
import {
  Session,
  User,
  SignInWithPasswordCredentials,
  // SignUpWithPasswordCredentials, // Removed unused
  // Provider, // Removed unused
  // AuthResponse, // Removed unused import
  // AuthError, // Removed unused import
  // Provider // Removed unused import
} from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
// Note: SignInWithOAuthCredentials was removed as it's not used

 // Define the shape of the signup data including the required display name
export interface SignUpData { // Add export
  email: string;
  password: string;
  options: { // options must exist
    data: { // data must exist
      display_name: string; // Custom field for display name
    };
  };
}

// Import the context object and type from the definition file
import { AuthContext } from './AuthContextDefinition'; // Removed unused AuthContextType import

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true); // Start loading
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // Finish loading after getting session
    }).catch(() => {
      setLoading(false); // Finish loading even on error
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        // No need to setLoading here as initial load is handled above
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // --- Authentication Functions ---

  const signInWithEmail = async (credentials: SignInWithPasswordCredentials) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      return { data, error }; // Return the full response object
    } catch (error) {
      throw error; // Re-throw error for the component to handle
    }
  };

  const signUpWithEmail = async (credentials: SignUpData) => {
    // Display name is guaranteed by the SignUpData type structure now
    // No need for the explicit check here if the type is enforced correctly at the call site.
    try {
      const { data, error } = await supabase.auth.signUp(credentials);
      if (error) throw error;
      // Note: Supabase might require email confirmation by default.
      // The user object might be null until confirmation.
      return { data, error }; // Return the full response object
    } catch (error) {
      throw error;
    }
  };
  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth-callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          }
        }
      });
      if (error) throw error;
      return { data, error }; // Return the full response object
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.warn("Supabase server signout returned an error:", error);
    } catch (error) {
      console.error("SignOut error:", error);
    } finally {
      // Force clear local state so the user is never trapped
      setSession(null);
      setUser(null);
    }
    return { error: null }; // Return expected type, forcing success path for UI
  };

  // --- Context Value ---

  const value = {
    session,
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  };

  // Render children only when initial loading is complete
  return (
    <AuthContext.Provider value={value}>
      {children} {/* Always render children; consumers handle loading state */}
    </AuthContext.Provider>
  );
};

// Removed useAuth hook (moved to src/hooks/useAuth.ts)