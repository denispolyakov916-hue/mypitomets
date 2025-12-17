"""Регистрация моделей курсов в админке."""

from django.contrib import admin
from .models import Course, UserCourse


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'price', 'pet_type', 'duration', 'is_active')
    list_filter = ('pet_type', 'is_active')
    search_fields = ('title',)
    ordering = ('title',)


@admin.register(UserCourse)
class UserCourseAdmin(admin.ModelAdmin):
    list_display = ('user', 'course', 'purchased_at', 'progress')
    list_filter = ('purchased_at',)
    search_fields = ('user__email', 'course__title')
