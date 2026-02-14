#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "================================================"
echo "     Питомец+ - Полный запуск (macOS)"
echo "================================================"
echo ""

if [ ! -f "$BACKEND_DIR/manage.py" ]; then
  echo "[ОШИБКА] backend/manage.py не найден. Запустите из корня проекта."
  exit 1
fi

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
  echo "[ОШИБКА] frontend/package.json не найден. Запустите из корня проекта."
  exit 1
fi

echo "[1/6] Проверка Python..."
if ! command -v python3 &>/dev/null; then
  echo "[ОШИБКА] python3 не найден. Сначала запустите setup_mac/install_mac.sh."
  exit 1
fi
echo "[OK] Python найден: $(python3 --version)"

echo "[2/6] Виртуальное окружение и зависимости бекенда..."
cd "$BACKEND_DIR"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo "[3/6] Файл backend/.env..."
if [ ! -f ".env" ]; then
  cat > .env << EOF
DB_NAME=pitomets_db
DB_USER=pitomets
DB_PASSWORD=578321
DB_HOST=localhost
DB_PORT=5432
DEBUG=True
DJANGO_SECRET_KEY=django-insecure-change-in-production
CLIENT_URL=http://localhost:5199
API_URL=http://localhost:8077
EOF
  echo "[OK] backend/.env создан"
else
  echo "[OK] backend/.env уже существует"
fi

echo "[4/6] Подключение к БД и миграции..."
python manage.py check --database default
python manage.py migrate --noinput

echo "[5/6] Зависимости фронтенда..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
  npm install
else
  npm install
fi

echo "[6/6] Запуск серверов..."
cd "$BACKEND_DIR"
python manage.py runserver 0.0.0.0:8077 &
BACKEND_PID=$!

cleanup() {
  echo ""
  echo "[ИНФО] Остановка серверов..."
  kill "$BACKEND_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cd "$FRONTEND_DIR"
echo ""
echo "Бекенд:   http://localhost:8077"
echo "Фронтенд: http://localhost:5199"
echo ""
npm run dev -- --port 5199 --host 0.0.0.0
