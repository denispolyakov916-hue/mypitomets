"""
Команда загрузки данных о породах из JSON файлов.

Usage:
    python manage.py load_breeds
"""

import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.pets.models import Breed, BreedHealth, BreedNutrition, BreedCare


class Command(BaseCommand):
    help = 'Загрузка данных о породах из JSON файлов'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Очистить существующие данные перед загрузкой',
        )
    
    def handle(self, *args, **options):
        # Путь к данным
        data_dir = os.path.join(settings.BASE_DIR.parent, 'data_breeds')
        
        if options['clear']:
            self.stdout.write('Очистка существующих данных...')
            BreedCare.objects.all().delete()
            BreedNutrition.objects.all().delete()
            BreedHealth.objects.all().delete()
            Breed.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('[OK] Данные очищены'))
        
        # 1. Загрузка пород
        self.stdout.write('\n1. Загрузка пород...')
        breeds_file = os.path.join(data_dir, 'breeds.json')
        
        with open(breeds_file, 'r', encoding='utf-8') as f:
            breeds_data = json.load(f)
        
        breeds_to_create = []
        for breed_data in breeds_data:
            breeds_to_create.append(Breed(
                id=breed_data['id'],
                species=breed_data['species'],
                name=breed_data['name'],
                name_en=breed_data['name_en'],
                slug=breed_data['slug'],
                description=breed_data.get('description', ''),
                short_description=breed_data.get('short_description', ''),
                size_category=breed_data['size_category'],
                weight_min=breed_data['weight_min'],
                weight_max=breed_data['weight_max'],
                height_min=breed_data.get('height_min'),
                height_max=breed_data.get('height_max'),
                lifespan_min=breed_data['lifespan_min'],
                lifespan_max=breed_data['lifespan_max'],
                energy_level=breed_data['energy_level'],
                trainability=breed_data['trainability'],
                intelligence=breed_data['intelligence'],
                friendliness_to_children=breed_data['friendliness_to_children'],
                friendliness_to_pets=breed_data['friendliness_to_pets'],
                friendliness_to_strangers=breed_data['friendliness_to_strangers'],
                independence=breed_data['independence'],
                grooming_frequency=breed_data['grooming_frequency'],
                shedding_level=breed_data['shedding_level'],
                coat_type=breed_data['coat_type'],
                health_risk_level=breed_data['health_risk_level'],
                hypoallergenic=breed_data['hypoallergenic'],
                brachycephalic=breed_data['brachycephalic'],
                apartment_friendly=breed_data['apartment_friendly'],
                good_for_novice=breed_data['good_for_novice'],
            ))
        
        Breed.objects.bulk_create(breeds_to_create, ignore_conflicts=True)
        breeds_created = len(breeds_to_create)
        
        self.stdout.write(self.style.SUCCESS(f'[OK] Загружено пород: {breeds_created} новых, {len(breeds_data) - breeds_created} обновлено'))
        
        # 2. Загрузка рисков здоровья
        self.stdout.write('\n2. Загрузка рисков здоровья...')
        health_file = os.path.join(data_dir, 'breed_health.json')
        
        with open(health_file, 'r', encoding='utf-8') as f:
            health_data = json.load(f)
        
        health_created = 0
        skipped_health = 0
        for health_item in health_data:
            try:
                # Валидация данных
                if not health_item.get('condition_name') or not health_item.get('condition_name').strip():
                    skipped_health += 1
                    continue
                
                if health_item.get('prevalence_percent') is None:
                    skipped_health += 1
                    continue
                
                breed = Breed.objects.get(id=health_item['breed_id'])
                health, created = BreedHealth.objects.get_or_create(
                    breed=breed,
                    condition_name=health_item['condition_name'],
                    defaults={
                        'condition_type': health_item.get('condition_type', 'genetic'),
                        'affected_system': health_item.get('affected_system', 'general'),
                        'severity': health_item.get('severity', 'medium'),
                        'prevalence_percent': health_item['prevalence_percent'],
                        'age_of_onset': health_item.get('age_of_onset') or 'переменный',
                        'prevention': health_item.get('prevention', 'Консультация ветеринара'),
                        'screening': health_item.get('screening', 'Консультация ветеринара'),
                    }
                )
                if created:
                    health_created += 1
            except Breed.DoesNotExist:
                skipped_health += 1
            except Exception as e:
                skipped_health += 1
                self.stdout.write(self.style.WARNING(f'Ошибка: {str(e)[:50]}'))
        
        self.stdout.write(self.style.SUCCESS(f'[OK] Загружено рисков здоровья: {health_created} новых'))
        
        # 3. Загрузка рекомендаций по питанию
        self.stdout.write('\n3. Загрузка рекомендаций по питанию...')
        nutrition_file = os.path.join(data_dir, 'breed_nutrition.json')
        
        with open(nutrition_file, 'r', encoding='utf-8') as f:
            nutrition_data = json.load(f)
        
        nutrition_created = 0
        for nutrition_item in nutrition_data:
            try:
                breed = Breed.objects.get(id=nutrition_item['breed_id'])
                nutrition, created = BreedNutrition.objects.update_or_create(
                    breed=breed,
                    defaults={
                        'protein_need': nutrition_item['protein_need'],
                        'calorie_density': nutrition_item['calorie_density'],
                        'diet_type': nutrition_item['diet_type'],
                        'feeding_frequency': nutrition_item['feeding_frequency'],
                        'special_considerations': nutrition_item.get('special_considerations', ''),
                        'common_allergens': nutrition_item.get('common_allergens', []),
                    }
                )
                if created:
                    nutrition_created += 1
            except Breed.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'Порода {nutrition_item["breed_id"]} не найдена'))
        
        self.stdout.write(self.style.SUCCESS(f'[OK] Загружено рекомендаций по питанию: {nutrition_created} новых'))
        
        # 4. Загрузка процедур ухода
        self.stdout.write('\n4. Загрузка процедур ухода...')
        care_file = os.path.join(data_dir, 'breed_care.json')
        
        with open(care_file, 'r', encoding='utf-8') as f:
            care_data = json.load(f)
        
        care_created = 0
        for care_item in care_data:
            try:
                breed = Breed.objects.get(id=care_item['breed_id'])
                care, created = BreedCare.objects.get_or_create(
                    breed=breed,
                    procedure=care_item['procedure'],
                    defaults={
                        'care_category': care_item['care_category'],
                        'frequency': care_item['frequency'],
                        'importance': care_item['importance'],
                        'season': care_item.get('season', 'all'),
                        'notes': care_item.get('notes', ''),
                    }
                )
                if created:
                    care_created += 1
            except Breed.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'Порода {care_item["breed_id"]} не найдена'))
        
        self.stdout.write(self.style.SUCCESS(f'[OK] Загружено процедур ухода: {care_created} новых'))
        
        # Итоговая статистика
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('[OK] ЗАГРУЗКА ЗАВЕРШЕНА'))
        self.stdout.write('='*50)
        self.stdout.write(f'Пород: {Breed.objects.count()}')
        self.stdout.write(f'  - Кошек: {Breed.objects.filter(species="cat").count()}')
        self.stdout.write(f'  - Собак: {Breed.objects.filter(species="dog").count()}')
        self.stdout.write(f'Рисков здоровья: {BreedHealth.objects.count()}')
        self.stdout.write(f'Рекомендаций по питанию: {BreedNutrition.objects.count()}')
        self.stdout.write(f'Процедур ухода: {BreedCare.objects.count()}')
        self.stdout.write('='*50)

