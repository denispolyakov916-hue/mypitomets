"""
Classify food products by age_group and size_group using names/metadata.
"""
from django.core.management.base import BaseCommand
from django.db.models import Q

from apps.shop.models import Product


class Command(BaseCommand):
    help = "Fill missing age_group and size_group for food products"

    AGE_KEYWORDS = {
        "puppy": ["puppy", "щен", "junior"],
        "kitten": ["kitten", "котен", "котён", "kitten"],
        "senior": ["senior", "mature", "пожил", "старш", "aged", "7+"],
        "adult": ["adult", "взросл"],
    }

    SIZE_KEYWORDS = {
        "mini": ["mini", "мини", "toy", "x-small", "xs"],
        "small": ["small", "мал", "мелк", "s "],
        "medium": ["medium", "средн", "m "],
        "large": ["large", "крупн", "l "],
        "giant": ["giant", "гигант", "xxl", "xl ", "extra large"],
    }

    def _detect_age_group(self, product: Product) -> str:
        text = f"{product.name or ''} {product.description or ''}".lower()
        # Species-specific puppy/kitten
        if product.animal_type == "cat":
            for kw in self.AGE_KEYWORDS["kitten"]:
                if kw in text:
                    return "kitten"
        if product.animal_type == "dog":
            for kw in self.AGE_KEYWORDS["puppy"]:
                if kw in text:
                    return "puppy"
        # General senior/adult
        for kw in self.AGE_KEYWORDS["senior"]:
            if kw in text:
                return "senior"
        for kw in self.AGE_KEYWORDS["adult"]:
            if kw in text:
                return "adult"
        return "all"

    def _get_age_bounds(self, age_group: str) -> tuple[int, int]:
        if age_group == "puppy" or age_group == "kitten":
            return 0, 12
        if age_group == "adult":
            return 12, 84
        if age_group == "senior":
            return 84, 999
        return 0, 999

    def _detect_size_group(self, product: Product) -> str:
        if product.target_size and product.target_size != "all":
            # Map target_size to size_group
            mapping = {
                "toy": "mini",
                "small": "small",
                "medium": "medium",
                "large": "large",
                "giant": "giant",
            }
            return mapping.get(product.target_size, "all")

        text = f"{product.name or ''} {product.description or ''}".lower()
        for size, keywords in self.SIZE_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                return size
        return "all"

    def handle(self, *args, **options):
        queryset = Product.objects.filter(
            Q(product_group="food")
            | Q(new_category__product_group="food")
            | Q(category="food")
        )

        to_update = []
        for product in queryset.iterator():
            updated = False
            if not product.age_group:
                product.age_group = self._detect_age_group(product)
                updated = True
            if product.min_age_months is None or product.max_age_months is None:
                age_group = product.age_group or "all"
                min_age, max_age = self._get_age_bounds(age_group)
                if product.min_age_months is None:
                    product.min_age_months = min_age
                    updated = True
                if product.max_age_months is None:
                    product.max_age_months = max_age
                    updated = True
            if not product.size_group:
                product.size_group = self._detect_size_group(product)
                updated = True
            if updated:
                to_update.append(product)

        if not to_update:
            self.stdout.write(self.style.WARNING("No products needed updates."))
            return

        Product.objects.bulk_update(
            to_update,
            ["age_group", "size_group", "min_age_months", "max_age_months"],
            batch_size=500,
        )

        self.stdout.write(
            self.style.SUCCESS(f"Updated products: {len(to_update)}")
        )
