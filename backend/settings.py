import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env in backend/ for local development (ignored in production)
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-setup-key")
DEBUG = os.getenv("DEBUG", "True").lower() in ("1", "true", "yes")

# Allow Railway and Vercel domains in production
ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "").split(",") if h.strip()]
if not ALLOWED_HOSTS and not DEBUG:
    # Default production hosts - Railway and Vercel domains
    ALLOWED_HOSTS = [
        'wellman-backend-production.up.railway.app',
        'wellman-fitness-version-136.vercel.app',
        'wellman-fitness-version-136-iids0o4bc-deadlyspoon907s-projects.vercel.app',
    ]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# Database - PostgreSQL only via dj-database-url
# If DATABASE_URL is not set, the app will fail to start (intentional)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required. Please set your PostgreSQL connection string.")

DATABASES = {
    'default': dj_database_url.config(
        default=DATABASE_URL,
        conn_max_age=600
    )
}

AUTH_PASSWORD_VALIDATORS = []
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS Configuration - Allow ALL origins for development/production
CORS_ALLOW_ALL_ORIGINS = True

# Use regex patterns for any Vercel deployment with wellman-fitness
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*wellman-fitness.*\.vercel\.app$",
    r"^https://.*\.up\.railway\.app$",
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
]

# Allow credentials (cookies/sessions) for login
CORS_ALLOW_CREDENTIALS = True

# CSRF trusted origins for POST requests - specific domains
CSRF_TRUSTED_ORIGINS = [
    'https://wellman-fitness-version-136-a6yibchix-deadlyspoon907s-projects.vercel.app',
    'https://wellman-backend-production.up.railway.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

AUTH_USER_MODEL = 'api.User'
