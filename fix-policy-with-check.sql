-- Fix the anon_insert_policy to be more permissive
-- The issue is likely the WITH CHECK clause

-- Drop the existing policy
DROP POLICY IF EXISTS "anon_insert_policy" ON survey_responses;

-- Create a new policy that's explicitly permissive
-- Using AS PERMISSIVE and a simple WITH CHECK (true)
CREATE POLICY "anon_insert_policy" ON survey_responses
    AS PERMISSIVE
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Also create a backup policy with a different approach
-- This uses USING instead of WITH CHECK for INSERT
CREATE POLICY "anon_insert_backup" ON survey_responses
    FOR INSERT
    TO anon
    USING (true)
    WITH CHECK (true);

-- Verify both policies exist
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'survey_responses' AND cmd = 'INSERT';

