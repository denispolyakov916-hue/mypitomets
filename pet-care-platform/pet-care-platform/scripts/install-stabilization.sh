#!/usr/bin/env bash
# =============================================================================
# Однократная настройка стабилизации на сервере (идемпотентно). Запуск под root.
#
#   ./scripts/install-stabilization.sh timers     — systemd-таймеры (бэкап 03:30 + cert-reload) + logrotate deploy.log
#   ./scripts/install-stabilization.sh cache      — разовая чистка build cache
#   ./scripts/install-stabilization.sh bak        — перенос *.bak (вкл .env.bak) в /root/petplus-attic (chmod 600)
#   ./scripts/install-stabilization.sh env-secret — убрать $TS из DJANGO_SECRET_KEY (sha256-проверка: ключ НЕ меняется)
#   ./scripts/install-stabilization.sh status     — состояние таймеров/диска
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.yml"
ENV_FILE="$PROJECT_DIR/backend/.env"
ATTIC="/root/petplus-attic"

log() { echo "[STAB] $(date '+%F %T') $*"; }
die() { echo "[STAB][ERR] $*" >&2; exit 1; }
[ "$(id -u)" = 0 ] || die "Нужен root (systemd/logrotate/certbot-hook)"

install_timers() {
    cat > /etc/systemd/system/petplus-backup.service <<EOF
[Unit]
Description=Petplus daily backup (DB + media)
After=docker.service
[Service]
Type=oneshot
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/env bash $SCRIPT_DIR/backup-db.sh
EOF
    cat > /etc/systemd/system/petplus-backup.timer <<EOF
[Unit]
Description=Petplus daily backup at 03:30
[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true
[Install]
WantedBy=timers.target
EOF

    cat > /usr/local/bin/petplus-cert-reload.sh <<EOF
#!/usr/bin/env bash
set -e
FLAG="$PROJECT_DIR/certbot/www/.nginx-reload"
if [ -f "\$FLAG" ]; then
    $COMPOSE exec -T nginx nginx -s reload && rm -f "\$FLAG" && echo "nginx reloaded (renewed cert)"
fi
EOF
    chmod +x /usr/local/bin/petplus-cert-reload.sh
    cat > /etc/systemd/system/petplus-cert-reload.service <<EOF
[Unit]
Description=Reload nginx after certbot renewal (flag-based)
[Service]
Type=oneshot
ExecStart=/usr/local/bin/petplus-cert-reload.sh
EOF
    cat > /etc/systemd/system/petplus-cert-reload.timer <<EOF
[Unit]
Description=Hourly check of certbot reload flag
[Timer]
OnCalendar=hourly
Persistent=true
[Install]
WantedBy=timers.target
EOF

    cat > /etc/logrotate.d/petplus-deploy <<EOF
$PROJECT_DIR/deploy.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF

    systemctl daemon-reload
    systemctl enable --now petplus-backup.timer petplus-cert-reload.timer
    log "Таймеры и logrotate установлены:"
    systemctl list-timers 'petplus-*' --no-pager 2>/dev/null | head
}

prune_cache() {
    log "Build cache ДО:"; docker system df | grep -i 'build cache' || true
    docker builder prune -f >/dev/null
    log "Build cache ПОСЛЕ:"; docker system df | grep -i 'build cache' || true
}

move_bak() {
    mkdir -p "$ATTIC"; chmod 700 "$ATTIC"
    local n=0 f
    while IFS= read -r f; do
        [ -e "$f" ] || continue
        mv "$f" "$ATTIC/$(basename "$f").$(date '+%s')"; n=$((n+1))
    done < <(find "$PROJECT_DIR" -maxdepth 4 -name '*.bak*' 2>/dev/null)
    chmod -R 600 "$ATTIC"/* 2>/dev/null || true
    log "Перенесено .bak в $ATTIC: $n (chmod 600)"
    ls -la "$ATTIC" 2>/dev/null | tail -n +2 || true
}

fix_env_secret() {
    [ -f "$ENV_FILE" ] || die "нет $ENV_FILE"
    grep -qE '^DJANGO_SECRET_KEY=.*\$TS' "$ENV_FILE" || { log "В DJANGO_SECRET_KEY нет \$TS — пропускаю"; return 0; }
    local before after
    before=$($COMPOSE exec -T backend python -c "from django.conf import settings;import hashlib;print(hashlib.sha256(settings.SECRET_KEY.encode()).hexdigest())" | tr -d '\r')
    log "sha256(SECRET_KEY) ДО:    $before"
    local backup="/root/.env.pre-tsfix.$(date '+%s')"
    cp "$ENV_FILE" "$backup"
    sed -i '/^DJANGO_SECRET_KEY=/s/\$TS//g' "$ENV_FILE"
    log "Убрал \$TS из .env (копия: $backup), пересоздаю backend для проверки…"
    $COMPOSE up -d backend >/dev/null
    sleep 6
    after=$($COMPOSE exec -T backend python -c "from django.conf import settings;import hashlib;print(hashlib.sha256(settings.SECRET_KEY.encode()).hexdigest())" | tr -d '\r')
    log "sha256(SECRET_KEY) ПОСЛЕ: $after"
    if [ "$before" = "$after" ]; then
        log "✅ SECRET_KEY НЕ изменился — авторизация/сессии целы, предупреждение \$TS устранено."
    else
        log "❌ SECRET_KEY изменился бы — АВТО-ОТКАТ .env и пересоздание backend…"
        cp "$backup" "$ENV_FILE"
        $COMPOSE up -d backend >/dev/null; sleep 4
        die "Откатил .env к исходному ($backup), backend восстановлен со старым ключом. Разбираемся вручную."
    fi
}

case "${1:-}" in
    timers)     install_timers ;;
    cache)      prune_cache ;;
    bak)        move_bak ;;
    env-secret) fix_env_secret ;;
    status)     systemctl list-timers 'petplus-*' --no-pager 2>/dev/null || true; docker system df || true ;;
    *) echo "Использование: $0 {timers|cache|bak|env-secret|status}"; exit 1 ;;
esac
