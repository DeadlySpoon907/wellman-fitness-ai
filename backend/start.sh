#!/bin/sh
cd backend
python manage.py migrate --noinput
python manage.py collectstatic --noinput
gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT