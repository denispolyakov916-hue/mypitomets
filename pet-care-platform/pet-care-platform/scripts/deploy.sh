#!/usr/bin/env bash
# =============================================================================
# Скрипт деплоя Питомец+ на production
#
# Использование:
#   ./scripts/deploy.sh              — полный деплой
#   ./scripts/deploy.sh --no-build   — деплой без пересборки образов
#   ./scripts/deploy.sh --migrate    — только миграции
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml"
LOG_FILE="$PROJECT_DIR/deploy.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $(date '+%H:%M:%S') $*" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%H:%M:%S') $*" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $*" | tee -a "$LOG_FILE"; exit 1; }

# ---- Проверки ----
check_requirements() {
    command -v docker >/dev/null 2>&1 || error "Docker не установлен"
    docker compose version >/dev/null 2>&1 || error "Docker Compose v2 не установлен"
    [ -f "$PROJECT_DIR/backend/.env" ] || error "backend/.env не найден. Скопируйте backend/.env.production.example в backend/.env"
}

# ---- Бэкап БД перед деплоем ----
backup_before_deploy() {
    if $COMPOSE ps db --status running -q 2>/dev/null | grep -q .; then
        log "Создание бэкапа БД перед деплоем..."
        bash "$SCRIPT_DIR/backup-db.sh" || warn "Не удалось создать бэкап (первый деплой?)"
    fi
}

# ---- Обновление кода ----
pull_code() {
    log "Обновление кода из Git..."
    cd "$PROJECT_DIR"
    git pull --ff-only || error "Не удалось обновить код. Разрешите конфликты вручную."
}

# ---- Сборка образов ----
build_images() {
    log "Сборка Docker-образов..."
    $COMPOSE build --parallel 2>&1 | tee -a "$LOG_FILE"
}

# ---- Миграции ----
run_migrations() {
    log "Применение миграций БД..."
    $COMPOSE run --rm backend python manage.py migrate --noinput 2>&1 | tee -a "$LOG_FILE"
}

# ---- Запуск сервисов ----
start_services() {
    log "Запуск сервисов..."
    $COMPOSE up -d 2>&1 | tee -a "$LOG_FILE"
}

# ---- Проверка здоровья ----
health_check() {
    log "Проверка здоровья (ожидание до 60 сек)..."
    local retries=12
    local wait=5
    local health_url="${HEALTHCHECK_URL:-}"
    local fallback_url="http://localhost/api/health/"

    if [ -z "$health_url" ] && [ -f "$PROJECT_DIR/backend/.env" ]; then
        local client_url
        client_url="$(grep -E '^(CLIENT_URL|API_URL)=' "$PROJECT_DIR/backend/.env" | head -n 1 | cut -d= -f2- | tr -d '"' | sed 's#/$##')" || true
        if [ -n "$client_url" ]; then
            health_url="${client_url}/api/health/"
        fi
    fi

    for i in $(seq 1 $retries); do
        if [ -n "$health_url" ] && curl -ksf "$health_url" > /dev/null 2>&1; then
            log "Приложение работает корректно! ($health_url)"
            return 0
        fi
        if curl -sf "$fallback_url" > /dev/null 2>&1; then
            log "Приложение работает корректно! ($fallback_url)"
            return 0
        fi
        warn "Попытка $i/$retries — сервис ещё не готов, ждём ${wait}с..."
        sleep $wait
    done

    error "Приложение не ответило на health check за 60 секунд"
}

# ---- Очистка ----
cleanup() {
    log "Очистка неиспользуемых Docker-образов..."
    docker image prune -f --filter "until=168h" 2>/dev/null || true
}

# ---- Статус ----
show_status() {
    echo ""
    log "=== Статус сервисов ==="
    $COMPOSE ps
    echo ""
    log "Деплой завершён успешно!"
}

# =============================================================================
# Основной скрипт
# =============================================================================

echo "" > "$LOG_FILE"
log "Начало деплоя Питомец+ $(date '+%Y-%m-%d %H:%M:%S')"
log "========================================"

check_requirements

case "${1:-}" in
    --no-build)
        log "Режим: деплой без пересборки"
        pull_code
        backup_before_deploy
        run_migrations
        start_services
        health_check
        show_status
        ;;
    --migrate)
        log "Режим: только миграции"
        run_migrations
        ;;
    *)
        log "Режим: полный деплой"
        pull_code
        backup_before_deploy
        build_images
        run_migrations
        start_services
        health_check
        cleanup
        show_status
        ;;
esac
