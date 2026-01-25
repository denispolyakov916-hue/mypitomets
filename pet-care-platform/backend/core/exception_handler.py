"""
Глобальный обработчик исключений для Django REST Framework.

Обеспечивает единообразную обработку всех исключений в API.
"""

import logging
from django.conf import settings
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from core.exceptions import ApiError

logger = logging.getLogger('apps')


def custom_exception_handler(exc, context):
    """
    Кастомный обработчик исключений для DRF.
    
    Args:
        exc: Исключение
        context: Контекст запроса
    
    Returns:
        Response: Ответ с ошибкой
    """
    # Получаем стандартную обработку от DRF
    response = exception_handler(exc, context)
    
    # Если это ApiError, используем наш формат
    if isinstance(exc, ApiError):
        return Response(
            exc.get_full_details(),
            status=exc.status_code
        )
    
    # Если DRF обработал исключение, форматируем ответ
    if response is not None:
        # Получаем request из контекста
        request = context.get('request')
        request_id = getattr(request, 'request_id', None) if request else None
        
        # Форматируем ответ
        custom_response_data = {
            'error': response.data.get('detail', 'Произошла ошибка'),
            'code': response.data.get('code', 'ERROR'),
        }
        
        # Добавляем детали ошибок валидации
        if 'detail' not in response.data and isinstance(response.data, dict):
            # Это может быть ошибка валидации с несколькими полями
            if len(response.data) > 1:
                custom_response_data['errors'] = response.data
            else:
                # Одна ошибка
                for key, value in response.data.items():
                    if isinstance(value, list):
                        custom_response_data['error'] = value[0] if value else 'Ошибка валидации'
                        custom_response_data['errors'] = {key: value}
                    else:
                        custom_response_data['error'] = str(value)
        
        # В DEBUG режиме добавляем дополнительную информацию
        if settings.DEBUG:
            custom_response_data['debug'] = {
                'exception_type': type(exc).__name__,
                'exception_message': str(exc),
                'request_id': request_id,
            }
        
        return Response(custom_response_data, status=response.status_code)
    
    # Необработанное исключение
    request = context.get('request')
    request_id = getattr(request, 'request_id', None) if request else None
    
    # Логируем необработанное исключение
    logger.error(
        f"Unhandled exception: {type(exc).__name__}: {str(exc)}",
        extra={
            'request_id': request_id,
            'exception_type': type(exc).__name__,
            'exception_message': str(exc),
        },
        exc_info=True
    )
    
    # Формируем ответ
    error_detail = 'Внутренняя ошибка сервера'
    if settings.DEBUG:
        error_detail = f'{type(exc).__name__}: {str(exc)}'
    
    response_data = {
        'error': error_detail,
        'code': 'INTERNAL_ERROR',
    }
    
    if settings.DEBUG:
        response_data['debug'] = {
            'exception_type': type(exc).__name__,
            'exception_message': str(exc),
            'request_id': request_id,
        }
    
    return Response(response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

