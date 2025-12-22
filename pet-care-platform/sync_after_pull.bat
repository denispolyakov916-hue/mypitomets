@echo off
chcp 65001 >nul
echo ================================================
echo   Синхронизация проекта после Git Pull
echo ================================================
echo.

set BACKEND_DIR=%~dp0backend
set FRONTEND_DIR=%~dp0frontend

:: Бэкенд: применение миграций
echo [1/4] Применение миграций Django...
cd /d "%BACKEND_DIR%"
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    python manage.py migrate --noinput
    if %errorlevel% equ 0 (
        echo [OK] Миграции применены
    ) else (
        echo [ОШИБКА] Не удалось применить миграции
    )
) else if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
    python manage.py migrate --noinput
    if %errorlevel% equ 0 (
        echo [OK] Миграции применены
    ) else (
        echo [ОШИБКА] Не удалось применить миграции
    )
) else (
    echo [ПРЕДУПРЕЖДЕНИЕ] Виртуальное окружение не найдено
    echo Выполните: setup_venv.bat или python -m venv venv
)

:: Фронтенд: обновление зависимостей
echo.
echo [2/4] Обновление зависимостей фронтенда...
cd /d "%FRONTEND_DIR%"
if exist "node_modules" (
    call npm install
    if %errorlevel% equ 0 (
        echo [OK] Зависимости обновлены
    ) else (
        echo [ОШИБКА] Не удалось обновить зависимости
    )
) else (
    call npm install
    if %errorlevel% equ 0 (
        echo [OK] Зависимости установлены
    ) else (
        echo [ОШИБКА] Не удалось установить зависимости
    )
)

:: Проверка .env файлов в бэкенде
echo.
echo [3/4] Проверка конфигурационных файлов бэкенда...
cd /d "%BACKEND_DIR%"
if not exist ".env" (
    echo [INFO] Файл .env не найден. Создаю из .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [OK] Файл .env создан. Отредактируйте его при необходимости.
    ) else (
        echo [ПРЕДУПРЕЖДЕНИЕ] .env.example не найден
    )
) else (
    echo [OK] Файл .env найден
)

:: Проверка .env файлов во фронтенде
echo.
echo [4/4] Проверка конфигурационных файлов фронтенда...
cd /d "%FRONTEND_DIR%"
if not exist ".env" (
    echo [INFO] Файл .env не найден. Создаю из .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [OK] Файл .env создан. Отредактируйте его при необходимости.
    ) else (
        echo [ПРЕДУПРЕЖДЕНИЕ] .env.example не найден
    )
) else (
    echo [OK] Файл .env найден
)

echo.
echo ================================================
echo   Синхронизация завершена!
echo ================================================
echo.
echo Следующие шаги:
echo   1. Проверьте настройки в backend/.env и frontend/.env
echo   2. Убедитесь, что PostgreSQL запущен
echo   3. Запустите бэкенд: cd backend ^&^& python manage.py runserver
echo   4. Запустите фронтенд: cd frontend ^&^& npm run dev
echo.
pause

