from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Profile Info', {'fields': ('role', 'display_name', 'bio', 'avatar_seed', 'height_cm', 'membership_expires')}),
        ('Data Logs', {'fields': ('fitness_profile', 'active_plan', 'weight_logs', 'activity_logs', 'meal_logs', 'posture_logs')}),
    )
    list_display = ('username', 'email', 'role', 'is_staff', 'membership_expires')
    list_filter = ('role', 'is_staff', 'is_superuser', 'groups')
    search_fields = ('username', 'email', 'display_name')

admin.site.register(User, CustomUserAdmin)
