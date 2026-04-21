# Wellman Fitness AI

Wellman is a high-performance, AI-powered fitness application designed for modern health tracking. It integrates Google Gemini's advanced multimodal capabilities and machine learning to provide intelligent fitness guidance, vision-based body metrics, nutritional analysis, and posture/workout tracking.

---

## System Features

### 1. Smart Dashboard
**Goal**: Central hub for user overview and quick stats

- **User greeting** with avatar and display name
- **Current BMI display** (calculated from height and latest weight)
- **Weight tracking** with input field to log new weight
- **Weight history chart** using Recharts for visualization
- **Consistency metric** showing streak (consecutive days of activity)
- **7-day activity heatmap** showing last week's activity
- **Membership status card** showing premium/trial with expiry date
- **Active fitness plan display** with today's session and progress bar
- **Quick navigation** to AI Fitness Plan Designer

### 2. AI Fitness Plan Designer
**Goal**: Generate personalized workout and diet plans using AI

**Plan Mode:**
- **Goal selection**: weight-loss, muscle-gain, endurance, flexibility
- **Experience level**: beginner, intermediate, advanced
- **Location preference**: home, gym, outdoors
- **Focus areas**: Core, Legs, Upper Body, Cardio, Mobility, Back (multi-select)
- **Body type context**: Uses locked body type from Body Scanner for personalized recommendations
- **AI-generated output**: Motivation quote, daily workouts with exercises, nutrition guidelines (protein/carbs/fats)
- **Plan history**: Previous plans stored when new plan is generated

**Live Workout Mode:**
- **Exercise selector**: bicep_curl, squat, pushup, lunge, situp, dumbbell_shoulder_press, dumbbell_rows, tricep_extensions, lateral_shoulder_raises, jumping_jacks
- **Real-time pose tracking** using MediaPipe Tasks Vision
- **FullBodyTracker component** with skeleton overlay
- **Auto-Detect toggle** (Pro feature indicator)

### 3. Body Scanner (BMI & Body Type Estimator)
**Goal**: Analyze user's body type and generate 30-day personalized plan

- **Live body scan** using MediaPipe full-body pose detection
- **Position guidance**: Real-time feedback on camera positioning
- **Body type detection**: Ectomorph, Mesomorph, Endomorph with confidence percentage
- **Measurements display**: Current weight, height, calculated BMI
- **Personalized recommendations** based on detected body type
- **Lock body profile**: Saves body type permanently
- **Auto-generated 30-day plan** with:
  - 4 weeks of sessions (5-6 per week)
  - Mix of strength, cardio, HIIT, flexibility, active recovery
  - Exercise details: name, sets, reps, rest seconds
  - Nutrition guidelines: protein, carbs, fats targets
- **Rescan option** to re-analyze body type

### 4. Posture Checker & Workout Tracker
**Goal**: Track exercises in real-time and monitor gym attendance

**Exercise Tracking:**
- **Camera-based pose detection** for form monitoring
- **Exercise selection** from predefined list
- **Freedom mode** for auto-detecting exercise type
- **Real-time skeleton overlay** visualization

**Gym Attendance:**
- **Visit tracking** from gym check-in logs
- **Weekly attendance heatmap** (last 7 days)
- **Total visits counter**
- **Manual workout logging** with name, duration, exercises

### 5. AI Nutritionist
**Goal**: Analyze meals visually and track nutritional intake

**Vision-Based Analysis:**
- **Photo upload**: File picker or camera capture
- **AI analysis** using Gemini Vision
- **Returned data**: mealName, calories, protein, carbs, fat
- **Macro report display** with color-coded cards

**Features:**
- **Manual meal input** alternative for logging
- **Diet plan display** from AI-generated plan (meals with foods, calories, macros per meal)
- **Hydration and notes** from diet plan
- **Meal logging** to user's daily history

### 6. NutriBot
**Goal**: Conversational AI assistant for nutrition guidance

- **Chat interface** with message bubbles
- **Gemini 3 Flash** model with system instruction for nutrition expertise
- **Streaming responses** for real-time feedback
- **Topics**: meal planning, macro calculations, healthy food swaps, recipes
- **Disclaimer** about informational purposes

### 7. Fitness Plan Tracker (Integrated)
**Goal**: Display and track 30-day workout plans

- **Today's session** highlight based on plan start date
- **Session details**: title, focus, duration, day number
- **Completion toggle** for each session
- **Progress bar** showing completed vs total sessions
- **Past sessions count** display

### 8. Admin Dashboard
**Goal**: Comprehensive platform management for administrators

**Users Tab:**
- **User directory** with search and role filtering
- **User actions**: View details, Edit (role, membership expiry, bio), Delete
- **Bulk operations**: Select multiple, change role, delete
- **Export**: CSV and JSON export of user data

**Analytics Tab:**
- **User signups chart** (7/30/90 day ranges)
- **Role distribution** visualization
- **Feature adoption**: Weight logs, Activity, Meals, Posture, Profile, Active Plan percentages
- **Nutrition tracking**: Users tracking, total calories, avg per user, avg protein
- **Workout progress**: Active plans, total sessions, completed, completion rate
- **Posture analysis**: Users analyzed, total checks, avg score, avg BMI

**Health Metrics Tab:**
- **Overview**: Users with data, avg weight, total activities, meals
- **User health table**: Height, weight, BMI, activity count, goal
- **Posture section**: Score distribution, latest checks table

**Logbook Tab:**
- **Gym check-in records** with timestamps

**Settings Tab:**
- **Admin profile management**

**System Status:**
- **GymLog table status**: presence and row count

### 9. User Profile
**Goal**: Display and manage user personal information

- **Avatar** from picsum.photos using seed or custom URL
- **Username and display name**
- **Bio** field
- **Height** display (from Body Scanner or manual)
- **Membership status**: Wellman Member or 30-Day Trial
- **Expiry date** display

### 10. Settings
**Goal**: App configuration and session management

- **Custom API key** input for Gemini (overrides .env)
- **Dark/Light mode toggle** with persistence
- **Logout button**
- **Theme**: Uses Tailwind CSS dark mode via class toggle

### 11. Authentication
**Goal**: User registration and session management

- **Login**: Username/password authentication
- **Register**: New user with 30-day free trial automatically applied
- **Role-based access**: admin, member, user roles
- **Session persistence**: localStorage with user ID
- **Auto session restore** on page refresh
- **Hash-based routing**: `/#/` for users, `/#/admin` for admin

### 12. Gym Check-In System (Admin-Managed)
**Goal**: Track facility usage

- **Time-in**: Admin creates GymLog entry with user_id
- **Time-out**: Admin closes active session
- **Active sessions**: Query for currently timed-in users
- **Database status**: Check table existence and row count

---

## Technology Stack

### Frontend
- **React 19.2.4** - UI framework
- **TypeScript 5.0** - Type-safe development
- **Vite 7.3.1** - Build tool
- **Tailwind CSS 3.4.0** - Utility-first CSS
- **Google GenAI SDK** - Gemini API client
- **Recharts 3.7.0** - Data visualization
- **MediaPipe Tasks Vision** - Pose detection and body metrics

### Backend
- **Django 4.2** - Web framework
- **Django REST Framework 3.14** - REST API
- **Google GenerativeAI** - Gemini API integration
- **PostgreSQL/SQLite** - Database
- **Pillow 10.0+** - Image processing

---

## Project Structure

```
wellman-fitness-version-1.3.6/
├── views/                  # Page components
│   ├── Dashboard.tsx       # Smart Dashboard
│   ├── Login.tsx           # Authentication
│   ├── AdminDashboard.tsx # Admin Panel
│   ├── FitnessPlanDesigner.tsx # Plan Designer + Live Workout
│   ├── BodyScanner.tsx     # Body Scanner + 30-day Plan
│   ├── PostureChecker.tsx  # Exercise Tracker + Gym Attendance
│   ├── Nutritionist.tsx    # Meal Analysis
│   ├── NutriBot.tsx        # AI Chatbot
│   ├── Profile.tsx         # User Profile
│   └── Settings.tsx        # Settings
├── components/
│   ├── FullBodyTracker.tsx # MediaPipe pose detection
│   ├── WeightChart.tsx     # Weight visualization
│   └── ...
├── services/
│   ├── DB.ts              # API communication
│   └── geminiService.ts   # Gemini client
└── api/                   # Django REST API
```

---

## Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** with npm
- **Google Gemini API Key**

### Setup
```bash
# Frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/register/` | POST | User registration (30-day trial) |
| `/api/users/login/` | POST | User login |
| `/api/users/{id}/` | GET/PUT | User profile |
| `/api/weight-logs/` | GET/POST | Weight tracking |
| `/api/gym-logs/` | GET/POST | Gym check-in logs |
| `/api/gym-logs/time-in/` | POST | Check into gym |
| `/api/gym-logs/time-out/` | POST | Check out of gym |
| `/api/gym-logs/active/` | GET | Active sessions |
| `/api/estimate/` | POST | BMI estimation from image |

---

## Default Credentials

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Admin | `admin_jafitness` | `admin123` | `/#/admin` |
| Member | `john_doe` | `member123` | `/#/` |
| User | `jane_smith` | `guest123` | `/#/` |

---

## Access Points

- Frontend: `http://localhost:3000/#/`
- Admin: `http://localhost:3000/#/admin`
- Django Admin: `http://localhost:8000/admin/`

---

## License

This project is part of the Wellman Fitness AI capstone project.

---

*Created by Wellman Engineering Team*