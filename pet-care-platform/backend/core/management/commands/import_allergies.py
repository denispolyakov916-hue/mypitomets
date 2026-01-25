"""
Management command для импорта аллергий из allergies.json.
"""

import json
import logging
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.pets.nutrition_models import Allergy

logger = logging.getLogger('core.management')


class Command(BaseCommand):
    help = 'Импорт аллергий из allergies.json'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default=None,
            help='Путь к файлу с аллергиями'
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
        file_path = Path(options['file']) if options['file'] else self._find_data_file('allergies.json')
        
        if not file_path.exists():
            self.stdout.write(self.style.ERROR(f'Файл не найден: {file_path}'))
            return
        
        if options['clear']:
            self.stdout.write('Очистка существующих аллергий...')
            Allergy.objects.all().delete()
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        count = 0
        for item in data:
            try:
                code = item.get('code', '')
                if not code:
                    continue
                
                allergy, created = Allergy.objects.update_or_create(
                    code=code,
                    defaults={
                        'animal_type': self._normalize_animal_type(item.get('animal_type', 'Dog')),
                        'allergen_type': self._normalize_allergen_type(item.get('allergen_type', 'Food')),
                        'specific_allergen': item.get('specific_allergen', ''),
                        'display_name': item.get('display_name', ''),
                        'prevalence_rate': self._normalize_prevalence(item.get('prevalence_rate', 'Common')),
                        'typical_symptoms': item.get('typical_symptoms', ''),
                        'diagnostic_approach': item.get('diagnostic_approach', ''),
                        'management_strategies': item.get('management_strategies', ''),
                        'seasonal_pattern': item.get('seasonal_pattern') or '',
                    }
                )
                count += 1
                
                if count % 50 == 0:
                    self.stdout.write(f'  Обработано {count} аллергий...')
                    
            except Exception as e:
                logger.error(f"Ошибка импорта аллергии {item.get('code')}: {e}")
                self.stdout.write(self.style.ERROR(f"Ошибка: {item.get('code', 'unknown')} - {e}"))
        
        self.stdout.write(self.style.SUCCESS(f'Импортировано {count} аллергий'))

    def _normalize_animal_type(self, animal_type: str) -> str:
        """Нормализация типа животного."""
        mapping = {
            'dog': 'dog',
            'cat': 'cat',
            'both': 'both',
        }
        return mapping.get(animal_type.lower() if animal_type else 'dog', 'dog')

    def _normalize_allergen_type(self, allergen_type: str) -> str:
        """Нормализация типа аллергена."""
        valid_types = ['Environmental', 'Food', 'Flea', 'Contact', 'Drug', 'Seasonal']
        return allergen_type if allergen_type in valid_types else 'Food'

    def _normalize_prevalence(self, prevalence: str) -> str:
        """Нормализация распространённости."""
        valid_prevalence = ['Rare', 'Uncommon', 'Common', 'Very Common']
        return prevalence if prevalence in valid_prevalence else 'Common'
