# Wellman Fitness - Backend Architecture & Documentation

This document serves as the technical reference for the server-side architecture of the Wellman Fitness application. The backend is built using **Python** and **Django**, serving as the central API and data persistence layer for the React frontend.

## 1. Technology Stack

The backend relies on a modern Django stack defined in `requirements.txt`:

| Component | Package | Version | Purpose |
|-----------|---------|---------|---------|
| **Core Framework** | `django` | `>=5.0` | The primary web framework handling routing, ORM, and authentication. |
| **API Toolkit** | `djangorestframework` | Latest | Provides tools for building Web APIs (serialization, viewsets). |
| **CORS Handling** | `django-cors-headers` | Latest | Middleware to allow the React frontend (running on a different port) to communicate with the API. |
| **AI Engine** | `google-generativeai` | Latest | Python client for Google's Gemini models, enabling server-side AI reasoning. |

## 2. Project Structure

The backend is organized within the `backend/` directory:

```text
backend/
├── manage.py           # Django's command-line utility for administrative tasks.
├── seed.py             # Custom utility script to populate the database with demo data.
├── requirements.txt    # Python dependency definitions.
├── wellman_backend/    # Project configuration (settings, urls, wsgi).
└── api/                # The main application logic.
    ├── models.py       # Database schema definitions.
    ├── views.py        # API request handlers.
    ├── serializers.py  # Data conversion (Model instances -> JSON).
    └── urls.py         # API route definitions.
```

## 3. Database Schema

The application uses a relational database (SQLite by default for dev) managed via Django's ORM. The core models defined in `api/models.py` are:

### `User` (Custom Auth Model)
Extends Django's `AbstractUser` to include fitness-specific profile data.
- **`display_name`** (Char): Public-facing name.
- **`bio`** (Text): User biography.
- **`avatar_seed`** (Char): String used to generate consistent avatars.
- **`membership_expires`** (DateTime): Tracks premium status validity.
- **`height_cm`** (Float): User's height for BMI calculations.

### `WeightLog`
Tracks user progress over time. Used to generate the "Weight History" chart on the dashboard.
- **`user`** (ForeignKey): Links to the `User` model.
- **`weight`** (Float): Recorded weight value.
- **`date`** (DateTime): Timestamp of the log entry (auto-added).

### `FitnessPlan`
Stores the AI-generated workout architecture.
- **`user`** (OneToOne): Links strictly to one user.
- **`motivation`** (Text): The user's input/goal that generated the plan.
- **`plan_data`** (JSON): Structured data representing the workout routine.
- **`generated_at`** (DateTime): Timestamp of creation.

## 4. Configuration & Setup

### Environment Variables
The backend requires the following environment variable to function fully (specifically for AI features):
- `API_KEY`: Your Google GenAI API key.

### Django Settings (`settings.py`)
To support the architecture, the following configurations are critical:

1.  **Installed Apps**:
    ```python
    INSTALLED_APPS = [
        ...,
        'rest_framework',
        'corsheaders',
        'api',
    ]
    ```

2.  **Middleware**:
    `CorsMiddleware` must be placed at the top of the middleware list to ensure headers are added before Django processes the request.

## 5. Operational Commands

### Initialization
When setting up the backend for the first time:

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
2.  **Apply Migrations** (Create DB tables):
    ```bash
    python manage.py makemigrations api
    python manage.py migrate
    ```
3.  **Create Admin User**:
    ```bash
    python manage.py createsuperuser
    ```

### Data Seeding
A `seed.py` script is provided to populate the database with realistic test data (users, weight logs, activity history).
```bash
python seed.py
```
*Note: This creates users `john_doe` (Premium) and `jane_smith` (Basic).*

### Running the Server
```bash
python manage.py runserver
```
The API will be accessible at `http://localhost:8000`.

## 6. Administrative Interface

Django provides a built-in admin interface for managing database records directly.

- **URL**: `http://localhost:8000/admin`
- **Default Credentials**:
    - Username: `admin_fitness`
    - Password: `admin123`