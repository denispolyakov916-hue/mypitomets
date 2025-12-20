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
        'age_display', 'gender_display', 'is_neutered', 
        'photo_preview', 'created_at'
    )
    list_filter = (
        'species', 'gender', 'is_neutered', 'created_at', 
        'owner__is_active'
    )
    search_fields = (
        'name', 'breed', 'owner__email', 'owner__first_name', 
        'owner__last_name'
    )
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'photo_preview')
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('id', 'owner', 'name', 'species', 'breed')
        }),
        ('Характеристики', {
            'fields': ('date_of_birth', 'weight', 'gender', 'is_neutered')
        }),
        ('Фото', {
            'fields': ('photo', 'photo_preview')
        }),
        ('Дополнительная информация', {
            'fields': ('favorite_foods', 'allergies'),
            'classes': ('collapse',)
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
            'bird': '🐦',
            'rodent': '🐹',
            'fish': '🐠',
            'reptile': '🦎',
            'other': '🐾'
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
    
    def gender_display(self, obj):
        """Отображение пола."""
        return obj.get_gender_display()
    gender_display.short_description = 'Пол'
    
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
    mark_as_neutered.short_description = 'Пометить как кастрированных/стерилизованных'
    
    def mark_as_not_neutered(self, request, queryset):
        """Убрать пометку о кастрации/стерилизации."""
        updated = queryset.update(is_neutered=False)
        self.message_user(request, f'Убрана пометка о кастрации/стерилизации: {updated}')
    mark_as_not_neutered.short_description = 'Убрать пометку о кастрации/стерилизации'
