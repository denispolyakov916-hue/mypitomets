from django.db import models
from django.utils import timezone

from core.utils import generate_uuid7


class DistributorOrder(models.Model):
    """Состояние заказа во внешней системе поставщика."""

    STATUS_NOT_SENT = 'not_sent'
    STATUS_PENDING_ACCEPTANCE = 'pending_acceptance'
    STATUS_ACCEPTED = 'accepted'
    STATUS_PACKED = 'packed'
    STATUS_SHIPPED = 'shipped'
    STATUS_DELIVERED = 'delivered'
    STATUS_DELIVERY_FAILED = 'delivery_failed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_FAILED = 'failed'

    STATUSES = [
        (STATUS_NOT_SENT, 'Не отправлен'),
        (STATUS_PENDING_ACCEPTANCE, 'Ожидает принятия'),
        (STATUS_ACCEPTED, 'Принят'),
        (STATUS_PACKED, 'Собран'),
        (STATUS_SHIPPED, 'Отгружен'),
        (STATUS_DELIVERED, 'Доставлен'),
        (STATUS_DELIVERY_FAILED, 'Ошибка доставки'),
        (STATUS_CANCELLED, 'Отменён'),
        (STATUS_FAILED, 'Ошибка интеграции'),
    ]

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    supplier = models.ForeignKey(
        'pets.Supplier',
        on_delete=models.CASCADE,
        related_name='distributor_orders',
        verbose_name='Поставщик',
    )
    order = models.OneToOneField(
        'shop.Order',
        on_delete=models.CASCADE,
        related_name='distributor_sync',
        verbose_name='Заказ Питомец+',
    )
    distributor_order_ref = models.CharField('Номер заказа у поставщика', max_length=120, blank=True, db_index=True)
    status = models.CharField('Статус у поставщика', max_length=30, choices=STATUSES, default=STATUS_NOT_SENT, db_index=True)
    last_event_id = models.CharField('Последний event_id', max_length=120, blank=True)
    last_event_type = models.CharField('Последнее событие', max_length=80, blank=True)
    tracking_number = models.CharField('Трек-номер', max_length=120, blank=True)
    tracking_url = models.URLField('Ссылка отслеживания', max_length=500, blank=True)
    attempts = models.PositiveIntegerField('Попыток отправки', default=0)
    request_payload = models.JSONField('Последний исходящий payload', default=dict, blank=True)
    response_payload = models.JSONField('Последний ответ поставщика', default=dict, blank=True)
    last_error = models.TextField('Последняя ошибка', blank=True)
    sent_at = models.DateTimeField('Отправлен поставщику', null=True, blank=True)
    confirmed_at = models.DateTimeField('Подтверждён поставщиком', null=True, blank=True)
    cancelled_at = models.DateTimeField('Отменён', null=True, blank=True)
    created_at = models.DateTimeField('Создано', default=timezone.now)
    updated_at = models.DateTimeField('Обновлено', auto_now=True)

    class Meta:
        db_table = 'distributor_orders'
        verbose_name = 'Заказ поставщика'
        verbose_name_plural = 'Заказы поставщиков'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['supplier', 'status'], name='idx_dist_order_supplier_status'),
            models.Index(fields=['order'], name='idx_dist_order_order'),
        ]

    def __str__(self):
        return f'{self.supplier_id}:{self.order_id} [{self.status}]'


class DistributorInboundEvent(models.Model):
    """Журнал входящих webhook от Dinozavrik с дедупликацией по event_id."""

    STATUS_PROCESSED = 'processed'
    STATUS_FAILED = 'failed'
    STATUS_DUPLICATE = 'duplicate'

    STATUSES = [
        (STATUS_PROCESSED, 'Обработано'),
        (STATUS_FAILED, 'Ошибка'),
        (STATUS_DUPLICATE, 'Дубль'),
    ]

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    supplier = models.ForeignKey(
        'pets.Supplier',
        on_delete=models.CASCADE,
        related_name='inbound_integration_events',
        verbose_name='Поставщик',
    )
    event_id = models.CharField('ID события', max_length=120, unique=True, db_index=True)
    event_type = models.CharField('Тип события', max_length=80, db_index=True)
    platform_order_id = models.CharField('ID заказа Питомец+', max_length=36, db_index=True)
    request_id = models.CharField('X-Request-ID', max_length=120, blank=True)
    occurred_at = models.DateTimeField('Произошло у поставщика', null=True, blank=True)
    payload = models.JSONField('Payload', default=dict, blank=True)
    response_payload = models.JSONField('Ответ', default=dict, blank=True)
    status = models.CharField('Статус обработки', max_length=20, choices=STATUSES, default=STATUS_PROCESSED, db_index=True)
    error_code = models.CharField('Код ошибки', max_length=80, blank=True)
    error_message = models.TextField('Ошибка', blank=True)
    received_at = models.DateTimeField('Получено', default=timezone.now)
    processed_at = models.DateTimeField('Обработано', null=True, blank=True)

    class Meta:
        db_table = 'distributor_inbound_events'
        verbose_name = 'Входящее событие поставщика'
        verbose_name_plural = 'Входящие события поставщиков'
        ordering = ['-received_at']
        indexes = [
            models.Index(fields=['supplier', 'event_type'], name='idx_dist_event_supplier_type'),
            models.Index(fields=['platform_order_id', '-received_at'], name='idx_dist_event_order_time'),
        ]

    def __str__(self):
        return f'{self.event_id} [{self.event_type}]'
