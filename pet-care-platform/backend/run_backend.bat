@echo off
chcp 65001 >nul 2>&1
setlocal

echo ================================================
echo      Pitomets+ - Backend Launcher (Windows)
echo ================================================
echo.

cd /d "%~dp0"
echo [INFO] Working directory: %CD%
echo.

:: Step 1: Check Python
echo [1/6] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)
python --version
echo [OK] Python found
echo.

:: Step 2: Virtual environment
echo [2/6] Checking virtual environment...
if exist ".venv\Scripts\python.exe" (
    echo [OK] Virtual environment found
) else (
    echo [INFO] Creating virtual environment...
    if exist ".venv" rmdir /s /q ".venv" 2>nul
    python -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment!
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
)
echo.

:: Step 3: Install dependencies
echo [3/6] Installing dependencies...
if not exist "requirements.txt" (
    echo [ERROR] requirements.txt not found!
    pause
    exit /b 1
)

echo [INFO] Upgrading pip...
.venv\Scripts\python.exe -m pip install --upgrade pip -q

echo [INFO] Installing packages...
.venv\Scripts\python.exe -m pip install -r requirements.txt -q
if errorlevel 1 (
    echo [WARNING] Some packages failed, retrying...
    .venv\Scripts\python.exe -m pip install -r requirements.txt --no-cache-dir
)

.venv\Scripts\python.exe -m pip install setuptools -q 2>nul
echo [OK] Dependencies installed
echo.

:: Step 4: Check .env file
echo [4/6] Checking configuration...
if not exist ".env" (
    echo [INFO] Creating .env file...
    echo DB_NAME=pitomets_db> .env
    echo DB_USER=pitomets>> .env
    echo DB_PASSWORD=pitomets_password>> .env
    echo DB_HOST=localhost>> .env
    echo DB_PORT=5432>> .env
    echo DEBUG=True>> .env
    echo DJANGO_SECRET_KEY=django-insecure-change-in-production>> .env
    echo CLIENT_URL=http://localhost:5173>> .env
    echo API_URL=http://localhost:8000>> .env
    echo [OK] .env file created
    echo [IMPORTANT] Check database settings in .env file!
) else (
    echo [OK] .env file found
)
echo.

:: Step 5: Database and migrations
echo [5/6] Checking database...
if not exist "manage.py" (
    echo [ERROR] manage.py not found!
    pause
    exit /b 1
)

.venv\Scripts\python.exe manage.py check --database default >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Cannot connect to database!
    echo Check PostgreSQL is running and .env settings are correct
    if exist ".env" findstr "DB_" .env
    pause
    exit /b 1
)
echo [OK] Database connection successful

echo [INFO] Applying migrations...
.venv\Scripts\python.exe manage.py migrate --noinput >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Migration issues, trying to fix...
    .venv\Scripts\python.exe manage.py migrate --fake-initial --noinput >nul 2>&1
    .venv\Scripts\python.exe manage.py migrate --noinput >nul 2>&1
)
echo [OK] Migrations applied
echo.

:: Step 6: Check port
echo [6/6] Checking port 8000...
netstat -an 2>nul | findstr ":8000.*LISTEN" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 8000 is already in use!
)
echo.

:: Start server
echo ================================================
echo      Starting Django server...
echo ================================================
echo.
echo Backend available at:
echo   http://localhost:8000
echo   http://localhost:8000/api/
echo   http://localhost:8000/admin/
echo.
echo Press Ctrl+C to stop
echo ================================================
echo.

.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000

echo.
echo Server stopped.
pause
