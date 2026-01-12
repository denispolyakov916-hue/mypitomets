@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: =============================================================================
::                    ПИТОМЕЦ+ - ПОЛНЫЙ ЗАПУСК ПРОЕКТА
:: =============================================================================

title ПИТОМЕЦ+ - Запуск всего проекта

echo.
echo ══════════════════════════════════════════════════════════════════════════
echo              ПИТОМЕЦ+ - ПОЛНЫЙ ЗАПУСК ПРОЕКТА
echo ══════════════════════════════════════════════════════════════════════════
echo.
echo   Запускаются:
echo     - Бекенд (Django)  на порту 8077
echo     - Фронтенд (React) на порту 5199
echo.
echo ══════════════════════════════════════════════════════════════════════════
echo.

:: Проверка структуры проекта
if not exist "%~dp0backend\manage.py" (
    echo [ОШИБКА] Не найден backend/manage.py!
    pause
    exit /b 1
)

if not exist "%~dp0frontend\package.json" (
    echo [ОШИБКА] Не найден frontend/package.json!
    pause
    exit /b 1
)

if not exist "%~dp0backend\venv\Scripts\python.exe" (
    echo [ОШИБКА] Не найдено виртуальное окружение backend/venv!
    echo          Создайте: cd backend ^& python -m venv venv
    pause
    exit /b 1
)

echo [1/2] Запуск бекенда...

:: Запуск бекенда в новом окне (на IPv4 localhost)
start "ПИТОМЕЦ+ - Бекенд" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && python manage.py migrate --noinput && echo. && echo   Бекенд: http://localhost:8077 && echo   API:    http://localhost:8077/api/ && echo. && python manage.py runserver 127.0.0.1:8077"

:: Ждём запуска бекенда
echo       Ожидание запуска бекенда (5 сек)...
timeout /t 5 /nobreak >nul

echo [2/2] Запуск фронтенда...

:: Запуск фронтенда в новом окне (на всех интерфейсах включая IPv4)
start "ПИТОМЕЦ+ - Фронтенд" cmd /k "cd /d "%~dp0frontend" && echo. && echo   Фронтенд: http://localhost:5199 && echo. && npm run dev -- --port 5199 --host 0.0.0.0"

echo.
echo ══════════════════════════════════════════════════════════════════════════
echo                    СЕРВЕРЫ ЗАПУЩЕНЫ!
echo ══════════════════════════════════════════════════════════════════════════
echo.
echo   Фронтенд:  http://localhost:5199
echo   Бекенд:    http://localhost:8077
echo   API:       http://localhost:8077/api/
echo   Админка:   http://localhost:8077/admin/
echo.
echo   Админ: admin / admin123
echo.
echo   Для остановки закройте оба окна терминала.
echo.
echo ══════════════════════════════════════════════════════════════════════════
echo.
echo   Это окно можно закрыть.
echo.
pause
