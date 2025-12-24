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
    GET  /api/shop/orders/history/  - История заказов (с пагинацией и фильтрацией по статусу)
    GET  /api/shop/orders/{id}/     - Детали одного заказа
    POST /api/shop/orders/{id}/confirm-payment/ - Подтверждение оплаты заказа

Все пути имеют префикс /api/shop/ в главном urls.py
"""

from django.urls import path
from .views import (
    ProductListView,
    ProductDetailView,
    CartView,
    CartItemView,
    CartRefreshView,
    OrderCheckoutView,
    OrderCreateView,
    OrderHistoryView,
    OrderDetailView,
    OrderConfirmPaymentView,
    AddressListView,
    AddressSearchView
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
    
    # Обновление корзины (для фронтенда)
    # GET /api/shop/cart/refresh/
    path('cart/refresh/', CartRefreshView.as_view(), name='cart-refresh'),
    
    # Операции с элементами корзины
    # PUT, DELETE /api/shop/cart/item/
    path('cart/item/', CartItemView.as_view(), name='cart-item'),
    
    # Страница оформления заказа
    # GET /api/shop/checkout/
    path('checkout/', OrderCheckoutView.as_view(), name='order-checkout'),
    
    # Операции с заказами
    # POST /api/shop/orders/ - оформление заказа
    path('orders/', OrderCreateView.as_view(), name='order-create'),
    
    # GET /api/shop/orders/history/ - история заказов
    path('orders/history/', OrderHistoryView.as_view(), name='order-history'),
    
    # POST /api/shop/orders/{order_id}/confirm-payment/ - подтверждение оплаты
    path('orders/<str:order_id>/confirm-payment/', OrderConfirmPaymentView.as_view(), name='order-confirm-payment'),
    
    # GET /api/shop/orders/{order_id}/ - детали заказа
    path('orders/<str:order_id>/', OrderDetailView.as_view(), name='order-detail'),
    
    # Адреса доставки
    # GET, POST /api/shop/addresses/ - список и создание адресов
    path('addresses/', AddressListView.as_view(), name='address-list'),
    
    # GET /api/shop/addresses/search/ - поиск адресов
    path('addresses/search/', AddressSearchView.as_view(), name='address-search'),
]
