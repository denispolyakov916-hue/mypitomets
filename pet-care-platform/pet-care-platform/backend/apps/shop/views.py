"""
Views для магазина кормов и товаров

API для каталога, корзины и заказов.
"""

import logging
from datetime import timedelta

from django.db import transaction
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.decorators import action, api_view, permission_classes

from apps.payments.models import Payment
from apps.training.models import UserCourse

from .models import Product, ProductSKU, Cart, CartItem, Order, OrderItem, Address, Reservation
from .serializers import (
    CartItemAddSerializer,
    CartItemUpdateSerializer,
    CartItemSerializer,
    OrderCreateSerializer,
    UnifiedOrderSerializer
)
from .services import (
    ReservationService, process_expired_orders,
    AnalyticsDataService, AnalyticsMetricsInitializer
)
from core.constants import (
    RESERVATION_TIMEOUT_MINUTES, DELIVERY_COSTS,
    DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, UNLIMITED_STOCK_THRESHOLD,
)
from django.db.models import Q

logger = logging.getLogger('apps.shop')


class ProductListView(APIView):
    """
    Каталог товаров с фильтрацией.
    
    GET /api/shop/products/
    
    Параметры:
        animal: dog | cat
        pet_id: ID питомца пользователя (для персональной подборки)
        category_slug: slug категории (новая структура)
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
        """
        Оптимизированный каталог товаров.
        
        Оптимизации:
        1. Пагинация применяется ДО сериализации (критическая оптимизация)
        2. Фильтры кэшируются отдельно с более длинным TTL
        3. Товары кэшируются по страницам
        4. Минимизированы SQL запросы через select_related/prefetch
        """
        from django.core.cache import cache
        from django.conf import settings
        from apps.pets.models import Pet
        from django.db.models import Count, Min, Max
        
        # Параметры пагинации
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            per_page = min(MAX_PAGE_SIZE, max(1, int(request.query_params.get('per_page', DEFAULT_PAGE_SIZE))))
        except ValueError:
            page = 1
            per_page = DEFAULT_PAGE_SIZE
        
        # Генерируем ключи кэша
        filters_hash = self._get_cache_key(request)
        cache_key_products = f'{filters_hash}:page:{page}:per_page:{per_page}'
        cache_key_filters = f'shop:filters:{filters_hash}'
        cache_key_user_pets = f'shop:user_pets:{request.user.id}' if request.user.is_authenticated else None
        
        # Пробуем получить товары из кэша
        cached_products = cache.get(cache_key_products)
        cached_filters = cache.get(cache_key_filters)
        cached_user_pets = cache.get(cache_key_user_pets) if cache_key_user_pets else None
        
        # Если есть закэшированные товары и фильтры
        if cached_products is not None and cached_filters is not None:
            # Добавляем питомцев пользователя (кэшируются отдельно)
            if cached_user_pets is None and request.user.is_authenticated:
                cached_user_pets = self._get_user_pets(request.user)
                cache.set(cache_key_user_pets, cached_user_pets, 600)  # 10 минут
            
            filters_data = cached_filters.copy()
            filters_data['user_pets'] = cached_user_pets or []
            
            return Response({
                'products': cached_products['products'],
                'pagination': cached_products['pagination'],
                'filters': filters_data
            }, status=status.HTTP_200_OK)
        
        # === ПОСТРОЕНИЕ QUERYSET ===
        products = Product.objects.catalog()
        
        # Фильтр по питомцу (персональная подборка)
        pet_id = request.query_params.get('pet_id')
        animal = request.query_params.get('animal')
        
        if pet_id and request.user.is_authenticated:
            try:
                pet = Pet.objects.only('species').get(id=pet_id, owner=request.user)
                if pet.species in ['dog', 'cat']:
                    animal = pet.species
            except (Pet.DoesNotExist, ValueError):
                pass
        
        # Применяем фильтры
        products = products.for_animal(animal)
        products_for_filters = products
        
        # === НОВЫЕ ФИЛЬТРЫ (по database_tz.md) ===
        
        # Фильтр по новой категории (с иерархией)
        category_id = request.query_params.get('category_id')
        category_slug = request.query_params.get('category_slug')
        category_code = request.query_params.get('category_code')
        
        if category_code:
            from .models import Category
            from apps.shop.management.commands.populate_category_codes import CATEGORY_CODE_MAPPING
            categories = Category.objects.filter(is_active=True).only(
                'id', 'kotmatros_category_id', 'code'
            )
            def _code_for(cat):
                return cat.code or CATEGORY_CODE_MAPPING.get(cat.kotmatros_category_id)
            matched_ids = [
                cat.id for cat in categories
                if _code_for(cat) and (
                    _code_for(cat) == category_code or _code_for(cat).startswith(f"{category_code}.")
                )
            ]
            if matched_ids:
                products = products.filter(new_category_id__in=matched_ids)
        elif category_slug:
            from .models import Category
            try:
                cat = Category.objects.get(slug=category_slug, is_active=True)
                products = products.in_new_category(cat)
            except Category.DoesNotExist:
                pass
        elif category_id:
            try:
                products = products.in_new_category(int(category_id))
            except ValueError:
                pass
        
        # Фильтр по группе товаров
        product_group = request.query_params.get('product_group')
        products = products.by_product_group(product_group)
        products_for_filters = products_for_filters.by_product_group(product_group)
        
        # Фильтр по бренду (новый)
        brand_id = request.query_params.get('brand_id')
        brand_slug = request.query_params.get('brand_slug')
        if brand_slug:
            products = products.by_brand(brand_slug)
            products_for_filters = products_for_filters.by_brand(brand_slug)
        elif brand_id:
            try:
                products = products.by_brand(int(brand_id))
                products_for_filters = products_for_filters.by_brand(int(brand_id))
            except ValueError:
                pass
        
        # Фильтр по классу бренда
        brand_class = request.query_params.get('brand_class')
        if brand_class and brand_class in ['economy', 'premium', 'super_premium', 'holistic']:
            products = products.filter(brand__brand_class=brand_class)
            products_for_filters = products_for_filters.filter(brand__brand_class=brand_class)
        
        # Фильтр по возрастной группе
        age_group = request.query_params.get('age_group')
        products = products.by_age_group(age_group)
        products_for_filters = products_for_filters.by_age_group(age_group)
        
        # Фильтр по размерной группе
        size_group = request.query_params.get('size_group')
        products = products.by_size_group(size_group)
        products_for_filters = products_for_filters.by_size_group(size_group)
        
        # Boolean фильтры для кормов
        if request.query_params.get('is_grain_free') == 'true':
            products = products.grain_free()
            products_for_filters = products_for_filters.grain_free()
        
        if request.query_params.get('is_hypoallergenic') == 'true':
            products = products.hypoallergenic()
            products_for_filters = products_for_filters.hypoallergenic()
        
        if request.query_params.get('is_veterinary') == 'true':
            products = products.veterinary()
            products_for_filters = products_for_filters.veterinary()
        
        # Фильтр по показаниям здоровья
        health_condition = request.query_params.get('health_condition')
        products = products.by_health_condition(health_condition)
        products_for_filters = products_for_filters.by_health_condition(health_condition)
        
        # Фильтр по цене
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        try:
            min_price_val = float(min_price) if min_price else None
            max_price_val = float(max_price) if max_price else None
            products = products.by_price_range(min_price_val, max_price_val)
            products_for_filters = products_for_filters.by_price_range(min_price_val, max_price_val)
        except ValueError:
            pass
        
        # Фильтр по наличию
        in_stock = request.query_params.get('in_stock')
        if in_stock == 'true':
            products = products.filter(is_available=True)
            products_for_filters = products_for_filters.filter(is_available=True)
        
        # Фильтр по скидкам
        has_discount = request.query_params.get('has_discount')
        if has_discount == 'true':
            products = products.with_discount()
            products_for_filters = products_for_filters.with_discount()

        # Фильтр по ID товаров (для избранного)
        ids = request.query_params.get('ids')
        if ids:
            try:
                ids_list = [int(id.strip()) for id in ids.split(',') if id.strip()]
                if ids_list:
                    products = products.filter(id__in=ids_list)
                    products_for_filters = products_for_filters.filter(id__in=ids_list)
            except ValueError:
                pass
        
        # Поиск по названию
        search = request.query_params.get('search')
        products = products.search(search)
        products_for_filters = products_for_filters.search(search)

        # Фильтр по рейтингу
        min_rating = request.query_params.get('min_rating')
        if min_rating:
            try:
                products = products.with_min_rating(float(min_rating))
                products_for_filters = products_for_filters.with_min_rating(float(min_rating))
            except ValueError:
                pass

        # Фильтр по популярности
        min_orders = request.query_params.get('min_orders')
        if min_orders:
            try:
                products = products.filter(order_count__gte=int(min_orders))
                products_for_filters = products_for_filters.filter(order_count__gte=int(min_orders))
            except ValueError:
                pass

        # Сортировка
        sort_by = request.query_params.get('sort_by')
        if sort_by == 'discount':
            from django.db.models import F, ExpressionWrapper, FloatField
            products = products.with_discount()
            products_for_filters = products_for_filters.with_discount()
            discount_percent = ExpressionWrapper(
                (F('compare_price') - F('price')) / F('compare_price'),
                output_field=FloatField()
            )
            products = products.annotate(discount_percent=discount_percent).order_by('-discount_percent')
        elif sort_by == 'rating':
            products = products.order_by_rating()
        elif sort_by == 'popularity':
            products = products.order_by_popularity()
        elif sort_by == 'price_asc':
            products = products.order_by('price')
        elif sort_by == 'price_desc':
            products = products.order_by('-price')
        else:
            products = products.order_by('-id')
        
        # === КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ: Пагинация ДО сериализации ===
        total_count = products.count()
        offset = (page - 1) * per_page
        
        # Применяем LIMIT/OFFSET на уровне SQL, затем сериализуем
        products_page = products[offset:offset + per_page]
        products_data = [p.to_dict() for p in products_page]
        
        # Формируем данные пагинации
        pagination_data = {
            'total': total_count,
            'page': page,
            'per_page': per_page,
            'total_pages': (total_count + per_page - 1) // per_page if total_count > 0 else 0
        }
        
        # Кэшируем товары для этой страницы (короткий TTL)
        cache_timeout_products = getattr(settings, 'CACHE_TIMEOUTS', {}).get('products', 60)
        cache.set(cache_key_products, {
            'products': products_data,
            'pagination': pagination_data
        }, cache_timeout_products)
        
        # === ФИЛЬТРЫ: Кэшируем отдельно с более длинным TTL ===
        if cached_filters is None:
            cached_filters = self._build_filters_data(products_for_filters, brand_query=products)
            cache_timeout_filters = getattr(settings, 'CACHE_TIMEOUTS', {}).get('filters', 600)  # 10 минут
            cache.set(cache_key_filters, cached_filters, cache_timeout_filters)
        
        # Питомцы пользователя
        user_pets = []
        if request.user.is_authenticated:
            if cached_user_pets is None:
                user_pets = self._get_user_pets(request.user)
                cache.set(cache_key_user_pets, user_pets, 600)
            else:
                user_pets = cached_user_pets
        
        filters_data = cached_filters.copy()
        filters_data['user_pets'] = user_pets
        
        return Response({
            'products': products_data,
            'pagination': pagination_data,
            'filters': filters_data
        }, status=status.HTTP_200_OK)
    
    def _build_filters_data(self, filter_query, brand_query=None):
        """Построение данных фильтров на текущем queryset."""
        from django.db.models import Count, Min, Max
        from .models import Category as ShopCategory, Brand
        from apps.shop.management.commands.populate_category_codes import CATEGORY_CODE_MAPPING
        
        # Один запрос для всех агрегаций
        aggregations = filter_query.aggregate(
            min_price=Min('price'),
            max_price=Max('price')
        )
        
        # === НОВЫЕ ФИЛЬТРЫ ===
        
        # Категории по спецификации (fixed order)
        CATEGORY_SPEC = [
            {
                'code': 'food',
                'name': 'Питание',
                'icon': '🍖',
                'children': [
                    {'code': 'food.dry', 'name': 'Сухой корм'},
                    {'code': 'food.wet', 'name': 'Влажный корм'},
                    {'code': 'food.semi_moist', 'name': 'Полувлажный корм'},
                    {'code': 'food.canned', 'name': 'Консервы'},
                    {'code': 'food.pouches', 'name': 'Паучи'},
                    {'code': 'food.pate', 'name': 'Паштеты'},
                    {'code': 'food.holistic', 'name': 'Холистики'},
                    {'code': 'food.diet', 'name': 'Диетический корм'},
                    {'code': 'food.hypoallergenic', 'name': 'Гипоаллергенный корм'},
                    {'code': 'food.treats', 'name': 'Лакомства'},
                    {'code': 'food.supplements', 'name': 'Витамины и добавки'},
                    {'code': 'food.lifestage.kitten', 'name': 'Правильное питание для котенка'},
                    {'code': 'food.lifestage.puppy', 'name': 'Правильное питание для щенка'},
                ],
            },
            {
                'code': 'health',
                'name': 'Ветаптека',
                'icon': '💊',
                'children': [
                    {'code': 'health.parasite', 'name': 'Средства от паразитов'},
                ],
            },
            {
                'code': 'toilet',
                'name': 'Туалеты и гигиена',
                'icon': '🚽',
                'children': [
                    {'code': 'toilet.litter', 'name': 'Наполнители'},
                    {'code': 'toilet.litter_boxes', 'name': 'Лотки'},
                    {'code': 'toilet.litter_boxes_auto', 'name': 'Автоматические лотки'},
                    {'code': 'toilet.bio_toilets', 'name': 'Биотуалеты'},
                    {'code': 'toilet.waste_bags', 'name': 'Пакеты для выгула'},
                    {'code': 'toilet.pads', 'name': 'Пеленки'},
                    {'code': 'toilet.diapers', 'name': 'Подгузники'},
                    {'code': 'toilet.scoops', 'name': 'Совочки'},
                ],
            },
            {
                'code': 'feeding',
                'name': 'Миски и поилки',
                'icon': '🥣',
                'children': [
                    {'code': 'feeding.bowls', 'name': 'Миски'},
                    {'code': 'feeding.drinkers', 'name': 'Поилки'},
                    {'code': 'feeding.bottles', 'name': 'Бутылочки'},
                ],
            },
            {
                'code': 'toys',
                'name': 'Игрушки и развлечения',
                'icon': '🎾',
                'children': [
                    {'code': 'toys.toys', 'name': 'Игрушки'},
                    {'code': 'toys.scratching_posts', 'name': 'Когтеточки'},
                    {'code': 'toys.playgrounds', 'name': 'Игровые площадки'},
                    {'code': 'toys.tunnels', 'name': 'Тоннели'},
                ],
            },
            {
                'code': 'walk',
                'name': 'Амуниция и выгул',
                'icon': '🎒',
                'children': [
                    {'code': 'walk.collars', 'name': 'Ошейники'},
                    {'code': 'walk.leashes', 'name': 'Поводки'},
                    {'code': 'walk.harnesses', 'name': 'Шлейки'},
                    {'code': 'walk.belts', 'name': 'Пояса'},
                    {'code': 'walk.tags', 'name': 'Адресники'},
                    {'code': 'walk.carabiners', 'name': 'Карабины'},
                    {'code': 'walk.clickers', 'name': 'Кликеры'},
                    {'code': 'walk.multiboxes', 'name': 'Мультибоксы'},
                    {'code': 'walk.muzzles', 'name': 'Намордники'},
                    {'code': 'walk.lights', 'name': 'Подсветки'},
                    {'code': 'walk.retractable', 'name': 'Рулетки'},
                    {'code': 'walk.bandanas', 'name': 'Банданы'},
                    {'code': 'walk.popons', 'name': 'Попоны'},
                    {'code': 'walk.accessories', 'name': 'Аксессуары'},
                ],
            },
            {
                'code': 'clothing',
                'name': 'Одежда и обувь',
                'icon': '👕',
                'children': [
                    {'code': 'clothing.general', 'name': 'Одежда'},
                    {'code': 'clothing.jumpsuits', 'name': 'Комбинезоны'},
                    {'code': 'clothing.raincoats', 'name': 'Дождевики'},
                    {'code': 'clothing.vests', 'name': 'Жилетки'},
                    {'code': 'clothing.popons', 'name': 'Попоны'},
                    {'code': 'clothing.jackets', 'name': 'Куртки'},
                    {'code': 'clothing.sweaters', 'name': 'Свитера'},
                    {'code': 'clothing.hats', 'name': 'Шапки'},
                    {'code': 'clothing.socks', 'name': 'Носки'},
                    {'code': 'clothing.shoes', 'name': 'Ботинки'},
                    {'code': 'clothing.tshirts', 'name': 'Футболки'},
                    {'code': 'clothing.tops', 'name': 'Майки'},
                    {'code': 'clothing.suits', 'name': 'Костюмы'},
                    {'code': 'clothing.hoodies', 'name': 'Толстовки'},
                    {'code': 'clothing.dresses', 'name': 'Платья'},
                    {'code': 'clothing.accessories', 'name': 'Аксессуары'},
                ],
            },
            {
                'code': 'care',
                'name': 'Уход и гигиена',
                'icon': '🧴',
                'children': [
                    {'code': 'care.grooming', 'name': 'Груминг'},
                    {'code': 'care.shampoos', 'name': 'Шампуни'},
                    {'code': 'care.conditioners', 'name': 'Кондиционеры'},
                    {'code': 'care.sprays', 'name': 'Спреи'},
                    {'code': 'care.lotions', 'name': 'Лосьоны'},
                    {'code': 'care.gels', 'name': 'Гели'},
                    {'code': 'care.waxes', 'name': 'Воски'},
                    {'code': 'care.perfumes', 'name': 'Парфюмерия'},
                    {'code': 'care.oils', 'name': 'Масла'},
                    {'code': 'care.masks', 'name': 'Маски'},
                    {'code': 'care.serums', 'name': 'Сыворотки'},
                    {'code': 'care.creams', 'name': 'Крема'},
                    {'code': 'care.foams', 'name': 'Пены'},
                    {'code': 'care.mousses', 'name': 'Муссы'},
                    {'code': 'care.tonics', 'name': 'Тоники'},
                    {'code': 'care.balms', 'name': 'Бальзамы'},
                    {'code': 'care.deodorants', 'name': 'Дезодоранты'},
                    {'code': 'care.wipes', 'name': 'Салфетки'},
                    {'code': 'care.soap', 'name': 'Мыло'},
                    {'code': 'care.liquids', 'name': 'Жидкости'},
                    {'code': 'care.drops', 'name': 'Капли'},
                    {'code': 'care.dental_pastes', 'name': 'Зубные пасты'},
                    {'code': 'care.dental_brushes', 'name': 'Зубные щетки'},
                    {'code': 'care.claw_clippers', 'name': 'Когтерезы'},
                    {'code': 'care.claw_grinders', 'name': 'Гриндеры'},
                    {'code': 'care.claw_files', 'name': 'Пилочки'},
                    {'code': 'care.brushes', 'name': 'Щетки'},
                    {'code': 'care.combs', 'name': 'Расчески'},
                    {'code': 'care.slickers', 'name': 'Пуходерки'},
                    {'code': 'care.scissors', 'name': 'Ножницы'},
                    {'code': 'care.rollers', 'name': 'Ролики'},
                    {'code': 'care.scrapers', 'name': 'Скребки'},
                    {'code': 'care.tweezers', 'name': 'Пинцеты'},
                    {'code': 'care.powders', 'name': 'Пудры'},
                    {'code': 'care.massagers', 'name': 'Массажеры'},
                    {'code': 'care.furminators', 'name': 'Фурминаторы'},
                    {'code': 'care.clippers', 'name': 'Машинки для стрижки'},
                    {'code': 'care.trimmers', 'name': 'Триммеры'},
                    {'code': 'care.detanglers', 'name': 'Колотунорезы'},
                    {'code': 'care.towels', 'name': 'Полотенца'},
                    {'code': 'care.paw_washers', 'name': 'Лапомойки'},
                    {'code': 'care.protective_collars', 'name': 'Защитные воротники'},
                    {'code': 'care.misc', 'name': 'Техничка и аксессуары'},
                ],
            },
            {
                'code': 'housing',
                'name': 'Дом и транспорт',
                'icon': '🏠',
                'children': [
                    {'code': 'housing.kennels', 'name': 'Будки'},
                    {'code': 'housing.enclosures', 'name': 'Вольеры'},
                    {'code': 'housing.houses', 'name': 'Домики'},
                    {'code': 'housing.cages', 'name': 'Клетки'},
                    {'code': 'housing.partitions', 'name': 'Перегородки'},
                    {'code': 'housing.bags', 'name': 'Сумки'},
                    {'code': 'housing.beds', 'name': 'Лежанки'},
                    {'code': 'housing.carriers', 'name': 'Переноски'},
                    {'code': 'housing.containers', 'name': 'Контейнеры'},
                    {'code': 'housing.doors', 'name': 'Дверцы'},
                    {'code': 'housing.grates', 'name': 'Решетки'},
                    {'code': 'housing.wheels_carriers', 'name': 'Колеса для переносок'},
                    {'code': 'housing.wheels_cages', 'name': 'Колеса для клеток'},
                    {'code': 'housing.trays', 'name': 'Поддоны'},
                    {'code': 'housing.carts', 'name': 'Тележки'},
                    {'code': 'housing.strollers', 'name': 'Коляски'},
                    {'code': 'housing.hammocks', 'name': 'Гамаки'},
                    {'code': 'housing.bedding', 'name': 'Подстилки'},
                    {'code': 'housing.mattresses', 'name': 'Матрасы'},
                    {'code': 'housing.blankets', 'name': 'Пледы'},
                    {'code': 'housing.pillows', 'name': 'Подушки'},
                    {'code': 'housing.mats', 'name': 'Коврики'},
                    {'code': 'housing.ramps', 'name': 'Пандусы'},
                    {'code': 'housing.stairs', 'name': 'Лестницы'},
                    {'code': 'housing.carrier_straps', 'name': 'Ремни для переносок'},
                    {'code': 'housing.safety_belts', 'name': 'Ремни безопасности'},
                    {'code': 'housing.accessories', 'name': 'Аксессуары для содержания'},
                ],
            },
            {
                'code': 'behavior',
                'name': 'Контроль поведения',
                'icon': '🎯',
                'children': [],
            },
            {
                'code': 'misc',
                'name': 'Прочее',
                'icon': '📎',
                'children': [
                    {'code': 'misc.documents', 'name': 'Документы и паспорта'},
                ],
            },
        ]
        
        def _normalize(value):
            return ''.join([ch for ch in str(value or '').lower().replace('ё', 'е') if ch.isalnum()])
        
        def _match_category(candidates, aliases):
            normalized_aliases = [_normalize(a) for a in aliases if a]
            matches = []
            for cat in candidates:
                key_name = _normalize(cat.name)
                key_slug = _normalize(cat.slug)
                key_code = _normalize(getattr(cat, 'code', '') or '')
                if any(a and (a in key_name or a in key_slug or (key_code and a in key_code)) for a in normalized_aliases):
                    matches.append(cat)
            if not matches:
                return None
            return sorted(matches, key=lambda c: c.product_count or 0, reverse=True)[0]
        
        PARENT_ALIASES = {
            'food': ['food', 'питание', 'корм'],
            'health': ['health', 'ветаптек'],
            'toilet': ['toilet', 'туалет', 'наполнител'],
            'feeding': ['feeding', 'мис', 'поил'],
            'toys': ['toys', 'игрушк', 'когтеточ', 'тоннел', 'площадк'],
            'walk': ['walk', 'амуниц', 'ошейн', 'повод', 'шлейк', 'наморд', 'рулет'],
            'clothing': ['clothing', 'одежд', 'комбинезон', 'куртк', 'свитер', 'ботин', 'футбол', 'толстов', 'плать'],
            'care': ['care', 'уход', 'груминг', 'шампун', 'космет'],
            'housing': ['housing', 'транспорт', 'переноск', 'домик', 'лежанк', 'клетк', 'вольер', 'будк'],
            'behavior': ['behavior', 'контроль', 'поведен'],
            'misc': ['misc', 'прочее', 'документ', 'паспорт'],
        }
        
        CHILD_ALIASES = {
            'food.dry': ['сухой'],
            'food.wet': ['влажн'],
            'food.semi_moist': ['полувлажн'],
            'food.canned': ['консерв'],
            'food.pouches': ['пауч'],
            'food.pate': ['пашт'],
            'food.holistic': ['холистик'],
            'food.diet': ['диет'],
            'food.hypoallergenic': ['гипоаллер'],
            'food.treats': ['лакомств'],
            'food.supplements': ['витамин', 'добавк'],
            'food.lifestage.kitten': ['котен', 'котён', 'котенка', 'котёнка'],
            'food.lifestage.puppy': ['щен', 'щенка'],
            'health.parasite': ['паразит'],
            'toilet.litter': ['наполнител'],
            'toilet.litter_boxes': ['лоток'],
            'toilet.litter_boxes_auto': ['автоматическ'],
            'toilet.bio_toilets': ['биотуалет'],
            'toilet.waste_bags': ['пакет', 'выгул'],
            'toilet.pads': ['пеленк', 'пелёнк'],
            'toilet.diapers': ['подгузн'],
            'toilet.scoops': ['совоч'],
            'feeding.bowls': ['мис'],
            'feeding.drinkers': ['поил'],
            'feeding.bottles': ['бутылоч'],
            'toys.toys': ['игрушк'],
            'toys.scratching_posts': ['когтеточ'],
            'toys.playgrounds': ['площадк'],
            'toys.tunnels': ['тоннел'],
            'walk.collars': ['ошейн'],
            'walk.leashes': ['повод'],
            'walk.harnesses': ['шлейк'],
            'walk.belts': ['пояс'],
            'walk.tags': ['адресн'],
            'walk.carabiners': ['карабин'],
            'walk.clickers': ['кликер'],
            'walk.multiboxes': ['мультибокс'],
            'walk.muzzles': ['наморд'],
            'walk.lights': ['подсвет'],
            'walk.retractable': ['рулет'],
            'walk.bandanas': ['бандан'],
            'walk.popons': ['попон'],
            'walk.accessories': ['аксессуар', 'косынк'],
            'clothing.general': ['одежд'],
            'clothing.jumpsuits': ['комбинезон'],
            'clothing.raincoats': ['дождевик'],
            'clothing.vests': ['жилет'],
            'clothing.popons': ['попон'],
            'clothing.jackets': ['куртк'],
            'clothing.sweaters': ['свитер'],
            'clothing.hats': ['шапк'],
            'clothing.socks': ['носк'],
            'clothing.shoes': ['ботин'],
            'clothing.tshirts': ['футбол'],
            'clothing.tops': ['майк'],
            'clothing.suits': ['костюм'],
            'clothing.hoodies': ['толстов'],
            'clothing.dresses': ['плать'],
            'clothing.accessories': ['аксессуар'],
            'care.grooming': ['груминг'],
            'care.shampoos': ['шампун'],
            'care.conditioners': ['кондицион'],
            'care.sprays': ['спрей'],
            'care.lotions': ['лосьон'],
            'care.gels': ['гел'],
            'care.waxes': ['воск'],
            'care.perfumes': ['парфюм'],
            'care.oils': ['масл'],
            'care.masks': ['маск'],
            'care.serums': ['сыворот'],
            'care.creams': ['крем'],
            'care.foams': ['пен'],
            'care.mousses': ['мусс'],
            'care.tonics': ['тоник'],
            'care.balms': ['бальзам'],
            'care.deodorants': ['дезодорант'],
            'care.wipes': ['салфет'],
            'care.soap': ['мыло'],
            'care.liquids': ['жидкост'],
            'care.drops': ['капл'],
            'care.dental_pastes': ['зубн', 'паст'],
            'care.dental_brushes': ['щетк', 'зубн'],
            'care.claw_clippers': ['когтерез'],
            'care.claw_grinders': ['гриндер'],
            'care.claw_files': ['пилочк'],
            'care.brushes': ['щетк'],
            'care.combs': ['расческ'],
            'care.slickers': ['пуходерк'],
            'care.scissors': ['ножниц'],
            'care.rollers': ['ролик'],
            'care.scrapers': ['скреб'],
            'care.tweezers': ['пинцет'],
            'care.powders': ['пудр'],
            'care.massagers': ['массаж'],
            'care.furminators': ['фурмин'],
            'care.clippers': ['машинк'],
            'care.trimmers': ['триммер'],
            'care.detanglers': ['колотун'],
            'care.towels': ['полотен'],
            'care.paw_washers': ['лапомойк'],
            'care.protective_collars': ['воротник'],
            'care.misc': ['техничк'],
            'housing.kennels': ['будк'],
            'housing.enclosures': ['вольер'],
            'housing.houses': ['домик'],
            'housing.cages': ['клетк'],
            'housing.partitions': ['перегород'],
            'housing.bags': ['сумк'],
            'housing.beds': ['лежанк'],
            'housing.carriers': ['переноск'],
            'housing.containers': ['контейнер'],
            'housing.doors': ['дверц'],
            'housing.grates': ['решет'],
            'housing.wheels_carriers': ['колес'],
            'housing.wheels_cages': ['колес'],
            'housing.trays': ['поддон'],
            'housing.carts': ['тележк'],
            'housing.strollers': ['коляск'],
            'housing.hammocks': ['гамак'],
            'housing.bedding': ['подстил'],
            'housing.mattresses': ['матрас'],
            'housing.blankets': ['плед'],
            'housing.pillows': ['подушк'],
            'housing.mats': ['коврик'],
            'housing.ramps': ['пандус'],
            'housing.stairs': ['лестниц'],
            'housing.carrier_straps': ['ремн'],
            'housing.safety_belts': ['ремн'],
            'housing.accessories': ['аксессуар'],
            'misc.documents': ['документ', 'паспорт'],
        }
        
        all_categories = list(
            ShopCategory.objects.filter(is_active=True).order_by('name')
        )
        category_counts = dict(
            filter_query.values('new_category_id')
            .annotate(count=Count('id'))
            .values_list('new_category_id', 'count')
        )

        def _count_for(cat):
            if not cat:
                return 0
            return category_counts.get(cat.id, 0)

        def _code_for(cat):
            return cat.code or CATEGORY_CODE_MAPPING.get(cat.kotmatros_category_id)

        def _normalize_code(code):
            if not code:
                return None
            if code.endswith('.dog') or code.endswith('.cat'):
                return code.rsplit('.', 1)[0]
            return code

        hierarchical_categories = []
        for spec in CATEGORY_SPEC:
            spec_children_by_code = {
                child['code']: child['name'] for child in spec.get('children', [])
            }
            allowed_child_codes = set(spec_children_by_code.keys())
            children_by_code = {}
            parent_count = 0
            for cat in all_categories:
                code = _normalize_code(_code_for(cat))
                if not code:
                    continue
                if code == spec['code'] or code.startswith(f"{spec['code']}."):
                    count = _count_for(cat)
                    parent_count += count
                    if code.startswith(f"{spec['code']}.") and count > 0:
                        if code not in allowed_child_codes:
                            continue
                        entry = children_by_code.setdefault(code, {
                            'id': cat.id,
                            'name': spec_children_by_code.get(code, cat.name),
                            'slug': cat.slug,
                            'code': code,
                            'product_count': 0
                        })
                        entry['product_count'] += count

            children = list(children_by_code.values())
            children.sort(key=lambda item: (-item['product_count'], item['name']))
            if parent_count <= 0:
                continue
            if children:
                children.insert(0, {
                    'id': f'{spec["code"]}-all',
                    'name': 'Все',
                    'slug': '',
                    'code': spec['code'],
                    'product_count': parent_count
                })
            hierarchical_categories.append({
                'id': spec['code'],
                'external_id': None,
                'name': spec['name'],
                'slug': '',
                'code': spec['code'],
                'icon': spec.get('icon'),
                'product_count': parent_count,
                'children': children
            })
        
        new_categories = [
            {'id': c['id'], 'name': c['name'], 'slug': c['slug'], 'product_count': c['product_count']}
            for c in hierarchical_categories
        ]
        
        # Бренды из новой структуры
        brand_source = brand_query or filter_query
        brands = list(
            brand_source.values('brand_id', 'brand__name', 'brand__slug', 'brand__brand_class')
            .annotate(product_count=Count('id'))
            .filter(brand_id__isnull=False)
            .order_by('-product_count')[:30]
        )
        brands = [
            {
                'id': b['brand_id'],
                'name': b['brand__name'],
                'slug': b['brand__slug'],
                'brand_class': b['brand__brand_class'],
                'product_count': b['product_count']
            }
            for b in brands
        ]
        
        # Группы товаров с подсчётом
        product_groups = list(
            filter_query.values('product_group')
            .annotate(count=Count('id'))
            .filter(product_group__isnull=False)
            .order_by('-count')
        )
        
        # Возрастные группы
        age_groups = [
            {'value': 'puppy', 'label': 'Щенок'},
            {'value': 'kitten', 'label': 'Котёнок'},
            {'value': 'adult', 'label': 'Взрослый'},
            {'value': 'senior', 'label': 'Пожилой'},
            {'value': 'all', 'label': 'Все возрасты'},
        ]
        
        # Размерные группы
        size_groups = [
            {'value': 'mini', 'label': 'Миниатюрный'},
            {'value': 'small', 'label': 'Маленький'},
            {'value': 'medium', 'label': 'Средний'},
            {'value': 'large', 'label': 'Крупный'},
            {'value': 'giant', 'label': 'Гигантский'},
            {'value': 'all', 'label': 'Все размеры'},
        ]
        
        # Подсчёт товаров с boolean-фильтрами
        boolean_counts = filter_query.filter(product_group='food').aggregate(
            grain_free=Count('id', filter=Q(is_grain_free=True)),
            hypoallergenic=Count('id', filter=Q(is_hypoallergenic=True)),
            veterinary=Count('id', filter=Q(is_veterinary=True)),
        )
        
        return {
            'animals': [
                {'value': 'dog', 'label': 'Для собак'},
                {'value': 'cat', 'label': 'Для кошек'},
            ],
            'price_range': {
                'min': float(aggregations['min_price']) if aggregations['min_price'] else 0,
                'max': float(aggregations['max_price']) if aggregations['max_price'] else 0,
            },
            'new_categories': new_categories,
            'hierarchical_categories': hierarchical_categories,
            'brands': brands,
            'product_groups': product_groups,
            'age_groups': age_groups,
            'size_groups': size_groups,
            'boolean_filters': {
                'grain_free': boolean_counts['grain_free'],
                'hypoallergenic': boolean_counts['hypoallergenic'],
                'veterinary': boolean_counts['veterinary'],
            },
        }
    
    def _get_user_pets(self, user):
        """Получение питомцев пользователя для персональных подборок."""
        from apps.pets.models import Pet
        try:
            pets = Pet.objects.filter(owner=user).only('id', 'name', 'species')
            return [
                {
                    'id': str(pet.id),
                    'name': pet.name,
                    'species': pet.species,
                    'species_label': pet.get_species_display(),
                }
                for pet in pets
            ]
        except Exception as e:
            logger.warning(f"Ошибка при получении питомцев пользователя {user.email}: {e}")
            return []


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
        items = cart.get_items_optimized().order_by('id')
        
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
        """Добавление товара в корзину с поддержкой SKU."""
        product_id = data['product_id']
        sku_id = data.get('sku_id')
        quantity = data.get('quantity', 1)

        # Проверка существования товара
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка SKU если указан
        sku = None
        if sku_id:
            try:
                sku = ProductSKU.objects.get(id=sku_id, product=product)
            except ProductSKU.DoesNotExist:
                return Response(
                    {'error': 'Вариация товара не найдена или не принадлежит этому товару'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Проверка доступности SKU
            if not sku.available:
                return Response(
                    {'error': f'Вариация "{sku.name}" недоступна'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            available_stock = sku.stock_quantity if sku.stock_quantity and sku.stock_quantity > 0 else UNLIMITED_STOCK_THRESHOLD
        else:
            # Если SKU не указан, проверяем доступность товара в целом
            is_product_available = product.is_available
            if not is_product_available:
                return Response(
                    {'error': 'Товар закончился на складе'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Если у товара есть SKU, но он не указан - берём default или первый доступный
            default_sku = product.skus.filter(is_default=True, available=True, status=1).first()
            if not default_sku:
                default_sku = product.skus.filter(available=True, status=1).order_by('sort_order').first()
            
            if default_sku:
                sku = default_sku
                available_stock = sku.stock_quantity if sku.stock_quantity and sku.stock_quantity > 0 else UNLIMITED_STOCK_THRESHOLD
            else:
                available_stock = UNLIMITED_STOCK_THRESHOLD

        # Проверка текущего количества в корзине
        existing_item = CartItem.objects.filter(cart=cart, product=product, sku=sku).first()
        current_quantity = existing_item.quantity if existing_item else 0
        new_total_quantity = current_quantity + quantity

        # Проверка, что запрашиваемое количество доступно
        if new_total_quantity > available_stock:
            return Response({
                'error': f'Недостаточно товара на складе. Доступно: {available_stock} шт., в корзине уже: {current_quantity} шт.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Добавление или обновление количества
        if existing_item:
            existing_item.quantity = new_total_quantity
            existing_item.save()
        else:
            CartItem.objects.create(cart=cart, product=product, sku=sku, quantity=quantity)

        # Возврат обновлённой корзины в правильной структуре
        items = cart.get_items_optimized().order_by('id')

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
        items = cart.get_items_optimized()

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
        items = cart.get_items_optimized()

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
        items = cart.get_items_optimized().order_by('id')

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
            sku = item.sku
            items_detail.append({
                'product_id': product.id,
                'product_name': product.name,
                'product_image': Product._fix_image_url(product.main_image),
                'brand': product.brand.name if product.brand else None,
                'price': float(product.price),
                'quantity': item.quantity,
                'item_total': float(item.get_total()),
                'weight': float(sku.weight_kg) if sku and sku.weight_kg else None,
                'weight_display': sku.weight_display if sku else None,
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
                'cost': float(DELIVERY_COSTS['standard']),
                'days': '3-5 дней',
                'description': 'Доставка в пункт выдачи или курьером'
            },
            {
                'type': 'express',
                'name': 'Экспресс доставка',
                'cost': float(DELIVERY_COSTS['express']),
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
            
            for item in cart_items:
                product = products.get(item.product_id)
                if not product or not product.is_available:
                    unavailable_items.append(item.product.name if item.product else f'ID {item.product_id}')
            
            # Возврат ошибок валидации
            from core.exceptions import ApiError
            if unavailable_items:
                raise ApiError.bad_request(
                    'Некоторые товары больше недоступны',
                    errors={'unavailable_items': unavailable_items},
                    error_code='UNAVAILABLE_ITEMS'
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
            
            # Устанавливаем время истечения оплаты
            from django.utils import timezone
            expires_at = timezone.now() + timedelta(minutes=RESERVATION_TIMEOUT_MINUTES)
            
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
                    # Сохраняем цену
                    item_price = product.price

                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        product_name=product.name,
                        price=item_price,
                        quantity=item.quantity
                    )

                    # Наличие управляется отдельными SKU/складом

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
            per_page = min(MAX_PAGE_SIZE, max(1, int(request.query_params.get('per_page', DEFAULT_PAGE_SIZE))))
        except ValueError:
            page = 1
            per_page = DEFAULT_PAGE_SIZE
        
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
            PaymentService.process_payment(payment)

            # Если дошли сюда - платеж и активация заказа прошли успешно
            # Перезагружаем заказ из базы, чтобы получить актуальный статус после обработки платежа
            order.refresh_from_db()
            return Response({
                'message': 'Оплата успешно подтверждена',
                'order': order.to_dict(),
                'payment_id': str(payment.id)
            }, status=status.HTTP_200_OK)

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
            {'type': 'standard', 'cost': float(DELIVERY_COSTS['standard']), 'name': 'Стандартная доставка'},
            {'type': 'express', 'cost': float(DELIVERY_COSTS['express']), 'name': 'Экспресс доставка'},
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
            for item in product_items:
                OrderItem.objects.create(
                    order=order,
                    product=item.product,
                    product_name=item.product.name,
                    price=item.product.price,
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
        try:
            result = RecommendationEngine.get_frequently_bought_together(
                product_id=product_id,
                limit=limit,
                user=user
            )
        except Exception:
            logger.exception(
                "Frequently bought together failed",
                extra={"product_id": product_id}
            )
            return Response({
                'product': product.to_dict(),
                'recommendations': [],
                'total_analyzed_orders': 0,
                'has_purchase_data': False,
                'error': 'recommendations_unavailable'
            })
        
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


# =============================================================================
# АНАЛИТИКА И КОНСТРУКТОР ГРАФИКОВ
# =============================================================================

class AnalyticMetricsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для работы с метриками аналитики.

    Предоставляет доступ к списку доступных метрик с фильтрацией и поиском.
    """

    permission_classes = []  # [IsAdminUser]
    serializer_class = None  # Будет установлен в get_serializer_class
    pagination_class = None  # StandardResultsSetPagination

    def get_queryset(self):
        """Получить queryset с фильтрами."""
        from .models import AnalyticMetric
        queryset = AnalyticMetric.objects.filter(is_active=True)

        # Фильтр по категории
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # Поиск по имени и описанию
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        return queryset.order_by('category', 'name')

    def get_serializer_class(self):
        """Выбрать подходящий сериализатор."""
        from .serializers import MetricListSerializer, AnalyticMetricSerializer
        if self.action == 'list':
            return MetricListSerializer
        return AnalyticMetricSerializer

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Получить список доступных категорий метрик."""
        from .models import AnalyticMetric
        categories = AnalyticMetric.objects.filter(
            is_active=True
        ).values_list('category', flat=True).distinct()

        # Получить количество метрик в каждой категории
        result = []
        for category in categories:
            count = AnalyticMetric.objects.filter(
                category=category, is_active=True
            ).count()
            result.append({
                'name': category,
                'count': count,
            })

        return Response(result)


class ChartConstructorViewSet(viewsets.ViewSet):
    """
    ViewSet для конструктора графиков.

    Обрабатывает создание и получение данных графиков.
    """

    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['post'])
    def data(self, request):
        """Получить данные для графика."""
        serializer = None  # ChartDataRequestSerializer(data=request.data)
        # if not serializer.is_valid():
        #     return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        config = request.data.get('config', {})
        data_limit = request.data.get('data_limit', 10000)

        # Добавить лимит в конфигурацию
        config['limit'] = data_limit

        service = AnalyticsDataService()
        result = service.get_chart_data(config, request.user)

        return Response(result)


class ChartConfigViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления конфигурациями графиков.
    """

    permission_classes = [IsAdminUser]
    serializer_class = None  # ChartConfigSerializer

    def get_queryset(self):
        """Получить queryset конфигураций."""
        from .models import ChartConfig
        return ChartConfig.objects.filter(created_by=self.request.user)

    def get_serializer_class(self):
        """Выбрать сериализатор в зависимости от действия."""
        from .serializers import ChartConfigSerializer, ChartConfigCreateSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return ChartConfigCreateSerializer
        return ChartConfigSerializer

    def perform_create(self, serializer):
        """Создать конфигурацию с автором."""
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Получить доступные шаблоны графиков."""
        from .models import ChartConfig
        templates = ChartConfig.objects.filter(
            Q(is_template=True) & (Q(is_public=True) | Q(created_by=request.user))
        ).order_by('-usage_count')

        serializer = None  # ChartTemplateSerializer(templates, many=True)
        return Response({'templates': []})  # serializer.data

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Создать копию конфигурации."""
        config = self.get_object()
        new_config = config.create_version(request.user)

        serializer = self.get_serializer(new_config)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChartSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления сессиями конструктора графиков.
    """

    permission_classes = [IsAdminUser]
    serializer_class = None  # ChartSessionSerializer

    def get_queryset(self):
        """Получить сессии пользователя."""
        from .models import ChartSession
        return ChartSession.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Создать сессию с пользователем."""
        from datetime import timedelta
        expires_at = timezone.now() + timedelta(hours=2)  # 2 часа
        serializer.save(user=self.request.user, expires_at=expires_at)


class AnalyticsLogsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для просмотра логов аналитики.
    """

    permission_classes = [IsAdminUser]
    serializer_class = None  # AnalyticsLogSerializer

    def get_queryset(self):
        """Получить логи с фильтрами."""
        from .models import AnalyticsLog
        queryset = AnalyticsLog.objects.all()

        # Фильтры
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)

        user = self.request.query_params.get('user')
        if user:
            queryset = queryset.filter(user_id=user)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)

        return queryset.order_by('-timestamp')


# =============================================================================
# СЛУЖЕБНЫЕ ЭНДПОИНТЫ АНАЛИТИКИ
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAdminUser])
def initialize_metrics(request):
    """
    Инициализировать стандартные метрики аналитики.

    POST /api/shop/analytics/initialize-metrics/
    """
    try:
        count = AnalyticsMetricsInitializer.initialize_default_metrics()
        return Response({
            'message': f'Инициализировано {count} метрик',
            'metrics_created': count
        })
    except Exception as e:
        logger.error(f"Error initializing metrics: {e}")
        return Response(
            {'error': 'Ошибка инициализации метрик'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def analytics_health_check(request):
    """
    Health check для аналитики.

    POST /api/shop/analytics/health-check/
    """
    try:
        from .models import AnalyticMetric
        metrics_count = AnalyticMetric.objects.filter(is_active=True).count()

        return Response({
            'status': 'healthy',
            'metrics_count': metrics_count,
            'timestamp': timezone.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Analytics health check failed: {e}")
        return Response({
            'status': 'unhealthy',
            'error': str(e)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def clear_analytics_cache(request):
    """
    Очистить кэш аналитики.

    POST /api/shop/analytics/clear-cache/
    """
    try:
        from django.core.cache import cache
        cache.clear()

        return Response({'message': 'Кэш аналитики очищен'})
    except Exception as e:
        logger.error(f"Error clearing analytics cache: {e}")
        return Response(
            {'error': 'Ошибка очистки кэша'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =============================================================================
# НОВЫЕ VIEWS ПО database_tz.md
# =============================================================================

from .models import Category, Brand, ProductSKU, ProductBreedRecommendation
from .serializers import (
    CategorySerializer, CategoryListSerializer, CategoryTreeSerializer,
    BrandSerializer, BrandListSerializer,
    ProductCatalogSerializer, ProductDetailSerializer,
    ProductSKUSerializer, ProductBreedRecommendationSerializer
)


class CategoryListView(APIView):
    """
    Список категорий.
    
    GET /api/shop/categories/
    
    Параметры:
        animal_type: dog | cat | all
        product_group: food | treats | vet | vitamins | etc.
        depth: 0 | 1 | 2 (глубина в иерархии)
        tree: true (вернуть в виде дерева для меню)
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        animal_type = request.query_params.get('animal_type')
        product_group = request.query_params.get('product_group')
        depth = request.query_params.get('depth')
        as_tree = request.query_params.get('tree') == 'true'
        
        categories = Category.objects.filter(is_active=True)
        
        if animal_type:
            categories = categories.filter(animal_type__in=[animal_type, 'all'])
        
        if product_group:
            categories = categories.filter(product_group=product_group)
        
        if depth is not None:
            try:
                categories = categories.filter(depth=int(depth))
            except ValueError:
                pass
        
        categories = categories.order_by('sort_order', 'name')
        
        if as_tree:
            # Возвращаем только корневые категории, children загрузятся рекурсивно
            root_categories = categories.filter(depth=0)
            serializer = CategoryTreeSerializer(root_categories, many=True)
        else:
            serializer = CategoryListSerializer(categories, many=True)
        
        return Response(serializer.data)


class CategoryDetailView(APIView):
    """
    Детали категории.
    
    GET /api/shop/categories/{slug}/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, slug):
        try:
            category = Category.objects.prefetch_related('children').get(
                slug=slug, is_active=True
            )
        except Category.DoesNotExist:
            return Response(
                {'error': 'Категория не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = CategorySerializer(category)
        return Response(serializer.data)


class BrandListView(APIView):
    """
    Список брендов.
    
    GET /api/shop/brands/
    
    Параметры:
        brand_class: economy | premium | super_premium | holistic
        search: поиск по названию
        limit: количество (по умолчанию 50)
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        brand_class = request.query_params.get('brand_class')
        search = request.query_params.get('search')
        limit = min(100, int(request.query_params.get('limit', 50)))
        
        brands = Brand.objects.filter(is_active=True)
        
        if brand_class:
            brands = brands.filter(brand_class=brand_class)
        
        if search:
            brands = brands.filter(name__icontains=search)
        
        brands = brands.order_by('-priority', 'name')[:limit]
        
        serializer = BrandListSerializer(brands, many=True)
        return Response(serializer.data)


class BrandDetailView(APIView):
    """
    Детали бренда.
    
    GET /api/shop/brands/{slug}/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, slug):
        try:
            brand = Brand.objects.get(slug=slug, is_active=True)
        except Brand.DoesNotExist:
            return Response(
                {'error': 'Бренд не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = BrandSerializer(brand)
        return Response(serializer.data)


class ProductListViewV2(APIView):
    """
    Каталог товаров (v2 с новой структурой).
    
    GET /api/shop/v2/products/
    
    Параметры фильтрации:
        animal_type: dog | cat | all
        category_id: ID категории (поддерживает иерархию)
        category_slug: slug категории
        product_group: food | treats | vet | vitamins | etc.
        brand_id: ID бренда
        brand_slug: slug бренда
        
        age_group: puppy | kitten | adult | senior | all
        size_group: mini | small | medium | large | giant | all
        
        is_grain_free: true | false
        is_hypoallergenic: true | false
        is_veterinary: true | false
        
        min_price: минимальная цена
        max_price: максимальная цена
        in_stock: true | false
        
        search: поиск по названию
        
    Сортировка:
        sort: rating | popularity | price_asc | price_desc | newest
        
    Пагинация:
        page: номер страницы
        per_page: товаров на странице (макс 100)
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        from django.db.models import Q
        
        # Пагинация
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            per_page = min(MAX_PAGE_SIZE, max(1, int(request.query_params.get('per_page', DEFAULT_PAGE_SIZE))))
        except ValueError:
            page = 1
            per_page = DEFAULT_PAGE_SIZE
        
        # Базовый queryset
        products = Product.objects.filter(
            status=1,
            is_available=True
        ).select_related('brand', 'new_category')
        
        # === ФИЛЬТРЫ ===
        
        # По типу животного
        animal_type = request.query_params.get('animal_type')
        if animal_type:
            products = products.filter(animal_type__in=[animal_type, 'all'])
        
        # По категории (с поддержкой иерархии)
        category_id = request.query_params.get('category_id')
        category_slug = request.query_params.get('category_slug')
        
        if category_slug:
            try:
                cat = Category.objects.get(slug=category_slug, is_active=True)
                # Включаем товары из подкатегорий
                products = products.filter(
                    Q(new_category=cat) | 
                    Q(new_category__path__contains=[cat.kotmatros_category_id])
                )
            except Category.DoesNotExist:
                pass
        elif category_id:
            try:
                cat = Category.objects.get(id=category_id, is_active=True)
                products = products.filter(
                    Q(new_category=cat) | 
                    Q(new_category__path__contains=[cat.kotmatros_category_id])
                )
            except Category.DoesNotExist:
                pass
        
        # По группе товаров
        product_group = request.query_params.get('product_group')
        if product_group:
            products = products.filter(product_group=product_group)
        
        # По бренду
        brand_id = request.query_params.get('brand_id')
        brand_slug = request.query_params.get('brand_slug')
        
        if brand_slug:
            products = products.filter(brand__slug=brand_slug)
        elif brand_id:
            products = products.filter(brand_id=brand_id)
        
        # По возрастной группе
        age_group = request.query_params.get('age_group')
        if age_group and age_group != 'all':
            products = products.filter(age_group__in=[age_group, 'all', None])
        
        # По размерной группе
        size_group = request.query_params.get('size_group')
        if size_group and size_group != 'all':
            products = products.filter(size_group__in=[size_group, 'all', None])
        
        # Boolean фильтры
        if request.query_params.get('is_grain_free') == 'true':
            products = products.filter(is_grain_free=True)
        
        if request.query_params.get('is_hypoallergenic') == 'true':
            products = products.filter(is_hypoallergenic=True)
        
        if request.query_params.get('is_veterinary') == 'true':
            products = products.filter(is_veterinary=True)
        
        # По цене
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        try:
            if min_price:
                products = products.filter(price__gte=float(min_price))
            if max_price:
                products = products.filter(price__lte=float(max_price))
        except ValueError:
            pass
        
        # Поиск
        search = request.query_params.get('search')
        if search:
            products = products.filter(
                Q(name__icontains=search) |
                Q(short_description__icontains=search) |
                Q(brand__name__icontains=search)
            )
        
        # === СОРТИРОВКА ===
        sort = request.query_params.get('sort', 'newest')
        if sort == 'rating':
            products = products.order_by('-rating', '-rating_count')
        elif sort == 'popularity':
            products = products.order_by('-order_count')
        elif sort == 'price_asc':
            products = products.order_by('price')
        elif sort == 'price_desc':
            products = products.order_by('-price')
        else:  # newest
            products = products.order_by('-id')
        
        # === ПАГИНАЦИЯ ===
        total_count = products.count()
        offset = (page - 1) * per_page
        products_page = products[offset:offset + per_page]
        
        # Сериализация
        serializer = ProductCatalogSerializer(products_page, many=True)
        
        return Response({
            'products': serializer.data,
            'pagination': {
                'total': total_count,
                'page': page,
                'per_page': per_page,
                'total_pages': (total_count + per_page - 1) // per_page if total_count > 0 else 0
            }
        })


class ProductDetailViewV2(APIView):
    """
    Детали товара (v2 с новой структурой).
    
    GET /api/shop/v2/products/{id}/
    GET /api/shop/v2/products/by-slug/{slug}/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, product_id=None, slug=None):
        try:
            if slug:
                product = Product.objects.select_related(
                    'brand', 'new_category'
                ).prefetch_related('skus').get(slug=slug, status=1)
            else:
                product = Product.objects.select_related(
                    'brand', 'new_category'
                ).prefetch_related('skus').get(id=product_id, status=1)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ProductDetailSerializer(product)
        return Response(serializer.data)


class ProductBreedRecommendationsView(APIView):
    """
    Рекомендации товара для пород.
    
    GET /api/shop/products/{id}/breed-recommendations/
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
        
        # Получаем сохранённые рекомендации
        recommendations = ProductBreedRecommendation.objects.filter(
            product=product
        ).select_related('breed').order_by('-score')[:20]
        
        serializer = ProductBreedRecommendationSerializer(recommendations, many=True)
        return Response({
            'product_id': product_id,
            'recommendations': serializer.data
        })


class ProductsForBreedView(APIView):
    """
    Товары, подходящие для породы.
    
    GET /api/shop/breeds/{breed_id}/products/
    
    Параметры:
        product_group: food | treats | vitamins (по умолчанию food)
        limit: количество (по умолчанию 20)
    """
    permission_classes = [AllowAny]
    
    def get(self, request, breed_id):
        from apps.pets.breed_models import Breed
        
        try:
            breed = Breed.objects.get(id=breed_id)
        except Breed.DoesNotExist:
            return Response(
                {'error': 'Порода не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        product_group = request.query_params.get('product_group', 'food')
        limit = min(50, int(request.query_params.get('limit', 20)))
        
        # Используем метод модели для получения подходящих товаров
        products = Product.get_for_breed(breed, product_group=product_group, limit=limit)
        
        # Добавляем информацию о совместимости
        result = []
        for product in products:
            suitability = product.get_breed_suitability(breed)
            product_data = ProductCatalogSerializer(product).data
            product_data['breed_suitability'] = suitability
            result.append(product_data)
        
        return Response({
            'breed': {
                'id': breed.id,
                'name': breed.name,
                'slug': breed.slug,
                'species': breed.species,
                'size_category': breed.size_category
            },
            'products': result
        })
