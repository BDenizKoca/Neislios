import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import {
  Session,
  User,
  SignInWithPasswordCredentials,
  // SignUpWithPasswordCredentials, // Removed unused
  // Provider, // Removed unused
} from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

// Define the shape of the signup data including the required display name
interface SignUpData {
  email: string;
  password: string;
  options: { // options must exist
    data: { // data must exist
      display_name: string; // Custom field for display name
    };
  };
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithEmail: (credentials: SignInWithPasswordCredentials) => Promise<any>; // Return type can be more specific if needed
  signUpWithEmail: (credentials: SignUpData) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    }).catch((error) => {
      console.error("Error getting session:", error);
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
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing in:', error);
      // Consider more specific error handling/feedback
      throw error; // Re-throw error for the component to handle
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (credentials: SignUpData) => {
    setLoading(true);
    // Display name is guaranteed by the SignUpData type structure now
    // No need for the explicit check here if the type is enforced correctly at the call site.
    try {
      const { data, error } = await supabase.auth.signUp(credentials);
      if (error) throw error;
      // Note: Supabase might require email confirmation by default.
      // The user object might be null until confirmation.
      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        // options: { redirectTo: window.location.origin } // Optional: Redirect URL after login
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      // Loading might need different handling for OAuth redirects
      // setLoading(false); // Potentially remove this for OAuth
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // State updates (session, user) are handled by onAuthStateChange listener
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
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
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};