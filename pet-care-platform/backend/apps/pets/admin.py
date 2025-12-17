"""Регистрация моделей питомцев в админке."""

from django.contrib import admin
from .models import Pet


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = ('name', 'species', 'owner', 'created_at')
    list_filter = ('species', 'created_at')
    search_fields = ('name', 'owner__email')
    ordering = ('-created_at',)
