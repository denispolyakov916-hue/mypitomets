"""
Модуль для health checks и мониторинга состояния системы.
"""

import time
from django.core.cache import cache
from django.db import connection
from django.utils import timezone
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class HealthCheck:
    """Класс для проверки здоровья системы."""
    
    @staticmethod
    def check_database():
        """Проверка подключения к базе данных."""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            return {'status': 'healthy', 'response_time_ms': 0}
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {'status': 'unhealthy', 'error': str(e)}
    
    @staticmethod
    def check_cache():
        """Проверка работы кэша."""
        try:
            test_key = 'health_check_test'
            test_value = f'test_{time.time()}'
            
            start_time = time.time()
            cache.set(test_key, test_value, 10)
            retrieved_value = cache.get(test_key)
            response_time = (time.time() - start_time) * 1000  # в миллисекундах
            
            if retrieved_value == test_value:
                cache.delete(test_key)
                return {
                    'status': 'healthy',
                    'response_time_ms': round(response_time, 2)
                }
            else:
                return {'status': 'unhealthy', 'error': 'Cache value mismatch'}
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return {'status': 'unhealthy', 'error': str(e)}
    
    @staticmethod
    def check_disk_space():
        """Проверка свободного места на диске (базовая проверка)."""
        try:
            import shutil
            total, used, free = shutil.disk_usage(settings.BASE_DIR)
            free_percent = (free / total) * 100
            
            return {
                'status': 'healthy' if free_percent > 10 else 'warning',
                'free_percent': round(free_percent, 2),
                'free_gb': round(free / (1024**3), 2),
                'total_gb': round(total / (1024**3), 2)
            }
        except Exception as e:
            logger.error(f"Disk space check failed: {e}")
            return {'status': 'unhealthy', 'error': str(e)}
    
    @staticmethod
    def get_system_info():
        """Получение информации о системе."""
        try:
            import platform
            import sys
            
            return {
                'python_version': sys.version.split()[0],
                'platform': platform.platform(),
                'django_version': settings.DJANGO_VERSION if hasattr(settings, 'DJANGO_VERSION') else 'unknown',
                'debug': settings.DEBUG,
                'timezone': str(timezone.get_current_timezone())
            }
        except Exception as e:
            logger.error(f"System info check failed: {e}")
            return {'status': 'unhealthy', 'error': str(e)}
    
    @classmethod
    def full_check(cls):
        """Полная проверка здоровья системы."""
        start_time = time.time()
        
        checks = {
            'database': cls.check_database(),
            'cache': cls.check_cache(),
            'disk_space': cls.check_disk_space(),
            'system': cls.get_system_info()
        }
        
        # Определяем общий статус
        unhealthy_checks = [k for k, v in checks.items() if v.get('status') == 'unhealthy']
        warning_checks = [k for k, v in checks.items() if v.get('status') == 'warning']
        
        if unhealthy_checks:
            overall_status = 'unhealthy'
        elif warning_checks:
            overall_status = 'warning'
        else:
            overall_status = 'healthy'
        
        total_time = (time.time() - start_time) * 1000
        
        return {
            'status': overall_status,
            'timestamp': timezone.now().isoformat(),
            'checks': checks,
            'response_time_ms': round(total_time, 2),
            'unhealthy_components': unhealthy_checks,
            'warning_components': warning_checks
        }


class MetricsCollector:
    """Класс для сбора метрик производительности."""
    
    @staticmethod
    def get_request_metrics():
        """Получение метрик запросов из middleware."""
        # Метрики собираются через RequestLoggingMiddleware
        # Здесь можно добавить агрегацию метрик
        return {
            'note': 'Metrics are collected via RequestLoggingMiddleware',
            'log_file': getattr(settings, 'LOGGING', {}).get('handlers', {}).get('file', {}).get('filename', 'N/A')
        }
    
    @staticmethod
    def get_database_metrics():
        """Получение метрик базы данных."""
        try:
            with connection.cursor() as cursor:
                # Количество запросов
                cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
                table_count = cursor.fetchone()[0]
                
                # Размер базы данных (PostgreSQL)
                try:
                    cursor.execute("""
                        SELECT pg_size_pretty(pg_database_size(current_database()))
                    """)
                    db_size = cursor.fetchone()[0]
                except:
                    db_size = 'unknown'
                
                return {
                    'table_count': table_count,
                    'database_size': db_size,
                    'status': 'healthy'
                }
        except Exception as e:
            logger.error(f"Database metrics collection failed: {e}")
            return {'status': 'error', 'error': str(e)}
    
    @staticmethod
    def get_cache_metrics():
        """Получение метрик кэша."""
        try:
            # Для LocMemCache метрики ограничены
            # Для Redis можно получить больше информации
            cache_backend = settings.CACHES['default']['BACKEND']
            
            metrics = {
                'backend': cache_backend,
                'status': 'healthy'
            }
            
            # Если используется Redis, можно получить больше метрик
            if 'redis' in cache_backend.lower():
                # Здесь можно добавить Redis-специфичные метрики
                pass
            
            return metrics
        except Exception as e:
            logger.error(f"Cache metrics collection failed: {e}")
            return {'status': 'error', 'error': str(e)}
    
    @classmethod
    def get_all_metrics(cls):
        """Получение всех метрик."""
        return {
            'timestamp': timezone.now().isoformat(),
            'request_metrics': cls.get_request_metrics(),
            'database_metrics': cls.get_database_metrics(),
            'cache_metrics': cls.get_cache_metrics()
        }

