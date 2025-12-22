"""
Сериализаторы для модуля магазина

Этот модуль содержит сериализаторы DRF для обработки данных магазина:
- Товары
- Корзина
- Заказы

Классы сериализаторов:
    - ProductSerializer: Сериализация данных товара
    - CartItemAddSerializer: Валидация добавления в корзину
    - CartItemUpdateSerializer: Валидация обновления корзины
    - OrderCreateSerializer: Валидация оформления заказа
    - OrderSerializer: Сериализация данных заказа
"""

from rest_framework import serializers


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
    Сериализатор для запроса добавления товара в корзину.
    
    Валидирует данные при добавлении товара в корзину пользователя.
    
    Поля:
        product_id (int): ID товара для добавления - обязательное
        quantity (int): Количество - опционально, по умолчанию 1
    
    Пример запроса:
        {
            "product_id": 5,
            "quantity": 2
        }
    
    Правила валидации:
        - product_id должен быть положительным целым числом
        - quantity должно быть положительным (минимум 1)
    """
    
    product_id = serializers.IntegerField(
        required=True,
        help_text="ID товара для добавления в корзину"
    )
    
    quantity = serializers.IntegerField(
        required=False,
        default=1,
        min_value=1,
        help_text="Количество товара (по умолчанию 1)"
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
        max_digits=10,
        decimal_places=2,
        default=0,
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
    
    Представляет один товар в составе заказа с фиксированной ценой
    на момент оформления.
    
    Поля:
        product_id (int): ID товара
        product_name (str): Название товара
        quantity (int): Количество
        price (float): Цена за единицу на момент заказа
        total (float): Общая стоимость позиции
    """
    
    product_id = serializers.IntegerField(read_only=True)
    product_name = serializers.CharField(read_only=True)
    quantity = serializers.IntegerField(read_only=True)
    price = serializers.FloatField(read_only=True)
    total = serializers.FloatField(read_only=True)


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
