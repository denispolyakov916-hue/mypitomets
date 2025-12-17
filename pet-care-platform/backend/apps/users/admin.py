"""Регистрация моделей пользователей в админке."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'is_active', 'is_staff', 'created_at')
    list_filter = ('is_active', 'is_staff')
    search_fields = ('email',)
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Права', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
        ('Даты', {'fields': ('created_at',)}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ('created_at',)
