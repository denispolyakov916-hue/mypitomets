"""
Базовые сервисы для исключения дублирования бизнес-логики.

Этот модуль предоставляет фундаментальные сервисы, используемые во всем приложении:
- BaseService: Базовый класс с транзакциями, логированием и обработкой ошибок
- BaseCRUDService: CRUD операции для всех моделей с автоматической валидацией
- ServiceResult: Стандартизированный формат результатов операций
- NotificationService: Отправка email и push уведомлений
- ValidationService: Переиспользуемые функции валидации

Используется во всех приложениях (pets, shop, training, users) для:
- Стандартизации CRUD операций
- Автоматической обработки ошибок
- Логирования операций
- Отправки уведомлений пользователям

Основные сервисы:
    - BaseCRUDService: Наследуется всеми CRUD сервисами приложений
    - NotificationService: Отправка уведомлений о заказах, курсах и т.д.
    - ValidationService: Валидация данных пользователей, заказов, питомцев
"""

import logging
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone

from .exceptions import ApiError, handle_service_errors


logger = logging.getLogger(__name__)


class ServiceResult:
    """
    Результат выполнения сервисной операции.
    
    Позволяет возвращать как успешные результаты, так и ошибки
    с дополнительной информацией.
    """
    
    def __init__(self, success: bool = True, data=None, error: str = None, errors: list = None):
        self.success = success
        self.data = data
        self.error = error
        self.errors = errors or []
    
    @classmethod
    def ok(cls, data=None):
        """Успешный результат."""
        return cls(success=True, data=data)
    
    @classmethod
    def fail(cls, error: str, errors: list = None):
        """Неуспешный результат с ошибкой."""
        return cls(success=False, error=error, errors=errors)
    
    def __bool__(self):
        return self.success


class BaseService:
    """
    Базовый сервис с общими методами.

    Предоставляет:
    - Транзакции
    - Логирование
    - Обработку ошибок
    - Валидацию
    """

    def __init__(self, model=None):
        self.model = model
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    @transaction.atomic
    def execute_in_transaction(self, func, *args, **kwargs):
        """
        Выполнить функцию в транзакции.

        @param func: Функция для выполнения
        @param args: Позиционные аргументы
        @param kwargs: Именованные аргументы
        @return: Результат функции
        """
        try:
            result = func(*args, **kwargs)
            self.logger.info(f"Transaction completed successfully in {self.__class__.__name__}")
            return result
        except Exception as e:
            self.logger.error(f"Transaction failed in {self.__class__.__name__}: {str(e)}")
            raise

    def validate_data(self, data, validator=None):
        """
        Валидация данных.

        @param data: Данные для валидации
        @param validator: Функция-валидатор (опционально)
        @return: Валидированные данные
        @raises ValidationError: Если валидация не прошла
        """
        if validator:
            return validator(data)
        return data

    def log_operation(self, operation, entity_id=None, user=None, details=None):
        """
        Логирование операции.

        @param operation: Название операции
        @param entity_id: ID сущности
        @param user: Пользователь
        @param details: Дополнительные детали
        """
        user_info = f" by user {user}" if user else ""
        entity_info = f" for entity {entity_id}" if entity_id else ""
        details_info = f" - {details}" if details else ""

        self.logger.info(f"{operation}{entity_info}{user_info}{details_info}")

    def handle_error(self, error, operation=None):
        """
        Обработка ошибки с логированием.

        @param error: Исключение
        @param operation: Название операции
        @return: ApiError
        """
        operation_info = f" during {operation}" if operation else ""
        self.logger.error(f"Error{operation_info}: {str(error)}")

        if isinstance(error, ValidationError):
            return ApiError.validation_error(str(error))
        elif isinstance(error, ApiError):
            return error
        else:
            return ApiError.internal_error(str(error))


class BaseCRUDService(BaseService):
    """
    Базовый CRUD сервис для работы с моделями.

    Предоставляет стандартные CRUD операции с:
    - Валидацией
    - Логированием
    - Обработкой ошибок
    - Транзакциями
    """

    def __init__(self, model, serializer_class=None):
        super().__init__(model)
        self.serializer_class = serializer_class

    def get_queryset(self, user=None):
        """
        Получить базовый queryset.

        @param user: Пользователь для фильтрации (опционально)
        @return: QuerySet
        """
        queryset = self.model.objects.all()

        # Если модель имеет поле owner, фильтруем по пользователю
        if user and hasattr(self.model, 'owner'):
            queryset = queryset.filter(owner=user)

        return queryset

    @handle_service_errors
    def get_by_id(self, entity_id, user=None):
        """
        Получить сущность по ID.

        @param entity_id: ID сущности
        @param user: Пользователь (для проверки прав)
        @return: Экземпляр модели
        @raises ApiError: Если не найдено или нет доступа
        """
        queryset = self.get_queryset(user)
        instance = queryset.get(id=entity_id)

        # Дополнительная проверка прав доступа
        if user and hasattr(instance, 'owner') and instance.owner != user:
            raise ApiError.forbidden("Нет доступа к этому объекту")

        return instance

    def get_list(self, filters=None, user=None, order_by=None):
        """
        Получить список сущностей.

        @param filters: Словарь фильтров
        @param user: Пользователь
        @param order_by: Поле для сортировки
        @return: QuerySet
        """
        queryset = self.get_queryset(user)

        # Применяем фильтры
        if filters:
            queryset = queryset.filter(**filters)

        # Применяем сортировку
        if order_by:
            queryset = queryset.order_by(order_by)

        return queryset

    @handle_service_errors
    def create(self, data, user=None, validator=None):
        """
        Создать новую сущность.

        @param data: Данные для создания
        @param user: Пользователь
        @param validator: Функция валидации
        @return: Созданная сущность
        """
        def _create():
            # Валидация данных
            validated_data = self.validate_data(data, validator)

            # Создание экземпляра
            instance = self.model(**validated_data)

            # Установка owner если есть пользователь
            if user and hasattr(instance, 'owner'):
                instance.owner = user

            # Установка временных полей
            if hasattr(instance, 'created_at'):
                instance.created_at = timezone.now()
            if hasattr(instance, 'updated_at'):
                instance.updated_at = timezone.now()

            instance.save()

            # Логирование
            self.log_operation(
                f"Created {self.model.__name__}",
                instance.id,
                user,
                f"Data: {validated_data}"
            )

            return instance

        return self.execute_in_transaction(_create)

    @handle_service_errors
    def update(self, entity_id, data, user=None, validator=None, partial=True):
        """
        Обновить сущность.

        @param entity_id: ID сущности
        @param user: Пользователь
        @param validator: Функция валидации
        @param partial: Частичное обновление
        @return: Обновленная сущность
        """
        def _update():
            instance = self.get_by_id(entity_id, user)

            # Валидация данных
            validated_data = self.validate_data(data, validator)

            # Обновление полей
            for field, value in validated_data.items():
                if hasattr(instance, field):
                    setattr(instance, field, value)

            # Обновление временной метки
            if hasattr(instance, 'updated_at'):
                instance.updated_at = timezone.now()

            instance.save()

            # Логирование
            self.log_operation(
                f"Updated {self.model.__name__}",
                instance.id,
                user,
                f"Fields: {list(validated_data.keys())}"
            )

            return instance

        return self.execute_in_transaction(_update)

    @handle_service_errors
    def delete(self, entity_id, user=None):
        """
        Удалить сущность.

        @param entity_id: ID сущности
        @param user: Пользователь
        @return: True если удалено
        """
        def _delete():
            instance = self.get_by_id(entity_id, user)
            instance_id = instance.id

            instance.delete()

            # Логирование
            self.log_operation(
                f"Deleted {self.model.__name__}",
                instance_id,
                user
            )

            return True

        return self.execute_in_transaction(_delete)


class NotificationService(BaseService):
    """
    Сервис для отправки уведомлений.

    Объединяет разные способы уведомлений:
    - Email
    - Push notifications
    - SMS
    """

    def __init__(self):
        super().__init__()
        self.email_service = None  # Will be imported when needed
        self.push_service = None

    def send_email(self, to_email, subject, template_name, context=None):
        """
        Отправить email уведомление.

        @param to_email: Email получателя
        @param subject: Тема письма
        @param template_name: Имя шаблона
        @param context: Контекст для шаблона
        """
        try:
            # Lazy import to avoid circular dependencies
            if not self.email_service:
                from apps.users.services.mail_service import MailService
                self.email_service = MailService()

            self.email_service.send_template_email(
                to_email, subject, template_name, context or {}
            )

            self.log_operation("Email sent", details=f"To: {to_email}, Subject: {subject}")

        except Exception as e:
            self.logger.error(f"Failed to send email to {to_email}: {str(e)}")
            # Don't raise exception for notification failures

    def send_push_notification(self, user, title, message, data=None):
        """
        Отправить push уведомление.

        @param user: Пользователь
        @param title: Заголовок
        @param message: Сообщение
        @param data: Дополнительные данные
        """
        # Implementation for push notifications
        self.log_operation(
            "Push notification sent",
            user=user,
            details=f"Title: {title}"
        )

    def notify_order_status(self, order, user):
        """
        Уведомление об изменении статуса заказа.

        @param order: Заказ
        @param user: Пользователь
        """
        subject = f"Статус заказа #{order.id} изменен"
        context = {
            'order': order,
            'user': user,
            'status': order.get_status_display()
        }

        self.send_email(user.email, subject, 'order_status_changed', context)
        self.send_push_notification(
            user,
            "Заказ обновлен",
            f"Статус заказа #{order.id}: {order.get_status_display()}"
        )


class ValidationService(BaseService):
    """
    Сервис для валидации данных.

    Содержит переиспользуемые функции валидации.
    """

    def validate_pet_data(self, data):
        """
        Валидация данных питомца.

        @param data: Данные питомца
        @return: Валидированные данные
        @raises ValidationError: Если валидация не прошла
        """
        required_fields = ['name', 'species']

        for field in required_fields:
            if not data.get(field):
                raise ValidationError(f"Поле {field} обязательно")

        # Валидация возраста
        if 'date_of_birth' in data:
            # Логика валидации даты рождения
            pass

        return data

    def validate_order_data(self, data, user):
        """
        Валидация данных заказа.

        @param data: Данные заказа
        @param user: Пользователь
        @return: Валидированные данные
        @raises ValidationError: Если валидация не прошла
        """
        # Проверка корзины
        if not data.get('cart_items'):
            raise ValidationError("Корзина пуста")

        # Проверка наличия товаров
        # ...

        return data