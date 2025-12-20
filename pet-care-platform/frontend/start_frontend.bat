@echo off
chcp 65001 >nul
echo ================================================
echo      Питомец+ - Запуск фронтенда
echo ================================================
echo.

:: Переход в директорию скрипта
cd /d "%~dp0"

:: Проверка Node.js
echo [1/4] Проверка Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не установлен!
    echo Скачайте и установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js установлен: %NODE_VERSION%
echo.

:: Проверка зависимостей
echo [2/4] Проверка зависимостей...
if not exist "node_modules" (
    echo [INFO] Установка зависимостей...
    call npm install
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Ошибка при установке зависимостей!
        pause
        exit /b 1
    )
    echo [OK] Зависимости установлены
) else (
    echo [OK] Зависимости найдены
)
echo.

:: Проверка .env файла
echo [3/4] Проверка файла .env...
if not exist ".env" (
    echo [INFO] Файл .env не найден. Создаю...
    (
        echo VITE_API_URL=http://192.168.1.139:8000/api
    ) > .env
    echo [OK] Файл .env создан с адресом бекенда: http://192.168.1.139:8000/api
) else (
    echo [OK] Файл .env найден
    echo [INFO] Текущий VITE_API_URL в .env будет использован
    echo [INFO] Если нужно изменить, отредактируйте файл .env
)
echo.

:: Предупреждение о бэкенде
echo [4/4] Проверка готовности...
echo.
echo ⚠️  ВАЖНО: Убедитесь, что бэкенд запущен!
echo    Запустите в другом терминале:
echo    cd ..\backend
echo    venv\Scripts\activate
echo    python manage.py runserver 0.0.0.0:8000
echo.
echo Нажмите любую клавишу для запуска фронтенда...
pause >nul

:: Запуск dev сервера
echo.
echo ================================================
echo      Запуск dev-сервера...
echo ================================================
echo.
echo Фронтенд будет доступен по адресу:
echo   http://localhost:5173
echo.
echo Для остановки нажмите Ctrl+C
echo.
call npm run dev

pause

