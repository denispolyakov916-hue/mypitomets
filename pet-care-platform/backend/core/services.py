"""
Базовые классы для сервисного слоя.

Обеспечивает единообразную структуру всех сервисов в приложении.
"""

import logging
from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseService(ABC):
    """
    Базовый класс для всех сервисов.
    
    Предоставляет общие методы и структуру для всех сервисов приложения.
    """
    
    @classmethod
    def log_error(cls, error: Exception, context: Optional[Dict[str, Any]] = None):
        """
        Логирование ошибок с контекстом.
        
        Args:
            error: Исключение
            context: Дополнительный контекст для логирования
        """
        context_str = f" Context: {context}" if context else ""
        logger.error(f"{cls.__name__} error: {str(error)}{context_str}", exc_info=True)
    
    @classmethod
    def log_info(cls, message: str, context: Optional[Dict[str, Any]] = None):
        """
        Логирование информационных сообщений.
        
        Args:
            message: Сообщение для логирования
            context: Дополнительный контекст
        """
        context_str = f" Context: {context}" if context else ""
        logger.info(f"{cls.__name__}: {message}{context_str}")
    
    @classmethod
    def validate_required_fields(cls, data: Dict[str, Any], required_fields: List[str]) -> bool:
        """
        Валидация обязательных полей.
        
        Args:
            data: Словарь с данными
            required_fields: Список обязательных полей
            
        Returns:
            bool: True если все поля присутствуют
            
        Raises:
            ValueError: Если отсутствуют обязательные поля
        """
        missing_fields = [field for field in required_fields if field not in data or data[field] is None]
        if missing_fields:
            raise ValueError(f"Отсутствуют обязательные поля: {', '.join(missing_fields)}")
        return True
    
    @classmethod
    def safe_get(cls, data: Dict[str, Any], key: str, default: Any = None) -> Any:
        """
        Безопасное получение значения из словаря.
        
        Args:
            data: Словарь
            key: Ключ
            default: Значение по умолчанию
            
        Returns:
            Значение из словаря или default
        """
        return data.get(key, default)


class ServiceResult:
    """
    Базовый класс для результатов работы сервисов.
    
    Обеспечивает единообразный формат возврата результатов.
    """
    
    def __init__(
        self,
        success: bool,
        message: str = "",
        data: Optional[Any] = None,
        errors: Optional[List[str]] = None,
        error_code: Optional[str] = None
    ):
        """
        Инициализация результата.
        
        Args:
            success: Успешность операции
            message: Сообщение о результате
            data: Данные результата
            errors: Список ошибок
            error_code: Код ошибки
        """
        self.success = success
        self.message = message
        self.data = data
        self.errors = errors or []
        self.error_code = error_code
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Преобразование результата в словарь.
        
        Returns:
            Словарь с результатом
        """
        result = {
            'success': self.success,
            'message': self.message,
        }
        
        if self.data is not None:
            result['data'] = self.data
        
        if self.errors:
            result['errors'] = self.errors
        
        if self.error_code:
            result['error_code'] = self.error_code
        
        return result
    
    def __bool__(self) -> bool:
        """Возвращает success для использования в if."""
        return self.success
    
    def __repr__(self) -> str:
        """Строковое представление результата."""
        return f"ServiceResult(success={self.success}, message='{self.message}')"


class ValidationService(BaseService):
    """
    Базовый сервис для валидации данных.
    
    Предоставляет общие методы валидации.
    """
    
    @classmethod
    def validate_positive_number(cls, value: Any, field_name: str = "Значение") -> bool:
        """
        Валидация положительного числа.
        
        Args:
            value: Значение для валидации
            field_name: Название поля для сообщения об ошибке
            
        Returns:
            bool: True если значение валидно
            
        Raises:
            ValueError: Если значение не валидно
        """
        try:
            num_value = float(value)
            if num_value <= 0:
                raise ValueError(f"{field_name} должно быть положительным числом")
            return True
        except (ValueError, TypeError):
            raise ValueError(f"{field_name} должно быть числом")
    
    @classmethod
    def validate_non_empty_string(cls, value: Any, field_name: str = "Поле") -> bool:
        """
        Валидация непустой строки.
        
        Args:
            value: Значение для валидации
            field_name: Название поля для сообщения об ошибке
            
        Returns:
            bool: True если значение валидно
            
        Raises:
            ValueError: Если значение не валидно
        """
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{field_name} не может быть пустым")
        return True

