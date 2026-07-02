"""Sync магазина: available=True только у продаваемой фасовки.

Замечание ревью #2/#3: оффер in_stock=true без цены/веса не должен становиться
покупаемым SKU, а Product.is_available должен считаться по продаваемым офферам.
"""

from decimal import Decimal

from django.core.management import call_command
from django.test import TestCase

from apps.pets.food_recipe_models import FoodRecipe, Supplier, SupplierOffer
from apps.shop.models import Product, ProductSKU


class DinoSyncSellableTests(TestCase):
    def setUp(self):
        # «Динозаврик» сидируется миграцией; используем его (sync ищет по code).
        self.dino = Supplier.objects.get(code='dinozavrik')
        if not self.dino.is_active:
            self.dino.is_active = True
            self.dino.save(update_fields=['is_active'])

    def _recipe(self):
        return FoodRecipe.objects.create(
            name='Sync тест', species='cat', food_form='dry',
            kcal_per_100g=Decimal('380'), review_status='auto_parsed',
            is_recommendable=True, source='dinozavrik',
        )

    def _offer(self, recipe, article, **over):
        d = dict(supplier=self.dino, food_recipe=recipe, article_number=article,
                 package_name=article, price=Decimal('990'),
                 package_weight_kg=Decimal('2'), in_stock=True, source='dinozavrik')
        d.update(over)
        return SupplierOffer.objects.create(**d)

    def test_only_sellable_sku_is_available(self):
        rec = self._recipe()
        good = self._offer(rec, 'GOOD')
        bad = self._offer(rec, 'BAD', price=None, package_weight_kg=None)  # in_stock, но без цены/веса
        call_command('import_dinozavrik_to_shop')

        product = Product.objects.get(food_recipe=rec)
        self.assertTrue(product.is_available)  # есть хотя бы одна продаваемая фасовка

        sku_good = ProductSKU.objects.get(supplier_offer=good)
        sku_bad = ProductSKU.objects.get(supplier_offer=bad)
        self.assertTrue(sku_good.available)
        self.assertTrue(sku_good.is_sellable)
        self.assertFalse(sku_bad.available)     # нет цены/веса → не продаётся
        self.assertFalse(sku_bad.is_sellable)

    def test_product_unavailable_when_no_sellable_offer(self):
        rec = self._recipe()
        self._offer(rec, 'ONLYBAD', price=None, package_weight_kg=None)
        call_command('import_dinozavrik_to_shop')
        self.assertFalse(Product.objects.get(food_recipe=rec).is_available)
