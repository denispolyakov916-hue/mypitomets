"""
Генерация/заполнение нутриентов для кормов.

Парсит данные из category_details.nutrition если есть,
иначе генерирует правдоподобные значения на основе типа корма и бренда.

Также извлекает аллергены из ингредиентов.

Использование:
    python manage.py generate_food_nutrition
    python manage.py generate_food_nutrition --force  # перезаписать все
"""

import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db.models import Q
from apps.shop.models import Product, FoodDetails, Brand


# Аллергены и их ключевые слова
ALLERGEN_KEYWORDS = {
    'chicken': ['курица', 'куриц', 'курин', 'chicken', 'poultry', 'птиц'],
    'beef': ['говядин', 'говяжь', 'beef', 'бычь', 'телятин'],
    'fish': ['рыб', 'fish', 'лосос', 'salmon', 'тунец', 'tuna', 'сельд', 'herring', 'треск', 'cod', 'форел', 'trout'],
    'pork': ['свинин', 'свиной', 'pork'],
    'lamb': ['ягнен', 'ягнят', 'баранин', 'lamb'],
    'wheat': ['пшениц', 'wheat'],
    'corn': ['кукуруз', 'маис', 'corn', 'maize'],
    'soy': ['соя', 'соев', 'soy'],
    'dairy': ['молок', 'молоч', 'сыр', 'творог', 'dairy', 'milk', 'cheese'],
    'egg': ['яйц', 'яичн', 'egg'],
    'gluten': ['глютен', 'gluten', 'клейковин'],
}

# Зерновые ингредиенты
GRAIN_INGREDIENTS = ['пшениц', 'кукуруз', 'маис', 'рис', 'ячмен', 'овёс', 'овес', 'рожь', 
                     'wheat', 'corn', 'rice', 'barley', 'oats', 'rye']


class Command(BaseCommand):
    help = 'Генерация нутриентов и аллергенов для кормов'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Перезаписать все значения (даже заполненные)'
        )

    def handle(self, *args, **options):
        force = options['force']
        
        self.stdout.write('Генерация нутриентов для кормов...')
        
        # Получаем все FoodDetails
        food_details_qs = FoodDetails.objects.select_related('product', 'product__brand')
        
        updated = 0
        nutrition_filled = 0
        allergens_filled = 0
        
        for fd in food_details_qs:
            product = fd.product
            changed = False
            
            # 1. Заполняем нутриенты если отсутствуют
            if force or fd.energy_kcal_per_100g is None:
                nutrition_data = self.get_or_generate_nutrition(product, fd)
                
                if nutrition_data.get('energy'):
                    fd.energy_kcal_per_100g = nutrition_data['energy']
                    changed = True
                if nutrition_data.get('protein'):
                    fd.protein_g_per_100g = nutrition_data['protein']
                    changed = True
                if nutrition_data.get('fat'):
                    fd.fat_g_per_100g = nutrition_data['fat']
                    changed = True
                if nutrition_data.get('fiber'):
                    fd.fiber_g_per_100g = nutrition_data['fiber']
                    changed = True
                if nutrition_data.get('ash'):
                    fd.ash_g_per_100g = nutrition_data['ash']
                    changed = True
                if nutrition_data.get('moisture'):
                    fd.moisture_percent = nutrition_data['moisture']
                    changed = True
                
                if changed:
                    nutrition_filled += 1
            
            # 2. Извлекаем аллергены из ингредиентов
            if force or not fd.allergens:
                allergens = self.extract_allergens(fd.ingredients or [])
                if allergens:
                    fd.allergens = allergens
                    changed = True
                    allergens_filled += 1
            
            # 3. Определяем grain_free
            if force or fd.grain_free is None:
                is_grain_free = self.check_grain_free(fd.ingredients or [], product.name)
                fd.grain_free = is_grain_free
                changed = True
            
            if changed:
                fd.save()
                updated += 1
        
        self.stdout.write(self.style.SUCCESS(f'Обновлено FoodDetails: {updated}'))
        self.stdout.write(self.style.SUCCESS(f'Заполнены нутриенты: {nutrition_filled}'))
        self.stdout.write(self.style.SUCCESS(f'Заполнены аллергены: {allergens_filled}'))

    def get_or_generate_nutrition(self, product, fd):
        """Получить нутриенты из category_details или сгенерировать."""
        
        # Пробуем извлечь из category_details
        category_details = product.category_details or {}
        nutrition = category_details.get('nutrition', {})
        
        result = {
            'energy': None,
            'protein': None,
            'fat': None,
            'fiber': None,
            'ash': None,
            'moisture': None,
        }
        
        # Если есть данные - используем их
        if nutrition:
            if nutrition.get('kcal_per_100g'):
                result['energy'] = Decimal(str(nutrition['kcal_per_100g']))
            if nutrition.get('protein_percent'):
                result['protein'] = Decimal(str(nutrition['protein_percent']))
            if nutrition.get('fat_percent'):
                result['fat'] = Decimal(str(nutrition['fat_percent']))
            if nutrition.get('fiber_percent'):
                result['fiber'] = Decimal(str(nutrition['fiber_percent']))
            if nutrition.get('ash_percent'):
                result['ash'] = Decimal(str(nutrition['ash_percent']))
            if nutrition.get('moisture_percent'):
                result['moisture'] = Decimal(str(nutrition['moisture_percent']))
        
        # Генерируем недостающие значения
        is_dry = self.is_dry_food(product, category_details)
        brand_class = product.brand.brand_class if product.brand else 'premium'
        
        if result['energy'] is None:
            result['energy'] = self.generate_energy(is_dry, brand_class)
        if result['protein'] is None:
            result['protein'] = self.generate_protein(is_dry, brand_class, product.animal_type)
        if result['fat'] is None:
            result['fat'] = self.generate_fat(is_dry, brand_class)
        if result['fiber'] is None:
            result['fiber'] = self.generate_fiber(is_dry)
        if result['ash'] is None:
            result['ash'] = self.generate_ash(is_dry)
        if result['moisture'] is None:
            result['moisture'] = self.generate_moisture(is_dry)
        
        return result

    def is_dry_food(self, product, category_details):
        """Определяет, сухой ли корм."""
        feed_type = category_details.get('feed_type', '')
        if feed_type == 'dry':
            return True
        if feed_type in ('wet', 'canned', 'pouch', 'pate'):
            return False
        
        # Проверяем по названию
        name_lower = product.name.lower()
        if any(kw in name_lower for kw in ['сухой', 'dry', 'гранул']):
            return True
        if any(kw in name_lower for kw in ['влажный', 'wet', 'консерв', 'пауч', 'паштет']):
            return False
        
        # По умолчанию - сухой
        return True

    def generate_energy(self, is_dry, brand_class):
        """Генерирует калорийность."""
        if is_dry:
            base = 380
            if brand_class == 'holistic':
                base += random.randint(20, 40)
            elif brand_class == 'super_premium':
                base += random.randint(10, 30)
            elif brand_class == 'economy':
                base -= random.randint(10, 30)
            return Decimal(str(base + random.randint(-20, 20)))
        else:
            # Влажный корм
            base = 95
            return Decimal(str(base + random.randint(-15, 15)))

    def generate_protein(self, is_dry, brand_class, animal_type):
        """Генерирует содержание белка."""
        if is_dry:
            if animal_type == 'cat':
                base = 34  # Кошкам нужно больше белка
            else:
                base = 28
            
            if brand_class == 'holistic':
                base += random.randint(4, 8)
            elif brand_class == 'super_premium':
                base += random.randint(2, 5)
            elif brand_class == 'economy':
                base -= random.randint(2, 5)
            
            return Decimal(str(base + random.randint(-2, 2)))
        else:
            # Влажный корм
            base = 10
            return Decimal(str(base + random.randint(-2, 3)))

    def generate_fat(self, is_dry, brand_class):
        """Генерирует содержание жира."""
        if is_dry:
            base = 16
            if brand_class == 'holistic':
                base += random.randint(2, 4)
            elif brand_class == 'economy':
                base -= random.randint(2, 4)
            return Decimal(str(base + random.randint(-2, 2)))
        else:
            base = 6
            return Decimal(str(base + random.randint(-2, 2)))

    def generate_fiber(self, is_dry):
        """Генерирует содержание клетчатки."""
        if is_dry:
            return Decimal(str(random.randint(20, 40) / 10))  # 2.0-4.0%
        else:
            return Decimal(str(random.randint(5, 15) / 10))  # 0.5-1.5%

    def generate_ash(self, is_dry):
        """Генерирует содержание золы."""
        if is_dry:
            return Decimal(str(random.randint(60, 85) / 10))  # 6.0-8.5%
        else:
            return Decimal(str(random.randint(20, 35) / 10))  # 2.0-3.5%

    def generate_moisture(self, is_dry):
        """Генерирует влажность."""
        if is_dry:
            return Decimal(str(random.randint(8, 12)))  # 8-12%
        else:
            return Decimal(str(random.randint(75, 82)))  # 75-82%

    def extract_allergens(self, ingredients):
        """Извлекает аллергены из списка ингредиентов."""
        if not ingredients:
            return []
        
        found_allergens = set()
        ingredients_text = ' '.join(ingredients).lower()
        
        for allergen, keywords in ALLERGEN_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in ingredients_text:
                    found_allergens.add(allergen)
                    break
        
        return list(found_allergens)

    def check_grain_free(self, ingredients, product_name):
        """Проверяет, беззерновой ли корм."""
        # Сначала проверяем название
        name_lower = product_name.lower()
        if any(kw in name_lower for kw in ['grain free', 'беззерновой', 'без зерна', 'grain-free']):
            return True
        
        # Проверяем ингредиенты
        if not ingredients:
            return False
        
        ingredients_text = ' '.join(ingredients).lower()
        
        for grain in GRAIN_INGREDIENTS:
            if grain.lower() in ingredients_text:
                return False
        
        # Если зерновых не найдено и есть хоть какие-то ингредиенты
        return len(ingredients) > 3
