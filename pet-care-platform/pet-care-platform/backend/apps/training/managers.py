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
        Фильтрует только активные опубликованные курсы.
        
        Returns:
            QuerySet: Отфильтрованный QuerySet
        """
        return self.filter(is_active=True, status='published')
    
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

    def get_personalized_for_pet(self, pet, limit=10):
        """
        Получить персонализированные рекомендации курсов для питомца.

        Args:
            pet: объект Pet
            limit: максимальное количество курсов

        Returns:
            QuerySet с аннотированными курсами
        """
        # Базовый QuerySet
        queryset = self.catalog()

        # Фильтрация по базовым характеристикам
        if pet.species in ['dog', 'cat']:
            queryset = queryset.filter(pet_type__in=[pet.species, 'all'])

        # Уровень сложности по опыту
        training_experience = getattr(pet, 'training_experience', None)
        if training_experience:
            if training_experience == 'none':
                queryset = queryset.filter(level='beginner')
            elif training_experience == 'basic':
                queryset = queryset.filter(level__in=['beginner', 'intermediate'])
            elif training_experience == 'intermediate':
                queryset = queryset.filter(level__in=['intermediate', 'advanced'])

        # Сортировка по релевантности (в будущем можно улучшить)
        queryset = queryset.order_by('-created_at')

        return queryset[:limit]

    def filter_by_pet_characteristics(self, pet, queryset=None):
        """
        Фильтровать курсы по характеристикам питомца.

        Args:
            pet: объект Pet
            queryset: базовый QuerySet (опционально)

        Returns:
            QuerySet отфильтрованный по характеристикам
        """
        if queryset is None:
            queryset = self.catalog()

        # Фильтр по типу питомца
        if pet.species in ['dog', 'cat']:
            queryset = queryset.filter(pet_type__in=[pet.species, 'all'])

        behavioral_problems = getattr(pet, 'behavioral_problems', None) or []
        health_issues = getattr(pet, 'health_issues', None) or []
        age_months = getattr(pet, 'age_months', None)

        if behavioral_problems:
            queryset = queryset.exclude(
                course_type='behavior_correction',
                excluded_behavioral_problems__overlap=behavioral_problems,
            )

        if health_issues:
            queryset = queryset.exclude(
                course_type='behavior_correction',
                excluded_health_issues__overlap=health_issues,
            )

        if age_months is not None:
            queryset = queryset.filter(
                Q(min_age_months__isnull=True) | Q(min_age_months__lte=age_months),
                Q(max_age_months__isnull=True) | Q(max_age_months__gte=age_months),
            )

        # Фильтр по поведению
        if pet.behavior_type and pet.behavior_type != '':
            queryset = queryset.filter(
                Q(recommended_behavior_types__contains=[pet.behavior_type]) |
                Q(recommended_behavior_types=[])  # Курсы без специфики поведения
            )

        # Фильтр по активности
        if pet.activity_level and pet.activity_level != '':
            queryset = queryset.filter(
                Q(recommended_activity_levels__contains=[pet.activity_level]) |
                Q(recommended_activity_levels=[])  # Курсы без специфики активности
            )

        # Фильтр по социализации
        if pet.social_level and pet.social_level != '':
            queryset = queryset.filter(
                Q(recommended_social_levels__contains=[pet.social_level]) |
                Q(recommended_social_levels=[])  # Курсы без специфики социализации
            )

        # Фильтр по опыту дрессировки
        # Атрибут может отсутствовать на модели Pet — читаем безопасно
        training_experience = getattr(pet, 'training_experience', None)
        experience_levels = ['none', 'basic', 'intermediate', 'advanced', 'professional']
        if training_experience and training_experience in experience_levels:
            pet_level_index = experience_levels.index(training_experience)

            # Курсы с подходящим минимальным уровнем опыта
            suitable_levels = []
            if pet_level_index >= 0:  # none
                suitable_levels.append('none')
            if pet_level_index >= 1:  # basic
                suitable_levels.append('basic')
            if pet_level_index >= 2:  # intermediate
                suitable_levels.append('intermediate')
            if pet_level_index >= 3:  # advanced
                suitable_levels.append('advanced')
            if pet_level_index >= 4:  # professional
                suitable_levels.append('professional')

            queryset = queryset.filter(min_training_experience__in=suitable_levels)

        # Фильтр по здоровью (исключаем несовместимые)
        # Атрибут может отсутствовать на модели Pet — читаем безопасно
        if health_issues:
            # Курсы которые либо совместимы с проблемами здоровья, либо не имеют специфики
            queryset = queryset.filter(
                Q(compatible_health_issues__overlap=health_issues) |
                Q(compatible_health_issues__len=0)
            )

        return queryset

    def get_recommended_for_pet_problems(self, pet, limit=5):
        """
        Получить курсы, которые помогают решить проблемы питомца.

        Args:
            pet: объект Pet
            limit: максимальное количество курсов

        Returns:
            QuerySet курсов для решения проблем
        """
        queryset = self.catalog()

        filters = Q()

        # Курсы для поведенческих проблем
        behavioral_problems = getattr(pet, 'behavioral_problems', None) or []
        health_issues = getattr(pet, 'health_issues', None) or []
        if behavioral_problems:
            filters |= Q(addresses_behavioral_problems__overlap=behavioral_problems)
            filters |= Q(course_type='behavior_correction', correction_problem_tags__overlap=behavioral_problems)

        # Курсы для особых потребностей
        special_needs = getattr(pet, 'special_needs', None) or []
        if special_needs:
            filters |= Q(addresses_special_needs__overlap=special_needs)

        # Курсы для проблем здоровья
        if health_issues:
            filters |= Q(compatible_health_issues__overlap=health_issues)

        if filters:
            queryset = queryset.filter(filters)

            # Приоритет по типу питомца
            if pet.species in ['dog', 'cat']:
                queryset = queryset.filter(pet_type__in=[pet.species, 'all'])

            if behavioral_problems:
                queryset = queryset.exclude(
                    course_type='behavior_correction',
                    excluded_behavioral_problems__overlap=behavioral_problems,
                )

            if health_issues:
                queryset = queryset.exclude(
                    course_type='behavior_correction',
                    excluded_health_issues__overlap=health_issues,
                )

            age_months = getattr(pet, 'age_months', None)
            if age_months is not None:
                queryset = queryset.filter(
                    Q(min_age_months__isnull=True) | Q(min_age_months__lte=age_months),
                    Q(max_age_months__isnull=True) | Q(max_age_months__gte=age_months),
                )

            return queryset.order_by('-created_at')[:limit]

        return self.get_queryset().none()

    def get_by_pet_activity_preferences(self, pet, limit=5):
        """
        Получить курсы по предпочтениям активностей питомца.

        Args:
            pet: объект Pet
            limit: максимальное количество курсов

        Returns:
            QuerySet курсов по предпочтениям
        """
        queryset = self.catalog()

        preferred_activities = getattr(pet, 'preferred_activities', None) or []
        if preferred_activities:
            queryset = queryset.filter(
                suitable_activities__overlap=preferred_activities
            )

            # Приоритет по типу питомца
            if pet.species in ['dog', 'cat']:
                queryset = queryset.filter(pet_type__in=[pet.species, 'all'])

            return queryset.order_by('-created_at')[:limit]

        return self.get_queryset().none()
