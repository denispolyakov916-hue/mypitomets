"""
Management command для импорта пород из JSON файлов.

Импортирует данные из:
- breeds.json (собаки, FCI классификация)
- cats_breeds.json (кошки, WCF классификация)
"""

import json
import logging
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.pets.breed_models import Breed

logger = logging.getLogger('core.management')


class Command(BaseCommand):
    help = 'Импорт пород собак и кошек из JSON файлов'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dogs-file',
            type=str,
            default=None,
            help='Путь к файлу с породами собак'
        )
        parser.add_argument(
            '--cats-file',
            type=str,
            default=None,
            help='Путь к файлу с породами кошек'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Очистить существующие данные перед импортом'
        )

    def _find_data_file(self, filename: str) -> Path:
        """Ищет файл данных в возможных путях."""
        # Получаем корневую директорию проекта (на 2 уровня выше backend)
        backend_dir = Path(__file__).resolve().parent.parent.parent.parent
        project_root = backend_dir.parent
        
        # Возможные места расположения
        possible_paths = [
            project_root / 'docs' / '1 petID + breeds + подбор корма' / 'data' / filename,
            backend_dir / 'docs' / '1 petID + breeds + подбор корма' / 'data' / filename,
        ]
        
        # Ищем через glob если точный путь не найден
        for base_dir in [project_root, backend_dir]:
            for path in base_dir.glob(f'docs/1*/data/{filename}'):
                return path
        
        for path in possible_paths:
            if path.exists():
                return path
        
        return possible_paths[0]  # Вернём первый путь для сообщения об ошибке

    def handle(self, *args, **options):
        dogs_file = Path(options['dogs_file']) if options['dogs_file'] else self._find_data_file('breeds.json')
        cats_file = Path(options['cats_file']) if options['cats_file'] else self._find_data_file('cats_breeds.json')
        
        if options['clear']:
            self.stdout.write('Очистка существующих пород...')
            Breed.objects.all().delete()
        
        total_imported = 0
        
        # Импорт собак
        if dogs_file.exists():
            count = self.import_dogs(dogs_file)
            total_imported += count
            self.stdout.write(self.style.SUCCESS(f'Импортировано {count} пород собак'))
        else:
            self.stdout.write(self.style.WARNING(f'Файл не найден: {dogs_file}'))
        
        # Импорт кошек
        if cats_file.exists():
            count = self.import_cats(cats_file)
            total_imported += count
            self.stdout.write(self.style.SUCCESS(f'Импортировано {count} пород кошек'))
        else:
            self.stdout.write(self.style.WARNING(f'Файл не найден: {cats_file}'))
        
        self.stdout.write(self.style.SUCCESS(f'Всего импортировано: {total_imported} пород'))

    @transaction.atomic
    def import_dogs(self, file_path: Path) -> int:
        """Импорт пород собак из breeds.json"""
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        count = 0
        for item in data:
            try:
                external_id = str(item.get('id', ''))
                name_en = item.get('name_en', '')
                name_ru = item.get('name_ru', name_en)
                
                # Генерация slug
                slug = f"dog-{slugify(name_en.lower().replace(' ', '-'))}"
                
                # Извлечение веса
                ideal_weight = item.get('ideal_weight', {})
                male_weight = ideal_weight.get('male', {})
                female_weight = ideal_weight.get('female', {})
                
                breed, created = Breed.objects.update_or_create(
                    external_id=external_id,
                    defaults={
                        'species': 'dog',
                        'name': name_ru,
                        'name_en': name_en,
                        'slug': slug,
                        # FCI
                        'fci_number': item.get('fci_number'),
                        'fci_group': item.get('fci_group'),
                        'fci_section': item.get('fci_section'),
                        'fci_subsection': item.get('fci_subsection'),
                        # Общее
                        'country_origin': item.get('country_origin', ''),
                        'purpose': item.get('purpose', ''),
                        'short_description': item.get('short_description_ru', ''),
                        'short_description_en': item.get('short_description_en', ''),
                        # Физика
                        'coat_type': item.get('coat_type', 'short'),
                        'size_category': self._normalize_size(item.get('size_category', 'medium')),
                        'average_lifespan': item.get('average_lifespan', 12),
                        # Вес
                        'weight_male_min': male_weight.get('min'),
                        'weight_male_max': male_weight.get('max'),
                        'weight_female_min': female_weight.get('min'),
                        'weight_female_max': female_weight.get('max'),
                        # Поведение
                        'base_activity_level': self._normalize_activity(item.get('base_activity_level', 'moderate')),
                        'trainability': self._normalize_trainability(item.get('trainability', 'moderate')),
                        'grooming_needs': 'moderate',
                        # Риски
                        'health_risks': item.get('health_risks', []),
                        'allergy_risks': item.get('allergy_risks', []),
                    }
                )
                count += 1
                
                if count % 50 == 0:
                    self.stdout.write(f'  Обработано {count} пород собак...')
                    
            except Exception as e:
                logger.error(f"Ошибка импорта породы собак {item.get('id')}: {e}")
                self.stdout.write(self.style.ERROR(f"Ошибка: {item.get('name_ru', 'unknown')} - {e}"))
        
        return count

    @transaction.atomic
    def import_cats(self, file_path: Path) -> int:
        """Импорт пород кошек из cats_breeds.json"""
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        count = 0
        for item in data:
            try:
                external_id = str(item.get('id', ''))
                name_en = item.get('name_en', '')
                name_ru = item.get('name_ru', name_en)
                
                # Генерация slug
                slug = f"cat-{slugify(name_en.lower().replace(' ', '-'))}"
                
                # Извлечение веса
                ideal_weight = item.get('ideal_weight', {})
                male_weight = ideal_weight.get('male', {})
                female_weight = ideal_weight.get('female', {})
                
                breed, created = Breed.objects.update_or_create(
                    external_id=external_id,
                    defaults={
                        'species': 'cat',
                        'name': name_ru,
                        'name_en': name_en,
                        'slug': slug,
                        # WCF
                        'wcf_code': item.get('wcf_code', ''),
                        'wcf_category': item.get('wcf_category', ''),
                        # Общее
                        'country_origin': item.get('country_origin', ''),
                        'short_description': item.get('short_description_ru', ''),
                        'short_description_en': item.get('short_description_en', ''),
                        # Физика
                        'coat_type': item.get('coat_type', 'short'),
                        'size_category': self._normalize_cat_size(item.get('size_category', 'medium')),
                        'average_lifespan': item.get('average_lifespan', 15),
                        # Вес
                        'weight_male_min': male_weight.get('min'),
                        'weight_male_max': male_weight.get('max'),
                        'weight_female_min': female_weight.get('min'),
                        'weight_female_max': female_weight.get('max'),
                        # Поведение
                        'base_activity_level': self._normalize_activity(
                            item.get('base_activity_level') or item.get('activity_level', 'moderate')
                        ),
                        'trainability': self._normalize_trainability(item.get('trainability', 'moderate')),
                        'grooming_needs': self._normalize_grooming(item.get('grooming_needs', 'moderate')),
                        # Риски
                        'health_risks': item.get('health_risks', []),
                        'allergy_risks': item.get('allergy_risks', []),
                    }
                )
                count += 1
                
                if count % 20 == 0:
                    self.stdout.write(f'  Обработано {count} пород кошек...')
                    
            except Exception as e:
                logger.error(f"Ошибка импорта породы кошек {item.get('id')}: {e}")
                self.stdout.write(self.style.ERROR(f"Ошибка: {item.get('name_ru', 'unknown')} - {e}"))
        
        return count

    def _normalize_size(self, size: str) -> str:
        """Нормализация размера для собак."""
        mapping = {
            'tiny': 'toy',
            'toy': 'toy',
            'small': 'small',
            'medium': 'medium',
            'large': 'large',
            'giant': 'giant',
        }
        return mapping.get(size.lower(), 'medium')

    def _normalize_cat_size(self, size: str) -> str:
        """Нормализация размера для кошек."""
        mapping = {
            'small': 'small',
            'medium': 'medium',
            'large': 'large',
        }
        return mapping.get(size.lower(), 'medium')

    def _normalize_activity(self, activity: str) -> str:
        """Нормализация уровня активности."""
        mapping = {
            'very_low': 'very_low',
            'low': 'low',
            'moderate': 'moderate',
            'medium': 'moderate',
            'high': 'high',
            'very_high': 'very_high',
        }
        return mapping.get(activity.lower() if activity else 'moderate', 'moderate')

    def _normalize_trainability(self, trainability: str) -> str:
        """Нормализация обучаемости."""
        mapping = {
            'very_low': 'very_low',
            'low': 'low',
            'moderate': 'moderate',
            'medium': 'moderate',
            'high': 'high',
            'very_high': 'very_high',
        }
        return mapping.get(trainability.lower() if trainability else 'moderate', 'moderate')

    def _normalize_grooming(self, grooming: str) -> str:
        """Нормализация потребности в уходе."""
        mapping = {
            'minimal': 'minimal',
            'low': 'low',
            'moderate': 'moderate',
            'medium': 'moderate',
            'high': 'high',
            'very_high': 'very_high',
        }
        return mapping.get(grooming.lower() if grooming else 'moderate', 'moderate')
