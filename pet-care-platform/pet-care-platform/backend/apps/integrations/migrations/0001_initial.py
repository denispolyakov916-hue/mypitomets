import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models

import core.utils


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('pets', '0032_suppliercatalogsynclog_supplierproductsubmission_and_more'),
        ('shop', '0030_product_supplier_productsku_supplier_offer'),
    ]

    operations = [
        migrations.CreateModel(
            name='DistributorOrder',
            fields=[
                ('id', models.UUIDField(default=core.utils.generate_uuid7, editable=False, primary_key=True, serialize=False)),
                ('distributor_order_ref', models.CharField(blank=True, db_index=True, max_length=120, verbose_name='Номер заказа у поставщика')),
                ('status', models.CharField(choices=[('not_sent', 'Не отправлен'), ('pending_acceptance', 'Ожидает принятия'), ('accepted', 'Принят'), ('packed', 'Собран'), ('shipped', 'Отгружен'), ('delivered', 'Доставлен'), ('delivery_failed', 'Ошибка доставки'), ('cancelled', 'Отменён'), ('failed', 'Ошибка интеграции')], db_index=True, default='not_sent', max_length=30, verbose_name='Статус у поставщика')),
                ('last_event_id', models.CharField(blank=True, max_length=120, verbose_name='Последний event_id')),
                ('last_event_type', models.CharField(blank=True, max_length=80, verbose_name='Последнее событие')),
                ('tracking_number', models.CharField(blank=True, max_length=120, verbose_name='Трек-номер')),
                ('tracking_url', models.URLField(blank=True, max_length=500, verbose_name='Ссылка отслеживания')),
                ('attempts', models.PositiveIntegerField(default=0, verbose_name='Попыток отправки')),
                ('request_payload', models.JSONField(blank=True, default=dict, verbose_name='Последний исходящий payload')),
                ('response_payload', models.JSONField(blank=True, default=dict, verbose_name='Последний ответ поставщика')),
                ('last_error', models.TextField(blank=True, verbose_name='Последняя ошибка')),
                ('sent_at', models.DateTimeField(blank=True, null=True, verbose_name='Отправлен поставщику')),
                ('confirmed_at', models.DateTimeField(blank=True, null=True, verbose_name='Подтверждён поставщиком')),
                ('cancelled_at', models.DateTimeField(blank=True, null=True, verbose_name='Отменён')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now, verbose_name='Создано')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Обновлено')),
                ('order', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='distributor_sync', to='shop.order', verbose_name='Заказ Питомец+')),
                ('supplier', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='distributor_orders', to='pets.supplier', verbose_name='Поставщик')),
            ],
            options={
                'verbose_name': 'Заказ поставщика',
                'verbose_name_plural': 'Заказы поставщиков',
                'db_table': 'distributor_orders',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='DistributorInboundEvent',
            fields=[
                ('id', models.UUIDField(default=core.utils.generate_uuid7, editable=False, primary_key=True, serialize=False)),
                ('event_id', models.CharField(db_index=True, max_length=120, unique=True, verbose_name='ID события')),
                ('event_type', models.CharField(db_index=True, max_length=80, verbose_name='Тип события')),
                ('platform_order_id', models.CharField(db_index=True, max_length=36, verbose_name='ID заказа Питомец+')),
                ('request_id', models.CharField(blank=True, max_length=120, verbose_name='X-Request-ID')),
                ('occurred_at', models.DateTimeField(blank=True, null=True, verbose_name='Произошло у поставщика')),
                ('payload', models.JSONField(blank=True, default=dict, verbose_name='Payload')),
                ('response_payload', models.JSONField(blank=True, default=dict, verbose_name='Ответ')),
                ('status', models.CharField(choices=[('processed', 'Обработано'), ('failed', 'Ошибка'), ('duplicate', 'Дубль')], db_index=True, default='processed', max_length=20, verbose_name='Статус обработки')),
                ('error_code', models.CharField(blank=True, max_length=80, verbose_name='Код ошибки')),
                ('error_message', models.TextField(blank=True, verbose_name='Ошибка')),
                ('received_at', models.DateTimeField(default=django.utils.timezone.now, verbose_name='Получено')),
                ('processed_at', models.DateTimeField(blank=True, null=True, verbose_name='Обработано')),
                ('supplier', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='inbound_integration_events', to='pets.supplier', verbose_name='Поставщик')),
            ],
            options={
                'verbose_name': 'Входящее событие поставщика',
                'verbose_name_plural': 'Входящие события поставщиков',
                'db_table': 'distributor_inbound_events',
                'ordering': ['-received_at'],
            },
        ),
        migrations.AddIndex(
            model_name='distributororder',
            index=models.Index(fields=['supplier', 'status'], name='idx_dist_order_supplier_status'),
        ),
        migrations.AddIndex(
            model_name='distributororder',
            index=models.Index(fields=['order'], name='idx_dist_order_order'),
        ),
        migrations.AddIndex(
            model_name='distributorinboundevent',
            index=models.Index(fields=['supplier', 'event_type'], name='idx_dist_event_supplier_type'),
        ),
        migrations.AddIndex(
            model_name='distributorinboundevent',
            index=models.Index(fields=['platform_order_id', '-received_at'], name='idx_dist_event_order_time'),
        ),
    ]
