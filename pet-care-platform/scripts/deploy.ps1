# Скрипт развертывания для production (Windows PowerShell)

param(
    [switch]$NoBackup
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 Развертывание платформы 'Питомец+'" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Функция для логирования
function Log-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Log-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    exit 1
}

function Log-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

# Проверка окружения
function Test-Environment {
    Log-Info "Проверка окружения..."
    
    # Проверка Python
    try {
        $pythonVersion = python --version 2>&1
        Log-Info "Python версия: $pythonVersion"
    } catch {
        Log-Error "Python не установлен"
    }
    
    # Проверка Node.js
    try {
        $nodeVersion = node --version
        Log-Info "Node.js версия: $nodeVersion"
    } catch {
        Log-Error "Node.js не установлен"
    }
}

# Резервная копия перед развертыванием
function New-Backup {
    Log-Info "Создание резервной копии..."
    
    $backupDir = "backups/$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    Push-Location backend
    
    # Активация виртуального окружения
    if (Test-Path "venv\Scripts\Activate.ps1") {
        & "venv\Scripts\Activate.ps1"
    } else {
        Log-Warning "Виртуальное окружение не найдено, создание..."
        python -m venv venv
        & "venv\Scripts\Activate.ps1"
    }
    
    # Резервная копия БД
    try {
        python manage.py backup_database --format sql --compress --output "../$backupDir/db_backup.sql.gz" 2>&1 | Out-Null
        Log-Info "Резервная копия БД создана"
    } catch {
        Log-Warning "Не удалось создать резервную копию БД"
    }
    
    Pop-Location
    
    # Резервная копия медиа файлов
    if (Test-Path "backend\media") {
        try {
            Compress-Archive -Path "backend\media\*" -DestinationPath "$backupDir\media.zip" -Force
            Log-Info "Резервная копия медиа создана"
        } catch {
            Log-Warning "Не удалось создать резервную копию медиа"
        }
    }
    
    Log-Info "Резервная копия сохранена в $backupDir"
}

# Развертывание Backend
function Deploy-Backend {
    Log-Info "Развертывание Backend..."
    
    Push-Location backend
    
    # Создание виртуального окружения если не существует
    if (-not (Test-Path "venv\Scripts\python.exe")) {
        Log-Info "Создание виртуального окружения..."
        python -m venv venv
    }
    
    # Активация виртуального окружения
    & "venv\Scripts\Activate.ps1"
    
    # Установка зависимостей
    Log-Info "Установка зависимостей..."
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    
    # Проверка .env файла
    if (-not (Test-Path ".env")) {
        Log-Warning ".env файл не найден, создайте его на основе .env.example"
    }
    
    # Применение миграций
    Log-Info "Применение миграций..."
    python manage.py migrate --noinput
    
    # Сбор статических файлов
    Log-Info "Сбор статических файлов..."
    python manage.py collectstatic --noinput
    
    # Валидация данных
    Log-Info "Валидация данных..."
    python manage.py validate_test_data --no-fix 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Log-Warning "Обнаружены проблемы с данными"
    }
    
    Pop-Location
    Log-Info "Backend развернут успешно"
}

# Развертывание Frontend
function Deploy-Frontend {
    Log-Info "Развертывание Frontend..."
    
    Push-Location frontend
    
    # Установка зависимостей
    Log-Info "Установка зависимостей..."
    npm install
    
    # Проверка .env файла
    if (-not (Test-Path ".env")) {
        Log-Warning ".env файл не найден, создайте его на основе .env.example"
    }
    
    # Сборка для production
    Log-Info "Сборка для production..."
    npm run build
    
    Pop-Location
    Log-Info "Frontend развернут успешно"
}

# Основная функция
function Main {
    Write-Host ""
    Log-Info "Начало развертывания..."
    Write-Host ""
    
    # Проверка окружения
    Test-Environment
    Write-Host ""
    
    # Резервная копия
    if (-not $NoBackup) {
        New-Backup
        Write-Host ""
    }
    
    # Развертывание
    Deploy-Backend
    Write-Host ""
    Deploy-Frontend
    Write-Host ""
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Log-Info "✅ Развертывание завершено успешно!"
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Следующие шаги:"
    Write-Host "  1. Проверьте настройки в .env файлах"
    Write-Host "  2. Запустите сервер: cd backend && gunicorn config.wsgi:application"
    Write-Host "  3. Настройте Nginx для раздачи статических файлов"
    Write-Host ""
}

# Запуск
Main

