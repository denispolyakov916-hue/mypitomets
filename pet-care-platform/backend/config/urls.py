"""
Конфигурация URL для MVP Питомец+

Этот модуль определяет корневую маршрутизацию URL для всего приложения.
Все API эндпоинты имеют префикс /api/ для чёткого разделения от
любых потенциальных фронтенд маршрутов в будущем.

Структура URL:
    /api/auth/      - Эндпоинты аутентификации (регистрация, вход, обновление токена)
    /api/pets/      - Управление питомцами (CRUD операции)
    /api/shop/      - Магазин, корзина и управление заказами
    /api/courses/   - Образовательные курсы
    /api/payments/  - Единая система платежей
    /api/users/     - Профиль пользователя и история

Решение по архитектуре:
    Использование префикса 'api/' позволяет легко настроить
    reverse proxy и чётко разделить фронтенд и бэкенд.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Health check и мониторинг
from core.views import health_check, health_check_detailed, metrics

# =============================================================================
# URL МАРШРУТЫ
# =============================================================================

# from apps.shop.admin_views import admin_dashboard, recommendation_settings, pet_analytics, payment_analytics  # Временно отключено

urlpatterns = [
    # Кастомный дашборд администратора - временно отключен
    # path('admin/dashboard/', admin_dashboard, name='admin-dashboard'),
    # path('admin/recommendations/', recommendation_settings, name='admin-recommendations'),
    # path('admin/pet-analytics/', pet_analytics, name='admin-pet-analytics'),
    # path('admin/payment-analytics/', payment_analytics, name='admin-payment-analytics'),
    
    # Административный интерфейс Django (для разработки/отладки)
    path('admin/', admin.site.urls),
    
    # API маршруты - все эндпоинты бизнес-логики
    # Каждое приложение управляет своей маршрутизацией URL внутри себя
    
    # Эндпоинты аутентификации
    # Обрабатывает: регистрацию, вход, обновление токена, выход
    path('api/auth/', include('apps.users.urls')),
    
    # Эндпоинты профиля пользователя
    # Обрабатывает: данные профиля, историю заказов, приобретённые курсы
    path('api/users/', include('apps.users.profile_urls')),
    
    # Эндпоинты управления питомцами
    # Обрабатывает: CRUD для профилей питомцев, медицинские записи
    path('api/pets/', include('apps.pets.urls')),
    
    # Эндпоинты магазина
    # Обрабатывает: каталог товаров, управление корзиной, заказы
    path('api/shop/', include('apps.shop.urls')),
    
    # Эндпоинты курсов
    # Обрабатывает: каталог курсов, покупки, курсы пользователя
    path('api/courses/', include('apps.training.urls')),

    # Единая система платежей
    # Обрабатывает: создание, подтверждение и управление платежами для всех покупок
    path('api/payments/', include('apps.payments.urls')),

    # Единый checkout для товаров и курсов
    # Обрабатывает: резервирование, валидацию и создание заказов
    path('api/checkout/', include('apps.shop.urls_checkout')),

    # Эндпоинты отзывов и рейтингов
    # Обрабатывает: отзывы на товары и курсы, рейтинги
    path('api/reviews/', include('apps.reviews.urls')),

    # REST API для новой React админ-панели
    # Обрабатывает: аналитика, управление данными, CRUD операций
    # Доступ: только для пользователей с is_staff=True
    path('api/admin/', include('config.urls_admin')),
    
    # Health check и мониторинг
    # Health check доступен без аутентификации для использования в мониторинге
    path('api/health/', health_check, name='health-check'),
    path('api/health/detailed/', health_check_detailed, name='health-check-detailed'),
    path('api/metrics/', metrics, name='metrics'),
]

# Обслуживание медиа файлов в режиме разработки
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
