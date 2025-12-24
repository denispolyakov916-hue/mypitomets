"""
Полноценная админка для управления курсами и обучением.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Course, UserCourse


class UserCourseInline(admin.TabularInline):
    """Inline для пользователей, проходящих курс."""
    model = UserCourse
    extra = 0
    fields = ('user', 'purchased_at', 'progress', 'progress_bar')
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
        'students_count', 'is_active', 'created_at'
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
    
    inlines = [UserCourseInline]
    
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
    
    def image_preview(self, obj):
        """Превью обложки курса."""
        if obj.image_url:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 200px;" />',
                obj.image_url
            )
        return 'Нет обложки'
    image_preview.short_description = 'Обложка'
    
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
