# Руководство по деплою Питомец+

## Оглавление

1. [Архитектура](#1-архитектура)
2. [Требования к серверу](#2-требования-к-серверу)
3. [Подготовка Yandex Cloud VM](#3-подготовка-yandex-cloud-vm)
4. [Первичная настройка сервера](#4-первичная-настройка-сервера)
5. [Настройка переменных окружения](#5-настройка-переменных-окружения)
6. [Первый деплой](#6-первый-деплой)
7. [Подключение домена и SSL](#7-подключение-домена-и-ssl)
8. [Бэкапы и автоматизация](#8-бэкапы-и-автоматизация)
9. [Мониторинг и логи](#9-мониторинг-и-логи)
10. [Обновление приложения](#10-обновление-приложения)
11. [Откат к предыдущей версии](#11-откат-к-предыдущей-версии)
12. [CI/CD через GitHub Actions](#12-cicd-через-github-actions)
13. [Чеклист перед деплоем](#13-чеклист-перед-деплоем)
14. [Решение проблем](#14-решение-проблем)

---

## 1. Архитектура

```
Браузер → Nginx (:80/:443)
              ├── /           → React SPA (frontend/dist)
              ├── /api/       → Gunicorn + Django (:8077)
              ├── /static/    → Django staticfiles
              └── /media/     → Yandex S3 / локальное хранилище
                     │
              Gunicorn → PostgreSQL (:5432)
                     │
                     └→ Yandex Cloud S3 (медиа-файлы)
```

Все компоненты запускаются в Docker-контейнерах через `docker compose`.

### Контейнеры

| Сервис | Образ | Порт | Назначение |
|--------|-------|------|-----------|
| `db` | postgres:15-alpine | 5432 (внутренний) | База данных |
| `backend` | Dockerfile (backend/) | 8077 (внутренний) | Django + Gunicorn |
| `nginx` | Dockerfile (nginx/) | 80, 443 | Reverse proxy + frontend |

---

## 2. Требования к серверу

| Параметр | Минимум | Рекомендуемо |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB |
| Диск | 20 GB SSD | 40 GB SSD |
| ОС | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

---

## 3. Подготовка Yandex Cloud VM

### 3.1. Создание виртуальной машины

1. Откройте [Yandex Cloud Console](https://console.yandex.cloud/)
2. **Compute Cloud** → **Создать ВМ**
3. Параметры:
   - Платформа: Intel Ice Lake
   - vCPU: 2+, RAM: 2+ GB
   - Диск: SSD, 20+ GB
   - ОС: Ubuntu 22.04 LTS
   - Сеть: выберите подсеть с публичным IP
4. SSH-ключ: вставьте ваш публичный ключ (`~/.ssh/id_rsa.pub`)
5. Нажмите **Создать**

### 3.2. Настройка Security Group

Откройте порты:

| Направление | Порт | Протокол | Источник | Назначение |
|-------------|------|----------|----------|-----------|
| Входящий | 22 | TCP | Ваш IP | SSH |
| Входящий | 80 | TCP | 0.0.0.0/0 | HTTP |
| Входящий | 443 | TCP | 0.0.0.0/0 | HTTPS |
| Исходящий | Все | Все | 0.0.0.0/0 | Интернет |

---

## 4. Первичная настройка сервера

### 4.1. Подключение

```bash
ssh <ваш-пользователь>@<IP-адрес-VM>
```

### 4.2. Автоматическая настройка

На сервере выполните:

```bash
# Скачайте и запустите скрипт инициализации
sudo bash scripts/init-server.sh
```

Скрипт автоматически:
- Обновит систему
- Установит Docker и Docker Compose
- Создаст пользователя `deploy` с доступом к Docker
- Настроит UFW (firewall)
- Установит Fail2Ban
- Создаст директории `/opt/petplus/{backups,logs}`
- Установит Certbot

### 4.3. Переключение на пользователя deploy

```bash
su - deploy
```

---

## 5. Настройка переменных окружения

### 5.1. Клонирование проекта

```bash
cd /opt/petplus
git clone <URL-вашего-репозитория> .
```

### 5.2. Создание .env

```bash
cp backend/.env.production.example backend/.env
nano backend/.env
```

### 5.3. Обязательные переменные

| Переменная | Описание | Как получить |
|-----------|----------|-------------|
| `DJANGO_SECRET_KEY` | Секретный ключ Django | `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DB_PASSWORD` | Пароль PostgreSQL | Придумайте надёжный (20+ символов) |
| `ALLOWED_HOSTS` | Домен(ы) сайта | Ваш домен или IP через запятую |
| `CLIENT_URL` | URL фронтенда | `https://yourdomain.com` |
| `SMTP_*` | Настройки SMTP | Данные вашего SMTP-провайдера |
| `YANDEX_S3_*` | Ключи Yandex S3 | Yandex Cloud Console → Service Accounts |

> **ВНИМАНИЕ**: Генерация SECRET_KEY требует Django. Выполните в окружении где Django установлен,
> или используйте: `openssl rand -base64 50`

---

## 6. Первый деплой

### 6.1. Сборка и запуск

```bash
cd /opt/petplus

# Сборка Docker-образов
docker compose build

# Запуск БД (отдельно, чтобы дождаться инициализации)
docker compose up -d db
sleep 10

# Применение миграций
docker compose run --rm backend python manage.py migrate

# Создание суперпользователя
docker compose run --rm backend python manage.py createsuperuser

# Запуск всех сервисов
docker compose up -d
```

### 6.2. Проверка

```bash
# Статус контейнеров
docker compose ps

# Health check
curl http://localhost/api/health/

# Логи (если что-то не работает)
docker compose logs -f
docker compose logs backend
docker compose logs nginx
```

### 6.3. Загрузка начальных данных (если нужно)

```bash
# Пример: загрузка пород
docker compose exec backend python manage.py <ваша-management-команда>
```

---

## 7. Подключение домена и SSL

### 7.1. DNS

Создайте A-запись в DNS вашего домена:
- Тип: `A`
- Имя: `@` (или `www`)
- Значение: IP-адрес вашей VM

### 7.2. Обновление конфигурации

Обновите `backend/.env`:

```env
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CLIENT_URL=https://yourdomain.com
API_URL=https://yourdomain.com
SECURE_SSL_REDIRECT=True
```

### 7.3. Получение SSL сертификата

```bash
# Остановите nginx для получения сертификата
docker compose stop nginx

# Получите сертификат
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Результат: /etc/letsencrypt/live/yourdomain.com/
```

### 7.4. Подключение SSL в docker-compose

Раскомментируйте в `docker-compose.yml` блок `certbot` и volumes для сертификатов в сервисе `nginx`:

```yaml
nginx:
  volumes:
    - backend_static:/app/staticfiles:ro
    - backend_media:/app/media:ro
    - ./certbot/conf:/etc/letsencrypt:ro
    - ./certbot/www:/var/www/certbot:ro
```

### 7.5. Обновление nginx конфигурации

В файле `nginx/conf.d/app.conf` раскомментируйте HTTPS блок и замените `yourdomain.com` на ваш домен.

Пересоберите и перезапустите:

```bash
docker compose up -d --build nginx
```

### 7.6. Автообновление сертификата

```bash
# Добавьте в crontab
sudo crontab -e

# Каждый день в 4:00 проверять и обновлять сертификат
0 4 * * * certbot renew --quiet && docker compose -f /opt/petplus/docker-compose.yml restart nginx
```

---

## 8. Бэкапы и автоматизация

### 8.1. Ручной бэкап

```bash
bash scripts/backup-db.sh
```

Файлы сохраняются в `backups/` с автоматической ротацией (7 ежедневных + 4 еженедельных).

### 8.2. Автоматические бэкапы (cron)

```bash
crontab -e

# Ежедневно в 3:00
0 3 * * * cd /opt/petplus && bash scripts/backup-db.sh >> /opt/petplus/logs/backup.log 2>&1
```

### 8.3. Восстановление из бэкапа

```bash
bash scripts/backup-db.sh --restore backups/pitomets_20260222_030000.sql.gz
```

---

## 9. Мониторинг и логи

### 9.1. Просмотр логов

```bash
# Все сервисы
docker compose logs -f

# Отдельный сервис
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f db

# Последние 100 строк
docker compose logs --tail=100 backend
```

### 9.2. Логи Django

```bash
# Логи приложения (внутри контейнера)
docker compose exec backend cat /app/logs/app.log
docker compose exec backend cat /app/logs/error.log
```

### 9.3. Health check

| Эндпоинт | Доступ | Описание |
|----------|--------|----------|
| `/api/health/` | Публичный | Базовая проверка |
| `/api/health/detailed/` | Только admin | Детальная информация |
| `/api/metrics/` | Только admin | Метрики приложения |

```bash
# Быстрая проверка
curl -s http://localhost/api/health/ | python3 -m json.tool
```

### 9.4. Ресурсы сервера

```bash
# Использование Docker
docker stats

# Диск
df -h

# Память
free -h

# Процессы
htop
```

---

## 10. Обновление приложения

### 10.1. Автоматический деплой (через скрипт)

```bash
cd /opt/petplus
bash scripts/deploy.sh
```

Скрипт автоматически:
1. Обновляет код из Git
2. Создаёт бэкап БД
3. Пересобирает Docker-образы
4. Применяет миграции
5. Перезапускает сервисы
6. Проверяет health check
7. Очищает старые образы

### 10.2. Ручное обновление (шаг за шагом)

```bash
cd /opt/petplus

# 1. Обновить код
git pull

# 2. Бэкап БД
bash scripts/backup-db.sh

# 3. Пересобрать образы
docker compose build

# 4. Миграции
docker compose run --rm backend python manage.py migrate

# 5. Перезапуск
docker compose up -d

# 6. Проверка
docker compose ps
curl http://localhost/api/health/
```

### 10.3. Обновление без простоя

```bash
# Пересобрать только backend
docker compose build backend

# Rolling restart
docker compose up -d --no-deps backend

# Пересобрать и перезапустить nginx (если изменился frontend)
docker compose build nginx
docker compose up -d --no-deps nginx
```

---

## 11. Откат к предыдущей версии

### 11.1. Откат кода

```bash
cd /opt/petplus

# Посмотреть историю коммитов
git log --oneline -10

# Откатиться к конкретному коммиту
git checkout <commit-hash>

# Пересобрать и перезапустить
docker compose build
docker compose up -d
```

### 11.2. Откат БД

```bash
# Восстановить из последнего бэкапа
bash scripts/backup-db.sh --restore backups/pitomets_YYYYMMDD_HHMMSS.sql.gz

# Перезапустить backend
docker compose restart backend
```

### 11.3. Откат миграций Django

```bash
# Откат конкретного приложения к миграции
docker compose exec backend python manage.py migrate <app_name> <migration_number>
```

---

## 12. CI/CD через GitHub Actions

### 12.1. Настройка

В репозитории: **Settings → Secrets and variables → Actions** добавьте:

| Секрет | Значение |
|--------|----------|
| `SERVER_HOST` | IP-адрес или домен сервера |
| `SERVER_USER` | `deploy` |
| `SSH_PRIVATE_KEY` | Содержимое `~/.ssh/id_rsa` (приватный ключ) |
| `PROJECT_PATH` | `/opt/petplus` |

### 12.2. Как это работает

1. **Push в `main`** → автоматически запускаются тесты и деплой
2. **Pull Request в `main`** → запускаются только тесты (без деплоя)

Пайплайн:
- Тесты backend (Django tests с PostgreSQL)
- Сборка frontend (npm run build)
- Деплой через SSH (скрипт `scripts/deploy.sh`)

### 12.3. Ручной деплой

Если нужно задеплоить без CI/CD:

```bash
ssh deploy@<server-ip>
cd /opt/petplus
bash scripts/deploy.sh
```

---

## 13. Чеклист перед деплоем

### Первый деплой

- [ ] VM создана в Yandex Cloud с публичным IP
- [ ] Security Group: открыты порты 22, 80, 443
- [ ] `init-server.sh` выполнен на сервере
- [ ] Проект склонирован в `/opt/petplus`
- [ ] `backend/.env` заполнен реальными значениями
- [ ] `DJANGO_SECRET_KEY` сгенерирован (не дефолтный!)
- [ ] `DB_PASSWORD` — надёжный пароль
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS` содержит IP или домен
- [ ] S3 ключи заполнены (если используется Yandex S3)
- [ ] SMTP настроен для отправки email
- [ ] `docker compose build` завершился без ошибок
- [ ] Миграции применены
- [ ] Суперпользователь создан
- [ ] `curl http://localhost/api/health/` возвращает 200
- [ ] Фронтенд открывается в браузере

### Каждый деплой

- [ ] Все тесты проходят локально
- [ ] Новые миграции не ломают существующие данные
- [ ] Нет секретов в коммите (пароли, ключи)
- [ ] `.env` не в коммите
- [ ] Бэкап БД создан перед деплоем

### После подключения домена

- [ ] DNS A-запись указывает на IP сервера
- [ ] SSL сертификат получен через Certbot
- [ ] HTTPS работает
- [ ] HTTP редиректит на HTTPS
- [ ] `SECURE_SSL_REDIRECT=True` в `.env`
- [ ] Автообновление сертификата настроено в cron

---

## 14. Решение проблем

### Контейнер не запускается

```bash
# Посмотреть логи
docker compose logs <service-name>

# Зайти в контейнер для отладки
docker compose exec backend bash
```

### Ошибка подключения к БД

```bash
# Проверить, работает ли PostgreSQL
docker compose ps db
docker compose logs db

# Проверить подключение
docker compose exec db psql -U pitomets -d pitomets_db -c "SELECT 1"
```

### Ошибка 502 Bad Gateway

Nginx не может достучаться до backend:

```bash
# Проверить, работает ли backend
docker compose ps backend
docker compose logs backend

# Проверить здоровье изнутри сети Docker
docker compose exec nginx wget -qO- http://backend:8077/api/health/
```

### Нехватка дискового пространства

```bash
# Очистить Docker
docker system prune -af
docker volume prune -f

# Очистить старые бэкапы
ls -la backups/
```

### Не работает S3 загрузка

```bash
# Проверить настройки
docker compose exec backend python manage.py shell -c "from django.conf import settings; print(settings.USE_S3_STORAGE)"

# Проверить подключение к S3
docker compose exec backend python -c "
import boto3, os
s3 = boto3.client('s3',
    endpoint_url=os.getenv('YANDEX_S3_ENDPOINT_URL'),
    aws_access_key_id=os.getenv('YANDEX_S3_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('YANDEX_S3_SECRET_ACCESS_KEY'),
    region_name=os.getenv('YANDEX_S3_REGION'))
print(s3.list_buckets())
"
```
