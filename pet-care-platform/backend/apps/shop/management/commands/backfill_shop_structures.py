"""
Backfill shop structures after schema alignment.

- Move legacy images JSON into shop_product_images
- Populate attributes / attribute values from SKU fields
- Recalculate denormalized counts
"""
import json

from django.core.management.base import BaseCommand
from django.db import connection
from django.db.models import Count

from apps.shop.models import (
    Product,
    ProductImage,
    ProductSKU,
    Attribute,
    AttributeValue,
    VariantAttributeValue,
    Category,
    Brand,
)


class Command(BaseCommand):
    help = "Backfill images, attributes, and denormalized counts for shop."

    def _ensure_attribute(self, code, name, value_type="string", unit=""):
        attr, _ = Attribute.objects.get_or_create(
            code=code,
            defaults={
                "name": name,
                "value_type": value_type,
                "unit": unit,
                "is_multi": False,
                "is_filterable": True,
                "is_active": True,
            },
        )
        return attr

    def _ensure_attr_value(self, attribute, value, display=""):
        if value is None or value == "":
            return None
        val, _ = AttributeValue.objects.get_or_create(
            attribute=attribute,
            value=str(value),
            defaults={
                "display": display or str(value),
                "is_active": True,
            },
        )
        return val

    def _link_variant_value(self, variant, attr_value):
        if not attr_value:
            return
        VariantAttributeValue.objects.get_or_create(
            variant=variant,
            attribute_value=attr_value,
        )

    def _backfill_images(self):
        self.stdout.write("Backfilling product images...")
        # Main image from image_url
        for product in Product.objects.exclude(image_url__isnull=True).exclude(image_url=""):
            exists = ProductImage.objects.filter(product=product, url=product.image_url).exists()
            if not exists:
                ProductImage.objects.create(
                    product=product,
                    url=product.image_url,
                    image_type="main",
                    sort_order=0,
                    is_active=True,
                )

        # Legacy JSON images from DB column "images" (may be removed after migration)
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id, images FROM shop_products WHERE images IS NOT NULL")
                rows = cursor.fetchall()
        except Exception:
            self.stdout.write(self.style.WARNING(
                "Legacy images column not found, skipping JSON images backfill."
            ))
            rows = []
        for product_id, images_json in rows:
            if not images_json:
                continue
            try:
                images = images_json if isinstance(images_json, list) else json.loads(images_json)
            except Exception:
                continue
            if not isinstance(images, list):
                continue
            product = Product.objects.filter(id=product_id).first()
            if not product:
                continue
            existing_urls = set(
                ProductImage.objects.filter(product=product).values_list("url", flat=True)
            )
            sort_order = ProductImage.objects.filter(product=product).count()
            for img in images:
                url = None
                if isinstance(img, str):
                    url = img
                elif isinstance(img, dict):
                    url = img.get("url")
                if not url or url in existing_urls:
                    continue
                ProductImage.objects.create(
                    product=product,
                    url=url,
                    image_type="other",
                    sort_order=sort_order,
                    is_active=True,
                )
                existing_urls.add(url)
                sort_order += 1

    def _backfill_attributes(self):
        self.stdout.write("Backfilling attributes from SKU fields...")
        attrs = {
            "flavor": self._ensure_attribute("flavor", "Вкус"),
            "size": self._ensure_attribute("size", "Размер"),
            "color": self._ensure_attribute("color", "Цвет"),
            "weight": self._ensure_attribute("weight", "Вес", value_type="number", unit="kg"),
            "volume": self._ensure_attribute("volume", "Объем", value_type="number", unit="ml"),
            "pack_quantity": self._ensure_attribute("pack_quantity", "Количество в упаковке", value_type="number"),
        }

        for sku in ProductSKU.objects.all().iterator():
            self._link_variant_value(
                sku,
                self._ensure_attr_value(attrs["flavor"], sku.flavor, sku.flavor_display),
            )
            size_display = getattr(sku, "size_display", "")
            size_value = sku.size_code or size_display
            self._link_variant_value(
                sku,
                self._ensure_attr_value(attrs["size"], size_value, size_display),
            )
            color_value = sku.color or sku.color_display
            self._link_variant_value(
                sku,
                self._ensure_attr_value(attrs["color"], color_value, sku.color_display),
            )
            if sku.weight_kg:
                self._link_variant_value(
                    sku,
                    self._ensure_attr_value(attrs["weight"], sku.weight_kg, sku.weight_display),
                )
            if sku.volume_ml:
                self._link_variant_value(
                    sku,
                    self._ensure_attr_value(attrs["volume"], sku.volume_ml, sku.volume_display),
                )
            if sku.pack_quantity:
                self._link_variant_value(
                    sku,
                    self._ensure_attr_value(attrs["pack_quantity"], sku.pack_quantity, str(sku.pack_quantity)),
                )

    def _backfill_denorms(self):
        self.stdout.write("Backfilling denormalized counts...")
        for category in Category.objects.all():
            category.product_count = Product.objects.filter(new_category=category, status=1).count()
            category.save(update_fields=["product_count"])

        for brand in Brand.objects.all():
            brand.product_count = Product.objects.filter(brand=brand, status=1).count()
            brand.save(update_fields=["product_count"])

        # SKU count on products
        sku_counts = ProductSKU.objects.values("product_id").annotate(cnt=Count("id"))
        counts_map = {row["product_id"]: row["cnt"] for row in sku_counts}
        products = Product.objects.filter(id__in=counts_map.keys())
        for product in products:
            product.sku_count = counts_map.get(product.id, 0)
        Product.objects.bulk_update(products, ["sku_count"])

    def handle(self, *args, **options):
        self._backfill_images()
        self._backfill_attributes()
        self._backfill_denorms()
        self.stdout.write(self.style.SUCCESS("Backfill complete."))
