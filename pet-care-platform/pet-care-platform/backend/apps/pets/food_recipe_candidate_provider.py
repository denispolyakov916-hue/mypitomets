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
        'life_stage': recipe.life_stage,
        'size_group': recipe.size_group,
        'diet_purpose': list(recipe.diet_purpose or []),
        'main_protein': recipe.main_protein,
        'allergens': list(recipe.allergens or []),
        'ingredients': list(recipe.ingredients or [])[:25],
        'review_status': recipe.review_status,
        'is_sterilized': recipe.is_sterilized,
        'is_sensitive_digestion': recipe.is_sensitive_digestion,
        'brand': recipe.brand,
        'business_priority': recipe.business_priority,
        'is_promoted': recipe.is_promoted,
        'customer_rating': float(recipe.customer_rating) if recipe.customer_rating is not None else None,
        'reviews_count': recipe.reviews_count,
        'expert_score': recipe.expert_score,
        'transition_message': recipe.transition_message or '',
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


# ============================================================
# Скоринг и единичный выбор рациона (recipe-режим)
# ============================================================

_HEALTH_KEYWORDS = [
    ('мочека', 'urinary'), ('мкб', 'urinary'), ('urinary', 'urinary'),
    ('почеч', 'renal'), ('renal', 'renal'),
    ('кож', 'skin'), ('шерст', 'skin'),
    ('печен', 'hepatic'), ('сустав', 'joints'), ('диабет', 'diabetes'),
]


def _pet_context(pet):
    """Контекст питомца для скоринга: ожидаемый life_stage, аллергены, диет-потребности."""
    species = getattr(pet, 'species', None)
    neutered = bool(getattr(pet, 'is_neutered', False))
    age_months = getattr(pet, 'age_months', None)

    expected_stage = None
    if age_months is not None:
        if species == 'cat':
            expected_stage = 'kitten' if age_months < 12 else ('senior' if age_months >= 120 else 'adult')
        else:
            expected_stage = 'puppy' if age_months < 12 else ('senior' if age_months >= 96 else 'adult')

    allergens = set()
    try:
        from .models import PetAllergy
        for pa in PetAllergy.objects.filter(pet=pet, is_active=True).select_related('allergy'):
            name = getattr(getattr(pa, 'allergy', None), 'display_name', None)
            if name:
                allergens.add(name.strip().lower())
    except Exception:  # noqa: BLE001
        pass

    needs = set()
    if getattr(pet, 'sensitive_digestion', False):
        needs.add('gi')
    try:
        from .models import PetHealthCondition
        for hc in PetHealthCondition.objects.filter(pet=pet, is_active=True).select_related('condition'):
            cond = getattr(hc, 'condition', None)
            text = ' '.join(filter(None, [
                getattr(cond, 'code', ''), getattr(cond, 'name', ''), getattr(cond, 'display_name', ''),
            ])).lower()
            for kw, purpose in _HEALTH_KEYWORDS:
                if kw in text:
                    needs.add(purpose)
    except Exception:  # noqa: BLE001
        pass

    return {'species': species, 'neutered': neutered, 'expected_stage': expected_stage,
            'allergens': allergens, 'needs': needs}


def suitability_score(cand, ctx):
    """Оценка кандидата 0..100 + причины. Возвращает (score, reasons, conflict)."""
    # Жёсткий конфликт по аллергии — кандидат исключается.
    allergy_text = ' '.join(
        [cand.get('main_protein') or ''] + (cand.get('allergens') or []) + (cand.get('ingredients') or [])
    ).lower()
    for a in ctx['allergens']:
        if a and a in allergy_text:
            return 0.0, [f'конфликт с аллергией: {a}'], True

    score = 50.0
    reasons = []

    if cand.get('nutrition_complete'):
        score += 15
        reasons.append('полные ккал+БЖУ')
    if cand.get('review_status') == 'manual_verified':
        score += 10
        reasons.append('проверено вручную')

    ls = (cand.get('life_stage') or '').lower()
    if ctx['expected_stage']:
        if ls in (ctx['expected_stage'], 'all', ''):
            score += 8
            if ls == ctx['expected_stage']:
                reasons.append('по возрасту')
        else:
            score -= 10

    if ctx['neutered'] and cand.get('is_sterilized'):
        score += 8
        reasons.append('для стерилизованных')

    matched = [n for n in ctx['needs'] if n in (cand.get('diet_purpose') or [])]
    if matched:
        score += min(12 * len(matched), 20)
        reasons.append('назначение: ' + ', '.join(matched))

    if cand.get('protein_percent') is not None and cand.get('fat_percent') is not None:
        score += 5

    dps = cand.get('days_per_pack')
    if dps is not None:
        if 7 <= dps <= 120:
            score += 5
            reasons.append('разумная фасовка')
        elif dps < 3 or dps > 200:
            score -= 8

    if not cand.get('warnings'):
        score += 3

    return round(max(0.0, min(100.0, score)), 1), reasons, False


def business_score(cand, brand_rules):
    """Бизнес-вес кандидата (RAW, до cap). (score, reasons). НЕ влияет на пригодность."""
    score = 0.0
    reasons = []
    bp = brand_rules.get((cand.get('brand') or '').strip().lower())
    if bp:
        score += bp
        reasons.append('бренд %+d' % bp)
    rp = cand.get('business_priority') or 0
    if rp:
        score += rp
        reasons.append('рецепт %+d' % rp)
    ap = (cand.get('offer') or {}).get('agency_percent')
    if ap:
        score += round(ap * 0.4, 1)
        reasons.append('АП %s%%' % ap)
    if cand.get('is_promoted'):
        score += 15
        reasons.append('продвигаемый')
    cr = cand.get('customer_rating')
    if cr is not None:
        score += round((cr - 3) * 4, 1)
    rc = cand.get('reviews_count') or 0
    if rc:
        score += min(rc * 0.1, 5)
    es = cand.get('expert_score')
    if es is not None:
        score += round((es - 50) * 0.2, 1)
    return round(score, 1), reasons


# Cap бизнес-влияния от suitability: бизнес НЕ может перебить пригодность (≈ ≤23% итога).
BUSINESS_CAP_RATIO = 0.30


def _rank_candidates(candidates, ctx, brand_rules):
    """Suitability (медицина) → conflict-исключение → business (с cap) → final.
    Возвращает ВЕСЬ отсортированный список (лучший первым). Бизнес НЕ перебивает пригодность."""
    scored = []
    for c in candidates:
        suit, reasons, conflict = suitability_score(c, ctx)
        if conflict:
            continue  # медицина/аллергия НЕ перебивается бизнесом
        c = dict(c)
        c['_suit'] = suit
        c['_reasons'] = reasons
        scored.append(c)
    if not scored:
        return []
    costs = sorted([c['estimated_monthly_cost'] for c in scored if c['estimated_monthly_cost'] is not None])
    median = costs[len(costs) // 2] if costs else None
    for c in scored:
        mc = c['estimated_monthly_cost']
        if median is not None and mc is not None and mc <= median:
            c['_suit'] = min(100.0, c['_suit'] + 4)
    for c in scored:
        biz_raw, biz_reasons = business_score(c, brand_rules)
        cap = max(5.0, round(BUSINESS_CAP_RATIO * c['_suit'], 1))
        biz_eff = max(-cap, min(cap, biz_raw))
        c['suitability_score'] = round(c['_suit'], 1)
        c['business_score_raw'] = biz_raw
        c['business_score'] = round(biz_eff, 1)
        c['final_score'] = round(c['_suit'] + biz_eff, 1)
        c['score'] = c['final_score']
        c['recommendation_reason'] = '; '.join(c['_reasons']) if c['_reasons'] else 'базовое соответствие'
        c['business_reasons'] = biz_reasons
    scored.sort(key=lambda c: (-c['final_score'], c['estimated_monthly_cost'] if c['estimated_monthly_cost'] is not None else float('inf')))
    return scored


def _load_brand_rules():
    rules = {}
    try:
        from .models import FoodBrandRule
        for r in FoodBrandRule.objects.filter(enabled=True):
            rules[(r.brand or '').strip().lower()] = r.priority
    except Exception:  # noqa: BLE001
        pass
    return rules


def shop_ids_for(recipe_id, offer_id):
    """Доджойнить покупаемые shop.Product/ProductSKU к рецепту/офферу.

    Возвращает (product_id, sku_id); любой None, если товар ещё не заведён в витрину.
    """
    from apps.shop.models import Product, ProductSKU
    product_id = None
    sku_id = None
    if recipe_id:
        product_id = (Product.objects.filter(food_recipe_id=recipe_id)
                      .values_list('id', flat=True).first())
    if offer_id:
        sku_id = (ProductSKU.objects.filter(supplier_offer_id=offer_id)
                  .values_list('id', flat=True).first())
    return product_id, sku_id


def candidate_to_dto(cand, share, mer, period_days):
    """Кандидат → полный DTO (для альтернатив): расчёт порции/дней/упаковок/стоимости по доле калорий."""
    off = cand['offer']
    kcal100 = cand['kcal_per_100g']
    pack_g = (off['package_weight_kg'] or 0) * 1000
    comp_kcal = (mer or 0) * share
    dg = round(comp_kcal / kcal100 * 100, 1) if (mer and kcal100) else None
    days = round(pack_g / dg, 1) if (dg and pack_g) else None
    packages = max(1, math.ceil(period_days * dg / pack_g)) if (dg and pack_g) else 1
    monthly = round(packages * off['price'], 2) if off.get('price') else None
    product_id, sku_id = shop_ids_for(cand['recipe_id'], off['id'])
    return {
        'recipe_id': cand['recipe_id'],
        'offer_id': off['id'],
        'product_id': product_id,
        'sku_id': sku_id,
        'article_number': off['article_number'],
        'brand': cand.get('brand'),
        'product_name': cand['recipe_name'],
        'source': 'dinozavrik',
        'food_form': cand['food_form'],
        'kcal_per_100g': kcal100,
        'protein_percent': cand.get('protein_percent'),
        'fat_percent': cand.get('fat_percent'),
        'daily_grams': dg,
        'days_supply': int(days) if days else None,
        'packages_needed': packages,
        'estimated_monthly_cost': monthly,
        'agency_percent': off.get('agency_percent'),
        'recommendation_reason': cand.get('recommendation_reason'),
        'transition_message': cand.get('transition_message') or None,
        'is_promoted': bool(cand.get('is_promoted')),
        'score_breakdown': {
            'suitability_score': cand.get('suitability_score'),
            'business_score': cand.get('business_score'),
            'final_score': cand.get('final_score'),
        },
    }


def select_ration(pet, period_days=30, max_alternatives=5):
    """Выбор рациона: лучший dry (+ wet) + до N альтернатив того же food_form из ТОГО ЖЕ скоринга."""
    ctx = _pet_context(pet)
    brand_rules = _load_brand_rules()
    dry_res = get_food_recipe_candidates(pet, food_form='dry', limit=500)
    wet_res = get_food_recipe_candidates(pet, food_form='wet', limit=500)
    treat_res = get_food_recipe_candidates(pet, food_form='treat', limit=500)
    dry_ranked = _rank_candidates(dry_res['candidates'], ctx, brand_rules)
    wet_ranked = _rank_candidates(wet_res['candidates'], ctx, brand_rules)
    treat_ranked = _rank_candidates(treat_res['candidates'], ctx, brand_rules)
    return {
        'dry': dry_ranked[0] if dry_ranked else None,
        'dry_alternatives': dry_ranked[1:1 + max_alternatives],
        'wet': wet_ranked[0] if wet_ranked else None,
        'wet_alternatives': wet_ranked[1:1 + max_alternatives],
        'treat': treat_ranked[0] if treat_ranked else None,
        'treat_alternatives': treat_ranked[1:1 + max_alternatives],
        'dry_count': len(dry_ranked),
        'wet_count': len(wet_ranked),
        'treat_count': len(treat_ranked),
        'daily_kcal': dry_res['daily_kcal'] or wet_res['daily_kcal'],
    }
