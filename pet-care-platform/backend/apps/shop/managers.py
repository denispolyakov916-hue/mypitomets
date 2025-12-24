"""
Оптимизированные менеджеры и QuerySet для моделей магазина.

Содержит ProductQuerySet с аннотациями рейтинга для устранения N+1 запросов.
"""

from django.db import models
from django.db.models import Avg, Count, Q


class ProductQuerySet(models.QuerySet):
    """
    Оптимизированный QuerySet для товаров.
    
    Предоставляет методы для эффективной загрузки данных,
    включая аннотации рейтинга и количества отзывов.
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
        Фильтрует только доступные товары (цена > 0 и есть на складе).
        
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        return self.filter(price__gt=0, stock_count__gt=0)
    
    def for_animal(self, animal):
        """
        Фильтрует товары по типу животного.
        
        Args:
            animal: Тип животного ('dog', 'cat')
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if animal and animal in ['dog', 'cat']:
            return self.filter(animal=animal)
        return self
    
    def in_category(self, category, subcategory=None):
        """
        Фильтрует товары по категории и подкатегории.
        
        Args:
            category: Код категории
            subcategory: Код подкатегории (опционально)
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        qs = self
        if category:
            qs = qs.filter(category=category)
        if subcategory:
            qs = qs.filter(subcategory=subcategory)
        return qs
    
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
        return self.filter(discount_percent__gt=0)
    
    def search(self, query):
        """
        Поиск товаров по названию.
        
        Args:
            query: Строка поиска
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if query:
            return self.filter(name__icontains=query)
        return self
    
    def by_vendor(self, vendor):
        """
        Фильтрует товары по бренду.
        
        Args:
            vendor: Название бренда
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if vendor:
            return self.filter(vendor__icontains=vendor)
        return self
    
    def with_min_rating(self, min_rating):
        """
        Фильтрует товары с рейтингом не ниже указанного.
        
        Требует предварительного вызова with_ratings().
        
        Args:
            min_rating: Минимальный рейтинг
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if min_rating:
            return self.filter(_avg_rating__gte=min_rating)
        return self
    
    def order_by_rating(self, descending=True):
        """
        Сортирует товары по рейтингу.
        
        Требует предварительного вызова with_ratings().
        
        Args:
            descending: Сортировка по убыванию (по умолчанию True)
            
        Returns:
            QuerySet: Отсортированный QuerySet
        """
        order = '-_avg_rating' if descending else '_avg_rating'
        return self.order_by(order, '-id')
    
    def order_by_popularity(self):
        """
        Сортирует товары по популярности (количество заказов).
        
        Returns:
            QuerySet: Отсортированный QuerySet
        """
        return self.order_by('-order_count', '-id')


class ProductManager(models.Manager):
    """
    Менеджер для модели Product.
    
    Использует ProductQuerySet для оптимизированных запросов.
    """
    
    def get_queryset(self):
        return ProductQuerySet(self.model, using=self._db)
    
    def with_ratings(self):
        """Получить QuerySet с аннотациями рейтинга."""
        return self.get_queryset().with_ratings()
    
    def available(self):
        """Получить доступные товары."""
        return self.get_queryset().available()
    
    def catalog(self):
        """
        Получить QuerySet для каталога (доступные товары с рейтингами).
        
        Это основной метод для отображения каталога товаров.
        
        Returns:
            QuerySet: Оптимизированный QuerySet для каталога
        """
        return self.get_queryset().available().with_ratings()

