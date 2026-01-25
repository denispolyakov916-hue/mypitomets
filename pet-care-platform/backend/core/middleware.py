"""
Middleware для логирования запросов и добавления контекста.
"""

import logging
import time
import uuid
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('apps')


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware для логирования всех запросов с контекстом.
    
    Добавляет:
    - request_id для трейсинга
    - user_id (если пользователь авторизован)
    - время выполнения запроса
    - параметры запроса (без чувствительных данных)
    """
    
    def process_request(self, request):
        """Обработка входящего запроса."""
        # Генерируем уникальный ID для запроса
        request.request_id = str(uuid.uuid4())[:8]
        
        # Сохраняем время начала запроса
        request._start_time = time.time()
        
        # Получаем информацию о пользователе
        user_id = None
        user_email = None
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_id = str(request.user.id)
            user_email = request.user.email
        
        # Логируем начало запроса
        logger.info(
            f"Request started: {request.method} {request.path}",
            extra={
                'request_id': request.request_id,
                'user_id': user_id,
                'user_email': user_email,
                'method': request.method,
                'path': request.path,
                'query_params': dict(request.GET),
                'ip_address': self.get_client_ip(request),
            }
        )
    
    def process_response(self, request, response):
        """Обработка исходящего ответа."""
        # Вычисляем время выполнения
        duration = None
        if hasattr(request, '_start_time'):
            duration = time.time() - request._start_time
        
        # Получаем информацию о пользователе
        user_id = None
        user_email = None
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_id = str(request.user.id)
            user_email = request.user.email
        
        # Определяем уровень логирования на основе статуса ответа
        log_level = 'info'
        if response.status_code >= 500:
            log_level = 'error'
        elif response.status_code >= 400:
            log_level = 'warning'
        
        # Логируем завершение запроса
        log_message = (
            f"Request completed: {request.method} {request.path} "
            f"Status: {response.status_code} Duration: {duration:.3f}s"
        )
        
        log_extra = {
            'request_id': getattr(request, 'request_id', None),
            'user_id': user_id,
            'user_email': user_email,
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration': duration,
            'ip_address': self.get_client_ip(request),
        }
        
        if log_level == 'error':
            logger.error(log_message, extra=log_extra)
        elif log_level == 'warning':
            logger.warning(log_message, extra=log_extra)
        else:
            logger.info(log_message, extra=log_extra)
        
        # Добавляем request_id в заголовки ответа (для отладки)
        if hasattr(request, 'request_id'):
            response['X-Request-ID'] = request.request_id
        
        return response
    
    def process_exception(self, request, exception):
        """Обработка исключений."""
        # Вычисляем время выполнения до ошибки
        duration = None
        if hasattr(request, '_start_time'):
            duration = time.time() - request._start_time
        
        # Получаем информацию о пользователе
        user_id = None
        user_email = None
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_id = str(request.user.id)
            user_email = request.user.email
        
        # Логируем исключение
        logger.error(
            f"Request exception: {request.method} {request.path} "
            f"Exception: {type(exception).__name__} Duration: {duration:.3f}s",
            extra={
                'request_id': getattr(request, 'request_id', None),
                'user_id': user_id,
                'user_email': user_email,
                'method': request.method,
                'path': request.path,
                'exception_type': type(exception).__name__,
                'exception_message': str(exception),
                'duration': duration,
                'ip_address': self.get_client_ip(request),
            },
            exc_info=True
        )
        
        # Возвращаем None, чтобы Django REST Framework обработал исключение
        # или можно вернуть Response для кастомной обработки
        return None
    
    @staticmethod
    def get_client_ip(request):
        """Получение IP адреса клиента."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SensitiveDataFilter(logging.Filter):
    """
    Фильтр для удаления чувствительных данных из логов.
    
    Удаляет пароли, токены и другие чувствительные данные.
    """
    
    SENSITIVE_KEYS = [
        'password', 'token', 'secret', 'key', 'api_key',
        'access_token', 'refresh_token', 'authorization',
        'credit_card', 'cvv', 'cvc', 'ssn', 'passport'
    ]
    
    def filter(self, record):
        """Фильтрация записи лога."""
        # Удаляем чувствительные данные из extra
        if hasattr(record, 'query_params'):
            record.query_params = self._sanitize_dict(record.query_params)
        
        if hasattr(record, 'request_data'):
            record.request_data = self._sanitize_dict(record.request_data)
        
        return True
    
    def _sanitize_dict(self, data):
        """Удаление чувствительных данных из словаря."""
        if not isinstance(data, dict):
            return data
        
        sanitized = {}
        for key, value in data.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in self.SENSITIVE_KEYS):
                sanitized[key] = '***REDACTED***'
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[key] = [self._sanitize_dict(item) if isinstance(item, dict) else item for item in value]
            else:
                sanitized[key] = value
        
        return sanitized

