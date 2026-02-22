# Быстрый старт

## Требования

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

## Установка Backend

```bash
cd backend

# Виртуальное окружение
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux/macOS

# Зависимости
pip install -r requirements.txt

# Переменные окружения
cp .env.example .env
# Отредактировать .env — настроить БД, SMTP

# База данных
createdb pitomets_db         # Или через pgAdmin
python manage.py migrate

# Запуск
python manage.py runserver 0.0.0.0:8077
```

## Установка Frontend

```bash
cd frontend

# Зависимости
npm install

# Запуск
npm run dev
```

## Порты

| Сервис | Порт | URL |
|--------|------|-----|
| Frontend (Vite) | 5199 | http://localhost:5199 |
| Backend (Django) | 8077 | http://localhost:8077 |
| PostgreSQL | 5432 | localhost:5432 |

## Создание суперпользователя

```bash
cd backend
python manage.py createsuperuser
# Email: admin@example.com
# Password: ваш_пароль
```

## Переменные окружения (.env)

Ключевые переменные:

```
DJANGO_SECRET_KEY=your-secret-key
DEBUG=True
DB_NAME=pitomets_db
DB_USER=pitomets
DB_PASSWORD=pitomets_password
DB_HOST=localhost
DB_PORT=5432
SMTP_HOST=smtp.mail.ru
SMTP_USER=your-email@mail.ru
SMTP_PASSWORD=your-app-password
```

Полный список — в `.env.example`.
