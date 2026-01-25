"""
Исключения для обработки ошибок API

Этот модуль предоставляет стандартизированную систему обработки ошибок:
- ApiError: Базовый класс исключений с кодами и деталями
- Специализированные ошибки: NotFoundError, ValidationError, PermissionError
- Декораторы для автоматической обработки: handle_api_errors, safe_api_operation
- ErrorResponseBuilder: Утилиты для создания ответов с ошибками

Используется во всех views и сервисах для:
- Единообразного формата ошибок в API ответах
- Автоматического логирования исключений
- Стандартизации кодов ошибок
- Правильной обработки валидации и прав доступа

Декораторы:
    - @handle_api_errors: Автоматически преобразует исключения в ApiError
    - @safe_api_operation: Безопасное выполнение операций с Response
    - @handle_service_errors: Обработка ошибок в сервисах
"""

import functools
import logging
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from django.conf import settings

logger = logging.getLogger('apps')


class ApiError(APIException):
    """Базовое исключение для ошибок API."""
    
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'Произошла ошибка'
    default_code = 'error'
    
    def __init__(self, status_code=None, detail=None, errors=None, error_code=None):
        if status_code is not None:
            self.status_code = status_code
        if detail is not None:
            self.detail = detail
        else:
            self.detail = self.default_detail
        
        if errors is not None:
            self.errors = errors
        else:
            self.errors = []
        
        self.error_code = error_code or self.default_code
        
        super().__init__(self.detail)
    
    def get_full_details(self):
        """Получить полные детали ошибки для ответа."""
        response = {
            'error': self.detail,
            'code': self.error_code,
        }
        
        if self.errors:
            response['errors'] = self.errors
        
        # В DEBUG режиме добавляем дополнительную информацию
        if settings.DEBUG:
            response['status_code'] = self.status_code
            response['exception_type'] = type(self).__name__
        
        return response
    
    @staticmethod
    def unauthorized_error(detail=None):
        """Ошибка неавторизованного доступа."""
        return ApiError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail or 'Пользователь не авторизован',
            error_code='UNAUTHORIZED'
        )
    
    @staticmethod
    def bad_request(message, errors=None, error_code='BAD_REQUEST'):
        """Ошибка некорректного запроса."""
        return ApiError(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
            errors=errors or [],
            error_code=error_code
        )
    
    @staticmethod
    def forbidden(detail=None, error_code='FORBIDDEN'):
        """Ошибка запрещенного доступа."""
        return ApiError(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail or 'Доступ запрещен',
            error_code=error_code
        )
    
    @staticmethod
    def not_found(message, error_code='NOT_FOUND'):
        """Ошибка ресурс не найден."""
        return ApiError(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=message or 'Ресурс не найден',
            error_code=error_code
        )
    
    @staticmethod
    def validation_error(message, errors=None):
        """Ошибка валидации."""
        return ApiError(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message or 'Ошибка валидации',
            errors=errors or [],
            error_code='VALIDATION_ERROR'
        )
    
    @staticmethod
    def internal_error(message=None, error_code='INTERNAL_ERROR'):
        """Внутренняя ошибка сервера."""
        detail = message if message else 'Внутренняя ошибка сервера'
        if not settings.DEBUG:
            detail = 'Произошла внутренняя ошибка. Пожалуйста, попробуйте позже.'
        
        return ApiError(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code=error_code
        )
    
    @staticmethod
    def conflict(message, error_code='CONFLICT'):
        """Ошибка конфликта (409)."""
        return ApiError(
            status_code=status.HTTP_409_CONFLICT,
            detail=message or 'Конфликт ресурсов',
            error_code=error_code
        )


class ValidationError(ApiError):
    """Ошибка валидации данных."""
    
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Ошибка валидации'
    default_code = 'VALIDATION_ERROR'


class NotFoundError(ApiError):
    """Ошибка ресурс не найден."""
    
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Ресурс не найден'
    default_code = 'NOT_FOUND'


class PermissionError(ApiError):
    """Ошибка доступа."""

    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'Доступ запрещен'
    default_code = 'FORBIDDEN'


# =============================================================================
# ДЕКОРАТОРЫ ДЛЯ АВТОМАТИЧЕСКОЙ ОБРАБОТКИ ИСКЛЮЧЕНИЙ
# =============================================================================

def handle_api_errors(view_func=None, log_errors=True):
    """
    Декоратор для автоматической обработки исключений в API views.

    Преобразует исключения в стандартные ApiError ответы.

    Args:
        view_func: Декорируемая функция
        log_errors: Логировать ли ошибки

    Returns:
        Response: Стандартизированный ответ с ошибкой
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except ApiError as e:
                # ApiError уже обработано, просто возвращаем
                if log_errors:
                    logger.warning(f"ApiError in {func.__name__}: {e.detail} (code: {e.error_code})")
                raise
            except Exception as e:
                # Преобразуем неожиданные исключения в ApiError
                if log_errors:
                    logger.error(f"Unexpected error in {func.__name__}: {type(e).__name__}: {str(e)}", exc_info=True)

                # Определяем тип ошибки
                if isinstance(e, ValueError):
                    raise ApiError.validation_error(str(e))
                elif isinstance(e, PermissionError) or 'permission' in str(e).lower():
                    raise ApiError.forbidden(str(e))
                elif 'not found' in str(e).lower() or 'does not exist' in str(e).lower():
                    raise ApiError.not_found(str(e))
                else:
                    raise ApiError.internal_error(str(e))
        return wrapper

    if view_func is not None:
        return decorator(view_func)
    return decorator


def handle_service_errors(service_method):
    """
    Декоратор для обработки ошибок в сервисных методах.

    Преобразует исключения в ApiError и логирует их.

    Args:
        service_method: Метод сервиса

    Returns:
        Результат метода или ApiError
    """
    @functools.wraps(service_method)
    def wrapper(*args, **kwargs):
        try:
            return service_method(*args, **kwargs)
        except ApiError:
            # ApiError пробрасываем дальше
            raise
        except Exception as e:
            # Логируем и преобразуем в ApiError
            logger.error(f"Service error in {service_method.__name__}: {type(e).__name__}: {str(e)}", exc_info=True)

            # Определяем тип ошибки по сообщению
            error_msg = str(e).lower()
            if 'permission' in error_msg or 'access' in error_msg:
                raise ApiError.forbidden(str(e))
            elif 'not found' in error_msg or 'does not exist' in error_msg:
                raise ApiError.not_found(str(e))
            elif 'validation' in error_msg or 'invalid' in error_msg:
                raise ApiError.validation_error(str(e))
            else:
                raise ApiError.internal_error(str(e))

    return wrapper


def safe_api_operation(operation_name=None):
    """
    Декоратор для безопасного выполнения операций в API views.

    Автоматически обрабатывает исключения и возвращает Response.

    Args:
        operation_name: Название операции для логирования

    Returns:
        Response: Успешный результат или ошибка
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(self, request, *args, **kwargs):
            try:
                result = func(self, request, *args, **kwargs)

                # Если результат уже Response, возвращаем как есть
                if isinstance(result, Response):
                    return result

                # Логируем успешную операцию
                op_name = operation_name or f"{func.__name__}"
                logger.info(f"API operation '{op_name}' completed successfully")

                return result

            except ApiError as e:
                # ApiError преобразуем в Response
                op_name = operation_name or f"{func.__name__}"
                logger.warning(f"API operation '{op_name}' failed: {e.detail}")

                return Response(
                    e.get_full_details(),
                    status=e.status_code
                )

            except Exception as e:
                # Неожиданная ошибка
                op_name = operation_name or f"{func.__name__}"
                logger.error(f"Unexpected error in API operation '{op_name}': {type(e).__name__}: {str(e)}", exc_info=True)

                error_response = ApiError.internal_error(str(e))
                return Response(
                    error_response.get_full_details(),
                    status=error_response.status_code
                )

        return wrapper
    return decorator


# =============================================================================
# УТИЛИТЫ ДЛЯ ОБРАБОТКИ ОШИБОК
# =============================================================================

class ErrorResponseBuilder:
    """
    Строитель ответов с ошибками для единообразия.
    """

    @staticmethod
    def validation_error(message, field_errors=None):
        """Создать ответ с ошибкой валидации."""
        response_data = {
            'error': message,
            'code': 'VALIDATION_ERROR'
        }
        if field_errors:
            response_data['errors'] = field_errors

        return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

    @staticmethod
    def not_found(resource_name="Ресурс"):
        """Создать ответ 'не найдено'."""
        return Response({
            'error': f'{resource_name} не найден',
            'code': 'NOT_FOUND'
        }, status=status.HTTP_404_NOT_FOUND)

    @staticmethod
    def forbidden(message="Доступ запрещен"):
        """Создать ответ 'доступ запрещен'."""
        return Response({
            'error': message,
            'code': 'FORBIDDEN'
        }, status=status.HTTP_403_FORBIDDEN)

    @staticmethod
    def conflict(message="Конфликт ресурсов"):
        """Создать ответ с конфликтом."""
        return Response({
            'error': message,
            'code': 'CONFLICT'
        }, status=status.HTTP_409_CONFLICT)

    @staticmethod
    def server_error(message=None):
        """Создать ответ с внутренней ошибкой."""
        error_msg = message or "Внутренняя ошибка сервера"
        if not settings.DEBUG:
            error_msg = "Произошла внутренняя ошибка. Пожалуйста, попробуйте позже."

        return Response({
            'error': error_msg,
            'code': 'INTERNAL_ERROR'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

