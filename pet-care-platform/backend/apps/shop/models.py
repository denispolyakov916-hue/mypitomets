"""
Модели для магазина кормов и товаров

Включает: Category, Brand, Product, ProductSKU, Cart, CartItem, Order, OrderItem

Архитектура по database_tz.md:
- 0 JOIN для каталога — все критичные данные денормализованы в products
- Минимум полей для фильтрации — только то, что реально фильтруется
- Иерархия категорий — path[] для быстрого получения подкатегорий
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify
from django.contrib.postgres.fields import ArrayField
from datetime import timedelta
from decimal import Decimal
from core.utils import generate_uuid7
from .managers import ProductManager


# =============================================================================
# СПРАВОЧНЫЕ ТАБЛИЦЫ
# =============================================================================

class Category(models.Model):
    """
    Иерархия категорий товаров.
    
    Ключевая таблица для фильтрации!
    Использует path[] для быстрого получения подкатегорий.
    """
    
    ANIMAL_TYPES = [
        ('dog', 'Для собак'),
        ('cat', 'Для кошек'),
        ('all', 'Для всех'),
    ]
    
    PRODUCT_GROUPS = [
        ('food', 'Корм'),
        ('treats', 'Лакомства'),
        ('vet', 'Ветаптека'),
        ('vitamins', 'Витамины и добавки'),
        ('clothes', 'Одежда'),
        ('equipment', 'Амуниция'),
        ('grooming', 'Груминг'),
        ('housing', 'Транспортировка и содержание'),
        ('toys', 'Игрушки'),
        ('bowls', 'Миски'),
        ('toilet', 'Туалеты и принадлежности'),
        ('other', 'Прочее'),
    ]
    
    # Идентификаторы
    kotmatros_category_id = models.BigIntegerField(
        unique=True, 
        null=True, 
        blank=True,
        db_column='external_id',  # Сохраняем имя колонки для обратной совместимости
        verbose_name='ID в Kotmatros',
        help_text='ID категории из внешнего API Kotmatros'
    )
    
    # Основные поля
    name = models.CharField(max_length=255, verbose_name='Название')
    slug = models.SlugField(max_length=255, unique=True, verbose_name='URL-имя')
    code = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Технический код',
        help_text='Код для фильтрации: food.dry, care.shampoos, walk.collars'
    )
    description = models.TextField(blank=True, verbose_name='Описание')
    
    # Иерархия
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='Родительская категория'
    )
    depth = models.SmallIntegerField(
        default=0,
        verbose_name='Глубина вложенности',
        help_text='0=корневая, 1=подкатегория, 2=под-подкатегория'
    )
    path = ArrayField(
        models.IntegerField(),
        default=list,
        blank=True,
        verbose_name='Путь в иерархии',
        help_text='Полный путь ID для быстрого поиска [2133, 2137, 2322]'
    )
    
    # Классификация
    animal_type = models.CharField(
        max_length=10,
        choices=ANIMAL_TYPES,
        default='all',
        db_index=True,
        verbose_name='Тип животного'
    )
    product_group = models.CharField(
        max_length=20,
        choices=PRODUCT_GROUPS,
        blank=True,
        null=True,
        verbose_name='Группа товаров',
        help_text='Для логики бэкенда: food/treats/vet/vitamins/clothes/equipment/grooming/housing/toys/bowls/toilet/other'
    )
    
    # Денормализованные счётчики
    product_count = models.IntegerField(
        default=0,
        verbose_name='Количество товаров',
        help_text='Денормализовано для быстрого отображения'
    )
    
    # Отображение
    icon = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Иконка',
        help_text='Emoji или класс иконки'
    )
    image_url = models.URLField(max_length=500, blank=True, verbose_name='Изображение категории')
    sort_order = models.SmallIntegerField(default=0, verbose_name='Порядок сортировки')
    is_active = models.BooleanField(default=True, verbose_name='Активна')
    show_in_menu = models.BooleanField(default=True, verbose_name='Показывать в меню')
    
    class Meta:
        db_table = 'shop_categories'
        verbose_name = 'Категория'
        verbose_name_plural = 'Категории'
        ordering = ['sort_order', 'name']
        indexes = [
            models.Index(fields=['parent']),
            models.Index(fields=['animal_type', 'product_group']),
            models.Index(fields=['depth', 'is_active', 'sort_order']),
            models.Index(fields=['kotmatros_category_id'], name='idx_cat_kotmatros'),
        ]
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        """Автоматически обновляет path и depth при сохранении."""
        if self.parent:
            self.depth = self.parent.depth + 1
            self.path = self.parent.path + [self.kotmatros_category_id or self.pk]
        else:
            self.depth = 0
            self.path = [self.kotmatros_category_id or self.pk]
        super().save(*args, **kwargs)
    
    def get_ancestors(self):
        """Получить всех предков категории."""
        if not self.parent:
            return Category.objects.none()
        return Category.objects.filter(kotmatros_category_id__in=self.path[:-1])
    
    def get_descendants(self):
        """Получить всех потомков категории."""
        return Category.objects.filter(path__contains=[self.kotmatros_category_id or self.pk])
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': self.id,
            'kotmatros_category_id': self.kotmatros_category_id,
            'name': self.name,
            'slug': self.slug,
            'code': self.code,
            'parent_id': self.parent_id,
            'depth': self.depth,
            'path': self.path,
            'animal_type': self.animal_type,
            'product_group': self.product_group,
            'product_count': self.product_count,
            'icon': self.icon,
            'image_url': self.image_url,
            'is_active': self.is_active,
        }


class Brand(models.Model):
    """
    Справочник брендов с приоритетами для рекомендаций.
    """
    
    BRAND_CLASSES = [
        ('economy', 'Эконом'),
        ('premium', 'Премиум'),
        ('super_premium', 'Супер-премиум'),
        ('holistic', 'Холистик'),
    ]
    
    # Идентификаторы
    kotmatros_brand_id = models.BigIntegerField(
        unique=True,
        null=True,
        blank=True,
        db_column='external_id',  # Сохраняем имя колонки для обратной совместимости
        verbose_name='ID в Kotmatros'
    )
    
    # Основные поля
    name = models.CharField(max_length=255, verbose_name='Название')
    slug = models.SlugField(max_length=255, unique=True, verbose_name='URL-имя')
    description = models.TextField(blank=True, verbose_name='Описание')
    logo_url = models.URLField(max_length=500, blank=True, verbose_name='Логотип')
    website_url = models.URLField(max_length=500, blank=True, verbose_name='Сайт')
    
    # Классификация
    brand_class = models.CharField(
        max_length=20,
        choices=BRAND_CLASSES,
        blank=True,
        null=True,
        verbose_name='Класс бренда',
        help_text='economy/premium/super_premium/holistic'
    )
    country = models.CharField(max_length=100, blank=True, verbose_name='Страна производителя')
    
    # Приоритет для рекомендаций (1-10)
    priority = models.SmallIntegerField(
        default=5,
        verbose_name='Приоритет',
        help_text='Приоритет для рекомендаций (1-10)'
    )
    
    # Статистика
    product_count = models.IntegerField(default=0, verbose_name='Количество товаров')
    
    # Статус
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    
    class Meta:
        db_table = 'shop_brands'
        verbose_name = 'Бренд'
        verbose_name_plural = 'Бренды'
        ordering = ['-priority', 'name']
        indexes = [
            models.Index(fields=['brand_class', '-priority']),
            models.Index(fields=['kotmatros_brand_id'], name='idx_brand_kotmatros'),
        ]
    
    def __str__(self):
        return self.name
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': self.id,
            'kotmatros_brand_id': self.kotmatros_brand_id,
            'name': self.name,
            'slug': self.slug,
            'logo_url': self.logo_url,
            'brand_class': self.brand_class,
            'country': self.country,
            'priority': self.priority,
            'product_count': self.product_count,
        }


class Product(models.Model):
    """
    Модель товара в магазине.
    
    Архитектура по database_tz.md:
    - Базовые поля для каталога и фильтрации
    - Денормализованные поля для 0 JOIN при отображении каталога
    
    Товары можно фильтровать по:
    - animal_type (dog/cat/all) — главный фильтр
    - new_category_id — иерархия категорий
    - product_group — группа для логики бэкенда
    - Boolean-фильтры: is_grain_free, is_hypoallergenic, is_veterinary
    - age_group, size_group — универсальные фильтры
    """
    
    # === ENUM CHOICES ===
    
    # === DEPRECATED CHOICES (будут удалены в v2.0) ===
    # Используйте ANIMAL_TYPE_CHOICES вместо ANIMAL_CHOICES
    ANIMAL_CHOICES = [
        ('dog', 'Для собак'),
        ('cat', 'Для кошек'),
    ]
    
    # Новые расширенные choices
    ANIMAL_TYPE_CHOICES = [
        ('dog', 'Для собак'),
        ('cat', 'Для кошек'),
        ('all', 'Для всех'),
    ]
    
    PRODUCT_GROUP_CHOICES = [
        ('food', 'Корм'),
        ('treats', 'Лакомства'),
        ('vet', 'Ветаптека'),
        ('vitamins', 'Витамины и добавки'),
        ('clothes', 'Одежда'),
        ('equipment', 'Амуниция'),
        ('grooming', 'Груминг'),
        ('housing', 'Транспортировка и содержание'),
        ('toys', 'Игрушки'),
        ('bowls', 'Миски'),
        ('toilet', 'Туалеты и принадлежности'),
        ('other', 'Прочее'),
    ]
    
    AGE_GROUP_CHOICES = [
        ('puppy', 'Щенок'),
        ('kitten', 'Котёнок'),
        ('adult', 'Взрослый'),
        ('senior', 'Пожилой'),
        ('all', 'Все возрасты'),
    ]
    
    SIZE_GROUP_CHOICES = [
        ('mini', 'Миниатюрный'),
        ('small', 'Маленький'),
        ('medium', 'Средний'),
        ('large', 'Крупный'),
        ('giant', 'Гигантский'),
        ('all', 'Все размеры'),
    ]
    
    # === DEPRECATED CHOICES (будут удалены в v2.0) ===
    # Используйте PRODUCT_GROUP_CHOICES + модель Category вместо CATEGORY_CHOICES
    CATEGORY_CHOICES = [
        ('food', 'Корм'),
        ('treats', 'Лакомства'),
        ('supplements', 'Добавки и витамины'),
        ('pharmacy', 'Ветаптека'),
        ('ammunition', 'Амуниция'),
        ('care', 'Средства по уходу'),
        ('transport', 'Транспортировка'),
        ('toys', 'Игрушки'),
    ]
    
    # DEPRECATED: Используйте Category.children для иерархии подкатегорий
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
        # Лакомства
        ('dental', 'Для зубов'),
        ('training', 'Для дрессировки'),
        ('functional', 'Функциональные'),
        ('natural', 'Натуральные'),
        # Добавки
        ('vitamins', 'Витамины'),
        ('omega3', 'Омега-3'),
        ('calcium', 'Кальций'),
        ('joint', 'Для суставов'),
        ('senior', 'Для пожилых'),
        ('immune', 'Иммунитет'),
        ('skin', 'Кожа и шерсть'),
        ('digestion', 'Пищеварение'),
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
    
    # ==========================================================================
    # ИДЕНТИФИКАТОРЫ
    # ==========================================================================
    
    # ID из внешнего каталога Kotmatros
    kotmatros_product_id = models.BigIntegerField(
        unique=True,
        null=True,
        blank=True,
        db_column='external_id',  # Сохраняем имя колонки для обратной совместимости
        verbose_name='ID в Kotmatros',
        help_text='ID товара из внешнего API Kotmatros'
    )
    
    # ==========================================================================
    # ОТОБРАЖЕНИЕ В КАТАЛОГЕ (карточка товара в списке)
    # ==========================================================================
    
    name = models.CharField(max_length=500, verbose_name='Название')
    slug = models.SlugField(
        max_length=500, 
        unique=True, 
        blank=True,
        null=True,
        verbose_name='URL-имя',
        help_text='URL (из поля url API)'
    )
    short_description = models.CharField(
        max_length=500, 
        blank=True, 
        null=True,
        verbose_name='Краткое описание',
        help_text='Превью для карточки каталога'
    )
    description = models.TextField(blank=True, null=True, verbose_name='Полное описание')
    
    # Цены
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), verbose_name='Цена')
    compare_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name='Старая цена',
        help_text='Зачёркнутая цена для отображения скидки'
    )
    
    # Изображения
    image_url = models.URLField(
        max_length=500, 
        blank=True, 
        null=True,
        verbose_name='Основное изображение',
        help_text='URL основного изображения (загружается сразу в каталоге)'
    )
    
    # Рейтинг (денормализовано)
    rating = models.DecimalField(
        max_digits=2, 
        decimal_places=1, 
        default=Decimal('0.0'),
        verbose_name='Рейтинг',
        help_text='Рейтинг 0-5'
    )
    rating_count = models.IntegerField(
        default=0,
        verbose_name='Количество отзывов'
    )
    
    # Наличие
    is_available = models.BooleanField(
        default=True,
        verbose_name='В наличии (новое поле)',
        help_text='Есть в наличии'
    )
    sku_count = models.SmallIntegerField(
        default=1,
        verbose_name='Количество вариаций'
    )
    
    # ==========================================================================
    # ФИЛЬТРАЦИЯ (индексируемые поля по новой структуре)
    # ==========================================================================
    
    # Главный фильтр: тип животного
    animal_type = models.CharField(
        max_length=10,
        choices=ANIMAL_TYPE_CHOICES,
        default='dog',
        db_index=True,
        verbose_name='Тип животного',
        help_text='dog/cat/all'
    )
    
    # Категория (иерархия через Category)
    new_category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name='Категория (новая)',
        help_text='Связь с иерархией категорий'
    )
    
    # Группа товаров (для логики бэкенда)
    product_group = models.CharField(
        max_length=20,
        choices=PRODUCT_GROUP_CHOICES,
        blank=True,
        null=True,
        db_index=True,
        verbose_name='Группа товаров',
        help_text='food/treats/vet/vitamins/clothes/equipment/grooming/housing/toys/bowls/toilet/other'
    )
    
    # Бренд
    brand = models.ForeignKey(
        Brand,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name='Бренд'
    )
    
    # Универсальные фильтры
    age_group = models.CharField(
        max_length=20,
        choices=AGE_GROUP_CHOICES,
        blank=True,
        null=True,
        verbose_name='Возрастная группа',
        help_text='puppy/kitten/adult/senior/all'
    )
    size_group = models.CharField(
        max_length=20,
        choices=SIZE_GROUP_CHOICES,
        blank=True,
        null=True,
        verbose_name='Размерная группа',
        help_text='mini/small/medium/large/giant/all'
    )
    
    # Быстрые boolean-фильтры (часто используемые для кормов)
    is_grain_free = models.BooleanField(
        default=False,
        verbose_name='Беззерновой'
    )
    is_hypoallergenic = models.BooleanField(
        default=False,
        verbose_name='Гипоаллергенный'
    )
    is_veterinary = models.BooleanField(
        default=False,
        verbose_name='Ветеринарная диета'
    )
    
    # Страна
    country = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        verbose_name='Страна производителя'
    )
    
    # ==========================================================================
    # SEO И МЕТАДАННЫЕ
    # ==========================================================================
    
    meta_title = models.CharField(max_length=255, blank=True, null=True, verbose_name='SEO Title')
    meta_description = models.CharField(max_length=500, blank=True, null=True, verbose_name='SEO Description')
    
    # Статус
    status = models.SmallIntegerField(
        default=1,
        verbose_name='Статус',
        help_text='1=активен, 0=неактивен'
    )
    
    # Популярность (количество заказов)
    order_count = models.PositiveIntegerField(default=0, verbose_name='Количество заказов')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Используем кастомный менеджер с оптимизированными запросами
    objects = ProductManager()
    
    class Meta:
        db_table = 'shop_products'
        verbose_name = 'Товар'
        verbose_name_plural = 'Товары'
        ordering = ['name']
        indexes = [
            # Каталог: основной составной индекс
            models.Index(
                fields=['animal_type', 'new_category', 'is_available', 'status', 'price'],
                name='idx_products_catalog_new'
            ),
            # По группе товаров
            models.Index(
                fields=['animal_type', 'product_group', 'is_available'],
                name='idx_products_group'
            ),
            # По бренду
            models.Index(fields=['brand', 'status'], name='idx_products_brand'),
            # По рейтингу
            models.Index(fields=['-rating', '-rating_count'], name='idx_products_rating'),
            # Фильтры для кормов
            models.Index(
                fields=['animal_type', 'is_grain_free', 'is_hypoallergenic', 'is_veterinary', 'age_group', 'size_group'],
                name='idx_products_food_filters'
            ),
            # Slug для URL
            models.Index(fields=['slug'], name='idx_products_slug'),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def main_image(self):
        """Главное изображение товара."""
        return self.image_url
    
    @property
    def discounted_price(self):
        """Цена со скидкой."""
        if self.compare_price and self.compare_price > self.price:
            return self.price
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
    
    @staticmethod
    def _fix_image_url(url):
        """
        Возвращает URL изображения без изменений.
        
        Метод оставлен для обратной совместимости.
        URL изображений используют домен kotmatros.ru.
        """
        return url
    
    def to_dict(self):
        """Сериализация для API (новая схема)."""
        fixed_image_url = self._fix_image_url(self.image_url)
        images = [
            self._fix_image_url(img.url)
            for img in self.product_images.filter(is_active=True).order_by('sort_order')
        ]
        
        return {
            'id': self.id,
            'kotmatros_product_id': self.kotmatros_product_id,
            'name': self.name,
            'slug': self.slug,
            'short_description': self.short_description,
            'description': self.description,
            'price': float(self.price),
            'compare_price': float(self.compare_price) if self.compare_price else None,
            'images': images,
            'image_url': fixed_image_url,
            'main_image': fixed_image_url,
            'animal_type': self.animal_type,
            'product_group': self.product_group,
            'brand_id': self.brand_id,
            'brand_name': self.brand.name if self.brand else None,
            'brand_class': self.brand.brand_class if self.brand else None,
            'age_group': self.age_group,
            'size_group': self.size_group,
            'is_grain_free': self.is_grain_free,
            'is_hypoallergenic': self.is_hypoallergenic,
            'is_veterinary': self.is_veterinary,
            'is_available': self.is_available,
            'order_count': self.order_count,
            'rating': float(self.rating) if self.rating else round(self.get_average_rating(), 1),
            'rating_count': self.rating_count or self.get_reviews_count(),
            'reviews_count': self.get_reviews_count(),
            'category': self.new_category.to_dict() if self.new_category else None,
            'brand': self.brand.to_dict() if self.brand else None,
        }
    
    def to_catalog_dict(self):
        """
        Облегчённая сериализация для каталога (без JOIN).
        Возвращает только поля, необходимые для отображения в списке.
        """
        return {
            'id': self.id,
            'kotmatros_product_id': self.kotmatros_product_id,
            'name': self.name,
            'slug': self.slug,
            'short_description': self.short_description,
            'price': float(self.price),
            'compare_price': float(self.compare_price) if self.compare_price else None,
            'image_url': self._fix_image_url(self.image_url or self.main_image),
            'rating': float(self.rating),
            'rating_count': self.rating_count,
            'is_available': self.is_available,
            'sku_count': self.sku_count,
            'animal_type': self.animal_type,
            'product_group': self.product_group,
            'is_grain_free': self.is_grain_free,
            'is_hypoallergenic': self.is_hypoallergenic,
            'is_veterinary': self.is_veterinary,
            'brand_name': self.brand.name if self.brand else None,
        }
    
    def to_detail_dict(self):
        """
        Полная сериализация для страницы товара.
        Включает все изображения.
        """
        data = self.to_catalog_dict()
        data.update({
            'description': self.description,
            'images': [
                self._fix_image_url(img.url)
                for img in self.product_images.filter(is_active=True).order_by('sort_order')
            ],
            'age_group': self.age_group,
            'size_group': self.size_group,
            'country': self.country,
            'meta_title': self.meta_title,
            'meta_description': self.meta_description,
            'brand': self.brand.to_dict() if self.brand else None,
            'category': self.new_category.to_dict() if self.new_category else None,
        })
        return data
    
    def get_breed_suitability(self, breed):
        """
        Динамический расчёт совместимости товара с породой.
        
        Используется для API подбора корма без предварительной генерации
        миллионов записей ProductBreedRecommendation.
        
        Args:
            breed: объект Breed
            
        Returns:
            dict: {
                'suitability': 'ideal'|'recommended'|'suitable'|'caution'|'not_suitable',
                'score': 0-100,
                'reasons': ['Подходит по размеру', ...]
            }
        """
        # Проверка совместимости по виду животного
        if self.animal_type not in ['all', breed.species]:
            return {
                'suitability': 'not_suitable',
                'score': 0,
                'reasons': ['Не подходит для данного вида животного']
            }
        
        score = 50  # Базовый скор
        reasons = []
        
        # Маппинг size_group → size_category
        SIZE_MAP = {
            'mini': ['toy'],
            'small': ['toy', 'small'],
            'medium': ['medium'],
            'large': ['large'],
            'giant': ['large', 'giant'],
            'all': ['toy', 'small', 'medium', 'large', 'giant'],
        }
        
        product_size = self.size_group or 'all'
        suitable_sizes = SIZE_MAP.get(product_size, ['toy', 'small', 'medium', 'large', 'giant'])
        
        # Проверка размера
        if product_size != 'all':
            if breed.size_category == product_size:
                score += 25
                reasons.append(f'Идеально для {breed.get_size_category_display().lower()} пород')
            elif breed.size_category in suitable_sizes:
                score += 15
                reasons.append(f'Подходит для {breed.get_size_category_display().lower()} пород')
            else:
                score -= 20
                reasons.append(f'Размер корма не оптимален для породы')
        
        details = getattr(self, 'food_details', None)
        health_conditions = details.health_conditions if details else []
        # Проверка health_conditions
        if health_conditions and breed.health_risks:
            HEALTH_MAP = {
                'urinary': ['urinary_stones', 'kidney_disease', 'bladder_stones'],
                'obesity': ['obesity', 'overweight'],
                'joint': ['hip_dysplasia', 'elbow_dysplasia', 'arthritis', 'joint_issues'],
                'skin': ['skin_allergies', 'dermatitis', 'atopic_dermatitis'],
                'digestive': ['digestive_issues', 'ibd', 'pancreatitis'],
                'cardiac': ['heart_disease', 'dcm', 'valve_disease'],
                'dental': ['dental_disease', 'periodontal_disease'],
            }
            
            breed_conditions = {
                risk.get('condition_code', '') 
                for risk in breed.health_risks 
                if isinstance(risk, dict)
            }
            
            for health_cond in health_conditions:
                mapped_conditions = HEALTH_MAP.get(health_cond, [])
                if breed_conditions & set(mapped_conditions):
                    score += 15
                    reasons.append(f'Поддержка здоровья: {health_cond}')
        
        # Бонусы за специальные свойства
        if (details.is_hypoallergenic if details else self.is_hypoallergenic):
            score += 5
            reasons.append('Гипоаллергенный корм')
        
        if (details.is_veterinary if details else self.is_veterinary):
            score += 10
            reasons.append('Ветеринарная диета')
        
        if (details.grain_free if details else self.is_grain_free):
            score += 3
            reasons.append('Беззерновой')
        
        # Определение итогового уровня
        score = min(max(score, 0), 100)
        
        if score >= 80:
            suitability = 'ideal'
        elif score >= 65:
            suitability = 'recommended'
        elif score >= 45:
            suitability = 'suitable'
        elif score >= 30:
            suitability = 'caution'
        else:
            suitability = 'not_suitable'
        
        return {
            'suitability': suitability,
            'score': score,
            'reasons': reasons[:3]  # Максимум 3 причины
        }
    
    @classmethod
    def get_for_breed(cls, breed, product_group='food', limit=20):
        """
        Получить товары, подходящие для породы.
        
        Args:
            breed: объект Breed
            product_group: 'food', 'treats', 'vitamins' и т.д.
            limit: максимальное количество товаров
            
        Returns:
            QuerySet товаров с аннотацией _breed_score
        """
        from django.db.models import Case, When, Value, IntegerField
        
        # Базовый фильтр
        qs = cls.objects.filter(
            status=1,
            is_available=True,
            product_group=product_group
        ).filter(
            animal_type__in=['all', breed.species]
        )
        
        # Маппинг размеров для сортировки
        SIZE_MAP = {
            'toy': ['mini', 'small', 'all'],
            'small': ['small', 'mini', 'all'],
            'medium': ['medium', 'all'],
            'large': ['large', 'giant', 'all'],
            'giant': ['giant', 'large', 'all'],
        }
        
        preferred_sizes = SIZE_MAP.get(breed.size_category, ['all'])
        
        # Аннотация скора для сортировки
        size_cases = [
            When(size_group=size, then=Value(100 - i * 20))
            for i, size in enumerate(preferred_sizes)
        ]
        size_cases.append(When(size_group__isnull=True, then=Value(50)))
        size_cases.append(When(size_group='all', then=Value(60)))
        
        qs = qs.annotate(
            _size_score=Case(*size_cases, default=Value(30), output_field=IntegerField())
        )
        
        # Сортировка: ветеринарные диеты выше, затем по размеру, затем по рейтингу
        qs = qs.order_by('-is_veterinary', '-is_hypoallergenic', '-_size_score', '-rating')
        
        return qs[:limit]


class ProductSKU(models.Model):
    """
    Вариации товаров (разные веса, вкусы, размеры, цвета).
    
    Каждый товар может иметь несколько SKU с разными ценами и характеристиками.
    """
    
    # Связь с товаром
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='skus',
        verbose_name='Товар'
    )
    
    # Идентификаторы
    kotmatros_variant_id = models.BigIntegerField(
        unique=True,
        null=True, 
        blank=True,
        db_column='external_id',  # Сохраняем имя колонки для обратной совместимости
        verbose_name='ID SKU в Kotmatros'
    )
    sku = models.CharField(max_length=100, blank=True, verbose_name='Артикул')
    name = models.CharField(
        max_length=255, 
        blank=True,
        verbose_name='Название вариации',
        help_text='"2 кг", "Курица", "M"'
    )
    
    # Цены
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Цена')
    compare_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name='Старая цена'
    )
    
    # Наличие
    available = models.BooleanField(default=True, verbose_name='В наличии')
    stock_quantity = models.IntegerField(null=True, blank=True, verbose_name='Количество на складе')
    
    # ==========================================================================
    # АТРИБУТЫ ВАРИАЦИИ (денормализованы для фильтров)
    # ==========================================================================
    
    # Вес (для кормов)
    weight_kg = models.DecimalField(
        max_digits=8, 
        decimal_places=3, 
        null=True, 
        blank=True,
        verbose_name='Вес (кг)',
        help_text='0.4, 2.0, 10.0'
    )
    weight_display = models.CharField(
        max_length=20, 
        blank=True,
        verbose_name='Вес (отображение)',
        help_text='"400 г", "2 кг", "10 кг"'
    )
    
    # Вкус (для кормов)
    flavor = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        verbose_name='Вкус (код)',
        help_text='chicken, beef, fish, lamb'
    )
    flavor_display = models.CharField(
        max_length=100, 
        blank=True,
        verbose_name='Вкус (отображение)',
        help_text='"Курица", "Говядина", "Рыба"'
    )
    
    # Размер (для одежды/амуниции)
    size_code = models.CharField(
        max_length=10, 
        blank=True, 
        null=True,
        verbose_name='Размер (код)',
        help_text='XS, S, M, L, XL, XXL'
    )
    size_back_cm = models.SmallIntegerField(
        null=True, 
        blank=True,
        verbose_name='Длина спины (см)'
    )
    size_chest_cm = models.SmallIntegerField(
        null=True, 
        blank=True,
        verbose_name='Обхват груди (см)'
    )
    size_neck_cm = models.SmallIntegerField(
        null=True, 
        blank=True,
        verbose_name='Обхват шеи (см)'
    )
    
    # Цвет
    color = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        verbose_name='Цвет (код)',
        help_text='red, blue, black'
    )
    color_display = models.CharField(
        max_length=100, 
        blank=True,
        verbose_name='Цвет (отображение)',
        help_text='"Красный", "Синий"'
    )
    color_hex = models.CharField(
        max_length=7, 
        blank=True, 
        null=True,
        verbose_name='Цвет HEX',
        help_text='#FF0000'
    )
    
    # Объем (для жидкостей)
    volume_ml = models.IntegerField(
        null=True, 
        blank=True,
        verbose_name='Объём (мл)',
        help_text='250, 500, 1000'
    )
    volume_display = models.CharField(
        max_length=20, 
        blank=True,
        verbose_name='Объём (отображение)',
        help_text='"250 мл", "1 л"'
    )
    
    # Количество (для упаковок)
    pack_quantity = models.IntegerField(
        null=True, 
        blank=True,
        verbose_name='Количество в упаковке',
        help_text='10, 50, 100 (пелёнок, таблеток)'
    )
    
    # Дополнительные данные
    features = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Характеристики',
        help_text='Дополнительные данные из API'
    )
    
    # Сортировка
    sort_order = models.SmallIntegerField(default=1, verbose_name='Порядок сортировки')
    is_default = models.BooleanField(
        default=False,
        verbose_name='По умолчанию',
        help_text='Вариация, отображаемая по умолчанию'
    )
    
    # Статус
    status = models.SmallIntegerField(default=1, verbose_name='Статус')
    
    class Meta:
        db_table = 'shop_product_skus'
        verbose_name = 'SKU товара'
        verbose_name_plural = 'SKU товаров'
        ordering = ['product', 'sort_order']
        constraints = [
            models.UniqueConstraint(
                fields=['product', 'sku'],
                name='unique_product_sku'
            )
        ]
        indexes = [
            models.Index(fields=['product', 'status', 'available'], name='idx_skus_product'),
            models.Index(fields=['weight_kg'], name='idx_skus_weight'),
            models.Index(fields=['flavor'], name='idx_skus_flavor'),
            models.Index(fields=['size_code'], name='idx_skus_size'),
            models.Index(fields=['color'], name='idx_skus_color'),
            models.Index(fields=['kotmatros_variant_id'], name='idx_skus_kotmatros'),
        ]
    
    def __str__(self):
        if self.name:
            return f"{self.product.name} - {self.name}"
        return f"{self.product.name} - {self.sku}"
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': self.id,
            'sku': self.sku,
            'name': self.name,
            'price': float(self.price),
            'compare_price': float(self.compare_price) if self.compare_price else None,
            'available': self.available,
            'stock_quantity': self.stock_quantity,
            'weight_display': self.weight_display,
            'weight_kg': float(self.weight_kg) if self.weight_kg else None,
            'flavor': self.flavor,
            'flavor_display': self.flavor_display,
            'size_code': self.size_code,
            'size_back_cm': self.size_back_cm,
            'size_chest_cm': self.size_chest_cm,
            'size_neck_cm': self.size_neck_cm,
            'color': self.color,
            'color_display': self.color_display,
            'color_hex': self.color_hex,
            'volume_ml': self.volume_ml,
            'volume_display': self.volume_display,
            'pack_quantity': self.pack_quantity,
            'is_default': self.is_default,
        }


class ProductImage(models.Model):
    """Галерея изображений товаров."""

    IMAGE_TYPE_CHOICES = [
        ('main', 'Основное'),
        ('pack', 'Упаковка'),
        ('composition', 'Состав'),
        ('nutrition_table', 'Таблица нутриентов'),
        ('other', 'Другое'),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='product_images',
        verbose_name='Товар'
    )
    variant = models.ForeignKey(
        ProductSKU,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='variant_images',
        verbose_name='Вариант (SKU)'
    )
    url = models.TextField(verbose_name='URL изображения')
    image_type = models.CharField(
        max_length=30,
        choices=IMAGE_TYPE_CHOICES,
        default='other',
        verbose_name='Тип изображения'
    )
    sort_order = models.IntegerField(default=0, verbose_name='Порядок')
    is_active = models.BooleanField(default=True, verbose_name='Активно')

    class Meta:
        db_table = 'shop_product_images'
        verbose_name = 'Изображение товара'
        verbose_name_plural = 'Изображения товаров'
        ordering = ['sort_order', 'id']
        indexes = [
            models.Index(fields=['product']),
            models.Index(fields=['variant']),
        ]


class ProductCategory(models.Model):
    """Дополнительные категории товара (many-to-many)."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='extra_category_links'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='product_links'
    )

    class Meta:
        db_table = 'shop_product_categories'
        verbose_name = 'Связь товар-категория'
        verbose_name_plural = 'Связи товар-категория'
        unique_together = ('product', 'category')


class Attribute(models.Model):
    """Справочник атрибутов (цвет, размер, вкус и т.д.)."""

    VALUE_TYPE_CHOICES = [
        ('string', 'Строка'),
        ('number', 'Число'),
        ('boolean', 'Булево'),
        ('enum', 'Перечисление'),
    ]

    code = models.CharField(max_length=100, unique=True, verbose_name='Код')
    name = models.CharField(max_length=255, verbose_name='Название')
    value_type = models.CharField(max_length=20, choices=VALUE_TYPE_CHOICES, verbose_name='Тип значения')
    unit = models.CharField(max_length=50, blank=True, default='', verbose_name='Ед. измерения')
    is_multi = models.BooleanField(default=False, verbose_name='Мультизначение')
    is_filterable = models.BooleanField(default=True, verbose_name='Использовать в фильтрах')
    is_active = models.BooleanField(default=True, verbose_name='Активно')

    class Meta:
        db_table = 'shop_attributes'
        verbose_name = 'Атрибут'
        verbose_name_plural = 'Атрибуты'
        ordering = ['name']

    def __str__(self):
        return self.name


class AttributeValue(models.Model):
    """Значения атрибутов."""

    attribute = models.ForeignKey(
        Attribute,
        on_delete=models.CASCADE,
        related_name='values',
        verbose_name='Атрибут'
    )
    value = models.CharField(max_length=255, verbose_name='Значение')
    display = models.CharField(max_length=255, blank=True, default='', verbose_name='Отображаемое значение')
    sort_order = models.IntegerField(default=0, verbose_name='Порядок')
    is_active = models.BooleanField(default=True, verbose_name='Активно')

    class Meta:
        db_table = 'shop_attribute_values'
        verbose_name = 'Значение атрибута'
        verbose_name_plural = 'Значения атрибутов'
        ordering = ['sort_order', 'id']
        unique_together = ('attribute', 'value')

    def __str__(self):
        return self.display or self.value


class VariantAttributeValue(models.Model):
    """Связь значений атрибутов с SKU."""

    variant = models.ForeignKey(
        ProductSKU,
        on_delete=models.CASCADE,
        related_name='attribute_values'
    )
    attribute_value = models.ForeignKey(
        AttributeValue,
        on_delete=models.CASCADE,
        related_name='variant_links'
    )

    class Meta:
        db_table = 'shop_variant_attribute_values'
        verbose_name = 'Значение атрибута SKU'
        verbose_name_plural = 'Значения атрибутов SKU'
        unique_together = ('variant', 'attribute_value')


class ProductBreedRecommendation(models.Model):
    """
    Связь товаров с породами для персонализированных рекомендаций.
    
    Логика:
    1. Автоматический маппинг по size_group: товар с size_group="large" 
       рекомендуется породам с size_category="large"
    2. Маппинг по health_conditions: товар с health_conditions=["joint"] 
       рекомендуется породам с health_risks содержащим "hip_dysplasia"
    3. Ручные рекомендации администратором
    
    Использование:
    - API подбора корма для питомца
    - Блок "Рекомендации для вашей породы" на странице товара
    - Фильтр "Подходит для породы X" в каталоге
    """
    
    MATCH_TYPE_CHOICES = [
        ('size', 'По размеру'),
        ('health', 'По здоровью'),
        ('allergy', 'По аллергиям'),
        ('age', 'По возрасту'),
        ('manual', 'Ручная рекомендация'),
        ('auto', 'Авто (комплексный)'),
    ]
    
    SUITABILITY_CHOICES = [
        ('ideal', 'Идеально подходит'),
        ('recommended', 'Рекомендуется'),
        ('suitable', 'Подходит'),
        ('caution', 'С осторожностью'),
        ('not_recommended', 'Не рекомендуется'),
    ]
    
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='breed_recommendations',
        verbose_name='Товар'
    )
    breed = models.ForeignKey(
        'pets.Breed',
        on_delete=models.CASCADE,
        related_name='product_recommendations',
        verbose_name='Порода'
    )
    
    # Тип соответствия
    match_type = models.CharField(
        max_length=20,
        choices=MATCH_TYPE_CHOICES,
        default='auto',
        verbose_name='Тип соответствия'
    )
    
    # Уровень совместимости
    suitability = models.CharField(
        max_length=20,
        choices=SUITABILITY_CHOICES,
        default='suitable',
        verbose_name='Уровень совместимости'
    )
    
    # Оценка совместимости (0-100)
    score = models.SmallIntegerField(
        default=50,
        verbose_name='Оценка совместимости',
        help_text='0-100, используется для сортировки рекомендаций'
    )
    
    # Причина рекомендации (для отображения пользователю)
    reason = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Причина рекомендации',
        help_text='Например: "Подходит для крупных пород" или "Поддержка суставов"'
    )
    
    # Метаданные
    is_auto = models.BooleanField(
        default=True,
        verbose_name='Автоматическая',
        help_text='True = создана автоматически, False = добавлена вручную'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'shop_product_breed_recommendations'
        verbose_name = 'Рекомендация товара для породы'
        verbose_name_plural = 'Рекомендации товаров для пород'
        ordering = ['-score', 'breed__name']
        constraints = [
            models.UniqueConstraint(
                fields=['product', 'breed'],
                name='unique_product_breed'
            )
        ]
        indexes = [
            models.Index(fields=['product', 'suitability', '-score'], name='idx_breed_rec_product'),
            models.Index(fields=['breed', 'suitability', '-score'], name='idx_breed_rec_breed'),
            models.Index(fields=['match_type'], name='idx_breed_rec_type'),
        ]
    
    def __str__(self):
        return f"{self.product.name[:30]} → {self.breed.name} ({self.get_suitability_display()})"
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'breed_id': self.breed_id,
            'breed_name': self.breed.name,
            'breed_slug': self.breed.slug,
            'match_type': self.match_type,
            'suitability': self.suitability,
            'score': self.score,
            'reason': self.reason,
        }
    
    @classmethod
    def generate_for_product(cls, product):
        """
        Генерация рекомендаций для товара на основе его характеристик.
        
        Алгоритм:
        1. Если товар — корм (product_group='food'):
           - Маппинг size_group → breed.size_category
           - Маппинг health_conditions → breed.health_risks
           - Маппинг allergens → исключение пород с allergy_risks
        2. Для всех товаров:
           - Маппинг animal_type → breed.species
        
        Returns:
            list[ProductBreedRecommendation]: Созданные рекомендации
        """
        from apps.pets.breed_models import Breed
        
        # Удаляем старые авто-рекомендации
        cls.objects.filter(product=product, is_auto=True).delete()
        
        recommendations = []
        
        # Базовый фильтр по виду животного
        animal_type = product.animal_type
        if animal_type == 'all':
            breeds = Breed.objects.all()
        else:
            # dog → dog, cat → cat
            species = 'dog' if animal_type == 'dog' else 'cat'
            breeds = Breed.objects.filter(species=species)
        
        # Маппинг size_group товара → size_category породы
        SIZE_MAP = {
            'mini': ['toy'],
            'small': ['toy', 'small'],
            'medium': ['medium'],
            'large': ['large'],
            'giant': ['large', 'giant'],
            'all': ['toy', 'small', 'medium', 'large', 'giant'],
        }
        
        product_size = product.size_group or 'all'
        suitable_sizes = SIZE_MAP.get(product_size, ['toy', 'small', 'medium', 'large', 'giant'])
        
        # Фильтруем породы по размеру
        if product_size != 'all':
            breeds = breeds.filter(size_category__in=suitable_sizes)
        
        # Создаём рекомендации
        for breed in breeds:
            score = 50  # Базовый скор
            reasons = []
            match_type = 'auto'
            suitability = 'suitable'
            
            # Бонус за точное совпадение размера
            if product_size and product_size != 'all':
                if breed.size_category == product_size:
                    score += 20
                    reasons.append(f"Идеально для {breed.get_size_category_display().lower()} пород")
                    suitability = 'recommended'
                elif breed.size_category in suitable_sizes:
                    score += 10
                    reasons.append(f"Подходит для {breed.get_size_category_display().lower()} пород")
            
            details = getattr(product, 'food_details', None)
            health_conditions = details.health_conditions if details else []
            # Бонус за health_conditions
            if health_conditions and breed.health_risks:
                # Маппинг health_conditions → health_risks condition_codes
                HEALTH_MAP = {
                    'urinary': ['urinary_stones', 'kidney_disease', 'bladder_stones'],
                    'obesity': ['obesity', 'overweight'],
                    'joint': ['hip_dysplasia', 'elbow_dysplasia', 'arthritis', 'joint_issues'],
                    'skin': ['skin_allergies', 'dermatitis', 'atopic_dermatitis'],
                    'digestive': ['digestive_issues', 'ibd', 'pancreatitis'],
                    'cardiac': ['heart_disease', 'dcm', 'valve_disease'],
                    'dental': ['dental_disease', 'periodontal_disease'],
                }
                
                breed_conditions = {
                    risk.get('condition_code', '') 
                    for risk in breed.health_risks 
                    if isinstance(risk, dict)
                }
                
                for health_cond in health_conditions:
                    mapped_conditions = HEALTH_MAP.get(health_cond, [])
                    if breed_conditions & set(mapped_conditions):
                        score += 15
                        match_type = 'health'
                        suitability = 'ideal'
                        reasons.append(f"Поддержка здоровья: {health_cond}")
            
            # Бонус за гипоаллергенность
            if (details.is_hypoallergenic if details else product.is_hypoallergenic):
                score += 5
                reasons.append("Гипоаллергенный корм")
            
            # Бонус за ветеринарную диету
            if product.is_veterinary:
                score += 10
                match_type = 'health'
                reasons.append("Ветеринарная диета")
            
            # Итоговая оценка
            if score >= 80:
                suitability = 'ideal'
            elif score >= 65:
                suitability = 'recommended'
            elif score >= 50:
                suitability = 'suitable'
            
            reason = '; '.join(reasons[:2]) if reasons else ''
            
            recommendations.append(cls(
                product=product,
                breed=breed,
                match_type=match_type,
                suitability=suitability,
                score=min(score, 100),
                reason=reason[:255],
                is_auto=True
            ))
        
        # Bulk create
        if recommendations:
            cls.objects.bulk_create(recommendations, ignore_conflicts=True)
        
        return recommendations


# =============================================================================
# ДЕТАЛИ КОРМА (для подбора питания)
# =============================================================================

class FoodDetails(models.Model):
    """
    Детальная информация о корме для подбора питания.
    
    Связь 1:1 с Product для товаров категорий food/treats/supplements.
    Содержит нутриенты, ингредиенты, аллергены и другие данные для
    алгоритма подбора корма.
    """
    
    FOOD_TYPE_CHOICES = [
        ('food', 'Корм'),
        ('treat', 'Лакомство'),
        ('supplement', 'Витамины/добавки'),
    ]
    
    SIZE_CHOICES = [
        ('toy', 'Той'),
        ('small', 'Маленький'),
        ('medium', 'Средний'),
        ('large', 'Крупный'),
        ('giant', 'Гигантский'),
        ('all', 'Все размеры'),
    ]
    
    ACTIVITY_CHOICES = [
        ('low', 'Низкая'),
        ('normal', 'Нормальная'),
        ('high', 'Высокая'),
    ]
    
    KIBBLE_SIZE_CHOICES = [
        ('small', 'Мелкая'),
        ('medium', 'Средняя'),
        ('large', 'Крупная'),
    ]
    
    COMPATIBILITY_CHOICES = [
        ('regular', 'Обычный'),
        ('hypoallergenic', 'Гипоаллергенный'),
        ('therapeutic_renal', 'Лечебный: почки'),
        ('therapeutic_diabetic', 'Лечебный: диабет'),
        ('therapeutic_digestive', 'Лечебный: ЖКТ'),
        ('therapeutic_weight', 'Лечебный: вес'),
        ('therapeutic_urinary', 'Лечебный: МКБ'),
    ]
    
    SPECIAL_DIET_CHOICES = [
        ('sterilized', 'Для стерилизованных'),
        ('hypoallergenic', 'Гипоаллергенный'),
        ('sensitive_digestion', 'Чувствительное пищеварение'),
        ('weight_control', 'Контроль веса'),
        ('grain_free', 'Беззерновой'),
        ('urinary', 'Здоровье мочевыводящих путей'),
        ('kidney_support', 'Поддержка почек'),
        ('joint_support', 'Поддержка суставов'),
        ('gastrointestinal', 'ЖКТ'),
        ('skin_coat', 'Кожа и шерсть'),
    ]
    
    # Связь с товаром (1:1)
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='food_details',
        verbose_name='Товар'
    )
    
    # Тип корма
    product_type = models.CharField(
        max_length=20,
        choices=FOOD_TYPE_CHOICES,
        default='food',
        verbose_name='Тип продукта'
    )
    
    # Целевая аудитория
    target_size = models.CharField(
        max_length=10,
        choices=SIZE_CHOICES,
        blank=True,
        null=True,
        verbose_name='Целевой размер'
    )
    activity_level = models.CharField(
        max_length=10,
        choices=ACTIVITY_CHOICES,
        blank=True,
        null=True,
        verbose_name='Уровень активности'
    )
    
    # Особенности
    grain_free = models.BooleanField(default=False, verbose_name='Беззерновой')
    is_hypoallergenic = models.BooleanField(default=False, verbose_name='Гипоаллергенный')
    is_veterinary = models.BooleanField(default=False, verbose_name='Ветеринарная диета')
    
    # Специальные назначения (массив)
    special_diet = ArrayField(
        models.CharField(max_length=30),
        default=list,
        blank=True,
        verbose_name='Специальные назначения'
    )
    
    # Совместимость
    compatibility_group = models.CharField(
        max_length=30,
        choices=COMPATIBILITY_CHOICES,
        default='regular',
        verbose_name='Группа совместимости'
    )
    
    # Физические характеристики
    kibble_size = models.CharField(
        max_length=10,
        choices=KIBBLE_SIZE_CHOICES,
        blank=True,
        null=True,
        verbose_name='Размер гранулы'
    )
    shelf_life_months = models.IntegerField(null=True, blank=True, verbose_name='Срок годности (мес)')
    storage = models.TextField(blank=True, verbose_name='Условия хранения')
    
    # Нутриенты (на 100г)
    meat_percent = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        verbose_name='Процент мяса'
    )
    energy_kcal_per_100g = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        verbose_name='Калорийность (ккал/100г)'
    )
    protein_g_per_100g = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        verbose_name='Белок (г/100г)'
    )
    fat_g_per_100g = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        verbose_name='Жир (г/100г)'
    )
    carbs_g_per_100g = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        verbose_name='Углеводы (г/100г)'
    )
    fiber_g_per_100g = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        verbose_name='Клетчатка (г/100г)'
    )
    ash_g_per_100g = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        verbose_name='Зола (г/100г)'
    )
    moisture_percent = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        verbose_name='Влажность (%)'
    )
    
    # Состав (массивы для фильтрации)
    ingredients = ArrayField(
        models.CharField(max_length=100),
        default=list,
        blank=True,
        verbose_name='Ингредиенты'
    )
    allergens = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        verbose_name='Аллергены'
    )
    health_conditions = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        verbose_name='Показания по здоровью'
    )
    
    # Возрастные ограничения
    age_min_months = models.IntegerField(null=True, blank=True, verbose_name='Мин. возраст (мес)')
    age_max_months = models.IntegerField(null=True, blank=True, verbose_name='Макс. возраст (мес)')
    
    class Meta:
        db_table = 'shop_food_details'
        verbose_name = 'Детали корма'
        verbose_name_plural = 'Детали кормов'
    
    def __str__(self):
        return f"FoodDetails: {self.product.name}"
    
    def to_dict(self):
        return {
            'product_type': self.product_type,
            'target_size': self.target_size,
            'activity_level': self.activity_level,
            'grain_free': self.grain_free,
            'is_hypoallergenic': self.is_hypoallergenic,
            'is_veterinary': self.is_veterinary,
            'special_diet': self.special_diet,
            'compatibility_group': self.compatibility_group,
            'kibble_size': self.kibble_size,
            'energy_kcal_per_100g': float(self.energy_kcal_per_100g) if self.energy_kcal_per_100g else None,
            'protein_g_per_100g': float(self.protein_g_per_100g) if self.protein_g_per_100g else None,
            'fat_g_per_100g': float(self.fat_g_per_100g) if self.fat_g_per_100g else None,
            'fiber_g_per_100g': float(self.fiber_g_per_100g) if self.fiber_g_per_100g else None,
            'ingredients': self.ingredients,
            'allergens': self.allergens,
            'health_conditions': self.health_conditions,
        }


# =============================================================================
# ИЗБРАННОЕ
# =============================================================================

class Wishlist(models.Model):
    """
    Избранные товары пользователя.
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wishlists',
        verbose_name='Пользователь'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='wishlisted_by',
        verbose_name='Товар'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Добавлено')
    
    class Meta:
        db_table = 'shop_wishlists'
        verbose_name = 'Избранное'
        verbose_name_plural = 'Избранное'
        unique_together = ['user', 'product']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.product.name}"


# =============================================================================
# ПРОМО-АКЦИИ И СКИДКИ
# =============================================================================

class Promotion(models.Model):
    """
    Промокоды и акции.
    """
    
    DISCOUNT_TYPE_CHOICES = [
        ('percent', 'Процент'),
        ('fixed', 'Фиксированная сумма'),
        ('free_shipping', 'Бесплатная доставка'),
    ]
    
    TARGET_CHOICES = [
        ('all', 'Вся корзина'),
        ('category', 'Категория'),
        ('brand', 'Бренд'),
        ('product', 'Конкретный товар'),
    ]
    
    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Промокод'
    )
    name = models.CharField(max_length=255, verbose_name='Название акции')
    description = models.TextField(blank=True, verbose_name='Описание для пользователя')
    
    # Тип и размер скидки
    discount_type = models.CharField(
        max_length=20,
        choices=DISCOUNT_TYPE_CHOICES,
        default='percent',
        verbose_name='Тип скидки'
    )
    discount_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Размер скидки'
    )
    
    # Ограничения
    min_order_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Минимальная сумма заказа'
    )
    max_discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Максимальная сумма скидки'
    )
    max_uses = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Максимум использований'
    )
    max_uses_per_user = models.IntegerField(
        default=1,
        verbose_name='Максимум на пользователя'
    )
    uses_count = models.IntegerField(
        default=0,
        verbose_name='Использовано раз'
    )
    
    # К чему применяется
    applies_to = models.CharField(
        max_length=20,
        choices=TARGET_CHOICES,
        default='all',
        verbose_name='Применяется к'
    )
    target_ids = ArrayField(
        models.BigIntegerField(),
        default=list,
        blank=True,
        verbose_name='ID целей',
        help_text='ID категорий/брендов/товаров'
    )
    
    # Период действия
    starts_at = models.DateTimeField(null=True, blank=True, verbose_name='Начало')
    ends_at = models.DateTimeField(null=True, blank=True, verbose_name='Окончание')
    
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    
    class Meta:
        db_table = 'shop_promotions'
        verbose_name = 'Промокод'
        verbose_name_plural = 'Промокоды'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    def is_valid(self):
        """Проверка валидности промокода."""
        if not self.is_active:
            return False
        
        now = timezone.now()
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        if self.max_uses and self.uses_count >= self.max_uses:
            return False
        
        return True
    
    def can_use_by_user(self, user):
        """Проверка, может ли пользователь использовать промокод."""
        if not self.is_valid():
            return False
        
        user_uses = self.usages.filter(user=user).count()
        return user_uses < self.max_uses_per_user


class PromotionUsage(models.Model):
    """
    История использования промокодов.
    """
    
    promotion = models.ForeignKey(
        Promotion,
        on_delete=models.CASCADE,
        related_name='usages',
        verbose_name='Промокод'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='promotion_usages',
        verbose_name='Пользователь'
    )
    order = models.ForeignKey(
        'Order',
        on_delete=models.CASCADE,
        related_name='promotion_usages',
        verbose_name='Заказ'
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Сумма скидки'
    )
    used_at = models.DateTimeField(auto_now_add=True, verbose_name='Использован')
    
    class Meta:
        db_table = 'shop_promotion_usages'
        verbose_name = 'Использование промокода'
        verbose_name_plural = 'Использования промокодов'
    
    def __str__(self):
        return f"{self.promotion.code} - Order {self.order_id}"


# =============================================================================
# ИСТОРИЯ ЦЕН
# =============================================================================

class PriceHistory(models.Model):
    """
    История изменения цен для аналитики и отображения динамики.
    """
    
    variant = models.ForeignKey(
        ProductSKU,
        on_delete=models.CASCADE,
        related_name='price_history',
        verbose_name='Вариант товара'
    )
    price_regular = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Базовая цена'
    )
    price_discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Цена со скидкой'
    )
    recorded_at = models.DateTimeField(auto_now_add=True, verbose_name='Записано')
    
    class Meta:
        db_table = 'shop_price_history'
        verbose_name = 'История цены'
        verbose_name_plural = 'История цен'
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['variant', '-recorded_at']),
        ]
    
    def __str__(self):
        return f"{self.variant} - {self.price_regular} @ {self.recorded_at}"


# =============================================================================
# СВЯЗИ МЕЖДУ ТОВАРАМИ
# =============================================================================

class ProductRelation(models.Model):
    """
    Связи между товарами для рекомендаций.
    """
    
    RELATION_TYPE_CHOICES = [
        ('similar', 'Похожие товары'),
        ('complementary', 'Сопутствующие'),
        ('upsell', 'Более дорогая альтернатива'),
        ('cross_sell', 'Перекрёстные продажи'),
    ]
    
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='related_from',
        verbose_name='Товар'
    )
    related_product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='related_to',
        verbose_name='Связанный товар'
    )
    relation_type = models.CharField(
        max_length=20,
        choices=RELATION_TYPE_CHOICES,
        verbose_name='Тип связи'
    )
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        verbose_name='Вес связи'
    )
    is_auto = models.BooleanField(
        default=False,
        verbose_name='Автоматическая',
        help_text='Сгенерирована алгоритмом или вручную'
    )
    sort_order = models.IntegerField(default=0, verbose_name='Порядок')
    
    class Meta:
        db_table = 'shop_product_relations'
        verbose_name = 'Связь товаров'
        verbose_name_plural = 'Связи товаров'
        unique_together = ['product', 'related_product', 'relation_type']
        ordering = ['-score', 'sort_order']
    
    def __str__(self):
        return f"{self.product.name} -> {self.related_product.name} ({self.relation_type})"


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
    
    При добавлении товара с вариациями:
    - product указывает на основной товар
    - sku указывает на конкретную вариацию (опционально)
    - Цена берётся из sku.price если указан, иначе из product.price
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
    sku = models.ForeignKey(
        ProductSKU,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Вариация товара',
        help_text='Конкретная вариация (вес, вкус, размер)'
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
        # Уникальность: один товар/SKU или курс в корзине
        # - Для товаров с SKU: уникальность по cart + product + sku
        # - Для товаров без SKU: уникальность по cart + product (sku=NULL)
        # - Для курсов: уникальность по cart + course + pet
        constraints = [
            models.UniqueConstraint(
                fields=['cart', 'product', 'sku'],
                name='unique_cart_product_sku',
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

    def get_unit_price(self):
        """Цена за единицу с учётом SKU."""
        if self.sku:
            return self.sku.price
        elif self.product:
            return self.product.discounted_price
        elif self.course:
            return self.course.price
        return Decimal('0.00')

    def get_total(self):
        """Стоимость позиции с учётом скидки и SKU."""
        if self.product:
            # Если указан SKU, берём цену из него
            if self.sku:
                return self.sku.price * self.quantity
            return self.product.discounted_price * self.quantity
        elif self.course:
            return self.course.price
        return Decimal('0.00')

    def to_dict(self):
        """Сериализация для API."""
        if self.product:
            data = {
                'id': self.id,
                'product': self.product.to_dict(),
                'quantity': self.quantity,
                'price': self.get_total()
            }
            # Добавляем информацию о SKU если есть
            if self.sku:
                data['sku'] = self.sku.to_dict()
                data['unit_price'] = float(self.sku.price)
            else:
                data['unit_price'] = float(self.product.discounted_price)
            return data
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
        ('partially_delivered', 'Частично доставлен'),
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
    sku = models.ForeignKey(
        ProductSKU,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Вариация товара'
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
    sku_name = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        verbose_name='Название вариации',
        help_text='Например: "2 кг", "Курица", "M"'
    )
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
            data = {
                'product_id': self.product_id,
                'product_name': self.product_name,
                'price': float(self.price),
                'quantity': self.quantity,
                'total': float(self.get_total())
            }
            # Добавляем изображение товара, если товар существует
            if self.product:
                if self.product.image_url:
                    data['product_image'] = Product._fix_image_url(self.product.image_url)
                else:
                    first_image = self.product.product_images.filter(is_active=True).order_by('sort_order').first()
                    data['product_image'] = Product._fix_image_url(first_image.url) if first_image else None
            return data


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
            if self.order_item.sku:
                sku = self.order_item.sku
                if sku.stock_quantity is None:
                    sku.stock_quantity = 0
                sku.stock_quantity += self.quantity
                sku.available = sku.stock_quantity > 0
                sku.save(update_fields=['stock_quantity', 'available'])
            elif self.order_item.product:
                product = self.order_item.product
                product.is_available = True
                product.save(update_fields=['is_available'])

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


# =============================================================================
# АНАЛИТИКА И КОНСТРУКТОР ГРАФИКОВ
# =============================================================================

import uuid
from django.core.validators import MinValueValidator, MaxValueValidator


class AnalyticMetric(models.Model):
    """
    Модель для описания доступных метрик аналитики.

    Определяет все возможные показатели, которые можно использовать
    в конструкторе графиков.
    """

    METRIC_TYPES = [
        ('count', 'Количество'),
        ('sum', 'Сумма'),
        ('avg', 'Среднее'),
        ('min', 'Минимум'),
        ('max', 'Максимум'),
        ('percentile', 'Процентиль'),
        ('distinct', 'Уникальные значения'),
    ]

    DATA_TYPES = [
        ('integer', 'Целое число'),
        ('decimal', 'Десятичное число'),
        ('string', 'Строка'),
        ('date', 'Дата'),
        ('datetime', 'Дата и время'),
        ('boolean', 'Логический'),
        ('json', 'JSON'),
    ]

    AGGREGATION_TYPES = [
        ('count', 'COUNT'),
        ('sum', 'SUM'),
        ('avg', 'AVG'),
        ('min', 'MIN'),
        ('max', 'MAX'),
        ('stddev', 'STDDEV'),
        ('variance', 'VARIANCE'),
    ]

    # Основная информация
    id = models.CharField(
        max_length=100,
        primary_key=True,
        help_text="Уникальный идентификатор метрики"
    )
    name = models.CharField(
        max_length=200,
        help_text="Человеко-понятное название метрики"
    )
    description = models.TextField(
        blank=True,
        help_text="Подробное описание метрики"
    )

    # Классификация
    category = models.CharField(
        max_length=50,
        help_text="Категория метрики (users, pets, orders, courses, etc.)"
    )
    subcategory = models.CharField(
        max_length=100,
        blank=True,
        help_text="Подкатегория для дополнительной группировки"
    )

    # Типы данных и агрегации
    data_type = models.CharField(
        max_length=20,
        choices=DATA_TYPES,
        help_text="Тип данных метрики"
    )
    default_aggregation = models.CharField(
        max_length=20,
        choices=AGGREGATION_TYPES,
        default='count',
        help_text="Агрегация по умолчанию"
    )
    available_aggregations = models.JSONField(
        default=list,
        help_text="Список доступных типов агрегации"
    )

    # SQL и источники данных
    table_name = models.CharField(
        max_length=100,
        help_text="Имя таблицы в базе данных"
    )
    field_name = models.CharField(
        max_length=100,
        help_text="Имя поля в таблице"
    )
    sql_template = models.TextField(
        blank=True,
        help_text="SQL шаблон для сложных вычислений"
    )

    # Связи и фильтры
    related_fields = models.JSONField(
        default=list,
        help_text="Связанные поля для JOIN операций"
    )
    filter_fields = models.JSONField(
        default=list,
        help_text="Поля, доступные для фильтрации"
    )
    dimension_fields = models.JSONField(
        default=list,
        help_text="Поля, доступные для группировки (оси X)"
    )

    # Мета-информация
    units = models.CharField(
        max_length=50,
        blank=True,
        help_text="Единицы измерения"
    )
    format_pattern = models.CharField(
        max_length=100,
        blank=True,
        help_text="Шаблон форматирования (для чисел, дат)"
    )

    # Настройки
    is_active = models.BooleanField(
        default=True,
        help_text="Активна ли метрика"
    )
    is_system = models.BooleanField(
        default=False,
        help_text="Системная метрика (нельзя удалять)"
    )
    cache_ttl = models.PositiveIntegerField(
        default=300,
        help_text="Время жизни кэша в секундах"
    )

    # Отслеживание
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_metrics'
    )

    class Meta:
        db_table = 'analytics_metrics'
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['table_name', 'field_name']),
        ]

    def __str__(self):
        return f"{self.category}.{self.id} - {self.name}"

    def get_display_name(self):
        """Получить отображаемое имя с единицами измерения."""
        if self.units:
            return f"{self.name} ({self.units})"
        return self.name


class ChartConfig(models.Model):
    """
    Модель для хранения конфигураций графиков.

    Содержит полную конфигурацию графика, созданного в конструкторе.
    """

    CHART_TYPES = [
        ('line', 'Линейный график'),
        ('bar', 'Столбчатая диаграмма'),
        ('area', 'Диаграмма с областями'),
        ('scatter', 'Точечная диаграмма'),
        ('bubble', 'Пузырьковая диаграмма'),
        ('pie', 'Круговая диаграмма'),
        ('combo', 'Комбинированный график'),
        ('heatmap', 'Тепловая карта'),
    ]

    # Основная информация
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(
        max_length=200,
        help_text="Название графика"
    )
    description = models.TextField(
        blank=True,
        help_text="Описание графика"
    )

    # Конфигурация
    chart_type = models.CharField(
        max_length=20,
        choices=CHART_TYPES,
        default='line',
        help_text="Основной тип графика"
    )

    # Размеры и настройки canvas
    canvas_config = models.JSONField(
        default=dict,
        help_text="Настройки холста (ширина, высота, margins)"
    )

    # Конфигурация осей
    x_axis_config = models.JSONField(
        default=dict,
        help_text="Конфигурация оси X"
    )
    y_axis_config = models.JSONField(
        default=dict,
        help_text="Конфигурация оси Y (или осей Y для multi-axis)"
    )

    # Слои данных
    data_layers = models.JSONField(
        default=list,
        help_text="Конфигурация слоев данных"
    )

    # Фильтры и сегментация
    filters_config = models.JSONField(
        default=dict,
        help_text="Настройки фильтров"
    )
    segment_config = models.JSONField(
        default=dict,
        help_text="Настройки сегментации данных"
    )

    # Стили и оформление
    style_config = models.JSONField(
        default=dict,
        help_text="Настройки стилей и цветов"
    )
    legend_config = models.JSONField(
        default=dict,
        help_text="Настройки легенды"
    )

    # Интерактивность
    interaction_config = models.JSONField(
        default=dict,
        help_text="Настройки интерактивности (tooltips, drill-down)"
    )

    # Шаблоны и категории
    is_template = models.BooleanField(
        default=False,
        help_text="Является ли конфигурация шаблоном"
    )
    is_public = models.BooleanField(
        default=False,
        help_text="Доступен ли шаблон всем пользователям"
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        help_text="Категория шаблона"
    )
    tags = models.JSONField(
        default=list,
        help_text="Теги для поиска"
    )

    # Метаданные использования
    usage_count = models.PositiveIntegerField(
        default=0,
        help_text="Количество использований"
    )
    last_used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Последнее использование"
    )

    # Превью и экспорт
    preview_image = models.ImageField(
        upload_to='chart-previews/',
        null=True,
        blank=True,
        help_text="Превью изображение графика"
    )
    export_formats = models.JSONField(
        default=list,
        help_text="Доступные форматы экспорта"
    )

    # Отслеживание
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_charts'
    )

    # Версионность
    version = models.PositiveIntegerField(
        default=1,
        help_text="Версия конфигурации"
    )
    parent_config = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_configs',
        help_text="Родительская конфигурация (для версий)"
    )

    class Meta:
        db_table = 'analytics_chart_configs'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['created_by', '-updated_at']),
            models.Index(fields=['is_template', 'is_public']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"{self.name} ({self.chart_type})"

    def increment_usage(self):
        """Увеличить счетчик использования."""
        self.usage_count += 1
        self.last_used_at = timezone.now()
        self.save(update_fields=['usage_count', 'last_used_at'])

    def create_version(self, user):
        """Создать новую версию конфигурации."""
        # Копируем текущую конфигурацию
        new_config = ChartConfig.objects.create(
            name=self.name,
            description=self.description,
            chart_type=self.chart_type,
            canvas_config=self.canvas_config,
            x_axis_config=self.x_axis_config,
            y_axis_config=self.y_axis_config,
            data_layers=self.data_layers,
            filters_config=self.filters_config,
            segment_config=self.segment_config,
            style_config=self.style_config,
            legend_config=self.legend_config,
            interaction_config=self.interaction_config,
            is_template=self.is_template,
            is_public=self.is_public,
            category=self.category,
            tags=self.tags,
            created_by=user,
            parent_config=self,
            version=self.version + 1
        )
        return new_config


class ChartSession(models.Model):
    """
    Модель для отслеживания сессий работы с конструктором графиков.

    Позволяет сохранять промежуточное состояние работы пользователя.
    """

    STATUS_CHOICES = [
        ('active', 'Активная'),
        ('saved', 'Сохраненная'),
        ('expired', 'Истекшая'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chart_sessions'
    )
    config = models.JSONField(
        default=dict,
        help_text="Текущее состояние конфигурации"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )

    # Метаданные
    started_at = models.DateTimeField(auto_now_add=True)
    last_activity_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(
        help_text="Время истечения сессии"
    )

    class Meta:
        db_table = 'analytics_chart_sessions'
        indexes = [
            models.Index(fields=['user', '-last_activity_at']),
            models.Index(fields=['status', 'expires_at']),
        ]

    def __str__(self):
        return f"Session {self.id} - {self.user.email}"

    def is_expired(self):
        """Проверить, истекла ли сессия."""
        return timezone.now() > self.expires_at

    def extend_session(self, minutes=30):
        """Продлить сессию на указанное количество минут."""
        self.expires_at = timezone.now() + timezone.timedelta(minutes=minutes)
        self.save(update_fields=['expires_at'])


class AnalyticsLog(models.Model):
    """
    Модель для логирования аналитических запросов.

    Обеспечивает аудит и мониторинг использования системы аналитики.
    """

    ACTION_TYPES = [
        ('view_metrics', 'Просмотр метрик'),
        ('create_chart', 'Создание графика'),
        ('save_config', 'Сохранение конфигурации'),
        ('export_data', 'Экспорт данных'),
        ('share_template', 'Поделиться шаблоном'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='analytics_logs'
    )
    action = models.CharField(
        max_length=50,
        choices=ACTION_TYPES,
        help_text="Тип действия"
    )
    resource_type = models.CharField(
        max_length=50,
        help_text="Тип ресурса (chart, metric, template, etc.)"
    )
    resource_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="ID ресурса"
    )

    # Детали запроса
    metadata = models.JSONField(
        default=dict,
        help_text="Дополнительная информация о действии"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP адрес пользователя"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="User-Agent браузера"
    )

    # Производительность
    execution_time = models.FloatField(
        null=True,
        blank=True,
        help_text="Время выполнения запроса (секунды)"
    )
    data_points = models.PositiveIntegerField(
        default=0,
        help_text="Количество точек данных"
    )

    # Результат
    success = models.BooleanField(
        default=True,
        help_text="Успешность операции"
    )
    error_message = models.TextField(
        blank=True,
        help_text="Сообщение об ошибке"
    )

    # Отслеживание
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'analytics_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

    def __str__(self):
        return f"{self.action} by {self.user.email if self.user else 'Anonymous'} at {self.timestamp}"
