#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP_FILE="$PROJECT_ROOT/setup_mac/pitomets_db_dump.sql"

echo "================================================"
echo "     Питомец+ - Восстановление базы (macOS)"
echo "================================================"
echo ""

if [ ! -f "$DUMP_FILE" ]; then
  echo "[ОШИБКА] Дамп не найден: $DUMP_FILE"
  exit 1
fi

if ! command -v psql &>/dev/null; then
  echo "[ОШИБКА] psql не найден. Запустите setup_mac/install_mac.sh."
  exit 1
fi

export PGPASSWORD="578321"
echo "[INFO] Восстановление дампа в базу pitomets_db..."
psql -U pitomets -h localhost -d pitomets_db -f "$DUMP_FILE"
echo ""
echo "✅ Данные успешно восстановлены."
