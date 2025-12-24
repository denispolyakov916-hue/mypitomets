@echo off
setlocal

echo ================================================
echo      Pitomets+ - Frontend Launcher (Windows)
echo ================================================
echo.

cd /d "%~dp0"
echo [INFO] Working directory: %CD%
echo.

:: Step 1: Check Node.js
echo [1/5] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js %%i found
echo.

:: Step 2: Check npm
echo [2/5] Checking npm...
call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do echo [OK] npm %%i found
echo.

:: Step 3: Check project files
echo [3/5] Checking project files...
if not exist "package.json" (
    echo [ERROR] package.json not found!
    pause
    exit /b 1
)
echo [OK] package.json found

if not exist "vite.config.js" (
    echo [ERROR] vite.config.js not found!
    pause
    exit /b 1
)
echo [OK] vite.config.js found
echo.

:: Step 4: Install dependencies
echo [4/5] Installing dependencies...
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] node_modules found
)

if not exist "node_modules\react" (
    echo [ERROR] React not installed! Run: npm install
    pause
    exit /b 1
)
if not exist "node_modules\vite" (
    echo [ERROR] Vite not installed! Run: npm install
    pause
    exit /b 1
)
echo [OK] Critical packages verified
echo.

:: Step 5: Check .env
echo [5/5] Checking configuration...
if not exist ".env" (
    echo [INFO] Creating .env file...
    echo VITE_API_URL=http://localhost:8000/api> .env
    echo [OK] .env file created
) else (
    echo [OK] .env file found
)
echo.

:: Start server
echo ================================================
echo      Starting Vite dev server...
echo ================================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo.
echo Press Ctrl+C to stop
echo ================================================
echo.

call npm run dev

echo.
echo Server stopped.
pause
