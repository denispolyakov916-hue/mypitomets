"""
Views для аутентификации пользователей

API для регистрации, входа, выхода, обновления токенов и активации.
Использует сервисы для бизнес-логики и cookie для refresh токенов.
Аналогично user-controller.js из проекта-образца.
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.http import HttpResponseRedirect
from django.conf import settings

from .models import User
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer,
    ActivationCodeSerializer,
)
from .services import UserService
from core.exceptions import ApiError

logger = logging.getLogger('apps.users')


class RegisterView(APIView):
    """
    Регистрация нового пользователя.
    
    POST /api/auth/registration/
    Тело: {"email": "...", "password": "...", "password_confirm": "..."}
    
    Возвращает access токен в ответе и устанавливает refresh токен в cookie.
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            # Логируем входящие данные для отладки
            logger.debug(f"Попытка регистрации, данные: {request.data}")
            print(f"[REGISTRATION REQUEST] Попытка регистрации")
            print(f"[REGISTRATION REQUEST] Данные запроса: {request.data}")
            print(f"[REGISTRATION REQUEST] Метод: {request.method}, URL: {request.path}")
            
            serializer = UserRegistrationSerializer(data=request.data)
            
            if not serializer.is_valid():
                # Логируем ошибки валидации
                logger.warning(f"Ошибка валидации при регистрации: {serializer.errors}")
                logger.warning(f"Полученные данные: {request.data}")
                print(f"[REGISTRATION ERROR] Ошибка валидации: {serializer.errors}")
                raise ApiError.bad_request('Ошибка при валидации', serializer.errors)
            
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            first_name = serializer.validated_data.get('first_name', '')
            last_name = serializer.validated_data.get('last_name', '')

            print(f"[REGISTRATION] Начало регистрации для email: {email}")

            # Регистрация через сервис
            user_data = UserService.registration(email, password, first_name, last_name)
            
            # При регистрации токены не выдаются - пользователь должен сначала активировать аккаунт
            # Токены будут выданы только после активации через login
            response = Response(user_data, status=status.HTTP_201_CREATED)
            
            logger.info(f"Пользователь зарегистрирован: {email}")
            print(f"[REGISTRATION SUCCESS] Пользователь успешно зарегистрирован: {email}")
            print(f"[REGISTRATION SUCCESS] Ответ: {user_data}")
            
            return response
            
        except ApiError as e:
            # Логируем ошибки API для отладки
            logger.warning(f"ApiError при регистрации: {e.detail}, errors: {getattr(e, 'errors', [])}")
            return Response(
                {'error': e.detail, 'errors': getattr(e, 'errors', [])},
                status=e.status_code
            )
        except Exception as e:
            logger.error(f"Ошибка при регистрации: {str(e)}")
            return Response(
                {'error': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LoginView(APIView):
    """
    Аутентификация пользователя.
    
    POST /api/auth/login/
    Тело: {"email": "...", "password": "..."}
    
    Возвращает access токен в ответе и устанавливает refresh токен в cookie.
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            # Логируем входящие данные для отладки
            logger.debug(f"Попытка входа, данные: {request.data}")
            print(f"[LOGIN REQUEST] Попытка входа")
            print(f"[LOGIN REQUEST] Данные запроса: {request.data}")
            print(f"[LOGIN REQUEST] Метод: {request.method}, URL: {request.path}")
            
            serializer = UserLoginSerializer(data=request.data)
            
            if not serializer.is_valid():
                # Логируем ошибки валидации
                logger.warning(f"Ошибка валидации при входе: {serializer.errors}")
                logger.warning(f"Полученные данные: {request.data}")
                logger.warning(f"Content-Type: {request.content_type}")
                print(f"[LOGIN ERROR] Ошибка валидации: {serializer.errors}")
                raise ApiError.bad_request('Ошибка при валидации', serializer.errors)
            
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            
            print(f"[LOGIN] Начало входа для email: {email}")
            
            # Вход через сервис
            user_data = UserService.login(email, password)
            
            # Установка refresh токена в cookie (httpOnly, 30 дней)
            response = Response(user_data, status=status.HTTP_200_OK)
            response.set_cookie(
                'refreshToken',
                user_data['refreshToken'],
                max_age=30 * 24 * 60 * 60,  # 30 дней
                httponly=True,
                samesite='Lax',
                secure=not settings.DEBUG  # HTTPS только в production
            )
            
            logger.info(f"Пользователь вошёл: {email}")
            print(f"[LOGIN SUCCESS] Пользователь успешно вошёл: {email}")
            print(f"[LOGIN SUCCESS] Access токен выдан")
            
            return response
            
        except ApiError as e:
            # Логируем ошибки API для отладки
            logger.warning(f"ApiError при входе: {e.detail}, errors: {getattr(e, 'errors', [])}")
            return Response(
                {'error': e.detail, 'errors': getattr(e, 'errors', [])},
                status=e.status_code
            )
        except Exception as e:
            logger.error(f"Ошибка при входе: {str(e)}")
            return Response(
                {'error': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LogoutView(APIView):
    """
    Выход пользователя.
    
    POST /api/auth/logout/
    
    Удаляет refresh токен из БД и очищает cookie.
    """
    
    permission_classes = [AllowAny]  # Разрешаем всем, т.к. токен в cookie
    
    def post(self, request):
        try:
            # Получение refresh токена из cookie
            refresh_token = request.COOKIES.get('refreshToken')
            
            # Выход через сервис
            result = UserService.logout(refresh_token)
            
            # Очистка cookie
            response = Response(result, status=status.HTTP_200_OK)
            response.delete_cookie('refreshToken')
            
            logger.info("Пользователь вышел")
            
            return response
            
        except ApiError as e:
            return Response(
                {'error': e.detail},
                status=e.status_code
            )
        except Exception as e:
            logger.error(f"Ошибка при выходе: {str(e)}")
            return Response(
                {'error': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RefreshView(APIView):
    """
    Обновление access токена по refresh токену.
    
    GET /api/auth/refresh/
    
    Получает refresh токен из cookie, валидирует его и возвращает новые токены.
    """
    
    permission_classes = [AllowAny]  # Разрешаем всем, т.к. токен в cookie
    
    def get(self, request):
        try:
            # Получение refresh токена из cookie
            refresh_token = request.COOKIES.get('refreshToken')
            
            # Обновление токенов через сервис
            user_data = UserService.refresh(refresh_token)
            
            # Установка нового refresh токена в cookie
            response = Response(user_data, status=status.HTTP_200_OK)
            response.set_cookie(
                'refreshToken',
                user_data['refreshToken'],
                max_age=30 * 24 * 60 * 60,  # 30 дней
                httponly=True,
                samesite='Lax',
                secure=not settings.DEBUG
            )
            
            return response
            
        except ApiError as e:
            return Response(
                {'error': e.detail},
                status=e.status_code
            )
        except Exception as e:
            logger.error(f"Ошибка при обновлении токена: {str(e)}")
            return Response(
                {'error': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ActivateView(APIView):
    """
    Активация пользователя по ссылке из email.
    
    GET /api/auth/activate/<activation_link>/
    
    Активирует пользователя и перенаправляет на клиент с временным кодом для получения токенов.
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request, activation_link):
        try:
            # Активация через сервис
            result = UserService.activate(activation_link=activation_link)
            
            # Перенаправление на клиент с временным кодом для обмена на токены
            client_url = getattr(settings, 'CLIENT_URL', 'http://localhost:5173')
            temp_code = result.get('temp_auth_code')
            if temp_code:
                return HttpResponseRedirect(f"{client_url}?activation_success=1&auth_code={temp_code}")
            else:
                # Если по какой-то причине кода нет, просто перенаправляем
                return HttpResponseRedirect(f"{client_url}?activation_success=1")
            
        except ApiError as e:
            logger.error(f"Ошибка активации: {e.detail}")
            # Перенаправление на клиент с ошибкой
            client_url = getattr(settings, 'CLIENT_URL', 'http://localhost:5173')
            error_msg = e.detail.replace(' ', '_')  # Заменяем пробелы для URL
            return HttpResponseRedirect(f"{client_url}?activation_error=1&message={error_msg}")
        except Exception as e:
            logger.error(f"Ошибка при активации: {str(e)}")
            client_url = getattr(settings, 'CLIENT_URL', 'http://localhost:5173')
            return HttpResponseRedirect(f"{client_url}?activation_error=1")


class ActivateByCodeView(APIView):
    """
    Активация пользователя по коду из email.
    
    POST /api/auth/activate-by-code/
    Тело: {"activation_code": "123456"}
    
    Возвращает токены и данные пользователя после успешной активации.
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            serializer = ActivationCodeSerializer(data=request.data)
            
            if not serializer.is_valid():
                return Response(
                    {'error': 'Ошибка валидации', 'errors': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            activation_code = serializer.validated_data['activation_code']
            
            # Активация через сервис - возвращает токены и данные пользователя
            user_data = UserService.activate(activation_code=activation_code)
            
            logger.info(f"Пользователь активирован по коду: {activation_code}")
            
            # Установка refresh токена в cookie (httpOnly, 30 дней)
            response = Response(user_data, status=status.HTTP_200_OK)
            response.set_cookie(
                'refreshToken',
                user_data['refreshToken'],
                max_age=30 * 24 * 60 * 60,  # 30 дней
                httponly=True,
                samesite='Lax',
                secure=not settings.DEBUG  # HTTPS только в production
            )
            
            return response
            
        except ApiError as e:
            logger.error(f"Ошибка активации по коду: {e.detail}")
            return Response(
                {'error': e.detail},
                status=e.status_code
            )
        except Exception as e:
            logger.error(f"Ошибка при активации по коду: {str(e)}")
            return Response(
                {'error': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExchangeAuthCodeView(APIView):
    """
    Обмен временного кода активации на токены.
    
    POST /api/auth/exchange-auth-code/
    Тело: {"auth_code": "123456"}
    
    Используется после активации по ссылке для получения токенов.
    Возвращает токены и устанавливает refresh токен в cookie.
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            # Используем ActivationCodeSerializer для валидации кода
            # Переименовываем поле для совместимости
            data = request.data.copy()
            if 'auth_code' in data:
                data['activation_code'] = data.pop('auth_code')
            
            serializer = ActivationCodeSerializer(data=data)
            
            if not serializer.is_valid():
                return Response(
                    {'error': 'Ошибка валидации', 'errors': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            auth_code = serializer.validated_data['activation_code']
            
            # Обмен кода на токены через сервис
            user_data = UserService.exchange_temp_code_for_tokens(auth_code)
            
            logger.info(f"Временный код обменян на токены")
            
            # Установка refresh токена в cookie (httpOnly, 30 дней)
            response = Response(user_data, status=status.HTTP_200_OK)
            response.set_cookie(
                'refreshToken',
                user_data['refreshToken'],
                max_age=30 * 24 * 60 * 60,  # 30 дней
                httponly=True,
                samesite='Lax',
                secure=not settings.DEBUG  # HTTPS только в production
            )
            
            return response
            
        except ApiError as e:
            logger.error(f"Ошибка обмена кода на токены: {e.detail}")
            return Response(
                {'error': e.detail},
                status=e.status_code
            )
        except Exception as e:
            logger.error(f"Ошибка при обмене кода на токены: {str(e)}")
            return Response(
                {'error': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GetUsersView(APIView):
    """
    Получение списка всех пользователей (для тестирования).
    
    GET /api/auth/users/
    Требует аутентификации.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            users = UserService.get_all_users()
            users_data = [user.to_dict() for user in users]
            return Response(users_data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Ошибка при получении пользователей: {str(e)}")
            return Response(
                {'error': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProfileView(APIView):
    """
    Профиль пользователя.
    
    GET /api/users/profile/ - получение профиля
    PUT /api/users/profile/ - обновление профиля
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Оптимизированное получение связанных данных с prefetch_related
        # Это устраняет N+1 проблему при загрузке связанных объектов
        from django.db.models import Prefetch
        from apps.pets.models import Pet
        from apps.shop.models import Order, OrderItem
        from apps.training.models import UserCourse
        
        pets = [pet.to_dict() for pet in Pet.objects.filter(owner=user)]
        
        # Предзагружаем items с продуктами и курсами для заказов
        orders_qs = Order.objects.filter(user=user).prefetch_related(
            Prefetch(
                'items',
                queryset=OrderItem.objects.select_related('product', 'course', 'pet')
            ),
            'address'
        ).order_by('-created_at')
        orders = [order.to_dict() for order in orders_qs]
        
        # Предзагружаем курс и питомца для UserCourse
        courses_qs = UserCourse.objects.filter(user=user).select_related(
            'course', 'pet'
        ).order_by('-purchased_at')
        courses = [uc.to_dict() for uc in courses_qs]
        
        return Response({
            'user': user.to_dict_full(),
            'pets': pets,
            'orders': orders,
            'courses': courses
        }, status=status.HTTP_200_OK)
    
    def put(self, request):
        """Обновление данных профиля."""
        user = request.user

        # Обновляемые поля
        allowed_fields = [
            'email', 'first_name', 'last_name', 'phone', 'default_address',
            'avatar', 'bio', 'date_of_birth', 'city', 'website',
            'email_notifications', 'push_notifications', 'order_notifications',
            'marketing_notifications', 'preferred_pet_types'
        ]

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
                elif field == 'date_of_birth':
                    # Преобразование строки в дату
                    from datetime import datetime
                    if request.data[field]:
                        try:
                            date_obj = datetime.strptime(request.data[field], '%Y-%m-%d').date()
                            setattr(user, field, date_obj)
                        except ValueError:
                            return Response(
                                {'error': 'Неверный формат даты рождения. Используйте YYYY-MM-DD'},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                    else:
                        setattr(user, field, None)
                elif field in ['email_notifications', 'push_notifications', 'order_notifications', 'marketing_notifications']:
                    # Булевы поля
                    setattr(user, field, bool(request.data[field]))
                elif field == 'preferred_pet_types':
                    # Список предпочитаемых типов питомцев
                    if isinstance(request.data[field], list):
                        setattr(user, field, request.data[field])
                    else:
                        return Response(
                            {'error': 'preferred_pet_types должен быть списком'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                else:
                    setattr(user, field, request.data[field])

        user.save()

        logger.info(f"Профиль обновлён: {user.email}")

        return Response({
            'message': 'Профиль обновлён',
            'user': user.to_dict_full()
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
