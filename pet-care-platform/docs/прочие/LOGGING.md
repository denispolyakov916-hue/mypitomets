# Документация по логированию

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 1.6 - Улучшение логирования

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Конфигурация логирования](#конфигурация-логирования)
3. [Структура логов](#структура-логов)
4. [Middleware для логирования запросов](#middleware-для-логирования-запросов)
5. [Логирование в сервисах](#логирование-в-сервисах)
6. [Логирование в views](#логирование-в-views)
7. [Фильтрация чувствительных данных](#фильтрация-чувствительных-данных)
8. [Рекомендации](#рекомендации)

---

## Обзор

Система логирования платформы "Питомец+" обеспечивает:
- Структурированное логирование всех операций
- Контекстное логирование с user_id, request_id для трейсинга
- Автоматическое логирование всех запросов через middleware
- Фильтрацию чувствительных данных
- Ротацию логов для управления размером файлов

---

## Конфигурация логирования

### Настройки в settings.py

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {module} {funcName} {lineno}: {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'simple': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'app.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'error.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'apps.shop': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.payments': {
            'handlers': ['console', 'file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
        # ... другие логгеры
    },
}
```

### Уровни логирования

- **DEBUG**: Детальная информация для отладки (только в разработке)
- **INFO**: Информационные сообщения о нормальной работе
- **WARNING**: Предупреждения о потенциальных проблемах
- **ERROR**: Ошибки, требующие внимания
- **CRITICAL**: Критические ошибки, требующие немедленного вмешательства

### Файлы логов

- `logs/app.log` - все логи приложения (INFO и выше)
- `logs/error.log` - только ошибки (ERROR и выше)

**Ротация**: Файлы ротируются при достижении 10 MB, сохраняется до 5 резервных копий.

---

## Структура логов

### Формат логов

#### Простой формат (console)
```
[2026-01-15 10:30:45] INFO apps.shop: Заказ создан: 12345
```

#### Подробный формат (file)
```
[2026-01-15 10:30:45] INFO apps.shop views OrderCreateView post 1025: Заказ создан: 12345
```

### Контекстное логирование

Все логи включают дополнительный контекст через `extra`:

```python
logger.info(
    "Заказ создан: 12345",
    extra={
        'order_id': '12345',
        'user_id': '67890',
        'user_email': 'user@example.com',
        'total_amount': 1500.00,
        'items_count': 3,
        'request_id': 'a1b2c3d4',
    }
)
```

---

## Middleware для логирования запросов

### RequestLoggingMiddleware

Автоматически логирует все HTTP запросы с контекстом.

**Расположение**: `backend/core/middleware.py`

**Функции**:
- Генерирует уникальный `request_id` для каждого запроса
- Логирует начало и завершение каждого запроса
- Добавляет время выполнения запроса
- Логирует информацию о пользователе (если авторизован)
- Логирует IP адрес клиента
- Добавляет `X-Request-ID` в заголовки ответа

**Пример лога**:
```
[2026-01-15 10:30:45] INFO apps: Request started: POST /api/shop/orders/
Extra: {
    'request_id': 'a1b2c3d4',
    'user_id': '67890',
    'user_email': 'user@example.com',
    'method': 'POST',
    'path': '/api/shop/orders/',
    'query_params': {},
    'ip_address': '192.168.1.1',
}

[2026-01-15 10:30:46] INFO apps: Request completed: POST /api/shop/orders/ Status: 200 Duration: 0.523s
Extra: {
    'request_id': 'a1b2c3d4',
    'user_id': '67890',
    'status_code': 200,
    'duration': 0.523,
}
```

### Использование request_id

`request_id` можно использовать для трейсинга запросов через всю систему:

```python
# В view
request_id = getattr(request, 'request_id', None)
logger.info("Операция выполнена", extra={'request_id': request_id})

# В сервисе
OrderService.log_info("Заказ создан", {'request_id': request_id})
```

---

## Логирование в сервисах

### BaseService методы

Все сервисы наследуются от `BaseService` и используют единые методы логирования:

#### log_error()

```python
try:
    # операция
except Exception as e:
    OrderService.log_error(e, {
        'order_id': order.id,
        'user_id': user.id,
        'request_id': request_id,
    })
```

**Логирует**:
- Сообщение об ошибке
- Тип исключения
- Полный traceback (exc_info=True)
- Контекст

#### log_info()

```python
OrderService.log_info(
    f"Заказ создан: {order.id}",
    {
        'order_id': order.id,
        'user_id': user.id,
        'total_amount': float(total),
    }
)
```

**Логирует**:
- Информационное сообщение
- Контекст

---

## Логирование в views

### Критические точки

Логирование добавлено в следующие критические точки:

#### 1. Операции с заказами

```python
# Создание заказа
logger.info(
    "Заказ создан: 12345",
    extra={
        'order_id': str(order.id),
        'user_id': str(request.user.id),
        'user_email': request.user.email,
        'total_amount': float(total_amount),
        'items_count': len(cart_items),
        'request_id': getattr(request, 'request_id', None),
    }
)

# Ошибки при создании заказа
logger.error(
    "Ошибка при оформлении заказа: ...",
    extra={
        'user_id': str(request.user.id),
        'user_email': request.user.email,
        'request_id': getattr(request, 'request_id', None),
        'error_type': type(e).__name__,
    },
    exc_info=True
)
```

#### 2. Операции с платежами

Логирование выполняется через `PaymentService.log_info()` и `PaymentService.log_error()`.

#### 3. Ошибки валидации

```python
if not serializer.is_valid():
    logger.warning(
        "Ошибка валидации",
        extra={
            'user_id': str(request.user.id),
            'errors': serializer.errors,
            'request_id': getattr(request, 'request_id', None),
        }
    )
```

---

## Фильтрация чувствительных данных

### SensitiveDataFilter

Фильтр автоматически удаляет чувствительные данные из логов.

**Расположение**: `backend/core/middleware.py`

**Удаляемые ключи**:
- `password`, `token`, `secret`, `key`, `api_key`
- `access_token`, `refresh_token`, `authorization`
- `credit_card`, `cvv`, `cvc`, `ssn`, `passport`

**Пример**:
```python
# До фильтрации
{'password': 'secret123', 'email': 'user@example.com'}

# После фильтрации
{'password': '***REDACTED***', 'email': 'user@example.com'}
```

---

## Рекомендации

### 1. Используйте контекстное логирование

```python
# ✅ Хорошо
logger.info(
    "Заказ создан",
    extra={
        'order_id': order.id,
        'user_id': user.id,
        'request_id': request_id,
    }
)

# ❌ Плохо
logger.info(f"Заказ {order.id} создан пользователем {user.id}")
```

### 2. Логируйте ошибки с exc_info=True

```python
# ✅ Хорошо
logger.error("Ошибка при создании заказа", exc_info=True)

# ❌ Плохо
logger.error(f"Ошибка: {str(e)}")
```

### 3. Используйте правильные уровни

- **DEBUG**: Только для отладки
- **INFO**: Нормальная работа
- **WARNING**: Потенциальные проблемы
- **ERROR**: Ошибки, требующие внимания
- **CRITICAL**: Критические ошибки

### 4. Не логируйте чувствительные данные

```python
# ✅ Хорошо
logger.info("Пользователь авторизован", extra={'user_id': user.id})

# ❌ Плохо
logger.info(f"Пользователь {user.email} авторизован с паролем {password}")
```

### 5. Используйте request_id для трейсинга

```python
request_id = getattr(request, 'request_id', None)
logger.info("Операция выполнена", extra={'request_id': request_id})
```

### 6. Логируйте время выполнения для медленных операций

```python
start_time = time.time()
# операция
duration = time.time() - start_time
logger.info(
    "Операция выполнена",
    extra={'duration': duration, 'request_id': request_id}
)
```

---

## Мониторинг логов

### Просмотр логов

```bash
# Все логи
tail -f logs/app.log

# Только ошибки
tail -f logs/error.log

# Поиск по request_id
grep "a1b2c3d4" logs/app.log

# Поиск по user_id
grep "user_id.*67890" logs/app.log
```

### Анализ логов

Для анализа логов можно использовать:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Sentry** для отслеживания ошибок
- **Datadog** для мониторинга
- **Grafana** для визуализации

---

## Следующие шаги

1. ⏳ Настройка централизованного логирования (ELK/Sentry)
2. ⏳ Добавление метрик производительности
3. ⏳ Настройка алертов на критические ошибки
4. ⏳ Добавление логирования в остальные views

---

*Документ создан в рамках Этапа 1.6 рефакторинга*  
*Последнее обновление: Январь 2026*

