# Исправление ошибки UnicodeDecodeError в PostgreSQL

## Ошибка

```
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xc2 in position 61: invalid continuation byte
```

Эта ошибка возникает при подключении к PostgreSQL через psycopg2.

## Причины

1. **Проблемы с кодировкой параметров подключения** - пароль, имя пользователя или базы данных содержат не-ASCII символы
2. **Неправильная кодировка переменных окружения** в Windows
3. **Проблемы с кодировкой файла settings.py**

## Решения

### Решение 1: Использовать только ASCII символы в пароле/имени

Убедитесь, что пароль базы данных, имя пользователя и имя базы данных содержат только ASCII символы (латинские буквы, цифры, стандартные символы).

### Решение 2: Настроить переменные окружения правильно

В Windows PowerShell:
```powershell
$env:DB_PASSWORD = "your_password"
$env:DB_USER = "your_user"
$env:DB_NAME = "your_database"
```

### Решение 3: Использовать SQLite для разработки

Если проблема критична, можно временно переключиться на SQLite:

```python
# В settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

### Решение 4: Использовать .env файл с правильной кодировкой

Создайте файл `.env` в директории `backend/` с содержимым в UTF-8:

```
DB_ENGINE=django.db.backends.postgresql
DB_NAME=pitomets_db
DB_USER=pitomets
DB_PASSWORD=578321
DB_HOST=localhost
DB_PORT=5432
```

Убедитесь, что файл сохранен в кодировке UTF-8 (без BOM).

### Решение 5: Проверить кодировку PostgreSQL

Убедитесь, что база данных PostgreSQL использует кодировку UTF8:

```sql
-- Подключитесь к PostgreSQL
psql -U postgres

-- Проверьте кодировку базы данных
SELECT datname, pg_encoding_to_char(encoding) FROM pg_database WHERE datname = 'pitomets_db';

-- Если кодировка не UTF8, пересоздайте базу данных:
DROP DATABASE pitomets_db;
CREATE DATABASE pitomets_db WITH ENCODING 'UTF8' OWNER pitomets;
```

## Текущая конфигурация

В файле `backend/config/settings.py` уже добавлены настройки:

```python
DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.getenv('DB_NAME', 'pitomets_db'),
        'USER': os.getenv('DB_USER', 'pitomets'),
        'PASSWORD': os.getenv('DB_PASSWORD', '578321'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'client_encoding': 'UTF8',  # Явное указание кодировки
        },
        'CONN_MAX_AGE': 600,
    }
}
```

## Рекомендации

1. Используйте только ASCII символы в паролях и именах баз данных для избежания проблем с кодировкой
2. Сохраняйте файлы конфигурации в UTF-8
3. Используйте .env файлы для хранения чувствительных данных
4. Убедитесь, что база данных PostgreSQL создана с кодировкой UTF8
