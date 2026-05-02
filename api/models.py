from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models import Q
import uuid

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ROLE_CHOICES = [('admin', 'Admin'), ('member', 'Member'), ('user', 'User')]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user', db_index=True)
    membership_expires = models.DateTimeField(null=True, blank=True, db_index=True)
    display_name = models.CharField(max_length=100, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    avatar_seed = models.CharField(max_length=100, blank=True, null=True)
    avatar_url = models.TextField(blank=True, null=True)
    height_cm = models.FloatField(null=True, blank=True)
    estimated_body_type = models.CharField(max_length=50, blank=True, null=True)
    is_premium = models.BooleanField(default=False, db_index=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True, db_index=True)

    # Structured Data
    # { "goal": str, "intensity": str, "location": str, "focusAreas": [str] }
    fitness_profile = models.JSONField(null=True, blank=True)
    # { "motivation": str, "generatedAt": str, "startDate": str, "endDate": str, 
    #   "sessions": [{ "id": str, "day": int, "week": int, "dayOfWeek": str, 
    #                  "title": str, "focus": str, 
    #                  "exercises": [{ "name": str, "sets": int, "reps": int, "restSeconds": int }], 
    #                  "duration": str, "completed": bool }], 
    #   "nutrition": { "protein": str, "carbs": str, "fats": str } }
    active_plan = models.JSONField(null=True, blank=True)
    # { "meals": [{ "name": str, "foods": [str], "calories": int, "protein": int, "carbs": int, "fat": int }], 
    #   "hydration": str, "notes": str }
    diet_plan = models.JSONField(null=True, blank=True)

    # Activity & Health Logs
    # [{ "date": str, "weight": float }] - weight in kg, range 30-200
    weight_logs = models.JSONField(default=list, blank=True)
    # [{ "date": str }]
    activity_logs = models.JSONField(default=list, blank=True)
    # [{ "date": str, "mealName": str, "calories": int, "protein": int, "carbs": int, "fat": int }]
    meal_logs = models.JSONField(default=list, blank=True)
    # [{ "date": str, "score": int, "findings": [str], "recommendations": [str] }]
    posture_logs = models.JSONField(default=list, blank=True)

    class Meta:
        # Add GIN index for JSON fields for faster queries (PostgreSQL only)
        indexes = [
            models.Index(fields=['fitness_profile'], name='idx_fitness_profile'),
            models.Index(fields=['active_plan'], name='idx_active_plan'),
            models.Index(fields=['diet_plan'], name='idx_diet_plan'),
            models.Index(fields=['weight_logs'], name='idx_weight_logs'),
            models.Index(fields=['activity_logs'], name='idx_activity_logs'),
            models.Index(fields=['meal_logs'], name='idx_meal_logs'),
            models.Index(fields=['posture_logs'], name='idx_posture_logs'),
        ]

    def __str__(self):
        return f"{self.username} ({self.role})"


class GymLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gym_logs', db_index=True)
    time_in = models.DateTimeField()
    time_out = models.DateTimeField(null=True, blank=True)
    date = models.DateField(db_index=True)

    class Meta:
        ordering = ['-time_in']
        # Note: date is denormalized from time_in for faster date-based queries

    def __str__(self):
        return f"{self.user.username} - {self.date}"
