"""
PersonalizationService - центральный сервис персонализации на основе PetID.

Обеспечивает единую точку входа для формирования персонализированного контекста
во всех модулях системы (магазин, курсы, рекомендации, контент).

Основные функции:
- Формирование контекста персонализации по питомцам пользователя
- Фильтрация товаров и курсов по характеристикам питомцев
- Учёт аллергий, предпочтений и возраста
- Генерация персонализированных рекомендаций
"""

import logging
from typing import Optional, List, Dict, Any, Set
from dataclasses import dataclass, field
from django.db.models import QuerySet, Q
from decimal import Decimal

logger = logging.getLogger('apps.pets')


# Константы для проблем здоровья и категорий товаров
HEALTH_ISSUE_PRODUCT_CATEGORIES = {
    'overweight': {
        'keywords': ['диета', 'похудение', 'низкокалорийный', 'light', 'weight', 'obesity', 'контроль веса'],
        'categories': ['food'],
        'description': 'Для контроля веса'
    },
    'sensitive_digestion': {
        'keywords': ['чувствительное пищеварение', 'sensitive', 'digestive', 'гастро', 'intestinal'],
        'categories': ['food', 'pharmacy'],
        'description': 'Для чувствительного пищеварения'
    },
    'skin_issues': {
        'keywords': ['кожа', 'шерсть', 'skin', 'coat', 'дерматит', 'derma'],
        'categories': ['food', 'care', 'pharmacy'],
        'description': 'Для здоровья кожи и шерсти'
    },
    'joint_problems': {
        'keywords': ['суставы', 'joint', 'mobility', 'хондро', 'артро', 'glucosamine'],
        'categories': ['food', 'pharmacy'],
        'description': 'Для здоровья суставов'
    },
    'dental_issues': {
        'keywords': ['зубы', 'dental', 'oral', 'стоматологический'],
        'categories': ['care', 'toys', 'food'],
        'description': 'Для здоровья зубов'
    },
    'allergies': {
        'keywords': ['гипоаллергенный', 'hypoallergenic', 'allergen-free'],
        'categories': ['food'],
        'description': 'Гипоаллергенный'
    },
    'kidney_issues': {
        'keywords': ['почки', 'renal', 'kidney', 'urinary'],
        'categories': ['food', 'pharmacy'],
        'description': 'Для здоровья почек'
    },
    'heart_issues': {
        'keywords': ['сердце', 'cardiac', 'heart'],
        'categories': ['food', 'pharmacy'],
        'description': 'Для здоровья сердца'
    },
}

# Рекомендации по уровню активности
ACTIVITY_LEVEL_KEYWORDS = {
    'low': ['senior', 'light', 'пониженная активность', 'indoor'],
    'medium': [],  # стандартные товары
    'high': ['active', 'energy', 'sport', 'performance', 'высокая активность'],
}


@dataclass
class PetContext:
    """
    Контекст персонализации для одного питомца.
    
    Attributes:
        pet_id: UUID питомца
        name: Имя питомца
        species: Вид (dog, cat)
        breed: Порода
        age: Возраст в годах
        age_category: Категория возраста (puppy/kitten, adult, senior)
        weight: Вес в кг
        gender: Пол
        is_neutered: Стерилизован/кастрирован
        favorite_foods: Список любимых продуктов
        allergies: Список аллергенов
        health_issues: Проблемы здоровья
        activity_level: Уровень активности
        behavior_type: Тип поведения (для курсов)
        social_level: Уровень социализации
        training_experience: Опыт дрессировки
        behavioral_problems: Поведенческие проблемы
        profile_completeness: Процент заполненности профиля
    """
    pet_id: str
    name: str
    species: str
    breed: Optional[str] = None
    age: Optional[int] = None
    age_category: Optional[str] = None
    weight: Optional[float] = None
    gender: Optional[str] = None
    is_neutered: bool = False
    favorite_foods: List[str] = field(default_factory=list)
    allergies: List[str] = field(default_factory=list)
    health_issues: List[str] = field(default_factory=list)
    activity_level: str = 'medium'
    # Новые поля PetID для персонализации курсов
    behavior_type: Optional[str] = None
    social_level: Optional[str] = None
    training_experience: Optional[str] = None
    behavioral_problems: List[str] = field(default_factory=list)
    profile_completeness: int = 0
    # Данные породы (из справочника)
    breed_energy_level: Optional[str] = None
    breed_trainability: Optional[str] = None
    breed_health_risks: List[str] = field(default_factory=list)
    
    @property
    def life_stage(self) -> str:
        """Жизненная стадия питомца."""
        if self.age is None:
            return 'adult'
        
        if self.species == 'dog':
            if self.age < 1:
                return 'puppy'
            elif self.age < 7:
                return 'adult'
            else:
                return 'senior'
        elif self.species == 'cat':
            if self.age < 1:
                return 'kitten'
            elif self.age < 10:
                return 'adult'
            else:
                return 'senior'
        return 'adult'
    
    @property
    def size_category(self) -> Optional[str]:
        """Категория размера для собак."""
        if self.species != 'dog' or self.weight is None:
            return None
        
        if self.weight < 10:
            return 'small'
        elif self.weight < 25:
            return 'medium'
        else:
            return 'large'
    
    @property
    def animal_type(self) -> str:
        """Тип животного для фильтрации товаров."""
        return self.species if self.species in ['dog', 'cat'] else 'all'


@dataclass 
class PersonalizationContext:
    """
    Полный контекст персонализации для пользователя.
    
    Attributes:
        user_id: UUID пользователя
        pets: Список контекстов питомцев
        animal_types: Множество видов животных
        all_allergies: Объединённый список аллергенов
        all_favorites: Объединённый список любимых продуктов
        has_senior_pets: Есть ли пожилые питомцы
        has_young_pets: Есть ли молодые питомцы
    """
    user_id: str
    pets: List[PetContext] = field(default_factory=list)
    
    @property
    def animal_types(self) -> Set[str]:
        """Все виды животных пользователя."""
        return {pet.animal_type for pet in self.pets}
    
    @property
    def all_allergies(self) -> Set[str]:
        """Все аллергены всех питомцев."""
        allergies = set()
        for pet in self.pets:
            allergies.update(pet.allergies)
        return allergies
    
    @property
    def all_favorites(self) -> Set[str]:
        """Все любимые продукты всех питомцев."""
        favorites = set()
        for pet in self.pets:
            favorites.update(pet.favorite_foods)
        return favorites
    
    @property
    def has_senior_pets(self) -> bool:
        """Есть ли пожилые питомцы."""
        return any(pet.life_stage == 'senior' for pet in self.pets)
    
    @property
    def has_young_pets(self) -> bool:
        """Есть ли молодые питомцы (щенки/котята)."""
        return any(pet.life_stage in ['puppy', 'kitten'] for pet in self.pets)
    
    @property
    def is_empty(self) -> bool:
        """Нет питомцев."""
        return len(self.pets) == 0
    
    def get_pet_by_id(self, pet_id: str) -> Optional[PetContext]:
        """Получить контекст питомца по ID."""
        for pet in self.pets:
            if pet.pet_id == pet_id:
                return pet
        return None


class PersonalizationService:
    """
    Сервис персонализации на основе PetID.
    
    Предоставляет методы для:
    - Получения контекста персонализации
    - Фильтрации товаров и курсов
    - Формирования рекомендаций
    """
    
    @staticmethod
    def get_context(user) -> PersonalizationContext:
        """
        Получить полный контекст персонализации для пользователя.
        
        Args:
            user: Объект пользователя
            
        Returns:
            PersonalizationContext: Контекст персонализации
        """
        from .models import Pet
        from .breed_models import Breed
        
        context = PersonalizationContext(user_id=str(user.id))
        
        if not user or not user.is_authenticated:
            return context
        
        pets = Pet.objects.filter(owner=user)
        
        for pet in pets:
            # Получаем данные породы из справочника
            breed_data = {}
            if pet.breed and pet.species in ['dog', 'cat']:
                try:
                    breed = Breed.objects.get(name__iexact=pet.breed, species=pet.species)
                    breed_data = {
                        'breed_energy_level': breed.energy_level,
                        'breed_trainability': breed.trainability,
                        'breed_health_risks': breed.genetic_risks or [],
                    }
                except Breed.DoesNotExist:
                    pass
            
            pet_context = PetContext(
                pet_id=str(pet.id),
                name=pet.name,
                species=pet.species,
                breed=pet.breed,
                age=pet.age,
                age_category=pet.age_category,
                weight=float(pet.weight) if pet.weight else None,
                gender=pet.gender,
                is_neutered=getattr(pet, 'is_neutered', False),
                favorite_foods=pet.favorite_foods or [],
                allergies=pet.allergies or [],
                health_issues=getattr(pet, 'health_issues', []) or [],
                activity_level=getattr(pet, 'activity_level', 'medium') or 'medium',
                # Новые поля PetID
                behavior_type=getattr(pet, 'behavior_type', None),
                social_level=getattr(pet, 'social_level', None),
                training_experience=getattr(pet, 'training_experience', None),
                behavioral_problems=getattr(pet, 'behavioral_problems', []) or [],
                profile_completeness=pet.profile_completeness,
                # Данные породы
                **breed_data
            )
            context.pets.append(pet_context)
        
        return context
    
    @staticmethod
    def get_pet_context(user, pet_id: str) -> Optional[PetContext]:
        """
        Получить контекст конкретного питомца.
        
        Args:
            user: Объект пользователя
            pet_id: UUID питомца
            
        Returns:
            PetContext или None
        """
        from .models import Pet
        
        try:
            pet = Pet.objects.get(id=pet_id, owner=user)
            return PetContext(
                pet_id=str(pet.id),
                name=pet.name,
                species=pet.species,
                breed=pet.breed,
                age=pet.age,
                weight=float(pet.weight) if pet.weight else None,
                gender=pet.gender,
                is_neutered=getattr(pet, 'is_neutered', False),
                favorite_foods=pet.favorite_foods or [],
                allergies=pet.allergies or [],
                health_issues=getattr(pet, 'health_issues', []) or [],
                activity_level=getattr(pet, 'activity_level', 'medium') or 'medium'
            )
        except Pet.DoesNotExist:
            return None
    
    @classmethod
    def filter_products(cls, queryset, context: PersonalizationContext, 
                       pet_id: Optional[str] = None) -> QuerySet:
        """
        Фильтрация товаров на основе контекста персонализации.
        
        Args:
            queryset: QuerySet товаров
            context: Контекст персонализации
            pet_id: ID конкретного питомца (опционально)
            
        Returns:
            QuerySet: Отфильтрованные товары
        """
        if context.is_empty:
            return queryset
        
        # Если указан конкретный питомец
        if pet_id:
            pet = context.get_pet_by_id(pet_id)
            if pet:
                # Фильтруем по виду животного
                queryset = queryset.filter(
                    Q(animal=pet.animal_type) | Q(animal='all')
                )
                
                # Исключаем товары с аллергенами
                for allergen in pet.allergies:
                    queryset = queryset.exclude(
                        Q(name__icontains=allergen) | 
                        Q(description__icontains=allergen)
                    )
        else:
            # Фильтруем по всем видам животных пользователя
            animal_types = list(context.animal_types)
            if animal_types:
                queryset = queryset.filter(
                    Q(animal__in=animal_types) | Q(animal='all')
                )
            
            # Исключаем товары с любыми аллергенами
            for allergen in context.all_allergies:
                queryset = queryset.exclude(
                    Q(name__icontains=allergen) | 
                    Q(description__icontains=allergen)
                )
        
        return queryset
    
    @classmethod
    def filter_courses(cls, queryset, context: PersonalizationContext,
                      pet_id: Optional[str] = None) -> QuerySet:
        """
        Фильтрация курсов на основе контекста персонализации.
        
        Args:
            queryset: QuerySet курсов
            context: Контекст персонализации
            pet_id: ID конкретного питомца (опционально)
            
        Returns:
            QuerySet: Отфильтрованные курсы
        """
        if context.is_empty:
            return queryset
        
        # Если указан конкретный питомец
        if pet_id:
            pet = context.get_pet_by_id(pet_id)
            if pet:
                # Фильтруем по виду животного (включая универсальные)
                queryset = queryset.filter(
                    Q(pet_type=pet.animal_type) | Q(pet_type='all')
                )
        else:
            # Фильтруем по всем видам животных пользователя
            animal_types = list(context.animal_types)
            if animal_types:
                queryset = queryset.filter(
                    Q(pet_type__in=animal_types) | Q(pet_type='all')
                )
        
        return queryset
    
    @classmethod
    def get_product_recommendations(cls, user, limit: int = 12) -> List[Dict[str, Any]]:
        """
        Получить персонализированные рекомендации товаров.
        
        Args:
            user: Объект пользователя
            limit: Максимальное количество рекомендаций
            
        Returns:
            List[Dict]: Список рекомендаций с товарами и причинами
        """
        from apps.shop.models import Product
        
        context = cls.get_context(user)
        
        if context.is_empty:
            return []
        
        recommendations = []
        seen_ids = set()
        
        for pet in context.pets:
            # Базовый QuerySet для питомца
            products = Product.objects.catalog().filter(
                Q(animal=pet.animal_type) | Q(animal='all'),
                in_stock=True
            ).exclude(id__in=seen_ids)
            
            # Исключаем аллергены
            for allergen in pet.allergies:
                products = products.exclude(
                    Q(name__icontains=allergen) | 
                    Q(description__icontains=allergen)
                )
            
            # 1. Рекомендации по любимым продуктам
            for favorite in pet.favorite_foods[:3]:
                matching = products.filter(
                    Q(name__icontains=favorite) | 
                    Q(description__icontains=favorite)
                )[:2]
                
                for product in matching:
                    if product.id not in seen_ids:
                        recommendations.append({
                            'product': product.to_dict(),
                            'reason': f'Подходит для {pet.name} — {favorite}',
                            'pet_id': pet.pet_id,
                            'pet_name': pet.name
                        })
                        seen_ids.add(product.id)
            
            # 2. Рекомендации по возрасту
            life_stage_keywords = {
                'puppy': ['щенок', 'puppy', 'junior', 'starter'],
                'kitten': ['котенок', 'kitten', 'junior', 'starter'],
                'senior': ['senior', 'пожилой', '7+', '10+', 'mature']
            }
            
            if pet.life_stage in life_stage_keywords:
                keywords = life_stage_keywords[pet.life_stage]
                q_filter = Q()
                for kw in keywords:
                    q_filter |= Q(name__icontains=kw) | Q(category_name__icontains=kw)
                
                age_products = products.filter(q_filter).exclude(id__in=seen_ids)[:2]
                
                for product in age_products:
                    recommendations.append({
                        'product': product.to_dict(),
                        'reason': f'Подходит для возраста {pet.name}',
                        'pet_id': pet.pet_id,
                        'pet_name': pet.name
                    })
                    seen_ids.add(product.id)
            
            # 3. Популярные товары для вида
            popular = products.exclude(id__in=seen_ids).order_by('-order_count')[:2]
            
            for product in popular:
                recommendations.append({
                    'product': product.to_dict(),
                    'reason': f'Популярно для {pet.get_species_display() if hasattr(pet, "get_species_display") else pet.species}',
                    'pet_id': pet.pet_id,
                    'pet_name': pet.name
                })
                seen_ids.add(product.id)
        
        return recommendations[:limit]
    
    @classmethod
    def get_course_recommendations(cls, user, limit: int = 6) -> List[Dict[str, Any]]:
        """
        Получить персонализированные рекомендации курсов.
        
        Учитывает:
        - Вид и возраст питомца
        - Поведенческие проблемы
        - Опыт дрессировки
        - Тип поведения
        
        Args:
            user: Объект пользователя
            limit: Максимальное количество рекомендаций
            
        Returns:
            List[Dict]: Список рекомендаций курсов
        """
        from apps.training.models import Course, UserCourse
        
        context = cls.get_context(user)
        
        if context.is_empty:
            return []
        
        recommendations = []
        seen_ids = set()
        
        # Исключаем уже приобретённые курсы
        purchased_course_ids = set(
            UserCourse.objects.filter(user=user).values_list('course_id', flat=True)
        )
        
        for pet in context.pets:
            # Курсы для вида питомца
            courses = Course.objects.catalog().filter(
                Q(pet_type=pet.animal_type) | Q(pet_type='all')
            ).exclude(
                id__in=purchased_course_ids
            ).exclude(
                id__in=seen_ids
            )
            
            # 1. ПЕРСОНАЛИЗАЦИЯ ПО ПОВЕДЕНЧЕСКИМ ПРОБЛЕМАМ (высший приоритет)
            if pet.behavioral_problems:
                problem_keywords = {
                    'Лает/мяукает без причины': ['лай', 'вокализация', 'bark', 'quiet'],
                    'Грызёт вещи': ['деструктивное', 'грызёт', 'жевание'],
                    'Агрессия': ['агрессия', 'aggression', 'социализация'],
                    'Страх громких звуков': ['страх', 'фобия', 'десенсибилизация'],
                    'Боязнь одиночества': ['одиночество', 'сепарация', 'separation'],
                    'Тянет поводок': ['поводок', 'leash', 'прогулка'],
                    'Не слушается команд': ['послушание', 'команды', 'obedience'],
                }
                
                for problem in pet.behavioral_problems[:2]:
                    keywords = problem_keywords.get(problem, [problem.lower()])
                    q_filter = Q()
                    for kw in keywords:
                        q_filter |= Q(title__icontains=kw) | Q(description__icontains=kw)
                    
                    problem_courses = courses.filter(q_filter).exclude(id__in=seen_ids)[:1]
                    for course in problem_courses:
                        recommendations.append({
                            'course': course.to_dict(),
                            'reason': f'Поможет с проблемой "{problem}" у {pet.name}',
                            'pet_id': pet.pet_id,
                            'pet_name': pet.name,
                            'priority': 'high',
                            'match_type': 'behavioral_problem'
                        })
                        seen_ids.add(course.id)
            
            # 2. ПЕРСОНАЛИЗАЦИЯ ПО ОПЫТУ ДРЕССИРОВКИ
            training_level_map = {
                'none': 'beginner',
                'basic': 'beginner',
                'intermediate': 'intermediate',
                'advanced': 'advanced',
                'professional': 'advanced',
            }
            
            target_level = training_level_map.get(pet.training_experience, None)
            if target_level:
                level_courses = courses.filter(level=target_level).exclude(id__in=seen_ids)[:1]
                for course in level_courses:
                    recommendations.append({
                        'course': course.to_dict(),
                        'reason': f'Подходит по уровню опыта {pet.name}',
                        'pet_id': pet.pet_id,
                        'pet_name': pet.name,
                        'priority': 'medium',
                        'match_type': 'training_level'
                    })
                    seen_ids.add(course.id)
            
            # 3. ПЕРСОНАЛИЗАЦИЯ ПО ТИПУ ПОВЕДЕНИЯ
            behavior_keywords = {
                'calm': ['релакс', 'спокой', 'медитация'],
                'active': ['активн', 'спорт', 'энерг', 'игр'],
                'aggressive': ['агрессия', 'коррекция', 'социализация'],
                'shy': ['застенч', 'социализация', 'уверен'],
                'playful': ['игр', 'трюки', 'активн'],
            }
            
            if pet.behavior_type and pet.behavior_type in behavior_keywords:
                keywords = behavior_keywords[pet.behavior_type]
                q_filter = Q()
                for kw in keywords:
                    q_filter |= Q(title__icontains=kw) | Q(description__icontains=kw)
                
                behavior_courses = courses.filter(q_filter).exclude(id__in=seen_ids)[:1]
                for course in behavior_courses:
                    recommendations.append({
                        'course': course.to_dict(),
                        'reason': f'Учитывает темперамент {pet.name}',
                        'pet_id': pet.pet_id,
                        'pet_name': pet.name,
                        'priority': 'medium',
                        'match_type': 'behavior_type'
                    })
                    seen_ids.add(course.id)
            
            # 4. Рекомендации по возрасту (для молодых - базовые)
            if pet.age_category in ['puppy', 'kitten']:
                beginner_courses = courses.filter(level='beginner').exclude(id__in=seen_ids)[:1]
                for course in beginner_courses:
                    recommendations.append({
                        'course': course.to_dict(),
                        'reason': f'Базовый курс для молодого {pet.name}',
                        'pet_id': pet.pet_id,
                        'pet_name': pet.name,
                        'priority': 'medium',
                        'match_type': 'age'
                    })
                    seen_ids.add(course.id)
            elif pet.age_category == 'senior':
                # Для пожилых - спокойные курсы
                senior_courses = courses.filter(
                    Q(title__icontains='senior') | Q(description__icontains='пожил')
                ).exclude(id__in=seen_ids)[:1]
                for course in senior_courses:
                    recommendations.append({
                        'course': course.to_dict(),
                        'reason': f'Подходит для пожилого {pet.name}',
                        'pet_id': pet.pet_id,
                        'pet_name': pet.name,
                        'priority': 'medium',
                        'match_type': 'age'
                    })
                    seen_ids.add(course.id)
            
            # 5. Популярные курсы (если мало рекомендаций)
            if len(recommendations) < limit:
                popular = courses.exclude(id__in=seen_ids).order_by('-order_count')[:2]
                for course in popular:
                    recommendations.append({
                        'course': course.to_dict(),
                        'reason': f'Популярный курс для {pet.name}',
                        'pet_id': pet.pet_id,
                        'pet_name': pet.name,
                        'priority': 'low',
                        'match_type': 'popular'
                    })
                    seen_ids.add(course.id)
        
        # Сортируем по приоритету
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        recommendations.sort(key=lambda x: priority_order.get(x.get('priority', 'low'), 2))
        
        return recommendations[:limit]
    
    @classmethod
    def get_health_based_recommendations(cls, user, health_issue: str, 
                                         limit: int = 12) -> List[Dict[str, Any]]:
        """
        Получить рекомендации товаров на основе проблемы здоровья.
        
        Args:
            user: Объект пользователя
            health_issue: Код проблемы здоровья
            limit: Максимальное количество товаров
            
        Returns:
            List[Dict]: Список рекомендуемых товаров
        """
        from apps.shop.models import Product
        
        if health_issue not in HEALTH_ISSUE_PRODUCT_CATEGORIES:
            return []
        
        config = HEALTH_ISSUE_PRODUCT_CATEGORIES[health_issue]
        context = cls.get_context(user)
        
        # Базовый QuerySet
        products = Product.objects.catalog().filter(in_stock=True)
        
        # Фильтруем по видам животных пользователя
        if not context.is_empty:
            animal_types = list(context.animal_types)
            products = products.filter(
                Q(animal__in=animal_types) | Q(animal='all')
            )
        
        # Фильтруем по категориям
        if config.get('categories'):
            products = products.filter(category__in=config['categories'])
        
        # Ищем по ключевым словам
        keywords = config.get('keywords', [])
        if keywords:
            q_filter = Q()
            for kw in keywords:
                q_filter |= Q(name__icontains=kw) | Q(description__icontains=kw)
            products = products.filter(q_filter)
        
        # Сортируем по популярности
        products = products.order_by('-order_count', '-_avg_rating')[:limit]
        
        recommendations = []
        for product in products:
            recommendations.append({
                'product': product.to_dict(),
                'reason': config.get('description', 'Рекомендовано'),
                'health_issue': health_issue
            })
        
        return recommendations
    
    @classmethod
    def get_available_health_filters(cls) -> List[Dict[str, str]]:
        """
        Получить список доступных фильтров по проблемам здоровья.
        
        Returns:
            List[Dict]: Список фильтров с кодом и описанием
        """
        return [
            {'code': code, 'label': config['description']}
            for code, config in HEALTH_ISSUE_PRODUCT_CATEGORIES.items()
        ]
    
    @classmethod
    def get_full_recommendations(cls, user, products_limit: int = 8, 
                                 courses_limit: int = 4) -> Dict[str, Any]:
        """
        Получить полные персонализированные рекомендации.
        
        Args:
            user: Объект пользователя
            products_limit: Лимит товаров
            courses_limit: Лимит курсов
            
        Returns:
            Dict: Полный набор рекомендаций
        """
        context = cls.get_context(user)
        
        return {
            'context': {
                'has_pets': not context.is_empty,
                'pets_count': len(context.pets),
                'animal_types': list(context.animal_types),
                'has_senior_pets': context.has_senior_pets,
                'has_young_pets': context.has_young_pets,
            },
            'products': cls.get_product_recommendations(user, products_limit),
            'courses': cls.get_course_recommendations(user, courses_limit),
        }


# Сокращённый импорт для удобства
personalization_service = PersonalizationService()

