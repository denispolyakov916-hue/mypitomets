"""
Management command для импорта правил priority+caps из JSON файлов.
"""

import json
import logging
from pathlib import Path
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.pets.nutrition_models import NutritionFactorRule, NutritionCapRule, MacroTargetRule, SupplementRule

logger = logging.getLogger('core.management')


class Command(BaseCommand):
    help = 'Импорт правил priority+caps из JSON'

    def add_arguments(self, parser):
        parser.add_argument(
            '--factors-file',
            type=str,
            default=None,
            help='Путь к файлу с правилами факторов'
        )
        parser.add_argument(
            '--caps-file',
            type=str,
            default=None,
            help='Путь к файлу с правилами caps'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Очистить все правила перед импортом'
        )
        parser.add_argument(
            '--clear-factors',
            action='store_true',
            help='Очистить только правила факторов'
        )
        parser.add_argument(
            '--clear-caps',
            action='store_true',
            help='Очистить только правила caps'
        )
        parser.add_argument(
            '--macros-file',
            type=str,
            default=None,
            help='Путь к файлу с правилами macro targets'
        )
        parser.add_argument(
            '--clear-macros',
            action='store_true',
            help='Очистить только правила macro targets'
        )
        parser.add_argument(
            '--supplements-file',
            type=str,
            default=None,
            help='Путь к файлу с правилами добавок'
        )
        parser.add_argument(
            '--clear-supplements',
            action='store_true',
            help='Очистить только правила добавок'
        )

    def _find_data_file(self, filename: str) -> Path:
        backend_dir = Path(__file__).resolve().parent.parent.parent.parent
        project_root = backend_dir.parent

        for base_dir in [project_root, backend_dir]:
            for path in base_dir.glob(f'docs/1*/data/{filename}'):
                return path

        return project_root / 'docs' / '1 petID + breeds + подбор корма' / 'data' / filename

    def _load_rules(self, file_path: Path):
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, dict):
            return data.get('rules', [])
        if isinstance(data, list):
            return data
        return []

    @transaction.atomic
    def handle(self, *args, **options):
        factors_path = Path(options['factors_file']) if options['factors_file'] else self._find_data_file('calorie_factor_rules.json')
        caps_path = Path(options['caps_file']) if options['caps_file'] else self._find_data_file('calorie_cap_rules.json')
        macros_path = Path(options['macros_file']) if options['macros_file'] else self._find_data_file('macro_target_rules.json')
        supplements_path = Path(options['supplements_file']) if options['supplements_file'] else self._find_data_file('supplement_rules.json')

        if options['clear'] or options['clear_factors']:
            self.stdout.write('Очистка правил факторов...')
            NutritionFactorRule.objects.all().delete()

        if options['clear'] or options['clear_caps']:
            self.stdout.write('Очистка правил caps...')
            NutritionCapRule.objects.all().delete()

        if options['clear'] or options.get('clear_macros'):
            self.stdout.write('Очистка правил macro targets...')
            MacroTargetRule.objects.all().delete()

        if options['clear'] or options.get('clear_supplements'):
            self.stdout.write('Очистка правил добавок...')
            SupplementRule.objects.all().delete()

        if factors_path.exists():
            count = self._import_factor_rules(factors_path)
            self.stdout.write(f'  Импортировано правил факторов: {count}')
        else:
            self.stdout.write(self.style.WARNING(f'Файл факторов не найден: {factors_path}'))

        if caps_path.exists():
            count = self._import_cap_rules(caps_path)
            self.stdout.write(f'  Импортировано правил caps: {count}')
        else:
            self.stdout.write(self.style.WARNING(f'Файл caps не найден: {caps_path}'))

        if macros_path.exists():
            count = self._import_macro_rules(macros_path)
            self.stdout.write(f'  Импортировано правил macro targets: {count}')
        else:
            self.stdout.write(self.style.WARNING(f'Файл macro targets не найден: {macros_path}'))

        if supplements_path.exists():
            count = self._import_supplement_rules(supplements_path)
            self.stdout.write(f'  Импортировано правил добавок: {count}')
        else:
            self.stdout.write(self.style.WARNING(f'Файл добавок не найден: {supplements_path}'))

        self.stdout.write(self.style.SUCCESS('Импорт правил завершён'))

    def _import_factor_rules(self, file_path: Path) -> int:
        count = 0
        for item in self._load_rules(file_path):
            try:
                max_delta_pct = item.get('max_delta_pct', None)
                NutritionFactorRule.objects.update_or_create(
                    factor_key=item['factor_key'],
                    scope=item.get('scope', 'both'),
                    defaults={
                        'priority': item.get('priority', 1),
                        'max_delta_pct': Decimal(str(max_delta_pct)) if max_delta_pct is not None else None,
                        'notes': item.get('notes', ''),
                        'is_active': item.get('is_active', True),
                    }
                )
                count += 1
            except Exception as e:
                logger.error(f"Ошибка импорта factor rule {item}: {e}")
        return count

    def _import_cap_rules(self, file_path: Path) -> int:
        count = 0
        for item in self._load_rules(file_path):
            try:
                NutritionCapRule.objects.update_or_create(
                    context_key=item['context_key'],
                    scope=item.get('scope', 'both'),
                    defaults={
                        'min_mer_rer': Decimal(str(item['min_mer_rer'])),
                        'max_mer_rer': Decimal(str(item['max_mer_rer'])),
                        'notes': item.get('notes', ''),
                        'is_active': item.get('is_active', True),
                    }
                )
                count += 1
            except Exception as e:
                logger.error(f"Ошибка импорта cap rule {item}: {e}")
        return count

    def _import_macro_rules(self, file_path: Path) -> int:
        count = 0
        for item in self._load_rules(file_path):
            # Пропускаем комментарии
            if item.get('_comment') or item.get('_section'):
                continue
            try:
                defaults = {
                    'context_type': item.get('context_type', 'baseline'),
                    'priority': item.get('priority', 10),
                    'notes': item.get('notes', ''),
                    'is_active': item.get('is_active', True),
                    'disease_code': item.get('disease_code', ''),
                }
                for field in ['protein_min', 'protein_max', 'fat_min', 'fat_max', 'fiber_min', 'fiber_max']:
                    val = item.get(field)
                    defaults[field] = Decimal(str(val)) if val is not None else None
                for field in ['age_from_months', 'age_to_months']:
                    defaults[field] = item.get(field)

                MacroTargetRule.objects.update_or_create(
                    context_key=item['context_key'],
                    scope=item.get('scope', 'both'),
                    defaults=defaults
                )
                count += 1
            except Exception as e:
                logger.error(f"Ошибка импорта macro rule {item}: {e}")
        return count

    def _import_supplement_rules(self, file_path: Path) -> int:
        count = 0
        for item in self._load_rules(file_path):
            if item.get('_comment') or item.get('_section'):
                continue
            try:
                defaults = {
                    'context_type': item.get('context_type', 'baseline'),
                    'priority': item.get('priority', 5),
                    'supplement_type': item.get('supplement_type', 'vitamins'),
                    'reason_ru': item.get('reason_ru', ''),
                    'dosage_factor': Decimal(str(item.get('dosage_factor', 1.0))),
                    'age_from_months': item.get('age_from_months'),
                    'age_to_months': item.get('age_to_months'),
                    'disease_code': item.get('disease_code', ''),
                    'size_category': item.get('size_category', ''),
                    'notes': item.get('notes', ''),
                    'is_active': item.get('is_active', True),
                }
                SupplementRule.objects.update_or_create(
                    context_key=item['context_key'],
                    scope=item.get('scope', 'both'),
                    supplement_type=item.get('supplement_type', 'vitamins'),
                    defaults=defaults
                )
                count += 1
            except Exception as e:
                logger.error(f"Ошибка импорта supplement rule {item}: {e}")
        return count
