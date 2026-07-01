"""
Management command для загрузки данных магазина из JSON файлов.

Загружает:
- brands.json → Brand
- categories.json → Category  
- products.json → Product
- product_skus.json → ProductSKU

Использование:
    python manage.py load_shop_data                    # Загрузить все данные
    python manage.py load_shop_data --clear            # Очистить старые данные и загрузить новые
    python manage.py load_shop_data --only=brands      # Загрузить только бренды
    python manage.py load_shop_data --only=categories  # Загрузить только категории
    python manage.py load_shop_data --only=products    # Загрузить только товары
    python manage.py load_shop_data --only=skus        # Загрузить только SKU
"""

import json
import os
import re
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from unidecode import unidecode

from apps.shop.models import Brand, Category, Product, ProductSKU


class Command(BaseCommand):
    help = 'Загрузка данных магазина из JSON файлов'
    
    # Путь к JSON файлам
    DATA_DIR = os.path.join(
        os.path.dirname(__file__),
        '..', '..', '..', '..',
        'docs', '04 Магазин', 'Data', 'data_new', 'products_db'
    )
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Очистить старые данные перед загрузкой'
        )
        parser.add_argument(
            '--only',
            type=str,
            choices=['brands', 'categories', 'products', 'skus'],
            help='Загрузить только указанный тип данных'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=500,
            help='Размер пакета для bulk_create (по умолчанию 500)'
        )
    
    def handle(self, *args, **options):
        self.batch_size = options['batch_size']
        self.verbosity = options['verbosity']
        
        self.stdout.write(self.style.WARNING(
            'Команда устарела для новой структуры магазина. '
            'Используйте import_dinozavrik и import_dinozavrik_to_shop.'
        ))
        return

        # Проверяем существование директории с данными
        if not os.path.exists(self.DATA_DIR):
            self.stderr.write(self.style.ERROR(
                f'Директория с данными не найдена: {self.DATA_DIR}'
            ))
            return
        
        self.stdout.write(f'Источник данных: {self.DATA_DIR}')
        
        only = options.get('only')
        
        if options['clear']:
            self.clear_old_data(only)
        
        if only:
            if only == 'brands':
                self.load_brands()
            elif only == 'categories':
                self.load_categories()
            elif only == 'products':
                self.load_products()
            elif only == 'skus':
                self.load_skus()
        else:
            # Загружаем все данные в правильном порядке
            self.load_brands()
            self.load_categories()
            self.load_products()
            self.load_skus()
            self.update_counters()
        
        self.stdout.write(self.style.SUCCESS('Загрузка данных завершена!'))
    
    def clear_old_data(self, only=None):
        """Очистка старых данных."""
        self.stdout.write(self.style.WARNING('Очистка старых данных...'))
        
        with transaction.atomic():
            if only is None or only == 'skus':
                count = ProductSKU.objects.all().delete()[0]
                self.stdout.write(f'  Удалено SKU: {count}')
            
            if only is None or only == 'products':
                count = Product.objects.all().delete()[0]
                self.stdout.write(f'  Удалено товаров: {count}')
            
            if only is None or only == 'categories':
                count = Category.objects.all().delete()[0]
                self.stdout.write(f'  Удалено категорий: {count}')
            
            if only is None or only == 'brands':
                count = Brand.objects.all().delete()[0]
                self.stdout.write(f'  Удалено брендов: {count}')
    
    def load_json(self, filename):
        """Загрузка JSON файла."""
        filepath = os.path.join(self.DATA_DIR, filename)
        if not os.path.exists(filepath):
            self.stderr.write(self.style.ERROR(f'Файл не найден: {filepath}'))
            return []
        
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def make_unique_slug(self, base_slug, model_class, existing_slugs=None):
        """Создание уникального slug."""
        if existing_slugs is None:
            existing_slugs = set(model_class.objects.values_list('slug', flat=True))
        
        slug = base_slug[:250]
        counter = 1
        original_slug = slug
        
        while slug in existing_slugs:
            slug = f"{original_slug[:240]}-{counter}"
            counter += 1
        
        existing_slugs.add(slug)
        return slug
    
    def load_brands(self):
        """Загрузка брендов."""
        self.stdout.write('Загрузка брендов...')
        data = self.load_json('brands.json')
        
        if not data:
            return
        
        existing_slugs = set(Brand.objects.values_list('slug', flat=True))
        brands = []
        
        for item in data:
            name = item['name']
            # Создаём slug из названия
            base_slug = slugify(unidecode(name))
            if not base_slug:
                base_slug = f"brand-{item['id']}"
            
            slug = self.make_unique_slug(base_slug, Brand, existing_slugs)
            
            brands.append(Brand(
                external_id=item['id'],
                name=name,
                slug=slug,
                product_count=item.get('product_count', 0),
                is_active=True
            ))
        
        with transaction.atomic():
            Brand.objects.bulk_create(brands, batch_size=self.batch_size, ignore_conflicts=True)
        
        self.stdout.write(self.style.SUCCESS(f'  Загружено брендов: {len(brands)}'))
    
    def load_categories(self):
        """Загрузка категорий."""
        self.stdout.write('Загрузка категорий...')
        data = self.load_json('categories.json')
        
        if not data:
            return
        
        # Маппинг product_group из названий категорий
        PRODUCT_GROUP_MAP = {
            'Корм': 'food',
            'Лакомства': 'treats',
            'Ветаптека': 'vet',
            'Витамины и добавки': 'vitamins',
            'Одежда': 'clothes',
            'Амуниция': 'equipment',
            'Груминг': 'grooming',
            'Транспортировка и содержание': 'housing',
            'Игрушки': 'toys',
            'Миски, поилки и кормушки': 'bowls',
            'Миски': 'bowls',
            'Туалеты и принадлежности': 'toilet',
        }
        
        existing_slugs = set(Category.objects.values_list('slug', flat=True))
        
        # Сначала создаём все категории без parent
        categories_by_id = {}
        categories = []
        
        for item in data:
            name = item['name']
            base_slug = item.get('slug', slugify(unidecode(name)))
            if not base_slug:
                base_slug = f"category-{item['id']}"
            
            # Добавляем animal_type к slug для уникальности
            animal_type = item.get('animal_type', 'all')
            if animal_type != 'all' and base_slug not in ['для-собак', 'для-кошек']:
                base_slug = f"{base_slug}-{animal_type}"
            
            slug = self.make_unique_slug(base_slug, Category, existing_slugs)
            
            # Определяем product_group
            product_group = None
            if item.get('depth', 0) >= 1:
                product_group = PRODUCT_GROUP_MAP.get(name)
            
            cat = Category(
                external_id=item['id'],
                name=name,
                slug=slug,
                depth=item.get('depth', 0),
                path=item.get('path', []),
                animal_type=animal_type,
                product_group=product_group,
                is_active=True,
                show_in_menu=True
            )
            categories.append(cat)
            categories_by_id[item['id']] = {
                'category': cat,
                'parent_id': item.get('parent_id')
            }
        
        # Создаём категории без parent
        with transaction.atomic():
            Category.objects.bulk_create(categories, batch_size=self.batch_size)
        
        # Теперь устанавливаем parent_id
        self.stdout.write('  Обновление родительских связей...')
        
        # Получаем созданные категории
        created_categories = {
            c.external_id: c 
            for c in Category.objects.filter(external_id__in=categories_by_id.keys())
        }
        
        # Обновляем parent
        updates = []
        for ext_id, data_item in categories_by_id.items():
            parent_ext_id = data_item['parent_id']
            if parent_ext_id and parent_ext_id in created_categories:
                cat = created_categories.get(ext_id)
                if cat:
                    cat.parent = created_categories[parent_ext_id]
                    updates.append(cat)
        
        if updates:
            with transaction.atomic():
                Category.objects.bulk_update(updates, ['parent'], batch_size=self.batch_size)
        
        self.stdout.write(self.style.SUCCESS(f'  Загружено категорий: {len(categories)}'))
    
    def load_products(self):
        """Загрузка товаров."""
        self.stdout.write('Загрузка товаров...')
        data = self.load_json('products.json')
        
        if not data:
            return
        
        # Получаем маппинги
        brands_map = {b.external_id: b for b in Brand.objects.all()}
        categories_map = {c.external_id: c for c in Category.objects.all()}
        existing_slugs = set(Product.objects.values_list('slug', flat=True))
        existing_external_ids = set(Product.objects.values_list('external_id', flat=True))
        
        products = []
        skipped = 0
        
        for item in data:
            external_id = str(item['external_id'])
            
            # Пропускаем если уже существует
            if external_id in existing_external_ids:
                skipped += 1
                continue
            
            # Slug
            base_slug = item.get('slug', '')
            if not base_slug:
                base_slug = slugify(unidecode(item['name'][:200]))
            if not base_slug:
                base_slug = f"product-{external_id}"
            
            slug = self.make_unique_slug(base_slug, Product, existing_slugs)
            
            # Бренд и категория
            brand = brands_map.get(item.get('brand_id'))
            category = categories_map.get(item.get('category_id'))
            
            # category_details
            category_details = item.get('category_details', {})
            if category_details is None:
                category_details = {}
            
            # health_conditions из category_details
            health_conditions = []
            if category_details.get('is_veterinary'):
                health_conditions.append('veterinary')
            
            # allergens из category_details
            allergens = []
            if 'allergens' in category_details:
                allergens = category_details['allergens']
            
            # images
            images = item.get('images', [])
            if images is None:
                images = []
            
            product = Product(
                external_id=external_id,
                name=item['name'][:500],
                slug=slug,
                short_description=item.get('short_description', '')[:500] if item.get('short_description') else None,
                description=item.get('description', ''),
                price=Decimal(str(item.get('price', 0))),
                compare_price=Decimal(str(item['compare_price'])) if item.get('compare_price') else None,
                image_url=item.get('image_url', '')[:500] if item.get('image_url') else None,
                images=images,
                rating=Decimal(str(item.get('rating', 0))),
                rating_count=item.get('rating_count', 0),
                is_available=item.get('is_available', True),
                sku_count=item.get('sku_count', 1),
                animal_type=item.get('animal_type', 'dog'),
                new_category=category,
                product_group=item.get('product_group'),
                brand=brand,
                age_group=item.get('age_group'),
                size_group=item.get('size_group'),
                is_grain_free=item.get('is_grain_free', False),
                is_hypoallergenic=item.get('is_hypoallergenic', False),
                is_veterinary=item.get('is_veterinary', False),
                health_conditions=health_conditions,
                country=item.get('country', ''),
                category_details=category_details,
                allergens=allergens,
                status=1,
                # Legacy поля для совместимости
                animal=item.get('animal_type', 'dog') if item.get('animal_type') in ['dog', 'cat'] else 'dog',
                category='food' if item.get('product_group') == 'food' else 'toys',
                in_stock=item.get('is_available', True),
                vendor=brand.name if brand else None,
            )
            products.append(product)
            existing_external_ids.add(external_id)
            
            # Прогресс
            if len(products) % 1000 == 0:
                self.stdout.write(f'  Обработано: {len(products)}...')
        
        # Bulk create
        self.stdout.write(f'  Сохранение {len(products)} товаров...')
        with transaction.atomic():
            Product.objects.bulk_create(products, batch_size=self.batch_size)
        
        self.stdout.write(self.style.SUCCESS(
            f'  Загружено товаров: {len(products)} (пропущено дубликатов: {skipped})'
        ))
    
    def load_skus(self):
        """Загрузка SKU."""
        self.stdout.write('Загрузка SKU...')
        data = self.load_json('product_skus.json')
        
        if not data:
            return
        
        # Маппинг products по external_id
        products_map = {
            p.external_id: p 
            for p in Product.objects.all().only('id', 'external_id')
        }
        
        skus = []
        skipped = 0
        
        for item in data:
            product_external_id = str(item['product_external_id'])
            product = products_map.get(product_external_id)
            
            if not product:
                skipped += 1
                continue
            
            # Парсим features
            features = item.get('features', {}) or {}
            
            # Извлекаем вес
            weight_kg = None
            weight_display = features.get('weight', '')
            if weight_display:
                weight_match = re.search(r'([\d.,]+)\s*(кг|г|kg|g)', weight_display.lower())
                if weight_match:
                    value = float(weight_match.group(1).replace(',', '.'))
                    unit = weight_match.group(2)
                    if unit in ['г', 'g']:
                        weight_kg = Decimal(str(value / 1000))
                    else:
                        weight_kg = Decimal(str(value))
            
            sku = ProductSKU(
                product=product,
                external_id=item.get('external_sku_id'),
                sku=str(item.get('sku', item['id']))[:100],
                name=item.get('name', '')[:255],
                price=Decimal(str(item.get('price', 0))),
                compare_price=Decimal(str(item['compare_price'])) if item.get('compare_price') else None,
                available=bool(item.get('available', True)),
                stock_quantity=item.get('count'),
                weight_kg=weight_kg,
                weight_display=weight_display[:20] if weight_display else '',
                features=features,
                sort_order=1,
                is_default=True,  # Первый SKU - по умолчанию
                status=1
            )
            skus.append(sku)
            
            # Прогресс
            if len(skus) % 1000 == 0:
                self.stdout.write(f'  Обработано: {len(skus)}...')
        
        # Bulk create
        self.stdout.write(f'  Сохранение {len(skus)} SKU...')
        with transaction.atomic():
            ProductSKU.objects.bulk_create(skus, batch_size=self.batch_size, ignore_conflicts=True)
        
        self.stdout.write(self.style.SUCCESS(
            f'  Загружено SKU: {len(skus)} (пропущено без товара: {skipped})'
        ))
    
    def update_counters(self):
        """Обновление денормализованных счётчиков."""
        self.stdout.write('Обновление счётчиков...')
        
        from django.db.models import Count
        
        # Обновляем product_count в Brand
        for brand in Brand.objects.annotate(cnt=Count('products')):
            if brand.product_count != brand.cnt:
                brand.product_count = brand.cnt
                brand.save(update_fields=['product_count'])
        
        # Обновляем product_count в Category
        for category in Category.objects.annotate(cnt=Count('products')):
            if category.product_count != category.cnt:
                category.product_count = category.cnt
                category.save(update_fields=['product_count'])
        
        # Обновляем sku_count в Product
        from django.db.models import Count
        for product in Product.objects.annotate(cnt=Count('skus')):
            if product.sku_count != product.cnt:
                product.sku_count = product.cnt
                product.save(update_fields=['sku_count'])
        
        self.stdout.write(self.style.SUCCESS('  Счётчики обновлены'))
