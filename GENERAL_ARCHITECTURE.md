# Wellman Fitness - General System Architecture

This document provides a high-level overview of how the Wellman Fitness system components interact.

## 1. System Overview

Wellman Fitness follows a decoupled **Client-Server Architecture**:

- **Frontend (Client)**: A Single Page Application (SPA) built with React. It handles user interaction, visualization, and direct AI vision tasks.
- **Backend (Server)**: A Django REST API that manages data persistence, user authentication, and complex business logic.
- **BMI Service**: A specialized Node.js microservice using TensorFlow.js for visual body metrics.
- **Database**: SQLite (Dev) / PostgreSQL (Prod) for storing user profiles, logs, and plans.
- **AI Services**: Google Gemini 3 models (Pro & Flash) utilized by both the frontend and backend.

## 2. Architecture Diagram

```mermaid
graph TD
    User[User] -->|HTTPS| Client[React Frontend]
    Client -->|REST API / JSON| Server[Django Backend]
    Client -->|HTTP / JSON| NodeService[Node.js BMI Estimator]
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

4.  **BMI Estimation (Microservice)**:
    - Frontend captures video/image.
    - Sends frame data to Node.js service (`localhost:5001`).
    - Service processes via TensorFlow.js/LRML and returns metrics.
    - Service is located in `backend/LRML_estimator.js` and runs independently from Django.

## 4. File Organization

The LRML_estimator (Node.js BMI Service) is located in:
```
backend/
└── LRML_estimator.js      # Standalone Node.js service running on port 5001
```

It should be started separately using:
```bash
cd backend
node LRML_estimator.js
```

Or use `start_all.bat` to launch all services automatically.

## 5. Security & Configuration

- **CORS**: Configured via `django-cors-headers` to allow cross-origin requests from the React frontend.
- **Environment Variables**: Sensitive configuration is managed via `.env` files (using `python-dotenv` on the backend).
    - **Backend**: Stores `SECRET_KEY`, `DEBUG`, `DATABASE_URL`, and server-side `GOOGLE_API_KEY`.
    - **Frontend**: Stores `VITE_API_KEY` for client-side AI operations.