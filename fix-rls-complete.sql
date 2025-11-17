-- Complete RLS Policy Fix for survey_responses
-- Run this in Supabase SQL Editor to fix the 403 error

-- Step 1: Check if table exists and has RLS enabled
-- (This will show current state - you can ignore any errors here)

-- Step 2: Disable RLS temporarily to reset
ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'survey_responses') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON survey_responses';
    END LOOP;
END $$;

-- Step 4: Re-enable RLS
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Step 5: Create the correct policies

-- Policy 1: Allow anonymous users (anon role) to INSERT
CREATE POLICY "anon_insert_policy" ON survey_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy 2: Allow authenticated users to SELECT (read)
CREATE POLICY "authenticated_select_policy" ON survey_responses
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Service role can do everything
CREATE POLICY "service_role_all_policy" ON survey_responses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'survey_responses';

