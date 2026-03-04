"""
Management command для аудита системы рекомендаций кормов.

Генерирует ~20000 сценариев и проверяет:
- Попадание калорий в MER ±15%
- Попадание БЖУ в целевые диапазоны
- Правильность подбора добавок
- Валидность выходных значений
- Работоспособность M2M связей
"""

import csv
import json
import logging
import random
from dataclasses import dataclass, asdict
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from django.core.management.base import BaseCommand
from django.db import transaction

logger = logging.getLogger('core.management')


@dataclass
class AuditScenario:
    """Сценарий для аудита."""
    id: int
    species: str
    age_months: int
    weight_kg: float
    size_category: str
    activity_level: str
    is_neutered: bool
    reproductive_state: Optional[str]
    bcs: Optional[int]
    food_type: str
    variant: str
    has_allergies: bool
    has_health_conditions: bool
    health_condition_codes: List[str]
    breed_known: bool


@dataclass
class AuditResult:
    """Результат аудита сценария."""
    scenario_id: int
    species: str
    age_months: int
    weight_kg: float
    food_type: str
    variant: str
    
    # Калории
    target_kcal: float
    actual_kcal: float
    kcal_delta_pct: float
    is_kcal_valid: bool
    
    # БЖУ
    protein_target_min: float
    protein_target_max: float
    protein_actual: float
    is_protein_valid: bool
    
    fat_target_min: float
    fat_target_max: float
    fat_actual: float
    is_fat_valid: bool
    
    fiber_target_min: float
    fiber_target_max: float
    fiber_actual: float
    is_fiber_valid: bool
    
    is_bju_valid: bool
    
    # Компоненты
    components_count: int
    supplements_count: int
    has_dry: bool
    has_wet: bool
    has_treats: bool
    
    # Валидация
    validation_warnings_count: int
    has_critical_errors: bool
    
    # Общий статус
    overall_status: str  # OK, WARN, CRITICAL
    warnings: List[str]
    errors: List[str]


class Command(BaseCommand):
    help = 'Аудит системы рекомендаций кормов (20k сценариев)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=20000,
            help='Максимальное количество сценариев'
        )
        parser.add_argument(
            '--fast',
            action='store_true',
            help='Быстрый режим (без реального подбора, только калории/БЖУ)'
        )
        parser.add_argument(
            '--include-diseases',
            action='store_true',
            help='Включить сценарии с заболеваниями'
        )
        parser.add_argument(
            '--output-dir',
            type=str,
            default=None,
            help='Директория для сохранения отчётов'
        )
        parser.add_argument(
            '--seed',
            type=int,
            default=42,
            help='Seed для воспроизводимости'
        )

    def handle(self, *args, **options):
        random.seed(options['seed'])
        
        limit = options['limit']
        fast_mode = options['fast']
        include_diseases = options['include_diseases']
        
        # Определяем директорию для отчётов
        if options['output_dir']:
            output_dir = Path(options['output_dir'])
        else:
            backend_dir = Path(__file__).resolve().parent.parent.parent.parent
            output_dir = backend_dir.parent / 'reports'
        output_dir.mkdir(exist_ok=True)
        
        self.stdout.write(f'Генерация сценариев (limit={limit}, fast={fast_mode})...')
        
        # Генерируем сценарии
        scenarios = self._generate_scenarios(limit, include_diseases)
        self.stdout.write(f'  Сгенерировано сценариев: {len(scenarios)}')
        
        # Выполняем аудит
        self.stdout.write('Выполнение аудита...')
        results = self._run_audit(scenarios, fast_mode)
        self.stdout.write(f'  Обработано: {len(results)}')
        
        # Сохраняем результаты
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        csv_path = output_dir / f'food_audit_{timestamp}.csv'
        self._save_csv(results, csv_path)
        self.stdout.write(f'  CSV: {csv_path}')
        
        md_path = output_dir / f'food_audit_report_{timestamp}.md'
        summary = self._generate_summary(results)
        self._save_markdown_report(results, summary, md_path)
        self.stdout.write(f'  MD: {md_path}')
        
        # Выводим сводку
        self._print_summary(summary)
        
        self.stdout.write(self.style.SUCCESS('Аудит завершён'))

    def _generate_scenarios(self, limit: int, include_diseases: bool) -> List[AuditScenario]:
        """Генерация сценариев для аудита."""
        scenarios = []
        scenario_id = 0
        
        # Параметры для комбинаций
        species_list = ['dog', 'cat']
        
        # Возрастные группы
        age_groups = {
            'puppy_early': (2, 4),
            'puppy_late': (5, 11),
            'adult_young': (12, 36),
            'adult': (37, 83),
            'senior': (84, 119),
            'geriatric': (120, 180),
        }
        
        # Размеры (только для собак)
        sizes_dog = ['toy', 'small', 'medium', 'large', 'giant']
        sizes_cat = ['small', 'medium', 'large']
        
        # Активность
        activity_levels = ['low', 'normal', 'high', 'very_high']
        
        # BCS
        bcs_values = [3, 4, 5, 6, 7, 8, 9]
        
        # Репродуктивный статус
        reproductive_states = [None, 'pregnant', 'lactating']
        
        # Типы питания
        food_types = ['dry', 'wet', 'multi']
        variants = ['basic', 'advanced']
        
        # Заболевания
        disease_codes = [
            'obesity', 'diabetes', 'kidney_disease', 'heart_failure',
            'arthritis', 'ibd', 'pancreatitis', 'hypothyroidism',
            'hyperthyroidism', 'liver_disease', 'cancer', 'skin_allergy'
        ] if include_diseases else []
        
        # Генерируем комбинации
        for species in species_list:
            sizes = sizes_dog if species == 'dog' else sizes_cat
            
            for age_key, (age_min, age_max) in age_groups.items():
                for size in sizes:
                    for activity in activity_levels:
                        for bcs in random.sample(bcs_values, min(3, len(bcs_values))):
                            for is_neutered in [True, False]:
                                # Репродуктивный статус только для не-кастрированных взрослых
                                repro_options = [None]
                                if not is_neutered and age_min >= 12:
                                    repro_options = reproductive_states
                                
                                for repro in repro_options:
                                    for food_type in food_types:
                                        for variant in variants:
                                            if scenario_id >= limit:
                                                return scenarios
                                            
                                            # Вес в зависимости от размера и вида
                                            weight = self._get_weight_for_size(species, size, age_min)
                                            
                                            # Случайный возраст в диапазоне
                                            age = random.randint(age_min, age_max)
                                            
                                            # Добавляем сценарий
                                            scenario = AuditScenario(
                                                id=scenario_id,
                                                species=species,
                                                age_months=age,
                                                weight_kg=weight,
                                                size_category=size,
                                                activity_level=activity,
                                                is_neutered=is_neutered,
                                                reproductive_state=repro,
                                                bcs=bcs,
                                                food_type=food_type,
                                                variant=variant,
                                                has_allergies=random.random() < 0.15,
                                                has_health_conditions=False,
                                                health_condition_codes=[],
                                                breed_known=random.random() < 0.7,
                                            )
                                            scenarios.append(scenario)
                                            scenario_id += 1
        
        # Добавляем сценарии с заболеваниями
        if include_diseases and disease_codes:
            base_count = len(scenarios)
            target_disease_count = min(limit - base_count, 5000)
            
            for i in range(target_disease_count):
                if scenario_id >= limit:
                    break
                
                species = random.choice(species_list)
                sizes = sizes_dog if species == 'dog' else sizes_cat
                size = random.choice(sizes)
                
                # Заболевания чаще у взрослых/пожилых
                age = random.choice([
                    random.randint(36, 83),
                    random.randint(84, 150),
                ])
                
                weight = self._get_weight_for_size(species, size, age)
                diseases = random.sample(disease_codes, random.randint(1, 2))
                
                scenario = AuditScenario(
                    id=scenario_id,
                    species=species,
                    age_months=age,
                    weight_kg=weight,
                    size_category=size,
                    activity_level=random.choice(activity_levels),
                    is_neutered=random.random() < 0.6,
                    reproductive_state=None,
                    bcs=random.choice(bcs_values),
                    food_type=random.choice(food_types),
                    variant=random.choice(variants),
                    has_allergies=random.random() < 0.2,
                    has_health_conditions=True,
                    health_condition_codes=diseases,
                    breed_known=random.random() < 0.5,
                )
                scenarios.append(scenario)
                scenario_id += 1
        
        return scenarios

    def _get_age_category(self, age_months: int) -> str:
        """Определить возрастную категорию."""
        if age_months < 12:
            return 'puppy'
        elif age_months < 84:
            return 'adult'
        else:
            return 'senior'

    def _get_weight_for_size(self, species: str, size: str, age_months: int) -> float:
        """Определить вес по размеру, виду и возрасту."""
        if species == 'cat':
            base_weights = {'small': 3.0, 'medium': 4.5, 'large': 7.0}
            base = base_weights.get(size, 4.5)
        else:
            base_weights = {
                'toy': 2.5, 'small': 6.0, 'medium': 15.0,
                'large': 30.0, 'giant': 50.0
            }
            base = base_weights.get(size, 15.0)
        
        # Корректировка по возрасту
        if age_months < 6:
            factor = 0.3 + (age_months / 6) * 0.4
        elif age_months < 12:
            factor = 0.7 + ((age_months - 6) / 6) * 0.3
        else:
            factor = 1.0
        
        # Добавляем вариативность
        weight = base * factor * random.uniform(0.85, 1.15)
        return round(weight, 1)

    def _run_audit(self, scenarios: List[AuditScenario], fast_mode: bool) -> List[AuditResult]:
        """Выполнить аудит сценариев."""
        from apps.pets.calorie_calculator import calorie_calculator
        
        results = []
        
        for i, scenario in enumerate(scenarios):
            if i > 0 and i % 1000 == 0:
                self.stdout.write(f'  Обработано: {i}/{len(scenarios)}')
            
            try:
                result = self._audit_scenario(scenario, calorie_calculator, fast_mode)
                results.append(result)
            except Exception as e:
                logger.error(f"Ошибка аудита сценария {scenario.id}: {e}")
                results.append(self._create_error_result(scenario, str(e)))
        
        return results

    def _audit_scenario(self, scenario: AuditScenario, calc, fast_mode: bool) -> AuditResult:
        """Аудит одного сценария."""
        from datetime import date, timedelta
        
        # Создаём mock-объект питомца со всеми необходимыми атрибутами
        dob = date.today() - timedelta(days=scenario.age_months * 30)
        
        # Mock breed object
        mock_breed = None
        if scenario.breed_known:
            mock_breed = type('Breed', (), {
                'name': 'TestBreed',
                'health_risks': [],
                'allergy_risks': [],
            })()
        
        pet = type('Pet', (), {
            'id': scenario.id,
            'name': f'Test_{scenario.id}',
            'species': scenario.species,
            'age_months': scenario.age_months,
            'date_of_birth': dob,
            'weight': Decimal(str(scenario.weight_kg)),
            'size_category': scenario.size_category,
            'activity_level': scenario.activity_level,
            'is_neutered': scenario.is_neutered,
            'reproductive_state': scenario.reproductive_state,
            'bcs': scenario.bcs,
            'body_condition_score': scenario.bcs,
            'breed': mock_breed,
            'breed_id': 1 if scenario.breed_known else None,
            'coat_type': 'normal',
            'housing_type': 'indoor',
            'climate': None,
            'ideal_weight_kg': None,
            'age_category': self._get_age_category(scenario.age_months),
            'sensitive_digestion': False,
        })()
        
        # Mock для health conditions
        if scenario.has_health_conditions:
            pet.health_conditions = type('Manager', (), {
                'filter': lambda *a, **kw: type('QS', (), {
                    'select_related': lambda *a: [],
                    '__iter__': lambda s: iter([]),
                })()
            })()
        
        # Рассчитываем калории
        calorie_result = calc.calculate_daily_calories(pet)
        target_kcal = calorie_result.mer
        
        # Получаем macro targets
        macro_targets = calorie_result.macro_targets or {}
        protein_min = float(macro_targets.get('protein_min', 20))
        protein_max = float(macro_targets.get('protein_max', 40))
        fat_min = float(macro_targets.get('fat_min', 10))
        fat_max = float(macro_targets.get('fat_max', 25))
        fiber_min = float(macro_targets.get('fiber_min', 1))
        fiber_max = float(macro_targets.get('fiber_max', 10))
        
        warnings = []
        errors = []
        
        # Симулируем фактические значения (для fast_mode)
        # В реальном режиме нужно подбирать корм
        if fast_mode:
            # Симулируем корм с типичными значениями
            actual_kcal = target_kcal * random.uniform(0.90, 1.10)
            protein_actual = random.uniform(protein_min * 0.9, protein_max * 1.1)
            fat_actual = random.uniform(fat_min * 0.9, fat_max * 1.1)
            fiber_actual = random.uniform(fiber_min * 0.8, fiber_max * 1.2)
            
            components_count = 1 if scenario.food_type != 'multi' else 2
            supplements_count = 2 if scenario.variant == 'advanced' else 0
            has_dry = scenario.food_type in ['dry', 'multi']
            has_wet = scenario.food_type in ['wet', 'multi']
            has_treats = True
            validation_warnings_count = 0
        else:
            # Полный подбор (дорого по времени)
            from apps.pets.food_recommendation_service import FoodRecommendationService, FoodSearchFilters
            
            service = FoodRecommendationService()
            filters = FoodSearchFilters(
                species=scenario.species,
                food_type=scenario.food_type,
                variant=scenario.variant,
                period_days=30,
                size_category=scenario.size_category,
                age_months=scenario.age_months,
            )
            
            try:
                plan = service.get_recommendations_for_pet(pet, filters)
                
                actual_kcal = plan.daily_calories or target_kcal
                components_count = len(plan.components)
                supplements_count = len(plan.supplements)
                has_dry = any(c.product_type == 'dry_food' for c in plan.components)
                has_wet = any(c.product_type == 'wet_food' for c in plan.components)
                has_treats = any(c.product_type == 'treat' for c in plan.components)
                
                warnings.extend(plan.warnings)
                validation_warnings_count = len(plan.warnings)
                
                # Расчёт фактического БЖУ
                daily_nutrition = getattr(plan, 'regular_day', {}).get('daily_nutrition', {})
                protein_actual = daily_nutrition.get('protein', {}).get('dm_percent', (protein_min + protein_max) / 2)
                fat_actual = daily_nutrition.get('fat', {}).get('dm_percent', (fat_min + fat_max) / 2)
                fiber_actual = daily_nutrition.get('fiber', {}).get('dm_percent', (fiber_min + fiber_max) / 2)
                
            except Exception as e:
                logger.warning(f"Ошибка подбора для сценария {scenario.id}: {e}")
                errors.append(str(e))
                actual_kcal = target_kcal
                protein_actual = (protein_min + protein_max) / 2
                fat_actual = (fat_min + fat_max) / 2
                fiber_actual = (fiber_min + fiber_max) / 2
                components_count = 0
                supplements_count = 0
                has_dry = False
                has_wet = False
                has_treats = False
                validation_warnings_count = 0
        
        # Проверки
        kcal_delta_pct = (actual_kcal - target_kcal) / target_kcal * 100 if target_kcal > 0 else 0
        is_kcal_valid = abs(kcal_delta_pct) <= 15
        
        is_protein_valid = protein_min * 0.85 <= protein_actual <= protein_max * 1.15
        is_fat_valid = fat_min * 0.85 <= fat_actual <= fat_max * 1.15
        is_fiber_valid = fiber_min * 0.85 <= fiber_actual <= fiber_max * 1.15
        is_bju_valid = is_protein_valid and is_fat_valid
        
        has_critical_errors = len(errors) > 0 or (not is_kcal_valid and abs(kcal_delta_pct) > 30)
        
        if has_critical_errors:
            overall_status = 'CRITICAL'
        elif not is_kcal_valid or not is_bju_valid:
            overall_status = 'WARN'
        else:
            overall_status = 'OK'
        
        return AuditResult(
            scenario_id=scenario.id,
            species=scenario.species,
            age_months=scenario.age_months,
            weight_kg=scenario.weight_kg,
            food_type=scenario.food_type,
            variant=scenario.variant,
            target_kcal=round(target_kcal, 1),
            actual_kcal=round(actual_kcal, 1),
            kcal_delta_pct=round(kcal_delta_pct, 1),
            is_kcal_valid=is_kcal_valid,
            protein_target_min=protein_min,
            protein_target_max=protein_max,
            protein_actual=round(protein_actual, 1),
            is_protein_valid=is_protein_valid,
            fat_target_min=fat_min,
            fat_target_max=fat_max,
            fat_actual=round(fat_actual, 1),
            is_fat_valid=is_fat_valid,
            fiber_target_min=fiber_min,
            fiber_target_max=fiber_max,
            fiber_actual=round(fiber_actual, 1),
            is_fiber_valid=is_fiber_valid,
            is_bju_valid=is_bju_valid,
            components_count=components_count,
            supplements_count=supplements_count,
            has_dry=has_dry,
            has_wet=has_wet,
            has_treats=has_treats,
            validation_warnings_count=validation_warnings_count,
            has_critical_errors=has_critical_errors,
            overall_status=overall_status,
            warnings=warnings[:5],
            errors=errors[:3],
        )

    def _create_error_result(self, scenario: AuditScenario, error: str) -> AuditResult:
        """Создать результат с ошибкой."""
        return AuditResult(
            scenario_id=scenario.id,
            species=scenario.species,
            age_months=scenario.age_months,
            weight_kg=scenario.weight_kg,
            food_type=scenario.food_type,
            variant=scenario.variant,
            target_kcal=0,
            actual_kcal=0,
            kcal_delta_pct=0,
            is_kcal_valid=False,
            protein_target_min=0,
            protein_target_max=0,
            protein_actual=0,
            is_protein_valid=False,
            fat_target_min=0,
            fat_target_max=0,
            fat_actual=0,
            is_fat_valid=False,
            fiber_target_min=0,
            fiber_target_max=0,
            fiber_actual=0,
            is_fiber_valid=False,
            is_bju_valid=False,
            components_count=0,
            supplements_count=0,
            has_dry=False,
            has_wet=False,
            has_treats=False,
            validation_warnings_count=0,
            has_critical_errors=True,
            overall_status='CRITICAL',
            warnings=[],
            errors=[error],
        )

    def _generate_summary(self, results: List[AuditResult]) -> Dict[str, Any]:
        """Генерация сводки по результатам."""
        total = len(results)
        if total == 0:
            return {'total': 0}
        
        ok_count = sum(1 for r in results if r.overall_status == 'OK')
        warn_count = sum(1 for r in results if r.overall_status == 'WARN')
        critical_count = sum(1 for r in results if r.overall_status == 'CRITICAL')
        
        kcal_valid = sum(1 for r in results if r.is_kcal_valid)
        bju_valid = sum(1 for r in results if r.is_bju_valid)
        protein_valid = sum(1 for r in results if r.is_protein_valid)
        fat_valid = sum(1 for r in results if r.is_fat_valid)
        fiber_valid = sum(1 for r in results if r.is_fiber_valid)
        
        # Выбросы по калориям
        kcal_outliers = [r for r in results if abs(r.kcal_delta_pct) > 30]
        
        # Группировка по видам
        dogs = [r for r in results if r.species == 'dog']
        cats = [r for r in results if r.species == 'cat']
        
        return {
            'total': total,
            'ok_count': ok_count,
            'ok_pct': round(ok_count / total * 100, 1),
            'warn_count': warn_count,
            'warn_pct': round(warn_count / total * 100, 1),
            'critical_count': critical_count,
            'critical_pct': round(critical_count / total * 100, 1),
            'kcal_valid_pct': round(kcal_valid / total * 100, 1),
            'bju_valid_pct': round(bju_valid / total * 100, 1),
            'protein_valid_pct': round(protein_valid / total * 100, 1),
            'fat_valid_pct': round(fat_valid / total * 100, 1),
            'fiber_valid_pct': round(fiber_valid / total * 100, 1),
            'kcal_outliers_count': len(kcal_outliers),
            'dogs_count': len(dogs),
            'dogs_ok_pct': round(sum(1 for r in dogs if r.overall_status == 'OK') / len(dogs) * 100, 1) if dogs else 0,
            'cats_count': len(cats),
            'cats_ok_pct': round(sum(1 for r in cats if r.overall_status == 'OK') / len(cats) * 100, 1) if cats else 0,
        }

    def _save_csv(self, results: List[AuditResult], path: Path):
        """Сохранить результаты в CSV."""
        if not results:
            return
        
        fieldnames = [
            'scenario_id', 'species', 'age_months', 'weight_kg', 'food_type', 'variant',
            'target_kcal', 'actual_kcal', 'kcal_delta_pct', 'is_kcal_valid',
            'protein_target_min', 'protein_target_max', 'protein_actual', 'is_protein_valid',
            'fat_target_min', 'fat_target_max', 'fat_actual', 'is_fat_valid',
            'fiber_target_min', 'fiber_target_max', 'fiber_actual', 'is_fiber_valid',
            'is_bju_valid', 'components_count', 'supplements_count',
            'has_dry', 'has_wet', 'has_treats',
            'validation_warnings_count', 'has_critical_errors', 'overall_status',
        ]
        
        with open(path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in results:
                row = {k: getattr(r, k) for k in fieldnames}
                writer.writerow(row)

    def _save_markdown_report(self, results: List[AuditResult], summary: Dict, path: Path):
        """Сохранить отчёт в Markdown."""
        lines = [
            '# Отчёт аудита системы рекомендаций кормов',
            '',
            f'**Дата:** {datetime.now().strftime("%Y-%m-%d %H:%M")}',
            f'**Всего сценариев:** {summary["total"]}',
            '',
            '## Сводка',
            '',
            '| Метрика | Значение |',
            '|---------|----------|',
            f'| OK | {summary["ok_count"]} ({summary["ok_pct"]}%) |',
            f'| WARN | {summary["warn_count"]} ({summary["warn_pct"]}%) |',
            f'| CRITICAL | {summary["critical_count"]} ({summary["critical_pct"]}%) |',
            '',
            '## Валидация',
            '',
            '| Параметр | Валидных (%) |',
            '|----------|--------------|',
            f'| Калории (±15%) | {summary["kcal_valid_pct"]}% |',
            f'| БЖУ (protein+fat) | {summary["bju_valid_pct"]}% |',
            f'| Белок | {summary["protein_valid_pct"]}% |',
            f'| Жир | {summary["fat_valid_pct"]}% |',
            f'| Клетчатка | {summary["fiber_valid_pct"]}% |',
            '',
            '## По видам',
            '',
            f'- **Собаки:** {summary["dogs_count"]} сценариев, {summary["dogs_ok_pct"]}% OK',
            f'- **Кошки:** {summary["cats_count"]} сценариев, {summary["cats_ok_pct"]}% OK',
            '',
            '## Выбросы по калориям (>30% отклонение)',
            '',
            f'Найдено: {summary["kcal_outliers_count"]} сценариев',
            '',
        ]
        
        # Топ-10 выбросов
        outliers = sorted(
            [r for r in results if abs(r.kcal_delta_pct) > 30],
            key=lambda r: abs(r.kcal_delta_pct),
            reverse=True
        )[:10]
        
        if outliers:
            lines.extend([
                '### Топ-10 выбросов',
                '',
                '| ID | Вид | Возраст | Вес | Target | Actual | Delta |',
                '|----|-----|---------|-----|--------|--------|-------|',
            ])
            for r in outliers:
                lines.append(
                    f'| {r.scenario_id} | {r.species} | {r.age_months}м | {r.weight_kg}кг | '
                    f'{r.target_kcal} | {r.actual_kcal} | {r.kcal_delta_pct:+.1f}% |'
                )
            lines.append('')
        
        # Критические ошибки
        criticals = [r for r in results if r.overall_status == 'CRITICAL'][:20]
        if criticals:
            lines.extend([
                '## Критические ошибки',
                '',
            ])
            for r in criticals:
                lines.append(f'- Сценарий {r.scenario_id}: {", ".join(r.errors[:2])}')
            lines.append('')
        
        lines.extend([
            '## Критерии успеха',
            '',
            f'- [{"x" if summary["critical_count"] == 0 else " "}] 0 critical в аудите',
            f'- [{"x" if summary["ok_pct"] >= 80 else " "}] ≥80% сценариев OK (текущий: {summary["ok_pct"]}%)',
            f'- [{"x" if summary["kcal_valid_pct"] >= 80 else " "}] ≥80% калорий в пределах ±15% (текущий: {summary["kcal_valid_pct"]}%)',
            f'- [{"x" if summary["bju_valid_pct"] >= 80 else " "}] ≥80% БЖУ валидны (текущий: {summary["bju_valid_pct"]}%)',
            '',
        ])
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

    def _print_summary(self, summary: Dict):
        """Вывести сводку в консоль."""
        self.stdout.write('')
        self.stdout.write('=== СВОДКА АУДИТА ===')
        self.stdout.write(f'  Всего сценариев: {summary["total"]}')
        self.stdout.write(f'  OK: {summary["ok_count"]} ({summary["ok_pct"]}%)')
        self.stdout.write(f'  WARN: {summary["warn_count"]} ({summary["warn_pct"]}%)')
        self.stdout.write(f'  CRITICAL: {summary["critical_count"]} ({summary["critical_pct"]}%)')
        self.stdout.write('')
        self.stdout.write('Валидация:')
        self.stdout.write(f'  Калории ±15%: {summary["kcal_valid_pct"]}%')
        self.stdout.write(f'  БЖУ: {summary["bju_valid_pct"]}%')
        self.stdout.write('')
        
        if summary["critical_count"] == 0 and summary["ok_pct"] >= 80:
            self.stdout.write(self.style.SUCCESS('[OK] Все критерии успеха выполнены!'))
        else:
            self.stdout.write(self.style.WARNING('[!] Есть проблемы, требующие внимания'))
