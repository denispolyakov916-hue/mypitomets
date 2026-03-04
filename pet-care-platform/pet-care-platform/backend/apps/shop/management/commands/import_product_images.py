"""
Команда для импорта изображений товаров из JSON-файлов.

Читает файлы из products_full/ и обновляет URL изображений в БД.
"""

import os
import json
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.shop.models import Product, ProductImage


class Command(BaseCommand):
    help = 'Импорт/обновление изображений товаров из JSON-файлов products_full'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source-dir',
            type=str,
            default=r'd:\api_cotmatros\Data\products_data\products_full',
            help='Директория с JSON-файлами товаров'
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Удалить существующие изображения перед импортом'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Ограничить количество обрабатываемых файлов (0 = все)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Только проверка без сохранения в БД'
        )

    def handle(self, *args, **options):
        source_dir = options['source_dir']
        clear_existing = options['clear_existing']
        limit = options['limit']
        dry_run = options['dry_run']

        if not os.path.exists(source_dir):
            self.stderr.write(self.style.ERROR(f'Директория не найдена: {source_dir}'))
            return

        # Получаем список JSON файлов
        json_files = [f for f in os.listdir(source_dir) if f.endswith('.json')]
        total_files = len(json_files)
        
        if limit > 0:
            json_files = json_files[:limit]

        self.stdout.write(f'Найдено {total_files} файлов, обрабатываем {len(json_files)}')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - изменения не будут сохранены'))

        # Статистика
        stats = {
            'files_processed': 0,
            'products_found': 0,
            'products_not_found': 0,
            'images_created': 0,
            'images_deleted': 0,
            'products_updated': 0,
            'errors': 0,
        }

        # Если нужно очистить существующие изображения
        if clear_existing and not dry_run:
            count, _ = ProductImage.objects.all().delete()
            stats['images_deleted'] = count
            self.stdout.write(f'Удалено {count} существующих изображений')

        # Загружаем все kotmatros_product_id для быстрого поиска
        self.stdout.write('Загрузка ID товаров из БД...')
        product_map = dict(
            Product.objects.values_list('kotmatros_product_id', 'id')
        )
        self.stdout.write(f'Загружено {len(product_map)} товаров')

        # Обрабатываем файлы пакетами
        batch_size = 500
        images_to_create = []
        products_to_update = []

        for i, filename in enumerate(json_files):
            filepath = os.path.join(source_dir, filename)
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except Exception as e:
                self.stderr.write(f'Ошибка чтения {filename}: {e}')
                stats['errors'] += 1
                continue

            kotmatros_id = data.get('id')
            if not kotmatros_id:
                continue

            product_id = product_map.get(kotmatros_id)
            if not product_id:
                stats['products_not_found'] += 1
                continue

            stats['products_found'] += 1
            stats['files_processed'] += 1

            # Получаем изображения из JSON
            images = data.get('images', [])
            
            # Основное изображение (url_big из первого изображения)
            main_image_url = None
            
            for idx, img in enumerate(images):
                # Используем url_big как основной URL (с /images/ в пути)
                url = img.get('url_big') or img.get('url_thumb') or img.get('url_crop')
                if not url:
                    continue
                
                if idx == 0:
                    main_image_url = url
                
                image_type = 'main' if idx == 0 else 'other'
                
                images_to_create.append(ProductImage(
                    product_id=product_id,
                    url=url,
                    image_type=image_type,
                    sort_order=img.get('sort', idx),
                    is_active=True
                ))

            # Обновляем image_url в Product
            if main_image_url:
                products_to_update.append({
                    'id': product_id,
                    'image_url': main_image_url
                })

            # Сохраняем пакетами
            if len(images_to_create) >= batch_size:
                if not dry_run:
                    with transaction.atomic():
                        ProductImage.objects.bulk_create(images_to_create, ignore_conflicts=True)
                        for p in products_to_update:
                            Product.objects.filter(id=p['id']).update(image_url=p['image_url'])
                
                stats['images_created'] += len(images_to_create)
                stats['products_updated'] += len(products_to_update)
                
                self.stdout.write(
                    f'Обработано {i+1}/{len(json_files)} файлов, '
                    f'создано {stats["images_created"]} изображений'
                )
                
                images_to_create = []
                products_to_update = []

        # Сохраняем оставшиеся
        if images_to_create and not dry_run:
            with transaction.atomic():
                ProductImage.objects.bulk_create(images_to_create, ignore_conflicts=True)
                for p in products_to_update:
                    Product.objects.filter(id=p['id']).update(image_url=p['image_url'])
        
        stats['images_created'] += len(images_to_create)
        stats['products_updated'] += len(products_to_update)

        # Итоговая статистика
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=== Импорт завершён ==='))
        self.stdout.write(f"Файлов обработано: {stats['files_processed']}")
        self.stdout.write(f"Товаров найдено в БД: {stats['products_found']}")
        self.stdout.write(f"Товаров не найдено: {stats['products_not_found']}")
        self.stdout.write(f"Изображений создано: {stats['images_created']}")
        self.stdout.write(f"Товаров обновлено (image_url): {stats['products_updated']}")
        if stats['images_deleted']:
            self.stdout.write(f"Изображений удалено: {stats['images_deleted']}")
        if stats['errors']:
            self.stdout.write(self.style.WARNING(f"Ошибок: {stats['errors']}"))
