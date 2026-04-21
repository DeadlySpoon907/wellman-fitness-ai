# Wellman Fitness - General System Architecture

This document provides a high-level overview of the Wellman Fitness system, including its goals, features, and component interactions.

## 1. System Overview

**Wellman Fitness** is an AI-powered fitness tracking application designed to help users achieve their health goals through personalized workout plans, body analysis, nutrition tracking, and real-time exercise monitoring.

### Core Goals:
1. **Personalization**: Generate workout plans tailored to user's body type, goals, and fitness level
2. **Accessibility**: Provide AI-driven analysis without requiring expensive equipment
3. **Tracking**: Enable comprehensive tracking of weight, workouts, meals, and posture
4. **Engagement**: Maintain user motivation through streaks, progress tracking, and AI conversations
5. **Management**: Give administrators tools to monitor platform health and user engagement

### Architecture:
- **Frontend (Client)**: React 19 SPA with real-time AI/ML capabilities in-browser
- **Backend (Server)**: Django REST API for data persistence and server-side AI
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **AI Services**: Google Gemini for plan generation, meal analysis, body estimation

---

## 2. All System Features

### Feature Overview with Goals

| # | Feature | Goal |
|---|---------|------|
| 1 | **Smart Dashboard** | Central overview with weight, BMI, activity streak, active plan |
| 2 | **AI Fitness Plan Designer** | Generate personalized workout + diet plans via Gemini AI |
| 3 | **Body Scanner** | Detect body type (Ecto/Meso/Endo) via MediaPipe + auto-generate 30-day plan |
| 4 | **Posture Checker** | Real-time exercise tracking with pose detection + gym attendance |
| 5 | **AI Nutritionist** | Vision-based meal analysis + meal logging |
| 6 | **NutriBot** | Conversational AI for nutrition advice |
| 7 | **Fitness Plan Tracker** | Track 30-day plan progress with completion toggles |
| 8 | **Admin Dashboard** | User management, analytics, health metrics, gym logbook |
| 9 | **User Profile** | View/edit personal info, membership status |
| 10 | **Settings** | API key config, dark mode, logout |
| 11 | **Authentication** | Register/login with 30-day trial, role-based access |
| 12 | **Gym Check-In** | Track facility usage via time-in/time-out |

---

## 3. Data Flow

### Authentication
1. User submits credentials to Frontend
2. Frontend calls `/api/users/login/`
3. Backend validates and returns user data
4. Frontend stores user ID in localStorage

### AI Plan Generation
1. User selects goals/focus areas in FitnessPlanDesigner
2. Frontend sends prompt to Gemini API
3. Gemini returns JSON plan (workouts + nutrition)
4. Frontend saves to user profile via API

### Body Scanning
1. User activates BodyScanner, positions in camera
2. MediaPipe detects body landmarks in real-time
3. Frontend analyzes proportions, calculates body type
4. If locked, triggers 30-day plan generation via Gemini
5. Saves body type + plan to user profile

### Meal Analysis
1. User uploads photo in Nutritionist
2. Frontend sends to Gemini Vision API
3. Returns: mealName, calories, protein, carbs, fat
4. User can log to meal history

### Posture/Exercise Tracking
1. User selects exercise in PostureChecker
2. Camera captures video, MediaPipe processes frames
3. Skeleton overlay renders on screen
4. Rep counting and form feedback (future: auto-detect)

---

## 4. Project Organization

```
wellman-fitness-version-1.3.6/
├── views/           # React page components (12 features)
├── components/      # Reusable UI (FullBodyTracker, WeightChart, etc.)
├── services/        # DB.ts, geminiService.ts
├── api/             # Django REST API
│   ├── models.py    # User, GymLog schemas
│   ├── views.py     # Endpoints
│   └── serializers.py
└── backend/         # Django project config
```

---

## 5. Security & Configuration

- **CORS**: django-cors-headers enabled for frontend-backend communication
- **Environment Variables**:
  - Frontend: `VITE_API_KEY`, `VITE_API_BASE_URL`
  - Backend: `GEMINI_API_KEY`, `SECRET_KEY`, `DATABASE_URL`
- **Authentication**: Session via localStorage, role-based route protection

---

## 6. Deployment

- **Development**: `npm run dev` (port 3000) + `python manage.py runserver` (port 8000)
- **Production**: Vercel (frontend) + Railway (backend) with PostgreSQL