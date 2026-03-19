# Backend Setup & Architecture Guide

This guide explains how to set up, run, and develop the Django REST API backend for Wellman Fitness AI.

## 📋 Prerequisites

- **Python 3.10+**
- **pip** (Python package manager)
- **PostgreSQL** (optional, for production)
- **Google Gemini API Key** (for AI features)

---

## ⚡ Quick Setup

### Automated Setup (Recommended)

1. **Run the setup script** from the project root:
   ```powershell
   .\setup.ps1
   ```
   This creates a Python virtual environment and installs all dependencies.

2. **Configure environment**:
   Create `.env` file in `backend/` directory:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   DEBUG=True
   SECRET_KEY=your-django-secret-key
   DATABASE_URL=sqlite:///db.sqlite3
   ALLOWED_HOSTS=localhost,127.0.0.1
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Initialize database**:
   ```bash
   cd backend
   python manage.py migrate
   python manage.py createsuperuser
   ```

4. **Start the server**:
   ```bash
   python manage.py runserver
   ```
   API running at `http://localhost:8000/api/`

---

## 📦 Dependencies Overview

### Core Framework
- **Django 5.0+** - Web framework
- **djangorestframework 3.14.0+** - REST API toolkit
- **django-cors-headers 4.3.0+** - Cross-origin support
- **django-filter 24.1+** - Advanced filtering

### Machine Learning & Computer Vision
- **tensorflow 2.13.0+** - Deep learning framework
- **opencv-python 4.8.0+** - Computer vision library
- **numpy 1.24.0+** - Numerical computing
- **scikit-learn 1.3.0+** - ML algorithms
- **pillow 10.0.0+** - Image processing

### AI & APIs
- **google-generativeai 0.3.0+** - Gemini API
- **requests 2.31.0+** - HTTP library

### Database
- **psycopg2-binary 2.9.9+** - PostgreSQL adapter
- **sqlparse 0.4.4+** - SQL parsing

### Production & Deployment
- **gunicorn 21.2.0+** - WSGI server
- **whitenoise 6.6.0+** - Static files serving

### Async & Caching
- **celery 5.3.0+** - Task queue
- **redis 5.0.0+** - Cache/broker

### Testing & Utilities
- **pytest 7.4.0+** - Testing framework
- **pytest-django 4.7.0+** - Django testing
- **python-dotenv 1.0.0+** - Environment variables

---

## 🐍 Virtual Environment Setup

### Create Virtual Environment
```bash
# From project root
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activate (Windows CMD)
.\venv\Scripts\activate.bat

# Activate (Mac/Linux)
source venv/bin/activate
```

### Install Dependencies
```bash
# Upgrade pip
python -m pip install --upgrade pip setuptools wheel

# Install from requirements.txt
pip install -r requirements.txt
```

---

## 🏗️ Project Structure

```
backend/
├── manage.py                 # Django management utility
├── db.sqlite3               # SQLite database (development)
├── seed.py                  # Database seeding script
├── requirements.txt         # Python dependencies
│
├── backend/                 # Django configuration
│   ├── __init__.py
│   ├── settings.py         # Main configuration
│   ├── urls.py             # URL routing
│   ├── asgi.py             # ASGI config (async)
│   └── wsgi.py             # WSGI config (production)
│
├── api/                     # REST API application
│   ├── models.py           # Database models
│   ├── views.py            # API views & endpoints
│   ├── serializers.py      # Data serialization
│   ├── urls.py             # API routes
│   ├── tests.py            # Unit tests
│   ├── admin.py            # Admin configuration
│   ├── apps.py             # App configuration
│   │
│   └── migrations/         # Database migrations
│       ├── 0001_initial.py
│       └── ...
│
└── __pycache__/            # Python cache
```

---

## 📊 Database Models

### User Model
```python
class User(AbstractUser):
    display_name = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    avatar_seed = models.CharField(max_length=50, blank=True)
    membership_expires = models.DateTimeField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    fitness_profile = models.JSONField(default=dict, blank=True)
```

### Fitness Data Models
```python
class WeightLog(models.Model):
    user = models.ForeignKey(User, ...)
    weight = models.FloatField()
    date = models.DateTimeField(auto_now_add=True)

class FitnessPlan(models.Model):
    user = models.OneToOneField(User, ...)
    motivation = models.TextField()
    plan_data = models.JSONField()
    generated_at = models.DateTimeField(auto_now_add=True)

class ActivityLog(models.Model):
    user = models.ForeignKey(User, ...)
    activity = models.CharField(max_length=100)
    date = models.DateField(auto_now_add=True)

class MealLog(models.Model):
    user = models.ForeignKey(User, ...)
    meal_name = models.CharField(max_length=100)
    calories = models.IntegerField()
    protein = models.IntegerField()
    carbs = models.IntegerField()
    fat = models.IntegerField()
    date = models.DateTimeField(auto_now_add=True)

class PostureLog(models.Model):
    user = models.ForeignKey(User, ...)
    score = models.IntegerField()
    findings = models.JSONField()
    recommendations = models.JSONField()
    date = models.DateTimeField(auto_now_add=True)
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | User login |
| POST | `/api/auth/logout/` | User logout |
| POST | `/api/auth/register/` | User registration |
| POST | `/api/auth/refresh/` | Refresh auth token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/` | List users (admin) |
| GET | `/api/users/{id}/` | User details |
| PUT | `/api/users/{id}/` | Update user |
| DELETE | `/api/users/{id}/` | Delete user |

### Weight Tracking
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/weight-logs/` | List weight logs |
| POST | `/api/weight-logs/` | Create weight log |
| GET | `/api/weight-logs/{id}/` | Weight log details |
| DELETE | `/api/weight-logs/{id}/` | Delete weight log |

### Fitness Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fitness-plans/` | List plans |
| POST | `/api/fitness-plans/` | Create/generate plan |
| GET | `/api/fitness-plans/{id}/` | Plan details |
| PUT | `/api/fitness-plans/{id}/` | Update plan |

### Activity Logging
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activity-logs/` | List activities |
| POST | `/api/activity-logs/` | Log activity |
| GET | `/api/activity-logs/{id}/` | Activity details |

### Meal Tracking
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meal-logs/` | List meals |
| POST | `/api/meal-logs/` | Log meal |
| GET | `/api/meal-logs/{id}/` | Meal details |
| PUT | `/api/meal-logs/{id}/` | Update meal |

### Posture Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posture-logs/` | List posture logs |
| POST | `/api/posture-logs/` | Analyze posture |
| GET | `/api/posture-logs/{id}/` | Posture details |

### AI Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate-fitness-plan/` | AI plan generation |
| POST | `/api/analyze-meal/` | Meal image analysis |
| POST | `/api/check-posture/` | Posture image analysis |

---

## 🗄️ Database Management

### Initial Setup
```bash
cd backend

# Create migrations for changes
python manage.py makemigrations api

# Apply migrations to database
python manage.py migrate

# Create admin user
python manage.py createsuperuser
# Username: admin_fitness
# Password: admin123
```

### Seed Database with Test Data
```bash
python seed.py
```

This creates:
- Test users (john_doe, admin_fitness)
- Sample weight logs
- Sample fitness plans
- Sample meal logs

### Database Operations
```bash
# Show migration status
python manage.py showmigrations

# Create empty migration
python manage.py makemigrations api --empty api --name description

# Reset specific app (CAUTION - deletes data)
python manage.py migrate api zero
python manage.py migrate api

# Access Django shell
python manage.py shell
```

---

## ⚙️ Configuration (settings.py)

### Key Settings

```python
# Installed apps
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'rest_framework',
    'corsheaders',
    'api',
]

# Middleware (order matters)
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    ...
]

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Environment Variables
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv('GEMINI_API_KEY')
DEBUG = os.getenv('DEBUG', 'False') == 'True'
```

---

## 🧪 Testing

### Run Tests
```bash
# Run all tests
pytest

# Run specific app tests
pytest api/

# Run specific test file
pytest api/tests.py

# Run with verbose output
pytest -v

# Run with coverage
pip install pytest-cov
pytest --cov=api
```

---

## 🚀 Running the Server

### Development
```bash
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run development server
python manage.py runserver

# Run on specific port
python manage.py runserver 8080

# Run on all interfaces
python manage.py runserver 0.0.0.0:8000
```

### Production
```bash
# Using gunicorn
gunicorn backend.wsgi:application --bind 0.0.0.0:8000

# With worker processes
gunicorn backend.wsgi:application --workers 4 --bind 0.0.0.0:8000
```

---

## 🔒 Security Checklist

- [ ] Set `DEBUG=False` in production
- [ ] Update `SECRET_KEY` to a secure random value
- [ ] Configure `ALLOWED_HOSTS` with your domain
- [ ] Use HTTPS in production
- [ ] Set secure database credentials
- [ ] Enable CORS only for trusted origins
- [ ] Use environment variables for secrets
- [ ] Regularly update dependencies: `pip install --upgrade -r requirements.txt`

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows - Find process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Migration Errors
```bash
# Reset migrations (CAUTION - deletes data)
rm api/migrations/0*.py
python manage.py migrate api zero
python manage.py makemigrations api
python manage.py migrate
```

### Permission Denied
```bash
# Fix file permissions
chmod -R 755 backend/
```

### Database Locked
```bash
# SQLite lock issue - restart server
# Delete db.sqlite3 to reset (dev only)
rm db.sqlite3
python manage.py migrate
```

---

## 📚 Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Google Gemini API](https://ai.google.dev/)
- [TensorFlow Documentation](https://www.tensorflow.org/)
- [OpenCV Documentation](https://docs.opencv.org/)

---

## 📝 Development Workflow

1. **Create/modify models** in `api/models.py`
2. **Create migrations**: `python manage.py makemigrations api`
3. **Apply migrations**: `python manage.py migrate`
4. **Create serializers** in `api/serializers.py`
5. **Create views** in `api/views.py`
6. **Register URLs** in `api/urls.py` and `backend/urls.py`
7. **Test endpoints** with Postman or curl
8. **Write tests** in `api/tests.py`
9. **Update documentation**