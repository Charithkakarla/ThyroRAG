-- Enable Row Level Security (RLS) for the predictions table
-- This is a crucial security measure to ensure users can only access their own data.
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, to ensure a clean setup.
-- This prevents conflicts if you've tried to set up policies before.
DROP POLICY IF EXISTS "Allow authenticated users to insert their own predictions" ON public.predictions;
DROP POLICY IF EXISTS "Allow authenticated users to select their own predictions" ON public.predictions;

-- 1.  POLICY: Allow INSERT for Authenticated Users
--     This policy allows any user who is logged in (i.e., has a valid JWT)
--     to insert a new row into the 'predictions' table.
--     The 'USING (true)' clause means this policy applies to all rows for the insert operation.
--     The 'WITH CHECK' clause ensures that the 'user_id' of the new row being inserted
--     matches the 'uid()' of the user performing the action. This is the most critical
--     part, as it prevents one user from saving data on behalf of another.
CREATE POLICY "Allow authenticated users to insert their own predictions"
ON public.predictions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = (user_id::uuid));

-- 2.  POLICY: Allow SELECT for Authenticated Users
--     This policy allows a logged-in user to read (select) rows from the 'predictions' table
--     only if the 'user_id' column in that row matches their own authenticated user ID (auth.uid()).
--     This ensures that users can only ever see their own prediction history.
CREATE POLICY "Allow authenticated users to select their own predictions"
ON public.predictions
FOR SELECT
TO authenticated
USING (auth.uid() = (user_id::uuid));

-- You can check these policies in your Supabase dashboard under:
-- Authentication -> Policies -> predictions
-- You should see the two policies created above.
