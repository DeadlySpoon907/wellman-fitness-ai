# Wellman Fitness - Project Setup Script (Windows PowerShell)

# Define colors
$Cyan = "Cyan"
$Green = "Green"
$Red = "Red"

Write-Host "=======================================" -ForegroundColor $Cyan
Write-Host "   Wellman Fitness AI - Setup Utility  " -ForegroundColor $Cyan
Write-Host "=======================================" -ForegroundColor $Cyan

# 1. Check for Node.js
Write-Host "`n[1/5] Checking Node.js Environment..." -ForegroundColor $Cyan
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "[OK] npm detected. Installing frontend dependencies..." -ForegroundColor $Green
    Write-Host "  - Installing: react, react-dom, typescript, vite, tailwindcss" -ForegroundColor Cyan
    Write-Host "  - Installing: @tensorflow/tfjs, @tensorflow-models/pose-detection" -ForegroundColor Cyan
    Write-Host "  - Installing: @google/genai, recharts, canvas" -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Frontend dependencies installed successfully." -ForegroundColor $Green
    } else {
        Write-Host "[WARNING] Some frontend dependencies may have failed. Please check npm output above." -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] npm not found. Please install Node.js 18+ to continue." -ForegroundColor $Red
    Write-Host "        Download from https://nodejs.org/" -ForegroundColor Yellow
    exit
}

# 2. Check for Python
Write-Host "`n[2/5] Checking Python Environment..." -ForegroundColor $Cyan
$PYTHON_CMD = $null

if (Get-Command python -ErrorAction SilentlyContinue) {
    try {
        & python --version 2>&1 | Out-Null
        if ($?) { $PYTHON_CMD = "python" }
    } catch {}
}

if (-not $PYTHON_CMD -and (Get-Command python3 -ErrorAction SilentlyContinue)) {
    try {
        & python3 --version 2>&1 | Out-Null
        if ($?) { $PYTHON_CMD = "python3" }
    } catch {}
}

if (-not $PYTHON_CMD -and (Get-Command py -ErrorAction SilentlyContinue)) {
    try {
        & py --version 2>&1 | Out-Null
        if ($?) { $PYTHON_CMD = "py" }
    } catch {}
}

if (-not $PYTHON_CMD) {
    Write-Host "[ERROR] Python not found. Please install Python 3.10+ to continue." -ForegroundColor $Red
    Write-Host "        Download from https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "        Ensure 'Add to PATH' is checked during installation." -ForegroundColor Yellow
    Write-Host "        If installed, disable 'App execution aliases' for Python in Windows Settings." -ForegroundColor Yellow
    exit
}
Write-Host "[OK] $PYTHON_CMD detected." -ForegroundColor $Green

# 3. Setup Virtual Environment
Write-Host "`n[3/5] Creating Python Virtual Environment..." -ForegroundColor $Cyan
& $PYTHON_CMD -m venv venv
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "[OK] Virtual environment created at .\venv\" -ForegroundColor $Green
} else {
    Write-Host "[ERROR] Failed to create virtual environment." -ForegroundColor $Red
    exit
}

# Activate virtual environment
Write-Host "`n[4/5] Activating Virtual Environment and upgrading pip..." -ForegroundColor $Cyan
$env:VIRTUAL_ENV = "$PWD\venv"
$env:Path = "$env:VIRTUAL_ENV\Scripts;$env:Path"

& $PYTHON_CMD -m pip install --upgrade pip setuptools wheel
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] pip upgraded successfully." -ForegroundColor $Green
} else {
    Write-Host "[WARNING] pip upgrade had issues, continuing anyway..." -ForegroundColor Yellow
}
# 5. Install Backend Dependencies
Write-Host "`n[5/5] Installing Backend Python Dependencies..." -ForegroundColor $Cyan
Write-Host "  - Core: Django, DRF, CORS headers, django-filter" -ForegroundColor Cyan
Write-Host "  - Database: psycopg2, sqlparse" -ForegroundColor Cyan
Write-Host "  - ML/AI: TensorFlow, OpenCV, NumPy, Pillow, scikit-learn" -ForegroundColor Cyan
Write-Host "  - APIs: google-generativeai, requests" -ForegroundColor Cyan
Write-Host "  - Production: gunicorn, whitenoise, celery, redis" -ForegroundColor Cyan
Write-Host "  - Testing: pytest, pytest-django" -ForegroundColor Cyan

if (Test-Path "requirements.txt") {
    & $PYTHON_CMD -m pip install -r requirements.txt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Python packages installed successfully." -ForegroundColor $Green
    } else {
        Write-Host "[ERROR] Failed to install some Python packages." -ForegroundColor $Red
        exit
    }
} else {
    Write-Host "[ERROR] requirements.txt not found." -ForegroundColor $Red
    Write-Host "  Please ensure requirements.txt exists in the project root." -ForegroundColor Yellow
    exit
}

Write-Host "`n=======================================" -ForegroundColor $Green
Write-Host "  SETUP COMPLETE!                    " -ForegroundColor $Green
Write-Host "=======================================" -ForegroundColor $Green
Write-Host "`nDependencies Installed:" -ForegroundColor $Cyan
Write-Host "  Frontend (Node.js):" -ForegroundColor $Green
Write-Host "    - React 19.2.4" -ForegroundColor White
Write-Host "    - React DOM 19.2.4" -ForegroundColor White
Write-Host "    - TypeScript 5.0" -ForegroundColor White
Write-Host "    - Vite 7.3.1" -ForegroundColor White
Write-Host "    - Tailwind CSS 3.4.0" -ForegroundColor White
Write-Host "    - TensorFlow.js 4.22.0" -ForegroundColor White
Write-Host "    - TensorFlow Pose Detection" -ForegroundColor White
Write-Host "    - Google GenAI SDK" -ForegroundColor White
Write-Host "    - Recharts 3.7.0" -ForegroundColor White
Write-Host "    - Canvas 3.2.1" -ForegroundColor White
Write-Host "`n  Backend (Python):" -ForegroundColor $Green
Write-Host "    Core Framework:" -ForegroundColor White
Write-Host "      - Django 5.0+" -ForegroundColor White
Write-Host "      - Django REST Framework 3.14.0+" -ForegroundColor White
Write-Host "      - Django CORS Headers 4.3.0+" -ForegroundColor White
Write-Host "      - django-filter 24.1+" -ForegroundColor White
Write-Host "    Database:" -ForegroundColor White
Write-Host "      - psycopg2-binary 2.9.9+" -ForegroundColor White
Write-Host "      - sqlparse 0.4.4+" -ForegroundColor White
Write-Host "    Machine Learning & Computer Vision:" -ForegroundColor White
Write-Host "      - TensorFlow 2.13.0+" -ForegroundColor White
Write-Host "      - OpenCV 4.8.0+" -ForegroundColor White
Write-Host "      - NumPy 1.24.0+" -ForegroundColor White
Write-Host "      - Pillow 10.0.0+" -ForegroundColor White
Write-Host "      - scikit-learn 1.3.0+" -ForegroundColor White
Write-Host "    AI & APIs:" -ForegroundColor White
Write-Host "      - google-generativeai 0.3.0+ (Gemini API)" -ForegroundColor White
Write-Host "      - requests 2.31.0+" -ForegroundColor White
Write-Host "    Production & Async:" -ForegroundColor White
Write-Host "      - gunicorn 21.2.0+" -ForegroundColor White
Write-Host "      - whitenoise 6.6.0+" -ForegroundColor White
Write-Host "      - celery 5.3.0+" -ForegroundColor White
Write-Host "      - redis 5.0.0+" -ForegroundColor White
Write-Host "    Utilities & Testing:" -ForegroundColor White
Write-Host "      - python-dotenv 1.0.0+" -ForegroundColor White
Write-Host "      - pytest 7.4.0+" -ForegroundColor White
Write-Host "      - pytest-django 4.7.0+" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor $Cyan
Write-Host "1. Activate virtual environment:" -ForegroundColor White
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
Write-Host "`n2. Configure environment variables:" -ForegroundColor White
Write-Host "   - Create a .env file in the backend/ directory" -ForegroundColor Yellow
Write-Host "   - Add your GEMINI_API_KEY and other settings" -ForegroundColor Yellow
Write-Host "`n3. Migrate database:" -ForegroundColor White
Write-Host "   cd backend && python manage.py migrate" -ForegroundColor Yellow
Write-Host "`n4. Start development servers:" -ForegroundColor White
Write-Host "   - Backend: cd backend && python manage.py runserver" -ForegroundColor Yellow
Write-Host "   - Frontend: npm run dev (in another terminal)" -ForegroundColor Yellow
Write-Host "`n=======================================" -ForegroundColor $Green