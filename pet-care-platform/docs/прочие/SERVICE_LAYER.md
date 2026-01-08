# Документация сервисного слоя

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 1.4 - Рефакторинг сервисного слоя

---

## 📋 Содержание

1. [Архитектура сервисного слоя](#архитектура-сервисного-слоя)
2. [Базовые классы](#базовые-классы)
3. [Сервисы приложения](#сервисы-приложения)
4. [Паттерны использования](#паттерны-использования)
5. [Рекомендации](#рекомендации)

---

## Архитектура сервисного слоя

### Принципы

1. **Разделение ответственности**: Views только координируют запросы, вся бизнес-логика в сервисах
2. **Единообразие**: Все сервисы наследуются от `BaseService`
3. **Унифицированные результаты**: Все методы возвращают `ServiceResult`
4. **Логирование**: Все сервисы используют единые методы логирования
5. **Транзакции**: Критические операции выполняются в транзакциях

### Структура

```
backend/
├── core/
│   └── services.py          # Базовые классы (BaseService, ServiceResult)
├── apps/
│   ├── shop/
│   │   └── services/
│   │       ├── order_service.py
│   │       ├── cart_service.py
│   │       ├── reservation_service.py
│   │       └── recommendation_service.py
│   ├── payments/
│   │   └── services.py
│   └── ...
```

---

## Базовые классы

### BaseService

Базовый класс для всех сервисов приложения.

**Расположение**: `backend/core/services.py`

**Методы**:

#### `log_error(error, context=None)`
Логирование ошибок с контекстом.

**Параметры**:
- `error`: Исключение
- `context`: Дополнительный контекст (dict)

**Пример**:
```python
try:
    # операция
except Exception as e:
    OrderService.log_error(e, {'order_id': order.id, 'user_id': user.id})
```

#### `log_info(message, context=None)`
Логирование информационных сообщений.

**Параметры**:
- `message`: Сообщение для логирования
- `context`: Дополнительный контекст (dict)

**Пример**:
```python
OrderService.log_info(f"Заказ создан: {order.id}", {'order_id': order.id})
```

#### `validate_required_fields(data, required_fields)`
Валидация обязательных полей.

**Параметры**:
- `data`: Словарь с данными
- `required_fields`: Список обязательных полей

**Возвращает**: `bool`

**Вызывает**: `ValueError` если отсутствуют обязательные поля

**Пример**:
```python
OrderService.validate_required_fields(data, ['user', 'cart_items'])
```

#### `safe_get(data, key, default=None)`
Безопасное получение значения из словаря.

**Параметры**:
- `data`: Словарь
- `key`: Ключ
- `default`: Значение по умолчанию

**Возвращает**: Значение из словаря или default

**Пример**:
```python
quantity = OrderService.safe_get(data, 'quantity', 1)
```

### ServiceResult

Унифицированный формат результатов работы сервисов.

**Расположение**: `backend/core/services.py`

**Поля**:
- `success`: bool - успешность операции
- `message`: str - сообщение о результате
- `data`: Any - данные результата (опционально)
- `errors`: List[str] - список ошибок (опционально)
- `error_code`: str - код ошибки (опционально)

**Методы**:
- `to_dict()` - преобразование в словарь
- `__bool__()` - для использования в if

**Пример**:
```python
result = OrderService.create_order_from_cart(...)
if result:
    order = result.data['order']
    payment = result.data['payment']
else:
    print(result.message)
    print(result.errors)
```

### ValidationService

Базовый сервис для валидации данных.

**Расположение**: `backend/core/services.py`

**Методы**:
- `validate_positive_number(value, field_name)` - валидация положительного числа
- `validate_non_empty_string(value, field_name)` - валидация непустой строки

---

## Сервисы приложения

### OrderService

**Расположение**: `backend/apps/shop/services/order_service.py`

**Наследует**: `BaseService`

**Основные методы**:

#### `create_order_from_cart(user, cart_items, ...) -> ServiceResult`
Создание заказа из элементов корзины.

**Возвращает**: `ServiceResult` с данными `{'order': Order, 'payment': Payment}`

#### `activate_order(order) -> bool`
Активация заказа после успешной оплаты.

#### `cancel_order(order, reason) -> bool`
Отмена заказа.

#### `get_order_details(order) -> Dict`
Получение деталей заказа для API.

#### `calculate_delivery_cost(delivery_type) -> Decimal`
Расчёт стоимости доставки.

#### `get_address(user, address_id, shipping_address) -> Tuple[Address, str]`
Получение адреса доставки.

**Использование**:
```python
from apps.shop.services.order_service import OrderService

result = OrderService.create_order_from_cart(
    user=user,
    cart_items=cart_items,
    delivery_type='standard',
    address_id=address_id
)

if result:
    order = result.data['order']
    payment = result.data['payment']
else:
    # Обработка ошибок
    errors = result.errors
```

### CartService

**Расположение**: `backend/apps/shop/services/cart_service.py`

**Наследует**: `BaseService`

**Основные методы**:

#### `add_product(user, product_id, quantity) -> ServiceResult`
Добавление товара в корзину.

**Возвращает**: `ServiceResult` с данными `{'item': CartItem}`

#### `add_course(user, course_id, pet_id, disclaimer_accepted) -> ServiceResult`
Добавление курса в корзину.

#### `update_product_quantity(user, product_id, quantity, delta) -> ServiceResult`
Обновление количества товара.

#### `remove_item(user, product_id, course_id) -> ServiceResult`
Удаление элемента из корзины.

#### `get_cart_items(user, item_type) -> List[CartItem]`
Получение элементов корзины.

#### `get_cart_summary(user) -> CartSummary`
Получение сводки по корзине.

#### `validate_cart_for_checkout(user, selected_item_ids) -> Tuple[bool, List[str], List[CartItem]]`
Валидация корзины перед оформлением заказа.

**Использование**:
```python
from apps.shop.services.cart_service import CartService

result = CartService.add_product(user, product_id=123, quantity=2)
if result:
    item = result.data['item']
else:
    print(result.message)
```

### PaymentService

**Расположение**: `backend/apps/payments/services.py`

**Наследует**: `BaseService`

**Основные методы**:

#### `create_payment(user, payment_type, object_id, amount, ...) -> Payment`
Создание нового платежа.

#### `process_payment(payment) -> bool`
Обработка платежа.

#### `confirm_payment(payment_id, external_payment_id) -> bool`
Подтверждение платежа.

#### `cancel_payment(payment_id, reason) -> bool`
Отмена платежа.

#### `refund_payment(payment_id, amount, reason) -> bool`
Возврат платежа.

#### `get_payment_statistics(user) -> Dict`
Получение статистики платежей.

**Использование**:
```python
from apps.payments.services import PaymentService

payment = PaymentService.create_payment(
    user=user,
    payment_type='shop_order',
    object_id=str(order.id),
    amount=Decimal('1000.00')
)
```

### ReservationService

**Расположение**: `backend/apps/shop/services/reservation_service.py`

**Основные методы**:
- `create_reservations_from_cart(cart) -> List[Reservation]`
- `create_reservations_from_items(user, items) -> List[Reservation]`
- `cancel_reservations(reservations) -> None`
- `cleanup_expired_reservations() -> None`

### RecommendationEngine

**Расположение**: `backend/apps/shop/services/recommendation_service.py`

**Основные методы**:
- `get_recommendations_for_pet(pet, limit) -> List[Product]`
- `get_recommendations_for_user(user, limit) -> List[Product]`

---

## Паттерны использования

### 1. Создание ресурса

```python
result = Service.create_resource(user, data)
if result:
    resource = result.data['resource']
    return Response({'resource': resource.to_dict()}, status=201)
else:
    return Response({
        'error': result.message,
        'errors': result.errors
    }, status=400)
```

### 2. Обработка ошибок

```python
try:
    result = Service.perform_operation(user, data)
    if not result:
        Service.log_error(
            Exception(result.message),
            {'user_id': user.id, 'errors': result.errors}
        )
except Exception as e:
    Service.log_error(e, {'user_id': user.id})
    return Response({'error': 'Внутренняя ошибка'}, status=500)
```

### 3. Транзакции

```python
@transaction.atomic
def create_order(...):
    # Все операции в транзакции
    pass
```

### 4. Валидация

```python
# В сервисе
Service.validate_required_fields(data, ['field1', 'field2'])

# Или через ValidationService
ValidationService.validate_positive_number(amount, 'amount')
```

---

## Рекомендации

### 1. Всегда используйте BaseService

```python
# ✅ Хорошо
class MyService(BaseService):
    @classmethod
    def do_something(cls):
        cls.log_info("Операция выполнена")

# ❌ Плохо
class MyService:
    def do_something(self):
        logger.info("Операция выполнена")
```

### 2. Возвращайте ServiceResult

```python
# ✅ Хорошо
@classmethod
def create_resource(cls, user, data) -> ServiceResult:
    try:
        resource = Resource.objects.create(...)
        return ServiceResult(
            success=True,
            message='Ресурс создан',
            data={'resource': resource}
        )
    except Exception as e:
        cls.log_error(e)
        return ServiceResult(
            success=False,
            message='Ошибка создания',
            error_code='CREATION_ERROR'
        )

# ❌ Плохо
@classmethod
def create_resource(cls, user, data):
    return Resource.objects.create(...)
```

### 3. Используйте контекстное логирование

```python
# ✅ Хорошо
OrderService.log_info(
    f"Заказ создан: {order.id}",
    {'order_id': order.id, 'user_id': user.id, 'amount': float(total)}
)

# ❌ Плохо
logger.info(f"Заказ создан: {order.id}")
```

### 4. Обрабатывайте ошибки в сервисах

```python
# ✅ Хорошо
try:
    # операция
except SpecificException as e:
    cls.log_error(e, context)
    return ServiceResult(success=False, message=str(e))
except Exception as e:
    cls.log_error(e, context)
    return ServiceResult(success=False, message='Внутренняя ошибка')

# ❌ Плохо
# операция (без обработки ошибок)
```

### 5. Используйте транзакции для критических операций

```python
# ✅ Хорошо
@classmethod
@transaction.atomic
def create_order(cls, ...):
    # операции создания заказа
    pass

# ❌ Плохо
@classmethod
def create_order(cls, ...):
    # операции без транзакции
    pass
```

---

## Рефакторинг сервисов

### Выполненные изменения

1. ✅ **OrderService**:
   - Наследуется от `BaseService`
   - Использует `ServiceResult` вместо `OrderResult`
   - Заменён `logger` на методы `BaseService`
   - Добавлено контекстное логирование

2. ✅ **CartService**:
   - Наследуется от `BaseService`
   - Использует `ServiceResult` вместо `CartItemResult`
   - Заменён `logger` на методы `BaseService`
   - Добавлено контекстное логирование

3. ✅ **PaymentService**:
   - Наследуется от `BaseService`
   - Заменён `logger` на методы `BaseService`
   - Добавлено контекстное логирование

### Преимущества

- ✅ Единообразная структура всех сервисов
- ✅ Унифицированное логирование с контекстом
- ✅ Стандартизированный формат результатов
- ✅ Упрощённая обработка ошибок
- ✅ Лучшая поддерживаемость кода

---

## Следующие шаги

1. ⏳ Рефакторинг остальных сервисов (ReservationService, RecommendationEngine)
2. ⏳ Обновление views для использования ServiceResult
3. ⏳ Добавление тестов для сервисов
4. ⏳ Создание документации по каждому сервису

---

*Документ создан в рамках Этапа 1.4 рефакторинга*  
*Последнее обновление: Январь 2026*

