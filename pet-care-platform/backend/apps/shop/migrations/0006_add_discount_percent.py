# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0005_order_delivery_cost_order_delivery_date_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='discount_percent',
            field=models.PositiveIntegerField(default=0, help_text='Процент скидки от 0 до 100', verbose_name='Скидка (%)'),
        ),
    ]

