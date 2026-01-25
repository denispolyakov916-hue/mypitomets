"""
Команда для заполнения данных о калорийности и БЖУ для существующих кормов.

Использует примерные значения по типу корма. 
В дальнейшем эти данные будут обновлены реальными значениями от поставщиков.

Использование:
    python manage.py update_food_nutrition
"""

from django.core.management.base import BaseCommand
from apps.shop.models import Product
from decimal import Decimal
import random


# Примерные значения калорийности и БЖУ по типам корма
# Источник: усреднённые данные популярных брендов
NUTRITION_DATA = {
    # Сухие корма
    'dry': {
        'dog': {
            'kcal': (340, 380),  # min-max ккал/100г
            'protein': (22, 28),
            'fat': (12, 18),
            'fiber': (2, 4),
            'ash': (6, 8),
            'moisture': (8, 10),
        },
        'cat': {
            'kcal': (350, 400),
            'protein': (28, 36),
            'fat': (14, 20),
            'fiber': (2, 4),
            'ash': (6, 8),
            'moisture': (8, 10),
        },
    },
    # Влажные корма (паучи)
    'wet': {
        'dog': {
            'kcal': (80, 100),
            'protein': (8, 12),
            'fat': (4, 7),
            'fiber': (0.5, 1.5),
            'ash': (1.5, 2.5),
            'moisture': (75, 82),
        },
        'cat': {
            'kcal': (85, 110),
            'protein': (9, 13),
            'fat': (5, 8),
            'fiber': (0.3, 1),
            'ash': (1.5, 2.5),
            'moisture': (75, 82),
        },
    },
    # Консервы
    'canned': {
        'dog': {
            'kcal': (90, 120),
            'protein': (9, 13),
            'fat': (5, 9),
            'fiber': (0.5, 1.5),
            'ash': (2, 3),
            'moisture': (72, 80),
        },
        'cat': {
            'kcal': (95, 125),
            'protein': (10, 14),
            'fat': (6, 10),
            'fiber': (0.3, 1),
            'ash': (2, 3),
            'moisture': (72, 80),
        },
    },
    # Паучи
    'pouch': {
        'dog': {
            'kcal': (80, 100),
            'protein': (8, 11),
            'fat': (4, 7),
            'fiber': (0.5, 1.5),
            'ash': (1.5, 2.5),
            'moisture': (78, 84),
        },
        'cat': {
            'kcal': (85, 105),
            'protein': (9, 12),
            'fat': (4.5, 7),
            'fiber': (0.3, 1),
            'ash': (1.5, 2.5),
            'moisture': (78, 84),
        },
    },
    # Паштеты
    'pate': {
        'dog': {
            'kcal': (100, 130),
            'protein': (10, 14),
            'fat': (6, 10),
            'fiber': (0.5, 1),
            'ash': (2, 3),
            'moisture': (70, 78),
        },
        'cat': {
            'kcal': (105, 135),
            'protein': (11, 15),
            'fat': (7, 11),
            'fiber': (0.3, 0.8),
            'ash': (2, 3),
            'moisture': (70, 78),
        },
    },
    # Холистик (премиум)
    'holistic': {
        'dog': {
            'kcal': (360, 420),
            'protein': (26, 34),
            'fat': (14, 20),
            'fiber': (3, 5),
            'ash': (6, 8),
            'moisture': (8, 10),
        },
        'cat': {
            'kcal': (380, 440),
            'protein': (32, 42),
            'fat': (16, 22),
            'fiber': (2, 4),
            'ash': (6, 8),
            'moisture': (8, 10),
        },
    },
    # Диетический
    'diet': {
        'dog': {
            'kcal': (280, 320),
            'protein': (24, 30),
            'fat': (8, 12),
            'fiber': (4, 8),
            'ash': (5, 7),
            'moisture': (8, 10),
        },
        'cat': {
            'kcal': (300, 340),
            'protein': (30, 38),
            'fat': (9, 13),
            'fiber': (4, 7),
            'ash': (5, 7),
            'moisture': (8, 10),
        },
    },
    # Гипоаллергенный
    'hypoallergenic': {
        'dog': {
            'kcal': (340, 380),
            'protein': (20, 26),
            'fat': (12, 16),
            'fiber': (2, 4),
            'ash': (6, 8),
            'moisture': (8, 10),
        },
        'cat': {
            'kcal': (360, 400),
            'protein': (26, 32),
            'fat': (14, 18),
            'fiber': (2, 4),
            'ash': (6, 8),
            'moisture': (8, 10),
        },
    },
}

# Списки аллергенов по ключевым словам в названии
ALLERGEN_KEYWORDS = {
    'chicken': ['курица', 'куриц', 'chicken', 'цыплёнок', 'цыпленок', 'птица', 'poultry'],
    'beef': ['говядина', 'говяж', 'beef', 'телятина'],
    'fish': ['рыба', 'fish', 'лосось', 'salmon', 'тунец', 'tuna', 'форель', 'trout', 'океанический'],
    'lamb': ['ягнёнок', 'ягненок', 'lamb', 'баранина'],
    'pork': ['свинина', 'pork'],
    'duck': ['утка', 'duck'],
    'turkey': ['индейка', 'turkey'],
    'rabbit': ['кролик', 'rabbit'],
    'venison': ['оленина', 'venison', 'дичь'],
    'eggs': ['яйцо', 'egg'],
    'dairy': ['молок', 'milk', 'сыр', 'cheese', 'творог'],
    'wheat': ['пшеница', 'wheat'],
    'corn': ['кукуруза', 'corn'],
    'soy': ['соя', 'soy'],
}

# Группы совместимости по ключевым словам
COMPATIBILITY_KEYWORDS = {
    'hypoallergenic': ['гипоаллергенный', 'hypoallergenic', 'sensitive', 'sensible'],
    'therapeutic_renal': ['renal', 'kidney', 'почки', 'почечный'],
    'therapeutic_diabetic': ['diabetic', 'диабет', 'сахарный'],
    'therapeutic_digestive': ['gastro', 'digestive', 'ЖКТ', 'пищевар', 'sensitive'],
    'therapeutic_weight': ['diet', 'light', 'weight', 'satiety', 'metabolic', 'похудения', 'облегченный'],
    'therapeutic_urinary': ['urinary', 'struvite', 'oxalate', 'МКБ', 'мочекамен'],
}

# Целевой размер по ключевым словам
SIZE_KEYWORDS = {
    'toy': ['toy', 'той', 'x-small', 'миниатюрн'],
    'small': ['small', 'маленьк', 'mini', 'мини'],
    'medium': ['medium', 'средн'],
    'large': ['large', 'крупн', 'maxi', 'макси'],
    'giant': ['giant', 'гигант'],
}


class Command(BaseCommand):
    help = 'Заполняет данные о калорийности и БЖУ для существующих кормов'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Только показать, что будет изменено, без сохранения',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Получаем все корма
        food_products = Product.objects.filter(category='food')
        total = food_products.count()
        
        self.stdout.write(f'Найдено {total} кормов для обработки')
        
        updated_count = 0
        
        for product in food_products:
            updates = {}
            
            # Определяем тип корма
            subcategory = product.subcategory or 'dry'
            animal = product.animal or 'dog'
            
            # Получаем данные по типу корма
            nutrition = NUTRITION_DATA.get(subcategory, NUTRITION_DATA['dry'])
            animal_nutrition = nutrition.get(animal, nutrition.get('dog', {}))
            
            # Генерируем значения в диапазоне
            if animal_nutrition:
                if not product.kcal_per_100g:
                    kcal_range = animal_nutrition.get('kcal', (350, 380))
                    updates['kcal_per_100g'] = Decimal(str(random.uniform(*kcal_range))).quantize(Decimal('0.1'))
                
                if not product.nutrition_protein:
                    protein_range = animal_nutrition.get('protein', (25, 30))
                    updates['nutrition_protein'] = Decimal(str(random.uniform(*protein_range))).quantize(Decimal('0.01'))
                
                if not product.nutrition_fat:
                    fat_range = animal_nutrition.get('fat', (12, 16))
                    updates['nutrition_fat'] = Decimal(str(random.uniform(*fat_range))).quantize(Decimal('0.01'))
                
                if not product.nutrition_fiber:
                    fiber_range = animal_nutrition.get('fiber', (2, 4))
                    updates['nutrition_fiber'] = Decimal(str(random.uniform(*fiber_range))).quantize(Decimal('0.01'))
                
                if not product.nutrition_ash:
                    ash_range = animal_nutrition.get('ash', (6, 8))
                    updates['nutrition_ash'] = Decimal(str(random.uniform(*ash_range))).quantize(Decimal('0.01'))
                
                if not product.nutrition_moisture:
                    moisture_range = animal_nutrition.get('moisture', (8, 10))
                    updates['nutrition_moisture'] = Decimal(str(random.uniform(*moisture_range))).quantize(Decimal('0.01'))
            
            # Определяем аллергены по названию
            if not product.allergens:
                name_lower = (product.name or '').lower()
                description_lower = (product.description or '').lower()
                text = name_lower + ' ' + description_lower
                
                allergens = []
                for allergen, keywords in ALLERGEN_KEYWORDS.items():
                    for keyword in keywords:
                        if keyword.lower() in text:
                            allergens.append(allergen)
                            break
                
                if allergens:
                    updates['allergens'] = list(set(allergens))
            
            # Определяем группу совместимости
            if product.compatibility_group == 'regular':
                name_lower = (product.name or '').lower()
                for group, keywords in COMPATIBILITY_KEYWORDS.items():
                    for keyword in keywords:
                        if keyword.lower() in name_lower:
                            updates['compatibility_group'] = group
                            break
                    if 'compatibility_group' in updates:
                        break
            
            # Определяем целевой размер
            if product.target_size == 'all':
                name_lower = (product.name or '').lower()
                for size, keywords in SIZE_KEYWORDS.items():
                    for keyword in keywords:
                        if keyword.lower() in name_lower:
                            updates['target_size'] = size
                            break
                    if 'target_size' in updates:
                        break
            
            # Применяем обновления
            if updates:
                if dry_run:
                    self.stdout.write(f'  {product.name[:50]}... -> {updates}')
                else:
                    for field, value in updates.items():
                        setattr(product, field, value)
                    product.save(update_fields=list(updates.keys()) + ['updated_at'])
                
                updated_count += 1
        
        if dry_run:
            self.stdout.write(self.style.WARNING(f'\nDRY RUN: Было бы обновлено {updated_count} из {total} кормов'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\nОбновлено {updated_count} из {total} кормов'))
