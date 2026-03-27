# This script forces the migration and seeding of the Railway PostgreSQL database

# Ensure we are running from the script's directory
Set-Location $PSScriptRoot

$env:DATABASE_URL="postgresql://postgres:CtMxrouoEWmmeCRNbrbPEbGCpRWhfkyk@nozomi.proxy.rlwy.net:26805/railway"

Write-Host "Connecting to Railway PostgreSQL at nozomi.proxy.rlwy.net..." -ForegroundColor Cyan

cd backend
if (Test-Path "..\venv\Scripts\Activate.ps1") { 
    Write-Host "Activating virtual environment..."
    . ..\venv\Scripts\Activate.ps1 
}

python manage.py migrate
python seed.py

Write-Host "Successfully migrated and seeded the Railway Database." -ForegroundColor Green