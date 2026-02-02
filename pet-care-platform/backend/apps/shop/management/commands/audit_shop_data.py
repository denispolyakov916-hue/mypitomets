"""
Аудит данных магазина.

Проверяет заполненность всех полей согласно shop-db-structure.md.
Выводит статистику и проблемные записи.

Использование:
    python manage.py audit_shop_data
    python manage.py audit_shop_data --verbose
"""

from django.core.management.base import BaseCommand
from django.db.models import Count, Q, F
from apps.shop.models import Category, Brand, Product, ProductSKU, FoodDetails


class Command(BaseCommand):
    help = 'Аудит данных магазина - проверка заполненности полей'

    def add_arguments(self, parser):
        parser.add_argument(
            '--details',
            action='store_true',
            help='Показать примеры проблемных записей'
        )

    def handle(self, *args, **options):
        verbose = options['details']
        
        self.stdout.write(self.style.MIGRATE_HEADING('\n' + '=' * 60))
        self.stdout.write(self.style.MIGRATE_HEADING('AUDIT SHOP DATA'))
        self.stdout.write(self.style.MIGRATE_HEADING('=' * 60 + '\n'))
        
        self.audit_categories(verbose)
        self.audit_brands(verbose)
        self.audit_products(verbose)
        self.audit_skus(verbose)
        self.audit_food_details(verbose)
        
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('AUDIT COMPLETE'))
        self.stdout.write(self.style.SUCCESS('=' * 60 + '\n'))

    def audit_categories(self, verbose):
        self.stdout.write(self.style.HTTP_INFO('\n--- CATEGORIES ---'))
        
        total = Category.objects.count()
        self.stdout.write(f'Total: {total}')
        
        if total == 0:
            self.stdout.write(self.style.WARNING('No categories found!'))
            return
        
        # Check fields
        fields = {
            'kotmatros_category_id': Category.objects.exclude(kotmatros_category_id__isnull=True).count(),
            'code': Category.objects.exclude(code__isnull=True).exclude(code='').count(),
            'slug': Category.objects.exclude(slug='').count(),
            'name': Category.objects.exclude(name='').count(),
            'icon': Category.objects.exclude(icon='').count(),
            'image_url': Category.objects.exclude(image_url='').count(),
            'product_count > 0': Category.objects.filter(product_count__gt=0).count(),
            'parent (non-root)': Category.objects.exclude(parent__isnull=True).count(),
        }
        
        for field, count in fields.items():
            pct = count / total * 100
            status = self.style.SUCCESS if pct > 80 else (self.style.WARNING if pct > 50 else self.style.ERROR)
            self.stdout.write(f'  {field}: {count}/{total} ({pct:.1f}%) {status("OK" if pct > 80 else "LOW")}')
        
        if verbose:
            # Show categories without code
            no_code = Category.objects.filter(Q(code__isnull=True) | Q(code=''))[:5]
            if no_code:
                self.stdout.write(self.style.WARNING('  Categories without code:'))
                for c in no_code:
                    self.stdout.write(f'    - id={c.id}, name={c.name[:30]}')

    def audit_brands(self, verbose):
        self.stdout.write(self.style.HTTP_INFO('\n--- BRANDS ---'))
        
        total = Brand.objects.count()
        self.stdout.write(f'Total: {total}')
        
        if total == 0:
            self.stdout.write(self.style.WARNING('No brands found!'))
            return
        
        fields = {
            'kotmatros_brand_id': Brand.objects.exclude(kotmatros_brand_id__isnull=True).count(),
            'slug': Brand.objects.exclude(slug='').count(),
            'name': Brand.objects.exclude(name='').count(),
            'logo_url': Brand.objects.exclude(logo_url='').count(),
            'brand_class': Brand.objects.exclude(brand_class__isnull=True).exclude(brand_class='').count(),
            'country': Brand.objects.exclude(country='').count(),
            'priority > 0': Brand.objects.filter(priority__gt=0).count(),
            'product_count > 0': Brand.objects.filter(product_count__gt=0).count(),
        }
        
        for field, count in fields.items():
            pct = count / total * 100
            status = self.style.SUCCESS if pct > 80 else (self.style.WARNING if pct > 50 else self.style.ERROR)
            self.stdout.write(f'  {field}: {count}/{total} ({pct:.1f}%) {status("OK" if pct > 80 else "LOW")}')
        
        # Brand class distribution
        self.stdout.write('  Brand class distribution:')
        for bc in ['economy', 'premium', 'super_premium', 'holistic']:
            count = Brand.objects.filter(brand_class=bc).count()
            self.stdout.write(f'    - {bc}: {count}')
        
        if verbose:
            no_class = Brand.objects.filter(Q(brand_class__isnull=True) | Q(brand_class=''))[:5]
            if no_class:
                self.stdout.write(self.style.WARNING('  Brands without brand_class:'))
                for b in no_class:
                    self.stdout.write(f'    - id={b.id}, name={b.name}')

    def audit_products(self, verbose):
        self.stdout.write(self.style.HTTP_INFO('\n--- PRODUCTS ---'))
        
        total = Product.objects.count()
        self.stdout.write(f'Total: {total}')
        
        if total == 0:
            self.stdout.write(self.style.WARNING('No products found!'))
            return
        
        fields = {
            'kotmatros_product_id': Product.objects.exclude(kotmatros_product_id__isnull=True).count(),
            'slug': Product.objects.exclude(slug='').count(),
            'name': Product.objects.exclude(name='').count(),
            'short_description': Product.objects.exclude(short_description='').exclude(short_description__isnull=True).count(),
            'new_category': Product.objects.exclude(new_category__isnull=True).count(),
            'brand': Product.objects.exclude(brand__isnull=True).count(),
            'images (not empty)': Product.objects.exclude(images=[]).count(),
            'image_url': Product.objects.exclude(image_url='').exclude(image_url__isnull=True).count(),
            'price > 0': Product.objects.filter(price__gt=0).count(),
            'compare_price > 0': Product.objects.filter(compare_price__gt=0).count(),
            'meta_title': Product.objects.exclude(meta_title='').exclude(meta_title__isnull=True).count(),
            'meta_description': Product.objects.exclude(meta_description='').exclude(meta_description__isnull=True).count(),
            'animal_type': Product.objects.exclude(animal_type='').count(),
            'age_group': Product.objects.exclude(age_group__isnull=True).exclude(age_group='').count(),
            'size_group': Product.objects.exclude(size_group__isnull=True).exclude(size_group='').count(),
        }
        
        for field, count in fields.items():
            pct = count / total * 100
            status = self.style.SUCCESS if pct > 80 else (self.style.WARNING if pct > 50 else self.style.ERROR)
            self.stdout.write(f'  {field}: {count}/{total} ({pct:.1f}%) {status("OK" if pct > 80 else "LOW")}')
        
        # Product group distribution
        self.stdout.write('  Product group distribution:')
        groups = Product.objects.values('product_group').annotate(cnt=Count('id')).order_by('-cnt')[:10]
        for g in groups:
            self.stdout.write(f'    - {g["product_group"]}: {g["cnt"]}')
        
        # Animal type distribution
        self.stdout.write('  Animal type distribution:')
        for at in ['dog', 'cat', 'all']:
            count = Product.objects.filter(animal_type=at).count()
            self.stdout.write(f'    - {at}: {count}')
        
        if verbose:
            no_images = Product.objects.filter(images=[])[:5]
            if no_images:
                self.stdout.write(self.style.WARNING('  Products without images:'))
                for p in no_images:
                    self.stdout.write(f'    - id={p.id}, name={p.name[:40]}')

    def audit_skus(self, verbose):
        self.stdout.write(self.style.HTTP_INFO('\n--- PRODUCT SKUs ---'))
        
        total = ProductSKU.objects.count()
        self.stdout.write(f'Total: {total}')
        
        if total == 0:
            self.stdout.write(self.style.WARNING('No SKUs found!'))
            return
        
        fields = {
            'kotmatros_variant_id': ProductSKU.objects.exclude(kotmatros_variant_id__isnull=True).count(),
            'sku': ProductSKU.objects.exclude(sku='').count(),
            'name': ProductSKU.objects.exclude(name='').exclude(name__isnull=True).count(),
            'price > 0': ProductSKU.objects.filter(price__gt=0).count(),
            'compare_price > 0': ProductSKU.objects.filter(compare_price__gt=0).count(),
            'weight_kg': ProductSKU.objects.exclude(weight_kg__isnull=True).count(),
            'weight_display': ProductSKU.objects.exclude(weight_display='').exclude(weight_display__isnull=True).count(),
            'is_default=True': ProductSKU.objects.filter(is_default=True).count(),
            'available=True': ProductSKU.objects.filter(available=True).count(),
        }
        
        for field, count in fields.items():
            pct = count / total * 100
            status = self.style.SUCCESS if pct > 80 else (self.style.WARNING if pct > 50 else self.style.ERROR)
            self.stdout.write(f'  {field}: {count}/{total} ({pct:.1f}%) {status("OK" if pct > 80 else "LOW")}')
        
        # Products without SKU
        products_with_sku = ProductSKU.objects.values('product').distinct().count()
        products_total = Product.objects.count()
        products_without_sku = products_total - products_with_sku
        if products_without_sku > 0:
            self.stdout.write(self.style.ERROR(f'  Products WITHOUT any SKU: {products_without_sku}'))
        else:
            self.stdout.write(self.style.SUCCESS('  All products have at least 1 SKU'))
        
        # Products without default SKU
        products_with_default = ProductSKU.objects.filter(is_default=True).values('product').distinct().count()
        products_without_default = products_total - products_with_default
        if products_without_default > 0:
            self.stdout.write(self.style.WARNING(f'  Products WITHOUT default SKU: {products_without_default}'))

    def audit_food_details(self, verbose):
        self.stdout.write(self.style.HTTP_INFO('\n--- FOOD DETAILS ---'))
        
        total = FoodDetails.objects.count()
        self.stdout.write(f'Total FoodDetails: {total}')
        
        # How many food products should have FoodDetails?
        food_products = Product.objects.filter(
            Q(product_group='food') | Q(product_group='treats') | Q(product_group='vitamins')
        ).count()
        self.stdout.write(f'Food/Treats/Vitamins products: {food_products}')
        
        if food_products > 0:
            coverage = total / food_products * 100
            self.stdout.write(f'FoodDetails coverage: {coverage:.1f}%')
        
        if total == 0:
            self.stdout.write(self.style.WARNING('No FoodDetails found!'))
            return
        
        fields = {
            'product_type': FoodDetails.objects.exclude(product_type='').count(),
            'target_size': FoodDetails.objects.exclude(target_size='').exclude(target_size__isnull=True).count(),
            'activity_level': FoodDetails.objects.exclude(activity_level__isnull=True).count(),
            'grain_free=True': FoodDetails.objects.filter(grain_free=True).count(),
            'is_hypoallergenic=True': FoodDetails.objects.filter(is_hypoallergenic=True).count(),
            'is_veterinary=True': FoodDetails.objects.filter(is_veterinary=True).count(),
            'energy_kcal_per_100g': FoodDetails.objects.exclude(energy_kcal_per_100g__isnull=True).count(),
            'protein_g_per_100g': FoodDetails.objects.exclude(protein_g_per_100g__isnull=True).count(),
            'fat_g_per_100g': FoodDetails.objects.exclude(fat_g_per_100g__isnull=True).count(),
            'fiber_g_per_100g': FoodDetails.objects.exclude(fiber_g_per_100g__isnull=True).count(),
            'ingredients (not empty)': FoodDetails.objects.exclude(ingredients=[]).exclude(ingredients__isnull=True).count(),
            'allergens (not empty)': FoodDetails.objects.exclude(allergens=[]).exclude(allergens__isnull=True).count(),
            'special_diet (not empty)': FoodDetails.objects.exclude(special_diet=[]).exclude(special_diet__isnull=True).count(),
            'health_conditions (not empty)': FoodDetails.objects.exclude(health_conditions=[]).exclude(health_conditions__isnull=True).count(),
        }
        
        for field, count in fields.items():
            pct = count / total * 100
            status = self.style.SUCCESS if pct > 80 else (self.style.WARNING if pct > 50 else self.style.ERROR)
            self.stdout.write(f'  {field}: {count}/{total} ({pct:.1f}%) {status("OK" if pct > 80 else "LOW")}')
        
        if verbose:
            no_nutrition = FoodDetails.objects.filter(
                energy_kcal_per_100g__isnull=True,
                protein_g_per_100g__isnull=True
            )[:5]
            if no_nutrition:
                self.stdout.write(self.style.WARNING('  FoodDetails without nutrition:'))
                for fd in no_nutrition:
                    self.stdout.write(f'    - product_id={fd.product_id}')
