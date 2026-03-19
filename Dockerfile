# Use Python base image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=backend.settings
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput --clear

# Expose port (Railway provides this via $PORT)
EXPOSE $PORT

# Start script: run migrations, then start Gunicorn
# Use $PORT from Railway environment
CMD python manage.py migrate --noinput && gunicorn backend.wsgi:application --bind "0.0.0.0:$PORT"