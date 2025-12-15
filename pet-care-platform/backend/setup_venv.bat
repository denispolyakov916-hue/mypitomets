@echo off
chcp 65001 >nul
echo ========================================
echo   Настройка виртуального окружения
echo   Питомец+ Backend
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

:: Создание виртуального окружения
if exist "venv" (
    echo [INFO] Виртуальное окружение уже существует.
    choice /C YN /M "Пересоздать виртуальное окружение"
    if errorlevel 2 goto :activate
    echo [INFO] Удаление старого окружения...
    rmdir /s /q venv
)

echo [1/4] Создание виртуального окружения...
python -m venv venv

if errorlevel 1 (
    echo [ОШИБКА] Не удалось создать виртуальное окружение!
    pause
    exit /b 1
)

:activate
echo [2/4] Активация виртуального окружения...
call venv\Scripts\activate.bat

:: Обновление pip
echo [3/4] Обновление pip...
python -m pip install --upgrade pip
echo.

:: Установка зависимостей
echo [4/4] Установка зависимостей из requirements.txt...
pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo [ОШИБКА] Не удалось установить зависимости!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Установка завершена успешно!
echo ========================================
echo.
echo Для активации окружения используйте:
echo   venv\Scripts\activate
echo.
echo Для запуска сервера:
echo   python manage.py runserver
echo.
pause

