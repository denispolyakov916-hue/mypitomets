"""
URL маршруты для эндпоинтов магазина.

Эндпоинты:
    GET  /api/shop/products/        - Каталог товаров с фильтрами
    GET  /api/shop/products/{id}/   - Детали товара
    GET  /api/shop/cart/            - Просмотр корзины
    POST /api/shop/cart/            - Добавление в корзину
    PUT  /api/shop/cart/item/       - Обновление элемента корзины
    DELETE /api/shop/cart/item/     - Удаление из корзины
    POST /api/shop/orders/          - Оформление заказа
    GET  /api/shop/orders/history/  - История заказов

Все пути имеют префикс /api/shop/ в главном urls.py
"""

from django.urls import path
from .views import (
    ProductListView,
    ProductDetailView,
    CartView,
    CartItemView,
    OrderCreateView,
    OrderHistoryView
)

urlpatterns = [
    # Каталог товаров
    # GET /api/shop/products/?pet_type=dog&product_type=dry_food
    path('products/', ProductListView.as_view(), name='product-list'),
    
    # Конкретный товар
    # GET /api/shop/products/{id}/
    path('products/<int:product_id>/', ProductDetailView.as_view(), name='product-detail'),
    
    # Операции с корзиной
    # GET, POST /api/shop/cart/
    path('cart/', CartView.as_view(), name='cart'),
    
    # Операции с элементами корзины
    # PUT, DELETE /api/shop/cart/item/
    path('cart/item/', CartItemView.as_view(), name='cart-item'),
    
    # Операции с заказами
    # POST /api/shop/orders/ - оформление заказа
    path('orders/', OrderCreateView.as_view(), name='order-create'),
    
    # GET /api/shop/orders/history/ - история заказов
    path('orders/history/', OrderHistoryView.as_view(), name='order-history'),
]
