"""
Read-only проверка провайдера кандидатов кормов (FoodRecipe + SupplierOffer).
НЕ финальный подбор — только обкатка нового источника данных.

    python manage.py inspect_food_recipe_candidates --pet-id <uuid>
    python manage.py inspect_food_recipe_candidates            # авто: один кот + одна собака
    python manage.py inspect_food_recipe_candidates --food-form dry --limit 5
"""

from django.core.management.base import BaseCommand

from apps.pets.models import Pet
from apps.pets.food_recipe_candidate_provider import get_food_recipe_candidates


class Command(BaseCommand):
    help = 'Показать кандидатов кормов из FoodRecipe/SupplierOffer (read-only)'

    def add_arguments(self, parser):
        parser.add_argument('--pet-id', type=str, default=None)
        parser.add_argument('--food-form', type=str, default=None, help='dry/wet/treat')
        parser.add_argument('--limit', type=int, default=10)

    def _pick_pets(self, pet_id):
        if pet_id:
            return list(Pet.objects.filter(id=pet_id))
        pets = []
        for sp in ('cat', 'dog'):
            p = Pet.objects.filter(species=sp, weight__isnull=False).first() or Pet.objects.filter(species=sp).first()
            if p:
                pets.append(p)
        return pets

    def handle(self, *args, **opts):
        w = self.stdout.write
        pets = self._pick_pets(opts['pet_id'])
        if not pets:
            w('Питомцы не найдены')
            return

        for pet in pets:
            res = get_food_recipe_candidates(pet, food_form=opts['food_form'], limit=opts['limit'])
            w('')
            w('=' * 64)
            w(f'Питомец: {pet.name} [{pet.species}] вес={pet.weight} | дневная норма={res["daily_kcal"]} ккал')
            if res['pet_warning']:
                w(f'  warning: {res["pet_warning"]}')
            w(f'Рецептов подходит: {res["matched_recipes"]} | отсеяно (нет валидного оффера): {res["filtered_out_no_offer"]} | кандидатов: {len(res["candidates"])}')
            w(f'--- топ-{opts["limit"]} кандидатов (сорт. по ₽/мес) ---')
            for i, c in enumerate(res['candidates'], 1):
                o = c['offer']
                w(f'{i:2}. {c["recipe_name"][:46]}  [{c["food_form"]}]')
                w(f'     ккал/100г={c["kcal_per_100g"]} белок={c["protein_percent"]} жир={c["fat_percent"]} полная_норма={c["nutrition_complete"]}')
                w(f'     оффер: {o["package_weight_kg"]}кг  цена={o["price"]}₽  АП%={o["agency_percent"]}  арт={o["article_number"]}')
                w(f'     daily_grams={c["daily_grams"]}  days_per_pack={c["days_per_pack"]}  packs_30={c["packs_for_30_days"]}  ₽/мес={c["estimated_monthly_cost"]}')
                if c['warnings']:
                    w(f'     warnings: {c["warnings"]}')
