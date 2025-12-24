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

from apps.payments.models import Payment
from apps.training.models import UserCourse

from .models import Product, Cart, CartItem, Order, OrderItem, Address, Reservation
from .serializers import (
    CartItemAddSerializer,
    CartItemUpdateSerializer,
    CartItemSerializer,
    OrderCreateSerializer,
    UnifiedOrderSerializer
)
from .services.reservation_service import ReservationService

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
        # Базовый queryset - все товары с ценой > 0 и положительным количеством на складе
        products = Product.objects.filter(price__gt=0, stock_count__gt=0)
        
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
        
        # Фильтр по скидкам
        has_discount = request.query_params.get('has_discount')
        if has_discount == 'true':
            products = products.filter(discount_percent__gt=0)
        
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
        
        # Подкатегории для текущих фильтров (только товары в наличии)
        filter_query = Product.objects.filter(price__gt=0, stock_count__gt=0)
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
        """Просмотр корзины с группировкой по типам."""
        cart = self._get_or_create_cart(request.user)

        items = cart.items.select_related('product', 'course', 'pet').all()

        # Группировка
        products = [item for item in items if item.product]
        courses = [item for item in items if item.course]

        return Response({
            'products': CartItemSerializer(products, many=True).data,
            'courses': CartItemSerializer(courses, many=True).data,
            'totals': {
                'products': sum(p.get_total() for p in products),
                'courses': sum(c.get_total() for c in courses),
                'total': cart.get_total()
            },
            'items_count': len(products) + len(courses),
            'can_checkout': len(products) + len(courses) > 0
        }, status=status.HTTP_200_OK)
    
    
    def post(self, request):
        """Добавление товара или курса в корзину с валидацией."""
        serializer = CartItemAddSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        cart = self._get_or_create_cart(request.user)

        # Обработка товара
        if 'product_id' in serializer.validated_data:
            return self._add_product_to_cart(cart, serializer.validated_data)

        # Обработка курса
        elif 'course_id' in serializer.validated_data:
            return self._add_course_to_cart(request.user, cart, serializer.validated_data)

        return Response(
            {'error': 'Необходимо указать product_id или course_id'},
            status=status.HTTP_400_BAD_REQUEST
        )

    def _add_product_to_cart(self, cart, data):
        """Добавление товара в корзину."""
        product_id = data['product_id']
        quantity = data.get('quantity', 1)

        # Проверка существования товара
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка наличия на складе
        if product.stock_count <= 0:
            return Response(
                {'error': 'Товар закончился на складе'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверка текущего количества в корзине
        existing_item = CartItem.objects.filter(cart=cart, product=product).first()
        current_quantity = existing_item.quantity if existing_item else 0
        new_total_quantity = current_quantity + quantity

        # Проверка, что запрашиваемое количество доступно
        if new_total_quantity > product.stock_count:
            return Response({
                'error': f'Недостаточно товара на складе. Доступно: {product.stock_count} шт., в корзине уже: {current_quantity} шт.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Добавление или обновление количества
        if existing_item:
            existing_item.quantity = new_total_quantity
            existing_item.save()
        else:
            CartItem.objects.create(cart=cart, product=product, quantity=quantity)

        # Возврат обновлённой корзины
        cart_serializer = CartItemSerializer(cart.items.select_related('product', 'course', 'pet').all(), many=True)
        total = float(cart.get_total())
        items_count = cart.get_items_count()

        return Response({
            'message': 'Товар добавлен в корзину',
            'cart': cart_serializer.data,
            'total': total,
            'items_count': items_count
        }, status=status.HTTP_200_OK)

    def _add_course_to_cart(self, user, cart, data):
        """Добавление курса в корзину."""
        course_id = data['course_id']
        pet_id = data.get('pet_id')
        disclaimer_accepted = data.get('disclaimer_accepted', False)

        # Проверка существования курса
        try:
            from apps.training.models import Course
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден или недоступен'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка питомца если указан
        pet = None
        if pet_id:
            try:
                from apps.pets.models import Pet
                pet = Pet.objects.get(id=pet_id, owner=user)
            except Pet.DoesNotExist:
                return Response(
                    {'error': 'Питомец не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Проверка совместимости типа курса и вида питомца
            if course.pet_type != 'all' and course.pet_type != pet.species:
                course_type_display = course.get_pet_type_display_name()
                pet_species_display = pet.get_species_display()
                return Response({
                    'error': f'Этот курс предназначен для {course_type_display}, а ваш питомец - {pet_species_display}'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Примечание: согласие с условиями (disclaimer_accepted) проверяется при оформлении заказа,
        # а не при добавлении в корзину, чтобы пользователь мог добавить курс и прочитать условия позже

        # Проверка, что курс не добавлен в корзину
        existing_item = CartItem.objects.filter(
            cart=cart,
            course=course,
            pet=pet
        ).first()

        if existing_item:
            return Response({
                'error': 'Этот курс уже добавлен в корзину'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Создание элемента корзины для курса
        CartItem.objects.create(
            cart=cart,
            course=course,
            pet=pet,
            quantity=1,  # Курсы всегда quantity=1
            disclaimer_accepted=disclaimer_accepted
        )

        # Возврат обновлённой корзины
        cart_serializer = CartItemSerializer(cart.items.select_related('product', 'course', 'pet').all(), many=True)
        total = float(cart.get_total())
        items_count = cart.get_items_count()

        return Response({
            'message': 'Курс добавлен в корзину',
            'cart': cart_serializer.data,
            'total': total,
            'items_count': items_count
        }, status=status.HTTP_200_OK)


class CartItemView(APIView):
    """
    Управление элементами корзины.
    
    PUT    /api/shop/cart/item/ - обновление количества товара или удаление курса
    DELETE /api/shop/cart/item/ - удаление товара или курса
    """
    
    permission_classes = [IsAuthenticated]
    
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
        
        # Определяем тип элемента для сообщений об ошибках
        item_type = 'товар' if product_id else 'курс'
        
        try:
            cart = Cart.objects.get(user=request.user)
            
            if product_id:
                # Удаление товара
                cart_item = CartItem.objects.select_related('product').get(
                    cart=cart, 
                    product_id=product_id
                )
            elif course_id:
                # Удаление курса
                # Используем .filter().first() для обработки случаев с привязкой к питомцу
                cart_item = CartItem.objects.select_related('course', 'pet').filter(
                    cart=cart,
                    course_id=course_id
                ).first()
                
                if not cart_item:
                    return Response(
                        {'error': 'Курс не найден в корзине'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
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


class CartRefreshView(APIView):
    """
    Обновление корзины (для фронтенда).
    
    GET /api/shop/cart/refresh/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Обновление корзины - возвращает актуальное состояние."""
        cart, _ = Cart.objects.get_or_create(user=request.user)
        
        items = [item.to_dict() for item in cart.items.select_related('product').all()]
        total = float(cart.get_total())
        items_count = cart.get_items_count()
        
        return Response({
            'cart': items,
            'total': total,
            'items_count': items_count
        }, status=status.HTTP_200_OK)


class OrderCheckoutView(APIView):
    """
    Страница оформления заказа с детальной информацией.
    
    GET /api/shop/checkout/
    Возвращает детальную информацию о составе заказа и ценах.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Получение информации для оформления заказа."""
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
        
        # Детальная информация о товарах
        items_detail = []
        for item in cart_items:
            product = item.product
            items_detail.append({
                'product_id': product.id,
                'product_name': product.name,
                'product_image': product.main_image,
                'vendor': product.vendor,
                'price': float(product.price),
                'quantity': item.quantity,
                'item_total': float(item.get_total()),
                'weight': float(product.weight) if product.weight else None,
            })
        
        subtotal = float(cart.get_total())
        
        # Получение адресов пользователя
        user_addresses = Address.objects.filter(user=request.user).order_by('-is_default', '-created_at')
        addresses = [addr.to_dict() for addr in user_addresses]
        
        # Варианты доставки
        delivery_options = [
            {
                'type': 'standard',
                'name': 'Стандартная доставка',
                'cost': 300.0,
                'days': '3-5 дней',
                'description': 'Доставка в пункт выдачи или курьером'
            },
            {
                'type': 'express',
                'name': 'Экспресс доставка',
                'cost': 600.0,
                'days': '1-2 дня',
                'description': 'Быстрая доставка курьером'
            },
            {
                'type': 'pickup',
                'name': 'Самовывоз',
                'cost': 0.0,
                'days': 'Сегодня',
                'description': 'Самовывоз из магазина'
            }
        ]
        
        return Response({
            'items': items_detail,
            'subtotal': subtotal,
            'delivery_options': delivery_options,
            'addresses': addresses,
            'summary': {
                'items_count': len(items_detail),
                'subtotal': subtotal,
            }
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
        
        # Получение дополнительных данных
        address_id = serializer.validated_data.get('address_id')
        delivery_type = serializer.validated_data.get('delivery_type', 'standard')
        delivery_cost = serializer.validated_data.get('delivery_cost', 0)
        recipient_name = serializer.validated_data.get('recipient_name')
        recipient_phone = serializer.validated_data.get('recipient_phone')
        
        # Получение объекта адреса если указан
        address_obj = None
        if address_id:
            try:
                address_obj = Address.objects.get(id=address_id, user=request.user)
                if not shipping_address:
                    shipping_address = address_obj.get_full_address()
            except Address.DoesNotExist:
                pass
        
        # Создание заказа в транзакции с блокировкой товаров
        with transaction.atomic():
            # Блокируем товары для обновления (предотвращение race condition)
            product_ids = [item.product_id for item in cart_items]
            products = {p.id: p for p in Product.objects.select_for_update().filter(id__in=product_ids)}
            
            # Валидация наличия всех товаров
            unavailable_items = []
            insufficient_items = []
            
            for item in cart_items:
                product = products.get(item.product_id)
                if not product:
                    unavailable_items.append(item.product.name if item.product else f'ID {item.product_id}')
                elif product.stock_count < item.quantity:
                    insufficient_items.append({
                        'name': product.name,
                        'requested': item.quantity,
                        'available': product.stock_count
                    })
            
            # Возврат ошибок валидации
            if unavailable_items:
                return Response({
                    'error': 'Некоторые товары больше недоступны',
                    'unavailable_items': unavailable_items
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if insufficient_items:
                return Response({
                    'error': 'Недостаточно товаров на складе',
                    'insufficient_items': insufficient_items
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Расчёт суммы с учётом актуальных цен и скидок
            subtotal = 0
            for item in cart_items:
                product = products[item.product_id]
                # Используем цену со скидкой
                item_price = product.discounted_price
                subtotal += item_price * item.quantity
            
            total_amount = subtotal + delivery_cost
            
            order = Order.objects.create(
                user=request.user,
                subtotal_amount=subtotal,
                delivery_cost=delivery_cost,
                total_amount=total_amount,
                shipping_address=shipping_address,
                address=address_obj,
                delivery_type=delivery_type,
                recipient_name=recipient_name or request.user.first_name,
                recipient_phone=recipient_phone or request.user.phone,
            )
            
            # Создание элементов заказа и уменьшение остатков
            for item in cart_items:
                if item.product:
                    # Обработка товара
                    product = products[item.product_id]
                    # Сохраняем цену со скидкой
                    item_price = product.discounted_price

                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        product_name=product.name,
                        price=item_price,
                        quantity=item.quantity
                    )

                    # Уменьшаем количество на складе
                    product.stock_count -= item.quantity
                    if product.stock_count <= 0:
                        product.in_stock = False
                    product.save(update_fields=['stock_count', 'in_stock'])

                elif item.course:
                    # Обработка курса - создаем OrderItem
                    OrderItem.objects.create(
                        order=order,
                        course=item.course,
                        pet=item.pet,
                        product_name=item.course.title,
                        price=float(item.course.price),
                        quantity=1,  # Курсы всегда quantity=1
                        disclaimer_accepted=item.disclaimer_accepted
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


class OrderConfirmPaymentView(APIView):
    """
    Подтверждение оплаты заказа через единую систему платежей.

    POST /api/shop/orders/{order_id}/confirm-payment/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Заказ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка статуса заказа
        if order.status != 'pending':
            status_display = dict(Order.STATUS_CHOICES).get(order.status, order.status)
            return Response(
                {'error': f'Заказ уже обработан. Текущий статус: {status_display}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Создание платежа через единую систему
        from apps.payments.services import PaymentService

        try:
            payment = PaymentService.create_payment(
                user=request.user,
                payment_type='shop_order',
                object_id=str(order.id),
                amount=order.total_amount,
                payment_method='card',  # Можно передать в request.data
                metadata={'order_id': str(order.id)}
            )

            # Обработка платежа (имитация)
            success = PaymentService.process_payment(payment)

            if success:
                # Обновляем статус заказа
                order.status = 'processing'
                order.save(update_fields=['status'])

                # Для каждого курса в заказе создаем UserCourse
                for item in order.items.filter(course__isnull=False):
                    # Проверяем согласие с условиями для платных курсов
                    if item.course.price > 0 and not item.disclaimer_accepted:
                        logger.warning(f"Курс {item.course.title} не имеет согласия с условиями при активации")
                        continue  # Пропускаем курс без согласия

                    from apps.training.models import UserCourse
                    UserCourse.objects.create(
                        user=request.user,
                        course=item.course,
                        pet=item.pet,
                        purchased_at=order.created_at
                    )

                return Response({
                    'message': 'Оплата успешно подтверждена',
                    'order': order.to_dict(),
                    'payment_id': str(payment.id)
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Не удалось обработать платеж'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AddressListView(APIView):
    """
    Список адресов пользователя.
    
    GET  /api/shop/addresses/ - список адресов
    POST /api/shop/addresses/ - создание адреса
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Получение списка адресов пользователя."""
        addresses = Address.objects.filter(user=request.user).order_by('-is_default', '-created_at')
        return Response({
            'addresses': [addr.to_dict() for addr in addresses]
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Создание нового адреса."""
        from .serializers import AddressCreateSerializer
        
        serializer = AddressCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Если это первый адрес или указано is_default=True, делаем его адресом по умолчанию
        is_default = serializer.validated_data.get('is_default', False)
        if is_default or not Address.objects.filter(user=request.user).exists():
            Address.objects.filter(user=request.user).update(is_default=False)
            is_default = True
        
        address = Address.objects.create(
            user=request.user,
            country=serializer.validated_data.get('country', 'Россия'),
            city=serializer.validated_data['city'],
            street=serializer.validated_data['street'],
            house=serializer.validated_data['house'],
            building=serializer.validated_data.get('building'),
            apartment=serializer.validated_data.get('apartment'),
            postal_code=serializer.validated_data.get('postal_code'),
            comment=serializer.validated_data.get('comment'),
            is_default=is_default,
            latitude=serializer.validated_data.get('latitude'),
            longitude=serializer.validated_data.get('longitude'),
        )
        
        return Response({
            'message': 'Адрес успешно создан',
            'address': address.to_dict()
        }, status=status.HTTP_201_CREATED)


class AddressSearchView(APIView):
    """
    Поиск адресов (заглушка для геокодинга).
    
    GET /api/shop/addresses/search/?query=Москва, Тверская
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Поиск адресов через внешний сервис (заглушка)."""
        query = request.query_params.get('query', '').strip()
        
        if not query or len(query) < 3:
            return Response(
                {'error': 'Минимум 3 символа для поиска'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Заглушка - в реальности здесь будет интеграция с Яндекс.Картами или DaData
        # Пока возвращаем примеры
        suggestions = [
            {
                'value': f"{query}, ул. Ленина, д. 1",
                'city': query.split(',')[0] if ',' in query else query,
                'street': 'ул. Ленина',
                'house': '1',
                'full_address': f"{query}, ул. Ленина, д. 1",
                'latitude': 55.7558,
                'longitude': 37.6173,
            }
        ]
        
        return Response({
            'suggestions': suggestions,
            'query': query
        }, status=status.HTTP_200_OK)


class UnifiedCheckoutView(APIView):
    """
    Единый checkout для товаров и курсов.

    GET /api/checkout/ - получить данные для оформления
    POST /api/checkout/ - создать заказ и начать оплату
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Получить данные для единого оформления заказа."""
        try:
            cart = Cart.objects.prefetch_related(
                'items__product',
                'items__course',
                'items__pet'
            ).get(user=request.user)
        except Cart.DoesNotExist:
            return Response({'error': 'Корзина пуста'}, status=status.HTTP_400_BAD_REQUEST)

        # Разделить на товары и курсы
        product_items = []
        course_items = []

        for item in cart.items.all():
            if item.product:
                product_items.append({
                    'id': item.id,
                    'product': item.product.to_dict(),
                    'quantity': item.quantity,
                    'price': float(item.product.discounted_price),
                    'total': float(item.get_total())
                })
            elif item.course:
                course_items.append({
                    'id': item.id,
                    'course': item.course.to_dict(),
                    'pet': item.pet.to_dict() if item.pet else None,
                    'quantity': 1,
                    'price': float(item.course.price),
                    'total': float(item.get_total())
                })

        # Подсчитать суммы
        products_total = sum(item['total'] for item in product_items)
        courses_total = sum(item['total'] for item in course_items)
        delivery_options = [] if not product_items else [
            {'type': 'standard', 'cost': 300, 'name': 'Стандартная доставка'},
            {'type': 'express', 'cost': 600, 'name': 'Экспресс доставка'},
            {'type': 'pickup', 'cost': 0, 'name': 'Самовывоз'}
        ]

        # Получить адреса пользователя
        addresses = Address.objects.filter(user=request.user).order_by('-is_default')

        return Response({
            'products': {
                'items': product_items,
                'subtotal': products_total,
                'delivery_options': delivery_options
            },
            'courses': {
                'items': course_items,
                'subtotal': courses_total
            },
            'addresses': [addr.to_dict() for addr in addresses],
            'totals': {
                'products': products_total,
                'courses': courses_total,
                'delivery': 0,  # Рассчитывается динамически
                'grand_total': products_total + courses_total
            }
        })

    def post(self, request):
        """Создать единый заказ и начать оплату."""
        serializer = UnifiedOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            cart = Cart.objects.get(user=request.user)

            # Создать резервирования
            reservations = ReservationService.create_reservations_from_cart(cart)

            # Создать заказы
            orders_data = self._create_orders_from_cart(
                cart,
                serializer.validated_data,
                reservations
            )

            # Создать единый платёж
            payment = self._create_unified_payment(orders_data)

            return Response({
                'reservation_id': str(reservations[0].id) if reservations else None,
                'orders': orders_data,
                'payment': {
                    'id': payment.id,
                    'amount': float(payment.amount),
                    'url': f"https://payment.gateway/pay/{payment.id}"
                }
            })

        except Exception as e:
            # При ошибке отменить резервирования
            if 'reservations' in locals():
                ReservationService.cancel_reservations(reservations)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _create_orders_from_cart(self, cart, data, reservations):
        """Создать заказы товаров и записи на курсы."""
        orders_data = {'products_order': None, 'courses': []}

        # Создать заказ товаров если есть
        product_reservations = [r for r in reservations if r.reservation_type == 'product']
        order = None
        if product_reservations:
            order = Order.objects.create(
                user=cart.user,
                delivery_type=data['delivery_type'],
                address_id=data.get('address_id'),
                shipping_address=data.get('shipping_address'),
                total_amount=0  # Рассчитается ниже
            )

            # Добавить элементы заказа для товаров
            for reservation in product_reservations:
                cart_item = cart.items.get(product_id=reservation.object_id)
                OrderItem.objects.create(
                    order=order,
                    product_id=reservation.object_id,
                    product_name=cart_item.product.name,
                    price=cart_item.product.discounted_price,
                    quantity=reservation.quantity
                )

            # Рассчитать итоговую сумму для товаров
            order.subtotal_amount = order.get_subtotal()
            order.delivery_cost = self._calculate_delivery_cost(data['delivery_type'])
            order.total_amount = order.get_total_with_delivery()
            order.save()

            orders_data['products_order'] = order.to_dict()

        # Создать записи на курсы
        course_reservations = [r for r in reservations if r.reservation_type == 'course']
        for reservation in course_reservations:
            cart_item = cart.items.get(course_id=reservation.object_id)

            # Если есть заказ товаров, добавляем курс как OrderItem к этому заказу
            if order:
                OrderItem.objects.create(
                    order=order,
                    course=cart_item.course,
                    pet=cart_item.pet,
                    product_name=cart_item.course.title,
                    price=float(cart_item.course.price),
                    quantity=1,
                    disclaimer_accepted=cart_item.disclaimer_accepted
                )
                # Обновляем сумму заказа с учетом курса
                order.total_amount += float(cart_item.course.price)
                order.save()
                orders_data['products_order'] = order.to_dict()

            user_course = UserCourse.objects.create(
                user=cart.user,
                course_id=reservation.object_id,
                pet_id=reservation.pet_id
            )

            orders_data['courses'].append({
                'user_course_id': user_course.id,
                'course_name': cart_item.course.title,
                'amount': float(cart_item.course.price)
            })

        return orders_data

    def _create_unified_payment(self, orders_data):
        """Создать единый платёж для всех заказов."""
        total_amount = 0

        if orders_data['products_order']:
            total_amount += orders_data['products_order']['total_amount']

        total_amount += sum(course['amount'] for course in orders_data['courses'])

        # Создать единый платёж
        payment = Payment.objects.create(
            user=self.request.user,
            payment_type='unified_checkout',
            amount=total_amount,
            metadata={
                'products_order_id': orders_data['products_order']['id'] if orders_data['products_order'] else None,
                'course_ids': [c['user_course_id'] for c in orders_data['courses']]
            }
        )

        return payment

    def _calculate_delivery_cost(self, delivery_type):
        """Рассчитать стоимость доставки."""
        costs = {'standard': 300, 'express': 600, 'pickup': 0}
        return costs.get(delivery_type, 300)
