"""
Административный интерфейс для отзывов.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """Административный интерфейс для отзывов."""

    list_display = (
        'id', 'user_link', 'review_type_display', 'content_display',
        'rating_display', 'status_display', 'verification_badge',
        'created_at_display'
    )
    list_filter = (
        'review_type', 'rating', 'is_approved', 'is_verified_purchase',
        'is_edited', 'created_at'
    )
    search_fields = (
        'user__email', 'user__first_name', 'user__last_name',
        'comment', 'product__name', 'course__title'
    )
    readonly_fields = (
        'id', 'created_at', 'updated_at', 'rating_display',
        'verification_badge', 'content_preview'
    )
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'review_type', 'product', 'course')
        }),
        ('Отзыв', {
            'fields': ('rating_display', 'comment', 'content_preview')
        }),
        ('Статус и верификация', {
            'fields': ('is_approved', 'is_verified_purchase', 'verification_badge', 'is_edited')
        }),
        ('Временные метки', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = [
        'approve_reviews', 'reject_reviews',
        'mark_as_verified', 'mark_as_unverified'
    ]

    def get_queryset(self, request):
        """Оптимизация запросов с select_related."""
        return super().get_queryset(request).select_related(
            'user', 'product', 'course'
        )

    def user_link(self, obj):
        """Ссылка на пользователя."""
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'Удалённый пользователь'
    user_link.short_description = 'Пользователь'
    user_link.admin_order_field = 'user__email'

    def review_type_display(self, obj):
        """Отображение типа отзыва с иконкой."""
        icons = {
            'product': '📦',
            'course': '🎓'
        }
        icon = icons.get(obj.review_type, '💬')
        return format_html('{} {}', icon, obj.get_review_type_display())
    review_type_display.short_description = 'Тип'
    review_type_display.admin_order_field = 'review_type'

    def content_display(self, obj):
        """Краткий превью контента отзыва."""
        if obj.product:
            content = f"Продукт: {obj.product.name}"
        elif obj.course:
            content = f"Курс: {obj.course.title}"
        else:
            content = "Без контента"

        preview = obj.comment[:50] + '...' if len(obj.comment) > 50 else obj.comment
        return format_html(
            '<div style="max-width: 300px;">'
            '<div style="font-weight: 500; color: #374151; margin-bottom: 2px;">{}</div>'
            '<div style="color: #6b7280; font-size: 12px;">{}</div>'
            '</div>',
            content, preview
        )
    content_display.short_description = 'Содержание'

    def rating_display(self, obj):
        """Отображение рейтинга с звёздами."""
        stars = '★' * obj.rating + '☆' * (5 - obj.rating)
        colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#22c55e']
        color = colors[obj.rating - 1] if 0 < obj.rating <= 5 else '#6b7280'

        return format_html(
            '<span style="color: {}; font-size: 16px; font-weight: bold;">{}</span> '
            '<span style="color: #6b7280; font-size: 12px;">({})</span>',
            color, stars, obj.rating
        )
    rating_display.short_description = 'Рейтинг'

    def status_display(self, obj):
        """Отображение статуса отзыва."""
        if obj.is_approved:
            return format_html(
                '<span style="background: #d1fae5; color: #065f46; padding: 4px 8px; '
                'border-radius: 12px; font-size: 11px; font-weight: 500;">✅ Одобрен</span>'
            )
        else:
            return format_html(
                '<span style="background: #fef3c7; color: #92400e; padding: 4px 8px; '
                'border-radius: 12px; font-size: 11px; font-weight: 500;">⏳ На модерации</span>'
            )
    status_display.short_description = 'Статус'

    def verification_badge(self, obj):
        """Бейдж верификации покупки."""
        if obj.is_verified_purchase:
            return format_html(
                '<span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; '
                'border-radius: 12px; font-size: 11px; font-weight: 500;">✓ Проверенная покупка</span>'
            )
        else:
            return format_html(
                '<span style="background: #f3f4f6; color: #6b7280; padding: 4px 8px; '
                'border-radius: 12px; font-size: 11px; font-weight: 500;">❓ Не проверена</span>'
            )
    verification_badge.short_description = 'Верификация'

    def created_at_display(self, obj):
        """Отображение даты создания."""
        now = timezone.now()
        diff = now - obj.created_at

        if diff.days == 0:
            if diff.seconds < 3600:
                time_str = f"{diff.seconds // 60} мин назад"
            else:
                time_str = f"{diff.seconds // 3600} ч назад"
        elif diff.days == 1:
            time_str = "Вчера"
        elif diff.days < 7:
            time_str = f"{diff.days} дн назад"
        else:
            return obj.created_at.strftime('%d.%m.%Y')

        return format_html(
            '<div style="font-size: 12px; color: #6b7280;">{}</div>'
            '<div style="font-size: 11px; color: #9ca3af;">{}</div>',
            time_str, obj.created_at.strftime('%H:%M')
        )
    created_at_display.short_description = 'Создан'

    def content_preview(self, obj):
        """Расширенный превью содержимого отзыва."""
        return format_html(
            '<div style="background: #f9fafb; padding: 12px; border-radius: 6px; '
            'border-left: 3px solid #3b82f6; max-width: 500px;">'
            '<div style="margin-bottom: 8px;">'
            '<strong>Рейтинг:</strong> {}</div>'
            '<div style="margin-bottom: 8px;">'
            '<strong>Комментарий:</strong></div>'
            '<div style="color: #374151; line-height: 1.4;">{}</div>'
            '</div>',
            self.rating_display(obj), obj.comment or 'Без комментария'
        )
    content_preview.short_description = 'Превью отзыва'

    def approve_reviews(self, request, queryset):
        """Одобрить выбранные отзывы."""
        updated = queryset.update(is_approved=True)
        self.message_user(request, f'Одобрено отзывов: {updated}')
    approve_reviews.short_description = 'Одобрить выбранные отзывы'

    def reject_reviews(self, request, queryset):
        """Отклонить выбранные отзывы."""
        updated = queryset.update(is_approved=False)
        self.message_user(request, f'Отклонено отзывов: {updated}')
    reject_reviews.short_description = 'Отклонить выбранные отзывы'

    def mark_as_verified(self, request, queryset):
        """Отметить как проверенные покупки."""
        updated = queryset.update(is_verified_purchase=True)
        self.message_user(request, f'Отмечено как проверенные: {updated}')
    mark_as_verified.short_description = 'Отметить как проверенные покупки'

    def mark_as_unverified(self, request, queryset):
        """Снять отметку о проверенной покупке."""
        updated = queryset.update(is_verified_purchase=False)
        self.message_user(request, f'Снята отметка проверки: {updated}')
    mark_as_unverified.short_description = 'Снять отметку о проверенной покупке'

