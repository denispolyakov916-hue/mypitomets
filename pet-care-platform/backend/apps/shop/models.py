"""
Модели для магазина кормов и товаров

Включает: Product, Cart, CartItem, Order, OrderItem
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from core.utils import generate_uuid7
from .managers import ProductManager


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
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), verbose_name='Цена')
    
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

    # Популярность (количество заказов)
    order_count = models.PositiveIntegerField(default=0, verbose_name='Количество заказов')
    
    # Скидка
    discount_percent = models.PositiveIntegerField(
        default=0,
        verbose_name='Скидка (%)',
        help_text='Процент скидки от 0 до 100'
    )
    
    # Дополнительные параметры
    params = models.JSONField(default=dict, blank=True, verbose_name='Параметры')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Используем кастомный менеджер с оптимизированными запросами
    objects = ProductManager()
    
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
    
    @property
    def discounted_price(self):
        """Цена со скидкой."""
        if self.discount_percent > 0:
            return self.price * (100 - self.discount_percent) / 100
        return self.price
    
    def get_average_rating(self):
        """
        Средний рейтинг товара.
        
        Оптимизация: если объект имеет аннотированные поля _avg_rating,
        используем их вместо дополнительного запроса к БД.
        """
        # Используем предзагруженное значение если доступно
        if hasattr(self, '_avg_rating') and self._avg_rating is not None:
            return float(self._avg_rating)
        
        # Fallback на запрос к БД (для единичных объектов)
        from apps.reviews.models import Review
        from django.db.models import Avg
        result = Review.objects.filter(
            product=self,
            is_approved=True
        ).aggregate(avg=Avg('rating'))
        return result['avg'] or 0.0
    
    def get_reviews_count(self):
        """
        Количество одобренных отзывов.
        
        Оптимизация: если объект имеет аннотированное поле _reviews_count,
        используем его вместо дополнительного запроса к БД.
        """
        # Используем предзагруженное значение если доступно
        if hasattr(self, '_reviews_count') and self._reviews_count is not None:
            return self._reviews_count
        
        # Fallback на запрос к БД (для единичных объектов)
        from apps.reviews.models import Review
        return Review.objects.filter(
            product=self,
            is_approved=True
        ).count()
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': self.id,
            'external_id': self.external_id,
            'name': self.name,
            'description': self.description,
            'price': float(self.price),
            'discount_percent': self.discount_percent,
            'discounted_price': round(self.discounted_price, 2),
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
            'rating': round(self.get_average_rating(), 1),
            'reviews_count': self.get_reviews_count(),
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

    Может содержать либо товар (product), либо курс (course).
    Курсы всегда имеют quantity = 1.
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
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Товар'
    )
    course = models.ForeignKey(
        'training.Course',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Курс'
    )
    pet = models.ForeignKey(
        'pets.Pet',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Питомец',
        help_text='Питомец, для которого приобретается курс (опционально)'
    )
    quantity = models.PositiveIntegerField(default=1, verbose_name='Количество')
    disclaimer_accepted = models.BooleanField(
        default=False,
        verbose_name='Согласие с условиями',
        help_text='Подтверждение согласия с условиями использования для курсов'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cart_items'
        verbose_name = 'Элемент корзины'
        verbose_name_plural = 'Элементы корзины'
        # Уникальность: один товар или курс в корзине
        # Для курсов с питомцем - уникальность по курсу и питомцу
        constraints = [
            models.UniqueConstraint(
                fields=['cart', 'product'],
                name='unique_cart_product',
                condition=models.Q(product__isnull=False)
            ),
            models.UniqueConstraint(
                fields=['cart', 'course', 'pet'],
                name='unique_cart_course_pet',
                condition=models.Q(course__isnull=False)
            ),
        ]

    def __str__(self):
        if self.product:
            return f"{self.product.name} x {self.quantity}"
        elif self.course:
            pet_name = f" ({self.pet.name})" if self.pet else ""
            return f"{self.course.title}{pet_name}"
        return f"CartItem {self.id}"

    def get_total(self):
        """Стоимость позиции с учётом скидки."""
        if self.product:
            return self.product.discounted_price * self.quantity
        elif self.course:
            return self.course.price
        return Decimal('0.00')

    def to_dict(self):
        """Сериализация для API."""
        if self.product:
            return {
                'id': self.id,
                'product': self.product.to_dict(),
                'quantity': self.quantity,
                'price': self.get_total()
            }
        elif self.course:
            data = {
                'id': self.id,
                'course': self.course.to_dict(),
                'quantity': 1,  # Курсы всегда quantity=1
                'disclaimer_accepted': self.disclaimer_accepted,
                'price': self.get_total()
            }
            if self.pet:
                data['pet'] = {
                    'id': str(self.pet.id),
                    'name': self.pet.name,
                    'species': self.pet.species
                }
            return data
        return {}


class Reservation(models.Model):
    """
    Резервирование товаров и курсов на время оформления заказа.

    Предотвращает перепродажу и даёт пользователю время на оплату.
    """

    RESERVATION_TYPE_CHOICES = [
        ('product', 'Резервирование товара'),
        ('course', 'Резервирование курса'),
    ]

    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reservations'
    )

    reservation_type = models.CharField(
        max_length=20,
        choices=RESERVATION_TYPE_CHOICES
    )

    # ID объекта (product.id или course.id)
    object_id = models.CharField(max_length=36)

    # Для курсов - ID питомца (опционально)
    pet_id = models.CharField(max_length=36, null=True, blank=True)

    quantity = models.PositiveIntegerField(default=1)

    # Таймаут резервирования (10 минут по умолчанию)
    expires_at = models.DateTimeField()

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'reservations'
        indexes = [
            models.Index(fields=['user', 'expires_at']),
            models.Index(fields=['reservation_type', 'object_id']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.get_reservation_type_display()} {self.object_id} for {self.user.email}"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def extend_reservation(self, minutes=10):
        """Продлить резервирование."""
        self.expires_at = timezone.now() + timedelta(minutes=minutes)
        self.save()


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
        ('pending', 'Ожидает оплаты'),
        ('processing', 'В обработке'),
        ('shipped', 'Отправлен'),
        ('delivered', 'Доставлен'),
        ('cancelled', 'Отменён'),
        ('expired', 'Истёк срок оплаты'),
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
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Сумма товаров'
    )
    delivery_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Стоимость доставки'
    )
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Итоговая сумма')
    
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
    
    # Таймер оплаты для заказов со статусом 'pending'
    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Истекает (время оплаты)',
        help_text='Время истечения срока оплаты заказа. Если оплата не произведена до этого времени, заказ будет отменен и товары возвращены на склад.'
    )
    
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
    
    def is_expired(self):
        """Проверка, истек ли срок оплаты заказа."""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at
    
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
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_expired': self.is_expired() if self.status == 'pending' else False
        }


class OrderItem(models.Model):
    """
    Элемент заказа.

    Хранит снимок товара или курса на момент оформления заказа.
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
        blank=True,
        verbose_name='Товар'
    )
    course = models.ForeignKey(
        'training.Course',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Курс'
    )
    pet = models.ForeignKey(
        'pets.Pet',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Питомец',
        help_text='Питомец, для которого приобретается курс'
    )

    # Снимок данных на момент заказа
    product_name = models.CharField(max_length=200, verbose_name='Название товара/курса')
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Цена')
    quantity = models.PositiveIntegerField(verbose_name='Количество')
    disclaimer_accepted = models.BooleanField(
        default=False,
        verbose_name='Согласие с условиями',
        help_text='Подтверждение согласия с условиями использования для курсов'
    )
    
    class Meta:
        db_table = 'order_items'
        verbose_name = 'Элемент заказа'
        verbose_name_plural = 'Элементы заказа'
    
    def __str__(self):
        if self.course:
            pet_name = f" ({self.pet.name})" if self.pet else ""
            return f"{self.product_name}{pet_name}"
        return f"{self.product_name} x {self.quantity}"
    
    def get_total(self):
        """Стоимость позиции."""
        return self.price * self.quantity
    
    def to_dict(self):
        """Сериализация для API."""
        if self.course:
            data = {
                'course_id': self.course_id,
                'course_name': self.product_name,  # product_name хранит название курса
                'price': float(self.price),
                'quantity': self.quantity,
                'disclaimer_accepted': self.disclaimer_accepted,
                'total': float(self.get_total())
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
                'product_id': self.product_id,
                'product_name': self.product_name,
                'price': float(self.price),
                'quantity': self.quantity,
                'total': float(self.get_total())
            }


class Return(models.Model):
    """
    Модель возврата товара.

    Позволяет пользователям возвращать товары с восстановлением количества на складе.
    """

    RETURN_STATUS_CHOICES = [
        ('requested', 'Запрошено'),
        ('approved', 'Одобрено'),
        ('rejected', 'Отклонено'),
        ('received', 'Получено'),
        ('refunded', 'Возвращены средства'),
    ]

    RETURN_REASON_CHOICES = [
        ('defective', 'Брак/Повреждение'),
        ('wrong_item', 'Не тот товар'),
        ('not_satisfied', 'Не подошел'),
        ('changed_mind', 'Передумал'),
        ('other', 'Другое'),
    ]

    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False,
        help_text="UUIDv7 идентификатор возврата"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='returns',
        verbose_name='Пользователь'
    )

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='returns',
        verbose_name='Заказ'
    )

    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        related_name='returns',
        verbose_name='Элемент заказа'
    )

    quantity = models.PositiveIntegerField(verbose_name='Количество для возврата')
    reason = models.CharField(
        max_length=20,
        choices=RETURN_REASON_CHOICES,
        verbose_name='Причина возврата'
    )
    description = models.TextField(blank=True, verbose_name='Описание')

    status = models.CharField(
        max_length=20,
        choices=RETURN_STATUS_CHOICES,
        default='requested',
        verbose_name='Статус'
    )

    # Финансовые поля
    refund_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Сумма возврата'
    )

    # Даты
    requested_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата запроса')
    approved_at = models.DateTimeField(blank=True, null=True, verbose_name='Дата одобрения')
    received_at = models.DateTimeField(blank=True, null=True, verbose_name='Дата получения')
    refunded_at = models.DateTimeField(blank=True, null=True, verbose_name='Дата возврата средств')

    # Комментарии администратора
    admin_comment = models.TextField(blank=True, verbose_name='Комментарий администратора')

    class Meta:
        db_table = 'returns'
        verbose_name = 'Возврат'
        verbose_name_plural = 'Возвраты'
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['order', 'status']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Возврат {self.id} от {self.user.email}"

    def can_approve(self):
        """Проверка возможности одобрения возврата."""
        return self.status == 'requested'

    def can_reject(self):
        """Проверка возможности отклонения возврата."""
        return self.status in ['requested', 'approved']

    def approve_return(self):
        """Одобрить возврат."""
        from django.utils import timezone
        if not self.can_approve():
            raise ValueError("Невозможно одобрить возврат в текущем статусе")

        with transaction.atomic():
            self.status = 'approved'
            self.approved_at = timezone.now()

            # Восстанавливаем товар на склад
            if self.order_item.product:
                product = self.order_item.product
                product.stock_count += self.quantity
                if product.stock_count > 0:
                    product.in_stock = True
                product.save(update_fields=['stock_count', 'in_stock'])

            self.save()

    def reject_return(self, admin_comment=None):
        """Отклонить возврат."""
        if not self.can_reject():
            raise ValueError("Невозможно отклонить возврат в текущем статусе")

        self.status = 'rejected'
        if admin_comment:
            self.admin_comment = admin_comment
        self.save()

    def mark_received(self):
        """Отметить возврат как полученный."""
        from django.utils import timezone
        if self.status != 'approved':
            raise ValueError("Можно отметить как полученный только одобренный возврат")

        self.status = 'received'
        self.received_at = timezone.now()
        self.save()

    def refund_payment(self):
        """Вернуть средства."""
        from django.utils import timezone
        from apps.payments.services import PaymentService

        if self.status != 'received':
            raise ValueError("Можно вернуть средства только за полученный возврат")

        # Здесь должна быть логика возврата средств через платежную систему
        # Пока просто отмечаем как возвращенные
        self.status = 'refunded'
        self.refunded_at = timezone.now()
        self.save()

    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'order_id': str(self.order_id),
            'order_item_id': self.order_item_id,
            'quantity': self.quantity,
            'reason': self.reason,
            'reason_display': self.get_reason_display(),
            'description': self.description,
            'status': self.status,
            'status_display': self.get_status_display(),
            'refund_amount': float(self.refund_amount),
            'requested_at': self.requested_at.isoformat() if self.requested_at else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'received_at': self.received_at.isoformat() if self.received_at else None,
            'refunded_at': self.refunded_at.isoformat() if self.refunded_at else None,
            'admin_comment': self.admin_comment,
            'order_item': self.order_item.to_dict() if self.order_item else None,
        }
