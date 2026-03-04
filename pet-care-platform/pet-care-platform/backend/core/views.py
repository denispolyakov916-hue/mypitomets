"""
Общие views для health checks и мониторинга.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from .health import HealthCheck, MetricsCollector


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint для проверки состояния системы.
    
    GET /api/health/
    
    Доступен без аутентификации для использования в мониторинге.
    """
    health_status = HealthCheck.full_check()
    
    http_status = status.HTTP_200_OK
    if health_status['status'] == 'unhealthy':
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE
    elif health_status['status'] == 'warning':
        http_status = status.HTTP_200_OK  # Warning не является ошибкой
    
    return Response(health_status, status=http_status)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def health_check_detailed(request):
    """
    Детальный health check с дополнительной информацией.
    
    GET /api/health/detailed/
    
    Требует аутентификации администратора.
    """
    health_status = HealthCheck.full_check()
    
    # Добавляем дополнительную информацию
    health_status['detailed'] = True
    health_status['metrics'] = MetricsCollector.get_all_metrics()
    
    http_status = status.HTTP_200_OK
    if health_status['status'] == 'unhealthy':
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE
    
    return Response(health_status, status=http_status)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def metrics(request):
    """
    Endpoint для получения метрик производительности.
    
    GET /api/metrics/
    
    Требует аутентификации администратора.
    """
    metrics_data = MetricsCollector.get_all_metrics()
    return Response(metrics_data, status=status.HTTP_200_OK)

