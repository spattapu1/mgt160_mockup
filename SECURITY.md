# Security Notes

## If You've Already Committed Supabase Credentials

If you've already pushed `supabase-config.js` with real credentials to GitHub, you should:

1. **Rotate your Supabase API keys immediately:**
   - Go to your Supabase project dashboard
   - Navigate to Settings → API
   - Click "Reset anon key" to generate a new key
   - Update your local `supabase-config.js` with the new key

2. **Remove the file from git history (if needed):**
   ```bash
   # Remove from git tracking (file will remain locally)
   git rm --cached supabase-config.js
   git commit -m "Remove supabase-config.js from git"
   git push
   ```
   
   Note: The file will still exist in git history. For complete removal, you'd need to use `git filter-branch` or BFG Repo-Cleaner, but rotating the keys is usually sufficient.

3. **Going forward:**
   - `supabase-config.js` is now in `.gitignore`
   - Only `supabase-config.example.js` (with placeholders) will be committed
   - Each developer/deployment needs to create their own `supabase-config.js` from the example

## For Render Deployment

Since `supabase-config.js` won't be in your git repo, you have two options for Render:

### Option 1: Build script (Recommended)
Create a build script that generates `supabase-config.js` from environment variables during deployment.

### Option 2: Manual upload
Manually create `supabase-config.js` on Render's file system (not recommended for production).

### Option 3: Use environment variables in the browser
Modify the code to read from `window.env` or similar, and inject environment variables during build.


