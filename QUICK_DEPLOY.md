# 🚀 QUICK DEPLOYMENT REFERENCE

## 5-Minute Quick Start

### Prerequisites Installed? ✓
- [x] Node.js & npm
- [x] Python 3.11+  
- [x] Git
- [x] Vercel account
- [x] Railway account

### Option A: Automated (Windows)
```batch
.\deploy.bat
# Select option [1] for Quick Start
```

### Option B: Automated (PowerShell)
```powershell
.\deploy.ps1
```

### Option C: Manual (Fastest for First-Time)
1. Go to https://railway.app/new → Deploy from GitHub
2. Go to https://vercel.com/new → Import Git Repository
3. Set environment variables (see below)
4. Done!

---

## Environment Variables You'll Need

### Railway Backend
```
SECRET_KEY=generate-a-random-50-char-string-here
DEBUG=False
ALLOWED_HOSTS=your-project.up.railway.app
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://your-project.vercel.app
GEMINI_API_KEY=your-gemini-api-key
PYTHON_VERSION=3.11
DJANGO_SETTINGS_MODULE=backend.settings
```

### Vercel Frontend
```
VITE_API_BASE_URL=https://your-project.up.railway.app
```

---

## Deployment Flows

### With Railway & Vercel Web Dashboards (Easiest)
1. **Railway:** github.com → Deploy → Add PostgreSQL → Set vars → Done
2. **Vercel:** github.com → Import → Set `VITE_API_BASE_URL` → Done
3. **Update CORS:** Railway dashboard → Update with Vercel URL
4. **Test:** Visit vercel URL, should connect to Railway backend

### With CLI Tools (Fastest for Developers)
```bash
# Install CLI tools
npm install -g @railway/cli vercel

# Deploy (each creates/updates deployment)
railway login && railway up
vercel

# Update variables in dashboards (2 min)
# Done!
```

---

## Test Locally Before Deploying

```bash
# Frontend
npm run build          # Must show "dist/index.html" ✓

# Backend  
python manage.py check # Must show "no issues (0 silenced)" ✓
python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear
python manage.py runserver
```

---

## After Deployment

1. **Test API Connection**
   - Open Vercel URL in browser
   - Should NOT see CORS errors in DevTools console
   - Login should work
   
2. **Monitor Logs**
   - Railway: dashboard → Deployments → Logs
   - Vercel: dashboard → Deployments → click → Logs

3. **Update If Needed**
   - Change env var → Auto-redeploy
   - Push to GitHub → Auto-deploy

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Frontend blank page | Check `VITE_API_BASE_URL` in Vercel |
| CORS error | Update `CORS_ALLOWED_ORIGINS` in Railway with exact Vercel URL |
| 502 Bad Gateway | Check Railway logs, verify env vars set |
| Build fails | Run `npm run build` locally to debug |
| DB error | Ensure PostgreSQL plugin added in Railway |

---

## Documentation Files

- **[DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)** - Full status report ✓
- **[VERCEL_RAILWAY_DEPLOYMENT.md](VERCEL_RAILWAY_DEPLOYMENT.md)** - Detailed step-by-step guide
- **[deploy.bat](deploy.bat)** - Windows interactive menu
- **[deploy.ps1](deploy.ps1)** - PowerShell automation script

---

## Support

- Railway: https://docs.railway.app
- Vercel: https://vercel.com/docs
- Stuck? See VERCEL_RAILWAY_DEPLOYMENT.md for troubleshooting

---

**Status:** ✅ READY FOR DEPLOYMENT
**Last Updated:** March 20, 2026
**Code Location:** https://github.com/DeadlySpoon907/wellman-fitness-ai
