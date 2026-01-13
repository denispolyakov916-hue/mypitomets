@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: =============================================================================
::                    ПИТОМЕЦ+ - ПОЛНЫЙ ЗАПУСК ПРОЕКТА
:: =============================================================================

echo.
echo ========================================================================
echo                    ПИТОМЕЦ+ - ПОЛНЫЙ ЗАПУСК ПРОЕКТА
echo ========================================================================
echo.

:: Проверка структуры проекта
if not exist "%~dp0backend\manage.py" (
    echo [ОШИБКА] Не найден файл backend/manage.py!
    pause
    exit /b 1
)

if not exist "%~dp0frontend\package.json" (
    echo [ОШИБКА] Не найден файл frontend/package.json!
    pause
    exit /b 1
)

echo [OK] Структура проекта в порядке
echo.

:: Создаем временный скрипт для бекенда
echo @echo off > "%TEMP%\pitomets_backend_auto.bat"
echo chcp 65001 ^>nul 2^>^&1 >> "%TEMP%\pitomets_backend_auto.bat"
echo title ПИТОМЕЦ+ - Бекенд (порт 8077) >> "%TEMP%\pitomets_backend_auto.bat"
echo cd /d "%~dp0backend" >> "%TEMP%\pitomets_backend_auto.bat"
echo call venv\Scripts\activate.bat >> "%TEMP%\pitomets_backend_auto.bat"
echo echo. >> "%TEMP%\pitomets_backend_auto.bat"
echo echo ======================================== >> "%TEMP%\pitomets_backend_auto.bat"
echo echo   БЕКЕНД запущен на http://localhost:8077 >> "%TEMP%\pitomets_backend_auto.bat"
echo echo   По сети: http://192.168.1.11:8077 >> "%TEMP%\pitomets_backend_auto.bat"
echo echo   API: http://localhost:8077/api/ >> "%TEMP%\pitomets_backend_auto.bat"
echo echo   Админка: http://localhost:8077/admin/ >> "%TEMP%\pitomets_backend_auto.bat"
echo echo ======================================== >> "%TEMP%\pitomets_backend_auto.bat"
echo echo. >> "%TEMP%\pitomets_backend_auto.bat"
echo python manage.py runserver 0.0.0.0:8077 >> "%TEMP%\pitomets_backend_auto.bat"
echo pause >> "%TEMP%\pitomets_backend_auto.bat"

:: Создаем временный скрипт для фронтенда
echo @echo off > "%TEMP%\pitomets_frontend_auto.bat"
echo chcp 65001 ^>nul 2^>^&1 >> "%TEMP%\pitomets_frontend_auto.bat"
echo title ПИТОМЕЦ+ - Фронтенд (порт 5199) >> "%TEMP%\pitomets_frontend_auto.bat"
echo cd /d "%~dp0frontend" >> "%TEMP%\pitomets_frontend_auto.bat"
echo echo. >> "%TEMP%\pitomets_frontend_auto.bat"
echo echo ======================================== >> "%TEMP%\pitomets_frontend_auto.bat"
echo echo   ФРОНТЕНД запущен на http://localhost:5199 >> "%TEMP%\pitomets_frontend_auto.bat"
echo echo   Бекенд API: http://localhost:8077/api/ >> "%TEMP%\pitomets_frontend_auto.bat"
echo echo ======================================== >> "%TEMP%\pitomets_frontend_auto.bat"
echo echo. >> "%TEMP%\pitomets_frontend_auto.bat"
echo call npm run dev -- --port 5199 --host localhost >> "%TEMP%\pitomets_frontend_auto.bat"
echo pause >> "%TEMP%\pitomets_frontend_auto.bat"

:: Запуск бекенда
echo [ЗАПУСК] Бекенд стартует на http://localhost:8077
start "ПИТОМЕЦ+ - Бекенд (порт 8077)" cmd /c "%TEMP%\pitomets_backend_auto.bat"

:: Ожидание инициализации бекенда
echo [ОЖИДАНИЕ] 5 секунд для инициализации бекенда...
timeout /t 5 /nobreak >nul

:: Запуск фронтенда
echo [ЗАПУСК] Фронтенд стартует на http://localhost:5199
start "ПИТОМЕЦ+ - Фронтенд (порт 5199)" cmd /c "%TEMP%\pitomets_frontend_auto.bat"

echo.
echo ========================================================================
echo                    СЕРВЕРЫ УСПЕШНО ЗАПУЩЕНЫ!
echo ========================================================================
echo.
echo   ФРОНТЕНД:     http://localhost:5199
echo   БЕКЕНД API:   http://localhost:8077/api/
echo   БЕКЕНД (IP):  http://192.168.1.11:8077/api/
echo   АДМИНКА:      http://localhost:8077/admin/
echo   React админка: http://localhost:5199/admin/dashboard
echo.
echo   Логин: admin / admin123
echo.
echo   Для остановки закройте окна терминалов или нажмите Ctrl+C
echo.
echo ========================================================================
echo.
pause
