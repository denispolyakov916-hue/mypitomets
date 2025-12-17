@echo off
chcp 65001 >nul
echo ================================================
echo         Питомец+ - Запуск сервисов
echo ================================================
echo.

:: Переменные
set PGPATH=C:\Program Files\PostgreSQL\18\bin
set BACKEND_DIR=%~dp0backend
set FRONTEND_DIR=%~dp0frontend

:: Проверка PostgreSQL
echo [1/6] Проверка PostgreSQL...
if not exist "%PGPATH%\psql.exe" (
    echo [ОШИБКА] PostgreSQL не найден в %PGPATH%
    echo Укажите правильный путь в переменной PGPATH
    pause
    exit /b 1
)
echo [OK] PostgreSQL найден

:: Создание базы данных
echo.
echo [2/6] Настройка базы данных...
echo Введите пароль от пользователя postgres:
set /p PGPASSWORD=

"%PGPATH%\psql" -U postgres -c "CREATE USER pitomets WITH PASSWORD 'pitomets_password';" 2>nul
"%PGPATH%\psql" -U postgres -c "CREATE DATABASE pitomets_db OWNER pitomets;" 2>nul
"%PGPATH%\psql" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;" 2>nul
"%PGPATH%\psql" -U postgres -d pitomets_db -c "GRANT ALL ON SCHEMA public TO pitomets;" 2>nul
echo [OK] База данных настроена

:: Активация venv и миграции
echo.
echo [3/6] Применение миграций Django...
cd /d "%BACKEND_DIR%"
call venv\Scripts\activate.bat
python manage.py makemigrations --noinput
python manage.py migrate --noinput
echo [OK] Миграции применены

:: Загрузка тестовых данных
echo.
echo [4/6] Загрузка тестовых данных...
python manage.py load_test_data
echo [OK] Тестовые данные загружены

:: Запуск бэкенда
echo.
echo [5/6] Запуск бэкенда на порту 8000...
start "Питомец+ Backend" cmd /k "cd /d %BACKEND_DIR% && venv\Scripts\activate && python manage.py runserver 0.0.0.0:8000"
echo [OK] Бэкенд запущен

:: Запуск фронтенда
echo.
echo [6/6] Запуск фронтенда на порту 5173...
cd /d "%FRONTEND_DIR%"
start "Питомец+ Frontend" cmd /k "cd /d %FRONTEND_DIR% && npm run dev"
echo [OK] Фронтенд запущен

echo.
echo ================================================
echo              Все сервисы запущены!
echo ================================================
echo.
echo Бэкенд:   http://localhost:8000
echo Фронтенд: http://localhost:5173
echo Админка:  http://localhost:8000/admin/
echo.
echo Для создания админа выполните:
echo   cd backend
echo   venv\Scripts\activate
echo   python manage.py createsuperuser
echo.
pause

