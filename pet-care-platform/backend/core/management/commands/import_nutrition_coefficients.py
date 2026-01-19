"""
Management command для импорта коэффициентов питания из coefficients_nutrition.json.
"""

import json
import logging
from pathlib import Path
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.pets.nutrition_models import NutritionCoefficient

logger = logging.getLogger('core.management')


class Command(BaseCommand):
    help = 'Импорт коэффициентов питания из coefficients_nutrition.json'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default=None,
            help='Путь к файлу с коэффициентами'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Очистить существующие данные перед импортом'
        )

    def _find_data_file(self, filename: str) -> Path:
        """Ищет файл данных в возможных путях."""
        backend_dir = Path(__file__).resolve().parent.parent.parent.parent
        project_root = backend_dir.parent
        
        for base_dir in [project_root, backend_dir]:
            for path in base_dir.glob(f'docs/1*/data/{filename}'):
                return path
        
        return project_root / 'docs' / '1 petID + breeds + подбор корма' / 'data' / filename

    @transaction.atomic
    def handle(self, *args, **options):
        file_path = Path(options['file']) if options['file'] else self._find_data_file('coefficients_nutrition.json')
        
        if not file_path.exists():
            self.stdout.write(self.style.ERROR(f'Файл не найден: {file_path}'))
            return
        
        if options['clear']:
            self.stdout.write('Очистка существующих коэффициентов...')
            NutritionCoefficient.objects.all().delete()
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        total_count = 0
        
        # Импорт коэффициентов размера
        if 'size_category' in data:
            count = self._import_size_coefficients(data['size_category'])
            total_count += count
            self.stdout.write(f'  Импортировано {count} коэффициентов размера')
        
        # Импорт возрастных коэффициентов
        if 'age' in data:
            count = self._import_age_coefficients(data['age'])
            total_count += count
            self.stdout.write(f'  Импортировано {count} возрастных коэффициентов')
        
        # Импорт коэффициентов активности
        if 'activity_level' in data:
            count = self._import_activity_coefficients(data['activity_level'])
            total_count += count
            self.stdout.write(f'  Импортировано {count} коэффициентов активности')
        
        # Импорт коэффициентов кастрации
        if 'neutering' in data:
            count = self._import_neutering_coefficients(data['neutering'])
            total_count += count
            self.stdout.write(f'  Импортировано {count} коэффициентов кастрации')
        
        # Импорт коэффициентов шерсти
        if 'coat_type' in data:
            count = self._import_coat_coefficients(data['coat_type'])
            total_count += count
            self.stdout.write(f'  Импортировано {count} коэффициентов шерсти')
        
        # Импорт коэффициентов климата
        if 'climate' in data:
            count = self._import_climate_coefficients(data['climate'])
            total_count += count
            self.stdout.write(f'  Импортировано {count} коэффициентов климата')
        
        # Импорт коэффициентов жилья
        if 'housing' in data:
            count = self._import_housing_coefficients(data['housing'])
            total_count += count
            self.stdout.write(f'  Импортировано {count} коэффициентов жилья')
        
        # Импорт репродуктивных коэффициентов
        if 'reproductive' in data:
            count = self._import_reproductive_coefficients(data['reproductive'])
            total_count += count
            self.stdout.write(f'  Импортировано {count} репродуктивных коэффициентов')
        
        self.stdout.write(self.style.SUCCESS(f'Всего импортировано: {total_count} коэффициентов'))

    def _import_size_coefficients(self, data: dict) -> int:
        """Импорт коэффициентов размера."""
        count = 0
        for species, items in data.items():
            if species.startswith('_'):
                continue
            for item in items:
                try:
                    code = f"{species}_{item['code']}"
                    NutritionCoefficient.objects.update_or_create(
                        species=species,
                        coefficient_type='size_category',
                        code=code,
                        defaults={
                            'name_ru': item.get('name_ru', ''),
                            'coefficient': Decimal(str(item.get('coefficient', 1.0))),
                            'weight_min_kg': item.get('weight_min_kg'),
                            'weight_max_kg': item.get('weight_max_kg'),
                            'source': item.get('source', ''),
                        }
                    )
                    count += 1
                except Exception as e:
                    logger.error(f"Ошибка импорта size_category {item}: {e}")
        return count

    def _import_age_coefficients(self, data: dict) -> int:
        """Импорт возрастных коэффициентов."""
        count = 0
        for species, items in data.items():
            if species.startswith('_'):
                continue
            for item in items:
                try:
                    code = f"{species}_{item['code']}"
                    NutritionCoefficient.objects.update_or_create(
                        species=species,
                        coefficient_type='age',
                        code=code,
                        defaults={
                            'name_ru': item.get('name_ru', ''),
                            'coefficient': Decimal(str(item.get('coefficient', 1.0))),
                            'coefficient_min': item.get('coefficient_min'),
                            'coefficient_max': item.get('coefficient_max'),
                            'age_from_months': item.get('age_from_months'),
                            'age_to_months': item.get('age_to_months'),
                            'source': item.get('source', ''),
                        }
                    )
                    count += 1
                except Exception as e:
                    logger.error(f"Ошибка импорта age {item}: {e}")
        return count

    def _import_activity_coefficients(self, data: dict) -> int:
        """Импорт коэффициентов активности."""
        count = 0
        for species, items in data.items():
            if species.startswith('_'):
                continue
            for item in items:
                try:
                    code = f"{species}_{item['code']}"
                    NutritionCoefficient.objects.update_or_create(
                        species=species,
                        coefficient_type='activity_level',
                        code=code,
                        defaults={
                            'name_ru': item.get('name_ru', ''),
                            'coefficient': Decimal(str(item.get('coefficient', 1.0))),
                            'daily_activity_hours_max': item.get('daily_activity_hours_max'),
                            'description': item.get('description', ''),
                            'source': item.get('source', ''),
                        }
                    )
                    count += 1
                except Exception as e:
                    logger.error(f"Ошибка импорта activity {item}: {e}")
        return count

    def _import_neutering_coefficients(self, data: dict) -> int:
        """Импорт коэффициентов кастрации."""
        count = 0
        for species, items in data.items():
            if species.startswith('_'):
                continue
            for item in items:
                try:
                    code = f"{species}_{item['code']}"
                    NutritionCoefficient.objects.update_or_create(
                        species=species,
                        coefficient_type='neutering',
                        code=code,
                        defaults={
                            'name_ru': item.get('name_ru', ''),
                            'coefficient': Decimal(str(item.get('coefficient', 1.0))),
                            'source': item.get('source', ''),
                        }
                    )
                    count += 1
                except Exception as e:
                    logger.error(f"Ошибка импорта neutering {item}: {e}")
        return count

    def _import_coat_coefficients(self, data: dict) -> int:
        """Импорт коэффициентов шерсти."""
        count = 0
        for species, items in data.items():
            if species.startswith('_'):
                continue
            for item in items:
                try:
                    code = f"{species}_{item['code']}"
                    NutritionCoefficient.objects.update_or_create(
                        species=species,
                        coefficient_type='coat_type',
                        code=code,
                        defaults={
                            'name_ru': item.get('name_ru', ''),
                            'coefficient': Decimal(str(item.get('coefficient', 1.0))),
                            'examples': item.get('examples', ''),
                            'source': item.get('source', ''),
                        }
                    )
                    count += 1
                except Exception as e:
                    logger.error(f"Ошибка импорта coat {item}: {e}")
        return count

    def _import_climate_coefficients(self, data: dict) -> int:
        """Импорт коэффициентов климата."""
        count = 0
        for species, items in data.items():
            if species.startswith('_'):
                continue
            for item in items:
                try:
                    code = f"{species}_{item['code']}"
                    NutritionCoefficient.objects.update_or_create(
                        species=species,
                        coefficient_type='climate',
                        code=code,
                        defaults={
                            'name_ru': item.get('name_ru', ''),
                            'coefficient': Decimal(str(item.get('coefficient', 1.0))),
                            'description': item.get('description', ''),
                            'source': item.get('source', ''),
                        }
                    )
                    count += 1
                except Exception as e:
                    logger.error(f"Ошибка импорта climate {item}: {e}")
        return count

    def _import_housing_coefficients(self, data: dict) -> int:
        """Импорт коэффициентов жилья."""
        count = 0
        for species, items in data.items():
            if species.startswith('_'):
                continue
            for item in items:
                try:
                    code = f"{species}_{item['code']}"
                    NutritionCoefficient.objects.update_or_create(
                        species=species,
                        coefficient_type='housing',
                        code=code,
                        defaults={
                            'name_ru': item.get('name_ru', ''),
                            'coefficient': Decimal(str(item.get('coefficient', 1.0))),
                            'description': item.get('description', ''),
                            'source': item.get('source', ''),
                        }
                    )
                    count += 1
                except Exception as e:
                    logger.error(f"Ошибка импорта housing {item}: {e}")
        return count

    def _import_reproductive_coefficients(self, data: dict) -> int:
        """Импорт репродуктивных коэффициентов."""
        count = 0
        for species, items in data.items():
            if species.startswith('_'):
                continue
            for item in items:
                try:
                    code = f"{species}_{item['code']}"
                    NutritionCoefficient.objects.update_or_create(
                        species=species,
                        coefficient_type='reproductive',
                        code=code,
                        defaults={
                            'name_ru': item.get('name_ru', ''),
                            'coefficient': Decimal(str(item.get('coefficient', 1.0))),
                            'coefficient_min': item.get('coefficient_min'),
                            'coefficient_max': item.get('coefficient_max'),
                            'description': item.get('description', ''),
                            'source': item.get('source', ''),
                        }
                    )
                    count += 1
                except Exception as e:
                    logger.error(f"Ошибка импорта reproductive {item}: {e}")
        return count
