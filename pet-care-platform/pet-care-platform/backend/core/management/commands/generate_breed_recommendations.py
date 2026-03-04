"""
Management command для генерации рекомендаций товаров для пород.

Генерирует связи ProductBreedRecommendation на основе:
- size_group товара → size_category породы
- health_conditions товара → health_risks породы
- animal_type товара → species породы

Использование:
    python manage.py generate_breed_recommendations              # Все корма
    python manage.py generate_breed_recommendations --all        # Все товары
    python manage.py generate_breed_recommendations --product-id=123  # Один товар
    python manage.py generate_breed_recommendations --clear      # Очистить и пересоздать
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.shop.models import Product, ProductBreedRecommendation
from apps.pets.breed_models import Breed


class Command(BaseCommand):
    help = 'Генерация рекомендаций товаров для пород'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Генерировать для всех товаров (по умолчанию только корма)'
        )
        parser.add_argument(
            '--product-id',
            type=int,
            help='Генерировать только для указанного товара'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Очистить все авто-рекомендации перед генерацией'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать статистику без создания записей'
        )
    
    def handle(self, *args, **options):
        # Проверяем наличие пород
        breeds_count = Breed.objects.count()
        if breeds_count == 0:
            self.stderr.write(self.style.ERROR(
                'В базе нет пород! Сначала выполните: python manage.py import_breeds'
            ))
            return
        
        self.stdout.write(f'Пород в базе: {breeds_count}')
        
        # Очистка
        if options['clear']:
            count = ProductBreedRecommendation.objects.filter(is_auto=True).delete()[0]
            self.stdout.write(self.style.WARNING(f'Удалено авто-рекомендаций: {count}'))
        
        # Выбираем товары
        if options['product_id']:
            products = Product.objects.filter(id=options['product_id'])
            if not products.exists():
                self.stderr.write(self.style.ERROR(f'Товар с ID {options["product_id"]} не найден'))
                return
        elif options['all']:
            # ВСЕ корма (осторожно - много записей!)
            products = Product.objects.filter(
                status=1, 
                is_available=True,
                product_group='food'
            )
        else:
            # По умолчанию только СПЕЦИАЛЬНЫЕ корма:
            # - ветеринарные диеты
            # - гипоаллергенные
            # - с указанным size_group (не all)
            # Это значительно сокращает количество записей
            from django.db.models import Q
            products = Product.objects.filter(
                status=1, 
                is_available=True,
                product_group='food'
            ).filter(
                Q(is_veterinary=True) | 
                Q(is_hypoallergenic=True) |
                Q(size_group__in=['mini', 'small', 'medium', 'large', 'giant'])
            ).exclude(size_group='all').exclude(size_group__isnull=True)
        
        products_count = products.count()
        self.stdout.write(f'Товаров для обработки: {products_count}')
        
        if options['dry_run']:
            self.stdout.write(self.style.WARNING('Dry run - записи не создаются'))
            
            # Статистика
            with_size = products.exclude(size_group__isnull=True).exclude(size_group='').count()
            with_health = products.exclude(health_conditions=[]).count()
            hypo = products.filter(is_hypoallergenic=True).count()
            vet = products.filter(is_veterinary=True).count()
            
            self.stdout.write(f'  С указанным size_group: {with_size}')
            self.stdout.write(f'  С health_conditions: {with_health}')
            self.stdout.write(f'  Гипоаллергенных: {hypo}')
            self.stdout.write(f'  Ветеринарных диет: {vet}')
            
            # Примерный расчёт
            est_recommendations = products_count * breeds_count
            self.stdout.write(f'  Примерное количество рекомендаций: ~{est_recommendations:,}')
            return
        
        # Генерация
        total_created = 0
        processed = 0
        
        for product in products.iterator():
            try:
                recommendations = ProductBreedRecommendation.generate_for_product(product)
                total_created += len(recommendations)
                processed += 1
                
                if processed % 100 == 0:
                    self.stdout.write(f'  Обработано: {processed}/{products_count}...')
            except Exception as e:
                self.stderr.write(self.style.ERROR(
                    f'Ошибка для товара {product.id}: {e}'
                ))
        
        self.stdout.write(self.style.SUCCESS(
            f'Готово! Обработано товаров: {processed}, создано рекомендаций: {total_created}'
        ))
        
        # Итоговая статистика
        total = ProductBreedRecommendation.objects.count()
        by_suitability = {}
        for suit in ['ideal', 'recommended', 'suitable']:
            by_suitability[suit] = ProductBreedRecommendation.objects.filter(suitability=suit).count()
        
        self.stdout.write(f'\nИтого рекомендаций в БД: {total}')
        for suit, cnt in by_suitability.items():
            self.stdout.write(f'  {suit}: {cnt}')
