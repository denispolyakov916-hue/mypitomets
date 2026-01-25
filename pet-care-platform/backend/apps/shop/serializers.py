"""
Сериализаторы для модуля магазина

Этот модуль содержит сериализаторы DRF для обработки данных магазина:
- Товары (с новой структурой по database_tz.md)
- Категории (иерархические)
- Бренды
- SKU (вариации товаров)
- Корзина
- Заказы

Классы сериализаторов:
    - CategorySerializer: Категории с иерархией
    - BrandSerializer: Бренды
    - ProductSKUSerializer: Вариации товаров
    - ProductCatalogSerializer: Облегчённый сериализатор для каталога
    - ProductDetailSerializer: Полный сериализатор для страницы товара
    - ProductSerializer (legacy): Для обратной совместимости
    - CartItemAddSerializer: Валидация добавления в корзину
    - CartItemUpdateSerializer: Валидация обновления корзины
    - OrderCreateSerializer: Валидация оформления заказа
    - OrderSerializer: Сериализация данных заказа
"""

from rest_framework import serializers
from decimal import Decimal

# Модели аналитики
from .models import AnalyticMetric, ChartConfig, ChartSession, AnalyticsLog

# Новые модели по database_tz.md
from .models import Category, Brand, Product, ProductSKU, ProductBreedRecommendation


# =============================================================================
# НОВЫЕ СЕРИАЛИЗАТОРЫ ПО database_tz.md
# =============================================================================

class CategorySerializer(serializers.ModelSerializer):
    """
    Сериализатор для категорий товаров.
    
    Поддерживает иерархию через parent и children.
    """
    children = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Category
        fields = [
            'id', 'external_id', 'name', 'slug', 'description',
            'parent', 'parent_name', 'depth', 'path',
            'animal_type', 'product_group', 'product_count',
            'icon', 'image_url', 'is_active', 'show_in_menu',
            'children'
        ]
        read_only_fields = ['id', 'depth', 'path', 'product_count']
    
    def get_children(self, obj):
        """Получить дочерние категории (только для корневых/первого уровня)."""
        # Ограничиваем глубину рекурсии
        if obj.depth >= 2:
            return []
        
        children = obj.children.filter(is_active=True).order_by('sort_order', 'name')
        return CategoryListSerializer(children, many=True).data


class CategoryListSerializer(serializers.ModelSerializer):
    """Облегчённый сериализатор для списка категорий."""
    
    class Meta:
        model = Category
        fields = [
            'id', 'external_id', 'name', 'slug',
            'animal_type', 'product_group', 'product_count',
            'icon', 'depth'
        ]


class CategoryTreeSerializer(serializers.ModelSerializer):
    """
    Сериализатор для дерева категорий (меню).
    
    Возвращает полную иерархию для построения меню на фронтенде.
    """
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'animal_type', 'product_group', 
                  'product_count', 'icon', 'children']
    
    def get_children(self, obj):
        children = obj.children.filter(is_active=True, show_in_menu=True).order_by('sort_order')
        return CategoryTreeSerializer(children, many=True).data


class BrandSerializer(serializers.ModelSerializer):
    """Сериализатор для брендов."""
    
    class Meta:
        model = Brand
        fields = [
            'id', 'external_id', 'name', 'slug', 'description',
            'logo_url', 'website_url', 'brand_class', 'country',
            'priority', 'product_count', 'is_active'
        ]
        read_only_fields = ['id', 'product_count']


class BrandListSerializer(serializers.ModelSerializer):
    """Облегчённый сериализатор для списка брендов."""
    
    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug', 'logo_url', 'brand_class', 'product_count']


class ProductSKUSerializer(serializers.ModelSerializer):
    """Сериализатор для вариаций товаров (SKU)."""
    
    class Meta:
        model = ProductSKU
        fields = [
            'id', 'sku', 'name', 'price', 'compare_price',
            'available', 'stock_quantity',
            'weight_kg', 'weight_display',
            'flavor', 'flavor_display',
            'size_code', 'size_back_cm', 'size_chest_cm', 'size_neck_cm',
            'color', 'color_display', 'color_hex',
            'volume_ml', 'volume_display', 'pack_quantity',
            'is_default', 'sort_order'
        ]


class ProductCatalogSerializer(serializers.ModelSerializer):
    """
    Облегчённый сериализатор для каталога товаров.
    
    Минимум полей для быстрой загрузки списка.
    Используется в ProductListView для пагинированных списков.
    """
    brand_name = serializers.CharField(source='brand.name', read_only=True, allow_null=True)
    category_name = serializers.CharField(source='new_category.name', read_only=True, allow_null=True)
    discount_percent = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'external_id', 'name', 'slug', 'short_description',
            'price', 'compare_price', 'discount_percent',
            'image_url', 'rating', 'rating_count',
            'is_available', 'sku_count',
            'animal_type', 'product_group',
            'is_grain_free', 'is_hypoallergenic', 'is_veterinary',
            'brand_name', 'category_name'
        ]
    
    def get_discount_percent(self, obj):
        """Расчёт процента скидки."""
        if obj.compare_price and obj.compare_price > obj.price:
            return round((1 - float(obj.price) / float(obj.compare_price)) * 100)
        return 0


class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Полный сериализатор для страницы товара.
    
    Включает все данные: category_details, SKU, изображения, бренд и т.д.
    """
    brand = BrandSerializer(read_only=True)
    category = CategoryListSerializer(source='new_category', read_only=True)
    skus = ProductSKUSerializer(many=True, read_only=True)
    discount_percent = serializers.SerializerMethodField()
    breed_recommendations = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            # Основное
            'id', 'external_id', 'name', 'slug', 
            'short_description', 'description',
            # Цены
            'price', 'compare_price', 'discount_percent',
            # Изображения
            'image_url', 'images',
            # Рейтинг
            'rating', 'rating_count',
            # Наличие
            'is_available', 'sku_count',
            # Классификация
            'animal_type', 'product_group', 'category', 'brand',
            # Фильтры
            'age_group', 'size_group',
            'is_grain_free', 'is_hypoallergenic', 'is_veterinary',
            'health_conditions', 'allergens',
            # Детали категории (JSONB)
            'category_details',
            # Страна
            'country',
            # SEO
            'meta_title', 'meta_description',
            # Вариации
            'skus',
            # Рекомендации для пород
            'breed_recommendations',
            # Legacy
            'vendor', 'vendor_code', 'weight', 'in_stock', 'stock_count'
        ]
    
    def get_discount_percent(self, obj):
        if obj.compare_price and obj.compare_price > obj.price:
            return round((1 - float(obj.price) / float(obj.compare_price)) * 100)
        return 0
    
    def get_breed_recommendations(self, obj):
        """Топ-5 рекомендаций для пород."""
        recommendations = obj.breed_recommendations.filter(
            suitability__in=['ideal', 'recommended']
        ).select_related('breed').order_by('-score')[:5]
        
        return [
            {
                'breed_id': rec.breed_id,
                'breed_name': rec.breed.name,
                'breed_slug': rec.breed.slug,
                'suitability': rec.suitability,
                'reason': rec.reason
            }
            for rec in recommendations
        ]


class ProductBreedRecommendationSerializer(serializers.ModelSerializer):
    """Сериализатор для рекомендаций товаров для пород."""
    breed_name = serializers.CharField(source='breed.name', read_only=True)
    breed_slug = serializers.CharField(source='breed.slug', read_only=True)
    breed_species = serializers.CharField(source='breed.species', read_only=True)
    
    class Meta:
        model = ProductBreedRecommendation
        fields = [
            'id', 'breed_id', 'breed_name', 'breed_slug', 'breed_species',
            'match_type', 'suitability', 'score', 'reason'
        ]


# =============================================================================
# LEGACY SERIALIZERS (для обратной совместимости)
# =============================================================================

class ProductSerializer(serializers.Serializer):
    """
    Сериализатор для данных товара в API ответах.
    
    Используется для сериализации объектов товара при возврате
    каталога или деталей товара.
    
    Поля:
        id (int): Уникальный идентификатор товара
        name (str): Название товара
        description (str): Описание товара
        price (float): Цена в рублях
        image_url (str): URL изображения товара
        pet_type (str): Целевое животное (dog, cat, all)
        product_type (str): Тип товара (dry_food, wet_food, treats)
        in_stock (bool): Наличие на складе
    """
    
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    price = serializers.FloatField(read_only=True)
    image_url = serializers.CharField(read_only=True)
    pet_type = serializers.CharField(read_only=True)
    product_type = serializers.CharField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)


class CartItemAddSerializer(serializers.Serializer):
    """
    Сериализатор для запроса добавления товара или курса в корзину.

    Валидирует данные при добавлении товара или курса в корзину пользователя.

    Поля:
        product_id (int): ID товара для добавления - опционально (если не указан course_id)
        course_id (int): ID курса для добавления - опционально (если не указан product_id)
        pet_id (str): ID питомца для привязки курса - опционально
        disclaimer_accepted (bool): Согласие с условиями - опционально, по умолчанию False
        quantity (int): Количество - опционально, по умолчанию 1 (только для товаров)

    Пример запроса для товара:
        {
            "product_id": 5,
            "quantity": 2
        }

    Пример запроса для курса:
        {
            "course_id": 10,
            "pet_id": "uuid-string",
            "disclaimer_accepted": true
        }

    Правила валидации:
        - Должен быть указан либо product_id, либо course_id, но не оба одновременно
        - product_id и course_id должны быть положительными числами
        - quantity должно быть положительным (минимум 1, только для товаров)
        - Для платных курсов disclaimer_accepted должно быть true
        - pet_id должен быть валидным UUID
    """

    product_id = serializers.IntegerField(
        required=False,
        help_text="ID товара для добавления в корзину"
    )
    course_id = serializers.IntegerField(
        required=False,
        help_text="ID курса для добавления в корзину"
    )
    pet_id = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="ID питомца для привязки курса (UUID)"
    )
    disclaimer_accepted = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Согласие с условиями использования курса"
    )
    quantity = serializers.IntegerField(
        required=False,
        default=1,
        min_value=1,
        help_text="Количество товара (по умолчанию 1, не используется для курсов)"
    )

    def validate_product_id(self, value):
        """
        Валидация ID товара.

        Проверяет, что ID является положительным целым числом.
        Проверка существования товара выполняется во view.

        Аргументы:
            value (int): ID товара

        Возвращает:
            int: Валидированный ID товара

        Исключения:
            ValidationError: Если ID не положительный
        """
        if value <= 0:
            raise serializers.ValidationError(
                "ID товара должен быть положительным числом"
            )
        return value

    def validate_course_id(self, value):
        """
        Валидация ID курса.

        Проверяет, что ID является положительным целым числом.
        Проверка существования курса выполняется во view.

        Аргументы:
            value (int): ID курса

        Возвращает:
            int: Валидированный ID курса

        Исключения:
            ValidationError: Если ID не положительный
        """
        if value <= 0:
            raise serializers.ValidationError(
                "ID курса должен быть положительным числом"
            )
        return value

    def validate_pet_id(self, value):
        """
        Валидация ID питомца.

        Проверяет, что ID является валидным UUID.
        Проверка существования питомца выполняется во view.

        Аргументы:
            value (str): ID питомца

        Возвращает:
            str: Валидированный ID питомца или None для пустых значений

        Исключения:
            ValidationError: Если ID не валидный UUID
        """
        # Пустые значения разрешены (allow_blank=True)
        if not value or not value.strip():
            return None
            
        import uuid
        try:
            uuid.UUID(value)
            return value
        except ValueError:
            raise serializers.ValidationError(
                "ID питомца должен быть валидным UUID"
            )

    def validate(self, attrs):
        """
        Комплексная валидация данных.

        Проверяет взаимосвязи между полями:
        - Должен быть указан либо product_id, либо course_id
        - Нельзя указывать оба одновременно
        - Для курсов quantity игнорируется
        - pet_id только для курсов

        Аргументы:
            attrs (dict): Валидируемые данные

        Возвращает:
            dict: Валидированные данные

        Исключения:
            ValidationError: При нарушении правил валидации
        """
        product_id = attrs.get('product_id')
        course_id = attrs.get('course_id')
        pet_id = attrs.get('pet_id')
        quantity = attrs.get('quantity', 1)

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

        # Для курсов quantity всегда = 1
        if course_id:
            attrs['quantity'] = 1

        # pet_id только для курсов
        if pet_id and not course_id:
            raise serializers.ValidationError(
                "pet_id можно указывать только при добавлении курса"
            )

        return attrs


class CartItemUpdateSerializer(serializers.Serializer):
    """
    Сериализатор для запроса обновления количества в корзине.

    Валидирует данные при изменении количества товара или курса в корзине.

    Поля:
        product_id (int): ID товара в корзине - опционально (если не указан course_id)
        course_id (int): ID курса в корзине - опционально (если не указан product_id)
        quantity (int): Новое количество - опционально (0 = удалить)
        delta_quantity (int): Изменение количества (+1, -1) - опционально

    Пример запроса для товара (абсолютное значение):
        {
            "product_id": 5,
            "quantity": 3
        }

    Пример запроса для товара (относительное изменение):
        {
            "product_id": 5,
            "delta_quantity": 1
        }

    Пример запроса для курса:
        {
            "course_id": 10,
            "quantity": 0
        }

    Примечание:
        При quantity=0 или delta_quantity, приводящем к quantity<=0, элемент будет удалён из корзины.
        Для курсов quantity всегда должно быть 0 (удаление) или 1.
        Нельзя указывать одновременно quantity и delta_quantity.
    """

    product_id = serializers.IntegerField(
        required=False,
        help_text="ID товара в корзине"
    )

    course_id = serializers.IntegerField(
        required=False,
        help_text="ID курса в корзине"
    )

    quantity = serializers.IntegerField(
        required=False,
        min_value=0,
        help_text="Новое количество (0 для удаления)"
    )

    delta_quantity = serializers.IntegerField(
        required=False,
        help_text="Изменение количества (+1, -1 и т.д.)"
    )

    def validate_product_id(self, value):
        """Валидация ID товара."""
        if value <= 0:
            raise serializers.ValidationError(
                "ID товара должен быть положительным числом"
            )
        return value

    def validate_course_id(self, value):
        """Валидация ID курса."""
        if value <= 0:
            raise serializers.ValidationError(
                "ID курса должен быть положительным числом"
            )
        return value

    def validate(self, attrs):
        """Комплексная валидация."""
        product_id = attrs.get('product_id')
        course_id = attrs.get('course_id')
        quantity = attrs.get('quantity')
        delta_quantity = attrs.get('delta_quantity')

        # Должен быть указан либо product_id, либо course_id
        if not product_id and not course_id:
            raise serializers.ValidationError(
                "Необходимо указать либо product_id, либо course_id"
            )

        # Нельзя указывать оба одновременно
        if product_id and course_id:
            raise serializers.ValidationError(
                "Нельзя указывать одновременно product_id и course_id"
            )

        # Должен быть указан либо quantity, либо delta_quantity
        if quantity is None and delta_quantity is None:
            raise serializers.ValidationError(
                "Необходимо указать либо quantity, либо delta_quantity"
            )

        # Нельзя указывать оба одновременно
        if quantity is not None and delta_quantity is not None:
            raise serializers.ValidationError(
                "Нельзя указывать одновременно quantity и delta_quantity"
            )

        # Для курсов можно использовать только quantity (не delta_quantity)
        if course_id and delta_quantity is not None:
            raise serializers.ValidationError(
                "Для курсов можно использовать только quantity"
            )

        # Для курсов quantity может быть только 0 или 1
        if course_id and quantity is not None and quantity not in [0, 1]:
            raise serializers.ValidationError(
                "Для курсов количество может быть только 0 (удалить) или 1"
            )

        return attrs


class CartItemSerializer(serializers.Serializer):
    """
    Сериализатор для элемента корзины в ответе API.

    Возвращает полную информацию о товаре или курсе в корзине.

    Структура ответа:
    {
        "id": 1,
        "product": {...} или null,
        "course": {...} или null,
        "pet": {...} или null,  // только для курсов
        "quantity": 1,
        "disclaimer_accepted": true,  // только для курсов
        "price": 1000
    }
    """

    id = serializers.IntegerField(read_only=True)
    product = serializers.SerializerMethodField()
    course = serializers.SerializerMethodField()
    pet = serializers.SerializerMethodField()
    quantity = serializers.IntegerField(read_only=True)
    disclaimer_accepted = serializers.BooleanField(read_only=True)
    price = serializers.FloatField(read_only=True)

    def get_product(self, obj):
        """Получить информацию о товаре."""
        if obj.product:
            return obj.product.to_dict()
        return None

    def get_course(self, obj):
        """Получить информацию о курсе."""
        if obj.course:
            return obj.course.to_dict(detailed=True)
        return None

    def get_pet(self, obj):
        """Получить информацию о питомце."""
        if obj.pet:
            return {
                'id': str(obj.pet.id),
                'name': obj.pet.name,
                'species': obj.pet.species,
                'species_display': obj.pet.get_species_display(),
                'breed': obj.pet.breed,
                'age': obj.pet.age,
                'weight': float(obj.pet.weight) if obj.pet.weight else None,
            }
        return None


class OrderCreateSerializer(serializers.Serializer):
    """
    Сериализатор для запроса оформления заказа.
    
    Валидирует данные, необходимые для создания заказа из корзины.
    
    Поля:
        shipping_address (str): Адрес доставки - обязательное (если не указан address_id)
        address_id (str): ID сохраненного адреса - опционально
        delivery_type (str): Тип доставки - опционально, по умолчанию 'standard'
        delivery_cost (float): Стоимость доставки - опционально, по умолчанию 0
        recipient_name (str): Имя получателя - опционально
        recipient_phone (str): Телефон получателя - опционально
    
    Пример запроса:
        {
            "shipping_address": "Москва, ул. Ленина, д. 1, кв. 5",
            "delivery_type": "express",
            "delivery_cost": 600.0
        }
    """
    
    shipping_address = serializers.CharField(
        required=False,
        min_length=10,
        max_length=500,
        allow_blank=True,
        help_text="Полный адрес доставки (если не указан address_id)"
    )
    address_id = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="ID сохраненного адреса доставки"
    )
    delivery_type = serializers.ChoiceField(
        choices=[('standard', 'Стандартная'), ('express', 'Экспресс'), ('pickup', 'Самовывоз')],
        default='standard',
        required=False,
        help_text="Тип доставки"
    )
    delivery_cost = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        required=False,
        help_text="Стоимость доставки"
    )
    recipient_name = serializers.CharField(
        max_length=200,
        required=False,
        allow_blank=True,
        help_text="Имя получателя"
    )
    recipient_phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        help_text="Телефон получателя"
    )
    
    def validate(self, attrs):
        """Валидация: должен быть указан либо shipping_address, либо address_id."""
        shipping_address = attrs.get('shipping_address', '').strip()
        address_id = attrs.get('address_id', '').strip()
        
        if not shipping_address and not address_id:
            raise serializers.ValidationError(
                "Необходимо указать либо shipping_address, либо address_id"
            )
        
        return attrs
    
    def validate_shipping_address(self, value):
        """
        Валидация адреса доставки.
        
        Выполняет очистку и проверку адреса:
        - Удаление лишних пробелов
        - Проверка минимальной длины
        
        Аргументы:
            value (str): Адрес доставки
            
        Возвращает:
            str: Очищенный адрес
            
        Исключения:
            ValidationError: Если адрес слишком короткий
        """
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError(
                "Введите полный адрес доставки (минимум 10 символов)"
            )
        return value


class OrderItemSerializer(serializers.Serializer):
    """
    Сериализатор для элемента заказа.

    Представляет один товар или курс в составе заказа с фиксированной ценой
    на момент оформления.

    Поля:
        product_id (int): ID товара (опционально)
        course_id (int): ID курса (опционально)
        product_name (str): Название товара/курса
        quantity (int): Количество
        price (float): Цена за единицу на момент заказа
        total (float): Общая стоимость позиции
        disclaimer_accepted (bool): Согласие с условиями (для курсов)
        pet (dict): Информация о питомце (для курсов)
    """

    product_id = serializers.IntegerField(read_only=True, allow_null=True)
    course_id = serializers.IntegerField(read_only=True, allow_null=True)
    product_name = serializers.CharField(read_only=True)
    quantity = serializers.IntegerField(read_only=True)
    price = serializers.FloatField(read_only=True)
    total = serializers.FloatField(read_only=True)
    disclaimer_accepted = serializers.BooleanField(read_only=True)
    pet = serializers.DictField(read_only=True, allow_null=True)


class OrderSerializer(serializers.Serializer):
    """
    Сериализатор для данных заказа в API ответах.
    
    Используется для сериализации объектов заказа при возврате
    деталей заказа или истории заказов.
    
    Поля:
        id (int): Уникальный идентификатор заказа
        user_id (int): ID пользователя, оформившего заказ
        items (list): Список товаров в заказе
        subtotal_amount (float): Сумма товаров
        delivery_cost (float): Стоимость доставки
        total_amount (float): Общая стоимость заказа
        shipping_address (str): Адрес доставки
        address (dict): Объект адреса доставки
        delivery_type (str): Тип доставки
        delivery_date (str): Дата доставки
        recipient_name (str): Имя получателя
        recipient_phone (str): Телефон получателя
        status (str): Текущий статус заказа
        created_at (str): Дата и время оформления
    
    Статусы заказа:
        - pending: Ожидает обработки
        - processing: В обработке
        - shipped: Отправлен
        - delivered: Доставлен
        - cancelled: Отменён
    """
    
    id = serializers.CharField(read_only=True)
    user_id = serializers.CharField(read_only=True)
    items = serializers.ListField(read_only=True)
    subtotal_amount = serializers.FloatField(read_only=True)
    delivery_cost = serializers.FloatField(read_only=True)
    total_amount = serializers.FloatField(read_only=True)
    shipping_address = serializers.CharField(read_only=True)
    address = serializers.DictField(read_only=True, allow_null=True)
    delivery_type = serializers.CharField(read_only=True)
    delivery_date = serializers.CharField(read_only=True, allow_null=True)
    recipient_name = serializers.CharField(read_only=True, allow_null=True)
    recipient_phone = serializers.CharField(read_only=True, allow_null=True)
    status = serializers.CharField(read_only=True)
    created_at = serializers.CharField(read_only=True)


class AddressCreateSerializer(serializers.Serializer):
    """
    Сериализатор для создания адреса доставки.
    """
    country = serializers.CharField(max_length=100, default='Россия', required=False)
    city = serializers.CharField(max_length=100, required=True)
    street = serializers.CharField(max_length=200, required=True)
    house = serializers.CharField(max_length=20, required=True)
    building = serializers.CharField(max_length=20, required=False, allow_blank=True)
    apartment = serializers.CharField(max_length=20, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    comment = serializers.CharField(required=False, allow_blank=True)
    is_default = serializers.BooleanField(default=False, required=False)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)


class UnifiedOrderSerializer(serializers.Serializer):
    """Сериализатор для единого оформления заказа с поддержкой выборочного оформления."""

    # Выбранные элементы корзины (опционально)
    selected_items = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        help_text="Список ID элементов корзины для оформления. Если не указан - все элементы."
    )

    # Для товаров (обязательны, если есть товары)
    delivery_type = serializers.ChoiceField(
        choices=['standard', 'express', 'pickup'],
        required=False
    )
    address_id = serializers.CharField(required=False)
    shipping_address = serializers.CharField(required=False)

    # Для курсов (обязательны, если есть курсы)
    courses_disclaimer_accepted = serializers.BooleanField(default=False)

    def validate(self, data):
        # Валидация в зависимости от содержимого корзины
        from .models import Cart
        
        try:
            cart = Cart.objects.prefetch_related('items__product', 'items__course').get(user=self.context['request'].user)
        except Cart.DoesNotExist:
            raise serializers.ValidationError("Корзина пуста. Добавьте товары или курсы перед оформлением заказа.")

        # Получаем элементы корзины (с учётом selected_items)
        selected_items = data.get('selected_items', [])
        if selected_items:
            cart_items = cart.items.filter(id__in=selected_items)
        else:
            cart_items = cart.items.all()
        
        if not cart_items.exists():
            raise serializers.ValidationError("Не выбрано ни одного товара или курса для оформления.")

        # Проверяем наличие товаров и курсов среди выбранных
        has_products = cart_items.filter(product__isnull=False).exists()
        has_courses = cart_items.filter(course__isnull=False).exists()

        errors = {}
        
        if has_products:
            delivery_type = data.get('delivery_type')
            if not delivery_type or (isinstance(delivery_type, str) and not delivery_type.strip()):
                errors['delivery_type'] = ["Необходимо выбрать тип доставки для товаров"]
            else:
                # Для самовывоза адрес не требуется
                if delivery_type != 'pickup':
                    address_id = data.get('address_id')
                    shipping_address = data.get('shipping_address')
                    # Проверяем, что хотя бы один адрес указан и не пустой
                    has_address_id = address_id and (not isinstance(address_id, str) or address_id.strip())
                    has_shipping_address = shipping_address and (not isinstance(shipping_address, str) or shipping_address.strip())
                    
                    if not has_address_id and not has_shipping_address:
                        errors['address'] = ["Необходим адрес доставки для товаров (address_id или shipping_address)"]

        if has_courses:
            courses_disclaimer_accepted = data.get('courses_disclaimer_accepted')
            if not courses_disclaimer_accepted:
                errors['courses_disclaimer_accepted'] = ["Необходимо принять условия для курсов"]
        
        if errors:
            raise serializers.ValidationError(errors)

        # Сохраняем информацию о выбранных элементах для использования в view
        data['_has_products'] = has_products
        data['_has_courses'] = has_courses
        data['_selected_cart_items'] = list(cart_items)

        return data


# =============================================================================
# СЕРИАЛИЗАТОРЫ АНАЛИТИКИ
# =============================================================================

class MetricListSerializer(serializers.ModelSerializer):
    """
    Сериализатор для списка метрик (упрощённый).
    """

    class Meta:
        model = AnalyticMetric
        fields = [
            'id', 'name', 'category', 'data_type', 'units',
            'description', 'is_active'
        ]


class AnalyticMetricSerializer(serializers.ModelSerializer):
    """
    Полный сериализатор метрики аналитики.
    """

    class Meta:
        model = AnalyticMetric
        fields = [
            'id', 'name', 'description', 'category', 'subcategory',
            'data_type', 'default_aggregation', 'available_aggregations',
            'table_name', 'field_name', 'sql_template',
            'related_fields', 'filter_fields', 'dimension_fields',
            'units', 'format_pattern', 'is_active', 'is_system',
            'cache_ttl', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ChartConfigSerializer(serializers.ModelSerializer):
    """
    Сериализатор конфигурации графика.
    """

    class Meta:
        model = ChartConfig
        fields = [
            'id', 'name', 'description', 'chart_type',
            'canvas_config', 'x_axis_config', 'y_axis_config',
            'data_layers', 'filters_config', 'segment_config',
            'style_config', 'legend_config', 'interaction_config',
            'is_template', 'is_public', 'category', 'tags',
            'usage_count', 'last_used_at', 'preview_image', 'export_formats',
            'created_at', 'updated_at', 'created_by', 'version', 'parent_config'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'usage_count', 'last_used_at']


class ChartConfigCreateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для создания конфигурации графика.
    """

    class Meta:
        model = ChartConfig
        fields = [
            'name', 'description', 'chart_type',
            'canvas_config', 'x_axis_config', 'y_axis_config',
            'data_layers', 'filters_config', 'segment_config',
            'style_config', 'legend_config', 'interaction_config',
            'is_template', 'is_public', 'category', 'tags'
        ]


class ChartTemplateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для шаблонов графиков.
    """

    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = ChartConfig
        fields = [
            'id', 'name', 'description', 'chart_type', 'category', 'tags',
            'usage_count', 'created_by_name', 'created_at'
        ]


class ChartSessionSerializer(serializers.ModelSerializer):
    """
    Сериализатор сессии конструктора графиков.
    """

    class Meta:
        model = ChartSession
        fields = [
            'id', 'config', 'status', 'started_at', 'last_activity_at', 'expires_at'
        ]
        read_only_fields = ['id', 'started_at', 'last_activity_at']


class AnalyticsLogSerializer(serializers.ModelSerializer):
    """
    Сериализатор лога аналитики.
    """

    user_email = serializers.EmailField(source='user.email', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AnalyticsLog
        fields = [
            'id', 'user', 'user_email', 'action', 'action_display',
            'resource_type', 'resource_id', 'metadata', 'ip_address',
            'user_agent', 'execution_time', 'data_points', 'success',
            'error_message', 'timestamp'
        ]


class ChartDataRequestSerializer(serializers.Serializer):
    """
    Сериализатор запроса данных графика.
    """

    config = serializers.DictField(
        help_text="Конфигурация графика"
    )
    data_limit = serializers.IntegerField(
        default=10000,
        min_value=1,
        max_value=50000,
        help_text="Максимальное количество точек данных"
    )

    def validate_config(self, value):
        """Валидация конфигурации графика."""
        required_fields = ['metrics']
        if not all(field in value for field in required_fields):
            raise serializers.ValidationError("Конфигурация должна содержать 'metrics'")

        if not value.get('metrics'):
            raise serializers.ValidationError("Метрики не могут быть пустыми")

        return value


class ChartExportSerializer(serializers.Serializer):
    """
    Сериализатор запроса экспорта графика.
    """

    format = serializers.ChoiceField(
        choices=['png', 'jpg', 'svg', 'pdf'],
        default='png',
        help_text="Формат экспорта"
    )
    width = serializers.IntegerField(
        default=1200,
        min_value=400,
        max_value=4000,
        help_text="Ширина изображения"
    )
    height = serializers.IntegerField(
        default=800,
        min_value=300,
        max_value=3000,
        help_text="Высота изображения"
    )
    quality = serializers.IntegerField(
        default=90,
        min_value=1,
        max_value=100,
        help_text="Качество (для JPG)"
    )