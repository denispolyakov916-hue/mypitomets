@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: =============================================================================
::                    ПИТОМЕЦ+ - ЗАПУСК ФРОНТЕНДА (Vite + React)
:: =============================================================================

echo.
echo ========================================================================
echo                    ПИТОМЕЦ+ - ЗАПУСК ФРОНТЕНДА
echo                    Порт: 5199 (localhost)
echo ========================================================================
echo.

:: Переход в директорию фронтенда
echo [1/3] Переход в директорию фронтенда...
cd /d "%~dp0frontend"
if errorlevel 1 (
    echo [ОШИБКА] Не удалось перейти в директорию frontend!
    pause
    exit /b 1
)
echo       [OK] %CD%
echo.

:: Проверка Node.js
echo [2/3] Проверка Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Node.js не установлен!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version 2^>^&1') do echo       [OK] Node %%i
echo.

:: Проверка зависимостей
echo [3/3] Проверка зависимостей...
if not exist "node_modules" (
    echo       Устанавливаю зависимости...
    call npm install
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось установить зависимости!
        pause
        exit /b 1
    )
)
echo       [OK] node_modules найден
echo.

echo ========================================================================
echo   ФРОНТЕНД будет запущен на:
echo.
echo   Локально:      http://localhost:5199
echo   React админка: http://localhost:5199/admin/dashboard
echo.
echo   ВАЖНО: Бекенд должен быть запущен на http://localhost:8077
echo ========================================================================
echo.

set /p confirm="Запустить фронтенд? (y/n): "
if /i not "%confirm%"=="y" (
    echo Отменено.
    pause
    exit /b 0
)

echo.
echo [ЗАПУСК] Vite dev-сервер на порту 5199 (localhost)...
echo         Нажмите Ctrl+C для остановки
echo ========================================================================

call npm run dev -- --port 5199 --host localhost

echo.
echo [СТОП] Сервер остановлен.
pause
