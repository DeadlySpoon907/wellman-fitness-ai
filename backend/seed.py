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

User = get_user_model()

def seed():
    print("Seeding sample data...")

    # 1. John Doe (Active Member)
    try:
        john, created = User.objects.get_or_create(username='john_doe', defaults={
            'email': 'john@wellman.com',
            'role': 'member',
            'display_name': 'John Doe',
            'bio': 'Determined to get back in shape! Aiming for 80kg.',
            'height_cm': 180,
            'membership_expires': timezone.now() + timedelta(days=60),
            'avatar_seed': 'john123'
        })
        
        if created:
            john.set_password('member123')
            john.save()
            print("Created user: john_doe")
        else:
            print("Found user: john_doe")
            
        # Weight Logs (Trending down over 30 days)
        john.weight_logs = []
        base_weight = 85.0
        for i in range(30, -1, -2):
            date = (timezone.now() - timedelta(days=i)).isoformat()
            # Random fluctuation but generally trending down
            change = random.uniform(-0.5, 0.2)
            base_weight += change
            john.weight_logs.append({"date": date, "weight": round(base_weight, 1)})

        # Activity Logs (Guaranteed recent activity for dashboard streak)
        # Create a solid streak for the last 10 days to show off the UI
        john.activity_logs = []
        for i in range(10):
            date = (timezone.now() - timedelta(days=i)).isoformat()
            john.activity_logs.append({"date": date})
            
        # Random activity before that
        for i in range(10, 60):
            if random.random() > 0.4: 
                date = (timezone.now() - timedelta(days=i)).isoformat()
                john.activity_logs.append({"date": date})

        # Profile
        john.fitness_profile = {
            "goal": "weight-loss",
            "intensity": "intermediate",
            "location": "gym",
            "focusAreas": ["Core", "Cardio"]
        }

        # Meal Logs
        john.meal_logs = []
        meal_options = [
            ("Oatmeal & Berries", 300, 10, 50, 6),
            ("Grilled Chicken Salad", 450, 40, 15, 20),
            ("Salmon with Quinoa", 550, 35, 45, 22),
            ("Greek Yogurt Parfait", 250, 15, 30, 5),
            ("Steak & Veggies", 600, 50, 10, 35)
        ]
        for i in range(7):
            for _ in range(random.randint(2, 3)):
                name, cal, prot, carb, fat = random.choice(meal_options)
                var = random.uniform(0.9, 1.1)
                john.meal_logs.append({
                    "date": (timezone.now() - timedelta(days=i, hours=random.randint(0, 12))).isoformat(),
                    "mealName": name,
                    "calories": int(cal * var), "protein": int(prot * var), "carbs": int(carb * var), "fat": int(fat * var)
                })
        john.meal_logs.sort(key=lambda x: x['date'])

        # Posture Logs
        john.posture_logs = [
            {
                "date": (timezone.now() - timedelta(days=5)).isoformat(),
                "score": 75,
                "findings": ["Forward head posture", "Rounded shoulders"],
                "recommendations": ["Chin tucks", "Doorway stretches"]
            }
        ]

        # Active Plan
        john.active_plan = {
            "motivation": "Consistency is key!",
            "generatedAt": (timezone.now() - timedelta(days=2)).isoformat(),
            "dailyWorkouts": [
                {
                    "name": "Full Body Blast",
                    "duration": "45 mins",
                    "exercises": ["Pushups", "Squats", "Lunges", "Plank"]
                },
                {
                    "name": "Cardio & Core",
                    "duration": "30 mins",
                    "exercises": ["Running", "Crunches", "Leg Raises"]
                }
            ]
        }

        john.save()

    except Exception as e:
        print(f"Error seeding john_doe: {e}")

    # 2. Admin User
    try:
        admin_user, created = User.objects.get_or_create(username='admin_fitness', defaults={
            'email': 'admin@wellman.com',
            'role': 'admin',
            'display_name': 'System Admin',
            'bio': 'Administrator account',
            'is_staff': True,
            'height_cm': 180,
            'is_superuser': True,
            'avatar_seed': 'admin123'
        })
        
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            print("Created user: admin_fitness")
        else:
            print("Found user: admin_fitness")

    except Exception as e:
        print(f"Error seeding admin: {e}")

    # 3. Jane Smith (Expired/Inactive)
    try:
        jane, created = User.objects.get_or_create(username='jane_smith', defaults={
            'email': 'jane@wellman.com',
            'role': 'user',
            'display_name': 'Jane Smith',
            'bio': 'Just starting out with fitness.',
            'height_cm': 165,
            'membership_expires': timezone.now() - timedelta(days=1),
            'avatar_seed': 'jane456'
        })

        if created:
            jane.set_password('guest123')
            jane.save()
            print("Created user: jane_smith")
        else:
            print("Found user: jane_smith")

        # Activity Logs (Sporadic)
        jane.activity_logs = []
        for i in range(30):
            if random.random() > 0.7: # 30% chance of activity
                date = (timezone.now() - timedelta(days=i)).isoformat()
                jane.activity_logs.append({"date": date})

        # Weight Logs (Stagnant)
        jane.weight_logs = [
            {"date": (timezone.now() - timedelta(days=60)).isoformat(), "weight": 65.0},
            {"date": (timezone.now() - timedelta(days=30)).isoformat(), "weight": 65.5},
            {"date": (timezone.now() - timedelta(days=5)).isoformat(), "weight": 66.0},
            {"date": timezone.now().isoformat(), "weight": 66.2}
        ]

        jane.fitness_profile = {
            "goal": "muscle-gain",
            "intensity": "beginner",
            "location": "home",
            "focusAreas": ["Legs", "Glutes"]
        }
        
        # Initialize empty logs for consistency
        jane.meal_logs = []
        jane.posture_logs = []
        jane.active_plan = None

        jane.save()

    except Exception as e:
        print(f"Error seeding jane_smith: {e}")
        
    print("Seeding complete!")

if __name__ == '__main__':
    seed()