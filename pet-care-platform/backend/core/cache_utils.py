"""
Утилиты для кэширования данных.

Предоставляет декораторы и функции для кэширования результатов запросов.
"""

from functools import wraps
from django.core.cache import cache
from django.conf import settings
import hashlib
import json
from typing import Any, Callable, Optional


def make_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Создание ключа кэша на основе префикса и параметров.
    
    Args:
        prefix: Префикс ключа
        *args: Позиционные аргументы
        **kwargs: Именованные аргументы
    
    Returns:
        str: Ключ кэша
    """
    # Создаем строку из всех параметров
    params = {
        'args': [str(arg) for arg in args],
        'kwargs': {k: str(v) for k, v in sorted(kwargs.items())}
    }
    params_str = json.dumps(params, sort_keys=True, default=str)
    params_hash = hashlib.md5(params_str.encode()).hexdigest()[:12]
    
    return f'{prefix}:{params_hash}'


def cached_view(timeout: Optional[int] = None, key_prefix: Optional[str] = None):
    """
    Декоратор для кэширования результатов view-методов.
    
    Args:
        timeout: Время жизни кэша в секундах (по умолчанию из CACHE_TIMEOUTS)
        key_prefix: Префикс ключа кэша (по умолчанию имя функции)
    
    Usage:
        @cached_view(timeout=300, key_prefix='products_list')
        def get(self, request):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            # Определяем timeout
            cache_timeout = timeout
            if cache_timeout is None:
                # Используем настройки из CACHE_TIMEOUTS
                cache_timeout = getattr(
                    settings,
                    'CACHE_TIMEOUTS',
                    {}
                ).get(key_prefix or func.__name__, 300)
            
            # Создаем ключ кэша
            prefix = key_prefix or f'{self.__class__.__name__}:{func.__name__}'
            
            # Включаем query параметры в ключ для разных фильтров
            query_params = dict(request.query_params)
            # Исключаем параметры пагинации для более широкого кэширования
            query_params.pop('page', None)
            query_params.pop('per_page', None)
            
            cache_key = make_cache_key(prefix, query_params, *args, **kwargs)
            
            # Проверяем кэш
            cached_response = cache.get(cache_key)
            if cached_response is not None:
                from rest_framework.response import Response
                return Response(cached_response)
            
            # Выполняем view
            response = func(self, request, *args, **kwargs)
            
            # Сохраняем в кэш только данные Response
            if hasattr(response, 'data'):
                cache.set(cache_key, response.data, cache_timeout)
            
            return response
        return wrapper
    return decorator


def cached_function(timeout: int = 300, key_prefix: Optional[str] = None):
    """
    Декоратор для кэширования результатов функций.
    
    Args:
        timeout: Время жизни кэша в секундах
        key_prefix: Префикс ключа кэша (по умолчанию имя функции)
    
    Usage:
        @cached_function(timeout=600, key_prefix='recommendations')
        def get_recommendations(pet_id):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Создаем ключ кэша
            prefix = key_prefix or func.__name__
            cache_key = make_cache_key(prefix, *args, **kwargs)
            
            # Проверяем кэш
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Выполняем функцию
            result = func(*args, **kwargs)
            
            # Сохраняем в кэш
            cache.set(cache_key, result, timeout)
            
            return result
        return wrapper
    return decorator


def invalidate_cache_pattern(pattern: str):
    """
    Инвалидация кэша по шаблону.

    Для Redis используется delete_pattern, для LocMemCache — cache.clear() как fallback.

    Args:
        pattern: Шаблон ключа (например, 'products:*')
    """
    if hasattr(cache, 'delete_pattern'):
        cache.delete_pattern(pattern)
    elif pattern.endswith('*'):
        cache.clear()


def invalidate_cache_key(key: str):
    """
    Инвалидация конкретного ключа кэша.
    
    Args:
        key: Ключ кэша
    """
    cache.delete(key)


class CacheManager:
    """
    Менеджер кэширования для различных типов данных.
    
    Предоставляет методы для кэширования и инвалидации кэша.
    """
    
    # Префиксы ключей кэша
    PRODUCTS_PREFIX = 'products'
    COURSES_PREFIX = 'courses'
    RECOMMENDATIONS_PREFIX = 'recommendations'
    ADMIN_PREFIX = 'admin'
    
    @classmethod
    def get_products_cache_key(cls, filters: dict) -> str:
        """Получить ключ кэша для списка товаров."""
        return make_cache_key(cls.PRODUCTS_PREFIX, filters)
    
    @classmethod
    def get_courses_cache_key(cls, filters: dict) -> str:
        """Получить ключ кэша для списка курсов."""
        return make_cache_key(cls.COURSES_PREFIX, filters)
    
    @classmethod
    def get_recommendations_cache_key(cls, pet_id: str) -> str:
        """Получить ключ кэша для рекомендаций."""
        return f'{cls.RECOMMENDATIONS_PREFIX}:pet:{pet_id}'
    
    @classmethod
    def invalidate_products_cache(cls):
        """Инвалидация всего кэша товаров."""
        invalidate_cache_pattern(f'{cls.PRODUCTS_PREFIX}:*')
    
    @classmethod
    def invalidate_courses_cache(cls):
        """Инвалидация всего кэша курсов."""
        invalidate_cache_pattern(f'{cls.COURSES_PREFIX}:*')
    
    @classmethod
    def invalidate_recommendations_cache(cls, pet_id: Optional[str] = None):
        """
        Инвалидация кэша рекомендаций.
        
        Args:
            pet_id: ID питомца (если None - инвалидирует все рекомендации)
        """
        if pet_id:
            invalidate_cache_key(cls.get_recommendations_cache_key(pet_id))
        else:
            invalidate_cache_pattern(f'{cls.RECOMMENDATIONS_PREFIX}:*')
    
    @classmethod
    def invalidate_all_cache(cls):
        """Инвалидация всего кэша."""
        cache.clear()

