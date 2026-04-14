from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import UserViewSet, WeightLogViewSet, estimate_bmi, GymLogViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'weight-logs', WeightLogViewSet, basename='weight-log')
router.register(r'gym-logs', GymLogViewSet, basename='gym-log')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/estimate/', estimate_bmi, name='estimate_bmi'),
]
