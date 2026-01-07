"""
URL маршруты для приложения аналитики.

Определяет эндпоинты для работы с метриками, графиками и конструктором.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AnalyticMetricsViewSet,
    ChartConstructorViewSet,
    ChartConfigViewSet,
    ChartSessionViewSet,
    AnalyticsLogsViewSet,
    initialize_metrics,
    analytics_health_check,
    clear_analytics_cache,
)

# Создаем роутер для ViewSet'ов
router = DefaultRouter()

# Основные ViewSet'ы
router.register(r'metrics', AnalyticMetricsViewSet, basename='analytics-metrics')
router.register(r'configs', ChartConfigViewSet, basename='chart-configs')
router.register(r'sessions', ChartSessionViewSet, basename='chart-sessions')
router.register(r'logs', AnalyticsLogsViewSet, basename='analytics-logs')

# Конструктор графиков (отдельный ViewSet)
constructor_router = DefaultRouter()
constructor_router.register(r'constructor', ChartConstructorViewSet, basename='chart-constructor')

# URL паттерны
urlpatterns = [
    # REST API через роутеры
    path('', include(router.urls)),
    path('', include(constructor_router.urls)),

    # Служебные эндпоинты
    path('initialize-metrics/', initialize_metrics, name='initialize-metrics'),
    path('health-check/', analytics_health_check, name='analytics-health-check'),
    path('clear-cache/', clear_analytics_cache, name='clear-analytics-cache'),
]
