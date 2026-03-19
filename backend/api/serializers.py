from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    weightLogs = serializers.JSONField(source='weight_logs', required=False)
    activityLogs = serializers.JSONField(source='activity_logs', required=False)
    mealLogs = serializers.JSONField(source='meal_logs', required=False)
    postureLogs = serializers.JSONField(source='posture_logs', required=False)
    
    membershipExpires = serializers.DateTimeField(source='membership_expires', required=False)
    createdAt = serializers.DateTimeField(source='date_joined', read_only=True)
    displayName = serializers.CharField(source='display_name', required=False)
    avatarSeed = serializers.CharField(source='avatar_seed', required=False)
    heightCm = serializers.FloatField(source='height_cm', required=False)
    fitnessProfile = serializers.JSONField(source='fitness_profile', required=False)
    activePlan = serializers.JSONField(source='active_plan', required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'role', 'membershipExpires', 'createdAt', 'weightLogs', 'activityLogs', 'mealLogs', 'postureLogs', 'displayName', 'avatarSeed', 'heightCm', 'fitnessProfile', 'activePlan', 'bio']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
