from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import UserViewSet, WeightLogViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'weight-logs', WeightLogViewSet, basename='weight-log')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
