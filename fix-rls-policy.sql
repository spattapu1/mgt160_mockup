-- Fix RLS Policy for survey_responses
-- Run this in Supabase SQL Editor if you're getting 403 errors

-- First, drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anonymous inserts" ON survey_responses;
DROP POLICY IF EXISTS "Allow anonymous inserts with validation" ON survey_responses;
DROP POLICY IF EXISTS "Allow authenticated reads" ON survey_responses;
DROP POLICY IF EXISTS "Service role full access" ON survey_responses;
DROP POLICY IF EXISTS "Allow service role read" ON survey_responses;

-- Policy: Allow anonymous users to insert survey data (no restrictions)
CREATE POLICY "Allow anonymous inserts" ON survey_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users to read all data (for admin dashboard)
CREATE POLICY "Allow authenticated reads" ON survey_responses
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Service role can do everything (for admin access)
CREATE POLICY "Service role full access" ON survey_responses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

