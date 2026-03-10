/**
 * Supabase client – database access only.
 * Authentication is handled entirely by Clerk; this client is used
 * exclusively for database reads/writes (profiles, predictions, queries).
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables: ' +
    'REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are required.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

