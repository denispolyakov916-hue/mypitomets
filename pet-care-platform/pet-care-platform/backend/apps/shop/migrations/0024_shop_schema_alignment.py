from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0023_add_category_code'),
    ]

    operations = [
        migrations.AlterModelTable(
            name='product',
            table='shop_products',
        ),
        migrations.CreateModel(
            name='Attribute',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=100, unique=True, verbose_name='Код')),
                ('name', models.CharField(max_length=255, verbose_name='Название')),
                ('value_type', models.CharField(choices=[('string', 'Строка'), ('number', 'Число'), ('boolean', 'Булево'), ('enum', 'Перечисление')], max_length=20, verbose_name='Тип значения')),
                ('unit', models.CharField(blank=True, default='', max_length=50, verbose_name='Ед. измерения')),
                ('is_multi', models.BooleanField(default=False, verbose_name='Мультизначение')),
                ('is_filterable', models.BooleanField(default=True, verbose_name='Использовать в фильтрах')),
                ('is_active', models.BooleanField(default=True, verbose_name='Активно')),
            ],
            options={
                'db_table': 'shop_attributes',
                'ordering': ['name'],
                'verbose_name': 'Атрибут',
                'verbose_name_plural': 'Атрибуты',
            },
        ),
        migrations.CreateModel(
            name='AttributeValue',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.CharField(max_length=255, verbose_name='Значение')),
                ('display', models.CharField(blank=True, default='', max_length=255, verbose_name='Отображаемое значение')),
                ('sort_order', models.IntegerField(default=0, verbose_name='Порядок')),
                ('is_active', models.BooleanField(default=True, verbose_name='Активно')),
                ('attribute', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='values', to='shop.attribute', verbose_name='Атрибут')),
            ],
            options={
                'db_table': 'shop_attribute_values',
                'ordering': ['sort_order', 'id'],
                'verbose_name': 'Значение атрибута',
                'verbose_name_plural': 'Значения атрибутов',
                'unique_together': {('attribute', 'value')},
            },
        ),
        migrations.CreateModel(
            name='ProductCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='product_links', to='shop.category')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='extra_category_links', to='shop.product')),
            ],
            options={
                'db_table': 'shop_product_categories',
                'verbose_name': 'Связь товар-категория',
                'verbose_name_plural': 'Связи товар-категория',
                'unique_together': {('product', 'category')},
            },
        ),
        migrations.CreateModel(
            name='ProductImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url', models.TextField(verbose_name='URL изображения')),
                ('image_type', models.CharField(choices=[('main', 'Основное'), ('pack', 'Упаковка'), ('composition', 'Состав'), ('nutrition_table', 'Таблица нутриентов'), ('other', 'Другое')], default='other', max_length=30, verbose_name='Тип изображения')),
                ('sort_order', models.IntegerField(default=0, verbose_name='Порядок')),
                ('is_active', models.BooleanField(default=True, verbose_name='Активно')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='product_images', to='shop.product', verbose_name='Товар')),
                ('variant', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='variant_images', to='shop.productsku', verbose_name='Вариант (SKU)')),
            ],
            options={
                'db_table': 'shop_product_images',
                'ordering': ['sort_order', 'id'],
                'verbose_name': 'Изображение товара',
                'verbose_name_plural': 'Изображения товаров',
            },
        ),
        migrations.CreateModel(
            name='VariantAttributeValue',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('attribute_value', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='variant_links', to='shop.attributevalue')),
                ('variant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attribute_values', to='shop.productsku')),
            ],
            options={
                'db_table': 'shop_variant_attribute_values',
                'verbose_name': 'Значение атрибута SKU',
                'verbose_name_plural': 'Значения атрибутов SKU',
                'unique_together': {('variant', 'attribute_value')},
            },
        ),
    ]
