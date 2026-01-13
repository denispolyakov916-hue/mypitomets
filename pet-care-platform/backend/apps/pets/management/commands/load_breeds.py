"""
Команда для загрузки данных о породах из JSON файла.

Использование:
    python manage.py load_breeds
    python manage.py load_breeds --clear  # очистить перед загрузкой
"""

import json
import os
from django.core.management.base import BaseCommand
from apps.pets.breed_models import Breed, BreedHealth, BreedNutrition, BreedCare


class Command(BaseCommand):
    help = 'Загрузка данных о породах собак и кошек из JSON файла'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Очистить существующие данные перед загрузкой',
        )

    def handle(self, *args, **options):
        # Путь к JSON файлу
        json_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))),
            'data_breeds',
            'breeds_data.json'
        )
        
        if not os.path.exists(json_path):
            self.stderr.write(self.style.ERROR(f'Файл не найден: {json_path}'))
            return
        
        # Очистка при необходимости
        if options['clear']:
            self.stdout.write('Очистка существующих данных...')
            BreedCare.objects.all().delete()
            BreedNutrition.objects.all().delete()
            BreedHealth.objects.all().delete()
            Breed.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Данные очищены'))
        
        # Загрузка JSON
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        breeds_data = data.get('breeds', [])
        created_count = 0
        updated_count = 0
        
        for breed_data in breeds_data:
            breed, created = Breed.objects.update_or_create(
                slug=breed_data['slug'],
                defaults={
                    'species': breed_data['species'],
                    'name': breed_data['name'],
                    'name_en': breed_data.get('name_en', ''),
                    'description': breed_data.get('description', ''),
                    'short_description': breed_data.get('short_description', ''),
                    'origin_country': breed_data.get('origin_country', ''),
                    'size_category': breed_data['size_category'],
                    'weight_min': breed_data['weight_min'],
                    'weight_max': breed_data['weight_max'],
                    'height_min': breed_data.get('height_min'),
                    'height_max': breed_data.get('height_max'),
                    'lifespan_min': breed_data['lifespan_min'],
                    'lifespan_max': breed_data['lifespan_max'],
                    'energy_level': breed_data['energy_level'],
                    'trainability': breed_data['trainability'],
                    'intelligence': breed_data['intelligence'],
                    'friendliness_to_children': breed_data['friendliness_to_children'],
                    'friendliness_to_pets': breed_data.get('friendliness_to_pets', 'medium'),
                    'friendliness_to_strangers': breed_data.get('friendliness_to_strangers', 'medium'),
                    'grooming_frequency': breed_data['grooming_frequency'],
                    'shedding_level': breed_data['shedding_level'],
                    'coat_type': breed_data['coat_type'],
                    'health_risk_level': breed_data['health_risk_level'],
                    'hypoallergenic': breed_data.get('hypoallergenic', False),
                    'brachycephalic': breed_data.get('brachycephalic', False),
                    'apartment_friendly': breed_data.get('apartment_friendly', True),
                    'good_for_novice': breed_data.get('good_for_novice', True),
                    'exercise_needs': breed_data.get('exercise_needs', 'medium'),
                }
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Загружено пород: {created_count} создано, {updated_count} обновлено. '
                f'Всего: {Breed.objects.count()}'
            )
        )


