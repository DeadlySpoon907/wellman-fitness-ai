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

    # Structured Data
    # { "goal": str, "intensity": str, "location": str, "focusAreas": [str] }
    fitness_profile = models.JSONField(null=True, blank=True)
    # { "motivation": str, "generatedAt": str, "dailyWorkouts": [...] }
    active_plan = models.JSONField(null=True, blank=True)

    # Activity & Health Logs
    # [{ "date": str, "weight": float }]
    weight_logs = models.JSONField(default=list, blank=True)
    # [{ "date": str }]
    activity_logs = models.JSONField(default=list, blank=True)
    # [{ "date": str, "mealName": str, "calories": int, "protein": int, "carbs": int, "fat": int }]
    meal_logs = models.JSONField(default=list, blank=True)
    # [{ "date": str, "score": int, "findings": [str], "recommendations": [str] }]
    posture_logs = models.JSONField(default=list, blank=True)
