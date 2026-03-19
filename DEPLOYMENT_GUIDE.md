# Wellman Fitness Deployment Guide

## Backend Deployment (Railway)

1. **Create Railway Account & Project**
   - Go to [Railway.app](https://railway.app) and sign up/login
   - Click "New Project" → "Deploy from GitHub repo"
   - Connect your GitHub account and select this repository

2. **Configure Environment Variables**
   - In Railway dashboard, go to your project → Variables
   - Add these variables:
     ```
     SECRET_KEY=your-very-long-random-secret-key
     DEBUG=False
     ALLOWED_HOSTS=https://your-project-name.up.railway.app
     CORS_ALLOW_ALL_ORIGINS=False
     CORS_ALLOWED_ORIGINS=https://your-vercel-app-url.vercel.app
     GEMINI_API_KEY=your-gemini-api-key
     ```

3. **Database Setup**
   - Railway automatically provisions PostgreSQL
   - The DATABASE_URL environment variable is set automatically
   - Run migrations: Railway will run `python manage.py migrate` automatically

4. **Deploy**
   - Push to GitHub main branch to trigger deployment
   - Monitor logs in Railway dashboard

## Frontend Deployment (Vercel)

1. **Create Vercel Account & Project**
   - Go to [Vercel.com](https://vercel.com) and sign up/login
   - Click "New Project" → "Import Git Repository"
   - Connect your GitHub account and select this repository

2. **Configure Build Settings**
   - Framework Preset: Vite
   - Root Directory: `./` (leave as is)
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Environment Variables**
   - Add in Vercel dashboard → Project Settings → Environment Variables:
     ```
     VITE_API_BASE_URL=https://your-railway-app-url.up.railway.app
     ```

4. **Deploy**
   - Vercel will auto-deploy on push to main branch
   - Your frontend will be available at `https://your-project-name.vercel.app`

## Post-Deployment Steps

1. **Update CORS in Backend**
   - Once Vercel deploys, get the URL and update `CORS_ALLOWED_ORIGINS` in Railway

2. **Update Frontend API URL**
   - Update `VITE_API_BASE_URL` in Vercel with the Railway URL

3. **Test the Application**
   - Frontend should be able to communicate with backend
   - Test all features: login, dashboard, etc.

## Troubleshooting

- **Backend Issues**: Check Railway logs for errors
- **Frontend Issues**: Check Vercel build logs
- **CORS Errors**: Ensure CORS_ALLOWED_ORIGINS includes Vercel URL
- **Database Errors**: Ensure migrations ran successfully