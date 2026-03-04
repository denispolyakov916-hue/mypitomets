"""
Система кэширования для аналитических данных админ-панели.

Оптимизирует производительность тяжелых запросов к аналитике
с использованием Redis или Django cache framework.
"""

from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
from functools import wraps
import hashlib
import json


class AdminCacheManager:
    """Менеджер кэширования для админ-панели."""

    # Ключи кэша
    DASHBOARD_OVERVIEW_KEY = 'admin:dashboard:overview'
    CHARTS_DATA_KEY = 'admin:charts:data:{period}'
    TOP_PRODUCTS_KEY = 'admin:top_products:{limit}'
    RECENT_ORDERS_KEY = 'admin:recent_orders:{limit}'
    STATS_SUMMARY_KEY = 'admin:stats:summary'

    # Время жизни кэша (в секундах)
    CACHE_TIMEOUTS = {
        'overview': 300,      # 5 минут
        'charts': 600,        # 10 минут
        'top_products': 1800, # 30 минут
        'recent_orders': 60,  # 1 минута
        'summary': 30,        # 30 секунд
    }

    @classmethod
    def get_cache_key(cls, key_template, **kwargs):
        """Генерация ключа кэша с параметрами."""
        return key_template.format(**kwargs)

    @classmethod
    def make_hash_key(cls, data):
        """Создание хэш-ключа для данных."""
        data_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(data_str.encode()).hexdigest()[:8]

    @classmethod
    def cached_analytics(cls, timeout_key):
        """
        Декоратор для кэширования аналитических функций.

        Args:
            timeout_key: Ключ для времени жизни из CACHE_TIMEOUTS
        
        Note:
            Кэширует только данные (Response.data), а не сам Response объект,
            т.к. Response нельзя сериализовать для кэша.
        """
        from rest_framework.response import Response
        
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Создаем ключ кэша на основе имени функции и параметров
                func_name = func.__name__
                params_key = cls.make_hash_key(kwargs)
                cache_key = f'admin:{func_name}:{params_key}'

                # Проверяем кэш
                cached_data = cache.get(cache_key)
                if cached_data is not None:
                    # Возвращаем новый Response с кэшированными данными
                    return Response(cached_data)

                # Выполняем функцию
                result = func(*args, **kwargs)

                # Сохраняем в кэш только данные, не Response
                if hasattr(result, 'data'):
                    timeout = cls.CACHE_TIMEOUTS.get(timeout_key, 300)
                    cache.set(cache_key, result.data, timeout)

                return result
            return wrapper
        return decorator

    @classmethod
    def invalidate_cache(cls, pattern=None):
        """
        Инвалидация кэша.

        Args:
            pattern: Шаблон для инвалидации (опционально)
        """
        if pattern:
            # Для Redis можно использовать KEYS pattern
            # Здесь упрощенная реализация
            cache.delete_pattern(pattern)
        else:
            # Инвалидация всех ключей админки
            cache.delete_pattern('admin:*')

    @classmethod
    def get_cache_info(cls):
        """Получение информации о кэше."""
        # В реальной реализации можно добавить метрики
        return {
            'cache_backend': str(cache),
            'timeouts': cls.CACHE_TIMEOUTS,
            'timestamp': timezone.now().isoformat(),
        }


def invalidate_analytics_cache():
    """Инвалидация всего кэша аналитики."""
    AdminCacheManager.invalidate_cache('admin:analytics:*')


def invalidate_dashboard_cache():
    """Инвалидация кэша дашборда."""
    AdminCacheManager.invalidate_cache('admin:dashboard:*')


def invalidate_products_cache():
    """Инвалидация кэша товаров."""
    AdminCacheManager.invalidate_cache('admin:*products*')


def invalidate_orders_cache():
    """Инвалидация кэша заказов."""
    AdminCacheManager.invalidate_cache('admin:*orders*')


# Декораторы для аналитических функций
cached_dashboard_overview = AdminCacheManager.cached_analytics('overview')
cached_charts_data = AdminCacheManager.cached_analytics('charts')
cached_top_products = AdminCacheManager.cached_analytics('top_products')
cached_recent_orders = AdminCacheManager.cached_analytics('recent_orders')
cached_stats_summary = AdminCacheManager.cached_analytics('summary')


class AnalyticsCacheMixin:
    """Mixin для ViewSets с автоматическим кэшированием."""

    def dispatch(self, request, *args, **kwargs):
        """Перехват запросов для инвалидации кэша при изменениях."""
        response = super().dispatch(request, *args, **kwargs)

        # Инвалидация кэша при изменениях данных
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            self.invalidate_related_cache()

        return response

    def invalidate_related_cache(self):
        """Инвалидация связанного кэша. Переопределяется в наследниках."""
        pass


class DashboardCacheMixin(AnalyticsCacheMixin):
    """Mixin для дашборда с инвалидацией кэша."""

    def invalidate_related_cache(self):
        """Инвалидация кэша дашборда при изменениях."""
        invalidate_dashboard_cache()
        invalidate_analytics_cache()


class ProductsCacheMixin(AnalyticsCacheMixin):
    """Mixin для товаров с инвалидацией кэша."""

    def invalidate_related_cache(self):
        """Инвалидация кэша товаров при изменениях."""
        invalidate_products_cache()
        invalidate_dashboard_cache()


class OrdersCacheMixin(AnalyticsCacheMixin):
    """Mixin для заказов с инвалидацией кэша."""

    def invalidate_related_cache(self):
        """Инвалидация кэша заказов и связанной аналитики."""
        invalidate_orders_cache()
        invalidate_dashboard_cache()
        invalidate_analytics_cache()
