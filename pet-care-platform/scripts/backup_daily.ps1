# Скрипт для ежедневного резервного копирования базы данных (Windows PowerShell)

# Настройки
$PROJECT_DIR = "D:\pet_develop\Pet_dev\pet-care-platform"
$BACKUP_DIR = "D:\backups\daily"
$DAYS_TO_KEEP = 30

# Переход в директорию проекта
Set-Location "$PROJECT_DIR\backend"

# Создание директории для бэкапов
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force
}

# Создание резервной копии
python manage.py backup_database --output-dir $BACKUP_DIR --compress

# Удаление бэкапов старше указанного количества дней
$cutoffDate = (Get-Date).AddDays(-$DAYS_TO_KEEP)
Get-ChildItem -Path $BACKUP_DIR -Filter "backup_*.sql.gz" | 
    Where-Object { $_.LastWriteTime -lt $cutoffDate } | 
    Remove-Item -Force

Write-Host "Ежедневный бэкап завершен: $(Get-Date)"

