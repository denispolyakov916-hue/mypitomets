#!/usr/bin/env bash
# =============================================================================
# Бэкап PostgreSQL из Docker-контейнера
#
# Использование:
#   ./scripts/backup-db.sh               — создать бэкап
#   ./scripts/backup-db.sh --restore FILE — восстановить из файла
#
# Автоматизация (crontab):
#   0 3 * * * /path/to/scripts/backup-db.sh >> /var/log/petplus-backup.log 2>&1
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml"
BACKUP_DIR="$PROJECT_DIR/backups"
MAX_DAILY=7
MAX_WEEKLY=4

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[BACKUP]${NC} $(date '+%H:%M:%S') $*"; }
error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $*"; exit 1; }

# Чтение переменных из .env
load_env() {
    if [ -f "$PROJECT_DIR/backend/.env" ]; then
        DB_NAME=$(grep -E '^DB_NAME=' "$PROJECT_DIR/backend/.env" | cut -d= -f2 || echo "pitomets_db")
        DB_USER=$(grep -E '^DB_USER=' "$PROJECT_DIR/backend/.env" | cut -d= -f2 || echo "pitomets")
    else
        DB_NAME="pitomets_db"
        DB_USER="pitomets"
    fi
}

# ---- Создание бэкапа ----
create_backup() {
    mkdir -p "$BACKUP_DIR"
    load_env

    local timestamp
    timestamp=$(date '+%Y%m%d_%H%M%S')
    local day_of_week
    day_of_week=$(date '+%u')
    local filename="pitomets_${timestamp}.sql.gz"

    log "Создание бэкапа: $filename"

    $COMPOSE exec -T db pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-owner \
        --no-acl \
        --format=plain \
        | gzip > "$BACKUP_DIR/$filename"

    local size
    size=$(du -h "$BACKUP_DIR/$filename" | cut -f1)
    log "Бэкап создан: $filename ($size)"

    # Еженедельный бэкап (воскресенье)
    if [ "$day_of_week" -eq 7 ]; then
        local weekly_name="pitomets_weekly_${timestamp}.sql.gz"
        cp "$BACKUP_DIR/$filename" "$BACKUP_DIR/$weekly_name"
        log "Еженедельная копия: $weekly_name"
    fi

    rotate_backups
}

# ---- Ротация бэкапов ----
rotate_backups() {
    log "Ротация бэкапов (ежедневные: $MAX_DAILY, еженедельные: $MAX_WEEKLY)..."

    # Ежедневные (без weekly в имени)
    local count
    count=$(find "$BACKUP_DIR" -name "pitomets_2*.sql.gz" ! -name "*weekly*" | wc -l)
    if [ "$count" -gt "$MAX_DAILY" ]; then
        local to_remove=$((count - MAX_DAILY))
        find "$BACKUP_DIR" -name "pitomets_2*.sql.gz" ! -name "*weekly*" -printf '%T+ %p\n' \
            | sort | head -n "$to_remove" | awk '{print $2}' | xargs rm -f
        log "Удалено $to_remove старых ежедневных бэкапов"
    fi

    # Еженедельные
    count=$(find "$BACKUP_DIR" -name "pitomets_weekly_*.sql.gz" | wc -l)
    if [ "$count" -gt "$MAX_WEEKLY" ]; then
        local to_remove=$((count - MAX_WEEKLY))
        find "$BACKUP_DIR" -name "pitomets_weekly_*.sql.gz" -printf '%T+ %p\n' \
            | sort | head -n "$to_remove" | awk '{print $2}' | xargs rm -f
        log "Удалено $to_remove старых еженедельных бэкапов"
    fi
}

# ---- Восстановление из бэкапа ----
restore_backup() {
    local file="$1"
    [ -f "$file" ] || error "Файл не найден: $file"

    load_env
    log "ВНИМАНИЕ: Восстановление из $file заменит ВСЮ базу данных!"
    read -rp "Продолжить? (yes/no): " confirm
    [ "$confirm" = "yes" ] || { log "Отменено."; exit 0; }

    log "Восстановление БД из $file..."
    gunzip -c "$file" | $COMPOSE exec -T db psql -U "$DB_USER" -d "$DB_NAME" --single-transaction

    log "Восстановление завершено!"
}

# =============================================================================
# Основной скрипт
# =============================================================================

case "${1:-}" in
    --restore)
        [ -n "${2:-}" ] || error "Укажите файл: ./scripts/backup-db.sh --restore backups/file.sql.gz"
        restore_backup "$2"
        ;;
    *)
        create_backup
        ;;
esac
