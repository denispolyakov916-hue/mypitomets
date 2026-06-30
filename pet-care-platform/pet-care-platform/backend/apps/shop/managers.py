"""
Оптимизированные менеджеры и QuerySet для моделей магазина.

Содержит ProductQuerySet с аннотациями рейтинга для устранения N+1 запросов.
Обновлено для поддержки новой структуры по database_tz.md.
"""

from django.db import models
from django.db.models import Avg, Count, Q


class ProductQuerySet(models.QuerySet):
    """
    Оптимизированный QuerySet для товаров.
    
    Предоставляет методы для эффективной загрузки данных,
    включая аннотации рейтинга и количества отзывов.
    
    Поддерживает фильтры новой структуры (animal_type, new_category, product_group).
    """
    
    def with_ratings(self):
        """
        Добавляет аннотации среднего рейтинга и количества отзывов.
        
        Использует подзапросы для вычисления рейтинга на уровне SQL,
        что устраняет N+1 проблему при загрузке списка товаров.
        
        Returns:
            QuerySet: QuerySet с аннотированными полями _avg_rating и _reviews_count
        """
        return self.annotate(
            _avg_rating=Avg(
                'reviews__rating',
                filter=Q(reviews__is_approved=True)
            ),
            _reviews_count=Count(
                'reviews',
                filter=Q(reviews__is_approved=True)
            )
        )
    
    def available(self):
        """
        Фильтрует только доступные товары.
        
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        return self.filter(
            price__gt=0
        ).filter(
            Q(is_available=True)
        )
    
    def active(self):
        """
        Фильтрует только активные товары (новая структура).
        
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        return self.filter(status=1, is_available=True)
    
    def for_animal(self, animal):
        """
        Фильтрует товары по типу животного.
        Args:
            animal: Тип животного ('dog', 'cat')
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if animal and animal in ['dog', 'cat']:
            return self.filter(
                Q(animal_type__in=[animal, 'all'])
            )
        return self
    
    def for_animal_type(self, animal_type):
        """
        Фильтрует товары по типу животного (новое поле).
        
        Args:
            animal_type: Тип животного ('dog', 'cat', 'all')
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if animal_type and animal_type != 'all':
            return self.filter(animal_type__in=[animal_type, 'all'])
        return self
    
    def in_new_category(self, category):
        """
        Фильтрует товары по новой иерархии категорий.
        Включает товары из подкатегорий.
        
        Args:
            category: Объект Category или ID категории
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if not category:
            return self
        
        from .models import Category
        
        if isinstance(category, int):
            try:
                category = Category.objects.get(id=category)
            except Category.DoesNotExist:
                return self
        
        # Фильтруем по категории и её подкатегориям (через path)
        # Используем external_id или pk для поиска в path
        cat_id_for_path = category.external_id or category.pk
        return self.filter(
            Q(new_category=category) | 
            Q(new_category__path__contains=[cat_id_for_path])
        )
    
    def by_product_group(self, product_group):
        """
        Фильтрует товары по группе товаров.
        
        Args:
            product_group: Код группы (food, treats, vet, vitamins, etc.)
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if product_group:
            return self.filter(product_group=product_group)
        return self
    
    def by_brand(self, brand):
        """
        Фильтрует товары по бренду (новая структура).
        
        Args:
            brand: Объект Brand, ID или slug
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if not brand:
            return self
        
        if isinstance(brand, int):
            return self.filter(brand_id=brand)
        elif isinstance(brand, str):
            return self.filter(brand__slug=brand)
        else:
            return self.filter(brand=brand)
    
    def by_age_group(self, age_group):
        """
        Фильтрует товары по возрастной группе.
        
        Args:
            age_group: puppy | kitten | adult | senior | all
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if age_group and age_group != 'all':
            if isinstance(age_group, str) and ',' in age_group:
                groups = [g.strip() for g in age_group.split(',') if g.strip()]
                if groups:
                    return self.filter(age_group__in=[*groups, 'all', None])
            return self.filter(age_group__in=[age_group, 'all', None])
        return self
    
    def by_size_group(self, size_group):
        """
        Фильтрует товары по размерной группе.
        
        Args:
            size_group: mini | small | medium | large | giant | all
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if size_group and size_group != 'all':
            return self.filter(size_group__in=[size_group, 'all', None])
        return self
    
    def grain_free(self):
        """Только беззерновые корма."""
        return self.filter(is_grain_free=True)
    
    def hypoallergenic(self):
        """Только гипоаллергенные корма."""
        return self.filter(is_hypoallergenic=True)
    
    def veterinary(self):
        """Только ветеринарные диеты."""
        return self.filter(is_veterinary=True)
    
    def by_health_condition(self, condition):
        """
        Фильтрует товары по показанию здоровья.
        
        Args:
            condition: urinary | obesity | joint | skin | digestive | etc.
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if condition:
            return self.filter(food_details__health_conditions__contains=[condition])
        return self
    
    def by_price_range(self, min_price=None, max_price=None):
        """
        Фильтрует товары по диапазону цен.
        
        Args:
            min_price: Минимальная цена
            max_price: Максимальная цена
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        qs = self
        if min_price is not None:
            qs = qs.filter(price__gte=min_price)
        if max_price is not None:
            qs = qs.filter(price__lte=max_price)
        return qs
    
    def with_discount(self):
        """
        Фильтрует только товары со скидкой.
        
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        return self.filter(
            Q(compare_price__gt=models.F('price'))
        )
    
    def search(self, query):
        """
        Поиск товаров по названию, описанию и бренду.
        
        Args:
            query: Строка поиска
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if query:
            return self.filter(
                Q(name__icontains=query) |
                Q(short_description__icontains=query) |
                Q(brand__name__icontains=query)
            )
        return self
    
    def with_min_rating(self, min_rating):
        """
        Фильтрует товары с рейтингом не ниже указанного.
        
        Использует денормализованное поле rating (новая структура)
        или аннотацию _avg_rating (legacy).
        
        Args:
            min_rating: Минимальный рейтинг
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if min_rating:
            # Предпочитаем денормализованное поле
            return self.filter(
                Q(rating__gte=min_rating) | Q(_avg_rating__gte=min_rating)
            )
        return self
    
    def order_by_rating(self, descending=True):
        """
        Сортирует товары по рейтингу.
        
        Args:
            descending: Сортировка по убыванию (по умолчанию True)
            
        Returns:
            QuerySet: Отсортированный QuerySet
        """
        if descending:
            return self.order_by('-rating', '-rating_count', '-id')
        return self.order_by('rating', 'rating_count', '-id')
    
    def order_by_popularity(self):
        """
        Сортирует товары по популярности (количество заказов).
        
        Returns:
            QuerySet: Отсортированный QuerySet
        """
        return self.order_by('-order_count', '-id')
    
    def order_by_price(self, ascending=True):
        """
        Сортирует товары по цене.
        
        Args:
            ascending: По возрастанию (по умолчанию True)
            
        Returns:
            QuerySet: Отсортированный QuerySet
        """
        if ascending:
            return self.order_by('price', '-id')
        return self.order_by('-price', '-id')
    
    def order_by_newest(self):
        """
        Сортирует товары по дате добавления (новые первые).
        
        Returns:
            QuerySet: Отсортированный QuerySet
        """
        return self.order_by('-id')
    
    def with_brand_and_category(self):
        """
        Подгружает связанные бренд и категорию (оптимизация).
        
        Returns:
            QuerySet: QuerySet с select_related
        """
        return self.select_related('brand', 'new_category')
    
    def for_breed(self, breed, product_group='food'):
        """
        Получить товары, подходящие для породы.
        
        Args:
            breed: Объект Breed
            product_group: Группа товаров (по умолчанию 'food')
            
        Returns:
            QuerySet: Отфильтрованный и отсортированный QuerySet
        """
        from django.db.models import Case, When, Value, IntegerField
        
        # Базовый фильтр
        qs = self.active().filter(product_group=product_group)
        
        # Фильтр по виду животного
        qs = qs.filter(animal_type__in=['all', breed.species])
        
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
        
        # Сортировка
        return qs.order_by('-is_veterinary', '-is_hypoallergenic', '-_size_score', '-rating')


class ProductManager(models.Manager):
    """
    Менеджер для модели Product.
    
    Использует ProductQuerySet для оптимизированных запросов.
    Поддерживает как legacy API, так и новую структуру по database_tz.md.
    """
    
    def get_queryset(self):
        return ProductQuerySet(self.model, using=self._db)
    
    def with_ratings(self):
        """Получить QuerySet с аннотациями рейтинга."""
        return self.get_queryset().with_ratings()
    
    def available(self):
        """Получить доступные товары (legacy)."""
        return self.get_queryset().available()
    
    def active(self):
        """Получить активные товары (новая структура)."""
        return self.get_queryset().active()
    
    def catalog(self):
        """
        Получить QuerySet для каталога (legacy - доступные товары с рейтингами).
        
        Это основной метод для отображения каталога товаров.
        
        Returns:
            QuerySet: Оптимизированный QuerySet для каталога
        """
        return self.get_queryset().available().with_ratings()
    
    def catalog_v2(self):
        """
        Получить QuerySet для каталога v2 (новая структура).
        
        Использует денормализованные поля rating/rating_count,
        подгружает brand и new_category.
        
        Returns:
            QuerySet: Оптимизированный QuerySet для каталога v2
        """
        return self.get_queryset().active().with_brand_and_category()
    
    def for_animal_type(self, animal_type):
        """Фильтр по типу животного (новая структура)."""
        return self.catalog_v2().for_animal_type(animal_type)
    
    def by_product_group(self, product_group):
        """Фильтр по группе товаров."""
        return self.catalog_v2().by_product_group(product_group)
    
    def for_breed(self, breed, product_group='food', limit=20):
        """
        Получить товары для породы.
        
        Args:
            breed: Объект Breed
            product_group: Группа товаров
            limit: Максимальное количество
            
        Returns:
            QuerySet: Товары, подходящие для породы
        """
        return self.get_queryset().for_breed(breed, product_group)[:limit]
    
    def food_for_filters(self, animal_type=None):
        """
        Корма с предзагрузкой для фильтров.
        
        Args:
            animal_type: dog | cat | None
            
        Returns:
            QuerySet: Корма с оптимизированной загрузкой
        """
        qs = self.catalog_v2().filter(product_group='food')
        if animal_type:
            qs = qs.for_animal_type(animal_type)
        return qs

