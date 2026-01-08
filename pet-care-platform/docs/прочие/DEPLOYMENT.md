# Документация по развертыванию

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 5.2 - Создание скриптов развертывания

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Требования](#требования)
3. [Развертывание для разработки](#развертывание-для-разработки)
4. [Развертывание для production](#развертывание-для-production)
5. [Скрипты развертывания](#скрипты-развертывания)
6. [CI/CD](#cicd)
7. [Мониторинг](#мониторинг)

---

## Обзор

Данный документ описывает процесс развертывания платформы "Питомец+" для различных окружений: разработки, staging и production.

### Окружения

- **Development** - Локальная разработка
- **Staging** - Тестовое окружение
- **Production** - Продакшн окружение

---

## Требования

### Системные требования

#### Backend
- Python 3.12.7+
- PostgreSQL 15+
- Redis (опционально, для кэширования в production)
- Gunicorn (для production)

#### Frontend
- Node.js 18+
- npm или yarn

### Переменные окружения

#### Backend (.env)

```env
# База данных
DB_NAME=pitomets_db
DB_USER=pitomets_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Django
DJANGO_SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5199,http://localhost:5174

# Кэширование (для production)
REDIS_URL=redis://localhost:6379/0

# Логирование
LOG_LEVEL=INFO
LOG_DIR=logs
```

#### Frontend (.env)

```env
VITE_BACKEND_HOST=localhost
VITE_BACKEND_PORT=8077
VITE_API_URL=http://localhost:8077/api
```

---

## Развертывание для разработки

### Быстрый старт

#### Windows

```batch
# Запуск всего проекта
docs\deployment\start-all.bat

# Или по отдельности
docs\deployment\start-backend.bat
docs\deployment\start-frontend.bat
```

#### Linux/macOS

```bash
# Запуск всего проекта
./docs/deployment/start_all.sh

# Или по отдельности
./docs/deployment/start_backend.sh
./docs/deployment/start_frontend.sh
```

### Ручная установка

#### Backend

```bash
cd backend

# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Установка зависимостей
pip install -r requirements.txt

# Настройка переменных окружения
cp .env.example .env
# Отредактируйте .env файл

# Применение миграций
python manage.py migrate

# Создание суперпользователя
python manage.py createsuperuser

# Загрузка тестовых данных (опционально)
python manage.py load_test_data
python manage.py load_courses

# Запуск сервера
python manage.py runserver 0.0.0.0:8077
```

#### Frontend

```bash
cd frontend

# Установка зависимостей
npm install

# Настройка переменных окружения
cp .env.example .env
# Отредактируйте .env файл

# Запуск dev-сервера
npm run dev
```

---

## Развертывание для production

### Подготовка

1. **Настройка сервера**:
   - Установка Python 3.12+
   - Установка PostgreSQL 15+
   - Установка Redis (для кэширования)
   - Установка Nginx (для reverse proxy)

2. **Создание пользователя**:
   ```bash
   sudo useradd -m -s /bin/bash pitomets
   sudo su - pitomets
   ```

3. **Клонирование репозитория**:
   ```bash
   git clone <repository-url> /home/pitomets/pet-care-platform
   cd /home/pitomets/pet-care-platform
   ```

### Backend развертывание

```bash
cd backend

# Создание виртуального окружения
python3 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt

# Настройка переменных окружения
cp .env.example .env
# Отредактируйте .env файл (DEBUG=False, SECRET_KEY, и т.д.)

# Применение миграций
python manage.py migrate

# Сбор статических файлов
python manage.py collectstatic --noinput

# Создание суперпользователя
python manage.py createsuperuser

# Запуск с Gunicorn
gunicorn config.wsgi:application \
    --bind 0.0.0.0:8077 \
    --workers 4 \
    --timeout 120 \
    --access-logfile logs/access.log \
    --error-logfile logs/error.log
```

### Frontend развертывание

```bash
cd frontend

# Установка зависимостей
npm install

# Сборка для production
npm run build

# Результат в папке dist/
# Настроить Nginx для раздачи статических файлов
```

### Nginx конфигурация

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (статические файлы)
    location / {
        root /home/pitomets/pet-care-platform/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8077;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8077;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Статические файлы Django
    location /static/ {
        alias /home/pitomets/pet-care-platform/backend/staticfiles/;
    }

    # Медиа файлы
    location /media/ {
        alias /home/pitomets/pet-care-platform/backend/media/;
    }
}
```

---

## Скрипты развертывания

### scripts/deploy.sh (Linux/macOS)

```bash
#!/bin/bash
# Скрипт развертывания для production

set -e

echo "Начало развертывания..."

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

# Frontend
cd ../frontend
npm install
npm run build

echo "Развертывание завершено!"
```

### scripts/deploy.ps1 (Windows)

```powershell
# Скрипт развертывания для production (Windows)

Write-Host "Начало развертывания..."

# Backend
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

# Frontend
cd ..\frontend
npm install
npm run build

Write-Host "Развертывание завершено!"
```

### scripts/backup_before_deploy.sh

```bash
#!/bin/bash
# Создание резервной копии перед развертыванием

BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Резервная копия БД
python manage.py backup_database --format sql --compress --output "$BACKUP_DIR"

# Резервная копия медиа файлов
tar -czf "$BACKUP_DIR/media.tar.gz" backend/media/

echo "Резервная копия создана в $BACKUP_DIR"
```

---

## CI/CD

### GitHub Actions

Конфигурация CI/CD находится в `.github/workflows/ci.yml`:

- Автоматическое тестирование при push
- Запуск тестов для backend и frontend
- Проверка кода на ошибки

### Автоматический деплой

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        run: |
          # SSH в сервер и выполнить deploy.sh
```

---

## Мониторинг

### Логи

- **Backend логи**: `backend/logs/`
- **Gunicorn логи**: `logs/access.log`, `logs/error.log`
- **Nginx логи**: `/var/log/nginx/`

### Мониторинг производительности

- Использование `RequestLoggingMiddleware` для логирования всех запросов
- Метрики производительности в логах
- Мониторинг времени ответа API

### Алерты

- Настройка алертов на ошибки 500
- Мониторинг времени ответа
- Мониторинг использования ресурсов

---

## Откат (Rollback)

### Процедура отката

1. **Остановка сервера**:
   ```bash
   sudo systemctl stop gunicorn
   ```

2. **Восстановление из резервной копии**:
   ```bash
   python manage.py restore_database --file backups/backup.sql.gz
   ```

3. **Откат кода**:
   ```bash
   git checkout <previous-commit>
   ```

4. **Перезапуск**:
   ```bash
   sudo systemctl start gunicorn
   ```

---

## Безопасность

### Рекомендации

1. **Секретные ключи**:
   - Никогда не коммитьте `.env` файлы
   - Используйте переменные окружения на сервере
   - Ротация `DJANGO_SECRET_KEY`

2. **База данных**:
   - Используйте сильные пароли
   - Ограничьте доступ к БД
   - Регулярные резервные копии

3. **HTTPS**:
   - Настройте SSL сертификаты
   - Используйте Let's Encrypt

4. **Firewall**:
   - Откройте только необходимые порты
   - Закройте доступ к БД извне

---

## Следующие шаги

1. ⏳ Создать скрипты развертывания
2. ⏳ Настроить CI/CD
3. ⏳ Настроить мониторинг
4. ⏳ Создать runbook для поддержки

---

*Документ создан в рамках Этапа 5.2 рефакторинга*  
*Последнее обновление: Январь 2026*

