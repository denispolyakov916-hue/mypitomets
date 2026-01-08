# Документация по резервному копированию и восстановлению

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 2.4 - Создание резервных копий и откатных сценариев

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Management команды](#management-команды)
3. [Автоматические бэкапы](#автоматические-бэкапы)
4. [Восстановление из резервной копии](#восстановление-из-резервной-копии)
5. [Откатные сценарии](#откатные-сценарии)
6. [Рекомендации](#рекомендации)

---

## Обзор

Система резервного копирования и восстановления обеспечивает:
- Создание резервных копий базы данных
- Автоматические бэкапы перед миграциями
- Восстановление из резервных копий
- Откат миграций данных

---

## Management команды

### backup_database

**Расположение**: `backend/core/management/commands/backup_database.py`

**Назначение**: Создание резервной копии базы данных

**Параметры**:
- `--output-dir DIR` - Директория для сохранения (по умолчанию: `backups`)
- `--format FORMAT` - Формат: `sql` или `json` (по умолчанию: `sql`)
- `--compress` - Сжать резервную копию (только для SQL)

**Примеры**:
```bash
# SQL резервная копия
python manage.py backup_database

# Сжатая SQL резервная копия
python manage.py backup_database --compress

# JSON резервная копия
python manage.py backup_database --format json

# В указанную директорию
python manage.py backup_database --output-dir /path/to/backups
```

**Формат файлов**:
- SQL: `backup_YYYYMMDD_HHMMSS.sql` или `backup_YYYYMMDD_HHMMSS.sql.gz`
- JSON: `backup_YYYYMMDD_HHMMSS.json`

---

### restore_database

**Расположение**: `backend/core/management/commands/restore_database.py`

**Назначение**: Восстановление базы данных из резервной копии

**Параметры**:
- `backup_file` - Путь к файлу резервной копии (обязательный)
- `--format FORMAT` - Формат: `auto`, `sql` или `json` (по умолчанию: `auto`)
- `--drop-existing` - Удалить существующие данные перед восстановлением (только для SQL)

**Примеры**:
```bash
# Восстановление из SQL файла
python manage.py restore_database backups/backup_20260101_120000.sql

# Восстановление из сжатого SQL файла
python manage.py restore_database backups/backup_20260101_120000.sql.gz

# Восстановление из JSON файла
python manage.py restore_database backups/backup_20260101_120000.json --format json

# Восстановление с удалением существующих данных
python manage.py restore_database backups/backup_20260101_120000.sql --drop-existing
```

**⚠️ ВНИМАНИЕ**: Восстановление перезапишет текущие данные!

---

### rollback_lesson_migration

**Расположение**: `backend/apps/training/management/commands/rollback_lesson_migration.py`

**Назначение**: Откат миграции Lesson → CoursePage

**Параметры**:
- `--course-id ID` - Откатить миграцию только для указанного курса
- `--all` - Откатить миграцию для всех курсов
- `--dry-run` - Показать, что будет удалено, без выполнения

**Примеры**:
```bash
# Предварительный просмотр отката
python manage.py rollback_lesson_migration --course-id 1 --dry-run

# Откат одного курса
python manage.py rollback_lesson_migration --course-id 1

# Откат всех курсов
python manage.py rollback_lesson_migration --all
```

---

## Автоматические бэкапы

### Перед миграциями

**Рекомендуемый процесс**:

```bash
# 1. Создать резервную копию перед миграцией
python manage.py backup_database --output-dir backups/pre_migration

# 2. Выполнить миграцию
python manage.py migrate_lessons_to_pages

# 3. Проверить результаты
python manage.py analyze_course_architecture
```

### Ежедневные бэкапы

**Создание cron задачи** (Linux/macOS):

```bash
# Добавить в crontab
crontab -e

# Ежедневный бэкап в 2:00 ночи
0 2 * * * cd /path/to/project/backend && python manage.py backup_database --output-dir /path/to/backups/daily --compress
```

**Создание scheduled task** (Windows):

```powershell
# Создать задачу через Task Scheduler
# Команда: python manage.py backup_database --output-dir D:\backups\daily --compress
# Расписание: Ежедневно в 2:00
```

### Бэкапы перед обновлениями

```bash
# Перед обновлением Django
python manage.py backup_database --output-dir backups/before_django_upgrade --compress

# Перед миграцией данных
python manage.py backup_database --output-dir backups/before_data_migration --compress
```

---

## Восстановление из резервной копии

### Восстановление SQL резервной копии

```bash
# Восстановление из обычного SQL файла
python manage.py restore_database backups/backup_20260101_120000.sql

# Восстановление из сжатого SQL файла
python manage.py restore_database backups/backup_20260101_120000.sql.gz

# Восстановление с удалением существующих данных
python manage.py restore_database backups/backup_20260101_120000.sql --drop-existing
```

### Восстановление JSON резервной копии

```bash
# Восстановление из JSON файла
python manage.py restore_database backups/backup_20260101_120000.json --format json
```

### Ручное восстановление (PostgreSQL)

```bash
# Восстановление через psql
psql -U postgres -d pet_care_platform < backups/backup_20260101_120000.sql

# Или с паролем
PGPASSWORD=password psql -U postgres -d pet_care_platform < backups/backup_20260101_120000.sql
```

---

## Откатные сценарии

### Откат миграции Lesson → CoursePage

```bash
# Предварительный просмотр
python manage.py rollback_lesson_migration --course-id 1 --dry-run

# Откат одного курса
python manage.py rollback_lesson_migration --course-id 1

# Откат всех курсов
python manage.py rollback_lesson_migration --all
```

**Что происходит при откате**:
1. Удаляются все ContentBlock для страниц курса
2. Удаляются все CoursePage для курса
3. Старые Lesson остаются без изменений

### Откат нормализации данных

Нормализация данных необратима, но можно:
1. Восстановить из резервной копии, созданной до нормализации
2. Исправить данные вручную через Django admin

### Откат валидации JSON полей

Валидация не изменяет данные, только проверяет их. Для исправления некорректных данных используйте команду `normalize_data`.

---

## Рекомендации

### Хранение резервных копий

1. **Локальное хранилище**: Храните последние 7-30 дней
2. **Облачное хранилище**: Регулярно синхронизируйте важные бэкапы
3. **Ротация**: Удаляйте старые бэкапы (старше 30 дней)

### Частота бэкапов

- **Ежедневно**: Полные бэкапы БД
- **Перед миграциями**: Обязательные бэкапы
- **Перед обновлениями**: Обязательные бэкапы
- **После важных изменений**: Рекомендуемые бэкапы

### Проверка бэкапов

```bash
# Проверка целостности SQL файла
pg_restore --list backups/backup_20260101_120000.sql

# Проверка JSON файла
python -m json.tool backups/backup_20260101_120000.json > /dev/null && echo "JSON валиден"
```

### Безопасность

1. **Храните пароли БД в переменных окружения**
2. **Ограничьте доступ к директории с бэкапами**
3. **Шифруйте бэкапы при хранении в облаке**
4. **Регулярно тестируйте восстановление**

---

## Сценарии использования

### Сценарий 1: Бэкап перед миграцией

```bash
# 1. Создать бэкап
python manage.py backup_database --output-dir backups/pre_migration --compress

# 2. Выполнить миграцию
python manage.py migrate_lessons_to_pages --dry-run  # Предварительный просмотр
python manage.py migrate_lessons_to_pages

# 3. Проверить результаты
python manage.py analyze_course_architecture

# 4. Если что-то пошло не так - откатить
python manage.py rollback_lesson_migration --course-id 1
# Или восстановить из бэкапа
python manage.py restore_database backups/pre_migration/backup_*.sql.gz
```

### Сценарий 2: Восстановление после ошибки

```bash
# 1. Найти последний рабочий бэкап
ls -lt backups/ | head -5

# 2. Восстановить из бэкапа
python manage.py restore_database backups/backup_20260101_120000.sql.gz --drop-existing

# 3. Проверить восстановление
python manage.py validate_json_fields
python manage.py fix_orphaned_records --dry-run
```

### Сценарий 3: Ежедневный бэкап

**Linux/macOS** (скрипт `scripts/backup_daily.sh`):
```bash
# Сделать скрипт исполняемым
chmod +x scripts/backup_daily.sh

# Добавить в crontab
crontab -e
# Добавить строку:
0 2 * * * /path/to/scripts/backup_daily.sh
```

**Windows** (скрипт `scripts/backup_daily.ps1`):
```powershell
# Создать scheduled task через Task Scheduler
# Программа: powershell.exe
# Аргументы: -ExecutionPolicy Bypass -File "D:\path\to\scripts\backup_daily.ps1"
# Расписание: Ежедневно в 2:00
```

---

## Следующие шаги

1. ⏳ Настроить автоматические ежедневные бэкапы
2. ⏳ Протестировать восстановление на тестовых данных
3. ⏳ Настроить синхронизацию с облачным хранилищем
4. ⏳ Создать откатные сценарии для других миграций

---

*Документ создан в рамках Этапа 2.4 рефакторинга*  
*Последнее обновление: Январь 2026*

