#!/usr/bin/env bash
# =============================================================================
# Бэкап Питомец+: PostgreSQL + media-volume, с проверкой целостности, checksum,
# ротацией (7 дневных / 4 недельных / 6 месячных) и off-site по rsync.
#
#   ./scripts/backup-db.sh                        — создать бэкап (БД + media)
#   ./scripts/backup-db.sh --restore FILE         — восстановить БД из файла (подтверждение)
#   ./scripts/backup-db.sh --restore-test [FILE]  — тест восстановления во ВРЕМЕННУЮ БД
#   ./scripts/backup-db.sh --verify               — проверить последние бэкапы
#
# Off-site: если задан BACKUP_REMOTE=user@host:/path (окружение или backend/.env) —
# каталог бэкапов синхронизируется rsync по ssh.
#
# Скрипт возвращает НЕнулевой код при любой ошибке — деплой на это опирается.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml"
BACKUP_DIR="$PROJECT_DIR/backups"
MAX_DAILY=7; MAX_WEEKLY=4; MAX_MONTHLY=6
MIN_DB_BYTES=1024

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()   { echo -e "${GREEN}[BACKUP]${NC} $(date '+%F %T') $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%F %T') $*"; }
error() { echo -e "${RED}[ERROR]${NC} $(date '+%F %T') $*"; exit 1; }

load_env() {
    local envf="$PROJECT_DIR/backend/.env"
    if [ -f "$envf" ]; then
        DB_NAME=$(grep -E '^DB_NAME=' "$envf" | head -1 | cut -d= -f2- | tr -d "\"'\r" || true)
        DB_USER=$(grep -E '^DB_USER=' "$envf" | head -1 | cut -d= -f2- | tr -d "\"'\r" || true)
        BACKUP_REMOTE=${BACKUP_REMOTE:-$(grep -E '^BACKUP_REMOTE=' "$envf" | head -1 | cut -d= -f2- | tr -d "\"'\r" || true)}
    fi
    DB_NAME=${DB_NAME:-pitomets_db}; DB_USER=${DB_USER:-pitomets}; BACKUP_REMOTE=${BACKUP_REMOTE:-}
}

checksum() { ( cd "$(dirname "$1")" && sha256sum "$(basename "$1")" > "$(basename "$1").sha256" ); }

backup_db() {
    load_env; mkdir -p "$BACKUP_DIR"
    local ts; ts=$(date '+%Y%m%d_%H%M%S')
    local f="$BACKUP_DIR/pitomets_${ts}.sql.gz"
    log "Дамп БД '$DB_NAME' → $(basename "$f")"
    $COMPOSE exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl --format=plain | gzip > "$f"
    [ "$(stat -c%s "$f")" -ge "$MIN_DB_BYTES" ] || error "Бэкап БД подозрительно мал — прерываю"
    gunzip -t "$f" || error "Бэкап БД повреждён (gunzip -t) — прерываю"
    checksum "$f"
    log "БД OK: $(basename "$f") ($(du -h "$f" | cut -f1))"
    [ "$(date '+%u')" -eq 7 ] && { cp "$f" "$BACKUP_DIR/pitomets_weekly_${ts}.sql.gz"; checksum "$BACKUP_DIR/pitomets_weekly_${ts}.sql.gz"; log "Недельная копия создана"; } || true
    [ "$(date '+%d')" = "01" ] && { cp "$f" "$BACKUP_DIR/pitomets_monthly_${ts}.sql.gz"; checksum "$BACKUP_DIR/pitomets_monthly_${ts}.sql.gz"; log "Месячная копия создана"; } || true
}

backup_media() {
    local vol; vol=$(docker volume ls --format '{{.Name}}' | grep -E 'backend_media$' | head -1 || true)
    [ -n "$vol" ] || { warn "media-volume не найден — пропускаю"; return 0; }
    local ts; ts=$(date '+%Y%m%d_%H%M%S'); local f="$BACKUP_DIR/media_${ts}.tar.gz"
    log "Бэкап media '$vol' → $(basename "$f")"
    docker run --rm -v "$vol":/data:ro -v "$BACKUP_DIR":/backup alpine \
        tar czf "/backup/$(basename "$f")" -C /data . || error "media-бэкап НЕ создан — прерываю (строгий режим: деплой требует DB+media)"
    gunzip -t "$f" || error "media-архив повреждён (gunzip -t) — прерываю"
    checksum "$f"; log "Media OK: $(basename "$f") ($(du -h "$f" | cut -f1))"
}

rotate() {
    local pat="$1" keep="$2" label="$3"
    local n; n=$(find "$BACKUP_DIR" -maxdepth 1 -name "$pat" 2>/dev/null | wc -l)
    if [ "$n" -gt "$keep" ]; then
        find "$BACKUP_DIR" -maxdepth 1 -name "$pat" -printf '%T+ %p\n' | sort | head -n "$((n-keep))" \
            | awk '{print $2}' | while read -r x; do rm -f "$x" "$x.sha256"; done
        log "Ротация $label: удалено $((n-keep))"
    fi
}

offsite() {
    load_env
    [ -n "${BACKUP_REMOTE:-}" ] || { warn "BACKUP_REMOTE не задан — off-site пропущен"; return 0; }
    log "Off-site rsync → $BACKUP_REMOTE"
    rsync -az --timeout=180 "$BACKUP_DIR"/ "$BACKUP_REMOTE"/ || warn "Off-site rsync не удался (локальная копия сохранена)"
}

verify_latest() {
    local ok=0 f
    for f in $(find "$BACKUP_DIR" -maxdepth 1 -name '*.sql.gz' -printf '%T+ %p\n' | sort | tail -3 | awk '{print $2}'); do
        if [ -f "$f.sha256" ] && ( cd "$BACKUP_DIR" && sha256sum -c "$(basename "$f").sha256" >/dev/null 2>&1 ) && gunzip -t "$f" 2>/dev/null; then
            log "OK: $(basename "$f")"; ok=1
        else
            warn "ПОВРЕЖДЁН/без checksum: $(basename "$f")"
        fi
    done
    [ "$ok" -eq 1 ] || error "Нет ни одного валидного бэкапа"
}

restore_test() {
    load_env
    local f="${1:-$(find "$BACKUP_DIR" -maxdepth 1 -name 'pitomets_2*.sql.gz' ! -name '*weekly*' ! -name '*monthly*' -printf '%T+ %p\n' | sort | tail -1 | awk '{print $2}')}"
    [ -f "$f" ] || error "Файл для теста не найден"
    local tdb="${DB_NAME}_restore_test"
    log "Тест восстановления '$(basename "$f")' → временная БД $tdb"
    $COMPOSE exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "DROP DATABASE IF EXISTS \"$tdb\";" >/dev/null
    $COMPOSE exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE DATABASE \"$tdb\";" >/dev/null
    if gunzip -c "$f" | $COMPOSE exec -T db psql -U "$DB_USER" -d "$tdb" -v ON_ERROR_STOP=1 --single-transaction >/dev/null 2>&1; then
        local n; n=$($COMPOSE exec -T db psql -U "$DB_USER" -d "$tdb" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d '\r')
        log "Тест ОК: таблиц восстановлено: $n"
        $COMPOSE exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "DROP DATABASE IF EXISTS \"$tdb\";" >/dev/null
    else
        $COMPOSE exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "DROP DATABASE IF EXISTS \"$tdb\";" >/dev/null
        error "Тест восстановления НЕ прошёл"
    fi
}

restore() {
    load_env
    local f="$1"; [ -f "$f" ] || error "Файл не найден: $f"
    if [ -f "$f.sha256" ]; then
        ( cd "$(dirname "$f")" && sha256sum -c "$(basename "$f").sha256" >/dev/null ) || error "checksum не сошёлся — файл повреждён"
    fi
    gunzip -t "$f" || error "Дамп повреждён (gunzip -t)"
    warn "ВНИМАНИЕ: база $DB_NAME будет ПЕРЕСОЗДАНА (DROP/CREATE) и залита из:"
    warn "  $f"
    warn "Приложение будет НЕДОСТУПНО на время восстановления."
    read -rp "Введите 'RESTORE' для подтверждения: " c; [ "$c" = "RESTORE" ] || { log "Отменено"; exit 0; }
    log "Останавливаю backend/celery (отключаю от БД)…"
    $COMPOSE stop backend celery-worker >/dev/null 2>&1 || true
    log "Пересоздаю базу $DB_NAME…"
    $COMPOSE exec -T db psql -U "$DB_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid<>pg_backend_pid();" >/dev/null
    $COMPOSE exec -T db psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" >/dev/null
    $COMPOSE exec -T db psql -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";" >/dev/null
    log "Заливаю дамп в чистую базу…"
    if gunzip -c "$f" | $COMPOSE exec -T db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --single-transaction >/dev/null 2>&1; then
        log "Восстановление успешно"
    else
        $COMPOSE start backend celery-worker >/dev/null 2>&1 || true
        error "Ошибка восстановления — БД может быть неполной. Backend перезапущен; проверьте вручную."
    fi
    log "Запускаю backend/celery…"
    $COMPOSE start backend celery-worker >/dev/null 2>&1 || $COMPOSE up -d backend celery-worker >/dev/null 2>&1
    log "Готово. Проверьте приложение."
}

case "${1:-}" in
    --restore)      [ -n "${2:-}" ] || error "Укажите файл: --restore backups/file.sql.gz"; restore "$2" ;;
    --restore-test) restore_test "${2:-}" ;;
    --verify)       verify_latest ;;
    *)
        backup_db
        backup_media
        rotate 'pitomets_2*.sql.gz'         "$MAX_DAILY"   'ежедневные'
        rotate 'pitomets_weekly_*.sql.gz'   "$MAX_WEEKLY"  'недельные'
        rotate 'pitomets_monthly_*.sql.gz'  "$MAX_MONTHLY" 'месячные'
        rotate 'media_2*.tar.gz'            "$MAX_DAILY"   'media'
        offsite
        log "Бэкап завершён успешно"
        ;;
esac
