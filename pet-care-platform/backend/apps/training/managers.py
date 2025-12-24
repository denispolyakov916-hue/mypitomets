"""
Оптимизированные менеджеры и QuerySet для моделей курсов.

Содержит CourseQuerySet с аннотациями рейтинга для устранения N+1 запросов.
"""

from django.db import models
from django.db.models import Avg, Count, Q


class CourseQuerySet(models.QuerySet):
    """
    Оптимизированный QuerySet для курсов.
    
    Предоставляет методы для эффективной загрузки данных,
    включая аннотации рейтинга и количества отзывов.
    """
    
    def with_ratings(self):
        """
        Добавляет аннотации среднего рейтинга и количества отзывов.
        
        Использует подзапросы для вычисления рейтинга на уровне SQL,
        что устраняет N+1 проблему при загрузке списка курсов.
        
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
    
    def active(self):
        """
        Фильтрует только активные курсы.
        
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        return self.filter(is_active=True)
    
    def for_pet_type(self, pet_type):
        """
        Фильтрует курсы по типу питомца.
        
        Args:
            pet_type: Тип питомца ('dog', 'cat', 'all')
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if pet_type and pet_type in ['dog', 'cat']:
            # Для конкретного типа показываем курсы этого типа + универсальные
            return self.filter(pet_type__in=[pet_type, 'all'])
        return self
    
    def for_user_pets(self, user):
        """
        Фильтрует курсы, подходящие для питомцев пользователя.
        
        Args:
            user: Объект пользователя
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        from apps.pets.models import Pet
        user_pets = Pet.objects.filter(owner=user)
        
        if not user_pets.exists():
            return self.filter(pet_type='all')
        
        # Собираем все виды животных пользователя
        user_species = set()
        for pet in user_pets:
            if pet.species in ['dog', 'cat']:
                user_species.add(pet.species)
        
        if user_species:
            return self.filter(pet_type__in=list(user_species) + ['all'])
        
        return self.filter(pet_type='all')
    
    def in_category(self, category, subcategory=None):
        """
        Фильтрует курсы по категории и подкатегории.
        
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
    
    def by_level(self, level):
        """
        Фильтрует курсы по уровню сложности.
        
        Args:
            level: Код уровня ('beginner', 'intermediate', 'advanced', 'expert')
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if level:
            return self.filter(level=level)
        return self
    
    def by_format(self, format_type):
        """
        Фильтрует курсы по формату.
        
        Args:
            format_type: Код формата ('video', 'text', 'interactive', etc.)
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if format_type:
            return self.filter(format_type=format_type)
        return self
    
    def by_price_range(self, min_price=None, max_price=None):
        """
        Фильтрует курсы по диапазону цен.
        
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
    
    def free(self):
        """
        Фильтрует только бесплатные курсы.
        
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        return self.filter(price=0)
    
    def paid(self):
        """
        Фильтрует только платные курсы.
        
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        return self.filter(price__gt=0)
    
    def search(self, query):
        """
        Поиск курсов по названию.
        
        Args:
            query: Строка поиска
            
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        if query:
            return self.filter(title__icontains=query)
        return self
    
    def with_min_rating(self, min_rating):
        """
        Фильтрует курсы с рейтингом не ниже указанного.
        
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
        Сортирует курсы по рейтингу.
        
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
        Сортирует курсы по популярности (количество покупок).
        
        Returns:
            QuerySet: Отсортированный QuerySet
        """
        return self.order_by('-order_count', '-id')


class CourseManager(models.Manager):
    """
    Менеджер для модели Course.
    
    Использует CourseQuerySet для оптимизированных запросов.
    """
    
    def get_queryset(self):
        return CourseQuerySet(self.model, using=self._db)
    
    def with_ratings(self):
        """Получить QuerySet с аннотациями рейтинга."""
        return self.get_queryset().with_ratings()
    
    def active(self):
        """Получить активные курсы."""
        return self.get_queryset().active()
    
    def catalog(self):
        """
        Получить QuerySet для каталога (активные курсы с рейтингами).
        
        Это основной метод для отображения каталога курсов.
        
        Returns:
            QuerySet: Оптимизированный QuerySet для каталога
        """
        return self.get_queryset().active().with_ratings()

