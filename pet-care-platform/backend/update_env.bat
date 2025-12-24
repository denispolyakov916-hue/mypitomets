@echo off
echo ===============================================
echo   Updating .env file with database settings
echo ===============================================
echo.

:: Переход в директорию скрипта
cd /d %~dp0

echo Updating .env file with database settings...
(
    echo # Database settings
    echo DB_NAME=pitomets_db
    echo DB_USER=pitomets
    echo DB_PASSWORD=pitomets_password
    echo DB_HOST=localhost
    echo DB_PORT=5432
    echo.
    echo # Django settings
    echo DEBUG=True
    echo DJANGO_SECRET_KEY=django-insecure-change-in-production
) > .env.new

:: Если файл .env уже существует, добавим существующие настройки
if exist ".env" (
    echo. >> .env.new
    echo # Existing settings >> .env.new
    type .env >> .env.new
)

move /y .env.new .env >nul 2>&1
echo [OK] .env file updated with database settings
echo.
echo Current database settings in .env:
findstr "DB_" .env
echo.
pause
