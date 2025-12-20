"""
Сервис для работы с JWT токенами

Генерация, валидация и сохранение JWT токенов (access и refresh).
Аналогично token-service.js из проекта-образца.
"""

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from apps.users.models import Token
from core.tokens import CustomRefreshToken, CustomAccessToken
import logging

User = get_user_model()
logger = logging.getLogger('apps.users')


class TokenService:
    """Сервис для работы с JWT токенами."""
    
    @staticmethod
    def generate_tokens(user):
        """
        Генерация access и refresh токенов для пользователя.
        
        Аргументы:
            user: Объект пользователя (User)
            
        Возвращает:
            dict: Словарь с accessToken и refreshToken
        """
        refresh = CustomRefreshToken.for_user(user)
        
        return {
            'accessToken': str(refresh.access_token),
            'refreshToken': str(refresh),
        }
    
    @staticmethod
    def validate_access_token(token_string):
        """
        Валидация access токена.
        
        Аргументы:
            token_string: Строка access токена
            
        Возвращает:
            dict: Данные пользователя из токена или None если токен невалидный
        """
        try:
            access_token = CustomAccessToken(token_string)
            return {
                'id': access_token['user_id'],
                'email': access_token.get('email', ''),
            }
        except TokenError:
            return None
    
    @staticmethod
    def validate_refresh_token(token_string):
        """
        Валидация refresh токена.
        
        Аргументы:
            token_string: Строка refresh токена
            
        Возвращает:
            dict: Данные пользователя из токена или None если токен невалидный
        """
        try:
            refresh = CustomRefreshToken(token_string)
            return {
                'id': refresh['user_id'],
                'email': refresh.get('email', ''),
            }
        except TokenError:
            return None
    
    @staticmethod
    def save_token(user_id, refresh_token):
        """
        Сохранение refresh токена в базе данных.
        
        Если токен для пользователя уже существует, обновляет его.
        Иначе создает новый.
        
        Аргументы:
            user_id: ID пользователя
            refresh_token: Строка refresh токена
            
        Возвращает:
            Token: Объект сохраненного токена
        """
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error(f"Пользователь с ID {user_id} не найден при сохранении токена")
            raise ValueError(f"Пользователь с ID {user_id} не найден")
        
        # Ищем существующий токен для пользователя
        token_obj, created = Token.objects.get_or_create(
            user=user,
            defaults={'refresh_token': refresh_token}
        )
        
        if not created:
            # Обновляем существующий токен
            token_obj.refresh_token = refresh_token
            token_obj.save()
        
        return token_obj
    
    @staticmethod
    def remove_token(refresh_token):
        """
        Удаление refresh токена из базы данных.
        
        Аргументы:
            refresh_token: Строка refresh токена для удаления
            
        Возвращает:
            bool: True если токен был удален, False если не найден
        """
        deleted_count, _ = Token.objects.filter(refresh_token=refresh_token).delete()
        return deleted_count > 0
    
    @staticmethod
    def find_token(refresh_token):
        """
        Поиск refresh токена в базе данных.
        
        Аргументы:
            refresh_token: Строка refresh токена для поиска
            
        Возвращает:
            Token: Объект токена или None если не найден
        """
        try:
            return Token.objects.get(refresh_token=refresh_token)
        except Token.DoesNotExist:
            return None

