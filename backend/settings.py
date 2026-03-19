import os
import urllib.parse
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env in backend/ for local development (ignored in production)
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-setup-key")
DEBUG = os.getenv("DEBUG", "True").lower() in ("1", "true", "yes")

# Allow Railway and Vercel domains in production
ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "").split(",") if h.strip()]
if not ALLOWED_HOSTS and not DEBUG:
    # Default production hosts
    ALLOWED_HOSTS = ['*']  # Railway handles host validation

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

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    url = urllib.parse.urlparse(DATABASE_URL)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql" if url.scheme.startswith("postgres") else "django.db.backends.sqlite3",
            "NAME": url.path[1:].strip() if url.path else "",
            "USER": url.username or "",
            "PASSWORD": url.password or "",
            "HOST": url.hostname or "",
            "PORT": url.port,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
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

# CORS Configuration - Allow all origins for development (can be restricted in production)
CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL_ORIGINS", "True").lower() in ("1", "true", "yes")

# Explicitly whitelist Vercel frontend domains
CORS_ALLOWED_ORIGINS = [
    "https://wellman-fitness-rkf9l77au-deadlyspoon907s-projects.vercel.app",
    "https://wellman-fitness-ai.vercel.app",
    "https://wellman-fitness-ai-*.vercel.app",
]

# Allow credentials (cookies/sessions) for login
CORS_ALLOW_CREDENTIALS = True

# CSRF trusted origins for POST requests to /api/login/
CSRF_TRUSTED_ORIGINS = [
    "https://wellman-fitness-rkf9l77au-deadlyspoon907s-projects.vercel.app",
    "https://wellman-fitness-ai.vercel.app",
    "https://wellman-fitness-ai-*.vercel.app",
]

AUTH_USER_MODEL = 'api.User'
