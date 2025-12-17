"""
Views для магазина кормов и товаров

API для каталога, корзины и заказов.
"""

import logging
from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import Product, Cart, CartItem, Order, OrderItem
from .serializers import (
    CartItemAddSerializer,
    CartItemUpdateSerializer,
    OrderCreateSerializer
)

logger = logging.getLogger('apps.shop')


class ProductListView(APIView):
    """
    Каталог товаров с фильтрацией.
    
    GET /api/shop/products/
    
    Параметры:
        animal: dog | cat
        pet_id: ID питомца пользователя (для персональной подборки)
        category: food | pharmacy | ammunition | care | transport | toys
        subcategory: dry, wet, canned, pouch, pate, holistic, diet, hypoallergenic и др.
        vendor: бренд
        min_price: минимальная цена
        max_price: максимальная цена
        in_stock: true | false
        search: поиск по названию
        page: номер страницы (по умолчанию 1)
        per_page: товаров на странице (по умолчанию 20, макс 100)
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        # Базовый queryset - все товары с ценой > 0
        products = Product.objects.filter(price__gt=0)
        
        # Фильтр по питомцу (персональная подборка)
        pet_id = request.query_params.get('pet_id')
        animal = request.query_params.get('animal')
        
        # Если указан pet_id, получаем вид питомца и фильтруем по нему
        if pet_id and request.user.is_authenticated:
            try:
                from apps.pets.models import Pet
                pet = Pet.objects.get(id=pet_id, owner=request.user)
                # Маппинг видов питомцев на типы животных в товарах
                species_to_animal = {
                    'dog': 'dog',
                    'cat': 'cat',
                }
                if pet.species in species_to_animal:
                    animal = species_to_animal[pet.species]
            except (Pet.DoesNotExist, ValueError):
                pass
        
        # Фильтр по животному
        if animal and animal in ['dog', 'cat']:
            products = products.filter(animal=animal)
        
        # Фильтр по категории
        category = request.query_params.get('category')
        if category:
            products = products.filter(category=category)
        
        # Фильтр по подкатегории
        subcategory = request.query_params.get('subcategory')
        if subcategory:
            products = products.filter(subcategory=subcategory)
        
        # Фильтр по бренду
        vendor = request.query_params.get('vendor')
        if vendor:
            products = products.filter(vendor__icontains=vendor)
        
        # Фильтр по цене
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        if min_price:
            try:
                products = products.filter(price__gte=float(min_price))
            except ValueError:
                pass
        if max_price:
            try:
                products = products.filter(price__lte=float(max_price))
            except ValueError:
                pass
        
        # Фильтр по наличию
        in_stock = request.query_params.get('in_stock')
        if in_stock == 'true':
            products = products.filter(in_stock=True)
        
        # Поиск по названию
        search = request.query_params.get('search')
        if search:
            products = products.filter(name__icontains=search)
        
        # Общее количество до пагинации
        total_count = products.count()
        
        # Пагинация
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            per_page = min(100, max(1, int(request.query_params.get('per_page', 20))))
        except ValueError:
            page = 1
            per_page = 20
        
        offset = (page - 1) * per_page
        products = products[offset:offset + per_page]
        
        products_data = [p.to_dict() for p in products]
        
        # Получение доступных фильтров
        from django.db.models import Count, Min, Max
        
        # Подкатегории для текущих фильтров
        filter_query = Product.objects.filter(price__gt=0)
        if animal:
            filter_query = filter_query.filter(animal=animal)
        if category:
            filter_query = filter_query.filter(category=category)
        
        subcategories = list(
            filter_query.values('subcategory')
            .annotate(count=Count('id'))
            .filter(subcategory__isnull=False)
            .order_by('subcategory')
        )
        
        # Бренды
        vendors = list(
            filter_query.values('vendor')
            .annotate(count=Count('id'))
            .filter(vendor__isnull=False)
            .order_by('-count')[:50]
        )
        
        # Диапазон цен
        price_range = filter_query.aggregate(
            min_price=Min('price'),
            max_price=Max('price')
        )
        
        # Получение питомцев пользователя для персональных подборок
        user_pets = []
        if request.user.is_authenticated:
            try:
                from apps.pets.models import Pet
                pets = Pet.objects.filter(owner=request.user)
                user_pets = [
                    {
                        'id': str(pet.id),
                        'name': pet.name,
                        'species': pet.species,
                        'species_label': pet.get_species_display(),
                    }
                    for pet in pets
                ]
            except Exception:
                pass
        
        return Response({
            'products': products_data,
            'pagination': {
                'total': total_count,
                'page': page,
                'per_page': per_page,
                'total_pages': (total_count + per_page - 1) // per_page
            },
            'filters': {
                'animals': [
                    {'value': 'dog', 'label': 'Для собак'},
                    {'value': 'cat', 'label': 'Для кошек'},
                ],
                'categories': [
                    {'value': 'food', 'label': 'Корм'},
                    {'value': 'pharmacy', 'label': 'Ветаптека'},
                    {'value': 'ammunition', 'label': 'Амуниция'},
                    {'value': 'care', 'label': 'Средства по уходу'},
                    {'value': 'transport', 'label': 'Транспортировка'},
                    {'value': 'toys', 'label': 'Игрушки'},
                ],
                'subcategories': subcategories,
                'vendors': vendors,
                'price_range': {
                    'min': float(price_range['min_price']) if price_range['min_price'] else 0,
                    'max': float(price_range['max_price']) if price_range['max_price'] else 0,
                },
                'user_pets': user_pets,  # Питомцы пользователя для персональных подборок
            }
        }, status=status.HTTP_200_OK)


class ProductDetailView(APIView):
    """
    Детали товара.
    
    GET /api/shop/products/{id}/
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({'product': product.to_dict()}, status=status.HTTP_200_OK)


class CartView(APIView):
    """
    Корзина пользователя.
    
    GET  /api/shop/cart/ - просмотр корзины
    POST /api/shop/cart/ - добавление товара
    """
    
    permission_classes = [IsAuthenticated]
    
    def _get_or_create_cart(self, user):
        """Получение или создание корзины."""
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart
    
    def get(self, request):
        """Просмотр корзины."""
        cart = self._get_or_create_cart(request.user)
        
        items = [item.to_dict() for item in cart.items.select_related('product').all()]
        total = float(cart.get_total())
        items_count = cart.get_items_count()
        
        return Response({
            'cart': items,
            'total': total,
            'items_count': items_count
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Добавление товара в корзину."""
        serializer = CartItemAddSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data.get('quantity', 1)
        
        # Проверка существования товара
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        cart = self._get_or_create_cart(request.user)
        
        # Добавление или обновление количества
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity}
        )
        
        if not created:
            cart_item.quantity += quantity
            cart_item.save()
        
        # Возврат обновлённой корзины
        items = [item.to_dict() for item in cart.items.select_related('product').all()]
        total = float(cart.get_total())
        
        return Response({
            'message': 'Товар добавлен в корзину',
            'cart': items,
            'total': total
        }, status=status.HTTP_200_OK)


class CartItemView(APIView):
    """
    Управление элементами корзины.
    
    PUT    /api/shop/cart/item/ - обновление количества
    DELETE /api/shop/cart/item/ - удаление товара
    """
    
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        """Обновление количества товара."""
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
            cart_item = CartItem.objects.get(cart=cart, product_id=product_id)
        except (Cart.DoesNotExist, CartItem.DoesNotExist):
            return Response(
                {'error': 'Товар не найден в корзине'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if quantity <= 0:
            cart_item.delete()
        else:
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
        
        cart_items = cart.items.all()
        if not cart_items:
            return Response(
                {'error': 'Корзина пуста. Добавьте товары перед оформлением заказа.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создание заказа в транзакции
        with transaction.atomic():
            total_amount = cart.get_total()
            
            order = Order.objects.create(
                user=request.user,
                total_amount=total_amount,
                shipping_address=shipping_address
            )
            
            # Создание элементов заказа
            for item in cart_items:
                OrderItem.objects.create(
                    order=order,
                    product=item.product,
                    product_name=item.product.name,
                    price=item.product.price,
                    quantity=item.quantity
                )
            
            # Очистка корзины
            cart_items.delete()
        
        logger.info(f"Заказ создан: {order.id}, user={request.user.email}")
        
        return Response({
            'message': 'Заказ успешно оформлен',
            'order': order.to_dict()
        }, status=status.HTTP_201_CREATED)


class OrderHistoryView(APIView):
    """
    История заказов.
    
    GET /api/shop/orders/history/
    
    Автоматически отменяет неоплаченные заказы старше 10 минут.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone
        
        # Отмена неоплаченных заказов старше 10 минут
        ten_minutes_ago = timezone.now() - timedelta(minutes=10)
        expired_orders = Order.objects.filter(
            user=request.user,
            status='pending',
            created_at__lt=ten_minutes_ago
        )
        
        if expired_orders.exists():
            expired_orders.update(status='cancelled')
            logger.info(f"Отменено {expired_orders.count()} неоплаченных заказов пользователя {request.user.email}")
        
        orders = Order.objects.filter(user=request.user).prefetch_related('items')
        orders_data = [order.to_dict() for order in orders]
        
        return Response({
            'orders': orders_data,
            'count': len(orders_data)
        }, status=status.HTTP_200_OK)
