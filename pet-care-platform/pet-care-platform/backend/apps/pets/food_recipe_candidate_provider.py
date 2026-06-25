"""
Провайдер кандидатов кормов из НАШЕЙ базы (FoodRecipe + SupplierOffer).

ОТДЕЛЬНЫЙ слой проверки нового источника данных. НЕ подключён к
food_recommendation_service — служит для безопасной обкатки выдачи до интеграции.

Кандидат проходит, только если у рецепта достаточно данных и есть валидный оффер
(в наличии, с ценой и весом фасовки). Агентский % передаётся как данные и
НЕ участвует в ранжировании.
"""

import math
from django.db.models import Q

from .models import FoodRecipe
from .calorie_calculator import calorie_calculator

VALID_REVIEW = ('auto_parsed', 'manual_verified')


def _best_offer(recipe):
    """Лучший оффер для MVP — самый дешёвый в наличии с ценой и весом фасовки."""
    return (
        recipe.offers
        .filter(in_stock=True, price__isnull=False, package_weight_kg__isnull=False)
        .order_by('price')
        .first()
    )


def _pet_daily_kcal(pet):
    """Дневная норма (MER) питомца или (None, warning), если нет веса/расчёт упал."""
    if not getattr(pet, 'weight', None):
        return None, 'нет веса питомца — расчёт нормы недоступен'
    try:
        return float(calorie_calculator.calculate_daily_calories(pet).mer), None
    except Exception as e:  # noqa: BLE001 — провайдер не должен падать из-за одного питомца
        return None, f'расчёт калорий недоступен: {e}'


def _build_candidate(recipe, offer, daily_kcal, pet_warning):
    warnings = []
    if pet_warning:
        warnings.append(pet_warning)

    kcal100 = float(recipe.kcal_per_100g)
    daily_grams = days_per_pack = packs_30 = monthly = None
    if daily_kcal and kcal100 > 0:
        daily_grams = round(daily_kcal / kcal100 * 100, 1)
        pack_g = float(offer.package_weight_kg) * 1000
        if daily_grams > 0 and pack_g > 0:
            days_per_pack = round(pack_g / daily_grams, 1)
            packs_30 = math.ceil(30 * daily_grams / pack_g)
            monthly = round(packs_30 * float(offer.price), 2)

    return {
        'recipe_id': str(recipe.id),
        'recipe_name': recipe.name,
        'brand': recipe.brand,
        'species': recipe.species,
        'food_form': recipe.food_form,
        'kcal_per_100g': kcal100,
        'protein_percent': float(recipe.protein_percent) if recipe.protein_percent is not None else None,
        'fat_percent': float(recipe.fat_percent) if recipe.fat_percent is not None else None,
        'nutrition_complete': recipe.nutrition_complete,
        'offer': {
            'id': str(offer.id),
            'article_number': offer.article_number,
            'price': float(offer.price),
            'package_weight_kg': float(offer.package_weight_kg),
            'agency_percent': float(offer.agency_percent) if offer.agency_percent is not None else None,
        },
        'daily_grams': daily_grams,
        'days_per_pack': days_per_pack,
        'packs_for_30_days': packs_30,
        'estimated_monthly_cost': monthly,
        'warnings': warnings,
    }


def get_food_recipe_candidates(pet, food_form=None, limit=20, source='dinozavrik'):
    """
    Кандидаты кормов из FoodRecipe + SupplierOffer.

    Returns: { 'matched_recipes', 'filtered_out_no_offer', 'daily_kcal', 'candidates': [DTO...] }
    Кандидаты без валидного оффера отсеиваются. Ранжирование — по месячной стоимости
    (без оффера-расчёта — по цене оффера). Агентский % в ранжировании НЕ участвует.
    """
    qs = FoodRecipe.objects.filter(
        is_recommendable=True,
        review_status__in=VALID_REVIEW,
        kcal_per_100g__isnull=False,
    )
    if source:
        qs = qs.filter(source=source)
    species = getattr(pet, 'species', None)
    if species:
        qs = qs.filter(Q(species=species) | Q(species=''))
    if food_form:
        qs = qs.filter(food_form=food_form)
    qs = qs.prefetch_related('offers')

    daily_kcal, pet_warning = _pet_daily_kcal(pet)

    matched = 0
    filtered_out = 0
    candidates = []
    for recipe in qs:
        matched += 1
        offer = _best_offer(recipe)
        if not offer:
            filtered_out += 1
            continue
        candidates.append(_build_candidate(recipe, offer, daily_kcal, pet_warning))

    candidates.sort(key=lambda c: (
        c['estimated_monthly_cost'] is None,
        c['estimated_monthly_cost'] if c['estimated_monthly_cost'] is not None else c['offer']['price'],
    ))

    return {
        'matched_recipes': matched,
        'filtered_out_no_offer': filtered_out,
        'daily_kcal': round(daily_kcal, 1) if daily_kcal else None,
        'pet_warning': pet_warning,
        'candidates': candidates[:limit],
    }
