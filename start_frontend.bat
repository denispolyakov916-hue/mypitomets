@echo off
chcp 65001 >nul
echo 🚀 Запуск фронтенда Питомец+
echo.

cd pet-care-platform\frontend
if errorlevel 1 (
    echo ❌ Ошибка: Не удалось перейти в папку frontend
    pause
    exit /b 1
)

echo 📦 Проверка зависимостей...
if not exist "node_modules" (
    echo Установка зависимостей...
    call npm install
    if errorlevel 1 (
        echo ❌ Ошибка при установке зависимостей!
        pause
        exit /b 1
    )
)

echo.
echo ⚠️  ВАЖНО: Убедитесь, что бэкенд запущен!
echo    Запустите в другом терминале:
echo    cd pet-care-platform\backend
echo    python manage.py runserver 0.0.0.0:8000
echo.
echo 🚀 Запуск dev-сервера...
echo.

call npm run dev

