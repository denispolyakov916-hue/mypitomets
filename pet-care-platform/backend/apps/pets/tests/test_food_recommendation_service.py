from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.pets.food_recommendation_service import (
    food_recommendation_service, 
    FoodSearchFilters,
    RationBalancer,
    RationScore,
    OutputValidator,
    ration_balancer,
    output_validator,
)
from apps.pets.models import Pet
from apps.pets.nutrition_models import (
    Allergy,
    PetAllergy,
    HealthCondition,
    PetHealthCondition,
    PetFoodExclusion,
    SupplementRule,
)
from apps.shop.models import Category, Product, FoodDetails, ProductSKU


class FoodRecommendationServiceTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="u1", password="pass")

        # Категории для dry/wet
        self.cat_dry = Category.objects.create(
            name="Dry",
            slug="dry",
            code="food.dry",
        )
        self.cat_wet = Category.objects.create(
            name="Wet",
            slug="wet",
            code="food.wet",
        )

    def _create_pet(
        self,
        *,
        species="dog",
        age_months=24,
        size_category="medium",
        weight=10.0,
        sensitive_digestion=False,
    ) -> Pet:
        dob = date.today() - timedelta(days=int(age_months * 30.4))
        return Pet.objects.create(
            owner=self.user,
            name="Барсик",
            species=species,
            date_of_birth=dob,
            weight=weight,
            size_category=size_category,
            sensitive_digestion=sensitive_digestion,
        )

    def _create_food_product(
        self,
        *,
        name="Food",
        category: Category,
        animal_type="dog",
        price="1000.00",
        age_group="adult",
        is_hypoallergenic=False,
        is_veterinary=False,
        target_size="all",
        ingredients=None,
        allergens=None,
        compatibility_group="regular",
        energy_kcal_per_100g=350,
        protein=25,
        fat=12,
        fiber=3,
        sku_weights_kg=(3.0,),
        sku_weight_displays=None,
    ) -> Product:
        p = Product.objects.create(
            name=name,
            price=price,
            product_group="food",
            animal_type=animal_type,
            new_category=category,
            is_available=True,
            age_group=age_group,
            is_hypoallergenic=is_hypoallergenic,
            is_veterinary=is_veterinary,
        )
        FoodDetails.objects.create(
            product=p,
            product_type="food",
            target_size=target_size,
            is_hypoallergenic=is_hypoallergenic,
            is_veterinary=is_veterinary,
            compatibility_group=compatibility_group,
            ingredients=ingredients or [],
            allergens=allergens or [],
            energy_kcal_per_100g=energy_kcal_per_100g,
            protein_g_per_100g=protein,
            fat_g_per_100g=fat,
            fiber_g_per_100g=fiber,
        )
        if sku_weight_displays is None:
            sku_weight_displays = [f"{w:g} кг" for w in sku_weights_kg]
        for i, (w, wd) in enumerate(zip(sku_weights_kg, sku_weight_displays)):
            ProductSKU.objects.create(
                product=p,
                sku=f"sku-{p.id}-{i}",
                name=wd,
                price=price,
                available=True,
                weight_kg=w,
                weight_display=wd,
                is_default=(i == 0),
                sort_order=i + 1,
            )
        return p

    def test_food_allergy_requires_hypoallergenic(self):
        pet = self._create_pet(species="dog")

        # Пищевая аллергия
        allergy = Allergy.objects.create(
            code="dog_kurinyy_belok",
            animal_type="dog",
            allergen_type="Food",
            specific_allergen="Куриный белок",
            display_name="Аллергия на курицу",
        )
        PetAllergy.objects.create(pet=pet, allergy=allergy, is_active=True)

        # Не-гипо корм (должен быть исключён даже если не указан аллерген)
        self._create_food_product(
            name="Regular food",
            category=self.cat_dry,
            is_hypoallergenic=False,
            allergens=[],
            ingredients=["курица"],
        )
        # Гипо корм (допускается)
        hypo = self._create_food_product(
            name="Hypo food",
            category=self.cat_dry,
            is_hypoallergenic=True,
            allergens=[],
            ingredients=["рис"],
        )

        plan = food_recommendation_service.get_recommendations_for_pet(
            pet,
            FoodSearchFilters(food_type="dry", variant="basic", period_days=30),
        )
        self.assertTrue(plan.components)
        self.assertEqual(plan.components[0].product_id, hypo.id)

    def test_intolerance_is_hard_exclusion(self):
        pet = self._create_pet(species="dog")
        PetFoodExclusion.objects.create(
            pet=pet,
            ingredient_code="beef",
            ingredient_name="говядина",
            reason="intolerance",
        )

        bad = self._create_food_product(
            name="Beef food",
            category=self.cat_dry,
            ingredients=["говядина"],
            allergens=[],
        )
        good = self._create_food_product(
            name="Turkey food",
            category=self.cat_dry,
            ingredients=["индейка"],
            allergens=[],
        )

        plan = food_recommendation_service.get_recommendations_for_pet(
            pet,
            FoodSearchFilters(food_type="dry", variant="basic", period_days=30),
        )
        self.assertTrue(plan.components)
        self.assertEqual(plan.components[0].product_id, good.id)
        self.assertNotEqual(plan.components[0].product_id, bad.id)

    def test_contraindicated_ingredients_from_health_condition_are_hard_exclusion(self):
        pet = self._create_pet(species="dog")

        hc = HealthCondition.objects.create(
            code="urinary_test",
            name_ru="МКБ (тест)",
            species="both",
            category="urinary",
            coefficient_min=1.0,
            coefficient_max=1.0,
            priority="HIGH",
            direction="NEUTRAL",
            contraindicated_ingredients=["пурины"],
        )
        PetHealthCondition.objects.create(pet=pet, condition=hc, is_active=True)

        bad = self._create_food_product(
            name="Purine food",
            category=self.cat_dry,
            ingredients=["пурины"],
            allergens=[],
        )
        good = self._create_food_product(
            name="OK food",
            category=self.cat_dry,
            ingredients=["рис"],
            allergens=[],
        )

        plan = food_recommendation_service.get_recommendations_for_pet(
            pet,
            FoodSearchFilters(food_type="dry", variant="basic", period_days=30),
        )
        self.assertTrue(plan.components)
        self.assertEqual(plan.components[0].product_id, good.id)
        self.assertNotEqual(plan.components[0].product_id, bad.id)

    def test_size_mismatch_is_hard_exclusion_for_dogs(self):
        pet = self._create_pet(species="dog", size_category="medium")
        self._create_food_product(
            name="Large only",
            category=self.cat_dry,
            target_size="large",
            ingredients=["рис"],
            allergens=[],
        )
        ok = self._create_food_product(
            name="All sizes",
            category=self.cat_dry,
            target_size="all",
            ingredients=["рис"],
            allergens=[],
        )
        plan = food_recommendation_service.get_recommendations_for_pet(
            pet,
            FoodSearchFilters(food_type="dry", variant="basic", period_days=30),
        )
        self.assertTrue(plan.components)
        self.assertEqual(plan.components[0].product_id, ok.id)

    def test_guided_relax_price_only(self):
        pet = self._create_pet(species="dog")
        ok = self._create_food_product(
            name="Affordable",
            category=self.cat_dry,
            price="1000.00",
            ingredients=["рис"],
            allergens=[],
        )
        plan = food_recommendation_service.get_recommendations_for_pet(
            pet,
            FoodSearchFilters(food_type="dry", variant="basic", period_days=30, min_price="999999.00"),
        )
        self.assertTrue(plan.components)
        self.assertEqual(plan.components[0].product_id, ok.id)
        self.assertTrue(any("Ослаблен фильтр по цене" in w for w in plan.warnings))

    def test_packaging_optimizer_prefers_two_3kg_for_30_days(self):
        # Подбираем параметры, чтобы дневная порция была ~180-200г/день (тогда 2×3кг оптимально на 30 дней)
        pet = self._create_pet(species="dog", weight=8.0)
        pet.activity_level = "high"
        pet.save(update_fields=["activity_level"])
        product = self._create_food_product(
            name="Pack test",
            category=self.cat_dry,
            energy_kcal_per_100g=350,
            protein=25,
            fat=12,
            fiber=3,
            ingredients=["рис"],
            allergens=[],
            sku_weights_kg=(3.0, 12.0),
            sku_weight_displays=("3 кг", "12 кг"),
        )

        # форсируем daily_calories чтобы daily_grams вышло ~200г:
        # grams = (kcal / 350)*100 -> 200г => kcal ~700
        filters = FoodSearchFilters(food_type="dry", variant="basic", period_days=30)
        plan = food_recommendation_service.get_recommendations_for_pet(pet, filters)
        self.assertTrue(plan.components)
        comp = plan.components[0]
        # Проверяем, что мы действительно выбрали этот продукт (единственный доступный)
        self.assertEqual(comp.product_id, product.id)
        # Проверяем, что breakdown существует и выбрано 2×3кг (или эквивалент по weight_grams)
        self.assertTrue(comp.package_breakdown)
        three = next(
            (
                b for b in comp.package_breakdown
                if (b.get("weight_display") == "3 кг") or (int(b.get("weight_grams") or 0) == 3000)
            ),
            None,
        )
        self.assertIsNotNone(three)
        self.assertEqual(int(three.get("count") or 0), 2)


class RationBalancerTests(TestCase):
    """Тесты для RationBalancer."""

    def test_score_product_valid_kcal_and_bju(self):
        """Продукт с нормальными ккал и БЖУ должен быть valid."""
        # Mock product
        product = type('Product', (), {
            'food_details': type('FD', (), {
                'energy_kcal_per_100g': 350,
                'protein_g_per_100g': 28,
                'fat_g_per_100g': 15,
                'fiber_g_per_100g': 3,
                'moisture_percent': 10,
            })()
        })()

        macro_targets = {
            'protein': {'min': 25, 'max': 35},
            'fat': {'min': 12, 'max': 20},
            'fiber': {'min': 1, 'max': 5},
        }

        # 100g при 350 ккал/100г = 350 ккал
        score = ration_balancer.score_product(product, 350, macro_targets, 100)

        self.assertTrue(score.is_valid)
        self.assertLessEqual(abs(score.kcal_delta_pct), 15)
        self.assertGreater(score.total_score, 70)

    def test_score_product_invalid_kcal_high(self):
        """Продукт с калорийностью >15% от нормы должен быть invalid."""
        product = type('Product', (), {
            'food_details': type('FD', (), {
                'energy_kcal_per_100g': 400,
                'protein_g_per_100g': 30,
                'fat_g_per_100g': 15,
                'fiber_g_per_100g': 3,
                'moisture_percent': 10,
            })()
        })()

        macro_targets = {
            'protein': {'min': 25, 'max': 35},
            'fat': {'min': 12, 'max': 20},
            'fiber': {'min': 1, 'max': 5},
        }

        # 100g при 400 ккал/100г = 400 ккал, target = 300 => +33% delta
        score = ration_balancer.score_product(product, 300, macro_targets, 100)

        self.assertFalse(score.is_valid)
        self.assertGreater(score.kcal_delta_pct, 15)

    def test_score_product_protein_out_of_range(self):
        """Продукт с белком вне диапазона должен быть invalid."""
        product = type('Product', (), {
            'food_details': type('FD', (), {
                'energy_kcal_per_100g': 350,
                'protein_g_per_100g': 18,  # Низкий белок
                'fat_g_per_100g': 15,
                'fiber_g_per_100g': 3,
                'moisture_percent': 10,
            })()
        })()

        macro_targets = {
            'protein': {'min': 25, 'max': 35},  # 18% DM -> ниже 25
            'fat': {'min': 12, 'max': 20},
            'fiber': {'min': 1, 'max': 5},
        }

        score = ration_balancer.score_product(product, 350, macro_targets, 100)

        self.assertFalse(score.is_valid)
        self.assertTrue(any('Белок' in w for w in score.warnings))


class OutputValidatorTests(TestCase):
    """Тесты для OutputValidator."""

    def test_validate_normal_plan(self):
        """Нормальный план не должен иметь предупреждений."""
        # Mock plan
        plan = type('Plan', (), {
            'daily_calories': 500,
            'components': [
                type('Comp', (), {
                    'product_name': 'Test Food',
                    'daily_grams': 150,
                    'packages_needed': 2,
                })()
            ],
        })()

        warnings = output_validator.validate(plan)
        self.assertEqual(len(warnings), 0)

    def test_validate_extreme_calories(self):
        """Экстремальные калории должны генерировать предупреждение."""
        plan = type('Plan', (), {
            'daily_calories': 30,  # Ниже минимума 50
            'components': [],
        })()

        warnings = output_validator.validate(plan)
        self.assertGreater(len(warnings), 0)
        self.assertTrue(any('ниже минимума' in w for w in warnings))

    def test_validate_extreme_grams(self):
        """Экстремальные порции должны генерировать предупреждение."""
        plan = type('Plan', (), {
            'daily_calories': 500,
            'components': [
                type('Comp', (), {
                    'product_name': 'Test Food',
                    'daily_grams': 6000,  # Выше максимума 5000
                    'packages_needed': 2,
                })()
            ],
        })()

        warnings = output_validator.validate(plan)
        self.assertGreater(len(warnings), 0)
        self.assertTrue(any('выше максимума' in w for w in warnings))

    def test_clamp_value(self):
        """Метод clamp должен ограничивать значения."""
        self.assertEqual(output_validator.clamp_value(30, 'daily_kcal'), 50)
        self.assertEqual(output_validator.clamp_value(15000, 'daily_kcal'), 10000)
        self.assertEqual(output_validator.clamp_value(500, 'daily_kcal'), 500)


class SupplementRuleTests(TestCase):
    """Тесты для приоритетного подбора добавок."""

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="supp_test", password="pass")
        
        # Создаем правила добавок
        SupplementRule.objects.create(
            context_key='growth_puppy_early',
            context_type='growth',
            priority=1,
            scope='dog',
            supplement_type='calcium',
            reason_ru='Для роста костей',
            dosage_factor=1.0,
            age_from_months=0,
            age_to_months=4,
        )
        SupplementRule.objects.create(
            context_key='senior_dog',
            context_type='age',
            priority=1,
            scope='dog',
            supplement_type='joint',
            reason_ru='Поддержка суставов',
            dosage_factor=1.0,
            age_from_months=84,
        )
        SupplementRule.objects.create(
            context_key='lactation',
            context_type='reproductive',
            priority=0,
            scope='both',
            supplement_type='calcium',
            reason_ru='Критически важен при кормлении',
            dosage_factor=1.5,
        )

    def test_get_applicable_rules_puppy(self):
        """Щенок должен получить правила роста."""
        dob = date.today() - timedelta(days=60)  # 2 месяца
        pet = Pet.objects.create(
            owner=self.user,
            name="Puppy",
            species="dog",
            date_of_birth=dob,
            weight=3.0,
            size_category="small",
        )

        filters = FoodSearchFilters(
            species='dog',
            age_months=2,
            size_category='small',
        )

        rules = food_recommendation_service._get_applicable_supplement_rules(pet, filters)
        
        self.assertTrue(any(r.context_key == 'growth_puppy_early' for r in rules))

    def test_get_applicable_rules_senior(self):
        """Пожилая собака должна получить правила для senior."""
        dob = date.today() - timedelta(days=100 * 30)  # ~100 месяцев
        pet = Pet.objects.create(
            owner=self.user,
            name="Senior",
            species="dog",
            date_of_birth=dob,
            weight=15.0,
            size_category="medium",
        )

        filters = FoodSearchFilters(
            species='dog',
            age_months=100,
            size_category='medium',
        )

        rules = food_recommendation_service._get_applicable_supplement_rules(pet, filters)
        
        self.assertTrue(any(r.context_key == 'senior_dog' for r in rules))

    def test_lactation_has_highest_priority(self):
        """Правило лактации должно иметь приоритет 0."""
        dob = date.today() - timedelta(days=36 * 30)
        pet = Pet.objects.create(
            owner=self.user,
            name="LactatingDog",
            species="dog",
            date_of_birth=dob,
            weight=20.0,
            size_category="medium",
            reproductive_state="lactating",
        )

        filters = FoodSearchFilters(
            species='dog',
            age_months=36,
            size_category='medium',
        )

        rules = food_recommendation_service._get_applicable_supplement_rules(pet, filters)
        
        # Лактация должна быть в правилах
        lactation_rules = [r for r in rules if r.context_key == 'lactation']
        self.assertTrue(len(lactation_rules) > 0)
        self.assertEqual(lactation_rules[0].priority, 0)

