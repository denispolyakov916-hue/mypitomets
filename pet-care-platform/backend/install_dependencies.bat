@echo off
chcp 65001 >nul
echo ========================================
echo   Установка зависимостей Питомец+ Backend
echo ========================================
echo.

:: Проверка наличия Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Python не найден! Установите Python 3.10+ и добавьте в PATH.
    pause
    exit /b 1
)

echo [INFO] Python найден:
python --version
echo.

:: Переход в директорию скрипта
cd /d "%~dp0"

:: Проверка наличия requirements.txt
if not exist "requirements.txt" (
    echo [ОШИБКА] Файл requirements.txt не найден!
    pause
    exit /b 1
)

:: Обновление pip
echo [1/3] Обновление pip...
python -m pip install --upgrade pip
echo.

:: Установка зависимостей
echo [2/3] Установка зависимостей из requirements.txt...
pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo [ОШИБКА] Не удалось установить зависимости!
    pause
    exit /b 1
)

echo.
echo [3/3] Проверка установленных пакетов...
echo.
echo Установленные пакеты:
echo ----------------------------------------
pip list | findstr /i "django djangorestframework argon2 uuid7 gunicorn python-dotenv"
echo ----------------------------------------
echo.
echo ========================================
echo   Установка завершена успешно!
echo ========================================
echo.
pause

