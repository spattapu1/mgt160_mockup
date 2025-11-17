-- Clean up duplicate INSERT policies
-- Having multiple policies for the same operation can cause conflicts

-- Drop both existing policies
DROP POLICY IF EXISTS "anon_insert" ON survey_responses;
DROP POLICY IF EXISTS "anon_insert_policy" ON survey_responses;

-- Create a single, clean INSERT policy
CREATE POLICY "anon_insert_policy" ON survey_responses
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Verify only one policy exists now
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'survey_responses' AND cmd = 'INSERT';

