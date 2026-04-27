from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from .models import User, GymLog
from .serializers import UserSerializer, GymLogSerializer
import os


def is_premium_user(user):
    """
    Check if a user is premium.
    A user is considered Premium if:
    - is_premium flag is True, OR
    - trial_ends_at is set and current date is before trial_ends_at
    """
    if not user:
        return False
    if user.is_premium:
        return True
    if user.trial_ends_at and user.trial_ends_at > timezone.now():
        return True
    return False

# Registration key - set via environment variable for security
# New users must provide this key to register
REGISTRATION_KEY = os.environ.get('REGISTRATION_KEY', '')

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        """Override create to ensure trial_ends_at is always set for new users."""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Set membership expiry to 30 days from now
            expiry = timezone.now() + timedelta(days=30)
            user.membership_expires = expiry
            
            # Set trial ends at to 30 days from now (free trial)
            user.trial_ends_at = expiry
            
            # Initialize new user with default/empty JSON fields
            user.weight_logs = user.weight_logs or []
            user.activity_logs = user.activity_logs or []
            user.meal_logs = user.meal_logs or []
            user.posture_logs = user.posture_logs or []
            user.fitness_profile = user.fitness_profile or None
            user.active_plan = user.active_plan or None
            
            # Set default role if not provided
            if not user.role:
                user.role = 'user'
            
            user.save()
            
            # Return serialized data
            response_serializer = self.get_serializer(user)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='register')
    def register(self, request):
        """
        Dedicated registration endpoint for new users.
        Creates a new user with default premium trial (30 days).
        """
        # Check if registration key is required and provided
        if REGISTRATION_KEY:
            provided_key = request.data.get('registration_key')
            if provided_key != REGISTRATION_KEY:
                return Response(
                    {'error': 'Registration is closed. Please contact the administrator.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Validate required fields
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username:
            return Response({'error': 'Username is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user with properly hashed password
        try:
            user = User.objects.create_user(
                username=username,
                password=password,
                role=request.data.get('role', 'user'),
                email=request.data.get('email', ''),
                display_name=request.data.get('displayName', username),
            )
            
            # Set membership expiry to 30 days from now
            expiry = timezone.now() + timedelta(days=30)
            user.membership_expires = expiry
            
            # Set trial ends at to 30 days from now (free trial)
            user.trial_ends_at = expiry
            user.is_premium = True  # Trial premium
            
            # Initialize JSON fields
            user.weight_logs = []
            user.activity_logs = []
            user.meal_logs = []
            user.posture_logs = []
            user.fitness_profile = None
            user.active_plan = None
            
            user.save()
            
            # Return serialized data (without password)
            serializer = self.get_serializer(user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'], url_path='seed')
    def seed(self, request):
        """
        Seed the database with demo accounts.
        Call this endpoint to populate the database with sample users.
        """
        import random
        
        # Clean up existing users (keep superusers)
        User.objects.filter(is_staff=False).delete()
        User.objects.filter(is_staff=True, is_superuser=True).delete()
        
        # 1. John Doe (Premium Member)
        john = User.objects.create(
            username='john_doe',
            email='john@jafitness.com',
            role='member',
            display_name='John Doe',
            bio='Determined to get back in shape! Aiming for 80kg.',
            height_cm=180,
            membership_expires=timezone.now() + timedelta(days=60),
            is_premium=True,
            trial_ends_at=timezone.now() + timedelta(days=30),
            avatar_seed='john123'
        )
        john.set_password('member123')
        
        # Add weight logs
        john.weight_logs = []
        base_weight = 85.0
        for i in range(30, -1, -2):
            date = (timezone.now() - timedelta(days=i)).isoformat()
            change = random.uniform(-0.5, 0.2)
            base_weight += change
            john.weight_logs.append({"date": date, "weight": round(base_weight, 1)})
        
        # Add activity logs
        john.activity_logs = []
        for i in range(10):
            date = (timezone.now() - timedelta(days=i)).isoformat()
            john.activity_logs.append({"date": date})
        
        # Add fitness profile
        john.fitness_profile = {
            "goal": "weight-loss",
            "intensity": "intermediate",
            "location": "gym",
            "focusAreas": ["Core", "Cardio"]
        }
        
        # Add active plan
        john.active_plan = {
            "motivation": "Consistency is key!",
            "generatedAt": (timezone.now() - timedelta(days=2)).isoformat(),
            "dailyWorkouts": [
                {"name": "Full Body Blast", "duration": "45 mins", "exercises": ["Pushups", "Squats", "Lunges", "Plank"]},
                {"name": "Cardio & Core", "duration": "30 mins", "exercises": ["Running", "Crunches", "Leg Raises"]}
            ]
        }
        john.save()
        
        # 2. Admin User
        admin_user = User.objects.create(
            username='admin_jafitness',
            email='admin@jafitness.com',
            role='admin',
            display_name='System Admin',
            bio='Administrator account',
            is_staff=True,
            height_cm=180,
            is_superuser=True,
            is_premium=True,
            trial_ends_at=timezone.now() + timedelta(days=30),
            avatar_seed='admin123'
        )
        admin_user.set_password('admin123')
        admin_user.save()
        
        # 3. Jane Smith (Expired Trial)
        jane = User.objects.create(
            username='jane_smith',
            email='jane@jafitness.com',
            role='user',
            display_name='Jane Smith',
            bio='Just starting out with fitness.',
            height_cm=165,
            membership_expires=timezone.now() - timedelta(days=1),
            is_premium=False,
            trial_ends_at=timezone.now() - timedelta(days=1),
            avatar_seed='jane456'
        )
        jane.set_password('guest123')
        
        # Activity logs for jane
        jane.activity_logs = []
        for i in range(30):
            if random.random() > 0.7:
                date = (timezone.now() - timedelta(days=i)).isoformat()
                jane.activity_logs.append({"date": date})
        
        jane.weight_logs = [
            {"date": (timezone.now() - timedelta(days=60)).isoformat(), "weight": 65.0},
            {"date": (timezone.now() - timedelta(days=30)).isoformat(), "weight": 65.5},
            {"date": (timezone.now() - timedelta(days=5)).isoformat(), "weight": 66.0},
            {"date": timezone.now().isoformat(), "weight": 66.2}
        ]
        
        jane.fitness_profile = {
            "goal": "muscle-gain",
            "intensity": "beginner",
            "location": "home",
            "focusAreas": ["Legs", "Glutes"]
        }
        jane.save()
        
        return Response({
            'message': 'Database seeded successfully!', 
            'users': ['john_doe (member123)', 'admin_jafitness (admin123)', 'jane_smith (guest123)']
        })

    @action(detail=True, methods=['post'])
    def record_activity(self, request, pk=None):
        user = self.get_object()
        today = timezone.now().date().isoformat()
        logs = user.activity_logs or []
        
        # Check if we have an entry starting with today's date
        if not any(log.get('date', '').startswith(today) for log in logs):
            logs.append({'date': timezone.now().isoformat()})
            user.activity_logs = logs
            user.save()
            
        return Response({'status': 'activity recorded'})

    @action(detail=True, methods=['post'])
    def log_workout(self, request, pk=None):
        """
        Manually log a workout entry.
        Accepts: { "date": "YYYY-MM-DD", "workoutName": "string", "duration": "string", "exercises": [] }
        """
        user = self.get_object()
        date = request.data.get('date', timezone.now().date().isoformat())
        workout_name = request.data.get('workoutName', '')
        duration = request.data.get('duration', '')
        exercises = request.data.get('exercises', [])
        
        workout_entry = {
            'date': date,
            'workoutName': workout_name,
            'duration': duration,
            'exercises': exercises
        }
        
        logs = user.activity_logs or []
        logs.append(workout_entry)
        user.activity_logs = logs
        user.save()
        
        return Response({'status': 'workout logged', 'workout': workout_entry})

    @action(detail=True, methods=['post'])
    def log_meal(self, request, pk=None):
        """
        Manually log a meal with macros.
        Accepts: { "date": "YYYY-MM-DD", "mealName": "string", "calories": int, "protein": int, "carbs": int, "fat": int }
        """
        user = self.get_object()
        date = request.data.get('date', timezone.now().date().isoformat())
        meal_name = request.data.get('mealName', '')
        calories = request.data.get('calories', 0)
        protein = request.data.get('protein', 0)
        carbs = request.data.get('carbs', 0)
        fat = request.data.get('fat', 0)

        meal_entry = {
            'date': date,
            'mealName': meal_name,
            'calories': calories,
            'protein': protein,
            'carbs': carbs,
            'fat': fat
        }

        logs = user.meal_logs or []
        logs.append(meal_entry)
        user.meal_logs = logs
        user.save()

        return Response({'status': 'meal logged', 'meal': meal_entry})

class WeightLogViewSet(viewsets.ViewSet):
    def list(self, request):
        if request.user.is_authenticated:
            return Response(request.user.weight_logs)
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    def create(self, request):
        if request.user.is_authenticated:
            user = request.user
            user.weight_logs.append(request.data)
            user.save()
            return Response(request.data, status=status.HTTP_201_CREATED)
        return Response(status=status.HTTP_401_UNAUTHORIZED)


class BMIEstimator:
    def __init__(self):
        import google.generativeai as genai
        import os
        
        # Initialize Gemini AI client
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def estimate_bmi(self, image_data):
        try:
            import google.generativeai as genai
            import base64
            
            # Convert image data to base64 for Gemini
            if isinstance(image_data, bytes):
                image_base64 = base64.b64encode(image_data).decode('utf-6')
            else:
                image_base64 = image_data
            
            # Create prompt for BMI estimation
            prompt = """
            Analyze this full body photo to estimate body metrics using computer vision principles.
            Return ONLY valid JSON with this exact structure:
            {
              "estimatedHeightCm": number,
              "estimatedWeightKg": number,
              "bmi": number,
              "notes": "string (brief observation about body composition)"
            }
            
            Important:
            - estimatedHeightCm should be in centimeters (typical range: 150-200)
            - estimatedWeightKg should be in kilograms (typical range: 40-120)
            - bmi should be calculated as weight / (height_in_meters ^ 2)
            - notes should be a brief, professional observation
            """
            
            # Prepare image for Gemini
            image_part = {
                "mime_type": "image/jpeg",
                "data": image_base64
            }
            
            # Generate content with Gemini
            response = self.model.generate_content([prompt, image_part])
            
            # Parse JSON response
            import json
            response_text = response.text
            
            # Clean markdown code blocks if present
            cleaned_text = response_text.replace('```json', '').replace('```', '').strip()
            
            result = json.loads(cleaned_text)
            
            # Validate required fields
            required_fields = ['estimatedHeightCm', 'estimatedWeightKg', 'bmi', 'notes']
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"Missing required field: {field}")
            
            return result

        except Exception as e:
            raise Exception(f"BMI estimation failed: {str(e)}")


# Global BMI estimator instance
bmi_estimator = BMIEstimator()


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def estimate_bmi(request):
    try:
        if 'image' not in request.FILES:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

        image_file = request.FILES['image']
        image_data = image_file.read()

        result = bmi_estimator.estimate_bmi(image_data)

        return Response({
            'data': result,
            'success': True
        })

    except Exception as e:
        return Response({
            'error': str(e),
            'success': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GymLogViewSet(viewsets.ModelViewSet):
    queryset = GymLog.objects.all()
    serializer_class = GymLogSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        logs = GymLog.objects.filter(time_out__isnull=True).select_related('user')
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def db_status(self, request):
        """Check database table status and migration information"""
        from django.db import connection
        
        status_info = {
            'migrations': [],
            'tables': {},
            'gym_log_table_exists': False,
            'gym_log_count': 0
        }
        
        try:
            # Check applied migrations
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT app, name, applied
                    FROM django_migrations
                    WHERE app = 'api'
                    ORDER BY applied;
                """)
                migrations = cursor.fetchall()
                
                for app, name, applied in migrations:
                    status_info['migrations'].append({
                        'name': f'{app}.{name}',
                        'applied': applied
                    })
            
            # Check if gym_logs table exists — support Postgres and SQLite
            if connection.vendor == 'sqlite':
                # SQLite: use sqlite_master and PRAGMA table_info
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT name FROM sqlite_master
                        WHERE type='table' AND name='api_gymlog';
                    """)
                    status_info['gym_log_table_exists'] = cursor.fetchone() is not None

                if status_info['gym_log_table_exists']:
                    status_info['gym_log_count'] = GymLog.objects.count()
                    with connection.cursor() as cursor:
                        cursor.execute("PRAGMA table_info('api_gymlog');")
                        # PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
                        columns = cursor.fetchall()
                        status_info['tables']['api_gymlog'] = [
                            {
                                'name': col[1],
                                'type': col[2],
                                'nullable': not (col[3] == 1)
                            }
                            for col in columns
                        ]
            else:
                # Postgres / other DBs supporting information_schema
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT 1
                            FROM information_schema.tables
                            WHERE table_name = 'api_gymlog'
                        );
                    """)
                    status_info['gym_log_table_exists'] = cursor.fetchone()[0]

                # If table exists, get count and structure
                if status_info['gym_log_table_exists']:
                    status_info['gym_log_count'] = GymLog.objects.count()
                    
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            SELECT column_name, data_type, is_nullable
                            FROM information_schema.columns
                            WHERE table_name = 'api_gymlog'
                            ORDER BY ordinal_position;
                        """)
                        columns = cursor.fetchall()
                        
                        status_info['tables']['api_gymlog'] = [
                            {
                                'name': col_name,
                                'type': data_type,
                                'nullable': is_nullable == 'YES'
                            }
                            for col_name, data_type, is_nullable in columns
                        ]
            
            return Response(status_info)
            
        except Exception as e:
            return Response({
                'error': str(e),
                'status': 'Database check failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def time_in(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        today = timezone.now().date()
        existing = GymLog.objects.filter(user=user, time_out__isnull=True, date=today).first()
        if existing:
            return Response({'error': 'User already timed in'}, status=status.HTTP_400_BAD_REQUEST)
        
        gym_log = GymLog.objects.create(
            user=user,
            time_in=timezone.now(),
            date=today
        )
        serializer = self.get_serializer(gym_log)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def time_out(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        today = timezone.now().date()
        gym_log = GymLog.objects.filter(user_id=user_id, time_out__isnull=True, date=today).first()
        if not gym_log:
            return Response({'error': 'No active time-in found'}, status=status.HTTP_404_NOT_FOUND)
        
        gym_log.time_out = timezone.now()
        gym_log.save()
        serializer = self.get_serializer(gym_log)
        return Response(serializer.data)
