@echo off
REM Navigate to the script's directory
cd /d "%~dp0"

echo ==========================================
echo   Wellman Fitness Backend Launcher
echo ==========================================

REM 1. Check/Create Virtual Environment
if not exist "venv" (
    echo [INFO] Virtual environment not found. Creating 'venv'...
    python -m venv venv
)

REM 2. Activate Virtual Environment
call venv\Scripts\activate

REM 3. Install Dependencies
echo [INFO] Checking dependencies...
pip install -r requirements.txt

REM 4. Start Server
echo [INFO] Starting Django Server...
python manage.py runserver
