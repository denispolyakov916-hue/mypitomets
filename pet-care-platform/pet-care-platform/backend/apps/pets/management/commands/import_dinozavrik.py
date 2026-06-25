"""
Импорт каталога Динозаврика в НАШУ независимую базу питания.

Пишет только: FoodRecipe (рецепты-кормы) + SupplierOffer (фасовки: цена/остаток/
агентский %% / артикул) + SupplierRawItem (сырьё). НЕ трогает shop.Product/КотМатрос.
Идемпотентно: повторный запуск обновляет по (source, external_id) / (source, article).

Использование:
    python manage.py import_dinozavrik --source /tmp/catalog_live.json
    python manage.py import_dinozavrik --source /tmp/catalog_live.json --dry-run
"""

import json
import re
from collections import Counter
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.pets.food_parser import parse_recipe
from apps.pets.models import FoodRecipe, SupplierOffer, SupplierRawItem

SRC = 'dinozavrik'

# поля FoodRecipe, которые приходят из парсера (остальные ключи fields игнорируем)
RECIPE_FIELDS = {
    'name', 'brand', 'line', 'species', 'food_form', 'life_stage', 'size_group',
    'diet_purpose', 'is_sterilized', 'is_sensitive_digestion', 'is_urinary',
    'is_weight_control', 'is_grain_free', 'is_hypoallergenic',
    'kcal_per_100g', 'protein_percent', 'fat_percent', 'fiber_percent', 'ash_percent',
    'moisture_percent', 'calcium_percent', 'phosphorus_percent',
    'ingredients', 'main_protein', 'allergens', 'field_confidence',
    'nutrition_complete', 'agency_percent',
}


def _recipe_key(f):
    parts = [f.get('brand', ''), f.get('line', ''), f.get('main_protein', ''), f.get('food_form', '')]
    return re.sub(r'\s+', ' ', '|'.join(p.lower() for p in parts)).strip('|')[:255]


class Command(BaseCommand):
    help = 'Импорт каталога Динозаврика в базу питания (FoodRecipe/SupplierOffer/SupplierRawItem)'

    def add_arguments(self, parser):
        parser.add_argument('--source', required=True, help='Путь к catalog.json Динозаврика')
        parser.add_argument('--dry-run', action='store_true', help='Не писать в БД, только отчёт')
        parser.add_argument('--limit', type=int, default=0, help='Ограничить число товаров (отладка)')

    def handle(self, *args, **opts):
        data = json.load(open(opts['source'], encoding='utf-8'))
        if opts['limit']:
            data = data[:opts['limit']]
        dry = opts['dry_run']

        stat = Counter()
        offers_total = offers_agency = 0
        block_reasons = Counter()
        purposes = Counter()

        for product in data:
            r = parse_recipe(product)
            stat['products'] += 1
            ext_id = r['external_id']

            if not r['is_food']:
                stat['non_food'] += 1
                if not dry:
                    SupplierRawItem.objects.update_or_create(
                        source=SRC, external_id=ext_id,
                        defaults={'article_number': r['article'] or '', 'raw_json': product},
                    )
                continue

            stat['food'] += 1
            stat[f'parse_{r["parse_status"]}'] += 1
            for dp in r['fields'].get('diet_purpose', []):
                purposes[dp] += 1

            is_reco = len(r['reasons']) == 0
            if is_reco:
                stat['recommendable'] += 1
            if r['fields'].get('nutrition_complete'):
                stat['nutrition_complete'] += 1
            for rs in r['reasons']:
                block_reasons[rs] += 1

            defaults = {k: v for k, v in r['fields'].items() if k in RECIPE_FIELDS}
            defaults.update({
                'source': SRC,
                'recipe_key': _recipe_key(r['fields']),
                'parse_status': r['parse_status'],
                'review_status': 'auto_parsed',
                'is_recommendable': is_reco,
                'recommend_block_reasons': r['reasons'],
            })

            if dry:
                offers_total += len(r['offers'])
                offers_agency += sum(1 for o in r['offers'] if o.get('agency_percent') is not None)
                continue

            with transaction.atomic():
                raw_item, _ = SupplierRawItem.objects.get_or_create(source=SRC, external_id=ext_id)
                recipe = raw_item.food_recipe or FoodRecipe()
                for k, v in defaults.items():
                    setattr(recipe, k, v)
                recipe.save()
                raw_item.food_recipe = recipe
                raw_item.article_number = r['article'] or ''
                raw_item.raw_json = product
                raw_item.save()

                for o in r['offers']:
                    art = o.get('article_number') or f'{ext_id}:{o.get("name", "")}'
                    SupplierOffer.objects.update_or_create(
                        source=SRC, article_number=art,
                        defaults={
                            'food_recipe': recipe,
                            'package_name': o.get('name', '')[:120],
                            'price': o.get('price') or None,
                            'agency_percent': o.get('agency_percent'),
                            'barcode': (o.get('barcode') or '')[:60],
                            'in_stock': not o.get('hide_for_feed', False),
                            'raw': o,
                        },
                    )
                    offers_total += 1
                    if o.get('agency_percent') is not None:
                        offers_agency += 1

        # ---- отчёт ----
        w = self.stdout.write
        w('')
        w('===== ИМПОРТ ДИНОЗАВРИК%s =====' % (' (DRY-RUN)' if dry else ''))
        w(f'Товаров в фиде:          {stat["products"]}')
        w(f'  не-корм (в магазин):   {stat["non_food"]}')
        w(f'  кормов:                {stat["food"]}')
        w(f'    распознано авто:     {stat["parse_auto_parsed"]}')
        w(f'    частично:            {stat["parse_partial"]}')
        w(f'    не распознано:       {stat["parse_failed"]}')
        w(f'>>> В ПОДБОР (is_recommendable): {stat["recommendable"]}')
        w(f'      из них полная норма (nutrition_complete): {stat["nutrition_complete"]}')
        w(f'      на ручную проверку (корм, но не в подборе): {stat["food"] - stat["recommendable"]}')
        w(f'Офферы(фасовки): {offers_total}, с агентским %: {offers_agency}')
        w(f'Назначения: {dict(purposes.most_common(12))}')
        w(f'Топ причин не-в-подбор: {dict(block_reasons.most_common(8))}')
        if not dry:
            w('')
            w(f'В БД: FoodRecipe={FoodRecipe.objects.count()}, SupplierOffer={SupplierOffer.objects.count()}, SupplierRawItem={SupplierRawItem.objects.count()}')
