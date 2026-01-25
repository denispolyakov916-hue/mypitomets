"""
Сервисы для работы с питомцами (PetID) и персонализацией.

Этот модуль предоставляет сервисы для управления питомцами и персонализированными рекомендациями:
- PersonalizationService: Центральный сервис персонализации на основе PetID
- PetService: CRUD операции с питомцами через BaseCRUDService
- ReminderService: CRUD операции с напоминаниями через BaseCRUDService

Основные функции:
    - Формирование персонализированного контекста по питомцам пользователя
    - Фильтрация товаров и курсов по характеристикам питомцев
    - Учёт аллергий, предпочтений, возраста, активности
    - Управление напоминаниями о вакцинации, лечении, прогулках
    - Генерация персонализированных рекомендаций товаров и курсов

Используется в:
    - Каталоге товаров для персонализированных рекомендаций
    - Каталоге курсов для подбора по питомцам
    - Профиле пользователя для управления питомцами
    - Системе напоминаний для отслеживания здоровья
"""

import logging
from typing import Optional, List, Dict, Any, Set
from dataclasses import dataclass, field
from django.db.models import QuerySet, Q
from django.utils import timezone
from decimal import Decimal

from core.services import BaseCRUDService, ServiceResult

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
    Соответствует документации Integration_PetID_Breeds_Calculator.md
    
    Attributes:
        pet_id: UUID питомца
        name: Имя питомца  
        species: Вид (dog, cat)
        breed_id: ID породы
        breed_name: Название породы
        age: Возраст в годах
        age_months: Возраст в месяцах
        age_category: Категория возраста (puppy/kitten, adult, senior)
        weight: Вес в кг
        sex: Пол (male/female)
        is_neutered: Стерилизован/кастрирован
        size_category: Категория размера (toy/small/medium/large/giant)
        activity_level: Уровень активности
        temperament: Темперамент
        social_level: Уровень социализации
        behavioral_problems: Поведенческие проблемы (массив кодов)
        profile_completeness: Процент заполненности профиля
        diet_type: Тип питания
        body_condition_score: Оценка упитанности (BCS)
    """
    pet_id: str
    name: str
    species: str
    breed_id: Optional[int] = None
    breed_name: Optional[str] = None
    age: Optional[int] = None
    age_months: Optional[int] = None
    age_category: Optional[str] = None
    weight: Optional[float] = None
    sex: Optional[str] = None
    is_neutered: bool = False
    size_category: Optional[str] = None
    activity_level: str = 'moderate'
    # Поведение
    temperament: Optional[str] = None
    social_level: Optional[str] = None
    behavioral_problems: List[str] = field(default_factory=list)
    profile_completeness: int = 0
    # Питание
    diet_type: Optional[str] = None
    body_condition_score: Optional[str] = None
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
    def calculated_size_category(self) -> Optional[str]:
        """
        Рассчитанная категория размера по весу.
        Возвращает сохранённый size_category или рассчитывает по весу.
        """
        # Если есть сохранённый размер — возвращаем его
        if self.size_category:
            return self.size_category
        
        # Рассчитываем по весу
        if self.weight is None:
            return None
        
        if self.species == 'dog':
            if self.weight < 5:
                return 'toy'
            elif self.weight < 10:
                return 'small'
            elif self.weight < 25:
                return 'medium'
            elif self.weight < 45:
                return 'large'
            else:
                return 'giant'
        elif self.species == 'cat':
            if self.weight < 4:
                return 'small'
            elif self.weight < 6:
                return 'medium'
            else:
                return 'large'
        return None
    
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
        animal_types: Множество видов животных (dog, cat)
        has_senior_pets: Есть ли пожилые питомцы
        has_young_pets: Есть ли молодые питомцы
    """
    user_id: str
    pets: List[PetContext] = field(default_factory=list)
    
    @property
    def animal_types(self) -> Set[str]:
        """Все виды животных пользователя (dog/cat)."""
        return {pet.animal_type for pet in self.pets}
    
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
        from .models import Breed
        
        context = PersonalizationContext(user_id=str(user.id))
        
        if not user or not user.is_authenticated:
            return context
        
        pets = Pet.objects.select_related('breed').filter(owner=user)
        
        for pet in pets:
            # Получаем данные породы из связанной записи
            breed_data = {}
            if pet.breed and pet.species in ['dog', 'cat']:
                breed_data = {
                    'breed_energy_level': pet.breed.energy_level,
                    'breed_trainability': pet.breed.trainability,
                    'breed_health_risks': pet.breed.genetic_risks or [],
                }
            
            pet_context = PetContext(
                pet_id=str(pet.id),
                name=pet.name,
                species=pet.species,
                breed_id=pet.breed_id,
                breed_name=pet.breed.name if pet.breed else None,
                age=pet.age,
                age_months=pet.age_months,
                age_category=pet.age_category,
                weight=float(pet.weight) if pet.weight else None,
                sex=getattr(pet, 'sex', None),
                is_neutered=getattr(pet, 'is_neutered', False),
                size_category=getattr(pet, 'size_category', None),
                activity_level=getattr(pet, 'activity_level', 'moderate') or 'moderate',
                # Поведение
                temperament=getattr(pet, 'temperament', None),
                social_level=getattr(pet, 'social_level', None),
                behavioral_problems=getattr(pet, 'behavioral_problems', []) or [],
                profile_completeness=pet.profile_completeness,
                # Питание
                diet_type=getattr(pet, 'diet_type', None),
                body_condition_score=getattr(pet, 'body_condition_score', None),
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
            pet = Pet.objects.select_related('breed').get(id=pet_id, owner=user)
            return PetContext(
                pet_id=str(pet.id),
                name=pet.name,
                species=pet.species,
                breed_id=pet.breed_id,
                breed_name=pet.breed.name if pet.breed else None,
                age=pet.age,
                age_months=pet.age_months,
                age_category=pet.age_category,
                weight=float(pet.weight) if pet.weight else None,
                sex=getattr(pet, 'sex', None),
                is_neutered=getattr(pet, 'is_neutered', False),
                size_category=getattr(pet, 'size_category', None),
                activity_level=getattr(pet, 'activity_level', 'moderate') or 'moderate',
                temperament=getattr(pet, 'temperament', None),
                social_level=getattr(pet, 'social_level', None),
                behavioral_problems=getattr(pet, 'behavioral_problems', []) or [],
                profile_completeness=pet.profile_completeness,
            )
        except Pet.DoesNotExist:
            return None
    
    @classmethod
    def filter_products(cls, queryset, context: PersonalizationContext, 
                       pet_id: Optional[str] = None) -> QuerySet:
        """
        Фильтрация товаров на основе контекста персонализации.
        
        Аллергии и исключения теперь хранятся в M2M таблицах:
        - PetAllergy (связь Pet → Allergy)
        - PetFoodExclusion (связь Pet → excluded_item)
        
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
                
                # TODO: Исключение товаров с аллергенами через M2M PetAllergy
                # Это будет реализовано после интеграции PetAllergy с Product.ingredients
        else:
            # Фильтруем по всем видам животных пользователя
            animal_types = list(context.animal_types)
            if animal_types:
                queryset = queryset.filter(
                    Q(animal__in=animal_types) | Q(animal='all')
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
        
        Учитывает:
        - Вид животного (dog/cat)
        - Категорию размера (для подбора порций)
        - Возрастную категорию (puppy/kitten/adult/senior)
        - Уровень активности
        
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
            
            # TODO: Исключение товаров с аллергенами через M2M PetAllergy
            
            # 1. Рекомендации по возрасту
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
                
                age_products = products.filter(q_filter).exclude(id__in=seen_ids)[:3]
                
                for product in age_products:
                    recommendations.append({
                        'product': product.to_dict(),
                        'reason': f'Подходит для возраста {pet.name}',
                        'pet_id': pet.pet_id,
                        'pet_name': pet.name
                    })
                    seen_ids.add(product.id)
            
            # 2. Рекомендации по размеру (для собак)
            size_keywords = {
                'toy': ['mini', 'мини', 'toy', 'x-small'],
                'small': ['small', 'маленьк'],
                'medium': ['medium', 'средн'],
                'large': ['large', 'крупн'],
                'giant': ['giant', 'гигант', 'xxl'],
            }
            
            if pet.species == 'dog' and pet.calculated_size_category in size_keywords:
                keywords = size_keywords[pet.calculated_size_category]
                q_filter = Q()
                for kw in keywords:
                    q_filter |= Q(name__icontains=kw)
                
                size_products = products.filter(q_filter).exclude(id__in=seen_ids)[:2]
                
                for product in size_products:
                    recommendations.append({
                        'product': product.to_dict(),
                        'reason': f'Подходит по размеру для {pet.name}',
                        'pet_id': pet.pet_id,
                        'pet_name': pet.name
                    })
                    seen_ids.add(product.id)
            
            # 3. Популярные товары для вида
            popular = products.exclude(id__in=seen_ids).order_by('-order_count')[:2]
            
            species_display = {'dog': 'собак', 'cat': 'кошек'}.get(pet.species, pet.species)
            for product in popular:
                recommendations.append({
                    'product': product.to_dict(),
                    'reason': f'Популярно для {species_display}',
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


# =============================================================================
# CRUD СЕРВИСЫ НА БАЗЕ BaseCRUDService
# =============================================================================

class PetService(BaseCRUDService):
    """
    Сервис для CRUD операций с питомцами.

    Использует BaseCRUDService для стандартизации операций.
    Дополнительно предоставляет методы валидации и персонализации.
    """

    def __init__(self):
        from .models import Pet
        super().__init__(Pet)

    def get_queryset(self, user=None):
        """Переопределение для фильтрации по владельцу."""
        if user:
            return self.model.objects.filter(owner=user)
        return super().get_queryset(user)

    def create_pet(self, data, user):
        """
        Создать питомца с дополнительной валидацией.

        @param data: Данные питомца
        @param user: Владелец
        @return: Созданный питомец
        """
        # Валидация обязательных полей
        required_fields = ['name', 'species']
        for field in required_fields:
            if not data.get(field):
                raise ValueError(f"Поле '{field}' обязательно для заполнения")

        # Проверка лимита питомцев на пользователя
        pets_count = self.model.objects.filter(owner=user).count()
        if pets_count >= 50:  # Максимум 50 питомцев на пользователя
            raise ValueError("Превышен лимит количества питомцев")

        # Добавляем owner к данным
        data['owner'] = user
        
        # Создание через базовый сервис
        success, result = self.create(data, user)
        if not success:
            raise ValueError(result)
        return result

    def update_pet_profile(self, pet_id, data, user):
        """
        Обновить профиль питомца с пересчетом completeness.

        @param pet_id: ID питомца
        @param data: Данные для обновления
        @param user: Владелец
        @return: Обновленный питомец
        """
        # Получаем питомца
        pet = self.get_by_id(pet_id, user)

        # Обновляем данные
        updated_pet = self.update(pet_id, data, user)

        # Пересчитываем completeness профиля
        updated_pet.calculate_profile_completeness()
        updated_pet.save(update_fields=['profile_completeness'])

        return updated_pet

    def delete_pet(self, pet_id, user):
        """
        Удалить питомца с проверкой зависимостей.

        @param pet_id: ID питомца
        @param user: Владелец
        @return: True если удалено
        """
        pet = self.get_by_id(pet_id, user)

        # Проверяем, есть ли активные напоминания
        if hasattr(pet, 'calendar_events') and pet.calendar_events.filter(status='scheduled').exists():
            raise ValueError("Нельзя удалить питомца с активными напоминаниями")

        # Проверяем, есть ли купленные курсы для этого питомца
        from apps.training.models import UserCourse
        if UserCourse.objects.filter(pet=pet).exists():
            raise ValueError("Нельзя удалить питомца с активными курсами")

        return self.delete(pet_id, user)


class ReminderService(BaseCRUDService):
    """
    Сервис для CRUD операций с напоминаниями.

    Использует BaseCRUDService для стандартизации операций.
    """

    def __init__(self):
        from .reminder_models import Reminder
        super().__init__(Reminder)

    def get_queryset(self, user=None):
        """Переопределение для фильтрации по владельцу питомца."""
        if user:
            # Получаем напоминания только для питомцев пользователя
            from .models import Pet
            user_pet_ids = Pet.objects.filter(owner=user).values_list('id', flat=True)
            return self.model.objects.filter(pet_id__in=user_pet_ids)
        return super().get_queryset(user)

    def create_reminder(self, data, user):
        """
        Создать напоминание с валидацией прав доступа.

        @param data: Данные напоминания
        @param user: Пользователь
        @return: Созданное напоминание
        """
        # Проверяем, что питомец принадлежит пользователю
        pet_id = data.get('pet')
        if pet_id:
            from .models import Pet
            try:
                pet = Pet.objects.get(id=pet_id, owner=user)
            except Pet.DoesNotExist:
                raise ValueError("Питомец не найден или не принадлежит вам")

        return self.create(data, user)

    def get_upcoming_reminders(self, user, days=7):
        """
        Получить предстоящие напоминания.

        @param user: Пользователь
        @param days: Количество дней вперед
        @return: QuerySet предстоящих напоминаний
        """
        from datetime import timedelta
        end_date = timezone.now() + timedelta(days=days)

        return self.get_queryset(user).filter(
            is_active=True,
            next_reminder__lte=end_date,
            next_reminder__gte=timezone.now()
        ).order_by('next_reminder')


# =============================================================================
# ГЛОБАЛЬНЫЕ ЭКЗЕМПЛЯРЫ СЕРВИСОВ
# =============================================================================

# Сокращённый импорт для удобства
personalization_service = PersonalizationService()

# CRUD сервисы
pet_service = PetService()
reminder_service = ReminderService()

