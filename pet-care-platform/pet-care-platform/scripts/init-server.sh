#!/usr/bin/env bash
# =============================================================================
# Первичная настройка сервера для Питомец+
# Запускать на свежем Ubuntu 22.04+ (Yandex Cloud VM)
#
# Использование:
#   curl -sSL https://raw.githubusercontent.com/.../scripts/init-server.sh | sudo bash
#   или
#   sudo bash scripts/init-server.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INIT]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[ "$(id -u)" -eq 0 ] || error "Запустите скрипт от root: sudo bash $0"

DEPLOY_USER="${1:-deploy}"
PROJECT_DIR="/opt/petplus"

# ---- 1. Обновление системы ----
log "1/7 Обновление системы..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget git htop \
    ufw fail2ban \
    apt-transport-https ca-certificates gnupg lsb-release

# ---- 2. Docker ----
log "2/7 Установка Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    log "Docker установлен: $(docker --version)"
else
    log "Docker уже установлен: $(docker --version)"
fi

# ---- 3. Пользователь для деплоя ----
log "3/7 Создание пользователя $DEPLOY_USER..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    adduser --disabled-password --gecos "" "$DEPLOY_USER"
    usermod -aG docker "$DEPLOY_USER"
    log "Пользователь $DEPLOY_USER создан и добавлен в группу docker"

    # SSH ключи (копируем от root, если есть)
    if [ -d /root/.ssh ]; then
        mkdir -p "/home/$DEPLOY_USER/.ssh"
        cp /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/" 2>/dev/null || true
        chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
        chmod 700 "/home/$DEPLOY_USER/.ssh"
        chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys" 2>/dev/null || true
    fi
else
    usermod -aG docker "$DEPLOY_USER" 2>/dev/null || true
    log "Пользователь $DEPLOY_USER уже существует"
fi

# ---- 4. Firewall ----
log "4/7 Настройка UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
echo "y" | ufw enable
ufw status
log "UFW настроен"

# ---- 5. Fail2Ban ----
log "5/7 Настройка Fail2Ban..."
systemctl enable fail2ban
systemctl start fail2ban
log "Fail2Ban активирован"

# ---- 6. Директории проекта ----
log "6/7 Создание директорий..."
mkdir -p "$PROJECT_DIR"/{backups,logs}
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$PROJECT_DIR"
log "Директории созданы: $PROJECT_DIR"

# ---- 7. Certbot (для SSL позже) ----
log "7/7 Установка Certbot..."
if ! command -v certbot &>/dev/null; then
    apt-get install -y -qq certbot
    log "Certbot установлен"
else
    log "Certbot уже установлен"
fi

# ---- Итого ----
echo ""
echo "========================================"
log "Сервер готов к деплою!"
echo "========================================"
echo ""
echo "Следующие шаги:"
echo "  1. Войдите как $DEPLOY_USER:  su - $DEPLOY_USER"
echo "  2. Склонируйте проект в $PROJECT_DIR:"
echo "     cd $PROJECT_DIR && git clone <repo-url> ."
echo "  3. Скопируйте .env:"
echo "     cp backend/.env.production.example backend/.env"
echo "     nano backend/.env   # заполните реальные значения"
echo "  4. Запустите деплой:"
echo "     bash scripts/deploy.sh"
echo ""
echo "Для SSL (после привязки домена):"
echo "  certbot certonly --webroot -w /var/www/certbot -d yourdomain.com"
echo ""
