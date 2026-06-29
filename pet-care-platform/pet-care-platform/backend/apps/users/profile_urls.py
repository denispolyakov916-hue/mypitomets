"""
URL маршруты для эндпоинтов профиля пользователя.

Эти эндпоинты требуют аутентификации и возвращают данные пользователя:
- /api/users/profile/ - Полный профиль пользователя с питомцами, заказами, курсами
- /api/users/orders/ - История заказов пользователя
- /api/users/courses/ - Приобретённые курсы пользователя

Все пути имеют префикс /api/users/ в главном urls.py
"""

from django.urls import path
from .views import (
    ProfileView,
    UserOrdersView,
    UserCoursesView,
    VerifyEmailRequestView,
    VerifyEmailConfirmView,
    VerifyPhoneRequestView,
    VerifyPhoneConfirmView,
)

urlpatterns = [
    # Профиль пользователя со всеми связанными данными
    # GET /api/users/profile/
    path('profile/', ProfileView.as_view(), name='user-profile'),

    # История заказов пользователя
    # GET /api/users/orders/
    path('orders/', UserOrdersView.as_view(), name='user-orders'),

    # Приобретённые курсы пользователя
    # GET /api/users/courses/
    path('courses/', UserCoursesView.as_view(), name='user-courses-profile'),

    # Подтверждение контактов в профиле (по коду)
    path('verify/email/request/', VerifyEmailRequestView.as_view(), name='verify-email-request'),
    path('verify/email/confirm/', VerifyEmailConfirmView.as_view(), name='verify-email-confirm'),
    path('verify/phone/request/', VerifyPhoneRequestView.as_view(), name='verify-phone-request'),
    path('verify/phone/confirm/', VerifyPhoneConfirmView.as_view(), name='verify-phone-confirm'),
]
