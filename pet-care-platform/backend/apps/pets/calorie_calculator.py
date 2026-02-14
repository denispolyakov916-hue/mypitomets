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

@dataclass(frozen=True)
class Modifier:
    """
    Модификатор расчёта MER.
    Нужен для объяснимого комбинирования факторов (болезни/BCS и т.д.).
    """
    kind: str  # disease | life_stage | reproductive | neutering | lifestyle | bcs | other
    priority: int  # чем меньше, тем важнее
    multiplier: float
    reason: str


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
    treat_kcal_per_day: Optional[float] = None
    
    # Целевые диапазоны БЖУ (в %)
    macro_targets: Optional[Dict[str, Dict[str, float]]] = None
    macro_targets_dm: Optional[Dict[str, Dict[str, float]]] = None
    macro_coverage_rules: Optional[Dict[str, Any]] = None

    # Топ-влияния на результат (для объяснимости)
    top_influences: List[Dict[str, Any]] = field(default_factory=list)
    
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
            'treat_kcal_per_day': round(self.treat_kcal_per_day, 0) if self.treat_kcal_per_day else None,
            'macro_targets': self.macro_targets,
            'macro_targets_dm': self.macro_targets_dm,
            'macro_coverage_rules': self.macro_coverage_rules,
            'top_influences': self.top_influences,
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

    def _get_factor_rules(self, species: str) -> Dict[str, Dict[str, Optional[float]]]:
        """
        Правила ограниченных корректировок (priority+caps).
        Возвращает словарь {factor_key: {priority, max_delta_pct}}.
        """
        rules = {
            'activity': {'priority': 2, 'max_delta_pct': 15.0},
            'neutering': {'priority': 2, 'max_delta_pct': 10.0},
            'size': {'priority': 2, 'max_delta_pct': 10.0},
            'coat': {'priority': 2, 'max_delta_pct': 5.0},
            'climate': {'priority': 2, 'max_delta_pct': 10.0},
            'housing': {'priority': 2, 'max_delta_pct': 10.0},
            'bcs': {'priority': 1, 'max_delta_pct': None},
            'critical_disease': {'priority': 1, 'max_delta_pct': None},
            'base_disease': {'priority': 0, 'max_delta_pct': None},
            'base_reproductive': {'priority': 0, 'max_delta_pct': None},
            'base_growth': {'priority': 0, 'max_delta_pct': None},
            'base_age': {'priority': 0, 'max_delta_pct': None},
        }
        try:
            from .nutrition_models import NutritionFactorRule

            rows = NutritionFactorRule.objects.filter(
                is_active=True,
                scope__in=[species, 'both']
            )
            for row in rows:
                rules[row.factor_key] = {
                    'priority': int(row.priority),
                    'max_delta_pct': float(row.max_delta_pct) if row.max_delta_pct is not None else None,
                }
        except Exception as e:
            logger.warning(f"Error loading factor rules: {e}")
        return rules

    def _get_cap_rules(self, species: str) -> Dict[str, Tuple[float, float]]:
        """
        Правила caps по MER/RER. Возвращает {context_key: (min, max)}.
        """
        rules = {
            'bcs_obese_8_9': (0.60, 0.80),
            'bcs_overweight_7': (0.80, 1.00),
            'bcs_underweight': (1.30, 2.20),
            'critical_disease': (1.00, 1.20),
        }
        try:
            from .nutrition_models import NutritionCapRule

            rows = NutritionCapRule.objects.filter(
                is_active=True,
                scope__in=[species, 'both']
            )
            for row in rows:
                rules[row.context_key] = (float(row.min_mer_rer), float(row.max_mer_rer))
        except Exception as e:
            logger.warning(f"Error loading cap rules: {e}")
        return rules

    def _apply_limited_modifier(
        self,
        mer: float,
        raw_multiplier: float,
        factor_key: str,
        factor_rules: Dict[str, Dict[str, Optional[float]]],
        result: CalorieResult,
        influences: List[Dict[str, Any]],
        reason: str
    ) -> float:
        if raw_multiplier == 1.0:
            return mer
        max_delta_pct = factor_rules.get(factor_key, {}).get('max_delta_pct')
        delta = raw_multiplier - 1.0
        capped_delta = delta
        if max_delta_pct is not None:
            cap = float(max_delta_pct) / 100.0
            capped_delta = max(min(delta, cap), -cap)
            if capped_delta != delta:
                result.warnings.append(
                    f"{factor_key}: ограничение коррекции до ±{float(max_delta_pct)}%"
                )
        applied_multiplier = 1.0 + capped_delta
        mer_after = mer * applied_multiplier
        influences.append({
            'key': factor_key,
            'reason': reason,
            'multiplier': round(applied_multiplier, 3),
            'impact_kcal': round(mer_after - mer, 1),
        })
        result.coefficients_applied.setdefault('secondary_adjustments', []).append({
            'key': factor_key,
            'raw_multiplier': round(raw_multiplier, 3),
            'applied_multiplier': round(applied_multiplier, 3),
            'max_delta_pct': max_delta_pct,
            'reason': reason,
        })
        return mer_after
    
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
        
        # Практика вет-калькуляторов (WSAVA/PNA/Tufts): 70 × (BWkg)^0.75 для собак и кошек.
        # Отклонения по индивидуальному метаболизму далее учитываются коэффициентами/BCS/кейсами.
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
        bcs = getattr(pet, 'body_condition_score', None)

        # Для программ снижения веса в клинической практике часто используют RER от целевого веса.
        # Используем ideal_weight_kg если он задан и BCS>=7 (безопасно: только если ideal < текущего и >0).
        weight_for_rer = weight
        try:
            if bcs is not None and int(bcs) >= 7:
                ideal = getattr(pet, 'ideal_weight_kg', None)
                if ideal:
                    ideal_w = float(ideal)
                    if 0 < ideal_w < weight:
                        weight_for_rer = ideal_w
                        result.coefficients_applied['rer_weight_kg'] = weight_for_rer
                        result.warnings.append(
                            f"BCS {int(bcs)}: RER рассчитан от целевого веса {weight_for_rer} кг (вместо {weight} кг)"
                        )
        except Exception:
            pass
        
        # 1. Расчёт базового метаболизма (RER)
        result.rer = self.calculate_rer(weight_for_rer, species)
        result.coefficients_applied['rer_formula'] = '70*(kg^0.75)'
        
        # 2. K_age — возрастной коэффициент
        k_age, age_reason = self._get_k_age(pet)
        result.coefficients_applied['k_age'] = {'value': k_age, 'reason': age_reason}

        # 3. K_neutering — кастрация
        k_neutering, neutering_reason = self._get_k_neutering(pet)
        result.coefficients_applied['k_neutering'] = {'value': k_neutering, 'reason': neutering_reason}

        # 4. K_activity — активность
        k_activity, activity_meta = self._get_k_activity(pet)
        result.coefficients_applied['k_activity'] = activity_meta
        if activity_meta.get('source') == 'base':
            result.warnings.append(activity_meta.get('warning') or "Коэффициент активности не найден в БД — использована базовая норма")

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

        # 8. K_health — заболевания (только как базовый фактор)
        k_health, health_warnings, health_modifiers, health_priority = self._get_k_health(pet)
        result.coefficients_applied['k_health'] = k_health
        if health_modifiers:
            result.coefficients_applied['health_modifiers'] = [
                {
                    'kind': m.kind,
                    'priority': m.priority,
                    'multiplier': m.multiplier,
                    'reason': m.reason,
                }
                for m in health_modifiers
            ]
        result.warnings.extend(health_warnings)

        # 9. K_reproductive — репродукция
        k_reproductive = self._get_k_reproductive(pet)
        if k_reproductive != 1.0:
            result.coefficients_applied['k_reproductive'] = k_reproductive

        # 10. Priority+caps модель
        age_months = pet.age_months or 24
        species = pet.species or 'dog'
        pet_age_category = getattr(pet, 'age_category', None)
        is_senior = bool(pet_age_category == 'senior') if pet_age_category is not None else (age_months >= 84)

        factor_rules = self._get_factor_rules(species)
        cap_rules = self._get_cap_rules(species)
        influences: List[Dict[str, Any]] = []

        base_factor = 1.0
        base_source = 'age'
        base_includes_neuter = False

        if health_modifiers:
            base_factor = k_health
            base_source = 'disease'
        elif k_reproductive != 1.0:
            base_factor = k_reproductive
            base_source = 'reproductive'
        elif age_months < 12:
            base_factor = k_age
            base_source = 'growth'
        else:
            if is_senior:
                if species == 'dog':
                    neuter_base = 1.6 if getattr(pet, 'is_neutered', False) else 1.8
                    neuter_factor = neuter_base / 1.8
                else:
                    neuter_base = 1.2 if getattr(pet, 'is_neutered', False) else 1.4
                    neuter_factor = neuter_base / 1.4
                base_factor = k_age * neuter_factor
                base_source = 'age'
                base_includes_neuter = True
                result.coefficients_applied['neuter_factor_source'] = 'standard'
            else:
                base_factor = k_neutering
                base_source = 'neutering (adult)'
                base_includes_neuter = True

        result.coefficients_applied['k_base_source'] = base_source
        result.coefficients_applied['k_base'] = round(base_factor, 3)
        influences.append({
            'key': 'base',
            'reason': base_source,
            'multiplier': round(base_factor, 3),
            'impact_kcal': round((result.rer * base_factor) - result.rer, 1),
        })

        # Caps по контекстам (BCS + critical disease)
        caps_applied = []
        min_ratio, max_ratio = 0.0, 999.0
        try:
            bcs_int = int(bcs) if bcs is not None else None
        except Exception:
            bcs_int = None

        contexts = []
        if bcs_int is not None:
            if age_months < 12:
                if bcs_int >= 8:
                    contexts.append('growth_bcs_obese_8_9')
                    result.warnings.append("BCS 8-9 (рост): ограничение без агрессивного дефицита")
                elif bcs_int == 7:
                    contexts.append('growth_bcs_overweight_7')
                    result.warnings.append("BCS 7 (рост): мягкое ограничение")
                elif bcs_int <= 3:
                    contexts.append('bcs_underweight')
                    result.warnings.append("BCS 1-3: рекомендуется увеличение калорий")
            else:
                if bcs_int >= 8:
                    contexts.append('bcs_obese_8_9')
                    result.warnings.append("BCS 8-9: рекомендуется программа снижения веса")
                elif bcs_int == 7:
                    contexts.append('bcs_overweight_7')
                    result.warnings.append("BCS 7: рекомендуется умеренное снижение калорий")
                elif bcs_int <= 3:
                    contexts.append('bcs_underweight')
                    result.warnings.append("BCS 1-3: рекомендуется увеличение калорий")
        if (health_priority or '').upper() in ['CRITICAL', 'HIGH']:
            contexts.append('critical_disease')
            result.warnings.append("Критическое заболевание: старт от 1.0×RER с узким коридором")

        for ctx in contexts:
            if ctx in cap_rules:
                caps_applied.append(ctx)
                min_ratio = max(min_ratio, cap_rules[ctx][0])
                max_ratio = min(max_ratio, cap_rules[ctx][1])

        capped_base = base_factor
        if caps_applied:
            if capped_base < min_ratio:
                capped_base = min_ratio
                result.warnings.append(f"MER/RER ниже порога ({round(base_factor, 2)}), применён min {min_ratio}")
            if capped_base > max_ratio:
                capped_base = max_ratio
                result.warnings.append(f"MER/RER выше порога ({round(base_factor, 2)}), применён max {max_ratio}")
            influences.append({
                'key': 'caps',
                'reason': ', '.join(caps_applied),
                'multiplier': round(capped_base / base_factor, 3) if base_factor else 1.0,
                'impact_kcal': round((result.rer * capped_base) - (result.rer * base_factor), 1),
            })
        result.coefficients_applied['caps_applied'] = caps_applied

        mer = result.rer * capped_base

        # Secondary adjustments (ограниченные)
        base_activity = 1.4 if species == 'dog' else 1.2
        if age_months >= 12:
            activity_raw = k_activity / base_activity
            mer = self._apply_limited_modifier(
                mer,
                activity_raw,
                'activity',
                factor_rules,
                result,
                influences,
                reason=activity_meta.get('activity_level') or 'activity'
            )

        if species == 'dog' and age_months >= 12:
            mer = self._apply_limited_modifier(
                mer,
                k_size,
                'size',
                factor_rules,
                result,
                influences,
                reason='size_category'
            )

        if not base_includes_neuter and age_months >= 12:
            standard_neuter_base = 1.8 if species == 'dog' else 1.4
            neuter_raw = k_neutering / standard_neuter_base
            mer = self._apply_limited_modifier(
                mer,
                neuter_raw,
                'neutering',
                factor_rules,
                result,
                influences,
                reason=neutering_reason
            )

        mer = self._apply_limited_modifier(
            mer,
            k_coat,
            'coat',
            factor_rules,
            result,
            influences,
            reason='coat_type'
        )

        mer = self._apply_limited_modifier(
            mer,
            k_climate,
            'climate',
            factor_rules,
            result,
            influences,
            reason='climate'
        )

        result.mer = round(mer, 1)
        result.coefficients_applied['mer_rer_ratio'] = round((result.mer / result.rer), 3) if result.rer else None

        # Top influences (топ-3 по абсолютному влиянию)
        influences_sorted = sorted(influences, key=lambda x: abs(x.get('impact_kcal', 0.0)), reverse=True)
        result.top_influences = influences_sorted[:3]
        
        # 11. Рекомендации по кормлению
        result.meals_per_day = self._get_meals_per_day(pet)
        result.calories_per_meal = result.mer / result.meals_per_day

        # 11.1 Целевые диапазоны БЖУ
        result.macro_targets = self._get_macro_targets(pet)
        result.macro_targets_dm = self._get_macro_targets_dm(pet)
        result.macro_coverage_rules = {
            # green: внутри диапазона, yellow: до 10% отклонение, red: больше
            'soft_outside_percent': 10,
            'status': {'ok': 'green', 'soft': 'yellow', 'hard': 'red'},
        }
        
        # 12. Перевод в граммы корма
        dry_kcal = self.FOOD_CALORIE_DENSITY['dry']
        wet_kcal = self.FOOD_CALORIE_DENSITY['wet']
        treat_ratio = self._get_treat_ratio(pet)
        result.treat_kcal_per_day = result.mer * treat_ratio
        main_calories = result.mer * (1 - treat_ratio)
        
        # Только сухой корм
        result.dry_food_grams = (main_calories / dry_kcal) * 100
        
        # Только влажный корм
        result.wet_food_grams = (main_calories / wet_kcal) * 100
        
        # Мультипитание (адаптивное распределение)
        multi_ratio = self._get_multi_distribution(pet)
        result.multi_dry_grams = (result.mer * multi_ratio['dry'] / dry_kcal) * 100
        result.multi_wet_grams = (result.mer * multi_ratio['wet'] / wet_kcal) * 100
        result.multi_treat_kcal = result.mer * multi_ratio['treats']
        
        # 13. Оценка полноты данных и рекомендации
        result.data_completeness = self._calculate_data_completeness(pet)
        result.recommendations = self._generate_recommendations(pet, result)
        
        return result

    def _get_treat_ratio(self, pet) -> float:
        """Базовая доля лакомств для dry/wet планов."""
        ratio = 0.05
        age_months = pet.age_months or 24
        if age_months < 12 or age_months >= 84:
            ratio = min(ratio, 0.05)
        if getattr(pet, 'activity_level', None) in ['high', 'very_high']:
            ratio = max(ratio, 0.05)
        try:
            from .nutrition_models import PetHealthCondition
            has_gi = PetHealthCondition.objects.filter(
                pet=pet,
                is_active=True,
                condition__category='gastrointestinal'
            ).exists()
        except Exception:
            has_gi = False
        if has_gi:
            ratio = min(ratio, 0.03)
        return ratio

    def _get_macro_targets(self, pet) -> Dict[str, Dict[str, float]]:
        """
        Целевые диапазоны БЖУ (в процентах) по виду/возрасту/здоровью.
        Использует priority-based lookup из MacroTargetRule.
        """
        return self._resolve_macro_targets(pet, dm_basis=False)

    def _get_macro_targets_dm(self, pet) -> Dict[str, Dict[str, float]]:
        """
        Целевые диапазоны БЖУ на сухое вещество (DM basis).
        Это более корректно для сравнения wet vs dry, т.к. влажность (as-fed) искажает проценты.
        """
        return self._resolve_macro_targets(pet, dm_basis=True)

    def _resolve_macro_targets(self, pet, dm_basis: bool = True) -> Dict[str, Dict[str, float]]:
        """
        Priority-based macro targets lookup.
        Порядок приоритетов: disease > reproductive > growth > age > activity > bcs > baseline.
        """
        age_months = pet.age_months or 24
        species = pet.species or 'dog'
        activity = pet.activity_level or 'moderate'
        bcs = getattr(pet, 'body_condition_score', None)
        reproductive_state = getattr(pet, 'reproductive_state', None) or 'none'

        # Собираем контексты для поиска (от высшего к низшему приоритету)
        contexts_to_check: List[str] = []

        # 1. Disease contexts
        try:
            from .nutrition_models import PetHealthCondition
            conditions = PetHealthCondition.objects.filter(
                pet=pet,
                is_active=True
            ).select_related('condition')
            for pc in conditions:
                cond = pc.condition
                if cond:
                    contexts_to_check.append(cond.code)
        except Exception:
            pass

        # 2. Reproductive contexts
        if reproductive_state == 'lactating':
            litter = getattr(pet, 'litter_size', 3) or 3
            if litter >= 4:
                contexts_to_check.append('lactation_large_litter')
            else:
                contexts_to_check.append('lactation_small_litter')
        elif reproductive_state == 'pregnant':
            week = getattr(pet, 'pregnancy_week', 5) or 5
            if week <= 3:
                contexts_to_check.append('pregnancy_early')
            elif week <= 6:
                contexts_to_check.append('pregnancy_mid')
            else:
                contexts_to_check.append('pregnancy_late')

        # 3. Growth contexts
        if age_months < 12:
            if age_months < 4:
                contexts_to_check.append(f'growth_early_{species}')
            else:
                contexts_to_check.append(f'growth_late_{species}')
            # Для крупных собак
            size_cat = getattr(pet, 'size_category', None) or getattr(pet, 'calculated_size_category', None)
            if species == 'dog' and size_cat in ['large', 'giant'] and age_months >= 4:
                contexts_to_check.append('growth_large_breed_dog')

        # 4. Age contexts (senior/geriatric)
        if species == 'cat':
            if age_months >= 180:
                contexts_to_check.append('geriatric_cat')
            elif age_months >= 120:
                contexts_to_check.append('senior_cat')
        else:
            if age_months >= 120:
                contexts_to_check.append('geriatric_dog')
            elif age_months >= 84:
                contexts_to_check.append('senior_dog')

        # 5. Activity contexts
        if activity == 'very_low':
            contexts_to_check.append('very_low_activity')
        elif activity == 'low':
            contexts_to_check.append('low_activity')
        elif activity == 'high':
            contexts_to_check.append('high_activity')
        elif activity == 'very_high':
            contexts_to_check.append('very_high_activity')

        # 6. BCS contexts
        try:
            bcs_int = int(bcs) if bcs is not None else None
        except (ValueError, TypeError):
            bcs_int = None
        if bcs_int is not None:
            if bcs_int >= 8:
                contexts_to_check.append('bcs_obese')
            elif bcs_int == 7:
                contexts_to_check.append('bcs_overweight')
            elif bcs_int <= 3:
                contexts_to_check.append('bcs_underweight')

        # 7. Baseline
        if species == 'cat':
            contexts_to_check.append('baseline_cat_adult')
        else:
            contexts_to_check.append('baseline_dog_adult')

        # Lookup из БД
        rule = self._find_best_macro_rule(species, contexts_to_check, age_months)

        if rule:
            result = {
                'protein': {
                    'min': float(rule.protein_min) if rule.protein_min else 22,
                    'max': float(rule.protein_max) if rule.protein_max else 35,
                },
                'fat': {
                    'min': float(rule.fat_min) if rule.fat_min else 10,
                    'max': float(rule.fat_max) if rule.fat_max else 25,
                },
                'fiber': {
                    'min': float(rule.fiber_min) if rule.fiber_min else 2,
                    'max': float(rule.fiber_max) if rule.fiber_max else 10,
                },
                '_source': rule.context_key,
                '_priority': rule.priority,
            }
            return result

        # Fallback hardcoded (если БД пуста)
        return self._get_fallback_macro_targets(species, age_months, dm_basis)

    def _find_best_macro_rule(self, species: str, contexts: List[str], age_months: int):
        """
        Ищет правило БЖУ с наивысшим приоритетом (наименьшим числом) среди контекстов.
        """
        try:
            from .nutrition_models import MacroTargetRule

            rules = MacroTargetRule.objects.filter(
                is_active=True,
                context_key__in=contexts,
                scope__in=[species, 'both']
            ).order_by('priority')

            for rule in rules:
                # Проверяем возрастные границы если заданы
                if rule.age_from_months is not None and age_months < rule.age_from_months:
                    continue
                if rule.age_to_months is not None and age_months > rule.age_to_months:
                    continue
                return rule
        except Exception as e:
            logger.warning(f"Error finding macro rule: {e}")
        return None

    def _get_fallback_macro_targets(self, species: str, age_months: int, dm_basis: bool) -> Dict[str, Dict[str, float]]:
        """
        Fallback hardcoded targets если БД пуста.
        """
        if species == 'cat':
            if age_months < 12:
                protein = (40, 55) if dm_basis else (35, 45)
                fat = (20, 35) if dm_basis else (18, 25)
                fiber = (1, 5) if dm_basis else (1, 4)
            elif age_months >= 120:
                protein = (38, 52) if dm_basis else (30, 42)
                fat = (15, 28) if dm_basis else (12, 22)
                fiber = (2, 8) if dm_basis else (2, 6)
            else:
                protein = (34, 50) if dm_basis else (30, 40)
                fat = (16, 28) if dm_basis else (15, 22)
                fiber = (2, 10) if dm_basis else (2, 6)
        else:
            if age_months < 12:
                protein = (28, 40) if dm_basis else (26, 34)
                fat = (16, 28) if dm_basis else (14, 20)
                fiber = (2, 10) if dm_basis else (2, 6)
            elif age_months >= 84:
                protein = (28, 38) if dm_basis else (24, 32)
                fat = (12, 22) if dm_basis else (10, 18)
                fiber = (3, 12) if dm_basis else (3, 8)
            else:
                protein = (24, 34) if dm_basis else (22, 30)
                fat = (12, 24) if dm_basis else (10, 18)
                fiber = (2, 14) if dm_basis else (2, 8)

        return {
            'protein': {'min': protein[0], 'max': protein[1]},
            'fat': {'min': fat[0], 'max': fat[1]},
            'fiber': {'min': fiber[0], 'max': fiber[1]},
            '_source': 'fallback',
            '_priority': 99,
        }

    def _get_multi_distribution(self, pet) -> Dict[str, float]:
        """
        Адаптивное распределение калорий для мультипитания.
        """
        distribution = dict(self.MULTI_FEEDING_RATIO)
        distribution['treats'] = self._get_treat_ratio(pet)
        age_months = pet.age_months or 24
        species = pet.species or 'dog'
        activity = pet.activity_level or 'moderate'

        # Видовые корректировки
        if species == 'cat':
            distribution['wet'] += 0.10
            distribution['dry'] = max(0.0, distribution['dry'] - 0.10)

        # Активность (больше энергии днём)
        if activity in ['high', 'very_high']:
            distribution['dry'] += 0.05
            distribution['wet'] = max(0.0, distribution['wet'] - 0.05)

        # ЖКТ проблемы: настраиваем долю влажного корма
        try:
            from .nutrition_models import PetHealthCondition
            has_gi = PetHealthCondition.objects.filter(
                pet=pet,
                is_active=True,
                condition__category='gastrointestinal'
            ).exists()
        except Exception:
            has_gi = False

        if has_gi:
            distribution['wet'] += 0.05
            distribution['dry'] = max(0.0, distribution['dry'] - 0.05)

        total = sum(distribution.values())
        if total <= 0:
            return distribution
        return {k: round(v / total, 3) for k, v in distribution.items()}
    
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
        bcs = getattr(pet, 'body_condition_score', None)
        housing_type = getattr(pet, 'housing_type', None)

        # Расширенные коды при наличии данных (если коэффициента нет — будет fallback ниже)
        if is_neutered:
            code_suffix = 'neutered'
            # Собаки склонные к ожирению
            if species == 'dog' and bcs is not None:
                try:
                    if int(bcs) >= 7:
                        code_suffix = 'neutered_obesity_prone'
                except (TypeError, ValueError):
                    pass
            # Домашние кастрированные кошки
            if species == 'cat' and housing_type == 'apartment':
                code_suffix = 'neutered_indoor'
        else:
            code_suffix = 'intact'
        
        # Пробуем получить из БД
        coef = self._get_coefficient_from_db(species, 'neutering', code_suffix)
        
        if coef:
            reason = 'Кастрирован' if is_neutered else 'Не кастрирован'
            return float(coef), reason
        
        # Fallback
        fallback = self.FALLBACK_K_NEUTERING.get(species, self.FALLBACK_K_NEUTERING['dog'])
        reason = 'Кастрирован' if is_neutered else 'Не кастрирован'
        fallback_key = code_suffix
        if fallback_key not in fallback:
            fallback_key = 'neutered' if is_neutered else 'intact'
        return fallback[fallback_key], reason
    
    def _get_k_activity(self, pet) -> Tuple[float, Dict[str, Any]]:
        """
        Коэффициент активности из БД.
        """
        species = pet.species or 'dog'
        activity = pet.activity_level or 'moderate'
        
        # Пробуем получить из БД
        coef = self._get_coefficient_from_db(species, 'activity_level', activity)
        
        if coef:
            return float(coef), {
                'value': float(coef),
                'activity_level': activity,
                'source': 'db',
            }
        
        # Важно: при неполной БД не используем общий fallback-словарь (он dog-ориентированный).
        # Вместо этого возвращаем базовую «норму» по виду, чтобы не завышать/занижать MER.
        base = 1.4 if species == 'dog' else 1.2
        return base, {
            'value': base,
            'activity_level': activity,
            'source': 'base',
            'warning': f"Не найден коэффициент activity_level={activity} для {species} в БД — использовано базовое значение {base}",
        }
    
    def _get_k_size(self, pet) -> float:
        """
        Коэффициент размера (только для собак) из БД.
        """
        if pet.species != 'dog':
            return 1.0
        
        # Единый источник: сначала явное поле, затем рассчитанная категория из PetID
        # (важно для щенков — Pet.calculated_size_category оценивает «взрослый» размер),
        # затем грубая оценка по текущему весу.
        size_category = (
            getattr(pet, 'size_category', None)
            or getattr(pet, 'calculated_size_category', None)
            or self._calculate_size_category(pet)
        )
        
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
    
    def _get_k_health(self, pet) -> Tuple[float, List[str], List[Modifier], Optional[str]]:
        """
        Коэффициент при заболеваниях.
        
        Загружает заболевания из M2M таблицы PetHealthCondition.
        Применяет логику приоритетности из HealthCondition.
        """
        k_health = 1.0
        warnings = []
        modifiers: List[Modifier] = []
        top_priority: Optional[str] = None
        
        # Получаем заболевания из M2M или из "переданных" в тест/аудит данных.
        try:
            from .nutrition_models import PetHealthCondition

            injected = getattr(pet, "health_conditions_for_calc", None)
            if injected:
                # ожидаем список HealthCondition (или объектов с теми же полями)
                rows_sorted = sorted(
                    list(injected),
                    key=lambda c: {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}.get(getattr(c, 'priority', None), 3)
                )
                conditions = rows_sorted
            else:
                conditions = PetHealthCondition.objects.filter(
                    pet=pet,
                    is_active=True
                ).select_related('condition')
            
            if conditions:
                # Сортируем по приоритету
                priority_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
                if injected:
                    rows_sorted = conditions  # already sorted
                    rows = rows_sorted
                    # адаптируем к интерфейсу ниже
                    def _cond(obj):  # type: ignore
                        return obj
                else:
                    rows = [pc for pc in conditions if getattr(pc, 'condition', None)]
                    rows_sorted = sorted(
                        rows,
                        key=lambda c: priority_order.get(getattr(c.condition, 'priority', None), 3)
                    )
                    def _cond(obj):  # type: ignore
                        return obj.condition

                # guided priority: берём только top-priority группу
                top_prio = (
                    priority_order.get(getattr(_cond(rows_sorted[0]), 'priority', None), 3)
                    if rows_sorted else None
                )
                if rows_sorted:
                    top_priority = getattr(_cond(rows_sorted[0]), 'priority', None)
                top_group = [
                    r for r in rows_sorted
                    if priority_order.get(getattr(_cond(r), 'priority', None), 3) == top_prio
                ]

                disease_multipliers: List[Tuple[str, str, float]] = []
                for pet_condition in top_group:
                    condition = _cond(pet_condition)
                    coef = float(condition.coefficient_min + condition.coefficient_max) / 2
                    disease_multipliers.append((condition.code, condition.direction, coef))
                    modifiers.append(
                        Modifier(
                            kind='disease',
                            priority=priority_order.get(condition.priority, 3),
                            multiplier=round(coef, 3),
                            reason=f"{condition.name_ru} ({condition.code}, {condition.priority})",
                        )
                    )
                    if condition.priority in ['CRITICAL', 'HIGH']:
                        warnings.append(f"Учтено заболевание: {condition.name_ru} (коэф. {round(coef, 2)})")

                decreases = [m for (_, direction, m) in disease_multipliers if (direction or '').upper() == 'DECREASE']
                increases = [m for (_, direction, m) in disease_multipliers if (direction or '').upper() == 'INCREASE']

                # Комбинирование: DECREASE → берём минимальный, INCREASE → максимальный
                if decreases:
                    k_health *= min(decreases)
                elif increases:
                    k_health *= max(increases)
                else:
                    k_health *= 1.0
                        
        except Exception as e:
            logger.warning(f"Error loading health conditions: {e}")
        
        return round(k_health, 2), warnings, modifiers, top_priority
    
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
            # Коды в данных: pregnancy_early / pregnancy_mid / pregnancy_late
            if week <= 3:
                code_suffix = 'pregnancy_early'
            elif week <= 6:
                code_suffix = 'pregnancy_mid'
            else:
                code_suffix = 'pregnancy_late'
        elif state == 'lactating':
            litter = getattr(pet, 'litter_size', 3) or 3
            # Коды в данных: lactation_1_2 / lactation_3_4 / lactation_5_6 / lactation_7_plus (dog)
            #              lactation_1_2 / lactation_3_4 / lactation_5_plus (cat)
            if litter <= 2:
                code_suffix = 'lactation_1_2'
            elif litter <= 4:
                code_suffix = 'lactation_3_4'
            else:
                if species == 'cat':
                    code_suffix = 'lactation_5_plus'
                else:
                    if litter <= 6:
                        code_suffix = 'lactation_5_6'
                    else:
                        code_suffix = 'lactation_7_plus'
        else:
            return 1.0
        
        # Пробуем получить из БД
        coef = self._get_coefficient_from_db(species, 'reproductive', code_suffix)
        
        if coef:
            return float(coef)
        
        # Fallback значения
        fallback = {
            'heat': 1.10,
            'pregnancy_early': 1.25,
            'pregnancy_mid': 1.40,
            'pregnancy_late': 1.60 if species == 'cat' else 1.50,
            'lactation_1_2': 2.00,
            'lactation_3_4': 2.50,
            'lactation_5_6': 3.00,
            'lactation_7_plus': 3.50,
            'lactation_5_plus': 3.00,
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
            daily_treat_kcal = result.treat_kcal_per_day
        else:
            plan_type = 'dry_only'
            daily_grams = result.dry_food_grams
            daily_treat_kcal = result.treat_kcal_per_day
        
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
                if daily_treat_kcal:
                    day_plan['treats_kcal_limit'] = round(daily_treat_kcal, 0)
            
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
            if daily_treat_kcal:
                plan['total_needed']['treats_kcal'] = round(daily_treat_kcal * days, 0)
        
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
