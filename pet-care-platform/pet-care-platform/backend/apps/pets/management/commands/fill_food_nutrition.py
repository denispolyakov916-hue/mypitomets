"""
Fill missing kcal/BJU values for food products.

Approximate values are used as placeholders when real data is missing.
"""
from django.core.management.base import BaseCommand

from apps.shop.models import Product, FoodDetails


class Command(BaseCommand):
    help = "Fill missing nutrition fields for food products (FoodDetails)"

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
        subcat = (product.new_category.code if product.new_category else "").lower()
        name = (product.name or "").lower()

        if any(s in subcat for s in {"wet", "canned", "pouches", "pate"}):
            return "wet"
        if "diet" in subcat:
            return "diet"
        if "hypoallergenic" in subcat:
            return "hypoallergenic"
        if "holistic" in subcat:
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
        queryset = Product.objects.filter(product_group="food")

        to_update = []
        for product in queryset.iterator():
            bucket = self._guess_bucket(product)
            defaults = self.DEFAULTS[bucket]
            details, _ = FoodDetails.objects.get_or_create(product=product)

            updated = False
            if details.energy_kcal_per_100g is None:
                details.energy_kcal_per_100g = defaults["kcal_per_100g"]
                updated = True
            if details.protein_g_per_100g is None:
                details.protein_g_per_100g = defaults["protein"]
                updated = True
            if details.fat_g_per_100g is None:
                details.fat_g_per_100g = defaults["fat"]
                updated = True
            if details.fiber_g_per_100g is None:
                details.fiber_g_per_100g = defaults["fiber"]
                updated = True
            if details.moisture_percent is None:
                details.moisture_percent = defaults["moisture"]
                updated = True
            if details.ash_g_per_100g is None:
                details.ash_g_per_100g = defaults["ash"]
                updated = True

            if updated:
                to_update.append(details)

        if not to_update:
            self.stdout.write(self.style.WARNING("No products needed updates."))
            return

        FoodDetails.objects.bulk_update(
            to_update,
            [
                "energy_kcal_per_100g",
                "protein_g_per_100g",
                "fat_g_per_100g",
                "fiber_g_per_100g",
                "moisture_percent",
                "ash_g_per_100g",
            ],
            batch_size=500,
        )

        self.stdout.write(
            self.style.SUCCESS(f"Updated products: {len(to_update)}")
        )
