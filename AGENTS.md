# Wellman Fitness - Agent & Command Configuration

## Project Overview

Wellman Fitness is an AI-powered fitness tracking application with:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Django REST Framework 3.14 + Django 4.2
- **AI**: Google Gemini API for fitness plans, nutrition analysis
- **ML**: MediaPipe Tasks Vision for in-browser pose detection and body type analysis

---

## All System Features

### Core Features

| # | Feature | Goal | Description |
|---|---------|------|-------------|
| 1 | **Smart Dashboard** | Central overview | User greeting, BMI display, weight tracking with chart, consistency streak, 7-day activity heatmap, membership status, active plan with today's session and progress bar |
| 2 | **AI Fitness Plan Designer** | Personalized workout generation | Goal/intensity/location/focus selection, body type context, AI-generated plans with motivation, workouts, nutrition; Live workout mode with real-time pose tracking |
| 3 | **Body Scanner** | Body type analysis & 30-day plan generation | Live MediaPipe scan, position feedback, body type detection (Ecto/Meso/Endo), confidence %, auto-generates 30-day plan with 4 weeks of sessions, nutrition targets |
| 4 | **Posture Checker & Workout Tracker** | Exercise tracking & gym attendance | Camera pose detection, exercise selection, freedom mode auto-detect, gym visit tracking, weekly attendance heatmap, manual workout logging |
| 5 | **AI Nutritionist** | Meal analysis & tracking | Photo upload/camera, Gemini Vision analysis (calories, protein, carbs, fat), manual input option, diet plan display with meals, meal logging |
| 6 | **NutriBot** | Conversational nutrition assistant | Chat interface with Gemini 3 Flash, streaming responses, meal planning, macro calculations, healthy food advice |
| 7 | **Fitness Plan Tracker** | 30-day plan display | Today's session highlight, session details (title, focus, duration), completion toggle, progress bar |
| 8 | **Admin Dashboard** | Platform management | Users tab (search, filter, bulk actions, export), Analytics (signups, adoption, nutrition, workouts), Health metrics (overview, posture, nutrition), Logbook (gym records) |
| 9 | **User Profile** | Personal info management | Avatar, username, display name, bio, height, membership status with expiry |
| 10 | **Settings** | App configuration | Custom API key input, Dark/Light mode toggle, logout |
| 11 | **Authentication** | Session management | Login/register, role-based access (admin/member/user), session persistence, auto-restore |
| 12 | **Gym Check-In System** | Facility usage tracking | Time-in/time-out, active sessions, database status |

---

## Project Structure

```
wellman-fitness-version-1.3.6/
├── views/                  # Page components
│   ├── Dashboard.tsx       # Smart Dashboard (weight, BMI, consistency, active plan)
│   ├── Login.tsx           # Authentication (login/register)
│   ├── AdminDashboard.tsx # Admin Panel (users, analytics, health metrics, logbook)
│   ├── FitnessPlanDesigner.tsx # Plan generation + Live workout mode
│   ├── BodyScanner.tsx     # Body scan + 30-day plan auto-generation
│   ├── PostureChecker.tsx  # Exercise tracking + gym attendance
│   ├── Nutritionist.tsx    # Meal analysis + diet plan display
│   ├── NutriBot.tsx        # AI chatbot
│   ├── Profile.tsx         # User profile
│   └── Settings.tsx        # Settings + dark mode
├── components/
│   ├── FullBodyTracker.tsx # MediaPipe pose detection
│   ├── FullBodySkeleton.tsx # Body landmark visualization
│   ├── HandTracker.tsx     # MediaPipe hand detection
│   ├── WeightChart.tsx     # Weight history chart
│   ├── CameraCapture.tsx   # Camera utility
│   └── AuthGuard.tsx       # Route protection
├── services/
│   ├── DB.ts              # API communication
│   └── geminiService.ts   # Gemini client
├── api/                   # Django REST API
│   ├── models.py          # User, GymLog models
│   ├── views.py           # API endpoints
│   └── urls.py            # Routing
└── backend/               # Django settings
```

---

## Scripts

### Frontend
```bash
npm run dev       # Start development server (port 3000)
npm run build    # Production build
npm run preview  # Preview production build
npm run test     # Run tests
```

### Backend
```bash
cd backend
python manage.py runserver       # Start Django (port 8000)
python manage.py migrate         # Apply migrations
python manage.py createsuperuser # Create admin
python seed.py                   # Seed demo data
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/register/` | POST | User registration (30-day trial) |
| `/api/users/login/` | POST | User login |
| `/api/users/{id}/` | GET/PUT | User profile |
| `/api/users/{id}/record_activity/` | POST | Record daily activity |
| `/api/users/{id}/log_workout/` | POST | Log workout |
| `/api/users/{id}/log_meal/` | POST | Log meal |
| `/api/weight-logs/` | GET/POST | Weight tracking |
| `/api/gym-logs/` | GET/POST | Gym logs |
| `/api/gym-logs/time-in/` | POST | Check into gym |
| `/api/gym-logs/time-out/` | POST | Check out of gym |
| `/api/gym-logs/active/` | GET | Active sessions |
| `/api/gym-logs/db-status/` | GET | Database status |
| `/api/estimate/` | POST | BMI estimation from image |

---

## Database Models

### User (extends AbstractUser)
- `id` (UUID), `username`, `role` (admin/member/user)
- `display_name`, `bio`, `avatar_seed`, `avatar_url`
- `height_cm`, `estimated_body_type`
- `is_premium`, `membership_expires`, `trial_ends_at`
- `fitness_profile` (JSON): goal, intensity, location, focusAreas
- `active_plan` (JSON): 30-day plan with sessions
- `plan_history` (JSON): past plans
- `diet_plan` (JSON): AI-generated diet
- `weight_logs`, `activity_logs`, `meal_logs`, `posture_logs` (JSON arrays)

### GymLog
- `id` (UUID), `user` (FK), `time_in`, `time_out` (nullable), `date`

---

## Default Credentials

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Admin | `admin_jafitness` | `admin123` | `/#/admin` |
| Member | `john_doe` | `member123` | `/#/` |
| User | `jane_smith` | `guest123` | `/#/` |

---

## Access Points

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:3000/#/` |
| Admin Panel | `http://localhost:3000/#/admin` |
| Django Admin | `http://localhost:8000/admin/` |

---

## Environment Variables

### Frontend `.env`
```
VITE_API_KEY=your_gemini_api_key
VITE_API_BASE_URL=http://localhost:8000
VITE_PORT=3000
```

### Backend `.env`
```
GEMINI_API_KEY=your_gemini_api_key
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
```

---

## Development Notes

1. **Routing**: React 19 with hash-based routing (`/#/`, `/#/admin`)
2. **Ports**: Backend 8000, Frontend 3000
3. **AI**: Requires Google Gemini API key
4. **Database**: PostgreSQL (prod), SQLite (dev)
5. **ML**: MediaPipe Tasks Vision for pose detection
6. **Theme**: Dark/Light mode with Tailwind CSS
7. **Mobile**: Responsive with bottom navigation

---

## Dependencies

### Frontend (npm)
- react@^19.2.4, react-dom@^19.2.4
- vite@^7.3.1, @vitejs/plugin-react@^5.1.2
- typescript@^5.0.0
- tailwindcss@^3.4.0
- @google/generativeai@^1.0.0
- @mediapipe/tasks-vision@^0.10.34
- recharts@^3.7.0

### Backend (pip)
- django>=4.2,<4.3
- djangorestframework>=3.14.0
- django-cors-headers>=4.3.0
- google-generativeai>=0.8.0
- psycopg2-binary>=2.9.9
- pillow>=10.0.0
- numpy>=1.24.0