@echo off
chcp 65001 >nul
echo ================================================
echo      Питомец+ - Запуск фронтенда (Windows)
echo ================================================
echo.

:: Переход в директорию скрипта
cd /d "%~dp0"

:: Проверка Node.js
echo [1/5] Проверка Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не установлен!
    echo Скачайте и установите Node.js 18+ с https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js установлен: %NODE_VERSION%
echo.

:: Проверка npm
echo [2/5] Проверка npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] npm не найден!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm установлен: %NPM_VERSION%
echo.

:: Проверка и установка зависимостей
echo [3/5] Проверка зависимостей...
if not exist "node_modules" (
    echo [INFO] Зависимости не найдены. Устанавливаю...
    call npm install
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Ошибка при установке зависимостей!
        pause
        exit /b 1
    )
    echo [OK] Зависимости установлены
) else (
    echo [OK] Зависимости найдены
    echo [INFO] Проверка обновлений...
    call npm install
)
echo.

:: Проверка .env файла
echo [4/5] Проверка конфигурации...
if not exist ".env" (
    echo [INFO] Файл .env не найден. Создаю из .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [OK] Файл .env создан с настройками по умолчанию
        echo [INFO] Отредактируйте .env, указав правильный URL бэкенда
    ) else (
        echo [ПРЕДУПРЕЖДЕНИЕ] .env.example не найден
        echo [INFO] Создаю базовый .env файл...
        (
            echo VITE_API_URL=http://localhost:8000/api
        ) > .env
        echo [OK] Файл .env создан
    )
) else (
    echo [OK] Файл .env найден
)
echo.

:: Предупреждение о бэкенде
echo [5/5] Проверка готовности...
echo.
echo ⚠️  ВАЖНО: Убедитесь, что бэкенд запущен!
echo.
echo Если бэкенд не запущен, выполните в другом терминале:
echo   cd ..\backend
echo   .\start_backend.bat
echo.
echo Или вручную:
echo   cd ..\backend
echo   venv\Scripts\activate
echo   python manage.py runserver 0.0.0.0:8000
echo.
echo Нажмите любую клавишу для запуска фронтенда...
pause >nul
echo.

:: Запуск dev сервера
echo ================================================
echo      Запуск Vite dev-сервера...
echo ================================================
echo.
echo Фронтенд будет доступен по адресам:
echo   http://localhost:5173
echo   http://127.0.0.1:5173
echo.
echo Для остановки нажмите Ctrl+C
echo.
echo ================================================
echo.

call npm run dev

pause

