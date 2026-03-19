# System Navigation Guide

This guide details how to navigate, run, and explore the Wellman Fitness AI system, covering both the React frontend and Django backend.

## ⚡ Quick Start

**Fastest way to get everything running:**
```bash
.\start_all.bat
```

This automatically:
- ✅ Sets up Python virtual environment
- ✅ Installs all npm packages
- ✅ Installs all Python dependencies
- ✅ Starts Django backend (Port 8000)
- ✅ Starts React frontend (Port 5173)

---

## 📂 Project Structure

The project is organized into two distinct areas:

```
wellman-fitness-version-1.3.6/
├── frontend/                    # React + Vite application
│   ├── components/             # Reusable React components
│   ├── views/                  # Page components
│   ├── services/               # API & external services
│   ├── utils/                  # Helper functions
│   ├── App.tsx                 # Main app component
│   ├── index.tsx               # React entry point
│   ├── package.json            # npm dependencies
│   └── vite.config.ts          # Vite configuration
│
├── backend/                     # Django REST API
│   ├── api/                    # API app
│   │   ├── models.py           # Database models
│   │   ├── views.py            # API views
│   │   ├── serializers.py      # Serializers
│   │   └── migrations/         # Database migrations
│   ├── backend/                # Django config
│   │   ├── settings.py         # Django settings
│   │   ├── urls.py             # URL routing
│   │   └── wsgi.py             # WSGI config
│   ├── manage.py               # Django CLI
│   ├── db.sqlite3              # SQLite database
│   └── requirements.txt         # Python dependencies
│
├── setup.ps1                    # Automated setup script
├── start_all.bat               # Start all services
├── requirements.txt             # Root Python dependencies
└── README.md                    # Project documentation
```

---

## 🖥️ Frontend Navigation (React + Vite)

The frontend is the user interface layer, built with React 19 and Vite.

### Key Directories
- **`components/`**: Reusable UI components (AuthGuard, WeightChart, CameraCapture, etc.)
- **`views/`**: Full-page components (Dashboard, Login, AdminDashboard, etc.)
- **`services/`**: API communication and external integrations
- **`utils/`**: Utility functions and helpers
- **`public/`**: Static assets (images, icons)
- **`node_modules/`**: npm dependencies

### How to Run
1. **From root directory**:
   ```bash
   npm install     # First time only
   npm run dev     # Start dev server
   npm run build   # Build for production
   ```

2. **Create `.env` file** in root directory:
   ```env
   VITE_API_KEY=your_google_gemini_api_key
   VITE_API_URL=http://localhost:8000/api
   ```

3. **Access at**: `http://localhost:5173`

### Key Files
- `App.tsx` - Main application component with routing
- `index.tsx` - React DOM render entry point
- `types.ts` - TypeScript type definitions
- `package.json` - npm packages and scripts

---

## ⚙️ Backend Navigation (Django)

The backend handles authentication, data persistence, ML/AI integration, and REST API endpoints.

### Key Directories & Files
- **`backend/settings.py`** - Django configuration (database, INSTALLED_APPS, middlewares)
- **`backend/urls.py`** - URL routing configuration
- **`api/models.py`** - Database models (User, WeightLog, FitnessPlan, MealLog, PostureLog, ActivityLog)
- **`api/views.py`** - API endpoints and business logic
- **`api/serializers.py`** - Data serialization for API
- **`api/migrations/`** - Database migration files
- **`manage.py`** - Django management utility
- **`db.sqlite3`** - SQLite database file (development)
- **`seed.py`** - Script to populate test data

### How to Run

**Option 1: Automatic (Recommended)**
```bash
.\start_all.bat
```

**Option 2: Manual**
```bash
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Navigate to backend
cd backend

# Create .env file with:
# GEMINI_API_KEY=your_key_here

# Run migrations (first time)
python manage.py migrate

# Create admin user (first time)
python manage.py createsuperuser

# Start server
python manage.py runserver
```

### API Endpoints
- Base URL: `http://localhost:8000/api/`
- Admin Panel: `http://localhost:8000/admin/`
- API Documentation: Check `backend/urls.py` for registered endpoints

### Database Management
```bash
# Create migrations after model changes
python manage.py makemigrations api

# Apply migrations
python manage.py migrate

# Populate with test data
python seed.py

# Access Django admin
# User: admin_fitness, Password: admin123
```

---

## 🔌 Key Technologies

### Frontend Stack
- **React 19.2.4** - UI framework
- **TypeScript 5.0** - Type-safe JavaScript
- **Vite 7.3.1** - Build tool & dev server
- **Tailwind CSS 3.4.0** - Utility-first CSS
- **TensorFlow.js 4.22.0** - ML in browser (pose detection)
- **@google/genai** - Google Gemini API
- **Recharts 3.7.0** - Data visualization
- **React Router** - Client-side routing

### Backend Stack
- **Django 5.0+** - Web framework
- **Django REST Framework 3.14.0+** - REST API
- **Django CORS Headers 4.3.0+** - Cross-origin support
- **TensorFlow 2.13.0+** - ML framework
- **OpenCV 4.8.0+** - Computer vision
- **google-generativeai 0.3.0+** - Gemini API
- **PostgreSQL** - Database (can use SQLite for dev)
- **gunicorn 21.2.0+** - Production server
- **celery 5.3.0+** - Async task processing
- **redis 5.0.0+** - Task queue & caching

---

## 🔐 Environment Configuration

### Frontend (`.env` in root)
```env
VITE_API_KEY=your_google_gemini_api_key
VITE_API_BASE_URL=http://localhost:8000
```

### Backend (`.env` in `backend/` or system variables)
```env
GEMINI_API_KEY=your_google_gemini_api_key
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
SECRET_KEY=your-django-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
```

---

## 🛠️ Development Workflow

### Making API Changes
1. Update models in `backend/api/models.py`
2. Create migrations: `python manage.py makemigrations api`
3. Apply migrations: `python manage.py migrate`
4. Update serializers in `backend/api/serializers.py`
5. Update views in `backend/api/views.py`
6. Restart Django server

### Making Frontend Changes
1. Update components in `components/` or `views/`
2. Changes auto-refresh in dev server
3. Update types in `types.ts` if needed
4. Test in browser

### Adding Dependencies
**npm packages:**
```bash
npm install package_name
```

**Python packages:**
```bash
pip install package_name
pip freeze > requirements.txt
```

---

## 📚 Documentation Files

- **START_SERVER_GUIDE.md** - How to start the servers
- **BACKEND_INSTRUCTIONS.md** - Backend-specific setup
- **ADMIN_ACCESS_GUIDE.md** - Admin dashboard access
- **BACKEND_ARCHITECTURE.md** - API architecture & endpoints
- **FRONTEND_ARCHITECTURE.md** - Frontend structure & components
- **GENERAL_ARCHITECTURE.md** - Overall system design
- **README.md** - Project overview & features
```

## 🧭 User Navigation & Features

Once both servers are running, navigate to the frontend URL to interact with the system.

### 1. Authentication
Log in using the seeded credentials to explore different user roles:

| Role | Username | Password | Description |
|------|----------|----------|-------------|
| **Premium Member** | `john_doe` | `member123` | Full access to AI Plan Designer, Nutritionist, and detailed history charts. |
| **Basic User** | `jane_smith` | `guest123` | Limited view, useful for testing access restrictions. |
| **Admin** | `admin_fitness` | `admin123` | Access to the Django Admin panel at `http://localhost:8000/admin`. |

### 2. Dashboard (Logged in as `john_doe`)
- **Weight History**: Visualizes the data generated by `seed.py` (shows a downward trend over 30 days).
- **Consistency Tracker**: Displays an activity heatmap based on `ActivityLog` entries.

### 3. AI Features
- **Plan Designer**: Generates personalized workout architectures using Gemini.
- **Nutritionist**: Upload food images for caloric and macro-nutrient analysis.