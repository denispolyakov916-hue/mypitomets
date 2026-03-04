from __future__ import annotations

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.pets.calorie_calculator import calorie_calculator
from apps.pets.models import Pet
from apps.pets.nutrition_models import HealthCondition, PetHealthCondition, NutritionCoefficient, MacroTargetRule


class CalorieCalculatorTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(email="u1@example.com", password="pass")

    def _create_pet(
        self,
        *,
        species: str,
        weight: float,
        age_months: int | None = 24,
        is_neutered: bool = True,
        activity_level: str = "moderate",
        sex: str = "male",
        reproductive_state: str = "none",
        pregnancy_week: int | None = None,
        litter_size: int | None = None,
        body_condition_score: int | None = None,
        size_category: str | None = None,
    ) -> Pet:
        dob = None
        if age_months is not None:
            dob = date.today() - timedelta(days=int(age_months * 30.4))
        return Pet.objects.create(
            owner=self.user,
            name="TestPet",
            species=species,
            date_of_birth=dob,
            weight=weight,
            is_neutered=is_neutered,
            activity_level=activity_level,
            sex=sex,
            reproductive_state=reproductive_state,
            pregnancy_week=pregnancy_week,
            litter_size=litter_size,
            body_condition_score=body_condition_score,
            size_category=size_category,
        )

    def test_missing_weight_fails(self):
        p = Pet.objects.create(owner=self.user, name="NoWeight", species="dog", date_of_birth=date.today())
        res = calorie_calculator.calculate_daily_calories(p)
        self.assertEqual(res.calculation_method, "failed")
        self.assertTrue(any("Вес" in w for w in res.warnings))

    def test_activity_fallback_adds_warning_and_base_value(self):
        # Предполагаем пустую таблицу коэффициентов в тестовой БД → activity не найдется.
        p = self._create_pet(species="cat", weight=6.0, age_months=36, activity_level="moderate")
        res = calorie_calculator.calculate_daily_calories(p)
        ka = res.coefficients_applied.get("k_activity") or {}
        self.assertIn(ka.get("source"), ["base", "db"])
        if ka.get("source") == "base":
            self.assertAlmostEqual(float(ka["value"]), 1.2, places=3)
            self.assertTrue(any("актив" in w.lower() for w in res.warnings))

    def test_senior_threshold_uses_pet_age_category_for_cats(self):
        # В PetID: кошка senior с 10 лет, а раньше калькулятор считал senior уже с 7.
        # Проверяем, что 8-летняя кошка остаётся adult (k_base_source = adult).
        p = self._create_pet(species="cat", weight=6.0, age_months=96, is_neutered=True)
        self.assertEqual(p.age_category, "adult")
        res = calorie_calculator.calculate_daily_calories(p)
        self.assertEqual(res.coefficients_applied.get("k_base_source"), "neutering (adult)")

        # А 11-летняя кошка должна быть senior.
        p2 = self._create_pet(species="cat", weight=6.0, age_months=132, is_neutered=True)
        self.assertEqual(p2.age_category, "senior")
        res2 = calorie_calculator.calculate_daily_calories(p2)
        self.assertIn("senior", (res2.coefficients_applied.get("k_base_source") or ""))

    def test_bcs_caps_applied(self):
        p = self._create_pet(species="dog", weight=10.0, age_months=48, body_condition_score=9)
        res = calorie_calculator.calculate_daily_calories(p)
        self.assertIn("bcs_obese_8_9", res.coefficients_applied.get("caps_applied", []))
        ratio = float(res.coefficients_applied.get("mer_rer_ratio") or 0)
        self.assertGreaterEqual(ratio, 0.6)
        self.assertLessEqual(ratio, 0.8)
        self.assertTrue(any("BCS" in w for w in res.warnings))

    def test_caps_prevent_extremely_low_values(self):
        # BCS 9 должен ограничить MER/RER коридором 0.6-0.8.
        p = self._create_pet(
            species="dog",
            weight=45.0,
            age_months=156,
            is_neutered=True,
            activity_level="very_low",
            body_condition_score=9,
        )
        res = calorie_calculator.calculate_daily_calories(p)
        ratio = float(res.coefficients_applied.get("mer_rer_ratio") or 0)
        self.assertGreaterEqual(ratio, 0.6)
        self.assertLessEqual(ratio, 0.8)

    def test_growth_bcs_caps_do_not_drop_too_low(self):
        p = self._create_pet(
            species="cat",
            weight=3.0,
            age_months=6,
            is_neutered=False,
            activity_level="moderate",
            body_condition_score=9,
        )
        res = calorie_calculator.calculate_daily_calories(p)
        ratio = float(res.coefficients_applied.get("mer_rer_ratio") or 0)
        self.assertGreaterEqual(ratio, 1.2)

    def test_health_condition_priority_group_applied(self):
        # HIGH DECREASE 0.70 vs HIGH DECREASE 0.85 -> должен примениться min=0.70
        c1 = HealthCondition.objects.create(
            code="hc1",
            name_ru="Condition 1",
            category="metabolic",
            coefficient_min=0.70,
            coefficient_max=0.70,
            priority="HIGH",
            direction="DECREASE",
        )
        c2 = HealthCondition.objects.create(
            code="hc2",
            name_ru="Condition 2",
            category="metabolic",
            coefficient_min=0.85,
            coefficient_max=0.85,
            priority="HIGH",
            direction="DECREASE",
        )
        p = self._create_pet(species="dog", weight=10.0, age_months=48)
        PetHealthCondition.objects.create(pet=p, condition=c1, is_active=True)
        PetHealthCondition.objects.create(pet=p, condition=c2, is_active=True)

        res = calorie_calculator.calculate_daily_calories(p)
        self.assertAlmostEqual(float(res.coefficients_applied.get("k_health", 1.0)), 0.7, places=2)

    def test_reproductive_requires_female_and_not_neutered(self):
        p = self._create_pet(
            species="dog",
            weight=12.0,
            age_months=36,
            sex="female",
            is_neutered=False,
            reproductive_state="pregnant",
            pregnancy_week=6,
        )
        res = calorie_calculator.calculate_daily_calories(p)
        # просто проверяем, что коэффициент репродукции применён (в виде числа в coefficients_applied)
        self.assertIn("k_reproductive", res.coefficients_applied)

    def test_critical_disease_caps_apply(self):
        c1 = HealthCondition.objects.create(
            code="crit1",
            name_ru="Critical Condition",
            category="metabolic",
            coefficient_min=1.5,
            coefficient_max=1.5,
            priority="CRITICAL",
            direction="INCREASE",
        )
        p = self._create_pet(species="dog", weight=12.0, age_months=36)
        PetHealthCondition.objects.create(pet=p, condition=c1, is_active=True)
        res = calorie_calculator.calculate_daily_calories(p)
        self.assertIn("critical_disease", res.coefficients_applied.get("caps_applied", []))
        ratio = float(res.coefficients_applied.get("mer_rer_ratio") or 0)
        self.assertGreaterEqual(ratio, 1.0)
        self.assertLessEqual(ratio, 1.2)

    def test_secondary_activity_adjustment_is_limited(self):
        NutritionCoefficient.objects.create(
            species="dog",
            coefficient_type="activity_level",
            code="dog_very_high",
            name_ru="Очень высокая",
            coefficient=2.0,
        )
        p = self._create_pet(species="dog", weight=20.0, age_months=36, activity_level="very_high")
        res = calorie_calculator.calculate_daily_calories(p)
        adjustments = res.coefficients_applied.get("secondary_adjustments", [])
        activity_adj = next((a for a in adjustments if a.get("key") == "activity"), None)
        self.assertIsNotNone(activity_adj)
        self.assertLessEqual(float(activity_adj["applied_multiplier"]), 1.15)

    def test_top_influences_present(self):
        p = self._create_pet(species="cat", weight=5.0, age_months=24)
        res = calorie_calculator.calculate_daily_calories(p)
        self.assertTrue(isinstance(res.top_influences, list))
        self.assertGreaterEqual(len(res.top_influences), 1)

    # ========== Macro Targets Tests ==========

    def test_macro_targets_returns_dict_with_protein_fat_fiber(self):
        p = self._create_pet(species="dog", weight=15.0, age_months=36)
        res = calorie_calculator.calculate_daily_calories(p)
        mt = res.macro_targets
        self.assertIsNotNone(mt)
        self.assertIn("protein", mt)
        self.assertIn("fat", mt)
        self.assertIn("fiber", mt)
        self.assertIn("min", mt["protein"])
        self.assertIn("max", mt["protein"])

    def test_macro_targets_dm_returns_dict(self):
        p = self._create_pet(species="cat", weight=5.0, age_months=24)
        res = calorie_calculator.calculate_daily_calories(p)
        mt_dm = res.macro_targets_dm
        self.assertIsNotNone(mt_dm)
        self.assertIn("protein", mt_dm)

    def test_macro_targets_priority_disease_over_baseline(self):
        MacroTargetRule.objects.create(
            context_key="test_disease_macro",
            context_type="disease",
            priority=0,
            scope="both",
            protein_min=50,
            protein_max=60,
            fat_min=5,
            fat_max=10,
            fiber_min=10,
            fiber_max=15,
        )
        c = HealthCondition.objects.create(
            code="test_disease_macro",
            name_ru="Test Disease",
            category="metabolic",
            coefficient_min=1.0,
            coefficient_max=1.0,
            priority="HIGH",
            direction="NEUTRAL",
        )
        p = self._create_pet(species="dog", weight=20.0, age_months=48)
        PetHealthCondition.objects.create(pet=p, condition=c, is_active=True)
        res = calorie_calculator.calculate_daily_calories(p)
        mt = res.macro_targets_dm
        self.assertEqual(mt.get("_source"), "test_disease_macro")
        self.assertEqual(mt["protein"]["min"], 50)

    def test_macro_targets_senior_cat_high_protein(self):
        MacroTargetRule.objects.create(
            context_key="senior_cat",
            context_type="age",
            priority=5,
            scope="cat",
            protein_min=38,
            protein_max=52,
            fat_min=15,
            fat_max=28,
            fiber_min=2,
            fiber_max=8,
            age_from_months=120,
            age_to_months=180,
        )
        p = self._create_pet(species="cat", weight=5.0, age_months=130)
        res = calorie_calculator.calculate_daily_calories(p)
        mt = res.macro_targets_dm
        self.assertEqual(mt.get("_source"), "senior_cat")
        self.assertGreaterEqual(mt["protein"]["min"], 38)

    def test_macro_targets_growth_kitten(self):
        MacroTargetRule.objects.create(
            context_key="growth_early_cat",
            context_type="growth",
            priority=4,
            scope="cat",
            protein_min=40,
            protein_max=55,
            fat_min=20,
            fat_max=35,
            fiber_min=1,
            fiber_max=4,
            age_from_months=0,
            age_to_months=4,
        )
        p = self._create_pet(species="cat", weight=1.5, age_months=3)
        res = calorie_calculator.calculate_daily_calories(p)
        mt = res.macro_targets_dm
        self.assertEqual(mt.get("_source"), "growth_early_cat")
        self.assertGreaterEqual(mt["protein"]["min"], 40)

    def test_macro_targets_fallback_when_db_empty(self):
        # Очищаем все правила
        MacroTargetRule.objects.all().delete()
        p = self._create_pet(species="dog", weight=10.0, age_months=36)
        res = calorie_calculator.calculate_daily_calories(p)
        mt = res.macro_targets_dm
        self.assertEqual(mt.get("_source"), "fallback")
        self.assertIn("protein", mt)

