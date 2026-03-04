"""
Команда для импорта SKU (вариаций товаров) из JSON файла.

Использование:
    python manage.py import_skus --file path/to/product_skus.json
    python manage.py import_skus  # Использует дефолтный путь
"""

import json
import re
from decimal import Decimal
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.shop.models import Product, ProductSKU


class Command(BaseCommand):
    help = 'Импорт SKU (вариаций товаров) из JSON файла'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default=None,
            help='Путь к JSON файлу с SKU данными'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=500,
            help='Размер пакета для bulk операций'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Очистить таблицу SKU перед импортом'
        )

    def handle(self, *args, **options):
        # Определяем путь к файлу
        if options['file']:
            json_path = Path(options['file'])
        else:
            # Дефолтный путь
            base_dir = Path(__file__).resolve().parent.parent.parent.parent.parent.parent
            json_path = base_dir / 'docs' / '04 Магазин' / 'Data' / 'data_new' / 'products_db' / 'product_skus.json'
        
        if not json_path.exists():
            self.stderr.write(self.style.ERROR(f'Файл не найден: {json_path}'))
            return

        self.stdout.write(f'Загрузка SKU из: {json_path}')

        # Загружаем данные
        with open(json_path, 'r', encoding='utf-8') as f:
            skus_data = json.load(f)

        self.stdout.write(f'Найдено SKU записей: {len(skus_data)}')

        # Очистка при необходимости
        if options['clear']:
            deleted_count = ProductSKU.objects.all().delete()[0]
            self.stdout.write(self.style.WARNING(f'Удалено {deleted_count} SKU записей'))

        # Получаем маппинг external_id -> product_id
        products_map = dict(
            Product.objects.filter(
                external_id__in=[str(s['product_external_id']) for s in skus_data]
            ).values_list('external_id', 'id')
        )
        self.stdout.write(f'Найдено товаров в БД: {len(products_map)}')

        # Получаем существующие SKU для обновления
        existing_skus = set(
            ProductSKU.objects.values_list('external_id', flat=True)
        )

        # Подготовка данных
        skus_to_create = []
        skus_to_update = []
        stats = {
            'created': 0,
            'updated': 0,
            'skipped_no_product': 0,
            'errors': 0
        }

        for sku_data in skus_data:
            try:
                external_id = sku_data.get('external_sku_id')
                product_external_id = str(sku_data.get('product_external_id'))
                
                # Находим товар
                product_id = products_map.get(product_external_id)
                if not product_id:
                    stats['skipped_no_product'] += 1
                    continue
                
                # Парсим вес из features
                features = sku_data.get('features', {})
                weight_str = features.get('weight', '')
                weight_kg = self._parse_weight(weight_str)
                weight_display = weight_str if weight_str else ''  # Пустая строка вместо None
                
                # Формируем название SKU
                sku_name = sku_data.get('name') or weight_display or ''
                
                sku_obj = ProductSKU(
                    product_id=product_id,
                    external_id=external_id,
                    sku=sku_data.get('sku', str(external_id)),
                    name=sku_name,
                    price=Decimal(str(sku_data.get('price', 0))),
                    compare_price=Decimal(str(sku_data.get('compare_price', 0))) if sku_data.get('compare_price') else None,
                    available=bool(sku_data.get('available', 1)),
                    stock_quantity=sku_data.get('count'),
                    weight_kg=weight_kg,
                    weight_display=weight_display,
                    features=features,
                    status=1
                )
                
                if external_id in existing_skus:
                    skus_to_update.append(sku_obj)
                else:
                    skus_to_create.append(sku_obj)
                    
            except Exception as e:
                stats['errors'] += 1
                if stats['errors'] <= 5:
                    self.stderr.write(f'Ошибка обработки SKU {sku_data.get("id")}: {e}')

        # Bulk create
        batch_size = options['batch_size']
        
        if skus_to_create:
            self.stdout.write(f'Создание {len(skus_to_create)} новых SKU...')
            for i in range(0, len(skus_to_create), batch_size):
                batch = skus_to_create[i:i + batch_size]
                ProductSKU.objects.bulk_create(batch, ignore_conflicts=True)
                stats['created'] += len(batch)
                self.stdout.write(f'  Создано: {stats["created"]}')

        # Bulk update
        if skus_to_update:
            self.stdout.write(f'Обновление {len(skus_to_update)} существующих SKU...')
            for i in range(0, len(skus_to_update), batch_size):
                batch = skus_to_update[i:i + batch_size]
                ProductSKU.objects.bulk_update(
                    batch,
                    ['name', 'price', 'compare_price', 'available', 'stock_quantity',
                     'weight_kg', 'weight_display', 'features', 'status'],
                    batch_size=batch_size
                )
                stats['updated'] += len(batch)
                self.stdout.write(f'  Обновлено: {stats["updated"]}')

        # Обновляем sku_count на товарах
        self._update_sku_counts()

        # Результаты
        self.stdout.write(self.style.SUCCESS(
            f'\nИмпорт завершён:\n'
            f'  Создано: {stats["created"]}\n'
            f'  Обновлено: {stats["updated"]}\n'
            f'  Пропущено (нет товара): {stats["skipped_no_product"]}\n'
            f'  Ошибок: {stats["errors"]}'
        ))

    def _parse_weight(self, weight_str: str) -> Decimal | None:
        """Парсит строку веса в килограммы."""
        if not weight_str:
            return None
        
        # Нормализуем строку
        weight_str = weight_str.lower().strip()
        
        # Паттерны для парсинга
        patterns = [
            # "1.5 кг", "1,5 кг", "1.5кг"
            (r'([\d.,]+)\s*кг', 1.0),
            # "500 г", "500г"
            (r'([\d.,]+)\s*г(?:р)?', 0.001),
            # "1.5 kg"
            (r'([\d.,]+)\s*kg', 1.0),
            # "500 g"
            (r'([\d.,]+)\s*g', 0.001),
        ]
        
        for pattern, multiplier in patterns:
            match = re.search(pattern, weight_str)
            if match:
                try:
                    value = match.group(1).replace(',', '.')
                    return Decimal(value) * Decimal(str(multiplier))
                except:
                    continue
        
        return None

    def _update_sku_counts(self):
        """Обновляет sku_count для товаров."""
        self.stdout.write('Обновление счётчиков SKU на товарах...')
        
        from django.db.models import Count
        
        # Подсчитываем SKU для каждого товара
        sku_counts = dict(
            ProductSKU.objects.filter(status=1, available=True)
            .values('product_id')
            .annotate(count=Count('id'))
            .values_list('product_id', 'count')
        )
        
        # Обновляем товары пакетами
        products = Product.objects.filter(id__in=sku_counts.keys())
        for product in products:
            product.sku_count = sku_counts.get(product.id, 1)
        
        Product.objects.bulk_update(products, ['sku_count'], batch_size=500)
        self.stdout.write(f'  Обновлено товаров: {len(sku_counts)}')
