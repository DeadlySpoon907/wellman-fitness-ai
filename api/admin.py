from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, GymLog
from django.utils import timezone
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


@admin.register(GymLog)
class GymLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'get_username', 'time_in', 'time_out', 'date', 'duration', 'is_active')
    list_filter = ('date', 'user__role', 'time_out')  # Added time_out filter to see active vs completed
    search_fields = ('user__username', 'user__email')
    raw_id_fields = ('user',)
    ordering = ('-time_in',)
    readonly_fields = ('id', 'date', 'duration')
    list_per_page = 50  # Show more records per page

    def get_username(self, obj):
        return obj.user.username
    get_username.short_description = 'Username'
    get_username.admin_order_field = 'user__username'

    def duration(self, obj):
        if obj.time_out and obj.time_in:
            duration = obj.time_out - obj.time_in
            hours = duration.seconds // 3600
            minutes = (duration.seconds % 3600) // 60
            return f"{hours}h {minutes}m"
        return "Active"
    duration.short_description = 'Duration'

    def is_active(self, obj):
        return obj.time_out is None
    is_active.boolean = True
    is_active.short_description = 'Active Session'

    # Add custom actions
    actions = ['mark_completed', 'export_selected']

    def mark_completed(self, request, queryset):
        updated = queryset.filter(time_out__isnull=True).update(time_out=timezone.now())
        self.message_user(request, f'{updated} sessions marked as completed.')
    mark_completed.short_description = "Mark selected sessions as completed"

    def export_selected(self, request, queryset):
        # Simple export action
        self.message_user(request, f'Export functionality for {queryset.count()} records would go here.')
    export_selected.short_description = "Export selected records"


# Customize admin site headers
admin.site.site_header = "Wellman Fitness Admin"
admin.site.site_title = "Wellman Fitness Admin Portal"
admin.site.index_title = "Welcome to Wellman Fitness Administration"

# Add custom admin index view with statistics
from django.contrib.admin.views.main import ChangeList
from django.db.models import Count, Q

class CustomAdminSite(admin.AdminSite):
    def index(self, request, extra_context=None):
        # Get some basic statistics
        user_stats = {
            'total_users': User.objects.count(),
            'premium_users': User.objects.filter(is_premium=True).count(),
            'active_users': User.objects.filter(is_active=True).count(),
        }
        
        gym_stats = {
            'total_sessions': GymLog.objects.count(),
            'active_sessions': GymLog.objects.filter(time_out__isnull=True).count(),
            'completed_sessions': GymLog.objects.filter(time_out__isnull=False).count(),
        }
        
        extra_context = extra_context or {}
        extra_context.update({
            'user_stats': user_stats,
            'gym_stats': gym_stats,
        })
        
        return super().index(request, extra_context)

# Create custom admin site
custom_admin_site = CustomAdminSite(name='custom_admin')

# Register models with custom admin site
custom_admin_site.register(User, CustomUserAdmin)
custom_admin_site.register(GymLog, GymLogAdmin)

# Also register with default admin site (already done above)
# admin.site.register(User, CustomUserAdmin)
# admin.site.register(GymLog, GymLogAdmin)
