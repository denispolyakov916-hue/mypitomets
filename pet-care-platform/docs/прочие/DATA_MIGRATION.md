# Документация по миграции данных

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 2 - Миграция данных и БД

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Management команды](#management-команды)
3. [Использование команд](#использование-команд)
4. [Процесс миграции](#процесс-миграции)
5. [Резервное копирование](#резервное-копирование)
6. [Откат изменений](#откат-изменений)

---

## Обзор

Этап 2 рефакторинга включает:
- Валидацию всех JSON полей
- Исправление orphaned записей
- Нормализацию данных
- Миграцию Lesson → CoursePage

Все команды поддерживают dry-run режим для безопасного тестирования.

---

## Management команды

### 1. validate_json_fields

**Расположение**: `backend/apps/training/management/commands/validate_json_fields.py`

**Назначение**: Валидация всех JSON полей в моделях

**Поддерживаемые модели**:
- `Product` - images, params
- `Pet` - favorite_foods, allergies, health_issues, special_needs, preferred_activities, behavioral_problems, excluded_ingredients, character_traits
- `Course` - recommended_behavior_types, recommended_activity_levels, recommended_social_levels, compatible_health_issues, addresses_special_needs, suitable_activities, addresses_behavioral_problems, additional_images
- `Lesson` - content, additional_materials
- `ContentBlock` - content, settings

**Параметры**:
- `--fix` - Исправить некорректные данные
- `--model MODEL` - Валидировать только указанную модель
- `--dry-run` - Только проверить, не исправлять

**Примеры**:
```bash
# Проверка всех JSON полей
python manage.py validate_json_fields --dry-run

# Валидация только Product
python manage.py validate_json_fields --model Product --dry-run

# Исправление всех ошибок
python manage.py validate_json_fields --fix
```

---

### 2. fix_orphaned_records

**Расположение**: `backend/apps/shop/management/commands/fix_orphaned_records.py`

**Назначение**: Исправление orphaned записей (записей, ссылающихся на несуществующие объекты)

**Проверяемые модели**:
- `OrderItem` - проверка product, course, order
- `CartItem` - проверка cart, product
- `ContentBlock` - проверка page
- `CoursePage` - проверка course_id

**Параметры**:
- `--fix` - Исправить orphaned записи
- `--dry-run` - Только проверить, не исправлять

**Примеры**:
```bash
# Проверка orphaned записей
python manage.py fix_orphaned_records --dry-run

# Исправление orphaned записей
python manage.py fix_orphaned_records --fix
```

---

### 3. normalize_data

**Расположение**: `backend/apps/training/management/commands/normalize_data.py`

**Назначение**: Нормализация данных - приведение всех данных к единому формату

**Поддерживаемые модели**:
- `Product` - нормализация images, params
- `Pet` - нормализация всех JSON списков
- `Course` - нормализация всех JSON списков
- `Lesson` - нормализация content, additional_materials

**Параметры**:
- `--model MODEL` - Нормализовать только указанную модель
- `--dry-run` - Только проверить, не исправлять

**Примеры**:
```bash
# Нормализация всех данных
python manage.py normalize_data --dry-run

# Нормализация только Product
python manage.py normalize_data --model Product

# Нормализация всех данных (с сохранением)
python manage.py normalize_data
```

---

### 4. audit_json_fields

**Расположение**: `backend/apps/training/management/commands/audit_json_fields.py`

**Назначение**: Аудит всех JSON полей - проверка текущего формата данных и выявление несоответствий

**Параметры**:
- `--model MODEL` - Аудит только указанной модели
- `--export FILE` - Экспортировать результаты в JSON файл

**Примеры**:
```bash
# Аудит всех JSON полей
python manage.py audit_json_fields

# Аудит только Product
python manage.py audit_json_fields --model Product

# Аудит с экспортом результатов
python manage.py audit_json_fields --export audit_results.json
```

---

### 5. analyze_course_architecture

**Расположение**: `backend/apps/training/management/commands/analyze_course_architecture.py`

**Назначение**: Анализ текущего состояния архитектуры курсов

**Параметры**:
- `--export FILE` - Экспортировать результаты в JSON файл

**Примеры**:
```bash
# Анализ текущего состояния
python manage.py analyze_course_architecture

# С экспортом результатов
python manage.py analyze_course_architecture --export analysis.json
```

---

### 6. migrate_lessons_to_pages

**Расположение**: `backend/apps/training/management/commands/migrate_lessons_to_pages.py`

**Назначение**: Миграция Lesson → CoursePage + ContentBlock

**Параметры**:
- `--dry-run` - Показать, что будет сделано, без выполнения миграции
- `--course-id ID` - Мигрировать только указанный курс
- `--force` - Принудительно перезаписать существующие страницы

**Примеры**:
```bash
# Предварительный просмотр миграции
python manage.py migrate_lessons_to_pages --dry-run

# Миграция одного курса
python manage.py migrate_lessons_to_pages --course-id 1

# Миграция всех курсов
python manage.py migrate_lessons_to_pages

# Принудительная миграция (перезапись существующих страниц)
python manage.py migrate_lessons_to_pages --force
```

---

## Использование команд

### Рекомендуемый порядок выполнения

1. **Аудит JSON полей**
   ```bash
   python manage.py audit_json_fields --export audit_before.json
   ```

2. **Резервное копирование БД**
   ```bash
   # PostgreSQL
   pg_dump -U postgres pet_care_platform > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Валидация JSON полей (проверка)**
   ```bash
   python manage.py validate_json_fields --dry-run
   ```

3. **Исправление JSON полей**
   ```bash
   python manage.py validate_json_fields --fix
   ```

4. **Проверка orphaned записей**
   ```bash
   python manage.py fix_orphaned_records --dry-run
   ```

5. **Исправление orphaned записей**
   ```bash
   python manage.py fix_orphaned_records --fix
   ```

6. **Нормализация данных**
   ```bash
   python manage.py normalize_data
   ```

7. **Миграция Lesson → CoursePage (предварительный просмотр)**
   ```bash
   python manage.py migrate_lessons_to_pages --dry-run
   ```

8. **Миграция Lesson → CoursePage**
   ```bash
   python manage.py migrate_lessons_to_pages
   ```

---

## Процесс миграции

### Миграция Lesson → CoursePage

Процесс миграции включает:

1. **Конвертация Lesson в CoursePage**:
   - `lesson.title` → `page.title`
   - `lesson.order` → `page.order_number`
   - `lesson.content_type` → `page.page_type`
   - `lesson.is_required` → `page.settings.required_completion`

2. **Конвертация контента в ContentBlock**:
   - Текстовый контент → `rich_text` блок
   - Видео → `video_player` блок
   - Изображения → `image` или `gallery` блок
   - Тесты → `quiz` блок
   - Файлы → `file_download` блок
   - Интерактивные элементы → `pet_action` блок

3. **Сохранение данных**:
   - Все данные из Lesson сохраняются
   - Создаются новые CoursePage и ContentBlock
   - Старые Lesson остаются в БД (для обратной совместимости)

---

## Резервное копирование

### Перед выполнением миграции

**Обязательно создайте резервную копию БД!**

```bash
# PostgreSQL
pg_dump -U postgres -d pet_care_platform > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# Или через Django
python manage.py dumpdata > backup_before_migration_$(date +%Y%m%d_%H%M%S).json
```

### После выполнения миграции

```bash
# Проверка целостности данных
python manage.py validate_json_fields
python manage.py fix_orphaned_records --dry-run
```

---

## Откат изменений

### Откат миграции Lesson → CoursePage

Если миграция прошла неудачно, можно откатить изменения:

```bash
# Восстановление из резервной копии
psql -U postgres -d pet_care_platform < backup_before_migration_YYYYMMDD_HHMMSS.sql

# Или через Django
python manage.py loaddata backup_before_migration_YYYYMMDD_HHMMSS.json
```

### Удаление созданных страниц

```python
# В Django shell
from apps.training.models import CoursePage, ContentBlock

# Удаление всех страниц и блоков
ContentBlock.objects.all().delete()
CoursePage.objects.all().delete()
```

---

## Рекомендации

1. **Всегда используйте dry-run** перед выполнением миграции
2. **Создавайте резервные копии** перед любыми изменениями
3. **Тестируйте на тестовых данных** перед продакшеном
4. **Проверяйте результаты** после миграции
5. **Документируйте изменения** в CHANGELOG.md

---

## Следующие шаги

1. ⏳ Выполнить валидацию JSON полей на продакшене
2. ⏳ Исправить найденные ошибки
3. ⏳ Выполнить нормализацию данных
4. ⏳ Протестировать миграцию Lesson → CoursePage на тестовых данных
5. ⏳ Выполнить миграцию на продакшене

---

*Документ создан в рамках Этапа 2 рефакторинга*  
*Последнее обновление: Январь 2026*

