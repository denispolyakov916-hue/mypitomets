#!/bin/bash

# Финальный скрипт развертывания конструктора графиков
# Выполняет полную проверку и развертывание системы

set -e

echo "🚀 Начинаем финальное развертывание конструктора графиков..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

# Проверка наличия Node.js
check_node() {
    log "Проверка Node.js..."
    if ! command -v node &> /dev/null; then
        error "Node.js не установлен"
        exit 1
    fi

    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        error "Требуется Node.js версии 16 или выше"
        exit 1
    fi
    success "Node.js v$(node --version)"
}

# Проверка наличия Python
check_python() {
    log "Проверка Python..."
    if ! command -v python &> /dev/null; then
        error "Python не установлен"
        exit 1
    fi

    PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}' | cut -d'.' -f1)
    if [ "$PYTHON_VERSION" -lt 3 ]; then
        error "Требуется Python версии 3.x"
        exit 1
    fi
    success "Python $(python --version)"
}

# Проверка зависимостей frontend
check_frontend_deps() {
    log "Проверка зависимостей frontend..."
    cd frontend

    if [ ! -d "node_modules" ]; then
        warning "Установка зависимостей frontend..."
        npm install
    fi

    # Проверка наличия критических зависимостей
    if ! npm list d3 &> /dev/null; then
        error "D3.js не установлен"
        exit 1
    fi

    if ! npm list react &> /dev/null; then
        error "React не установлен"
        exit 1
    fi

    success "Зависимости frontend установлены"
    cd ..
}

# Проверка зависимостей backend
check_backend_deps() {
    log "Проверка зависимостей backend..."
    cd backend

    if [ ! -d "venv" ]; then
        warning "Создание виртуального окружения..."
        python -m venv venv
    fi

    source venv/bin/activate

    if [ ! -f "requirements.txt" ]; then
        error "Файл requirements.txt не найден"
        exit 1
    fi

    pip install -r requirements.txt
    success "Зависимости backend установлены"

    cd ..
}

# Запуск тестов
run_tests() {
    log "Запуск тестов..."

    # Frontend тесты
    cd frontend
    log "Запуск frontend тестов..."
    if npm run test:run; then
        success "Frontend тесты пройдены"
    else
        error "Frontend тесты не пройдены"
        exit 1
    fi

    # Backend тесты
    cd ../backend
    log "Запуск backend тестов..."
    source venv/bin/activate
    if python manage.py test; then
        success "Backend тесты пройдены"
    else
        error "Backend тесты не пройдены"
        exit 1
    fi

    cd ..
}

# Проверка сборки
check_build() {
    log "Проверка сборки..."

    cd frontend

    # Проверка TypeScript
    if npm run build 2>&1 | grep -q "error"; then
        error "Сборка frontend не удалась"
        exit 1
    fi
    success "Frontend сборка успешна"

    cd ..
}

# Создание миграций базы данных
setup_database() {
    log "Настройка базы данных..."

    cd backend
    source venv/bin/activate

    # Создание миграций
    python manage.py makemigrations analytics
    python manage.py migrate

    success "База данных настроена"
    cd ..
}

# Заполнение начальными данными
seed_data() {
    log "Заполнение начальными данными..."

    cd backend
    source venv/bin/activate

    # Запуск команды для создания метрик
    python manage.py initialize_analytics_metrics

    success "Начальные данные загружены"
    cd ..
}

# Финальная проверка
final_check() {
    log "Финальная проверка системы..."

    # Проверка наличия всех файлов
    required_files=(
        "frontend/src/admin/components/ChartBuilder/ChartBuilder.jsx"
        "frontend/src/utils/d3-helpers.js"
        "frontend/src/utils/virtualization.js"
        "backend/apps/analytics/models.py"
        "backend/apps/analytics/views.py"
        "docs/TZ/chart-constructor-specification.md"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            error "Файл $file не найден"
            exit 1
        fi
    done

    success "Все необходимые файлы присутствуют"
}

# Создание резервной копии
create_backup() {
    log "Создание резервной копии..."

    BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Копирование важных файлов
    cp -r frontend/src "$BACKUP_DIR/"
    cp -r backend/apps "$BACKUP_DIR/"
    cp docs/TZ/chart-constructor-specification.md "$BACKUP_DIR/"

    success "Резервная копия создана в $BACKUP_DIR"
}

# Основная функция
main() {
    echo "==============================================="
    echo "🏗️  Финальное развертывание конструктора графиков"
    echo "==============================================="

    # Выполнение всех проверок
    check_node
    check_python
    check_frontend_deps
    check_backend_deps
    run_tests
    check_build
    setup_database
    seed_data
    final_check

    echo ""
    echo "==============================================="
    success "🎉 Конструктор графиков успешно развернут!"
    echo ""
    echo "Доступные команды:"
    echo "  Frontend dev server: cd frontend && npm run dev"
    echo "  Backend server: cd backend && python manage.py runserver"
    echo "  Запуск тестов: cd frontend && npm run test"
    echo ""
    echo "Документация: docs/TZ/chart-constructor-specification.md"
    echo "==============================================="
}

# Обработка аргументов командной строки
case "${1:-}" in
    "backup")
        create_backup
        ;;
    "test")
        run_tests
        ;;
    "check")
        final_check
        ;;
    *)
        main
        ;;
esac
