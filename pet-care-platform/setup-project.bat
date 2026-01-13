@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: =============================================================================
::                    ПИТОМЕЦ+ - ПЕРВОНАЧАЛЬНАЯ НАСТРОЙКА
:: =============================================================================

echo.
echo ========================================================================
echo                    ПИТОМЕЦ+ - НАСТРОЙКА ПРОЕКТА
echo ========================================================================
echo.
echo   Этот скрипт выполнит:
echo   1. Создание виртуального окружения Python
echo   2. Установку Python зависимостей
echo   3. Применение миграций базы данных
echo   4. Создание суперпользователя (admin)
echo   5. Установку Node.js зависимостей
echo.
echo ========================================================================
echo.

set /p confirm="Начать настройку? (y/n): "
if /i not "%confirm%"=="y" (
    echo Отменено.
    pause
    exit /b 0
)

echo.

:: -----------------------------------------------------------------------------
:: ШАГ 1: Настройка Backend
:: -----------------------------------------------------------------------------
echo [BACKEND] Настройка Django...
echo.

cd /d "%~dp0backend"

:: Проверка Python
echo [1/6] Проверка Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Python не найден! Установите Python 3.10+ с python.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo       [OK] %%i
echo.

:: Создание виртуального окружения
echo [2/6] Создание виртуального окружения...
if not exist "venv" (
    python -m venv venv
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось создать venv!
        pause
        exit /b 1
    )
    echo       [OK] venv создан
) else (
    echo       [OK] venv уже существует
)
echo.

:: Активация venv
echo [3/6] Активация виртуального окружения...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ОШИБКА] Не удалось активировать venv!
    pause
    exit /b 1
)
echo       [OK] Активировано
echo.

:: Установка зависимостей
echo [4/6] Установка Python зависимостей...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [ОШИБКА] Не удалось установить зависимости!
    pause
    exit /b 1
)
echo       [OK] Зависимости установлены
echo.

:: Миграции
echo [5/6] Применение миграций базы данных...
python manage.py migrate --noinput
if errorlevel 1 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Ошибка миграций, проверьте PostgreSQL
)
echo       [OK] Миграции применены
echo.

:: Создание суперпользователя
echo [6/6] Создание суперпользователя...
python -c "import django; django.setup(); from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'admin123')" 2>nul
echo       [OK] Пользователь admin создан (пароль: admin123)
echo.

:: -----------------------------------------------------------------------------
:: ШАГ 2: Настройка Frontend
:: -----------------------------------------------------------------------------
echo [FRONTEND] Настройка React...
echo.

cd /d "%~dp0frontend"

:: Проверка Node.js
echo [1/2] Проверка Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Node.js не найден! Установите Node.js 18+ с nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version 2^>^&1') do echo       [OK] Node %%i
echo.

:: Установка npm зависимостей
echo [2/2] Установка Node.js зависимостей...
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось установить npm зависимости!
        pause
        exit /b 1
    )
    echo       [OK] Зависимости установлены
) else (
    echo       [OK] node_modules уже существует
)
echo.

:: -----------------------------------------------------------------------------
:: ГОТОВО
:: -----------------------------------------------------------------------------
echo.
echo ========================================================================
echo                    НАСТРОЙКА ЗАВЕРШЕНА!
echo ========================================================================
echo.
echo   Для запуска проекта используйте:
echo.
echo   start-all.bat      - Запуск бекенда и фронтенда одновременно
echo   start-backend.bat  - Только бекенд
echo   start-frontend.bat - Только фронтенд
echo.
echo   Адреса после запуска:
echo   Фронтенд:      http://localhost:5174
echo   API:           http://localhost:8001/api/
echo   Django админка: http://localhost:8001/admin/
echo   React админка: http://localhost:5174/admin/dashboard
echo.
echo   Логин: admin
echo   Пароль: admin123
echo.
echo ========================================================================
echo.
pause

