#!/bin/bash
# Скрипт развертывания для production (Linux/macOS)

set -e  # Остановка при ошибке

echo "=========================================="
echo "🚀 Развертывание платформы 'Питомец+'"
echo "=========================================="
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверка окружения
check_environment() {
    log "Проверка окружения..."
    
    # Проверка Python
    if ! command -v python3 &> /dev/null; then
        error "Python 3 не установлен"
    fi
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    log "Python версия: $PYTHON_VERSION"
    
    # Проверка Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js не установлен"
    fi
    NODE_VERSION=$(node --version)
    log "Node.js версия: $NODE_VERSION"
    
    # Проверка PostgreSQL
    if ! command -v psql &> /dev/null; then
        warning "PostgreSQL клиент не найден (проверка БД будет пропущена)"
    fi
}

# Резервная копия перед развертыванием
create_backup() {
    log "Создание резервной копии..."
    
    BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    cd backend
    source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
    
    # Резервная копия БД
    if python manage.py backup_database --format sql --compress --output "../$BACKUP_DIR/db_backup.sql.gz" 2>/dev/null; then
        log "Резервная копия БД создана"
    else
        warning "Не удалось создать резервную копию БД"
    fi
    
    cd ..
    
    # Резервная копия медиа файлов
    if [ -d "backend/media" ]; then
        tar -czf "$BACKUP_DIR/media.tar.gz" backend/media/ 2>/dev/null || warning "Не удалось создать резервную копию медиа"
    fi
    
    log "Резервная копия сохранена в $BACKUP_DIR"
}

# Развертывание Backend
deploy_backend() {
    log "Развертывание Backend..."
    
    cd backend
    
    # Создание виртуального окружения если не существует
    if [ ! -d "venv" ]; then
        log "Создание виртуального окружения..."
        python3 -m venv venv
    fi
    
    # Активация виртуального окружения
    source venv/bin/activate
    
    # Установка зависимостей
    log "Установка зависимостей..."
    pip install --upgrade pip
    pip install -r requirements.txt
    
    # Проверка .env файла
    if [ ! -f ".env" ]; then
        warning ".env файл не найден, создайте его на основе .env.example"
    fi
    
    # Применение миграций
    log "Применение миграций..."
    python manage.py migrate --noinput
    
    # Сбор статических файлов
    log "Сбор статических файлов..."
    python manage.py collectstatic --noinput
    
    # Валидация данных
    log "Валидация данных..."
    python manage.py validate_test_data --no-fix || warning "Обнаружены проблемы с данными"
    
    cd ..
    log "Backend развернут успешно"
}

# Развертывание Frontend
deploy_frontend() {
    log "Развертывание Frontend..."
    
    cd frontend
    
    # Установка зависимостей
    log "Установка зависимостей..."
    npm install
    
    # Проверка .env файла
    if [ ! -f ".env" ]; then
        warning ".env файл не найден, создайте его на основе .env.example"
    fi
    
    # Сборка для production
    log "Сборка для production..."
    npm run build
    
    cd ..
    log "Frontend развернут успешно"
}

# Основная функция
main() {
    echo ""
    log "Начало развертывания..."
    echo ""
    
    # Проверка окружения
    check_environment
    echo ""
    
    # Резервная копия
    if [ "$1" != "--no-backup" ]; then
        create_backup
        echo ""
    fi
    
    # Развертывание
    deploy_backend
    echo ""
    deploy_frontend
    echo ""
    
    echo "=========================================="
    log "✅ Развертывание завершено успешно!"
    echo "=========================================="
    echo ""
    echo "Следующие шаги:"
    echo "  1. Проверьте настройки в .env файлах"
    echo "  2. Запустите сервер: cd backend && gunicorn config.wsgi:application"
    echo "  3. Настройте Nginx для раздачи статических файлов"
    echo ""
}

# Обработка аргументов
case "${1:-}" in
    "--no-backup")
        main --no-backup
        ;;
    "--help"|"-h")
        echo "Использование: ./scripts/deploy.sh [--no-backup]"
        echo ""
        echo "Опции:"
        echo "  --no-backup    Пропустить создание резервной копии"
        echo "  --help, -h     Показать эту справку"
        ;;
    *)
        main
        ;;
esac

