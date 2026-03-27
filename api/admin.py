from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User
import json


class CustomUserAdmin(UserAdmin):
    # Display fields in list view
    list_display = ('username', 'email', 'role', 'is_staff', 'is_premium', 'membership_expires', 'date_joined')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_premium', 'groups')
    search_fields = ('username', 'email', 'display_name')
    ordering = ('-date_joined',)
    
    # Make JSON fields readonly since they don't display well in forms
    readonly_fields = ('fitness_profile_display', 'active_plan_display', 'weight_logs_display', 
                      'activity_logs_display', 'meal_logs_display', 'posture_logs_display',
                      'date_joined', 'last_login')
    
    # Custom fieldsets for better organization
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email', 'display_name', 'bio', 'avatar_seed', 'height_cm')}),
        ('Membership', {'fields': ('role', 'is_premium', 'membership_expires', 'trial_ends_at')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Fitness Data (Read Only)', {
            'fields': ('fitness_profile_display', 'active_plan_display', 'weight_logs_display', 
                      'activity_logs_display', 'meal_logs_display', 'posture_logs_display'),
            'classes': ('collapse',)  # Collapsible section
        }),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    # Add fieldsets for creating new users
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'is_staff', 'is_superuser'),
        }),
    )
    
    # Custom display methods for JSON fields
    def fitness_profile_display(self, obj):
        if obj.fitness_profile:
            return json.dumps(obj.fitness_profile, indent=2)
        return "No data"
    fitness_profile_display.short_description = 'Fitness Profile'
    
    def active_plan_display(self, obj):
        if obj.active_plan:
            return json.dumps(obj.active_plan, indent=2)
        return "No data"
    active_plan_display.short_description = 'Active Plan'
    
    def weight_logs_display(self, obj):
        if obj.weight_logs:
            return json.dumps(obj.weight_logs, indent=2)
        return "No data"
    weight_logs_display.short_description = 'Weight Logs'
    
    def activity_logs_display(self, obj):
        if obj.activity_logs:
            return json.dumps(obj.activity_logs, indent=2)
        return "No data"
    activity_logs_display.short_description = 'Activity Logs'
    
    def meal_logs_display(self, obj):
        if obj.meal_logs:
            return json.dumps(obj.meal_logs, indent=2)
        return "No data"
    meal_logs_display.short_description = 'Meal Logs'
    
    def posture_logs_display(self, obj):
        if obj.posture_logs:
            return json.dumps(obj.posture_logs, indent=2)
        return "No data"
    posture_logs_display.short_description = 'Posture Logs'


# Register the User model with custom admin
admin.site.register(User, CustomUserAdmin)

# Customize admin site headers
admin.site.site_header = "Wellman Fitness Admin"
admin.site.site_title = "Wellman Fitness Admin Portal"
admin.site.index_title = "Welcome to Wellman Fitness Administration"
