"""
Команда для импорта товаров из catalog_filtered.json с правильной группировкой.

Ключевые отличия от import_catalog:
1. Группирует товары по базовому названию + бренд + категория
2. Создаёт один Product на группу
3. Создаёт ProductSKU для каждой вариации (вес, объём)

Использование:
    python manage.py import_catalog_v2 path/to/catalog_filtered.json
    python manage.py import_catalog_v2 path/to/catalog_filtered.json --clear
    python manage.py import_catalog_v2 path/to/catalog_filtered.json --dry-run
"""

import json
import re
from collections import defaultdict
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from apps.shop.models import Product, ProductSKU


class Command(BaseCommand):
    help = 'Импорт товаров из catalog_filtered.json с группировкой вариаций'

    # Паттерны для извлечения веса/объёма
    WEIGHT_PATTERNS = [
        (r'\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:кг|kg)\b', 'kg', 1.0),
        (r'\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)\b', 'g', 0.001),
        (r'\s+(\d+(?:[.,]\d+)?)\s*(?:кг|kg)\s*$', 'kg', 1.0),
        (r'\s+(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)\s*$', 'g', 0.001),
        (r'\s*[xх]\s*(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)\b', 'g', 0.001),
        (r'\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:мл|ml)\b', 'ml', 0.001),
        (r'\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:л|l)\b', 'l', 1.0),
    ]

    WEIGHT_REMOVAL_PATTERNS = [
        r'\s*[-–—]\s*\d+(?:[.,]\d+)?\s*(?:кг|kg|г|гр|g|мл|ml|л|l|шт|штук|pcs)\s*$',
        r'\s+\d+(?:[.,]\d+)?\s*(?:кг|kg|г|гр|g|мл|ml|л|l)\s*$',
        r'\s*[xх]\s*\d+(?:[.,]\d+)?\s*(?:г|гр|g)\s*$',
    ]

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Путь к JSON файлу каталога')
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Удалить все существующие товары перед импортом'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Только анализ без импорта'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=500,
            help='Размер пакета для bulk операций'
        )

    def extract_base_name(self, name: str) -> str:
        """Извлекает базовое название без веса."""
        base_name = name.strip()
        for pattern in self.WEIGHT_REMOVAL_PATTERNS:
            base_name = re.sub(pattern, '', base_name, flags=re.IGNORECASE)
        base_name = re.sub(r'\s*[-–—]\s*$', '', base_name)
        base_name = re.sub(r'\s+', ' ', base_name).strip()
        return base_name

    def extract_weight_info(self, name: str, weight_field=None) -> dict:
        """Извлекает информацию о весе."""
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
                    'weight_kg': Decimal(str(round(value_kg, 4))),
                    'weight_display': display,
                }
        
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
        json_file = options['json_file']
        clear_data = options['clear']
        dry_run = options['dry_run']
        batch_size = options['batch_size']
        
        self.stdout.write(f'Загрузка каталога из {json_file}...')
        
        # Читаем JSON
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except FileNotFoundError:
            self.stderr.write(self.style.ERROR(f'Файл не найден: {json_file}'))
            return
        except json.JSONDecodeError as e:
            self.stderr.write(self.style.ERROR(f'Ошибка парсинга JSON: {e}'))
            return
        
        products_data = data.get('products', [])
        
        if not products_data:
            self.stderr.write(self.style.ERROR('В файле нет товаров'))
            return
        
        self.stdout.write(f'Найдено записей в файле: {len(products_data)}')
        
        # Фильтруем товары с нулевой ценой
        valid_products = [
            p for p in products_data 
            if p.get('price') and p.get('price') > 0
        ]
        self.stdout.write(f'С ненулевой ценой: {len(valid_products)}')
        
        # Группируем товары
        self.stdout.write('Группировка товаров...')
        groups = defaultdict(list)
        
        for item in valid_products:
            base_name = self.extract_base_name(item.get('name', ''))
            weight_info = self.extract_weight_info(
                item.get('name', ''),
                item.get('weight')
            )
            
            item['_base_name'] = base_name
            item['_weight_info'] = weight_info
            
            group_key = (
                base_name.lower(),
                (item.get('vendor') or '').lower(),
                item.get('animal', 'dog'),
                item.get('category', 'food'),
            )
            
            groups[group_key].append(item)
        
        total_groups = len(groups)
        multi_groups = sum(1 for v in groups.values() if len(v) > 1)
        
        self.stdout.write(f'Уникальных товаров: {total_groups}')
        self.stdout.write(f'С вариациями: {multi_groups}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n=== СУХОЙ ЗАПУСК ==='))
            self._preview_groups(groups)
            return
        
        # Импорт
        with transaction.atomic():
            # Очистка
            if clear_data:
                self.stdout.write('Удаление существующих данных...')
                ProductSKU.objects.all().delete()
                Product.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('Данные удалены'))
            
            stats = {
                'products_created': 0,
                'products_updated': 0,
                'skus_created': 0,
                'errors': 0,
            }
            
            # Получаем существующие external_id
            existing_products = dict(
                Product.objects.values_list('external_id', 'id')
            )
            
            processed = 0
            
            for group_key, group_items in groups.items():
                try:
                    self._process_group(group_key, group_items, existing_products, stats)
                    processed += 1
                    
                    if processed % 500 == 0:
                        self.stdout.write(f'  Обработано групп: {processed}/{total_groups}')
                        
                except Exception as e:
                    stats['errors'] += 1
                    if stats['errors'] <= 10:
                        self.stderr.write(f'Ошибка: {e}')
        
        # Итоги
        self.stdout.write(self.style.SUCCESS(f'\n=== ИМПОРТ ЗАВЕРШЁН ==='))
        self.stdout.write(f'Создано товаров: {stats["products_created"]}')
        self.stdout.write(f'Обновлено товаров: {stats["products_updated"]}')
        self.stdout.write(f'Создано SKU: {stats["skus_created"]}')
        self.stdout.write(f'Ошибок: {stats["errors"]}')
        self.stdout.write(f'Всего товаров в БД: {Product.objects.count()}')
        self.stdout.write(f'Всего SKU в БД: {ProductSKU.objects.count()}')

    def _preview_groups(self, groups: dict):
        """Предпросмотр групп для dry-run."""
        multi = [(k, v) for k, v in groups.items() if len(v) > 1]
        multi.sort(key=lambda x: -len(x[1]))
        
        self.stdout.write(f'\nТоп-10 групп с вариациями:\n')
        
        for i, (key, items) in enumerate(multi[:10], 1):
            base_name, vendor, animal, category = key
            self.stdout.write(f'{i}. {base_name[:60]}...')
            self.stdout.write(f'   Бренд: {vendor}, {animal}/{category}, вариаций: {len(items)}')
            
            for item in items[:3]:
                weight = item['_weight_info']['weight_display'] if item['_weight_info'] else 'N/A'
                self.stdout.write(f'     - {weight}: {item["price"]}₽')
            
            if len(items) > 3:
                self.stdout.write(f'     ... и ещё {len(items) - 3}')
            self.stdout.write('')

    def _process_group(self, group_key: tuple, items: list, existing: dict, stats: dict):
        """Обрабатывает группу товаров."""
        base_name, vendor, animal, category = group_key
        
        # Сортируем: в наличии → с большим stock → с большей ценой
        sorted_items = sorted(
            items,
            key=lambda p: (
                1 if p.get('available') else 0,
                p.get('count', 0) or 0,
                p.get('price', 0) or 0,
            ),
            reverse=True
        )
        
        main_item = sorted_items[0]
        
        # Проверяем, существует ли уже такой товар
        external_id = str(main_item.get('id', ''))
        
        if external_id in existing:
            # Обновляем существующий
            product = Product.objects.get(id=existing[external_id])
            stats['products_updated'] += 1
        else:
            # Создаём новый
            product = Product(
                external_id=external_id,
            )
            stats['products_created'] += 1
        
        # Заполняем поля
        product.name = base_name[:500]
        product.slug = slugify(base_name, allow_unicode=True)[:500] or external_id
        product.group_id = main_item.get('group_id')
        product.description = self._get_best_description(items)
        product.vendor = main_item.get('vendor')
        product.vendor_code = main_item.get('vendorCode')
        product.barcode = main_item.get('barcode')
        product.url = main_item.get('url')
        
        # Цены (минимальная из группы)
        prices = [float(p.get('price', 0)) for p in items if p.get('price')]
        if prices:
            product.price = Decimal(str(min(prices)))
            if len(prices) > 1 and max(prices) > min(prices):
                product.compare_price = Decimal(str(max(prices)))
        
        # Изображения (объединяем уникальные)
        all_images = []
        for item in items:
            pics = item.get('pictures', [])
            if pics:
                all_images.extend(pics)
        product.images = list(dict.fromkeys(all_images))[:10]
        product.image_url = product.images[0] if product.images else None
        
        # Категория
        product.animal = main_item.get('animal', 'dog')
        product.animal_type = main_item.get('animal', 'dog')
        product.category = main_item.get('category', 'food')
        product.subcategory = main_item.get('subcategory')
        product.category_name = main_item.get('category_name')
        
        # Наличие
        product.in_stock = any(p.get('available') for p in items)
        product.is_available = product.in_stock
        product.stock_count = sum(p.get('count', 0) or 0 for p in items)
        product.sku_count = len(items)
        
        # Параметры
        product.params = main_item.get('params', {})
        
        product.save()
        
        # Создаём SKU для каждой вариации
        skus_to_create = []
        
        for i, item in enumerate(sorted_items):
            weight_info = item['_weight_info']
            
            sku = ProductSKU(
                product=product,
                external_id=int(item['id']) if str(item.get('id', '')).isdigit() else None,
                sku=item.get('vendorCode') or str(item.get('id', '')),
                name=weight_info['weight_display'] if weight_info else item.get('name', '')[-50:],
                price=Decimal(str(item.get('price', 0))),
                available=bool(item.get('available')),
                stock_quantity=item.get('count'),
                weight_kg=weight_info['weight_kg'] if weight_info else (
                    Decimal(str(item['weight'])) if item.get('weight') else None
                ),
                weight_display=weight_info['weight_display'] if weight_info else '',
                is_default=(i == 0),
                sort_order=i + 1,
                features={
                    'barcode': item.get('barcode'),
                    'original_name': item.get('name'),
                },
                status=1,
            )
            skus_to_create.append(sku)
        
        ProductSKU.objects.bulk_create(skus_to_create, ignore_conflicts=True)
        stats['skus_created'] += len(skus_to_create)

    def _get_best_description(self, items: list) -> str:
        """Выбирает лучшее описание из группы."""
        descriptions = [
            p.get('description', '') or '' 
            for p in items 
            if p.get('description')
        ]
        if descriptions:
            return max(descriptions, key=len)
        return ''
