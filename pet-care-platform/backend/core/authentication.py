"""
Кастомная JWT аутентификация для работы с моделью User Django

Этот модуль предоставляет кастомную JWT аутентификацию, которая работает
с кастомной моделью User Django с UUIDv7 идентификаторами.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from django.contrib.auth import get_user_model
import logging

User = get_user_model()
logger = logging.getLogger('apps.auth')


class CustomJWTAuthentication(JWTAuthentication):
    """
    Кастомная JWT аутентификация для работы с моделью User Django.
    
    Расширяет JWTAuthentication из simplejwt для работы с кастомной моделью User
    с UUIDv7 идентификаторами вместо стандартных integer ID.
    
    Процесс аутентификации:
        1. Извлечение токена из заголовка Authorization
        2. Валидация подписи токена и срока действия
        3. Извлечение user_id из claims токена
        4. Получение объекта User из базы данных
        5. Прикрепление к request.user
    
    Отличия от базового класса:
        - Использует кастомную модель User с UUIDv7 идентификаторами
        - user_id доступен через request.user.id (UUIDv7 строка)
    """
    
    def get_user(self, validated_token):
        """
        Получение пользователя из валидированного токена.
        
        Извлекает user_id из claims токена и получает объект User из БД.
        
        Аргументы:
            validated_token: JWT токен, прошедший валидацию
            
        Возвращает:
            User: Объект пользователя из базы данных
            
        Исключения:
            InvalidToken: Если claim user_id отсутствует в токене или пользователь не найден
        """
        try:
            user_id = validated_token['user_id']
        except KeyError:
            logger.error("В токене отсутствует claim user_id")
            raise InvalidToken('Токен содержит некорректные данные пользователя')
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error(f"Пользователь с ID {user_id} не найден")
            raise InvalidToken('Пользователь не найден')
        
        if not user.is_active:
            logger.warning(f"Попытка входа неактивного пользователя: {user_id}")
            raise InvalidToken('Пользователь неактивен')
        
        return user

