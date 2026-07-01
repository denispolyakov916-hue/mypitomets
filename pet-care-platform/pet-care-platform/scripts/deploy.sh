#!/usr/bin/env bash
# =============================================================================
# Официальный деплой Питомец+ (beta). ЕДИНСТВЕННЫЙ санкционированный способ.
#
#   ./scripts/deploy.sh             — полный деплой
#   ./scripts/deploy.sh --rollback  — откат кода на предыдущий commit (.last-deploy)
#
# Правила:
#  - БЭКАП ОБЯЗАТЕЛЕН: без успешного бэкапа БД деплой ОСТАНАВЛИВАЕТСЯ.
#  - Сервер = зеркало origin/main: git fetch + reset --hard origin/main (в скрипте).
#  - Лог НАКАПЛИВАЕТСЯ (+ страховочная ротация; основная — через logrotate).
#  - Пишется rollback-точка (.last-deploy: prev commit + файл бэкапа).
#  - НЕТ docker compose down (near-zero-downtime); НЕТ ручных reset вне скрипта.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPO_DIR="$(git -C "$PROJECT_DIR" rev-parse --show-toplevel)"
COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml"
LOG_FILE="$PROJECT_DIR/deploy.log"
STATE_FILE="$PROJECT_DIR/.last-deploy"
BRANCH="main"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()   { echo -e "${GREEN}[DEPLOY]${NC} $(date '+%F %T') $*" | tee -a "$LOG_FILE"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%F %T') $*" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[ERROR]${NC} $(date '+%F %T') $*" | tee -a "$LOG_FILE"; exit 1; }

rotate_log() {
    if [ -f "$LOG_FILE" ] && [ "$(stat -c%s "$LOG_FILE")" -gt 5242880 ]; then
        gzip -c "$LOG_FILE" > "${LOG_FILE}.$(date '+%Y%m%d_%H%M%S').gz" && : > "$LOG_FILE"
    fi
}

preflight() {
    command -v docker >/dev/null || error "Docker не установлен"
    $COMPOSE version >/dev/null 2>&1 || error "Docker Compose недоступен"
    [ -f "$PROJECT_DIR/backend/.env" ] || error "backend/.env не найден"
    cd "$REPO_DIR"
    log "git fetch origin…"; git fetch origin --quiet
    local br; br=$(git rev-parse --abbrev-ref HEAD)
    PREV_COMMIT=$(git rev-parse HEAD)
    log "Ветка: $br | текущий: $(git rev-parse --short HEAD) | цель origin/$BRANCH: $(git rev-parse --short "origin/$BRANCH")"
    [ "$br" = "$BRANCH" ] || warn "Сервер не на '$BRANCH' ($br) — деплой переведёт на origin/$BRANCH"
    if [ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$BRANCH")" ]; then
        warn "Уже на origin/$BRANCH — будет пересборка/перезапуск без смены кода"
    fi
}

do_backup() {
    log "Обязательный бэкап перед деплоем…"
    if ! bash "$SCRIPT_DIR/backup-db.sh" 2>&1 | tee -a "$LOG_FILE"; then
        error "БЭКАП НЕ СОЗДАН/НЕ ПРОШЁЛ ПРОВЕРКУ — деплой остановлен (нет бэкапа → нет деплоя)"
    fi
    LAST_BACKUP=$(find "$PROJECT_DIR/backups" -maxdepth 1 -name 'pitomets_2*.sql.gz' -printf '%T+ %p\n' 2>/dev/null | sort | tail -1 | awk '{print $2}')
    [ -n "${LAST_BACKUP:-}" ] || error "Свежий файл бэкапа не найден — деплой остановлен"
    log "Бэкап для отката: $(basename "$LAST_BACKUP")"
}

update_code() {
    cd "$REPO_DIR"
    git checkout "$BRANCH" --quiet 2>/dev/null || git checkout -B "$BRANCH" "origin/$BRANCH" --quiet
    git reset --hard "origin/$BRANCH" 2>&1 | tee -a "$LOG_FILE"
    log "Код обновлён до $(git rev-parse --short HEAD)"
}

record_rollback() {
    {
        echo "DEPLOY_AT=$(date '+%F %T')"
        echo "PREV_COMMIT=$PREV_COMMIT"
        echo "NEW_COMMIT=$(git -C "$REPO_DIR" rev-parse HEAD)"
        echo "BACKUP=${LAST_BACKUP:-}"
    } > "$STATE_FILE"
    log "Rollback-точка: prev=$(git -C "$REPO_DIR" rev-parse --short "$PREV_COMMIT") backup=$(basename "${LAST_BACKUP:-—}")"
}

build_migrate_up() {
    log "Сборка образов…"; $COMPOSE build 2>&1 | tee -a "$LOG_FILE"
    log "Проверка дрейфа миграций…"
    $COMPOSE run --rm --no-deps backend python manage.py makemigrations --check --dry-run 2>&1 | tee -a "$LOG_FILE" \
        || warn "Есть незамигрированные изменения моделей — проверьте перед следующей разработкой"
    log "Миграции…"; $COMPOSE run --rm backend python manage.py migrate --noinput 2>&1 | tee -a "$LOG_FILE"
    log "Запуск (up -d, без down)…"; $COMPOSE up -d 2>&1 | tee -a "$LOG_FILE"
}

health() {
    log "Health-check (до 60с)…"
    for _ in $(seq 1 12); do
        curl -sf http://127.0.0.1/api/health/ >/dev/null 2>&1 && { log "Приложение здорово"; return 0; }
        sleep 5
    done
    error "Health-check не прошёл за 60с. Откат: ./scripts/deploy.sh --rollback (БД — ./scripts/backup-db.sh --restore ${LAST_BACKUP:-<файл>})"
}

cleanup() {
    docker image prune -f --filter 'until=168h' >/dev/null 2>&1 || true
    docker builder prune -f --filter 'until=168h' >/dev/null 2>&1 || true
    log "Очистка образов и build cache — ок"
}

rollback_code() {
    [ -f "$STATE_FILE" ] || error "Нет $STATE_FILE — точка отката неизвестна"
    # shellcheck disable=SC1090
    . "$STATE_FILE"
    [ -n "${PREV_COMMIT:-}" ] || error "PREV_COMMIT пуст в $STATE_FILE"
    warn "Откат кода: $(git -C "$REPO_DIR" rev-parse --short HEAD) → ${PREV_COMMIT:0:12}"
    read -rp "Подтвердить откат кода (yes): " c; [ "$c" = "yes" ] || { log "Отменено"; exit 0; }
    cd "$REPO_DIR"; git reset --hard "$PREV_COMMIT" 2>&1 | tee -a "$LOG_FILE"
    $COMPOSE build 2>&1 | tee -a "$LOG_FILE"
    $COMPOSE run --rm backend python manage.py migrate --noinput 2>&1 | tee -a "$LOG_FILE" \
        || warn "Миграции при откате требуют внимания (возможна ручная down-миграция)"
    $COMPOSE up -d 2>&1 | tee -a "$LOG_FILE"
    log "Откат кода завершён. При необходимости откат БД: ./scripts/backup-db.sh --restore ${BACKUP:-<файл>}"
}

rotate_log
printf '\n======== ДЕПЛОЙ %s ========\n' "$(date '+%F %T')" | tee -a "$LOG_FILE"

case "${1:-}" in
  --rollback) rollback_code ;;
  *)
    preflight
    do_backup
    update_code
    record_rollback
    build_migrate_up
    health
    cleanup
    log "ДЕПЛОЙ ЗАВЕРШЁН УСПЕШНО → $(git -C "$REPO_DIR" rev-parse --short HEAD)"
    $COMPOSE ps
    ;;
esac
