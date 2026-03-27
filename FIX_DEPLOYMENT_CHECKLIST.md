# Fix Deployment - Quick Checklist

## ⚡ ONE-CLICK FIX
From the **root directory** of the project (`wellman-fitness-version-1.3.6`), run:
```powershell
.\force_seed_railway.ps1
```

## The Problem
Your frontend is making requests to a malformed URL:
```
https://wellman-fitness-version-136-a6yibchix-deadlyspoon907s-projects.vercel.app/wellman-backend-production.up.railway.app/api/users/login/
```

Instead of:
```
https://wellman-backend-production.up.railway.app/api/users/login/
```

## Root Cause
The `VITE_API_BASE_URL` environment variable is not set in Vercel Dashboard, causing the app to treat the Railway URL as a relative path.

## Fix Steps

### 1. ✅ Code Changes (Already Done)
- [x] Updated [`services/DB.ts`](services/DB.ts) to validate URLs properly
- [x] Updated [`backend/settings.py`](backend/settings.py) to fix CORS configuration
- [x] Removed incorrect env config from [`vercel.json`](vercel.json)

### 2. 🔧 Vercel Dashboard Configuration (YOU NEED TO DO THIS)

#### A. Set Environment Variable
1. Go to: https://vercel.com/dashboard
2. Select your project: `wellman-fitness-version-1.3.6`
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://wellman-backend-production.up.railway.app`
   - **Environments:** Select ALL three (Production, Preview, Development)
6. Click **Save**

#### B. Redeploy
After adding the environment variable:
```bash
# Option 1: Push a new commit
git add .
git commit -m "Fix: Add proper API URL configuration"
git push

# Option 2: Redeploy from Vercel Dashboard
# Go to Deployments → Click ⋯ on latest → Redeploy (uncheck "Use existing Build Cache")
```

### 3. 🚂 Railway Backend Configuration (YOU NEED TO DO THIS)

1. Go to: https://railway.app/dashboard
2. Select your project: `wellman-backend-production`
3. Go to **Variables** tab
4. Add/Update:
   ```
   DATABASE_URL=postgresql://postgres:CtMxrouoEWmmeCRNbrbPEbGCpRWhfkyk@nozomi.proxy.rlwy.net:26805/railway
   CSRF_TRUSTED_ORIGINS=https://wellman-fitness-version-136-a6yibchix-deadlyspoon907s-projects.vercel.app
   ```
5. Click **Deploy** (Railway will auto-redeploy). 
   *Note: This ensures the backend handles all login/register requests using the PostgreSQL DB.*

## 5. ✅ Verify the Fix

After both deployments complete:

1. Open your Vercel app: https://wellman-fitness-version-136-a6yibchix-deadlyspoon907s-projects.vercel.app
2. Open Browser Console (F12)
3. Look for: `[DB] API_URL: https://wellman-backend-production.up.railway.app/api`
4. Try to login
5. Check Network tab - the request should go to: `https://wellman-backend-production.up.railway.app/api/users/login/`

## Expected Results

✅ **Before Fix:**
```
POST https://wellman-fitness-version-136-a6yibchix-deadlyspoon907s-projects.vercel.app/wellman-backend-production.up.railway.app/api/users/login/
Status: 405 Method Not Allowed
```

✅ **After Fix:**
```
POST https://wellman-backend-production.up.railway.app/api/users/login/
Status: 200 OK
```

## Troubleshooting

### If it still doesn't work:

1. **Clear Vercel Build Cache:**
   - Settings → General → Clear Build Cache
   - Redeploy

2. **Check Environment Variable:**
   - Settings → Environment Variables
   - Verify `VITE_API_BASE_URL` exists for all environments

3. **Check Railway Logs:**
   - Railway Dashboard → Deployments → View Logs
   - Look for CORS errors

4. **Test Backend Directly:**
   ```bash
   curl https://wellman-backend-production.up.railway.app/api/users/
   ```
   Should return JSON (not HTML)

## Files Modified

1. [`services/DB.ts`](services/DB.ts) - Enhanced URL validation
2. [`backend/settings.py`](backend/settings.py) - Fixed CORS configuration
3. [`vercel.json`](vercel.json) - Removed incorrect env config
4. [`VERCEL_ENV_SETUP.md`](VERCEL_ENV_SETUP.md) - Detailed setup guide (NEW)

## Next Steps

1. ✅ Commit and push these changes
2. ⚠️ Set `VITE_API_BASE_URL` in Vercel Dashboard
3. ⚠️ Update `CSRF_TRUSTED_ORIGINS` in Railway
4. ✅ Redeploy both frontend and backend
5. ✅ Test the login functionality

## Commands to Deploy

```bash
# Commit changes
git add .
git commit -m "Fix: Resolve API URL configuration for Vercel deployment"
git push

# The push will trigger automatic deployment on Vercel
# Railway will need manual redeploy after updating environment variables
```
