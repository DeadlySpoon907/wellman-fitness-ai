@echo off
REM Wellman Fitness: Deployment Helper for Windows
REM This script helps you deploy to Vercel and Railway with minimal manual steps
REM
REM Prerequisites:
REM   - Node.js and npm installed
REM   - Git installed and authenticated
REM   - Vercel account at https://vercel.com
REM   - Railway account at https://railway.app

setlocal enabledelayedexpansion

echo.
echo ======================================
echo Wellman Fitness Deployment Helper
echo ======================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found. Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Check git
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git not found. Please install Git.
    pause
    exit /b 1
)

echo ✓ Node.js and Git found
echo.
echo ======================================
echo Choose Deployment Method:
echo ======================================
echo.
echo [1] Quick Start (Automated with CLI tools)
echo [2] Manual (Step-by-step with dashboards)
echo [3] View Documentation
echo [4] Run Tests Only (no deployment)
echo [5] Exit
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto quick_start
if "%choice%"=="2" goto manual_steps
if "%choice%"=="3" goto view_docs
if "%choice%"=="4" goto run_tests
if "%choice%"=="5" goto end
goto invalid_choice

:quick_start
echo.
echo Installing CLI tools...
echo.
call npm install -g vercel @railway/cli
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install CLI tools
    pause
    exit /b 1
)
echo ✓ CLI tools installed
echo.
echo Next steps:
echo 1. Open PowerShell and run: .\deploy.ps1
echo 2. Follow the prompts to authenticate with Railway and Vercel
echo 3. Monitor deployments in the dashboards
echo.
pause
goto end

:manual_steps
echo.
echo ======================================
echo Manual Deployment Steps
echo ======================================
echo.
echo Step 1: Deploy Backend to Railway
echo   1. Go to https://railway.app/new
echo   2. Select "Deploy from GitHub"
echo   3. Connect GitHub and select this repository
echo   4. Click "Deploy"
echo   5. Add PostgreSQL plugin
echo   6. Set environment variables:
echo      - SECRET_KEY=your-random-key
echo      - DEBUG=False
echo      - ALLOWED_HOSTS=your-railway-url.up.railway.app
echo      - GEMINI_API_KEY=your-api-key
echo      - CORS_ALLOWED_ORIGINS=https://your-vercel-url.vercel.app
echo   7. Note your Railway URL
echo.
echo Step 2: Deploy Frontend to Vercel
echo   1. Go to https://vercel.com/new
echo   2. Select "Import Git Repository"
echo   3. Connect GitHub and select this repository
echo   4. Set environment variable:
echo      - VITE_API_BASE_URL=https://your-railway-url.up.railway.app
echo   5. Click "Deploy"
echo   6. Note your Vercel URL
echo.
echo Step 3: Update CORS in Railway
echo   1. Go back to Railway dashboard
echo   2. Update CORS_ALLOWED_ORIGINS with your Vercel URL
echo   3. Railway redeploys automatically
echo.
echo For detailed documentation, see: VERCEL_RAILWAY_DEPLOYMENT.md
echo.
pause
goto end

:view_docs
echo.
echo Opening DEPLOYMENT_STATUS.md...
echo.
if exist DEPLOYMENT_STATUS.md (
    start notepad DEPLOYMENT_STATUS.md
) else (
    echo ERROR: DEPLOYMENT_STATUS.md not found
    pause
    exit /b 1
)
goto end

:run_tests
echo.
echo ======================================
echo Running Tests
echo ======================================
echo.
echo Testing Frontend Build...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)
echo ✓ Frontend build successful
echo.
echo Testing Backend...
call python manage.py check
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backend check failed
    pause
    exit /b 1
)
echo ✓ Backend check successful
echo.
echo Testing Database Migrations...
call python manage.py migrate --noinput
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Migrations failed
    pause
    exit /b 1
)
echo ✓ Migrations successful
echo.
echo Testing Static Files...
call python manage.py collectstatic --noinput --clear
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Static files failed
    pause
    exit /b 1
)
echo ✓ Static files collected
echo.
echo ======================================
echo All Tests Passed!
echo ======================================
echo.
pause
goto end

:invalid_choice
echo Invalid choice. Please try again.
pause
goto start

:end
echo Goodbye!
