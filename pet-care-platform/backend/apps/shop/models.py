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
    
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Сумма')
    shipping_address = models.TextField(verbose_name='Адрес доставки')
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
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'items': [item.to_dict() for item in self.items.all()],
            'total_amount': float(self.total_amount),
            'shipping_address': self.shipping_address,
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
