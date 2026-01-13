@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: =============================================================================
::                    ПИТОМЕЦ+ - ЗАПУСК БЕКЕНДА (Django)
:: =============================================================================

title ПИТОМЕЦ+ - Бекенд (порт 8077)

echo.
echo ══════════════════════════════════════════════════════════════════════════
echo                    ПИТОМЕЦ+ - ЗАПУСК БЕКЕНДА
echo ══════════════════════════════════════════════════════════════════════════
echo.

:: Переход в директорию бекенда
cd /d "%~dp0backend"
if errorlevel 1 (
    echo [ОШИБКА] Не удалось перейти в директорию backend!
    pause
    exit /b 1
)

:: Проверка виртуального окружения
if not exist "venv\Scripts\python.exe" (
    echo [ОШИБКА] Виртуальное окружение не найдено!
    echo          Создайте его: python -m venv venv
    echo          Затем: pip install -r requirements.txt
    pause
    exit /b 1
)

:: Активация виртуального окружения
call venv\Scripts\activate.bat

:: Применение миграций
echo   Применение миграций...
python manage.py migrate --noinput

echo.
echo   Бекенд запускается на:
echo     - http://localhost:8077
echo     - http://127.0.0.1:8077
echo     - http://0.0.0.0:8077 (по сети)
echo.
echo   API:     http://localhost:8077/api/
echo   Админка: http://localhost:8077/admin/
echo.
echo   Для остановки нажмите Ctrl+C
echo.
echo ══════════════════════════════════════════════════════════════════════════
echo.

python manage.py runserver 192.168.1.11:8077

echo.
echo [СТОП] Сервер остановлен.
pause
