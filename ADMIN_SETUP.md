# Admin Dashboard Setup

## Step 1: Create Admin Users in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users** (left sidebar)
3. Click **"Add user"** → **"Create new user"**
4. Fill in:
   - **Email**: The email for your pilot group member
   - **Password**: Create a secure password
   - **Auto Confirm User**: ✅ Check this (so they don't need email verification)
5. Click **"Create user"**
6. Repeat for each member of your pilot group

**Note**: You can also send them an invite email, but for a pilot group, creating users directly is faster.

## Step 2: Update RLS Policies

The SQL setup file (`supabase-setup.sql`) already includes policies that allow:
- **Anonymous users** (survey participants): Can INSERT data only
- **Authenticated users** (admin/pilot group): Can SELECT (read) all data
- **Service role**: Full access (for backend operations)

Make sure you've run the updated SQL that includes the authenticated user read policy.

## Step 3: Access the Admin Dashboard

1. Navigate to `admin.html` on your deployed site (e.g., `https://yoursite.onrender.com/admin.html`)
2. Login with the email and password you created in Step 1
3. You'll see:
   - Statistics dashboard (total responses, group counts, average balance)
   - Full data table with all survey responses

## Security Notes

- Only users created in Supabase Authentication can access the dashboard
- Survey participants (anonymous) cannot read any data - they can only submit
- Each admin user should have their own account (don't share passwords)
- Consider rotating passwords periodically

## Troubleshooting

**"Supabase not configured" error:**
- Make sure `supabase-config.js` has your actual credentials (not placeholders)

**"Error loading data" error:**
- Check that you've run the SQL setup with the authenticated user policy
- Verify the user is logged in (check browser console)

**Can't login:**
- Verify the user exists in Supabase Authentication → Users
- Check that "Auto Confirm User" was checked when creating the user
- Try resetting the password in Supabase dashboard

