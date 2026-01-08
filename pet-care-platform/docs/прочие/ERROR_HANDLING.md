# Документация по обработке ошибок

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 1.7 - Улучшение обработки ошибок

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Классы исключений](#классы-исключений)
3. [Глобальный обработчик исключений](#глобальный-обработчик-исключений)
4. [Использование в views](#использование-в-views)
5. [Формат ответов об ошибках](#формат-ответов-об-ошибках)
6. [Рекомендации](#рекомендации)

---

## Обзор

Система обработки ошибок платформы "Питомец+" обеспечивает:
- Единообразную обработку всех ошибок
- Понятные сообщения для пользователей
- Детальную информацию в DEBUG режиме
- Автоматическое логирование всех ошибок
- Защиту от утечки чувствительных данных

---

## Классы исключений

### ApiError

Базовый класс для всех ошибок API.

**Расположение**: `backend/core/exceptions.py`

**Основные методы**:

#### Статические методы создания ошибок

```python
# Ошибка неавторизованного доступа (401)
ApiError.unauthorized_error(detail=None)

# Ошибка некорректного запроса (400)
ApiError.bad_request(message, errors=None, error_code='BAD_REQUEST')

# Ошибка запрещенного доступа (403)
ApiError.forbidden(detail=None, error_code='FORBIDDEN')

# Ошибка ресурс не найден (404)
ApiError.not_found(message, error_code='NOT_FOUND')

# Ошибка валидации (400)
ApiError.validation_error(message, errors=None)

# Внутренняя ошибка сервера (500)
ApiError.internal_error(message=None, error_code='INTERNAL_ERROR')

# Ошибка конфликта (409)
ApiError.conflict(message, error_code='CONFLICT')
```

**Пример использования**:

```python
from core.exceptions import ApiError

# В view
if not product:
    raise ApiError.not_found('Товар не найден', error_code='PRODUCT_NOT_FOUND')

if not user.is_active:
    raise ApiError.forbidden('Аккаунт неактивен', error_code='ACCOUNT_INACTIVE')

if not serializer.is_valid():
    raise ApiError.validation_error(
        'Ошибка валидации',
        errors=serializer.errors
    )
```

### Специализированные классы

```python
from core.exceptions import ValidationError, NotFoundError, PermissionError

# Ошибка валидации
raise ValidationError('Ошибка валидации', errors=serializer.errors)

# Ресурс не найден
raise NotFoundError('Товар не найден')

# Доступ запрещен
raise PermissionError('Доступ запрещен')
```

---

## Глобальный обработчик исключений

### custom_exception_handler

Глобальный обработчик для всех исключений в DRF.

**Расположение**: `backend/core/exception_handler.py`

**Настройка**: Добавлен в `REST_FRAMEWORK['EXCEPTION_HANDLER']` в `settings.py`

**Функции**:
- Обрабатывает все исключения в API
- Форматирует ответы в едином формате
- Логирует необработанные исключения
- Добавляет debug информацию в DEBUG режиме

**Обработка исключений**:

1. **ApiError**: Использует `get_full_details()` для форматирования
2. **DRF исключения**: Форматирует в единый формат
3. **Необработанные исключения**: Логирует и возвращает общее сообщение

---

## Использование в views

### Рекомендуемый подход

```python
from core.exceptions import ApiError
from rest_framework.views import APIView
from rest_framework.response import Response

class MyView(APIView):
    def get(self, request, id):
        try:
            obj = MyModel.objects.get(id=id)
        except MyModel.DoesNotExist:
            raise ApiError.not_found('Объект не найден', error_code='OBJECT_NOT_FOUND')
        
        # Валидация
        if not obj.is_active:
            raise ApiError.forbidden('Объект неактивен')
        
        return Response({'data': obj.to_dict()})
```

### Обработка валидации

```python
def post(self, request):
    serializer = MySerializer(data=request.data)
    
    if not serializer.is_valid():
        raise ApiError.validation_error(
            'Ошибка валидации',
            errors=serializer.errors
        )
    
    obj = serializer.save()
    return Response({'data': obj.to_dict()}, status=201)
```

### Обработка бизнес-логики

```python
def post(self, request):
    try:
        result = MyService.perform_operation(request.data)
        return Response({'data': result})
    except ValueError as e:
        raise ApiError.bad_request(str(e), error_code='INVALID_OPERATION')
    except Exception as e:
        # Логирование выполняется автоматически
        raise ApiError.internal_error(
            f'Ошибка операции: {str(e)}' if settings.DEBUG else None
        )
```

---

## Формат ответов об ошибках

### Стандартный формат

```json
{
    "error": "Сообщение об ошибке",
    "code": "ERROR_CODE"
}
```

### С ошибками валидации

```json
{
    "error": "Ошибка валидации",
    "code": "VALIDATION_ERROR",
    "errors": {
        "field1": ["Ошибка поля 1"],
        "field2": ["Ошибка поля 2"]
    }
}
```

### В DEBUG режиме

```json
{
    "error": "Сообщение об ошибке",
    "code": "ERROR_CODE",
    "status_code": 400,
    "exception_type": "ApiError",
    "debug": {
        "exception_type": "ApiError",
        "exception_message": "Детальное сообщение",
        "request_id": "a1b2c3d4"
    }
}
```

### Примеры ответов

#### 400 Bad Request
```json
{
    "error": "Ошибка валидации",
    "code": "VALIDATION_ERROR",
    "errors": {
        "email": ["Обязательное поле"],
        "password": ["Минимум 8 символов"]
    }
}
```

#### 401 Unauthorized
```json
{
    "error": "Пользователь не авторизован",
    "code": "UNAUTHORIZED"
}
```

#### 403 Forbidden
```json
{
    "error": "Доступ запрещен",
    "code": "FORBIDDEN"
}
```

#### 404 Not Found
```json
{
    "error": "Товар не найден",
    "code": "PRODUCT_NOT_FOUND"
}
```

#### 500 Internal Server Error
```json
{
    "error": "Внутренняя ошибка сервера",
    "code": "INTERNAL_ERROR"
}
```

В DEBUG режиме:
```json
{
    "error": "ValueError: Invalid data",
    "code": "INTERNAL_ERROR",
    "debug": {
        "exception_type": "ValueError",
        "exception_message": "Invalid data",
        "request_id": "a1b2c3d4"
    }
}
```

---

## Рекомендации

### 1. Используйте ApiError для всех ошибок API

```python
# ✅ Хорошо
raise ApiError.not_found('Товар не найден')

# ❌ Плохо
return Response({'error': 'Товар не найден'}, status=404)
```

### 2. Используйте правильные коды ошибок

```python
# ✅ Хорошо
raise ApiError.not_found('Товар не найден', error_code='PRODUCT_NOT_FOUND')

# ❌ Плохо
raise ApiError.not_found('Товар не найден', error_code='ERROR')
```

###3. Не логируйте ошибки вручную (логирование выполняется автоматически)

```python
# ✅ Хорошо
raise ApiError.internal_error()

# ❌ Плохо
logger.error("Ошибка")
raise ApiError.internal_error()
```

### 4. Используйте специализированные классы для типичных ошибок

```python
# ✅ Хорошо
from core.exceptions import ValidationError, NotFoundError

raise ValidationError('Ошибка валидации', errors=serializer.errors)
raise NotFoundError('Товар не найден')

# ❌ Плохо
raise ApiError.bad_request('Ошибка валидации', errors=serializer.errors)
raise ApiError.not_found('Товар не найден')
```

### 5. Не раскрывайте чувствительные данные в продакшене

```python
# ✅ Хорошо
raise ApiError.internal_error(
    f'Ошибка: {str(e)}' if settings.DEBUG else None
)

# ❌ Плохо
raise ApiError.internal_error(f'Ошибка: {str(e)}')
```

### 6. Используйте try/except для обработки исключений БД

```python
# ✅ Хорошо
try:
    product = Product.objects.get(id=product_id)
except Product.DoesNotExist:
    raise ApiError.not_found('Товар не найден')

# ❌ Плохо
product = Product.objects.get(id=product_id)  # Может вызвать DoesNotExist
```

---

## Коды ошибок

### Стандартные коды

- `UNAUTHORIZED` - Пользователь не авторизован
- `FORBIDDEN` - Доступ запрещен
- `NOT_FOUND` - Ресурс не найден
- `VALIDATION_ERROR` - Ошибка валидации
- `BAD_REQUEST` - Некорректный запрос
- `INTERNAL_ERROR` - Внутренняя ошибка сервера
- `CONFLICT` - Конфликт ресурсов

### Специфичные коды

- `PRODUCT_NOT_FOUND` - Товар не найден
- `COURSE_NOT_FOUND` - Курс не найден
- `CART_EMPTY` - Корзина пуста
- `INSUFFICIENT_STOCK` - Недостаточно товара на складе
- `PAYMENT_FAILED` - Ошибка платежа
- `ACCOUNT_INACTIVE` - Аккаунт неактивен
- `ACCOUNT_NOT_ACTIVATED` - Аккаунт не активирован

---

## Логирование ошибок

Все ошибки автоматически логируются через:
1. **RequestLoggingMiddleware** - логирует все исключения в запросах
2. **custom_exception_handler** - логирует необработанные исключения
3. **BaseService.log_error()** - логирует ошибки в сервисах

**Не нужно логировать ошибки вручную** - это выполняется автоматически.

---

## Следующие шаги

1. ⏳ Замена всех Response с ошибками на ApiError
2. ⏳ Добавление обработки ошибок в остальные views
3. ⏳ Создание тестов для обработки ошибок
4. ⏳ Документирование всех кодов ошибок

---

*Документ создан в рамках Этапа 1.7 рефакторинга*  
*Последнее обновление: Январь 2026*

