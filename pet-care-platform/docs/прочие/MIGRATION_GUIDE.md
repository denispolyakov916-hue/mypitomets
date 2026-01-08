# Руководство по миграции

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 5.1 - Обновление документации

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Миграция с Django 4.2 на Django 5.1](#миграция-с-django-42-на-django-51)
3. [Обновление зависимостей](#обновление-зависимостей)
4. [Изменения в коде](#изменения-в-коде)
5. [Миграция данных](#миграция-данных)
6. [Проверка после миграции](#проверка-после-миграции)

---

## Обзор

Данное руководство описывает процесс миграции платформы "Питомец+" с предыдущих версий на текущую версию после рефакторинга.

### Основные изменения

- **Django**: 4.2.8 → 5.1.5
- **DRF**: 3.14.0 → 3.15.2
- **Архитектура курсов**: Lesson → CoursePage
- **Сервисный слой**: Рефакторинг с BaseService
- **Кэширование**: Внедрение кэширования
- **Логирование**: Структурированное логирование

---

## Миграция с Django 4.2 на Django 5.1

### Шаги миграции

1. **Обновление зависимостей**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Проверка совместимости**:
   ```bash
   python manage.py check --deploy
   ```

3. **Применение миграций**:
   ```bash
   python manage.py migrate
   ```

4. **Проверка работоспособности**:
   ```bash
   python manage.py runserver
   ```

### Потенциальные проблемы

- **JSONField**: Теперь использует `django.db.models.JSONField` вместо `django.contrib.postgres.fields.JSONField`
- **Timezone**: Убедитесь что `USE_TZ = True` в settings.py
- **Middleware**: Проверьте порядок middleware

---

## Обновление зависимостей

### Backend

```bash
cd backend
pip install --upgrade pip
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

---

## Изменения в коде

### Backend

#### Новые файлы

- `backend/core/services.py` - Базовые классы сервисов
- `backend/core/validators.py` - Валидаторы JSON полей
- `backend/core/cache_utils.py` - Утилиты кэширования
- `backend/core/middleware.py` - Кастомные middleware
- `backend/core/exceptions.py` - Кастомные исключения
- `backend/core/exception_handler.py` - Глобальный обработчик ошибок

#### Изменения в моделях

- Добавлена валидация для всех JSON полей
- Новые методы в модели `Course` для работы с `CoursePage`

#### Изменения в views

- Оптимизация запросов с `select_related`/`prefetch_related`
- Использование `ApiError` для обработки ошибок
- Добавлено кэширование

### Frontend

#### Новые файлы

- `frontend/src/utils/errorHandler.js` - Обработка ошибок
- `frontend/src/utils/retry.js` - Повторные попытки
- `frontend/src/utils/propTypes.js` - Общие типы
- `frontend/src/store/baseStore.js` - Базовые утилиты stores

#### Изменения

- Lazy loading для некритичных страниц
- Оптимизация бандла
- Добавлены PropTypes в компоненты

---

## Миграция данных

### Валидация данных

```bash
# Проверка JSON полей
python manage.py validate_json_fields

# Нормализация данных
python manage.py normalize_data

# Исправление orphaned записей
python manage.py fix_orphaned_records

# Валидация тестовых данных
python manage.py validate_test_data
```

### Миграция курсов

```bash
# Миграция уроков в новую архитектуру
python manage.py migrate_lessons_to_pages

# Анализ архитектуры курсов
python manage.py analyze_course_architecture

# Откат миграции (если нужно)
python manage.py rollback_lesson_migration
```

---

## Проверка после миграции

### Backend

1. **Проверка миграций**:
   ```bash
   python manage.py showmigrations
   ```

2. **Проверка данных**:
   ```bash
   python manage.py validate_test_data
   ```

3. **Запуск тестов**:
   ```bash
   python manage.py test
   ```

### Frontend

1. **Проверка зависимостей**:
   ```bash
   npm install
   ```

2. **Проверка сборки**:
   ```bash
   npm run build
   ```

3. **Запуск тестов**:
   ```bash
   npm run test:run
   ```

---

## Откат изменений

### Откат миграции курсов

```bash
python manage.py rollback_lesson_migration
```

### Восстановление из резервной копии

```bash
# Восстановление БД
python manage.py restore_database --file backups/backup.sql.gz

# Восстановление медиа
tar -xzf backups/media.tar.gz -C backend/
```

---

## Часто задаваемые вопросы

### Q: Нужно ли обновлять данные вручную?

A: Нет, все миграции данных выполняются автоматически через management команды.

### Q: Совместимы ли старые данные с новой версией?

A: Да, все изменения обратно совместимы. Старые данные будут работать без изменений.

### Q: Можно ли откатить изменения?

A: Да, для миграции курсов есть команда отката. Для других изменений используйте резервные копии.

---

*Документ создан в рамках Этапа 5.1 рефакторинга*  
*Последнее обновление: Январь 2026*

