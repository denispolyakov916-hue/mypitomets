"""
Команда для импорта товаров из YML XML каталога (только для кошек и собак)

Использование:
    python manage.py import_xml_catalog path/to/catalog.xml
    python manage.py import_xml_catalog path/to/catalog.xml --clear
    python manage.py import_xml_catalog path/to/catalog.xml --save-json output.json
"""

import json
import xml.etree.ElementTree as ET
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.shop.models import Product


class Command(BaseCommand):
    help = 'Импорт товаров из YML XML каталога (только для кошек и собак)'

    def add_arguments(self, parser):
        parser.add_argument('xml_file', type=str, help='Путь к XML файлу каталога')
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Удалить все существующие товары перед импортом'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Размер пакета для bulk_create (по умолчанию 1000)'
        )
        parser.add_argument(
            '--save-json',
            type=str,
            help='Сохранить конвертированный JSON в файл (опционально)'
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # ID категорий для кошек и собак
        self.cat_category_id = '2133'  # Для кошек
        self.dog_category_id = '2132'  # Для собак
        
        # Словарь категорий: {category_id: {name, parent_id}}
        self.categories = {}
        
        # Маппинг категорий из XML в модель Product
        self.category_mapping = {
            'Корм': 'food',
            'Ветаптека': 'pharmacy',
            'Амуниция': 'ammunition',
            'Средства по уходу': 'care',
            'Транспортировка и содержание': 'transport',
            'Игрушки': 'toys',
            'Лакомства': 'food',  # Лакомства считаем кормом
            'Витамины и добавки': 'pharmacy',  # Витамины считаем ветаптекой
            'Туалеты и принадлежности': 'care',
            'Наполнители': 'care',
            'Миски': 'care',
            'Одежда': 'care',
            'Груминг': 'care',
            'Контроль поведения': 'care',
        }
        
        # Маппинг подкатегорий
        self.subcategory_mapping = {
            'Сухой': 'dry',
            'Влажный': 'wet',
            'Консервы': 'canned',
            'Паучи': 'pouch',
            'Паштет': 'pate',
            'Холистики': 'holistic',
            'Холистик': 'holistic',
            'Диетический': 'diet',
            'Гипоаллергенный': 'hypoallergenic',
            'Средства от паразитов': 'antiparasite',
            'Поводки': 'leashes',
            'Ошейники': 'collars',
            'Шлейки': 'harnesses',
            'Намордники': 'muzzles',
            'Кликеры': 'clickers',
            'Рулетки': 'retractable',
            'Подсветки': 'lights',
            'Мультибоксы': 'multiboxes',
            'Вольеры': 'enclosures',
            'Пеленки': 'pads',
            'Клетки': 'enclosures',
        }

    def build_category_tree(self, categories_elem):
        """Строит дерево категорий для быстрого поиска."""
        for category in categories_elem.findall('category'):
            cat_id = category.get('id')
            cat_name = category.text.strip() if category.text else ''
            parent_id = category.get('parentId')
            
            self.categories[cat_id] = {
                'name': cat_name,
                'parent_id': parent_id,
            }

    def get_category_path(self, category_id):
        """Получает полный путь категории (все родительские категории)."""
        path = []
        current_id = category_id
        
        visited = set()  # Защита от циклов
        while current_id and current_id in self.categories and current_id not in visited:
            visited.add(current_id)
            cat = self.categories[current_id]
            path.append(cat['name'])
            current_id = cat.get('parent_id')
        
        return path[::-1]  # Разворачиваем, чтобы получить от корня к листу

    def is_cat_or_dog_product(self, offer_elem):
        """Проверяет, относится ли товар к кошкам или собакам."""
        # Проверяем параметр zhivotnoe
        for param in offer_elem.findall('param'):
            if param.get('name') == 'zhivotnoe':
                value = param.text.strip() if param.text else ''
                if value in ['Для кошек', 'Для собак']:
                    return True, 'cat' if value == 'Для кошек' else 'dog'
        
        # Проверяем по категории
        category_id = offer_elem.find('categoryId')
        if category_id is not None and category_id.text:
            cat_id = category_id.text.strip()
            path = self.get_category_path(cat_id)
            
            # Проверяем, есть ли в пути "Для кошек" или "Для собак"
            if 'Для кошек' in path:
                return True, 'cat'
            elif 'Для собак' in path:
                return True, 'dog'
        
        return False, None

    def map_category(self, category_path):
        """Маппит категорию из XML в формат модели."""
        category = 'food'  # По умолчанию
        subcategory = None
        category_name = None
        
        # Ищем категорию в пути (исключая "Для кошек"/"Для собак")
        for cat_name in category_path:
            if cat_name in ['Для кошек', 'Для собак']:
                continue
            if cat_name in self.category_mapping:
                category = self.category_mapping[cat_name]
                category_name = cat_name
                break
        
        # Ищем подкатегорию
        for cat_name in category_path:
            if cat_name in self.subcategory_mapping:
                subcategory = self.subcategory_mapping[cat_name]
                break
        
        return category, subcategory, category_name

    def parse_offer(self, offer_elem, animal_type):
        """Парсит один товар из XML."""
        offer_id = offer_elem.get('id', '').strip()
        if not offer_id:
            return None
        
        # Проверяем цену
        price_elem = offer_elem.find('price')
        if price_elem is None or not price_elem.text:
            return None
        
        try:
            price = Decimal(price_elem.text.strip())
            if price <= 0:
                return None
        except (ValueError, TypeError):
            return None
        
        # Основные поля
        name_elem = offer_elem.find('name')
        name = name_elem.text.strip() if name_elem is not None and name_elem.text else ''
        
        vendor_elem = offer_elem.find('vendor')
        vendor = vendor_elem.text.strip() if vendor_elem is not None and vendor_elem.text else None
        
        vendor_code_elem = offer_elem.find('vendorCode')
        vendor_code = vendor_code_elem.text.strip() if vendor_code_elem is not None and vendor_code_elem.text else None
        
        barcode_elem = offer_elem.find('barcode')
        barcode = barcode_elem.text.strip() if barcode_elem is not None and barcode_elem.text else None
        
        weight_elem = offer_elem.find('weight')
        weight = None
        if weight_elem is not None and weight_elem.text:
            try:
                weight = Decimal(weight_elem.text.strip())
            except (ValueError, TypeError):
                pass
        
        url_elem = offer_elem.find('url')
        url = url_elem.text.strip() if url_elem is not None and url_elem.text else None
        
        # Изображения
        pictures = []
        for picture in offer_elem.findall('picture'):
            if picture.text:
                pictures.append(picture.text.strip())
        
        # Описание
        desc_elem = offer_elem.find('description')
        description = ''
        if desc_elem is not None and desc_elem.text:
            description = desc_elem.text.strip()
        
        # Наличие
        available = offer_elem.get('available', 'false').lower() == 'true'
        
        count_elem = offer_elem.find('count')
        stock_count = 0
        if count_elem is not None and count_elem.text:
            try:
                stock_count = int(count_elem.text.strip())
                if stock_count < 0:
                    stock_count = 0
            except (ValueError, TypeError):
                pass
        
        # Группа
        group_id = offer_elem.get('group_id')
        
        # Категория
        category_id_elem = offer_elem.find('categoryId')
        category_path = []
        if category_id_elem is not None and category_id_elem.text:
            category_path = self.get_category_path(category_id_elem.text.strip())
        
        category, subcategory, category_name = self.map_category(category_path)
        
        # Параметры
        params = {}
        for param in offer_elem.findall('param'):
            param_name = param.get('name', '').strip()
            param_value = param.text.strip() if param.text else ''
            if param_name:
                params[param_name] = param_value
        
        return {
            'id': offer_id,
            'group_id': group_id,
            'name': name[:500],  # Ограничение длины
            'description': description,
            'price': float(price),
            'vendor': vendor,
            'vendorCode': vendor_code,
            'barcode': barcode,
            'weight': float(weight) if weight is not None else None,
            'url': url,
            'pictures': pictures,
            'animal': animal_type,
            'category': category,
            'subcategory': subcategory,
            'category_name': category_name,
            'available': available,
            'count': stock_count,
            'params': params,
        }

    def handle(self, *args, **options):
        xml_file = options['xml_file']
        clear_data = options['clear']
        batch_size = options['batch_size']
        save_json = options.get('save_json')
        
        self.stdout.write(f'Загрузка каталога из {xml_file}...')
        
        # Парсим XML
        try:
            tree = ET.parse(xml_file)
            root = tree.getroot()
        except FileNotFoundError:
            self.stderr.write(self.style.ERROR(f'Файл не найден: {xml_file}'))
            return
        except ET.ParseError as e:
            self.stderr.write(self.style.ERROR(f'Ошибка парсинга XML: {e}'))
            return
        
        # Находим shop элемент
        shop = root.find('shop')
        if shop is None:
            self.stderr.write(self.style.ERROR('Не найден элемент <shop> в XML'))
            return
        
        # Строим дерево категорий
        categories_elem = shop.find('categories')
        if categories_elem is not None:
            self.build_category_tree(categories_elem)
            self.stdout.write(f'Загружено категорий: {len(self.categories)}')
        
        # Парсим товары
        offers_elem = shop.find('offers')
        if offers_elem is None:
            self.stderr.write(self.style.ERROR('Не найден элемент <offers> в XML'))
            return
        
        products_data = []
        skipped = 0
        cat_count = 0
        dog_count = 0
        
        self.stdout.write('Парсинг товаров...')
        
        for offer in offers_elem.findall('offer'):
            # Проверяем, относится ли товар к кошкам или собакам
            is_valid, animal_type = self.is_cat_or_dog_product(offer)
            
            if not is_valid:
                skipped += 1
                continue
            
            # Парсим товар
            product_data = self.parse_offer(offer, animal_type)
            
            if product_data is None:
                skipped += 1
                continue
            
            products_data.append(product_data)
            
            if animal_type == 'cat':
                cat_count += 1
            else:
                dog_count += 1
            
            if len(products_data) % 1000 == 0:
                self.stdout.write(f'  Обработано: {len(products_data)} товаров...')
        
        self.stdout.write(f'\nНайдено товаров для импорта: {len(products_data)}')
        self.stdout.write(f'  Для кошек: {cat_count}')
        self.stdout.write(f'  Для собак: {dog_count}')
        self.stdout.write(f'  Пропущено: {skipped}')
        
        # Сохраняем JSON если нужно
        if save_json:
            output_data = {
                'products': products_data,
                'statistics': {
                    'total_products': len(products_data),
                    'by_category': {
                        'cat': cat_count,
                        'dog': dog_count,
                    }
                }
            }
            with open(save_json, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
            self.stdout.write(self.style.SUCCESS(f'JSON сохранён в {save_json}'))
        
        # Импортируем в БД
        if not products_data:
            self.stdout.write(self.style.WARNING('Нет товаров для импорта'))
            return
        
        with transaction.atomic():
            # Очистка данных если указан флаг --clear
            if clear_data:
                self.stdout.write('Удаление существующих товаров...')
                Product.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('Товары удалены'))
            
            # Подготовка товаров для bulk_create
            products_to_create = []
            existing_ids = set(Product.objects.values_list('external_id', flat=True))
            skipped_db = 0
            
            for item in products_data:
                external_id = str(item.get('id', ''))
                
                if not external_id:
                    skipped_db += 1
                    continue
                
                # Пропускаем если уже существует (при обновлении без --clear)
                if external_id in existing_ids:
                    skipped_db += 1
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
                    price=item.get('price', 0),
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
        self.stdout.write(f'  Пропущено при импорте: {skipped_db}')
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

