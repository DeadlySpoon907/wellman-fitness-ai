# Complete Deployment Guide: Vercel Frontend + Railway Backend

This guide provides step-by-step instructions to deploy Wellman Fitness with Vercel (frontend) and Railway (backend).

---

## Prerequisites

- GitHub account with the repository pushed
- Vercel account (free tier available)
- Railway account (free tier available)
- Git CLI installed on your machine

---

## Step 1: Push Code to GitHub

First, ensure all changes are committed and pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Vercel and Railway deployment"
git push origin main
```

---

## PART A: Backend Deployment (Railway)

### Step 1: Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Sign up or log in
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Connect your GitHub account if prompted
6. Select the `wellman-fitness-version-1.3.6` repository
7. Select the **`main`** branch
8. Click **Deploy**

### Step 2: Configure Environment Variables

Once the project is created, configure the environment variables:

1. In Railway dashboard, go to your project
2. Click on the **"Variables"** tab
3. Add the following environment variables:

```
SECRET_KEY=your-very-long-random-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-railway-app-url.up.railway.app
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://your-vercel-app-url.vercel.app
GEMINI_API_KEY=your-gemini-api-key-here
DATABASE_URL=postgresql://...  (automatically set by Railway PostgreSQL plugin)
```

**Important Notes:**
- For `SECRET_KEY`: Generate a strong random key (min 50 characters)
- Leave `DATABASE_URL` empty; Railway will set this when PostgreSQL is added
- `CORS_ALLOWED_ORIGINS` should match your Vercel frontend URL exactly

### Step 3: Add PostgreSQL Database

1. In Railway project, click **"Add"** button (top right)
2. Search for and select **"PostgreSQL"**
3. Railway automatically creates the database and sets `DATABASE_URL`

### Step 4: Monitor Deployment

1. Check the **"Deployments"** tab to monitor the backend deployment
2. Click on the latest deployment to see logs
3. Look for messages indicating:
   - `python manage.py collectstatic --noinput --clear` completed
   - `python manage.py migrate --noinput` completed
   - `gunicorn` server started

### Step 5: Get Your Railway Backend URL

Once deployed successfully:
1. Go to **"Settings"** → **"Networking"**
2. Copy the **Public URL** (should look like `https://wellman-fitness.up.railway.app`)
3. Save this URL for later (needed for Vercel configuration)

---

## PART B: Frontend Deployment (Vercel)

### Step 1: Create Vercel Project

1. Go to [Vercel.com](https://vercel.com)
2. Sign up or log in
3. Click **"Add New..."** → **"Project"**
4. Click **"Import Git Repository"**
5. Connect GitHub if prompted
6. Select the `wellman-fitness-version-1.3.6` repository
7. Click **Import**

### Step 2: Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install` (default)

### Step 3: Configure Environment Variables

1. Go to project settings
2. Click **"Environment Variables"**
3. Add the following variable:

```
VITE_API_BASE_URL=https://your-railway-backend-url.up.railway.app
```

Replace `your-railway-backend-url.up.railway.app` with the actual URL from Step 5 above.

### Step 4: Deploy

1. Click **"Deploy"**
2. Vercel will automatically build and deploy
3. Monitor the build progress in the logs
4. Once complete, you'll see the deployment URL (e.g., `https://wellman-fitness.vercel.app`)

### Step 5: Get Your Vercel Frontend URL

Once deployed:
1. Save your Vercel URL (e.g., `https://wellman-fitness.vercel.app`)
2. You'll need this to update the backend CORS settings

---

## PART C: Post-Deployment Configuration

### Step 1: Update Backend CORS Settings

Now that you have the Vercel URL, update the backend:

1. Go back to Railway project dashboard
2. Click **"Variables"** tab
3. Update `CORS_ALLOWED_ORIGINS` with your Vercel URL:

```
CORS_ALLOWED_ORIGINS=https://your-vercel-frontend-url.vercel.app
```

4. Click **Save**
5. Railway will redeploy automatically with the new environment variable

### Step 2: Test the Application

1. Open your Vercel frontend URL in a browser
2. Try the following:
   - **Login**: Create an account or log in
   - **Dashboard**: Navigate to the main dashboard
   - **API Calls**: Try features that make API calls (weight tracking, AI suggestions, etc.)
3. Open browser DevTools (F12) → **Console** to check for any CORS or API errors

---

## Troubleshooting

### Backend Issues

#### Deployment fails in Railway
- Check **Deployment logs** in Railway dashboard
- Common issues:
  - Missing `DATABASE_URL`: Add PostgreSQL plugin
  - `SECRET_KEY` not set: Add missing environment variable
  - Wrong Python version: Ensure Python 3.11 is configured

#### 502 Bad Gateway
- Check Railway logs for gunicorn errors
- Verify all environment variables are set correctly
- Try redeploying manually: Railway dashboard → **Deploy** → **Redeploy**

#### Database migration errors
- SSH into Railway container or check logs
- Verify `psycopg2-binary` is in `requirements.txt`
- Check migrations in `api/migrations/` directory

### Frontend Issues

#### Build fails in Vercel
- Check build logs in Vercel dashboard
- Common issues:
  - Missing dependencies: Ensure `npm install` completes
  - TypeScript errors: Run `npm run build` locally to check
  - Missing environment variables: Add `VITE_API_BASE_URL` in Vercel

#### Blank page or won't load
- Check browser console (F12) for errors
- Verify `VITE_API_BASE_URL` is correct
- Check that Vite build output is in `dist/` folder

### CORS Errors

#### "Access to XMLHttpRequest has been blocked by CORS policy"
1. Verify `CORS_ALLOWED_ORIGINS` in Railway exactly matches Vercel URL
2. Ensure the backend is running and healthy
3. Check that requests don't include trailing slashes (should match exactly)

#### API requests return 401 or 403
- Check authentication tokens
- Verify backend migrations ran successfully
- Check user creation and authentication flow

---

## Environment Variables Summary

### Railway Backend (`railway.toml` + Variables)

```
SECRET_KEY=<strong-random-key>
DEBUG=False
ALLOWED_HOSTS=<railway-url>.up.railway.app
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://<vercel-url>.vercel.app
GEMINI_API_KEY=<your-gemini-key>
DATABASE_URL=<auto-set-by-postgresql>
DJANGO_SETTINGS_MODULE=backend.settings
PYTHON_VERSION=3.11
```

### Vercel Frontend (`vercel.json` + Environment Variables)

```
VITE_API_BASE_URL=https://<railway-url>.up.railway.app
```

---

## Monitoring & Maintenance

### Railway Backend

1. **View Logs**: Dashboard → Project → Logs tab
2. **Check Metrics**: Dashboard → Project → Metrics tab (CPU, Memory, Network)
3. **Redeploy**: If issues occur, click **Redeploy** in Deployments tab

### Vercel Frontend

1. **View Logs**: Dashboard → Project → Deployments → Select deployment → Logs
2. **Analytics**: Dashboard → Project → Analytics (traffic, performance)
3. **Redeploy**: Dashboard → Deployments → Click **...** → Redeploy

---

## Useful Commands for Local Testing

Before deploying, test locally:

### Backend
```bash
# Set environment variables in .env
echo "SECRET_KEY=test-key" > backend/.env
echo "DEBUG=True" >> backend/.env
echo "GEMINI_API_KEY=your-key" >> backend/.env

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```

### Frontend
```bash
# Install dependencies
npm install

# Set environment variables
export VITE_API_BASE_URL=http://localhost:8000

# Run dev server
npm run dev

# Build for production (like Vercel will do)
npm run build
```

---

## Quick Reference

| Component | Provider | URL Pattern | Config File |
|-----------|----------|-------------|------------|
| Frontend | Vercel | `https://<project>.vercel.app` | `vercel.json` |
| Backend | Railway | `https://<project>.up.railway.app` | `railway.toml` |
| Database | Railway PostgreSQL | Auto-configured | `DATABASE_URL` env var |

---

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Deploy frontend to Vercel
3. ✅ Configure CORS between services
4. ✅ Test application end-to-end
5. ⏳ Monitor logs and metrics
6. ⏳ Set up automatic deployments (push to GitHub = auto-deploy)
7. ⏳ Configure custom domains (optional)
8. ⏳ Set up error tracking and monitoring

---

## Support

For issues:
- **Railway**: https://docs.railway.app
- **Vercel**: https://vercel.com/docs
- **Django**: https://docs.djangoproject.com
- **React/Vite**: https://vitejs.dev/guide
