"""
Классификация брендов - расставление brand_class и priority.

Использование:
    python manage.py classify_brands
"""

from django.core.management.base import BaseCommand
from apps.shop.models import Brand


# Словарь известных брендов с классами
# brand_class: economy, premium, super_premium, holistic
BRAND_CLASSIFICATIONS = {
    # Holistic (10)
    'Acana': ('holistic', 10),
    'ACANA': ('holistic', 10),
    'Orijen': ('holistic', 10),
    'ORIJEN': ('holistic', 10),
    'Grandorf': ('holistic', 9),
    'GRANDORF': ('holistic', 9),
    'GO!': ('holistic', 9),
    'GO': ('holistic', 9),
    'Now Fresh': ('holistic', 9),
    'NOW FRESH': ('holistic', 9),
    'Farmina N&D': ('holistic', 9),
    'Applaws': ('holistic', 8),
    'Carnilove': ('holistic', 8),
    'Alleva': ('holistic', 8),
    'Canagan': ('holistic', 8),
    'Gather': ('holistic', 8),
    'Primordial': ('holistic', 8),
    'Wellness CORE': ('holistic', 8),
    'Wellness': ('holistic', 8),
    'Nutram': ('holistic', 8),
    
    # Super Premium (7-8)
    'ROYAL CANIN': ('super_premium', 8),
    'Royal Canin': ('super_premium', 8),
    'Pro Plan': ('super_premium', 8),
    'PRO PLAN': ('super_premium', 8),
    'Purina Pro Plan': ('super_premium', 8),
    'Farmina': ('super_premium', 8),
    'Monge': ('super_premium', 7),
    'MONGE': ('super_premium', 7),
    'Brit Care': ('super_premium', 7),
    'BRIT CARE': ('super_premium', 7),
    'Brit Premium': ('super_premium', 6),
    'Eukanuba': ('super_premium', 7),
    'EUKANUBA': ('super_premium', 7),
    'Hills': ('super_premium', 8),
    "Hill's": ('super_premium', 8),
    "HILL'S": ('super_premium', 8),
    'Advance': ('super_premium', 7),
    'ADVANCE': ('super_premium', 7),
    'Specific': ('super_premium', 7),
    'SPECIFIC': ('super_premium', 7),
    'Arden Grange': ('super_premium', 7),
    'Josera': ('super_premium', 7),
    'JOSERA': ('super_premium', 7),
    'Sanabelle': ('super_premium', 7),
    'SANABELLE': ('super_premium', 7),
    'Bosch': ('super_premium', 7),
    'BOSCH': ('super_premium', 7),
    'Trainer': ('super_premium', 7),
    'TRAINER': ('super_premium', 7),
    'Schesir': ('super_premium', 7),
    'SCHESIR': ('super_premium', 7),
    'Petreet': ('super_premium', 7),
    'Pronature': ('super_premium', 7),
    'PRONATURE': ('super_premium', 7),
    'Blitz': ('super_premium', 6),
    'BLITZ': ('super_premium', 6),
    'Landor': ('super_premium', 7),
    'LANDOR': ('super_premium', 7),
    'AlphaPet': ('super_premium', 6),
    'ALPHAPET': ('super_premium', 6),
    '1st CHOICE': ('super_premium', 7),
    '1st Choice': ('super_premium', 7),
    
    # Premium (5-6)
    'Brit': ('premium', 6),
    'BRIT': ('premium', 6),
    'Organix': ('premium', 6),
    'ORGANIX': ('premium', 6),
    'Perfect Fit': ('premium', 5),
    'PERFECT FIT': ('premium', 5),
    'Purina ONE': ('premium', 5),
    'PURINA ONE': ('premium', 5),
    'Purina': ('premium', 5),
    'PURINA': ('premium', 5),
    'Cat Chow': ('premium', 5),
    'CAT CHOW': ('premium', 5),
    'Dog Chow': ('premium', 5),
    'DOG CHOW': ('premium', 5),
    'ProBalance': ('premium', 5),
    'PROBALANCE': ('premium', 5),
    'Gemon': ('premium', 5),
    'GEMON': ('premium', 5),
    'Dado': ('premium', 5),
    'DADO': ('premium', 5),
    'Родные Корма': ('premium', 5),
    'Мнямс': ('premium', 5),
    'МНЯМС': ('premium', 5),
    'Зоогурман': ('premium', 5),
    'ЗООГУРМАН': ('premium', 5),
    'Nero Gold': ('premium', 6),
    'NERO GOLD': ('premium', 6),
    'Mr.Buffalo': ('premium', 5),
    'MR.BUFFALO': ('premium', 5),
    'Four Friends': ('premium', 6),
    'Carny': ('premium', 5),
    'CARNY': ('premium', 5),
    'Animonda': ('premium', 6),
    'ANIMONDA': ('premium', 6),
    'Berkley': ('premium', 6),
    'BERKLEY': ('premium', 6),
    
    # Economy (3-4)
    'Whiskas': ('economy', 3),
    'WHISKAS': ('economy', 3),
    'Kitekat': ('economy', 3),
    'KITEKAT': ('economy', 3),
    'Pedigree': ('economy', 3),
    'PEDIGREE': ('economy', 3),
    'Chappi': ('economy', 3),
    'CHAPPI': ('economy', 3),
    'Friskies': ('economy', 3),
    'FRISKIES': ('economy', 3),
    'Felix': ('economy', 4),
    'FELIX': ('economy', 4),
    'Sheba': ('economy', 4),
    'SHEBA': ('economy', 4),
    'Darling': ('economy', 3),
    'DARLING': ('economy', 3),
    'Stuzzy': ('economy', 4),
    'STUZZY': ('economy', 4),
    'Наша Марка': ('economy', 3),
    'Ночной Охотник': ('economy', 4),
    'Васька': ('economy', 3),
    'Оскар': ('economy', 3),
    'All Cats': ('economy', 4),
    'ALL CATS': ('economy', 4),
    'All Dogs': ('economy', 4),
    'ALL DOGS': ('economy', 4),
}

# Ключевые слова для определения класса
HOLISTIC_KEYWORDS = ['holistic', 'холистик', 'grain free', 'беззерновой', 'natural', 'organic']
SUPER_PREMIUM_KEYWORDS = ['super premium', 'супер премиум', 'premium quality', 'veterinary', 'ветеринарный']
PREMIUM_KEYWORDS = ['premium', 'премиум', 'professional', 'профессиональный']


class Command(BaseCommand):
    help = 'Классификация брендов - расставление brand_class и priority'

    def handle(self, *args, **options):
        self.stdout.write('Классификация брендов...')
        
        updated = 0
        classified = 0
        unknown = []
        
        for brand in Brand.objects.all():
            name = brand.name.strip()
            
            # Проверяем точное совпадение в словаре
            if name in BRAND_CLASSIFICATIONS:
                brand_class, priority = BRAND_CLASSIFICATIONS[name]
                brand.brand_class = brand_class
                brand.priority = priority
                brand.save(update_fields=['brand_class', 'priority'])
                classified += 1
                updated += 1
                continue
            
            # Проверяем частичное совпадение
            found = False
            for known_brand, (brand_class, priority) in BRAND_CLASSIFICATIONS.items():
                if known_brand.lower() in name.lower() or name.lower() in known_brand.lower():
                    brand.brand_class = brand_class
                    brand.priority = priority
                    brand.save(update_fields=['brand_class', 'priority'])
                    classified += 1
                    updated += 1
                    found = True
                    break
            
            if found:
                continue
            
            # Проверяем ключевые слова
            name_lower = name.lower()
            
            if any(kw in name_lower for kw in HOLISTIC_KEYWORDS):
                brand.brand_class = 'holistic'
                brand.priority = 8
            elif any(kw in name_lower for kw in SUPER_PREMIUM_KEYWORDS):
                brand.brand_class = 'super_premium'
                brand.priority = 7
            elif any(kw in name_lower for kw in PREMIUM_KEYWORDS):
                brand.brand_class = 'premium'
                brand.priority = 5
            else:
                # По умолчанию - premium с низким приоритетом
                brand.brand_class = 'premium'
                brand.priority = 4
                unknown.append(name)
            
            brand.save(update_fields=['brand_class', 'priority'])
            updated += 1
        
        self.stdout.write(self.style.SUCCESS(f'Обновлено брендов: {updated}'))
        self.stdout.write(self.style.SUCCESS(f'Классифицировано по словарю: {classified}'))
        
        if unknown:
            self.stdout.write(self.style.WARNING(f'Неизвестных брендов (установлен premium): {len(unknown)}'))
            # Выводим первые 20
            for name in unknown[:20]:
                self.stdout.write(f'  - {name}')
            if len(unknown) > 20:
                self.stdout.write(f'  ... и ещё {len(unknown) - 20}')
        
        # Статистика
        self.stdout.write('\nРаспределение по классам:')
        for bc in ['holistic', 'super_premium', 'premium', 'economy']:
            count = Brand.objects.filter(brand_class=bc).count()
            self.stdout.write(f'  {bc}: {count}')
