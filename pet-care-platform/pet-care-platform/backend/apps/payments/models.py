"""
Модели для единой системы платежей

Единая точка входа для всех платежей на платформе Питомец+.

Поддерживаемые типы платежей:
- shop_order: оплата заказов товаров из магазина
- course: покупка образовательных курсов
- subscription: подписки (будущая функциональность)

API эндпоинты:
- POST /api/payments/create/ - создание платежа
- GET /api/payments/ - список платежей пользователя
- GET /api/payments/{id}/ - детали платежа
- POST /api/payments/{id}/confirm/ - подтверждение платежа
- POST /api/payments/{id}/cancel/ - отмена платежа
- GET /api/payments/statistics/ - статистика платежей

Интеграция:
- Магазин: OrderConfirmPaymentView использует PaymentService
- Курсы: CoursePurchaseView использует PaymentService
- Все платежи логируются и имеют полный аудит
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from core.utils import generate_uuid7


class Payment(models.Model):
    """
    Универсальная модель платежа для всех покупок на платформе.

    Поддерживает разные типы платежей:
    - shop_order: оплата заказа товаров
    - course: покупка курса
    - subscription: подписка (будущая функциональность)
    """

    PAYMENT_TYPE_CHOICES = [
        ('shop_order', 'Заказ товаров'),
        ('course', 'Покупка курса'),
        ('subscription', 'Подписка'),
        ('unified_checkout', 'Единый чек аут (товары + курсы)'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Ожидает оплаты'),
        ('processing', 'В обработке'),
        ('completed', 'Завершён'),
        ('failed', 'Неудачный'),
        ('cancelled', 'Отменён'),
        ('refunded', 'Возвращён'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('card', 'Банковская карта'),
        ('bank_transfer', 'Банковский перевод'),
        ('cash', 'Наличными'),
        ('digital_wallet', 'Электронный кошелёк'),
    ]

    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False,
        help_text="UUIDv7 идентификатор платежа"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name='Пользователь',
        help_text='Пользователь, совершивший платеж. Может быть NULL, если пользователь удалён.'
    )

    # Тип платежа и связанные объекты
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES,
        verbose_name='Тип платежа'
    )

    # ID связанного объекта (order.id, course.id и т.д.)
    object_id = models.CharField(
        max_length=36,
        verbose_name='ID объекта',
        help_text='ID связанного объекта (заказа, курса и т.д.)'
    )

    # Финансовая информация
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='Сумма платежа'
    )
    currency = models.CharField(
        max_length=3,
        default='RUB',
        verbose_name='Валюта'
    )

    # Статус и метод оплаты
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Статус платежа'
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default='card',
        verbose_name='Метод оплаты'
    )

    # Внешние данные (от платежного шлюза)
    external_payment_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Внешний ID платежа',
        help_text='ID платежа во внешней системе (ЮKassa, Stripe и т.д.)'
    )

    payment_gateway = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='Платёжный шлюз',
        help_text='Название платёжного шлюза (yookassa, stripe и т.д.)'
    )

    # Метаданные платежа
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Метаданные',
        help_text='Дополнительная информация о платеже'
    )

    # Даты
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Дата создания'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата завершения',
        help_text='Когда платеж был успешно завершён'
    )

    class Meta:
        db_table = 'payments'
        verbose_name = 'Платеж'
        verbose_name_plural = 'Платежи'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['payment_type', 'status']),
            models.Index(fields=['external_payment_id']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['-created_at']),  # Для запросов без фильтра по user
        ]

    def __str__(self):
        user_info = f" ({self.user.email})" if self.user else " (пользователь удалён)"
        return f"{self.get_payment_type_display()} {self.id} - {self.amount} {self.currency}{user_info}"

    def is_successful(self):
        """Проверка успешности платежа."""
        return self.status == 'completed'

    def is_pending(self):
        """Проверка ожидания платежа."""
        return self.status == 'pending'

    def can_be_cancelled(self):
        """Проверка возможности отмены платежа."""
        return self.status in ['pending', 'processing']

    def mark_as_completed(self, external_payment_id=None):
        """Отметить платеж как завершённый."""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if external_payment_id:
            self.external_payment_id = external_payment_id
        self.save()

    def mark_as_failed(self, reason=None):
        """Отметить платеж как неудачный."""
        self.status = 'failed'
        if reason:
            self.metadata = self.metadata or {}
            self.metadata['failure_reason'] = reason
        self.save()

    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': str(self.id),
            'user_id': str(self.user_id) if self.user_id else None,
            'payment_type': self.payment_type,
            'object_id': self.object_id,
            'amount': float(self.amount),
            'currency': self.currency,
            'status': self.status,
            'payment_method': self.payment_method,
            'external_payment_id': self.external_payment_id,
            'payment_gateway': self.payment_gateway,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }
