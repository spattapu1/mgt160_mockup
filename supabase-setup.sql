-- Create survey_responses table in Supabase
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS survey_responses (
  id BIGSERIAL PRIMARY KEY,
  "group" TEXT NOT NULL,
  demographics JSONB,
  round_data JSONB,
  final_balance NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_survey_responses_created_at ON survey_responses(created_at);

-- Create an index on group for filtering
CREATE INDEX IF NOT EXISTS idx_survey_responses_group ON survey_responses("group");

-- Enable Row Level Security (RLS) - adjust policies as needed
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Policy to allow inserts (adjust based on your security needs)
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

