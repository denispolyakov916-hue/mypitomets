# Документация по миграции курсов

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 2.3 - Миграция уроков в новую архитектуру

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Анализ текущего состояния](#анализ-текущего-состояния)
3. [Процесс миграции](#процесс-миграции)
4. [Команды миграции](#команды-миграции)
5. [Обновление кода](#обновление-кода)
6. [Откат изменений](#откат-изменений)

---

## Обзор

Миграция курсов из старой архитектуры (Lesson) в новую архитектуру (CoursePage + ContentBlock) для обеспечения гибкости и расширяемости системы обучения.

### Старая архитектура (Lesson)

```
Course
  └── Lesson (множество)
      ├── content (JSON)
      ├── content_type
      └── additional_materials (JSON)
```

### Новая архитектура (CoursePage + ContentBlock)

```
Course
  └── CoursePage (множество)
      └── ContentBlock (множество)
          ├── block_type
          ├── content (JSON)
          └── settings (JSON)
```

---

## Анализ текущего состояния

### Команда анализа

```bash
# Анализ текущего состояния архитектуры
python manage.py analyze_course_architecture

# С экспортом результатов
python manage.py analyze_course_architecture --export analysis.json
```

**Что проверяет**:
- Количество курсов с уроками (Lesson)
- Количество курсов со страницами (CoursePage)
- Курсы, требующие миграции
- Курсы, уже мигрированные
- Статистика по типам уроков и страниц

---

## Процесс миграции

### Этапы миграции

1. **Анализ текущего состояния**
   ```bash
   python manage.py analyze_course_architecture --export before_migration.json
   ```

2. **Резервное копирование БД**
   ```bash
   pg_dump -U postgres pet_care_platform > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Предварительный просмотр миграции**
   ```bash
   python manage.py migrate_lessons_to_pages --dry-run
   ```

4. **Миграция одного курса (тестирование)**
   ```bash
   python manage.py migrate_lessons_to_pages --course-id 1
   ```

5. **Миграция всех курсов**
   ```bash
   python manage.py migrate_lessons_to_pages
   ```

6. **Проверка результатов**
   ```bash
   python manage.py analyze_course_architecture --export after_migration.json
   ```

---

## Команды миграции

### migrate_lessons_to_pages

**Расположение**: `backend/apps/training/management/commands/migrate_lessons_to_pages.py`

**Назначение**: Миграция Lesson → CoursePage + ContentBlock

**Параметры**:
- `--dry-run` - Показать, что будет сделано, без выполнения миграции
- `--course-id ID` - Мигрировать только указанный курс
- `--force` - Принудительно перезаписать существующие страницы

**Примеры**:
```bash
# Предварительный просмотр
python manage.py migrate_lessons_to_pages --dry-run

# Миграция одного курса
python manage.py migrate_lessons_to_pages --course-id 1

# Миграция всех курсов
python manage.py migrate_lessons_to_pages

# Принудительная миграция (перезапись)
python manage.py migrate_lessons_to_pages --force
```

### analyze_course_architecture

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

## Процесс конвертации

### Lesson → CoursePage

**Маппинг полей**:
- `lesson.title` → `page.title`
- `lesson.order` → `page.order_number`
- `lesson.content_type` → `page.page_type`
- `lesson.is_required` → `page.settings.required_completion`
- `lesson.is_active` → `page.is_active`

**Типы контента**:
- `video` → `video`
- `text` → `text`
- `interactive` → `interactive`
- `quiz` → `quiz`
- `webinar` → `webinar`
- `workshop` → `assignment`

### Lesson.content → ContentBlock

**Конвертация контента**:

#### Видео контент
```json
// Lesson.content
{
  "type": "video",
  "video_url": "https://example.com/video.mp4",
  "title": "Название видео"
}

// ContentBlock
{
  "block_type": "video_player",
  "content": {
    "video_url": "https://example.com/video.mp4",
    "title": "Название видео"
  }
}
```

#### Текстовый контент
```json
// Lesson.content
{
  "type": "text",
  "text_blocks": [
    {"title": "Заголовок", "content": "Текст"}
  ]
}

// ContentBlock
{
  "block_type": "rich_text",
  "content": {
    "html": "<p>Текст</p>"
  }
}
```

#### Интерактивный контент
```json
// Lesson.content
{
  "type": "interactive",
  "pet_action": {
    "action_type": "training",
    "description": "Описание"
  }
}

// ContentBlock
{
  "block_type": "pet_action",
  "content": {
    "action_type": "training",
    "description": "Описание"
  }
}
```

---

## Обновление кода

### Views, требующие обновления

#### CourseLessonsView
**Текущее состояние**: Использует `course.lessons`  
**После миграции**: Должен использовать `CoursePage.objects.filter(course_id=course.id)`

#### LessonDetailView
**Текущее состояние**: Использует `Lesson.objects.get(id=lesson_id)`  
**После миграции**: Должен использовать `CoursePage.objects.get(id=page_id)` с блоками

#### LessonCompleteView
**Текущее состояние**: Работает с `Lesson`  
**После миграции**: Должен работать с `CoursePage`

### Стратегия обновления

**Вариант 1: Полная миграция**
- Обновить все views для работы только с CoursePage
- Удалить старый код работы с Lesson
- Удалить модель Lesson (опционально)

**Вариант 2: Поддержка обеих архитектур**
- Обновить views для поддержки обеих архитектур
- Проверять наличие CoursePage, если нет - использовать Lesson
- Постепенно мигрировать курсы

**Рекомендуется**: Вариант 2 для плавного перехода

---

## Откат изменений

### Восстановление из резервной копии

```bash
# Восстановление БД
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

## Проверка после миграции

### 1. Проверка данных

```bash
# Анализ после миграции
python manage.py analyze_course_architecture --export after_migration.json

# Сравнение результатов
diff before_migration.json after_migration.json
```

### 2. Проверка API

- Проверить работу `/api/courses/{id}/lessons/`
- Проверить работу `/api/lessons/{id}/`
- Проверить работу `/api/courses/{id}/progress/`

### 3. Проверка функциональности

- Просмотр курсов
- Прохождение уроков
- Отслеживание прогресса
- Комментарии и оценки

---

## Рекомендации

1. **Всегда используйте dry-run** перед выполнением миграции
2. **Создавайте резервные копии** перед любыми изменениями
3. **Тестируйте на тестовых данных** перед продакшеном
4. **Мигрируйте постепенно** - сначала один курс, затем все
5. **Проверяйте результаты** после миграции
6. **Документируйте изменения** в CHANGELOG.md

---

## Следующие шаги

1. ⏳ Выполнить анализ текущего состояния
2. ⏳ Протестировать миграцию на одном курсе
3. ⏳ Выполнить миграцию всех курсов
4. ⏳ Обновить views для поддержки новой архитектуры
5. ⏳ Обновить API документацию

---

*Документ создан в рамках Этапа 2.3 рефакторинга*  
*Последнее обновление: Январь 2026*

