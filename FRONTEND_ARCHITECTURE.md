# Wellman Fitness - Frontend Architecture

This document details the client-side architecture of the Wellman Fitness application, built with React 19 and Vite.

## 1. Technology Stack

| Component | Package | Version | Purpose |
|-----------|---------|---------|---------|
| **Framework** | `react` | ^19.2.4 | Component-based UI |
| **Build** | `vite` | ^7.3.1 | Dev server & bundler |
| **Language** | `typescript` | ^5.0.0 | Type-safe development |
| **Styling** | `tailwindcss` | ^3.4.0 | Utility CSS |
| **State** | React Context / useState | - | State management |
| **Charts** | `recharts` | ^3.7.0 | Weight visualization |
| **AI** | `@google/generativeai` | ^1.0.0 | Gemini client |
| **ML** | `@mediapipe/tasks-vision` | ^0.10.34 | Pose detection |

---

## 2. Project Structure

```
├── views/                  # Page components
│   ├── Dashboard.tsx       # Smart Dashboard
│   ├── Login.tsx           # Auth (login/register)
│   ├── AdminDashboard.tsx # Admin Panel
│   ├── FitnessPlanDesigner.tsx # Plan Designer + Live
│   ├── BodyScanner.tsx    # Body Scanner + 30-day plan
│   ├── PostureChecker.tsx # Exercise Tracker
│   ├── Nutritionist.tsx   # Meal Analysis
│   ├── NutriBot.tsx       # AI Chatbot
│   ├── Profile.tsx        # User Profile
│   └── Settings.tsx       # Settings
├── components/
│   ├── FullBodyTracker.tsx # MediaPipe pose
│   ├── WeightChart.tsx    # Recharts line chart
│   ├── CameraCapture.tsx  # Image capture
│   └── AuthGuard.tsx      # Route protection
├── services/
│   ├── DB.ts             # API calls
│   └── geminiService.ts  # Gemini wrapper
├── App.tsx               # Root + routing
└── types.ts              # TypeScript definitions
```

---

## 3. All Features (Frontend)

### Dashboard
**Goal**: Central overview with key metrics

- User greeting with avatar + display name
- Current BMI display (from height + latest weight)
- Weight logging input + weight history chart
- Consistency streak + 7-day heatmap
- Membership status card (premium/trial + expiry)
- Active plan display with today's session + progress bar

### FitnessPlanDesigner
**Goal**: AI-powered personalized plan generation

**Plan Mode:**
- Goal selector: weight-loss, muscle-gain, endurance, flexibility
- Intensity: beginner, intermediate, advanced
- Location: home, gym, outdoors
- Focus areas: Core, Legs, Upper Body, Cardio, Mobility, Back
- Body type context from locked profile
- AI generates: motivation, daily workouts, nutrition guidelines

**Live Workout Mode:**
- Exercise selector (10 predefined exercises)
- FullBodyTracker with real-time pose detection
- Skeleton overlay visualization

### BodyScanner
**Goal**: Body type analysis + 30-day plan auto-generation

- Live MediaPipe scan with position feedback
- Body type detection: Ectomorph, Mesomorph, Endomorph
- Confidence percentage display
- Personalized recommendations
- Lock body profile (saves to user)
- Auto-generates 30-day plan with:
  - 4 weeks × 5-6 sessions
  - Strength, cardio, HIIT, flexibility mix
  - Nutrition targets (protein, carbs, fats)

### PostureChecker
**Goal**: Exercise tracking + gym attendance

- Camera-based pose detection
- Exercise selection + freedom mode (auto-detect)
- Real-time skeleton overlay
- Gym attendance from check-in logs
- Weekly attendance heatmap (last 7 days)
- Manual workout logging

### Nutritionist
**Goal**: Vision-based meal analysis + tracking

- Photo upload (file or camera)
- Gemini Vision analysis returns: mealName, calories, protein, carbs, fat
- Macro report with color-coded cards
- Manual meal input option
- Diet plan display (from AI plan) with meals + macros
- Meal logging to history

### NutriBot
**Goal**: Conversational nutrition assistant

- Chat interface with Gemini 3 Flash
- Streaming responses
- System instruction for nutrition expertise
- Topics: meal planning, macros, healthy advice

### FitnessPlanTracker (Integrated in Dashboard)
**Goal**: Track 30-day plan progress

- Today's session highlight based on start date
- Session details: title, focus, duration
- Completion toggle for each session
- Progress bar with completion %

### AdminDashboard
**Goal**: Platform management

**Users Tab:**
- Searchable/filterable user list
- Edit user (role, membership, bio)
- Bulk role change + delete
- CSV/JSON export

**Analytics Tab:**
- Signup chart (7/30/90 days)
- Role distribution
- Feature adoption (% users using each feature)
- Nutrition stats, workout progress, posture stats

**Health Metrics Tab:**
- Overview stats
- User health table (height, weight, BMI)
- Posture score distribution

**Logbook Tab:**
- Gym check-in records

### Profile
**Goal**: Personal info management

- Avatar display
- Username, display name, bio
- Height, membership status + expiry

### Settings
**Goal**: App configuration

- Custom API key (overrides .env)
- Dark/Light mode toggle
- Logout

### Authentication
**Goal**: User registration + session management

- Login with username/password
- Registration with 30-day free trial
- Role-based access (admin/member/user)
- Session persistence via localStorage
- Hash routing: `/#/` (users), `/#/admin` (admin)

---

## 4. State Management

- **Auth State**: User object + localStorage persistence
- **UI State**: Active tab, theme preference (dark mode)
- **Data State**: Cached plans/logs to reduce API calls

---

## 5. Configuration

### Environment Variables
```
VITE_API_KEY=your_gemini_api_key
VITE_API_BASE_URL=http://localhost:8000
VITE_PORT=3000
```

### Navigation
- User view: `/#/`
- Admin view: `/#/admin`