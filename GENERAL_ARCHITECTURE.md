# Wellman Fitness - General System Architecture

This document provides a high-level overview of how the Wellman Fitness system components interact.

## 1. System Overview

Wellman Fitness follows a decoupled **Client-Server Architecture**:

- **Frontend (Client)**: A Single Page Application (SPA) built with React. It handles user interaction, visualization, and direct AI vision tasks using MediaPipe Tasks Vision.
- **Backend (Server)**: A Django REST API that manages data persistence, user authentication, and complex business logic.
- **Database**: SQLite (Dev) / PostgreSQL (Prod) for storing user profiles, logs, and plans.
- **AI Services**: Google Gemini models utilized by both the frontend and backend for intelligent features.

## 2. Architecture Diagram

```mermaid
graph TD
    User[User] -->|HTTPS| Client[React Frontend]
    Client -->|REST API / JSON| Server[Django Backend]
    Server -->|SQL| DB[(Database)]
    
    subgraph AI_Integration
    Client -->|Direct API Call (Vision)| Gemini[Google Gemini API]
    Server -->|Server-side Call (Planning)| Gemini
    end
```

## 3. Data Flow

1.  **Authentication**:
    - User logs in via Frontend.
    - Credentials sent to Backend.
    - Backend validates and returns a session/token.
    - Frontend stores token in Redux/LocalStorage.

2.  **Fitness Planning (Server-Side AI)**:
    - User submits goals in Frontend.
    - Request sent to Backend (`/api/generate-plan/`).
    - Backend constructs a prompt and calls Gemini API.
    - Gemini returns structured JSON plan.
    - Backend saves plan to DB and returns it to Frontend.

3.  **Nutrition Analysis (Client-Side AI)**:
    - User uploads food image in Frontend.
    - Frontend sends image directly to Gemini API (using `VITE_API_KEY`).
    - Gemini returns nutritional data.
    - Frontend displays data (and optionally sends to Backend for logging).

4.  **BMI Estimation (In-Browser)**:
    - Frontend captures video/image.
    - Processes directly in browser using MediaPipe Tasks Vision.
    - Returns metrics without external service required.

## 4. File Organization

The backend is organized as follows:
```
backend/
├── manage.py               # Django management utility
├── seed.py                 # Database seeding script
├── requirements.txt        # Python dependencies
├── backend/                # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── api/                    # REST API application
    ├── models.py
    ├── views.py
    ├── serializers.py
    └── migrations/
```

Use `start_all.bat` to launch all services automatically.

## 5. Security & Configuration

- **CORS**: Configured via `django-cors-headers` to allow cross-origin requests from the React frontend.
- **Environment Variables**: Sensitive configuration is managed via `.env` files (using `python-dotenv` on the backend).
    - **Backend**: Stores `SECRET_KEY`, `DEBUG`, `DATABASE_URL`, and server-side `GOOGLE_API_KEY`.
    - **Frontend**: Stores `VITE_API_KEY` for client-side AI operations.