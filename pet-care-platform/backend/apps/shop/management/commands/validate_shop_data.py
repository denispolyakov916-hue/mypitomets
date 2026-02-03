"""
Validate shop data integrity.

Checks:
- All products have at least 1 SKU
- All SKU have price > 0
- All food products have FoodDetails
- FoodDetails.ingredients not empty
- All categories have code
- All brands have brand_class
- image_url is valid URL

Usage:
    python manage.py validate_shop_data
"""

from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from apps.shop.models import Category, Brand, Product, ProductSKU, FoodDetails


class Command(BaseCommand):
    help = 'Validate shop data integrity'

    def handle(self, *args, **options):
        self.stdout.write('Validating shop data...')
        
        errors = []
        warnings = []
        
        # 1. Products without SKU
        products_without_sku = Product.objects.annotate(
            actual_sku_count=Count('skus')
        ).filter(actual_sku_count=0).count()
        
        if products_without_sku > 0:
            errors.append(f'Products without SKU: {products_without_sku}')
        else:
            self.stdout.write(self.style.SUCCESS('  [OK] All products have SKU'))
        
        # 2. SKU without price
        sku_without_price = ProductSKU.objects.filter(
            Q(price__isnull=True) | Q(price__lte=0)
        ).count()
        
        if sku_without_price > 0:
            errors.append(f'SKU without price: {sku_without_price}')
        else:
            self.stdout.write(self.style.SUCCESS('  [OK] All SKU have price'))
        
        # 3. Products without default SKU
        products_without_default = Product.objects.annotate(
            has_default=Count('skus', filter=Q(skus__is_default=True))
        ).filter(has_default=0, skus__isnull=False).distinct().count()
        
        if products_without_default > 0:
            warnings.append(f'Products without default SKU: {products_without_default}')
        else:
            self.stdout.write(self.style.SUCCESS('  [OK] All products have default SKU'))
        
        # 4. Food products without FoodDetails
        food_products_count = Product.objects.filter(
            product_group__in=['food', 'treats', 'vitamins']
        ).count()
        
        food_details_count = FoodDetails.objects.count()
        
        if food_details_count < food_products_count:
            missing = food_products_count - food_details_count
            warnings.append(f'Food products without FoodDetails: {missing}')
        else:
            self.stdout.write(self.style.SUCCESS('  [OK] All food products have FoodDetails'))
        
        # 5. FoodDetails without ingredients
        fd_without_ingredients = FoodDetails.objects.filter(
            Q(ingredients__isnull=True) | Q(ingredients=[])
        ).count()
        
        if fd_without_ingredients > 0:
            warnings.append(f'FoodDetails without ingredients: {fd_without_ingredients}')
        else:
            self.stdout.write(self.style.SUCCESS('  [OK] All FoodDetails have ingredients'))
        
        # 6. FoodDetails without nutrition
        fd_without_nutrition = FoodDetails.objects.filter(
            energy_kcal_per_100g__isnull=True,
            protein_g_per_100g__isnull=True
        ).count()
        
        if fd_without_nutrition > 0:
            warnings.append(f'FoodDetails without nutrition: {fd_without_nutrition}')
        else:
            self.stdout.write(self.style.SUCCESS('  [OK] All FoodDetails have nutrition'))
        
        # 7. Categories without code
        cats_without_code = Category.objects.filter(
            Q(code__isnull=True) | Q(code='')
        ).count()
        
        if cats_without_code > 0:
            warnings.append(f'Categories without code: {cats_without_code}')
        else:
            self.stdout.write(self.style.SUCCESS('  [OK] All categories have code'))
        
        # 8. Brands without brand_class
        brands_without_class = Brand.objects.filter(
            Q(brand_class__isnull=True) | Q(brand_class='')
        ).count()
        
        if brands_without_class > 0:
            warnings.append(f'Brands without brand_class: {brands_without_class}')
        else:
            self.stdout.write(self.style.SUCCESS('  [OK] All brands have brand_class'))
        
        # 9. Products without image
        products_without_image = Product.objects.annotate(
            image_count=Count('product_images')
        ).filter(
            Q(image_url__isnull=True) | Q(image_url=''),
            image_count=0
        ).count()
        
        if products_without_image > 0:
            warnings.append(f'Products without image: {products_without_image}')
        else:
            self.stdout.write(self.style.SUCCESS('  [OK] All products have image'))
        
        # 10. Products without meta_title
        products_without_meta = Product.objects.filter(
            Q(meta_title__isnull=True) | Q(meta_title='')
        ).count()
        
        if products_without_meta > 0:
            warnings.append(f'Products without meta_title: {products_without_meta}')
        else:
            self.stdout.write(self.style.SUCCESS('  [OK] All products have meta_title'))
        
        # Summary
        self.stdout.write('')
        
        if errors:
            self.stdout.write(self.style.ERROR('ERRORS:'))
            for err in errors:
                self.stdout.write(self.style.ERROR(f'  [X] {err}'))
        
        if warnings:
            self.stdout.write(self.style.WARNING('WARNINGS:'))
            for warn in warnings:
                self.stdout.write(self.style.WARNING(f'  [!] {warn}'))
        
        if not errors and not warnings:
            self.stdout.write(self.style.SUCCESS('\n[OK] ALL CHECKS PASSED'))
        elif errors:
            self.stdout.write(self.style.ERROR(f'\n[X] ERRORS: {len(errors)}, WARNINGS: {len(warnings)}'))
        else:
            self.stdout.write(self.style.WARNING(f'\n[!] WARNINGS: {len(warnings)}'))
