# Backend Architecture

Дата ревизии: 2026-06-30

## Назначение

Этот документ описывает текущую backend-архитектуру Питомец+. Он нужен для разработки API, ревизии моделей, настройки окружения, проверки доступов и понимания модульных границ.

## Технологии

| Область | Технология |
|---------|------------|
| Framework | Django |
| API | Django REST Framework |
| Auth | djangorestframework-simplejwt |
| База данных | PostgreSQL по умолчанию, SQLite опционально через env |
| CORS | django-cors-headers |
| Storage | Локальное хранилище или Yandex Object Storage |
| Cache | LocMemCache или Redis через `REDIS_URL` |
| Email | SMTP backend |
| SMS/OTP | SMSC или console backend |

## Расположение

Backend находится в:

```text
backend/
  apps/
    users/
    pets/
    shop/
    training/
    payments/
    reviews/
  config/
  core/
  manage.py
  requirements.txt
```

## Django apps

| App | Назначение |
|-----|------------|
| `apps.users` | Пользователи, роли, регистрация, вход, активация, телефонный OTP, профиль. |
| `apps.pets` | PetID, питомцы, породы, питание, здоровье, напоминания, календарные данные. |
| `apps.shop` | Каталог, товары, корзина, checkout, заказы, адреса, возвраты. |
| `apps.training` | Курсы, уроки, прогресс, комментарии, оценки, конструктор курсов. |
| `apps.payments` | Платежи для заказов и курсов. |
| `apps.reviews` | Отзывы и рейтинги. |
| `core` | Общие утилиты, базовые сервисы, обработка ошибок, загрузка файлов, permissions, health-check. |
| `config` | Django settings, URLs, admin API, error pages. |

## Конфигурация

Главный файл:

```text
backend/config/settings.py
```

Ключевые настройки:

| Настройка | Назначение |
|-----------|------------|
| `DJANGO_SECRET_KEY` | Секретный ключ Django. Обязателен в production. |
| `DEBUG` | Dev/prod режим. |
| `ALLOWED_HOSTS` | Разрешенные хосты. |
| `CLIENT_URL` | URL frontend для редиректов. |
| `API_URL` | URL backend для ссылок активации. |
| `DB_*` | Настройки базы данных. |
| `SMTP_*` | SMTP для email. |
| `SMS_BACKEND`, `SMSC_*` | SMS/OTP. |
| `YANDEX_S3_*` | Object Storage для медиа. |
| `REDIS_URL` | Redis cache в production. |

## База данных

По умолчанию используется PostgreSQL:

```text
ENGINE=django.db.backends.postgresql
NAME=pitomets_db
USER=pitomets
HOST=localhost
PORT=5432
```

SQLite возможен через `DB_ENGINE=django.db.backends.sqlite3`, но это не основной режим проекта.

Документация БД:

```text
docs/architecture/database.md
```

## Пользовательская модель

Модель:

```text
backend/apps/users/models.py
```

Особенности:

- кастомная модель `User`;
- `email` вместо username;
- UUID primary key;
- роли: `user`, `course_creator`, `admin`;
- поля `is_staff` и `is_superuser`;
- email activation fields;
- phone verification fields;
- password reset code;
- notification preferences.

Важная текущая особенность: метод `User.save()` синхронизирует `is_staff` и `is_superuser` с ролью `admin`. Поэтому изменение `role` влияет на доступы.

## Основные API-префиксы

Маршруты подключаются в:

```text
backend/config/urls.py
```

| Префикс | App / модуль | Назначение |
|---------|--------------|------------|
| `/api/auth/` | `apps.users.urls` | Регистрация, вход, активация, OTP, logout. |
| `/api/users/` | `apps.users.profile_urls` | Профиль, история пользователя. |
| `/api/pets/` | `apps.pets.urls` | Питомцы, породы, напоминания, календарь. |
| `/api/v1/nutrition/` | `apps.pets.urls_nutrition` | Справочники питания и расчетные данные. |
| `/api/shop/` | `apps.shop.urls` | Магазин, товары, корзина, заказы. |
| `/api/courses/` | `apps.training.urls` | Курсы, обучение, прогресс. |
| `/api/payments/` | `apps.payments.urls` | Платежи. |
| `/api/checkout/` | `apps.shop.urls_checkout` | Единый checkout. |
| `/api/reviews/` | `apps.reviews.urls` | Отзывы. |
| `/api/admin/` | `config.urls_admin` | React admin API. |
| `/api/health/` | `core.views` | Health-check. |
| `/api/metrics/` | `core.views` | Метрики. |

## Аутентификация

DRF использует JWT:

```text
rest_framework_simplejwt.authentication.JWTAuthentication
```

В `SIMPLE_JWT`:

- access token lifetime: 1 day;
- refresh token lifetime: 7 days;
- algorithm: HS256;
- auth header: `Bearer`.

Frontend хранит access token в localStorage. Это удобно для текущей архитектуры, но требует строгой защиты от XSS.

## Permissions

Глобальное значение DRF:

```text
DEFAULT_PERMISSION_CLASSES = AllowAny
```

Это значит, что каждый защищенный endpoint должен явно задавать `IsAuthenticated`, `IsAdminUser` или кастомный permission.

Критичное правило: при добавлении нового endpoint нельзя полагаться на глобальный default, если endpoint работает с пользовательскими, заказными, платежными, медицинскими или административными данными.

## Admin API

Файлы:

```text
backend/config/urls_admin.py
backend/config/admin_api.py
```

Основные группы:

| URL | Назначение |
|-----|------------|
| `/api/admin/analytics/` | Метрики и графики. |
| `/api/admin/management/` | Массовые операции и экспорт. |
| `/api/admin/users/` | CRUD пользователей. |
| `/api/admin/pets/` | CRUD питомцев. |
| `/api/admin/products/` | CRUD товаров. |
| `/api/admin/orders/` | CRUD заказов. |
| `/api/admin/courses/` | CRUD курсов. |
| `/api/admin/stats/summary/` | Быстрая сводка. |

Большинство admin endpoint-ов защищены `IsAdminUser`. Для части курсовой админки есть логика `IsAdminOrCourseCreator`.

## Медиа и загрузки файлов

Настройки:

- локальное хранилище через `MEDIA_ROOT`;
- Yandex S3 при наличии `YANDEX_S3_ACCESS_KEY_ID` и `YANDEX_S3_SECRET_ACCESS_KEY`;
- публичный и приватный бакеты;
- ограничения размера файлов;
- допустимые MIME-типы.

Зоны кода:

```text
backend/core/storage_backends.py
backend/core/upload_views.py
```

## Кэширование

Если задан `REDIS_URL`, используется Redis. Иначе используется локальный memory cache.

Ключевые TTL указаны в `CACHE_TIMEOUTS`:

- products;
- filters;
- courses;
- recommendations;
- user_pets;
- admin stats;
- admin dashboard.

## Логирование

Логи пишутся в:

```text
backend/logs/app.log
backend/logs/error.log
```

Настройки находятся в `LOGGING`.

Правило: пользовательские пароли, токены, SMS-коды и персональные данные не должны попадать в логи.

## Ошибки

DRF exception handler:

```text
core.exception_handler.custom_exception_handler
```

Django error pages:

```text
config.error_views.bad_request
config.error_views.permission_denied
config.error_views.page_not_found
config.error_views.server_error
```

Критичное правило: API не должен превращать ожидаемые ошибки в 500. ValidationError, PermissionDenied, Http404 и business errors должны возвращать корректные 400/401/403/404/409.

## Management commands

В проекте есть команды для:

- импорта пород;
- импорта nutrition-справочников;
- импорта товаров;
- аудита питания;
- stress test рекомендаций;
- backup/restore базы;
- создания тестовых пользователей.

Команды лежат в:

```text
backend/apps/*/management/commands/
backend/core/management/commands/
```

## Проверки backend

Минимум:

```bash
cd backend
python manage.py check
python manage.py test
```

Если менялись миграции:

```bash
python manage.py makemigrations --check --dry-run
python manage.py migrate
```

Если менялись справочники:

```bash
python manage.py check
```

и отдельная проверка импорта соответствующего справочника.

## Правила доработки

- Новый app должен быть добавлен в `INSTALLED_APPS`.
- Новый API-префикс должен быть подключен в `config/urls.py`.
- Новый endpoint должен явно объявлять permissions.
- Новая модель должна быть отражена в `docs/architecture/database.md`.
- Новый admin endpoint должен быть отражен в `docs/modules/13-admin-panel/admin-access-guide.md`.
- Новая интеграция должна быть отражена в `docs/architecture/integrations.md` или `docs/data/sources.md`, если это источник данных.

