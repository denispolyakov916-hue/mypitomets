from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0030_product_supplier_productsku_supplier_offer'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Ожидает оплаты'),
                    ('processing', 'В обработке'),
                    ('confirmed', 'Подтверждён поставщиком'),
                    ('packed', 'Собран'),
                    ('partially_delivered', 'Частично доставлен'),
                    ('shipped', 'Отправлен'),
                    ('delivered', 'Доставлен'),
                    ('delivery_failed', 'Ошибка доставки'),
                    ('cancelled', 'Отменён'),
                    ('expired', 'Истёк срок оплаты'),
                ],
                default='pending',
                max_length=20,
                verbose_name='Статус',
            ),
        ),
    ]
