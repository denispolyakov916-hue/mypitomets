"""
Классификация кормов по характеристикам.

Определяет:
- target_size (размер породы)
- is_hypoallergenic
- is_veterinary
- special_diet (специальные диеты)
- health_conditions
- compatibility_group
- age_min_months, age_max_months

Использование:
    python manage.py classify_food_data
    python manage.py classify_food_data --force  # перезаписать все
"""

from django.core.management.base import BaseCommand
from apps.shop.models import Product, FoodDetails


# Ключевые слова для определения размера
SIZE_KEYWORDS = {
    'toy': ['той', 'toy', 'миниатюр', 'miniature', 'карлик'],
    'small': ['мелких', 'маленьких', 'small', 'mini', 'мини'],
    'medium': ['средних', 'medium'],
    'large': ['крупных', 'large', 'больших'],
    'giant': ['гигантских', 'giant', 'очень крупных', 'extra large'],
}

# Ключевые слова для специальных диет
SPECIAL_DIET_KEYWORDS = {
    'sterilized': ['стерилизованн', 'кастрированн', 'sterilized', 'neutered', 'spayed'],
    'hypoallergenic': ['гипоаллерген', 'hypoallergenic', 'anti-allerg'],
    'sensitive_digestion': ['чувствительн', 'sensitive', 'деликатн', 'легкоусвояем'],
    'weight_control': ['контрол', 'веса', 'weight', 'light', 'лайт', 'диет', 'похуден', 'obesity'],
    'grain_free': ['беззернов', 'grain free', 'grain-free', 'без зерна'],
    'urinary': ['urinary', 'уринар', 'мочекаменн', 'мкб'],
    'kidney_support': ['renal', 'почечн', 'почек', 'kidney'],
    'joint_support': ['joint', 'сустав', 'mobility', 'артр', 'хондро'],
    'gastrointestinal': ['gastro', 'гастро', 'жкт', 'пищевар', 'intestinal'],
    'skin_coat': ['skin', 'coat', 'шерст', 'кожа', 'derma'],
}

# Ключевые слова для ветеринарных диет
VETERINARY_KEYWORDS = ['veterinary', 'ветеринарн', 'лечебн', 'диетическ', 'prescription', 
                       'clinical', 'therapeutic', 'hepatic', 'renal', 'urinary', 'diabetic',
                       'recovery', 'convalescence', 'gastrointestinal', 'hypoallergenic']

# Ключевые слова для гипоаллергенных кормов
HYPOALLERGENIC_KEYWORDS = ['hypoallergenic', 'гипоаллерген', 'single protein', 'монобелков',
                           'limited ingredient', 'novel protein', 'hydrolyzed', 'гидролизат']

# Возрастные группы
AGE_GROUPS = {
    'puppy': (0, 12),       # 0-12 месяцев
    'kitten': (0, 12),      # 0-12 месяцев
    'junior': (6, 18),      # 6-18 месяцев
    'adult': (12, 84),      # 1-7 лет
    'senior': (84, None),   # 7+ лет
    'all': (0, None),       # все возраста
}

# Ключевые слова для возрастных групп
AGE_KEYWORDS = {
    'puppy': ['щенок', 'щенков', 'щенят', 'puppy', 'puppies', 'starter', 'junior'],
    'kitten': ['котенок', 'котят', 'kitten', 'kittens', 'baby'],
    'adult': ['взросл', 'adult'],
    'senior': ['пожил', 'senior', 'mature', '7+', '8+', 'старше 7'],
}


class Command(BaseCommand):
    help = 'Классификация кормов по характеристикам'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Перезаписать все значения'
        )

    def handle(self, *args, **options):
        force = options['force']
        
        self.stdout.write('Классификация кормов...')
        
        food_details_qs = FoodDetails.objects.select_related('product')
        
        updated = 0
        size_filled = 0
        diet_filled = 0
        veterinary_filled = 0
        hypo_filled = 0
        
        for fd in food_details_qs:
            product = fd.product
            name_lower = product.name.lower()
            changed = False
            
            # 1. Определяем target_size
            if force or not fd.target_size or fd.target_size == 'all':
                new_size = self.detect_size(name_lower)
                if new_size:
                    fd.target_size = new_size
                    changed = True
                    size_filled += 1
            
            # 2. Определяем is_veterinary
            if force or not fd.is_veterinary:
                is_vet = self.detect_veterinary(name_lower)
                if is_vet:
                    fd.is_veterinary = True
                    changed = True
                    veterinary_filled += 1
            
            # 3. Определяем is_hypoallergenic
            if force or not fd.is_hypoallergenic:
                is_hypo = self.detect_hypoallergenic(name_lower, fd.ingredients or [])
                if is_hypo:
                    fd.is_hypoallergenic = True
                    changed = True
                    hypo_filled += 1
            
            # 4. Определяем special_diet
            if force or not fd.special_diet:
                diets = self.detect_special_diets(name_lower)
                if diets:
                    fd.special_diet = diets
                    changed = True
                    diet_filled += 1
            
            # 5. Определяем health_conditions
            if force or not fd.health_conditions:
                conditions = self.detect_health_conditions(name_lower, fd.special_diet or [])
                if conditions:
                    fd.health_conditions = conditions
                    changed = True
            
            # 6. Определяем compatibility_group
            if force or fd.compatibility_group == 'regular':
                group = self.detect_compatibility_group(fd)
                if group != 'regular':
                    fd.compatibility_group = group
                    changed = True
            
            # 7. Определяем возрастные ограничения
            if force or fd.age_min_months is None:
                age_min, age_max = self.detect_age_range(name_lower, product.age_group)
                if age_min is not None:
                    fd.age_min_months = age_min
                    fd.age_max_months = age_max
                    changed = True
            
            if changed:
                fd.save()
                updated += 1
        
        self.stdout.write(self.style.SUCCESS(f'Обновлено: {updated}'))
        self.stdout.write(f'  target_size: {size_filled}')
        self.stdout.write(f'  is_veterinary: {veterinary_filled}')
        self.stdout.write(f'  is_hypoallergenic: {hypo_filled}')
        self.stdout.write(f'  special_diet: {diet_filled}')

    def detect_size(self, name_lower):
        """Определяет целевой размер породы."""
        for size, keywords in SIZE_KEYWORDS.items():
            if any(kw in name_lower for kw in keywords):
                return size
        return None

    def detect_veterinary(self, name_lower):
        """Определяет, ветеринарная ли диета."""
        return any(kw in name_lower for kw in VETERINARY_KEYWORDS)

    def detect_hypoallergenic(self, name_lower, ingredients):
        """Определяет, гипоаллергенный ли корм."""
        if any(kw in name_lower for kw in HYPOALLERGENIC_KEYWORDS):
            return True
        
        # Проверяем моно-белок (только один источник белка)
        if ingredients:
            protein_sources = set()
            for ing in ingredients:
                ing_lower = ing.lower()
                if any(kw in ing_lower for kw in ['курица', 'куриц', 'chicken']):
                    protein_sources.add('chicken')
                elif any(kw in ing_lower for kw in ['говядин', 'beef']):
                    protein_sources.add('beef')
                elif any(kw in ing_lower for kw in ['ягнен', 'lamb']):
                    protein_sources.add('lamb')
                elif any(kw in ing_lower for kw in ['рыб', 'fish', 'лосос', 'salmon']):
                    protein_sources.add('fish')
                elif any(kw in ing_lower for kw in ['утка', 'duck']):
                    protein_sources.add('duck')
                elif any(kw in ing_lower for kw in ['кролик', 'rabbit']):
                    protein_sources.add('rabbit')
            
            # Один источник белка + без зерновых = гипоаллергенный
            if len(protein_sources) == 1:
                return True
        
        return False

    def detect_special_diets(self, name_lower):
        """Определяет специальные диеты."""
        diets = []
        for diet, keywords in SPECIAL_DIET_KEYWORDS.items():
            if any(kw in name_lower for kw in keywords):
                diets.append(diet)
        return diets if diets else None

    def detect_health_conditions(self, name_lower, special_diets):
        """Определяет показания по здоровью."""
        conditions = []
        
        # Из специальных диет
        diet_to_condition = {
            'urinary': 'urinary_health',
            'kidney_support': 'kidney_disease',
            'joint_support': 'joint_problems',
            'gastrointestinal': 'digestive_issues',
            'skin_coat': 'skin_problems',
            'weight_control': 'obesity',
        }
        
        for diet in (special_diets or []):
            if diet in diet_to_condition:
                conditions.append(diet_to_condition[diet])
        
        # Дополнительные ключевые слова
        if 'диабет' in name_lower or 'diabetic' in name_lower:
            conditions.append('diabetes')
        if 'печен' in name_lower or 'hepatic' in name_lower:
            conditions.append('liver_disease')
        if 'сердц' in name_lower or 'cardiac' in name_lower:
            conditions.append('heart_disease')
        
        return conditions if conditions else None

    def detect_compatibility_group(self, fd):
        """Определяет группу совместимости."""
        if fd.is_veterinary:
            if fd.health_conditions:
                if 'kidney_disease' in fd.health_conditions:
                    return 'therapeutic_renal'
                if 'diabetes' in fd.health_conditions:
                    return 'therapeutic_diabetic'
                if 'digestive_issues' in fd.health_conditions:
                    return 'therapeutic_digestive'
                if 'obesity' in fd.health_conditions:
                    return 'therapeutic_weight'
                if 'urinary_health' in fd.health_conditions:
                    return 'therapeutic_urinary'
            return 'therapeutic_digestive'  # По умолчанию для ветеринарных
        
        if fd.is_hypoallergenic:
            return 'hypoallergenic'
        
        return 'regular'

    def detect_age_range(self, name_lower, age_group):
        """Определяет возрастной диапазон."""
        # Сначала проверяем по названию
        for age_key, keywords in AGE_KEYWORDS.items():
            if any(kw in name_lower for kw in keywords):
                return AGE_GROUPS.get(age_key, (None, None))
        
        # Затем по age_group продукта
        if age_group:
            return AGE_GROUPS.get(age_group, (None, None))
        
        return (None, None)
