"""
Исключения для обработки ошибок API

Классы исключений для единообразной обработки ошибок в API,
аналогично проекту-образцу.
"""

from rest_framework import status
from rest_framework.exceptions import APIException
from django.conf import settings


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

