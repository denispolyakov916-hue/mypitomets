@echo off
chcp 65001 >nul
echo ===============================================
echo Настройка базы данных PostgreSQL для Питомец+
echo ===============================================
echo.

set PGPATH=C:\Program Files\PostgreSQL\18\bin
set PGPASSWORD=

echo Введите пароль от пользователя postgres:
set /p PGPASSWORD=

echo.
echo Создание пользователя pitomets...
"%PGPATH%\psql" -U postgres -c "CREATE USER pitomets WITH PASSWORD 'pitomets_password';" 2>nul
if %errorlevel% equ 0 (
    echo [OK] Пользователь создан
) else (
    echo [INFO] Пользователь уже существует или ошибка
)

echo.
echo Создание базы данных pitomets_db...
"%PGPATH%\psql" -U postgres -c "CREATE DATABASE pitomets_db OWNER pitomets;" 2>nul
if %errorlevel% equ 0 (
    echo [OK] База данных создана
) else (
    echo [INFO] База данных уже существует или ошибка
)

echo.
echo Предоставление прав...
"%PGPATH%\psql" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;" 2>nul
"%PGPATH%\psql" -U postgres -d pitomets_db -c "GRANT ALL ON SCHEMA public TO pitomets;" 2>nul

echo.
echo ===============================================
echo Готово! Теперь выполните:
echo   1. .\venv\Scripts\activate
echo   2. python manage.py migrate
echo   3. python manage.py runserver 0.0.0.0:8000
echo ===============================================
pause

