"""
P0 BUG 5 — исключение аллергенов в recipe-режиме подбора.

Проверяем единый источник правды (food_recipe_candidate_provider): при аллергии
«курица» НИ ОДИН вариант рациона (dry/wet/treat → значит и все ценовые варианты,
и набор в корзину) не должен содержать курицу в любой форме; матчинг робастный
(case-insensitive, RU+EN, основа слова). Если ничего не подходит — слот пустой,
а сервис отдаёт честное предупреждение.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.pets.models import Pet
from apps.pets.nutrition_models import Allergy, PetAllergy
from apps.pets.food_recipe_models import FoodRecipe, SupplierOffer
from apps.pets.allergen_matcher import (
    has_allergen_conflict,
    tokens_for_allergens,
    resolve_allergen_group,
)
from apps.pets.food_recipe_candidate_provider import select_ration


class AllergenMatcherUnitTests(TestCase):
    def test_chicken_label_resolves_and_matches_variants(self):
        # RU-метка квиза, display_name-предложение и EN-код → одна группа
        for raw in ['Курица', 'курица', 'Аллергия на курицу', 'dog_kurinyy_belok',
                    'chicken', 'chicken_protein', 'Куриный белок']:
            self.assertEqual(resolve_allergen_group(raw), 'chicken', raw)

    def test_matches_chicken_forms_ru_en(self):
        tokens = tokens_for_allergens(['Курица'])
        for txt in ['куриная грудка', 'Куриный жир', 'Chicken meal',
                    'dehydrated chicken', 'мука из мяса птицы', 'КУРИЦА']:
            self.assertTrue(has_allergen_conflict([txt], ['Курица']), txt)
        # Не ловим несвязанное
        self.assertFalse(has_allergen_conflict(['рис, индейка, лосось'], ['Курица']))

    def test_fish_and_dairy_groups(self):
        self.assertTrue(has_allergen_conflict(['Лосось свежий'], ['Рыба']))
        self.assertTrue(has_allergen_conflict(['salmon oil'], ['fish']))
        self.assertTrue(has_allergen_conflict(['сухое молоко'], ['Молочные продукты']))


@override_settings(FOOD_RECOMMENDATION_SOURCE='recipe')
class RecipeAllergenExclusionTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(email='u1@example.com', password='pass')
        self.pet = Pet.objects.create(
            owner=self.user, name='Барсик', species='dog',
            date_of_birth=date.today() - timedelta(days=int(24 * 30.4)),
            weight=10.0, size_category='medium',
        )
        allergy = Allergy.objects.create(
            code='dog_kurinyy_belok', animal_type='dog', allergen_type='Food',
            specific_allergen='Куриный белок', display_name='Аллергия на курицу',
        )
        PetAllergy.objects.create(pet=self.pet, allergy=allergy, is_active=True)

    def _recipe(self, *, name, form, ingredients, main_protein='', allergens=None,
                price='1000.00', weight_kg='3.000'):
        r = FoodRecipe.objects.create(
            name=name, brand='TestBrand', species='dog', food_form=form,
            life_stage='adult', kcal_per_100g='360.00', protein_percent='28.00',
            fat_percent='14.00', ingredients=ingredients, main_protein=main_protein,
            allergens=allergens or [], source='dinozavrik',
            review_status='manual_verified', is_recommendable=True,
            nutrition_complete=True,
        )
        SupplierOffer.objects.create(
            food_recipe=r, source='dinozavrik', article_number=f'art-{name}',
            price=price, package_weight_kg=weight_kg, in_stock=True,
        )
        return r

    def test_chicken_excluded_across_all_variants(self):
        # Куриные корма во всех формах (должны быть исключены везде)
        self._recipe(name='Dry Chicken', form='dry', main_protein='Курица',
                     ingredients=['куриная грудка', 'рис'])
        self._recipe(name='Dry ChickenMeal EN', form='dry',
                     ingredients=['Chicken meal', 'corn'], price='800.00')
        self._recipe(name='Wet Chicken', form='wet',
                     ingredients=['куриный жир', 'вода'])
        self._recipe(name='Treat Chicken', form='treat',
                     ingredients=['куриное филе'])
        # Безопасные корма (без курицы) в каждой форме
        safe_dry = self._recipe(name='Dry Lamb', form='dry', main_protein='Баранина',
                                ingredients=['баранина', 'рис'])
        safe_wet = self._recipe(name='Wet Fish', form='wet',
                                ingredients=['лосось', 'вода'])
        safe_treat = self._recipe(name='Treat Beef', form='treat',
                                  ingredients=['говядина'])

        ration = select_ration(self.pet, period_days=30)

        # Выбраны только безопасные кандидаты
        self.assertIsNotNone(ration['dry'])
        self.assertEqual(ration['dry']['recipe_id'], str(safe_dry.id))
        self.assertIsNotNone(ration['wet'])
        self.assertEqual(ration['wet']['recipe_id'], str(safe_wet.id))
        self.assertIsNotNone(ration['treat'])
        self.assertEqual(ration['treat']['recipe_id'], str(safe_treat.id))

        # Курицы нет НИГДЕ: основной выбор + все альтернативы, все формы
        for slot in ('dry', 'wet', 'treat'):
            picks = [ration[slot]] + list(ration.get(f'{slot}_alternatives') or [])
            for c in picks:
                if not c:
                    continue
                text = ' '.join([c.get('recipe_name') or '', c.get('main_protein') or '']
                                + (c.get('ingredients') or []) + (c.get('allergens') or []))
                self.assertFalse(has_allergen_conflict([text], ['Курица']),
                                 f'{slot}: курица протекла в {c.get("recipe_name")}')

        # Статистика исключения присутствует
        self.assertGreater(ration['dry_stats']['excluded_by_allergy'], 0)

    def test_only_chicken_available_yields_empty_slot(self):
        # Только куриные корма → после исключения слот пуст (честный отказ, не подмена)
        self._recipe(name='Dry Chicken Only', form='dry',
                     ingredients=['курица', 'рис'])
        ration = select_ration(self.pet, period_days=30)
        self.assertIsNone(ration['dry'])
        self.assertTrue(ration['has_allergens'])
        self.assertEqual(ration['dry_stats']['total'], 1)
        self.assertEqual(ration['dry_stats']['remaining'], 0)
