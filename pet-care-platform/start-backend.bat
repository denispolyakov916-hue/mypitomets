@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: =============================================================================
::                    ПИТОМЕЦ+ - ЗАПУСК БЕКЕНДА (Django)
:: =============================================================================

echo.
echo ========================================================================
echo                    ПИТОМЕЦ+ - ЗАПУСК БЕКЕНДА
echo                    Порт: 8077 (0.0.0.0)
echo ========================================================================
echo.

:: Переход в директорию бекенда
echo [1/5] Переход в директорию бекенда...
cd /d "%~dp0backend"
if errorlevel 1 (
    echo [ОШИБКА] Не удалось перейти в директорию backend!
    pause
    exit /b 1
)
echo       [OK] %CD%
echo.

:: Проверка Python
echo [2/5] Проверка Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Python не установлен!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo       [OK] %%i
echo.

:: Проверка виртуального окружения
echo [3/5] Проверка виртуального окружения...
if not exist "venv\Scripts\python.exe" (
    echo [ОШИБКА] Виртуальное окружение не найдено!
    echo          Запустите: setup-project.bat
    pause
    exit /b 1
)
echo       [OK] venv найден
echo.

:: Активация виртуального окружения
echo [4/5] Активация виртуального окружения...
call venv\Scripts\activate.bat
echo       [OK] Активировано
echo.

:: Миграции
echo [5/6] Проверка миграций...
python manage.py migrate --check >nul 2>&1
if errorlevel 1 (
    echo       Применяю миграции...
    python manage.py migrate --noinput
)
echo       [OK] База данных актуальна
echo.

:: Загрузка данных о породах
echo [6/6] Проверка данных о породах...
python -c "from apps.pets.breed_models import Breed; print(Breed.objects.count())" 2>nul | findstr "^0$" >nul
if not errorlevel 1 (
    echo       Загружаю данные о породах...
    python manage.py load_breeds
)
echo       [OK] База знаний о породах готова
echo.

echo ========================================================================
echo   БЕКЕНД будет запущен на:
echo.
echo   Локально:  http://localhost:8077
echo   По сети:   http://192.168.1.11:8077
echo   API:       http://localhost:8077/api/
echo   Админка:   http://localhost:8077/admin/
echo.
echo   Логин: admin / admin123
echo ========================================================================
echo.

set /p confirm="Запустить бекенд? (y/n): "
if /i not "%confirm%"=="y" (
    echo Отменено.
    pause
    exit /b 0
)

echo.
echo [ЗАПУСК] Django-сервер на порту 8077 (0.0.0.0)...
echo         Нажмите Ctrl+C для остановки
echo ========================================================================

python manage.py runserver 0.0.0.0:8077

echo.
echo [СТОП] Сервер остановлен.
pause
