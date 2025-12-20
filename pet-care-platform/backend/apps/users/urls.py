"""
URL маршруты для эндпоинтов аутентификации.

Этот модуль определяет URL маршруты для аутентификации пользователей:
- /api/auth/registration/ - Регистрация пользователя
- /api/auth/register/ - Регистрация пользователя (старый URL для обратной совместимости)
- /api/auth/login/ - Вход пользователя
- /api/auth/logout/ - Выход пользователя
- /api/auth/refresh/ - Обновление access токена
- /api/auth/activate/<link>/ - Активация аккаунта по ссылке
- /api/auth/users/ - Список пользователей (для тестирования)

Все пути имеют префикс /api/auth/ в главном urls.py
Аналогично router/index.js из проекта-образца.
"""

from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    RefreshView,
    ActivateView,
    ActivateByCodeView,
    GetUsersView,
)

urlpatterns = [
    # Регистрация пользователя (старый URL для обратной совместимости)
    # POST /api/auth/register/
    path('register/', RegisterView.as_view(), name='auth-register'),
    
    # Регистрация пользователя
    # POST /api/auth/registration/
    path('registration/', RegisterView.as_view(), name='auth-registration'),
    
    # Вход пользователя
    # POST /api/auth/login/
    path('login/', LoginView.as_view(), name='auth-login'),
    
    # Выход пользователя
    # POST /api/auth/logout/
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    
    # Обновление токена (получает refresh токен из cookie)
    # GET /api/auth/refresh/
    path('refresh/', RefreshView.as_view(), name='auth-refresh'),
    
    # Активация аккаунта по ссылке из email
    # GET /api/auth/activate/<activation_link>/
    path('activate/<str:activation_link>/', ActivateView.as_view(), name='auth-activate'),
    
    # Активация аккаунта по коду из email
    # POST /api/auth/activate-by-code/
    path('activate-by-code/', ActivateByCodeView.as_view(), name='auth-activate-by-code'),
    
    # Список пользователей (для тестирования, требует аутентификации)
    # GET /api/auth/users/
    path('users/', GetUsersView.as_view(), name='auth-users'),
]
