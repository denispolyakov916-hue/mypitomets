"""
Синхронизация старого каталога поставщика в заявки кабинета поставщика.

Команда нужна, чтобы кабинет видел не только новые черновики, но и уже
загруженные в базу товары/рецепты Динозаврика.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.pets.models import (
    FoodRecipe,
    Supplier,
    SupplierOffer,
    SupplierProductSubmission,
    SupplierRawItem,
)
from apps.shop.models import Product
from config.supplier_api import validate_supplier_submission_data


def _json_value(value):
    if value is None:
        return ''
    return str(value)


def _raw_prop(raw_json, code):
    for prop in raw_json.get('props') or []:
        if str(prop.get('code') or '').upper() == code.upper():
            value = prop.get('value')
            if isinstance(value, dict):
                return value.get('TEXT') or value.get('text') or ''
            return value
    return ''


def _offer_from_supplier_offer(offer):
    return {
        'article_number': offer.article_number or '',
        'package_name': offer.package_name or '',
        'package_weight_kg': _json_value(offer.package_weight_kg),
        'price': _json_value(offer.price),
        'barcode': offer.barcode or '',
        'in_stock': bool(offer.in_stock),
        'agency_percent': _json_value(offer.agency_percent),
    }


def _article_from_raw_offer(raw_offer, fallback=''):
    props = raw_offer.get('props') or []
    for code in ['CODE_1C', 'CML2_ARTICLE']:
        for prop in props:
            if str(prop.get('code') or '').upper() == code:
                return str(prop.get('value') or '').strip()
    for prop in props:
        if str(prop.get('code') or '').upper() == 'CML2_TRAITS':
            for item in prop.get('values') or []:
                if str(item.get('description') or '').lower() == 'код':
                    return str(item.get('value') or '').replace('\xa0', '').strip()
    return fallback


def _barcode_from_raw_offer(raw_offer):
    for prop in raw_offer.get('props') or []:
        if str(prop.get('code') or '').upper() == 'CML2_BAR_CODE':
            return str(prop.get('value') or '').strip()
    return ''


def _offer_from_raw(raw_offer, fallback_article=''):
    return {
        'article_number': _article_from_raw_offer(raw_offer, fallback_article),
        'package_name': raw_offer.get('name') or '',
        'package_weight_kg': '',
        'price': _json_value(raw_offer.get('price')),
        'barcode': _barcode_from_raw_offer(raw_offer),
        'in_stock': _raw_prop(raw_offer, 'HIDE_FOR_FEED') != 'Y',
        'agency_percent': '',
    }


def _recipe_submission_data(recipe, product, offers):
    return {
        'name': recipe.name or product.name,
        'shop_name': product.name,
        'brand': recipe.brand or (product.brand.name if product.brand else ''),
        'line': recipe.line or '',
        'species': recipe.species or product.animal_type or '',
        'food_form': recipe.food_form or '',
        'life_stage': recipe.life_stage or product.age_group or '',
        'size_group': recipe.size_group or product.size_group or '',
        'diet_purpose': recipe.diet_purpose or [],
        'main_protein': recipe.main_protein or '',
        'kcal_per_100g': _json_value(recipe.kcal_per_100g),
        'protein_percent': _json_value(recipe.protein_percent),
        'fat_percent': _json_value(recipe.fat_percent),
        'fiber_percent': _json_value(recipe.fiber_percent),
        'ash_percent': _json_value(recipe.ash_percent),
        'moisture_percent': _json_value(recipe.moisture_percent),
        'calcium_percent': _json_value(recipe.calcium_percent),
        'phosphorus_percent': _json_value(recipe.phosphorus_percent),
        'ingredients': recipe.ingredients or [],
        'allergens': recipe.allergens or [],
        'is_sterilized': bool(recipe.is_sterilized),
        'is_sensitive_digestion': bool(recipe.is_sensitive_digestion),
        'is_urinary': bool(recipe.is_urinary),
        'is_weight_control': bool(recipe.is_weight_control),
        'is_grain_free': bool(recipe.is_grain_free),
        'is_hypoallergenic': bool(recipe.is_hypoallergenic),
        'short_description': product.short_description or '',
        'description': product.description or '',
        'image_url': product.image_url or '',
        'parse_status': recipe.parse_status,
        'review_status': recipe.review_status,
        'offers': [_offer_from_supplier_offer(offer) for offer in offers],
    }


def _raw_submission_data(raw_item):
    raw_json = raw_item.raw_json or {}
    raw_offers = raw_json.get('offers') or []
    return {
        'name': raw_json.get('name') or raw_item.article_number or raw_item.external_id,
        'shop_name': raw_json.get('name') or '',
        'brand': _raw_prop(raw_json, 'BREND') or '',
        'line': '',
        'species': '',
        'food_form': '',
        'life_stage': '',
        'size_group': '',
        'diet_purpose': [],
        'main_protein': '',
        'ingredients': [],
        'allergens': [],
        'short_description': raw_json.get('previewText') or '',
        'description': _raw_prop(raw_json, 'DESCRIPTION') or raw_json.get('detailText') or '',
        'image_url': raw_json.get('detailPicture') or raw_json.get('previewPicture') or '',
        'parse_status': 'not_parsed',
        'review_status': 'raw_only',
        'offers': [
            _offer_from_raw(raw_offer, raw_item.article_number)
            for raw_offer in raw_offers
        ],
    }


def _find_existing_submission(supplier, recipe=None, product=None, raw_item=None):
    qs = SupplierProductSubmission.objects.filter(supplier=supplier)
    if raw_item:
        existing = qs.filter(source_raw_item=raw_item).first()
        if existing:
            return existing
    if recipe:
        existing = qs.filter(food_recipe=recipe).first()
        if existing:
            return existing
    if product:
        existing = qs.filter(product=product).first()
        if existing:
            return existing
    return SupplierProductSubmission(supplier=supplier)


class Command(BaseCommand):
    help = 'Создать/обновить заявки кабинета поставщика из существующих товаров и рецептов'

    def add_arguments(self, parser):
        parser.add_argument('--supplier-code', default='dinozavrik')
        parser.add_argument('--include-raw-unparsed', action='store_true', help='Добавить сырые строки без рецепта как нуждающиеся в проверке')
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument('--limit', type=int, default=0)

    def handle(self, *args, **options):
        supplier = Supplier.objects.get(code=options['supplier_code'])
        dry_run = options['dry_run']
        limit = options['limit']
        include_raw_unparsed = options['include_raw_unparsed']
        now = timezone.now()
        created = updated = shop = recommendation = raw_unparsed = 0

        products = Product.objects.filter(
            supplier=supplier,
            food_recipe__isnull=False,
        ).select_related('brand', 'food_recipe').order_by('name')
        if limit:
            products = products[:limit]

        for product in products:
            recipe = product.food_recipe
            raw_item = SupplierRawItem.objects.filter(supplier=supplier, food_recipe=recipe).order_by('-imported_at').first()
            offers = SupplierOffer.objects.filter(supplier=supplier, food_recipe=recipe).order_by('package_name', 'article_number')
            status = (
                SupplierProductSubmission.STATUS_APPROVED_FOR_RECOMMENDATION
                if recipe.is_recommendable
                else SupplierProductSubmission.STATUS_APPROVED_FOR_SHOP
            )
            data = _recipe_submission_data(recipe, product, offers)
            errors = validate_supplier_submission_data(data)
            changed_fields = {
                'catalog_origin': 'existing_shop_product',
                'in_shop': True,
                'in_recommendation': bool(recipe.is_recommendable),
                'parse_status': recipe.parse_status,
                'review_status': recipe.review_status,
                'product_available': bool(product.is_available),
                'product_status': product.status,
                'synced_from_existing_catalog_at': now.isoformat(),
            }
            if dry_run:
                if status == SupplierProductSubmission.STATUS_APPROVED_FOR_RECOMMENDATION:
                    recommendation += 1
                else:
                    shop += 1
                continue

            with transaction.atomic():
                submission = _find_existing_submission(supplier, recipe=recipe, product=product, raw_item=raw_item)
                is_new = submission._state.adding
                submission.source_raw_item = raw_item
                submission.food_recipe = recipe
                submission.product = product
                submission.status = status
                submission.data = data
                submission.validation_errors = errors
                submission.changed_fields = {**(submission.changed_fields or {}), **changed_fields}
                submission.review_comment = 'Синхронизировано из существующего каталога магазина и базы подбора'
                submission.reviewed_at = now
                submission.save()
                created += int(is_new)
                updated += int(not is_new)
                if status == SupplierProductSubmission.STATUS_APPROVED_FOR_RECOMMENDATION:
                    recommendation += 1
                else:
                    shop += 1

        if include_raw_unparsed:
            raw_items = SupplierRawItem.objects.filter(supplier=supplier, food_recipe__isnull=True).order_by('-imported_at')
            if limit:
                raw_items = raw_items[:limit]
            for raw_item in raw_items:
                data = _raw_submission_data(raw_item)
                errors = validate_supplier_submission_data(data)
                changed_fields = {
                    'catalog_origin': 'raw_unparsed',
                    'in_shop': False,
                    'in_recommendation': False,
                    'parse_status': 'not_parsed',
                    'review_status': 'raw_only',
                    'synced_from_existing_catalog_at': now.isoformat(),
                }
                if dry_run:
                    raw_unparsed += 1
                    continue
                with transaction.atomic():
                    submission = _find_existing_submission(supplier, raw_item=raw_item)
                    is_new = submission._state.adding
                    submission.source_raw_item = raw_item
                    submission.food_recipe = None
                    submission.product = None
                    submission.status = SupplierProductSubmission.STATUS_NEEDS_FIX
                    submission.data = data
                    submission.validation_errors = errors
                    submission.changed_fields = {**(submission.changed_fields or {}), **changed_fields}
                    submission.review_comment = 'Сырая строка фида без привязанного рецепта'
                    submission.reviewed_at = now
                    submission.save()
                    created += int(is_new)
                    updated += int(not is_new)
                    raw_unparsed += 1

        self.stdout.write(self.style.SUCCESS(
            f'supplier={supplier.code} created={created} updated={updated} '
            f'in_recommendation={recommendation} in_shop_only={shop} raw_unparsed={raw_unparsed}'
        ))
