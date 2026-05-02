# Wellman Fitness - Backend Architecture

This document details the server-side architecture of the Wellman Fitness application, built with Python and Django.

## 1. Technology Stack

| Component | Package | Version | Purpose |
|-----------|---------|---------|---------|
| **Framework** | `django` | >=4.2,<4.3 | Web framework, routing, ORM, auth |
| **API** | `djangorestframework` | >=3.14.0 | REST API, serializers, viewsets |
| **CORS** | `django-cors-headers` | >=4.3.0 | Cross-origin requests |
| **AI** | `google-generativeai` | >=0.8.0 | Gemini API client |
| **Database** | `psycopg2-binary` / `sqlite3` | - | PostgreSQL (prod) / SQLite (dev) |
| **Images** | `pillow` | >=10.0.0 | Image processing |

---

## 2. Project Structure

```
backend/
├── manage.py           # Django CLI
├── seed.py             # Database seeding
├── requirements.txt    # Python dependencies
├── settings.py         # Django settings
├── urls.py             # URL routing
└── api/                # REST API app
    ├── models.py       # User, GymLog schemas
    ├── views.py        # API endpoints
    ├── serializers.py  # Data serialization
    ├── urls.py         # API routes
    └── migrations/     # DB migrations
```

---

## 3. All System Features (Backend)

### Authentication & User Management
- **Registration** (`/api/users/register/`): Creates user with 30-day free trial
- **Login** (`/api/users/login/`): Authenticates username/password
- **Profile** (`/api/users/{id}/`): GET/PUT user data
- **Role-based access**: admin, member, user roles

### Fitness Data Management
| Endpoint | Description |
|----------|-------------|
| `/api/weight-logs/` | Get/post weight entries |
| `/api/users/{id}/record_activity/` | Log daily activity |
| `/api/users/{id}/log_workout/` | Log workout session |
| `/api/users/{id}/log_meal/` | Log meal with macros |

### Gym Check-In System
| Endpoint | Description |
|----------|-------------|
| `/api/gym-logs/` | CRUD for gym sessions |
| `/api/gym-logs/time-in/` | Check into gym |
| `/api/gym-logs/time-out/` | Check out of gym |
| `/api/gym-logs/active/` | Get active sessions |
| `/api/gym-logs/db-status/` | Check table status |

### AI Features
| Endpoint | Description |
|----------|-------------|
| `/api/estimate/` | BMI estimation from image (multipart) |

---

## 4. Database Schema

### User Model
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| username | Char | Unique username |
| role | Char | admin/member/user |
| display_name | Char | Public name |
| bio | Text | Biography |
| avatar_seed | Char | Avatar generation seed |
| avatar_url | Text | Custom avatar URL |
| height_cm | Float | Height in cm |
| estimated_body_type | Char | Body type (Ecto/Meso/Endo) |
| is_premium | Boolean | Premium status |
| membership_expires | DateTime | Expiry date |
| trial_ends_at | DateTime | Trial end date |
| fitness_profile | JSON | {goal, intensity, location, focusAreas} |
| active_plan | JSON | Current 30-day plan |
| diet_plan | JSON | AI-generated diet |
| weight_logs | JSON | [{date, weight}] |
| activity_logs | JSON | Activity entries |
| meal_logs | JSON | Meal entries with macros |
| posture_logs | JSON | Posture assessments |

### GymLog Model
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user | ForeignKey | Link to User |
| time_in | DateTime | Check-in time |
| time_out | DateTime | Check-out time (nullable) |
| date | Date | Log date |

---

## 5. API Endpoints Summary

```python
# Authentication
POST /api/users/register/  # New user with 30-day trial
POST /api/users/login/     # Login
GET/PUT /api/users/{id}/   # Profile

# Fitness Data
GET/POST /api/weight-logs/
POST /api/users/{id}/record_activity/
POST /api/users/{id}/log_workout/
POST /api/users/{id}/log_meal/

# Gym
GET/POST /api/gym-logs/
POST /api/gym-logs/time-in/
POST /api/gym-logs/time-out/
GET /api/gym-logs/active/
GET /api/gym-logs/db-status/

# AI
POST /api/estimate/  # BMI from image
```

---

## 6. Setup & Commands

```bash
# Install
pip install -r requirements.txt

# Migrate
python manage.py makemigrations api
python manage.py migrate

# Create admin
python manage.py createsuperuser

# Seed data
python seed.py

# Run server
python manage.py runserver  # localhost:8000
```

---

## 7. Admin Interface

- **URL**: `http://localhost:8000/admin`
- **Credentials**: admin_jafitness / admin123