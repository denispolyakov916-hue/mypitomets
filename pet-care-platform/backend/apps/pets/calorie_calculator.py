"""
Калькулятор калорийности питания для питомцев.

Реализует логику из документации calculation-nutrition.md:
1. RER (Resting Energy Requirement) — базовый метаболизм
2. MER (Maintenance Energy Requirement) — дневная потребность
3. Корректировки по возрасту, размеру, активности, здоровью

Формулы по AAFCO/NRC/FEDIAF стандартам:
- Собаки: RER = 70 × (вес_кг)^0.75
- Кошки: RER = 70 × (вес_кг)^0.67
- MER = RER × K_age × K_neutering × K_activity × K_size × K_coat × K_climate × K_health

Коэффициенты загружаются из таблицы nutrition_coefficients в БД.
"""

import logging
from typing import Optional, Dict, Any, List, Tuple
from decimal import Decimal
from dataclasses import dataclass, field
from functools import lru_cache

logger = logging.getLogger('apps.pets.calorie_calculator')


@dataclass
class CalorieResult:
    """
    Результат расчёта калорийности.
    """
    rer: float                         # Базовый метаболизм (ккал)
    mer: float                         # Дневная норма (ккал)
    coefficients_applied: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    
    # Детализация по приёмам пищи
    meals_per_day: int = 2
    calories_per_meal: float = 0
    
    # Рекомендуемое количество корма
    dry_food_grams: Optional[float] = None      # Сухой корм (350 ккал/100г)
    wet_food_grams: Optional[float] = None      # Влажный корм (85 ккал/100г)
    
    # Для мультипитания (60% сухой + 30% влажный + 10% лакомства)
    multi_dry_grams: Optional[float] = None
    multi_wet_grams: Optional[float] = None
    multi_treat_kcal: Optional[float] = None
    
    # Метаданные расчёта
    calculation_method: str = 'standard'
    data_completeness: int = 100
    
    def to_dict(self) -> Dict[str, Any]:
        """Сериализация для API."""
        return {
            'rer_kcal': round(self.rer, 1),
            'mer_kcal': round(self.mer, 1),
            'coefficients': self.coefficients_applied,
            'warnings': self.warnings,
            'recommendations': self.recommendations,
            'meals_per_day': self.meals_per_day,
            'calories_per_meal': round(self.calories_per_meal, 1),
            # Только сухой корм
            'dry_food_grams_per_day': round(self.dry_food_grams, 0) if self.dry_food_grams else None,
            # Только влажный корм
            'wet_food_grams_per_day': round(self.wet_food_grams, 0) if self.wet_food_grams else None,
            # Мультипитание (60/30/10)
            'multi_feeding': {
                'dry_grams': round(self.multi_dry_grams, 0) if self.multi_dry_grams else None,
                'wet_grams': round(self.multi_wet_grams, 0) if self.multi_wet_grams else None,
                'treat_kcal': round(self.multi_treat_kcal, 0) if self.multi_treat_kcal else None,
            },
            'calculation_method': self.calculation_method,
            'data_completeness': self.data_completeness,
        }


class CalorieCalculatorService:
    """
    Калькулятор калорийности питания для собак и кошек.
    
    Использует коэффициенты из таблицы nutrition_coefficients в БД.
    
    Использование:
        from apps.pets.calorie_calculator import calorie_calculator
        
        result = calorie_calculator.calculate_daily_calories(pet)
        print(f"Дневная норма: {result.mer} ккал")
    """
    
    # === КОНСТАНТЫ ===
    
    # Средняя калорийность кормов (ккал/100г)
    FOOD_CALORIE_DENSITY = {
        'dry': 350,        # Сухой корм
        'wet': 85,         # Влажный корм (паучи)
        'canned': 100,     # Консервы
        'holistic': 380,   # Холистик
        'diet': 300,       # Диетический
        'raw': 150,        # Натуральное питание (BARF)
        'homemade': 120,   # Домашняя еда
    }
    
    # Пропорции мультипитания (по ТЗ)
    MULTI_FEEDING_RATIO = {
        'dry': 0.60,       # 60% калорий из сухого
        'wet': 0.30,       # 30% калорий из влажного
        'treats': 0.10,    # 10% калорий из лакомств
    }
    
    # Fallback коэффициенты если БД недоступна (по NRC/FEDIAF 2021)
    # Это БАЗОВЫЕ коэффициенты MER/RER, не перемножаются с neutering!
    FALLBACK_K_AGE = {
        'dog': {
            'puppy_weaning': 3.0,    # 2-4 месяца
            'puppy_growing': 2.0,    # 4-12 месяцев
            'young_adult': 1.6,      # 12-36 месяцев (не используется, идёт K_neutering)
            'adult': 1.4,            # 36-84 месяца (не используется, идёт K_neutering)
            'senior': 1.2,           # 84-120 месяцев
            'geriatric': 1.0,        # 120+ месяцев
        },
        'cat': {
            'kitten_weaning': 2.5,   # 2-4 месяца
            'kitten_growing': 2.0,   # 4-6 месяцев
            'junior': 1.6,           # 6-12 месяцев
            'adult': 1.2,            # 12-84 месяца (не используется)
            'senior': 1.1,           # 84-132 месяца
            'geriatric': 1.0,        # 132+ месяцев
        },
    }
    
    FALLBACK_K_SIZE = {
        'toy': 1.30, 'small': 1.20, 'medium': 1.00, 'large': 0.90, 'giant': 0.80
    }
    
    FALLBACK_K_ACTIVITY = {
        'very_low': 1.0, 'low': 1.2, 'moderate': 1.4, 'high': 1.6, 'very_high': 2.0
    }
    
    # K_neutering - БАЗОВЫЙ коэффициент для взрослых (уже включает базу adult)
    FALLBACK_K_NEUTERING = {
        'dog': {'intact': 1.8, 'neutered': 1.6},
        'cat': {'intact': 1.4, 'neutered': 1.2},
    }
    
    def __init__(self):
        """Инициализация калькулятора."""
        self._coefficients_cache = {}
    
    @lru_cache(maxsize=128)
    def _get_coefficient_from_db(
        self, 
        species: str, 
        coefficient_type: str, 
        code_suffix: str
    ) -> Optional[Decimal]:
        """
        Получить коэффициент из БД с кэшированием.
        
        Args:
            species: dog/cat
            coefficient_type: size_category/age/activity_level/neutering/coat_type/climate/housing
            code_suffix: код без префикса вида (например 'toy', 'puppy_weaning')
            
        Returns:
            Decimal коэффициент или None
        """
        try:
            from .nutrition_models import NutritionCoefficient
            
            full_code = f"{species}_{code_suffix}"
            
            coef = NutritionCoefficient.objects.filter(
                species=species,
                coefficient_type=coefficient_type,
                code=full_code
            ).first()
            
            if coef:
                return coef.coefficient
                
        except Exception as e:
            logger.warning(f"Error getting coefficient from DB: {e}")
        
        return None
    
    def _get_all_coefficients_for_type(
        self, 
        species: str, 
        coefficient_type: str
    ) -> Dict[str, Decimal]:
        """
        Получить все коэффициенты определённого типа из БД.
        
        Returns:
            Dict {code_suffix: coefficient}
        """
        result = {}
        try:
            from .nutrition_models import NutritionCoefficient
            
            coefficients = NutritionCoefficient.objects.filter(
                species=species,
                coefficient_type=coefficient_type
            )
            
            prefix = f"{species}_"
            for coef in coefficients:
                # Убираем префикс вида из кода
                code_suffix = coef.code.replace(prefix, '') if coef.code.startswith(prefix) else coef.code
                result[code_suffix] = float(coef.coefficient)
                
        except Exception as e:
            logger.warning(f"Error getting coefficients from DB: {e}")
        
        return result
    
    def calculate_rer(self, weight_kg: float, species: str = 'dog') -> float:
        """
        Расчёт базового метаболизма (RER).
        
        Формула:
        - Собаки: RER = 70 × (вес_кг)^0.75
        - Кошки: RER = 70 × (вес_кг)^0.67
        
        Args:
            weight_kg: Вес животного в кг
            species: dog или cat
            
        Returns:
            RER в ккал/день
        """
        if weight_kg <= 0:
            raise ValueError("Вес должен быть положительным")
        
        if species == 'cat':
            return 70 * (weight_kg ** 0.67)
        else:
            return 70 * (weight_kg ** 0.75)
    
    def calculate_daily_calories(self, pet) -> CalorieResult:
        """
        Расчёт дневной нормы калорий для питомца.
        
        Формула: MER = RER × K_age × K_neutering × K_activity × K_size × K_coat × K_climate × K_health
        
        Args:
            pet: Объект Pet
            
        Returns:
            CalorieResult с полным расчётом
        """
        result = CalorieResult(rer=0, mer=0)
        
        # Проверка минимальных данных
        if not pet.weight:
            result.warnings.append("Вес питомца не указан — расчёт невозможен")
            result.calculation_method = 'failed'
            result.data_completeness = 0
            return result
        
        weight = float(pet.weight)
        species = pet.species or 'dog'
        
        # 1. Расчёт базового метаболизма (RER)
        result.rer = self.calculate_rer(weight, species)
        
        # 2. K_age — возрастной коэффициент
        k_age, age_reason = self._get_k_age(pet)
        result.coefficients_applied['k_age'] = {'value': k_age, 'reason': age_reason}
        
        # 3. K_neutering — кастрация
        k_neutering, neutering_reason = self._get_k_neutering(pet)
        result.coefficients_applied['k_neutering'] = {'value': k_neutering, 'reason': neutering_reason}
        
        # 4. K_activity — активность
        k_activity = self._get_k_activity(pet)
        result.coefficients_applied['k_activity'] = k_activity
        
        # 5. K_size — размер (только для собак)
        k_size = 1.0
        if species == 'dog':
            k_size = self._get_k_size(pet)
            result.coefficients_applied['k_size'] = k_size
        
        # 6. K_coat — тип шерсти
        k_coat = self._get_k_coat(pet)
        if k_coat != 1.0:
            result.coefficients_applied['k_coat'] = k_coat
        
        # 7. K_climate — климат
        k_climate = self._get_k_climate(pet)
        if k_climate != 1.0:
            result.coefficients_applied['k_climate'] = k_climate
        
        # 8. K_health — заболевания
        k_health, health_warnings = self._get_k_health(pet)
        result.coefficients_applied['k_health'] = k_health
        result.warnings.extend(health_warnings)
        
        # 9. K_reproductive — репродукция
        k_reproductive = self._get_k_reproductive(pet)
        if k_reproductive != 1.0:
            result.coefficients_applied['k_reproductive'] = k_reproductive
        
        # 10. Расчёт MER
        # ВАЖНО: K_age и K_neutering НЕ ПЕРЕМНОЖАЮТСЯ!
        # По стандартам NRC/FEDIAF это АЛЬТЕРНАТИВНЫЕ базовые коэффициенты:
        # - Для щенков/котят: используем K_age (2.0-3.0)
        # - Для взрослых: используем K_neutering (1.6/1.8)
        # - Для пожилых: используем K_age × K_neutering_modifier
        
        age_months = pet.age_months or 24
        species = pet.species or 'dog'
        
        if species == 'dog':
            if age_months < 12:
                # Щенок - используем K_age как основу (2.0-3.0)
                k_base = k_age
                result.coefficients_applied['k_base_source'] = 'age (puppy)'
            elif age_months >= 84:
                # Пожилой - K_age (1.0-1.2), но умножаем на коэффициент стерилизации
                # относительно базы 1.8 для интактных
                neuter_factor = k_neutering / 1.8
                k_base = k_age * neuter_factor
                result.coefficients_applied['k_base_source'] = 'age (senior) + neuter_factor'
            else:
                # Взрослый (12+ мес) - используем K_neutering как основу (1.6/1.8)
                k_base = k_neutering
                result.coefficients_applied['k_base_source'] = 'neutering (adult)'
        else:  # cat
            if age_months < 12:
                # Котёнок/юниор - K_age как основа (1.6-2.5)
                k_base = k_age
                result.coefficients_applied['k_base_source'] = 'age (kitten/junior)'
            elif age_months >= 84:
                # Пожилая кошка - K_age с учётом стерилизации
                neuter_factor = k_neutering / 1.4
                k_base = k_age * neuter_factor
                result.coefficients_applied['k_base_source'] = 'age (senior) + neuter_factor'
            else:
                # Взрослая кошка - K_neutering (1.2/1.4)
                k_base = k_neutering
                result.coefficients_applied['k_base_source'] = 'neutering (adult)'
        
        # K_activity для взрослых - это МОДИФИКАТОР относительно базы
        # Нормализуем: собаки moderate=1.4, кошки moderate=1.2
        base_activity = 1.4 if species == 'dog' else 1.2
        k_activity_modifier = k_activity / base_activity if age_months >= 12 else 1.0
        
        # K_size для щенков/котят не применяется (уже учтён в K_age)
        k_size_applied = k_size if age_months >= 12 else 1.0
        
        # MER = RER × K_base × модификаторы
        mer = result.rer * k_base * k_activity_modifier * k_size_applied * k_coat * k_climate * k_health * k_reproductive
        result.mer = round(mer, 1)
        
        result.coefficients_applied['k_base'] = round(k_base, 3)
        result.coefficients_applied['k_activity_modifier'] = round(k_activity_modifier, 3)
        if k_size_applied != 1.0:
            result.coefficients_applied['k_size_applied'] = round(k_size_applied, 3)
        
        # 11. Рекомендации по кормлению
        result.meals_per_day = self._get_meals_per_day(pet)
        result.calories_per_meal = result.mer / result.meals_per_day
        
        # 12. Перевод в граммы корма
        dry_kcal = self.FOOD_CALORIE_DENSITY['dry']
        wet_kcal = self.FOOD_CALORIE_DENSITY['wet']
        
        # Только сухой корм
        result.dry_food_grams = (result.mer / dry_kcal) * 100
        
        # Только влажный корм
        result.wet_food_grams = (result.mer / wet_kcal) * 100
        
        # Мультипитание (60/30/10)
        result.multi_dry_grams = (result.mer * 0.60 / dry_kcal) * 100
        result.multi_wet_grams = (result.mer * 0.30 / wet_kcal) * 100
        result.multi_treat_kcal = result.mer * 0.10
        
        # 13. Оценка полноты данных и рекомендации
        result.data_completeness = self._calculate_data_completeness(pet)
        result.recommendations = self._generate_recommendations(pet, result)
        
        return result
    
    def _get_k_age(self, pet) -> Tuple[float, str]:
        """
        Возрастной коэффициент из БД.
        """
        species = pet.species or 'dog'
        age_months = pet.age_months or 24
        
        # Получаем все возрастные коэффициенты
        age_coefficients = self._get_all_coefficients_for_type(species, 'age')
        
        if age_coefficients:
            # Ищем подходящий по возрасту
            try:
                from .nutrition_models import NutritionCoefficient
                
                coef = NutritionCoefficient.objects.filter(
                    species=species,
                    coefficient_type='age',
                    age_from_months__lte=age_months,
                    age_to_months__gt=age_months
                ).first()
                
                if coef:
                    return float(coef.coefficient), coef.name_ru
                    
            except Exception as e:
                logger.warning(f"Error getting age coefficient: {e}")
        
        # Fallback по возрастным группам (NRC/FEDIAF)
        if species == 'dog':
            if age_months < 4:
                return self.FALLBACK_K_AGE['dog']['puppy_weaning'], 'Щенок (отъём)'
            elif age_months < 12:
                return self.FALLBACK_K_AGE['dog']['puppy_growing'], 'Щенок (рост)'
            elif age_months < 36:
                return self.FALLBACK_K_AGE['dog']['young_adult'], 'Молодой взрослый'
            elif age_months < 84:
                return self.FALLBACK_K_AGE['dog']['adult'], 'Взрослый'
            elif age_months < 120:
                return self.FALLBACK_K_AGE['dog']['senior'], 'Пожилой'
            else:
                return self.FALLBACK_K_AGE['dog']['geriatric'], 'Старый'
        else:
            if age_months < 4:
                return self.FALLBACK_K_AGE['cat']['kitten_weaning'], 'Котёнок (отъём)'
            elif age_months < 6:
                return self.FALLBACK_K_AGE['cat']['kitten_growing'], 'Котёнок (рост)'
            elif age_months < 12:
                return self.FALLBACK_K_AGE['cat']['junior'], 'Юниор'
            elif age_months < 84:
                return self.FALLBACK_K_AGE['cat']['adult'], 'Взрослый'
            elif age_months < 132:
                return self.FALLBACK_K_AGE['cat']['senior'], 'Пожилой'
            else:
                return self.FALLBACK_K_AGE['cat']['geriatric'], 'Старый'
    
    def _get_k_neutering(self, pet) -> Tuple[float, str]:
        """
        Коэффициент кастрации из БД.
        """
        species = pet.species or 'dog'
        is_neutered = pet.is_neutered
        
        code_suffix = 'neutered' if is_neutered else 'intact'
        
        # Пробуем получить из БД
        coef = self._get_coefficient_from_db(species, 'neutering', code_suffix)
        
        if coef:
            reason = 'Кастрирован' if is_neutered else 'Не кастрирован'
            return float(coef), reason
        
        # Fallback
        fallback = self.FALLBACK_K_NEUTERING.get(species, self.FALLBACK_K_NEUTERING['dog'])
        reason = 'Кастрирован' if is_neutered else 'Не кастрирован'
        return fallback[code_suffix], reason
    
    def _get_k_activity(self, pet) -> float:
        """
        Коэффициент активности из БД.
        """
        species = pet.species or 'dog'
        activity = pet.activity_level or 'moderate'
        
        # Пробуем получить из БД
        coef = self._get_coefficient_from_db(species, 'activity_level', activity)
        
        if coef:
            return float(coef)
        
        # Fallback
        return self.FALLBACK_K_ACTIVITY.get(activity, 1.4)
    
    def _get_k_size(self, pet) -> float:
        """
        Коэффициент размера (только для собак) из БД.
        """
        if pet.species != 'dog':
            return 1.0
        
        size_category = getattr(pet, 'size_category', None) or self._calculate_size_category(pet)
        
        if not size_category:
            return 1.0
        
        # Пробуем получить из БД
        coef = self._get_coefficient_from_db('dog', 'size_category', size_category)
        
        if coef:
            return float(coef)
        
        # Fallback
        return self.FALLBACK_K_SIZE.get(size_category, 1.0)
    
    def _calculate_size_category(self, pet) -> Optional[str]:
        """
        Рассчитать категорию размера по весу.
        """
        if not pet.weight:
            return None
        
        weight = float(pet.weight)
        
        if weight < 5:
            return 'toy'
        elif weight < 10:
            return 'small'
        elif weight < 25:
            return 'medium'
        elif weight < 45:
            return 'large'
        else:
            return 'giant'
    
    def _get_k_coat(self, pet) -> float:
        """
        Коэффициент типа шерсти из БД.
        """
        species = pet.species or 'dog'
        coat_type = getattr(pet, 'coat_type', None)
        
        if not coat_type:
            return 1.0
        
        # Пробуем получить из БД
        coef = self._get_coefficient_from_db(species, 'coat_type', coat_type)
        
        if coef:
            return float(coef)
        
        return 1.0
    
    def _get_k_climate(self, pet) -> float:
        """
        Коэффициент климата из БД.
        """
        species = pet.species or 'dog'
        climate = getattr(pet, 'living_climate', None)
        
        if not climate:
            return 1.0
        
        # Пробуем получить из БД
        coef = self._get_coefficient_from_db(species, 'climate', climate)
        
        if coef:
            return float(coef)
        
        return 1.0
    
    def _get_k_health(self, pet) -> Tuple[float, List[str]]:
        """
        Коэффициент при заболеваниях.
        
        Загружает заболевания из M2M таблицы PetHealthCondition.
        Применяет логику приоритетности из HealthCondition.
        """
        k_health = 1.0
        warnings = []
        
        # Получаем заболевания из M2M
        try:
            from .nutrition_models import PetHealthCondition, HealthCondition
            
            conditions = PetHealthCondition.objects.filter(
                pet=pet, 
                is_active=True
            ).select_related('condition')
            
            if conditions:
                # Сортируем по приоритету
                priority_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
                sorted_conditions = sorted(
                    conditions,
                    key=lambda c: priority_order.get(c.condition.priority, 3)
                )
                
                for pet_condition in sorted_conditions:
                    condition = pet_condition.condition
                    
                    # Берём средний коэффициент
                    coef = float(condition.coefficient_min + condition.coefficient_max) / 2
                    
                    # Применяем направление
                    if condition.direction == 'DECREASE':
                        k_health *= coef  # Уже < 1
                    elif condition.direction == 'INCREASE':
                        k_health *= coef  # Уже > 1
                    
                    # Добавляем предупреждение если критическое
                    if condition.priority in ['CRITICAL', 'HIGH']:
                        warnings.append(
                            f"Учтено заболевание: {condition.name_ru} (коэф. {coef})"
                        )
                        
        except Exception as e:
            logger.warning(f"Error loading health conditions: {e}")
        
        # Проверяем BCS (Body Condition Score)
        bcs = getattr(pet, 'body_condition_score', None)
        if bcs:
            try:
                bcs_int = int(bcs)
                if bcs_int >= 8:  # Ожирение 2-3 степени
                    k_health *= 0.70
                    warnings.append("BCS 8-9: рекомендуется программа похудения")
                elif bcs_int >= 7:  # Ожирение 1 степени
                    k_health *= 0.85
                    warnings.append("BCS 7: рекомендуется снижение калорий")
                elif bcs_int <= 3:  # Недобор веса
                    k_health *= 1.25
                    warnings.append("BCS 1-3: рекомендуется увеличение калорий")
            except (ValueError, TypeError):
                pass
        
        return round(k_health, 2), warnings
    
    def _get_k_reproductive(self, pet) -> float:
        """
        Коэффициент репродуктивного состояния из БД.
        """
        if pet.is_neutered:
            return 1.0
        
        sex = getattr(pet, 'sex', None)
        if sex != 'female':
            return 1.0
        
        state = getattr(pet, 'reproductive_state', None)
        if not state or state == 'none':
            return 1.0
        
        species = pet.species or 'dog'
        
        # Формируем код для поиска
        if state == 'heat':
            code_suffix = 'heat'
        elif state == 'pregnant':
            week = getattr(pet, 'pregnancy_week', 5) or 5
            if week <= 4:
                code_suffix = 'pregnant_early'
            else:
                code_suffix = 'pregnant_late'
        elif state == 'lactating':
            litter = getattr(pet, 'litter_size', 3) or 3
            if litter <= 2:
                code_suffix = 'lactating_small'
            elif litter <= 4:
                code_suffix = 'lactating_medium'
            else:
                code_suffix = 'lactating_large'
        else:
            return 1.0
        
        # Пробуем получить из БД
        coef = self._get_coefficient_from_db(species, 'reproductive', code_suffix)
        
        if coef:
            return float(coef)
        
        # Fallback значения
        fallback = {
            'heat': 1.10,
            'pregnant_early': 1.25,
            'pregnant_late': 1.50,
            'lactating_small': 2.00,
            'lactating_medium': 2.50,
            'lactating_large': 3.00,
        }
        return fallback.get(code_suffix, 1.0)
    
    def _get_meals_per_day(self, pet) -> int:
        """
        Рекомендуемое количество кормлений в день.
        """
        age_months = pet.age_months or 24
        species = pet.species or 'dog'
        
        # Проверяем заболевания ЖКТ
        has_gi_issues = False
        try:
            from .nutrition_models import PetHealthCondition
            has_gi_issues = PetHealthCondition.objects.filter(
                pet=pet,
                is_active=True,
                condition__category='gastrointestinal'
            ).exists()
        except Exception:
            pass
        
        if has_gi_issues:
            return 4  # Частое дробное питание при проблемах с ЖКТ
        
        if species == 'dog':
            if age_months < 4:
                return 4  # Щенки 0-4 мес
            elif age_months < 12:
                return 3  # Щенки 4-12 мес
            else:
                return 2  # Взрослые
        else:  # cat
            if age_months < 6:
                return 4  # Котята
            else:
                return 3  # Кошки предпочитают частые небольшие порции
    
    def _calculate_data_completeness(self, pet) -> int:
        """
        Расчёт полноты данных для калькулятора.
        """
        required_fields = [
            pet.weight,
            pet.species,
        ]
        
        optional_fields = [
            pet.date_of_birth,
            pet.is_neutered is not None,
            getattr(pet, 'size_category', None),
            pet.activity_level,
            getattr(pet, 'body_condition_score', None),
            getattr(pet, 'reproductive_state', None),
            getattr(pet, 'coat_type', None),
        ]
        
        required_filled = sum(1 for f in required_fields if f)
        optional_filled = sum(1 for f in optional_fields if f)
        
        # 60% за обязательные, 40% за опциональные
        completeness = (required_filled / len(required_fields)) * 60
        completeness += (optional_filled / len(optional_fields)) * 40
        
        return min(100, int(completeness))
    
    def _generate_recommendations(self, pet, result: CalorieResult) -> List[str]:
        """
        Генерация рекомендаций по кормлению.
        """
        recommendations = []
        
        # По данным
        if result.data_completeness < 70:
            recommendations.append(
                "Заполните больше данных о питомце для более точного расчёта"
            )
        
        # По BCS
        bcs = getattr(pet, 'body_condition_score', None)
        if bcs:
            try:
                bcs_int = int(bcs)
                if bcs_int >= 7:
                    recommendations.append(
                        "Рекомендуется диетический корм для снижения веса"
                    )
                elif bcs_int <= 3:
                    recommendations.append(
                        "Рекомендуется высококалорийный корм для набора веса"
                    )
            except (ValueError, TypeError):
                pass
        
        # По возрасту
        age_category = getattr(pet, 'age_category', None)
        if age_category == 'senior':
            recommendations.append(
                "Для пожилого питомца рекомендуются корма с пониженным содержанием фосфора"
            )
        elif age_category in ['puppy', 'kitten']:
            recommendations.append(
                "Молодому питомцу важно получать достаточно белка для роста"
            )
        
        # По активности
        if pet.activity_level == 'very_high':
            recommendations.append(
                "При высокой активности важно обеспечить достаточно белка и жиров"
            )
        
        # По размеру (для собак)
        size_category = getattr(pet, 'size_category', None)
        if pet.species == 'dog' and size_category == 'giant':
            recommendations.append(
                "Для гигантских пород важны корма с хондропротекторами для суставов"
            )
        
        return recommendations
    
    def calculate_feeding_plan(
        self, 
        pet, 
        food_type: str = 'dry',
        food_calorie_density: float = None,
        days: int = 7
    ) -> Dict[str, Any]:
        """
        Генерация плана кормления на несколько дней.
        
        Args:
            pet: Объект Pet
            food_type: Тип корма (dry/wet/multi)
            food_calorie_density: Калорийность корма (ккал/100г), если известна
            days: Количество дней
            
        Returns:
            Dict с планом кормления
        """
        result = self.calculate_daily_calories(pet)
        
        if result.calculation_method == 'failed':
            return {
                'error': 'Не удалось рассчитать калорийность',
                'warnings': result.warnings
            }
        
        # Определяем калорийность
        if food_calorie_density is None:
            food_calorie_density = self.FOOD_CALORIE_DENSITY.get(food_type, 350)
        
        # Рассчитываем граммы в день
        if food_type == 'multi':
            plan_type = 'multi_feeding'
            daily_dry = result.multi_dry_grams
            daily_wet = result.multi_wet_grams
            daily_treat_kcal = result.multi_treat_kcal
        elif food_type == 'wet':
            plan_type = 'wet_only'
            daily_grams = result.wet_food_grams
        else:
            plan_type = 'dry_only'
            daily_grams = result.dry_food_grams
        
        # Формируем план
        plan = {
            'pet_name': pet.name,
            'daily_calories': result.mer,
            'meals_per_day': result.meals_per_day,
            'plan_type': plan_type,
            'days': [],
            'total_needed': {},
            'recommendations': result.recommendations,
        }
        
        for day in range(1, days + 1):
            day_plan = {
                'day': day,
                'meals': []
            }
            
            if food_type == 'multi':
                # Мультипитание: утром сухой, вечером влажный, лакомства в течение дня
                meals_count = result.meals_per_day
                dry_per_meal = daily_dry / max(1, meals_count - 1) if meals_count > 1 else daily_dry
                
                for meal in range(1, meals_count + 1):
                    if meal == meals_count:  # Последний приём - влажный
                        day_plan['meals'].append({
                            'meal_number': meal,
                            'type': 'wet',
                            'grams': round(daily_wet, 0),
                            'time_suggestion': '18:00-20:00'
                        })
                    else:
                        day_plan['meals'].append({
                            'meal_number': meal,
                            'type': 'dry',
                            'grams': round(dry_per_meal, 0),
                            'time_suggestion': '08:00-10:00' if meal == 1 else '13:00-15:00'
                        })
                
                day_plan['treats_kcal_limit'] = round(daily_treat_kcal, 0)
            else:
                grams_per_meal = daily_grams / result.meals_per_day
                for meal in range(1, result.meals_per_day + 1):
                    day_plan['meals'].append({
                        'meal_number': meal,
                        'type': food_type,
                        'grams': round(grams_per_meal, 0),
                    })
            
            plan['days'].append(day_plan)
        
        # Общее количество на период
        if food_type == 'multi':
            plan['total_needed'] = {
                'dry_grams': round(daily_dry * days * 1.15, 0),  # +15% запас
                'wet_grams': round(daily_wet * days * 1.15, 0),
                'treats_kcal': round(daily_treat_kcal * days, 0),
            }
        else:
            total_grams = daily_grams * days * 1.15  # +15% запас
            plan['total_needed'] = {
                f'{food_type}_grams': round(total_grams, 0),
            }
        
        return plan
    
    def calculate_active_day_calories(
        self,
        pet,
        activities: List[Dict[str, Any]]
    ) -> CalorieResult:
        """
        Расчёт калорий для активного дня с учётом тренировок.
        
        Args:
            pet: Объект Pet
            activities: Список активностей [{'type': 'running', 'duration_minutes': 30}, ...]
            
        Returns:
            CalorieResult с увеличенной калорийностью
        """
        # Базовый расчёт
        result = self.calculate_daily_calories(pet)
        
        if result.calculation_method == 'failed':
            return result
        
        # Дополнительные калории за активности
        extra_kcal = 0
        activity_details = []
        
        # Калории за минуту активности (приблизительно, на кг веса)
        activity_kcal_per_minute_per_kg = {
            'walking': 0.5,
            'running': 1.2,
            'swimming': 1.5,
            'playing': 0.8,
            'training': 0.6,
            'agility': 1.3,
            'hiking': 1.0,
        }
        
        weight = float(pet.weight) if pet.weight else 10
        
        for activity in activities:
            activity_type = activity.get('type', 'walking')
            duration = activity.get('duration_minutes', 30)
            
            kcal_rate = activity_kcal_per_minute_per_kg.get(activity_type, 0.5)
            kcal = kcal_rate * weight * duration
            extra_kcal += kcal
            
            activity_details.append({
                'type': activity_type,
                'duration_minutes': duration,
                'extra_kcal': round(kcal, 0)
            })
        
        # Обновляем результат
        result.mer += extra_kcal
        result.calories_per_meal = result.mer / result.meals_per_day
        
        # Пересчитываем граммы
        dry_kcal = self.FOOD_CALORIE_DENSITY['dry']
        wet_kcal = self.FOOD_CALORIE_DENSITY['wet']
        
        result.dry_food_grams = (result.mer / dry_kcal) * 100
        result.wet_food_grams = (result.mer / wet_kcal) * 100
        result.multi_dry_grams = (result.mer * 0.60 / dry_kcal) * 100
        result.multi_wet_grams = (result.mer * 0.30 / wet_kcal) * 100
        result.multi_treat_kcal = result.mer * 0.10
        
        result.coefficients_applied['extra_activities'] = {
            'total_extra_kcal': round(extra_kcal, 0),
            'activities': activity_details
        }
        
        result.calculation_method = 'active_day'
        
        return result


# Глобальный экземпляр калькулятора
calorie_calculator = CalorieCalculatorService()
