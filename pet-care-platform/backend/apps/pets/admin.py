"""
Полноценная админка для управления питомцами.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Pet


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    """Полноценная админка для управления питомцами."""
    
    list_display = (
        'name', 'species_display', 'breed', 'owner_link', 
        'age_display', 'sex_display', 'activity_display',
        'is_neutered', 'created_at'
    )
    list_filter = (
        'species', 'sex', 'is_neutered', 'activity_level',
        'created_at', 'owner__is_active'
    )
    search_fields = (
        'name', 'breed__name', 'owner__email', 'owner__first_name', 
        'owner__last_name'
    )
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'photo_preview')
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('id', 'owner', 'name', 'species', 'breed')
        }),
        ('Характеристики', {
            'fields': ('date_of_birth', 'weight', 'sex', 'is_neutered')
        }),
        ('Фото', {
            'fields': ('photo', 'photo_preview')
        }),
        ('Активность', {
            'fields': ('activity_level',),
        }),
        ('Системная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_neutered', 'mark_as_not_neutered']
    
    def species_display(self, obj):
        """Отображение вида с иконкой."""
        icons = {
            'dog': '🐕',
            'cat': '🐈',
        }
        icon = icons.get(obj.species, '🐾')
        return format_html('{} {}', icon, obj.get_species_display())
    species_display.short_description = 'Вид'
    
    def owner_link(self, obj):
        """Ссылка на владельца."""
        if obj.owner:
            url = reverse('admin:users_user_change', args=[obj.owner.id])
            return format_html('<a href="{}">{}</a>', url, obj.owner.email)
        return '-'
    owner_link.short_description = 'Владелец'
    
    def age_display(self, obj):
        """Отображение возраста."""
        if obj.date_of_birth:
            from datetime import date
            today = date.today()
            age = today.year - obj.date_of_birth.year
            if today.month < obj.date_of_birth.month or (today.month == obj.date_of_birth.month and today.day < obj.date_of_birth.day):
                age -= 1
            return f"{age} лет"
        return '-'
    age_display.short_description = 'Возраст'
    
    def sex_display(self, obj):
        """Отображение пола."""
        return obj.get_sex_display()
    sex_display.short_description = 'Пол'
    
    def photo_preview(self, obj):
        """Превью фото питомца."""
        if obj.photo:
            return format_html(
                '<img src="{}" style="max-width: 200px; max-height: 200px;" />',
                obj.photo.url
            )
        return 'Нет фото'
    photo_preview.short_description = 'Фото'
    
    def mark_as_neutered(self, request, queryset):
        """Пометить как кастрированных/стерилизованных."""
        updated = queryset.update(is_neutered=True)
        self.message_user(request, f'Помечено как кастрированных/стерилизованных: {updated}')
    mark_as_neutered.short_description = 'Пометить %(verbose_name_plural)s как кастрированных/стерилизованных'
    
    def mark_as_not_neutered(self, request, queryset):
        """Убрать пометку о кастрации/стерилизации."""
        updated = queryset.update(is_neutered=False)
        self.message_user(request, f'Убрана пометка о кастрации/стерилизации: {updated}')
    mark_as_not_neutered.short_description = 'Убрать пометку о кастрации/стерилизации для %(verbose_name_plural)s'
    
    def activity_display(self, obj):
        """Отображение уровня активности."""
        colors = {
            'very_low': '#6b7280',
            'low': '#f59e0b',
            'moderate': '#3b82f6',
            'high': '#10b981',
            'very_high': '#ef4444'
        }
        icons = {
            'very_low': '💤',
            'low': '🐢',
            'moderate': '🐕',
            'high': '🏃',
            'very_high': '🚀'
        }
        color = colors.get(obj.activity_level, '#6b7280')
        icon = icons.get(obj.activity_level, '')
        return format_html(
            '<span style="color: {};">{} {}</span>',
            color, icon, obj.get_activity_level_display()
        )
    activity_display.short_description = 'Активность'


# ===== Админка для напоминаний =====
from .reminder_models import Reminder


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    """Админка для управления напоминаниями."""
    
    list_display = (
        'title', 'pet_link', 'user_link', 'category_display',
        'reminder_date', 'reminder_time', 'frequency_display',
        'status_display', 'created_at'
    )
    list_filter = (
        'category', 'frequency', 'is_active', 'is_completed',
        'reminder_date', 'created_at'
    )
    search_fields = ('title', 'description', 'pet__name', 'user__email')
    ordering = ('reminder_date', 'reminder_time')
    readonly_fields = ('id', 'created_at', 'updated_at', 'completed_at')
    date_hierarchy = 'reminder_date'
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'description', 'category', 'pet', 'user')
        }),
        ('Расписание', {
            'fields': ('reminder_date', 'reminder_time', 'frequency')
        }),
        ('Статус', {
            'fields': ('is_active', 'is_completed', 'completed_at')
        }),
        ('Уведомления', {
            'fields': ('notify_email', 'notify_push', 'notify_before'),
            'classes': ('collapse',)
        }),
        ('Системная информация', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_completed', 'mark_active', 'deactivate']
    
    def pet_link(self, obj):
        """Ссылка на питомца."""
        url = reverse('admin:pets_pet_change', args=[obj.pet.id])
        return format_html(
            '<a href="{}">{} {}</a>',
            url,
            '🐕' if obj.pet.species == 'dog' else '🐈' if obj.pet.species == 'cat' else '🐾',
            obj.pet.name
        )
    pet_link.short_description = 'Питомец'
    
    def user_link(self, obj):
        """Ссылка на пользователя."""
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'Владелец'
    
    def category_display(self, obj):
        """Категория с иконкой."""
        icons = {
            'feeding': '🍖',
            'medication': '💊',
            'vaccination': '💉',
            'vet_visit': '🏥',
            'grooming': '✂️',
            'walk': '🚶',
            'training': '🎓',
            'hygiene': '🛁',
            'other': '📋',
        }
        icon = icons.get(obj.category, '📋')
        return format_html('{} {}', icon, obj.get_category_display())
    category_display.short_description = 'Категория'
    
    def frequency_display(self, obj):
        """Отображение частоты."""
        return obj.get_frequency_display()
    frequency_display.short_description = 'Частота'
    
    def status_display(self, obj):
        """Статус напоминания."""
        if obj.is_completed:
            return format_html(
                '<span style="color: #10b981; font-weight: bold;">✓ Выполнено</span>'
            )
        elif not obj.is_active:
            return format_html(
                '<span style="color: #6b7280;">Неактивно</span>'
            )
        elif obj.is_overdue:
            return format_html(
                '<span style="color: #ef4444; font-weight: bold;">⚠ Просрочено</span>'
            )
        elif obj.is_upcoming:
            return format_html(
                '<span style="color: #f59e0b; font-weight: bold;">🔔 Скоро</span>'
            )
        else:
            return format_html(
                '<span style="color: #3b82f6;">Запланировано</span>'
            )
    status_display.short_description = 'Статус'
    
    def mark_completed(self, request, queryset):
        """Отметить как выполненные."""
        for reminder in queryset:
            reminder.mark_completed()
        self.message_user(request, f'Отмечено как выполненных: {queryset.count()}')
    mark_completed.short_description = 'Отметить %(verbose_name_plural)s как выполненные'
    
    def mark_active(self, request, queryset):
        """Активировать напоминания."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'Активировано: {updated}')
    mark_active.short_description = 'Активировать %(verbose_name_plural)s'
    
    def deactivate(self, request, queryset):
        """Деактивировать напоминания."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'Деактивировано: {updated}')
    deactivate.short_description = 'Деактивировать %(verbose_name_plural)s'
