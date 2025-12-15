"""
Views для аутентификации пользователей

Этот модуль содержит API views для регистрации, входа и
управления токенами. Использует JWT токены для stateless аутентификации.

Классы View:
    - RegisterView: Обрабатывает регистрацию новых пользователей
    - LoginView: Аутентифицирует пользователей и выдаёт JWT токены
    - ProfileView: Возвращает данные профиля аутентифицированного пользователя
    - UserOrdersView: Возвращает историю заказов пользователя
    - UserCoursesView: Возвращает приобретённые курсы пользователя

Процесс аутентификации:
    1. Пользователь регистрируется через /api/auth/register/
    2. Пользователь входит через /api/auth/login/ -> получает JWT токен
    3. Пользователь включает токен в заголовок Authorization для защищённых эндпоинтов
    4. Токен валидируется на каждом запросе JWT middleware

Соображения безопасности:
    - Пароли хешируются перед сохранением (никогда не хранятся в открытом виде)
    - JWT токены истекают через 1 день (настраивается в settings)
    - Одинаковое сообщение об ошибке для "пользователь не найден" и "неверный пароль" (предотвращает перечисление)
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from core.data_store import data_store
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer,
    UserProfileSerializer
)

# Настройка логгера для этого модуля
logger = logging.getLogger('apps.users')


class RegisterView(APIView):
    """
    API эндпоинт для регистрации пользователей.
    
    Создаёт новый аккаунт с email и паролем.
    Возвращает JWT токены при успешной регистрации для немедленного входа.
    
    Эндпоинт: POST /api/auth/register/
    
    Тело запроса:
        {
            "email": "user@example.com",
            "password": "secret123",
            "password_confirm": "secret123"
        }
    
    Успешный ответ (201 Created):
        {
            "message": "Регистрация успешна",
            "user": {"id": 1, "email": "user@example.com", "created_at": "..."},
            "tokens": {
                "access": "eyJ...",
                "refresh": "eyJ..."
            }
        }
    
    Ответы с ошибками:
        400 Bad Request - Ошибки валидации (неверный email, пароли не совпадают)
        409 Conflict - Email уже зарегистрирован
    
    Процесс:
        1. Валидация входных данных (формат email, совпадение паролей)
        2. Проверка, что email ещё не существует
        3. Создание пользователя в хранилище данных
        4. Генерация JWT токенов
        5. Возврат информации о пользователе и токенов
    
    Заметки по безопасности:
        - Аутентификация не требуется (публичный эндпоинт)
        - Пароль хешируется перед сохранением
        - Возвращает токены для немедленного начала сессии
    """
    
    # Разрешаем неаутентифицированный доступ (регистрация публична)
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Обработка POST запроса регистрации пользователя.
        
        Аргументы:
            request: DRF Request объект с данными регистрации
            
        Возвращает:
            Response: JSON ответ с данными пользователя и токенами или сообщением об ошибке
        """
        # Валидация данных запроса
        serializer = UserRegistrationSerializer(data=request.data)
        
        if not serializer.is_valid():
            logger.warning(f"Ошибка валидации регистрации: {serializer.errors}")
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        # Попытка создания пользователя
        user = data_store.create_user(email=email, password=password)
        
        if not user:
            # Email уже существует
            logger.warning(f"Регистрация не удалась: email {email} уже существует")
            return Response(
                {'error': 'Пользователь с таким email уже существует'},
                status=status.HTTP_409_CONFLICT
            )
        
        # Генерация JWT токенов для немедленного входа
        tokens = self._generate_tokens(user.id)
        
        logger.info(f"Пользователь успешно зарегистрирован: {email}")
        
        return Response({
            'message': 'Регистрация успешна',
            'user': user.to_dict(),
            'tokens': tokens
        }, status=status.HTTP_201_CREATED)
    
    def _generate_tokens(self, user_id: int) -> dict:
        """
        Генерация JWT access и refresh токенов для пользователя.
        
        Создаёт токены с claim user_id для аутентификации.
        
        Аргументы:
            user_id: ID пользователя для генерации токенов
            
        Возвращает:
            dict: Содержит строки 'access' и 'refresh' токенов
            
        Claims токена:
            - user_id: ID пользователя в базе данных
            - exp: Временная метка истечения
            - iat: Временная метка выдачи
        """
        # Создание refresh токена с кастомным claim
        refresh = RefreshToken()
        refresh['user_id'] = user_id
        
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }


class LoginView(APIView):
    """
    API эндпоинт для аутентификации пользователей.
    
    Валидирует учётные данные и возвращает JWT токены для аутентифицированной сессии.
    
    Эндпоинт: POST /api/auth/login/
    
    Тело запроса:
        {
            "email": "user@example.com",
            "password": "secret123"
        }
    
    Успешный ответ (200 OK):
        {
            "message": "Вход выполнен успешно",
            "user": {"id": 1, "email": "user@example.com", ...},
            "tokens": {
                "access": "eyJ...",
                "refresh": "eyJ..."
            }
        }
    
    Ответ с ошибкой (401 Unauthorized):
        {
            "error": "Неверный email или пароль"
        }
    
    Заметки по безопасности:
        - Одинаковое сообщение об ошибке для неверного email или пароля (предотвращает перечисление)
        - Неудачные попытки логируются для мониторинга безопасности
        - Нет ограничения частоты запросов в MVP (следует добавить для продакшена)
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Обработка POST запроса входа пользователя.
        
        Аргументы:
            request: DRF Request объект с учётными данными для входа
            
        Возвращает:
            Response: JSON ответ с данными пользователя и токенами или сообщением об ошибке
        """
        serializer = UserLoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        # Аутентификация пользователя
        user = data_store.authenticate_user(email=email, password=password)
        
        if not user:
            # Аутентификация не удалась - используем общее сообщение
            logger.warning(f"Ошибка входа для email: {email}")
            return Response(
                {'error': 'Неверный email или пароль'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Генерация токенов
        refresh = RefreshToken()
        refresh['user_id'] = user.id
        
        tokens = {
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }
        
        logger.info(f"Пользователь вошёл в систему: {email}")
        
        return Response({
            'message': 'Вход выполнен успешно',
            'user': user.to_dict(),
            'tokens': tokens
        }, status=status.HTTP_200_OK)


class ProfileView(APIView):
    """
    API эндпоинт для данных профиля пользователя.
    
    Возвращает полную информацию о профиле, включая:
    - Базовые данные пользователя (email, дата регистрации)
    - Список питомцев пользователя
    - Историю заказов
    - Приобретённые курсы
    
    Эндпоинт: GET /api/users/profile/
    
    Требуемые заголовки:
        Authorization: Bearer <access_token>
    
    Успешный ответ (200 OK):
        {
            "user": {"id": 1, "email": "...", "created_at": "..."},
            "pets": [...],
            "orders": [...],
            "courses": [...]
        }
    
    Ответ с ошибкой (401 Unauthorized):
        Если токен отсутствует или невалиден
    
    Примечание:
        Требует валидный JWT токен в заголовке Authorization.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Обработка GET запроса профиля.
        
        Агрегирует все данные, связанные с пользователем, для страницы профиля.
        
        Аргументы:
            request: DRF Request объект с аутентифицированным пользователем
            
        Возвращает:
            Response: JSON с полными данными профиля
        """
        # Получение ID пользователя из JWT токена
        user_id = request.user_id
        
        # Получение данных пользователя
        user = data_store.get_user_by_id(user_id)
        if not user:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Сбор всех данных, связанных с пользователем
        pets = [pet.to_dict() for pet in data_store.get_user_pets(user_id)]
        orders = [order.to_dict() for order in data_store.get_user_orders(user_id)]
        courses = data_store.get_user_courses(user_id)
        
        return Response({
            'user': user.to_dict(),
            'pets': pets,
            'orders': orders,
            'courses': courses
        }, status=status.HTTP_200_OK)


class UserOrdersView(APIView):
    """
    API эндпоинт для истории заказов пользователя.
    
    Возвращает список всех заказов, оформленных аутентифицированным пользователем.
    
    Эндпоинт: GET /api/users/orders/
    
    Требуемые заголовки:
        Authorization: Bearer <access_token>
    
    Успешный ответ (200 OK):
        {
            "orders": [
                {
                    "id": 1,
                    "items": [...],
                    "total_amount": 5000,
                    "status": "pending",
                    "created_at": "..."
                },
                ...
            ]
        }
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Получение истории заказов пользователя."""
        user_id = request.user_id
        orders = [order.to_dict() for order in data_store.get_user_orders(user_id)]
        
        return Response({
            'orders': orders
        }, status=status.HTTP_200_OK)


class UserCoursesView(APIView):
    """
    API эндпоинт для приобретённых/записанных курсов пользователя.
    
    Возвращает список всех курсов, к которым пользователь имеет доступ.
    
    Эндпоинт: GET /api/users/courses/
    
    Требуемые заголовки:
        Authorization: Bearer <access_token>
    
    Успешный ответ (200 OK):
        {
            "courses": [
                {
                    "course": {...},
                    "purchased_at": "...",
                    "progress": 0
                },
                ...
            ]
        }
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Получение курсов пользователя."""
        user_id = request.user_id
        courses = data_store.get_user_courses(user_id)
        
        return Response({
            'courses': courses
        }, status=status.HTTP_200_OK)
