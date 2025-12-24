"""
Сервисы модуля магазина.

Содержит бизнес-логику для:
- Работы с заказами (OrderService)
- Работы с корзиной (CartService)
- Обработки резервирований (ReservationService)
- Рекомендаций товаров (RecommendationEngine)
"""

from .order_service import process_expired_orders, OrderService
from .cart_service import CartService, cart_service
from .reservation_service import ReservationService
from .recommendation_service import RecommendationEngine, recommendation_engine

__all__ = [
    'process_expired_orders',
    'OrderService',
    'CartService',
    'cart_service',
    'ReservationService',
    'RecommendationEngine',
    'recommendation_engine',
]
