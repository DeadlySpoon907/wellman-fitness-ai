import os
import sys
import django
import random
from datetime import timedelta
from django.utils import timezone

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import GymLog

User = get_user_model()

def generate_weight_logs(days=60, start_weight=80.0, trend='down'):
    """Generate realistic weight logs with optional trend."""
    logs = []
    weight = start_weight
    for i in range(days, -1, -1):
        date = (timezone.now() - timedelta(days=i)).isoformat()
        if trend == 'down':
            change = random.uniform(-0.4, 0.2)
        elif trend == 'up':
            change = random.uniform(-0.2, 0.4)
        else:  # stable
            change = random.uniform(-0.2, 0.2)
        weight += change
        logs.append({"date": date, "weight": round(weight, 1)})
    return logs

def generate_activity_logs(days=60, frequency=0.6):
    """Generate activity logs with specified frequency."""
    logs = []
    for i in range(days):
        if random.random() < frequency:
            date = (timezone.now() - timedelta(days=i)).isoformat()
            logs.append({"date": date})
    return logs

def generate_meal_logs(days=7, meals_per_day=3):
    """Generate meal logs for specified days."""
    logs = []
    meal_options = [
        ("Oatmeal & Berries", 300, 10, 50, 6),
        ("Grilled Chicken Salad", 450, 40, 15, 20),
        ("Salmon with Quinoa", 550, 35, 45, 22),
        ("Greek Yogurt Parfait", 250, 15, 30, 5),
        ("Steak & Veggies", 600, 50, 10, 35),
        ("Protein Shake", 200, 30, 15, 3),
        ("Turkey Sandwich", 400, 25, 40, 12),
        ("Vegetable Stir Fry", 350, 15, 45, 10),
        ("Egg White Omelette", 180, 20, 5, 8),
        ("Fruit Smoothie", 220, 8, 45, 2)
    ]
    for i in range(days):
        for _ in range(random.randint(2, meals_per_day)):
            name, cal, prot, carb, fat = random.choice(meal_options)
            var = random.uniform(0.9, 1.1)
            logs.append({
                "date": (timezone.now() - timedelta(days=i, hours=random.randint(0, 12))).isoformat(),
                "mealName": name,
                "calories": int(cal * var),
                "protein": int(prot * var),
                "carbs": int(carb * var),
                "fat": int(fat * var)
            })
    logs.sort(key=lambda x: x['date'])
    return logs

def generate_posture_logs(count=3):
    """Generate posture analysis logs."""
    findings_options = [
        ["Forward head posture", "Rounded shoulders"],
        ["Anterior pelvic tilt", "Lower back arch"],
        ["Uneven shoulders", "Head tilt"],
        ["Good posture", "Minor adjustments needed"],
        ["Kyphosis", "Forward lean"]
    ]
    recommendations_options = [
        ["Chin tucks", "Doorway stretches", "Wall angels"],
        ["Hip flexor stretches", "Glute bridges", "Plank holds"],
        ["Shoulder blade squeezes", "Neck stretches", "Upper back foam rolling"],
        ["Maintain current posture", "Regular breaks", "Ergonomic setup"],
        ["Thoracic extensions", "Cat-cow stretches", "Seated rows"]
    ]
    logs = []
    for i in range(count):
        days_ago = random.randint(1, 30)
        logs.append({
            "date": (timezone.now() - timedelta(days=days_ago)).isoformat(),
            "score": random.randint(60, 95),
            "findings": random.choice(findings_options),
            "recommendations": random.choice(recommendations_options)
        })
    logs.sort(key=lambda x: x['date'], reverse=True)
    return logs

def generate_gym_logs(days=30, frequency=0.6):
    """Generate gym time-in/time-out logs."""
    logs = []
    for i in range(days):
        if random.random() < frequency:
            days_ago = random.randint(0, days)
            date = (timezone.now() - timedelta(days=days_ago)).date()
            
            hour_in = random.randint(5, 20)
            minute_in = random.choice([0, 15, 30, 45])
            time_in = timezone.now().replace(hour=hour_in, minute=minute_in, second=0) - timedelta(days=days_ago)
            
            duration_mins = random.randint(30, 120)
            time_out = time_in + timedelta(minutes=duration_mins)
            
            logs.append({
                "date": date.isoformat(),
                "time_in": time_in.isoformat(),
                "time_out": time_out.isoformat()
            })
    logs.sort(key=lambda x: x['date'], reverse=True)
    return logs

def generate_fitness_profile():
    """Generate a random fitness profile."""
    goals = ["weight-loss", "muscle-gain", "endurance", "flexibility", "general-fitness"]
    intensities = ["beginner", "intermediate", "advanced"]
    locations = ["home", "gym", "outdoor", "mixed"]
    focus_areas_options = [
        ["Core", "Cardio"],
        ["Arms", "Chest", "Back"],
        ["Legs", "Glutes"],
        ["Full Body"],
        ["Upper Body", "Lower Body"],
        ["Flexibility", "Balance"]
    ]
    return {
        "goal": random.choice(goals),
        "intensity": random.choice(intensities),
        "location": random.choice(locations),
        "focusAreas": random.choice(focus_areas_options)
    }

def generate_active_plan():
    """Generate a random active fitness plan."""
    motivations = [
        "Consistency is key!",
        "Progress, not perfection.",
        "Every workout counts.",
        "Stay focused, stay strong.",
        "One day at a time."
    ]
    workout_templates = [
        {"name": "Full Body Blast", "duration": "45 mins", "exercises": ["Pushups", "Squats", "Lunges", "Plank", "Burpees"]},
        {"name": "Cardio & Core", "duration": "30 mins", "exercises": ["Running", "Crunches", "Leg Raises", "Mountain Climbers"]},
        {"name": "Upper Body Strength", "duration": "40 mins", "exercises": ["Bench Press", "Rows", "Shoulder Press", "Bicep Curls", "Tricep Dips"]},
        {"name": "Lower Body Power", "duration": "35 mins", "exercises": ["Deadlifts", "Squats", "Lunges", "Calf Raises", "Leg Press"]},
        {"name": "HIIT Circuit", "duration": "25 mins", "exercises": ["Jump Squats", "Pushups", "Burpees", "High Knees", "Plank Jacks"]},
        {"name": "Yoga Flow", "duration": "50 mins", "exercises": ["Sun Salutation", "Warrior Poses", "Downward Dog", "Tree Pose", "Savasana"]}
    ]
    return {
        "motivation": random.choice(motivations),
        "generatedAt": (timezone.now() - timedelta(days=random.randint(0, 7))).isoformat(),
        "dailyWorkouts": random.sample(workout_templates, k=random.randint(2, 4))
    }

def seed():
    # Check if seed should run (disabled only if explicitly set to false)
    seed_disabled = os.getenv('SEED_DB', '').lower() in ('false', '0', 'no')
    if seed_disabled:
        print("SEED_DB set to false - skipping seed.")
        return
    
    print("SEED_DB not set to false - running seed...")
    
    # Cleanup: Clear existing test users (non-staff) to prevent duplicate entries
    print("Cleaning up existing test users...")
    deleted_count, _ = User.objects.filter(is_staff=False).delete()
    print(f"Deleted {deleted_count} existing users")
    
    # Also delete staff users for fresh seeding (admin accounts)
    staff_deleted, _ = User.objects.filter(is_staff=True, is_superuser=True).delete()
    print(f"Deleted {staff_deleted} staff users")
        
    print("Seeding sample data...")

    # Demo accounts data
    demo_accounts = [
        {
            "username": "john_doe",
            "email": "john@jafitness.com",
            "password": "member123",
            "role": "member",
            "display_name": "John Doe",
            "bio": "Determined to get back in shape! Aiming for 80kg.",
            "height_cm": 180,
            "is_premium": True,
            "membership_days": 60,
            "trial_days": 30,
            "avatar_seed": "john123",
            "weight_trend": "down",
            "activity_freq": 0.7,
            "has_plan": True
        },
        {
            "username": "jane_smith",
            "email": "jane@jafitness.com",
            "password": "guest123",
            "role": "user",
            "display_name": "Jane Smith",
            "bio": "Just starting out with fitness.",
            "height_cm": 165,
            "is_premium": False,
            "membership_days": -1,
            "trial_days": -1,
            "avatar_seed": "jane456",
            "weight_trend": "stable",
            "activity_freq": 0.3,
            "has_plan": False
        },
        {
            "username": "mike_wilson",
            "email": "mike@jafitness.com",
            "password": "fitness123",
            "role": "member",
            "display_name": "Mike Wilson",
            "bio": "Training for my first marathon!",
            "height_cm": 175,
            "is_premium": True,
            "membership_days": 45,
            "trial_days": 15,
            "avatar_seed": "mike789",
            "weight_trend": "down",
            "activity_freq": 0.9,
            "has_plan": True
        },
        {
            "username": "sarah_jones",
            "email": "sarah@jafitness.com",
            "password": "health456",
            "role": "member",
            "display_name": "Sarah Jones",
            "bio": "Yoga enthusiast and mindful eater.",
            "height_cm": 168,
            "is_premium": True,
            "membership_days": 90,
            "trial_days": 0,
            "avatar_seed": "sarah101",
            "weight_trend": "stable",
            "activity_freq": 0.8,
            "has_plan": True
        },
        {
            "username": "alex_chen",
            "email": "alex@jafitness.com",
            "password": "gym2024",
            "role": "member",
            "display_name": "Alex Chen",
            "bio": "Bodybuilding competitor. Gains are life!",
            "height_cm": 182,
            "is_premium": True,
            "membership_days": 120,
            "trial_days": 0,
            "avatar_seed": "alex202",
            "weight_trend": "up",
            "activity_freq": 0.95,
            "has_plan": True
        },
        {
            "username": "emma_davis",
            "email": "emma@jafitness.com",
            "password": "yoga789",
            "role": "user",
            "display_name": "Emma Davis",
            "bio": "New to fitness. Looking for guidance!",
            "height_cm": 160,
            "is_premium": False,
            "membership_days": 5,
            "trial_days": 25,
            "avatar_seed": "emma303",
            "weight_trend": "stable",
            "activity_freq": 0.4,
            "has_plan": False
        },
        {
            "username": "david_brown",
            "email": "david@jafitness.com",
            "password": "runner123",
            "role": "member",
            "display_name": "David Brown",
            "bio": "5K runner. Working towards 10K!",
            "height_cm": 178,
            "is_premium": True,
            "membership_days": 30,
            "trial_days": 0,
            "avatar_seed": "david404",
            "weight_trend": "down",
            "activity_freq": 0.85,
            "has_plan": True
        },
        {
            "username": "lisa_garcia",
            "email": "lisa@jafitness.com",
            "password": "pilates456",
            "role": "user",
            "display_name": "Lisa Garcia",
            "bio": "Pilates instructor. Flexibility is my focus.",
            "height_cm": 163,
            "is_premium": False,
            "membership_days": -5,
            "trial_days": -5,
            "avatar_seed": "lisa505",
            "weight_trend": "stable",
            "activity_freq": 0.75,
            "has_plan": False
        },
        {
            "username": "chris_martinez",
            "email": "chris@jafitness.com",
            "password": "crossfit789",
            "role": "member",
            "display_name": "Chris Martinez",
            "bio": "CrossFit addict. WODs are my therapy.",
            "height_cm": 176,
            "is_premium": True,
            "membership_days": 75,
            "trial_days": 0,
            "avatar_seed": "chris606",
            "weight_trend": "down",
            "activity_freq": 0.9,
            "has_plan": True
        },
        {
            "username": "amanda_taylor",
            "email": "amanda@jafitness.com",
            "password": "dance123",
            "role": "user",
            "display_name": "Amanda Taylor",
            "bio": "Dance fitness lover. Zumba is my jam!",
            "height_cm": 170,
            "is_premium": False,
            "membership_days": 10,
            "trial_days": 20,
            "avatar_seed": "amanda707",
            "weight_trend": "down",
            "activity_freq": 0.65,
            "has_plan": False
        }
    ]

    # Create demo accounts
    for account_data in demo_accounts:
        try:
            # Calculate dates
            membership_expires = timezone.now() + timedelta(days=account_data["membership_days"])
            trial_ends_at = timezone.now() + timedelta(days=account_data["trial_days"])
            
            # Create user
            user = User.objects.create(
                username=account_data["username"],
                email=account_data["email"],
                role=account_data["role"],
                display_name=account_data["display_name"],
                bio=account_data["bio"],
                height_cm=account_data["height_cm"],
                membership_expires=membership_expires,
                is_premium=account_data["is_premium"],
                trial_ends_at=trial_ends_at,
                avatar_seed=account_data["avatar_seed"]
            )
            user.set_password(account_data["password"])
            
            # Generate mock data
            user.weight_logs = generate_weight_logs(
                days=60,
                start_weight=random.uniform(60, 100),
                trend=account_data["weight_trend"]
            )
            user.activity_logs = generate_activity_logs(
                days=60,
                frequency=account_data["activity_freq"]
            )
            user.meal_logs = generate_meal_logs(days=7, meals_per_day=random.randint(2, 4))
            user.posture_logs = generate_posture_logs(count=random.randint(1, 5))
            user.fitness_profile = generate_fitness_profile()
            
            if account_data["has_plan"]:
                user.active_plan = generate_active_plan()
            else:
                user.active_plan = None
            
            user.save()
            
            if account_data["role"] == "member":
                gym_logs = generate_gym_logs(days=30, frequency=account_data["activity_freq"])
                for log in gym_logs:
                    GymLog.objects.create(
                        user=user,
                        date=log["date"],
                        time_in=log["time_in"],
                        time_out=log["time_out"]
                    )
            
            print(f"Created user: {account_data['username']} ({account_data['role']})")
            
        except Exception as e:
            print(f"Error seeding {account_data['username']}: {e}")

    # Create admin user
    try:
        admin_user = User.objects.create(
            username='admin_jafitness',
            email='admin@wellmanfitness.com',
            role='admin',
            display_name='System Admin',
            bio='Administrator account for Wellman Fitness.',
            is_staff=True,
            height_cm=180,
            is_superuser=True,
            is_premium=True,
            trial_ends_at=timezone.now() + timedelta(days=365),
            avatar_seed='admin123'
        )
        admin_user.set_password('admin123')
        admin_user.weight_logs = generate_weight_logs(days=30, start_weight=75.0, trend='stable')
        admin_user.activity_logs = generate_activity_logs(days=30, frequency=0.5)
        admin_user.meal_logs = generate_meal_logs(days=7, meals_per_day=3)
        admin_user.posture_logs = generate_posture_logs(count=2)
        admin_user.fitness_profile = generate_fitness_profile()
        admin_user.active_plan = generate_active_plan()
        admin_user.save()
        
        admin_gym_logs = generate_gym_logs(days=30, frequency=0.5)
        for log in admin_gym_logs:
            GymLog.objects.create(
                user=admin_user,
                date=log["date"],
                time_in=log["time_in"],
                time_out=log["time_out"]
            )
        
        print("Created user: admin_jafitness (admin)")
    except Exception as e:
        print(f"Error seeding admin: {e}")

    print("\n" + "="*50)
    print("SEEDING COMPLETE!")
    print("="*50)
    print("\nDemo Accounts Created:")
    print("-" * 50)
    for account in demo_accounts:
        status = "Premium" if account["is_premium"] else "Basic"
        trial_status = ""
        if account["trial_days"] > 0:
            trial_status = f" (Trial: {account['trial_days']} days left)"
        elif account["trial_days"] < 0:
            trial_status = " (Trial Expired)"
        print(f"  {account['username']:20} | {account['password']:15} | {status:8}{trial_status}")
    print(f"  {'admin_fitness':20} | {'admin123':15} | Admin")
    print("="*50)

if __name__ == '__main__':
    seed()
