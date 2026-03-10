/**
 * AuthContext – Clerk edition
 *
 * Provides a stable `useAuth()` hook that maps Clerk's primitives onto the
 * same shape the rest of the app already expects.  No Supabase auth is used;
 * Supabase is only used as a database.
 */
import { useUser, useAuth as useClerkAuth } from '@clerk/react';

/**
 * useAuth – drop-in replacement for the old Supabase-based hook.
 *
 * Returns:
 *   user          – Clerk User object (null when signed out)
 *   loading       – true while Clerk is initialising
 *   signOut       – Clerk signOut function
 *   getAccessToken– async fn that returns the current Clerk JWT
 */
export const useAuth = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut, getToken } = useClerkAuth();

  return {
    user: isSignedIn ? user : null,
    loading: !isLoaded,
    signOut,
    getAccessToken: getToken,
  };
};

/**
 * AuthProvider – kept as a no-op wrapper so any import of it doesn't crash.
 * The real provider is <ClerkProvider> in index.js.
 */
export const AuthProvider = ({ children }) => children;
