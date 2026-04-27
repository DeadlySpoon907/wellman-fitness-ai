from rest_framework import serializers
from .models import User, GymLog

class UserSerializer(serializers.ModelSerializer):
    weightLogs = serializers.JSONField(source='weight_logs', required=False)
    activityLogs = serializers.JSONField(source='activity_logs', required=False)
    mealLogs = serializers.JSONField(source='meal_logs', required=False)
    postureLogs = serializers.JSONField(source='posture_logs', required=False)

    membershipExpires = serializers.DateTimeField(source='membership_expires', required=False, allow_null=True)
    trialEndsAt = serializers.DateTimeField(source='trial_ends_at', required=False, allow_null=True)
    isPremium = serializers.BooleanField(source='is_premium', required=False)
    createdAt = serializers.DateTimeField(source='date_joined', read_only=True)
    displayName = serializers.CharField(source='display_name', required=False, allow_null=True, allow_blank=True)
    avatarSeed = serializers.CharField(source='avatar_seed', required=False, allow_null=True, allow_blank=True)
    avatarUrl = serializers.CharField(source='avatar_url', required=False, allow_null=True, allow_blank=True)
    heightCm = serializers.FloatField(source='height_cm', required=False, allow_null=True)
    fitnessProfile = serializers.JSONField(source='fitness_profile', required=False, allow_null=True)
    activePlan = serializers.JSONField(source='active_plan', required=False, allow_null=True)
    dietPlan = serializers.JSONField(source='diet_plan', required=False, allow_null=True)
    estimatedBodyType = serializers.CharField(source='estimated_body_type', required=False, allow_null=True, allow_blank=True)
    currentPassword = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'role', 'membershipExpires', 'trialEndsAt', 'isPremium', 'createdAt', 'weightLogs', 'activityLogs', 'mealLogs', 'postureLogs', 'displayName', 'avatarSeed', 'avatarUrl', 'heightCm', 'fitnessProfile', 'activePlan', 'dietPlan', 'estimatedBodyType', 'currentPassword', 'bio']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        current_password = validated_data.pop('currentPassword', None)
        new_password = validated_data.pop('password', None)
        if new_password is not None:
            if not current_password:
                raise serializers.ValidationError({'currentPassword': 'Current password is required to change password.'})
            if not instance.check_password(current_password):
                raise serializers.ValidationError({'currentPassword': 'Current password is incorrect.'})
            instance.set_password(new_password)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class GymLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    userId = serializers.UUIDField(source='user.id', read_only=True)

    class Meta:
        model = GymLog
        fields = ['id', 'user', 'userId', 'username', 'time_in', 'time_out', 'date']
