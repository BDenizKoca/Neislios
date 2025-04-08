import { createContext } from 'react';
import {
  Session,
  User,
  SignInWithPasswordCredentials,
  AuthResponse,
  AuthError,
  Provider
} from '@supabase/supabase-js';
import { SignUpData } from './AuthContext'; // Keep SignUpData in the main file for now or move if preferred

// Export the type definition
export interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithEmail: (credentials: SignInWithPasswordCredentials) => Promise<AuthResponse>;
  signUpWithEmail: (credentials: SignUpData) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<{ data: { provider: Provider; url: string; } | null; error: AuthError | null; }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

// Create and export the context object
export const AuthContext = createContext<AuthContextType | undefined>(undefined);