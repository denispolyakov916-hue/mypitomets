"""
Views для магазина кормов и товаров

API для каталога, корзины и заказов.
"""

import logging
from django.db import transaction
from django.conf import settings
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
from .services import process_expired_orders
from django.db.models import Q

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
    
    @staticmethod
    def _get_cache_key(request):
        """Генерация ключа кэша на основе параметров запроса."""
        from core.cache_utils import make_cache_key
        query_params = dict(request.query_params)
        # Исключаем параметры пагинации для более широкого кэширования
        query_params.pop('page', None)
        query_params.pop('per_page', None)
        return make_cache_key('products', query_params)
    
    def get(self, request):
        from django.core.cache import cache
        from django.conf import settings
        
        # Проверяем кэш
        cache_key = self._get_cache_key(request)
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            # Восстанавливаем пагинацию из запроса
            try:
                page = max(1, int(request.query_params.get('page', 1)))
                per_page = min(100, max(1, int(request.query_params.get('per_page', 20))))
            except ValueError:
                page = 1
                per_page = 20
            
            # Применяем пагинацию к кэшированным данным
            total = cached_response.get('pagination', {}).get('total', 0)
            all_products = cached_response.get('products', [])
            
            offset = (page - 1) * per_page
            products_page = all_products[offset:offset + per_page]
            
            response_data = cached_response.copy()
            response_data['products'] = products_page
            response_data['pagination'] = {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
        from apps.pets.models import Pet
        
        # Используем оптимизированный каталог с предзагруженными рейтингами
        # Это устраняет N+1 проблему при вызове to_dict()
        products = Product.objects.catalog()
        
        # Фильтр по питомцу (персональная подборка)
        pet_id = request.query_params.get('pet_id')
        animal = request.query_params.get('animal')
        
        # Если указан pet_id, получаем вид питомца и фильтруем по нему
        if pet_id and request.user.is_authenticated:
            try:
                # Оптимизация: select_related для owner (хотя owner не используется, но для консистентности)
                pet = Pet.objects.select_related('owner').get(id=pet_id, owner=request.user)
                # Маппинг видов питомцев на типы животных в товарах
                if pet.species in ['dog', 'cat']:
                    animal = pet.species
            except (Pet.DoesNotExist, ValueError):
                pass
        
        # Фильтр по животному
        products = products.for_animal(animal)
        
        # Фильтр по категории и подкатегории
        category = request.query_params.get('category')
        subcategory = request.query_params.get('subcategory')
        products = products.in_category(category, subcategory)
        
        # Фильтр по бренду
        vendor = request.query_params.get('vendor')
        products = products.by_vendor(vendor)
        
        # Фильтр по цене
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        try:
            min_price_val = float(min_price) if min_price else None
            max_price_val = float(max_price) if max_price else None
            products = products.by_price_range(min_price_val, max_price_val)
        except ValueError:
            pass
        
        # Фильтр по наличию
        in_stock = request.query_params.get('in_stock')
        if in_stock == 'true':
            products = products.filter(in_stock=True)
        
        # Фильтр по скидкам
        has_discount = request.query_params.get('has_discount')
        if has_discount == 'true':
            products = products.with_discount()

        # Фильтр по ID товаров (для избранного)
        ids = request.query_params.get('ids')
        if ids:
            try:
                ids_list = [int(id.strip()) for id in ids.split(',') if id.strip()]
                if ids_list:
                    products = products.filter(id__in=ids_list)
            except ValueError:
                pass
        
        # Поиск по названию
        search = request.query_params.get('search')
        products = products.search(search)

        # Фильтр по рейтингу (оптимизировано - используем SQL аннотацию)
        min_rating = request.query_params.get('min_rating')
        if min_rating:
            try:
                min_rating_val = float(min_rating)
                products = products.with_min_rating(min_rating_val)
            except ValueError:
                pass

        # Фильтр по популярности (количеству заказов)
        min_orders = request.query_params.get('min_orders')
        if min_orders:
            try:
                min_orders_val = int(min_orders)
                products = products.filter(order_count__gte=min_orders_val)
            except ValueError:
                pass

        # Сортировка (оптимизировано - сортировка по рейтингу теперь через SQL)
        sort_by = request.query_params.get('sort_by')
        if sort_by == 'rating':
            products = products.order_by_rating()
        elif sort_by == 'popularity':
            products = products.order_by_popularity()
        elif sort_by == 'price_asc':
            products = products.order_by('price')
        elif sort_by == 'price_desc':
            products = products.order_by('-price')
        else:
            # По умолчанию сортировка по ID (новые товары)
            products = products.order_by('-id')
        
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
            except Exception as e:
                logger.warning(f"Ошибка при получении данных о питомцах для пользователя {request.user.email}: {e}")
                pets = []
        
        response_data = {
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
        }
        
        # Сохраняем в кэш (без пагинации, чтобы кэшировать все товары)
        from django.core.cache import cache
        from django.conf import settings
        cache_timeout = getattr(settings, 'CACHE_TIMEOUTS', {}).get('products', 300)
        cache.set(cache_key, response_data, cache_timeout)
        
        return Response(response_data, status=status.HTTP_200_OK)


class ProductDetailView(APIView):
    """
    Детали товара.
    
    GET /api/shop/products/{id}/
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request, product_id):
        from django.core.cache import cache
        from django.conf import settings

        # Сначала получаем продукт (нужен для проверки is_purchased)
        try:
            # Оптимизация: используем with_ratings() для предзагрузки рейтинга
            product = Product.objects.with_ratings().get(id=product_id)
        except Product.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Товар не найден', error_code='PRODUCT_NOT_FOUND')

        # Проверяем кэш
        cache_key = f'product_detail:{product_id}'
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            # Для авторизованных пользователей добавляем is_purchased, если его нет в кэше
            if request.user.is_authenticated and 'is_purchased' not in cached_response.get('product', {}):
                from apps.reviews.utils import can_user_review_product
                cached_response['product']['is_purchased'] = can_user_review_product(request.user, product)
            return Response(cached_response, status=status.HTTP_200_OK)
        
        product_data = product.to_dict()
        
        # Добавляем информацию о покупке (если пользователь авторизован)
        if request.user.is_authenticated:
            from apps.reviews.utils import can_user_review_product
            product_data['is_purchased'] = can_user_review_product(request.user, product)
        else:
            product_data['is_purchased'] = False
        
        response_data = {'product': product_data}
        
        # Сохраняем в кэш (только для неавторизованных пользователей или базовых данных)
        # Для авторизованных пользователей is_purchased может отличаться
        if not request.user.is_authenticated:
            cache_timeout = getattr(settings, 'CACHE_TIMEOUTS', {}).get('product_detail', 600)
            cache.set(cache_key, response_data, cache_timeout)
        else:
            # Для авторизованных пользователей кэшируем без is_purchased
            base_response = {'product': {k: v for k, v in product_data.items() if k != 'is_purchased'}}
            cache_timeout = getattr(settings, 'CACHE_TIMEOUTS', {}).get('product_detail', 600)
            cache.set(cache_key, base_response, cache_timeout)
        
        return Response(response_data, status=status.HTTP_200_OK)


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
        """
        Просмотр корзины с группировкой по типам.
        
        Query параметры:
            type (str): 'products', 'courses', 'all' (по умолчанию) - фильтрация по типу элементов
        """
        cart = self._get_or_create_cart(request.user)

        # Оптимизация запросов: prefetch_related для загрузки связанных объектов
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
            'products': CartItemSerializer(products, many=True).data,
            'courses': CartItemSerializer(courses, many=True).data,
            'totals': {
                'products': sum(p.get_total() for p in products),
                'courses': sum(c.get_total() for c in courses),
                'total': float(cart.get_total())
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
            # Оптимизация: используем with_ratings() для консистентности (хотя рейтинг не нужен здесь)
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

        # Возврат обновлённой корзины в правильной структуре
        items = cart.items.select_related('product', 'course', 'pet').order_by('id').all()

        # Группировка
        products = [item for item in items if item.product]
        courses = [item for item in items if item.course]

        return Response({
            'message': 'Товар добавлен в корзину',
            'products': CartItemSerializer(products, many=True).data,
            'courses': CartItemSerializer(courses, many=True).data,
            'totals': {
                'products': sum(p.get_total() for p in products),
                'courses': sum(c.get_total() for c in courses),
                'total': cart.get_total()
            },
            'items_count': len(products) + len(courses)
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

        # Возврат обновлённой корзины в правильной структуре
        items = cart.items.select_related('product', 'course', 'pet').order_by('id').all()

        # Группировка
        products = [item for item in items if item.product]
        courses = [item for item in items if item.course]

        return Response({
            'message': 'Курс добавлен в корзину',
            'products': CartItemSerializer(products, many=True).data,
            'courses': CartItemSerializer(courses, many=True).data,
            'totals': {
                'products': sum(p.get_total() for p in products),
                'courses': sum(c.get_total() for c in courses),
                'total': cart.get_total()
            },
            'items_count': len(products) + len(courses)
        }, status=status.HTTP_200_OK)


class CartItemView(APIView):
    """
    Управление элементами корзины.
    
    PUT    /api/shop/cart/item/ - обновление количества
    DELETE /api/shop/cart/item/ - удаление товара
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
        quantity = serializer.validated_data.get('quantity')
        delta_quantity = serializer.validated_data.get('delta_quantity')

        try:
            cart = Cart.objects.get(user=request.user)
            
            # Определяем, работаем ли с товаром или курсом
            if product_id:
                # Работа с товаром
                cart_item = CartItem.objects.select_related('product').get(
                    cart=cart, 
                    product_id=product_id
                )
                
                # Вычисление нового количества
                if quantity is not None:
                    new_quantity = quantity
                else:
                    new_quantity = cart_item.quantity + delta_quantity
                
                if new_quantity <= 0:
                    cart_item.delete()
                    message = 'Товар удалён из корзины'
                else:
                    # Проверка доступного количества на складе
                    if new_quantity > cart_item.product.stock_count:
                        return Response({
                            'error': f'Недостаточно товара на складе. Доступно: {cart_item.product.stock_count} шт.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    cart_item.quantity = new_quantity
                    cart_item.save()
                    message = 'Корзина обновлена'
                    
            elif course_id:
                # Работа с курсом
                # Используем filter().first() для курсов, так как они могут быть привязаны к питомцу
                cart_item = CartItem.objects.select_related('course', 'pet').filter(
                    cart=cart,
                    course_id=course_id
                ).first()
                
                if not cart_item:
                    raise CartItem.DoesNotExist
                
                # Вычисление нового количества
                if quantity is not None:
                    new_quantity = quantity
                else:
                    # Для курсов delta_quantity не используется (валидируется в сериализаторе)
                    new_quantity = cart_item.quantity
                
                # Для курсов quantity всегда = 1, но можно удалить (quantity=0)
                if new_quantity <= 0:
                    cart_item.delete()
                    message = 'Курс удалён из корзины'
                else:
                    # Курсы всегда имеют quantity=1, обновление не требуется
                    # Но если quantity > 1, это ошибка (курсы нельзя добавлять в количестве > 1)
                    if new_quantity > 1:
                        return Response({
                            'error': 'Курсы можно добавить только в количестве 1'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    # Если quantity == 1, ничего не делаем (уже в корзине)
                    message = 'Корзина обновлена'
                    
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

        # Возврат обновлённой корзины в правильной структуре (совместимой с фронтендом)
        items = cart.items.select_related('product', 'course', 'pet').all()

        # Группировка
        products = [item for item in items if item.product]
        courses = [item for item in items if item.course]

        return Response({
            'message': message,
            'products': CartItemSerializer(products, many=True).data,
            'courses': CartItemSerializer(courses, many=True).data,
            'totals': {
                'products': sum(p.get_total() for p in products),
                'courses': sum(c.get_total() for c in courses),
                'total': cart.get_total()
            },
            'items_count': len(products) + len(courses)
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
                # Используем filter().first() для курсов, так как они могут быть привязаны к питомцу
                cart_item = CartItem.objects.select_related('course', 'pet').filter(
                    cart=cart,
                    course_id=course_id
                ).first()
                
                if not cart_item:
                    raise CartItem.DoesNotExist
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

        # Возврат обновлённой корзины в правильной структуре (совместимой с фронтендом)
        items = cart.items.select_related('product', 'course', 'pet').all()

        # Группировка
        products = [item for item in items if item.product]
        courses = [item for item in items if item.course]

        return Response({
            'message': f'{item_type.capitalize()} удалён из корзины',
            'products': CartItemSerializer(products, many=True).data,
            'courses': CartItemSerializer(courses, many=True).data,
            'totals': {
                'products': sum(p.get_total() for p in products),
                'courses': sum(c.get_total() for c in courses),
                'total': cart.get_total()
            },
            'items_count': len(products) + len(courses)
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

        # Получение элементов корзины с правильной структурой
        items = cart.items.select_related('product', 'course', 'pet').order_by('id').all()

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
            'items_count': len(products) + len(courses)
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
        from core.exceptions import ApiError
        
        serializer = OrderCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            raise ApiError.validation_error('Ошибка валидации', errors=serializer.errors)
        
        shipping_address = serializer.validated_data['shipping_address']
        
        # Получение корзины
        try:
            cart = Cart.objects.prefetch_related('items__product').get(user=request.user)
        except Cart.DoesNotExist:
            raise ApiError.bad_request('Корзина пуста', error_code='CART_EMPTY')
        
        cart_items = cart.items.all()
        if not cart_items:
            raise ApiError.bad_request('Корзина пуста. Добавьте товары перед оформлением заказа.', error_code='CART_EMPTY')
        
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
            from core.exceptions import ApiError
            if unavailable_items:
                raise ApiError.bad_request(
                    'Некоторые товары больше недоступны',
                    errors={'unavailable_items': unavailable_items},
                    error_code='UNAVAILABLE_ITEMS'
                )
            
            if insufficient_items:
                raise ApiError.bad_request(
                    'Недостаточно товаров на складе',
                    errors={'insufficient_items': insufficient_items},
                    error_code='INSUFFICIENT_STOCK'
                )
            
            # Расчёт суммы с учётом актуальных цен и скидок
            from decimal import Decimal
            subtotal = Decimal('0')
            for item in cart_items:
                product = products[item.product_id]
                # Используем цену со скидкой
                item_price = Decimal(str(product.discounted_price))
                subtotal += item_price * item.quantity

            total_amount = subtotal + delivery_cost
            
            # Устанавливаем время истечения оплаты - 10 минут с момента создания заказа
            from django.utils import timezone
            from datetime import timedelta
            expires_at = timezone.now() + timedelta(minutes=10)
            
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
                expires_at=expires_at,
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
        
        logger.info(
            f"Заказ создан: {order.id}",
            extra={
                'order_id': str(order.id),
                'user_id': str(request.user.id),
                'user_email': request.user.email,
                'total_amount': float(total_amount),
                'items_count': len(cart_items),
                'request_id': getattr(request, 'request_id', None),
            }
        )
        
        return Response({
            'message': 'Заказ успешно оформлен',
            'order': order.to_dict()
        }, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    """
    Детали одного заказа.
    
    GET /api/shop/orders/{order_id}/ - получение деталей заказа
    PATCH /api/shop/orders/{order_id}/ - обновление заказа (только для pending/expired)
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, order_id):
        # Проверяем и обрабатываем просроченные заказы перед получением заказа
        process_expired_orders()
        
        try:
            order = Order.objects.prefetch_related(
                'items__product', 
                'items__course', 
                'items__pet'
            ).select_related('address').get(
                id=order_id,
                user=request.user
            )
            
            # Обновляем заказ, если он был просрочен
            order.refresh_from_db()
        except Order.DoesNotExist:
            return Response(
                {'error': 'Заказ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'order': order.to_dict()
        }, status=status.HTTP_200_OK)
    
    def patch(self, request, order_id):
        """
        Обновление заказа.
        
        Разрешается только для заказов со статусом 'pending' или 'expired'.
        Можно обновить:
        - delivery_type (тип доставки)
        - shipping_address (адрес доставки)
        - address_id (ID сохраненного адреса)
        """
        try:
            # Оптимизация: предзагружаем items вместе с product, course, pet и address
            order = Order.objects.select_related('user', 'address').prefetch_related(
                'items__product', 'items__course', 'items__pet'
            ).get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Заказ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Проверяем, что заказ можно редактировать
        if order.status not in ['pending', 'expired']:
            return Response(
                {'error': 'Заказ нельзя редактировать. Доступно только для неоплаченных заказов.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Обновляем поля доставки
        delivery_type = request.data.get('delivery_type')
        shipping_address = request.data.get('shipping_address')
        address_id = request.data.get('address_id')
        
        if delivery_type:
            if delivery_type not in ['standard', 'express', 'pickup']:
                return Response(
                    {'error': 'Неверный тип доставки'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            order.delivery_type = delivery_type
        
        # Обновляем адрес
        if address_id:
            from .models import Address
            try:
                address = Address.objects.get(id=address_id, user=request.user)
                order.address = address
                order.shipping_address = address.full_address
            except Address.DoesNotExist:
                return Response(
                    {'error': 'Адрес не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif shipping_address is not None:
            if order.delivery_type != 'pickup' and not shipping_address.strip():
                return Response(
                    {'error': 'Необходимо указать адрес доставки'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            order.shipping_address = shipping_address.strip()
            order.address = None
        
        # Пересчитываем стоимость доставки
        from .services.order_service import OrderService
        order.delivery_cost = OrderService.calculate_delivery_cost(order.delivery_type)
        order.total_amount = order.subtotal_amount + order.delivery_cost
        
        order.save()
        
        return Response({
            'order': order.to_dict(),
            'message': 'Заказ успешно обновлен'
        }, status=status.HTTP_200_OK)


class OrderHistoryView(APIView):
    """
    История заказов.
    
    GET /api/shop/orders/history/
    
    Параметры:
        status: фильтрация по статусу (pending, processing, shipped, delivered, cancelled)
        page: номер страницы (по умолчанию 1)
        per_page: товаров на странице (по умолчанию 20)
    
    Автоматически отменяет неоплаченные заказы старше 10 минут.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone
        
        # Обработка просроченных заказов выполняется в process_expired_orders()
        
        # Оптимизация: предзагружаем items вместе с product, course, pet
        orders = Order.objects.filter(user=request.user).prefetch_related(
            'items__product', 
            'items__course', 
            'items__pet'
        ).select_related('address').order_by('-created_at')
        
        # Фильтрация по статусу
        status_filter = request.query_params.get('status')
        if status_filter:
            valid_statuses = [choice[0] for choice in Order.STATUS_CHOICES]
            if status_filter in valid_statuses:
                orders = orders.filter(status=status_filter)
        
        # Общее количество до пагинации
        total = orders.count()
        
        # Пагинация
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            per_page = min(100, max(1, int(request.query_params.get('per_page', 20))))
        except ValueError:
            page = 1
            per_page = 20
        
        start = (page - 1) * per_page
        end = start + per_page
        orders_page = orders[start:end]
        
        orders_data = [order.to_dict() for order in orders_page]
        
        return Response({
            'orders': orders_data,
            'count': len(orders_data),
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
        }, status=status.HTTP_200_OK)


class OrderConfirmPaymentView(APIView):
    """
    Подтверждение оплаты заказа через единую систему платежей.

    POST /api/shop/orders/{order_id}/confirm-payment/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        try:
            # Оптимизация: предзагружаем items вместе с product, course, pet
            order = Order.objects.select_related('user', 'address').prefetch_related(
                'items__product', 'items__course', 'items__pet'
            ).get(id=order_id, user=request.user)
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
    Единый checkout для товаров и курсов с поддержкой выборочного оформления.

    GET /api/checkout/ - получить данные для оформления
    GET /api/checkout/?selected_items=1,2,3 - получить данные только для выбранных элементов
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

        # Получаем selected_items из query параметров
        selected_items_param = request.query_params.get('selected_items', '')
        selected_item_ids = []
        if selected_items_param:
            try:
                selected_item_ids = [int(x.strip()) for x in selected_items_param.split(',') if x.strip()]
            except ValueError:
                pass

        # Фильтруем элементы корзины по selected_items (если указаны)
        cart_items = cart.items.all()
        if selected_item_ids:
            cart_items = cart_items.filter(id__in=selected_item_ids)

        # Разделить на товары и курсы
        product_items = []
        course_items = []

        for item in cart_items:
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
            },
            'selected_items': selected_item_ids  # Возвращаем выбранные элементы
        })

    def post(self, request):
        """Создать заказ(ы) и начать оплату с поддержкой выборочного оформления."""
        # Логирование входящих данных для отладки
        logger.info(f"Данные запроса на оформление заказа: {request.data}")
        
        serializer = UnifiedOrderSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            # Логирование ошибок валидации для отладки
            logger.warning(f"Ошибка валидации при оформлении заказа: {serializer.errors}")
            logger.warning(f"Входящие данные: {request.data}")
            return Response(
                {'error': 'Ошибка валидации данных', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Получение корзины
            try:
                cart = Cart.objects.get(user=request.user)
            except Cart.DoesNotExist:
                return Response(
                    {'error': 'Корзина пуста. Добавьте товары или курсы перед оформлением заказа.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            validated_data = serializer.validated_data
            
            # Получаем выбранные элементы (уже проверены в сериализаторе)
            selected_cart_items = validated_data.get('_selected_cart_items', list(cart.items.all()))
            
            # Создать резервирования только для выбранных элементов
            reservations = ReservationService.create_reservations_from_items(
                cart.user, selected_cart_items
            )

            # Создать заказы только из выбранных элементов
            orders_data = self._create_orders_from_selected_items(
                cart,
                selected_cart_items,
                validated_data,
                reservations
            )

            # НЕ создаем платеж сразу - он будет создан при попытке оплаты
            # Удалить выбранные элементы из корзины
            selected_item_ids = [item.id for item in selected_cart_items]
            CartItem.objects.filter(id__in=selected_item_ids).delete()

            return Response({
                'reservation_id': str(reservations[0].id) if reservations else None,
                'orders': orders_data
                # Убираем payment из ответа - платеж будет создан позже
            })

        except Exception as e:
            # При ошибке отменить резервирования
            if 'reservations' in locals():
                try:
                    ReservationService.cancel_reservations(reservations)
                except Exception as cancel_error:
                    logger.error(
                        f"Ошибка при отмене резервирований: {str(cancel_error)}",
                        extra={
                            'user_id': str(request.user.id),
                            'user_email': request.user.email,
                            'request_id': getattr(request, 'request_id', None),
                            'error_type': type(cancel_error).__name__,
                        },
                        exc_info=True
                    )
            
            # Логирование уже выполняется в middleware и exception_handler
            # Пробрасываем исключение для обработки в exception_handler
            from core.exceptions import ApiError
            raise ApiError.internal_error(
                f'Ошибка при создании заказа: {str(e)}' if settings.DEBUG else None
            )
            
            # Возвращаем более понятное сообщение об ошибке
            error_message = 'Произошла ошибка. Попробуйте позже.'
            if settings.DEBUG:
                error_message = str(e)
            
            return Response({'error': error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _create_orders_from_cart(self, cart, data, reservations):
        """Создать заказы товаров и записи на курсы (для обратной совместимости)."""
        return self._create_orders_from_selected_items(
            cart, list(cart.items.all()), data, reservations
        )

    def _create_orders_from_selected_items(self, cart, selected_items, data, reservations):
        """Создать заказы товаров и записи на курсы из выбранных элементов."""
        orders_data = {'products_order': None, 'courses': []}

        # Разделяем элементы на товары и курсы
        product_items = [item for item in selected_items if item.product]
        course_items = [item for item in selected_items if item.course]

        # Создать заказ если есть товары или курсы
        # Для unified_checkout всегда нужен заказ, даже если только курсы
        order = None
        if product_items or course_items:
            delivery_type = data.get('delivery_type', 'pickup')  # Для курсов доставка не нужна, используем pickup
            # Для самовывоза адрес не требуется, используем значение по умолчанию
            shipping_address = data.get('shipping_address')
            if delivery_type == 'pickup' or not product_items:
                # Для самовывоза или для курсов используем значение по умолчанию
                shipping_address = shipping_address or 'Самовывоз'
            else:
                # Для других типов доставки адрес должен быть передан (проверено в валидации)
                shipping_address = shipping_address or ''
            
            # Устанавливаем время истечения оплаты - 10 минут с момента создания заказа
            from django.utils import timezone
            from datetime import timedelta
            expires_at = timezone.now() + timedelta(minutes=10)
            
            order = Order.objects.create(
                user=cart.user,
                delivery_type=delivery_type if product_items else 'pickup',  # Для курсов всегда pickup
                address_id=data.get('address_id'),
                shipping_address=shipping_address,
                total_amount=0,  # Рассчитается ниже
                expires_at=expires_at,
            )

            # Добавить элементы заказа для товаров
            # Примечание: stock_count уже уменьшен при создании резервирования
            for item in product_items:
                OrderItem.objects.create(
                    order=order,
                    product=item.product,
                    product_name=item.product.name,
                    price=item.product.discounted_price,
                    quantity=item.quantity
                )

            # Рассчитать итоговую сумму для товаров
            if product_items:
                order.subtotal_amount = order.get_subtotal()
                order.delivery_cost = self._calculate_delivery_cost(data['delivery_type'])
                order.total_amount = order.get_total_with_delivery()
            else:
                # Если только курсы - доставка не нужна
                order.subtotal_amount = 0
                order.delivery_cost = 0
                order.total_amount = 0
            order.save()

            orders_data['products_order'] = order.to_dict()

        # Создать записи на курсы
        for item in course_items:
            # Добавляем курс как OrderItem к заказу (заказ уже создан выше)
            if order:
                OrderItem.objects.create(
                    order=order,
                    course=item.course,
                    pet=item.pet,
                    product_name=item.course.title,
                    price=float(item.course.price),
                    quantity=1,
                    disclaimer_accepted=item.disclaimer_accepted
                )
                # Обновляем сумму заказа с учетом курса
                from decimal import Decimal
                course_price = Decimal(str(item.course.price))
                order.subtotal_amount += course_price
                order.total_amount += course_price
                order.save()
                orders_data['products_order'] = order.to_dict()

            user_course = UserCourse.objects.create(
                user=cart.user,
                course=item.course,
                pet=item.pet
            )

            orders_data['courses'].append({
                'user_course_id': user_course.id,
                'course_name': item.course.title,
                'amount': float(item.course.price)
            })

        return orders_data

    def _create_unified_payment(self, orders_data, user):
        """Создать единый платёж для всех заказов."""
        from decimal import Decimal
        from apps.payments.services import PaymentService

        total_amount = Decimal('0')

        if orders_data['products_order']:
            total_amount += Decimal(str(orders_data['products_order']['total_amount']))

        for course in orders_data['courses']:
            total_amount += Decimal(str(course['amount']))

        # Определяем object_id для unified_checkout
        # Всегда используем ID заказа (заказ создается даже для курсов)
        object_id = None
        if orders_data['products_order']:
            object_id = orders_data['products_order']['id']
        elif orders_data['courses']:
            # Если по какой-то причине заказа нет, но есть курсы - это ошибка
            # Заказ должен был быть создан в _create_orders_from_selected_items
            raise ValueError("Невозможно создать платёж: заказ не найден для курсов")

        if not object_id:
            raise ValueError("Невозможно создать платёж: нет связанных объектов")

        # Создать единый платёж через PaymentService
        payment = PaymentService.create_payment(
            user=user,
            payment_type='unified_checkout',
            object_id=object_id,
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


class FrequentlyBoughtTogetherView(APIView):
    """
    Рекомендации "Часто покупают вместе".

    GET /api/shop/products/{product_id}/frequently-bought/

    Использует RecommendationEngine для формирования интеллектуальных рекомендаций
    на основе:
    - Анализа истории покупок
    - Правил связывания категорий
    - Персонализации по PetID (для авторизованных пользователей)
    
    Query параметры:
        limit (int): Максимальное количество рекомендаций (по умолчанию 6)
    """

    permission_classes = [AllowAny]

    def get(self, request, product_id):
        from apps.shop.services import RecommendationEngine
        
        try:
            # Получить основной товар
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Параметры
        try:
            limit = int(request.query_params.get('limit', 6))
            limit = min(max(1, limit), 12)  # От 1 до 12
        except ValueError:
            limit = 6
        
        # Получаем рекомендации через движок
        user = request.user if request.user.is_authenticated else None
        result = RecommendationEngine.get_frequently_bought_together(
            product_id=product_id,
            limit=limit,
            user=user
        )
        
        return Response({
            'product': product.to_dict(),
            'recommendations': result.to_list(),
            'total_analyzed_orders': result.total_analyzed_orders,
            'has_purchase_data': result.total_analyzed_orders > 0
        })


class CartRecommendationsView(APIView):
    """
    Рекомендации товаров для корзины.

    GET /api/shop/cart/recommendations/

    Анализирует товары в корзине и предлагает дополнения.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.shop.services import RecommendationEngine
        
        try:
            limit = int(request.query_params.get('limit', 6))
            limit = min(max(1, limit), 12)
        except ValueError:
            limit = 6
        
        recommendations = RecommendationEngine.get_cart_recommendations(
            user=request.user,
            limit=limit
        )
        
        return Response({
            'recommendations': recommendations,
            'count': len(recommendations)
        })


class PersonalRecommendationsView(APIView):
    """
    Персональные рекомендации товаров и курсов на основе PetID.

    GET /api/shop/personal-recommendations/

    Использует PersonalizationService для формирования персонализированных
    рекомендаций на основе:
    - Видов и характеристик питомцев пользователя
    - Любимых продуктов и аллергий
    - Возраста и особенностей питомцев
    - Истории покупок
    
    Query параметры:
        products_limit (int): Лимит товаров (по умолчанию 8)
        courses_limit (int): Лимит курсов (по умолчанию 4)
        type (str): 'all', 'products', 'courses'
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.pets.services import PersonalizationService
        
        user = request.user
        
        # Параметры
        try:
            products_limit = int(request.query_params.get('products_limit', 8))
            courses_limit = int(request.query_params.get('courses_limit', 4))
        except ValueError:
            products_limit = 8
            courses_limit = 4
        
        rec_type = request.query_params.get('type', 'all')
        
        # Получаем контекст персонализации
        context = PersonalizationService.get_context(user)
        
        if context.is_empty:
            return Response({
                'recommendations': {
                    'products': [],
                    'courses': [],
                },
                'context': {
                    'has_pets': False,
                    'pets_count': 0,
                },
                'message': 'Добавьте профили питомцев для персональных рекомендаций'
            })
        
        # Формируем рекомендации
        result = {
            'context': {
                'has_pets': True,
                'pets_count': len(context.pets),
                'animal_types': list(context.animal_types),
                'has_senior_pets': context.has_senior_pets,
                'has_young_pets': context.has_young_pets,
            }
        }
        
        if rec_type in ['all', 'products']:
            result['products'] = PersonalizationService.get_product_recommendations(
                user, products_limit
            )
        else:
            result['products'] = []
        
        if rec_type in ['all', 'courses']:
            result['courses'] = PersonalizationService.get_course_recommendations(
                user, courses_limit
            )
        else:
            result['courses'] = []
        
        return Response(result)


class HealthFilteredProductsView(APIView):
    """
    Товары, отфильтрованные по проблемам здоровья питомца.

    GET /api/shop/products/health-filter/
    
    Query параметры:
        health_issue (str): Код проблемы здоровья
        limit (int): Лимит товаров (по умолчанию 12)
    
    Доступные проблемы здоровья:
        - overweight: Для контроля веса
        - sensitive_digestion: Для чувствительного пищеварения
        - skin_issues: Для здоровья кожи и шерсти
        - joint_problems: Для здоровья суставов
        - dental_issues: Для здоровья зубов
        - allergies: Гипоаллергенный
        - kidney_issues: Для здоровья почек
        - heart_issues: Для здоровья сердца
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from apps.pets.services import PersonalizationService
        
        health_issue = request.query_params.get('health_issue')
        
        if not health_issue:
            # Возвращаем список доступных фильтров
            filters = PersonalizationService.get_available_health_filters()
            return Response({
                'available_filters': filters,
                'message': 'Укажите параметр health_issue для фильтрации'
            })
        
        try:
            limit = int(request.query_params.get('limit', 12))
            limit = min(max(1, limit), 24)
        except ValueError:
            limit = 12
        
        # Получаем рекомендации
        user = request.user if request.user.is_authenticated else None
        recommendations = PersonalizationService.get_health_based_recommendations(
            user, health_issue, limit
        )
        
        return Response({
            'health_issue': health_issue,
            'products': recommendations,
            'count': len(recommendations)
        })


class LegacyPersonalRecommendationsView(APIView):
    """
    [DEPRECATED] Старый API рекомендаций. Используйте PersonalRecommendationsView.
    
    Сохранён для обратной совместимости.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.pets.services import PersonalizationService
        
        user = request.user
        
        # Получаем рекомендации через сервис
        recommendations = PersonalizationService.get_product_recommendations(user, 12)
        
        # Преобразуем в старый формат
        legacy_recommendations = [
            rec['product'] for rec in recommendations
        ]
        
        return Response({
            'recommendations': legacy_recommendations,
            'pets_count': len(PersonalizationService.get_context(user).pets)
        })


class ReturnCreateView(APIView):  # noqa: E302
    """
    Создание запроса на возврат товара.

    POST /api/shop/returns/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data

        # Валидация данных
        required_fields = ['order_item_id', 'quantity', 'reason']
        for field in required_fields:
            if field not in data:
                return Response(
                    {'error': f'Поле {field} обязательно'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            order_item = OrderItem.objects.get(
                id=data['order_item_id'],
                order__user=request.user,
                product__isnull=False  # Только товары, не курсы
            )
        except OrderItem.DoesNotExist:
            return Response(
                {'error': 'Элемент заказа не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка статуса заказа - возврат возможен только для доставленных заказов
        if order_item.order.status not in ['delivered']:
            return Response(
                {'error': 'Возврат возможен только для доставленных заказов'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверка количества
        if data['quantity'] > order_item.quantity:
            return Response(
                {'error': 'Количество для возврата не может превышать купленное'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверка, что возврат еще не запрошен
        existing_return = Return.objects.filter(
            order_item=order_item,
            status__in=['requested', 'approved', 'received']
        ).exists()

        if existing_return:
            return Response(
                {'error': 'Для этого товара уже запрошен возврат'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Создание возврата
        return_obj = Return.objects.create(
            user=request.user,
            order=order_item.order,
            order_item=order_item,
            quantity=data['quantity'],
            reason=data['reason'],
            description=data.get('description', ''),
            refund_amount=(order_item.price * data['quantity'])
        )

        return Response({
            'return': return_obj.to_dict()
        }, status=status.HTTP_201_CREATED)


class ReturnListView(APIView):
    """
    Список возвратов пользователя.

    GET /api/shop/returns/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        returns = Return.objects.filter(user=request.user).order_by('-requested_at')
        return Response({
            'returns': [return_obj.to_dict() for return_obj in returns]
        })


class ReturnDetailView(APIView):
    """
    Детали возврата.

    GET /api/shop/returns/{return_id}/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, return_id):
        try:
            return_obj = Return.objects.get(id=return_id, user=request.user)
            return Response({
                'return': return_obj.to_dict()
            })
        except Return.DoesNotExist:
            return Response(
                {'error': 'Возврат не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
