# Инструкция: Yandex Cloud Object Storage + Django (django-storages) + CDN

## Часть 1. Подключение Object Storage к Django

### 1.1. Подготовка Yandex Cloud

1. **Создайте бакет** в консоли Yandex Cloud:
   - [Object Storage](https://console.yandex.cloud/folders) → Создать бакет
   - Укажите имя бакета (латиница, цифры, дефисы)
   - Выберите регион и класс хранилища

2. **Создайте сервисный аккаунт** с ролями:
   - `storage.editor` — для чтения и записи
   - `storage.viewer` — для чтения (если нужен ограниченный доступ)

3. **Создайте статический ключ доступа**:
   - Сервисные аккаунты → Выберите аккаунт → Создать новый ключ → Статический ключ
   - Сохраните **идентификатор ключа** (Access Key ID) и **секретный ключ** (Secret Access Key)

4. **Настройте ACL бакета** (если требуется):
   - Откройте бакет → Настройки → ACL
   - Добавьте сервисный аккаунт с правами FULL_CONTROL или нужным уровнем доступа

### 1.2. Установка зависимостей

```bash
pip install django-storages[s3] boto3
```

### 1.3. Конфигурация Django

**Добавьте в `INSTALLED_APPS`:**

```python
INSTALLED_APPS = [
    # ...
    'storages',
    # ...
]
```

**В `settings.py` используйте переменные окружения для ключей:**

```python
# Yandex Object Storage (S3-совместимый API)
# Храните ключи в .env, не коммитьте их в репозиторий!

AWS_ACCESS_KEY_ID = os.environ.get('YANDEX_S3_ACCESS_KEY_ID', '')
AWS_SECRET_ACCESS_KEY = os.environ.get('YANDEX_S3_SECRET_ACCESS_KEY', '')
AWS_S3_ENDPOINT_URL = 'https://storage.yandexcloud.net'
AWS_S3_REGION_NAME = 'storage'  # для Yandex Object Storage всегда 'storage'
AWS_STORAGE_BUCKET_NAME = os.environ.get('YANDEX_S3_BUCKET_NAME', '')

# Опционально: кастомизация
AWS_S3_FILE_OVERWRITE = False  # не перезаписывать при совпадении имён
AWS_DEFAULT_ACL = 'public-read'  # если нужен публичный доступ к файлам
```

**Современный формат (Django 4.2+):**

```python
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "access_key": os.environ.get('YANDEX_S3_ACCESS_KEY_ID'),
            "secret_key": os.environ.get('YANDEX_S3_SECRET_ACCESS_KEY'),
            "bucket_name": os.environ.get('YANDEX_S3_BUCKET_NAME'),
            "endpoint_url": "https://storage.yandexcloud.net",
            "region_name": "storage",
            "file_overwrite": False,
        },
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}
```

**Либо через отдельный storage-класс для медиа:**

Создайте `myapp/storage.py`:

```python
from storages.backends.s3 import S3Storage

class YandexMediaStorage(S3Storage):
    bucket_name = 'your-bucket-name'
    file_overwrite = False
    custom_domain = None
    location = 'media'
```

И в `settings.py`:

```python
DEFAULT_FILE_STORAGE = 'myapp.storage.YandexMediaStorage'
AWS_ACCESS_KEY_ID = os.environ.get('YANDEX_S3_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('YANDEX_S3_SECRET_ACCESS_KEY')
AWS_S3_ENDPOINT_URL = 'https://storage.yandexcloud.net'
AWS_S3_REGION_NAME = 'storage'
```

### 1.4. Пример модели с FileField

```python
from django.db import models

class Document(models.Model):
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='documents/')
```

### 1.5. Переменные окружения (.env)

```env
YANDEX_S3_ACCESS_KEY_ID=ваш_идентификатор_ключа
YANDEX_S3_SECRET_ACCESS_KEY=ваш_секретный_ключ
YANDEX_S3_BUCKET_NAME=имя_вашего_бакета
```

### 1.6. Частые проблемы

| Ошибка | Решение |
|--------|---------|
| `MissingContentLength` | Проверьте формат ключей и `endpoint_url` |
| `NoSuchBucket` | Проверьте имя бакета и регион |
| 403 Forbidden | Проверьте права сервисного аккаунта и ACL бакета |

---

## Часть 2. Настройка CDN для бакета

### 2.1. Подготовка бакета для CDN

CDN раздаёт контент из бакета, поэтому источник должен быть доступен по HTTP.

**Вариант A: Бакет с публичным доступом на чтение**

1. Object Storage → Бакет → Доступ
2. Включите публичный доступ на чтение объектов
3. URL бакета: `https://имя-бакета.storage.yandexcloud.net`  
   или через веб-хостинг: `https://имя-бакета.website.yandexcloud.net`

**Вариант B: Публичный доступ к конкретным объектам**

- Используйте политику бакета (bucket policy) для выборочного доступа
- CDN будет запрашивать объекты от имени своего источника

### 2.2. Создание CDN-ресурса в Yandex Cloud

1. Откройте консоль [Yandex Cloud](https://console.yandex.cloud/)
2. Выберите каталог → **Cloud CDN**
3. **Создать CDN-ресурс**

### 2.3. Группа источников (Origin Group)

1. Создайте **группу источников** (если её ещё нет)
2. Добавьте источник — адрес бакета:
   - `имя-бакета.storage.yandexcloud.net` — для доступа к объектам через S3 API
   - или `имя-бакета.website.yandexcloud.net` — если включен веб-хостинг статики
3. **Формат адреса:** без `https://`, только домен
4. Укажите протокол: HTTP или HTTPS

### 2.4. Настройка CDN-ресурса

- **Основной домен:** ваш домен (например, `cdn.example.com` или `static.example.com`)
- **Источник:** группа с бакетом
- **Протокол взаимодействия с источником:** HTTP / HTTPS
- **Кеширование:** настройте TTL для разных типов контента (по умолчанию можно оставить как есть)

### 2.5. DNS

1. В настройках CDN-ресурса скопируйте CNAME (например, `cl-xxxxx.edgecdn.ru`)
2. В DNS вашего домена создайте CNAME-запись:
   - Имя: `cdn` (или `static` — как планировали)
   - Значение: `cl-xxxxx.edgecdn.ru`

### 2.6. Подключение CDN в Django (опционально)

Если нужно отдавать медиа через CDN:

```python
# settings.py
if os.environ.get('USE_CDN'):
    AWS_S3_CUSTOM_DOMAIN = os.environ.get('CDN_DOMAIN', 'cdn.example.com')
    AWS_S3_USE_SSL = True
```

Или через `MEDIA_URL`:

```python
MEDIA_URL = 'https://cdn.example.com/media/'
```

### 2.7. Управление кешем CDN

- **Полная очистка:** CDN → Ресурс → Очистить кеш
- **Выборочная очистка:** укажите пути (начинаются с `/`), например: `/media/file.jpg`
- Символ `*` допускается только в конце пути: `/media/images/*`

Документация: [Очистка кеша в Yandex Cloud CDN](https://yandex.cloud/ru/docs/cdn/operations/resources/purge-cache)

---

## Полезные ссылки

- [Yandex Object Storage — документация](https://yandex.cloud/ru/docs/storage/)
- [Yandex Cloud CDN — документация](https://yandex.cloud/ru/docs/cdn/)
- [django-storages — Amazon S3 backend](https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html)
- [S3 API Reference (Yandex)](https://yandex.cloud/ru/docs/storage/s3/api-ref/)
