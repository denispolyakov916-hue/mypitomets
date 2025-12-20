"""
Полноценная админка для управления платежами.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Полноценная админка для управления платежами."""
    
    list_display = (
        'id', 'user_display', 'payment_type_display', 'amount_display', 
        'status_display', 'payment_method_display', 'created_at', 
        'completed_at'
    )
    list_filter = (
        'payment_type', 'status', 'payment_method', 
        'payment_gateway', 'created_at', 'completed_at'
    )
    search_fields = (
        'id', 'user__email', 'user__first_name', 'user__last_name',
        'external_payment_id', 'object_id', 'payment_gateway'
    )
    readonly_fields = (
        'id', 'created_at', 'updated_at', 'completed_at',
        'amount_display', 'status_display'
    )
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('id', 'user', 'payment_type', 'object_id')
        }),
        ('Финансовая информация', {
            'fields': ('amount', 'currency', 'amount_display', 'payment_method')
        }),
        ('Статус и обработка', {
            'fields': ('status', 'status_display', 'external_payment_id', 'payment_gateway', 'metadata')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = [
        'mark_as_completed', 'mark_as_cancelled', 
        'mark_as_failed', 'mark_as_refunded'
    ]
    
    def get_queryset(self, request):
        """Оптимизация запросов с использованием select_related для user."""
        qs = super().get_queryset(request)
        return qs.select_related('user')
    
    def user_display(self, obj):
        """Отображение пользователя с обработкой случая удалённого пользователя."""
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return format_html('<span style="color: gray;">Пользователь удалён</span>')
    user_display.short_description = 'Пользователь'
    user_display.admin_order_field = 'user__email'
    
    def payment_type_display(self, obj):
        """Отображение типа платежа с иконкой."""
        icons = {
            'shop_order': '🛒',
            'course': '📚',
            'subscription': '💳'
        }
        icon = icons.get(obj.payment_type, '💰')
        return format_html('{} {}', icon, obj.get_payment_type_display())
    payment_type_display.short_description = 'Тип платежа'
    payment_type_display.admin_order_field = 'payment_type'
    
    def amount_display(self, obj):
        """Отображение суммы с валютой."""
        return f"{obj.amount:.2f} {obj.currency}"
    amount_display.short_description = 'Сумма'
    
    def status_display(self, obj):
        """Отображение статуса с цветом."""
        colors = {
            'pending': 'orange',
            'processing': 'blue',
            'completed': 'green',
            'failed': 'red',
            'cancelled': 'gray',
            'refunded': 'purple'
        }
        color = colors.get(obj.status, 'black')
        icons = {
            'pending': '⏳',
            'processing': '🔄',
            'completed': '✅',
            'failed': '❌',
            'cancelled': '🚫',
            'refunded': '↩️'
        }
        icon = icons.get(obj.status, '')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} {}</span>',
            color, icon, obj.get_status_display()
        )
    status_display.short_description = 'Статус'
    status_display.admin_order_field = 'status'
    
    def payment_method_display(self, obj):
        """Отображение метода оплаты."""
        icons = {
            'card': '💳',
            'bank_transfer': '🏦',
            'cash': '💵',
            'digital_wallet': '📱'
        }
        icon = icons.get(obj.payment_method, '💰')
        return format_html('{} {}', icon, obj.get_payment_method_display())
    payment_method_display.short_description = 'Метод оплаты'
    
    def has_add_permission(self, request):
        """Запрещаем ручное создание платежей через админку."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Запрещаем удаление платежей через админку (для сохранения истории)."""
        return False
    
    def mark_as_completed(self, request, queryset):
        """Отметить платежи как завершённые."""
        from django.utils import timezone
        updated = queryset.filter(status__in=['pending', 'processing']).update(
            status='completed',
            completed_at=timezone.now()
        )
        self.message_user(request, f'Отмечено как завершённых: {updated} платежей')
    mark_as_completed.short_description = 'Отметить как завершённые'
    
    def mark_as_cancelled(self, request, queryset):
        """Отменить платежи."""
        updated = queryset.filter(status__in=['pending', 'processing']).update(status='cancelled')
        self.message_user(request, f'Отменено платежей: {updated}')
    mark_as_cancelled.short_description = 'Отменить платежи'
    
    def mark_as_failed(self, request, queryset):
        """Пометить как неудачные."""
        updated = queryset.filter(status__in=['pending', 'processing']).update(status='failed')
        self.message_user(request, f'Помечено как неудачных: {updated}')
    mark_as_failed.short_description = 'Пометить как неудачные'
    
    def mark_as_refunded(self, request, queryset):
        """Пометить как возвращённые."""
        updated = queryset.filter(status='completed').update(status='refunded')
        self.message_user(request, f'Помечено как возвращённых: {updated}')
    mark_as_refunded.short_description = 'Пометить как возвращённые'
