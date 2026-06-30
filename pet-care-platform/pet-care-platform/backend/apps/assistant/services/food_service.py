"""
Способность «Питание / корма»: объяснение рекомендаций существующего движка
подбора (``apps.pets.food_recipe_candidate_provider.select_ration``).

Ассистент НЕ ранжирует и НЕ выдумывает корма — он только поясняет уже подобранных
и медицински отфильтрованных кандидатов (аллергии — хард-блок, бизнес-влияние
≤30% внутри движка). Owner-scoped, как и здоровье.
"""

import logging

from core.exceptions import ApiError

from .prompts import FOOD_NOTE, build_system

logger = logging.getLogger('apps.assistant')

_INSTRUCTION = (
    'Способность: питание. В КОНТЕКСТЕ — уже подобранные и отфильтрованные по здоровью '
    'и аллергиям корма с порциями и ценами. Объясни рекомендацию простыми словами, '
    'НЕ придумывай других кормов и не меняй цифры. Напомни про постепенный перевод на '
    'новый корм.'
)


def _owned_pet(user, pet_id):
    from apps.pets.models import Pet
    try:
        return Pet.objects.get(id=pet_id, owner=user)
    except Pet.DoesNotExist:
        raise ApiError.not_found('Питомец не найден', error_code='PET_NOT_FOUND') from None


def _format_candidate(c) -> str | None:
    if not c:
        return None
    parts = [c.get('recipe_name') or 'корм']
    if c.get('brand'):
        parts.append(f'({c["brand"]})')
    if c.get('daily_grams'):
        parts.append(f'~{c["daily_grams"]} г/день')
    if c.get('estimated_monthly_cost'):
        parts.append(f'≈{c["estimated_monthly_cost"]} ₽/мес')
    line = ' '.join(parts)
    if c.get('recommendation_reason'):
        line += f' — {c["recommendation_reason"]}'
    return line


def build(user, message: str, pet_id) -> dict:
    pet = _owned_pet(user, pet_id)
    from apps.pets.food_recipe_candidate_provider import select_ration
    try:
        ration = select_ration(pet)
    except Exception as e:
        logger.error('[assistant] select_ration failed for pet %s: %s', pet_id, e)
        raise ApiError.internal_error(
            'Не удалось подобрать рацион. Попробуйте позже.',
            error_code='ASSISTANT_FOOD_ERROR',
        ) from e

    lines = []
    if ration.get('daily_kcal'):
        lines.append(f'Суточная норма: ~{ration["daily_kcal"]} ккал')
    for slot_key, slot_label in (('dry', 'Сухой корм'), ('wet', 'Влажный корм'),
                                 ('treat', 'Лакомство')):
        formatted = _format_candidate(ration.get(slot_key))
        if formatted:
            lines.append(f'{slot_label}: {formatted}')
    alts = [a for a in (_format_candidate(x) for x in (ration.get('dry_alternatives') or [])[:3]) if a]
    if alts:
        lines.append('Альтернативы (сухой): ' + '; '.join(alts))
    if not lines:
        lines.append('Подходящих кормов в базе пока не найдено.')
    context = '\n'.join(lines)

    system = build_system(_INSTRUCTION, context)
    sources = []
    for slot_key, slot_label in (('dry', 'Сухой'), ('wet', 'Влажный'), ('treat', 'Лакомство')):
        c = ration.get(slot_key)
        if c:
            sources.append({
                'type': 'food',
                'slot': slot_label,
                'label': c.get('recipe_name'),
                'recipe_id': c.get('recipe_id'),
            })
    return {'capability': 'food', 'system': system, 'sources': sources, 'disclaimer': FOOD_NOTE}
