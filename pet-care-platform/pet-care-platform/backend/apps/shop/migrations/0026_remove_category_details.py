from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("shop", "0025_drop_legacy_product_fields"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="product",
            name="category_details",
        ),
    ]
