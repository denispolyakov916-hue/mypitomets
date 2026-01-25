"""
Management command для импорта заболеваний из health_conditions.json.
"""

import json
import logging
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.pets.nutrition_models import HealthCondition

logger = logging.getLogger('core.management')


class Command(BaseCommand):
    help = 'Импорт заболеваний из health_conditions.json'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default=None,
            help='Путь к файлу с заболеваниями'
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
        file_path = Path(options['file']) if options['file'] else self._find_data_file('health_conditions.json')
        
        if not file_path.exists():
            self.stdout.write(self.style.ERROR(f'Файл не найден: {file_path}'))
            return
        
        if options['clear']:
            self.stdout.write('Очистка существующих заболеваний...')
            HealthCondition.objects.all().delete()
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        count = 0
        for item in data:
            try:
                code = item.get('code', '')
                if not code:
                    continue
                
                # Извлечение BCS диапазона
                bcs_range = item.get('bcs_range', {})
                
                condition, created = HealthCondition.objects.update_or_create(
                    code=code,
                    defaults={
                        'name_ru': item.get('name_ru', ''),
                        'name_en': item.get('name_en', ''),
                        'species': self._normalize_species(item.get('species', 'both')),
                        'category': self._normalize_category(item.get('category', 'other')),
                        'coefficient_min': item.get('coefficient_min', 1.0),
                        'coefficient_max': item.get('coefficient_max', 1.0),
                        'priority': item.get('priority', 'MEDIUM'),
                        'direction': item.get('direction', 'NEUTRAL'),
                        'symptoms': item.get('symptoms', []),
                        'dietary_recommendations': item.get('dietary_recommendations', {}),
                        'contraindicated_ingredients': item.get('contraindicated_ingredients', []),
                        'bcs_range_min': bcs_range.get('min'),
                        'bcs_range_max': bcs_range.get('max'),
                        'source': item.get('source', ''),
                        'clinical_notes': item.get('clinical_notes', ''),
                    }
                )
                count += 1
                
            except Exception as e:
                logger.error(f"Ошибка импорта заболевания {item.get('code')}: {e}")
                self.stdout.write(self.style.ERROR(f"Ошибка: {item.get('code', 'unknown')} - {e}"))
        
        self.stdout.write(self.style.SUCCESS(f'Импортировано {count} заболеваний'))

    def _normalize_species(self, species: str) -> str:
        """Нормализация вида."""
        mapping = {
            'dog': 'dog',
            'cat': 'cat',
            'both': 'both',
            'all': 'both',
        }
        return mapping.get(species.lower() if species else 'both', 'both')

    def _normalize_category(self, category: str) -> str:
        """Нормализация категории."""
        valid_categories = [
            'metabolic', 'endocrine', 'renal', 'hepatic', 
            'gastrointestinal', 'cardiovascular', 'musculoskeletal',
            'immune', 'oncology', 'urinary', 'dental', 'recovery', 'other'
        ]
        return category.lower() if category.lower() in valid_categories else 'other'
