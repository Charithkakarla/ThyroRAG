/**
 * Supabase client – database access with Clerk JWT authentication
 * Authentication is handled entirely by Clerk; this client uses
 * exclusively for database reads/writes (profiles, predictions, queries).
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const clerkSupabaseTemplate = process.env.REACT_APP_CLERK_SUPABASE_TEMPLATE;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables: ' +
    'REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are required.'
  );
}

let clerkTokenGetter = null;

export function setSupabaseTokenGetter(getTokenFn) {
  clerkTokenGetter = getTokenFn;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    if (!clerkTokenGetter) return null;

    // Prefer a dedicated Supabase JWT template only when configured.
    if (clerkSupabaseTemplate) {
      try {
        const templated = await clerkTokenGetter({ template: clerkSupabaseTemplate });
        if (templated) return templated;
      } catch {
        // Fall back to Clerk's default session token.
      }
    }

    try {
      return await clerkTokenGetter();
    } catch {
      return null;
    }
  },
  global: {
    headers: {
      'Accept': 'application/json',
    },
  },
});

