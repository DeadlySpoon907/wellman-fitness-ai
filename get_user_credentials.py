import os
import sys
import django
import dj_database_url
from dotenv import load_dotenv

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Load environment variables
load_dotenv()

# Setup Django
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def get_all_user_credentials():
    """Retrieve all user credentials from the database."""
    try:
        print("=" * 80)
        print("FETCHING USER CREDENTIALS FROM RAILWAY DATABASE")
        print("=" * 80)
        print()
        
        # Get all users
        users = User.objects.all().order_by('-is_superuser', '-is_staff', 'username')
        
        if not users.exists():
            print("No users found in the database.")
            return
        
        print(f"Total users found: {users.count()}")
        print()
        
        # Separate admin and regular users
        admin_users = users.filter(is_superuser=True)
        staff_users = users.filter(is_staff=True, is_superuser=False)
        regular_users = users.filter(is_staff=False, is_superuser=False)
        
        # Display Admin Users
        if admin_users.exists():
            print("=" * 80)
            print("ADMIN ACCOUNTS (Superusers)")
            print("=" * 80)
            for user in admin_users:
                print(f"Username:     {user.username}")
                print(f"Email:        {user.email}")
                print(f"Display Name: {user.display_name}")
                print(f"Role:         {user.role}")
                print(f"Is Staff:     {user.is_staff}")
                print(f"Is Superuser: {user.is_superuser}")
                print(f"Is Premium:   {user.is_premium}")
                print(f"Created:      {user.date_joined}")
                print("-" * 80)
            print()
        
        # Display Staff Users
        if staff_users.exists():
            print("=" * 80)
            print("STAFF ACCOUNTS")
            print("=" * 80)
            for user in staff_users:
                print(f"Username:     {user.username}")
                print(f"Email:        {user.email}")
                print(f"Display Name: {user.display_name}")
                print(f"Role:         {user.role}")
                print(f"Is Staff:     {user.is_staff}")
                print(f"Is Premium:   {user.is_premium}")
                print(f"Created:      {user.date_joined}")
                print("-" * 80)
            print()
        
        # Display Regular Users
        if regular_users.exists():
            print("=" * 80)
            print("REGULAR USER ACCOUNTS")
            print("=" * 80)
            for user in regular_users:
                print(f"Username:     {user.username}")
                print(f"Email:        {user.email}")
                print(f"Display Name: {user.display_name}")
                print(f"Role:         {user.role}")
                print(f"Is Premium:   {user.is_premium}")
                print(f"Membership:   {user.membership_expires}")
                print(f"Trial Ends:   {user.trial_ends_at}")
                print(f"Created:      {user.date_joined}")
                print("-" * 80)
            print()
        
        # Summary
        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Total Users:      {users.count()}")
        print(f"Admin Accounts:   {admin_users.count()}")
        print(f"Staff Accounts:   {staff_users.count()}")
        print(f"Regular Users:    {regular_users.count()}")
        print(f"Premium Users:    {users.filter(is_premium=True).count()}")
        print("=" * 80)
        
    except Exception as e:
        print(f"Error fetching user credentials: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    get_all_user_credentials()
