# Runbook для поддержки платформы "Питомец+"

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 5.4 - Создание runbook для поддержки

---

## 📋 Содержание

1. [Быстрая диагностика](#быстрая-диагностика)
2. [Типичные проблемы и решения](#типичные-проблемы-и-решения)
3. [Восстановление после сбоев](#восстановление-после-сбоев)
4. [Масштабирование](#масштабирование)
5. [Процедуры обслуживания](#процедуры-обслуживания)
6. [Контакты и эскалация](#контакты-и-эскалация)

---

## Быстрая диагностика

### Проверка состояния системы

#### 1. Health Check

```bash
# Базовый health check (без аутентификации)
curl http://localhost:8077/api/health/

# Детальный health check (требует админ права)
curl -H "Authorization: Bearer <token>" http://localhost:8077/api/health/detailed/
```

**Ожидаемый результат**: `{"status": "healthy", ...}`

**Если статус `unhealthy`**:
- Проверить логи: `tail -f logs/apps.log`
- Проверить базу данных: `python manage.py dbshell`
- Проверить кэш: `python manage.py shell` → `from django.core.cache import cache; cache.get('test')`

#### 2. Проверка метрик

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8077/api/metrics/
```

#### 3. Проверка логов

```bash
# Последние 100 строк
tail -n 100 logs/apps.log

# Поиск ошибок
grep -i error logs/apps.log | tail -n 50

# Поиск по request_id
grep "request_id=abc12345" logs/apps.log
```

#### 4. Проверка базы данных

```bash
# Подключение к БД
python manage.py dbshell

# Проверка миграций
python manage.py showmigrations

# Проверка данных
python manage.py validate_test_data
```

---

## Типичные проблемы и решения

### Проблема 1: Сервер не отвечает (503 Service Unavailable)

#### Симптомы
- Health check возвращает 503
- API запросы не проходят
- Белый экран на фронтенде

#### Диагностика

1. **Проверить статус сервера**:
   ```bash
   # Проверить процесс Gunicorn
   ps aux | grep gunicorn
   
   # Проверить порт
   netstat -tuln | grep 8077
   ```

2. **Проверить логи**:
   ```bash
   tail -f logs/error.log
   tail -f logs/apps.log
   ```

3. **Проверить базу данных**:
   ```bash
   python manage.py dbshell
   # Если не подключается - проблема с БД
   ```

#### Решение

1. **Перезапуск сервера**:
   ```bash
   # Остановка
   sudo systemctl stop gunicorn
   
   # Запуск
   sudo systemctl start gunicorn
   
   # Проверка статуса
   sudo systemctl status gunicorn
   ```

2. **Если проблема с БД**:
   ```bash
   # Проверить статус PostgreSQL
   sudo systemctl status postgresql
   
   # Перезапустить PostgreSQL
   sudo systemctl restart postgresql
   ```

3. **Если проблема с кэшем**:
   ```bash
   # Очистить кэш
   python manage.py shell
   >>> from django.core.cache import cache
   >>> cache.clear()
   ```

---

### Проблема 2: Медленные запросы

#### Симптомы
- Время ответа API > 1 секунды
- Таймауты на фронтенде
- Высокая нагрузка на БД

#### Диагностика

1. **Проверить медленные запросы в логах**:
   ```bash
   grep "duration" logs/apps.log | awk '$NF > 1.0' | tail -n 20
   ```

2. **Проверить метрики БД**:
   ```bash
   python manage.py shell
   >>> from django.db import connection
   >>> print(connection.queries)
   ```

3. **Проверить использование кэша**:
   ```bash
   # Если используется Redis
   redis-cli info stats
   ```

#### Решение

1. **Очистить кэш**:
   ```bash
   python manage.py shell
   >>> from django.core.cache import cache
   >>> cache.clear()
   ```

2. **Оптимизировать запросы**:
   - Проверить использование `select_related` и `prefetch_related`
   - Добавить индексы в БД
   - Использовать кэширование для часто запрашиваемых данных

3. **Масштабирование**:
   - Увеличить количество workers Gunicorn
   - Добавить Redis для кэширования
   - Настроить load balancer

---

### Проблема 3: Ошибки валидации данных

#### Симптомы
- Ошибки 400 Bad Request
- Сообщения об ошибках валидации
- Проблемы с JSON полями

#### Диагностика

1. **Проверить валидацию JSON полей**:
   ```bash
   python manage.py validate_json_fields
   ```

2. **Проверить тестовые данные**:
   ```bash
   python manage.py validate_test_data
   ```

3. **Проверить логи**:
   ```bash
   grep "validation" logs/apps.log | tail -n 20
   ```

#### Решение

1. **Нормализовать данные**:
   ```bash
   python manage.py normalize_data
   ```

2. **Исправить orphaned записи**:
   ```bash
   python manage.py fix_orphaned_records
   ```

3. **Валидировать все данные**:
   ```bash
   python manage.py validate_test_data --fix
   ```

---

### Проблема 4: Ошибки миграций

#### Симптомы
- Ошибки при применении миграций
- Несоответствие схемы БД
- Ошибки `django.db.utils.OperationalError`

#### Диагностика

1. **Проверить непримененные миграции**:
   ```bash
   python manage.py showmigrations
   ```

2. **Проверить конфликты миграций**:
   ```bash
   python manage.py migrate --plan
   ```

#### Решение

1. **Применить миграции**:
   ```bash
   python manage.py migrate
   ```

2. **Если есть конфликты**:
   ```bash
   # Создать резервную копию
   python manage.py backup_database
   
   # Откатить миграции
   python manage.py migrate <app_name> <previous_migration>
   
   # Применить заново
   python manage.py migrate
   ```

3. **Если проблема с данными**:
   ```bash
   # Восстановить из резервной копии
   python manage.py restore_database --file backups/backup.sql.gz
   ```

---

### Проблема 5: Проблемы с фронтендом

#### Симптомы
- Белый экран
- Ошибки в консоли браузера
- Проблемы с загрузкой компонентов

#### Диагностика

1. **Проверить консоль браузера**:
   - Открыть DevTools (F12)
   - Проверить вкладку Console
   - Проверить вкладку Network

2. **Проверить логи сервера**:
   ```bash
   # Проверить ошибки API
   grep "ERROR" logs/apps.log | tail -n 20
   ```

3. **Проверить сборку фронтенда**:
   ```bash
   cd frontend
   npm run build
   ```

#### Решение

1. **Очистить кэш браузера**:
   - Ctrl+Shift+Delete
   - Очистить кэш и cookies

2. **Пересобрать фронтенд**:
   ```bash
   cd frontend
   rm -rf node_modules dist
   npm install
   npm run build
   ```

3. **Проверить переменные окружения**:
   ```bash
   # Проверить .env файл
   cat frontend/.env
   ```

---

## Восстановление после сбоев

### Процедура полного восстановления

#### Шаг 1: Остановка сервисов

```bash
# Остановка Gunicorn
sudo systemctl stop gunicorn

# Остановка Nginx (если используется)
sudo systemctl stop nginx
```

#### Шаг 2: Восстановление базы данных

```bash
# Найти последнюю резервную копию
ls -lt backups/ | head -n 5

# Восстановить БД
python manage.py restore_database --file backups/backup-YYYYMMDD-HHMMSS.sql.gz

# Применить миграции (если нужно)
python manage.py migrate
```

#### Шаг 3: Восстановление медиа файлов

```bash
# Распаковать резервную копию медиа
tar -xzf backups/backup-YYYYMMDD-HHMMSS/media.tar.gz -C backend/
```

#### Шаг 4: Очистка кэша

```bash
python manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()
```

#### Шаг 5: Валидация данных

```bash
# Проверить данные
python manage.py validate_test_data

# Исправить проблемы
python manage.py validate_test_data --fix
```

#### Шаг 6: Перезапуск сервисов

```bash
# Запуск Gunicorn
sudo systemctl start gunicorn

# Запуск Nginx
sudo systemctl start nginx

# Проверка статуса
sudo systemctl status gunicorn
sudo systemctl status nginx
```

#### Шаг 7: Проверка работоспособности

```bash
# Health check
curl http://localhost:8077/api/health/

# Проверка фронтенда
curl http://localhost:5199/
```

---

### Откат к предыдущей версии

#### Шаг 1: Создание резервной копии текущего состояния

```bash
python manage.py backup_database
```

#### Шаг 2: Откат кода

```bash
# Найти нужный коммит
git log --oneline -20

# Откатиться к коммиту
git checkout <commit-hash>

# Или к тегу
git checkout <tag-name>
```

#### Шаг 3: Обновление зависимостей

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

#### Шаг 4: Применение миграций

```bash
# Откатить миграции (если нужно)
python manage.py migrate <app_name> <previous_migration>

# Или применить все миграции
python manage.py migrate
```

#### Шаг 5: Перезапуск

```bash
sudo systemctl restart gunicorn
```

---

## Масштабирование

### Горизонтальное масштабирование (добавление серверов)

#### Шаг 1: Подготовка нового сервера

```bash
# Установка зависимостей
sudo apt update
sudo apt install python3.12 python3-pip postgresql-client nginx

# Клонирование репозитория
git clone <repository-url> /opt/pet-care-platform
cd /opt/pet-care-platform
```

#### Шаг 2: Настройка окружения

```bash
# Создание виртуального окружения
cd backend
python3 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt

# Настройка .env
cp .env.example .env
# Отредактировать .env
```

#### Шаг 3: Настройка базы данных

```bash
# Применение миграций
python manage.py migrate

# Загрузка тестовых данных (если нужно)
python manage.py load_test_data
```

#### Шаг 4: Настройка Load Balancer

```nginx
# /etc/nginx/sites-available/pet-care-platform
upstream backend {
    least_conn;
    server 192.168.1.10:8077;
    server 192.168.1.11:8077;
    server 192.168.1.12:8077;
}

server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Шаг 5: Настройка Redis для кэширования

```python
# backend/config/settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://redis-server:6379/0',
    }
}
```

---

### Вертикальное масштабирование (увеличение ресурсов)

#### Увеличение количества workers Gunicorn

```bash
# Редактировать systemd service
sudo nano /etc/systemd/system/gunicorn.service

# Изменить количество workers
ExecStart=/opt/pet-care-platform/backend/venv/bin/gunicorn \
    --workers 8 \
    --threads 2 \
    config.wsgi:application

# Перезагрузить
sudo systemctl daemon-reload
sudo systemctl restart gunicorn
```

#### Оптимизация PostgreSQL

```sql
-- Увеличить shared_buffers
ALTER SYSTEM SET shared_buffers = '256MB';

-- Увеличить work_mem
ALTER SYSTEM SET work_mem = '16MB';

-- Перезагрузить конфигурацию
SELECT pg_reload_conf();
```

---

## Процедуры обслуживания

### Ежедневные задачи

1. **Проверка health check**:
   ```bash
   curl http://localhost:8077/api/health/
   ```

2. **Проверка логов на ошибки**:
   ```bash
   grep -i error logs/apps.log | wc -l
   ```

3. **Проверка дискового пространства**:
   ```bash
   df -h
   ```

### Еженедельные задачи

1. **Резервное копирование**:
   ```bash
   python manage.py backup_database
   ```

2. **Очистка старых логов**:
   ```bash
   find logs/ -name "*.log" -mtime +7 -delete
   ```

3. **Валидация данных**:
   ```bash
   python manage.py validate_test_data
   ```

### Ежемесячные задачи

1. **Обновление зависимостей**:
   ```bash
   # Backend
   pip list --outdated
   pip install --upgrade <package>

   # Frontend
   npm outdated
   npm update
   ```

2. **Анализ производительности**:
   ```bash
   # Проверить медленные запросы
   grep "duration" logs/apps.log | awk '$NF > 1.0' | wc -l
   ```

3. **Очистка кэша**:
   ```bash
   python manage.py shell
   >>> from django.core.cache import cache
   >>> cache.clear()
   ```

---

## Контакты и эскалация

### Уровни поддержки

#### Уровень 1: Базовая поддержка
- Проверка health check
- Перезапуск сервисов
- Очистка кэша
- Проверка логов

#### Уровень 2: Техническая поддержка
- Диагностика проблем
- Восстановление из резервных копий
- Оптимизация запросов
- Настройка мониторинга

#### Уровень 3: Разработка
- Исправление багов
- Оптимизация производительности
- Масштабирование
- Архитектурные изменения

### Процедура эскалации

1. **Попытка решения на уровне 1** (15 минут)
2. **Эскалация на уровень 2** (если не решено)
3. **Эскалация на уровень 3** (если критическая проблема)

### Контакты

- **DevOps**: devops@petcare-platform.com
- **Разработка**: dev@petcare-platform.com
- **Критические проблемы**: +7 (XXX) XXX-XX-XX

---

## Полезные команды

### Диагностика

```bash
# Health check
curl http://localhost:8077/api/health/

# Метрики
curl -H "Authorization: Bearer <token>" http://localhost:8077/api/metrics/

# Проверка БД
python manage.py dbshell

# Проверка миграций
python manage.py showmigrations

# Валидация данных
python manage.py validate_test_data
```

### Управление

```bash
# Перезапуск Gunicorn
sudo systemctl restart gunicorn

# Очистка кэша
python manage.py shell -c "from django.core.cache import cache; cache.clear()"

# Резервное копирование
python manage.py backup_database

# Восстановление
python manage.py restore_database --file backups/backup.sql.gz
```

### Логи

```bash
# Последние 100 строк
tail -n 100 logs/apps.log

# Поиск ошибок
grep -i error logs/apps.log | tail -n 50

# Поиск по request_id
grep "request_id=abc12345" logs/apps.log

# Мониторинг в реальном времени
tail -f logs/apps.log
```

---

*Документ создан в рамках Этапа 5.4 рефакторинга*  
*Последнее обновление: Январь 2026*

