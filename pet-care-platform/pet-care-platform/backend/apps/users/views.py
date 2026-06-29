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
from django.http import HttpResponseRedirect
from django.conf import settings

from .models import User
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserShortSerializer,
    UserFullSerializer,
    UserProfileUpdateSerializer,
    ActivationCodeSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from .services import UserService
from .services.phone_auth_service import PhoneAuthService
from .services.profile_verification_service import ProfileVerificationService
from core.exceptions import ApiError
from core.validators import set_refresh_token_cookie

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
            logger.debug(f"Попытка регистрации, данные: {request.data}")

            serializer = UserRegistrationSerializer(data=request.data)
            if not serializer.is_valid():
                logger.warning(f"Ошибка валидации при регистрации: {serializer.errors}")
                raise ApiError.bad_request('Ошибка при валидации', serializer.errors)

            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            first_name = serializer.validated_data.get('first_name', '')
            last_name = serializer.validated_data.get('last_name', '')

            user_data = UserService.registration(email, password, first_name, last_name)
            response = Response(user_data, status=status.HTTP_201_CREATED)
            # Бета: регистрация сразу логинит — ставим refresh-cookie, как при входе
            if user_data.get('refreshToken'):
                set_refresh_token_cookie(response, user_data['refreshToken'])

            logger.info(f"Пользователь зарегистрирован: {email}")
            return response

        except ApiError as e:
            logger.warning(f"ApiError при регистрации: {e.detail}")
            return Response(
                {'error': e.detail, 'errors': getattr(e, 'errors', [])},
                status=e.status_code
            )
        except Exception as e:
            logger.error(f"Ошибка при регистрации: {str(e)}", exc_info=True)
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
            serializer = UserLoginSerializer(data=request.data)
            if not serializer.is_valid():
                logger.warning(f"Ошибка валидации при входе: {serializer.errors}")
                raise ApiError.bad_request('Ошибка при валидации', serializer.errors)

            email = serializer.validated_data['email']
            password = serializer.validated_data['password']

            user_data = UserService.login(email, password)

            response = Response(user_data, status=status.HTTP_200_OK)
            set_refresh_token_cookie(response, user_data['refreshToken'])

            logger.info(f"Пользователь вошёл: {email}")
            return response

        except ApiError as e:
            logger.warning(f"ApiError при входе: {e.detail}")
            return Response(
                {'error': e.detail, 'errors': getattr(e, 'errors', [])},
                status=e.status_code
            )
        except Exception as e:
            logger.error(f"Ошибка при входе: {str(e)}", exc_info=True)
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
            
            response = Response(user_data, status=status.HTTP_200_OK)
            set_refresh_token_cookie(response, user_data['refreshToken'])
            return response

        except ApiError as e:
            return Response({'error': e.detail}, status=e.status_code)
        except Exception as e:
            logger.error(f"Ошибка при обновлении токена: {str(e)}", exc_info=True)
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

            response = Response(user_data, status=status.HTTP_200_OK)
            set_refresh_token_cookie(response, user_data['refreshToken'])
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
            
            logger.info("Временный код обменян на токены")

            response = Response(user_data, status=status.HTTP_200_OK)
            set_refresh_token_cookie(response, user_data['refreshToken'])
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
            serializer = UserShortSerializer(users, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Ошибка при получении пользователей: {str(e)}", exc_info=True)
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
        from django.db.models import Prefetch
        from apps.pets.models import Pet
        from apps.pets.serializers import PetSerializer
        from apps.shop.models import Order, OrderItem
        from apps.training.models import UserCourse

        user = request.user

        pets = Pet.objects.select_related('breed').filter(owner=user)
        pet_data = PetSerializer(pets, many=True, context={'request': request}).data

        orders_qs = Order.objects.filter(user=user).prefetch_related(
            Prefetch(
                'items',
                queryset=OrderItem.objects.select_related('product', 'course', 'pet')
            ),
        ).order_by('-created_at')
        orders = [order.to_dict() for order in orders_qs]

        courses_qs = UserCourse.objects.filter(user=user).select_related(
            'course', 'pet'
        ).order_by('-purchased_at')
        courses = [uc.to_dict() for uc in courses_qs]

        user_data = UserFullSerializer(user).data

        return Response({
            'user': user_data,
            'pets': pet_data,
            'orders': orders,
            'courses': courses,
        }, status=status.HTTP_200_OK)

    def put(self, request):
        """Обновление данных профиля через сериализатор."""
        user = request.user

        serializer = UserProfileUpdateSerializer(
            data=request.data,
            context={'user': user},
        )
        if not serializer.is_valid():
            return Response(
                {'error': 'Ошибка валидации', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for field, value in serializer.validated_data.items():
            setattr(user, field, value)
        user.save()

        logger.info(f"Профиль обновлён: {user.email}")

        return Response({
            'message': 'Профиль обновлён',
            'user': UserFullSerializer(user).data,
        }, status=status.HTTP_200_OK)


class UserOrdersView(APIView):
    """
    История заказов пользователя.
    
    GET /api/users/orders/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        orders_qs = request.user.orders.prefetch_related(
            'items__product', 'items__course', 'items__pet',
        ).order_by('-created_at')
        orders = [order.to_dict() for order in orders_qs]
        return Response({'orders': orders}, status=status.HTTP_200_OK)


class UserCoursesView(APIView):
    """
    Курсы пользователя.
    
    GET /api/users/courses/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        courses_qs = request.user.user_courses.select_related(
            'course', 'pet',
        ).order_by('-purchased_at')
        courses = [uc.to_dict() for uc in courses_qs]
        return Response({'courses': courses}, status=status.HTTP_200_OK)


class ResendActivationCodeView(APIView):
    """
    Повторная отправка кода активации.
    
    POST /api/auth/resend-activation/
    Тело: {"email": "..."}
    
    Генерирует новый код и отправляет его на email.
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            email = request.data.get('email')
            if not email:
                return Response(
                    {'error': 'Email обязателен'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            result = UserService.resend_activation_code(email)
            return Response(result, status=status.HTTP_200_OK)
            
        except ApiError as e:
            return Response({'error': e.detail}, status=e.status_code)
        except Exception as e:
            logger.error(f"Ошибка при повторной отправке кода активации: {str(e)}")
            return Response(
                {'error': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetRequestView(APIView):
    """
    Запрос на восстановление пароля.
    
    POST /api/auth/password-reset/
    Тело: {"email": "..."}
    
    Отправляет код восстановления на указанный email.
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            serializer = PasswordResetRequestSerializer(data=request.data)
            
            if not serializer.is_valid():
                return Response(
                    {'error': 'Ошибка валидации', 'errors': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            email = serializer.validated_data['email']
            result = UserService.request_password_reset(email)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except ApiError as e:
            return Response({'error': e.detail}, status=e.status_code)
        except Exception as e:
            logger.error(f"Ошибка при запросе восстановления пароля: {str(e)}")
            return Response(
                {'error': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetConfirmView(APIView):
    """
    Подтверждение восстановления пароля.
    
    POST /api/auth/password-reset/confirm/
    Тело: {"email": "...", "code": "123456", "new_password": "...", "new_password_confirm": "..."}
    
    Возвращает токены при успешной смене пароля.
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            serializer = PasswordResetConfirmSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'error': 'Ошибка валидации', 'errors': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            email = serializer.validated_data['email']
            code = serializer.validated_data['code']
            new_password = serializer.validated_data['new_password']

            result = UserService.confirm_password_reset(email, code, new_password)

            response = Response(result, status=status.HTTP_200_OK)
            if 'refreshToken' in result:
                set_refresh_token_cookie(response, result['refreshToken'])
            return response
            
        except ApiError as e:
            return Response({'error': e.detail}, status=e.status_code)
        except Exception as e:
            logger.error(f"Ошибка при подтверждении восстановления пароля: {str(e)}")
            return Response(
                {'error': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RequestPhoneCodeView(APIView):
    """
    Запрос SMS-кода для регистрации/входа по телефону.

    POST /api/auth/phone/request-code/
    Тело: {"phone": "+7..."}
    """

    permission_classes = [AllowAny]

    def post(self, request):
        try:
            result = PhoneAuthService.request_code(request.data.get('phone'))
            return Response(result, status=status.HTTP_200_OK)
        except ApiError as e:
            return Response({'error': e.detail}, status=e.status_code)
        except Exception as e:
            logger.error(f"Ошибка при запросе SMS-кода: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyPhoneCodeView(APIView):
    """
    Подтверждение SMS-кода: регистрация/вход по телефону.

    POST /api/auth/phone/verify-code/
    Тело: {"phone": "+7...", "code": "123456"}
    Возвращает access токен, ставит refresh токен в cookie.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        try:
            result = PhoneAuthService.verify_code(
                request.data.get('phone'), request.data.get('code')
            )
            response = Response(
                {
                    'accessToken': result['accessToken'],
                    'user': result['user'],
                    'created': result['created'],
                },
                status=status.HTTP_200_OK,
            )
            set_refresh_token_cookie(response, result['refreshToken'])
            return response
        except ApiError as e:
            return Response({'error': e.detail}, status=e.status_code)
        except Exception as e:
            logger.error(f"Ошибка при подтверждении SMS-кода: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ---------------------------------------------------------------------------
# Подтверждение контактов в профиле (email / телефон) — для залогиненного юзера
# ---------------------------------------------------------------------------

def _verification_response(handler):
    """Общий обработчик: ApiError → 400, прочее → 500."""
    try:
        return Response(handler(), status=status.HTTP_200_OK)
    except ApiError as e:
        return Response({'error': e.detail}, status=e.status_code)
    except Exception as e:  # noqa: BLE001
        logger.error(f"Ошибка подтверждения контакта: {str(e)}", exc_info=True)
        return Response(
            {'error': 'Внутренняя ошибка сервера'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class VerifyEmailRequestView(APIView):
    """POST /api/users/verify/email/request/ — отправить код подтверждения на email."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        return _verification_response(
            lambda: ProfileVerificationService.request_email_code(request.user)
        )


class VerifyEmailConfirmView(APIView):
    """POST /api/users/verify/email/confirm/ — подтвердить email кодом. Тело: {"code": "123456"}."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        return _verification_response(
            lambda: ProfileVerificationService.confirm_email(
                request.user, request.data.get('code')
            )
        )


class VerifyPhoneRequestView(APIView):
    """POST /api/users/verify/phone/request/ — отправить SMS-код. Тело: {"phone": "+7..."}."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        return _verification_response(
            lambda: ProfileVerificationService.request_phone_code(
                request.user, request.data.get('phone')
            )
        )


class VerifyPhoneConfirmView(APIView):
    """POST /api/users/verify/phone/confirm/ — подтвердить телефон. Тело: {"phone","code"}."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        return _verification_response(
            lambda: ProfileVerificationService.confirm_phone(
                request.user, request.data.get('phone'), request.data.get('code')
            )
        )
