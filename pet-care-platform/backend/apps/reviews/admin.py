"""
Административный интерфейс для отзывов.
"""

from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """Административный интерфейс для отзывов."""
    
    list_display = ['id', 'user', 'product', 'course', 'rating', 'is_approved', 'is_verified_purchase', 'created_at']
    list_filter = ['review_type', 'rating', 'is_approved', 'is_verified_purchase', 'created_at']
    search_fields = ['user__email', 'comment', 'product__name', 'course__title']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'review_type', 'product', 'course', 'rating', 'comment')
        }),
        ('Статусы', {
            'fields': ('is_verified_purchase', 'is_approved', 'is_edited')
        }),
        ('Временные метки', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

