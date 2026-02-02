"""
Fill missing kcal/BJU values for food products.

Approximate values are used as placeholders when real data is missing.
"""
from django.core.management.base import BaseCommand
from django.db.models import Q

from apps.shop.models import Product


class Command(BaseCommand):
    help = "Fill missing kcal_per_100g and nutrition fields for food products"

    DEFAULTS = {
        "dry": {
            "kcal_per_100g": 380.0,
            "protein": 26.0,
            "fat": 14.0,
            "fiber": 3.0,
            "moisture": 10.0,
            "ash": 7.0,
            "calcium": 1.2,
            "phosphorus": 0.9,
            "omega3": 0.5,
            "omega6": 2.5,
        },
        "wet": {
            "kcal_per_100g": 95.0,
            "protein": 9.0,
            "fat": 5.0,
            "fiber": 1.0,
            "moisture": 78.0,
            "ash": 2.0,
            "calcium": 0.25,
            "phosphorus": 0.2,
            "omega3": 0.2,
            "omega6": 0.8,
        },
        "diet": {
            "kcal_per_100g": 300.0,
            "protein": 24.0,
            "fat": 10.0,
            "fiber": 5.0,
            "moisture": 10.0,
            "ash": 7.0,
            "calcium": 1.0,
            "phosphorus": 0.8,
            "omega3": 0.3,
            "omega6": 1.2,
        },
        "hypoallergenic": {
            "kcal_per_100g": 360.0,
            "protein": 25.0,
            "fat": 12.0,
            "fiber": 4.0,
            "moisture": 10.0,
            "ash": 7.0,
            "calcium": 1.1,
            "phosphorus": 0.9,
            "omega3": 0.4,
            "omega6": 1.8,
        },
        "holistic": {
            "kcal_per_100g": 400.0,
            "protein": 28.0,
            "fat": 16.0,
            "fiber": 3.0,
            "moisture": 10.0,
            "ash": 7.0,
            "calcium": 1.2,
            "phosphorus": 1.0,
            "omega3": 0.6,
            "omega6": 2.8,
        },
    }

    def _guess_bucket(self, product: Product) -> str:
        subcat = (product.subcategory or "").lower()
        name = (product.name or "").lower()

        if subcat in {"wet", "canned", "pouch", "pate"}:
            return "wet"
        if subcat in {"diet"}:
            return "diet"
        if subcat in {"hypoallergenic"}:
            return "hypoallergenic"
        if subcat in {"holistic"}:
            return "holistic"

        # Fallback by name keywords
        if any(k in name for k in ["пауч", "влажн", "консер", "паштет"]):
            return "wet"
        if any(k in name for k in ["диет", "light", "weight"]):
            return "diet"
        if "hypo" in name or "гипоаллер" in name:
            return "hypoallergenic"
        if "holistic" in name:
            return "holistic"

        return "dry"

    def handle(self, *args, **options):
        queryset = Product.objects.filter(
            Q(product_group="food")
            | Q(new_category__product_group="food")
            | Q(category="food")
        )

        to_update = []
        for product in queryset.iterator():
            bucket = self._guess_bucket(product)
            defaults = self.DEFAULTS[bucket]

            updated = False
            if product.kcal_per_100g is None:
                product.kcal_per_100g = defaults["kcal_per_100g"]
                updated = True
            if product.nutrition_protein is None:
                product.nutrition_protein = defaults["protein"]
                updated = True
            if product.nutrition_fat is None:
                product.nutrition_fat = defaults["fat"]
                updated = True
            if product.nutrition_fiber is None:
                product.nutrition_fiber = defaults["fiber"]
                updated = True
            if product.nutrition_moisture is None:
                product.nutrition_moisture = defaults["moisture"]
                updated = True
            if product.nutrition_ash is None:
                product.nutrition_ash = defaults["ash"]
                updated = True
            if product.nutrition_calcium is None:
                product.nutrition_calcium = defaults["calcium"]
                updated = True
            if product.nutrition_phosphorus is None:
                product.nutrition_phosphorus = defaults["phosphorus"]
                updated = True
            if product.nutrition_omega3 is None:
                product.nutrition_omega3 = defaults["omega3"]
                updated = True
            if product.nutrition_omega6 is None:
                product.nutrition_omega6 = defaults["omega6"]
                updated = True

            if updated:
                to_update.append(product)

        if not to_update:
            self.stdout.write(self.style.WARNING("No products needed updates."))
            return

        Product.objects.bulk_update(
            to_update,
            [
                "kcal_per_100g",
                "nutrition_protein",
                "nutrition_fat",
                "nutrition_fiber",
                "nutrition_moisture",
                "nutrition_ash",
                "nutrition_calcium",
                "nutrition_phosphorus",
                "nutrition_omega3",
                "nutrition_omega6",
            ],
            batch_size=500,
        )

        self.stdout.write(
            self.style.SUCCESS(f"Updated products: {len(to_update)}")
        )
