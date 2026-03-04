"""
Classify food products by age_group and size_group using names/metadata.
"""
from django.core.management.base import BaseCommand
from apps.shop.models import Product, FoodDetails


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
        details = getattr(product, "food_details", None)
        if details and details.target_size and details.target_size != "all":
            # Map target_size to size_group
            mapping = {
                "toy": "mini",
                "small": "small",
                "medium": "medium",
                "large": "large",
                "giant": "giant",
            }
            return mapping.get(details.target_size, "all")

        text = f"{product.name or ''} {product.description or ''}".lower()
        for size, keywords in self.SIZE_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                return size
        return "all"

    def handle(self, *args, **options):
        queryset = Product.objects.filter(product_group="food")

        to_update_products = []
        to_update_details = []
        for product in queryset.iterator():
            details, _ = FoodDetails.objects.get_or_create(product=product)
            updated = False
            if not product.age_group:
                product.age_group = self._detect_age_group(product)
                updated = True
            if details.age_min_months is None or details.age_max_months is None:
                age_group = product.age_group or "all"
                min_age, max_age = self._get_age_bounds(age_group)
                if details.age_min_months is None:
                    details.age_min_months = min_age
                    to_update_details.append(details)
                if details.age_max_months is None:
                    details.age_max_months = max_age
                    to_update_details.append(details)
            if not product.size_group:
                product.size_group = self._detect_size_group(product)
                updated = True
            if updated:
                to_update_products.append(product)

        if not to_update_products and not to_update_details:
            self.stdout.write(self.style.WARNING("No products needed updates."))
            return

        if to_update_products:
            Product.objects.bulk_update(
                to_update_products,
                ["age_group", "size_group"],
                batch_size=500,
            )
        if to_update_details:
            FoodDetails.objects.bulk_update(
                list({d.product_id: d for d in to_update_details}.values()),
                ["age_min_months", "age_max_months"],
                batch_size=500,
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Updated products: {len(to_update_products)}, food details: {len(to_update_details)}"
            )
        )
