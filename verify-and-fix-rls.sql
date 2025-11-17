-- Step 1: Check current policies (run this first to see what exists)
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'survey_responses';

-- Step 2: If the above shows policies exist, drop them all
-- (Copy and run each DROP statement if policies exist)
DROP POLICY IF EXISTS "Allow anonymous inserts" ON survey_responses;
DROP POLICY IF EXISTS "anon_insert_policy" ON survey_responses;
DROP POLICY IF EXISTS "Allow authenticated reads" ON survey_responses;
DROP POLICY IF EXISTS "authenticated_select_policy" ON survey_responses;
DROP POLICY IF EXISTS "Service role full access" ON survey_responses;
DROP POLICY IF EXISTS "service_role_all_policy" ON survey_responses;

-- Step 3: Make sure RLS is enabled
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a simple, permissive INSERT policy for anon
-- This allows ANY insert from anonymous users
CREATE POLICY "anon_can_insert" ON survey_responses
    AS PERMISSIVE
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Step 5: Verify the policy was created
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'survey_responses';

