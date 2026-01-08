"""
Сигналы Django для инвалидации кэша при изменении данных.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Course
from core.cache_utils import CacheManager


@receiver(post_save, sender=Course)
def invalidate_course_cache(sender, instance, **kwargs):
    """Инвалидация кэша курсов при сохранении."""
    # Инвалидируем кэш списка курсов
    CacheManager.invalidate_courses_cache()
    # Инвалидируем кэш деталей курса
    from django.core.cache import cache
    cache.delete(f'course_detail:{instance.id}')


@receiver(post_delete, sender=Course)
def invalidate_course_cache_on_delete(sender, instance, **kwargs):
    """Инвалидация кэша курсов при удалении."""
    CacheManager.invalidate_courses_cache()
    from django.core.cache import cache
    cache.delete(f'course_detail:{instance.id}')

