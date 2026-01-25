"""
Management command для импорта данных калькулятора питания.

Импортирует:
- health_conditions.json → HealthCondition
- allergies.json → Allergy

Использование:
    python manage.py import_nutrition_data
    python manage.py import_nutrition_data --conditions
    python manage.py import_nutrition_data --allergies
"""

import json
import os
from django.core.management.base import BaseCommand, CommandError
from apps.pets.nutrition_models import HealthCondition, Allergy


class Command(BaseCommand):
    help = 'Импорт данных для калькулятора питания из JSON файлов'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--conditions',
            action='store_true',
            help='Импортировать только заболевания'
        )
        parser.add_argument(
            '--allergies',
            action='store_true',
            help='Импортировать только аллергии'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Очистить таблицы перед импортом'
        )
    
    def get_data_path(self, filename):
        """Получение пути к файлу данных."""
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        )))
        return os.path.join(
            base_path, 'docs', '1 petID + breeds + подбор корма', 'data', filename
        )
    
    def import_health_conditions(self, clear=False):
        """Импорт заболеваний."""
        filepath = self.get_data_path('health_conditions.json')
        
        if not os.path.exists(filepath):
            raise CommandError(f'Файл не найден: {filepath}')
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if clear:
            deleted, _ = HealthCondition.objects.all().delete()
            self.stdout.write(f'Удалено {deleted} записей HealthCondition')
        
        created = 0
        updated = 0
        
        for item in data:
            # Обработка BCS диапазона
            bcs_range = item.get('bcs_range', {})
            
            defaults = {
                'name_ru': item.get('name_ru', ''),
                'name_en': item.get('name_en', ''),
                'species': item.get('species', 'both'),
                'category': item.get('category', 'other'),
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
            
            obj, is_created = HealthCondition.objects.update_or_create(
                code=item['code'],
                defaults=defaults
            )
            
            if is_created:
                created += 1
            else:
                updated += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'HealthCondition: создано {created}, обновлено {updated}'
            )
        )
    
    def import_allergies(self, clear=False):
        """Импорт аллергий."""
        filepath = self.get_data_path('allergies.json')
        
        if not os.path.exists(filepath):
            raise CommandError(f'Файл не найден: {filepath}')
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if clear:
            deleted, _ = Allergy.objects.all().delete()
            self.stdout.write(f'Удалено {deleted} записей Allergy')
        
        created = 0
        updated = 0
        skipped = 0
        
        for item in data:
            code = item.get('code')
            if not code:
                skipped += 1
                continue
            
            # Преобразование animal_type
            animal_type = item.get('animal_type', 'Both')
            if animal_type == 'Dog':
                animal_type = 'dog'
            elif animal_type == 'Cat':
                animal_type = 'cat'
            else:
                animal_type = 'both'
            
            defaults = {
                'animal_type': animal_type,
                'allergen_type': item.get('allergen_type', 'Food'),
                'specific_allergen': item.get('specific_allergen', ''),
                'display_name': item.get('display_name', ''),
                'prevalence_rate': item.get('prevalence_rate', 'Common'),
                'typical_symptoms': item.get('typical_symptoms', ''),
                'diagnostic_approach': item.get('diagnostic_approach', ''),
                'management_strategies': item.get('management_strategies', ''),
                'seasonal_pattern': item.get('seasonal_pattern'),
            }
            
            obj, is_created = Allergy.objects.update_or_create(
                code=code,
                defaults=defaults
            )
            
            if is_created:
                created += 1
            else:
                updated += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Allergy: создано {created}, обновлено {updated}, пропущено {skipped}'
            )
        )
    
    def handle(self, *args, **options):
        import_conditions = options.get('conditions', False)
        import_allergies = options.get('allergies', False)
        clear = options.get('clear', False)
        
        # Если не указаны флаги, импортируем всё
        if not import_conditions and not import_allergies:
            import_conditions = True
            import_allergies = True
        
        self.stdout.write('Начинаем импорт данных калькулятора питания...')
        
        if import_conditions:
            self.import_health_conditions(clear=clear)
        
        if import_allergies:
            self.import_allergies(clear=clear)
        
        self.stdout.write(self.style.SUCCESS('Импорт завершён!'))
