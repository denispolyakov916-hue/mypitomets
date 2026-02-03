"""
FoodRecommendationService - Сервис подбора корма для питомцев.

Реализует бизнес-логику из food-recommendation-ui-specification.md:
1. Персонализированный подбор на основе PetID
2. Учёт аллергий, заболеваний, возраста, размера
3. Два варианта набора: Базовый и Продвинутый
4. Три типа питания: Сухой, Влажный, Мультипитание
5. Расчёт порций и стоимости на период
6. Совместимость кормов
"""

import logging
import math
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
from decimal import Decimal
from django.db.models import Q

logger = logging.getLogger('apps.pets.food_recommendation')


@dataclass
class FoodComponent:
    """Компонент рациона (корм/лакомство/добавка)."""
    product_id: int
    product_name: str
    product_type: str  # dry_food, wet_food, treat, supplement
    match_score: int  # 0-100
    daily_grams: Optional[float] = None
    daily_kcal: Optional[float] = None
    price: Optional[Decimal] = None
    weight_grams: Optional[int] = None
    days_supply: Optional[int] = None  # На сколько дней хватит упаковки
    packages_needed: int = 1  # Количество упаковок на период
    reasons: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    badges: List[str] = field(default_factory=list)  # Рекомендуем, Топ продаж, и т.д.
    alternatives_count: int = 0
    
    # Расширенные поля для UI
    short_description: Optional[str] = None
    image_url: Optional[str] = None
    shop_url: Optional[str] = None
    kcal_per_100g: Optional[float] = None  # Калорийность для отображения
    
    # БЖУ и минералы (в % на 100г продукта)
    nutrition_protein: Optional[float] = None  # Белок %
    nutrition_fat: Optional[float] = None  # Жир %
    nutrition_fiber: Optional[float] = None  # Клетчатка %
    nutrition_moisture: Optional[float] = None  # Влажность %
    nutrition_ash: Optional[float] = None  # Зола %
    nutrition_calcium: Optional[float] = None  # Кальций %
    nutrition_phosphorus: Optional[float] = None  # Фосфор %
    nutrition_omega3: Optional[float] = None  # Омега-3 %
    nutrition_omega6: Optional[float] = None  # Омега-6 %
    
    # Специальные поля для лакомств
    pieces_per_day: Optional[int] = None  # ~количество штук в день
    piece_weight_grams: Optional[int] = None  # Вес одной штуки
    
    # Специальные поля для добавок
    dosage_text: Optional[str] = None  # "1-2 таблетки в день"
    intake_time: Optional[str] = None  # "утром с едой", "вечером"
    intake_instructions: Optional[str] = None  # Подробные инструкции


@dataclass
class FeedingPlan:
    """План кормления."""
    pet_id: str
    pet_name: str
    daily_calories: float
    plan_type: str  # dry, wet, multi
    variant: str  # basic, advanced
    period_days: int
    calorie_distribution: Dict[str, float] = field(default_factory=dict)
    transition_plan: Optional[Dict[str, Any]] = None
    has_gi_issues: bool = False
    species: Optional[str] = None
    age_months: Optional[int] = None
    macro_targets: Optional[Dict[str, Dict[str, float]]] = None
    
    # Компоненты рациона
    components: List[FoodComponent] = field(default_factory=list)
    
    # Добавки (только для advanced)
    supplements: List[FoodComponent] = field(default_factory=list)
    
    # Расчёты
    total_cost: Decimal = Decimal('0')
    cost_per_day: Decimal = Decimal('0')
    
    # Детали плана
    regular_day: Dict[str, Any] = field(default_factory=dict)
    active_day: Optional[Dict[str, Any]] = None
    
    # Метаданные
    warnings: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


@dataclass  
class FoodSearchFilters:
    """Фильтры для поиска корма."""
    species: str = 'dog'
    size_category: Optional[str] = None
    age_months: Optional[int] = None
    daily_calories: Optional[float] = None
    breed_id: Optional[int] = None
    
    # Здоровье и аллергии (из PetID)
    allergy_codes: List[str] = field(default_factory=list)
    excluded_ingredients: List[str] = field(default_factory=list)
    health_condition_codes: List[str] = field(default_factory=list)
    
    # Тип питания
    food_type: str = 'multi'  # dry, wet, multi
    variant: str = 'basic'  # basic, advanced
    
    # Предпочтения
    preferred_brands: List[str] = field(default_factory=list)
    priority_brands: List[str] = field(default_factory=list)
    
    # Бюджет
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    
    # Период
    period_days: int = 30

    # Внутренние вычисления/сигналы
    breed_recommendations: Dict[int, Any] = field(default_factory=dict)
    calorie_distribution: Dict[str, float] = field(default_factory=dict)
    has_gi_issues: bool = False
    macro_targets: Optional[Dict[str, Dict[str, float]]] = None
    warnings: List[str] = field(default_factory=list)


class FoodRecommendationService:
    """
    Сервис подбора корма для питомцев.
    
    Использует данные из:
    - Breed (породные риски)
    - HealthCondition (заболевания)
    - Allergy (аллергии)
    - PetHealthCondition, PetAllergy (связи M2M)
    - Product (каталог кормов)
    """
    
    # Калорийность по умолчанию (ккал/100г) 
    # ВАЖНО: влажный корм 75-82% влаги = 80-120 ккал/100г
    DEFAULT_KCAL = {
        'dry': 360,        # Сухой: 340-400 ккал/100г (среднее 360)
        'wet': 95,         # Влажный: 80-120 ккал/100г (среднее 95)
        'canned': 100,     # Консервы: ~100 ккал/100г
        'holistic': 380,   # Холистик сухой: 380-420 ккал/100г
        'diet': 300,       # Диетический: 280-320 ккал/100г
        'hypoallergenic': 360,
        'treat': 350,      # Лакомства: 300-400 ккал/100г
        'supplement': 0,   # Добавки не учитываем в калориях
    }
    
    # ЖЁСТКОЕ распределение калорий по типу питания (AAFCO/FEDIAF)
    CALORIE_DISTRIBUTION = {
        'dry': {
            'dry_food': 0.90,   # 90% калорий из сухого корма
            'treats': 0.10,     # 10% калорий MAX из лакомств
        },
        'wet': {
            'wet_food': 0.90,   # 90% калорий из влажного корма  
            'treats': 0.10,     # 10% калорий MAX из лакомств
        },
        'multi': {
            'dry_food': 0.60,   # 60% калорий из сухого
            'wet_food': 0.30,   # 30% калорий из влажного
            'treats': 0.10,     # 10% калорий MAX из лакомств
        },
    }
    
    # Средний вес одного лакомства (для расчёта штук)
    AVG_TREAT_PIECE_GRAMS = 12  # ~10-15г на штуку
    TREAT_PIECES_PER_100G = 8   # ~100г / 12г = 8 штук
    
    # Группы совместимости кормов
    COMPATIBILITY_GROUPS = {
        'regular': ['regular', 'premium', 'super_premium', 'holistic'],
        'therapeutic_weight': ['diet', 'light', 'weight_management'],
        'therapeutic_renal': ['renal', 'kidney'],
        'therapeutic_gastro': ['sensitive', 'gastro', 'digestive'],
        'therapeutic_urinary': ['urinary'],
        'hypoallergenic': ['hypoallergenic', 'limited_ingredient'],
    }
    
    # Маппинг аллергий на ингредиенты
    ALLERGY_INGREDIENTS = {
        'dog_govyazhiy_belok': ['говядина', 'говяжий', 'beef'],
        'dog_kurinyy_belok': ['курица', 'курятина', 'куриц', 'chicken', 'poultry'],
        'dog_molochnyy_belok': ['молоко', 'молочный', 'dairy', 'milk'],
        'dog_wheat_protein': ['пшеница', 'пшеничный', 'wheat', 'глютен'],
        'dog_soy_protein': ['соя', 'соевый', 'soy'],
        'dog_fish_protein': ['рыба', 'fish', 'лосось', 'salmon'],
        'dog_egg_protein': ['яйцо', 'яичный', 'egg'],
        'cat_fish_protein': ['рыба', 'fish', 'лосось', 'тунец'],
        'cat_beef_protein': ['говядина', 'beef'],
        'cat_chicken_protein': ['курица', 'chicken'],
        # Добавить другие по мере необходимости
    }
    
    # Заболевания → ключевые слова специализированных кормов
    HEALTH_FOOD_KEYWORDS = {
        'obesity_1': ['diet', 'light', 'weight', 'satiety'],
        'obesity_2': ['diet', 'weight', 'metabolic'],
        'obesity_3': ['weight', 'metabolic', 'obesity'],
        'diabetes': ['diabetic', 'weight', 'glycemic'],
        'ckd_1_2': ['renal', 'kidney'],
        'ckd_3_4': ['renal', 'kidney', 'advanced'],
        'heart_disease': ['cardiac', 'heart'],
        'pancreatitis': ['gastro', 'low_fat', 'sensitive'],
        'ibd': ['gastro', 'intestinal', 'sensitive'],
        'joint_problems': ['joint', 'mobility', 'arthritis'],
        'skin_conditions': ['skin', 'derma', 'sensitive'],
        'dental_disease': ['dental', 'oral'],
    }
    
    def __init__(self):
        self.calorie_calculator = None

    def _get_age_category(self, species: str, age_months: Optional[int]) -> str:
        """Возрастная категория для строгого гейтинга."""
        if age_months is None:
            return 'adult'
        if species == 'cat':
            if age_months < 12:
                return 'kitten'
            if age_months >= 84:
                return 'senior'
            return 'adult'
        # dog
        if age_months < 12:
            return 'puppy'
        if age_months >= 84:
            return 'senior'
        return 'adult'

    def _is_age_compatible(self, product, species: str, age_months: Optional[int]) -> bool:
        """Жёсткое исключение несовместимых возрастных кормов."""
        if age_months is None:
            return True

        details = self._get_food_details(product)
        # Мин/макс возраст в месяцах
        if details:
            if details.age_min_months is not None and age_months < details.age_min_months:
                return False
            if details.age_max_months is not None and age_months > details.age_max_months:
                return False

        # Возрастная группа товара
        product_age_group = product.age_group or 'all'
        if product_age_group == 'all':
            return True

        pet_age_group = self._get_age_category(species, age_months)

        # Запрещаем пересечения puppy/kitten
        if species == 'dog' and product_age_group == 'kitten':
            return False
        if species == 'cat' and product_age_group == 'puppy':
            return False

        return product_age_group == pet_age_group

    def _apply_age_filters(self, queryset, species: str, age_months: Optional[int]):
        """Фильтры по возрасту на уровне БД + строгий age_group."""
        if age_months is None:
            return queryset

        # min/max возраст
        queryset = queryset.filter(
            Q(food_details__age_min_months__isnull=True) | Q(food_details__age_min_months__lte=age_months)
        ).filter(
            Q(food_details__age_max_months__isnull=True) | Q(food_details__age_max_months__gte=age_months)
        )

        # age_group: жёсткое соответствие
        pet_age_group = self._get_age_category(species, age_months)
        allowed_groups = ['all', pet_age_group]
        return queryset.filter(Q(age_group__in=allowed_groups) | Q(age_group__isnull=True))

    def _has_gi_issues(self, filters: FoodSearchFilters) -> bool:
        """Проверка ЖКТ проблем по кодам заболеваний."""
        gi_markers = {'digestive', 'gastro', 'gastrointestinal', 'ibd', 'pancreatitis'}
        for code in filters.health_condition_codes:
            if any(marker in code.lower() for marker in gi_markers):
                return True
        return False

    def _get_breed_recommendations(self, breed_id: Optional[int]) -> Dict[int, Any]:
        """Карта рекомендаций товаров по породе."""
        if not breed_id:
            return {}
        try:
            from apps.shop.models import ProductBreedRecommendation
            recs = ProductBreedRecommendation.objects.filter(
                breed_id=breed_id,
                suitability__in=['ideal', 'recommended', 'suitable']
            ).select_related('product')
            return {r.product_id: r for r in recs}
        except Exception as exc:
            logger.warning(f"Error loading breed recommendations: {exc}")
            return {}

    def _get_calorie_distribution(self, pet, filters: FoodSearchFilters) -> Dict[str, float]:
        """
        Адаптивное распределение калорий по компонентам.
        Правила: species × age × activity × GI/health.
        """
        # Базовое распределение по типу питания
        if filters.food_type == 'dry':
            distribution = {'dry_food': 0.95, 'treats': 0.05}
        elif filters.food_type == 'wet':
            distribution = {'wet_food': 0.95, 'treats': 0.05}
        else:
            distribution = {'dry_food': 0.60, 'wet_food': 0.30, 'treats': 0.10}

        species = filters.species
        age_months = filters.age_months
        age_group = self._get_age_category(species, age_months)
        activity = getattr(pet, 'activity_level', 'moderate') or 'moderate'

        # Видовые корректировки
        if species == 'cat' and filters.food_type == 'multi':
            distribution['wet_food'] += 0.10
            distribution['dry_food'] -= 0.10

        # Возрастные корректировки
        if age_group in ['puppy', 'kitten']:
            distribution['treats'] = min(distribution.get('treats', 0.10), 0.05)
        if age_group == 'senior':
            distribution['treats'] = min(distribution.get('treats', 0.10), 0.05)
            if 'wet_food' in distribution:
                distribution['wet_food'] += 0.05
                distribution['dry_food'] = max(0.0, distribution['dry_food'] - 0.05)

        # Активность (больше энергии днём = больше сухого)
        if activity in ['high', 'very_high'] and 'dry_food' in distribution:
            distribution['dry_food'] += 0.05
            if 'wet_food' in distribution:
                distribution['wet_food'] = max(0.0, distribution['wet_food'] - 0.05)

        # ЖКТ проблемы: минимум лакомств, мягкие корма
        if filters.has_gi_issues:
            if 'treats' in distribution:
                distribution['treats'] = min(distribution['treats'], 0.03)
            if 'wet_food' in distribution:
                distribution['wet_food'] += 0.05
                if 'dry_food' in distribution:
                    distribution['dry_food'] = max(0.0, distribution['dry_food'] - 0.05)

        # Нормализация
        total = sum(distribution.values())
        if total <= 0:
            return distribution
        return {k: round(v / total, 3) for k, v in distribution.items()}

    def _get_transition_plan(self, current_type: Optional[str], target_type: str) -> Optional[Dict[str, Any]]:
        """План перехода на новый тип кормления."""
        if not current_type or current_type == target_type:
            return None

        # 7-дневный переход
        schedule = [
            {'days': '1-2', 'current': 75, 'new': 25},
            {'days': '3-4', 'current': 50, 'new': 50},
            {'days': '5-6', 'current': 25, 'new': 75},
            {'days': '7+', 'current': 0, 'new': 100},
        ]
        return {
            'from': current_type,
            'to': target_type,
            'schedule': schedule,
            'note': 'Переходите постепенно, наблюдайте за пищеварением'
        }
    
    def _get_calorie_calculator(self):
        """Ленивая загрузка калькулятора."""
        if self.calorie_calculator is None:
            from .calorie_calculator import calorie_calculator
            self.calorie_calculator = calorie_calculator
        return self.calorie_calculator
    
    def get_recommendations_for_pet(self, pet, filters: Optional[FoodSearchFilters] = None) -> FeedingPlan:
        """
        Получить рекомендации кормов для питомца.
        
        Args:
            pet: Объект Pet
            filters: Дополнительные фильтры (опционально)
            
        Returns:
            FeedingPlan с рекомендованными компонентами
        """
        # Создаём фильтры на основе PetID если не переданы
        if filters is None:
            filters = self._build_filters_from_pet(pet)
        
        # Рассчитываем калорийность
        calc = self._get_calorie_calculator()
        calorie_result = calc.calculate_daily_calories(pet)
        
        if calorie_result.calculation_method == 'failed':
            return FeedingPlan(
                pet_id=str(pet.id),
                pet_name=pet.name,
                daily_calories=0,
                plan_type=filters.food_type,
                variant=filters.variant,
                period_days=filters.period_days,
                warnings=["Не удалось рассчитать калорийность. Укажите вес питомца."]
            )
        
        filters.daily_calories = calorie_result.mer
        filters.breed_id = pet.breed_id if getattr(pet, 'breed_id', None) else None
        filters.breed_recommendations = self._get_breed_recommendations(filters.breed_id)
        filters.has_gi_issues = self._has_gi_issues(filters)
        filters.calorie_distribution = self._get_calorie_distribution(pet, filters)
        filters.macro_targets = calorie_result.macro_targets
        
        # Создаём план
        plan = FeedingPlan(
            pet_id=str(pet.id),
            pet_name=pet.name,
            daily_calories=calorie_result.mer,
            plan_type=filters.food_type,
            variant=filters.variant,
            period_days=filters.period_days,
            calorie_distribution=filters.calorie_distribution,
            has_gi_issues=filters.has_gi_issues,
            species=pet.species,
            age_months=pet.age_months,
            macro_targets=filters.macro_targets,
        )
        
        # Подбираем компоненты
        if filters.food_type == 'dry':
            plan.components = self._select_dry_food(filters)
        elif filters.food_type == 'wet':
            plan.components = self._select_wet_food(filters)
        else:  # multi
            plan.components = self._select_multi_food(filters)
        
        # Добавляем лакомства
        treats = self._select_treats(filters)
        if treats:
            plan.components.extend(treats)
        
        # Добавляем добавки для продвинутого набора
        if filters.variant == 'advanced':
            plan.supplements = self._select_supplements(pet, filters)
        
        # Рассчитываем стоимость
        self._calculate_costs(plan, filters.period_days)
        
        # Формируем план питания
        plan.regular_day = self._build_daily_plan(plan, calorie_result)
        # План перехода между типами питания
        plan.transition_plan = self._get_transition_plan(
            getattr(pet, 'diet_type', None),
            filters.food_type
        )
        if filters.warnings:
            plan.warnings.extend(filters.warnings)
        
        # План для активного дня (если есть активности)
        if hasattr(pet, 'pet_activities') and pet.pet_activities.exists():
            plan.active_day = self._build_active_day_plan(pet, plan, calorie_result)
        
        # Добавляем рекомендации
        plan.recommendations = list(calorie_result.recommendations or [])
        if plan.has_gi_issues:
            plan.recommendations.append("При ЖКТ проблемах рекомендуются лечебные диеты и дробное кормление")
        if plan.transition_plan:
            plan.recommendations.append("Рекомендуется плавный переход на новый тип питания")
        
        return plan
    
    def _build_filters_from_pet(self, pet) -> FoodSearchFilters:
        """
        Построить фильтры на основе данных PetID.
        """
        filters = FoodSearchFilters(
            species=pet.species or 'dog',
            size_category=getattr(pet, 'size_category', None),
            age_months=pet.age_months,
        )
        
        # Загружаем аллергии
        try:
            from .nutrition_models import PetAllergy
            allergies = PetAllergy.objects.filter(pet=pet, is_active=True).select_related('allergy')
            filters.allergy_codes = [pa.allergy.code for pa in allergies]
        except Exception as e:
            logger.warning(f"Error loading allergies: {e}")
        
        # Загружаем заболевания
        try:
            from .nutrition_models import PetHealthCondition
            conditions = PetHealthCondition.objects.filter(pet=pet, is_active=True).select_related('condition')
            filters.health_condition_codes = [pc.condition.code for pc in conditions]
        except Exception as e:
            logger.warning(f"Error loading health conditions: {e}")
        
        # Загружаем исключения продуктов
        try:
            from .nutrition_models import PetFoodExclusion
            exclusions = PetFoodExclusion.objects.filter(pet=pet)
            filters.excluded_ingredients = [e.ingredient_name for e in exclusions]
        except Exception as e:
            logger.warning(f"Error loading food exclusions: {e}")
        
        # Добавляем породные риски аллергий
        if pet.breed:
            breed_allergy_risks = pet.breed.allergy_risks or []
            for risk in breed_allergy_risks:
                if risk.get('risk_level') in ['common', 'high']:
                    code = risk.get('allergen_code')
                    if code and code not in filters.allergy_codes:
                        # Добавляем как предупреждение, но не исключаем
                        pass
        
        return filters
    
    def _select_dry_food(self, filters: FoodSearchFilters) -> List[FoodComponent]:
        """
        Подбор сухого корма с учётом возраста, размера, аллергий и цены.
        """
        from apps.shop.models import Product
        from django.db.models import Avg
        
        dry_codes = ['food.dry', 'food.semi_moist', 'food.holistic', 'food.hypoallergenic', 'food.diet']
        base_queryset = Product.objects.filter(
            product_group='food',
            new_category__code__in=dry_codes,
            animal_type__in=[filters.species, 'all'],
            is_available=True,
            food_details__energy_kcal_per_100g__isnull=False,
            food_details__product_type='food'
        ).select_related('food_details')
        queryset = base_queryset
        
        # Фильтрация по возрасту - КРИТИЧНО для правильного подбора
        queryset = self._apply_age_filters(queryset, filters.species, filters.age_months)
        
        # Фильтрация по размеру для собак
        if filters.species == 'dog' and filters.size_category:
            queryset = queryset.filter(
                Q(food_details__target_size='all') | 
                Q(food_details__target_size=filters.size_category) |
                Q(food_details__target_size__isnull=True)
            )

        # ЖКТ-режим: подбираем специализированные корма
        if filters.has_gi_issues:
            gi_queryset = queryset.filter(
                Q(food_details__compatibility_group='therapeutic_digestive') |
                Q(food_details__health_conditions__overlap=['digestive', 'gastro', 'gastrointestinal']) |
                Q(new_category__code__in=['food.diet', 'food.hypoallergenic'])
            )
            if gi_queryset.exists():
                queryset = gi_queryset
            else:
                filters.warnings.append(
                    "Не найдены специализированные ЖКТ-корма, использован общий подбор"
                )
        
        # Фильтрация по цене
        if filters.min_price:
            queryset = queryset.filter(price__gte=filters.min_price)
        if filters.max_price:
            queryset = queryset.filter(price__lte=filters.max_price)
        
        # Вычисляем среднюю цену для корректировки score
        avg_price = queryset.aggregate(avg=Avg('price'))['avg'] or Decimal('1000')
        filters.avg_price = avg_price  # Передаём в фильтры для использования в _evaluate_product
        
        # Получаем товары и оцениваем
        products = list(queryset.order_by('price')[:100])  # Берём больше для лучшей выборки
        breed_rec_ids = list(filters.breed_recommendations.keys()) if filters.breed_recommendations else []
        if breed_rec_ids:
            breed_products = list(queryset.filter(id__in=breed_rec_ids))
            product_ids = {p.id for p in products}
            for bp in breed_products:
                if bp.id not in product_ids:
                    products.append(bp)
        scored = []
        
        for product in products:
            score, reasons, warnings, badges = self._evaluate_product(product, filters)
            
            if score > 0:
                kcal_per_100g = self._get_product_kcal(product, 'dry')
                if not kcal_per_100g:
                    continue
                
                # Получаем % калорий для сухого корма по типу питания
                calorie_percent = (filters.calorie_distribution or {}).get('dry_food', 0.90)
                
                # Калории для этого компонента
                component_kcal = (filters.daily_calories or 0) * calorie_percent
                
                # Граммы с ОКРУГЛЕНИЕМ до 10г
                if component_kcal and kcal_per_100g:
                    raw_grams = (component_kcal / kcal_per_100g) * 100
                    daily_grams = round(raw_grams / 10) * 10  # Округляем до 10г
                else:
                    daily_grams = None
                
                # Получаем данные БЖУ
                nutrition = self._get_nutrition_data(product)
                
                component = FoodComponent(
                    product_id=product.id,
                    product_name=product.name,
                    product_type='dry_food',
                    match_score=score,
                    daily_grams=daily_grams,
                    daily_kcal=round(component_kcal) if component_kcal else None,
                    price=product.price,
                    weight_grams=self._get_product_weight_grams(product),
                    reasons=reasons,
                    warnings=warnings,
                    badges=badges,
                    # Расширенные поля для UI
                    short_description=self._get_short_description(product),
                    image_url=getattr(product, 'image_url', None) or getattr(product, 'image', None),
                    shop_url=f"/shop/product/{product.id}",
                    kcal_per_100g=kcal_per_100g,
                    # БЖУ и минералы
                    **nutrition,
                )
                
                # Рассчитываем на сколько дней хватит и сколько упаковок нужно
                if component.weight_grams and daily_grams and daily_grams > 0:
                    # Сколько дней хватит одной упаковки
                    single_package_days = int(component.weight_grams / daily_grams)
                    
                    # Если 1 упаковка значительно больше периода — снижаем score, но не исключаем
                    max_acceptable_days = int(filters.period_days * 1.5)
                    if single_package_days > max_acceptable_days:
                        component.warnings.append(
                            f"Упаковка рассчитана на ~{single_package_days} дн., больше выбранного периода"
                        )
                        score = max(1, score - 10)
                        component.match_score = score
                    
                    # Бонус за оптимальный размер (±30% от периода)
                    if filters.period_days * 0.7 <= single_package_days <= filters.period_days * 1.3:
                        score += 15
                        component.match_score = score
                    
                    # Нужно граммов на период
                    total_grams_needed = daily_grams * filters.period_days
                    
                    # Округляем ВВЕРХ
                    component.packages_needed = max(1, math.ceil(total_grams_needed / component.weight_grams))
                    
                    # Общее количество дней на все упаковки
                    total_grams = component.weight_grams * component.packages_needed
                    component.days_supply = int(total_grams / daily_grams)
                else:
                    component.packages_needed = 1
                    component.days_supply = filters.period_days
                
                scored.append(component)
        
        # Сортируем по score (desc), затем по цене (asc) - лучшее соотношение качества/цены
        scored.sort(key=lambda x: (-x.match_score, float(x.price or 0)))
        
        # Возвращаем лучший + считаем альтернативы
        if scored:
            best = scored[0]
            best.alternatives_count = len(scored) - 1
            return [best]
        
        return []
    
    def _select_wet_food(self, filters: FoodSearchFilters) -> List[FoodComponent]:
        """
        Подбор влажного корма с учётом возраста, размера и цены.
        """
        from apps.shop.models import Product
        from django.db.models import Avg
        
        wet_codes = ['food.wet', 'food.canned', 'food.pouches', 'food.pate']
        base_queryset = Product.objects.filter(
            product_group='food',
            new_category__code__in=wet_codes,
            animal_type__in=[filters.species, 'all'],
            is_available=True,
            food_details__energy_kcal_per_100g__isnull=False,
            food_details__product_type='food'
        ).select_related('food_details')
        queryset = base_queryset
        
        # Фильтрация по возрасту
        queryset = self._apply_age_filters(queryset, filters.species, filters.age_months)
        
        # Фильтрация по размеру для собак
        if filters.species == 'dog' and filters.size_category:
            queryset = queryset.filter(
                Q(food_details__target_size='all') | 
                Q(food_details__target_size=filters.size_category) |
                Q(food_details__target_size__isnull=True)
            )

        # ЖКТ-режим: подбираем специализированные корма
        if filters.has_gi_issues:
            gi_queryset = queryset.filter(
                Q(food_details__compatibility_group='therapeutic_digestive') |
                Q(food_details__health_conditions__overlap=['digestive', 'gastro', 'gastrointestinal']) |
                Q(new_category__code__in=['food.diet', 'food.hypoallergenic'])
            )
            if gi_queryset.exists():
                queryset = gi_queryset
            else:
                filters.warnings.append(
                    "Не найдены специализированные ЖКТ-корма, использован общий подбор"
                )
        
        if filters.min_price:
            queryset = queryset.filter(price__gte=filters.min_price)
        if filters.max_price:
            queryset = queryset.filter(price__lte=filters.max_price)
        
        # Средняя цена для оценки
        avg_price = queryset.aggregate(avg=Avg('price'))['avg'] or Decimal('200')
        filters.avg_price = avg_price
        
        products = list(queryset.order_by('price')[:100])
        breed_rec_ids = list(filters.breed_recommendations.keys()) if filters.breed_recommendations else []
        if breed_rec_ids:
            breed_products = list(queryset.filter(id__in=breed_rec_ids))
            product_ids = {p.id for p in products}
            for bp in breed_products:
                if bp.id not in product_ids:
                    products.append(bp)
        scored = []
        
        for product in products:
            score, reasons, warnings, badges = self._evaluate_product(product, filters)
            
            if score > 0:
                # ВАЖНО: влажный корм ~80-120 ккал/100г (из-за 75-82% влаги)
                kcal_per_100g = self._get_product_kcal(product, 'wet')
                if not kcal_per_100g:
                    continue
                
                # Получаем % калорий для влажного корма по типу питания
                # wet: 90%, multi: 30%
                calorie_percent = (filters.calorie_distribution or {}).get('wet_food', 0.90)
                
                # Калории для этого компонента
                component_kcal = (filters.daily_calories or 0) * calorie_percent
                
                # Граммы с ОКРУГЛЕНИЕМ до 10г
                if component_kcal and kcal_per_100g:
                    raw_grams = (component_kcal / kcal_per_100g) * 100
                    daily_grams = round(raw_grams / 10) * 10  # Округляем до 10г
                else:
                    daily_grams = None
                
                # Получаем данные БЖУ
                nutrition = self._get_nutrition_data(product)
                
                component = FoodComponent(
                    product_id=product.id,
                    product_name=product.name,
                    product_type='wet_food',
                    match_score=score,
                    daily_grams=daily_grams,
                    daily_kcal=round(component_kcal) if component_kcal else None,
                    price=product.price,
                    weight_grams=self._get_product_weight_grams(product),
                    reasons=reasons,
                    warnings=warnings,
                    badges=badges,
                    # Расширенные поля для UI
                    short_description=self._get_short_description(product),
                    image_url=getattr(product, 'image_url', None) or getattr(product, 'image', None),
                    shop_url=f"/shop/product/{product.id}",
                    kcal_per_100g=kcal_per_100g,
                    # БЖУ и минералы
                    **nutrition,
                )
                
                if component.weight_grams and daily_grams and daily_grams > 0:
                    # Сколько дней хватит одной упаковки
                    single_package_days = int(component.weight_grams / daily_grams)
                    
                    # Если 1 упаковка значительно больше периода — снижаем score, но не исключаем
                    max_acceptable_days = int(filters.period_days * 1.5)
                    if single_package_days > max_acceptable_days:
                        component.warnings.append(
                            f"Упаковка рассчитана на ~{single_package_days} дн., больше выбранного периода"
                        )
                        score = max(1, score - 10)
                        component.match_score = score
                    
                    # Бонус за оптимальный размер (±30% от периода)
                    if filters.period_days * 0.7 <= single_package_days <= filters.period_days * 1.3:
                        score += 15
                        component.match_score = score
                    
                    # Нужно граммов на период
                    total_grams_needed = daily_grams * filters.period_days
                    
                    # Округляем ВВЕРХ
                    component.packages_needed = max(1, math.ceil(total_grams_needed / component.weight_grams))
                    
                    # Общее количество дней на все упаковки
                    total_grams = component.weight_grams * component.packages_needed
                    component.days_supply = int(total_grams / daily_grams)
                else:
                    component.packages_needed = 1
                    component.days_supply = filters.period_days
                
                scored.append(component)
        
        # Сортируем по score (desc), затем по цене (asc)
        scored.sort(key=lambda x: (-x.match_score, float(x.price or 0)))
        
        if scored:
            best = scored[0]
            best.alternatives_count = len(scored) - 1
            return [best]
        
        return []
    
    def _select_multi_food(self, filters: FoodSearchFilters) -> List[FoodComponent]:
        """
        Подбор мультипитания (адаптивное распределение сухой/влажный/лакомства).
        
        ВАЖНО: Распределение калорий уже учтено в filters.calorie_distribution
        через filters.food_type = 'multi'
        """
        components = []
        
        # Сухой корм (процент калорий учтён в _select_dry_food через filters.calorie_distribution)
        dry_components = self._select_dry_food(filters)
        for c in dry_components:
            c.product_type = 'dry_food_multi'
        components.extend(dry_components)
        
        # Влажный корм (процент калорий учтён в _select_wet_food через filters.calorie_distribution)
        wet_components = self._select_wet_food(filters)
        for c in wet_components:
            c.product_type = 'wet_food_multi'
        components.extend(wet_components)
        
        return components
    
    def _select_treats(self, filters: FoodSearchFilters) -> List[FoodComponent]:
        """
        Подбор лакомств (СТРОГО 10% от калорий MAX).
        
        ВАЖНО: Лакомства = 10% от MER, не более!
        Пример: MER 1200 ккал → лакомства 120 ккал → ~35г (при 350 ккал/100г)
        
        Учитывает:
        - Возраст питомца (min_age_months, max_age_months)
        - Размер породы (target_size)
        - Аллергии
        """
        from apps.shop.models import Product
        
        queryset = Product.objects.filter(
            product_group='treats',
            animal_type__in=[filters.species, 'all'],
            is_available=True,
            food_details__energy_kcal_per_100g__isnull=False,
            food_details__product_type='treat'
        ).select_related('food_details')
        
        # Фильтр по возрасту
        age_months = filters.age_months or 24
        queryset = self._apply_age_filters(queryset, filters.species, age_months)
        
        # Фильтр по размеру
        size = filters.size_category
        if size:
            queryset = queryset.filter(
                Q(food_details__target_size='all') | Q(food_details__target_size=size) | Q(food_details__target_size__isnull=True)
            )
        
        products = list(queryset[:30])
        
        if not products:
            return []
        
        # СТРОГО 10% от калорий для лакомств
        treat_calorie_percent = (filters.calorie_distribution or {}).get('treats', 0.10)
        if treat_calorie_percent <= 0:
            return []
        
        treat_kcal = (filters.daily_calories or 0) * treat_calorie_percent
        
        # Сортируем по релевантности
        scored_products = []
        for product in products:
            score, reasons, warnings, badges = self._evaluate_product(product, filters)
            scored_products.append((product, score, reasons, warnings, badges))
        
        scored_products.sort(key=lambda x: x[1], reverse=True)
        
        # Возвращаем лучшее лакомство с ПРАВИЛЬНЫМ расчётом граммов
        if scored_products:
            product, score, reasons, warnings, badges = scored_products[0]
            
            # Калорийность лакомства (обычно 300-400 ккал/100г)
            kcal_per_100g = self._get_product_kcal(product, 'treat')
            if not kcal_per_100g:
                return []
            
            # Расчёт граммов: (ккал / ккал_на_100г) * 100, округляем до 10г
            if treat_kcal and kcal_per_100g:
                raw_grams = (treat_kcal / kcal_per_100g) * 100
                daily_grams = max(10, round(raw_grams / 10) * 10)  # Минимум 10г
            else:
                daily_grams = 20  # Fallback
            
            # Расчёт штук (~10-15г на штуку)
            piece_weight = self.AVG_TREAT_PIECE_GRAMS
            pieces_per_day = max(1, round(daily_grams / piece_weight))
            
            # Вес упаковки и расчёт на период
            weight_grams = self._get_product_weight_grams(product) or 200
            
            # Сколько упаковок на период
            total_grams_needed = daily_grams * filters.period_days * 1.15
            packages_needed = max(1, math.ceil(total_grams_needed / weight_grams))
            days_supply = int((weight_grams * packages_needed) / daily_grams) if daily_grams else filters.period_days
            
            return [FoodComponent(
                product_id=product.id,
                product_name=product.name,
                product_type='treat',
                match_score=score,
                daily_grams=daily_grams,
                daily_kcal=round(treat_kcal),
                price=product.price,
                weight_grams=weight_grams,
                packages_needed=packages_needed,
                days_supply=days_supply,
                reasons=reasons if reasons else ['Подходит по возрасту и размеру'],
                warnings=warnings,
                badges=badges if badges else ['Подходит'],
                alternatives_count=len(scored_products) - 1,
                # Расширенные поля
                short_description=self._get_short_description(product),
                image_url=getattr(product, 'image_url', None) or getattr(product, 'image', None),
                shop_url=f"/shop/product/{product.id}",
                kcal_per_100g=kcal_per_100g,
                # Специальные поля для лакомств
                pieces_per_day=pieces_per_day,
                piece_weight_grams=piece_weight,
            )]
        
        return []
    
    def _select_supplements(self, pet, filters: FoodSearchFilters) -> List[FoodComponent]:
        """
        Подбор добавок для продвинутого набора.
        
        Логика:
        - Для щенков/котят: кальций, витамины, омега-3
        - Для пожилых: хондропротекторы, витамины для пожилых
        - Для беременных/кормящих: кальций, мультивитамины
        - По заболеваниям: специфические добавки (суставы, кожа, ЖКТ)
        - По породе: учитываем породные риски
        """
        from apps.shop.models import Product
        
        supplements = []
        needed_types = []  # subcategory для поиска
        reasons_map = {}   # subcategory -> причина рекомендации
        
        age_months = pet.age_months or 24
        species = pet.species or 'dog'
        
        # === Определяем нужные добавки по возрасту ===
        if age_months < 12:  # Щенок/котёнок
            needed_types.extend(['calcium', 'vitamins', 'omega3'])
            reasons_map['calcium'] = 'Для роста костей и зубов'
            reasons_map['vitamins'] = 'Для развития щенка/котёнка'
            reasons_map['omega3'] = 'Для развития мозга'
        
        if age_months >= 84:  # Пожилой (7+ лет)
            needed_types.extend(['senior', 'joint', 'vitamins'])
            reasons_map['senior'] = 'Поддержка пожилого питомца'
            reasons_map['joint'] = 'Профилактика проблем с суставами'
            reasons_map['vitamins'] = 'Поддержка иммунитета'
        
        # === По репродуктивному статусу ===
        reproductive_state = getattr(pet, 'reproductive_state', None)
        if reproductive_state == 'pregnant':
            needed_types.extend(['calcium', 'vitamins'])
            reasons_map['calcium'] = 'Необходим при беременности'
            reasons_map['vitamins'] = 'Поддержка беременности'
        elif reproductive_state == 'lactating':
            needed_types.extend(['calcium', 'vitamins'])
            reasons_map['calcium'] = 'Необходим при кормлении'
            reasons_map['vitamins'] = 'Восстановление после родов'
        
        # === По заболеваниям ===
        for condition_code in filters.health_condition_codes:
            condition_lower = condition_code.lower()
            if 'joint' in condition_lower or 'arthritis' in condition_lower or 'dysplasia' in condition_lower:
                needed_types.append('joint')
                reasons_map['joint'] = 'Поддержка суставов'
            if 'skin' in condition_lower or 'allergy' in condition_lower or 'dermat' in condition_lower:
                needed_types.append('skin')
                needed_types.append('omega3')
                reasons_map['skin'] = 'Здоровье кожи и шерсти'
                reasons_map['omega3'] = 'При проблемах с кожей'
            if 'digest' in condition_lower or 'gastro' in condition_lower or 'ibd' in condition_lower:
                needed_types.append('digestion')
                reasons_map['digestion'] = 'Поддержка ЖКТ'
            if 'immune' in condition_lower:
                needed_types.append('immune')
                reasons_map['immune'] = 'Укрепление иммунитета'
        
        # === По породным рискам ===
        if pet.breed:
            breed_risks = getattr(pet.breed, 'health_risks', None)
            if breed_risks:
                # health_risks может быть list или queryset
                risk_codes = breed_risks if isinstance(breed_risks, list) else []
                for risk in risk_codes:
                    risk_lower = str(risk).lower() if risk else ''
                    if 'joint' in risk_lower or 'hip' in risk_lower:
                        needed_types.append('joint')
                        reasons_map['joint'] = f'Породный риск: проблемы с суставами'
                    if 'skin' in risk_lower:
                        needed_types.append('skin')
                        reasons_map['skin'] = f'Породный риск: проблемы с кожей'
        
        # Убираем дубликаты, оставляем максимум 3 добавки
        needed_types = list(dict.fromkeys(needed_types))[:3]
        
        # === Если нет специфических нужд, добавляем базовые витамины ===
        if not needed_types:
            needed_types = ['vitamins']
            reasons_map['vitamins'] = 'Общая поддержка здоровья'
        
        # === Ищем добавки в каталоге ===
        for supp_type in needed_types:
            queryset = Product.objects.filter(
                product_group='vitamins',
                animal_type__in=[species, 'all'],
                is_available=True,
                food_details__product_type='supplement'
            ).select_related('food_details')
            
            queryset = queryset.filter(
                Q(new_category__code__icontains=supp_type) |
                Q(name__icontains=supp_type) |
                Q(description__icontains=supp_type)
            )
            
            # Фильтруем по возрасту
            queryset = queryset.filter(
                Q(food_details__age_min_months__isnull=True) | Q(food_details__age_min_months__lte=age_months)
            ).filter(
                Q(food_details__age_max_months__isnull=True) | Q(food_details__age_max_months__gte=age_months)
            )
            
            product = queryset.first()
            if product:
                reason = reasons_map.get(supp_type, f'Рекомендовано: {supp_type}')
                
                # Определяем дозировку и время приёма
                dosage_text, intake_time, intake_instructions = self._get_supplement_dosage(
                    product, supp_type, species, filters.size_category, age_months
                )
                
                # Расчёт упаковок на период
                weight_grams = self._get_product_weight_grams(product) or 60
                # Добавки обычно ~30-60 таблеток/капсул
                packages_needed = max(1, math.ceil(filters.period_days / 30))  # ~1 уп/месяц
                days_supply = 30 * packages_needed
                
                supplements.append(FoodComponent(
                    product_id=product.id,
                    product_name=product.name,
                    product_type='supplement',
                    match_score=85,
                    price=product.price,
                    weight_grams=weight_grams,
                    packages_needed=packages_needed,
                    days_supply=days_supply,
                    reasons=[reason],
                    badges=['Рекомендуем'],
                    alternatives_count=queryset.count() - 1,
                    # Расширенные поля
                    short_description=self._get_short_description(product),
                    image_url=getattr(product, 'image_url', None) or getattr(product, 'image', None),
                    shop_url=f"/shop/product/{product.id}",
                    # Специальные поля для добавок
                    dosage_text=dosage_text,
                    intake_time=intake_time,
                    intake_instructions=intake_instructions,
                ))
        
        return supplements
    
    def _get_supplement_dosage(
        self, 
        product, 
        supp_type: str, 
        species: str, 
        size_category: Optional[str],
        age_months: int
    ) -> Tuple[str, str, str]:
        """
        Определяет дозировку добавки по типу, размеру и возрасту питомца.
        
        Returns:
            (dosage_text, intake_time, intake_instructions)
        """
        # Базовые дозировки по типу добавки
        dosage_map = {
            'vitamins': {
                'small': '1/2 таблетки в день',
                'medium': '1 таблетка в день',
                'large': '1-2 таблетки в день',
                'giant': '2 таблетки в день',
            },
            'joint': {
                'small': '1 таблетка в день',
                'medium': '1-2 таблетки в день',
                'large': '2 таблетки в день',
                'giant': '2-3 таблетки в день',
            },
            'omega3': {
                'small': '1 капсула в день',
                'medium': '1-2 капсулы в день',
                'large': '2 капсулы в день',
                'giant': '2-3 капсулы в день',
            },
            'calcium': {
                'small': '1/2 таблетки в день',
                'medium': '1 таблетка в день',
                'large': '1-2 таблетки в день',
                'giant': '2 таблетки в день',
            },
            'digestion': {
                'all': '1 порция в день',
            },
            'skin': {
                'all': '1-2 капсулы в день',
            },
            'senior': {
                'small': '1 таблетка в день',
                'medium': '1-2 таблетки в день',
                'large': '2 таблетки в день',
                'giant': '2-3 таблетки в день',
            },
            'immune': {
                'all': '1 таблетка в день',
            },
        }
        
        # Время приёма
        intake_time_map = {
            'vitamins': 'утром с едой',
            'joint': 'утром и вечером с едой',
            'omega3': 'с едой',
            'calcium': 'утром с едой',
            'digestion': 'перед едой',
            'skin': 'с едой',
            'senior': 'утром с едой',
            'immune': 'утром с едой',
        }
        
        # Дополнительные инструкции
        instructions_map = {
            'vitamins': 'Для лучшего усвоения давать с едой.',
            'joint': 'Курс минимум 8 недель для видимого эффекта.',
            'omega3': 'Хранить в холодильнике после вскрытия.',
            'calcium': 'Не сочетать с молочными продуктами.',
            'digestion': 'Давать за 15-30 минут до еды.',
            'skin': 'Эффект заметен через 4-6 недель.',
            'senior': 'Рекомендуется постоянный приём.',
            'immune': 'Курс 30 дней, перерыв 2 недели.',
        }
        
        # Определяем размер для кошек (всегда small)
        if species == 'cat':
            size = 'small'
        else:
            size = size_category or 'medium'
        
        # Корректировка для щенков/котят
        if age_months < 6:
            size = 'small'  # Меньшая дозировка
        
        # Получаем дозировку
        type_dosages = dosage_map.get(supp_type, {})
        dosage_text = type_dosages.get(size) or type_dosages.get('all', '1 таблетка в день')
        
        intake_time = intake_time_map.get(supp_type, 'с едой')
        intake_instructions = instructions_map.get(supp_type, 'Следуйте инструкции на упаковке.')
        
        return dosage_text, intake_time, intake_instructions

    def _get_food_details(self, product):
        """Безопасно получить связанные FoodDetails."""
        return getattr(product, 'food_details', None)

    def _get_product_weight_grams(self, product) -> Optional[int]:
        """Вес продукта в граммах по SKU."""
        sku = product.skus.filter(available=True).order_by('-is_default', 'sort_order').first()
        if sku and sku.weight_kg:
            return int(sku.weight_kg * 1000)
        return None
    
    def _get_short_description(self, product, max_length: int = 80) -> str:
        """
        Генерирует короткое описание товара для карточки.
        
        Приоритет:
        1. product.short_description (если есть)
        2. Первые N символов product.description
        3. Генерация по категории/типу
        """
        # Проверяем short_description
        if hasattr(product, 'short_description') and product.short_description:
            return product.short_description[:max_length]
        
        # Обрезаем длинное описание
        if product.description:
            desc = product.description.strip()
            # Убираем переносы строк
            desc = ' '.join(desc.split())
            if len(desc) <= max_length:
                return desc
            # Обрезаем по последнему пробелу
            truncated = desc[:max_length].rsplit(' ', 1)[0]
            return truncated + '...'
        
        # Генерируем по группе товаров
        category_descriptions = {
            'food': 'Полнорационный корм',
            'treats': 'Лакомство для питомца',
            'vitamins': 'Витаминная добавка',
        }
        return category_descriptions.get(product.product_group, 'Товар для питомца')
    
    def _get_nutrition_data(self, product) -> dict:
        """
        Извлечь данные о БЖУ и минералах из продукта.
        
        Returns:
            dict с nutrition_* полями
        """
        details = self._get_food_details(product)
        if not details:
            return {
            'nutrition_protein': None,
            'nutrition_fat': None,
            'nutrition_fiber': None,
            'nutrition_moisture': None,
            'nutrition_ash': None,
            }
        return {
            'nutrition_protein': float(details.protein_g_per_100g) if details.protein_g_per_100g else None,
            'nutrition_fat': float(details.fat_g_per_100g) if details.fat_g_per_100g else None,
            'nutrition_fiber': float(details.fiber_g_per_100g) if details.fiber_g_per_100g else None,
            'nutrition_moisture': float(details.moisture_percent) if details.moisture_percent else None,
            'nutrition_ash': float(details.ash_g_per_100g) if details.ash_g_per_100g else None,
        }
    
    def _evaluate_product(
        self, 
        product, 
        filters: FoodSearchFilters
    ) -> Tuple[int, List[str], List[str], List[str]]:
        """
        Оценить продукт для питомца.
        
        Returns:
            (score, reasons, warnings, badges)
        """
        score = 100
        reasons = []
        warnings = []
        badges = []
        
        product_name = (product.name or '').lower()
        product_desc = (product.description or '').lower()
        full_text = f"{product_name} {product_desc}"
        details = self._get_food_details(product)
        category_code = product.new_category.code if getattr(product, 'new_category', None) else ''

        # 0. Жёсткий возрастной гейтинг
        if not self._is_age_compatible(product, filters.species, filters.age_months):
            return (0, [], ["Не подходит по возрасту"], [])

        # 0.1 Жёсткий гейтинг по размеру для собак
        if filters.species == 'dog' and filters.size_category:
            size_keywords = {
                'toy': ['toy', 'mini', 'x-small', 'мини', 'карликов', 'toy'],
                'small': ['small', 'mini', 'мал', 'мелких', 'мини'],
                'medium': ['medium', 'средн'],
                'large': ['large', 'крупн', 'крупных'],
                'giant': ['giant', 'гигант', 'xxl', 'очень крупн'],
            }
            # Определяем размер из target_size или названия
            product_size = details.target_size if details and details.target_size else 'all'
            detected_size = None
            if getattr(product, 'size_group', None) and product.size_group != 'all':
                size_group_map = {
                    'mini': 'toy',
                    'small': 'small',
                    'medium': 'medium',
                    'large': 'large',
                    'giant': 'giant',
                }
                detected_size = size_group_map.get(product.size_group)
            if product_size and product_size != 'all':
                detected_size = product_size
            else:
                for size, keywords in size_keywords.items():
                    if any(kw in full_text for kw in keywords):
                        detected_size = size
                        break
            # Если явно указан другой размер — исключаем
            if detected_size and detected_size != filters.size_category:
                return (0, [], [f"Размер корма не подходит: {detected_size}"], [])
        
        # 1. КРИТИЧНО: Проверка аллергий - исключаем полностью
        if filters.allergy_codes:
            allergens_list = [a.lower() for a in (details.allergens or [])] if details else []
            for allergy_code in filters.allergy_codes:
                ingredients_to_check = self.ALLERGY_INGREDIENTS.get(allergy_code, [])
                for ingredient in ingredients_to_check:
                    if ingredient.lower() in allergens_list:
                        return (0, [], [f"Содержит аллерген: {ingredient}"], [])
                    if not allergens_list and ingredient.lower() in full_text:
                        return (0, [], [f"Содержит аллерген: {ingredient}"], [])
        
        # 2. Проверка исключённых ингредиентов
        for excluded in filters.excluded_ingredients:
            if excluded.lower() in full_text:
                score -= 40
                warnings.append(f"Содержит: {excluded}")
        
        if score <= 0:
            return (0, reasons, warnings, badges)
        
        # 3. Бонусы за соответствие заболеваниям
        for condition_code in filters.health_condition_codes:
            keywords = self.HEALTH_FOOD_KEYWORDS.get(condition_code, [])
            category_hint = category_code or ''
            for keyword in keywords:
                if keyword in full_text or keyword in category_hint:
                    score += 15
                    reasons.append(f"Подходит при: {condition_code}")
                    badges.append("Лечебный")
                    break
            if details and condition_code in (details.health_conditions or []):
                score += 10
                reasons.append(f"Показания: {condition_code}")
        
        # 4. Гипоаллергенные корма если есть аллергии
        if filters.allergy_codes:
            is_hypo = bool(details and details.is_hypoallergenic) or product.is_hypoallergenic
            if is_hypo or 'hypoallergenic' in full_text or 'hypoallergenic' in category_code:
                score += 20
                reasons.append("Гипоаллергенный")
                badges.append("Гипоаллергенный")

        # 4.1 Учет породных рекомендаций
        breed_rec = filters.breed_recommendations.get(product.id) if filters.breed_recommendations else None
        if breed_rec:
            score += min(25, max(10, int(getattr(breed_rec, 'score', 70) / 4)))
            reasons.append("Рекомендуется для вашей породы")
            badges.append("Для породы")

        # 4.2 БЖУ: соответствие целевым диапазонам питомца (мягкий скоринг)
        if filters.macro_targets:
            macro_targets = filters.macro_targets
            macros = {
                'protein': details.protein_g_per_100g if details else None,
                'fat': details.fat_g_per_100g if details else None,
                'fiber': details.fiber_g_per_100g if details else None,
            }
            for macro, value in macros.items():
                if value is None:
                    continue
                target = macro_targets.get(macro)
                if not target:
                    continue
                if target['min'] <= float(value) <= target['max']:
                    score += 5
                else:
                    score -= 5
                    warnings.append(f"{macro} вне целевого диапазона")
        
        # 5. Соответствие возрасту
        if filters.age_months is not None:
            if filters.age_months < 12:
                if any(kw in full_text for kw in ['puppy', 'kitten', 'щенок', 'котёнок', 'junior']):
                    score += 15
                    reasons.append("Для молодых")
                elif any(kw in full_text for kw in ['adult', 'взрослый']):
                    score -= 15
                    warnings.append("Для взрослых")
            elif filters.age_months > 84:
                if any(kw in full_text for kw in ['senior', 'mature', 'пожилой', '7+']):
                    score += 15
                    reasons.append("Для пожилых")
                    badges.append("Senior")
            else:
                if any(kw in full_text for kw in ['adult', 'взрослый']):
                    score += 10
                    reasons.append("Для взрослых")
        
        # 6. Соответствие размеру (собаки)
        if filters.species == 'dog' and filters.size_category:
            size_keywords = {
                'toy': ['toy', 'mini', 'миниатюрный'],
                'small': ['small', 'mini', 'мелких'],
                'medium': ['medium', 'средних'],
                'large': ['large', 'крупных'],
                'giant': ['giant', 'гигантских'],
            }
            keywords = size_keywords.get(filters.size_category, [])
            for kw in keywords:
                if kw in full_text:
                    score += 10
                    reasons.append(f"Для {filters.size_category}")
                    break
        
        # 7. Приоритетные бренды
        brand_name = (product.brand.name if product.brand else '').lower()
        if filters.priority_brands:
            for brand in filters.priority_brands:
                if brand.lower() in brand_name:
                    score += 10
                    badges.append("Приоритет")
                    break
        
        # 8. Холистик бонус
        if 'holistic' in category_code:
            score += 5
            badges.append("Холистик")
        
        # 9. Штраф за слишком высокую цену (выше средней в 2+ раза)
        # Передаётся через filters.avg_price если есть
        avg_price = getattr(filters, 'avg_price', None)
        if avg_price and product.price:
            price_ratio = float(product.price) / float(avg_price)
            if price_ratio > 2:
                score -= 15
                warnings.append("Выше среднего ценового диапазона")
            elif price_ratio > 1.5:
                score -= 5
            elif price_ratio < 0.5:
                # Очень дешёвый - может быть подозрительно
                warnings.append("Значительно ниже среднего")
        
        # Ограничиваем score
        score = max(0, min(100, score))
        
        # Добавляем бейдж "Идеально подходит" для высоких оценок
        if score >= 85:
            badges.insert(0, "Идеально подходит")
        elif score >= 70:
            badges.insert(0, "Хорошо подходит")
        
        return (score, reasons, warnings, badges)
    
    def _get_product_kcal(self, product, food_type: str = 'dry') -> float:
        """
        Получить калорийность продукта (ккал/100г).
        """
        details = self._get_food_details(product)
        if details and details.energy_kcal_per_100g:
            return float(details.energy_kcal_per_100g)
        return None
    
    def _calculate_costs(self, plan: FeedingPlan, period_days: int):
        """
        Рассчитать стоимость плана на период.
        """
        total = Decimal('0')
        
        for component in plan.components + plan.supplements:
            if component.price and component.packages_needed:
                total += component.price * component.packages_needed
        
        plan.total_cost = total
        plan.cost_per_day = total / period_days if period_days > 0 else Decimal('0')
    
    def _build_daily_plan(self, plan: FeedingPlan, calorie_result) -> Dict[str, Any]:
        """
        Построить детальный план питания на обычный день.
        
        Включает:
        - Распределение кормлений по времени
        - Калорийность каждого приёма
        - Рекомендации по лакомствам
        - Время приёма добавок
        """
        meals_per_day = calorie_result.meals_per_day
        
        # Округление порции до 10г
        def round_portion(grams):
            if not grams:
                return 0
            step = 5 if plan.species == 'cat' else 10
            return round(grams / step) * step

        def get_nutrition_for_meal(component: Optional[FoodComponent], grams: float) -> Optional[Dict[str, Any]]:
            if not component or not grams:
                return None
            protein = component.nutrition_protein
            fat = component.nutrition_fat
            fiber = component.nutrition_fiber
            moisture = component.nutrition_moisture
            ash = component.nutrition_ash

            if protein is None and fat is None:
                return None

            known = sum(v for v in [protein, fat, fiber, moisture, ash] if v is not None)
            carbs_percent = max(0.0, 100.0 - known) if known else None

            def grams_from_percent(pct):
                return round((grams * pct) / 100, 1) if pct is not None else None

            return {
                'protein_percent': protein,
                'fat_percent': fat,
                'carbs_percent': carbs_percent,
                'protein_grams': grams_from_percent(protein),
                'fat_grams': grams_from_percent(fat),
                'carbs_grams': grams_from_percent(carbs_percent) if carbs_percent is not None else None,
            }
        
        daily = {
            'total_kcal': round(plan.daily_calories),
            'meals_count': meals_per_day,
            'meals': [],
            'treats': None,
            'supplements': [],
            'feeding_tips': [],
            'calorie_distribution': plan.calorie_distribution or {},
        }

        if plan.transition_plan:
            daily['transition_plan'] = plan.transition_plan
        
        if plan.plan_type == 'multi':
            # === МУЛЬТИПИТАНИЕ ===
            dry_component = next((c for c in plan.components if 'dry' in c.product_type), None)
            wet_component = next((c for c in plan.components if 'wet' in c.product_type), None)
            treat_component = next((c for c in plan.components if c.product_type == 'treat'), None)
            
            # Утро и день - сухой корм (делим на утро и обед если 3+ кормления)
            if dry_component:
                dry_grams = dry_component.daily_grams or 0
                dry_kcal = dry_component.daily_kcal or 0
                
                if meals_per_day >= 3:
                    # Утро - 60%, Обед - 40% от сухого
                    morning_grams = round_portion(dry_grams * 0.6)
                    lunch_grams = round_portion(dry_grams * 0.4)
                    
                    daily['meals'].append({
                        'time': '08:00',
                        'label': 'Завтрак',
                        'type': 'dry',
                        'product': dry_component.product_name,
                        'grams': morning_grams,
                        'kcal': round(morning_grams * (dry_component.kcal_per_100g or 0) / 100),
                        'note': 'Сухой корм для энергии на первую половину дня',
                        'nutrition': get_nutrition_for_meal(dry_component, morning_grams),
                    })
                    daily['meals'].append({
                        'time': '13:00',
                        'label': 'Обед',
                        'type': 'dry',
                        'product': dry_component.product_name,
                        'grams': lunch_grams,
                        'kcal': round(lunch_grams * (dry_component.kcal_per_100g or 0) / 100),
                        'note': 'Перекус в середине дня',
                        'nutrition': get_nutrition_for_meal(dry_component, lunch_grams),
                    })
                else:
                    # Только утро
                    daily['meals'].append({
                        'time': '08:00',
                        'label': 'Завтрак',
                        'type': 'dry',
                        'product': dry_component.product_name,
                        'grams': round_portion(dry_grams),
                        'kcal': round(dry_kcal),
                        'note': 'Основной приём сухого корма',
                        'nutrition': get_nutrition_for_meal(dry_component, round_portion(dry_grams)),
                    })
            
            # Вечер - влажный корм
            if wet_component:
                wet_grams = round_portion(wet_component.daily_grams or 0)
                wet_kcal = wet_component.daily_kcal or 0
                
                daily['meals'].append({
                    'time': '18:00',
                    'label': 'Ужин',
                    'type': 'wet',
                    'product': wet_component.product_name,
                    'grams': wet_grams,
                    'kcal': round(wet_kcal),
                    'note': 'Влажный корм вечером улучшает гидратацию',
                    'nutrition': get_nutrition_for_meal(wet_component, wet_grams),
                })
            
            # Лакомства
            if treat_component:
                daily['treats'] = {
                    'product': treat_component.product_name,
                    'daily_grams': treat_component.daily_grams,
                    'daily_kcal': round(treat_component.daily_kcal or 0),
                    'pieces_per_day': treat_component.pieces_per_day,
                    'note': 'Используйте для поощрения и дрессировки, распределите в течение дня',
                    'nutrition': get_nutrition_for_meal(treat_component, treat_component.daily_grams or 0),
                }
            elif plan.calorie_distribution.get('treats', 0) > 0:
                daily['treats'] = {
                    'product': None,
                    'daily_grams': None,
                    'daily_kcal': round(plan.daily_calories * plan.calorie_distribution.get('treats', 0)),
                    'pieces_per_day': None,
                    'note': 'Лакомства допустимы, но конкретный продукт не подобран',
                }
            
            daily['feeding_tips'].extend([
                'Сухой корм утром и днём обеспечивает стабильную энергию',
                'Влажный корм вечером способствует гидратации перед сном',
                'Лакомства давайте между основными приёмами пищи',
            ])
            
        elif plan.plan_type == 'wet':
            # === ТОЛЬКО ВЛАЖНЫЙ КОРМ ===
            component = plan.components[0] if plan.components else None
            treat_component = next((c for c in plan.components if c.product_type == 'treat'), None)
            
            if component:
                total_grams = component.daily_grams or 0
                total_kcal = component.daily_kcal or 0
                kcal_per_100g = component.kcal_per_100g or 0
                
                # Распределяем равномерно
                grams_per_meal = round_portion(total_grams / meals_per_day)
                kcal_per_meal = round(grams_per_meal * kcal_per_100g / 100)
                
                if plan.species == 'cat':
                    times = ['08:00', '14:00', '22:00', '02:00'][:meals_per_day]
                    labels = ['Утро', 'День', 'Вечер', 'Ночь'][:meals_per_day]
                else:
                    times = ['08:00', '13:00', '18:00', '22:00'][:meals_per_day]
                    labels = ['Завтрак', 'Обед', 'Ужин', 'Поздний перекус'][:meals_per_day]
                
                for i, (time, label) in enumerate(zip(times, labels)):
                    daily['meals'].append({
                        'time': time,
                        'label': label,
                        'type': 'wet',
                        'product': component.product_name,
                        'grams': grams_per_meal,
                        'kcal': kcal_per_meal,
                        'nutrition': get_nutrition_for_meal(component, grams_per_meal),
                    })
            
            # Лакомства
            if treat_component:
                daily['treats'] = {
                    'product': treat_component.product_name,
                    'daily_grams': treat_component.daily_grams,
                    'daily_kcal': round(treat_component.daily_kcal or 0),
                    'pieces_per_day': treat_component.pieces_per_day,
                    'note': 'Используйте для поощрения между кормлениями',
                    'nutrition': get_nutrition_for_meal(treat_component, treat_component.daily_grams or 0),
                }
            elif plan.calorie_distribution.get('treats', 0) > 0:
                daily['treats'] = {
                    'product': None,
                    'daily_grams': None,
                    'daily_kcal': round(plan.daily_calories * plan.calorie_distribution.get('treats', 0)),
                    'pieces_per_day': None,
                    'note': 'Лакомства допустимы, но конкретный продукт не подобран',
                }
            
            daily['feeding_tips'].append('Влажный корм скоропортящийся - убирайте остатки через 30 минут')
            
        else:
            # === ТОЛЬКО СУХОЙ КОРМ ===
            component = plan.components[0] if plan.components else None
            treat_component = next((c for c in plan.components if c.product_type == 'treat'), None)
            
            if component:
                total_grams = component.daily_grams or 0
                total_kcal = component.daily_kcal or 0
                kcal_per_100g = component.kcal_per_100g or 0
                
                grams_per_meal = round_portion(total_grams / meals_per_day)
                kcal_per_meal = round(grams_per_meal * kcal_per_100g / 100)
                
                if plan.species == 'cat':
                    times = ['08:00', '14:00', '22:00', '02:00'][:meals_per_day]
                    labels = ['Утро', 'День', 'Вечер', 'Ночь'][:meals_per_day]
                else:
                    times = ['08:00', '13:00', '18:00', '22:00'][:meals_per_day]
                    labels = ['Завтрак', 'Обед', 'Ужин', 'Поздний перекус'][:meals_per_day]
                
                for i, (time, label) in enumerate(zip(times, labels)):
                    daily['meals'].append({
                        'time': time,
                        'label': label,
                        'type': 'dry',
                        'product': component.product_name,
                        'grams': grams_per_meal,
                        'kcal': kcal_per_meal,
                        'nutrition': get_nutrition_for_meal(component, grams_per_meal),
                    })
            
            # Лакомства
            if treat_component:
                daily['treats'] = {
                    'product': treat_component.product_name,
                    'daily_grams': treat_component.daily_grams,
                    'daily_kcal': round(treat_component.daily_kcal or 0),
                    'pieces_per_day': treat_component.pieces_per_day,
                    'note': 'Используйте для поощрения между кормлениями',
                    'nutrition': get_nutrition_for_meal(treat_component, treat_component.daily_grams or 0),
                }
            elif plan.calorie_distribution.get('treats', 0) > 0:
                daily['treats'] = {
                    'product': None,
                    'daily_grams': None,
                    'daily_kcal': round(plan.daily_calories * plan.calorie_distribution.get('treats', 0)),
                    'pieces_per_day': None,
                    'note': 'Лакомства допустимы, но конкретный продукт не подобран',
                }
            
            daily['feeding_tips'].append('Всегда обеспечьте доступ к свежей воде')
        
        # === ДОБАВКИ (для продвинутого набора) ===
        for supplement in plan.supplements:
            daily['supplements'].append({
                'product': supplement.product_name,
                'dosage': supplement.dosage_text,
                'time': supplement.intake_time,
                'instructions': supplement.intake_instructions,
            })
        
        if plan.supplements:
            daily['feeding_tips'].append('Добавки лучше давать с едой для лучшего усвоения')

        if plan.has_gi_issues:
            daily['feeding_tips'].extend([
                'При проблемах с ЖКТ важен плавный режим кормления и стабильный состав',
                'Не меняйте корм резко, избегайте смешивания несовместимых диет',
            ])
        
        return daily
    
    def _build_active_day_plan(self, pet, plan: FeedingPlan, calorie_result) -> Dict[str, Any]:
        """
        Построить план питания для активного дня (+15% калорий).
        """
        calc = self._get_calorie_calculator()
        
        # Получаем активности питомца
        activities = []
        try:
            for activity in pet.pet_activities.all():
                activities.append({
                    'type': activity.activity_type,
                    'duration_minutes': activity.duration_minutes,
                })
        except Exception:
            pass
        
        if not activities:
            return None
        
        # Рассчитываем для активного дня
        active_result = calc.calculate_active_day_calories(pet, activities)
        
        extra_percent = round((active_result.mer / plan.daily_calories - 1) * 100)
        
        return {
            'total_kcal': round(active_result.mer, 0),
            'extra_kcal': round(active_result.mer - plan.daily_calories, 0),
            'extra_percent': extra_percent,
            'activities': activities,
            'note': f'Увеличьте порции на {extra_percent}% в дни тренировок'
        }
    
    def get_alternatives(
        self, 
        component: FoodComponent, 
        filters: FoodSearchFilters,
        limit: int = 10
    ) -> List[FoodComponent]:
        """
        Получить альтернативные продукты для компонента.
        
        ВАЖНО: Учитывает распределение калорий по типу питания и компонента!
        """
        from apps.shop.models import Product
        
        category_codes = {
            'dry_food': ['food.dry', 'food.semi_moist', 'food.holistic', 'food.hypoallergenic', 'food.diet'],
            'dry_food_multi': ['food.dry', 'food.semi_moist', 'food.holistic', 'food.hypoallergenic', 'food.diet'],
            'wet_food': ['food.wet', 'food.canned', 'food.pouches', 'food.pate'],
            'wet_food_multi': ['food.wet', 'food.canned', 'food.pouches', 'food.pate'],
            'treat': [],
            'supplement': [],
        }
        
        subcat = category_codes.get(component.product_type, ['food.dry'])
        product_type = component.product_type
        
        if product_type == 'treat':
            queryset = Product.objects.filter(
                product_group='treats',
                animal_type__in=[filters.species, 'all'],
                is_available=True,
                food_details__energy_kcal_per_100g__isnull=False,
                food_details__product_type='treat'
            ).exclude(id=component.product_id)
        elif product_type == 'supplement':
            queryset = Product.objects.filter(
                product_group='vitamins',
                animal_type__in=[filters.species, 'all'],
                is_available=True,
                food_details__product_type='supplement'
            ).exclude(id=component.product_id)
        else:
            queryset = Product.objects.filter(
                product_group='food',
                new_category__code__in=subcat,
                animal_type__in=[filters.species, 'all'],
                is_available=True,
                food_details__energy_kcal_per_100g__isnull=False,
                food_details__product_type='food'
            ).exclude(id=component.product_id)
        
        queryset = self._apply_age_filters(queryset, filters.species, filters.age_months)
        
        products = list(queryset[:30])
        alternatives = []
        
        # Определяем % калорий для этого типа компонента
        calorie_key = 'dry_food' if 'dry' in product_type else ('wet_food' if 'wet' in product_type else 'treats')
        calorie_percent = (filters.calorie_distribution or {}).get(calorie_key, 0.90)
        
        # Калории для этого компонента
        component_kcal = (filters.daily_calories or 0) * calorie_percent
        
        for product in products:
            score, reasons, warnings, badges = self._evaluate_product(product, filters)
            
            if score > 0:
                kcal_per_100g = self._get_product_kcal(product, product_type.split('_')[0])
                if not kcal_per_100g and product_type != 'supplement':
                    continue
                
                # Граммы с учётом распределения калорий, округление до 10г
                if component_kcal and kcal_per_100g:
                    raw_grams = (component_kcal / kcal_per_100g) * 100
                    daily_grams = round(raw_grams / 10) * 10  # Округляем до 10г
                else:
                    daily_grams = None
                
                weight_grams = self._get_product_weight_grams(product)
                
                # Расчёт упаковок с учётом периода
                if weight_grams and daily_grams and daily_grams > 0:
                    # Сколько дней хватит одной упаковки
                    single_package_days = int(weight_grams / daily_grams)
                    
                    max_acceptable_days = int(filters.period_days * 1.5)
                    if single_package_days > max_acceptable_days:
                        warnings.append(
                            f"Упаковка рассчитана на ~{single_package_days} дн., больше выбранного периода"
                        )
                        score = max(1, score - 10)
                    
                    # Нужно граммов на период
                    total_grams_needed = daily_grams * filters.period_days
                    
                    # Расчёт упаковок
                    packages_needed = max(1, math.ceil(total_grams_needed / weight_grams))
                    
                    # Итоговый запас
                    total_grams = weight_grams * packages_needed
                    days_supply = int(total_grams / daily_grams)
                    
                    # Бонус за оптимальный размер упаковки (±30% от периода)
                    if filters.period_days * 0.7 <= single_package_days <= filters.period_days * 1.3:
                        score += 15  # Бонус за идеальный размер
                else:
                    packages_needed = 1
                    days_supply = filters.period_days
                
                # Получаем данные БЖУ
                nutrition = self._get_nutrition_data(product)
                
                # Для лакомств добавляем pieces_per_day
                pieces_per_day = None
                if product_type == 'treat' and daily_grams:
                    pieces_per_day = max(1, round((daily_grams / 100) * self.TREAT_PIECES_PER_100G))
                
                alt = FoodComponent(
                    product_id=product.id,
                    product_name=product.name,
                    product_type=product_type,
                    match_score=score,
                    daily_grams=daily_grams,
                    daily_kcal=round(component_kcal) if component_kcal else None,
                    price=product.price,
                    weight_grams=weight_grams,
                    packages_needed=packages_needed,
                    days_supply=days_supply,
                    reasons=reasons,
                    warnings=warnings,
                    badges=badges,
                    # Расширенные поля
                    short_description=self._get_short_description(product),
                    image_url=getattr(product, 'image_url', None) or getattr(product, 'image', None),
                    shop_url=f"/shop/product/{product.id}",
                    kcal_per_100g=kcal_per_100g,
                    # БЖУ и минералы
                    **nutrition,
                    # Лакомства
                    pieces_per_day=pieces_per_day,
                )
                
                alternatives.append(alt)
        
        alternatives.sort(key=lambda x: (-x.match_score, float(x.price or 0)))
        return alternatives[:limit]
    
    def check_compatibility(self, components: List[FoodComponent]) -> List[str]:
        """
        Проверить совместимость компонентов рациона.
        
        Returns:
            Список предупреждений о несовместимости
        """
        warnings = []
        
        # Определяем группы компонентов
        groups = set()
        
        for component in components:
            name_lower = component.product_name.lower()
            
            for group_name, keywords in self.COMPATIBILITY_GROUPS.items():
                for keyword in keywords:
                    if keyword in name_lower:
                        groups.add(group_name)
                        break
        
        # Проверяем несовместимости
        therapeutic_groups = [g for g in groups if g.startswith('therapeutic_')]
        
        if len(therapeutic_groups) > 1:
            warnings.append(
                f"Внимание: смешивание лечебных кормов ({', '.join(therapeutic_groups)}) "
                "может снизить эффективность. Проконсультируйтесь с ветеринаром."
            )
        
        if 'hypoallergenic' in groups and 'regular' in groups:
            warnings.append(
                "Гипоаллергенный корм теряет эффективность при смешивании с обычным кормом."
            )
        
        return warnings
    
    def to_dict(self, plan: FeedingPlan) -> Dict[str, Any]:
        """
        Сериализация плана для API.
        """
        return {
            'pet_id': plan.pet_id,
            'pet_name': plan.pet_name,
            'daily_calories': round(plan.daily_calories, 0),
            'plan_type': plan.plan_type,
            'variant': plan.variant,
            'period_days': plan.period_days,
            'calorie_distribution': plan.calorie_distribution,
            'transition_plan': plan.transition_plan,
            'has_gi_issues': plan.has_gi_issues,
            'macro_targets': plan.macro_targets,
            'components': [
                {
                    'product_id': c.product_id,
                    'product_name': c.product_name,
                    'product_type': c.product_type,
                    'match_score': c.match_score,
                    'daily_grams': c.daily_grams,
                    'daily_kcal': c.daily_kcal,
                    'price': str(c.price) if c.price else None,
                    'weight_grams': c.weight_grams,
                    'days_supply': c.days_supply,
                    'packages_needed': c.packages_needed,
                    'reasons': c.reasons,
                    'warnings': c.warnings,
                    'badges': c.badges,
                    'alternatives_count': c.alternatives_count,
                    # Расширенные поля для UI
                    'short_description': c.short_description,
                    'image_url': str(c.image_url) if c.image_url else None,
                    'shop_url': c.shop_url,
                    'kcal_per_100g': c.kcal_per_100g,
                    # БЖУ и минералы
                    'nutrition': {
                        'protein': c.nutrition_protein,
                        'fat': c.nutrition_fat,
                        'fiber': c.nutrition_fiber,
                        'moisture': c.nutrition_moisture,
                        'ash': c.nutrition_ash,
                        'calcium': c.nutrition_calcium,
                        'phosphorus': c.nutrition_phosphorus,
                        'omega3': c.nutrition_omega3,
                        'omega6': c.nutrition_omega6,
                    },
                    # Специальные поля для лакомств
                    'pieces_per_day': c.pieces_per_day,
                    'piece_weight_grams': c.piece_weight_grams,
                    # Специальные поля для добавок
                    'dosage_text': c.dosage_text,
                    'intake_time': c.intake_time,
                    'intake_instructions': c.intake_instructions,
                }
                for c in plan.components
            ],
            'supplements': [
                {
                    'product_id': s.product_id,
                    'product_name': s.product_name,
                    'price': str(s.price) if s.price else None,
                    'weight_grams': s.weight_grams,
                    'days_supply': s.days_supply,
                    'packages_needed': s.packages_needed,
                    'reasons': s.reasons,
                    'badges': s.badges,
                    # Расширенные поля
                    'short_description': s.short_description,
                    'image_url': str(s.image_url) if s.image_url else None,
                    'shop_url': s.shop_url,
                    # Дозировка
                    'dosage_text': s.dosage_text,
                    'intake_time': s.intake_time,
                    'intake_instructions': s.intake_instructions,
                }
                for s in plan.supplements
            ],
            'total_cost': str(plan.total_cost),
            'cost_per_day': str(plan.cost_per_day),
            'regular_day': plan.regular_day,
            'active_day': plan.active_day,
            'warnings': plan.warnings,
            'recommendations': plan.recommendations,
        }


# Глобальный экземпляр
food_recommendation_service = FoodRecommendationService()
