"""
API представления для аналитики и конструктора графиков.

Содержит эндпоинты для работы с метриками, данными графиков и конфигурациями.
"""

import logging
from typing import Dict, Any

from django.utils.decorators import method_decorator
from django.utils import timezone
from django.views.decorators.cache import cache_page
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework.pagination import PageNumberPagination

from .models import AnalyticMetric, ChartConfig, ChartSession, AnalyticsLog
from .serializers import (
    AnalyticMetricSerializer,
    ChartConfigSerializer,
    ChartConfigCreateSerializer,
    ChartSessionSerializer,
    AnalyticsLogSerializer,
    MetricListSerializer,
    ChartTemplateSerializer,
    ChartDataRequestSerializer,
    ChartExportSerializer,
)
from .services import AnalyticsDataService, ChartConfigService, AnalyticsMetricsInitializer

logger = logging.getLogger(__name__)


class StandardResultsSetPagination(PageNumberPagination):
    """Стандартная пагинация для API результатов."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class AnalyticMetricsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для работы с метриками аналитики.

    Предоставляет доступ к списку доступных метрик с фильтрацией и поиском.
    """

    # Временно отключаем аутентификацию для тестирования
    permission_classes = []  # [IsAdminUser]
    serializer_class = AnalyticMetricSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Получить queryset с фильтрами."""
        queryset = AnalyticMetric.objects.filter(is_active=True)

        # Фильтр по категории
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # Поиск по имени и описанию
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                name__icontains=search
            ) | queryset.filter(
                description__icontains=search
            )

        return queryset.order_by('category', 'name')

    def get_serializer_class(self):
        """Выбрать подходящий сериализатор."""
        if self.action == 'list':
            return MetricListSerializer
        return AnalyticMetricSerializer

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Получить список доступных категорий метрик."""
        categories = AnalyticMetric.objects.filter(
            is_active=True
        ).values_list('category', flat=True).distinct()

        # Получить количество метрик в каждой категории
        result = []
        for category in categories:
            count = AnalyticMetric.objects.filter(
                category=category, is_active=True
            ).count()
            result.append({
                'name': category,
                'count': count,
                'label': self._get_category_label(category)
            })

        return Response(result)

    def _get_category_label(self, category: str) -> str:
        """Получить человеко-понятное название категории."""
        labels = {
            'users': 'Пользователи',
            'pets': 'Питомцы',
            'orders': 'Заказы',
            'courses': 'Курсы',
            'payments': 'Платежи',
            'reviews': 'Отзывы',
        }
        return labels.get(category, category.capitalize())


class ChartConstructorViewSet(viewsets.ViewSet):
    """
    ViewSet для конструктора графиков.

    Основной API для создания и работы с графиками.
    """

    # Временно отключаем аутентификацию для тестирования
    permission_classes = []  # [IsAdminUser]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.data_service = AnalyticsDataService()
        self.config_service = ChartConfigService()

    @action(detail=False, methods=['post'])
    def data(self, request):
        """
        Получить данные для графика.

        POST /api/admin/analytics/constructor/data/
        """
        try:
            serializer = ChartDataRequestSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            config = serializer.validated_data['config']
            data_limit = serializer.validated_data['data_limit']

            # Валидировать конфигурацию
            config = self.data_service.validate_chart_config(config, request.user)

            # Установить лимит данных
            config['limit'] = data_limit

            # Получить данные
            result = self.data_service.get_chart_data(config, request.user)

            return Response(result)

        except Exception as e:
            logger.error(f"Error getting chart data: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """
        Получить доступные метрики для конструктора.

        GET /api/admin/analytics/constructor/metrics/
        """
        try:
            category = request.query_params.get('category')
            metrics = self.data_service.get_available_metrics(category)

            return Response({
                'metrics': metrics,
                'total': len(metrics)
            })

        except Exception as e:
            logger.error(f"Error getting metrics: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def templates(self, request):
        """
        Получить доступные шаблоны графиков.

        GET /api/admin/analytics/constructor/templates/
        """
        try:
            category = request.query_params.get('category')
            templates = self.config_service.get_user_templates(request.user, category)

            serializer = ChartTemplateSerializer(templates, many=True)
            return Response({
                'templates': serializer.data,
                'total': len(templates)
            })

        except Exception as e:
            logger.error(f"Error getting templates: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ChartConfigViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления конфигурациями графиков.

    CRUD операции с конфигурациями и шаблонами.
    """

    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Получить queryset с фильтрами."""
        queryset = ChartConfig.objects.filter(created_by=self.request.user)

        # Фильтр по шаблонам
        is_template = self.request.query_params.get('template')
        if is_template is not None:
            queryset = queryset.filter(is_template=is_template.lower() == 'true')

        # Фильтр по категории
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # Поиск по названию
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset.order_by('-updated_at')

    def get_serializer_class(self):
        """Выбрать подходящий сериализатор."""
        if self.action == 'create':
            return ChartConfigCreateSerializer
        return ChartConfigSerializer

    def perform_create(self, serializer):
        """Создать конфигурацию с установкой пользователя."""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Создать копию конфигурации.

        POST /api/admin/analytics/configs/{id}/duplicate/
        """
        try:
            original_config = self.get_object()

            # Создать копию
            new_config = ChartConfig.objects.create(
                name=f"{original_config.name} (копия)",
                description=original_config.description,
                chart_type=original_config.chart_type,
                canvas_config=original_config.canvas_config,
                x_axis_config=original_config.x_axis_config,
                y_axis_config=original_config.y_axis_config,
                data_layers=original_config.data_layers,
                filters_config=original_config.filters_config,
                segment_config=original_config.segment_config,
                style_config=original_config.style_config,
                legend_config=original_config.legend_config,
                interaction_config=original_config.interaction_config,
                is_template=False,  # Копии не являются шаблонами по умолчанию
                category=original_config.category,
                tags=original_config.tags,
                created_by=request.user
            )

            serializer = self.get_serializer(new_config)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error duplicating config: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def create_version(self, request, pk=None):
        """
        Создать новую версию конфигурации.

        POST /api/admin/analytics/configs/{id}/create_version/
        """
        try:
            config = self.get_object()
            new_version = config.create_version(request.user)

            serializer = self.get_serializer(new_version)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error creating version: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ChartSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления сессиями конструктора графиков.

    Автоматически управляет временем жизни сессий.
    """

    permission_classes = [IsAdminUser]
    serializer_class = ChartSessionSerializer

    def get_queryset(self):
        """Получить активные сессии пользователя."""
        return ChartSession.objects.filter(
            user=self.request.user,
            expires_at__gt=timezone.now()
        ).order_by('-last_activity_at')

    def perform_create(self, serializer):
        """Создать сессию с установкой пользователя."""
        serializer.save(user=self.request.user)


class AnalyticsLogsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для просмотра логов аналитики.

    Только чтение для аудита действий пользователей.
    """

    permission_classes = [IsAdminUser]
    serializer_class = AnalyticsLogSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Получить логи с фильтрами."""
        queryset = AnalyticsLog.objects.all()

        # Фильтр по пользователю
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Фильтр по действию
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)

        # Фильтр по дате
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(timestamp__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(timestamp__date__lte=date_to)

        return queryset.order_by('-timestamp')


# Служебные API функции

@api_view(['POST'])
@permission_classes([IsAdminUser])
def initialize_metrics(request):
    """
    Инициализировать базовые метрики системы.

    POST /api/admin/analytics/initialize-metrics/
    """
    try:
        initializer = AnalyticsMetricsInitializer()
        initializer.initialize_base_metrics()

        return Response({
            'message': 'Базовые метрики успешно инициализированы'
        })

    except Exception as e:
        logger.error(f"Error initializing metrics: {e}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def analytics_health_check(request):
    """
    Проверка здоровья системы аналитики.

    GET /api/admin/analytics/health-check/
    """
    try:
        # Проверить подключение к базе данных
        metrics_count = AnalyticMetric.objects.count()
        configs_count = ChartConfig.objects.count()

        # Проверить кэш
        cache.set('analytics_health_test', 'ok', 10)
        cache_value = cache.get('analytics_health_test')

        return Response({
            'status': 'healthy',
            'database': 'connected',
            'cache': 'working' if cache_value == 'ok' else 'failed',
            'metrics_count': metrics_count,
            'configs_count': configs_count,
            'timestamp': timezone.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return Response(
            {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def clear_analytics_cache(request):
    """
    Очистить кэш аналитики.

    POST /api/admin/analytics/clear-cache/
    """
    try:
        # Очистить кэш аналитики
        cache.delete_pattern('analytics:*')
        cache.delete_pattern('chart_data:*')
        cache.delete_pattern('chart_constructor:*')

        return Response({
            'message': 'Кэш аналитики успешно очищен'
        })

    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )