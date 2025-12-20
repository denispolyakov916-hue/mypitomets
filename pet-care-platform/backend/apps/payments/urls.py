"""
URL маршруты для единой системы платежей

Единая точка входа для всех платежей:
    POST /api/payments/ - Создание платежа
    GET /api/payments/ - Список платежей пользователя
    GET /api/payments/{id}/ - Детали платежа
    POST /api/payments/{id}/confirm/ - Подтверждение платежа
    POST /api/payments/{id}/cancel/ - Отмена платежа
    GET /api/payments/statistics/ - Статистика платежей
"""

from django.urls import path
from .views import (
    PaymentCreateView,
    PaymentDetailView,
    PaymentListView,
    PaymentConfirmView,
    PaymentCancelView,
    PaymentStatisticsView
)

urlpatterns = [
    # Создание и список платежей
    # POST /api/payments/ - создание платежа
    # GET /api/payments/ - список платежей пользователя
    path('', PaymentListView.as_view(), name='payment-list'),
    path('create/', PaymentCreateView.as_view(), name='payment-create'),

    # Детали платежа
    # GET /api/payments/{id}/
    path('<str:payment_id>/', PaymentDetailView.as_view(), name='payment-detail'),

    # Действия с платежом
    # POST /api/payments/{id}/confirm/ - подтверждение платежа
    path('<str:payment_id>/confirm/', PaymentConfirmView.as_view(), name='payment-confirm'),

    # POST /api/payments/{id}/cancel/ - отмена платежа
    path('<str:payment_id>/cancel/', PaymentCancelView.as_view(), name='payment-cancel'),

    # Статистика платежей
    # GET /api/payments/statistics/
    path('statistics/', PaymentStatisticsView.as_view(), name='payment-statistics'),
]
