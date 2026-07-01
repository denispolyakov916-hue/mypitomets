"""
Сервис для бизнес-логики работы с пользователями

Регистрация, вход, активация, обновление токенов.
Аналогично user-service.js из проекта-образца.
"""

import logging
import random
import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone

from core.exceptions import ApiError
from core.constants import CODE_EXPIRATION_MINUTES, ACTIVATION_CODE_MIN, ACTIVATION_CODE_MAX
from apps.users.services.token_service import TokenService
from apps.users.services.mail_service import MailService

User = get_user_model()
logger = logging.getLogger('apps.users')


def _serialize_user(user):
    """Сериализация пользователя через DRF-сериализатор."""
    from apps.users.serializers import UserShortSerializer
    return UserShortSerializer(user).data


class UserService:
    """Сервис для работы с пользователями."""
    
    @staticmethod
    def _is_code_expired(code_created_at):
        """
        Проверка срока действия кода.
        
        Аргументы:
            code_created_at: Время создания кода (datetime)
            
        Возвращает:
            bool: True если код просрочен, False если действителен
        """
        if not code_created_at:
            return True  # Если нет времени создания, считаем код просроченным
        
        expiration_time = code_created_at + timedelta(minutes=CODE_EXPIRATION_MINUTES)
        return timezone.now() > expiration_time
    
    @staticmethod
    def _generate_code_with_timestamp(user):
        """
        Генерирует новый код и сохраняет время его создания.
        
        Аргументы:
            user: Объект пользователя
            
        Возвращает:
            str: Сгенерированный 6-значный код
        """
        code = str(random.randint(ACTIVATION_CODE_MIN, ACTIVATION_CODE_MAX))
        user.activation_code = code
        user.code_created_at = timezone.now()
        user.save(update_fields=['activation_code', 'code_created_at'])
        return code
    
    @staticmethod
    def registration(email, password, first_name=None, last_name=None):
        """
        Регистрация нового пользователя.

        Аргументы:
            email: Email адрес пользователя
            password: Пароль пользователя
            first_name: Имя пользователя (опционально)
            last_name: Фамилия пользователя (опционально)

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
        activation_code = str(random.randint(ACTIVATION_CODE_MIN, ACTIVATION_CODE_MAX))

        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name or '',
            last_name=last_name or '',
            activation_link=activation_link,
            activation_code=activation_code,
            code_created_at=timezone.now(),  # Сохраняем время создания кода
            is_activated=True  # Бета: авто-активация — аккаунт сразу рабочий, без блокирующего письма
        )
        
        # Формирование полной ссылки активации
        api_url = getattr(settings, 'API_URL', 'http://localhost:8000')
        activation_url = f"{api_url}/api/auth/activate/{activation_link}"
        
        logger.info(f"Пользователь создан: ID={user.id}, Email={email}")
        logger.debug(f"Код активации: {activation_code}, Ссылка: {activation_url}")

        # Письмо-подтверждение — в фоне через очередь (Celery), с ретраями и
        # fallback на синхронную отправку при недоступном брокере. Аккаунт уже
        # активирован и токены выданы — SMTP не блокирует регистрацию/вход.
        from apps.users.tasks import dispatch_activation_email
        dispatch_activation_email(email, activation_url, activation_code)
        
        # Бета: аккаунт уже активирован — выдаём токены и логиним пользователя сразу.
        tokens = TokenService.generate_tokens(user)
        TokenService.save_token(user.id, tokens['refreshToken'])
        return {
            **tokens,
            'user': _serialize_user(user),
            'message': 'Регистрация успешна',
            'email': email,
        }
    
    @staticmethod
    def activate(activation_link=None, activation_code=None):
        """
        Активация пользователя по ссылке или коду активации.
        
        Аргументы:
            activation_link: Ссылка активации из email (опционально)
            activation_code: Код активации (6 цифр) (опционально)
            
        Возвращает:
            dict: Словарь с пользователем и временным кодом для получения токенов (для активации по ссылке)
            или dict с токенами и данными пользователя (для активации по коду)
            
        Исключения:
            ApiError: Если ссылка или код активации некорректны, просрочены, или аккаунт уже активирован
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
        
        # Проверка на повторную активацию
        if user.is_activated:
            logger.warning(f"Попытка повторной активации аккаунта: {user.email}")
            raise ApiError.bad_request('Аккаунт уже активирован')
        
        # Проверка срока действия кода (15 минут)
        if UserService._is_code_expired(user.code_created_at):
            logger.warning(f"Попытка активации просроченным кодом: {user.email}")
            raise ApiError.bad_request(
                f'Код активации истёк. Запросите новый код.'
            )
        
        user.is_activated = True
        # Очищаем код и ссылку после активации для безопасности
        user.activation_code = None
        user.activation_link = None
        user.save()
        
        logger.info(f"Пользователь активирован: {user.email}")
        user_dto = _serialize_user(user)
        
        # Для активации по коду возвращаем токены сразу
        if activation_code:
            tokens = TokenService.generate_tokens(user)
            TokenService.save_token(user.id, tokens['refreshToken'])
            return {
                **tokens,
                'user': user_dto,
                'message': 'Аккаунт успешно активирован'
            }
        
        # Для активации по ссылке генерируем временный код для получения токенов
        # Используем activation_code как временное хранилище (код уже очищен выше)
        temp_auth_code = str(random.randint(ACTIVATION_CODE_MIN, ACTIVATION_CODE_MAX))
        user.activation_code = temp_auth_code  # Временно сохраняем код для обмена на токены
        user.save()
        
        return {
            'user': user_dto,
            'temp_auth_code': temp_auth_code
        }
    
    @staticmethod
    def exchange_temp_code_for_tokens(temp_auth_code):
        """
        Обмен временного кода на токены после активации по ссылке.
        
        Аргументы:
            temp_auth_code: Временный код активации (6 цифр)
            
        Возвращает:
            dict: Словарь с токенами и данными пользователя
            
        Исключения:
            ApiError: Если код некорректный или уже использован
        """
        try:
            user = User.objects.get(activation_code=temp_auth_code, is_activated=True)
        except User.DoesNotExist:
            raise ApiError.bad_request('Некорректный код активации или аккаунт не активирован')
        
        # Генерируем токены
        tokens = TokenService.generate_tokens(user)
        TokenService.save_token(user.id, tokens['refreshToken'])
        
        # Очищаем временный код после использования
        user.activation_code = None
        user.save()
        
        user_dto = _serialize_user(user)
        
        return {
            **tokens,
            'user': user_dto
        }
    
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
        # Нормализуем email (нижний регистр, без пробелов)
        email_normalized = email.lower().strip() if email else ''
        
        # Логирование для отладки
        import logging
        logger = logging.getLogger(__name__)
        logger.debug(f"[UserService.login] Поиск пользователя с email: '{email}' -> нормализованный: '{email_normalized}'")
        
        try:
            # Используем __iexact для поиска без учета регистра
            user = User.objects.get(email__iexact=email_normalized)
            logger.debug(f"[UserService.login] Пользователь найден: {user.email}")
        except User.DoesNotExist:
            # Проверяем, есть ли пользователи с похожим email (для отладки)
            similar_users = User.objects.filter(email__icontains=email_normalized.split('@')[0])[:3]
            logger.warning(f"[UserService.login] Пользователь не найден. Похожие email в БД: {[u.email for u in similar_users]}")
            raise ApiError.bad_request('Пользователь с таким email не найден')
        
        # Проверка активности пользователя
        if not user.is_active:
            raise ApiError.bad_request('Аккаунт пользователя неактивен')

        # Проверка активации аккаунта (ставим ПЕРЕД проверкой пароля)
        if not user.is_activated:
            raise ApiError.bad_request('Аккаунт не активирован. Проверьте email для активации.')

        # Проверка пароля
        if not user.check_password(password):
            raise ApiError.bad_request('Неверный пароль')
        
        # Генерация токенов
        tokens = TokenService.generate_tokens(user)
        
        # Сохранение refresh токена в БД
        TokenService.save_token(user.id, tokens['refreshToken'])
        
        # DTO пользователя
        user_dto = _serialize_user(user)
        
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
        
        # Проверка активации аккаунта
        if not user.is_activated:
            raise ApiError.unauthorized_error()
        
        # Генерация новых токенов
        tokens = TokenService.generate_tokens(user)
        
        # Сохранение нового refresh токена в БД
        TokenService.save_token(user.id, tokens['refreshToken'])
        
        # DTO пользователя
        user_dto = _serialize_user(user)
        
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
    
    @staticmethod
    def resend_activation_code(email):
        """
        Повторная отправка кода активации.
        
        Генерирует новый код и отправляет его на email.
        
        Аргументы:
            email: Email пользователя
            
        Возвращает:
            dict: Результат операции
            
        Исключения:
            ApiError: Если пользователь не найден или уже активирован
        """
        try:
            user = User.objects.get(email__iexact=email.lower().strip())
        except User.DoesNotExist:
            raise ApiError.bad_request('Пользователь с таким email не найден')
        
        if user.is_activated:
            raise ApiError.bad_request('Аккаунт уже активирован')
        
        # Генерация нового кода с временной меткой
        new_code = UserService._generate_code_with_timestamp(user)
        
        # Генерация новой ссылки активации
        user.activation_link = str(uuid.uuid4())
        user.save(update_fields=['activation_link'])
        
        # Формирование полной ссылки активации
        api_url = getattr(settings, 'API_URL', 'http://localhost:8000')
        activation_url = f"{api_url}/api/auth/activate/{user.activation_link}"
        
        logger.info(f"Повторная отправка кода активации для {email}")

        from apps.users.tasks import dispatch_activation_email
        dispatch_activation_email(email, activation_url, new_code)
        
        return {
            'success': True,
            'message': 'Новый код активации отправлен на email'
        }
    
    @staticmethod
    def request_password_reset(email):
        """
        Запрос на восстановление пароля.
        
        Отправляет код восстановления на email пользователя.
        
        Аргументы:
            email: Email пользователя
            
        Возвращает:
            dict: Результат операции
        """
        try:
            user = User.objects.get(email__iexact=email.lower().strip())
        except User.DoesNotExist:
            # Не раскрываем информацию о существовании пользователя
            return {
                'success': True,
                'message': 'Если аккаунт существует, на указанный email отправлен код восстановления'
            }
        
        # Генерация 6-значного кода восстановления с временной меткой
        reset_code = str(random.randint(ACTIVATION_CODE_MIN, ACTIVATION_CODE_MAX))

        # Сохраняем код в отдельном поле password_reset_code и время создания
        user.password_reset_code = reset_code
        user.password_reset_code_created_at = timezone.now()
        user.save(update_fields=['password_reset_code', 'password_reset_code_created_at'])
        
        logger.debug(f"Код восстановления для {email}: {reset_code}")

        from apps.users.tasks import dispatch_password_reset_email
        dispatch_password_reset_email(email, reset_code)
        
        return {
            'success': True,
            'message': 'Если аккаунт существует, на указанный email отправлен код восстановления'
        }
    
    @staticmethod
    def confirm_password_reset(email, code, new_password):
        """
        Подтверждение восстановления пароля.
        
        Аргументы:
            email: Email пользователя
            code: Код восстановления
            new_password: Новый пароль
            
        Возвращает:
            dict: Результат операции с токенами
        """
        try:
            user = User.objects.get(email__iexact=email.lower().strip())
        except User.DoesNotExist:
            raise ApiError.bad_request('Пользователь не найден')

        if user.password_reset_code != code:
            raise ApiError.bad_request('Неверный код восстановления')

        if UserService._is_code_expired(user.password_reset_code_created_at):
            logger.warning(f"Попытка восстановления пароля просроченным кодом: {email}")
            raise ApiError.bad_request('Код восстановления истёк. Запросите новый код.')

        user.set_password(new_password)
        user.password_reset_code = None
        user.password_reset_code_created_at = None
        user.save(update_fields=['password', 'password_reset_code', 'password_reset_code_created_at'])

        logger.info(f"Пароль успешно сброшен для {email}")

        tokens = TokenService.generate_tokens(user)
        TokenService.save_token(user.id, tokens['refreshToken'])

        from apps.users.serializers import UserShortSerializer
        return {
            'success': True,
            'message': 'Пароль успешно изменён',
            **tokens,
            'user': UserShortSerializer(user).data,
        }

