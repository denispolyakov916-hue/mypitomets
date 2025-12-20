"""
Админ интерфейс для платежей
"""

from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Админ интерфейс для платежей."""

    list_display = [
        'id', 'user', 'payment_type', 'amount', 'currency',
        'status', 'payment_method', 'created_at', 'completed_at'
    ]

    list_filter = [
        'payment_type', 'status', 'payment_method',
        'payment_gateway', 'created_at', 'completed_at'
    ]

    search_fields = [
        'id', 'user__email', 'user__first_name', 'user__last_name',
        'external_payment_id', 'object_id'
    ]

    readonly_fields = [
        'id', 'created_at', 'updated_at', 'completed_at'
    ]

    fieldsets = (
        ('Основная информация', {
            'fields': ('id', 'user', 'payment_type', 'object_id')
        }),
        ('Финансовая информация', {
            'fields': ('amount', 'currency', 'payment_method')
        }),
        ('Статус и обработка', {
            'fields': ('status', 'external_payment_id', 'payment_gateway', 'metadata')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )

    def has_add_permission(self, request):
        """Запрещаем ручное создание платежей через админку."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Запрещаем удаление платежей через админку."""
        return False

    actions = ['mark_as_completed', 'mark_as_cancelled']

    def mark_as_completed(self, request, queryset):
        """Отметить платежи как завершённые."""
        updated = queryset.filter(status__in=['pending', 'processing']).update(status='completed')
        self.message_user(request, f'Отмечено как завершённых: {updated} платежей')
    mark_as_completed.short_description = 'Отметить как завершённые'

    def mark_as_cancelled(self, request, queryset):
        """Отменить платежи."""
        updated = queryset.filter(status__in=['pending', 'processing']).update(status='cancelled')
        self.message_user(request, f'Отменено платежей: {updated}')
    mark_as_cancelled.short_description = 'Отменить платежи'
