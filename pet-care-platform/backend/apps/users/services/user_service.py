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
        activation_code = str(random.randint(100000, 999999))

        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name or '',
            last_name=last_name or '',
            activation_link=activation_link,
            activation_code=activation_code,
            is_activated=False  # По умолчанию не активирован
        )
        
        # Формирование полной ссылки активации
        api_url = getattr(settings, 'API_URL', 'http://localhost:8000')
        activation_url = f"{api_url}/api/auth/activate/{activation_link}"
        
        print(f"[REGISTRATION] Пользователь создан: ID={user.id}, Email={email}")
        print(f"[REGISTRATION] Код активации: {activation_code}")
        print(f"[REGISTRATION] Ссылка активации: {activation_url}")
        
        # Отправка письма активации с кодом и ссылкой
        try:
            print(f"[EMAIL] Начало отправки письма активации на {email}")
            MailService.send_activation_mail(email, activation_url, activation_code)
            print(f"[EMAIL SUCCESS] Письмо активации успешно отправлено на {email}")
            print(f"[EMAIL SUCCESS] Код активации в письме: {activation_code}")
        except Exception as e:
            logger.error(f"Не удалось отправить письмо активации на {email}: {str(e)}")
            print(f"[EMAIL ERROR] Ошибка отправки письма на {email}: {str(e)}")
            # Продолжаем регистрацию даже если email не отправился
            # В production можно использовать очередь задач (Celery)
        
        # Не возвращаем токены при регистрации - пользователь должен сначала активировать аккаунт
        # Токены будут выданы только после активации через login
        return {
            'message': 'Регистрация успешна. Проверьте email для активации аккаунта.',
            'email': email
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
            ApiError: Если ссылка или код активации некорректны, или аккаунт уже активирован
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
        
        user.is_activated = True
        # Очищаем код и ссылку после активации для безопасности
        user.activation_code = None
        user.activation_link = None
        user.save()
        
        logger.info(f"Пользователь активирован: {user.email}")
        user_dto = user.to_dict()
        
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
        temp_auth_code = str(random.randint(100000, 999999))
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
        
        user_dto = user.to_dict()
        
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
        
        # Проверка активации аккаунта
        if not user.is_activated:
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
        
        # Генерация 6-значного кода восстановления
        reset_code = str(random.randint(100000, 999999))
        
        # Сохраняем код в поле activation_code (переиспользуем)
        user.activation_code = reset_code
        user.save(update_fields=['activation_code'])
        
        logger.info(f"Код восстановления для {email}: {reset_code}")
        print(f"[PASSWORD RESET] Код восстановления для {email}: {reset_code}")
        
        # Отправка письма с кодом
        try:
            MailService.send_password_reset_mail(email, reset_code)
            print(f"[PASSWORD RESET] Письмо отправлено на {email}")
        except Exception as e:
            logger.error(f"Ошибка отправки письма восстановления: {str(e)}")
            print(f"[PASSWORD RESET ERROR] {str(e)}")
        
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
        
        # Проверка кода
        if user.activation_code != code:
            raise ApiError.bad_request('Неверный код восстановления')
        
        # Установка нового пароля
        user.set_password(new_password)
        user.activation_code = None  # Очищаем код
        user.save(update_fields=['password', 'activation_code'])
        
        logger.info(f"Пароль успешно сброшен для {email}")
        print(f"[PASSWORD RESET SUCCESS] Пароль изменён для {email}")
        
        # Автоматически входим пользователя
        tokens = TokenService.generate_tokens(user)
        TokenService.save_token(user.id, tokens['refreshToken'])
        
        return {
            'success': True,
            'message': 'Пароль успешно изменён',
            **tokens,
            'user': user.to_dict()
        }

