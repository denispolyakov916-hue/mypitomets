"""
Модели для магазина кормов и товаров

Включает: Product, Cart, CartItem, Order, OrderItem
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from core.utils import generate_uuid7


class Product(models.Model):
    """
    Модель товара в магазине.
    
    Товары можно фильтровать по типу животного, категории и подкатегории.
    """
    
    ANIMAL_CHOICES = [
        ('dog', 'Для собак'),
        ('cat', 'Для кошек'),
    ]
    
    CATEGORY_CHOICES = [
        ('food', 'Корм'),
        ('pharmacy', 'Ветаптека'),
        ('ammunition', 'Амуниция'),
        ('care', 'Средства по уходу'),
        ('transport', 'Транспортировка'),
        ('toys', 'Игрушки'),
    ]
    
    SUBCATEGORY_CHOICES = [
        # Корм
        ('dry', 'Сухой'),
        ('wet', 'Влажный'),
        ('canned', 'Консервы'),
        ('pouch', 'Паучи'),
        ('pate', 'Паштет'),
        ('holistic', 'Холистик'),
        ('diet', 'Диетический'),
        ('hypoallergenic', 'Гипоаллергенный'),
        # Аптека
        ('antiparasite', 'Средства от паразитов'),
        # Амуниция
        ('leashes', 'Поводки'),
        ('collars', 'Ошейники'),
        ('harnesses', 'Шлейки'),
        ('muzzles', 'Намордники'),
        ('clickers', 'Кликеры'),
        ('retractable', 'Рулетки'),
        ('lights', 'Подсветки'),
        ('multiboxes', 'Мультибоксы'),
        # Транспортировка
        ('enclosures', 'Клетки'),
        ('pads', 'Пелёнки'),
        # Общее
        ('general', 'Общее'),
    ]
    
    # ID из внешнего каталога
    external_id = models.CharField(max_length=50, unique=True, default='', verbose_name='Внешний ID')
    group_id = models.CharField(max_length=50, blank=True, null=True, verbose_name='ID группы')
    
    name = models.CharField(max_length=500, verbose_name='Название')
    description = models.TextField(blank=True, null=True, verbose_name='Описание')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='Цена')
    
    # Производитель
    vendor = models.CharField(max_length=200, blank=True, null=True, verbose_name='Бренд')
    vendor_code = models.CharField(max_length=100, blank=True, null=True, verbose_name='Артикул')
    barcode = models.CharField(max_length=50, blank=True, null=True, verbose_name='Штрихкод')
    
    # Характеристики
    weight = models.DecimalField(max_digits=10, decimal_places=3, blank=True, null=True, verbose_name='Вес (кг)')
    
    # URL и изображения
    url = models.URLField(max_length=1000, blank=True, null=True, verbose_name='URL товара')
    images = models.JSONField(default=list, verbose_name='Изображения')  # Массив URL картинок
    
    # Классификация
    animal = models.CharField(
        max_length=10,
        choices=ANIMAL_CHOICES,
        default='dog',
        db_index=True,
        verbose_name='Животное'
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='food',
        db_index=True,
        verbose_name='Категория'
    )
    subcategory = models.CharField(
        max_length=30,
        choices=SUBCATEGORY_CHOICES,
        blank=True,
        null=True,
        db_index=True,
        verbose_name='Подкатегория'
    )
    category_name = models.CharField(max_length=100, blank=True, null=True, verbose_name='Название категории')
    
    # Наличие
    in_stock = models.BooleanField(default=False, verbose_name='В наличии')
    stock_count = models.PositiveIntegerField(default=0, verbose_name='Количество на складе')
    
    # Дополнительные параметры
    params = models.JSONField(default=dict, blank=True, verbose_name='Параметры')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'products'
        verbose_name = 'Товар'
        verbose_name_plural = 'Товары'
        ordering = ['name']
        indexes = [
            models.Index(fields=['animal', 'category']),
            models.Index(fields=['animal', 'category', 'subcategory']),
            models.Index(fields=['vendor']),
            models.Index(fields=['price']),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def main_image(self):
        """Главное изображение товара."""
        return self.images[0] if self.images else None
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': self.id,
            'external_id': self.external_id,
            'name': self.name,
            'description': self.description,
            'price': float(self.price),
            'vendor': self.vendor,
            'vendor_code': self.vendor_code,
            'weight': float(self.weight) if self.weight else None,
            'url': self.url,
            'images': self.images,
            'main_image': self.main_image,
            'animal': self.animal,
            'category': self.category,
            'subcategory': self.subcategory,
            'category_name': self.category_name,
            'in_stock': self.in_stock,
            'stock_count': self.stock_count,
        }


class Cart(models.Model):
    """
    Модель корзины пользователя.
    
    Один пользователь - одна корзина.
    """
    
    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False,
        help_text="UUIDv7 идентификатор корзины"
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart',
        verbose_name='Пользователь'
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'carts'
        verbose_name = 'Корзина'
        verbose_name_plural = 'Корзины'
    
    def __str__(self):
        return f"Корзина {self.user.email}"
    
    def get_total(self):
        """Расчёт общей суммы корзины."""
        return sum(item.get_total() for item in self.items.all())
    
    def get_items_count(self):
        """Количество товаров в корзине."""
        return sum(item.quantity for item in self.items.all())


class CartItem(models.Model):
    """
    Элемент корзины.
    
    Связывает товар с корзиной и хранит количество.
    """
    
    id = models.AutoField(primary_key=True)
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Корзина'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        verbose_name='Товар'
    )
    quantity = models.PositiveIntegerField(default=1, verbose_name='Количество')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cart_items'
        verbose_name = 'Элемент корзины'
        verbose_name_plural = 'Элементы корзины'
        unique_together = ['cart', 'product']
    
    def __str__(self):
        return f"{self.product.name} x {self.quantity}"
    
    def get_total(self):
        """Стоимость позиции."""
        return self.product.price * self.quantity
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'product': self.product.to_dict(),
            'quantity': self.quantity
        }


class Address(models.Model):
    """
    Модель адреса доставки пользователя.
    """
    
    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False,
        help_text="UUIDv7 идентификатор адреса"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='addresses',
        verbose_name='Пользователь'
    )
    
    # Основные поля адреса
    country = models.CharField(max_length=100, default='Россия', verbose_name='Страна')
    city = models.CharField(max_length=100, verbose_name='Город')
    street = models.CharField(max_length=200, verbose_name='Улица')
    house = models.CharField(max_length=20, verbose_name='Дом')
    building = models.CharField(max_length=20, blank=True, null=True, verbose_name='Корпус/Строение')
    apartment = models.CharField(max_length=20, blank=True, null=True, verbose_name='Квартира')
    postal_code = models.CharField(max_length=20, blank=True, null=True, verbose_name='Почтовый индекс')
    
    # Дополнительные поля
    comment = models.TextField(blank=True, null=True, verbose_name='Комментарий к адресу')
    is_default = models.BooleanField(default=False, verbose_name='Адрес по умолчанию')
    
    # Координаты для карты (если используется геокодирование)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True, verbose_name='Широта')
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True, verbose_name='Долгота')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'addresses'
        verbose_name = 'Адрес'
        verbose_name_plural = 'Адреса'
        ordering = ['-is_default', '-created_at']
    
    def __str__(self):
        return f"{self.city}, {self.street}, {self.house}"
    
    def get_full_address(self):
        """Полный адрес в виде строки."""
        parts = [self.country, self.city, self.street, self.house]
        if self.building:
            parts.append(f"к. {self.building}")
        if self.apartment:
            parts.append(f"кв. {self.apartment}")
        if self.postal_code:
            parts.append(self.postal_code)
        return ", ".join(filter(None, parts))
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': str(self.id),
            'country': self.country,
            'city': self.city,
            'street': self.street,
            'house': self.house,
            'building': self.building,
            'apartment': self.apartment,
            'postal_code': self.postal_code,
            'comment': self.comment,
            'is_default': self.is_default,
            'full_address': self.get_full_address(),
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
        }


class Order(models.Model):
    """
    Модель заказа.
    
    Хранит снимок заказа на момент оформления.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Ожидает обработки'),
        ('processing', 'В обработке'),
        ('shipped', 'Отправлен'),
        ('delivered', 'Доставлен'),
        ('cancelled', 'Отменён'),
    ]
    
    DELIVERY_TYPE_CHOICES = [
        ('standard', 'Стандартная доставка'),
        ('express', 'Экспресс доставка'),
        ('pickup', 'Самовывоз'),
    ]
    
    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False,
        help_text="UUIDv7 идентификатор заказа"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name='Пользователь'
    )
    
    # Финансовые поля
    subtotal_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        verbose_name='Сумма товаров'
    )
    delivery_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        verbose_name='Стоимость доставки'
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Итоговая сумма')
    
    # Адрес доставки (может быть связан с Address или просто текст)
    shipping_address = models.TextField(verbose_name='Адрес доставки (текст)')
    address = models.ForeignKey(
        'Address',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name='Адрес доставки (объект)'
    )
    
    # Доставка
    delivery_type = models.CharField(
        max_length=20,
        choices=DELIVERY_TYPE_CHOICES,
        default='standard',
        verbose_name='Тип доставки'
    )
    delivery_date = models.DateField(blank=True, null=True, verbose_name='Дата доставки')
    
    # Контактная информация получателя
    recipient_name = models.CharField(max_length=200, blank=True, null=True, verbose_name='Имя получателя')
    recipient_phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Телефон получателя')
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Статус'
    )
    
    created_at = models.DateTimeField(default=timezone.now, verbose_name='Дата заказа')
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'orders'
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказы'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Заказ {self.id} от {self.user.email}"
    
    def get_subtotal(self):
        """Сумма товаров без доставки."""
        return sum(item.get_total() for item in self.items.all())
    
    def get_total_with_delivery(self):
        """Итоговая сумма с доставкой."""
        return self.get_subtotal() + self.delivery_cost
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'items': [item.to_dict() for item in self.items.all()],
            'subtotal_amount': float(self.subtotal_amount),
            'delivery_cost': float(self.delivery_cost),
            'total_amount': float(self.total_amount),
            'shipping_address': self.shipping_address,
            'address': self.address.to_dict() if self.address else None,
            'delivery_type': self.delivery_type,
            'delivery_date': self.delivery_date.isoformat() if self.delivery_date else None,
            'recipient_name': self.recipient_name,
            'recipient_phone': self.recipient_phone,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class OrderItem(models.Model):
    """
    Элемент заказа.
    
    Хранит снимок товара на момент оформления заказа.
    """
    
    id = models.AutoField(primary_key=True)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Заказ'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='Товар'
    )
    
    # Снимок данных на момент заказа
    product_name = models.CharField(max_length=200, verbose_name='Название товара')
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Цена')
    quantity = models.PositiveIntegerField(verbose_name='Количество')
    
    class Meta:
        db_table = 'order_items'
        verbose_name = 'Элемент заказа'
        verbose_name_plural = 'Элементы заказа'
    
    def __str__(self):
        return f"{self.product_name} x {self.quantity}"
    
    def get_total(self):
        """Стоимость позиции."""
        return self.price * self.quantity
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'product_id': self.product_id,
            'product_name': self.product_name,
            'price': float(self.price),
            'quantity': self.quantity,
            'total': float(self.get_total())
        }
