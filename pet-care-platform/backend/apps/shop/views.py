"""
Views для модуля магазина кормов и товаров

Этот модуль предоставляет API эндпоинты для:
- Каталога товаров (публичный доступ)
- Управления корзиной (требует авторизации)
- Оформления заказов (требует авторизации)

Классы View:
    - ProductListView: Список товаров с фильтрацией
    - ProductDetailView: Детали конкретного товара
    - CartView: Просмотр и добавление в корзину
    - CartItemView: Обновление/удаление элементов корзины
    - OrderCreateView: Оформление заказа
    - OrderHistoryView: История заказов пользователя

Бизнес-логика:
    - Товары фильтруются по типу животного и типу продукта
    - Корзина привязана к пользователю
    - При оформлении заказа корзина очищается
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.data_store import data_store
from .serializers import (
    ProductSerializer,
    CartItemAddSerializer,
    CartItemUpdateSerializer,
    OrderCreateSerializer
)

logger = logging.getLogger('apps.shop')


class ProductListView(APIView):
    """
    API эндпоинт для каталога товаров.
    
    Публичный эндпоинт - не требует авторизации.
    Поддерживает фильтрацию по типу животного и типу товара.
    
    Эндпоинт: GET /api/shop/products/
    
    Query параметры:
        pet_type (str): Фильтр по животному - 'dog', 'cat'
        product_type (str): Фильтр по типу - 'dry_food', 'wet_food', 'treats'
    
    Успешный ответ (200 OK):
        {
            "products": [
                {
                    "id": 1,
                    "name": "Royal Canin Adult Dog",
                    "description": "...",
                    "price": 4500,
                    "image_url": "/images/products/1.jpg",
                    "pet_type": "dog",
                    "product_type": "dry_food",
                    "in_stock": true
                },
                ...
            ],
            "count": 15,
            "filters": {
                "pet_type": ["dog", "cat", "all"],
                "product_type": ["dry_food", "wet_food", "treats"]
            }
        }
    
    Примеры запросов:
        GET /api/shop/products/                          - все товары
        GET /api/shop/products/?pet_type=dog             - только для собак
        GET /api/shop/products/?product_type=dry_food    - только сухой корм
        GET /api/shop/products/?pet_type=cat&product_type=treats - лакомства для кошек
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        """
        Получение списка товаров с опциональной фильтрацией.
        
        Аргументы:
            request: DRF Request с query параметрами фильтров
            
        Возвращает:
            Response со списком товаров и метаданными фильтров
        """
        # Извлечение параметров фильтрации из query string
        pet_type = request.query_params.get('pet_type')
        product_type = request.query_params.get('product_type')
        
        # Получение товаров с применением фильтров
        products = data_store.get_all_products(
            pet_type=pet_type,
            product_type=product_type
        )
        
        # Сериализация списка товаров
        products_data = [p.to_dict() for p in products]
        
        logger.info(
            f"Каталог запрошен: pet_type={pet_type}, "
            f"product_type={product_type}, найдено={len(products_data)}"
        )
        
        return Response({
            'products': products_data,
            'count': len(products_data),
            'filters': {
                'pet_type': ['dog', 'cat', 'all'],
                'product_type': ['dry_food', 'wet_food', 'treats']
            }
        }, status=status.HTTP_200_OK)


class ProductDetailView(APIView):
    """
    API эндпоинт для получения деталей конкретного товара.
    
    Публичный эндпоинт - не требует авторизации.
    
    Эндпоинт: GET /api/shop/products/{id}/
    
    Параметры пути:
        id (int): ID товара
    
    Успешный ответ (200 OK):
        {
            "product": {
                "id": 1,
                "name": "Royal Canin Adult Dog",
                "description": "...",
                "price": 4500,
                ...
            }
        }
    
    Ответ с ошибкой (404 Not Found):
        {
            "error": "Товар не найден"
        }
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request, product_id):
        """
        Получение деталей конкретного товара.
        
        Аргументы:
            request: DRF Request
            product_id: ID товара из URL
            
        Возвращает:
            Response с данными товара или ошибкой 404
        """
        product = data_store.get_product_by_id(product_id)
        
        if not product:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'product': product.to_dict()
        }, status=status.HTTP_200_OK)


class CartView(APIView):
    """
    API эндпоинт для работы с корзиной пользователя.
    
    Требует авторизации. Поддерживает:
    - GET: Просмотр содержимого корзины
    - POST: Добавление товара в корзину
    
    Эндпоинты:
        GET  /api/shop/cart/  - Просмотр корзины
        POST /api/shop/cart/  - Добавление товара
    
    GET ответ (200 OK):
        {
            "cart": [
                {
                    "product": {...},
                    "quantity": 2
                },
                ...
            ],
            "total": 9000,
            "items_count": 2
        }
    
    POST запрос:
        {
            "product_id": 1,
            "quantity": 2  // опционально, по умолчанию 1
        }
    
    POST ответ (200 OK):
        {
            "message": "Товар добавлен в корзину",
            "cart": [...],
            "total": 9000
        }
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Получение содержимого корзины пользователя.
        
        Возвращает все товары в корзине с их деталями,
        общую сумму и количество позиций.
        
        Аргументы:
            request: DRF Request с аутентифицированным пользователем
            
        Возвращает:
            Response с содержимым корзины и итогами
        """
        user_id = request.user_id
        
        # Получение корзины с деталями товаров
        cart = data_store.get_cart(user_id)
        
        # Расчёт итогов
        total = sum(
            item['product']['price'] * item['quantity'] 
            for item in cart
        )
        items_count = sum(item['quantity'] for item in cart)
        
        return Response({
            'cart': cart,
            'total': total,
            'items_count': items_count
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        """
        Добавление товара в корзину.
        
        Если товар уже есть в корзине, увеличивает количество.
        
        Аргументы:
            request: DRF Request с product_id и quantity в теле
            
        Возвращает:
            Response с обновлённой корзиной или ошибкой валидации
        """
        serializer = CartItemAddSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.user_id
        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data.get('quantity', 1)
        
        # Попытка добавления в корзину
        success = data_store.add_to_cart(
            user_id=user_id,
            product_id=product_id,
            quantity=quantity
        )
        
        if not success:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Получение обновлённой корзины для ответа
        cart = data_store.get_cart(user_id)
        total = sum(
            item['product']['price'] * item['quantity'] 
            for item in cart
        )
        
        logger.info(
            f"Добавлено в корзину: user={user_id}, "
            f"product={product_id}, qty={quantity}"
        )
        
        return Response({
            'message': 'Товар добавлен в корзину',
            'cart': cart,
            'total': total
        }, status=status.HTTP_200_OK)


class CartItemView(APIView):
    """
    API эндпоинт для управления элементами корзины.
    
    Требует авторизации. Поддерживает:
    - PUT: Обновление количества товара в корзине
    - DELETE: Удаление товара из корзины
    
    Эндпоинты:
        PUT    /api/shop/cart/item/  - Обновить количество
        DELETE /api/shop/cart/item/  - Удалить товар
    
    PUT запрос:
        {
            "product_id": 1,
            "quantity": 3
        }
    
    DELETE запрос:
        {
            "product_id": 1
        }
    
    Примечание:
        При установке quantity=0 через PUT товар будет удалён из корзины.
    """
    
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        """
        Обновление количества товара в корзине.
        
        При quantity=0 товар удаляется из корзины.
        
        Аргументы:
            request: DRF Request с product_id и quantity в теле
            
        Возвращает:
            Response с обновлённой корзиной или ошибкой
        """
        serializer = CartItemUpdateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.user_id
        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']
        
        # Обновление количества в корзине
        success = data_store.update_cart_item(
            user_id=user_id,
            product_id=product_id,
            quantity=quantity
        )
        
        if not success:
            return Response(
                {'error': 'Товар не найден в корзине'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Получение обновлённой корзины
        cart = data_store.get_cart(user_id)
        total = sum(
            item['product']['price'] * item['quantity'] 
            for item in cart
        )
        
        logger.info(
            f"Корзина обновлена: user={user_id}, "
            f"product={product_id}, qty={quantity}"
        )
        
        return Response({
            'message': 'Корзина обновлена',
            'cart': cart,
            'total': total
        }, status=status.HTTP_200_OK)
    
    def delete(self, request):
        """
        Удаление товара из корзины.
        
        Аргументы:
            request: DRF Request с product_id в теле
            
        Возвращает:
            Response с обновлённой корзиной или ошибкой
        """
        product_id = request.data.get('product_id')
        
        if not product_id:
            return Response(
                {'error': 'Необходимо указать product_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.user_id
        
        # Удаление товара из корзины
        success = data_store.remove_from_cart(
            user_id=user_id,
            product_id=product_id
        )
        
        if not success:
            return Response(
                {'error': 'Товар не найден в корзине'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Получение обновлённой корзины
        cart = data_store.get_cart(user_id)
        total = sum(
            item['product']['price'] * item['quantity'] 
            for item in cart
        )
        
        logger.info(f"Удалено из корзины: user={user_id}, product={product_id}")
        
        return Response({
            'message': 'Товар удалён из корзины',
            'cart': cart,
            'total': total
        }, status=status.HTTP_200_OK)


class OrderCreateView(APIView):
    """
    API эндпоинт для оформления заказа.
    
    Создаёт заказ из содержимого корзины пользователя.
    После успешного оформления корзина очищается.
    
    Эндпоинт: POST /api/shop/orders/
    
    Требуемые заголовки:
        Authorization: Bearer <access_token>
    
    Тело запроса:
        {
            "shipping_address": "Москва, ул. Ленина, д. 1, кв. 5"
        }
    
    Успешный ответ (201 Created):
        {
            "message": "Заказ успешно оформлен",
            "order": {
                "id": 1,
                "user_id": 1,
                "items": [
                    {
                        "product_id": 1,
                        "product_name": "Royal Canin Adult Dog",
                        "quantity": 2,
                        "price": 4500,
                        "total": 9000
                    }
                ],
                "total_amount": 9000,
                "shipping_address": "...",
                "status": "pending",
                "created_at": "..."
            }
        }
    
    Ответы с ошибками:
        400 Bad Request - Корзина пуста или не указан адрес
        401 Unauthorized - Требуется авторизация
    
    Бизнес-логика:
        1. Проверка наличия товаров в корзине
        2. Создание заказа со снимком цен на момент оформления
        3. Очистка корзины
        4. Возврат данных заказа
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Оформление заказа из корзины.
        
        Аргументы:
            request: DRF Request с адресом доставки в теле
            
        Возвращает:
            Response с данными заказа или ошибкой
        """
        serializer = OrderCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.user_id
        shipping_address = serializer.validated_data['shipping_address']
        
        # Проверка наличия товаров в корзине
        cart = data_store.get_cart(user_id)
        if not cart:
            return Response(
                {'error': 'Корзина пуста. Добавьте товары перед оформлением заказа.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создание заказа
        order = data_store.create_order(
            user_id=user_id,
            shipping_address=shipping_address
        )
        
        if not order:
            return Response(
                {'error': 'Не удалось оформить заказ'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        logger.info(
            f"Заказ оформлен: id={order.id}, user={user_id}, "
            f"total={order.total_amount}"
        )
        
        return Response({
            'message': 'Заказ успешно оформлен',
            'order': order.to_dict()
        }, status=status.HTTP_201_CREATED)


class OrderHistoryView(APIView):
    """
    API эндпоинт для истории заказов пользователя.
    
    Возвращает список всех заказов текущего пользователя,
    отсортированных от новых к старым.
    
    Эндпоинт: GET /api/shop/orders/history/
    
    Требуемые заголовки:
        Authorization: Bearer <access_token>
    
    Успешный ответ (200 OK):
        {
            "orders": [
                {
                    "id": 2,
                    "items": [...],
                    "total_amount": 5000,
                    "status": "pending",
                    "created_at": "..."
                },
                {
                    "id": 1,
                    "items": [...],
                    "total_amount": 9000,
                    "status": "delivered",
                    "created_at": "..."
                }
            ],
            "count": 2
        }
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Получение истории заказов пользователя.
        
        Аргументы:
            request: DRF Request с аутентифицированным пользователем
            
        Возвращает:
            Response со списком заказов
        """
        user_id = request.user_id
        
        # Получение заказов пользователя
        orders = data_store.get_user_orders(user_id)
        orders_data = [order.to_dict() for order in orders]
        
        return Response({
            'orders': orders_data,
            'count': len(orders_data)
        }, status=status.HTTP_200_OK)
