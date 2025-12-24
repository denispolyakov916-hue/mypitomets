# Подробная инструкция по внесению изменений в бэкенде

## 📋 Краткая сводка

**Задача:** Добавить поддержку удаления курсов из корзины через API.

**Проблема:** В настоящее время эндпоинты `PUT /api/shop/cart/item/` и `DELETE /api/shop/cart/item/` работают только с товарами (`product_id`). Курсы из корзины удалить невозможно.

**Решение:** Обновить сериализатор и методы view для поддержки `course_id` в дополнение к `product_id`.

**Файлы для изменения:**
1. `backend/apps/shop/serializers.py` - класс `CartItemUpdateSerializer`
2. `backend/apps/shop/views.py` - класс `CartItemView`, методы `put()` и `delete()`

**Время на реализацию:** ~30-60 минут

**Приоритет:** КРИТИЧЕСКИЙ

---

## Обзор изменений

Необходимо добавить поддержку удаления курсов из корзины. В настоящее время эндпоинты `PUT /api/shop/cart/item/` и `DELETE /api/shop/cart/item/` работают только с товарами (`product_id`). Нужно добавить поддержку курсов (`course_id`).

---

## Изменение 1: Обновление сериализатора `CartItemUpdateSerializer`

### Файл: `backend/apps/shop/serializers.py`

### Текущий код (строки 225-262):

```python
class CartItemUpdateSerializer(serializers.Serializer):
    """
    Сериализатор для запроса обновления количества в корзине.
    
    Валидирует данные при изменении количества товара в корзине.
    
    Поля:
        product_id (int): ID товара в корзине - обязательное
        quantity (int): Новое количество - обязательное (0 = удалить)
    
    Пример запроса:
        {
            "product_id": 5,
            "quantity": 3
        }
    
    Примечание:
        При quantity=0 товар будет удалён из корзины.
    """
    
    product_id = serializers.IntegerField(
        required=True,
        help_text="ID товара в корзине"
    )
    
    quantity = serializers.IntegerField(
        required=True,
        min_value=0,
        help_text="Новое количество (0 для удаления)"
    )
    
    def validate_product_id(self, value):
        """Валидация ID товара."""
        if value <= 0:
            raise serializers.ValidationError(
                "ID товара должен быть положительным числом"
            )
        return value
```

### Заменить на:

```python
class CartItemUpdateSerializer(serializers.Serializer):
    """
    Сериализатор для запроса обновления количества в корзине.
    
    Валидирует данные при изменении количества товара или удалении курса из корзины.
    
    Поля:
        product_id (int): ID товара в корзине - опционально (если не указан course_id)
        course_id (int): ID курса в корзине - опционально (если не указан product_id)
        quantity (int): Новое количество - обязательное (0 = удалить)
    
    Пример запроса для товара:
        {
            "product_id": 5,
            "quantity": 3
        }
    
    Пример запроса для курса:
        {
            "course_id": 10,
            "quantity": 0  # для удаления
        }
    
    Примечание:
        - Должен быть указан либо product_id, либо course_id, но не оба одновременно
        - При quantity=0 элемент будет удалён из корзины
        - Для курсов quantity всегда = 1, изменение количества невозможно
    """
    
    product_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID товара в корзине (опционально, если указан course_id)"
    )
    
    course_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID курса в корзине (опционально, если указан product_id)"
    )
    
    quantity = serializers.IntegerField(
        required=True,
        min_value=0,
        help_text="Новое количество (0 для удаления)"
    )
    
    def validate_product_id(self, value):
        """Валидация ID товара."""
        if value is not None and value <= 0:
            raise serializers.ValidationError(
                "ID товара должен быть положительным числом"
            )
        return value
    
    def validate_course_id(self, value):
        """Валидация ID курса."""
        if value is not None and value <= 0:
            raise serializers.ValidationError(
                "ID курса должен быть положительным числом"
            )
        return value
    
    def validate(self, attrs):
        """
        Комплексная валидация данных.
        
        Проверяет взаимосвязи между полями:
        - Должен быть указан либо product_id, либо course_id
        - Нельзя указывать оба одновременно
        
        Аргументы:
            attrs (dict): Валидируемые данные
        
        Возвращает:
            dict: Валидированные данные
        
        Исключения:
            ValidationError: При нарушении правил валидации
        """
        product_id = attrs.get('product_id')
        course_id = attrs.get('course_id')
        
        # Проверка: должен быть указан либо product_id, либо course_id
        if not product_id and not course_id:
            raise serializers.ValidationError(
                "Необходимо указать либо product_id, либо course_id"
            )
        
        # Проверка: нельзя указывать оба одновременно
        if product_id and course_id:
            raise serializers.ValidationError(
                "Нельзя указывать одновременно product_id и course_id"
            )
        
        return attrs
```

---

## Изменение 2: Обновление метода `put()` в `CartItemView`

### Файл: `backend/apps/shop/views.py`

### Текущий код (строки 438-480):

```python
def put(self, request):
    """Обновление количества товара с валидацией наличия."""
    serializer = CartItemUpdateSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    product_id = serializer.validated_data['product_id']
    quantity = serializer.validated_data['quantity']
    
    try:
        cart = Cart.objects.get(user=request.user)
        cart_item = CartItem.objects.select_related('product').get(cart=cart, product_id=product_id)
    except (Cart.DoesNotExist, CartItem.DoesNotExist):
        return Response(
            {'error': 'Товар не найден в корзине'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if quantity <= 0:
        cart_item.delete()
    else:
        # Проверка доступного количества на складе
        if quantity > cart_item.product.stock_count:
            return Response({
                'error': f'Недостаточно товара на складе. Доступно: {cart_item.product.stock_count} шт.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        cart_item.quantity = quantity
        cart_item.save()
    
    # Возврат обновлённой корзины
    items = [item.to_dict() for item in cart.items.select_related('product').all()]
    total = float(cart.get_total())
    
    return Response({
        'message': 'Корзина обновлена',
        'cart': items,
        'total': total
    }, status=status.HTTP_200_OK)
```

### Заменить на:

```python
def put(self, request):
    """Обновление количества товара или удаление курса с валидацией наличия."""
    serializer = CartItemUpdateSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    product_id = serializer.validated_data.get('product_id')
    course_id = serializer.validated_data.get('course_id')
    quantity = serializer.validated_data['quantity']
    
    try:
        cart = Cart.objects.get(user=request.user)
        
        # Определяем, работаем ли с товаром или курсом
        if product_id:
            # Работа с товаром
            cart_item = CartItem.objects.select_related('product').get(
                cart=cart, 
                product_id=product_id
            )
            
            if quantity <= 0:
                cart_item.delete()
            else:
                # Проверка доступного количества на складе
                if quantity > cart_item.product.stock_count:
                    return Response({
                        'error': f'Недостаточно товара на складе. Доступно: {cart_item.product.stock_count} шт.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                cart_item.quantity = quantity
                cart_item.save()
                
        elif course_id:
            # Работа с курсом
            cart_item = CartItem.objects.select_related('course', 'pet').get(
                cart=cart,
                course_id=course_id
            )
            
            # Для курсов quantity всегда = 1, но можно удалить (quantity=0)
            if quantity <= 0:
                cart_item.delete()
            else:
                # Курсы всегда имеют quantity=1, обновление не требуется
                # Но если quantity > 1, это ошибка (курсы нельзя добавлять в количестве > 1)
                if quantity > 1:
                    return Response({
                        'error': 'Курсы можно добавить только в количестве 1'
                    }, status=status.HTTP_400_BAD_REQUEST)
                # Если quantity == 1, ничего не делаем (уже в корзине)
                
    except Cart.DoesNotExist:
        return Response(
            {'error': 'Корзина не найдена'},
            status=status.HTTP_404_NOT_FOUND
        )
    except CartItem.DoesNotExist:
        item_type = 'товар' if product_id else 'курс'
        return Response(
            {'error': f'{item_type.capitalize()} не найден в корзине'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Возврат обновлённой корзины
    # ВАЖНО: используем select_related для всех связанных объектов
    items = [item.to_dict() for item in cart.items.select_related('product', 'course', 'pet').all()]
    total = float(cart.get_total())
    items_count = cart.get_items_count()
    
    return Response({
        'message': 'Корзина обновлена',
        'cart': items,
        'total': total,
        'items_count': items_count
    }, status=status.HTTP_200_OK)
```

**Ключевые изменения:**
1. Использование `.get('product_id')` и `.get('course_id')` вместо прямого доступа
2. Добавлена логика обработки курсов
3. Использование `select_related('product', 'course', 'pet')` для оптимизации запросов
4. Добавлен `items_count` в ответ

---

## Изменение 3: Обновление метода `delete()` в `CartItemView`

### Файл: `backend/apps/shop/views.py`

### Текущий код (строки 482-511):

```python
def delete(self, request):
    """Удаление товара из корзины."""
    product_id = request.data.get('product_id')
    
    if not product_id:
        return Response(
            {'error': 'Необходимо указать product_id'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        cart = Cart.objects.get(user=request.user)
        cart_item = CartItem.objects.get(cart=cart, product_id=product_id)
    except (Cart.DoesNotExist, CartItem.DoesNotExist):
        return Response(
            {'error': 'Товар не найден в корзине'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    cart_item.delete()
    
    # Возврат обновлённой корзины
    items = [item.to_dict() for item in cart.items.select_related('product').all()]
    total = float(cart.get_total())
    
    return Response({
        'message': 'Товар удалён из корзины',
        'cart': items,
        'total': total
    }, status=status.HTTP_200_OK)
```

### Заменить на:

```python
def delete(self, request):
    """Удаление товара или курса из корзины."""
    product_id = request.data.get('product_id')
    course_id = request.data.get('course_id')
    
    # Проверка: должен быть указан либо product_id, либо course_id
    if not product_id and not course_id:
        return Response(
            {'error': 'Необходимо указать либо product_id, либо course_id'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Проверка: нельзя указывать оба одновременно
    if product_id and course_id:
        return Response(
            {'error': 'Нельзя указывать одновременно product_id и course_id'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        cart = Cart.objects.get(user=request.user)
        
        if product_id:
            # Удаление товара
            cart_item = CartItem.objects.select_related('product').get(
                cart=cart, 
                product_id=product_id
            )
            item_type = 'товар'
        elif course_id:
            # Удаление курса
            cart_item = CartItem.objects.select_related('course', 'pet').get(
                cart=cart,
                course_id=course_id
            )
            item_type = 'курс'
            
    except Cart.DoesNotExist:
        return Response(
            {'error': 'Корзина не найдена'},
            status=status.HTTP_404_NOT_FOUND
        )
    except CartItem.DoesNotExist:
        return Response(
            {'error': f'{item_type.capitalize()} не найден в корзине'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    cart_item.delete()
    
    # Возврат обновлённой корзины
    # ВАЖНО: используем select_related для всех связанных объектов
    items = [item.to_dict() for item in cart.items.select_related('product', 'course', 'pet').all()]
    total = float(cart.get_total())
    items_count = cart.get_items_count()
    
    return Response({
        'message': f'{item_type.capitalize()} удалён из корзины',
        'cart': items,
        'total': total,
        'items_count': items_count
    }, status=status.HTTP_200_OK)
```

**Ключевые изменения:**
1. Добавлена поддержка `course_id`
2. Валидация наличия хотя бы одного из полей
3. Валидация отсутствия обоих полей одновременно
4. Использование `select_related('product', 'course', 'pet')`
5. Добавлен `items_count` в ответ
6. Динамическое определение типа элемента для сообщений об ошибках

---

## Критически важные моменты

### 1. Использование `select_related()`

**ОБЯЗАТЕЛЬНО** использовать при загрузке элементов корзины:

```python
cart.items.select_related('product', 'course', 'pet').all()
```

**Почему это важно:**
- Метод `CartItem.to_dict()` обращается к связанным объектам `product`, `course` и `pet`
- Без `select_related()` будет выполнено N+1 запросов к БД (один для каждого элемента корзины)
- Это критично для производительности

**Неправильно:**
```python
items = [item.to_dict() for item in cart.items.all()]  # ❌ N+1 запросов
```

**Правильно:**
```python
items = [item.to_dict() for item in cart.items.select_related('product', 'course', 'pet').all()]  # ✅ 1 запрос
```

### 2. Структура ответа API

После всех операций (PUT, DELETE) возвращайте единообразную структуру:

```python
{
    'message': '...',           # Сообщение о результате операции
    'cart': [...],              # Массив всех элементов корзины (товары + курсы)
    'total': 0.0,               # Общая сумма корзины
    'items_count': 0            # Общее количество элементов в корзине
}
```

**Важно:** Поле `cart` должно содержать **все** элементы корзины, а не только обновлённые/удалённые.

### 3. Обработка курсов

**Особенности курсов:**
- Курсы всегда имеют `quantity = 1` (нельзя изменить)
- Нельзя добавить курс в количестве > 1
- Можно только удалить курс (quantity=0)
- При попытке установить `quantity > 1` возвращайте ошибку 400

**Логика обработки:**
```python
if course_id:
    if quantity <= 0:
        cart_item.delete()  # Удаление
    elif quantity > 1:
        return Response({'error': 'Курсы можно добавить только в количестве 1'}, ...)
    # Если quantity == 1, ничего не делаем (курс уже в корзине)
```

### 4. Обработка товаров

**Особенности товаров:**
- Товары могут иметь любое количество `quantity >= 1`
- При `quantity = 0` товар удаляется
- При обновлении количества проверяйте наличие на складе

**Логика обработки:**
```python
if product_id:
    if quantity <= 0:
        cart_item.delete()  # Удаление
    else:
        # Проверка наличия на складе
        if quantity > cart_item.product.stock_count:
            return Response({'error': '...'}, ...)
        cart_item.quantity = quantity
        cart_item.save()
```

### 5. Обработка ошибок

**Всегда проверяйте:**
- Существование корзины (`Cart.DoesNotExist`)
- Существование элемента корзины (`CartItem.DoesNotExist`)
- Валидность входных данных (через сериализатор)

**Сообщения об ошибках должны быть понятными:**
- "Товар не найден в корзине" (для товаров)
- "Курс не найден в корзине" (для курсов)
- "Корзина не найдена" (если корзина отсутствует)

---

## Тестирование

### 1. Тестирование через Django Shell

```python
# Активируйте виртуальное окружение и запустите Django shell
python manage.py shell

# Импортируйте необходимые модели
from apps.shop.models import Cart, CartItem
from apps.training.models import Course
from django.contrib.auth import get_user_model

User = get_user_model()

# Получите пользователя и создайте тестовые данные
user = User.objects.first()
cart, _ = Cart.objects.get_or_create(user=user)

# Добавьте курс в корзину (через API или напрямую)
course = Course.objects.first()
cart_item = CartItem.objects.create(cart=cart, course=course, quantity=1)

# Проверьте, что курс в корзине
print(cart.items.filter(course=course).exists())  # Должно быть True

# После изменений в коде попробуйте удалить через API
```

### 2. Тестирование через HTTP запросы

#### Тест 1: Удаление товара (должно работать как раньше)
```bash
DELETE http://localhost:8000/api/shop/cart/item/
Headers:
  Authorization: Bearer <token>
Body (JSON):
{
  "product_id": 5
}
```

**Ожидаемый ответ:**
```json
{
  "message": "Товар удалён из корзины",
  "cart": [...],
  "total": 0.0,
  "items_count": 0
}
```

#### Тест 2: Удаление курса (новый функционал)
```bash
DELETE http://localhost:8000/api/shop/cart/item/
Headers:
  Authorization: Bearer <token>
Body (JSON):
{
  "course_id": 10
}
```

**Ожидаемый ответ:**
```json
{
  "message": "Курс удалён из корзины",
  "cart": [...],
  "total": 0.0,
  "items_count": 0
}
```

#### Тест 3: Удаление курса через PUT (quantity=0)
```bash
PUT http://localhost:8000/api/shop/cart/item/
Headers:
  Authorization: Bearer <token>
Body (JSON):
{
  "course_id": 10,
  "quantity": 0
}
```

**Ожидаемый ответ:**
```json
{
  "message": "Корзина обновлена",
  "cart": [...],
  "total": 0.0,
  "items_count": 0
}
```

#### Тест 4: Ошибка - не указан ни product_id, ни course_id
```bash
DELETE http://localhost:8000/api/shop/cart/item/
Headers:
  Authorization: Bearer <token>
Body (JSON):
{}
```

**Ожидаемый ответ:**
```json
{
  "error": "Необходимо указать либо product_id, либо course_id"
}
```
**Статус:** 400 Bad Request

#### Тест 5: Ошибка - указаны оба параметра
```bash
DELETE http://localhost:8000/api/shop/cart/item/
Headers:
  Authorization: Bearer <token>
Body (JSON):
{
  "product_id": 5,
  "course_id": 10
}
```

**Ожидаемый ответ:**
```json
{
  "error": "Нельзя указывать одновременно product_id и course_id"
}
```
**Статус:** 400 Bad Request

#### Тест 6: Ошибка - курс не найден в корзине
```bash
DELETE http://localhost:8000/api/shop/cart/item/
Headers:
  Authorization: Bearer <token>
Body (JSON):
{
  "course_id": 99999
}
```

**Ожидаемый ответ:**
```json
{
  "error": "Курс не найден в корзине"
}
```
**Статус:** 404 Not Found

#### Тест 7: Ошибка - попытка установить quantity > 1 для курса
```bash
PUT http://localhost:8000/api/shop/cart/item/
Headers:
  Authorization: Bearer <token>
Body (JSON):
{
  "course_id": 10,
  "quantity": 2
}
```

**Ожидаемый ответ:**
```json
{
  "error": "Курсы можно добавить только в количестве 1"
}
```
**Статус:** 400 Bad Request

### 3. Проверка структуры ответа

После каждого запроса проверьте:

1. **Поле `cart`** содержит все элементы корзины (товары + курсы)
2. **Поле `total`** содержит правильную общую сумму
3. **Поле `items_count`** содержит правильное количество элементов
4. **Каждый элемент в `cart`** имеет правильную структуру:
   - Для товаров: `{'id': ..., 'product': {...}, 'quantity': ..., 'price': ...}`
   - Для курсов: `{'id': ..., 'course': {...}, 'pet': {...}, 'quantity': 1, 'price': ...}`

### 4. Проверка производительности

После изменений проверьте количество SQL-запросов:

```python
from django.db import connection
from django.test.utils import override_settings

# В Django shell или тестах
with override_settings(DEBUG=True):
    # Выполните запрос к API
    # ...
    
    # Проверьте количество запросов
    print(f"Выполнено запросов: {len(connection.queries)}")
    
    # Должно быть минимальное количество запросов благодаря select_related
```

---

## Возможные проблемы и решения

### Проблема 1: Ошибка "CartItem matching query does not exist"

**Причина:** Курс может быть привязан к питомцу, поэтому нужно искать с учётом `pet`.

**Решение:** В методе `delete()` используйте правильный поиск:

```python
# Для курсов может быть несколько записей с разными питомцами
# Но если pet не указан при добавлении, pet будет None
cart_item = CartItem.objects.select_related('course', 'pet').get(
    cart=cart,
    course_id=course_id,
    pet__isnull=True  # Если курс добавлен без привязки к питомцу
)
```

**Или более универсальный вариант:**
```python
# Получаем первый найденный курс (если pet не важен для удаления)
cart_item = CartItem.objects.select_related('course', 'pet').filter(
    cart=cart,
    course_id=course_id
).first()

if not cart_item:
    return Response(
        {'error': 'Курс не найден в корзине'},
        status=status.HTTP_404_NOT_FOUND
    )
```

### Проблема 2: Неправильная структура ответа

**Причина:** Метод `to_dict()` модели `CartItem` может возвращать разную структуру для товаров и курсов.

**Решение:** Убедитесь, что метод `to_dict()` в модели `CartItem` правильно обрабатывает оба случая:

```python
# В backend/apps/shop/models.py, класс CartItem
def to_dict(self):
    """Сериализация для API."""
    if self.product:
        return {
            'id': self.id,
            'product': self.product.to_dict(),
            'quantity': self.quantity,
            'price': self.get_total()
        }
    elif self.course:
        data = {
            'id': self.id,
            'course': self.course.to_dict(),
            'quantity': 1,
            'disclaimer_accepted': self.disclaimer_accepted,
            'price': self.get_total()
        }
        if self.pet:
            data['pet'] = {
                'id': str(self.pet.id),
                'name': self.pet.name,
                # ... другие поля питомца
            }
        return data
    return {}
```

### Проблема 3: N+1 запросы к БД

**Причина:** Не используется `select_related()`.

**Решение:** Всегда используйте:
```python
cart.items.select_related('product', 'course', 'pet').all()
```

### Проблема 4: Курс не удаляется, если привязан к питомцу

**Причина:** При поиске курса нужно учитывать `pet_id`, если он был указан при добавлении. В модели `CartItem` есть уникальное ограничение по `(cart, course, pet)`, поэтому один и тот же курс может быть в корзине несколько раз с разными питомцами.

**Решение:** 

**Вариант 1 (рекомендуемый):** Удалять первый найденный курс с указанным `course_id`:

```python
if course_id:
    # Получаем первый найденный курс (если pet не важен для удаления)
    cart_item = CartItem.objects.select_related('course', 'pet').filter(
        cart=cart,
        course_id=course_id
    ).first()
    
    if not cart_item:
        return Response(
            {'error': 'Курс не найден в корзине'},
            status=status.HTTP_404_NOT_FOUND
        )
```

**Вариант 2:** Если фронтенд передаёт `pet_id` при удалении, используйте его:

```python
# В методе delete(), если фронтенд передаёт pet_id
pet_id = request.data.get('pet_id')

if course_id:
    query = CartItem.objects.select_related('course', 'pet').filter(
        cart=cart,
        course_id=course_id
    )
    
    # Если указан pet_id, фильтруем по нему
    if pet_id:
        query = query.filter(pet_id=pet_id)
    else:
        # Если pet_id не указан, ищем курс без привязки к питомцу
        query = query.filter(pet__isnull=True)
    
    cart_item = query.first()
    
    if not cart_item:
        return Response(
            {'error': 'Курс не найден в корзине'},
            status=status.HTTP_404_NOT_FOUND
        )
```

**Примечание:** В текущей реализации фронтенд не передаёт `pet_id` при удалении, поэтому используйте **Вариант 1**. Если в будущем понадобится удалять конкретный курс с привязкой к питомцу, можно будет добавить поддержку `pet_id`.

---

## Чек-лист перед коммитом

- [ ] Обновлён `CartItemUpdateSerializer` с поддержкой `course_id`
- [ ] Добавлена валидация в `validate()` метод сериализатора
- [ ] Обновлён метод `put()` в `CartItemView` для работы с курсами
- [ ] Обновлён метод `delete()` в `CartItemView` для работы с курсами
- [ ] Используется `select_related('product', 'course', 'pet')` везде
- [ ] В ответах добавлено поле `items_count`
- [ ] Протестированы все сценарии (удаление товара, удаление курса, ошибки)
- [ ] Проверена производительность (нет N+1 запросов)
- [ ] Проверена структура ответов API
- [ ] Обновлена документация API (если есть)

---

## Файлы для изменения

1. **`backend/apps/shop/serializers.py`**
   - Класс: `CartItemUpdateSerializer` (строки 225-262)
   - Изменения: добавить поддержку `course_id`, обновить валидацию

2. **`backend/apps/shop/views.py`**
   - Класс: `CartItemView`
   - Метод: `put()` (строки 438-480)
   - Метод: `delete()` (строки 482-511)
   - Изменения: добавить обработку курсов, использовать `select_related`

---

## Приоритет

**КРИТИЧЕСКИЙ** - без этих изменений пользователи не смогут удалять курсы из корзины, что критично для UX и функциональности приложения.

---

## Дополнительные рекомендации

### 1. Логирование

Рекомендуется добавить логирование операций:

```python
import logging

logger = logging.getLogger(__name__)

# В методах put() и delete()
logger.info(f"User {request.user.id} updating cart item: product_id={product_id}, course_id={course_id}, quantity={quantity}")
```

### 2. Тесты

Рекомендуется добавить unit-тесты:

```python
# backend/apps/shop/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from apps.shop.models import Cart, CartItem
from apps.training.models import Course

class CartItemViewTestCase(TestCase):
    def test_delete_course_from_cart(self):
        # Тест удаления курса
        pass
    
    def test_update_course_quantity_fails(self):
        # Тест попытки изменить quantity курса
        pass
```

### 3. Документация API

Обновите документацию API (Swagger/OpenAPI), если используется:

```yaml
/api/shop/cart/item/:
  delete:
    requestBody:
      content:
        application/json:
          schema:
            oneOf:
              - type: object
                properties:
                  product_id:
                    type: integer
              - type: object
                properties:
                  course_id:
                    type: integer
```

---

## Контакты для вопросов

Если возникнут вопросы при внесении изменений, обратитесь к:
- Документации Django REST Framework: https://www.django-rest-framework.org/
- Документации Django ORM: https://docs.djangoproject.com/en/stable/topics/db/queries/

---

## 📝 Примеры полного кода для копирования

### Полный код сериализатора (готов к замене)

См. раздел "Изменение 1" выше - там приведён полный код для замены.

### Полный код метода `put()` (готов к замене)

См. раздел "Изменение 2" выше - там приведён полный код для замены.

### Полный код метода `delete()` (готов к замене)

См. раздел "Изменение 3" выше - там приведён полный код для замены.

---

## 🔍 Проверка после внесения изменений

### Шаг 1: Проверка синтаксиса

```bash
cd backend
python manage.py check
```

Должно вывести: `System check identified no issues (0 silenced).`

### Шаг 2: Проверка миграций

```bash
python manage.py makemigrations
```

Должно вывести: `No changes detected` (миграции не требуются, так как изменения только в коде)

### Шаг 3: Запуск сервера

```bash
python manage.py runserver
```

Сервер должен запуститься без ошибок.

### Шаг 4: Тестирование через API

Используйте Postman, curl или другой инструмент для тестирования:

```bash
# 1. Добавьте курс в корзину
POST http://localhost:8000/api/shop/cart/
Body: {"course_id": 1}

# 2. Проверьте корзину
GET http://localhost:8000/api/shop/cart/

# 3. Удалите курс
DELETE http://localhost:8000/api/shop/cart/item/
Body: {"course_id": 1}

# 4. Проверьте, что курс удалён
GET http://localhost:8000/api/shop/cart/
```

---

**Дата создания документа:** 2024-12-20  
**Версия:** 1.0  
**Статус:** Готово к реализации

