"""
Импорт категорий товаров из products_data (products_full).

Проставляет:
- Category.code (если отсутствует) по маппингу
- Category.product_group (по префиксу code)
- Product.new_category по данным файлов
- Product.product_group по префиксу категории

Использование:
    python manage.py import_product_categories_from_products_data --source d:\\api_cotmatros\\Data\\products_data
    python manage.py import_product_categories_from_products_data --source d:\\api_cotmatros\\Data\\products_data --all
"""

import json
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.shop.models import Product, Category
from apps.shop.management.commands.populate_category_codes import CATEGORY_CODE_MAPPING


PRODUCT_GROUP_BY_PREFIX = {
    'food': 'food',
    'health': 'vet',
    'toilet': 'toilet',
    'feeding': 'bowls',
    'toys': 'toys',
    'walk': 'equipment',
    'clothing': 'clothes',
    'care': 'grooming',
    'housing': 'housing',
    'misc': 'other',
    'behavior': 'other',
}


class Command(BaseCommand):
    help = 'Импорт категорий товаров из products_full JSON'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            type=str,
            required=True,
            help='Путь к директории products_data (с поддиректорией products_full)'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Обновить категории для всех товаров, не только пустые'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Без сохранения изменений'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Ограничить количество обработанных файлов'
        )

    def handle(self, *args, **options):
        source_dir = options['source']
        products_dir = os.path.join(source_dir, 'products_full')

        if not os.path.isdir(products_dir):
            self.stderr.write(self.style.ERROR(f'Директория не найдена: {products_dir}'))
            return

        self.stdout.write('Обновление кодов категорий и product_group...')
        self._update_category_codes(dry_run=options['dry_run'])

        categories_by_external = {
            cat.kotmatros_category_id: cat
            for cat in Category.objects.filter(kotmatros_category_id__isnull=False)
        }

        processed = 0
        updated = 0
        skipped = 0
        missing_products = 0
        missing_categories = 0

        batch = []
        batch_size = 500

        with os.scandir(products_dir) as it:
            for entry in it:
                if not entry.is_file() or not entry.name.endswith('.json'):
                    continue
                if options['limit'] and processed >= options['limit']:
                    break

                processed += 1
                try:
                    with open(entry.path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                except Exception:
                    skipped += 1
                    continue

                product_id = data.get('id')
                if not product_id:
                    skipped += 1
                    continue

                product = Product.objects.filter(kotmatros_product_id=product_id).only(
                    'id', 'kotmatros_product_id', 'new_category_id', 'product_group'
                ).first()
                if not product:
                    missing_products += 1
                    continue

                if product.new_category_id and not options['all']:
                    skipped += 1
                    continue

                category_id = self._pick_category_id(data)
                if not category_id:
                    missing_categories += 1
                    continue

                category = categories_by_external.get(category_id)
                if not category:
                    missing_categories += 1
                    continue

                product.new_category_id = category.id
                if category.code:
                    group = self._group_from_code(category.code)
                    if group:
                        product.product_group = group

                batch.append(product)
                if len(batch) >= batch_size:
                    updated += self._bulk_update(batch, dry_run=options['dry_run'])
                    batch = []

        if batch:
            updated += self._bulk_update(batch, dry_run=options['dry_run'])

        self.stdout.write(self.style.SUCCESS(
            f'Готово. Обработано: {processed}, обновлено: {updated}, '
            f'пропущено: {skipped}, товаров не найдено: {missing_products}, '
            f'категорий не найдено: {missing_categories}'
        ))

    def _update_category_codes(self, dry_run=False):
        categories = list(
            Category.objects.filter(kotmatros_category_id__in=CATEGORY_CODE_MAPPING.keys())
            .only('id', 'kotmatros_category_id', 'code', 'product_group')
        )
        used_codes = set(
            Category.objects.exclude(code__isnull=True).exclude(code='').values_list('code', flat=True)
        )
        to_update = []
        for category in categories:
            code = CATEGORY_CODE_MAPPING.get(category.kotmatros_category_id)
            if code and (not category.code or category.code != code):
                if code in used_codes and category.code != code:
                    code = None
                else:
                    category.code = code
                    used_codes.add(code)
            if code:
                group = self._group_from_code(code)
                if group and category.product_group != group:
                    category.product_group = group
            if category.code or category.product_group:
                to_update.append(category)

        if dry_run or not to_update:
            return

        Category.objects.bulk_update(to_update, ['code', 'product_group'])

    def _bulk_update(self, batch, dry_run=False):
        if dry_run or not batch:
            return 0
        Product.objects.bulk_update(batch, ['new_category', 'product_group'])
        return len(batch)

    def _pick_category_id(self, data):
        categories = data.get('categories') or []
        if categories:
            categories_sorted = sorted(
                [c for c in categories if c.get('id')],
                key=lambda c: c.get('depth') or 0,
                reverse=True
            )
            if categories_sorted:
                return categories_sorted[0].get('id')

        category_ids = data.get('category_ids') or []
        if category_ids:
            return category_ids[0]

        return data.get('category_id')

    def _group_from_code(self, code):
        prefix = (code or '').split('.')[0]
        return PRODUCT_GROUP_BY_PREFIX.get(prefix)
