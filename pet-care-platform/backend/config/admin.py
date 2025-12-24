"""
Конфигурация Django Admin с кастомными улучшениями.
"""

from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.utils import timezone
from datetime import timedelta


# Кастомизация главной страницы админки
admin.site.site_header = 'Питомец+ Администрирование'
admin.site.site_title = 'Питомец+ Админ'
admin.site.index_title = 'Управление платформой'


@admin.register(admin.models.LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    """Кастомная админка для логов действий."""

    list_display = (
        'action_time', 'user_link', 'content_type_link',
        'object_link', 'action_flag_display', 'change_message'
    )
    list_filter = ('action_flag', 'action_time', 'user', 'content_type')
    search_fields = ('user__email', 'object_repr', 'change_message')
    readonly_fields = ('action_time', 'user', 'content_type', 'object_id', 'object_repr', 'action_flag', 'change_message')
    ordering = ('-action_time',)

    def user_link(self, obj):
        """Ссылка на пользователя."""
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'System'
    user_link.short_description = 'Пользователь'
    user_link.admin_order_field = 'user__email'

    def content_type_link(self, obj):
        """Ссылка на тип контента."""
        if obj.content_type:
            return obj.content_type.name
        return '-'
    content_type_link.short_description = 'Модель'

    def object_link(self, obj):
        """Ссылка на объект."""
        if obj.content_type and obj.object_id:
            try:
                url = reverse(f'admin:{obj.content_type.app_label}_{obj.content_type.model}_change', args=[obj.object_id])
                return format_html('<a href="{}">{}</a>', url, obj.object_repr)
            except:
                return obj.object_repr
        return obj.object_repr
    object_link.short_description = 'Объект'

    def action_flag_display(self, obj):
        """Отображение типа действия."""
        flags = {
            1: ('Добавление', 'green'),
            2: ('Изменение', 'blue'),
            3: ('Удаление', 'red'),
        }
        flag_name, color = flags.get(obj.action_flag, ('Неизвестно', 'gray'))
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; '
            'border-radius: 12px; font-size: 11px;">{}</span>',
            color, flag_name
        )
    action_flag_display.short_description = 'Действие'


# Убираем стандартные приложения из индекса, если они не нужны
# admin.site.disable_action('delete_selected')

# Добавляем быстрые действия в контекст главной страницы
def admin_index_context(request):
    """Добавляем дополнительный контекст на главную страницу админки."""
    context = {}

    # Недавние действия
    recent_actions = admin.models.LogEntry.objects.select_related(
        'user', 'content_type'
    ).order_by('-action_time')[:10]

    # Статистика за сегодня
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)

    today_stats = {
        'users_registered': 0,  # Можно добавить подсчет новых пользователей
        'orders_created': 0,    # Можно добавить подсчет заказов
        'payments_processed': 0, # Можно добавить подсчет платежей
    }

    context.update({
        'recent_actions': recent_actions,
        'today_stats': today_stats,
        'today': today,
        'yesterday': yesterday,
    })

    return context


# Переопределяем get_app_list для добавления быстрых ссылок
original_get_app_list = admin.site.get_app_list

def custom_get_app_list(request, app_label=None):
    """Кастомный get_app_list с дополнительными быстрыми ссылками."""
    app_list = original_get_app_list(request, app_label)

    # Добавляем быстрые ссылки в начало
    quick_links = {
        'name': '🚀 Быстрые действия',
        'app_label': 'quick_actions',
        'app_url': '#',
        'has_module_perms': True,
        'models': [
            {
                'name': '📊 Перейти к дашборду',
                'object_name': 'Dashboard',
                'admin_url': '/admin/dashboard/',
                'view_only': True,
            },
            {
                'name': '📦 Заказы на обработку',
                'object_name': 'PendingOrders',
                'admin_url': '/admin/shop/order/?status__exact=pending',
                'view_only': True,
            },
            {
                'name': '💬 Отзывы на модерацию',
                'object_name': 'PendingReviews',
                'admin_url': '/admin/reviews/review/?is_approved__exact=0',
                'view_only': True,
            },
            {
                'name': '⚠️ Товары с низким остатком',
                'object_name': 'LowStock',
                'admin_url': '/admin/shop/product/?stock_count__lte=5&in_stock__exact=1',
                'view_only': True,
            },
        ]
    }

    app_list.insert(0, quick_links)
    return app_list

admin.site.get_app_list = custom_get_app_list
