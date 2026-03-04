"""
Сериализаторы для аутентификации и управления профилем пользователей

Этот модуль содержит сериализаторы Django REST Framework для обработки
регистрации пользователей, аутентификации и операций с данными профиля.

Классы сериализаторов:
    - UserRegistrationSerializer: Валидация и обработка регистрации нового пользователя
    - UserLoginSerializer: Валидация учётных данных для входа
    - UserProfileSerializer: Сериализация данных профиля для API ответов

Решения по дизайну:
    - Использование сериализаторов для валидации обеспечивает консистентную обработку ввода
    - Подтверждение пароля валидируется на уровне сериализатора
    - Конфиденциальные данные (пароли) помечены как write-only и никогда не возвращаются в ответах
"""

from rest_framework import serializers

from core.validators import validate_password_strength, COMMON_PASSWORDS


class UserRegistrationSerializer(serializers.Serializer):
    """
    Сериализатор для запросов регистрации пользователя.

    Валидирует данные регистрации, включая формат email, надёжность пароля
    и совпадение подтверждения пароля.

    Поля:
        email (str): Email адрес пользователя - должен быть валидным форматом email
        first_name (str): Имя пользователя (опционально)
        last_name (str): Фамилия пользователя (опционально)
        password (str): Пароль пользователя - минимум 6 символов
        password_confirm (str): Подтверждение пароля - должно совпадать с паролем

    Правила валидации:
        - Email должен быть валидного формата (содержит @ и домен)
        - Пароль минимум 6 символов
        - password_confirm должен точно совпадать с password

    Пример использования:
        >>> data = {'email': 'user@example.com', 'first_name': 'Иван', 'last_name': 'Иванов', 'password': 'secret123', 'password_confirm': 'secret123'}
        >>> serializer = UserRegistrationSerializer(data=data)
        >>> if serializer.is_valid():
        ...     validated_data = serializer.validated_data

    Заметки по безопасности:
        - Поля паролей помечены как write-only (никогда не сериализуются в ответах)
        - Пароль не хранится в открытом виде (хеширование обрабатывается в data_store)
    """

    # Поле email со встроенной валидацией email
    email = serializers.EmailField(
        required=True,
        help_text="Email адрес для аккаунта пользователя"
    )

    # Поле имени (опционально)
    first_name = serializers.CharField(
        required=False,
        max_length=150,
        allow_blank=True,
        help_text="Имя пользователя"
    )

    # Поле фамилии (опционально)
    last_name = serializers.CharField(
        required=False,
        max_length=150,
        allow_blank=True,
        help_text="Фамилия пользователя"
    )

    # Поле пароля - write_only гарантирует, что оно никогда не сериализуется в ответах
    password = serializers.CharField(
        required=True,
        min_length=8,
        write_only=True,
        style={'input_type': 'password'},
        help_text="Пароль (минимум 8 символов, буквы, цифры и спецсимволы)"
    )

    # Подтверждение пароля для формы регистрации
    password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="Подтверждение пароля (должно совпадать с паролем)"
    )
    
    def validate_email(self, value):
        """
        Валидация и нормализация email адреса.
        
        Выполняет дополнительную валидацию помимо встроенного EmailField:
        - Конвертация в нижний регистр для case-insensitive сопоставления
        - Проверка наличия валидной структуры домена
        
        Аргументы:
            value (str): Email адрес из запроса
            
        Возвращает:
            str: Нормализованный (в нижнем регистре) email адрес
            
        Исключения:
            ValidationError: Если формат email невалидный
        """
        # Нормализация в нижний регистр
        return value.lower().strip()
    
    def validate_password(self, value):
        """Валидация сложности пароля через общую утилиту."""
        errors = validate_password_strength(value)
        if errors:
            raise serializers.ValidationError(errors)
        return value
    
    def validate(self, attrs):
        """
        Кросс-полевая валидация данных регистрации.
        
        Валидирует совпадение паролей и соответствие требованиям сложности.
        Этот метод вызывается после индивидуальной валидации полей.
        
        Аргументы:
            attrs (dict): Словарь всех валидированных значений полей
            
        Возвращает:
            dict: Валидированные атрибуты (password_confirm удалён)
            
        Исключения:
            ValidationError: Если пароли не совпадают
        """
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        
        # Проверка совпадения паролей
        if password != password_confirm:
            raise serializers.ValidationError({
                'password_confirm': 'Пароли не совпадают'
            })
        
        # Удаление password_confirm из валидированных данных (не нужен для создания пользователя)
        attrs.pop('password_confirm', None)
        
        return attrs


class UserLoginSerializer(serializers.Serializer):
    """
    Сериализатор для запросов входа пользователя.
    
    Валидирует формат учётных данных (email и пароль).
    Фактическая аутентификация выполняется во view после валидации.
    
    Поля:
        email (str): Email адрес пользователя
        password (str): Пароль пользователя
    
    Примечание к дизайну:
        Этот сериализатор только валидирует формат ввода.
        Проверка учётных данных (существует ли email, верен ли пароль) 
        обрабатывается data_store для поддержания разделения ответственности.
    
    Пример использования:
        >>> data = {'email': 'user@example.com', 'password': 'secret123'}
        >>> serializer = UserLoginSerializer(data=data)
        >>> if serializer.is_valid():
        ...     # Продолжаем с аутентификацией
    """
    
    email = serializers.EmailField(
        required=True,
        help_text="Зарегистрированный email адрес"
    )
    
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="Пароль аккаунта"
    )
    
    def validate_email(self, value):
        """Нормализация email в нижний регистр."""
        return value.lower().strip()


class UserProfileSerializer(serializers.Serializer):
    """
    Сериализатор для данных профиля пользователя в API ответах.
    
    Используется для сериализации объектов пользователя для эндпоинтов профиля.
    Включает только безопасную, неконфиденциальную информацию.
    
    Поля:
        id (str): Уникальный идентификатор пользователя (UUIDv7)
        email (str): Email адрес пользователя
        created_at (str): Временная метка создания аккаунта (ISO формат)
    
    Только для чтения:
        Все поля только для чтения, так как это только для вывода.
    
    Заметка по безопасности:
        Никогда не включает password или password_hash в вывод.
        
    Заметка по идентификаторам:
        Используется UUIDv7 - сортируемый по времени UUID, обеспечивающий
        глобальную уникальность и совместимость с индексами PostgreSQL.
    """
    
    id = serializers.CharField(read_only=True, help_text="UUIDv7 идентификатор пользователя")
    email = serializers.EmailField(read_only=True)
    created_at = serializers.CharField(read_only=True)


class UserShortSerializer(serializers.Serializer):
    """Краткая сериализация пользователя (замена User.to_dict())."""

    id = serializers.UUIDField(read_only=True)
    email = serializers.EmailField(read_only=True)
    role = serializers.CharField(read_only=True)
    isActivated = serializers.BooleanField(source='is_activated', read_only=True)
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)


class UserFullSerializer(serializers.Serializer):
    """Полная сериализация профиля (замена User.to_dict_full())."""

    id = serializers.UUIDField(read_only=True)
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    phone = serializers.CharField(read_only=True)
    default_address = serializers.CharField(read_only=True)
    avatar = serializers.SerializerMethodField()
    bio = serializers.CharField(read_only=True)
    date_of_birth = serializers.DateField(read_only=True)
    city = serializers.CharField(read_only=True)
    website = serializers.URLField(read_only=True)
    email_notifications = serializers.BooleanField(read_only=True)
    push_notifications = serializers.BooleanField(read_only=True)
    order_notifications = serializers.BooleanField(read_only=True)
    marketing_notifications = serializers.BooleanField(read_only=True)
    preferred_pet_types = serializers.JSONField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    isActivated = serializers.BooleanField(source='is_activated', read_only=True)
    role = serializers.CharField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)

    def get_avatar(self, obj):
        if obj.avatar:
            try:
                return obj.avatar.url
            except (ValueError, AttributeError):
                pass
        return None


class UserProfileUpdateSerializer(serializers.Serializer):
    """Сериализатор для обновления профиля пользователя."""

    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    default_address = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    email_notifications = serializers.BooleanField(required=False)
    push_notifications = serializers.BooleanField(required=False)
    order_notifications = serializers.BooleanField(required=False)
    marketing_notifications = serializers.BooleanField(required=False)
    preferred_pet_types = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )

    def validate_email(self, value):
        value = value.lower().strip()
        user = self.context.get('user')
        if user and value != user.email:
            from .models import User
            if User.objects.filter(email=value).exists():
                raise serializers.ValidationError('Пользователь с таким email уже существует')
        return value


class OrderSerializer(serializers.Serializer):
    """
    Сериализатор для данных заказа в профиле пользователя.
    
    Используется для отображения истории заказов на странице профиля пользователя.
    
    Поля:
        id (str): UUIDv7 идентификатор заказа
        items (list): Список заказанных товаров с деталями
        total_amount (float): Общая стоимость заказа
        shipping_address (str): Адрес доставки
        status (str): Текущий статус заказа
        created_at (str): Временная метка оформления заказа
    """
    
    id = serializers.CharField(read_only=True, help_text="UUIDv7 идентификатор заказа")
    items = serializers.ListField(read_only=True)
    total_amount = serializers.FloatField(read_only=True)
    shipping_address = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    created_at = serializers.CharField(read_only=True)


class UserProfileFullSerializer(serializers.Serializer):
    """
    Полный сериализатор профиля пользователя с включением связанных данных.
    
    Агрегирует всю информацию, связанную с пользователем, для страницы профиля:
    - Базовая информация о пользователе
    - Список питомцев
    - История заказов
    - Приобретённые курсы
    
    Этот сериализатор не валидирует ввод; только для вывода.
    """
    
    user = UserProfileSerializer(read_only=True)
    pets = serializers.ListField(read_only=True)
    orders = serializers.ListField(read_only=True)
    courses = serializers.ListField(read_only=True)


class ActivationCodeSerializer(serializers.Serializer):
    """
    Сериализатор для активации аккаунта по коду.
    
    Поля:
        activation_code (str): 6-значный код активации из email
    """
    
    activation_code = serializers.CharField(
        required=True,
        min_length=6,
        max_length=6,
        help_text="6-значный код активации"
    )
    
    def validate_activation_code(self, value):
        """Валидация кода активации - должен содержать только цифры."""
        if not value.isdigit():
            raise serializers.ValidationError('Код активации должен содержать только цифры')
        if len(value) != 6:
            raise serializers.ValidationError('Код активации должен содержать 6 цифр')
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Сериализатор для запроса восстановления пароля.
    
    Поля:
        email (str): Email адрес пользователя
    """
    
    email = serializers.EmailField(
        required=True,
        help_text="Email адрес для восстановления пароля"
    )
    
    def validate_email(self, value):
        """Нормализация email."""
        return value.lower().strip()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Сериализатор для подтверждения восстановления пароля.
    
    Поля:
        email (str): Email адрес пользователя
        code (str): 6-значный код восстановления
        new_password (str): Новый пароль
        new_password_confirm (str): Подтверждение нового пароля
    """
    
    email = serializers.EmailField(
        required=True,
        help_text="Email адрес"
    )
    
    code = serializers.CharField(
        required=True,
        min_length=6,
        max_length=6,
        help_text="6-значный код восстановления"
    )
    
    new_password = serializers.CharField(
        required=True,
        min_length=8,
        write_only=True,
        style={'input_type': 'password'},
        help_text="Новый пароль (минимум 8 символов, буквы, цифры и спецсимволы)"
    )
    
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="Подтверждение нового пароля"
    )
    
    def validate_email(self, value):
        return value.lower().strip()
    
    def validate_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError('Код должен содержать только цифры')
        return value
    
    def validate_new_password(self, value):
        """Валидация сложности нового пароля через общую утилиту."""
        errors = validate_password_strength(value)
        if errors:
            raise serializers.ValidationError(errors)
        return value
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Пароли не совпадают'
            })
        attrs.pop('new_password_confirm', None)
        return attrs