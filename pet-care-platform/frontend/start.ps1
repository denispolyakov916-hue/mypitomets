# Скрипт для запуска фронтенда
# Использование: .\start.ps1

Write-Host "🚀 Запуск фронтенда Питомец+" -ForegroundColor Green
Write-Host ""

# Проверка Node.js
Write-Host "Проверка Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js не установлен!" -ForegroundColor Red
    Write-Host "Скачайте и установите Node.js с https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Node.js установлен: $nodeVersion" -ForegroundColor Green
Write-Host ""

# Проверка зависимостей
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Установка зависимостей..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Ошибка при установке зависимостей!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Зависимости установлены" -ForegroundColor Green
    Write-Host ""
}

# Проверка .env файла
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Файл .env не найден. Создаю..." -ForegroundColor Yellow
    "VITE_API_URL=http://192.168.1.139:8000/api" | Out-File -FilePath .env -Encoding utf8
    Write-Host "✅ Файл .env создан" -ForegroundColor Green
    Write-Host ""
}

# Предупреждение о бэкенде
Write-Host "⚠️  ВАЖНО: Убедитесь, что бэкенд запущен!" -ForegroundColor Yellow
Write-Host "   Запустите в другом терминале:" -ForegroundColor Yellow
Write-Host "   cd ..\backend" -ForegroundColor Cyan
Write-Host "   python manage.py runserver 0.0.0.0:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Нажмите любую клавишу для запуска фронтенда..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Запуск dev сервера
Write-Host ""
Write-Host "🚀 Запуск dev-сервера..." -ForegroundColor Green
Write-Host ""
npm run dev

