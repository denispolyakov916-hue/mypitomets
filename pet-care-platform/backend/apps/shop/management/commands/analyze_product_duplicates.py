"""
Команда для анализа дубликатов товаров в базе данных.

Использование:
    python manage.py analyze_product_duplicates
    python manage.py analyze_product_duplicates --detailed
    python manage.py analyze_product_duplicates --export duplicates.json
"""

import re
import json
from collections import defaultdict
from django.core.management.base import BaseCommand
from django.db.models import Count
from apps.shop.models import Product, ProductSKU


class Command(BaseCommand):
    help = 'Анализ дубликатов товаров и потенциальных групп вариаций'

    # Паттерны для извлечения веса/объёма из названия
    WEIGHT_PATTERNS = [
        # "15 кг", "15кг", "15 Кг"
        r'\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:кг|kg)\b',
        # "400 г", "400г", "400 гр"
        r'\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)\b',
        # "1,5 кг" в конце
        r'\s+(\d+(?:[.,]\d+)?)\s*(?:кг|kg)\s*$',
        # "400 г" в конце
        r'\s+(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)\s*$',
        # "x 85г", "x85г" (для паучей)
        r'\s*[xх]\s*(\d+(?:[.,]\d+)?)\s*(?:г|гр|g)\b',
        # "100мл", "250 мл"
        r'\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:мл|ml)\b',
        # "1 л", "1л"
        r'\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:л|l)\b',
        # Количество штук "24 шт", "12шт"
        r'\s*[-–—]\s*(\d+)\s*(?:шт|штук|pcs)\b',
    ]

    # Паттерн для удаления веса из названия
    WEIGHT_REMOVAL_PATTERNS = [
        r'\s*[-–—]\s*\d+(?:[.,]\d+)?\s*(?:кг|kg|г|гр|g|мл|ml|л|l|шт|штук|pcs)\s*$',
        r'\s+\d+(?:[.,]\d+)?\s*(?:кг|kg|г|гр|g|мл|ml|л|l)\s*$',
        r'\s*[xх]\s*\d+(?:[.,]\d+)?\s*(?:г|гр|g)\s*$',
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Показать детальную информацию по каждой группе'
        )
        parser.add_argument(
            '--export',
            type=str,
            help='Экспортировать результаты в JSON файл'
        )
        parser.add_argument(
            '--min-group-size',
            type=int,
            default=2,
            help='Минимальный размер группы для отображения (по умолчанию 2)'
        )

    def extract_base_name(self, name: str) -> str:
        """
        Извлекает базовое название товара без веса/объёма.
        
        Примеры:
            "Purina Cat Chow Kitten Chicken - 15 кг" → "Purina Cat Chow Kitten Chicken"
            "Royal Canin Indoor 27 сухой корм 400 г" → "Royal Canin Indoor 27 сухой корм"
        """
        base_name = name.strip()
        
        # Применяем все паттерны для удаления веса
        for pattern in self.WEIGHT_REMOVAL_PATTERNS:
            base_name = re.sub(pattern, '', base_name, flags=re.IGNORECASE)
        
        # Удаляем лишние пробелы и тире в конце
        base_name = re.sub(r'\s*[-–—]\s*$', '', base_name)
        base_name = re.sub(r'\s+', ' ', base_name).strip()
        
        return base_name

    def extract_weight_info(self, name: str, weight_field: float = None) -> dict:
        """
        Извлекает информацию о весе из названия или поля weight.
        
        Returns:
            {
                'value': float (в кг),
                'display': str ("400 г", "2 кг"),
                'source': 'name' | 'field'
            }
        """
        # Сначала пробуем из названия
        for pattern in self.WEIGHT_PATTERNS:
            match = re.search(pattern, name, re.IGNORECASE)
            if match:
                value_str = match.group(1).replace(',', '.')
                value = float(value_str)
                
                # Определяем единицы измерения
                full_match = match.group(0).lower()
                if 'кг' in full_match or 'kg' in full_match:
                    value_kg = value
                    display = f"{value_str} кг"
                elif 'г' in full_match or 'g' in full_match:
                    value_kg = value / 1000
                    display = f"{int(value) if value == int(value) else value_str} г"
                elif 'мл' in full_match or 'ml' in full_match:
                    value_kg = value / 1000  # Приблизительно
                    display = f"{int(value)} мл"
                elif 'л' in full_match or 'l' in full_match:
                    value_kg = value  # Приблизительно
                    display = f"{value_str} л"
                elif 'шт' in full_match:
                    value_kg = None
                    display = f"{int(value)} шт"
                else:
                    value_kg = value
                    display = f"{value_str}"
                
                return {
                    'value': value_kg,
                    'display': display,
                    'source': 'name'
                }
        
        # Если не нашли в названии, используем поле weight
        if weight_field:
            if weight_field >= 1:
                display = f"{weight_field} кг"
            else:
                display = f"{int(weight_field * 1000)} г"
            return {
                'value': weight_field,
                'display': display,
                'source': 'field'
            }
        
        return None

    def handle(self, *args, **options):
        detailed = options['detailed']
        export_file = options['export']
        min_group_size = options['min_group_size']
        
        self.stdout.write(self.style.WARNING(
            'Команда устарела для новой структуры магазина. '
            'Используйте нормализованные поля и связи.'
        ))
        return

        self.stdout.write('Анализ товаров в базе данных...\n')
        
        # Получаем все товары
        products = Product.objects.all().values(
            'id', 'external_id', 'group_id', 'name', 'vendor', 
            'price', 'weight', 'animal', 'category', 'subcategory',
            'image_url', 'images', 'in_stock'
        )
        
        total_products = products.count()
        self.stdout.write(f'Всего товаров в БД: {total_products}\n')
        
        # Группируем по базовому названию + vendor + animal + category
        groups = defaultdict(list)
        
        for product in products:
            base_name = self.extract_base_name(product['name'])
            weight_info = self.extract_weight_info(
                product['name'], 
                float(product['weight']) if product['weight'] else None
            )
            
            # Ключ группировки
            group_key = (
                base_name.lower(),
                (product['vendor'] or '').lower(),
                product['animal'],
                product['category'],
            )
            
            groups[group_key].append({
                'id': product['id'],
                'external_id': product['external_id'],
                'group_id': product['group_id'],
                'name': product['name'],
                'base_name': base_name,
                'weight_info': weight_info,
                'price': float(product['price']) if product['price'] else 0,
                'in_stock': product['in_stock'],
                'vendor': product['vendor'],
                'animal': product['animal'],
                'category': product['category'],
                'subcategory': product['subcategory'],
            })
        
        # Фильтруем группы с >= min_group_size вариаций
        multi_groups = {k: v for k, v in groups.items() if len(v) >= min_group_size}
        single_groups = {k: v for k, v in groups.items() if len(v) == 1}
        
        # Статистика
        total_groups = len(groups)
        total_multi = len(multi_groups)
        total_single = len(single_groups)
        products_in_multi = sum(len(v) for v in multi_groups.values())
        
        self.stdout.write(self.style.SUCCESS(f'\n=== СТАТИСТИКА ==='))
        self.stdout.write(f'Уникальных групп товаров: {total_groups}')
        self.stdout.write(f'  - С вариациями (>={min_group_size}): {total_multi}')
        self.stdout.write(f'  - Без вариаций (1 товар): {total_single}')
        self.stdout.write(f'Товаров в группах с вариациями: {products_in_multi}')
        self.stdout.write(f'Потенциальная экономия записей: {products_in_multi - total_multi}')
        
        # Распределение по размеру групп
        size_distribution = defaultdict(int)
        for v in multi_groups.values():
            size_distribution[len(v)] += 1
        
        self.stdout.write(f'\nРаспределение по размеру групп:')
        for size, count in sorted(size_distribution.items()):
            self.stdout.write(f'  {size} вариаций: {count} групп')
        
        # Статистика по категориям
        self.stdout.write(f'\nГруппы с вариациями по категориям:')
        category_stats = defaultdict(lambda: {'groups': 0, 'products': 0})
        for key, products_list in multi_groups.items():
            cat = key[3]  # category
            category_stats[cat]['groups'] += 1
            category_stats[cat]['products'] += len(products_list)
        
        for cat, stats in sorted(category_stats.items(), key=lambda x: -x[1]['products']):
            self.stdout.write(f'  {cat}: {stats["groups"]} групп, {stats["products"]} товаров')
        
        # Детальный вывод
        if detailed:
            self.stdout.write(f'\n\n=== ПРИМЕРЫ ГРУПП С ВАРИАЦИЯМИ ===\n')
            
            # Показываем топ-20 групп по размеру
            sorted_groups = sorted(multi_groups.items(), key=lambda x: -len(x[1]))[:20]
            
            for i, (key, products_list) in enumerate(sorted_groups, 1):
                base_name, vendor, animal, category = key
                self.stdout.write(f'\n{i}. {base_name[:60]}...')
                self.stdout.write(f'   Бренд: {vendor}, Категория: {animal}/{category}')
                self.stdout.write(f'   Вариаций: {len(products_list)}')
                
                for prod in products_list[:5]:  # Показываем первые 5
                    weight_str = prod['weight_info']['display'] if prod['weight_info'] else 'N/A'
                    price_str = f"{prod['price']:.2f}₽" if prod['price'] else 'N/A'
                    stock_str = '✓' if prod['in_stock'] else '✗'
                    self.stdout.write(f'     - [{stock_str}] {weight_str}, {price_str} (id={prod["id"]})')
                
                if len(products_list) > 5:
                    self.stdout.write(f'     ... и ещё {len(products_list) - 5} вариаций')
        
        # Проверка существующих SKU
        self.stdout.write(f'\n\n=== СУЩЕСТВУЮЩИЕ SKU ===')
        sku_count = ProductSKU.objects.count()
        products_with_sku = ProductSKU.objects.values('product_id').distinct().count()
        self.stdout.write(f'Всего SKU записей: {sku_count}')
        self.stdout.write(f'Товаров с SKU: {products_with_sku}')
        
        # Экспорт
        if export_file:
            export_data = {
                'statistics': {
                    'total_products': total_products,
                    'unique_groups': total_groups,
                    'groups_with_variations': total_multi,
                    'single_product_groups': total_single,
                    'products_in_variation_groups': products_in_multi,
                    'potential_savings': products_in_multi - total_multi,
                },
                'size_distribution': dict(size_distribution),
                'category_statistics': dict(category_stats),
                'groups': []
            }
            
            for key, products_list in sorted(multi_groups.items(), key=lambda x: -len(x[1])):
                base_name, vendor, animal, category = key
                export_data['groups'].append({
                    'base_name': base_name,
                    'vendor': vendor,
                    'animal': animal,
                    'category': category,
                    'variations_count': len(products_list),
                    'products': products_list
                })
            
            with open(export_file, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2, default=str)
            
            self.stdout.write(self.style.SUCCESS(f'\nРезультаты экспортированы в {export_file}'))
        
        self.stdout.write(self.style.SUCCESS('\n✓ Анализ завершён'))
