# Быстрый старт

## Требования

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- (опционально) Docker + Docker Compose v2 — для запуска всего стека одной командой

## Установка Backend

```bash
cd backend

# Виртуальное окружение (используется .venv — так же, как в start_backend.sh)
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Linux/macOS

# Зависимости
pip install -r requirements.txt

# Переменные окружения — файл должен лежать в backend/.env
cp .env.example .env
# Отредактировать backend/.env — подставить реальные значения (БД, SMTP, S3).
# Реальные секреты НЕ коммитим: в git хранится только .env.example с плейсхолдерами.

# База данных
createdb pitomets_db         # Или через pgAdmin
python manage.py migrate

# Запуск (порт 8077)
python manage.py runserver 0.0.0.0:8077
```

Проверка, что backend поднялся:

```bash
curl http://localhost:8077/api/health/
# Ожидаемый ответ: {"status": "ok", "service": "backend", ...}
```

API доступен на `http://localhost:8077/api/`, админка — на `http://localhost:8077/admin/`.

> Подсказка: `./start_backend.sh` (Linux/macOS) делает всё автоматически —
> создаёт `.venv`, ставит зависимости, применяет миграции и запускает сервер.

## Установка Frontend

```bash
cd frontend

# Зависимости
npm install

# Запуск (порт 5199)
npm run dev
```

Frontend в dev-режиме проксирует запросы `/api` на backend (`http://localhost:8077`),
поэтому backend должен быть запущен. Переменные окружения фронтенда (при необходимости) —
в `frontend/.env`, шаблон в `frontend/.env.example`.

## Запуск через Docker Compose (весь стек)

Поднимает PostgreSQL + backend (gunicorn) + nginx. Требуется заполненный `backend/.env`
(скопировать из `backend/.env.production.example` и подставить значения, в т.ч. `DB_PASSWORD`).

```bash
# из каталога pet-care-platform/pet-care-platform/
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose ps           # статусы сервисов
docker compose logs -f      # логи
```

## Порты

| Сервис | Порт | URL |
|--------|------|-----|
| Frontend (Vite) | 5199 | http://localhost:5199 |
| Backend (Django) | 8077 | http://localhost:8077 |
| Health-check | 8077 | http://localhost:8077/api/health/ |
| PostgreSQL | 5432 | localhost:5432 |

## Создание суперпользователя

```bash
cd backend
python manage.py createsuperuser
# Email и пароль задаёте при создании
```

## Переменные окружения (.env)

Файл размещается в `backend/.env`. Ключевые переменные (значения — плейсхолдеры,
подставьте свои):

```
DJANGO_SECRET_KEY=your-secret-key
DEBUG=True
DB_NAME=pitomets_db
DB_USER=pitomets
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432
SMTP_HOST=smtp.example.com
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-email-password
```

Полный список переменных — в `backend/.env.example`.

## Проблемы запуска (troubleshooting)

- **Frontend на macOS падает с `spawn EPERM` / `Operation not permitted`.**
  Чаще всего это macOS-карантин (Gatekeeper) на `node_modules` — например, если
  зависимости переносили через мессенджер/архив. Снять карантин только с папки зависимостей:

  ```bash
  xattr -dr com.apple.quarantine frontend/node_modules
  ```

  После этого `npm run dev` запускается штатно.

- **Способы поднять БД.** Docker Compose — опциональный путь (нужен установленный Docker).
  Локальный PostgreSQL — тоже рабочий вариант и подтверждён smoke-тестом: достаточно,
  чтобы PostgreSQL слушал `localhost:5432`, существовала БД `pitomets_db` и был корректный
  `backend/.env`, после чего `python manage.py migrate` и `runserver`.
