# Питомец+ Backend

## Требования

- Python 3.10+
- PostgreSQL 14+

## Настройка PostgreSQL

1. Создайте базу данных:
```sql
CREATE DATABASE pitomets_db;
CREATE USER pitomets WITH PASSWORD 'pitomets_password';
GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;
```

2. Создайте файл `.env` (скопируйте из `.env.example`):
```
DB_NAME=pitomets_db
DB_USER=pitomets
DB_PASSWORD=pitomets_password
DB_HOST=localhost
DB_PORT=5432
```

## Запуск

```bash
# 1. Создание виртуального окружения
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# 2. Установка зависимостей
pip install -r requirements.txt

# 3. Миграции
python manage.py migrate

# 4. Создание суперпользователя (опционально)
python manage.py createsuperuser

# 5. Запуск сервера
python manage.py runserver 0.0.0.0:8000
```

## API

- `/api/auth/` - аутентификация
- `/api/users/` - профиль пользователя
- `/api/pets/` - питомцы
- `/api/shop/` - магазин
- `/api/courses/` - курсы
- `/admin/` - админка Django

## Технологии

- Django 4.2
- Django REST Framework
- PostgreSQL
- JWT аутентификация

