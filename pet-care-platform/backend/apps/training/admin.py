"""
Полноценная админка для управления курсами и обучением.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import (
    Course, UserCourse, Lesson, UserCourseProgress,
    UserLessonProgress, Comment, Rating, CommentLike
)


class LessonInline(admin.TabularInline):
    """Inline редактор уроков курса."""
    model = Lesson
    extra = 0
    fields = ('order', 'title', 'content_type', 'duration', 'is_required', 'is_active')
    ordering = ['order']
    show_change_link = True
    max_num = 50

    def get_queryset(self, request):
        """Показывать уроки в правильном порядке."""
        return super().get_queryset(request).order_by('order')


class UserCourseInline(admin.TabularInline):
    """Inline для пользователей, проходящих курс."""
    model = UserCourse
    extra = 0
    fields = ('user', 'pet', 'purchased_at', 'progress', 'progress_bar')
    readonly_fields = ('purchased_at', 'progress', 'progress_bar')
    can_delete = False
    show_change_link = True
    max_num = 20

    def progress_bar(self, obj):
        """Прогресс-бар."""
        color = 'green' if obj.progress >= 100 else 'blue' if obj.progress >= 50 else 'orange'
        return format_html(
            '<div style="width: 100px; background: #f0f0f0; border-radius: 3px;">'
            '<div style="width: {}%; background: {}; height: 20px; border-radius: 3px; text-align: center; color: white; line-height: 20px; font-size: 11px;">{}%</div>'
            '</div>',
            obj.progress, color, obj.progress
        )
    progress_bar.short_description = 'Прогресс'


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    """Полноценная админка для управления курсами."""
    
    list_display = (
        'title', 'price_display', 'pet_type_display', 'category_display',
        'level_display', 'format_display', 'duration_display',
        'lessons_count_display', 'students_count', 'is_active', 'created_at'
    )
    list_filter = (
        'pet_type', 'category', 'subcategory', 'level', 
        'format_type', 'is_active', 'created_at'
    )
    search_fields = ('title', 'description')
    ordering = ('title',)
    readonly_fields = ('created_at', 'updated_at', 'students_count', 'image_preview')
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'description', 'image_url', 'image_preview')
        }),
        ('Цена и длительность', {
            'fields': ('price', 'duration')
        }),
        ('Классификация', {
            'fields': ('pet_type', 'category', 'subcategory', 'level', 'format_type')
        }),
        ('Статус', {
            'fields': ('is_active', 'students_count')
        }),
        ('Системная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [LessonInline, UserCourseInline]
    
    actions = ['activate_courses', 'deactivate_courses', 'make_free', 'make_paid']
    
    def price_display(self, obj):
        """Отображение цены."""
        if obj.is_free:
            return format_html('<span style="color: green; font-weight: bold;">Бесплатно</span>')
        return f"{obj.price:.2f} ₽"
    price_display.short_description = 'Цена'
    price_display.admin_order_field = 'price'
    
    def pet_type_display(self, obj):
        """Отображение типа животного."""
        icons = {'dog': '🐕', 'cat': '🐈', 'all': '🐾'}
        icon = icons.get(obj.pet_type, '🐾')
        return format_html('{} {}', icon, obj.get_pet_type_display())
    pet_type_display.short_description = 'Тип животного'
    
    def category_display(self, obj):
        """Отображение категории."""
        return obj.get_category_display()
    category_display.short_description = 'Категория'
    
    def level_display(self, obj):
        """Отображение уровня."""
        colors = {
            'beginner': 'green',
            'intermediate': 'blue',
            'advanced': 'orange',
            'expert': 'red'
        }
        color = colors.get(obj.level, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_level_display()
        )
    level_display.short_description = 'Уровень'
    
    def format_display(self, obj):
        """Отображение формата."""
        return obj.get_format_type_display()
    format_display.short_description = 'Формат'
    
    def duration_display(self, obj):
        """Отображение длительности."""
        hours = obj.duration // 60
        minutes = obj.duration % 60
        if hours > 0:
            return f"{hours} ч {minutes} мин"
        return f"{minutes} мин"
    duration_display.short_description = 'Длительность'
    
    def students_count(self, obj):
        """Количество студентов."""
        count = obj.user_courses.count()
        if count > 0:
            url = reverse('admin:training_usercourse_changelist') + f'?course__id__exact={obj.id}'
            return format_html('<a href="{}">{} студентов</a>', url, count)
        return '0'
    students_count.short_description = 'Студентов'
    
    def lessons_count_display(self, obj):
        """Отображение количества уроков."""
        lessons = obj.lessons.filter(is_active=True).count()
        videos = obj.lessons.filter(is_active=True, content_type='video').count()
        return format_html('{} уроков<br><small style="color: #666;">{} видео</small>', lessons, videos)
    lessons_count_display.short_description = 'Уроки'
    lessons_count_display.admin_order_field = 'lessons_count'

    def image_preview(self, obj):
        """Превью обложки курса."""
        if obj.image_url:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 200px;" />',
                obj.image_url
            )
        return 'Нет обложки'
    image_preview.short_description = 'Обложка'

    def save_model(self, request, obj, form, change):
        """Сохранить модель и обновить счетчики уроков."""
        super().save_model(request, obj, form, change)
        # Обновляем счетчики после сохранения
        obj.update_counts()
    
    def activate_courses(self, request, queryset):
        """Активировать курсы."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'Активировано курсов: {updated}')
    activate_courses.short_description = 'Активировать %(verbose_name_plural)s'

    def deactivate_courses(self, request, queryset):
        """Деактивировать курсы."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'Деактивировано курсов: {updated}')
    deactivate_courses.short_description = 'Деактивировать %(verbose_name_plural)s'

    def make_free(self, request, queryset):
        """Сделать курсы бесплатными."""
        updated = queryset.update(price=0)
        self.message_user(request, f'Сделано бесплатными: {updated}')
    make_free.short_description = 'Сделать %(verbose_name_plural)s бесплатными'

    def make_paid(self, request, queryset):
        """Сделать курсы платными (установить цену по умолчанию)."""
        from decimal import Decimal
        updated = queryset.filter(price=0).update(price=Decimal('999.00'))
        self.message_user(request, f'Сделано платными: {updated}')
    make_paid.short_description = 'Сделать %(verbose_name_plural)s платными (999 ₽)'


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    """Админка для управления уроками."""

    list_display = (
        'title', 'course_link', 'order', 'content_type_display',
        'duration_display', 'is_required', 'is_active'
    )
    list_filter = ('content_type', 'is_required', 'is_active', 'course__category')
    search_fields = ('title', 'course__title')
    ordering = ('course', 'order')
    list_editable = ('order', 'is_required', 'is_active')

    fieldsets = (
        ('Основная информация', {
            'fields': ('course', 'title', 'order', 'content_type')
        }),
        ('Контент', {
            'fields': ('content', 'duration', 'additional_materials')
        }),
        ('Настройки', {
            'fields': ('is_required', 'is_active')
        }),
    )

    def course_link(self, obj):
        """Ссылка на курс."""
        url = reverse('admin:training_course_change', args=[obj.course.id])
        return format_html('<a href="{}">{}</a>', url, obj.course.title)
    course_link.short_description = 'Курс'
    course_link.admin_order_field = 'course__title'

    def content_type_display(self, obj):
        """Отображение типа контента с иконками."""
        icons = {
            'video': '🎥',
            'text': '📄',
            'interactive': '🎮',
            'mixed': '🎭',
            'webinar': '🎤',
            'workshop': '🛠️'
        }
        icon = icons.get(obj.content_type, '📚')
        return format_html('{} {}', icon, obj.get_content_type_display_name())
    content_type_display.short_description = 'Тип контента'

    def duration_display(self, obj):
        """Отображение длительности."""
        if obj.duration == 0:
            return '-'
        minutes = obj.duration
        if minutes >= 60:
            hours = minutes // 60
            mins = minutes % 60
            return f"{hours}ч {mins}мин"
        return f"{minutes} мин"
    duration_display.short_description = 'Длительность'

    actions = ['activate_lessons', 'deactivate_lessons', 'make_required', 'make_optional']

    def activate_lessons(self, request, queryset):
        """Активировать уроки."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'Активировано уроков: {updated}')
    activate_lessons.short_description = 'Активировать %(verbose_name_plural)s'

    def deactivate_lessons(self, request, queryset):
        """Деактивировать уроки."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'Деактивировано уроков: {updated}')
    deactivate_lessons.short_description = 'Деактивировать %(verbose_name_plural)s'

    def make_required(self, request, queryset):
        """Сделать уроки обязательными."""
        updated = queryset.update(is_required=True)
        self.message_user(request, f'Сделано обязательными: {updated}')
    make_required.short_description = 'Сделать %(verbose_name_plural)s обязательными'

    def make_optional(self, request, queryset):
        """Сделать уроки опциональными."""
        updated = queryset.update(is_required=False)
        self.message_user(request, f'Сделано опциональными: {updated}')
    make_optional.short_description = 'Сделать %(verbose_name_plural)s опциональными'


@admin.register(UserCourse)
class UserCourseAdmin(admin.ModelAdmin):
    """Полноценная админка для управления курсами пользователей."""
    
    list_display = (
        'user_link', 'course_link', 'purchased_at', 
        'progress_display', 'is_completed'
    )
    list_filter = ('purchased_at', 'course__category', 'course__level')
    search_fields = (
        'user__email', 'user__first_name', 'user__last_name', 
        'course__title'
    )
    readonly_fields = ('purchased_at', 'progress_display', 'is_completed')
    ordering = ('-purchased_at',)
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'course')
        }),
        ('Прогресс', {
            'fields': ('progress', 'progress_display', 'is_completed')
        }),
        ('Дата покупки', {
            'fields': ('purchased_at',)
        }),
    )
    
    actions = ['reset_progress', 'complete_courses']
    
    def user_link(self, obj):
        """Ссылка на пользователя."""
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return '-'
    user_link.short_description = 'Пользователь'
    user_link.admin_order_field = 'user__email'
    
    def course_link(self, obj):
        """Ссылка на курс."""
        if obj.course:
            url = reverse('admin:training_course_change', args=[obj.course.id])
            return format_html('<a href="{}">{}</a>', url, obj.course.title)
        return '-'
    course_link.short_description = 'Курс'
    course_link.admin_order_field = 'course__title'
    
    def progress_display(self, obj):
        """Отображение прогресса с прогресс-баром."""
        color = 'green' if obj.progress >= 100 else 'blue' if obj.progress >= 50 else 'orange'
        return format_html(
            '<div style="width: 200px;">'
            '<div style="width: 100%; background: #f0f0f0; border-radius: 3px;">'
            '<div style="width: {}%; background: {}; height: 25px; border-radius: 3px; text-align: center; color: white; line-height: 25px; font-weight: bold;">{}%</div>'
            '</div>'
            '</div>',
            obj.progress, color, obj.progress
        )
    progress_display.short_description = 'Прогресс'
    
    def is_completed(self, obj):
        """Проверка завершения курса."""
        return obj.progress >= 100
    is_completed.boolean = True
    is_completed.short_description = 'Завершён'
    
    def reset_progress(self, request, queryset):
        """Сбросить прогресс."""
        updated = queryset.update(progress=0)
        self.message_user(request, f'Сброшен прогресс для: {updated} записей')
    reset_progress.short_description = 'Сбросить прогресс %(verbose_name_plural)s'

    def complete_courses(self, request, queryset):
        """Завершить курсы."""
        updated = queryset.update(progress=100)
        self.message_user(request, f'Завершено курсов: {updated}')
    complete_courses.short_description = 'Завершить %(verbose_name_plural)s'


class UserLessonProgressInline(admin.TabularInline):
    """Inline для прогресса по урокам."""
    model = UserLessonProgress
    extra = 0
    fields = ('lesson', 'status', 'time_spent_display', 'completed_at')
    readonly_fields = ('time_spent_display', 'completed_at')
    can_delete = False
    show_change_link = True
    max_num = 20

    def time_spent_display(self, obj):
        """Отображение времени просмотра."""
        seconds = obj.time_spent
        if seconds < 60:
            return f"{seconds} сек"
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes}:{secs:02d}"
    time_spent_display.short_description = 'Время'


@admin.register(UserCourseProgress)
class UserCourseProgressAdmin(admin.ModelAdmin):
    """Админка для прогресса пользователей по курсам."""

    list_display = (
        'user_link', 'course_link', 'pet_name', 'status_display',
        'progress_percent', 'last_activity_display', 'completed_at'
    )
    list_filter = ('status', 'course__category', 'pet__species', 'started_at')
    search_fields = ('user__email', 'course__title', 'pet__name')
    ordering = ('-last_activity_at',)
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'course', 'pet')
        }),
        ('Прогресс', {
            'fields': ('status', 'progress_percent', 'started_at', 'last_activity_at', 'completed_at')
        }),
        ('Статистика', {
            'fields': ('total_time_spent', 'completed_lessons_count', 'notifications_enabled')
        }),
        ('Системная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    inlines = [UserLessonProgressInline]
    actions = ['reset_progress', 'complete_progress', 'enable_notifications', 'disable_notifications']

    def user_link(self, obj):
        """Ссылка на пользователя."""
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'Пользователь'
    user_link.admin_order_field = 'user__email'

    def course_link(self, obj):
        """Ссылка на курс."""
        url = reverse('admin:training_course_change', args=[obj.course.id])
        return format_html('<a href="{}">{}</a>', url, obj.course.title)
    course_link.short_description = 'Курс'
    course_link.admin_order_field = 'course__title'

    def pet_name(self, obj):
        """Имя питомца."""
        return obj.pet.name if obj.pet else '-'
    pet_name.short_description = 'Питомец'
    pet_name.admin_order_field = 'pet__name'

    def status_display(self, obj):
        """Отображение статуса с цветом."""
        colors = {
            'not_started': 'gray',
            'in_progress': 'blue',
            'completed': 'green',
            'paused': 'orange'
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_display.short_description = 'Статус'

    def last_activity_display(self, obj):
        """Последняя активность."""
        if obj.last_activity_at:
            return obj.last_activity_at.strftime('%d.%m.%Y %H:%M')
        return '-'
    last_activity_display.short_description = 'Последняя активность'

    def reset_progress(self, request, queryset):
        """Сбросить прогресс."""
        updated = queryset.update(
            status='not_started',
            progress_percent=0,
            completed_at=None,
            total_time_spent=0,
            completed_lessons_count=0
        )
        # Сбросить прогресс по урокам
        for progress in queryset:
            progress.lesson_progress.all().delete()
        self.message_user(request, f'Сброшен прогресс для: {updated} записей')
    reset_progress.short_description = 'Сбросить прогресс'

    def complete_progress(self, request, queryset):
        """Завершить прогресс."""
        updated = queryset.update(
            status='completed',
            progress_percent=100,
            completed_at=timezone.now()
        )
        self.message_user(request, f'Завершено курсов: {updated}')
    complete_progress.short_description = 'Завершить прогресс'

    def enable_notifications(self, request, queryset):
        """Включить уведомления."""
        updated = queryset.update(notifications_enabled=True)
        self.message_user(request, f'Включены уведомления для: {updated} записей')
    enable_notifications.short_description = 'Включить уведомления'

    def disable_notifications(self, request, queryset):
        """Отключить уведомления."""
        updated = queryset.update(notifications_enabled=False)
        self.message_user(request, f'Отключены уведомления для: {updated} записей')
    disable_notifications.short_description = 'Отключить уведомления'


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """Админка для комментариев."""

    list_display = (
        'user_link', 'target_display', 'content_preview',
        'likes_dislikes', 'is_moderated', 'created_at'
    )
    list_filter = ('is_moderated', 'created_at', 'course__category', 'lesson__course__category')
    search_fields = ('user__email', 'content', 'course__title', 'lesson__title')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'likes_count', 'dislikes_count')

    fieldsets = (
        ('Автор и контент', {
            'fields': ('user', 'content', 'attachments')
        }),
        ('Связанные объекты', {
            'fields': ('course', 'lesson', 'parent')
        }),
        ('Модерация', {
            'fields': ('is_moderated', 'likes_count', 'dislikes_count')
        }),
        ('Временные метки', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['moderate_comments', 'unmoderate_comments']

    def user_link(self, obj):
        """Ссылка на пользователя."""
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'Автор'
    user_link.admin_order_field = 'user__email'

    def target_display(self, obj):
        """Отображение цели комментария."""
        if obj.course:
            url = reverse('admin:training_course_change', args=[obj.course.id])
            return format_html('Курс: <a href="{}">{}</a>', url, obj.course.title)
        elif obj.lesson:
            url = reverse('admin:training_lesson_change', args=[obj.lesson.id])
            return format_html('Урок: <a href="{}">{}</a>', url, obj.lesson.title)
        return '-'
    target_display.short_description = 'Цель'

    def content_preview(self, obj):
        """Превью контента."""
        preview = obj.content[:50]
        if len(obj.content) > 50:
            preview += '...'
        return preview
    content_preview.short_description = 'Текст'

    def likes_dislikes(self, obj):
        """Отображение лайков/дизлайков."""
        return format_html(
            '<span style="color: green;">👍 {}</span> / <span style="color: red;">👎 {}</span>',
            obj.likes_count, obj.dislikes_count
        )
    likes_dislikes.short_description = 'Реакции'

    def moderate_comments(self, request, queryset):
        """Промодерировать комментарии."""
        updated = queryset.update(is_moderated=True)
        self.message_user(request, f'Промодерировано комментариев: {updated}')
    moderate_comments.short_description = 'Промодерировать %(verbose_name_plural)s'

    def unmoderate_comments(self, request, queryset):
        """Снять модерацию."""
        updated = queryset.update(is_moderated=False)
        self.message_user(request, f'Снята модерация с: {updated} комментариев')
    unmoderate_comments.short_description = 'Снять модерацию'


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    """Админка для оценок курсов."""

    list_display = (
        'user_link', 'course_link', 'pet_name', 'rating_display',
        'review_preview', 'is_approved', 'created_at'
    )
    list_filter = ('rating', 'is_approved', 'created_at', 'course__category')
    search_fields = ('user__email', 'course__title', 'review')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'course', 'pet', 'rating')
        }),
        ('Отзыв', {
            'fields': ('review', 'is_approved')
        }),
        ('Временные метки', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['approve_ratings', 'reject_ratings']

    def user_link(self, obj):
        """Ссылка на пользователя."""
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'Пользователь'
    user_link.admin_order_field = 'user__email'

    def course_link(self, obj):
        """Ссылка на курс."""
        url = reverse('admin:training_course_change', args=[obj.course.id])
        return format_html('<a href="{}">{}</a>', url, obj.course.title)
    course_link.short_description = 'Курс'
    course_link.admin_order_field = 'course__title'

    def pet_name(self, obj):
        """Имя питомца."""
        return obj.pet.name if obj.pet else '-'
    pet_name.short_description = 'Питомец'
    pet_name.admin_order_field = 'pet__name'

    def rating_display(self, obj):
        """Отображение рейтинга со звездами."""
        stars = '★' * obj.rating + '☆' * (5 - obj.rating)
        return format_html('<span style="font-size: 16px;">{}</span> ({})', stars, obj.rating)
    rating_display.short_description = 'Оценка'

    def review_preview(self, obj):
        """Превью отзыва."""
        if not obj.review:
            return '-'
        preview = obj.review[:30]
        if len(obj.review) > 30:
            preview += '...'
        return preview
    review_preview.short_description = 'Отзыв'

    def approve_ratings(self, request, queryset):
        """Одобрить оценки."""
        updated = queryset.update(is_approved=True)
        self.message_user(request, f'Одобрено оценок: {updated}')
    approve_ratings.short_description = 'Одобрить %(verbose_name_plural)s'

    def reject_ratings(self, request, queryset):
        """Отклонить оценки."""
        updated = queryset.update(is_approved=False)
        self.message_user(request, f'Отклонено оценок: {updated}')
    reject_ratings.short_description = 'Отклонить %(verbose_name_plural)s'


@admin.register(CommentLike)
class CommentLikeAdmin(admin.ModelAdmin):
    """Админка для лайков комментариев."""

    list_display = ('user_link', 'comment_preview', 'is_like_display', 'created_at')
    list_filter = ('is_like', 'created_at')
    search_fields = ('user__email', 'comment__content')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)

    def user_link(self, obj):
        """Ссылка на пользователя."""
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'Пользователь'
    user_link.admin_order_field = 'user__email'

    def comment_preview(self, obj):
        """Превью комментария."""
        preview = obj.comment.content[:40]
        if len(obj.comment.content) > 40:
            preview += '...'
        return preview
    comment_preview.short_description = 'Комментарий'

    def is_like_display(self, obj):
        """Отображение типа реакции."""
        if obj.is_like:
            return format_html('<span style="color: green;">👍 Лайк</span>')
        else:
            return format_html('<span style="color: red;">👎 Дизлайк</span>')
    is_like_display.short_description = 'Реакция'
