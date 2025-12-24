# Изменения в бекенде для разделения товаров и курсов в корзине

## Текущее состояние

На данный момент фронтенд полностью функционален с существующим API. Разделение на блоки "Товары" и "Курсы" происходит только на клиенте, используя существующие эндпоинты.

## Рекомендуемые улучшения бекенда

### 1. Оптимизация: Получение только товаров или только курсов

**Текущий эндпоинт:**
```
GET /api/shop/cart/
```

**Предлагаемое улучшение:**
Добавить опциональные query-параметры для фильтрации:

```
GET /api/shop/cart/?type=products
GET /api/shop/cart/?type=courses
GET /api/shop/cart/?type=all  (по умолчанию)
```

**Реализация в `apps/shop/views.py`:**

```python
class CartView(APIView):
    """
    Корзина пользователя.
    
    GET  /api/shop/cart/ - просмотр корзины
    POST /api/shop/cart/ - добавление товара
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Получение корзины с опциональной фильтрацией по типу.
        
        Query параметры:
            type (str): 'products', 'courses', 'all' (по умолчанию)
        """
        cart = self._get_or_create_cart(request.user)
        items = cart.items.select_related('product', 'course', 'pet').order_by('id').all()
        
        # Фильтрация по типу
        filter_type = request.query_params.get('type', 'all')
        
        if filter_type == 'products':
            items = items.filter(product__isnull=False)
        elif filter_type == 'courses':
            items = items.filter(course__isnull=False)
        # Если 'all' или не указан - возвращаем все
        
        # Группировка
        products = [item for item in items if item.product]
        courses = [item for item in items if item.course]
        
        return Response({
            'products': [item.to_dict() for item in products],
            'courses': [item.to_dict() for item in courses],
            'totals': {
                'products': sum(item.get_total() for item in products),
                'courses': sum(item.get_total() for item in courses),
                'total': sum(item.get_total() for item in items)
            },
            'items_count': sum(item.quantity for item in items)
        }, status=status.HTTP_200_OK)
```

**Примеры запросов и ответов:**

**Запрос 1: Получить только товары**
```http
GET /api/shop/cart/?type=products
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "products": [
    {
      "id": 1,
      "product": {
        "id": 5,
        "name": "Корм для собак",
        "price": 1500,
        "discounted_price": 1350
      },
      "quantity": 2,
      "price": 2700
    }
  ],
  "courses": [],
  "totals": {
    "products": 2700,
    "courses": 0,
    "total": 2700
  },
  "items_count": 2
}
```

**Запрос 2: Получить только курсы**
```http
GET /api/shop/cart/?type=courses
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "products": [],
  "courses": [
    {
      "id": 2,
      "course": {
        "id": 10,
        "title": "Дрессировка щенка",
        "price": 5000
      },
      "quantity": 1,
      "disclaimer_accepted": true,
      "price": 5000,
      "pet": {
        "id": "uuid",
        "name": "Барсик",
        "species": "dog"
      }
    }
  ],
  "totals": {
    "products": 0,
    "courses": 5000,
    "total": 5000
  },
  "items_count": 1
}
```

---

### 2. Массовые операции: Выбор/снятие выбора товаров и курсов

**Текущее состояние:**
Выбор элементов происходит только на фронтенде. Если нужно сохранять выбор на бекенде (например, для восстановления после перезагрузки страницы), можно добавить поле `is_selected` в модель `CartItem`.

**Вариант A: Добавить поле в модель CartItem (рекомендуется для сохранения состояния)**

**Миграция:**
```python
# apps/shop/migrations/XXXX_add_is_selected_to_cartitem.py

from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('shop', 'XXXX_previous_migration'),
    ]

    operations = [
        migrations.AddField(
            model_name='cartitem',
            name='is_selected',
            field=models.BooleanField(
                default=True,
                verbose_name='Выбрано для оформления',
                help_text='Отмечает, выбран ли элемент для оформления заказа'
            ),
        ),
    ]
```

**Обновление модели:**
```python
# apps/shop/models.py

class CartItem(models.Model):
    # ... существующие поля ...
    
    is_selected = models.BooleanField(
        default=True,
        verbose_name='Выбрано для оформления',
        help_text='Отмечает, выбран ли элемент для оформления заказа'
    )
    
    def to_dict(self):
        """Сериализация для API."""
        if self.course:
            data = {
                'id': self.id,
                'course': self.course.to_dict(),
                'quantity': self.quantity,
                'disclaimer_accepted': self.disclaimer_accepted,
                'price': self.get_total(),
                'is_selected': self.is_selected  # Добавляем поле
            }
            if self.pet:
                data['pet'] = {
                    'id': str(self.pet.id),
                    'name': self.pet.name,
                    'species': self.pet.species
                }
            return data
        else:
            return {
                'id': self.id,
                'product': self.product.to_dict(),
                'quantity': self.quantity,
                'price': self.get_total(),
                'is_selected': self.is_selected  # Добавляем поле
            }
```

**Новый эндпоинт для массового выбора товаров:**
```python
# apps/shop/views.py

class CartItemSelectionView(APIView):
    """
    Массовое управление выбором элементов корзины.
    
    PUT /api/shop/cart/selection/
    """
    
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        """
        Массовое обновление выбора элементов корзины.
        
        Тело запроса:
        {
            "type": "products" | "courses" | "all",
            "is_selected": true | false
        }
        """
        serializer = CartItemSelectionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        filter_type = serializer.validated_data['type']
        is_selected = serializer.validated_data['is_selected']
        
        try:
            cart = Cart.objects.get(user=request.user)
            items = cart.items.all()
            
            # Фильтрация по типу
            if filter_type == 'products':
                items = items.filter(product__isnull=False)
            elif filter_type == 'courses':
                items = items.filter(course__isnull=False)
            # Если 'all' - обновляем все элементы
            
            # Массовое обновление
            updated_count = items.update(is_selected=is_selected)
            
            return Response({
                'message': f'Обновлено {updated_count} элементов',
                'type': filter_type,
                'is_selected': is_selected,
                'updated_count': updated_count
            }, status=status.HTTP_200_OK)
            
        except Cart.DoesNotExist:
            return Response(
                {'error': 'Корзина не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
```

**Сериализатор:**
```python
# apps/shop/serializers.py

class CartItemSelectionSerializer(serializers.Serializer):
    """
    Сериализатор для массового выбора элементов корзины.
    """
    
    type = serializers.ChoiceField(
        choices=['products', 'courses', 'all'],
        help_text="Тип элементов для выбора: 'products', 'courses' или 'all'"
    )
    is_selected = serializers.BooleanField(
        help_text="True для выбора, False для снятия выбора"
    )
```

**Добавление в urls.py:**
```python
# apps/shop/urls.py

urlpatterns = [
    # ... существующие маршруты ...
    
    # PUT /api/shop/cart/selection/ - массовое управление выбором
    path('cart/selection/', CartItemSelectionView.as_view(), name='cart-selection'),
]
```

**Примеры запросов:**

**Запрос 1: Выбрать все товары**
```http
PUT /api/shop/cart/selection/
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "products",
  "is_selected": true
}
```

**Ответ:**
```json
{
  "message": "Обновлено 3 элементов",
  "type": "products",
  "is_selected": true,
  "updated_count": 3
}
```

**Запрос 2: Снять выбор со всех курсов**
```http
PUT /api/shop/cart/selection/
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "courses",
  "is_selected": false
}
```

**Ответ:**
```json
{
  "message": "Обновлено 2 элементов",
  "type": "courses",
  "is_selected": false,
  "updated_count": 2
}
```

**Запрос 3: Выбрать все элементы (товары и курсы)**
```http
PUT /api/shop/cart/selection/
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "all",
  "is_selected": true
}
```

**Ответ:**
```json
{
  "message": "Обновлено 5 элементов",
  "type": "all",
  "is_selected": true,
  "updated_count": 5
}
```

---

### 3. Обновление эндпоинта оформления заказа для учета выбора

**Текущий эндпоинт:**
```
POST /api/shop/orders/
```

**Обновление для учета is_selected:**

```python
# apps/shop/views.py

class OrderCreateView(APIView):
    """
    Оформление заказа.
    
    POST /api/shop/orders/
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        shipping_address = serializer.validated_data['shipping_address']
        
        # Получение корзины
        try:
            cart = Cart.objects.prefetch_related('items__product').get(user=request.user)
        except Cart.DoesNotExist:
            return Response(
                {'error': 'Корзина пуста'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Фильтруем только выбранные элементы (если поле is_selected добавлено)
        cart_items = cart.items.filter(is_selected=True).all()
        
        # Или используем selected_items из запроса (если передаются ID)
        selected_items = serializer.validated_data.get('selected_items', [])
        if selected_items:
            cart_items = cart_items.filter(id__in=selected_items)
        
        if not cart_items:
            return Response(
                {'error': 'Не выбрано ни одного элемента для оформления'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ... остальная логика создания заказа ...
```

**Обновленный сериализатор:**
```python
# apps/shop/serializers.py

class OrderCreateSerializer(serializers.Serializer):
    """
    Сериализатор для создания заказа.
    """
    
    shipping_address = serializers.CharField(
        required=True,
        help_text="Адрес доставки"
    )
    selected_items = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Список ID элементов корзины для оформления (опционально)"
    )
    # ... остальные поля ...
```

**Пример запроса с выбором элементов:**
```http
POST /api/shop/orders/
Authorization: Bearer <token>
Content-Type: application/json

{
  "shipping_address": "Москва, ул. Ленина, д. 1, кв. 5",
  "selected_items": [1, 3, 5]
}
```

**Ответ:**
```json
{
  "message": "Заказ успешно оформлен",
  "order": {
    "id": "uuid",
    "items": [
      {
        "product_id": 5,
        "product_name": "Корм для собак",
        "quantity": 2,
        "total": 2700
      }
    ],
    "total_amount": 2700,
    "status": "pending",
    "created_at": "2024-01-16T14:20:00Z"
  }
}
```

---

### 4. Статистика по корзине (опционально)

**Новый эндпоинт для получения статистики:**
```python
# apps/shop/views.py

class CartStatsView(APIView):
    """
    Статистика корзины.
    
    GET /api/shop/cart/stats/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Возвращает статистику по корзине.
        """
        try:
            cart = Cart.objects.get(user=request.user)
            items = cart.items.select_related('product', 'course').all()
            
            products = [item for item in items if item.product]
            courses = [item for item in items if item.course]
            
            selected_products = [item for item in products if item.is_selected]
            selected_courses = [item for item in courses if item.is_selected]
            
            return Response({
                'total': {
                    'products_count': len(products),
                    'courses_count': len(courses),
                    'items_count': len(items),
                    'total_amount': float(cart.get_total())
                },
                'selected': {
                    'products_count': len(selected_products),
                    'courses_count': len(selected_courses),
                    'items_count': len(selected_products) + len(selected_courses),
                    'total_amount': sum(
                        item.get_total() 
                        for item in selected_products + selected_courses
                    )
                }
            }, status=status.HTTP_200_OK)
            
        except Cart.DoesNotExist:
            return Response({
                'total': {
                    'products_count': 0,
                    'courses_count': 0,
                    'items_count': 0,
                    'total_amount': 0
                },
                'selected': {
                    'products_count': 0,
                    'courses_count': 0,
                    'items_count': 0,
                    'total_amount': 0
                }
            }, status=status.HTTP_200_OK)
```

**Добавление в urls.py:**
```python
# apps/shop/urls.py

urlpatterns = [
    # ... существующие маршруты ...
    
    # GET /api/shop/cart/stats/ - статистика корзины
    path('cart/stats/', CartStatsView.as_view(), name='cart-stats'),
]
```

**Пример запроса:**
```http
GET /api/shop/cart/stats/
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "total": {
    "products_count": 3,
    "courses_count": 2,
    "items_count": 5,
    "total_amount": 12700
  },
  "selected": {
    "products_count": 2,
    "courses_count": 1,
    "items_count": 3,
    "total_amount": 7700
  }
}
```

---

## Резюме изменений

### Обязательные изменения (если нужно сохранять выбор на бекенде):

1. **Миграция:** Добавить поле `is_selected` в модель `CartItem`
2. **Модель:** Обновить метод `to_dict()` для включения `is_selected`
3. **View:** Добавить `CartItemSelectionView` для массового управления выбором
4. **Serializer:** Добавить `CartItemSelectionSerializer`
5. **URLs:** Добавить маршрут `/api/shop/cart/selection/`

### Опциональные улучшения:

1. **Фильтрация в GET /api/shop/cart/:** Добавить query-параметр `type`
2. **Статистика:** Добавить эндпоинт `/api/shop/cart/stats/`
3. **Обновление OrderCreateView:** Учитывать `is_selected` или `selected_items`

### Приоритет реализации:

1. **Высокий:** Добавление поля `is_selected` и эндпоинта для массового выбора (если нужно сохранять состояние на бекенде)
2. **Средний:** Фильтрация по типу в GET /api/shop/cart/
3. **Низкий:** Статистика корзины

---

## Примечания

- **Текущая реализация работает без изменений бекенда** - выбор происходит только на фронтенде
- Изменения в бекенде нужны только если требуется:
  - Сохранять выбор между сессиями
  - Оптимизировать запросы (получать только товары или только курсы)
  - Синхронизировать выбор между устройствами
- Все изменения обратно совместимы - существующий API продолжит работать

