from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from .models import User
from .serializers import UserSerializer

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
