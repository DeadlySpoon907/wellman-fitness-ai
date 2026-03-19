# 🚀 Start Server Guide

This guide provides a quick reference for starting the Wellman Fitness AI system. You can run both servers automatically or manually.

## 📋 Prerequisites

Ensure you have the following installed:
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **Git** (optional, for version control)

---

## ⚡ Quick Start (Automatic)

The easiest way to start all services:

1. **Run the automated startup script**:
   ```bash
   .\start_all.bat
   ```
   
   This will:
   - Create a Python virtual environment (if needed)
   - Install all Python dependencies from `requirements.txt`
   - Install all npm dependencies
   - Start the Django backend on `http://localhost:8000`
   - Start the React frontend on `http://localhost:5173`

2. **Access the application**:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:8000/api/`
   - Admin Panel: `http://localhost:8000/admin/`

---

## 🔧 Manual Setup (if automated fails)

### Step 1: Initial Setup
Run the setup script once to install all dependencies:
```bash
.\setup.ps1
```

This will:
- ✅ Install Node.js dependencies (React, TypeScript, Vite, TensorFlow.js, etc.)
- ✅ Create Python virtual environment
- ✅ Install all Python packages (Django, TensorFlow, OpenCV, Google GenAI, etc.)

---

## 🐍 Backend Server (Django)

The backend handles the API, database, ML models, and authentication.

### Manual Start
1. **Activate Virtual Environment**:
   ```bash
   .\venv\Scripts\Activate.ps1
   ```

2. **Navigate to backend**:
   ```bash
   cd backend
   ```

3. **Set Environment Variables** (create `.env` file in `backend/` folder):
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   DEBUG=True
   DATABASE_URL=sqlite:///db.sqlite3
   ```

4. **Run Migrations** (first time only):
   ```bash
   python manage.py migrate
   ```

5. **Create Superuser** (first time only):
   ```bash
   python manage.py createsuperuser
   ```

6. **Start the Server**:
   ```bash
   python manage.py runserver
   ```
   ✅ Backend running at `http://localhost:8000`

### Seed Database (Optional)
To populate with test data:
```bash
python seed.py
```

---

## ⚛️ Frontend Server (React + Vite)

The frontend provides the user interface and AI features.

### Manual Start
1. **Open a new terminal** (keep backend running)

2. **Create `.env` file** in root directory:
   ```env
   VITE_API_KEY=your_google_gemini_api_key
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Install Dependencies** (first time only):
   ```bash
   npm install
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   ✅ Frontend running at `http://localhost:5173`

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🤖 TensorFlow.js Pose Detection

The BMI Estimator and Posture Checker use TensorFlow.js running directly in the browser for pose detection and body metrics estimation.

### How It Works
- TensorFlow.js loads pose detection models in the frontend
- Camera capture sends frames to the browser-based AI models
- No external Node.js service required - all processing happens client-side

**Note**: The `start_all.bat` script handles starting the Django backend and React frontend. TensorFlow.js runs in the browser.

---

## 🔑 Test Credentials

Once both servers are running:

| Role | Username | Password |
|------|----------|----------|
| **Member** | `john_doe` | `member123` |
| **Admin** | `admin_fitness` | `admin123` |

**Admin Dashboard**: `http://localhost:5173/#/admin`

---

## 📦 Installed Dependencies

### Frontend (npm)
- React 19.2.4, React DOM 19.2.4
- TypeScript 5.0, Vite 7.3.1
- Tailwind CSS 3.4.0
- TensorFlow.js 4.22.0, Pose Detection models
- Google GenAI SDK
- Recharts 3.7.0, Canvas 3.2.1

### Backend (pip)
- **Framework**: Django 5.0+, Django REST Framework 3.14.0+
- **ML/AI**: TensorFlow 2.13.0+, OpenCV 4.8.0+, scikit-learn 1.3.0+
- **APIs**: google-generativeai 0.3.0+, requests 2.31.0+
- **Database**: psycopg2-binary 2.9.9+, sqlparse 0.4.4+
- **Production**: gunicorn 21.2.0+, whitenoise 6.6.0+
- **Async**: celery 5.3.0+, redis 5.0.0+
- **Testing**: pytest 7.4.0+, pytest-django 4.7.0+

---

## ❌ Troubleshooting

### Port Already in Use
```bash
# Find process using port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Find process using port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Virtual Environment Issues
```bash
# Recreate venv
rmdir /s venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Missing Dependencies
```bash
# Upgrade pip and reinstall
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 📖 More Information
- See `SYSTEM_NAVIGATION.md` for detailed project structure
- See `ADMIN_ACCESS_GUIDE.md` for admin panel access
- See `BACKEND_ARCHITECTURE.md` for API documentation