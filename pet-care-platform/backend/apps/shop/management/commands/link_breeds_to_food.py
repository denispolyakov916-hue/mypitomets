"""
Связывание породных кормов с породами.

Находит корма, предназначенные для конкретных пород,
и связывает их с breed_id.

Использование:
    python manage.py link_breeds_to_food
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
from apps.shop.models import Product, ProductBreedRecommendation
from apps.pets.breed_models import Breed


# Словарь для перевода названий пород
BREED_TRANSLATIONS = {
    # Собаки
    'labrador': ['лабрадор', 'labrador'],
    'golden retriever': ['голден ретривер', 'golden retriever', 'золотистый ретривер'],
    'german shepherd': ['немецкая овчарка', 'german shepherd', 'немецк овчарк'],
    'bulldog': ['бульдог', 'bulldog'],
    'french bulldog': ['французский бульдог', 'french bulldog', 'франц бульдог'],
    'poodle': ['пудель', 'poodle'],
    'beagle': ['бигль', 'beagle'],
    'rottweiler': ['ротвейлер', 'rottweiler'],
    'yorkshire terrier': ['йоркширский терьер', 'yorkshire', 'йорк'],
    'boxer': ['боксёр', 'боксер', 'boxer'],
    'dachshund': ['такса', 'dachshund'],
    'siberian husky': ['хаски', 'husky', 'сибирский хаски'],
    'great dane': ['дог', 'great dane', 'немецкий дог'],
    'doberman': ['доберман', 'doberman'],
    'shih tzu': ['ши-тцу', 'ши тцу', 'shih tzu'],
    'chihuahua': ['чихуахуа', 'chihuahua'],
    'pug': ['мопс', 'pug'],
    'pomeranian': ['шпиц', 'pomeranian', 'померанский'],
    'cavalier king charles': ['кавалер кинг чарльз', 'cavalier'],
    'cocker spaniel': ['кокер спаниель', 'cocker spaniel', 'кокер'],
    'jack russell': ['джек рассел', 'jack russell'],
    'maltese': ['мальтез', 'мальтийск', 'maltese'],
    'border collie': ['бордер колли', 'border collie'],
    'shetland sheepdog': ['шелти', 'shetland'],
    'schnauzer': ['шнауцер', 'schnauzer'],
    'boston terrier': ['бостон терьер', 'boston terrier'],
    'west highland': ['вест хайленд', 'west highland', 'вести'],
    'bernese mountain': ['бернский зенненхунд', 'bernese'],
    'alaskan malamute': ['маламут', 'malamute'],
    'samoyed': ['самоед', 'samoyed'],
    'akita': ['акита', 'akita'],
    
    # Кошки
    'persian': ['персидск', 'persian'],
    'maine coon': ['мейн-кун', 'мейн кун', 'maine coon'],
    'siamese': ['сиамск', 'siamese'],
    'british shorthair': ['британск', 'british'],
    'ragdoll': ['рэгдолл', 'ragdoll'],
    'bengal': ['бенгальск', 'bengal'],
    'abyssinian': ['абиссинск', 'abyssinian'],
    'scottish fold': ['шотландск', 'scottish'],
    'sphynx': ['сфинкс', 'sphynx'],
    'russian blue': ['русская голубая', 'russian blue'],
    'norwegian forest': ['норвежск', 'norwegian'],
    'siberian': ['сибирск', 'siberian'],
}


class Command(BaseCommand):
    help = 'Связывание породных кормов с breed_id'

    def handle(self, *args, **options):
        self.stdout.write('Связывание кормов с породами...')
        
        # Кэшируем породы
        breeds_cache = {}
        for breed in Breed.objects.all():
            # Индексируем по имени (рус и англ)
            name_lower = breed.name.lower()
            breeds_cache[name_lower] = breed
            if breed.name_en:
                breeds_cache[breed.name_en.lower()] = breed
        
        self.stdout.write(f'Загружено пород: {len(breeds_cache) // 2}')
        
        # Находим продукты с породами в названии
        linked = 0
        not_found = []
        
        for product in Product.objects.filter(product_group='food'):
            name_lower = product.name.lower()
            
            # Проверяем ключевые слова пород
            for breed_key, keywords in BREED_TRANSLATIONS.items():
                if any(kw.lower() in name_lower for kw in keywords):
                    # Ищем породу в кэше
                    breed = None
                    for kw in keywords:
                        if kw.lower() in breeds_cache:
                            breed = breeds_cache[kw.lower()]
                            break
                    
                    if not breed:
                        # Пробуем поиск по названию
                        for cached_name, cached_breed in breeds_cache.items():
                            if any(kw.lower() in cached_name for kw in keywords):
                                breed = cached_breed
                                break
                    
                    if breed:
                        # Проверяем совпадение animal_type
                        if breed.species == product.animal_type or product.animal_type == 'all':
                            # Создаём связь product-breed
                            rec, created = ProductBreedRecommendation.objects.get_or_create(
                                product=product,
                                breed=breed,
                                defaults={
                                    'suitability': 'ideal',
                                    'score': 100,
                                    'match_type': 'manual',
                                    'reason': f'Специально разработан для породы {breed.name}',
                                    'is_auto': False,
                                }
                            )
                            if created:
                                linked += 1
                            break
                    else:
                        if breed_key not in [nf[0] for nf in not_found]:
                            not_found.append((breed_key, product.name[:50]))
                    break
        
        self.stdout.write(self.style.SUCCESS(f'Связано кормов с породами: {linked}'))
        
        if not_found:
            self.stdout.write(self.style.WARNING(f'Породы не найдены в БД: {len(not_found)}'))
            for breed_key, product_name in not_found[:10]:
                self.stdout.write(f'  - {breed_key}: {product_name}')
