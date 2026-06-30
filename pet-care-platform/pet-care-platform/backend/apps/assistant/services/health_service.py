"""
Способность «Здоровье»: ответ с опорой на данные питомца ВЛАДЕЛЬЦА.

Строго owner-scoped: питомец грузится как ``Pet.objects.get(id=pet_id, owner=user)``,
чужой питомец → 404 (никаких чужих данных). Диагнозы не ставим — только пояснения
поверх уже имеющихся в профиле фактов + обязательный вет-дисклеймер.
"""

import logging

from core.exceptions import ApiError

from .prompts import HEALTH_DISCLAIMER, build_system

logger = logging.getLogger('apps.assistant')

_INSTRUCTION = (
    'Способность: здоровье. Ответь на вопрос владельца, опираясь на данные питомца из '
    'КОНТЕКСТА. Не ставь диагноз и не назначай лечение; при тревожных симптомах советуй '
    'обратиться к ветеринару.'
)

_SPECIES_RU = {'dog': 'собака', 'cat': 'кошка'}


def _owned_pet(user, pet_id):
    from apps.pets.models import Pet
    try:
        return Pet.objects.get(id=pet_id, owner=user)
    except Pet.DoesNotExist:
        raise ApiError.not_found('Питомец не найден', error_code='PET_NOT_FOUND') from None


def _pet_context_text(pet) -> str:
    lines = [f'Кличка: {pet.name}']
    lines.append(f'Вид: {_SPECIES_RU.get(pet.species, pet.species or "—")}')
    if pet.breed_id:
        lines.append(f'Порода: {getattr(pet.breed, "name", None) or "—"}')
    if pet.age_months is not None:
        lines.append(f'Возраст: ~{pet.age_months} мес. ({pet.age_category or "—"})')
    if pet.weight is not None:
        lines.append(f'Вес: {float(pet.weight)} кг')
    if pet.ideal_weight_kg:
        lines.append(f'Идеальный вес: {float(pet.ideal_weight_kg)} кг')
    if pet.body_condition_score:
        lines.append(f'Кондиция (BCS 1–9): {pet.body_condition_score}')
    lines.append(f'Стерилизован/кастрирован: {"да" if pet.is_neutered else "нет"}')

    conditions = []
    for pc in pet.pet_health_conditions.filter(is_active=True).select_related('condition'):
        name = getattr(pc.condition, 'name_ru', None) or str(pc.condition)
        sev = pc.get_severity_display() if pc.severity else ''
        tag = ' (породный риск)' if pc.is_breed_risk else ''
        conditions.append(f'{name}{" — " + sev if sev else ""}{tag}')
    lines.append('Активные заболевания: ' + (', '.join(conditions) if conditions else 'не указаны'))

    allergies = [
        getattr(pa.allergy, 'display_name', None) or str(pa.allergy)
        for pa in pet.pet_allergies.filter(is_active=True).select_related('allergy')
    ]
    lines.append('Аллергии: ' + (', '.join(allergies) if allergies else 'не указаны'))

    if pet.chronic_conditions_notes:
        lines.append(f'Заметки о здоровье: {pet.chronic_conditions_notes}')
    if pet.last_vet_visit:
        lines.append(f'Последний визит к ветеринару: {pet.last_vet_visit.isoformat()}')
    return '\n'.join(lines)


def build(user, message: str, pet_id) -> dict:
    pet = _owned_pet(user, pet_id)
    context = _pet_context_text(pet)
    system = build_system(_INSTRUCTION, context)
    sources = [{'type': 'pet', 'label': pet.name, 'pet_id': str(pet.id)}]
    return {'capability': 'health', 'system': system, 'sources': sources,
            'disclaimer': HEALTH_DISCLAIMER}
