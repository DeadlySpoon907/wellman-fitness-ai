# Wellman Fitness: Automated Vercel & Railway Deployment Script (PowerShell)
# This script automates the deployment process using CLI tools
# Prerequisites: vercel CLI, railway CLI, and PowerShell 7+ installed and authenticated

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Wellman Fitness Deployment Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if required CLIs are installed
Write-Host "Checking prerequisites..." -ForegroundColor Blue

$vercelExists = $null -ne (Get-Command vercel -ErrorAction SilentlyContinue)
$railwayExists = $null -ne (Get-Command railway -ErrorAction SilentlyContinue)

if (-not $vercelExists) {
    Write-Host "Vercel CLI not found. Install with: npm install -g vercel" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Installing Vercel CLI..."
    npm install -g vercel
}

if (-not $railwayExists) {
    Write-Host "Railway CLI not found. Install with: npm install -g @railway/cli" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Installing Railway CLI..."
    npm install -g @railway/cli
}

Write-Host "✓ CLIs ready" -ForegroundColor Green
Write-Host ""

# Step 1: Configure Environment
Write-Host "Step 1: Verifying Git is up to date..." -ForegroundColor Blue
git status
Write-Host ""

# Step 2: Deploy Backend to Railway
Write-Host "Step 2: Setting up Railway Backend Deployment..." -ForegroundColor Blue
Write-Host ""
Write-Host "To deploy backend:" -ForegroundColor Yellow
Write-Host "  1. Run: railway login"
Write-Host "  2. Run: railway init (select this project)"
Write-Host "  3. In Railway dashboard:"
Write-Host "     - Add PostgreSQL plugin"
Write-Host "     - Set environment variables (see VERCEL_RAILWAY_DEPLOYMENT.md)"
Write-Host "     - Deploy will trigger automatically on git push"
Write-Host ""

Write-Host "Do you want to authenticate with Railway now? (y/n): " -NoNewline -ForegroundColor Yellow
$railwayAuth = Read-Host

if ($railwayAuth -eq 'y' -or $railwayAuth -eq 'Y') {
    railway login
}

Write-Host ""

# Step 3: Deploy Frontend to Vercel
Write-Host "Step 3: Setting up Vercel Frontend Deployment..." -ForegroundColor Blue
Write-Host ""
Write-Host "To deploy frontend:" -ForegroundColor Yellow
Write-Host "  1. Run: vercel"
Write-Host "  2. Connect GitHub account if prompted"
Write-Host "  3. Select this project"
Write-Host "  4. Vercel will auto-detect build settings"
Write-Host "  5. Set environment variables in Vercel dashboard"
Write-Host ""

Write-Host "Do you want to deploy to Vercel now? (y/n): " -NoNewline -ForegroundColor Yellow
$vercelDeploy = Read-Host

if ($vercelDeploy -eq 'y' -or $vercelDeploy -eq 'Y') {
    vercel
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Visit https://railway.app and configure environment variables"
Write-Host "2. Visit https://vercel.com and configure environment variables"
Write-Host "3. See VERCEL_RAILWAY_DEPLOYMENT.md for detailed instructions"
Write-Host ""
