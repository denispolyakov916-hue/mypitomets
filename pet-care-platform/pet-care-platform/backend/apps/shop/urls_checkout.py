"""
URL маршруты для единого checkout.

Эндпоинты:
    GET  /api/checkout/ - получение данных для оформления
    POST /api/checkout/ - создание заказа и начало оплаты

Все пути имеют префикс /api/checkout/ в главном urls.py
"""

from django.urls import path
from .views import UnifiedCheckoutView

urlpatterns = [
    # Единый checkout
    # GET, POST /api/checkout/
    path('', UnifiedCheckoutView.as_view(), name='unified-checkout'),
]
