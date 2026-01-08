# Руководство по обновлению Django до 5.1.5

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 1.1 - Обновление Django

---

## 📋 Содержание

1. [Подготовка к обновлению](#подготовка-к-обновлению)
2. [Процесс обновления](#процесс-обновления)
3. [Проверка совместимости](#проверка-совместимости)
4. [Известные проблемы и решения](#известные-проблемы-и-решения)
5. [Тестирование после обновления](#тестирование-после-обновления)

---

## Подготовка к обновлению

### Требования

- ✅ Python 3.10+ (текущая версия: 3.12.7)
- ✅ Резервная копия базы данных
- ✅ Резервная копия кода (git commit)
- ✅ Резервная копия `requirements.txt` (создана: `requirements.txt.backup`)

### Проверка перед обновлением

1. ✅ Python версия проверена: 3.12.7
2. ✅ Резервная копия requirements.txt создана
3. ⏳ Требуется: резервная копия БД
4. ⏳ Требуется: git commit текущего состояния

---

## Процесс обновления

### Шаг 1: Создание резервных копий

```bash
# 1. Git commit текущего состояния
git add .
git commit -m "Backup before Django 5.1.5 upgrade"

# 2. Резервная копия БД (PostgreSQL)
pg_dump -U pitomets -d pitomets_db > backup_before_django5.sql

# 3. Резервная копия requirements.txt (уже создана)
# Файл: backend/requirements.txt.backup
```

### Шаг 2: Обновление зависимостей

```bash
cd backend

# Обновить зависимости
pip install --upgrade -r requirements.txt

# Проверить установленные версии
pip list | findstr /i "django djangorestframework"
```

**Ожидаемые версии**:
- Django==5.1.5
- djangorestframework==3.15.2
- djangorestframework-simplejwt==5.3.1
- django-cors-headers==4.6.0

### Шаг 3: Проверка миграций

```bash
# Проверить, нужны ли новые миграции
python manage.py makemigrations --check

# Просмотреть план миграций
python manage.py migrate --plan

# Применить миграции (если есть)
python manage.py migrate
```

### Шаг 4: Проверка настроек

Проверить файл `backend/config/settings.py`:

- ✅ `MIDDLEWARE` - стандартные middleware, совместимы
- ✅ `INSTALLED_APPS` - все приложения совместимы
- ✅ `DATABASES` - настройки PostgreSQL без изменений
- ✅ `USE_TZ = True` - корректно для Django 5.1
- ✅ `USE_I18N = True` - корректно для Django 5.1

---

## Проверка совместимости

### Проверенные компоненты

#### ✅ JSONField
**Статус**: Совместим  
**Использование**: 
- `Product.params`, `Product.images`
- `Pet.favorite_foods`, `Pet.allergies`, `Pet.health_issues`
- `Course.recommended_behavior_types`, `Course.recommended_activity_levels`
- `Lesson.content`, `ContentBlock.content`, `ContentBlock.settings`
- Множество полей в `analytics` моделях

**Изменения в Django 5.1**: Минимальные, обратно совместимы

#### ✅ Transaction Management
**Статус**: Совместим  
**Использование**: 
- `transaction.atomic()` - используется в 19 местах
- `@transaction.atomic` декоратор - используется в нескольких методах

**Изменения в Django 5.1**: Нет breaking changes

#### ✅ Middleware
**Статус**: Совместим  
**Использование**: Стандартные middleware Django
- `SecurityMiddleware`
- `SessionMiddleware`
- `CommonMiddleware`
- `CsrfViewMiddleware`
- `AuthenticationMiddleware`
- `MessageMiddleware`
- `XFrameOptionsMiddleware`
- `CorsMiddleware` (django-cors-headers)

**Изменения в Django 5.1**: Нет breaking changes

#### ✅ ORM и QuerySet
**Статус**: Совместим  
**Использование**: 
- Стандартные QuerySet методы
- `select_related`, `prefetch_related`
- Аннотации и агрегации

**Изменения в Django 5.1**: Улучшения производительности, обратно совместимы

#### ✅ Settings
**Статус**: Совместим  
**Использование**: Стандартные настройки Django

**Изменения в Django 5.1**: Нет breaking changes

---

## Известные проблемы и решения

### Проблема 1: Возможные изменения в работе JSONField

**Описание**: Django 5.1 может иметь улучшения в работе с JSON полями.

**Решение**: 
- Проверить работу всех JSON полей после обновления
- Протестировать сериализацию/десериализацию
- Проверить валидацию JSON полей

**Статус**: ⏳ Требуется тестирование

### Проблема 2: Совместимость с DRF 3.15.2

**Описание**: DRF 3.15.2 должен быть совместим с Django 5.1, но требуется проверка.

**Решение**:
- Протестировать все API эндпоинты
- Проверить сериализаторы
- Проверить ViewSet и APIView

**Статус**: ⏳ Требуется тестирование

### Проблема 3: Изменения в валидации форм

**Описание**: Django 5.1 может иметь изменения в валидации форм.

**Решение**:
- Протестировать все формы
- Проверить валидацию в сериализаторах DRF
- Проверить валидацию в моделях

**Статус**: ⏳ Требуется тестирование

---

## Тестирование после обновления

### Чек-лист тестирования

#### 1. Базовые проверки

- [ ] Запуск сервера: `python manage.py runserver`
- [ ] Проверка админки: `http://localhost:8077/admin/`
- [ ] Проверка API: `http://localhost:8077/api/`

#### 2. Тестирование API эндпоинтов

- [ ] `/api/auth/register/` - Регистрация
- [ ] `/api/auth/login/` - Вход
- [ ] `/api/auth/refresh/` - Обновление токена
- [ ] `/api/pets/` - Список питомцев
- [ ] `/api/shop/products/` - Каталог товаров
- [ ] `/api/courses/` - Каталог курсов
- [ ] `/api/admin/stats/summary/` - Статистика админки

#### 3. Тестирование JSON полей

- [ ] Создание питомца с `favorite_foods`, `allergies`, `health_issues`
- [ ] Создание товара с `params`, `images`
- [ ] Создание курса с `recommended_behavior_types`
- [ ] Создание блока контента с `content`, `settings`

#### 4. Тестирование транзакций

- [ ] Создание заказа (использует `transaction.atomic`)
- [ ] Создание платежа (использует `transaction.atomic`)
- [ ] Очистка резервирований (использует `transaction.atomic`)

#### 5. Тестирование миграций

- [ ] Проверка всех миграций: `python manage.py migrate --plan`
- [ ] Применение миграций: `python manage.py migrate`
- [ ] Проверка целостности БД

---

## Откат изменений (если необходимо)

### Процедура отката

```bash
# 1. Откатить зависимости
pip install -r requirements.txt.backup

# 2. Откатить миграции (если были применены)
python manage.py migrate <app_name> <previous_migration>

# 3. Восстановить БД из резервной копии
psql -U pitomets -d pitomets_db < backup_before_django5.sql

# 4. Git откат (если необходимо)
git reset --hard HEAD~1
```

---

## Изменения в requirements.txt

### Обновленные пакеты

| Пакет | Старая версия | Новая версия | Изменения |
|-------|---------------|--------------|-----------|
| Django | 4.2.8 | 5.1.5 | LTS версия, улучшения производительности |
| djangorestframework | 3.14.0 | 3.15.2 | Совместимость с Django 5.1 |
| djangorestframework-simplejwt | 5.3.0 | 5.3.1 | Исправления безопасности |
| django-cors-headers | 4.3.1 | 4.6.0 | Улучшения безопасности |
| psycopg2-binary | 2.9.9 | 2.9.10 | Исправления багов |
| python-dotenv | 1.0.0 | 1.0.1 | Исправления багов |
| gunicorn | 21.2.0 | 23.0.0 | Улучшения производительности |

### Неизмененные пакеты

- `Pillow==12.0.0` - совместим с Django 5.1
- `argon2-cffi==23.1.0` - актуальная версия
- `uuid7==0.1.0` - актуальная версия

---

## Дополнительные ресурсы

- [Django 5.1 Release Notes](https://docs.djangoproject.com/en/5.1/releases/5.1/)
- [Django 5.0 Release Notes](https://docs.djangoproject.com/en/5.0/releases/5.0/)
- [Django REST Framework 3.15 Release Notes](https://www.django-rest-framework.org/community/3.15-announcement/)

---

## Статус обновления

- ✅ Резервная копия requirements.txt создана
- ✅ requirements.txt обновлен
- ⏳ Требуется: установка новых версий
- ⏳ Требуется: тестирование
- ⏳ Требуется: проверка всех функций

---

*Документ создан в рамках Этапа 1.1 рефакторинга*  
*Последнее обновление: Январь 2026*

