"""
Кастомные JWT токены с дополнительными claims

Добавляет email в payload токенов для удобства работы на клиенте.
"""

from rest_framework_simplejwt.tokens import RefreshToken, AccessToken


class CustomAccessToken(AccessToken):
    """Кастомный access токен с email в payload."""
    
    @classmethod
    def for_user(cls, user):
        """Создание токена для пользователя с добавлением email."""
        token = super().for_user(user)
        token['email'] = user.email
        return token


class CustomRefreshToken(RefreshToken):
    """Кастомный refresh токен с email в payload."""
    
    access_token_class = CustomAccessToken
    
    @classmethod
    def for_user(cls, user):
        """Создание токена для пользователя с добавлением email."""
        token = super().for_user(user)
        token['email'] = user.email
        return token

