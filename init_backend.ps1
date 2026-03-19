# Wellman Fitness - Backend Initialization Script

$ErrorActionPreference = "Stop"

Write-Host "Initializing Django Backend..." -ForegroundColor Cyan

# 1. Detect Python
$py = "python"
if (!(Get-Command "python" -ErrorAction SilentlyContinue)) {
    if (Get-Command "py" -ErrorAction SilentlyContinue) {
        $py = "py"
    } else {
        Write-Error "Python is not installed or not in PATH. Please install Python."
        exit 1
    }
}

# 2. Setup Virtual Environment
if (!(Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Green
    & $py -m venv venv
}

$venvPy = ".\venv\Scripts\python.exe"

# 3. Install Dependencies
Write-Host "Installing Django packages..." -ForegroundColor Green
& $venvPy -m pip install django djangorestframework django-cors-headers

# 4. Create Project
if (!(Test-Path "backend")) {
    Write-Host "Creating Django project 'backend'..." -ForegroundColor Green
    & $venvPy -m django startproject backend
    if (!(Test-Path "backend")) {
        Write-Error "Failed to create 'backend' directory. Django project creation failed."
        exit 1
    }
}

# 5. Create App
if (!(Test-Path "backend\api")) {
    Write-Host "Creating Django app 'api'..." -ForegroundColor Green
    Push-Location backend
    & "..\$venvPy" manage.py startapp api
    Pop-Location
}

# 6. Configure Files
Write-Host "Configuring backend files..." -ForegroundColor Green

# --- settings.py ---
$settingsContent = @"
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = 'django-insecure-setup-key'
DEBUG = True
ALLOWED_HOSTS = []

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

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = []
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOW_ALL_ORIGINS = True
AUTH_USER_MODEL = 'api.User'
"@
Set-Content -Path "backend\backend\settings.py" -Value $settingsContent -Encoding UTF8

# --- models.py ---
$modelsContent = @"
from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ROLE_CHOICES = [('admin', 'Admin'), ('member', 'Member'), ('user', 'User')]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    membership_expires = models.DateTimeField(null=True, blank=True)
    display_name = models.CharField(max_length=100, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    avatar_seed = models.CharField(max_length=100, blank=True, null=True)
    height_cm = models.FloatField(null=True, blank=True)
    fitness_profile = models.JSONField(null=True, blank=True)
    active_plan = models.JSONField(null=True, blank=True)

class WeightLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weight_logs')
    date = models.DateTimeField(auto_now_add=True)
    weight = models.FloatField()

class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    date = models.DateField(auto_now_add=True)
"@
Set-Content -Path "backend\api\models.py" -Value $modelsContent -Encoding UTF8

# --- serializers.py ---
$serializersContent = @"
from rest_framework import serializers
from .models import User, WeightLog, ActivityLog

class WeightLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightLog
        fields = ['date', 'weight', 'user']

class UserSerializer(serializers.ModelSerializer):
    weightLogs = WeightLogSerializer(source='weight_logs', many=True, read_only=True)
    activityLogs = serializers.SerializerMethodField()
    membershipExpires = serializers.DateTimeField(source='membership_expires', required=False)
    createdAt = serializers.DateTimeField(source='date_joined', read_only=True)
    displayName = serializers.CharField(source='display_name', required=False)
    avatarSeed = serializers.CharField(source='avatar_seed', required=False)
    heightCm = serializers.FloatField(source='height_cm', required=False)
    fitnessProfile = serializers.JSONField(source='fitness_profile', required=False)
    activePlan = serializers.JSONField(source='active_plan', required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'role', 'membershipExpires', 'createdAt', 'weightLogs', 'activityLogs', 'displayName', 'avatarSeed', 'heightCm', 'fitnessProfile', 'activePlan', 'bio']
        extra_kwargs = {'password': {'write_only': True}}

    def get_activityLogs(self, obj):
        return [log.date.isoformat() for log in obj.activity_logs.all()]

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
"@
Set-Content -Path "backend\api\serializers.py" -Value $serializersContent -Encoding UTF8

# --- views.py ---
$viewsContent = @"
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from .models import User, WeightLog, ActivityLog
from .serializers import UserSerializer, WeightLogSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            expiry = timezone.now() + timedelta(days=30)
            serializer.save(membership_expires=expiry)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=True, methods=['post'])
    def record_activity(self, request, pk=None):
        user = self.get_object()
        today = timezone.now().date()
        if not ActivityLog.objects.filter(user=user, date=today).exists():
            ActivityLog.objects.create(user=user, date=today)
        return Response({'status': 'activity recorded'})

class WeightLogViewSet(viewsets.ModelViewSet):
    queryset = WeightLog.objects.all()
    serializer_class = WeightLogSerializer
"@
Set-Content -Path "backend\api\views.py" -Value $viewsContent -Encoding UTF8

# --- urls.py ---
$urlsContent = @"
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import UserViewSet, WeightLogViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'weight-logs', WeightLogViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
"@
Set-Content -Path "backend\backend\urls.py" -Value $urlsContent -Encoding UTF8

# 7. Migrations
Write-Host "Running database migrations..." -ForegroundColor Green
Push-Location backend
& "..\$venvPy" manage.py makemigrations api
& "..\$venvPy" manage.py migrate
Pop-Location

Write-Host "`nBackend setup complete!" -ForegroundColor Cyan
Write-Host "To start the server, run:" -ForegroundColor Yellow
Write-Host ".\venv\Scripts\python.exe backend\manage.py runserver" -ForegroundColor White