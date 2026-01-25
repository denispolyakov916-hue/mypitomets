"""
Команда для импорта товаров из catalog_filtered.json

Использование:
    python manage.py import_catalog path/to/catalog_filtered.json
    python manage.py import_catalog path/to/catalog_filtered.json --clear
"""

import json
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.shop.models import Product
from apps.training.models import Course, UserCourse


class Command(BaseCommand):
    help = 'Импорт товаров из catalog_filtered.json'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Путь к JSON файлу каталога')
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Удалить все существующие товары и курсы перед импортом'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Размер пакета для bulk_create (по умолчанию 1000)'
        )

    def handle(self, *args, **options):
        json_file = options['json_file']
        clear_data = options['clear']
        batch_size = options['batch_size']
        
        self.stdout.write(f'Загрузка каталога из {json_file}...')
        
        # Читаем JSON файл
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
        
        self.stdout.write(f'Найдено товаров в файле: {len(products_data)}')
        
        # Статистика
        stats = data.get('statistics', {})
        if stats:
            self.stdout.write(f'Статистика из файла:')
            self.stdout.write(f'  Всего товаров: {stats.get("total_products", "N/A")}')
            by_cat = stats.get('by_category', {})
            for cat, count in by_cat.items():
                self.stdout.write(f'  {cat}: {count}')
        
        with transaction.atomic():
            # Очистка данных если указан флаг --clear
            if clear_data:
                self.stdout.write('Удаление существующих данных...')
                
                # Удаляем курсы
                UserCourse.objects.all().delete()
                Course.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('Курсы удалены'))
                
                # Удаляем товары
                Product.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('Товары удалены'))
            
            # Подготовка товаров для bulk_create
            products_to_create = []
            existing_ids = set(Product.objects.values_list('external_id', flat=True))
            skipped = 0
            
            for item in products_data:
                external_id = str(item.get('id', ''))
                
                if not external_id:
                    skipped += 1
                    continue
                
                # Пропускаем если уже существует (при обновлении без --clear)
                if external_id in existing_ids:
                    skipped += 1
                    continue
                
                # Пропускаем товары с нулевой ценой
                price = item.get('price', 0)
                if price is None or price <= 0:
                    skipped += 1
                    continue
                
                # Безопасная обработка stock_count
                stock_count = item.get('count', 0)
                if stock_count is None or stock_count < 0:
                    stock_count = 0
                
                product = Product(
                    external_id=external_id,
                    group_id=item.get('group_id'),
                    name=item.get('name', '')[:500],
                    description=item.get('description') or '',
                    price=price,
                    vendor=item.get('vendor'),
                    vendor_code=item.get('vendorCode'),
                    barcode=item.get('barcode'),
                    weight=item.get('weight'),
                    url=item.get('url'),
                    images=item.get('pictures', []),
                    animal=item.get('animal', 'dog'),
                    category=item.get('category', 'food'),
                    subcategory=item.get('subcategory'),
                    category_name=item.get('category_name'),
                    in_stock=item.get('available', False),
                    stock_count=stock_count,
                    params=item.get('params', {}),
                )
                products_to_create.append(product)
            
            # Bulk create пакетами
            total_created = 0
            for i in range(0, len(products_to_create), batch_size):
                batch = products_to_create[i:i + batch_size]
                Product.objects.bulk_create(batch, ignore_conflicts=True)
                total_created += len(batch)
                self.stdout.write(f'  Создано: {total_created}/{len(products_to_create)}')
        
        # Итоговая статистика
        final_count = Product.objects.count()
        self.stdout.write(self.style.SUCCESS(f'\nИмпорт завершён!'))
        self.stdout.write(f'  Создано товаров: {total_created}')
        self.stdout.write(f'  Пропущено: {skipped}')
        self.stdout.write(f'  Всего в базе: {final_count}')
        
        # Статистика по категориям
        self.stdout.write('\nСтатистика по категориям:')
        from django.db.models import Count
        
        animal_stats = Product.objects.values('animal').annotate(count=Count('id'))
        for stat in animal_stats:
            self.stdout.write(f'  {stat["animal"]}: {stat["count"]}')
        
        category_stats = Product.objects.values('category').annotate(count=Count('id'))
        for stat in category_stats:
            self.stdout.write(f'  {stat["category"]}: {stat["count"]}')

