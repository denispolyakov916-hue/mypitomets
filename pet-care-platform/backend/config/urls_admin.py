"""
URL маршруты для REST API админ-панели Питомец+.

Предоставляет эндпоинты для нового React интерфейса админки.

Все эндпоинты защищены IsAdminUser permission (требуют is_staff=True).

Структура URL:
    /api/admin/management/    - Массовые операции и экспорт
    /api/admin/users/         - CRUD для пользователей
    /api/admin/pets/          - CRUD для питомцев
    /api/admin/products/      - CRUD для товаров
    /api/admin/orders/        - CRUD для заказов
    /api/admin/courses/       - CRUD для курсов
    /api/admin/stats/summary/ - Быстрая сводка статистики
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .admin_api import (
    AdminAnalyticsViewSet, 
    AdminManagementViewSet,
    AdminUserViewSet, 
    AdminPetViewSet, 
    AdminProductViewSet,
    AdminOrderViewSet, 
    AdminCourseViewSet,
    admin_stats_summary
)

# Создаем роутер для ViewSets
admin_router = DefaultRouter()

# Аналитические эндпоинты

# Управление данными (bulk операции, экспорт)
admin_router.register(r'management', AdminManagementViewSet, basename='admin-management')

# CRUD для моделей
admin_router.register(r'users', AdminUserViewSet, basename='admin-users')
admin_router.register(r'pets', AdminPetViewSet, basename='admin-pets')
admin_router.register(r'products', AdminProductViewSet, basename='admin-products')
admin_router.register(r'orders', AdminOrderViewSet, basename='admin-orders')
admin_router.register(r'courses', AdminCourseViewSet, basename='admin-courses')

# URL паттерны для admin API
urlpatterns = [
    # REST API для админки
    path('', include(admin_router.urls)),

    # Аналитика и конструктор графиков

    # Быстрая сводка статистики
    path('stats/summary/', admin_stats_summary, name='admin-stats-summary'),
]
