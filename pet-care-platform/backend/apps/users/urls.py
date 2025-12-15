"""
URL маршруты для эндпоинтов аутентификации.

Этот модуль определяет URL маршруты для аутентификации пользователей:
- /api/auth/register/ - Регистрация пользователя
- /api/auth/login/ - Вход пользователя (получение JWT токенов)
- /api/auth/token/refresh/ - Обновление JWT access токена

Все пути имеют префикс /api/auth/ в главном urls.py
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView

urlpatterns = [
    # Регистрация пользователя
    # POST /api/auth/register/
    path('register/', RegisterView.as_view(), name='auth-register'),
    
    # Вход пользователя
    # POST /api/auth/login/
    path('login/', LoginView.as_view(), name='auth-login'),
    
    # Обновление токена (встроенный из simplejwt)
    # POST /api/auth/token/refresh/
    # Тело: {"refresh": "..."}
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]
