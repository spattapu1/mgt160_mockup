-- Final RLS Fix - Comprehensive approach
-- This should definitely work

-- Step 1: Check current state
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'survey_responses';

-- Step 2: Disable RLS temporarily
ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL policies (including any hidden ones)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'survey_responses'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON survey_responses', pol.policyname);
    END LOOP;
END $$;

-- Step 4: Re-enable RLS
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policy using the most permissive approach
-- Using PUBLIC role instead of anon (more permissive)
CREATE POLICY "allow_anon_insert" ON survey_responses
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Step 6: Also create one specifically for anon (in case public doesn't work)
CREATE POLICY "allow_anon_insert_specific" ON survey_responses
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Step 7: Verify policies
SELECT policyname, cmd, roles, with_check
FROM pg_policies 
WHERE tablename = 'survey_responses';

