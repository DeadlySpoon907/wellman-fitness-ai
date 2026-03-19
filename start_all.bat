@echo off
SETLOCAL EnableExtensions EnableDelayedExpansion

TITLE Wellman Fitness System Controller

ECHO ===============================================================================
ECHO    WELLMAN FITNESS AI - SYSTEM INITIALIZATION
ECHO ===============================================================================
ECHO.

:: --- ENVIRONMENT VALIDATION ---
ECHO [PRE-CHECK] Validating environment...

:: Check for Python
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    ECHO [ERROR] Python not found. Please install Python 3.10+ and add to PATH.
    PAUSE
    EXIT /B 1
)
ECHO [OK] Python detected

:: Check for Node.js
node --version >nul 2>&1
IF ERRORLEVEL 1 (
    ECHO [WARNING] Node.js not found. Frontend and BMI estimator will not work.
)
ECHO [OK] Node.js detected

:: --- CONFIGURATION CHECKS ---
:: Attempt to grab API Key from .env to pass to Django
SET "GENERATED_API_KEY="
IF EXIST ".env" (
    FOR /F "usebackq tokens=1* delims==" %%A IN (".env") do (
        IF "%%A"=="VITE_API_KEY" SET "GENERATED_API_KEY=%%B"
        IF "%%A"=="API_KEY" SET "GENERATED_API_KEY=%%B"
        IF "%%A"=="GEMINI_API_KEY" SET "GENERATED_API_KEY=%%B"
    )
)

IF "!GENERATED_API_KEY!"=="" (
    ECHO [WARNING] No API key found in .env. Some features may not work.
)

ECHO.

:: --- SERVICE 1: DJANGO BACKEND ---
ECHO [1/3] Initializing Django Backend (Port 8000)...

:: Check/Setup Backend Virtual Environment (in root, not backend folder)
IF NOT EXIST "venv" (
    ECHO [INFO] Virtual environment not found. Creating...
    python -m venv venv
    IF ERRORLEVEL 1 (
        ECHO [ERROR] Failed to create virtual environment.
        PAUSE
        EXIT /B 1
    )
    ECHO [OK] Virtual environment created
)

:: Activate venv and install/update dependencies
ECHO [INFO] Activating virtual environment and installing dependencies...
call venv\Scripts\activate.bat
IF ERRORLEVEL 1 (
    ECHO [ERROR] Failed to activate virtual environment.
    PAUSE
    EXIT /B 1
)

:: Install/upgrade pip and dependencies
python -m pip install --upgrade pip setuptools wheel >nul 2>&1
IF EXIST "requirements.txt" (
    pip install -r requirements.txt
    IF ERRORLEVEL 1 (
        ECHO [WARNING] Some dependencies may have failed to install. Continuing anyway...
    )
)

ECHO [OK] Backend dependencies ready

:: Start Django backend in new window with proper error handling
start "Wellman Backend (Django)" cmd /k "cd /d %CD% && call venv\Scripts\activate.bat && cd backend && python manage.py migrate && python manage.py runserver 0.0.0.0:8000"

ECHO.
TIMEOUT /T 3 /NOBREAK

:: --- SERVICE 2: REACT FRONTEND ---
ECHO [2/3] Initializing React Frontend (Port 5173)...

:: Check for node_modules, install if missing
IF NOT EXIST "node_modules" (
    ECHO [INFO] node_modules not found. Installing npm dependencies...
    call npm install
    IF ERRORLEVEL 1 (
        ECHO [WARNING] Some npm dependencies may have failed. Continuing anyway...
    )
)

:: Start React dev server in new window
start "Wellman Frontend (React)" cmd /k "npm run dev"

ECHO [OK] Frontend starting on http://localhost:5173

ECHO.
TIMEOUT /T 2 /NOBREAK

:: --- SERVICE 3: NODEJS BMI ESTIMATOR ---
ECHO [3/3] Initializing Node.js BMI Estimator (Port 5001)...

:: Start Node.js BMI estimator in new window
start "Wellman BMI Estimator (Node.js)" cmd /k "cd /d %CD% && cd backend && node LRML_estimator.js"

ECHO [OK] BMI Estimator starting on http://localhost:5001

ECHO.
ECHO ===============================================================================
ECHO    ALL SYSTEMS LAUNCHED SUCCESSFULLY
ECHO ===============================================================================
ECHO.
ECHO Services running on:
ECHO   - Backend API:     http://localhost:8000/api/
ECHO   - Admin Panel:     http://localhost:8000/admin/
ECHO   - Frontend App:    http://localhost:5173
ECHO   - BMI Estimator:   http://localhost:5001
ECHO.
ECHO To stop all services, close each command window individually.
ECHO.
PAUSE