# Инструкция по добавлению поддержки удаления курсов из корзины на бэкенде

## Проблема

В настоящее время эндпоинт `DELETE /api/shop/cart/item/` поддерживает удаление только товаров (по `product_id`). Курсы из корзины удалить невозможно, что вызывает ошибки на фронтенде.

## Текущая реализация

### Файл: `backend/apps/shop/views.py`
- Класс: `CartItemView`
- Метод `delete()` (строки 482-511): удаляет только товары по `product_id`
- Метод `put()` (строки 438-480): обновляет только товары по `product_id`

### Файл: `backend/apps/shop/serializers.py`
- Класс: `CartItemUpdateSerializer` (строки 225-262)
- Поддерживает только `product_id`, не поддерживает `course_id`

## Необходимые изменения

### 1. Обновить сериализатор `CartItemUpdateSerializer`

**Файл:** `backend/apps/shop/serializers.py`

**Текущий код (строки 225-262):**
```python
class CartItemUpdateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=True, ...)
    quantity = serializers.IntegerField(required=True, min_value=0, ...)
```

**Необходимо изменить на:**
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
        
        Проверяет, что указан либо product_id, либо course_id (но не оба).
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

### 2. Обновить метод `put()` в `CartItemView`

**Файл:** `backend/apps/shop/views.py`

**Текущий код (строки 438-480):**
```python
def put(self, request):
    """Обновление количества товара с валидацией наличия."""
    serializer = CartItemUpdateSerializer(data=request.data)
    # ... код работает только с product_id
```

**Необходимо изменить на:**
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
    # Важно: используем select_related для всех связанных объектов
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

### 3. Обновить метод `delete()` в `CartItemView`

**Файл:** `backend/apps/shop/views.py`

**Текущий код (строки 482-511):**
```python
def delete(self, request):
    """Удаление товара из корзины."""
    product_id = request.data.get('product_id')
    # ... код работает только с product_id
```

**Необходимо изменить на:**
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
    # Важно: используем select_related для всех связанных объектов
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

## Важные замечания

### 1. Использование `select_related()`
При загрузке элементов корзины после операций удаления/обновления **обязательно** использовать:
```python
cart.items.select_related('product', 'course', 'pet').all()
```
Это необходимо для корректной работы метода `to_dict()` модели `CartItem`, который обращается к связанным объектам `product`, `course` и `pet`.

### 2. Структура ответа
После удаления/обновления возвращайте структуру:
```python
{
    'message': '...',
    'cart': [...],  # массив всех элементов корзины
    'total': 0.0,  # общая сумма
    'items_count': 0  # общее количество элементов
}
```

### 3. Обработка курсов
- Курсы всегда имеют `quantity = 1`
- Нельзя изменить количество курса (только удалить)
- При попытке установить `quantity > 1` для курса возвращайте ошибку

### 4. Обработка товаров
- Товары могут иметь любое количество `quantity >= 1`
- При `quantity = 0` товар удаляется
- Проверяйте наличие товара на складе при обновлении количества

## Тестирование

После внесения изменений протестируйте следующие сценарии:

1. **Удаление товара:**
   ```bash
   DELETE /api/shop/cart/item/
   Body: {"product_id": 5}
   ```

2. **Удаление курса:**
   ```bash
   DELETE /api/shop/cart/item/
   Body: {"course_id": 10}
   ```

3. **Обновление количества товара:**
   ```bash
   PUT /api/shop/cart/item/
   Body: {"product_id": 5, "quantity": 3}
   ```

4. **Удаление товара через PUT (quantity=0):**
   ```bash
   PUT /api/shop/cart/item/
   Body: {"product_id": 5, "quantity": 0}
   ```

5. **Удаление курса через PUT (quantity=0):**
   ```bash
   PUT /api/shop/cart/item/
   Body: {"course_id": 10, "quantity": 0}
   ```

6. **Ошибки валидации:**
   - Запрос без `product_id` и `course_id` → 400
   - Запрос с обоими `product_id` и `course_id` → 400
   - Удаление несуществующего товара/курса → 404

## Файлы для изменения

1. `backend/apps/shop/serializers.py` - класс `CartItemUpdateSerializer`
2. `backend/apps/shop/views.py` - класс `CartItemView`, методы `put()` и `delete()`

## Приоритет

**Высокий** - без этих изменений пользователи не смогут удалять курсы из корзины, что критично для UX.

