# Vercel Environment Variable Setup Guide

## Critical Issue Fixed

The error you encountered:
```
POST https://wellman-fitness-version-136-a6yibchix-deadlyspoon907s-projects.vercel.app/wellman-backend-production.up.railway.app/api/users/login/ 405 (Method Not Allowed)
```

This was caused by the environment variable not being properly set in Vercel, causing the app to treat the Railway URL as a relative path.

## Solution

### Step 1: Set Environment Variable in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variable:

   **Name:** `VITE_API_BASE_URL`
   
   **Value:** `https://wellman-backend-production.up.railway.app`
   
   **Environments:** Check all three:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. Click **Save**

### Step 2: Redeploy Your Application

After adding the environment variable, you MUST redeploy:

**Option A: Trigger a new deployment**
```bash
git commit --allow-empty -m "Trigger redeploy with env vars"
git push
```

**Option B: Redeploy from Vercel Dashboard**
1. Go to **Deployments** tab
2. Click the three dots (...) on the latest deployment
3. Click **Redeploy**
4. Ensure "Use existing Build Cache" is **unchecked**

### Step 3: Verify the Fix

After redeployment:

1. Open your Vercel app in the browser
2. Open Developer Console (F12)
3. Look for the debug log: `[DB] API_URL: https://wellman-backend-production.up.railway.app/api`
4. Try logging in - the URL should now be correct

## What Was Changed

### 1. `vercel.json`
- Removed the `env` section (environment variables should be set in Vercel Dashboard, not in vercel.json)

### 2. `services/DB.ts`
- Enhanced URL validation to ensure it's always a full URL (not relative)
- Added checks for `http://` or `https://` prefix
- Better handling of edge cases

## Important Notes

⚠️ **Environment variables in `vercel.json` are NOT the same as environment variables in the Vercel Dashboard**

- `vercel.json` env vars are only used during build time
- For Vite apps, you need to set them in the Vercel Dashboard for them to be available at runtime
- All Vite environment variables must start with `VITE_` prefix

## Troubleshooting

### If the error persists:

1. **Clear Vercel build cache:**
   - Go to Settings → General → Clear Build Cache
   - Redeploy

2. **Check the environment variable is set:**
   - Go to Settings → Environment Variables
   - Verify `VITE_API_BASE_URL` exists for all environments

3. **Check the console logs:**
   - Open browser console
   - Look for `[DB] API_URL:` log
   - It should show: `https://wellman-backend-production.up.railway.app/api`

4. **Verify Railway backend is running:**
   - Visit: https://wellman-backend-production.up.railway.app/api/users/
   - You should see a JSON response (not HTML)

## Backend CORS Configuration

Ensure your Railway backend allows requests from your Vercel domain:

In Railway, set the environment variable:
```
CORS_ALLOWED_ORIGINS=https://wellman-fitness-version-136-a6yibchix-deadlyspoon907s-projects.vercel.app,https://your-custom-domain.com
```

Replace with your actual Vercel URL(s).

## Testing Locally

To test with the same configuration locally:

1. Create a `.env` file in the project root:
   ```
   VITE_API_BASE_URL=https://wellman-backend-production.up.railway.app
   ```

2. Run the dev server:
   ```bash
   npm run dev
   ```

3. Check the console for the API_URL log

## Summary

✅ Environment variable must be set in **Vercel Dashboard**
✅ Must redeploy after adding environment variables
✅ Backend CORS must allow your Vercel domain
✅ URL should be full (with https://) not relative
