"""
URL маршруты для эндпоинтов магазина.

Эндпоинты v1 (legacy):
    GET  /api/shop/products/        - Каталог товаров с фильтрами
    GET  /api/shop/products/{id}/   - Детали товара
    
Эндпоинты v2 (новая структура по database_tz.md):
    GET  /api/shop/v2/products/             - Каталог с новыми фильтрами
    GET  /api/shop/v2/products/{id}/        - Детали товара с SKU
    GET  /api/shop/v2/products/by-slug/{slug}/ - Товар по slug
    GET  /api/shop/categories/              - Список категорий
    GET  /api/shop/categories/{slug}/       - Детали категории
    GET  /api/shop/brands/                  - Список брендов
    GET  /api/shop/brands/{slug}/           - Детали бренда
    GET  /api/shop/products/{id}/breed-recommendations/ - Рекомендации для пород
    GET  /api/shop/breeds/{id}/products/    - Товары для породы

Эндпоинты корзины и заказов:
    GET  /api/shop/cart/            - Просмотр корзины
    POST /api/shop/cart/            - Добавление в корзину
    PUT  /api/shop/cart/item/       - Обновление элемента корзины
    DELETE /api/shop/cart/item/     - Удаление из корзины
    POST /api/shop/orders/          - Оформление заказа
    GET  /api/shop/orders/history/  - История заказов
    GET  /api/shop/orders/{id}/     - Детали заказа
    POST /api/shop/orders/{id}/confirm-payment/ - Подтверждение оплаты

Все пути имеют префикс /api/shop/ в главном urls.py
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    # Legacy views (v1)
    ProductListView,
    ProductDetailView,
    FrequentlyBoughtTogetherView,
    PersonalRecommendationsView,
    HealthFilteredProductsView,
    # New views (v2)
    CategoryListView,
    CategoryDetailView,
    BrandListView,
    BrandDetailView,
    ProductListViewV2,
    ProductDetailViewV2,
    ProductBreedRecommendationsView,
    ProductsForBreedView,
    # Cart & Orders
    CartView,
    CartItemView,
    CartRefreshView,
    CartRecommendationsView,
    OrderCheckoutView,
    OrderCreateView,
    OrderHistoryView,
    OrderDetailView,
    OrderConfirmPaymentView,
    OrderCancelView,
    AddressListView,
    AddressSearchView,
    ReturnCreateView,
    ReturnListView,
    ReturnDetailView,
    ShareableWishlistView,
    SharedWishlistByTokenView,
    # Analytics
    AnalyticMetricsViewSet,
    ChartConstructorViewSet,
    ChartConfigViewSet,
    ChartSessionViewSet,
    AnalyticsLogsViewSet,
    initialize_metrics,
    analytics_health_check,
    clear_analytics_cache
)

# Создаем роутер для ViewSet'ов аналитики
router = DefaultRouter()
router.register(r'metrics', AnalyticMetricsViewSet, basename='analytics-metrics')
router.register(r'configs', ChartConfigViewSet, basename='chart-configs')
router.register(r'sessions', ChartSessionViewSet, basename='chart-sessions')
router.register(r'logs', AnalyticsLogsViewSet, basename='analytics-logs')

# Конструктор графиков (отдельный ViewSet)
constructor_router = DefaultRouter()
constructor_router.register(r'constructor', ChartConstructorViewSet, basename='chart-constructor')

urlpatterns = [
    # ==========================================================================
    # LEGACY API (v1) - для обратной совместимости
    # ==========================================================================
    
    # Каталог товаров
    # GET /api/shop/products/?pet_type=dog&product_type=dry_food
    path('products/', ProductListView.as_view(), name='product-list'),
    
    # Конкретный товар
    # GET /api/shop/products/{id}/
    path('products/<int:product_id>/', ProductDetailView.as_view(), name='product-detail'),

    # Рекомендации "Часто покупают вместе"
    # GET /api/shop/products/{id}/frequently-bought/
    path('products/<int:product_id>/frequently-bought/', FrequentlyBoughtTogetherView.as_view(), name='frequently-bought-together'),
    
    # Рекомендации товара для пород
    # GET /api/shop/products/{id}/breed-recommendations/
    path('products/<int:product_id>/breed-recommendations/', ProductBreedRecommendationsView.as_view(), name='product-breed-recommendations'),

    # Персональные рекомендации
    # GET /api/shop/personal-recommendations/
    path('personal-recommendations/', PersonalRecommendationsView.as_view(), name='personal-recommendations'),

    # Фильтр товаров по проблемам здоровья
    # GET /api/shop/products/health-filter/?health_issue=overweight
    path('products/health-filter/', HealthFilteredProductsView.as_view(), name='health-filtered-products'),
    
    # ==========================================================================
    # NEW API (v2) - новая структура по database_tz.md
    # ==========================================================================
    
    # Категории
    # GET /api/shop/categories/
    path('categories/', CategoryListView.as_view(), name='category-list'),
    # GET /api/shop/categories/{slug}/
    path('categories/<slug:slug>/', CategoryDetailView.as_view(), name='category-detail'),
    
    # Бренды
    # GET /api/shop/brands/
    path('brands/', BrandListView.as_view(), name='brand-list'),
    # GET /api/shop/brands/{slug}/
    path('brands/<slug:slug>/', BrandDetailView.as_view(), name='brand-detail'),
    
    # Товары для породы
    # GET /api/shop/breeds/{breed_id}/products/
    path('breeds/<int:breed_id>/products/', ProductsForBreedView.as_view(), name='products-for-breed'),
    
    # V2 API с новой структурой
    path('v2/', include([
        # Каталог товаров v2
        # GET /api/shop/v2/products/
        path('products/', ProductListViewV2.as_view(), name='product-list-v2'),
        # GET /api/shop/v2/products/{id}/
        path('products/<int:product_id>/', ProductDetailViewV2.as_view(), name='product-detail-v2'),
        # GET /api/shop/v2/products/by-slug/{slug}/
        path('products/by-slug/<slug:slug>/', ProductDetailViewV2.as_view(), name='product-by-slug-v2'),
    ])),
    
    # ==========================================================================
    # CART & ORDERS
    # ==========================================================================
    
    # Операции с корзиной
    # GET, POST /api/shop/cart/
    path('cart/', CartView.as_view(), name='cart'),
    
    # Обновление корзины (для фронтенда)
    # GET /api/shop/cart/refresh/
    path('cart/refresh/', CartRefreshView.as_view(), name='cart-refresh'),
    
    # Рекомендации для корзины
    # GET /api/shop/cart/recommendations/
    path('cart/recommendations/', CartRecommendationsView.as_view(), name='cart-recommendations'),
    
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

    # POST /api/shop/orders/{order_id}/cancel/ - отмена заказа пользователем
    path('orders/<str:order_id>/cancel/', OrderCancelView.as_view(), name='order-cancel'),

    # GET /api/shop/orders/{order_id}/ - детали заказа
    path('orders/<str:order_id>/', OrderDetailView.as_view(), name='order-detail'),
    
    # Адреса доставки
    # GET, POST /api/shop/addresses/ - список и создание адресов
    path('addresses/', AddressListView.as_view(), name='address-list'),
    
    # GET /api/shop/addresses/search/ - поиск адресов
    path('addresses/search/', AddressSearchView.as_view(), name='address-search'),

    # Возвраты товаров
    # POST /api/shop/returns/ - создание возврата
    path('returns/', ReturnCreateView.as_view(), name='return-create'),

    # GET /api/shop/returns/ - список возвратов
    path('returns/list/', ReturnListView.as_view(), name='return-list'),

    # GET /api/shop/returns/{return_id}/ - детали возврата
    path('returns/<str:return_id>/', ReturnDetailView.as_view(), name='return-detail'),

    # Вишлист (подарочный список для шаринга)
    # GET, POST, DELETE /api/shop/wishlist/
    path('wishlist/', ShareableWishlistView.as_view(), name='shareable-wishlist'),
    # GET /api/shop/wishlist/shared/<token>/ — публичный просмотр по ссылке
    path('wishlist/shared/<str:token>/', SharedWishlistByTokenView.as_view(), name='shared-wishlist'),

    # Аналитика и конструктор графиков
    # GET /api/shop/analytics/metrics/ - метрики
    path('analytics/', include([
        # REST API через роутеры
        path('', include(router.urls)),
        path('', include(constructor_router.urls)),

        # Служебные эндпоинты
        path('initialize-metrics/', initialize_metrics, name='initialize-metrics'),
        path('health-check/', analytics_health_check, name='analytics-health-check'),
        path('clear-cache/', clear_analytics_cache, name='clear-analytics-cache'),
    ])),
]
