# Wellman Fitness - Agent & Command Configuration

## Project Overview

Wellman Fitness is an AI-powered fitness tracking application with:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Django REST Framework
- **AI**: Google Gemini API for fitness plans, nutrition analysis, posture checking
- **ML**: TensorFlow.js for in-browser pose detection and BMI estimation

## Project Structure

```
wellman-fitness-version-1.3.6/
├── .env                    # Environment variables (DO NOT COMMIT)
├── .env.example            # Example environment template
├── package.json            # Node.js dependencies
├── requirements.txt        # Python dependencies
├── vite.config.ts          # Vite build configuration
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── railway.toml            # Railway deployment config
├── vercel.json             # Vercel deployment config
│
├── src/                    # Frontend source (flat structure)
│   ├── index.tsx           # Entry point
│   ├── App.tsx             # Main app component
│   ├── types.ts            # TypeScript types
│   ├── components/         # Reusable components
│   ├── views/              # Page components
│   ├── services/           # API services
│   └── utils/              # Utility functions
│
├── backend/                # Django backend
│   ├── manage.py
│   ├── requirements.txt
│   ├── settings.py
│   ├── urls.py
│   └── api/                # Django app
│       ├── models.py
│       ├── views.py
│       ├── serializers.py
│       └── urls.py
│
├── api/                    # Legacy API folder (flat)
│
└── dist/                   # Production build output
```

## Scripts

### Frontend
```bash
npm run dev       # Start development server
npm run build    # Production build
npm run preview  # Preview production build
npm run test     # Run tests
```

### Backend
```bash
cd backend
python manage.py runserver       # Start Django server
python manage.py migrate         # Apply database migrations
python manage.py createsuperuser # Create admin user
python seed.py                   # Seed database with demo data
```

### Combined
```bash
.\start_all.bat  # Start both frontend and backend
```

## Environment Variables

### Root `.env` (Frontend)
```
VITE_API_KEY=your_google_gemini_api_key
VITE_API_BASE_URL=http://localhost:8000
```

### Backend `.env`
```
GEMINI_API_KEY=your_google_gemini_api_key
SECRET_KEY=your-django-secret-key
DEBUG=True
DATABASE_URL=postgresql://...
ALLOWED_HOSTS=localhost,127.0.0.1
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login/` | POST | User login |
| `/api/auth/register/` | POST | User registration |
| `/api/users/` | GET/POST | User management |
| `/api/weight-logs/` | GET/POST | Weight tracking |
| `/api/fitness-plans/` | GET/POST | Fitness plans |
| `/api/generate-plan/` | POST | AI fitness plan generation |
| `/api/analyze-meal/` | POST | AI nutrition analysis |
| `/api/check-posture/` | POST | AI posture analysis |

## Default Test Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin_fitness` | `admin123` |
| Member | `john_doe` | `member123` |
| Basic User | `jane_smith` | `guest123` |

## Kilo Configuration

This project uses Kilo CLI for AI-assisted development. Configuration is stored in `.kilo/` folder.

### Commands
- Use standard Kilo commands for code assistance
- Agent configuration: `.kilo/agent/*.md`
- Command configuration: `.kilo/command/*.md`

## Development Notes

1. The project uses React 19 with client-side routing (hash-based: `/#/`)
2. Backend runs on port 8000, frontend on port 5173
3. AI features require Google Gemini API key
4. PostgreSQL is used for production, SQLite for development