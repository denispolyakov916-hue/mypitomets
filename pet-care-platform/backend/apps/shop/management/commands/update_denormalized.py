"""
Обновление денормализованных полей.

Пересчитывает:
- products.price, products.compare_price из default SKU
- products.image_url из images
- categories.product_count
- brands.product_count
- FoodDetails для недостающих продуктов

Использование:
    python manage.py update_denormalized
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db.models import Count, Q, F, Subquery, OuterRef
from django.db.models.functions import Coalesce
from apps.shop.models import Category, Brand, Product, ProductSKU, FoodDetails


class Command(BaseCommand):
    help = 'Обновление денормализованных полей'

    def handle(self, *args, **options):
        self.stdout.write('Обновление денормализованных полей...')
        
        self.update_product_prices()
        self.update_product_images()
        self.update_category_counts()
        self.update_brand_counts()
        self.ensure_default_skus()
        self.create_missing_food_details()
        
        self.stdout.write(self.style.SUCCESS('Денормализация завершена'))

    def update_product_prices(self):
        """Обновляет price и compare_price в products из default SKU."""
        self.stdout.write('  Обновление цен...')
        
        # Получаем default SKU
        default_sku_price = ProductSKU.objects.filter(
            product=OuterRef('pk'),
            is_default=True
        ).values('price')[:1]
        
        default_sku_compare = ProductSKU.objects.filter(
            product=OuterRef('pk'),
            is_default=True
        ).values('compare_price')[:1]
        
        # Обновляем товары с default SKU
        updated = Product.objects.filter(
            skus__is_default=True
        ).distinct().update(
            price=Coalesce(Subquery(default_sku_price), F('price')),
            compare_price=Subquery(default_sku_compare)
        )
        
        self.stdout.write(self.style.SUCCESS(f'    Цены обновлены: {updated}'))
        
        # Для товаров без default SKU берём первый SKU
        products_without_default = Product.objects.filter(
            ~Q(skus__is_default=True)
        ).filter(skus__isnull=False).distinct()
        
        fixed = 0
        for product in products_without_default:
            first_sku = product.skus.order_by('sort_order', 'id').first()
            if first_sku:
                product.price = first_sku.price
                product.compare_price = first_sku.compare_price
                product.save(update_fields=['price', 'compare_price'])
                fixed += 1
        
        self.stdout.write(self.style.SUCCESS(f'    Исправлены товары без default SKU: {fixed}'))

    def update_product_images(self):
        """Обновляет image_url из массива images."""
        self.stdout.write('  Обновление изображений...')
        
        updated = 0
        for product in Product.objects.filter(Q(image_url='') | Q(image_url__isnull=True)):
            if product.images:
                first_image = product.images[0]
                if isinstance(first_image, dict):
                    url = first_image.get('url', '')
                elif isinstance(first_image, str):
                    url = first_image
                else:
                    url = ''
                
                if url:
                    product.image_url = url
                    product.save(update_fields=['image_url'])
                    updated += 1
        
        self.stdout.write(self.style.SUCCESS(f'    Изображения обновлены: {updated}'))

    def update_category_counts(self):
        """Обновляет product_count в категориях."""
        self.stdout.write('  Обновление счётчиков категорий...')
        
        for category in Category.objects.all():
            count = Product.objects.filter(
                new_category=category,
                status=1,
                is_available=True
            ).count()
            
            if category.product_count != count:
                category.product_count = count
                category.save(update_fields=['product_count'])
        
        total = Category.objects.filter(product_count__gt=0).count()
        self.stdout.write(self.style.SUCCESS(f'    Категорий с товарами: {total}'))

    def update_brand_counts(self):
        """Обновляет product_count в брендах."""
        self.stdout.write('  Обновление счётчиков брендов...')
        
        for brand in Brand.objects.all():
            count = Product.objects.filter(
                brand=brand,
                status=1,
                is_available=True
            ).count()
            
            if brand.product_count != count:
                brand.product_count = count
                brand.save(update_fields=['product_count'])
        
        total = Brand.objects.filter(product_count__gt=0).count()
        self.stdout.write(self.style.SUCCESS(f'    Брендов с товарами: {total}'))

    def ensure_default_skus(self):
        """Устанавливает is_default для первого SKU если нет default."""
        self.stdout.write('  Установка default SKU...')
        
        # Находим продукты без default SKU но с SKU
        products_without_default = Product.objects.annotate(
            has_default=Count('skus', filter=Q(skus__is_default=True)),
            total_skus=Count('skus')
        ).filter(has_default=0, total_skus__gt=0)
        
        fixed = 0
        for product in products_without_default:
            first_sku = product.skus.order_by('sort_order', 'id').first()
            if first_sku:
                first_sku.is_default = True
                first_sku.save(update_fields=['is_default'])
                fixed += 1
        
        self.stdout.write(self.style.SUCCESS(f'    Установлено default SKU: {fixed}'))

    def create_missing_food_details(self):
        """Создаёт FoodDetails для кормов, у которых его нет."""
        self.stdout.write('  Создание недостающих FoodDetails...')
        
        # Находим корма без FoodDetails
        food_products = Product.objects.filter(
            product_group__in=['food', 'treats', 'vitamins']
        ).exclude(
            food_details__isnull=False
        )
        
        created = 0
        for product in food_products:
            food_type_map = {
                'food': 'food',
                'treats': 'treat',
                'vitamins': 'supplement',
            }
            
            FoodDetails.objects.get_or_create(
                product=product,
                defaults={
                    'product_type': food_type_map.get(product.product_group, 'food'),
                    'target_size': product.size_group or 'all',
                    'grain_free': product.is_grain_free,
                    'is_hypoallergenic': product.is_hypoallergenic,
                    'is_veterinary': product.is_veterinary,
                }
            )
            created += 1
        
        self.stdout.write(self.style.SUCCESS(f'    Создано FoodDetails: {created}'))
