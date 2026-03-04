"""
Management command для заполнения данных о калорийности и БЖУ продуктов.

Использует типичные значения на основе:
- Подкатегории корма (dry, wet, holistic и т.д.)
- Ключевых слов в названии (puppy, senior, diet и т.д.)
- Целевого размера питомца

Запуск:
    python manage.py populate_food_nutrition
    python manage.py populate_food_nutrition --dry-run  # Только просмотр
    python manage.py populate_food_nutrition --force    # Перезаписать все
"""

import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.shop.models import Product


class Command(BaseCommand):
    help = 'Заполняет данные о калорийности и БЖУ для кормов'
    
    # Типичная калорийность по подкатегориям (ккал/100г)
    KCAL_BY_SUBCATEGORY = {
        'dry': (320, 400),           # Сухой корм
        'wet': (70, 100),            # Влажный (паучи)
        'canned': (80, 120),         # Консервы
        'holistic': (360, 420),      # Холистик
        'hypoallergenic': (340, 390),# Гипоаллергенный
        'diet': (280, 330),          # Диетический
        'premium': (340, 400),       # Премиум
        'super_premium': (350, 410), # Супер-премиум
        'grain_free': (360, 420),    # Беззерновой
        'natural': (340, 400),       # Натуральный
        'veterinary': (300, 380),    # Ветеринарный
    }
    
    # Корректировки калорийности по ключевым словам в названии
    KCAL_MODIFIERS = {
        # Уменьшают калорийность
        'light': -0.15,
        'diet': -0.15,
        'weight': -0.12,
        'sterilized': -0.08,
        'senior': -0.05,
        'mature': -0.05,
        'indoor': -0.08,
        # Увеличивают калорийность
        'puppy': 0.10,
        'kitten': 0.10,
        'junior': 0.08,
        'active': 0.12,
        'sport': 0.15,
        'energy': 0.12,
        'performance': 0.15,
    }
    
    # Типичный БЖУ и минералы по типу корма
    NUTRITION_BY_TYPE = {
        'dry_dog': {
            'protein': (22, 32),
            'fat': (12, 20),
            'fiber': (2, 5),
            'ash': (6, 9),
            'moisture': (8, 12),
            'calcium': (0.8, 1.8),
            'phosphorus': (0.6, 1.4),
            'omega3': (0.3, 1.0),
            'omega6': (1.5, 4.0),
        },
        'dry_cat': {
            'protein': (28, 40),
            'fat': (14, 22),
            'fiber': (2, 4),
            'ash': (6, 9),
            'moisture': (8, 12),
            'calcium': (0.8, 1.5),
            'phosphorus': (0.6, 1.2),
            'omega3': (0.2, 0.8),
            'omega6': (1.0, 3.0),
        },
        'wet_dog': {
            'protein': (6, 12),
            'fat': (4, 8),
            'fiber': (0.5, 2),
            'ash': (2, 4),
            'moisture': (75, 85),
            'calcium': (0.1, 0.4),
            'phosphorus': (0.1, 0.3),
            'omega3': (0.05, 0.2),
            'omega6': (0.3, 0.8),
        },
        'wet_cat': {
            'protein': (8, 14),
            'fat': (4, 10),
            'fiber': (0.5, 2),
            'ash': (2, 4),
            'moisture': (75, 85),
            'calcium': (0.1, 0.3),
            'phosphorus': (0.1, 0.25),
            'omega3': (0.03, 0.15),
            'omega6': (0.2, 0.6),
        },
    }
    
    # Возрастные диапазоны по ключевым словам
    AGE_RANGES = {
        'puppy': (0, 12),
        'kitten': (0, 12),
        'junior': (0, 18),
        'adult': (12, 84),
        'взрослый': (12, 84),
        'senior': (84, None),
        'mature': (84, None),
        'пожилой': (84, None),
        '7+': (84, None),
        'all ages': (0, None),
    }
    
    # Определение размера по ключевым словам
    SIZE_KEYWORDS = {
        'toy': 'toy',
        'mini': 'small',
        'small': 'small',
        'мелких': 'small',
        'маленьких': 'small',
        'medium': 'medium',
        'средних': 'medium',
        'large': 'large',
        'крупных': 'large',
        'giant': 'giant',
        'гигантских': 'giant',
    }
    
    # Определение аллергенов по ключевым словам
    ALLERGEN_KEYWORDS = {
        'курица': 'chicken',
        'chicken': 'chicken',
        'говядина': 'beef',
        'beef': 'beef',
        'рыба': 'fish',
        'fish': 'fish',
        'salmon': 'fish',
        'лосось': 'fish',
        'tuna': 'fish',
        'тунец': 'fish',
        'баранина': 'lamb',
        'lamb': 'lamb',
        'свинина': 'pork',
        'pork': 'pork',
        'яйцо': 'egg',
        'egg': 'egg',
        'молоко': 'dairy',
        'dairy': 'dairy',
        'пшеница': 'wheat',
        'wheat': 'wheat',
        'кукуруза': 'corn',
        'corn': 'corn',
        'соя': 'soy',
        'soy': 'soy',
    }
    
    # Группы совместимости по ключевым словам
    COMPATIBILITY_KEYWORDS = {
        'hypoallergenic': 'hypoallergenic',
        'гипоаллергенный': 'hypoallergenic',
        'renal': 'therapeutic_renal',
        'kidney': 'therapeutic_renal',
        'почки': 'therapeutic_renal',
        'diabetic': 'therapeutic_diabetic',
        'диабет': 'therapeutic_diabetic',
        'gastro': 'therapeutic_digestive',
        'digestive': 'therapeutic_digestive',
        'sensitive': 'therapeutic_digestive',
        'ЖКТ': 'therapeutic_digestive',
        'кишечник': 'therapeutic_digestive',
        'weight': 'therapeutic_weight',
        'diet': 'therapeutic_weight',
        'light': 'therapeutic_weight',
        'urinary': 'therapeutic_urinary',
        'МКБ': 'therapeutic_urinary',
    }
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать изменения без сохранения',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Перезаписать существующие значения',
        )
        parser.add_argument(
            '--category',
            type=str,
            default='food',
            help='Категория товаров (по умолчанию: food)',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        category = options['category']
        
        self.stdout.write(f'\n{"="*60}')
        self.stdout.write('Заполнение данных о калорийности продуктов')
        self.stdout.write(f'{"="*60}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Режим просмотра (--dry-run)\n'))
        
        # Получаем продукты
        queryset = Product.objects.filter(category=category)
        
        if not force:
            # Только продукты без калорийности
            queryset = queryset.filter(kcal_per_100g__isnull=True)
        
        total = queryset.count()
        self.stdout.write(f'Найдено продуктов для обработки: {total}\n')
        
        if total == 0:
            self.stdout.write(self.style.SUCCESS('Все продукты уже имеют данные о калорийности'))
            return
        
        updated = 0
        errors = 0
        
        for product in queryset.iterator():
            try:
                updates = self._process_product(product)
                
                if updates:
                    if not dry_run:
                        for field, value in updates.items():
                            setattr(product, field, value)
                        product.save(update_fields=list(updates.keys()) + ['updated_at'])
                    
                    updated += 1
                    
                    if updated <= 10 or updated % 100 == 0:
                        self.stdout.write(
                            f'  [{updated}/{total}] {product.name[:50]}... '
                            f'kcal={updates.get("kcal_per_100g", "-")}'
                        )
                    
            except Exception as e:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(f'Ошибка обработки {product.id}: {e}')
                )
        
        self.stdout.write(f'\n{"="*60}')
        self.stdout.write(self.style.SUCCESS(f'Обновлено: {updated}'))
        if errors:
            self.stdout.write(self.style.ERROR(f'Ошибок: {errors}'))
        self.stdout.write(f'{"="*60}\n')
    
    def _process_product(self, product) -> dict:
        """Обработка одного продукта."""
        updates = {}
        name_lower = (product.name or '').lower()
        desc_lower = (product.description or '').lower()
        full_text = f'{name_lower} {desc_lower}'
        
        subcategory = product.subcategory or 'dry'
        animal = product.animal or 'dog'
        
        # 1. Калорийность
        kcal_range = self.KCAL_BY_SUBCATEGORY.get(subcategory, (320, 380))
        base_kcal = random.uniform(*kcal_range)
        
        # Применяем модификаторы
        modifier = 1.0
        for keyword, mod in self.KCAL_MODIFIERS.items():
            if keyword in full_text:
                modifier += mod
        
        final_kcal = base_kcal * modifier
        updates['kcal_per_100g'] = Decimal(str(round(final_kcal, 1)))
        
        # 2. БЖУ
        nutrition_key = f'{subcategory}_{animal}' if subcategory in ['dry', 'wet'] else f'dry_{animal}'
        if nutrition_key not in self.NUTRITION_BY_TYPE:
            nutrition_key = f'dry_{animal}'
        
        nutrition = self.NUTRITION_BY_TYPE.get(nutrition_key, self.NUTRITION_BY_TYPE['dry_dog'])
        
        if not product.nutrition_protein:
            updates['nutrition_protein'] = Decimal(str(round(random.uniform(*nutrition['protein']), 1)))
        if not product.nutrition_fat:
            updates['nutrition_fat'] = Decimal(str(round(random.uniform(*nutrition['fat']), 1)))
        if not product.nutrition_fiber:
            updates['nutrition_fiber'] = Decimal(str(round(random.uniform(*nutrition['fiber']), 1)))
        if not product.nutrition_ash:
            updates['nutrition_ash'] = Decimal(str(round(random.uniform(*nutrition['ash']), 1)))
        if not product.nutrition_moisture:
            updates['nutrition_moisture'] = Decimal(str(round(random.uniform(*nutrition['moisture']), 1)))
        
        # Минералы
        if not getattr(product, 'nutrition_calcium', None) and 'calcium' in nutrition:
            updates['nutrition_calcium'] = Decimal(str(round(random.uniform(*nutrition['calcium']), 3)))
        if not getattr(product, 'nutrition_phosphorus', None) and 'phosphorus' in nutrition:
            updates['nutrition_phosphorus'] = Decimal(str(round(random.uniform(*nutrition['phosphorus']), 3)))
        if not getattr(product, 'nutrition_omega3', None) and 'omega3' in nutrition:
            updates['nutrition_omega3'] = Decimal(str(round(random.uniform(*nutrition['omega3']), 2)))
        if not getattr(product, 'nutrition_omega6', None) and 'omega6' in nutrition:
            updates['nutrition_omega6'] = Decimal(str(round(random.uniform(*nutrition['omega6']), 2)))
        
        # 3. Возрастной диапазон
        if not product.min_age_months and not product.max_age_months:
            for keyword, (min_age, max_age) in self.AGE_RANGES.items():
                if keyword in full_text:
                    updates['min_age_months'] = min_age
                    if max_age:
                        updates['max_age_months'] = max_age
                    break
        
        # 4. Целевой размер
        if product.target_size == 'all':
            for keyword, size in self.SIZE_KEYWORDS.items():
                if keyword in full_text:
                    updates['target_size'] = size
                    break
        
        # 5. Аллергены
        if not product.allergens:
            allergens = []
            for keyword, allergen in self.ALLERGEN_KEYWORDS.items():
                if keyword in full_text and allergen not in allergens:
                    allergens.append(allergen)
            if allergens:
                updates['allergens'] = allergens
        
        # 6. Группа совместимости
        if product.compatibility_group == 'regular':
            for keyword, group in self.COMPATIBILITY_KEYWORDS.items():
                if keyword in full_text:
                    updates['compatibility_group'] = group
                    break
        
        # 7. Приоритет бренда
        if not product.brand_priority:
            vendor = (product.vendor or '').lower()
            priority_brands = {
                'royal canin': 8,
                "hill's": 8,
                'hills': 8,
                'purina': 7,
                'pro plan': 8,
                'eukanuba': 7,
                'acana': 9,
                'orijen': 10,
                'farmina': 8,
                'monge': 7,
                'brit': 6,
                'grandorf': 8,
                'now fresh': 8,
                'go!': 8,
                'carnilove': 7,
                'wellness': 8,
                'alleva': 7,
                'alpaca': 5,
            }
            for brand, priority in priority_brands.items():
                if brand in vendor:
                    updates['brand_priority'] = priority
                    break
        
        return updates
