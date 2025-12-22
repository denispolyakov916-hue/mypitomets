@echo off
chcp 65001 >nul
echo ================================================
echo      Питомец+ - Запуск бэкенда (Windows)
echo ================================================
echo.

:: Переход в директорию скрипта
cd /d "%~dp0"

:: Проверка Python
echo [1/6] Проверка Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Python не установлен!
    echo Установите Python 3.10+ с https://www.python.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] Python установлен: %PYTHON_VERSION%
echo.

:: Проверка виртуального окружения
echo [2/6] Проверка виртуального окружения...
if not exist "venv" (
    if not exist ".venv" (
        echo [INFO] Виртуальное окружение не найдено. Создаю...
        python -m venv venv
        if %errorlevel% neq 0 (
            echo [ОШИБКА] Не удалось создать виртуальное окружение!
            pause
            exit /b 1
        )
        echo [OK] Виртуальное окружение создано
        echo.
        echo [INFO] Установка зависимостей...
        call venv\Scripts\activate.bat
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        if %errorlevel% neq 0 (
            echo [ОШИБКА] Не удалось установить зависимости!
            pause
            exit /b 1
        )
        echo [OK] Зависимости установлены
    ) else (
        echo [OK] Найдено виртуальное окружение .venv
    )
) else (
    echo [OK] Найдено виртуальное окружение venv
)
echo.

:: Активация виртуального окружения
echo [3/6] Активация виртуального окружения...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    set VENV_ACTIVATED=1
) else if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
    set VENV_ACTIVATED=1
) else (
    echo [ОШИБКА] Не удалось активировать виртуальное окружение!
    pause
    exit /b 1
)
echo [OK] Виртуальное окружение активировано
echo.

:: Проверка .env файла
echo [4/6] Проверка конфигурации...
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

:: Проверка подключения к БД
echo [5/6] Проверка подключения к базе данных...
python manage.py check --database default >nul 2>&1
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Проблемы с подключением к БД
    echo Убедитесь, что:
    echo   1. PostgreSQL запущен
    echo   2. База данных создана (выполните setup_database.bat)
    echo   3. Настройки в .env файле корректны
    echo.
    choice /C YN /M "Продолжить запуск"
    if errorlevel 2 (
        echo Запуск отменен
        pause
        exit /b 1
    )
) else (
    echo [OK] Подключение к БД успешно
)
echo.

:: Применение миграций
echo [6/6] Проверка миграций...
python manage.py migrate --check >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Обнаружены непримененные миграции. Применяю...
    python manage.py migrate
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Не удалось применить миграции!
        pause
        exit /b 1
    )
    echo [OK] Миграции применены
) else (
    echo [OK] Все миграции применены
)
echo.

:: Запуск сервера
echo ================================================
echo      Запуск Django сервера...
echo ================================================
echo.
echo Бэкенд будет доступен по адресам:
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

