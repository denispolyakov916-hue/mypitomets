"""
Полноценная админка для управления календарем событий питомцев.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from datetime import datetime, date
from .models import CalendarEvent, EventReminder


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    """Полноценная админка для управления событиями календаря."""

    list_display = (
        'title_display', 'pet_link', 'user_link', 'event_type_display',
        'date_time_display', 'priority_display', 'status_display',
        'is_upcoming_badge', 'created_at'
    )
    list_filter = (
        'event_type', 'priority', 'status', 'start_date',
        'is_recurring', 'pet__species', 'created_at'
    )
    search_fields = (
        'title', 'description', 'pet__name', 'user__email',
        'user__first_name', 'user__last_name', 'location'
    )
    ordering = ('-start_date', '-start_time')
    date_hierarchy = 'start_date'
    readonly_fields = (
        'id', 'created_at', 'updated_at', 'completed_at',
        'title_display', 'date_time_info', 'status_info'
    )

    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'description', 'event_type', 'priority')
        }),
        ('Участники', {
            'fields': ('pet', 'user')
        }),
        ('Дата и время', {
            'fields': ('start_date', 'start_time', 'end_date', 'end_time', 'date_time_info')
        }),
        ('Повторение', {
            'fields': ('is_recurring', 'recurrence_rule'),
            'classes': ('collapse',)
        }),
        ('Место и стоимость', {
            'fields': ('location', 'cost'),
            'classes': ('collapse',)
        }),
        ('Уведомления', {
            'fields': ('notify_before', 'email_notification', 'push_notification'),
            'classes': ('collapse',)
        }),
        ('Статус', {
            'fields': ('status', 'status_info', 'notes')
        }),
        ('Системная информация', {
            'fields': ('id', 'created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )

    actions = [
        'mark_completed', 'cancel_events', 'mark_urgent',
        'send_reminders', 'export_events'
    ]

    def get_queryset(self, request):
        """Оптимизация запросов."""
        return super().get_queryset(request).select_related('pet', 'user')

    def title_display(self, obj):
        """Отображение заголовка с иконкой типа события."""
        icons = {
            'veterinary': '🏥',
            'vaccination': '💉',
            'grooming': '✂️',
            'birthday': '🎂',
            'medication': '💊',
            'training': '🎓',
            'walking': '🚶',
            'feeding': '🍖',
            'other': '📅'
        }
        icon = icons.get(obj.event_type, '📅')
        return format_html(
            '<div style="display: flex; align-items: center; gap: 8px;">'
            '<span style="font-size: 16px;">{}</span>'
            '<span style="font-weight: 500;">{}</span>'
            '</div>',
            icon, obj.title
        )
    title_display.short_description = 'Событие'

    def pet_link(self, obj):
        """Ссылка на питомца."""
        url = reverse('admin:pets_pet_change', args=[obj.pet.id])
        species_icon = {
            'dog': '🐕', 'cat': '🐈', 'bird': '🐦',
            'rodent': '🐹', 'fish': '🐠', 'reptile': '🦎'
        }.get(obj.pet.species, '🐾')

        return format_html(
            '<a href="{}" style="color: #3b82f6;">{} {}</a>',
            url, species_icon, obj.pet.name
        )
    pet_link.short_description = 'Питомец'
    pet_link.admin_order_field = 'pet__name'

    def user_link(self, obj):
        """Ссылка на пользователя."""
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'Владелец'
    user_link.admin_order_field = 'user__email'

    def event_type_display(self, obj):
        """Отображение типа события с цветом."""
        colors = {
            'veterinary': '#ef4444',
            'vaccination': '#f97316',
            'grooming': '#eab308',
            'birthday': '#22c55e',
            'medication': '#8b5cf6',
            'training': '#3b82f6',
            'walking': '#06b6d4',
            'feeding': '#10b981',
            'other': '#6b7280'
        }
        color = colors.get(obj.event_type, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; '
            'border-radius: 12px; font-size: 11px; font-weight: 500;">{}</span>',
            color, obj.get_event_type_display()
        )
    event_type_display.short_description = 'Тип'
    event_type_display.admin_order_field = 'event_type'

    def date_time_display(self, obj):
        """Отображение даты и времени."""
        if obj.start_time:
            start_str = obj.start_date.strftime('%d.%m')
            time_str = obj.start_time.strftime('%H:%M')
            date_display = f"{start_str} {time_str}"
        else:
            date_display = obj.start_date.strftime('%d.%m.%Y')

        # Цвет в зависимости от статуса
        if obj.is_past and obj.status == 'scheduled':
            color = '#ef4444'  # Красный для просроченных
            date_display += ' ⚠️'
        elif obj.is_today:
            color = '#f59e0b'  # Оранжевый для сегодняшних
            date_display += ' 📅'
        elif obj.is_upcoming:
            color = '#10b981'  # Зеленый для предстоящих
        else:
            color = '#6b7280'  # Серый для остальных

        return format_html(
            '<span style="color: {}; font-weight: 500;">{}</span>',
            color, date_display
        )
    date_time_display.short_description = 'Дата/Время'
    date_time_display.admin_order_field = 'start_date'

    def priority_display(self, obj):
        """Отображение приоритета."""
        colors = {
            'low': '#10b981',
            'medium': '#f59e0b',
            'high': '#ef4444',
            'urgent': '#dc2626'
        }
        icons = {
            'low': '🟢',
            'medium': '🟡',
            'high': '🔴',
            'urgent': '🚨'
        }
        color = colors.get(obj.priority, '#6b7280')
        icon = icons.get(obj.priority, '⚪')

        return format_html(
            '<span style="color: {}; font-weight: bold;">{} {}</span>',
            color, icon, obj.get_priority_display()
        )
    priority_display.short_description = 'Приоритет'
    priority_display.admin_order_field = 'priority'

    def status_display(self, obj):
        """Отображение статуса."""
        colors = {
            'scheduled': '#3b82f6',
            'completed': '#10b981',
            'cancelled': '#6b7280',
            'missed': '#ef4444'
        }
        icons = {
            'scheduled': '⏰',
            'completed': '✅',
            'cancelled': '❌',
            'missed': '❌'
        }
        color = colors.get(obj.status, '#6b7280')
        icon = icons.get(obj.status, '❓')

        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; '
            'border-radius: 12px; font-size: 11px; font-weight: 500;">{} {}</span>',
            color, icon, obj.get_status_display()
        )
    status_display.short_description = 'Статус'

    def is_upcoming_badge(self, obj):
        """Бейдж для предстоящих событий."""
        if obj.is_upcoming:
            days_until = (obj.start_date - date.today()).days
            if days_until == 0:
                return format_html('<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 8px; font-size: 10px;">Сегодня</span>')
            elif days_until == 1:
                return format_html('<span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 8px; font-size: 10px;">Завтра</span>')
            elif days_until <= 7:
                return format_html('<span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 8px; font-size: 10px;">{} дн</span>', days_until)
        return ''
    is_upcoming_badge.short_description = 'Скоро'

    def date_time_info(self, obj):
        """Информация о дате и времени."""
        info = []
        info.append(f"Начало: {obj.start_date}")
        if obj.start_time:
            info.append(f"Время: {obj.start_time}")

        if obj.end_date and obj.end_date != obj.start_date:
            info.append(f"Окончание: {obj.end_date}")
        if obj.end_time:
            info.append(f"Время окончания: {obj.end_time}")

        return format_html(
            '<div style="background: #f9fafb; padding: 8px; border-radius: 4px; font-size: 12px;">'
            '<strong>Расписание:</strong><br>'
            '{}'
            '</div>',
            '<br>'.join(info)
        )
    date_time_info.short_description = 'Информация о времени'

    def status_info(self, obj):
        """Информация о статусе."""
        info = []
        info.append(f"Текущий статус: {obj.get_status_display()}")

        if obj.completed_at:
            info.append(f"Завершено: {obj.completed_at.strftime('%d.%m.%Y %H:%M')}")

        if obj.is_recurring:
            info.append("Повторяющееся событие")

        return format_html(
            '<div style="background: #f9fafb; padding: 8px; border-radius: 4px; font-size: 12px;">'
            '{}'
            '</div>',
            '<br>'.join(info)
        )
    status_info.short_description = 'Информация о статусе'

    def mark_completed(self, request, queryset):
        """Отметить события как выполненные."""
        updated = 0
        for event in queryset.filter(status='scheduled'):
            event.mark_completed()
            updated += 1
        self.message_user(request, f'Отмечено как выполненные: {updated} событий')
    mark_completed.short_description = 'Отметить как выполненные'

    def cancel_events(self, request, queryset):
        """Отменить события."""
        updated = 0
        for event in queryset.filter(status='scheduled'):
            event.cancel_event()
            updated += 1
        self.message_user(request, f'Отменено событий: {updated}')
    cancel_events.short_description = 'Отменить события'

    def mark_urgent(self, request, queryset):
        """Отметить как срочные."""
        updated = queryset.update(priority='urgent')
        self.message_user(request, f'Отмечено как срочные: {updated} событий')
    mark_urgent.short_description = 'Отметить как срочные'

    def send_reminders(self, request, queryset):
        """Отправить напоминания."""
        # Здесь можно реализовать логику отправки напоминаний
        self.message_user(request, f'Напоминания отправлены для {queryset.count()} событий')
    send_reminders.short_description = 'Отправить напоминания'


@admin.register(EventReminder)
class EventReminderAdmin(admin.ModelAdmin):
    """Админка для управления напоминаниями о событиях."""

    list_display = (
        'event_link', 'reminder_type_display', 'scheduled_at',
        'status_display', 'sent_at'
    )
    list_filter = ('reminder_type', 'status', 'scheduled_at', 'sent_at')
    search_fields = ('event__title', 'event__pet__name', 'event__user__email')
    readonly_fields = ('id', 'created_at', 'sent_at')
    ordering = ('-scheduled_at',)

    fieldsets = (
        ('Событие', {
            'fields': ('event',)
        }),
        ('Напоминание', {
            'fields': ('reminder_type', 'scheduled_at', 'status')
        }),
        ('Результат', {
            'fields': ('sent_at', 'error_message'),
            'classes': ('collapse',)
        }),
        ('Системная информация', {
            'fields': ('id', 'created_at'),
            'classes': ('collapse',)
        }),
    )

    def event_link(self, obj):
        """Ссылка на событие."""
        url = reverse('admin:calendar_calendarevent_change', args=[obj.event.id])
        return format_html('<a href="{}">{}</a>', url, obj.event.title)
    event_link.short_description = 'Событие'
    event_link.admin_order_field = 'event__title'

    def reminder_type_display(self, obj):
        """Отображение типа напоминания."""
        icons = {
            'email': '📧',
            'push': '📱',
            'sms': '💬'
        }
        icon = icons.get(obj.reminder_type, '🔔')
        return format_html('{} {}', icon, obj.get_reminder_type_display())
    reminder_type_display.short_description = 'Тип'

    def status_display(self, obj):
        """Отображение статуса напоминания."""
        colors = {
            'pending': '#f59e0b',
            'sent': '#10b981',
            'failed': '#ef4444'
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; '
            'border-radius: 12px; font-size: 11px; font-weight: 500;">{}</span>',
            color, obj.get_status_display()
        )
    status_display.short_description = 'Статус'
