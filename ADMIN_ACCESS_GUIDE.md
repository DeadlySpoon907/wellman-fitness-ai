# Admin Dashboard Access Guide

This guide details how to access and use the administrative interfaces for the Wellman Fitness AI system. The system provides two distinct admin views: the **Frontend Platform Admin** and the **Backend Django Admin**.

---

## 🔐 Admin Credentials

Use the following credentials to access both dashboards:

| Username | Password | Role | Access |
|----------|----------|------|--------|
| `admin_fitness` | `admin123` | Superuser | All admin functions |

If this user doesn't exist yet, see the [Setup & Troubleshooting](#-setup--troubleshooting) section.

---

## 🖥️ Frontend Admin Dashboard

The frontend admin dashboard is designed for platform management, user oversight, and analytics within the React application.

### How to Access

1. **Ensure servers are running**:
   ```bash
   .\start_all.bat
   # Or manually:
   # Terminal 1: cd backend && python manage.py runserver
   # Terminal 2: npm run dev
   ```

2. **Navigate to Admin Route**:
   ```
   http://localhost:5173/#/admin
   ```
   > **Important**: You must manually append `#/admin` to the base URL. The standard login at `http://localhost:5173` will NOT grant admin access, even with admin credentials.

3. **Log in** with credentials:
   - Username: `admin_fitness`
   - Password: `admin123`

### Admin Dashboard Features

#### 📊 Command Center
- **High-level platform metrics**
  - Total users registered
  - Active fitness plans
  - Recent activity overview
  - System health status

#### 👥 User Management
- **View all user profiles**
- **Inspect user details**:
  - Display name, email, bio
  - Height, weight history
  - Membership status
  - Fitness profile data
- **Role assignment** (if implemented)
- **Account status control** (activate/deactivate)

#### 📈 Analytics
- **Usage statistics**
- **Feature adoption rates**
- **User engagement metrics**
- **Data export capabilities**

#### 🌓 Theme Toggle
- **Dark Mode** - Toggle dark/light theme specific to admin interface
- **Responsive Design** - Works on desktop and tablet

### Admin-Only Pages
- `/#/admin` - Main admin dashboard
- `/#/admin/users` - User management (if available)
- `/#/admin/analytics` - Analytics dashboard (if available)

---

## ⚙️ Backend Django Admin

The built-in Django administration interface allows for direct database manipulation, model management, and user permission control.

### How to Access

1. **Ensure backend server is running**:
   ```bash
   # From project root
   .\venv\Scripts\Activate.ps1
   cd backend
   python manage.py runserver
   ```

2. **Navigate to Admin Panel**:
   ```
   http://localhost:8000/admin/
   ```

3. **Log in** with superuser credentials:
   - Username: `admin_fitness`
   - Password: `admin123`

### Django Admin Features

#### 🗂️ Model Management
Access and manage all database models:

**Users & Authentication**
- User profiles
- Groups and permissions
- Authentication tokens

**Fitness Data**
- Weight logs
- Fitness plans
- Activity logs
- Meal logs
- Posture logs

**Site Administration**
- Site configuration
- Email templates
- System settings

#### 🔧 Database Operations
- **Create new records**: Click "Add" button
- **Edit records**: Click on a record to modify
- **Delete records**: Select and delete (with confirmation)
- **Bulk actions**: Apply actions to multiple records
- **Filtering**: Filter by date, user, status, etc.
- **Search**: Search across indexed fields

#### 🔐 Permission Management
- **User permissions**: Set specific model access rights
- **Group permissions**: Manage group-level access
- **Superuser rights**: Full system access
- **Role-based access**: Restrict user capabilities

#### 📊 Admin Customization
The admin interface can be customized in `backend/api/admin.py`:

```python
from django.contrib import admin
from api.models import User, WeightLog, FitnessPlan, ActivityLog, MealLog, PostureLog

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'display_name', 'membership_expires']
    list_filter = ['is_staff', 'is_superuser', 'date_joined']
    search_fields = ['username', 'email', 'display_name']

@admin.register(WeightLog)
class WeightLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'weight', 'date']
    list_filter = ['date', 'user']

# ... more model registrations
```

---

## 🛠️ Setup & Troubleshooting

### Creating the Admin User

If the `admin_fitness` user doesn't exist, create it manually:

1. **Open terminal in backend folder**:
   ```bash
   cd backend
   .\..\..\venv\Scripts\Activate.ps1
   ```

2. **Run superuser creation command**:
   ```bash
   python manage.py createsuperuser
   ```

3. **Follow the prompts**:
   ```
   Username: admin_fitness
   Email: admin@wellmanfitness.com
   Password: admin123
   Password (again): admin123
   Bypass password validation and create user anyway? [y/N]: y
   ```

4. **Restart servers** and try logging in again.

### Resetting Admin Password

If you forget the password:

```bash
cd backend
.\..\..\venv\Scripts\Activate.ps1

# Reset password via Django shell
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.get(username='admin_fitness')
user.set_password('admin123')
user.save()
exit()
```

### "Unauthorized" Error on Frontend

If you receive an "Unauthorized" error when accessing the admin dashboard:

1. **Verify user exists and is superuser**:
   ```bash
   python manage.py shell
   ```
   ```python
   from django.contrib.auth import get_user_model
   User = get_user_model()
   admin = User.objects.get(username='admin_fitness')
   print(f"Is Staff: {admin.is_staff}")
   print(f"Is Superuser: {admin.is_superuser}")
   admin.is_staff = True
   admin.is_superuser = True
   admin.save()
   exit()
   ```

2. **Check backend logs** for permission errors
3. **Ensure CORS is configured** to allow frontend origin
4. **Clear browser cache** and try again

### "Page Not Found" (404)

If accessing `http://localhost:8000/admin/` returns 404:

1. **Ensure Django server is running**:
   ```bash
   python manage.py runserver
   ```

2. **Check URL routing** in `backend/urls.py`:
   ```python
   from django.contrib import admin
   from django.urls import path

   urlpatterns = [
       path('admin/', admin.site.urls),
       # ... other URLs
   ]
   ```

3. **Verify admin site is registered** in `settings.py`:
   ```python
   INSTALLED_APPS = [
       'django.contrib.admin',  # Must be present
       'django.contrib.auth',
       ...
   ]
   ```

### Database Connection Issues

If you see database errors:

```bash
# Reset database (WARNING: Deletes all data)
rm db.sqlite3

# Reapply migrations
python manage.py migrate

# Recreate admin user
python manage.py createsuperuser
```

---

## 🔒 Security Best Practices

### Password Management
- **Change default credentials** in production
- **Use strong passwords** (minimum 12 characters)
- **Enable two-factor authentication** if available
- **Regular password rotation** (every 3 months)

### Access Control
- **Limit admin accounts** to trusted personnel only
- **Use specific permissions** instead of superuser when possible
- **Audit admin actions** regularly
- **Remove inactive accounts** promptly

### API Security
- **Use HTTPS** in production
- **Enable CORS** only for trusted origins
- **Implement rate limiting** on API endpoints
- **Monitor API logs** for suspicious activity

---

## 📊 Admin Tasks

### Common Admin Operations

**Creating a new test user**:
```bash
python manage.py shell
```
```python
from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.create_user(
    username='john_doe',
    email='john@example.com',
    password='member123'
)
user.save()
```

**Viewing all users**:
1. Go to Django Admin: `http://localhost:8000/admin/`
2. Click on "Users" in the menu

**Accessing frontend admin**:
1. Go to: `http://localhost:5173/#/admin`
2. Log in with admin credentials
3. View user management and analytics

**Database backup**:
```bash
python manage.py dumpdata > backup.json
```

**Database restore**:
```bash
python manage.py loaddata backup.json
```

---

## 🚨 Emergency Access

If you're completely locked out of the system:

1. **Delete all user sessions** (forces re-login):
   ```bash
   python manage.py shell
   ```
   ```python
   from django.contrib.sessions.models import Session
   Session.objects.all().delete()
   exit()
   ```

2. **Reset admin user password** (see section above)

3. **Restart all services**:
   ```bash
   .\start_all.bat
   ```

---

## 📚 Additional Resources

- [Django Admin Documentation](https://docs.djangoproject.com/en/5.0/ref/contrib/admin/)
- [Django Authentication](https://docs.djangoproject.com/en/5.0/topics/auth/)
- [User Permissions & Authorization](https://docs.djangoproject.com/en/5.0/topics/auth/default/#permissions-and-authorization)

---

## 📧 Support

For issues accessing the admin panel:
1. Check the troubleshooting section above
2. Review server logs for errors
3. Verify database is running
4. Ensure admin user exists and is superuser