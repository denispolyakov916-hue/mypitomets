from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0024_shop_schema_alignment"),
    ]

    operations = [
        migrations.RemoveField(model_name="product", name="group_id"),
        migrations.RemoveField(model_name="product", name="images"),
        migrations.RemoveField(model_name="product", name="vendor"),
        migrations.RemoveField(model_name="product", name="vendor_code"),
        migrations.RemoveField(model_name="product", name="barcode"),
        migrations.RemoveField(model_name="product", name="weight"),
        migrations.RemoveField(model_name="product", name="url"),
        migrations.RemoveField(model_name="product", name="animal"),
        migrations.RemoveField(model_name="product", name="category"),
        migrations.RemoveField(model_name="product", name="subcategory"),
        migrations.RemoveField(model_name="product", name="category_name"),
        migrations.RemoveField(model_name="product", name="in_stock"),
        migrations.RemoveField(model_name="product", name="stock_count"),
        migrations.RemoveField(model_name="product", name="discount_percent"),
        migrations.RemoveField(model_name="product", name="params"),
        migrations.RemoveField(model_name="product", name="kcal_per_100g"),
        migrations.RemoveField(model_name="product", name="nutrition_protein"),
        migrations.RemoveField(model_name="product", name="nutrition_fat"),
        migrations.RemoveField(model_name="product", name="nutrition_fiber"),
        migrations.RemoveField(model_name="product", name="nutrition_ash"),
        migrations.RemoveField(model_name="product", name="nutrition_moisture"),
        migrations.RemoveField(model_name="product", name="nutrition_calcium"),
        migrations.RemoveField(model_name="product", name="nutrition_phosphorus"),
        migrations.RemoveField(model_name="product", name="nutrition_omega3"),
        migrations.RemoveField(model_name="product", name="nutrition_omega6"),
        migrations.RemoveField(model_name="product", name="min_age_months"),
        migrations.RemoveField(model_name="product", name="max_age_months"),
        migrations.RemoveField(model_name="product", name="target_size"),
        migrations.RemoveField(model_name="product", name="compatibility_group"),
        migrations.RemoveField(model_name="product", name="brand_priority"),
        migrations.RemoveField(model_name="product", name="allergens"),
        migrations.RemoveField(model_name="product", name="health_conditions"),
    ]
