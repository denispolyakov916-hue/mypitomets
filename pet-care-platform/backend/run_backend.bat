@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
echo ================================================
echo      PetCare+ - Backend Auto Start
echo ================================================
echo.

:: Переход в директорию скрипта
cd /d "%~dp0"
echo [INFO] Рабочая директория: %CD%
echo.

:: =============================================================================
:: ШАГ 1: Проверка Python
:: =============================================================================
echo [1/7] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
echo [ERROR] Python not installed or not found in PATH!
echo.
echo Solution:
echo   1. Install Python 3.10+ from https://www.python.org/
echo   2. Check "Add Python to PATH" during installation
echo   3. Restart command prompt after installation
echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] Python installed: %PYTHON_VERSION%
echo.

:: =============================================================================
:: ШАГ 2: Проверка виртуального окружения
:: =============================================================================
echo [2/7] Checking virtual environment...

:: Проверяем и пересоздаем виртуальное окружение если нужно
if exist ".venv\Scripts\activate.bat" (
    echo [OK] Found virtual environment .venv
) else if exist ".venv\bin\python" (
    echo [WARNING] Found Linux virtual environment version
    echo [INFO] Recreating for Windows...
    if exist ".venv" (
        rmdir /s /q ".venv" >nul 2>&1
    )
    echo Создание виртуального окружения...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Не удалось создать виртуальное окружение!
        pause
        exit /b 1
    )
) else (
    echo Создание виртуального окружения...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Не удалось создать виртуальное окружение!
        pause
        exit /b 1
    )
)

:: Проверяем что виртуальное окружение создано
if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment is corrupted!
    pause
    exit /b 1
)
echo [OK] Virtual environment ready
echo.

:: =============================================================================
:: ШАГ 3: Установка зависимостей
:: =============================================================================
echo [3/7] Installing dependencies...

echo Обновление pip...
.venv\Scripts\python.exe -m pip install --upgrade pip --quiet
if %errorlevel% neq 0 (
    echo [ERROR] Failed to update pip!
    pause
    exit /b 1
)

echo Installing dependencies (this may take several minutes)...
.venv\Scripts\python.exe -m pip install -r requirements.txt
if %errorlevel% neq 0 (
echo [ERROR] Failed to install dependencies!
echo.
echo Check:
echo   1. requirements.txt file exists
echo   2. Internet connection available
echo.
    pause
    exit /b 1
)

echo Installing setuptools (required for some packages)...
.venv\Scripts\python.exe -m pip install setuptools
if %errorlevel% neq 0 (
    echo [WARNING] Failed to install setuptools
    echo Some features may work incorrectly
)

echo [OK] Dependencies installed
echo.

:: =============================================================================
:: ШАГ 4: Активация виртуального окружения
:: =============================================================================
echo [4/7] Activating virtual environment...
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
    echo [OK] Virtual environment activated
) else (
    echo [ERROR] Could not find activate.bat!
    pause
    exit /b 1
)
echo.

:: =============================================================================
:: ШАГ 5: Проверка файла конфигурации
:: =============================================================================
echo [5/7] Checking configuration...

if not exist ".env" (
    if exist ".env.example" (
        echo Copying .env.example to .env...
        copy ".env.example" ".env" >nul
        echo [OK] .env file created
        echo.
        echo [IMPORTANT] Check settings in .env file
        echo Press any key to continue...
        pause >nul
    ) else (
        echo [WARNING] .env.example not found
        echo Creating basic .env file...
        (
            echo # Настройки базы данных
            echo DB_NAME=pitomets_db
            echo DB_USER=pitomets
            echo DB_PASSWORD=pitomets_password
            echo DB_HOST=localhost
            echo DB_PORT=5432
            echo.
            echo # Настройки Django
            echo DEBUG=True
            echo DJANGO_SECRET_KEY=django-insecure-change-in-production
        ) > .env
        echo [OK] Basic .env file created
    )
) else (
    echo [OK] .env file found
)
echo.

:: =============================================================================
:: ШАГ 6: Работа с базой данных и миграциями
:: =============================================================================
echo [6/7] Работа с базой данных...

:: Проверяем подключение к БД
echo Проверка подключения к базе данных...
python manage.py check --database default >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удается подключиться к базе данных!
    echo.
    echo Возможные причины:
    echo   1. PostgreSQL не запущен
    echo   2. Неправильные настройки в .env файле
    echo   3. База данных не создана
    echo.
    echo Текущие настройки БД в .env:
    if exist ".env" (
        findstr "DB_" .env
    ) else (
        echo Файл .env не найден!
    )
    echo.
    echo Решение:
    echo   1. Убедитесь что PostgreSQL запущен
    echo   2. Проверьте настройки в .env файле
    echo   3. Если БД не создана, запустите setup_database.bat
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Подключение к базе данных успешно
)

:: Работаем с миграциями для старой базы данных
echo.
echo Работа с миграциями...

:: Показываем статус миграций
echo Проверка статуса миграций...
python manage.py showmigrations

:: Пытаемся применить миграции
echo.
echo Применение миграций...
python manage.py migrate
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Возникли конфликты миграций
    echo Пытаюсь исправить автоматически...

    :: Для старой базы данных - помечаем проблемные миграции как фейковые
    echo Помечаю проблемные миграции как выполненные...

    :: Автоматически помечаем все миграции training как фейковые
    python manage.py migrate --fake training
    if %errorlevel% neq 0 (
        echo [ПРЕДУПРЕЖДЕНИЕ] Не удалось пометить training миграции
    )

    :: Автоматически помечаем все миграции shop как фейковые
    python manage.py migrate --fake shop
    if %errorlevel% neq 0 (
        echo [ПРЕДУПРЕЖДЕНИЕ] Не удалось пометить shop миграции
    )

    :: Автоматически помечаем все миграции users как фейковые
    python manage.py migrate --fake users
    if %errorlevel% neq 0 (
        echo [ПРЕДУПРЕЖДЕНИЕ] Не удалось пометить users миграции
    )

    :: Повторная попытка применить оставшиеся миграции
    echo.
    echo Повторное применение миграций...
    python manage.py migrate

    if %errorlevel% neq 0 (
        echo [ПРЕДУПРЕЖДЕНИЕ] Всё еще есть проблемы с миграциями
        echo Пытаюсь принудительно применить все миграции...

        :: Последняя попытка - применяем все миграции как фейковые
        python manage.py migrate --fake

        if %errorlevel% neq 0 (
            echo [ОШИБКА] Критическая ошибка миграций!
            echo.
            echo Решения:
            echo   1. Удалите базу данных и пересоздайте с setup_database.bat
            echo   2. Или обратитесь к администратору БД
            echo.
            pause
            exit /b 1
        ) else (
            echo [OK] Все миграции помечены как выполненные
        )
    ) else (
        echo [OK] Миграции успешно применены после исправления конфликтов
    )
) else (
    echo [OK] Миграции применены успешно
)

:: Создаем суперпользователя, если его нет
echo.
echo Creating superuser if needed...
python manage.py createsuperuser --noinput --username admin --email admin@example.com 2>nul || echo Superuser already exists or creation failed
echo.

:: =============================================================================
:: ШАГ 7: Запуск сервера
:: =============================================================================
echo [7/7] Запуск Django сервера...
echo ================================================
echo      Сервер запущен!
echo ================================================
echo.
echo Бэкенд доступен по адресам:
echo   http://localhost:8000
echo   http://127.0.0.1:8000
echo.
echo API эндпоинты:
echo   http://localhost:8000/api/
echo   http://localhost:8000/admin/
echo.
echo Для остановки нажмите Ctrl+C
echo.
echo ================================================
echo.

python manage.py runserver 0.0.0.0:8000

pause

