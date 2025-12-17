"""
Views для аутентификации пользователей

API для регистрации, входа и управления профилем.
Использует Django ORM и JWT токены.
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer,
)

logger = logging.getLogger('apps.users')


class RegisterView(APIView):
    """
    Регистрация нового пользователя.
    
    POST /api/auth/register/
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        # Проверка существования email
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'Пользователь с таким email уже существует'},
                status=status.HTTP_409_CONFLICT
            )
        
        # Создание пользователя
        user = User.objects.create_user(email=email, password=password)
        
        # Генерация JWT токенов
        tokens = self._generate_tokens(user)
        
        logger.info(f"Пользователь зарегистрирован: {email}")
        
        return Response({
            'message': 'Регистрация успешна',
            'user': user.to_dict(),
            'tokens': tokens
        }, status=status.HTTP_201_CREATED)
    
    def _generate_tokens(self, user) -> dict:
        """Генерация JWT токенов."""
        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }


class LoginView(APIView):
    """
    Аутентификация пользователя.
    
    POST /api/auth/login/
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        # Поиск пользователя
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'Неверный email или пароль'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Проверка пароля
        if not user.check_password(password):
            return Response(
                {'error': 'Неверный email или пароль'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Генерация токенов
        refresh = RefreshToken.for_user(user)
        tokens = {
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }
        
        logger.info(f"Пользователь вошёл: {email}")
        
        return Response({
            'message': 'Вход выполнен успешно',
            'user': user.to_dict(),
            'tokens': tokens
        }, status=status.HTTP_200_OK)


class ProfileView(APIView):
    """
    Профиль пользователя.
    
    GET /api/users/profile/ - получение профиля
    PUT /api/users/profile/ - обновление профиля
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Получение связанных данных
        pets = [pet.to_dict() for pet in user.pets.all()]
        orders = [order.to_dict() for order in user.orders.all()]
        courses = [uc.to_dict() for uc in user.user_courses.all()]
        
        return Response({
            'user': user.to_dict(),
            'pets': pets,
            'orders': orders,
            'courses': courses
        }, status=status.HTTP_200_OK)
    
    def put(self, request):
        """Обновление данных профиля."""
        user = request.user
        
        # Обновляемые поля
        allowed_fields = ['email', 'first_name', 'last_name', 'phone', 'default_address']
        
        for field in allowed_fields:
            if field in request.data:
                if field == 'email':
                    # Проверка уникальности email
                    new_email = request.data[field]
                    if new_email != user.email and User.objects.filter(email=new_email).exists():
                        return Response(
                            {'error': 'Пользователь с таким email уже существует'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                setattr(user, field, request.data[field])
        
        user.save()
        
        logger.info(f"Профиль обновлён: {user.email}")
        
        return Response({
            'message': 'Профиль обновлён',
            'user': user.to_dict()
        }, status=status.HTTP_200_OK)


class UserOrdersView(APIView):
    """
    История заказов пользователя.
    
    GET /api/users/orders/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        orders = [order.to_dict() for order in request.user.orders.all()]
        return Response({'orders': orders}, status=status.HTTP_200_OK)


class UserCoursesView(APIView):
    """
    Курсы пользователя.
    
    GET /api/users/courses/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        courses = [uc.to_dict() for uc in request.user.user_courses.all()]
        return Response({'courses': courses}, status=status.HTTP_200_OK)
