"""
Заявки на доступ к партнёрским кабинетам Питомец+.

Залогиненный пользователь может ЗАПРОСИТЬ доступ к кабинету партнёра:
  - поставщика корма (supplier) — привязка через SupplierUserAccess;
  - специалиста по курсам (course_specialist) — роль User.role == 'course_creator'.

Владелец платформы (is_superuser) рассматривает заявку и одобряет/отклоняет её.
Одобрение автоматически ВЫДАЁТ соответствующий доступ.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from core.constants import UserRole


class PartnerAccessRequest(models.Model):
    """Заявка пользователя на доступ к партнёрскому кабинету."""

    ROLE_SUPPLIER = 'supplier'
    ROLE_COURSE_SPECIALIST = 'course_specialist'
    REQUESTED_ROLE_CHOICES = [
        (ROLE_SUPPLIER, 'Поставщик корма'),
        (ROLE_COURSE_SPECIALIST, 'Специалист по курсам'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'На рассмотрении'),
        (STATUS_APPROVED, 'Одобрена'),
        (STATUS_REJECTED, 'Отклонена'),
    ]

    # Роль User, выдаваемая специалисту по курсам при одобрении.
    COURSE_SPECIALIST_USER_ROLE = UserRole.COURSE_CREATOR

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='partner_access_requests',
        verbose_name='Пользователь',
    )
    requested_role = models.CharField(
        'Запрашиваемый доступ',
        max_length=20,
        choices=REQUESTED_ROLE_CHOICES,
    )
    company_name = models.CharField('Название компании', max_length=255, blank=True)
    message = models.TextField('Сообщение', blank=True)
    status = models.CharField(
        'Статус',
        max_length=10,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )
    granted_supplier = models.ForeignKey(
        'pets.Supplier',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='access_requests',
        verbose_name='Выданный поставщик',
    )
    review_reason = models.CharField('Причина решения', max_length=500, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name='Рассмотрел',
    )
    reviewed_at = models.DateTimeField('Дата рассмотрения', null=True, blank=True)
    created_at = models.DateTimeField('Создана', auto_now_add=True)

    class Meta:
        db_table = 'partner_access_requests'
        verbose_name = 'Заявка на партнёрский доступ'
        verbose_name_plural = 'Заявки на партнёрский доступ'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'requested_role'],
                condition=models.Q(status='pending'),
                name='uniq_pending_partner_request_per_user_role',
            ),
        ]

    def __str__(self):
        return f'{self.user_id}:{self.requested_role} [{self.status}]'

    # ------------------------------------------------------------------ helpers

    @property
    def is_pending(self):
        return self.status == self.STATUS_PENDING

    @transaction.atomic
    def approve(self, reviewer, supplier=None):
        """
        Одобрить заявку и ВЫДАТЬ доступ.

        supplier-заявка → требуется Supplier (granted_supplier или переданный
        supplier); создаётся/активируется SupplierUserAccess(is_active=True).
        course_specialist-заявка → user.role = 'course_creator'.

        Идемпотентно: повторный approve не дублирует выдачу.
        """
        if self.status == self.STATUS_APPROVED:
            # Уже одобрена — повторно ничего не выдаём.
            return self

        if self.requested_role == self.ROLE_SUPPLIER:
            target_supplier = supplier or self.granted_supplier
            if target_supplier is None:
                raise ValidationError(
                    'Для заявки поставщика необходимо указать поставщика '
                    '(supplier_id) перед одобрением.'
                )
            self._grant_supplier_access(target_supplier)
            self.granted_supplier = target_supplier
        elif self.requested_role == self.ROLE_COURSE_SPECIALIST:
            self._grant_course_specialist_role()
        else:  # pragma: no cover - защита от рассинхрона choices
            raise ValidationError(f'Неизвестная роль заявки: {self.requested_role}')

        self.status = self.STATUS_APPROVED
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.save(update_fields=[
            'status', 'granted_supplier', 'reviewed_by', 'reviewed_at',
        ])
        return self

    def _grant_supplier_access(self, supplier):
        from apps.pets.models import SupplierUserAccess

        access, created = SupplierUserAccess.objects.get_or_create(
            user=self.user,
            supplier=supplier,
            defaults={'is_active': True},
        )
        if not created and not access.is_active:
            access.is_active = True
            access.save(update_fields=['is_active'])
        return access

    def _grant_course_specialist_role(self):
        user = self.user
        if user.role != self.COURSE_SPECIALIST_USER_ROLE:
            user.role = self.COURSE_SPECIALIST_USER_ROLE
            # User.save() сам синхронизирует is_staff/is_superuser; панель курсов
            # (IsAdminOrCourseCreator) пропускает по role == 'course_creator'
            # без is_staff, поэтому staff не требуется.
            user.save(update_fields=['role', 'is_staff', 'is_superuser'])
        return user

    @transaction.atomic
    def reject(self, reviewer, reason=''):
        """Отклонить заявку (без выдачи доступа)."""
        if self.status == self.STATUS_REJECTED:
            return self
        self.status = self.STATUS_REJECTED
        self.review_reason = reason or ''
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.save(update_fields=[
            'status', 'review_reason', 'reviewed_by', 'reviewed_at',
        ])
        return self
