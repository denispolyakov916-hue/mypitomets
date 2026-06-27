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
import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple, Iterable
from decimal import Decimal
from django.db.models import Q
from django.conf import settings

logger = logging.getLogger('apps.pets.food_recommendation')


# ============================================================================
# RationBalancer: скоринг калорий + БЖУ с допуском ±15%
# ============================================================================

@dataclass
class RationScore:
    """Результат скоринга компонента/комбинации рациона."""
    is_valid: bool
    kcal_delta_pct: float  # отклонение калорий в %
    protein_delta_pct: float  # отклонение белка в % от диапазона
    fat_delta_pct: float
    fiber_delta_pct: float
    total_score: float  # 0-100
    warnings: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)


class RationBalancer:
    """
    Балансировщик рациона: проверяет калории и БЖУ на попадание в целевые диапазоны.
    """
    KCAL_TOLERANCE = 0.15  # ±15%
    BJU_TOLERANCE = 0.15   # ±15% от диапазона

    def score_product(
        self,
        product,
        target_kcal: float,
        macro_targets: Dict[str, Dict[str, float]],
        daily_grams: float
    ) -> RationScore:
        """
        Оценить продукт на соответствие калорийности и БЖУ.
        """
        warnings = []
        details = {}

        # Получаем нутриенты продукта
        fd = getattr(product, 'food_details', None)
        kcal_per_100g = float(fd.energy_kcal_per_100g or 350) if fd else 350
        protein_pct = float(fd.protein_g_per_100g or 25) if fd else 25
        fat_pct = float(fd.fat_g_per_100g or 15) if fd else 15
        fiber_pct = float(fd.fiber_g_per_100g or 3) if fd else 3
        moisture_pct = float(fd.moisture_percent or 10) if fd else 10

        # Пересчет на сухое вещество (DM)
        dm_factor = 100.0 / (100.0 - moisture_pct) if moisture_pct < 100 else 1.0
        protein_dm = protein_pct * dm_factor
        fat_dm = fat_pct * dm_factor
        fiber_dm = fiber_pct * dm_factor

        # Фактические калории
        actual_kcal = (daily_grams / 100.0) * kcal_per_100g
        kcal_delta = (actual_kcal - target_kcal) / target_kcal if target_kcal > 0 else 0

        # Проверка калорий
        kcal_valid = abs(kcal_delta) <= self.KCAL_TOLERANCE
        if not kcal_valid:
            warnings.append(f"Калории: {round(actual_kcal)} ккал ({round(kcal_delta*100, 1):+}% от {round(target_kcal)})")

        # Проверка БЖУ
        def check_nutrient(name: str, actual: float, targets: Dict[str, float]) -> Tuple[float, bool]:
            if not targets:
                return 0.0, True
            min_val = targets.get('min', 0)
            max_val = targets.get('max', 100)
            mid = (min_val + max_val) / 2
            range_size = max_val - min_val if max_val > min_val else 1

            if actual < min_val:
                delta = (min_val - actual) / range_size
                return -delta, delta <= self.BJU_TOLERANCE
            elif actual > max_val:
                delta = (actual - max_val) / range_size
                return delta, delta <= self.BJU_TOLERANCE
            return 0.0, True

        protein_targets = macro_targets.get('protein', {})
        fat_targets = macro_targets.get('fat', {})
        fiber_targets = macro_targets.get('fiber', {})

        protein_delta, protein_valid = check_nutrient('protein', protein_dm, protein_targets)
        fat_delta, fat_valid = check_nutrient('fat', fat_dm, fat_targets)
        fiber_delta, fiber_valid = check_nutrient('fiber', fiber_dm, fiber_targets)

        if not protein_valid:
            warnings.append(f"Белок: {round(protein_dm, 1)}% DM (норма {protein_targets.get('min')}-{protein_targets.get('max')}%)")
        if not fat_valid:
            warnings.append(f"Жир: {round(fat_dm, 1)}% DM (норма {fat_targets.get('min')}-{fat_targets.get('max')}%)")
        if not fiber_valid:
            warnings.append(f"Клетчатка: {round(fiber_dm, 1)}% DM (норма {fiber_targets.get('min')}-{fiber_targets.get('max')}%)")

        # Клетчатка - soft constraint
        is_valid = kcal_valid and protein_valid and fat_valid

        # Общий score: 100 - штрафы
        score = 100.0
        score -= min(30, abs(kcal_delta) * 100)
        score -= min(20, abs(protein_delta) * 50)
        score -= min(20, abs(fat_delta) * 50)
        score -= min(10, abs(fiber_delta) * 30)
        score = max(0, score)

        details = {
            'actual_kcal': round(actual_kcal, 1),
            'target_kcal': round(target_kcal, 1),
            'protein_dm': round(protein_dm, 1),
            'fat_dm': round(fat_dm, 1),
            'fiber_dm': round(fiber_dm, 1),
            'dm_factor': round(dm_factor, 3),
        }

        return RationScore(
            is_valid=is_valid,
            kcal_delta_pct=round(kcal_delta * 100, 1),
            protein_delta_pct=round(protein_delta * 100, 1),
            fat_delta_pct=round(fat_delta * 100, 1),
            fiber_delta_pct=round(fiber_delta * 100, 1),
            total_score=round(score, 1),
            warnings=warnings,
            details=details,
        )

    def find_best_combination(
        self,
        dry_candidates: List,
        wet_candidates: List,
        target_kcal: float,
        macro_targets: Dict[str, Dict[str, float]],
        dry_ratio: float = 0.6,
        wet_ratio: float = 0.3
    ) -> Tuple[Optional[Any], Optional[Any], RationScore]:
        """
        Найти лучшую комбинацию dry + wet для мультипитания.
        """
        best_dry = None
        best_wet = None
        best_score = RationScore(
            is_valid=False,
            kcal_delta_pct=100,
            protein_delta_pct=100,
            fat_delta_pct=100,
            fiber_delta_pct=100,
            total_score=0,
            warnings=["Не найдена подходящая комбинация"]
        )

        dry_kcal = target_kcal * dry_ratio
        wet_kcal = target_kcal * wet_ratio

        for dry in dry_candidates[:10]:  # Ограничиваем перебор
            fd = getattr(dry, 'food_details', None)
            dry_kcal_100g = float(fd.energy_kcal_per_100g or 350) if fd else 350
            dry_grams = (dry_kcal / dry_kcal_100g) * 100 if dry_kcal_100g > 0 else 100

            dry_score = self.score_product(dry, dry_kcal, macro_targets, dry_grams)

            for wet in wet_candidates[:10]:
                fd_wet = getattr(wet, 'food_details', None)
                wet_kcal_100g = float(fd_wet.energy_kcal_per_100g or 85) if fd_wet else 85
                wet_grams = (wet_kcal / wet_kcal_100g) * 100 if wet_kcal_100g > 0 else 200

                wet_score = self.score_product(wet, wet_kcal, macro_targets, wet_grams)

                # Комбинированный score
                combined_score = (dry_score.total_score * dry_ratio + wet_score.total_score * wet_ratio) / (dry_ratio + wet_ratio)
                combined_valid = dry_score.is_valid and wet_score.is_valid

                if combined_score > best_score.total_score:
                    best_dry = dry
                    best_wet = wet
                    best_score = RationScore(
                        is_valid=combined_valid,
                        kcal_delta_pct=(dry_score.kcal_delta_pct * dry_ratio + wet_score.kcal_delta_pct * wet_ratio) / (dry_ratio + wet_ratio),
                        protein_delta_pct=(dry_score.protein_delta_pct + wet_score.protein_delta_pct) / 2,
                        fat_delta_pct=(dry_score.fat_delta_pct + wet_score.fat_delta_pct) / 2,
                        fiber_delta_pct=(dry_score.fiber_delta_pct + wet_score.fiber_delta_pct) / 2,
                        total_score=combined_score,
                        warnings=dry_score.warnings + wet_score.warnings,
                        details={
                            'dry_score': dry_score.details,
                            'wet_score': wet_score.details,
                        }
                    )

        return best_dry, best_wet, best_score


# ============================================================================
# OutputValidator: валидация всех выходных значений
# ============================================================================

class OutputValidator:
    """
    Валидатор выходных значений плана кормления.
    Проверяет на адекватность и заменяет экстремальные значения.
    """
    LIMITS = {
        'daily_kcal': (50, 10000),
        'protein_percent': (10, 70),
        'fat_percent': (5, 50),
        'fiber_percent': (0, 25),
        'grams_per_meal': (5, 2000),
        'meals_per_day': (1, 6),
        'daily_grams': (10, 5000),
        'packages_needed': (1, 100),
    }

    def validate(self, plan) -> List[str]:
        """
        Валидировать план кормления, вернуть список предупреждений.
        """
        warnings = []

        # Проверка калорийности
        if plan.daily_calories:
            min_kcal, max_kcal = self.LIMITS['daily_kcal']
            if plan.daily_calories < min_kcal:
                warnings.append(f"Калорийность {round(plan.daily_calories)} ккал ниже минимума {min_kcal}")
            elif plan.daily_calories > max_kcal:
                warnings.append(f"Калорийность {round(plan.daily_calories)} ккал выше максимума {max_kcal}")

        # Проверка компонентов
        for component in (plan.components or []):
            if component.daily_grams:
                min_g, max_g = self.LIMITS['daily_grams']
                if component.daily_grams < min_g:
                    warnings.append(f"{component.product_name}: порция {round(component.daily_grams)}г ниже минимума")
                elif component.daily_grams > max_g:
                    warnings.append(f"{component.product_name}: порция {round(component.daily_grams)}г выше максимума")

            if component.packages_needed:
                min_p, max_p = self.LIMITS['packages_needed']
                if component.packages_needed > max_p:
                    warnings.append(f"{component.product_name}: {component.packages_needed} упаковок — проверьте расчёт")

        return warnings

    def clamp_value(self, value: float, limit_key: str) -> float:
        """Ограничить значение пределами."""
        if limit_key not in self.LIMITS:
            return value
        min_val, max_val = self.LIMITS[limit_key]
        return max(min_val, min(max_val, value))


# Глобальные экземпляры
ration_balancer = RationBalancer()
output_validator = OutputValidator()


def _norm_token(value: str) -> str:
    """Нормализовать токен ингредиента/аллергена для сравнения."""
    return (value or "").strip().lower()


def _norm_token_list(values: Iterable[str]) -> List[str]:
    seen = set()
    out: List[str] = []
    for v in values or []:
        t = _norm_token(v)
        if not t or t in seen:
            continue
        seen.add(t)
        out.append(t)
    return out


@dataclass(frozen=True)
class PetAllergyInfo:
    code: str
    allergen_type: Optional[str] = None  # Food/Environmental/...
    severity: Optional[str] = None


@dataclass(frozen=True)
class PetFoodExclusionInfo:
    ingredient_code: str
    ingredient_name: str
    reason: str  # allergy/intolerance/preference/medical/other


@dataclass(frozen=True)
class PetHealthConditionInfo:
    code: str
    category: Optional[str] = None
    priority: Optional[str] = None  # CRITICAL/HIGH/MEDIUM/LOW
    direction: Optional[str] = None  # INCREASE/DECREASE/NEUTRAL
    contraindicated_ingredients: List[str] = field(default_factory=list)


@dataclass
class PetNutritionProfile:
    """
    Нормализованный профиль питания питомца (PetID + связанные таблицы).
    Используется как источник truth для построения фильтров.
    """
    species: str
    age_months: Optional[int]
    size_category: Optional[str]
    weight_kg: Optional[float]
    is_neutered: Optional[bool]
    activity_level: Optional[str]
    reproductive_state: Optional[str]
    sensitive_digestion: bool = False

    allergies: List[PetAllergyInfo] = field(default_factory=list)
    health_conditions: List[PetHealthConditionInfo] = field(default_factory=list)
    exclusions: List[PetFoodExclusionInfo] = field(default_factory=list)

    @property
    def food_allergy_codes(self) -> List[str]:
        return [a.code for a in self.allergies if (a.allergen_type or "").lower() == "food"]

    @property
    def hard_exclusion_tokens(self) -> List[str]:
        """Токены, которые нельзя допускать в рацион (intolerance/medical/allergy)."""
        hard_reasons = {"intolerance", "medical", "allergy"}
        tokens: List[str] = []
        for e in self.exclusions:
            if (e.reason or "").lower() in hard_reasons:
                tokens.append(e.ingredient_name)
                tokens.append(e.ingredient_code)
        # Противопоказанные ингредиенты по заболеваниям считаем HARD
        for hc in self.health_conditions:
            tokens.extend(hc.contraindicated_ingredients or [])
        return _norm_token_list(tokens)

    @property
    def soft_exclusion_tokens(self) -> List[str]:
        """Токены предпочтений — можно ослаблять при guided_relax."""
        tokens: List[str] = []
        for e in self.exclusions:
            if (e.reason or "").lower() == "preference":
                tokens.append(e.ingredient_name)
                tokens.append(e.ingredient_code)
        return _norm_token_list(tokens)

    @property
    def has_gi_issues(self) -> bool:
        if self.sensitive_digestion:
            return True
        for hc in self.health_conditions:
            if (hc.category or "").lower() == "gastrointestinal":
                return True
            code = (hc.code or "").lower()
            if any(m in code for m in ["digest", "gastro", "ibd", "pancreat"]):
                return True
        return False


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
    package_breakdown: Optional[List[Dict[str, Any]]] = None  # [{sku_id, weight_grams, weight_display, count}]
    package_summary: Optional[str] = None  # "2x3 кг" / "2 уп.: 1x12 кг, 1x3 кг"
    reasons: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    badges: List[str] = field(default_factory=list)  # Рекомендуем, Топ продаж, и т.д.
    alternatives_count: int = 0
    
    # Расширенные поля для UI
    short_description: Optional[str] = None
    image_url: Optional[str] = None
    shop_url: Optional[str] = None
    kcal_per_100g: Optional[float] = None  # Калорийность для отображения
    # Связь с нашей базой питания (режим 'recipe'); в legacy остаются None
    recipe_id: Optional[str] = None
    offer_id: Optional[str] = None
    sku_id: Optional[str] = None
    article_number: Optional[str] = None
    brand: Optional[str] = None
    source: Optional[str] = None
    recommendation_reason: Optional[str] = None
    alternatives: Optional[List[Dict[str, Any]]] = None  # альтернативы той же роли (dry/wet)
    
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

    # Детализация скоринга (для аналитики/отладки/UI)
    score_breakdown: Optional[Dict[str, Any]] = None
    
    # Специальные поля для лакомств
    pieces_per_day: Optional[int] = None  # ~количество штук в день (среднее)
    piece_weight_grams: Optional[int] = None  # Вес одной штуки
    treat_frequency_days: Optional[int] = None  # 1 = ежедневно, 2 = раз в 2 дня и т.д.
    
    # Специальные поля для добавок
    dosage_text: Optional[str] = None  # "1-2 таблетки в день"
    intake_time: Optional[str] = None  # "утром с едой", "вечером"
    intake_instructions: Optional[str] = None  # Подробные инструкции
    supplement_type: Optional[str] = None  # vitamins, omega3, joint и т.д.


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
    # Новые структурированные поля
    nutrition_profile: Optional[PetNutritionProfile] = None
    food_allergy_codes: List[str] = field(default_factory=list)
    hard_exclusion_tokens: List[str] = field(default_factory=list)
    soft_exclusion_tokens: List[str] = field(default_factory=list)
    requires_hypoallergenic: bool = False
    
    # Тип питания
    food_type: str = 'multi'  # dry, wet, multi
    variant: str = 'basic'  # basic, advanced
    # Соотношение сухой/влажный при мультипитании: more_dry, balanced, more_wet (см. MULTI_RATIO_PRESETS по species).
    multi_ratio_preset: Optional[str] = None
    
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
    bcs: Optional[int] = None
    reproductive_state: Optional[str] = None
    override_age_group: Optional[str] = None
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
    
    # Распределение калорий ТОЛЬКО между основным кормом (сухой/влажный). Лакомства не входят в расчёт.
    # dry: 100% сухой; wet: 100% влажный; multi: dry_food + wet_food = 1.0 (100%).
    CALORIE_DISTRIBUTION = {
        'dry': {'dry_food': 1.0},
        'wet': {'wet_food': 1.0},
        'multi': {'dry_food': 0.60, 'wet_food': 0.40},
    }

    # Соотношение сухой/влажный для мультипитания. Сумма dry_food + wet_food = 1.0 (100%).
    # Лакомства в расчёт не входят — опциональная добавка по желанию.
    MULTI_RATIO_PRESETS = {
        'dog': {
            'more_dry': {'dry_food': 0.70, 'wet_food': 0.30},
            'balanced': {'dry_food': 0.60, 'wet_food': 0.40},
            'more_wet': {'dry_food': 0.50, 'wet_food': 0.50},
        },
        'cat': {
            'more_wet': {'dry_food': 0.40, 'wet_food': 0.60},
            'balanced': {'dry_food': 0.50, 'wet_food': 0.50},
            'more_dry': {'dry_food': 0.60, 'wet_food': 0.40},
        },
    }
    # Человекочитаемые названия пресетов для UI (вид → код пресета → название).
    MULTI_RATIO_PRESET_LABELS = {
        'dog': {
            'more_dry': 'Больше сухого (70% сухой / 30% влажный)',
            'balanced': 'Сбалансировано (60% сухой / 40% влажный)',
            'more_wet': 'Больше влажного (50% сухой / 50% влажный)',
        },
        'cat': {
            'more_wet': 'Больше влажного (40% сухой / 60% влажный)',
            'balanced': 'Сбалансировано (50% сухой / 50% влажный)',
            'more_dry': 'Больше сухого (60% сухой / 40% влажный)',
        },
    }
    
    # Средний вес одного лакомства (для расчёта штук)
    AVG_TREAT_PIECE_GRAMS = 12  # ~10-15г на штуку
    TREAT_PIECES_PER_100G = 8   # ~100г / 12г = 8 штук
    TREAT_FREQUENCY_DAYS = 2    # по умолчанию лакомства раз в 2 дня
    
    # Группы совместимости кормов
    COMPATIBILITY_GROUPS = {
        'regular': ['regular', 'premium', 'super_premium', 'holistic'],
        'therapeutic_weight': ['diet', 'light', 'weight_management'],
        'therapeutic_renal': ['renal', 'kidney'],
        'therapeutic_gastro': ['sensitive', 'gastro', 'digestive'],
        'therapeutic_urinary': ['urinary'],
        'hypoallergenic': ['hypoallergenic', 'limited_ingredient'],
    }
    
    # Маппинг пищевых аллергий на ингредиенты/синонимы.
    # ВАЖНО: ключи должны совпадать с кодами из справочника Allergy (см. docs/.../allergies.json).
    ALLERGY_INGREDIENTS = {
        # dog
        'dog_govyazhiy_belok': ['говядина', 'говяж', 'beef'],
        'dog_kurinyy_belok': ['курица', 'курят', 'птица', 'chicken', 'poultry'],
        'dog_molochnyy_belok': ['молоко', 'молочн', 'dairy', 'milk'],
        'dog_yaichnyy_belok': ['яйцо', 'яичн', 'egg'],
        'dog_rybiy_belok': ['рыба', 'лосось', 'тунец', 'треск', 'fish', 'salmon', 'tuna'],
        'dog_pshenichnyy_belok': ['пшениц', 'глютен', 'wheat', 'gluten'],
        'dog_soevyy_belok': ['соя', 'соев', 'soy'],
        # cat
        'cat_govyazhiy_belok': ['говядина', 'говяж', 'beef'],
        'cat_kurinyy_belok': ['курица', 'курят', 'птица', 'chicken', 'poultry'],
        'cat_molochnyy_belok': ['молоко', 'молочн', 'dairy', 'milk'],
        'cat_yaichnyy_belok': ['яйцо', 'яичн', 'egg'],
        'cat_rybiy_belok': ['рыба', 'лосось', 'тунец', 'треск', 'fish', 'salmon', 'tuna'],
        'cat_pshenitsaglyuten': ['пшениц', 'глютен', 'wheat', 'gluten'],
    }

    # Алиасы кодов (например, из породных risk JSON), которые нужно привести к кодам Allergy.
    ALLERGY_CODE_ALIASES = {
        'chicken_protein': {'dog': 'dog_kurinyy_belok', 'cat': 'cat_kurinyy_belok'},
        'beef_protein': {'dog': 'dog_govyazhiy_belok', 'cat': 'cat_govyazhiy_belok'},
        'fish_protein': {'dog': 'dog_rybiy_belok', 'cat': 'cat_rybiy_belok'},
        'egg_protein': {'dog': 'dog_yaichnyy_belok', 'cat': 'cat_yaichnyy_belok'},
        'dairy_protein': {'dog': 'dog_molochnyy_belok', 'cat': 'cat_molochnyy_belok'},
        'wheat_protein': {'dog': 'dog_pshenichnyy_belok', 'cat': 'cat_pshenitsaglyuten'},
        'soy_protein': {'dog': 'dog_soevyy_belok', 'cat': None},
    }

    def _normalize_allergy_code(self, species: str, code: str) -> str:
        """Привести код аллергии к коду справочника Allergy."""
        c = _norm_token(code)
        if not c:
            return ''
        if c.startswith('dog_') or c.startswith('cat_'):
            return c
        alias = self.ALLERGY_CODE_ALIASES.get(c)
        if alias:
            mapped = alias.get(species)
            return mapped or c
        return c

    def _expand_category_codes_for_species(self, codes: List[str], species: str) -> List[str]:
        """
        В каталоге часть категорий имеет видовой суффикс: food.wet.dog / food.wet.cat.
        Для совместимости принимаем базовые коды и расширяем их суффиксом вида.
        """
        sp = (species or "").strip().lower()
        out = set()
        for code in codes or []:
            c = (code or "").strip()
            if not c:
                continue
            out.add(c)
            # если код уже содержит суффикс вида - не добавляем дубль
            if sp and not c.endswith(f".{sp}"):
                out.add(f"{c}.{sp}")
            # общий суффикс "all" (на будущее)
            if not c.endswith(".all"):
                out.add(f"{c}.all")
        return list(out)
    
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

    def _apply_age_filters(self, queryset, species: str, age_months: Optional[int],
                           override_age_group: Optional[str] = None):
        """Фильтры по возрасту на уровне БД + строгий age_group.

        override_age_group позволяет расширить допустимые возрастные группы
        (например, для беременных/лактирующих допускаются puppy/kitten корма).
        """
        if age_months is None:
            return queryset

        queryset = queryset.filter(
            Q(food_details__age_min_months__isnull=True) | Q(food_details__age_min_months__lte=age_months)
        ).filter(
            Q(food_details__age_max_months__isnull=True) | Q(food_details__age_max_months__gte=age_months)
        )

        pet_age_group = self._get_age_category(species, age_months)
        allowed_groups = ['all', pet_age_group]
        if override_age_group and override_age_group not in allowed_groups:
            allowed_groups.append(override_age_group)
        return queryset.filter(Q(age_group__in=allowed_groups) | Q(age_group__isnull=True))

    def _has_gi_issues(self, filters: FoodSearchFilters) -> bool:
        """Проверка ЖКТ проблем по кодам заболеваний."""
        if getattr(filters, "nutrition_profile", None):
            try:
                return bool(filters.nutrition_profile.has_gi_issues)
            except Exception:
                pass
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
        Распределение калорий ТОЛЬКО между сухим и влажным кормом (сумма 100%).
        Лакомства в расчёт не входят — опциональная добавка по желанию.
        Соотношение точно соответствует выбранному пресету пользователя.
        """
        species = (filters.species or 'dog').strip().lower()

        if filters.food_type == 'dry':
            return {'dry_food': 1.0}
        if filters.food_type == 'wet':
            return {'wet_food': 1.0}

        # Мультипитание: пресет или дефолт по виду, только dry + wet (сумма 1.0)
        preset = (filters.multi_ratio_preset or '').strip().lower()
        presets_for_species = self.MULTI_RATIO_PRESETS.get(species, self.MULTI_RATIO_PRESETS['dog'])
        if preset and preset in presets_for_species:
            distribution = dict(presets_for_species[preset])
        else:
            distribution = {'dry_food': 0.60, 'wet_food': 0.40}
            if species == 'cat':
                distribution['dry_food'], distribution['wet_food'] = 0.50, 0.50

        return distribution

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
    
    def _select_components_from_recipes(self, pet, filters, calorie_result):
        # Источник 'recipe': единичный выбор рациона из нашей базы — 1 dry (+ опц. 1 wet).
        from .food_recipe_candidate_provider import select_ration
        period = filters.period_days or 30
        mer = float(calorie_result.mer) if calorie_result else None
        from .food_recipe_candidate_provider import candidate_to_dto, shop_ids_for
        ration = select_ration(pet, period_days=period)
        dry, wet = ration.get('dry'), ration.get('wet')
        dry_alts = ration.get('dry_alternatives') or []
        wet_alts = ration.get('wet_alternatives') or []
        # Уважаем выбранный тип питания: dry → только сухой, wet → только влажный, multi → обе части.
        food_type = (filters.food_type or 'multi').strip().lower()
        if food_type == 'dry':
            wet, wet_alts = None, []
        elif food_type == 'wet':
            dry, dry_alts = None, []
        # Лакомства (только «Продвинутый») = 10% дневных калорий; корм ужимаем до 90%,
        # чтобы суммарно вышло ровно 100% нормы, а не 110%. В «Базовом» лакомство добавляется вручную.
        treat = ration.get('treat') if filters.variant == 'advanced' else None
        treat_share = 0.1 if treat else 0.0
        main_scale = 1.0 - treat_share
        if dry and wet:
            # Доли калорий из выбранного соотношения (multi_ratio_preset), а не жёсткие 70/30.
            dist = self._get_calorie_distribution(pet, filters)
            dry_share = (dist.get('dry_food') or 0.6) * main_scale
            wet_share = (dist.get('wet_food') or 0.4) * main_scale
            slots = [(dry, dry_share, dry_alts), (wet, wet_share, wet_alts)]
        elif dry:
            slots = [(dry, main_scale, dry_alts)]
        elif wet:
            slots = [(wet, main_scale, wet_alts)]
        else:
            slots = []
        if treat:
            slots.append((treat, treat_share, ration.get('treat_alternatives') or []))
        components = []
        for cand, share, alts in slots:
            off = cand['offer']
            kcal100 = cand['kcal_per_100g']
            pack_g = (off['package_weight_kg'] or 0) * 1000
            comp_kcal = (mer or 0) * share
            dg = round(comp_kcal / kcal100 * 100, 1) if (mer and kcal100) else None
            days = round(pack_g / dg, 1) if (dg and pack_g) else None
            packages = max(1, math.ceil(period * dg / pack_g)) if (dg and pack_g) else 1
            ptype = (cand['food_form'] + '_food') if cand['food_form'] in ('dry', 'wet') else 'treat'
            reason = cand.get('recommendation_reason')
            score_dbg = {
                'suitability_score': cand.get('suitability_score'),
                'business_score': cand.get('business_score'),
                'business_score_raw': cand.get('business_score_raw'),
                'final_score': cand.get('final_score'),
                'business_reasons': cand.get('business_reasons') or [],
            }
            prod_id, sku_id, image_url = shop_ids_for(cand['recipe_id'], off['id'])
            comp_warnings = list(cand['warnings'] or [])
            if not (prod_id and sku_id):
                comp_warnings.append('Товар пока не доступен к покупке (нет в витрине)')
            components.append(FoodComponent(
                product_id=prod_id,
                sku_id=sku_id,
                product_name=cand['recipe_name'],
                image_url=image_url,
                product_type=ptype,
                match_score=int(cand.get('score') or 50),
                daily_grams=dg,
                daily_kcal=round(comp_kcal, 0) if comp_kcal else None,
                price=Decimal(str(off['price'])) if off['price'] is not None else None,
                weight_grams=int(pack_g) if pack_g else None,
                days_supply=int(days) if days else None,
                packages_needed=packages,
                kcal_per_100g=kcal100,
                nutrition_protein=cand['protein_percent'],
                nutrition_fat=cand['fat_percent'],
                warnings=comp_warnings,
                reasons=[reason] if reason else [],
                badges=['Из базы Динозаврик'],
                recipe_id=cand['recipe_id'],
                offer_id=off['id'],
                article_number=off['article_number'],
                brand=cand.get('brand'),
                source='dinozavrik',
                recommendation_reason=reason,
                score_breakdown=score_dbg,
                alternatives=[candidate_to_dto(a, share, mer, period) for a in alts],
            ))
        return components

    def get_recommendations_for_pet(self, pet, filters: Optional[FoodSearchFilters] = None) -> FeedingPlan:
        """
        Получить рекомендации кормов для питомца.
        
        Args:
            pet: Объект Pet
            filters: Дополнительные фильтры (опционально)
            
        Returns:
            FeedingPlan с рекомендованными компонентами
        """
        # Всегда строим базовые фильтры из PetID и накладываем override от UI.
        # Иначе POST /feeding-plan/ передает только food_type/variant/period и теряет ограничения PetID.
        base_filters = self._build_filters_from_pet(pet)
        if filters is None:
            filters = base_filters
        else:
            # overlay только пользовательских параметров, не затирая PetID-derived safety полей
            base_filters.food_type = filters.food_type or base_filters.food_type
            base_filters.variant = filters.variant or base_filters.variant
            base_filters.period_days = filters.period_days or base_filters.period_days
            base_filters.multi_ratio_preset = getattr(filters, 'multi_ratio_preset', None) or base_filters.multi_ratio_preset
            base_filters.preferred_brands = list(filters.preferred_brands or [])
            base_filters.priority_brands = list(filters.priority_brands or [])
            base_filters.min_price = filters.min_price
            base_filters.max_price = filters.max_price
            filters = base_filters
        
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
        if getattr(settings, 'FOOD_RECOMMENDATION_SOURCE', 'legacy') == 'recipe':
            plan.components = self._select_components_from_recipes(pet, filters, calorie_result)
        elif filters.food_type == 'dry':
            plan.components = self._select_dry_food(filters)
        elif filters.food_type == 'wet':
            plan.components = self._select_wet_food(filters)
        else:  # multi
            plan.components = self._select_multi_food(filters)
        
        # Добавляем лакомства
        treats = self._select_treats(filters) if getattr(settings, 'FOOD_RECOMMENDATION_SOURCE', 'legacy') == 'legacy' else []
        if treats:
            plan.components.extend(treats)
        
        # Добавляем добавки для продвинутого набора
        if filters.variant == 'advanced' and getattr(settings, 'FOOD_RECOMMENDATION_SOURCE', 'legacy') == 'legacy':
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
        
        # Edge case handling
        plan = self._handle_edge_cases(plan, pet, filters, calorie_result)
        
        # Валидация выходных значений
        validation_warnings = output_validator.validate(plan)
        if validation_warnings:
            plan.warnings.extend(validation_warnings)
        
        return plan
    
    def _handle_edge_cases(self, plan: FeedingPlan, pet, filters: FoodSearchFilters, calorie_result) -> FeedingPlan:
        """
        Обработка крайних случаев:
        - Неизвестная порода
        - Конфликт калорий/БЖУ
        - Пустой каталог
        """
        # Edge case 1: Неизвестная порода
        breed = getattr(pet, 'breed', None)
        if breed is None or getattr(breed, 'name', '').lower() in ['дворняга', 'метис', 'mixed', 'unknown', '']:
            plan.warnings.append("Порода не указана — используются усредненные рекомендации")
            # Добавляем рекомендацию по размеру
            if not filters.size_category and filters.weight_kg:
                estimated_size = self._estimate_size_from_weight(filters.species, filters.weight_kg)
                plan.recommendations.append(f"Размер определён по весу: {estimated_size}")

        # Edge case 2: Пустой каталог (нет компонентов)
        if not plan.components:
            plan.warnings.append("Не найдено подходящих кормов. Расширены критерии поиска.")
            # Попытка найти хоть что-то с расширенными фильтрами
            fallback_filters = self._create_relaxed_filters(filters)
            fallback_components = self._select_fallback_food(fallback_filters)
            if fallback_components:
                plan.components = fallback_components
                plan.warnings.append("Подобраны корма с ослабленными ограничениями")
            else:
                plan.warnings.append("Каталог пуст или нет доступных товаров")

        # Edge case 3: Конфликт калорий/БЖУ
        if plan.components and calorie_result.macro_targets:
            for comp in plan.components:
                if comp.product_type in ['dry_food', 'wet_food']:
                    if comp.product_id is None:
                        continue  # режим 'recipe': нет shop.Product — БЖУ-валидация по нему неприменима
                    try:
                        from apps.shop.models import Product
                        product = Product.objects.select_related('food_details').get(id=comp.product_id)
                        protein_t = calorie_result.macro_targets.get('protein', {})
                        fat_t = calorie_result.macro_targets.get('fat', {})
                        fiber_t = calorie_result.macro_targets.get('fiber', {})
                        macro_targets_for_score = {
                            'protein': {
                                'min': float(protein_t.get('min', 20)),
                                'max': float(protein_t.get('max', 40))
                            },
                            'fat': {
                                'min': float(fat_t.get('min', 10)),
                                'max': float(fat_t.get('max', 25))
                            },
                            'fiber': {
                                'min': float(fiber_t.get('min', 1)),
                                'max': float(fiber_t.get('max', 10))
                            }
                        }
                        score = ration_balancer.score_product(
                            product,
                            comp.daily_kcal or calorie_result.mer,
                            macro_targets_for_score,
                            comp.daily_grams or 100
                        )
                        if score.warnings:
                            comp.warnings.extend(score.warnings)
                        comp.bju_score = score.total_score
                        comp.bju_valid = score.is_valid
                        if not score.is_valid:
                            plan.warnings.append(f"{comp.product_name}: БЖУ не соответствует целевым диапазонам")
                    except Exception as e:
                        logger.warning(f"Ошибка проверки БЖУ для {comp.product_id}: {e}")

        return plan
    
    def _estimate_size_from_weight(self, species: str, weight_kg: float) -> str:
        """Оценить размер питомца по весу."""
        if species == 'cat':
            if weight_kg < 3:
                return 'small'
            elif weight_kg < 6:
                return 'medium'
            else:
                return 'large'
        else:  # dog
            if weight_kg < 5:
                return 'toy'
            elif weight_kg < 10:
                return 'small'
            elif weight_kg < 25:
                return 'medium'
            elif weight_kg < 45:
                return 'large'
            else:
                return 'giant'
    
    def _create_relaxed_filters(self, filters: FoodSearchFilters) -> FoodSearchFilters:
        """Создать ослабленные фильтры для fallback."""
        relaxed = FoodSearchFilters(
            species=filters.species,
            age_months=filters.age_months,
            size_category=filters.size_category,
            food_type=filters.food_type,
            variant=filters.variant,
            period_days=filters.period_days,
            daily_calories=filters.daily_calories,
            # Ослабляем:
            min_price=None,
            max_price=None,
            preferred_brands=[],
            priority_brands=[],
            # Сохраняем критичные:
            hard_exclusion_tokens=filters.hard_exclusion_tokens,
            requires_hypoallergenic=False,  # Ослабляем
        )
        return relaxed
    
    def _select_fallback_food(self, filters: FoodSearchFilters) -> List[FoodComponent]:
        """Подбор fallback-корма с минимальными ограничениями."""
        from apps.shop.models import Product
        
        if filters.food_type == 'wet':
            wet_codes = ['food.wet', 'food.canned', 'food.pouches', 'food.pate']
            wet_codes = self._expand_category_codes_for_species(wet_codes, filters.species)
            queryset = Product.objects.filter(
                product_group='food',
                new_category__code__in=wet_codes,
                animal_type__in=[filters.species, 'all'],
                is_available=True,
            ).select_related('food_details')[:10]
        else:
            dry_codes = ['food.dry', 'food.semi_moist', 'food.holistic']
            dry_codes = self._expand_category_codes_for_species(dry_codes, filters.species)
            queryset = Product.objects.filter(
                product_group='food',
                new_category__code__in=dry_codes,
                animal_type__in=[filters.species, 'all'],
                is_available=True,
            ).select_related('food_details')[:10]
        
        components = []
        for product in queryset:
            kcal_per_100g = self._get_product_kcal(product, 'dry')
            if not kcal_per_100g:
                kcal_per_100g = 350  # fallback
            
            daily_kcal = filters.daily_calories or 500
            daily_grams = (daily_kcal / kcal_per_100g) * 100 if kcal_per_100g > 0 else 100
            
            components.append(FoodComponent(
                product_id=product.id,
                product_name=product.name,
                product_type='dry_food' if filters.food_type != 'wet' else 'wet_food',
                match_score=50,  # Низкий score для fallback
                daily_grams=round(daily_grams),
                daily_kcal=round(daily_kcal),
                price=product.price,
                warnings=["Подобран с ослабленными критериями"],
            ))
        
        return components[:1] if components else []
    
    def _build_filters_from_pet(self, pet) -> FoodSearchFilters:
        """
        Построить фильтры на основе данных PetID.
        """
        profile = self._build_nutrition_profile(pet)
        # BCS
        bcs_raw = getattr(pet, 'body_condition_score', None)
        try:
            bcs_int = int(bcs_raw) if bcs_raw is not None else None
        except (ValueError, TypeError):
            bcs_int = None

        filters = FoodSearchFilters(
            species=profile.species or 'dog',
            size_category=profile.size_category,
            age_months=profile.age_months,
            nutrition_profile=profile,
            allergy_codes=list(profile.food_allergy_codes),
            food_allergy_codes=list(profile.food_allergy_codes),
            excluded_ingredients=[e.ingredient_name for e in (profile.exclusions or [])],
            health_condition_codes=[hc.code for hc in (profile.health_conditions or [])],
            hard_exclusion_tokens=list(profile.hard_exclusion_tokens),
            soft_exclusion_tokens=list(profile.soft_exclusion_tokens),
            requires_hypoallergenic=bool(profile.food_allergy_codes),
            bcs=bcs_int,
            reproductive_state=profile.reproductive_state,
        )
        
        # Добавляем породные риски аллергий
        if pet.breed:
            breed_allergy_risks = pet.breed.allergy_risks or []
            for risk in breed_allergy_risks:
                if risk.get('risk_level') in ['common', 'high']:
                    code = risk.get('allergen_code')
                    if code:
                        normalized = self._normalize_allergy_code(filters.species, code)
                        if normalized and normalized not in filters.allergy_codes:
                            filters.warnings.append(
                                f"Породный риск аллергии: {normalized}"
                            )

        # Беременность/лактация: допускаем puppy/kitten корма
        if profile.reproductive_state in ('pregnant', 'lactating'):
            juvenile_group = 'puppy' if filters.species == 'dog' else 'kitten'
            filters.override_age_group = juvenile_group
            filters.warnings.append(
                f"Для беременных/лактирующих допускаются {juvenile_group} корма "
                "(повышенная калорийность и белок)"
            )
        
        return filters

    def _build_nutrition_profile(self, pet) -> PetNutritionProfile:
        """
        Собрать данные PetID и связанных таблиц в единый профиль питания.
        """
        species = getattr(pet, "species", None) or "dog"
        profile = PetNutritionProfile(
            species=species,
            age_months=getattr(pet, "age_months", None),
            size_category=getattr(pet, "size_category", None),
            weight_kg=float(pet.weight) if getattr(pet, "weight", None) else None,
            is_neutered=getattr(pet, "is_neutered", None),
            activity_level=getattr(pet, "activity_level", None),
            reproductive_state=getattr(pet, "reproductive_state", None),
            sensitive_digestion=bool(getattr(pet, "sensitive_digestion", False)),
        )

        # Аллергии (с типом аллергена)
        try:
            from .nutrition_models import PetAllergy
            rows = (
                PetAllergy.objects.filter(pet=pet, is_active=True)
                .select_related("allergy")
            )
            profile.allergies = [
                PetAllergyInfo(
                    code=self._normalize_allergy_code(species, pa.allergy.code),
                    allergen_type=getattr(pa.allergy, "allergen_type", None),
                    severity=getattr(pa, "severity", None),
                )
                for pa in rows
                if getattr(pa, "allergy", None)
            ]
        except Exception as exc:
            logger.warning(f"Error loading allergies: {exc}")

        # Заболевания (с противопоказаниями)
        try:
            from .nutrition_models import PetHealthCondition
            rows = (
                PetHealthCondition.objects.filter(pet=pet, is_active=True)
                .select_related("condition")
            )
            profile.health_conditions = [
                PetHealthConditionInfo(
                    code=getattr(r.condition, "code", ""),
                    category=getattr(r.condition, "category", None),
                    priority=getattr(r.condition, "priority", None),
                    direction=getattr(r.condition, "direction", None),
                    contraindicated_ingredients=list(getattr(r.condition, "contraindicated_ingredients", None) or []),
                )
                for r in rows
                if getattr(r, "condition", None)
            ]
        except Exception as exc:
            logger.warning(f"Error loading health conditions: {exc}")

        # Исключения продуктов/ингредиентов (с причиной)
        try:
            from .nutrition_models import PetFoodExclusion
            rows = PetFoodExclusion.objects.filter(pet=pet)
            profile.exclusions = [
                PetFoodExclusionInfo(
                    ingredient_code=getattr(e, "ingredient_code", "") or "",
                    ingredient_name=getattr(e, "ingredient_name", "") or "",
                    reason=getattr(e, "reason", "") or "other",
                )
                for e in rows
            ]
        except Exception as exc:
            logger.warning(f"Error loading food exclusions: {exc}")

        return profile
    
    def _select_dry_food(self, filters: FoodSearchFilters) -> List[FoodComponent]:
        """
        Подбор сухого корма с учётом возраста, размера, аллергий и цены.
        """
        from apps.shop.models import Product
        from django.db.models import Avg
        
        dry_codes = ['food.dry', 'food.semi_moist', 'food.holistic', 'food.hypoallergenic', 'food.diet']
        dry_codes = self._expand_category_codes_for_species(dry_codes, filters.species)
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
        queryset = self._apply_age_filters(
            queryset, filters.species, filters.age_months,
            override_age_group=getattr(filters, 'override_age_group', None)
        )
        
        # Фильтрация по размеру для собак
        if filters.species == 'dog' and filters.size_category:
            # В новой структуре размер чаще хранится в Product.size_group (mini/small/medium/large/giant/all).
            # Поле FoodDetails.target_size может быть NULL.
            # Поэтому: если FoodDetails.target_size задан — фильтруем по нему; иначе — по Product.size_group.
            pet_size = filters.size_category
            size_group_match = Q(size_group__isnull=True) | Q(size_group='all')
            if pet_size == 'toy':
                size_group_match |= Q(size_group='mini')
            else:
                size_group_match |= Q(size_group=pet_size)

            queryset = queryset.filter(
                (Q(food_details__target_size__isnull=False) & (Q(food_details__target_size='all') | Q(food_details__target_size=pet_size)))
                | (Q(food_details__target_size__isnull=True) & size_group_match)
            )

        general_queryset = queryset
        gi_applied = False

        # ЖКТ-режим: подбираем специализированные корма
        if filters.has_gi_issues:
            gi_codes = self._expand_category_codes_for_species(['food.diet', 'food.hypoallergenic'], filters.species)
            gi_queryset = queryset.filter(
                Q(food_details__compatibility_group='therapeutic_digestive') |
                Q(food_details__health_conditions__overlap=['digestive', 'gastro', 'gastrointestinal']) |
                Q(new_category__code__in=gi_codes)
            )
            if gi_queryset.exists():
                queryset = gi_queryset
                gi_applied = True
            else:
                filters.warnings.append(
                    "Не найдены специализированные ЖКТ-корма, использован общий подбор"
                )

        # HARD FILTER: аллергии → только гипоаллергенные (по требованию)
        if getattr(filters, "requires_hypoallergenic", False):
            hypo_qs = queryset.filter(
                Q(food_details__is_hypoallergenic=True)
                | Q(is_hypoallergenic=True)
                | Q(food_details__compatibility_group="hypoallergenic")
            )
            if not hypo_qs.exists():
                filters.warnings.append("Не найдено гипоаллергенных кормов под выбранный слот (dry).")
            queryset = hypo_qs

        # HARD FILTER: исключения (intolerance/medical/allergy + contraindicated)
        hard_tokens = getattr(filters, "hard_exclusion_tokens", None) or []
        if hard_tokens:
            excluded_qs = queryset.exclude(food_details__ingredients__overlap=hard_tokens).exclude(
                food_details__allergens__overlap=hard_tokens
            )
            if not excluded_qs.exists():
                filters.warnings.append("Все dry-корма исключены из-за непереносимости/противопоказаний.")
            queryset = excluded_qs
        
        # Фильтрация по цене
        def apply_price(qs):
            if filters.min_price:
                qs = qs.filter(price__gte=filters.min_price)
            if filters.max_price:
                qs = qs.filter(price__lte=filters.max_price)
            return qs

        priced_queryset = apply_price(queryset)
        if (filters.min_price or filters.max_price) and not priced_queryset.exists():
            # guided_relax: ослабляем только цену, сохраняя safety-ограничения
            filters.warnings.append("Ослаблен фильтр по цене: не найдено подходящих товаров в заданном диапазоне")
        else:
            queryset = priced_queryset

        def build_scored(qs):
            # Вычисляем среднюю цену для корректировки score
            avg_price = qs.aggregate(avg=Avg('price'))['avg'] or Decimal('1000')
            filters.avg_price = avg_price  # Передаём в фильтры для использования в _evaluate_product

            products = list(qs.order_by('price')[:100])  # Берём больше для лучшей выборки
            breed_rec_ids = list(filters.breed_recommendations.keys()) if filters.breed_recommendations else []
            if breed_rec_ids:
                breed_products = list(qs.filter(id__in=breed_rec_ids))
                product_ids = {p.id for p in products}
                for bp in breed_products:
                    if bp.id not in product_ids:
                        products.append(bp)

            scored_local = []
            for product in products:
                score, reasons, warnings, badges, breakdown = self._evaluate_product(product, filters)
                if score <= 0:
                    continue

                kcal_per_100g = self._get_product_kcal(product, 'dry')
                if not kcal_per_100g:
                    continue

                # Доля калорий из выбранного соотношения (multi_ratio_preset) — размер порции пересчитывается гибко
                calorie_percent = (filters.calorie_distribution or {}).get('dry_food', 0.90)
                component_kcal = (filters.daily_calories or 0) * calorie_percent

                if component_kcal and kcal_per_100g:
                    raw_grams = (component_kcal / kcal_per_100g) * 100
                    daily_grams = round(raw_grams)
                else:
                    daily_grams = None

                macro_targets = filters.macro_targets or {}
                bju_score = None
                bju_avg_cov = None
                bju_delta = None
                bju_over = None
                bju_valid = None
                kcal_delta_pct = None
                try:
                    score_obj = ration_balancer.score_product(
                        product,
                        float(component_kcal or 0),
                        macro_targets,
                        float(daily_grams or 0),
                    )
                    bju_score = score_obj.total_score
                    kcal_delta_pct = score_obj.kcal_delta_pct
                    protein_dm = score_obj.details.get('protein_dm')
                    fat_dm = score_obj.details.get('fat_dm')
                    if protein_dm is not None and fat_dm is not None:
                        p_mid = (macro_targets.get('protein', {}).get('min', 0) + macro_targets.get('protein', {}).get('max', 0)) / 2
                        f_mid = (macro_targets.get('fat', {}).get('min', 0) + macro_targets.get('fat', {}).get('max', 0)) / 2
                        p_min = macro_targets.get('protein', {}).get('min', 0)
                        p_max = macro_targets.get('protein', {}).get('max', 0)
                        f_min = macro_targets.get('fat', {}).get('min', 0)
                        f_max = macro_targets.get('fat', {}).get('max', 0)
                        p_cov = (protein_dm / p_mid * 100) if p_mid else None
                        f_cov = (fat_dm / f_mid * 100) if f_mid else None
                        if p_cov is not None and f_cov is not None:
                            bju_avg_cov = (p_cov + f_cov) / 2
                            bju_delta = abs(bju_avg_cov - 100)
                            bju_over = bju_avg_cov > 100
                            # BJU valid (±15% от диапазона)
                            bju_valid = (
                                (protein_dm >= p_min * 0.85 and protein_dm <= p_max * 1.15) and
                                (fat_dm >= f_min * 0.85 and fat_dm <= f_max * 1.15)
                            )
                except Exception:
                    pass

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
                    score_breakdown={
                        **breakdown,
                        'bju_score': bju_score,
                        'bju_avg_cov': bju_avg_cov,
                        'bju_delta': bju_delta,
                        'bju_over': bju_over,
                        'bju_valid': bju_valid,
                        'kcal_delta_pct': kcal_delta_pct,
                    },
                    short_description=self._get_short_description(product),
                    image_url=getattr(product, 'image_url', None) or getattr(product, 'image', None),
                    shop_url=f"/shop/product/{product.id}",
                    kcal_per_100g=kcal_per_100g,
                    **nutrition,
                )

                if daily_grams and daily_grams > 0:
                    packages_needed, days_supply, breakdown2, summary = self._optimize_packages_for_period(
                        product, daily_grams, filters.period_days
                    )
                    component.packages_needed = packages_needed
                    component.days_supply = days_supply
                    component.package_breakdown = breakdown2
                    component.package_summary = summary
                else:
                    component.packages_needed = 1
                    component.days_supply = filters.period_days

                scored_local.append(component)
            return scored_local

        scored = build_scored(queryset)

        # Guided relax для ЖКТ: если попытались сузить до GI-кормов, но итог пустой — откатываемся к общему подбору
        if not scored and gi_applied:
            filters.warnings.append("ЖКТ-режим ослаблен: не найдено подходящих кормов с учетом возраста/размера")
            queryset = general_queryset
            # повторяем safety-фильтры поверх общего пула
            if getattr(filters, "requires_hypoallergenic", False):
                queryset = queryset.filter(
                    Q(food_details__is_hypoallergenic=True)
                    | Q(is_hypoallergenic=True)
                    | Q(food_details__compatibility_group="hypoallergenic")
                )
            hard_tokens2 = getattr(filters, "hard_exclusion_tokens", None) or []
            if hard_tokens2:
                queryset = queryset.exclude(food_details__ingredients__overlap=hard_tokens2).exclude(
                    food_details__allergens__overlap=hard_tokens2
                )
            priced_queryset2 = apply_price(queryset)
            if not ((filters.min_price or filters.max_price) and not priced_queryset2.exists()):
                queryset = priced_queryset2
            scored = build_scored(queryset)
        
        # Сортируем по score (desc), затем по цене (asc) - лучшее соотношение качества/цены
        def bju_sort_key(item):
            breakdown = item.score_breakdown or {}
            bju_valid = breakdown.get('bju_valid')
            bju_over = breakdown.get('bju_over')
            bju_delta = breakdown.get('bju_delta')
            kcal_delta = breakdown.get('kcal_delta_pct')
            delta = bju_delta if bju_delta is not None else 999
            kcal_abs = abs(kcal_delta) if kcal_delta is not None else 999
            kcal_in_range = kcal_abs <= 15
            return (
                0 if bju_valid else 1,
                0 if not bju_over else 1,
                delta,
                0 if kcal_in_range else 1,
                kcal_abs,
                -float(breakdown.get('bju_score') or 0),
                -item.match_score,
                float(item.price or 0),
            )

        scored.sort(key=bju_sort_key)
        
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
        wet_codes = self._expand_category_codes_for_species(wet_codes, filters.species)
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
        queryset = self._apply_age_filters(
            queryset, filters.species, filters.age_months,
            override_age_group=getattr(filters, 'override_age_group', None)
        )
        
        # Фильтрация по размеру для собак
        if filters.species == 'dog' and filters.size_category:
            pet_size = filters.size_category
            size_group_match = Q(size_group__isnull=True) | Q(size_group='all')
            if pet_size == 'toy':
                size_group_match |= Q(size_group='mini')
            else:
                size_group_match |= Q(size_group=pet_size)

            queryset = queryset.filter(
                (Q(food_details__target_size__isnull=False) & (Q(food_details__target_size='all') | Q(food_details__target_size=pet_size)))
                | (Q(food_details__target_size__isnull=True) & size_group_match)
            )

        general_queryset = queryset
        gi_applied = False

        # ЖКТ-режим: подбираем специализированные корма
        if filters.has_gi_issues:
            gi_codes = self._expand_category_codes_for_species(['food.diet', 'food.hypoallergenic'], filters.species)
            gi_queryset = queryset.filter(
                Q(food_details__compatibility_group='therapeutic_digestive') |
                Q(food_details__health_conditions__overlap=['digestive', 'gastro', 'gastrointestinal']) |
                Q(new_category__code__in=gi_codes)
            )
            if gi_queryset.exists():
                queryset = gi_queryset
                gi_applied = True
            else:
                filters.warnings.append(
                    "Не найдены специализированные ЖКТ-корма, использован общий подбор"
                )

        # HARD FILTER: аллергии → только гипоаллергенные (по требованию)
        if getattr(filters, "requires_hypoallergenic", False):
            hypo_qs = queryset.filter(
                Q(food_details__is_hypoallergenic=True)
                | Q(is_hypoallergenic=True)
                | Q(food_details__compatibility_group="hypoallergenic")
            )
            if not hypo_qs.exists():
                filters.warnings.append("Не найдено гипоаллергенных кормов под выбранный слот (wet).")
            queryset = hypo_qs

        # HARD FILTER: исключения (intolerance/medical/allergy + contraindicated)
        hard_tokens = getattr(filters, "hard_exclusion_tokens", None) or []
        if hard_tokens:
            excluded_qs = queryset.exclude(food_details__ingredients__overlap=hard_tokens).exclude(
                food_details__allergens__overlap=hard_tokens
            )
            if not excluded_qs.exists():
                filters.warnings.append("Все wet-корма исключены из-за непереносимости/противопоказаний.")
            queryset = excluded_qs
        
        def apply_price(qs):
            if filters.min_price:
                qs = qs.filter(price__gte=filters.min_price)
            if filters.max_price:
                qs = qs.filter(price__lte=filters.max_price)
            return qs

        priced_queryset = apply_price(queryset)
        if (filters.min_price or filters.max_price) and not priced_queryset.exists():
            filters.warnings.append("Ослаблен фильтр по цене: не найдено подходящих товаров в заданном диапазоне")
        else:
            queryset = priced_queryset
        
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
            score, reasons, warnings, badges, breakdown = self._evaluate_product(product, filters)
            
            if score > 0:
                # ВАЖНО: влажный корм ~80-120 ккал/100г (из-за 75-82% влаги)
                kcal_per_100g = self._get_product_kcal(product, 'wet')
                if not kcal_per_100g:
                    continue
                
                # Доля калорий из выбранного соотношения (multi_ratio_preset) — размер порции пересчитывается гибко
                calorie_percent = (filters.calorie_distribution or {}).get('wet_food', 0.90)
                component_kcal = (filters.daily_calories or 0) * calorie_percent
                
                # Граммы с ОКРУГЛЕНИЕМ до 10г
                if component_kcal and kcal_per_100g:
                    raw_grams = (component_kcal / kcal_per_100g) * 100
                    daily_grams = round(raw_grams)
                else:
                    daily_grams = None
                
                macro_targets = filters.macro_targets or {}
                bju_score = None
                bju_avg_cov = None
                bju_delta = None
                bju_over = None
                bju_valid = None
                kcal_delta_pct = None
                try:
                    score_obj = ration_balancer.score_product(
                        product,
                        float(component_kcal or 0),
                        macro_targets,
                        float(daily_grams or 0),
                    )
                    bju_score = score_obj.total_score
                    kcal_delta_pct = score_obj.kcal_delta_pct
                    protein_dm = score_obj.details.get('protein_dm')
                    fat_dm = score_obj.details.get('fat_dm')
                    if protein_dm is not None and fat_dm is not None:
                        p_mid = (macro_targets.get('protein', {}).get('min', 0) + macro_targets.get('protein', {}).get('max', 0)) / 2
                        f_mid = (macro_targets.get('fat', {}).get('min', 0) + macro_targets.get('fat', {}).get('max', 0)) / 2
                        p_min = macro_targets.get('protein', {}).get('min', 0)
                        p_max = macro_targets.get('protein', {}).get('max', 0)
                        f_min = macro_targets.get('fat', {}).get('min', 0)
                        f_max = macro_targets.get('fat', {}).get('max', 0)
                        p_cov = (protein_dm / p_mid * 100) if p_mid else None
                        f_cov = (fat_dm / f_mid * 100) if f_mid else None
                        if p_cov is not None and f_cov is not None:
                            bju_avg_cov = (p_cov + f_cov) / 2
                            bju_delta = abs(bju_avg_cov - 100)
                            bju_over = bju_avg_cov > 100
                            bju_valid = (
                                (protein_dm >= p_min * 0.85 and protein_dm <= p_max * 1.15) and
                                (fat_dm >= f_min * 0.85 and fat_dm <= f_max * 1.15)
                            )
                except Exception:
                    pass

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
                    score_breakdown={
                        **breakdown,
                        'bju_score': bju_score,
                        'bju_avg_cov': bju_avg_cov,
                        'bju_delta': bju_delta,
                        'bju_over': bju_over,
                        'bju_valid': bju_valid,
                        'kcal_delta_pct': kcal_delta_pct,
                    },
                    # Расширенные поля для UI
                    short_description=self._get_short_description(product),
                    image_url=getattr(product, 'image_url', None) or getattr(product, 'image', None),
                    shop_url=f"/shop/product/{product.id}",
                    kcal_per_100g=kcal_per_100g,
                    # БЖУ и минералы
                    **nutrition,
                )
                
                if daily_grams and daily_grams > 0:
                    packages_needed, days_supply, breakdown, summary = self._optimize_packages_for_period(
                        product, daily_grams, filters.period_days
                    )
                    component.packages_needed = packages_needed
                    component.days_supply = days_supply
                    component.package_breakdown = breakdown
                    component.package_summary = summary
                else:
                    component.packages_needed = 1
                    component.days_supply = filters.period_days
                
                scored.append(component)

        # Guided relax для ЖКТ: если GI-режим не дал результатов — откат к общему подбору
        if not scored and gi_applied:
            filters.warnings.append("ЖКТ-режим ослаблен (wet): не найдено подходящих кормов с учетом возраста/размера")
            queryset = general_queryset
            if getattr(filters, "requires_hypoallergenic", False):
                queryset = queryset.filter(
                    Q(food_details__is_hypoallergenic=True)
                    | Q(is_hypoallergenic=True)
                    | Q(food_details__compatibility_group="hypoallergenic")
                )
            hard_tokens2 = getattr(filters, "hard_exclusion_tokens", None) or []
            if hard_tokens2:
                queryset = queryset.exclude(food_details__ingredients__overlap=hard_tokens2).exclude(
                    food_details__allergens__overlap=hard_tokens2
                )
            priced_qs2 = apply_price(queryset)
            if not ((filters.min_price or filters.max_price) and not priced_qs2.exists()):
                queryset = priced_qs2

            avg_price2 = queryset.aggregate(avg=Avg('price'))['avg'] or Decimal('200')
            filters.avg_price = avg_price2
            products2 = list(queryset.order_by('price')[:100])
            for product in products2:
                score_val, reasons2, warnings2, badges2, breakdown2 = self._evaluate_product(product, filters)
                if score_val > 0:
                    kcal_per_100g = self._get_product_kcal(product, 'wet')
                    if not kcal_per_100g:
                        continue
                    calorie_percent = (filters.calorie_distribution or {}).get('wet_food', 0.90)
                    comp_kcal = (filters.daily_calories or 0) * calorie_percent
                    if comp_kcal and kcal_per_100g:
                        raw_grams = (comp_kcal / kcal_per_100g) * 100
                        daily_grams = round(raw_grams / 10) * 10
                    else:
                        daily_grams = None
                    nutrition = self._get_nutrition_data(product)
                    scored.append(FoodComponent(
                        product_id=product.id,
                        product_name=product.name,
                        product_type='wet_food',
                        match_score=score_val,
                        daily_grams=daily_grams,
                        daily_kcal=round(comp_kcal) if comp_kcal else None,
                        price=product.price,
                        weight_grams=self._get_product_weight_grams(product),
                        reasons=reasons2,
                        warnings=warnings2,
                        badges=badges2,
                        short_description=self._get_short_description(product),
                        image_url=getattr(product, 'image_url', None) or getattr(product, 'image', None),
                        shop_url=f"/shop/product/{product.id}",
                        kcal_per_100g=kcal_per_100g,
                        **nutrition,
                    ))

        # Сортируем по score (desc), затем по цене (asc)
        def bju_sort_key(item):
            breakdown = item.score_breakdown or {}
            bju_valid = breakdown.get('bju_valid')
            bju_over = breakdown.get('bju_over')
            bju_delta = breakdown.get('bju_delta')
            delta = bju_delta if bju_delta is not None else 999
            return (
                0 if bju_valid else 1,
                0 if not bju_over else 1,
                delta,
                -float(breakdown.get('bju_score') or 0),
                -item.match_score,
                float(item.price or 0),
            )

        scored.sort(key=bju_sort_key)
        
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
        if size and filters.species == 'dog':
            # Для лакомств также делаем fallback на Product.size_group, потому что target_size часто NULL.
            pet_size = size
            size_group_match = Q(size_group__isnull=True) | Q(size_group='all')
            if pet_size == 'toy':
                size_group_match |= Q(size_group='mini')
            else:
                size_group_match |= Q(size_group=pet_size)

            queryset = queryset.filter(
                (Q(food_details__target_size__isnull=False) & (Q(food_details__target_size='all') | Q(food_details__target_size=pet_size)))
                | (Q(food_details__target_size__isnull=True) & size_group_match)
            )

        # HARD FILTER: аллергии → только гипоаллергенные (по требованию)
        if getattr(filters, "requires_hypoallergenic", False):
            hypo_qs = queryset.filter(
                Q(food_details__is_hypoallergenic=True)
                | Q(is_hypoallergenic=True)
                | Q(food_details__compatibility_group="hypoallergenic")
            )
            if not hypo_qs.exists():
                filters.warnings.append("Не найдено гипоаллергенных лакомств, лакомства исключены.")
                return []
            queryset = hypo_qs

        # HARD FILTER: исключения (intolerance/medical/allergy + contraindicated)
        hard_tokens = getattr(filters, "hard_exclusion_tokens", None) or []
        if hard_tokens:
            excluded_qs = queryset.exclude(food_details__ingredients__overlap=hard_tokens).exclude(
                food_details__allergens__overlap=hard_tokens
            )
            if not excluded_qs.exists():
                filters.warnings.append("Все лакомства исключены из-за непереносимости/противопоказаний.")
                return []
            queryset = excluded_qs
        
        products = list(queryset.order_by('price')[:200])
        
        if not products:
            return []
        
        # Лакомства не участвуют в расчёте дневной калорийности — подбираем по виду/возрасту как опцию
        treat_calorie_percent = (filters.calorie_distribution or {}).get('treats', 0)
        treat_kcal = (filters.daily_calories or 0) * treat_calorie_percent if treat_calorie_percent > 0 else 0
        
        # Сортируем по релевантности (+ эвристика мягкости для пожилых/проблем зубов)
        age_group = self._get_age_category(filters.species, filters.age_months)
        has_dental_markers = any(
            m in (c or "").lower()
            for c in (filters.health_condition_codes or [])
            for m in ["dental", "teeth", "tooth", "gingivitis", "periodont"]
        )
        needs_soft = age_group == 'senior' or has_dental_markers

        def treat_softness_bias(prod: Any) -> int:
            name = (getattr(prod, "name", "") or "").lower()
            # "мягкие" и "жесткие" ловим по ключевым словам (категории глубже пока нет)
            soft_kw = ["мягк", "soft", "chewy", "палочк", "стик", "stick", "колбас", "saus", "pate", "паштет"]
            hard_kw = ["кость", "bone", "жеват", "chew", "dental", "рог", "копыт", "трахе", "сухож", "уши", "быч", "жилка", "сушен", "jerky", "hard", "тверд"]
            soft_hit = any(k in name for k in soft_kw)
            hard_hit = any(k in name for k in hard_kw)
            if needs_soft:
                if soft_hit and not hard_hit:
                    return 8
                if hard_hit and not soft_hit:
                    return -12
            else:
                # для взрослых: зубные палочки допустимы, но очень жесткие "кости/рога" всё равно не фаворит
                if hard_hit and any(k in name for k in ["рог", "копыт", "кость", "bone"]):
                    return -6
            return 0

        scored_products = []
        for product in products:
            score, reasons, warnings, badges, breakdown = self._evaluate_product(product, filters)
            score = score + treat_softness_bias(product)
            scored_products.append((product, score, reasons, warnings, badges, breakdown))
        
        scored_products.sort(key=lambda x: x[1], reverse=True)
        
        # Возвращаем лучшее лакомство: подбор по виду/возрасту; в калорийность рациона не входит
        if scored_products:
            product, score, reasons, warnings, badges, breakdown = scored_products[0]
            
            kcal_per_100g = self._get_product_kcal(product, 'treat')
            if not kcal_per_100g:
                return []
            
            # Если лакомства не входят в расчёт — рекомендуемая порция «по желанию» (1–2 шт/день)
            if treat_kcal > 0 and kcal_per_100g:
                raw_grams = (treat_kcal / kcal_per_100g) * 100
                daily_grams = max(5, round(raw_grams))
            else:
                daily_grams = 15  # рекомендуемые ~15 г/день (опционально)
            
            frequency_days = self.TREAT_FREQUENCY_DAYS
            if treat_kcal > 0:
                daily_grams = max(5, round(daily_grams / frequency_days))
            
            piece_weight = self.AVG_TREAT_PIECE_GRAMS
            pieces_per_day = max(1, round(daily_grams / piece_weight))
            
            weight_grams = self._get_product_weight_grams(product) or 200
            total_grams_needed = daily_grams * filters.period_days * 1.15
            packages_needed = max(1, math.ceil(total_grams_needed / weight_grams))
            days_supply = int((weight_grams * packages_needed) / daily_grams) if daily_grams else filters.period_days
            
            # daily_kcal = 0, чтобы не учитывать лакомства в дневной калорийности рациона
            component_daily_kcal = round(treat_kcal / frequency_days) if treat_kcal > 0 else 0
            treat_reasons = list(reasons) if reasons else ['Подходит по возрасту и размеру']
            if component_daily_kcal == 0:
                treat_reasons.append('По желанию, не входят в расчёт калорий')
            
            return [FoodComponent(
                product_id=product.id,
                product_name=product.name,
                product_type='treat',
                match_score=score,
                daily_grams=daily_grams,
                daily_kcal=component_daily_kcal,
                price=product.price,
                weight_grams=weight_grams,
                packages_needed=packages_needed,
                days_supply=days_supply,
                reasons=treat_reasons,
                warnings=warnings,
                badges=badges if badges else ['Подходит'],
                alternatives_count=len(scored_products) - 1,
                score_breakdown=breakdown,
                # Расширенные поля
                short_description=self._get_short_description(product),
                image_url=getattr(product, 'image_url', None) or getattr(product, 'image', None),
                shop_url=f"/shop/product/{product.id}",
                kcal_per_100g=kcal_per_100g,
                # Специальные поля для лакомств
                pieces_per_day=pieces_per_day,
                piece_weight_grams=piece_weight,
                treat_frequency_days=frequency_days,
            )]
        
        return []
    
    def _select_supplements(self, pet, filters: FoodSearchFilters) -> List[FoodComponent]:
        """
        Подбор добавок для продвинутого набора на основе приоритетных правил из БД.
        
        Использует SupplementRule для определения нужных добавок по приоритетам:
        - priority 0: критические (лактация, критические болезни)
        - priority 1-2: важные (рост, болезни, репродукция)
        - priority 3-4: рекомендуемые (активность, возраст)
        - priority 5+: базовые
        """
        from apps.shop.models import Product
        
        supplements = []
        age_months = pet.age_months or 24
        species = pet.species or 'dog'
        size_category = filters.size_category or 'medium'
        
        # Получаем приоритетные правила из БД
        applicable_rules = self._get_applicable_supplement_rules(pet, filters)
        
        # Группируем по типу добавки, берём правило с наивысшим приоритетом для каждого типа
        best_rules_by_type: Dict[str, Any] = {}
        for rule in applicable_rules:
            supp_type = rule.supplement_type
            if supp_type not in best_rules_by_type or rule.priority < best_rules_by_type[supp_type].priority:
                best_rules_by_type[supp_type] = rule
        
        # Сортируем по приоритету (меньше = важнее), берём топ-3
        sorted_rules = sorted(best_rules_by_type.values(), key=lambda r: r.priority)[:3]
        
        # Если правил нет — fallback на базовые витамины
        if not sorted_rules:
            sorted_rules = [type('Rule', (), {
                'supplement_type': 'vitamins',
                'reason_ru': 'Общая поддержка здоровья',
                'dosage_factor': 1.0,
                'priority': 8,
            })()]
        
        # Ищем добавки в каталоге
        for rule in sorted_rules:
            supp_type = rule.supplement_type
            reason = rule.reason_ru or f'Рекомендовано: {supp_type}'
            dosage_factor = float(rule.dosage_factor) if rule.dosage_factor else 1.0
            
            queryset = Product.objects.filter(
                animal_type__in=[species, 'all'],
                is_available=True,
            ).filter(
                Q(product_group='vitamins') |
                Q(new_category__code__startswith='food.supplements') |
                Q(food_details__product_type='supplement')
            ).select_related('food_details', 'new_category')
            
            # Ищем по типу добавки
            typed_queryset = queryset.filter(
                Q(new_category__code__icontains=supp_type) |
                Q(name__icontains=supp_type) |
                Q(description__icontains=supp_type)
            )
            
            # Фильтруем по возрасту
            typed_queryset = typed_queryset.filter(
                Q(food_details__isnull=True) |
                Q(food_details__age_min_months__isnull=True) |
                Q(food_details__age_min_months__lte=age_months)
            ).filter(
                Q(food_details__isnull=True) |
                Q(food_details__age_max_months__isnull=True) |
                Q(food_details__age_max_months__gte=age_months)
            )

            # Если по типу не нашли, пробуем любой продукт из категории добавок
            if not typed_queryset.exists():
                typed_queryset = queryset.filter(
                    Q(food_details__isnull=True) |
                    Q(food_details__age_min_months__isnull=True) |
                    Q(food_details__age_min_months__lte=age_months)
                ).filter(
                    Q(food_details__isnull=True) |
                    Q(food_details__age_max_months__isnull=True) |
                    Q(food_details__age_max_months__gte=age_months)
                )

            product = typed_queryset.first()
            if product:
                # Определяем дозировку и время приёма
                dosage_text, intake_time, intake_instructions = self._get_supplement_dosage(
                    product, supp_type, species, size_category, age_months
                )
                
                # Корректируем дозировку по фактору из правила
                if dosage_factor != 1.0:
                    dosage_text = f"{dosage_text} (×{dosage_factor})"
                
                # Расчёт упаковок на период
                weight_grams = self._get_product_weight_grams(product) or 60
                packages_needed = max(1, math.ceil(filters.period_days / 30))
                days_supply = 30 * packages_needed
                
                # Бейджи по приоритету
                priority = rule.priority
                if priority <= 1:
                    badges = ['Важно', 'Рекомендуем']
                elif priority <= 3:
                    badges = ['Рекомендуем']
                else:
                    badges = []
                
                supplements.append(FoodComponent(
                    product_id=product.id,
                    product_name=product.name,
                    product_type='supplement',
                    match_score=100 - priority * 5,  # Приоритет влияет на score
                    price=product.price,
                    weight_grams=weight_grams,
                    packages_needed=packages_needed,
                    days_supply=days_supply,
                    reasons=[reason],
                    badges=badges,
                    alternatives_count=typed_queryset.count() - 1,
                    short_description=self._get_short_description(product),
                    image_url=getattr(product, 'image_url', None) or getattr(product, 'image', None),
                    shop_url=f"/shop/product/{product.id}",
                    dosage_text=dosage_text,
                    intake_time=intake_time,
                    intake_instructions=intake_instructions,
                    supplement_type=supp_type,
                ))
        
        return supplements
    
    def _get_applicable_supplement_rules(self, pet, filters: FoodSearchFilters) -> List:
        """
        Получить применимые правила добавок из БД для данного питомца.
        """
        try:
            from .nutrition_models import SupplementRule
        except ImportError:
            return []
        
        species = pet.species or 'dog'
        age_months = pet.age_months or 24
        size_category = filters.size_category or 'medium'
        reproductive_state = getattr(pet, 'reproductive_state', None)
        activity_level = getattr(pet, 'activity_level', None)
        health_codes = filters.health_condition_codes or []
        
        # Базовый queryset
        qs = SupplementRule.objects.filter(
            is_active=True,
            scope__in=[species, 'both']
        )
        
        applicable = []
        
        for rule in qs:
            matches = False
            
            # Проверяем возрастные границы
            if rule.age_from_months is not None and age_months < rule.age_from_months:
                continue
            if rule.age_to_months is not None and age_months > rule.age_to_months:
                continue
            
            # Проверяем размер
            if rule.size_category:
                rule_sizes = [s.strip() for s in rule.size_category.split(',')]
                if size_category not in rule_sizes:
                    continue
            
            # Проверяем контекст
            ctx_type = rule.context_type
            ctx_key = rule.context_key
            
            if ctx_type == 'growth':
                if age_months < 12:
                    matches = True
            elif ctx_type == 'age':
                if 'senior' in ctx_key and age_months >= 84:
                    matches = True
                elif 'geriatric' in ctx_key and age_months >= 120:
                    matches = True
                elif 'adult' in ctx_key and 12 <= age_months < 84:
                    matches = True
            elif ctx_type == 'reproductive':
                if reproductive_state and ctx_key == reproductive_state:
                    matches = True
                elif 'lactation' in ctx_key and reproductive_state == 'lactating':
                    matches = True
                elif 'pregnancy' in ctx_key and reproductive_state == 'pregnant':
                    matches = True
            elif ctx_type == 'disease':
                disease_code = rule.disease_code or ctx_key
                for hc in health_codes:
                    if disease_code.lower() in hc.lower() or hc.lower() in disease_code.lower():
                        matches = True
                        break
            elif ctx_type == 'activity':
                if 'high' in ctx_key and activity_level in ['high', 'very_high', 'working']:
                    matches = True
            elif ctx_type == 'baseline':
                matches = True
            
            if matches:
                applicable.append(rule)
        
        return applicable
    
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

    def _get_available_skus(self, product) -> List[Dict[str, Any]]:
        """
        Доступные SKU с весом для оптимизации упаковок.
        Возвращает список dict: {sku_id, weight_grams, weight_display, is_default}.
        """
        skus: List[Dict[str, Any]] = []
        try:
            qs = product.skus.filter(available=True, weight_kg__isnull=False).order_by('-is_default', 'sort_order')
            for sku in qs:
                if not sku.weight_kg:
                    continue
                skus.append({
                    'sku_id': sku.id,
                    'weight_grams': int(float(sku.weight_kg) * 1000),
                    'weight_display': getattr(sku, 'weight_display', '') or None,
                    'is_default': bool(getattr(sku, 'is_default', False)),
                })
        except Exception:
            return []

        # Дедуп по весу: оставляем default при равенстве
        by_weight: Dict[int, Dict[str, Any]] = {}
        for s in skus:
            w = s['weight_grams']
            if w not in by_weight or (s.get('is_default') and not by_weight[w].get('is_default')):
                by_weight[w] = s
        return sorted(by_weight.values(), key=lambda x: x['weight_grams'])

    def _format_package_summary(self, breakdown: Optional[List[Dict[str, Any]]]) -> Optional[str]:
        if not breakdown:
            return None
        parts = []
        total = 0
        for b in breakdown:
            cnt = int(b.get('count') or 0)
            if cnt <= 0:
                continue
            total += cnt
            wd = b.get('weight_display')
            if wd:
                parts.append(f"{cnt}x{wd}")
            else:
                parts.append(f"{cnt}x{int(b.get('weight_grams') or 0)/1000:g} кг")
        if not parts:
            return None
        return f"{total} уп.: " + ", ".join(parts) if total > 1 else parts[0]

    def _optimize_packages_for_period(
        self,
        product,
        daily_grams: float,
        period_days: int,
    ) -> Tuple[int, int, Optional[List[Dict[str, Any]]], Optional[str]]:
        """
        Умный подбор упаковок: минимизируем остаток и число упаковок.
        Для 30 дней мягко предпочитаем «2 упаковки по ~14–15 дней», если это не создаёт большого перерасхода.
        """
        if not daily_grams or daily_grams <= 0:
            return (1, period_days, None, None)

        tolerance_days = self._get_period_tolerance_days(period_days)
        min_days = max(1, period_days - tolerance_days)
        max_days = period_days + tolerance_days
        required_grams = daily_grams * period_days
        min_required_grams = daily_grams * min_days
        max_required_grams = daily_grams * max_days
        skus = self._get_available_skus(product)
        if not skus:
            w = self._get_product_weight_grams(product)
            if not w:
                return (1, period_days, None, None)
            min_pkg = max(1, math.ceil(min_required_grams / w))
            max_pkg = max(1, math.floor(max_required_grams / w))
            if min_pkg <= max_pkg:
                # выбираем пакет, дающий дни ближе к цели
                candidates = list(range(min_pkg, max_pkg + 1))
                packages = min(candidates, key=lambda p: abs((w * p / daily_grams) - period_days))
            else:
                # если диапазон не попадает, берем ближайший
                packages = min_pkg if abs((w * min_pkg / daily_grams) - period_days) <= abs((w * max_pkg / daily_grams) - period_days) else max_pkg
            total_grams = w * packages
            return (packages, int(total_grams / daily_grams), None, None)

        weights = [s['weight_grams'] for s in skus]
        max_w = max(weights)

        max_packages = 8 if period_days <= 60 else 12
        max_counts = [
            min(max_packages, int(math.ceil((required_grams + max_w) / w)) + 1)
            for w in weights
        ]

        best = None  # (out_of_range, deviation, overage, packages, counts)

        def consider(counts: List[int]):
            total_packages = sum(counts)
            if total_packages <= 0 or total_packages > max_packages:
                return
            total_grams = sum(c * w for c, w in zip(counts, weights))
            days_supply = total_grams / daily_grams if daily_grams else period_days
            out_of_range = 1 if (total_grams < min_required_grams or total_grams > max_required_grams) else 0
            deviation = abs(days_supply - period_days)
            overage = abs(total_grams - required_grams)

            if period_days == 30 and total_packages == 2:
                # мягкий бонус для 2х ~14–15 дней
                days_list = [w / daily_grams for c, w in zip(counts, weights) for _ in range(c)]
                target = 14.5
                deviation = min(deviation, sum(abs(d - target) for d in days_list) / max(1, len(days_list)))

            nonlocal best
            cand = (out_of_range, deviation, overage, total_packages, tuple(counts))
            if best is None or cand < best:
                best = cand

        def rec(idx: int, counts: List[int], used: int):
            if used > max_packages:
                return
            if idx == len(weights):
                consider(counts)
                return
            for c in range(0, max_counts[idx] + 1):
                counts.append(c)
                rec(idx + 1, counts, used + c)
                counts.pop()

        rec(0, [], 0)

        if not best:
            # fallback: крупнейший SKU
            largest = max(skus, key=lambda s: s['weight_grams'])
            w = largest['weight_grams']
            min_pkg = max(1, math.ceil(min_required_grams / w))
            max_pkg = max(1, math.floor(max_required_grams / w))
            if min_pkg <= max_pkg:
                candidates = list(range(min_pkg, max_pkg + 1))
                packages = min(candidates, key=lambda p: abs((w * p / daily_grams) - period_days))
            else:
                packages = min_pkg if abs((w * min_pkg / daily_grams) - period_days) <= abs((w * max_pkg / daily_grams) - period_days) else max_pkg
            total_grams = w * packages
            breakdown = [{
                'sku_id': largest['sku_id'],
                'weight_grams': w,
                'weight_display': largest.get('weight_display'),
                'count': packages,
            }]
            return (packages, int(total_grams / daily_grams), breakdown, self._format_package_summary(breakdown))

        _, _, _, _, counts_tuple = best
        counts = list(counts_tuple)
        total_packages = int(sum(counts))
        total_grams = sum(c * w for c, w in zip(counts, weights))
        days_supply = int(total_grams / daily_grams) if daily_grams else period_days

        breakdown: List[Dict[str, Any]] = []
        for c, sku in zip(counts, skus):
            if c <= 0:
                continue
            breakdown.append({
                'sku_id': sku['sku_id'],
                'weight_grams': sku['weight_grams'],
                'weight_display': sku.get('weight_display'),
                'count': int(c),
            })

        summary = self._format_package_summary(breakdown)
        return (total_packages, days_supply, breakdown, summary)
    
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

    def _get_period_tolerance_days(self, period_days: int) -> int:
        """
        Допуск по дням для подбора упаковок.
        """
        if period_days <= 7:
            return 1
        if period_days < 14:
            return 2
        if period_days < 25:
            return 4
        return 7
    
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
    ) -> Tuple[int, List[str], List[str], List[str], Dict[str, Any]]:
        """
        Оценить продукт для питомца.
        
        Returns:
            (score, reasons, warnings, badges, breakdown)
        """
        # Базовый скоринг — составной: веса + компоненты.
        breakdown: Dict[str, Any] = {
            "base_match": 0.0,
            "health_fit": 0.0,
            "breed_fit": 0.0,
            "macro_fit": 0.0,
            "price_fit": 0.0,
            "final_score": 0,
        }
        reasons = []
        warnings = []
        badges = []
        
        product_name = (product.name or '').lower()
        product_desc = (product.description or '').lower()
        full_text = f"{product_name} {product_desc}"
        details = self._get_food_details(product)
        category_code = product.new_category.code if getattr(product, 'new_category', None) else ''
        ingredients_list = _norm_token_list(getattr(details, "ingredients", None) or []) if details else []
        allergens_list = _norm_token_list(getattr(details, "allergens", None) or []) if details else []
        structured_tokens = set(ingredients_list + allergens_list)

        # 0. Жёсткий возрастной гейтинг
        if not self._is_age_compatible(product, filters.species, filters.age_months):
            return (0, [], ["Не подходит по возрасту"], [], breakdown)

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
                return (0, [], [f"Размер корма не подходит: {detected_size}"], [], breakdown)

        # 0.2 HARD: если есть пищевые аллергии — допускаем только гипоаллергенные корма
        if getattr(filters, "requires_hypoallergenic", False):
            is_hypo = bool(details and details.is_hypoallergenic) or bool(getattr(product, "is_hypoallergenic", False))
            is_hypo = is_hypo or (details and getattr(details, "compatibility_group", None) == "hypoallergenic")
            if not is_hypo:
                return (0, [], ["При пищевых аллергиях допускаются только гипоаллергенные корма"], [], breakdown)
        
        # 1. КРИТИЧНО: Проверка аллергий - исключаем полностью
        if filters.allergy_codes:
            for allergy_code in filters.allergy_codes:
                ingredients_to_check = self.ALLERGY_INGREDIENTS.get(allergy_code, [])
                for ingredient in ingredients_to_check:
                    ing = ingredient.lower()
                    if ing in structured_tokens:
                        return (0, [], [f"Содержит аллерген: {ingredient}"], [], breakdown)
                    if not structured_tokens and re.search(r'(?<!\w)' + re.escape(ing) + r'(?!\w)', full_text):
                        return (0, [], [f"Содержит аллерген: {ingredient}"], [], breakdown)

        # 1.1 HARD: непереносимость/медицинские исключения/противопоказания
        hard_tokens = getattr(filters, "hard_exclusion_tokens", None) or []
        for token in hard_tokens:
            t = _norm_token(token)
            if not t:
                continue
            if t in structured_tokens:
                return (0, [], [f"Содержит исключённый ингредиент: {token}"], [], breakdown)
            if not structured_tokens and re.search(r'(?<!\w)' + re.escape(t) + r'(?!\w)', full_text):
                return (0, [], [f"Содержит исключённый ингредиент: {token}"], [], breakdown)
        
        # 2. SOFT: предпочтения/исключения (можно ослаблять)
        soft_penalty = 0
        soft_tokens = getattr(filters, "soft_exclusion_tokens", None) or []
        for token in soft_tokens:
            t = _norm_token(token)
            if not t:
                continue
            text_match = (not structured_tokens and re.search(r'(?<!\w)' + re.escape(t) + r'(?!\w)', full_text))
            if t in structured_tokens or text_match:
                soft_penalty += 1
                warnings.append(f"Содержит нежелательный ингредиент: {token}")
        
        # 3. Health fit (0..1): соответствие заболеваниям/режимам
        health_fit = 0.4  # базово нейтрально
        health_hits = 0
        critical_or_high = False

        profile = getattr(filters, "nutrition_profile", None)
        if profile and profile.health_conditions:
            for hc in profile.health_conditions:
                if (hc.priority or "").upper() in ["CRITICAL", "HIGH"]:
                    critical_or_high = True

        for condition_code in filters.health_condition_codes:
            keywords = self.HEALTH_FOOD_KEYWORDS.get(condition_code, [])
            category_hint = category_code or ''
            for keyword in keywords:
                if keyword in full_text or keyword in category_hint:
                    health_hits += 1
                    reasons.append(f"Подходит при: {condition_code}")
                    badges.append("Лечебный")
                    break
            if details and condition_code in (details.health_conditions or []):
                health_hits += 1
                reasons.append(f"Показания: {condition_code}")

        # GI: если есть GI-issues — предпочитаем digestive спец.диету/группу совместимости
        if getattr(filters, "has_gi_issues", False) and details:
            special = set(_norm_token_list(getattr(details, "special_diet", None) or []))
            if getattr(details, "compatibility_group", None) == "therapeutic_digestive" or (
                "gastrointestinal" in special or "sensitive_digestion" in special
            ):
                health_hits += 1
                reasons.append("Подходит при проблемах ЖКТ")

        # Veterinary при критичных/высоких состояниях (soft, но сильный сигнал)
        if critical_or_high:
            is_vet = bool(getattr(product, "is_veterinary", False)) or bool(details and getattr(details, "is_veterinary", False))
            is_vet = is_vet or bool(details and str(getattr(details, "compatibility_group", "")).startswith("therapeutic_"))
            if is_vet:
                health_hits += 1
                badges.append("Ветеринарная диета")

        health_fit = min(1.0, health_fit + 0.15 * max(0, health_hits))
        breakdown["health_fit"] = round(health_fit, 3)

        # 4.1 Учет породных рекомендаций
        breed_rec = filters.breed_recommendations.get(product.id) if filters.breed_recommendations else None
        if breed_rec:
            reasons.append("Рекомендуется для вашей породы")
            badges.append("Для породы")
            breakdown["breed_fit"] = round(min(1.0, max(0.4, float(getattr(breed_rec, "score", 70)) / 100.0)), 3)
        else:
            breakdown["breed_fit"] = 0.0

        # 4.2 БЖУ: соответствие целевым диапазонам питомца (мягкий скоринг)
        macro_fit = 0.5
        macro_checks = 0
        macro_hits = 0
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
                macro_checks += 1
                if target['min'] <= float(value) <= target['max']:
                    macro_hits += 1
                else:
                    warnings.append(f"{macro} вне целевого диапазона")
            if macro_checks:
                macro_fit = max(0.0, min(1.0, macro_hits / macro_checks))
        breakdown["macro_fit"] = round(macro_fit, 3)

        # 4.3 Брахицефалы: бонус/штраф по размеру гранулы
        breed = getattr(filters, '_pet_breed', None)
        if breed is None:
            try:
                profile = getattr(filters, 'nutrition_profile', None)
                breed = getattr(profile, '_breed_obj', None) if profile else None
            except Exception:
                pass
        if breed and getattr(breed, 'is_brachycephalic', False) and details:
            kibble = getattr(details, 'kibble_size', None)
            if kibble == 'small':
                base_match_brachy_bonus = 0.05
                reasons.append("Мелкие гранулы для брахицефалов")
            elif kibble == 'large':
                base_match_brachy_bonus = -0.10
                warnings.append("Крупные гранулы не рекомендуются для брахицефалов")
            else:
                base_match_brachy_bonus = 0.0
        else:
            base_match_brachy_bonus = 0.0

        # 4.4 Таурин для кошек
        if filters.species == 'cat':
            taurine_found = (
                'taurine' in structured_tokens
                or 'таурин' in structured_tokens
                or 'taurine' in full_text
                or 'таурин' in full_text
            )
            if taurine_found:
                health_fit = min(1.0, health_fit + 0.05)
            elif not structured_tokens:
                warnings.append("Убедитесь, что корм содержит таурин (незаменим для кошек)")

        # 4.5 Ca:P warning для щенков крупных пород
        if (filters.age_months is not None and filters.age_months < 12
                and filters.species == 'dog'
                and filters.size_category in ['large', 'giant']):
            warnings.append(
                "Для щенков крупных пород важно соотношение Ca:P (1.2-1.5:1), проверьте состав корма"
            )

        # 4.6 BCS >= 7: бонус за diet/light/weight_management корма
        bcs_val = getattr(filters, 'bcs', None)
        if bcs_val is not None and bcs_val >= 7 and details:
            compat = getattr(details, 'compatibility_group', '') or ''
            special = set(_norm_token_list(getattr(details, 'special_diet', None) or []))
            if compat == 'therapeutic_weight' or 'weight_control' in special:
                health_fit = min(1.0, health_fit + 0.15)
                reasons.append("Подходит для контроля веса")
                badges.append("Контроль веса")

        breakdown["health_fit"] = round(health_fit, 3)

        # 5. Соответствие возрасту
        age_fit = 0.6
        if filters.age_months is not None:
            if filters.age_months < 12:
                if any(kw in full_text for kw in ['puppy', 'kitten', 'щенок', 'котёнок', 'junior']):
                    age_fit = 1.0
                    reasons.append("Для молодых")
                elif any(kw in full_text for kw in ['adult', 'взрослый']):
                    age_fit = 0.3
                    warnings.append("Для взрослых")
            elif filters.age_months > 84:
                if any(kw in full_text for kw in ['senior', 'mature', 'пожилой', '7+']):
                    age_fit = 1.0
                    reasons.append("Для пожилых")
                    badges.append("Senior")
            else:
                if any(kw in full_text for kw in ['adult', 'взрослый']):
                    age_fit = 0.9
                    reasons.append("Для взрослых")
        
        # 6. Соответствие размеру (собаки)
        size_fit = 0.7
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
                    size_fit = 1.0
                    reasons.append(f"Для {filters.size_category}")
                    break
        
        # 7. Холистик бонус
        if 'holistic' in category_code:
            badges.append("Холистик")

        # 8. price_fit (0..1): предпочтение среднего/выше среднего ценового диапазона (качество)
        price_fit = 0.5
        
        avg_price = getattr(filters, 'avg_price', None)
        if avg_price and product.price:
            price_ratio = float(product.price) / float(avg_price)
            if price_ratio > 2:
                price_fit = 0.3
            elif price_ratio > 1.3:
                price_fit = 0.5
            elif price_ratio < 0.5:
                price_fit = 0.3
                warnings.append("Значительно ниже среднего ценового диапазона")
            else:
                price_fit = 0.6
        breakdown["price_fit"] = round(price_fit, 3)

        # base_match объединяет возраст/размер как базовый слой (вид/возраст/размер уже gated)
        base_match = max(0.0, min(1.0, (age_fit * 0.55 + size_fit * 0.45) + base_match_brachy_bonus))
        breakdown["base_match"] = round(base_match, 3)

        # Итог: веса (эволюционно, без package_fit — добавим в todo4)
        final = (
            0.45 * base_match
            + 0.25 * health_fit
            + 0.10 * breakdown.get("breed_fit", 0.0)
            + 0.10 * macro_fit
            + 0.10 * price_fit
        )

        # Приоритетные бренды — бонус после вычисления final
        brand_name = (product.brand.name if product.brand else '').lower()
        if filters.priority_brands:
            for brand in filters.priority_brands:
                if brand.lower() in brand_name:
                    final = min(1.0, final + 0.10)
                    badges.append("Приоритет")
                    break

        # Soft penalties (предпочтения) — уменьшают итог, но не приводят к hard drop
        if soft_penalty:
            final = max(0.0, final - min(0.25, 0.08 * soft_penalty))
        
        score = int(round(max(0.0, min(1.0, final)) * 100))
        breakdown["final_score"] = score
        
        # Добавляем бейдж "Идеально подходит" для высоких оценок
        if score >= 85:
            badges.insert(0, "Идеально подходит")
        elif score >= 70:
            badges.insert(0, "Хорошо подходит")
        
        return (score, reasons, warnings, badges, breakdown)
    
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
                    'frequency_days': treat_component.treat_frequency_days,
                    'note': 'Лакомства давайте не каждый день, распределите в течение недели',
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
                    'frequency_days': treat_component.treat_frequency_days,
                    'note': 'Лакомства давайте не каждый день, распределите в течение недели',
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
                    'frequency_days': treat_component.treat_frequency_days,
                    'note': 'Лакомства давайте не каждый день, распределите в течение недели',
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
        
        # === ИТОГОВОЕ БЖУ НА ДЕНЬ ===
        daily['daily_nutrition'] = self._calculate_daily_bju_summary(plan, calorie_result)
        
        return daily
    
    def _calculate_daily_bju_summary(self, plan: FeedingPlan, calorie_result) -> Dict[str, Any]:
        """
        Рассчитать итоговое БЖУ на день с процентом от нормы.
        """
        macro_targets = calorie_result.macro_targets or {}
        
        total_protein_g = 0.0
        total_fat_g = 0.0
        total_carbs_g = 0.0
        total_fiber_g = 0.0
        total_grams = 0.0
        
        for comp in plan.components:
            if comp.product_type in ['dry_food', 'wet_food', 'dry_food_multi', 'wet_food_multi'] or (
                isinstance(comp.product_type, str) and (
                    comp.product_type.startswith('dry_food') or comp.product_type.startswith('wet_food')
                )
            ):
                grams = comp.daily_grams or 0
                total_grams += grams
                
                protein_pct = comp.nutrition_protein or 0
                fat_pct = comp.nutrition_fat or 0
                fiber_pct = comp.nutrition_fiber or 0
                moisture_pct = comp.nutrition_moisture or 10
                
                # Известные компоненты
                known = sum(v for v in [protein_pct, fat_pct, fiber_pct, moisture_pct, comp.nutrition_ash or 0] if v)
                carbs_pct = max(0, 100 - known)
                
                total_protein_g += grams * protein_pct / 100
                total_fat_g += grams * fat_pct / 100
                total_carbs_g += grams * carbs_pct / 100
                total_fiber_g += grams * fiber_pct / 100
        
        # Пересчет на сухое вещество для сравнения с целями
        # Средняя влажность корма
        avg_moisture = 10 if plan.plan_type == 'dry' else (75 if plan.plan_type == 'wet' else 35)
        dm_factor = 100 / (100 - avg_moisture) if avg_moisture < 100 else 1.0
        
        protein_dm = (total_protein_g / total_grams * 100 * dm_factor) if total_grams > 0 else 0
        fat_dm = (total_fat_g / total_grams * 100 * dm_factor) if total_grams > 0 else 0
        fiber_dm = (total_fiber_g / total_grams * 100 * dm_factor) if total_grams > 0 else 0
        
        def get_coverage(actual: float, target_key: str) -> Dict[str, Any]:
            target = macro_targets.get(target_key, {})
            min_val = float(target.get('min', 0)) if isinstance(target, dict) else 0
            max_val = float(target.get('max', 100)) if isinstance(target, dict) else 100
            mid = (min_val + max_val) / 2 if min_val and max_val else 30
            
            if mid == 0:
                return {'percent': 100, 'status': 'ok', 'color': 'green'}
            
            coverage_pct = round(actual / mid * 100) if mid > 0 else 100
            
            if actual < min_val * 0.85:
                status, color = 'low', 'red'
            elif actual < min_val:
                status, color = 'slightly_low', 'yellow'
            elif actual > max_val * 1.15:
                status, color = 'high', 'red'
            elif actual > max_val:
                status, color = 'slightly_high', 'yellow'
            else:
                status, color = 'ok', 'green'
            
            return {
                'percent': coverage_pct,
                'actual': round(actual, 1),
                'min': min_val,
                'max': max_val,
                'status': status,
                'color': color,
            }
        
        return {
            'total_grams': round(total_grams),
            'protein': {
                'grams': round(total_protein_g, 1),
                'dm_percent': round(protein_dm, 1),
                'coverage': get_coverage(protein_dm, 'protein'),
            },
            'fat': {
                'grams': round(total_fat_g, 1),
                'dm_percent': round(fat_dm, 1),
                'coverage': get_coverage(fat_dm, 'fat'),
            },
            'carbs': {
                'grams': round(total_carbs_g, 1),
            },
            'fiber': {
                'grams': round(total_fiber_g, 1),
                'dm_percent': round(fiber_dm, 1),
                'coverage': get_coverage(fiber_dm, 'fiber'),
            },
            'note': f'БЖУ на сухое вещество (DM {round(100 - avg_moisture)}%)',
        }
    
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
        subcat = self._expand_category_codes_for_species(subcat, filters.species)
        product_type = component.product_type
        
        if product_type == 'treat':
            queryset = Product.objects.filter(
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

        # Фильтр по размеру для собак (fallback на size_group как в _select_treats/_select_*_food)
        if product_type == 'treat' and filters.species == 'dog' and filters.size_category:
            pet_size = filters.size_category
            size_group_match = Q(size_group__isnull=True) | Q(size_group='all')
            if pet_size == 'toy':
                size_group_match |= Q(size_group='mini')
            else:
                size_group_match |= Q(size_group=pet_size)

            queryset = queryset.filter(
                (Q(food_details__target_size__isnull=False) & (Q(food_details__target_size='all') | Q(food_details__target_size=pet_size)))
                | (Q(food_details__target_size__isnull=True) & size_group_match)
            )

        # HARD FILTER для лакомств: аллергии/исключения
        if product_type == 'treat' and getattr(filters, "requires_hypoallergenic", False):
            queryset = queryset.filter(
                Q(food_details__is_hypoallergenic=True)
                | Q(is_hypoallergenic=True)
                | Q(food_details__compatibility_group="hypoallergenic")
            )
        if product_type == 'treat':
            hard_tokens = getattr(filters, "hard_exclusion_tokens", None) or []
            if hard_tokens:
                queryset = queryset.exclude(food_details__ingredients__overlap=hard_tokens).exclude(
                    food_details__allergens__overlap=hard_tokens
                )
        
        products = list(queryset.order_by('price')[:120])
        alternatives = []
        
        # Определяем % калорий для этого типа компонента
        calorie_key = 'dry_food' if 'dry' in product_type else ('wet_food' if 'wet' in product_type else 'treats')
        calorie_percent = (filters.calorie_distribution or {}).get(calorie_key, 0.90)
        
        # Калории для этого компонента
        component_kcal = (filters.daily_calories or 0) * calorie_percent
        
        for product in products:
            score, reasons, warnings, badges, breakdown = self._evaluate_product(product, filters)
            
            if score > 0:
                kcal_per_100g = self._get_product_kcal(product, product_type.split('_')[0])
                if not kcal_per_100g and product_type != 'supplement':
                    continue
                
                # Граммы с учётом распределения калорий, округление до 10г
                if component_kcal and kcal_per_100g:
                    raw_grams = (component_kcal / kcal_per_100g) * 100
                    daily_grams = round(raw_grams)
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
                    score_breakdown=breakdown,
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
        species = (getattr(plan, 'species', None) or 'dog').strip().lower()
        multi_ratio_presets = None
        if plan.plan_type == 'multi':
            presets = self.MULTI_RATIO_PRESETS.get(species, self.MULTI_RATIO_PRESETS['dog'])
            labels = self.MULTI_RATIO_PRESET_LABELS.get(species, self.MULTI_RATIO_PRESET_LABELS['dog'])
            multi_ratio_presets = [
                {'value': key, 'label': labels.get(key, key)}
                for key in presets
            ]
        out = {
            'pet_id': plan.pet_id,
            'pet_name': plan.pet_name,
            'daily_calories': round(plan.daily_calories, 0),
            'plan_type': plan.plan_type,
            'variant': plan.variant,
            'period_days': plan.period_days,
            'calorie_distribution': plan.calorie_distribution,
            'multi_ratio_presets': multi_ratio_presets,
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
                    'package_breakdown': c.package_breakdown,
                    'package_summary': c.package_summary,
                    'reasons': c.reasons,
                    'warnings': c.warnings,
                    'badges': c.badges,
                    'alternatives_count': c.alternatives_count,
                    'score_breakdown': c.score_breakdown,
                    # Расширенные поля для UI
                    'short_description': c.short_description,
                    'image_url': str(c.image_url) if c.image_url else None,
                    'shop_url': c.shop_url,
                    'kcal_per_100g': c.kcal_per_100g,
                    'recipe_id': c.recipe_id,
                    'offer_id': c.offer_id,
                    'sku_id': c.sku_id,
                    'article_number': c.article_number,
                    'brand': c.brand,
                    'source': c.source,
                    'recommendation_reason': c.recommendation_reason,
                    'alternatives': c.alternatives or [],
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
                    'treat_frequency_days': c.treat_frequency_days,
                    # Специальные поля для добавок
                    'dosage_text': c.dosage_text,
                    'intake_time': c.intake_time,
                    'intake_instructions': c.intake_instructions,
                    'supplement_type': c.supplement_type,
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
                    'supplement_type': s.supplement_type,
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
        return out


# Глобальный экземпляр
food_recommendation_service = FoodRecommendationService()
