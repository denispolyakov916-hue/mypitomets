"""
Команда для консолидации товаров: объединение вариаций в Product + SKU.

Логика:
1. Группирует товары по базовому названию + бренд + категория
2. Для каждой группы создаёт один Product (основной товар)
3. Каждую вариацию преобразует в ProductSKU

Использование:
    python manage.py consolidate_products --dry-run    # Только анализ
    python manage.py consolidate_products              # Выполнить консолидацию
    python manage.py consolidate_products --rollback   # Откат (удаляет SKU, восстанавливает Product)
"""

import re
from collections import defaultdict
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Min, Max, Count
from apps.shop.models import Product, ProductSKU


class Command(BaseCommand):
    help = 'Консолидация вариаций товаров в Product + SKU структуру'

    # Паттерны для извлечения веса/объёма из названия
    WEIGHT_PATTERNS = [
        # "15 кг", "15кг"
        (r'\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:кг|kg)\b', 'kg', 1.0),
        # "400 г", "400г"
        (r'\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)\b', 'g', 0.001),
        # "1,5 кг" в конце
        (r'\s+(\d+(?:[.,]\d+)?)\s*(?:кг|kg)\s*$', 'kg', 1.0),
        # "400 г" в конце
        (r'\s+(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)\s*$', 'g', 0.001),
        # "x 85г" (для паучей)
        (r'\s*[xх]\s*(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)\b', 'g', 0.001),
        # "100мл"
        (r'\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:мл|ml)\b', 'ml', 0.001),
        # "1 л"
        (r'\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:л|l)\b', 'l', 1.0),
    ]

    # Паттерн для удаления веса из названия
    WEIGHT_REMOVAL_PATTERNS = [
        r'\s*[-–—]\s*\d+(?:[.,]\d+)?\s*(?:кг|kg|г|гр|g|мл|ml|л|l|шт|штук|pcs)\s*$',
        r'\s+\d+(?:[.,]\d+)?\s*(?:кг|kg|г|гр|g|мл|ml|л|l)\s*$',
        r'\s*[xх]\s*\d+(?:[.,]\d+)?\s*(?:г|гр|g)\s*$',
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Только анализ без изменений в БД'
        )
        parser.add_argument(
            '--rollback',
            action='store_true',
            help='Откат: удалить SKU и восстановить оригинальные Product'
        )
        parser.add_argument(
            '--min-group-size',
            type=int,
            default=2,
            help='Минимальный размер группы для консолидации (по умолчанию 2)'
        )
        parser.add_argument(
            '--category',
            type=str,
            help='Консолидировать только указанную категорию (food, pharmacy, etc.)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Размер пакета для обработки'
        )

    def extract_base_name(self, name: str) -> str:
        """Извлекает базовое название товара без веса/объёма."""
        base_name = name.strip()
        
        for pattern in self.WEIGHT_REMOVAL_PATTERNS:
            base_name = re.sub(pattern, '', base_name, flags=re.IGNORECASE)
        
        base_name = re.sub(r'\s*[-–—]\s*$', '', base_name)
        base_name = re.sub(r'\s+', ' ', base_name).strip()
        
        return base_name

    def extract_weight_info(self, name: str, weight_field=None) -> dict:
        """Извлекает информацию о весе из названия или поля."""
        for pattern, unit, multiplier in self.WEIGHT_PATTERNS:
            match = re.search(pattern, name, re.IGNORECASE)
            if match:
                value_str = match.group(1).replace(',', '.')
                value = float(value_str)
                value_kg = value * multiplier
                
                if unit == 'kg':
                    display = f"{value_str} кг"
                elif unit == 'g':
                    display = f"{int(value) if value == int(value) else value_str} г"
                elif unit == 'ml':
                    display = f"{int(value)} мл"
                elif unit == 'l':
                    display = f"{value_str} л"
                else:
                    display = f"{value_str}"
                
                return {
                    'weight_kg': Decimal(str(value_kg)),
                    'weight_display': display,
                }
        
        # Fallback на поле weight
        if weight_field:
            weight_float = float(weight_field)
            if weight_float >= 1:
                display = f"{weight_float} кг"
            else:
                display = f"{int(weight_float * 1000)} г"
            return {
                'weight_kg': Decimal(str(weight_float)),
                'weight_display': display,
            }
        
        return None

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        rollback = options['rollback']
        min_group_size = options['min_group_size']
        category_filter = options['category']
        batch_size = options['batch_size']
        
        self.stdout.write(self.style.WARNING(
            'Команда устарела для новой структуры магазина. '
            'Используйте нормализованные ProductSKU и ProductImage.'
        ))
        return

        if rollback:
            self.handle_rollback()
            return
        
        self.stdout.write('Консолидация товаров...\n')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('=== РЕЖИМ СУХОГО ЗАПУСКА (без изменений в БД) ===\n'))
        
        # Получаем товары
        products_qs = Product.objects.all()
        if category_filter:
            products_qs = products_qs.filter(category=category_filter)
        
        products = list(products_qs.values(
            'id', 'external_id', 'group_id', 'name', 'vendor', 'vendor_code',
            'barcode', 'price', 'compare_price', 'weight', 'animal', 'category', 
            'subcategory', 'category_name', 'description', 'image_url', 'images',
            'in_stock', 'stock_count', 'params', 'url', 'animal_type', 'product_group',
            'new_category_id', 'brand_id', 'age_group', 'size_group',
            'is_grain_free', 'is_hypoallergenic', 'is_veterinary', 'health_conditions',
            'allergens', 'country', 'rating', 'rating_count'
        ))
        
        total_products = len(products)
        self.stdout.write(f'Всего товаров для анализа: {total_products}\n')
        
        # Группируем
        groups = defaultdict(list)
        
        for product in products:
            base_name = self.extract_base_name(product['name'])
            weight_info = self.extract_weight_info(
                product['name'],
                product['weight']
            )
            
            product['_base_name'] = base_name
            product['_weight_info'] = weight_info
            
            group_key = (
                base_name.lower(),
                (product['vendor'] or '').lower(),
                product['animal'],
                product['category'],
            )
            
            groups[group_key].append(product)
        
        # Фильтруем группы с вариациями
        multi_groups = {k: v for k, v in groups.items() if len(v) >= min_group_size}
        
        if not multi_groups:
            self.stdout.write(self.style.WARNING('Не найдено групп для консолидации'))
            return
        
        self.stdout.write(f'Групп с вариациями: {len(multi_groups)}')
        self.stdout.write(f'Товаров в этих группах: {sum(len(v) for v in multi_groups.values())}\n')
        
        # Статистика
        stats = {
            'groups_processed': 0,
            'products_consolidated': 0,
            'skus_created': 0,
            'products_kept': 0,
            'products_deleted': 0,
            'errors': 0,
        }
        
        if not dry_run:
            self.stdout.write('Начало консолидации...\n')
        
        # Обрабатываем группы
        for group_key, group_products in multi_groups.items():
            base_name, vendor, animal, category = group_key
            
            try:
                if dry_run:
                    self._preview_group(group_products, stats)
                else:
                    self._consolidate_group(group_products, stats)
                
                stats['groups_processed'] += 1
                
                if stats['groups_processed'] % 100 == 0:
                    self.stdout.write(f'  Обработано групп: {stats["groups_processed"]}')
                    
            except Exception as e:
                stats['errors'] += 1
                self.stderr.write(f'Ошибка в группе "{base_name[:50]}...": {e}')
        
        # Итоги
        self.stdout.write(self.style.SUCCESS(f'\n=== РЕЗУЛЬТАТЫ ==='))
        self.stdout.write(f'Обработано групп: {stats["groups_processed"]}')
        self.stdout.write(f'Товаров консолидировано: {stats["products_consolidated"]}')
        self.stdout.write(f'Создано SKU: {stats["skus_created"]}')
        self.stdout.write(f'Товаров сохранено как основные: {stats["products_kept"]}')
        self.stdout.write(f'Товаров удалено (преобразованы в SKU): {stats["products_deleted"]}')
        self.stdout.write(f'Ошибок: {stats["errors"]}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nЭто был сухой запуск. Для применения изменений запустите без --dry-run'))

    def _preview_group(self, group_products: list, stats: dict):
        """Предварительный просмотр группы (для dry-run)."""
        stats['products_consolidated'] += len(group_products)
        stats['skus_created'] += len(group_products)
        stats['products_kept'] += 1
        stats['products_deleted'] += len(group_products) - 1

    @transaction.atomic
    def _consolidate_group(self, group_products: list, stats: dict):
        """
        Консолидирует группу товаров в один Product + несколько SKU.
        
        Логика выбора основного товара:
        1. Товар с наибольшим stock_count
        2. При равенстве - товар в наличии (in_stock=True)
        3. При равенстве - товар с наибольшей ценой
        """
        # Сортируем для выбора основного товара
        sorted_products = sorted(
            group_products,
            key=lambda p: (
                p['stock_count'] or 0,
                1 if p['in_stock'] else 0,
                float(p['price'] or 0),
            ),
            reverse=True
        )
        
        main_product_data = sorted_products[0]
        other_products = sorted_products[1:]
        
        # Получаем основной Product
        main_product = Product.objects.get(id=main_product_data['id'])
        
        # Обновляем название на базовое (без веса)
        base_name = main_product_data['_base_name']
        main_product.name = base_name
        
        # Обновляем slug
        from django.utils.text import slugify
        main_product.slug = slugify(base_name, allow_unicode=True)[:500]
        
        # Устанавливаем ценовой диапазон (минимальная цена группы)
        prices = [float(p['price'] or 0) for p in group_products if p['price']]
        if prices:
            main_product.price = Decimal(str(min(prices)))
            if max(prices) > min(prices):
                main_product.compare_price = Decimal(str(max(prices)))
        
        # Объединяем изображения
        all_images = []
        for p in group_products:
            if p['images']:
                all_images.extend(p['images'])
        if all_images:
            main_product.images = list(dict.fromkeys(all_images))[:10]  # Уникальные, макс 10
        
        # Обновляем sku_count
        main_product.sku_count = len(group_products)
        
        # Объединяем описания (берём самое длинное)
        descriptions = [p['description'] for p in group_products if p['description']]
        if descriptions:
            main_product.description = max(descriptions, key=len)
        
        # Сохраняем основной товар
        main_product.save()
        stats['products_kept'] += 1
        
        # Создаём SKU для всех товаров в группе
        skus_to_create = []
        
        for i, product_data in enumerate(sorted_products):
            weight_info = product_data['_weight_info']
            
            sku = ProductSKU(
                product=main_product,
                external_id=int(product_data['external_id']) if product_data['external_id'].isdigit() else None,
                sku=product_data['vendor_code'] or product_data['external_id'] or str(product_data['id']),
                name=weight_info['weight_display'] if weight_info else product_data['name'][-30:],
                price=Decimal(str(product_data['price'] or 0)),
                compare_price=Decimal(str(product_data['compare_price'])) if product_data['compare_price'] else None,
                available=bool(product_data['in_stock']),
                stock_quantity=product_data['stock_count'],
                weight_kg=weight_info['weight_kg'] if weight_info else (
                    Decimal(str(product_data['weight'])) if product_data['weight'] else None
                ),
                weight_display=weight_info['weight_display'] if weight_info else '',
                is_default=(i == 0),  # Первый товар = default
                sort_order=i + 1,
                features={
                    'original_product_id': product_data['id'],
                    'original_name': product_data['name'],
                    'barcode': product_data['barcode'],
                },
                status=1,
            )
            skus_to_create.append(sku)
        
        # Bulk create SKU
        ProductSKU.objects.bulk_create(skus_to_create, ignore_conflicts=True)
        stats['skus_created'] += len(skus_to_create)
        
        # Удаляем дублирующиеся Product (кроме основного)
        if other_products:
            other_ids = [p['id'] for p in other_products]
            Product.objects.filter(id__in=other_ids).delete()
            stats['products_deleted'] += len(other_ids)
        
        stats['products_consolidated'] += len(group_products)

    def handle_rollback(self):
        """Откат консолидации (для отладки)."""
        self.stdout.write(self.style.WARNING('Откат консолидации...\n'))
        
        # Получаем все SKU с оригинальными данными
        skus = ProductSKU.objects.filter(
            features__has_key='original_product_id'
        ).select_related('product')
        
        if not skus.exists():
            self.stdout.write('Нет данных для отката')
            return
        
        self.stdout.write(f'Найдено SKU с данными для отката: {skus.count()}')
        
        # Здесь должна быть логика восстановления, но это сложно
        # Рекомендуется использовать backup БД перед консолидацией
        
        self.stdout.write(self.style.ERROR(
            'Автоматический откат не реализован. '
            'Рекомендуется восстановить БД из backup.'
        ))
