-- Fix SELECT policy for authenticated users
-- Run this in Supabase SQL Editor

-- Check current SELECT policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'survey_responses' AND cmd = 'SELECT';

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Allow authenticated reads" ON survey_responses;
DROP POLICY IF EXISTS "authenticated_select_policy" ON survey_responses;

-- Create a new SELECT policy for authenticated users
CREATE POLICY "authenticated_select_policy" ON survey_responses
    FOR SELECT
    TO authenticated
    USING (true);

-- Also create one for public (more permissive, for testing)
CREATE POLICY "public_select_policy" ON survey_responses
    FOR SELECT
    TO public
    USING (true);

-- Verify policies were created
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'survey_responses';

