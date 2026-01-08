# Документация по мониторингу

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 5.3 - Настройка мониторинга и алертинга

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Health Check Endpoints](#health-check-endpoints)
3. [Метрики производительности](#метрики-производительности)
4. [Логирование](#логирование)
5. [Алертинг](#алертинг)
6. [Интеграция с внешними системами](#интеграция-с-внешними-системами)
7. [Рекомендации по настройке](#рекомендации-по-настройке)

---

## Обзор

Платформа "Питомец+" включает встроенную систему мониторинга для отслеживания состояния системы, производительности и выявления проблем.

### Компоненты мониторинга

- **Health Check Endpoints** - проверка состояния системы
- **Метрики производительности** - сбор статистики
- **Логирование** - структурированное логирование всех запросов
- **Алертинг** - уведомления о проблемах

---

## Health Check Endpoints

### Базовый Health Check

**Endpoint**: `GET /api/health/`  
**Аутентификация**: Не требуется  
**Назначение**: Проверка состояния системы для внешних систем мониторинга

#### Пример запроса

```bash
curl http://localhost:8077/api/health/
```

#### Пример ответа (здоровое состояние)

```json
{
  "status": "healthy",
  "timestamp": "2026-01-07T21:30:00.123456+00:00",
  "checks": {
    "database": {
      "status": "healthy",
      "response_time_ms": 0
    },
    "cache": {
      "status": "healthy",
      "response_time_ms": 2.5
    },
    "disk_space": {
      "status": "healthy",
      "free_percent": 45.2,
      "free_gb": 120.5,
      "total_gb": 266.8
    },
    "system": {
      "python_version": "3.12.7",
      "platform": "Windows-10",
      "django_version": "5.1.5",
      "debug": false,
      "timezone": "UTC"
    }
  },
  "response_time_ms": 15.3,
  "unhealthy_components": [],
  "warning_components": []
}
```

#### Пример ответа (проблемы)

```json
{
  "status": "unhealthy",
  "timestamp": "2026-01-07T21:30:00.123456+00:00",
  "checks": {
    "database": {
      "status": "unhealthy",
      "error": "Connection refused"
    },
    "cache": {
      "status": "healthy",
      "response_time_ms": 2.5
    }
  },
  "response_time_ms": 15.3,
  "unhealthy_components": ["database"],
  "warning_components": []
}
```

#### HTTP статусы

- `200 OK` - Система здорова или есть предупреждения
- `503 Service Unavailable` - Система нездорова

### Детальный Health Check

**Endpoint**: `GET /api/health/detailed/`  
**Аутентификация**: Требуется (только администраторы)  
**Назначение**: Детальная информация о состоянии системы

#### Пример запроса

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8077/api/health/detailed/
```

#### Дополнительная информация

Включает все данные базового health check плюс:
- Метрики производительности
- Детальная информация о компонентах
- Статистика запросов

---

## Метрики производительности

### Endpoint метрик

**Endpoint**: `GET /api/metrics/`  
**Аутентификация**: Требуется (только администраторы)  
**Назначение**: Получение метрик производительности системы

#### Пример запроса

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8077/api/metrics/
```

#### Пример ответа

```json
{
  "timestamp": "2026-01-07T21:30:00.123456+00:00",
  "request_metrics": {
    "note": "Metrics are collected via RequestLoggingMiddleware",
    "log_file": "logs/apps.log"
  },
  "database_metrics": {
    "table_count": 45,
    "database_size": "125 MB",
    "status": "healthy"
  },
  "cache_metrics": {
    "backend": "django.core.cache.backends.locmem.LocMemCache",
    "status": "healthy"
  }
}
```

### Метрики, собираемые автоматически

#### RequestLoggingMiddleware

Middleware автоматически логирует:
- **request_id** - уникальный ID для трейсинга
- **user_id** - ID пользователя (если авторизован)
- **method** - HTTP метод
- **path** - путь запроса
- **status_code** - код ответа
- **duration** - время выполнения запроса
- **ip_address** - IP адрес клиента

#### Логи запросов

Все запросы логируются в файл `logs/apps.log` с уровнем:
- **INFO** - успешные запросы (2xx)
- **WARNING** - клиентские ошибки (4xx)
- **ERROR** - серверные ошибки (5xx)

---

## Логирование

### Структура логов

Логи структурированы и содержат:
- Временную метку
- Уровень логирования
- Сообщение
- Контекст (request_id, user_id, и т.д.)

### Примеры логов

#### Успешный запрос

```
2026-01-07 21:30:00.123 [INFO] Request completed: GET /api/products/
Status: 200 Duration: 0.045s
request_id=abc12345 user_id=123 method=GET path=/api/products/ status_code=200 duration=0.045
```

#### Ошибка

```
2026-01-07 21:30:00.123 [ERROR] Request exception: POST /api/orders/
Exception: ValidationError Duration: 0.012s
request_id=abc12345 user_id=123 method=POST path=/api/orders/ exception_type=ValidationError
```

### Конфигурация логирования

Настройки логирования находятся в `backend/config/settings.py`:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/apps.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'apps': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

### Фильтрация чувствительных данных

`SensitiveDataFilter` автоматически удаляет из логов:
- Пароли
- Токены
- API ключи
- Данные кредитных карт
- И другие чувствительные данные

---

## Алертинг

### Рекомендации по настройке алертов

#### Критические алерты

1. **Health Check возвращает 503**
   - Система нездорова
   - Требуется немедленное вмешательство

2. **Ошибки 500 в логах**
   - Серверные ошибки
   - Проверить логи для деталей

3. **База данных недоступна**
   - Проверить подключение к БД
   - Проверить состояние PostgreSQL

4. **Кэш недоступен**
   - Проверить Redis (если используется)
   - Проверить LocMemCache

#### Предупреждения

1. **Медленные запросы (> 1 секунды)**
   - Проверить производительность БД
   - Проверить оптимизацию запросов

2. **Мало места на диске (< 10%)**
   - Очистить логи
   - Очистить старые медиа файлы

3. **Высокий уровень ошибок 4xx**
   - Проверить валидацию данных
   - Проверить клиентские запросы

### Интеграция с системами мониторинга

#### Prometheus

Можно настроить Prometheus для опроса health check endpoint:

```yaml
scrape_configs:
  - job_name: 'pet-care-platform'
    metrics_path: '/api/health/'
    static_configs:
      - targets: ['localhost:8077']
```

#### Uptime Kuma / UptimeRobot

Настроить мониторинг доступности:
- URL: `http://your-domain.com/api/health/`
- Интервал: 1 минута
- Ожидаемый статус: 200
- Алерт при: 503 или timeout

#### Sentry

Для отслеживания ошибок:
- Интеграция с Django
- Автоматическое отслеживание исключений
- Уведомления о критических ошибках

---

## Интеграция с внешними системами

### Prometheus

Для интеграции с Prometheus можно использовать `django-prometheus`:

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'django_prometheus',
]

# urls.py
path('', include('django_prometheus.urls')),
```

### Grafana

Настройка дашборда в Grafana:
- Источник данных: Prometheus
- Метрики: health check статусы, время ответа, количество запросов
- Алерты: на основе метрик

### ELK Stack (Elasticsearch, Logstash, Kibana)

Для централизованного логирования:
- Настройка Logstash для парсинга логов
- Индексация в Elasticsearch
- Визуализация в Kibana

---

## Рекомендации по настройке

### Production окружение

1. **Настройка ротации логов**
   ```python
   'handlers': {
       'file': {
           'class': 'logging.handlers.RotatingFileHandler',
           'filename': 'logs/apps.log',
           'maxBytes': 10 * 1024 * 1024,  # 10 MB
           'backupCount': 5,
       },
   }
   ```

2. **Мониторинг дискового пространства**
   - Настроить алерты при < 20% свободного места
   - Автоматическая очистка старых логов

3. **Мониторинг производительности**
   - Отслеживание медленных запросов (> 500ms)
   - Анализ узких мест

4. **Мониторинг ошибок**
   - Алерты при > 1% ошибок 5xx
   - Алерты при > 5% ошибок 4xx

### Development окружение

1. **Включить DEBUG логирование**
   ```python
   'loggers': {
       'apps': {
           'level': 'DEBUG',
       },
   }
   ```

2. **Логирование в консоль**
   - Использовать `StreamHandler` для отладки

---

## Следующие шаги

1. ⏳ Настроить внешние системы мониторинга (Prometheus, Grafana)
2. ⏳ Настроить алерты в системах мониторинга
3. ⏳ Настроить централизованное логирование (ELK Stack)
4. ⏳ Добавить метрики производительности в Prometheus
5. ⏳ Создать дашборды в Grafana

---

*Документ создан в рамках Этапа 5.3 рефакторинга*  
*Последнее обновление: Январь 2026*

