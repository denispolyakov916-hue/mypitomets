import os
import sys
import django

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
sys.path.append(BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db.models import Count
from apps.shop.models import Product


def main():
    groups = [
        "food",
        "treats",
        "vitamins",
        "vet",
        "clothes",
        "equipment",
        "grooming",
        "toys",
    ]

    for group in groups:
        qs = (
            Product.objects.filter(product_group=group)
            .annotate(sku_total=Count("skus"))
            .filter(sku_total__gt=1)
            .select_related("new_category")[:3]
        )
        if not qs:
            continue
        print(f"\n## {group}")
        for p in qs:
            category = p.category_name or (p.new_category.name if p.new_category else None)
            print(
                f"- {p.id} | {p.name[:80]} | {p.animal_type} | {category} | {p.subcategory} | /shop/products/{p.id}"
            )


if __name__ == "__main__":
    main()
