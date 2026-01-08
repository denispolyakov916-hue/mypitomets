#!/bin/bash
# Скрипт для ежедневного резервного копирования базы данных

# Настройки
PROJECT_DIR="/path/to/pet-care-platform"
BACKUP_DIR="/path/to/backups/daily"
DAYS_TO_KEEP=30

# Переход в директорию проекта
cd "$PROJECT_DIR/backend" || exit 1

# Создание директории для бэкапов
mkdir -p "$BACKUP_DIR"

# Создание резервной копии
python manage.py backup_database --output-dir "$BACKUP_DIR" --compress

# Удаление бэкапов старше указанного количества дней
find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$DAYS_TO_KEEP -delete

echo "Ежедневный бэкап завершен: $(date)"

