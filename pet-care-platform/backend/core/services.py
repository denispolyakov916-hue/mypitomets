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
    def log_warning(cls, message: str, context: Optional[Dict[str, Any]] = None):
        """
        Логирование предупреждений.

        Args:
            message: Сообщение для логирования
            context: Дополнительный контекст
        """
        context_str = f" Context: {context}" if context else ""
        logger.warning(f"{cls.__name__}: {message}{context_str}")

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


class BaseCRUDService(BaseService):
    """
    Базовый CRUD сервис для работы с моделями Django.

    Предоставляет стандартные CRUD операции с единообразным возвратом
    через ServiceResult и обработкой конкретных типов исключений.
    """

    def __init__(self, model):
        """
        Инициализация CRUD сервиса.

        Args:
            model: Django модель для работы
        """
        self.model = model

    def get_queryset(self, user=None):
        """
        Получение queryset для модели.

        Args:
            user: Пользователь для фильтрации (опционально)

        Returns:
            QuerySet: Базовый queryset
        """
        return self.model.objects.all()

    def get_by_id(self, obj_id, user=None):
        """
        Получение объекта по ID.

        Args:
            obj_id: ID объекта
            user: Пользователь для проверки прав (опционально)

        Returns:
            ServiceResult с объектом или ошибкой
        """
        try:
            instance = self.get_queryset(user).get(id=obj_id)
            return ServiceResult(success=True, data=instance)
        except self.model.DoesNotExist:
            return ServiceResult(
                success=False,
                message=f"{self.model.__name__} не найден",
                error_code="NOT_FOUND"
            )

    def create(self, data, user=None):
        """
        Создание нового объекта.

        Args:
            data: Данные для создания
            user: Пользователь (опционально)

        Returns:
            ServiceResult с созданным объектом или ошибкой
        """
        from django.core.exceptions import ValidationError
        from django.db import IntegrityError

        try:
            instance = self.model(**data)
            instance.full_clean()
            instance.save()
            self.log_info(f"Created {self.model.__name__}: {instance.id}", {"user": user})
            return ServiceResult(success=True, data=instance, message="Создано успешно")
        except ValidationError as e:
            self.log_warning(f"Ошибка валидации при создании {self.model.__name__}", {"errors": str(e)})
            return ServiceResult(
                success=False,
                message="Ошибка валидации",
                errors=e.messages if hasattr(e, 'messages') else [str(e)],
                error_code="VALIDATION_ERROR"
            )
        except IntegrityError as e:
            self.log_warning(f"Ошибка целостности при создании {self.model.__name__}", {"error": str(e)})
            return ServiceResult(
                success=False,
                message="Объект с такими данными уже существует",
                errors=[str(e)],
                error_code="INTEGRITY_ERROR"
            )
        except Exception as e:
            self.log_error(e, {"data": data, "user": user})
            return ServiceResult(
                success=False,
                message="Внутренняя ошибка при создании",
                errors=[str(e)],
                error_code="INTERNAL_ERROR"
            )

    def update(self, obj_id, data, user=None):
        """
        Обновление объекта.

        Args:
            obj_id: ID объекта
            data: Данные для обновления
            user: Пользователь (опционально)

        Returns:
            ServiceResult с обновлённым объектом или ошибкой
        """
        from django.core.exceptions import ValidationError
        from django.db import IntegrityError

        result = self.get_by_id(obj_id, user)
        if not result:
            return result

        instance = result.data
        try:
            for key, value in data.items():
                setattr(instance, key, value)

            instance.full_clean()
            instance.save()
            self.log_info(f"Updated {self.model.__name__}: {obj_id}", {"user": user})
            return ServiceResult(success=True, data=instance, message="Обновлено успешно")
        except ValidationError as e:
            return ServiceResult(
                success=False,
                message="Ошибка валидации",
                errors=e.messages if hasattr(e, 'messages') else [str(e)],
                error_code="VALIDATION_ERROR"
            )
        except IntegrityError as e:
            return ServiceResult(
                success=False,
                message="Конфликт данных",
                errors=[str(e)],
                error_code="INTEGRITY_ERROR"
            )
        except Exception as e:
            self.log_error(e, {"obj_id": obj_id, "data": data, "user": user})
            return ServiceResult(
                success=False,
                message="Внутренняя ошибка при обновлении",
                errors=[str(e)],
                error_code="INTERNAL_ERROR"
            )

    def delete(self, obj_id, user=None):
        """
        Удаление объекта.

        Args:
            obj_id: ID объекта
            user: Пользователь (опционально)

        Returns:
            ServiceResult с результатом удаления
        """
        result = self.get_by_id(obj_id, user)
        if not result:
            return result

        try:
            result.data.delete()
            self.log_info(f"Deleted {self.model.__name__}: {obj_id}", {"user": user})
            return ServiceResult(success=True, message="Удалено успешно")
        except Exception as e:
            self.log_error(e, {"obj_id": obj_id, "user": user})
            return ServiceResult(
                success=False,
                message="Ошибка при удалении",
                errors=[str(e)],
                error_code="INTERNAL_ERROR"
            )

    def list(self, filters=None, user=None, page=1, page_size=None):
        """
        Получение списка объектов с пагинацией.

        Args:
            filters: Фильтры для queryset
            user: Пользователь (опционально)
            page: Номер страницы
            page_size: Размер страницы

        Returns:
            QuerySet: Отфильтрованный и пагинированный queryset
        """
        from .constants import DEFAULT_PAGE_SIZE

        if page_size is None:
            page_size = DEFAULT_PAGE_SIZE

        queryset = self.get_queryset(user)

        if filters:
            queryset = queryset.filter(**filters)

        start = (page - 1) * page_size
        end = start + page_size

        return queryset[start:end]
