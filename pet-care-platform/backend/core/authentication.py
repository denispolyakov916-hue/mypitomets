"""
Кастомная JWT аутентификация для In-Memory хранилища пользователей

Этот модуль предоставляет кастомную JWT аутентификацию, которая работает
с нашим in-memory хранилищем данных вместо стандартной модели User Django.

Проблема дизайна:
    Django REST Framework simplejwt ожидает работу с моделью User Django
    и базой данных. Поскольку мы используем in-memory хранилище,
    нам нужна кастомная аутентификация, которая:
    1. Валидирует JWT токены обычным способом
    2. Извлекает user_id из claims токена
    3. Прикрепляет user_id к запросу (не полный объект User)

Классы:
    - CustomJWTAuthentication: Валидирует JWT и извлекает user_id
    - SimpleUser: Минимальный user-подобный объект для совместимости с DRF

Использование:
    Настройте в settings.py:
    REST_FRAMEWORK = {
        'DEFAULT_AUTHENTICATION_CLASSES': (
            'core.authentication.CustomJWTAuthentication',
        ),
    }
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
import logging

logger = logging.getLogger('apps.auth')


class SimpleUser:
    """
    Минимальное представление пользователя для request.user.
    
    DRF ожидает, что request.user имеет определённые атрибуты.
    Этот класс предоставляет эти атрибуты без необходимости
    модели User, хранящейся в базе данных.
    
    Атрибуты:
        user_id (str): UUIDv7 ID пользователя из JWT токена
        is_authenticated (bool): Всегда True для валидных токенов
    
    Примечание:
        Этот объект прикрепляется к request.user через CustomJWTAuthentication.
        Фактические данные пользователя можно получить из data_store по user_id.
        
    Идентификаторы:
        Используется UUIDv7 - сортируемый по времени UUID, обеспечивающий
        глобальную уникальность и совместимость с PostgreSQL индексами.
    """
    
    def __init__(self, user_id: str):
        """
        Инициализация SimpleUser с UUIDv7 ID пользователя.
        
        Аргументы:
            user_id: UUIDv7 ID пользователя из JWT токена
        """
        self.user_id = user_id
        self.id = user_id
        self.is_authenticated = True
    
    def __str__(self):
        return f"User({self.user_id})"


class CustomJWTAuthentication(JWTAuthentication):
    """
    Кастомная JWT аутентификация для in-memory хранилища пользователей.
    
    Расширяет JWTAuthentication из simplejwt для работы с нашим
    кастомным хранилищем данных вместо модели User Django.
    
    Процесс аутентификации:
        1. Извлечение токена из заголовка Authorization
        2. Валидация подписи токена и срока действия
        3. Извлечение user_id из claims токена
        4. Создание объекта SimpleUser
        5. Прикрепление к request.user
    
    Отличия от базового класса:
        - Не делает запросы к модели Django User
        - Возвращает SimpleUser вместо экземпляра User
        - user_id доступен через request.user.user_id или request.user_id
    
    Пример использования:
        # В view с разрешением IsAuthenticated
        def get(self, request):
            user_id = request.user.user_id  # или request.user_id
            # Используем user_id для запросов к data_store
    """
    
    def authenticate(self, request):
        """
        Аутентификация запроса с использованием JWT токена.
        
        Переопределяет родительский метод для использования кастомного разрешения пользователя.
        
        Аргументы:
            request: Входящий запрос
            
        Возвращает:
            tuple: (SimpleUser, validated_token) если аутентифицирован
            None: Если токен не предоставлен
            
        Исключения:
            AuthenticationFailed: Если токен невалиден или истёк
        """
        # Получение сырого токена из заголовка
        header = self.get_header(request)
        if header is None:
            return None
        
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
        
        # Валидация токена
        validated_token = self.get_validated_token(raw_token)
        
        # Получение пользователя из токена (кастомная реализация)
        user = self.get_user(validated_token)
        
        # Прикрепление user_id напрямую к запросу для удобства
        request.user_id = user.user_id
        
        return (user, validated_token)
    
    def get_user(self, validated_token):
        """
        Получение представления пользователя из валидированного токена.
        
        Извлекает user_id из claims токена и создаёт SimpleUser.
        
        Аргументы:
            validated_token: JWT токен, прошедший валидацию
            
        Возвращает:
            SimpleUser: Представление пользователя с user_id
            
        Исключения:
            InvalidToken: Если claim user_id отсутствует в токене
        """
        try:
            user_id = validated_token['user_id']
        except KeyError:
            logger.error("В токене отсутствует claim user_id")
            raise InvalidToken('Токен содержит некорректные данные пользователя')
        
        # Возвращаем простой объект пользователя вместо запроса к базе данных
        return SimpleUser(user_id)
