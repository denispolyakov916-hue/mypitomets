"""
Сигналы Django для инвалидации кэша при изменении данных.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Product
from core.cache_utils import CacheManager
from apps.reviews.models import Review


@receiver(post_save, sender=Product)
def invalidate_product_cache(sender, instance, **kwargs):
    """Инвалидация кэша товаров при сохранении."""
    # Инвалидируем кэш списка товаров
    CacheManager.invalidate_products_cache()
    # Инвалидируем кэш деталей товара
    from django.core.cache import cache
    cache.delete(f'product_detail:{instance.id}')


@receiver(post_delete, sender=Product)
def invalidate_product_cache_on_delete(sender, instance, **kwargs):
    """Инвалидация кэша товаров при удалении."""
    CacheManager.invalidate_products_cache()
    from django.core.cache import cache
    cache.delete(f'product_detail:{instance.id}')


@receiver(post_save, sender=Review)
@receiver(post_delete, sender=Review)
def invalidate_product_cache_on_review_change(sender, instance, **kwargs):
    """Инвалидация кэша товара при изменении отзыва."""
    if instance.product_id:
        # Инвалидируем кэш деталей товара
        from django.core.cache import cache
        cache.delete(f'product_detail:{instance.product_id}')
        # Инвалидируем кэш списка товаров (для страницы магазина)
        CacheManager.invalidate_products_cache()

