"""
Импорт данных магазина из JSON файлов (v2).

Импортирует данные в новую структуру БД:
- brands.json → Brand
- categories.json → Category
- products.json → Product + FoodDetails
- product_skus.json → ProductSKU

Использование:
    python manage.py import_shop_data_v2 --source d:\\api_cotmatros\\Data\\data_new\\products_db
    python manage.py import_shop_data_v2 --source d:\\api_cotmatros\\Data\\data_new\\products_db --clear
"""

import json
import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from apps.shop.models import Category, Brand, Product, ProductSKU, FoodDetails


class Command(BaseCommand):
    help = 'Импорт данных магазина из JSON файлов в новую структуру'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            type=str,
            required=True,
            help='Путь к директории с JSON файлами'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Очистить таблицы перед импортом'
        )
        parser.add_argument(
            '--skip-brands',
            action='store_true',
            help='Пропустить импорт брендов'
        )
        parser.add_argument(
            '--skip-categories',
            action='store_true',
            help='Пропустить импорт категорий'
        )
        parser.add_argument(
            '--skip-products',
            action='store_true',
            help='Пропустить импорт товаров'
        )
        parser.add_argument(
            '--skip-skus',
            action='store_true',
            help='Пропустить импорт SKU'
        )

    def handle(self, *args, **options):
        source_dir = options['source']
        
        if not os.path.isdir(source_dir):
            self.stderr.write(self.style.ERROR(f'Директория не найдена: {source_dir}'))
            return
        
        if options['clear']:
            self.clear_tables()
        
        # Порядок важен из-за FK
        if not options['skip_brands']:
            self.import_brands(os.path.join(source_dir, 'brands.json'))
        
        if not options['skip_categories']:
            self.import_categories(os.path.join(source_dir, 'categories.json'))
        
        if not options['skip_products']:
            self.import_products(os.path.join(source_dir, 'products.json'))
        
        if not options['skip_skus']:
            self.import_skus(os.path.join(source_dir, 'product_skus.json'))
        
        # Пересчёт денормализованных полей
        self.update_denormalized_fields()
        
        self.stdout.write(self.style.SUCCESS('Импорт завершён!'))

    def clear_tables(self):
        """Очистка таблиц перед импортом."""
        self.stdout.write('Очистка таблиц...')
        FoodDetails.objects.all().delete()
        ProductSKU.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()
        Brand.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('Таблицы очищены'))

    def import_brands(self, filepath):
        """Импорт брендов."""
        if not os.path.exists(filepath):
            self.stdout.write(self.style.WARNING(f'Файл не найден: {filepath}'))
            return
        
        self.stdout.write(f'Импорт брендов из {filepath}...')
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        created = 0
        updated = 0
        used_slugs = set(Brand.objects.values_list('slug', flat=True))
        
        for item in data:
            brand_id = item.get('id')
            name = item.get('name', '').strip()
            
            if not name:
                continue
            
            # Проверяем, существует ли бренд с таким kotmatros_id
            existing = Brand.objects.filter(kotmatros_brand_id=brand_id).first()
            
            # Генерируем уникальный slug
            base_slug = slugify(name, allow_unicode=True) or f'brand-{brand_id}'
            slug = base_slug[:250]
            
            if existing:
                # Для существующего бренда сохраняем его slug
                slug = existing.slug
            else:
                # Для нового бренда генерируем уникальный slug
                if slug in used_slugs:
                    slug = f"{base_slug[:240]}-{brand_id}"
                used_slugs.add(slug)
            
            brand, is_created = Brand.objects.update_or_create(
                kotmatros_brand_id=brand_id,
                defaults={
                    'name': name,
                    'slug': slug[:255],
                    'product_count': item.get('product_count', 0),
                    'is_active': True,
                }
            )
            
            if is_created:
                created += 1
            else:
                updated += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'Бренды: создано {created}, обновлено {updated}'
        ))

    def import_categories(self, filepath):
        """Импорт категорий."""
        if not os.path.exists(filepath):
            self.stdout.write(self.style.WARNING(f'Файл не найден: {filepath}'))
            return
        
        self.stdout.write(f'Импорт категорий из {filepath}...')
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Сначала создаём все категории без parent
        created = 0
        updated = 0
        category_map = {}  # kotmatros_id -> Category
        used_slugs = set(Category.objects.values_list('slug', flat=True))
        
        for item in data:
            cat_id = item.get('id')
            name = item.get('name', '').strip()
            
            if not name:
                continue
            
            # Проверяем, существует ли уже категория с таким kotmatros_id
            existing = Category.objects.filter(kotmatros_category_id=cat_id).first()
            
            # Генерируем уникальный slug
            base_slug = item.get('slug') or slugify(name, allow_unicode=True) or f'cat-{cat_id}'
            slug = base_slug[:250]
            
            # Если slug уже используется (и это не та же самая категория), добавляем суффикс
            if existing:
                # Для существующей категории сохраняем её slug
                slug = existing.slug
            else:
                # Для новой категории генерируем уникальный slug
                animal_type = item.get('animal_type', 'all')
                if slug in used_slugs:
                    # Добавляем animal_type к slug
                    slug = f"{base_slug[:240]}-{animal_type}"
                if slug in used_slugs:
                    # Если всё ещё конфликт, добавляем ID
                    slug = f"{base_slug[:230]}-{cat_id}"
                
                used_slugs.add(slug)
            
            category, is_created = Category.objects.update_or_create(
                kotmatros_category_id=cat_id,
                defaults={
                    'name': name,
                    'slug': slug[:255],
                    'depth': item.get('depth', 0),
                    'path': item.get('path', []),
                    'animal_type': item.get('animal_type', 'all'),
                    'is_active': True,
                }
            )
            
            category_map[cat_id] = category
            
            if is_created:
                created += 1
            else:
                updated += 1
        
        # Теперь обновляем parent_id
        for item in data:
            cat_id = item.get('id')
            parent_id = item.get('parent_id')
            
            if parent_id and cat_id in category_map and parent_id in category_map:
                category = category_map[cat_id]
                category.parent = category_map[parent_id]
                category.save(update_fields=['parent'])
        
        self.stdout.write(self.style.SUCCESS(
            f'Категории: создано {created}, обновлено {updated}'
        ))

    @transaction.atomic
    def import_products(self, filepath):
        """Импорт товаров."""
        if not os.path.exists(filepath):
            self.stdout.write(self.style.WARNING(f'Файл не найден: {filepath}'))
            return
        
        self.stdout.write(f'Импорт товаров из {filepath}...')
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Кэшируем категории и бренды
        categories = {c.kotmatros_category_id: c for c in Category.objects.all()}
        brands = {b.kotmatros_brand_id: b for b in Brand.objects.all()}
        used_slugs = set(Product.objects.values_list('slug', flat=True))
        
        created = 0
        updated = 0
        food_details_created = 0
        
        for item in data:
            product_id = item.get('external_id')
            name = item.get('name', '').strip()
            
            if not name:
                continue
            
            # Получаем связанные объекты
            category_id = item.get('category_id')
            brand_id = item.get('brand_id')
            
            category = categories.get(category_id)
            brand = brands.get(brand_id)
            
            if not category:
                self.stdout.write(self.style.WARNING(
                    f'Категория {category_id} не найдена для товара {product_id}'
                ))
                continue
            
            # Проверяем, существует ли продукт с таким kotmatros_id
            existing = Product.objects.filter(kotmatros_product_id=product_id).first()
            
            # Генерируем уникальный slug
            base_slug = item.get('slug') or slugify(name, allow_unicode=True) or f'product-{product_id}'
            slug = base_slug[:490]
            
            if existing:
                slug = existing.slug
            else:
                if slug in used_slugs:
                    slug = f"{base_slug[:480]}-{product_id}"
                used_slugs.add(slug)
            
            age_group = item.get('age_group', 'all')
            
            # Generate short_description from description if missing
            short_desc = item.get('short_description') or ''
            if not short_desc and item.get('description'):
                short_desc = item.get('description', '')[:200] + '...'
            
            # Generate SEO meta fields
            meta_title = f"{name} | Купить в PetCare"[:200]
            meta_desc = (short_desc[:157] + '...') if len(short_desc) > 160 else short_desc
            
            product, is_created = Product.objects.update_or_create(
                kotmatros_product_id=product_id,
                defaults={
                    'name': name,
                    'slug': slug[:500],
                    'short_description': short_desc[:500],
                    'description': item.get('description', ''),
                    'price': Decimal(str(item.get('price', 0))),
                    'compare_price': Decimal(str(item.get('compare_price', 0))) if item.get('compare_price') else None,
                    'image_url': item.get('image_url', ''),
                    'images': item.get('images', []),
                    'rating': Decimal(str(item.get('rating', 0))),
                    'rating_count': item.get('rating_count', 0),
                    'is_available': item.get('is_available', True),
                    'sku_count': item.get('sku_count', 1),
                    'animal_type': item.get('animal_type', 'dog'),
                    'new_category': category,
                    'product_group': item.get('product_group', ''),
                    'brand': brand,
                    'age_group': age_group,
                    'size_group': item.get('size_group'),
                    'is_grain_free': item.get('is_grain_free', False),
                    'is_hypoallergenic': item.get('is_hypoallergenic', False),
                    'is_veterinary': item.get('is_veterinary', False),
                    'country': item.get('country', ''),
                    'category_details': item.get('category_details', {}),
                    'meta_title': meta_title,
                    'meta_description': meta_desc[:255],
                    'status': 1,
                    'in_stock': item.get('is_available', True),
                }
            )
            
            if is_created:
                created += 1
            else:
                updated += 1
            
            # Создаём FoodDetails для кормов
            product_group = item.get('product_group', '')
            if product_group in ('food', 'treats', 'vitamins'):
                category_details = item.get('category_details', {})
                nutrition = category_details.get('nutrition', {})
                
                food_type_map = {
                    'food': 'food',
                    'treats': 'treat',
                    'vitamins': 'supplement',
                }
                
                # Извлекаем ингредиенты
                ingredients_raw = category_details.get('ingredients', [])
                ingredients = [
                    ing.get('name', '') for ing in ingredients_raw 
                    if isinstance(ing, dict) and ing.get('name')
                ]
                
                food_details, fd_created = FoodDetails.objects.update_or_create(
                    product=product,
                    defaults={
                        'product_type': food_type_map.get(product_group, 'food'),
                        'target_size': item.get('size_group'),
                        'grain_free': item.get('is_grain_free', False),
                        'is_hypoallergenic': item.get('is_hypoallergenic', False),
                        'is_veterinary': item.get('is_veterinary', False),
                        'energy_kcal_per_100g': Decimal(str(nutrition.get('kcal_per_100g', 0))) if nutrition.get('kcal_per_100g') else None,
                        'protein_g_per_100g': Decimal(str(nutrition.get('protein_percent', 0))) if nutrition.get('protein_percent') else None,
                        'fat_g_per_100g': Decimal(str(nutrition.get('fat_percent', 0))) if nutrition.get('fat_percent') else None,
                        'fiber_g_per_100g': Decimal(str(nutrition.get('fiber_percent', 0))) if nutrition.get('fiber_percent') else None,
                        'ash_g_per_100g': Decimal(str(nutrition.get('ash_percent', 0))) if nutrition.get('ash_percent') else None,
                        'ingredients': ingredients[:50],  # Ограничиваем
                    }
                )
                
                if fd_created:
                    food_details_created += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'Товары: создано {created}, обновлено {updated}'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'FoodDetails: создано {food_details_created}'
        ))

    @transaction.atomic
    def import_skus(self, filepath):
        """Импорт SKU."""
        if not os.path.exists(filepath):
            self.stdout.write(self.style.WARNING(f'Файл не найден: {filepath}'))
            return
        
        self.stdout.write(f'Импорт SKU из {filepath}...')
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Кэшируем товары
        products = {p.kotmatros_product_id: p for p in Product.objects.all()}
        
        created = 0
        updated = 0
        skipped = 0
        
        # Группируем SKU по продуктам для определения is_default
        product_skus = {}
        for item in data:
            product_id = item.get('product_external_id')
            if product_id not in product_skus:
                product_skus[product_id] = []
            product_skus[product_id].append(item)
        
        for product_id, skus in product_skus.items():
            product = products.get(product_id)
            if not product:
                skipped += len(skus)
                continue
            
            # Первый SKU будет default
            for i, item in enumerate(skus):
                sku_id = item.get('external_sku_id')
                
                # Парсим вес из features
                features = item.get('features', {})
                weight_str = features.get('weight', '')
                weight_kg = None
                weight_display = weight_str
                
                if weight_str:
                    # Пытаемся извлечь числовое значение
                    try:
                        if 'кг' in weight_str.lower():
                            weight_kg = Decimal(weight_str.lower().replace('кг', '').strip())
                        elif 'г' in weight_str.lower():
                            grams = Decimal(weight_str.lower().replace('г', '').strip())
                            weight_kg = grams / 1000
                    except:
                        pass
                
                # Проверяем, существует ли SKU с таким kotmatros_variant_id
                existing = ProductSKU.objects.filter(kotmatros_variant_id=sku_id).first()
                
                # Генерируем уникальный sku code
                sku_code = item.get('sku', f'SKU-{sku_id}')[:100]
                if not existing:
                    # Проверяем уникальность (product_id, sku)
                    if ProductSKU.objects.filter(product=product, sku=sku_code).exists():
                        sku_code = f"{sku_code[:90]}-{sku_id}"
                else:
                    sku_code = existing.sku
                
                sku_obj, is_created = ProductSKU.objects.update_or_create(
                    kotmatros_variant_id=sku_id,
                    defaults={
                        'product': product,
                        'sku': sku_code,
                        'name': item.get('name', weight_display)[:255] if item.get('name') else weight_display[:255],
                        'price': Decimal(str(item.get('price', 0))),
                        'compare_price': Decimal(str(item.get('compare_price', 0))) if item.get('compare_price') else None,
                        'available': bool(item.get('available', True)),
                        'stock_quantity': item.get('count'),
                        'weight_kg': weight_kg,
                        'weight_display': weight_display[:20] if weight_display else '',
                        'features': features,
                        'is_default': (i == 0),  # Первый SKU - default
                        'sort_order': i,
                        'status': 1,
                    }
                )
                
                if is_created:
                    created += 1
                else:
                    updated += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'SKU: создано {created}, обновлено {updated}, пропущено {skipped}'
        ))

    def update_denormalized_fields(self):
        """Обновление денормализованных полей."""
        self.stdout.write('Обновление денормализованных полей...')
        
        # Обновляем price в Product из default SKU
        from django.db.models import F, Subquery, OuterRef
        from django.db.models.functions import Coalesce
        
        default_sku_subquery = ProductSKU.objects.filter(
            product=OuterRef('pk'),
            is_default=True
        ).values('price')[:1]
        
        default_compare_price_subquery = ProductSKU.objects.filter(
            product=OuterRef('pk'),
            is_default=True
        ).values('compare_price')[:1]
        
        # Обновляем только товары, у которых есть default SKU
        products_with_default_sku = Product.objects.filter(
            skus__is_default=True
        ).distinct()
        
        updated = products_with_default_sku.update(
            price=Coalesce(Subquery(default_sku_subquery), F('price')),
            compare_price=Subquery(default_compare_price_subquery)
        )
        
        self.stdout.write(self.style.SUCCESS(
            f'Обновлены цены для {updated} товаров'
        ))
        
        # Обновляем product_count в категориях
        for category in Category.objects.all():
            count = Product.objects.filter(new_category=category, status=1).count()
            category.product_count = count
            category.save(update_fields=['product_count'])
        
        # Обновляем product_count в брендах
        for brand in Brand.objects.all():
            count = Product.objects.filter(brand=brand, status=1).count()
            brand.product_count = count
            brand.save(update_fields=['product_count'])
        
        self.stdout.write(self.style.SUCCESS('Денормализованные поля обновлены'))
