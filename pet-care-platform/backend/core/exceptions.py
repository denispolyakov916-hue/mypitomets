"""
Исключения для обработки ошибок API

Классы исключений для единообразной обработки ошибок в API,
аналогично проекту-образцу.
"""

from rest_framework import status
from rest_framework.exceptions import APIException


class ApiError(APIException):
    """Базовое исключение для ошибок API."""
    
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'Произошла ошибка'
    default_code = 'error'
    
    def __init__(self, status_code=None, detail=None, errors=None):
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
        
        super().__init__(self.detail)
    
    @staticmethod
    def unauthorized_error():
        """Ошибка неавторизованного доступа."""
        return ApiError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Пользователь не авторизован'
        )
    
    @staticmethod
    def bad_request(message, errors=None):
        """Ошибка некорректного запроса."""
        return ApiError(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
            errors=errors or []
        )

