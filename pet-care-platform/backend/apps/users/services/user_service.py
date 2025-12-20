"""
Сервис для бизнес-логики работы с пользователями

Регистрация, вход, активация, обновление токенов.
Аналогично user-service.js из проекта-образца.
"""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.conf import settings
from core.exceptions import ApiError
from apps.users.services.token_service import TokenService
from apps.users.services.mail_service import MailService
import uuid
import random
import logging

User = get_user_model()
logger = logging.getLogger('apps.users')


class UserService:
    """Сервис для работы с пользователями."""
    
    @staticmethod
    def registration(email, password):
        """
        Регистрация нового пользователя.
        
        Аргументы:
            email: Email адрес пользователя
            password: Пароль пользователя
            
        Возвращает:
            dict: Словарь с токенами и данными пользователя
            
        Исключения:
            ApiError: Если пользователь уже существует
        """
        # Проверка существования пользователя
        if User.objects.filter(email=email).exists():
            raise ApiError.bad_request(
                f'Пользователь с почтовым адресом {email} уже существует'
            )
        
        # Создание пользователя
        activation_link = str(uuid.uuid4())
        # Генерация 6-значного кода активации
        activation_code = str(random.randint(100000, 999999))
        
        user = User.objects.create_user(
            email=email,
            password=password,
            activation_link=activation_link,
            activation_code=activation_code,
            is_activated=False  # По умолчанию не активирован
        )
        
        # Формирование полной ссылки активации
        api_url = getattr(settings, 'API_URL', 'http://localhost:8000')
        activation_url = f"{api_url}/api/auth/activate/{activation_link}"
        
        # Отправка письма активации с кодом и ссылкой
        try:
            MailService.send_activation_mail(email, activation_url, activation_code)
        except Exception as e:
            logger.error(f"Не удалось отправить письмо активации на {email}: {str(e)}")
            # Продолжаем регистрацию даже если email не отправился
            # В production можно использовать очередь задач (Celery)
        
        # Генерация токенов
        tokens = TokenService.generate_tokens(user)
        
        # Сохранение refresh токена в БД
        TokenService.save_token(user.id, tokens['refreshToken'])
        
        # DTO пользователя
        user_dto = user.to_dict()
        
        return {
            **tokens,
            'user': user_dto
        }
    
    @staticmethod
    def activate(activation_link=None, activation_code=None):
        """
        Активация пользователя по ссылке или коду активации.
        
        Аргументы:
            activation_link: Ссылка активации из email (опционально)
            activation_code: Код активации (6 цифр) (опционально)
            
        Исключения:
            ApiError: Если ссылка или код активации некорректны
        """
        if not activation_link and not activation_code:
            raise ApiError.bad_request('Необходимо указать ссылку или код активации')
        
        try:
            if activation_link:
                user = User.objects.get(activation_link=activation_link)
            elif activation_code:
                user = User.objects.get(activation_code=activation_code)
            else:
                raise ApiError.bad_request('Некорректные данные активации')
        except User.DoesNotExist:
            raise ApiError.bad_request('Некорректная ссылка или код активации')
        
        user.is_activated = True
        # Очищаем код и ссылку после активации для безопасности
        user.activation_code = None
        user.activation_link = None
        user.save()
        
        logger.info(f"Пользователь активирован: {user.email}")
    
    @staticmethod
    def login(email, password):
        """
        Вход пользователя.
        
        Аргументы:
            email: Email адрес пользователя
            password: Пароль пользователя
            
        Возвращает:
            dict: Словарь с токенами и данными пользователя
            
        Исключения:
            ApiError: Если email или пароль неверны
        """
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise ApiError.bad_request('Пользователь с таким email не найден')
        
        # Проверка пароля
        if not user.check_password(password):
            raise ApiError.bad_request('Неверный пароль')
        
        # Проверка активности пользователя
        if not user.is_active:
            raise ApiError.bad_request('Аккаунт пользователя неактивен')
        
        # Генерация токенов
        tokens = TokenService.generate_tokens(user)
        
        # Сохранение refresh токена в БД
        TokenService.save_token(user.id, tokens['refreshToken'])
        
        # DTO пользователя
        user_dto = user.to_dict()
        
        return {
            **tokens,
            'user': user_dto
        }
    
    @staticmethod
    def logout(refresh_token):
        """
        Выход пользователя (удаление refresh токена).
        
        Аргументы:
            refresh_token: Refresh токен для удаления
            
        Возвращает:
            dict: Результат операции
        """
        if not refresh_token:
            raise ApiError.unauthorized_error()
        
        removed = TokenService.remove_token(refresh_token)
        
        return {
            'success': removed,
            'message': 'Выход выполнен успешно' if removed else 'Токен не найден'
        }
    
    @staticmethod
    def refresh(refresh_token):
        """
        Обновление access токена по refresh токену.
        
        Аргументы:
            refresh_token: Refresh токен из cookie
            
        Возвращает:
            dict: Словарь с новыми токенами и данными пользователя
            
        Исключения:
            ApiError: Если refresh токен невалидный или не найден в БД
        """
        if not refresh_token:
            raise ApiError.unauthorized_error()
        
        # Валидация refresh токена
        user_data = TokenService.validate_refresh_token(refresh_token)
        if not user_data:
            raise ApiError.unauthorized_error()
        
        # Проверка наличия токена в БД
        token_from_db = TokenService.find_token(refresh_token)
        if not token_from_db:
            raise ApiError.unauthorized_error()
        
        # Получение пользователя
        try:
            user = User.objects.get(id=user_data['id'])
        except User.DoesNotExist:
            raise ApiError.unauthorized_error()
        
        # Проверка активности пользователя
        if not user.is_active:
            raise ApiError.unauthorized_error()
        
        # Генерация новых токенов
        tokens = TokenService.generate_tokens(user)
        
        # Сохранение нового refresh токена в БД
        TokenService.save_token(user.id, tokens['refreshToken'])
        
        # DTO пользователя
        user_dto = user.to_dict()
        
        return {
            **tokens,
            'user': user_dto
        }
    
    @staticmethod
    def get_all_users():
        """
        Получение списка всех пользователей (для админов).
        
        Возвращает:
            list: Список пользователей
        """
        return list(User.objects.all())

