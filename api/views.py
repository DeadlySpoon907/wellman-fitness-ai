from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from .models import User
from .serializers import UserSerializer
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

    @action(detail=False, methods=['post'])
    def register(self, request):
        # Check if registration key is required and provided
        if REGISTRATION_KEY:
            provided_key = request.data.get('registration_key')
            if provided_key != REGISTRATION_KEY:
                return Response(
                    {'error': 'Registration is closed. Please contact the administrator.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
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
        today = timezone.now().date().isoformat()
        logs = user.activity_logs or []
        
        # Check if we have an entry starting with today's date
        if not any(log.get('date', '').startswith(today) for log in logs):
            logs.append({'date': timezone.now().isoformat()})
            user.activity_logs = logs
            user.save()
            
        return Response({'status': 'activity recorded'})

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
        pass  # No model loading needed for mock implementation

    def estimate_bmi(self, image_data):
        try:
            # For now, return mock BMI estimation data
            # TODO: Implement actual TensorFlow pose detection when compatible versions are available
            import random

            # Mock estimation based on image size (rough approximation)
            height_cm = random.uniform(160, 190)
            weight_kg = random.uniform(50, 90)
            bmi = weight_kg / ((height_cm / 100) ** 2)

            return {
                'heightCm': round(height_cm, 1),
                'weightKg': round(weight_kg, 1),
                'bmi': round(bmi, 1),
                'confidence': 0.5,  # Lower confidence for mock data
                'note': 'Mock estimation - TensorFlow integration pending'
            }

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
