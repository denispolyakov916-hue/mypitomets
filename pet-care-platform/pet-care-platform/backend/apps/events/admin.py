"""
Админка «Новости и Мероприятия» — владелец создаёт и публикует контент здесь
(встроенная Django-админка). Обложки: загрузить через /api/upload/image/ и
вставить полученный URL в поле «Обложка (URL)».
"""

from django.contrib import admin
from django.utils import timezone

from .models import Event, NewsPost


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'event_type', 'status', 'start_at', 'is_featured', 'author')
    list_filter = ('status', 'event_type', 'is_featured', 'start_at')
    search_fields = ('title', 'description', 'location')
    date_hierarchy = 'start_at'
    readonly_fields = ('created_at', 'updated_at', 'published_at')
    actions = ('publish_selected', 'unpublish_selected')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('author')

    def save_model(self, request, obj, form, change):
        if not obj.author_id:
            obj.author = request.user
        super().save_model(request, obj, form, change)

    @admin.action(description='Опубликовать выбранные')
    def publish_selected(self, request, queryset):
        for obj in queryset.exclude(status='published'):
            obj.status = 'published'
            if not obj.published_at:
                obj.published_at = timezone.now()
            obj.save()

    @admin.action(description='Снять с публикации (в черновик)')
    def unpublish_selected(self, request, queryset):
        queryset.update(status='draft')


@admin.register(NewsPost)
class NewsPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'status', 'published_at', 'is_featured', 'author')
    list_filter = ('status', 'category', 'is_featured')
    search_fields = ('title', 'body')
    readonly_fields = ('created_at', 'updated_at', 'published_at')
    actions = ('publish_selected', 'unpublish_selected')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('author', 'related_event')

    def save_model(self, request, obj, form, change):
        if not obj.author_id:
            obj.author = request.user
        super().save_model(request, obj, form, change)

    @admin.action(description='Опубликовать выбранные')
    def publish_selected(self, request, queryset):
        for obj in queryset.exclude(status='published'):
            obj.status = 'published'
            if not obj.published_at:
                obj.published_at = timezone.now()
            obj.save()

    @admin.action(description='Снять с публикации (в черновик)')
    def unpublish_selected(self, request, queryset):
        queryset.update(status='draft')
