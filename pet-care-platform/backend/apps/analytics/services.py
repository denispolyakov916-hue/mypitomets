"""
Сервисы для работы с аналитикой и конструктором графиков.

Содержит бизнес-логику для обработки метрик, построения запросов и кэширования.
"""

import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict

from django.db import connection
from django.db.models import Count, Sum, Avg, Min, Max, Q
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth, TruncHour
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings

from .models import AnalyticMetric, ChartConfig, AnalyticsLog

logger = logging.getLogger(__name__)


class AnalyticsDataService:
    """
    Сервис для получения и обработки аналитических данных.

    Обрабатывает запросы, кэширует результаты и форматирует данные для frontend.
    """

    def __init__(self):
        self.cache_timeout = getattr(settings, 'ANALYTICS_CACHE_TIMEOUT', 300)

    def get_chart_data(self, config: Dict, user=None) -> Dict[str, Any]:
        """
        Получить данные для графика на основе конфигурации.

        Args:
            config: Конфигурация графика
            user: Пользователь (для логирования)

        Returns:
            Dict с данными и метаданными
        """
        start_time = timezone.now()

        try:
            # Создать ключ кэша
            cache_key = self._generate_cache_key(config)

            # Проверить кэш
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info(f"Cache hit for key: {cache_key}")
                return {
                    **cached_data,
                    'cache_hit': True,
                    'execution_time': (timezone.now() - start_time).total_seconds()
                }

            # Получить метрики для запроса
            metrics = config.get('metrics', [])
            if not metrics:
                return {'data': [], 'metadata': {'error': 'No metrics specified'}}

            # Определить измерение (ось X)
            dimension = config.get('dimension', 'date')
            time_range = config.get('timeRange', '30d')
            group_by = config.get('groupBy', 'day')
            
            # Временные измерения
            time_dimensions = ['date', 'week', 'month', 'hour', 'day']
            is_time_based = dimension in time_dimensions
            
            # Вычислить даты (только для временных измерений)
            end_date = timezone.now()
            if time_range == '7d':
                start_date = end_date - timedelta(days=7)
            elif time_range == '30d':
                start_date = end_date - timedelta(days=30)
            elif time_range == '90d':
                start_date = end_date - timedelta(days=90)
            elif time_range == '1y':
                start_date = end_date - timedelta(days=365)
            else:
                start_date = end_date - timedelta(days=30)

            # Получить данные в зависимости от измерения
            if is_time_based:
                data = self._fetch_metrics_data(metrics, start_date, end_date, group_by)
            else:
                data = self._fetch_dimension_data(metrics, dimension, start_date, end_date)

            # Подготовить метаданные
            execution_time = (timezone.now() - start_time).total_seconds()
            metadata = {
                'total_rows': len(data),
                'execution_time': execution_time,
                'cache_hit': False,
                'dimension': dimension,
                'time_range': time_range,
                'group_by': group_by,
                'metrics': metrics,
            }

            result = {
                'data': data,
                'metadata': metadata
            }

            # Кэшировать результат
            cache.set(cache_key, result, self.cache_timeout)

            # Логировать запрос (только для аутентифицированных пользователей)
            if user and user.is_authenticated:
                AnalyticsLog.objects.create(
                    user=user,
                    action='create_chart',
                    resource_type='chart_data',
                    execution_time=metadata['execution_time'],
                    data_points=len(data),
                    metadata={
                        'config': config,
                        'cache_hit': False
                    }
                )

            return result

        except Exception as e:
            logger.error(f"Error getting chart data: {e}")
            
            # Логировать ошибку (только для аутентифицированных пользователей)
            if user and user.is_authenticated:
                AnalyticsLog.objects.create(
                    user=user,
                    action='create_chart',
                    resource_type='chart_data',
                    success=False,
                    error_message=str(e),
                    execution_time=(timezone.now() - start_time).total_seconds()
                )
            
            return {
                'data': [],
                'metadata': {'error': str(e)}
            }

    def _fetch_metrics_data(self, metrics: List[str], start_date, end_date, group_by: str) -> List[Dict]:
        """
        Получить данные для метрик из базы данных.
        """
        from apps.users.models import User
        from apps.pets.models import Pet
        from apps.shop.models import Order, Product
        
        # Определить функцию группировки
        trunc_func = {
            'hour': TruncHour,
            'day': TruncDate,
            'week': TruncWeek,
            'month': TruncMonth,
        }.get(group_by, TruncDate)

        # Сгенерировать даты для заполнения пробелов
        date_range = self._generate_date_range(start_date, end_date, group_by)
        
        # Инициализировать результат с нулями
        result_map = {d: {'date': d} for d in date_range}

        # Получить данные для каждой метрики
        for metric_id in metrics:
            metric_data = self._get_metric_data(metric_id, start_date, end_date, trunc_func)
            
            for item in metric_data:
                date_key = item['date']
                if date_key in result_map:
                    result_map[date_key][metric_id] = item['value']
            
            # Заполнить нулями отсутствующие даты
            for date_key in result_map:
                if metric_id not in result_map[date_key]:
                    result_map[date_key][metric_id] = 0

        # Преобразовать в список
        return sorted(result_map.values(), key=lambda x: x['date'])

    def _get_metric_data(self, metric_id: str, start_date, end_date, trunc_func) -> List[Dict]:
        """
        Получить данные для конкретной метрики.
        """
        from apps.users.models import User
        from apps.pets.models import Pet
        from apps.shop.models import Order, Product
        from apps.training.models import UserCourse
        
        result = []

        try:
            if metric_id in ['users_total', 'users_new']:
                queryset = User.objects.filter(
                    created_at__gte=start_date,
                    created_at__lte=end_date
                ).annotate(
                    date=trunc_func('created_at')
                ).values('date').annotate(
                    value=Count('id')
                ).order_by('date')
                
                for item in queryset:
                    result.append({
                        'date': item['date'].strftime('%Y-%m-%d') if item['date'] else None,
                        'value': item['value']
                    })

            elif metric_id == 'users_active':
                queryset = User.objects.filter(
                    last_login__gte=start_date,
                    last_login__lte=end_date
                ).annotate(
                    date=trunc_func('last_login')
                ).values('date').annotate(
                    value=Count('id')
                ).order_by('date')
                
                for item in queryset:
                    if item['date']:
                        result.append({
                            'date': item['date'].strftime('%Y-%m-%d'),
                            'value': item['value']
                        })

            elif metric_id in ['pets_total', 'pets_dogs', 'pets_cats']:
                base_qs = Pet.objects.filter(
                    created_at__gte=start_date,
                    created_at__lte=end_date
                )
                
                if metric_id == 'pets_dogs':
                    base_qs = base_qs.filter(species='dog')
                elif metric_id == 'pets_cats':
                    base_qs = base_qs.filter(species='cat')
                
                queryset = base_qs.annotate(
                    date=trunc_func('created_at')
                ).values('date').annotate(
                    value=Count('id')
                ).order_by('date')
                
                for item in queryset:
                    result.append({
                        'date': item['date'].strftime('%Y-%m-%d') if item['date'] else None,
                        'value': item['value']
                    })

            elif metric_id in ['orders_total', 'orders_revenue', 'orders_avg_check']:
                queryset = Order.objects.filter(
                    created_at__gte=start_date,
                    created_at__lte=end_date
                ).annotate(
                    date=trunc_func('created_at')
                ).values('date')
                
                if metric_id == 'orders_total':
                    queryset = queryset.annotate(value=Count('id'))
                elif metric_id == 'orders_revenue':
                    queryset = queryset.annotate(value=Sum('total_amount'))
                elif metric_id == 'orders_avg_check':
                    queryset = queryset.annotate(value=Avg('total_amount'))
                
                queryset = queryset.order_by('date')
                
                for item in queryset:
                    result.append({
                        'date': item['date'].strftime('%Y-%m-%d') if item['date'] else None,
                        'value': float(item['value']) if item['value'] else 0
                    })

            elif metric_id in ['products_total', 'products_in_stock']:
                # Для товаров возвращаем кумулятивное значение на каждую дату
                if metric_id == 'products_total':
                    total = Product.objects.count()
                else:
                    total = Product.objects.filter(in_stock=True).count()
                
                # Генерируем данные для каждой даты с небольшими вариациями
                from apps.analytics.services import AnalyticsDataService
                date_range = self._generate_date_range(start_date, end_date, 'day')
                
                for date_str in date_range:
                    result.append({
                        'date': date_str,
                        'value': total
                    })

            elif metric_id in ['courses_total', 'courses_enrollments']:
                try:
                    from apps.training.models import Course
                    
                    if metric_id == 'courses_enrollments':
                        # Используем purchased_at вместо started_at
                        queryset = UserCourse.objects.filter(
                            purchased_at__gte=start_date,
                            purchased_at__lte=end_date
                        ).annotate(
                            date=trunc_func('purchased_at')
                        ).values('date').annotate(
                            value=Count('id')
                        ).order_by('date')
                        
                        for item in queryset:
                            if item['date']:
                                result.append({
                                    'date': item['date'].strftime('%Y-%m-%d'),
                                    'value': item['value']
                                })
                    elif metric_id == 'courses_total':
                        # Общее количество активных курсов
                        total_courses = Course.objects.filter(is_active=True).count()
                        date_range = self._generate_date_range(start_date, end_date, 'day')
                        for date_str in date_range:
                            result.append({
                                'date': date_str,
                                'value': total_courses
                            })
                except Exception as e:
                    logger.warning(f"Could not fetch course data: {e}")

        except Exception as e:
            logger.error(f"Error fetching metric {metric_id}: {e}")
            
        return result

    def _generate_date_range(self, start_date, end_date, group_by: str) -> List[str]:
        """
        Генерировать список дат для заполнения пробелов.
        """
        dates = []
        current = start_date.date() if hasattr(start_date, 'date') else start_date
        end = end_date.date() if hasattr(end_date, 'date') else end_date
        
        while current <= end:
            dates.append(current.strftime('%Y-%m-%d'))
            if group_by == 'week':
                current += timedelta(days=7)
            elif group_by == 'month':
                # Приблизительно месяц
                current += timedelta(days=30)
            else:
                current += timedelta(days=1)
        
        return dates

    def _fetch_dimension_data(self, metrics: List[str], dimension: str, start_date, end_date) -> List[Dict]:
        """
        Получить данные для метрик, сгруппированные по не-временному измерению.
        
        Args:
            metrics: Список метрик
            dimension: Измерение для группировки (pet_species, product_category и т.д.)
            start_date: Начальная дата
            end_date: Конечная дата
        """
        from apps.users.models import User
        from apps.pets.models import Pet
        from apps.shop.models import Order, Product, Category
        
        result = []
        
        try:
            if dimension == 'pet_species':
                # Группировка по видам питомцев
                species_choices = ['dog', 'cat', 'bird', 'fish', 'rodent', 'other']
                species_labels = {
                    'dog': 'Собаки',
                    'cat': 'Кошки', 
                    'bird': 'Птицы',
                    'fish': 'Рыбки',
                    'rodent': 'Грызуны',
                    'other': 'Другие'
                }
                
                for species in species_choices:
                    row = {'label': species_labels.get(species, species), 'dimension': species}
                    
                    for metric_id in metrics:
                        if metric_id in ['pets_total', 'pets_dogs', 'pets_cats']:
                            count = Pet.objects.filter(
                                species=species,
                                created_at__gte=start_date,
                                created_at__lte=end_date
                            ).count()
                            row[metric_id] = count
                        elif metric_id == 'users_total':
                            # Пользователи с таким видом питомца
                            count = User.objects.filter(
                                pets__species=species,
                                created_at__gte=start_date,
                                created_at__lte=end_date
                            ).distinct().count()
                            row[metric_id] = count
                    
                    if any(row.get(m, 0) > 0 for m in metrics):
                        result.append(row)
                        
            elif dimension == 'product_category':
                # Группировка по категориям товаров
                categories = Category.objects.all()[:20]  # Лимит 20 категорий
                
                for category in categories:
                    row = {'label': category.name, 'dimension': str(category.id)}
                    
                    for metric_id in metrics:
                        if metric_id == 'products_total':
                            count = Product.objects.filter(category=category).count()
                            row[metric_id] = count
                        elif metric_id == 'products_in_stock':
                            count = Product.objects.filter(category=category, in_stock=True).count()
                            row[metric_id] = count
                        elif metric_id == 'orders_revenue':
                            from django.db.models import Sum
                            revenue = Order.objects.filter(
                                items__product__category=category,
                                created_at__gte=start_date,
                                created_at__lte=end_date
                            ).aggregate(total=Sum('total_amount'))['total'] or 0
                            row[metric_id] = float(revenue)
                        elif metric_id == 'orders_total':
                            count = Order.objects.filter(
                                items__product__category=category,
                                created_at__gte=start_date,
                                created_at__lte=end_date
                            ).distinct().count()
                            row[metric_id] = count
                    
                    if any(row.get(m, 0) > 0 for m in metrics):
                        result.append(row)

            elif dimension == 'order_status':
                # Группировка по статусам заказов
                status_choices = [
                    ('pending', 'Ожидает'),
                    ('processing', 'Обработка'),
                    ('shipped', 'Отправлен'),
                    ('delivered', 'Доставлен'),
                    ('cancelled', 'Отменён'),
                ]
                
                for status, label in status_choices:
                    row = {'label': label, 'dimension': status}
                    
                    for metric_id in metrics:
                        if metric_id == 'orders_total':
                            count = Order.objects.filter(
                                status=status,
                                created_at__gte=start_date,
                                created_at__lte=end_date
                            ).count()
                            row[metric_id] = count
                        elif metric_id == 'orders_revenue':
                            from django.db.models import Sum
                            revenue = Order.objects.filter(
                                status=status,
                                created_at__gte=start_date,
                                created_at__lte=end_date
                            ).aggregate(total=Sum('total_amount'))['total'] or 0
                            row[metric_id] = float(revenue)
                    
                    if any(row.get(m, 0) > 0 for m in metrics):
                        result.append(row)

            elif dimension == 'pet_age_group':
                # Группировка по возрастным группам питомцев
                from datetime import date
                today = date.today()
                
                age_groups = [
                    ('puppy', 'Щенки/Котята (до 1 года)', 0, 1),
                    ('young', 'Молодые (1-3 года)', 1, 3),
                    ('adult', 'Взрослые (3-8 лет)', 3, 8),
                    ('senior', 'Пожилые (8+ лет)', 8, 100),
                ]
                
                for group_id, label, min_age, max_age in age_groups:
                    row = {'label': label, 'dimension': group_id}
                    
                    # Примерный расчёт по дате рождения
                    max_birth = today.replace(year=today.year - min_age)
                    min_birth = today.replace(year=today.year - max_age)
                    
                    for metric_id in metrics:
                        if metric_id in ['pets_total', 'pets_dogs', 'pets_cats']:
                            qs = Pet.objects.filter(
                                birth_date__lte=max_birth,
                                birth_date__gte=min_birth
                            )
                            if metric_id == 'pets_dogs':
                                qs = qs.filter(species='dog')
                            elif metric_id == 'pets_cats':
                                qs = qs.filter(species='cat')
                            row[metric_id] = qs.count()
                    
                    if any(row.get(m, 0) > 0 for m in metrics):
                        result.append(row)

            elif dimension == 'user_city':
                # Группировка по городам пользователей
                cities = User.objects.filter(
                    city__isnull=False
                ).values_list('city', flat=True).distinct()[:15]
                
                for city in cities:
                    if not city:
                        continue
                    row = {'label': city, 'dimension': city}
                    
                    for metric_id in metrics:
                        if metric_id in ['users_total', 'users_new', 'users_active']:
                            count = User.objects.filter(
                                city=city,
                                created_at__gte=start_date,
                                created_at__lte=end_date
                            ).count()
                            row[metric_id] = count
                        elif metric_id == 'orders_total':
                            count = Order.objects.filter(
                                user__city=city,
                                created_at__gte=start_date,
                                created_at__lte=end_date
                            ).count()
                            row[metric_id] = count
                    
                    if any(row.get(m, 0) > 0 for m in metrics):
                        result.append(row)

            else:
                # Неизвестное измерение - возвращаем пустой результат
                logger.warning(f"Unknown dimension: {dimension}")
                
        except Exception as e:
            logger.error(f"Error fetching dimension data for {dimension}: {e}")
        
        return result

    def _generate_cache_key(self, config: Dict) -> str:
        """Сгенерировать ключ кэша для конфигурации."""
        config_str = json.dumps(config, sort_keys=True, default=str)
        import hashlib
        config_hash = hashlib.md5(config_str.encode()).hexdigest()
        return f"analytics_chart_data:{config_hash}"

    def get_available_metrics(self, category: Optional[str] = None) -> List[Dict]:
        """
        Получить список доступных метрик.
        """
        cache_key = f"analytics_metrics:{category or 'all'}"

        cached_metrics = cache.get(cache_key)
        if cached_metrics:
            return cached_metrics

        queryset = AnalyticMetric.objects.filter(is_active=True)
        if category:
            queryset = queryset.filter(category=category)

        metrics = list(queryset.values(
            'id', 'name', 'description', 'category', 'subcategory',
            'data_type', 'units', 'available_aggregations'
        ))

        cache.set(cache_key, metrics, 3600)
        return metrics

    def validate_chart_config(self, config: Dict, user) -> Dict:
        """
        Валидировать конфигурацию графика.
        """
        from django.core.exceptions import ValidationError

        # Конфигурация может содержать metrics как список строк
        if not config.get('metrics'):
            raise ValidationError("График должен содержать хотя бы одну метрику")

        # Проверка лимитов
        data_limit = config.get('limit', 10000)
        if data_limit > 50000:
            raise ValidationError("Превышен лимит данных (максимум 50000)")

        return config


class ChartConfigService:
    """
    Сервис для управления конфигурациями графиков.
    """

    def save_chart_config(self, config_data: Dict, user) -> ChartConfig:
        """Сохранить конфигурацию графика."""
        config_data['created_by'] = user
        chart_config = ChartConfig.objects.create(**config_data)

        AnalyticsLog.objects.create(
            user=user,
            action='save_config',
            resource_type='chart_config',
            resource_id=str(chart_config.id),
            metadata={'config_name': chart_config.name}
        )

        return chart_config

    def get_user_templates(self, user, category: Optional[str] = None) -> List[ChartConfig]:
        """Получить шаблоны графиков пользователя."""
        queryset = ChartConfig.objects.filter(
            Q(created_by=user) | Q(is_public=True),
            is_template=True
        )

        if category:
            queryset = queryset.filter(category=category)

        return list(queryset.order_by('-usage_count', '-updated_at'))

    def increment_usage(self, config_id: str) -> None:
        """Увеличить счетчик использования конфигурации."""
        try:
            config = ChartConfig.objects.get(id=config_id)
            config.increment_usage()
        except ChartConfig.DoesNotExist:
            logger.warning(f"Chart config {config_id} not found for usage increment")


class AnalyticsMetricsInitializer:
    """
    Сервис для инициализации стандартных метрик системы.
    """

    def initialize_base_metrics(self):
        """Инициализировать базовые метрики системы."""

        base_metrics = [
            # Метрики пользователей
            {
                'id': 'users_total',
                'name': 'Всего пользователей',
                'description': 'Количество зарегистрированных пользователей',
                'category': 'users',
                'table_name': 'users',
                'field_name': 'id',
                'data_type': 'integer',
                'available_aggregations': ['count'],
                'default_aggregation': 'count',
                'units': 'шт',
                'is_system': True,
            },
            {
                'id': 'users_new',
                'name': 'Новые пользователи',
                'description': 'Количество новых регистраций за период',
                'category': 'users',
                'table_name': 'users',
                'field_name': 'id',
                'data_type': 'integer',
                'available_aggregations': ['count'],
                'default_aggregation': 'count',
                'units': 'шт',
                'is_system': True,
            },
            {
                'id': 'users_active',
                'name': 'Активные пользователи',
                'description': 'Пользователи с активностью за период',
                'category': 'users',
                'table_name': 'users',
                'field_name': 'last_login',
                'data_type': 'datetime',
                'available_aggregations': ['count'],
                'default_aggregation': 'count',
                'units': 'шт',
                'is_system': True,
            },

            # Метрики питомцев
            {
                'id': 'pets_total',
                'name': 'Всего питомцев',
                'description': 'Количество зарегистрированных питомцев',
                'category': 'pets',
                'table_name': 'pets',
                'field_name': 'id',
                'data_type': 'integer',
                'available_aggregations': ['count'],
                'default_aggregation': 'count',
                'units': 'шт',
                'is_system': True,
            },
            {
                'id': 'pets_dogs',
                'name': 'Собаки',
                'description': 'Количество зарегистрированных собак',
                'category': 'pets',
                'table_name': 'pets',
                'field_name': 'id',
                'data_type': 'integer',
                'available_aggregations': ['count'],
                'default_aggregation': 'count',
                'units': 'шт',
                'is_system': True,
            },
            {
                'id': 'pets_cats',
                'name': 'Кошки',
                'description': 'Количество зарегистрированных кошек',
                'category': 'pets',
                'table_name': 'pets',
                'field_name': 'id',
                'data_type': 'integer',
                'available_aggregations': ['count'],
                'default_aggregation': 'count',
                'units': 'шт',
                'is_system': True,
            },

            # Метрики заказов
            {
                'id': 'orders_total',
                'name': 'Всего заказов',
                'description': 'Количество заказов за период',
                'category': 'orders',
                'table_name': 'shop_order',
                'field_name': 'id',
                'data_type': 'integer',
                'available_aggregations': ['count'],
                'default_aggregation': 'count',
                'units': 'шт',
                'is_system': True,
            },
            {
                'id': 'orders_revenue',
                'name': 'Выручка',
                'description': 'Сумма выручки от заказов',
                'category': 'orders',
                'table_name': 'shop_order',
                'field_name': 'total_amount',
                'data_type': 'decimal',
                'available_aggregations': ['sum', 'avg', 'count'],
                'default_aggregation': 'sum',
                'units': '₽',
                'is_system': True,
            },
            {
                'id': 'orders_avg_check',
                'name': 'Средний чек',
                'description': 'Средняя сумма заказа',
                'category': 'orders',
                'table_name': 'shop_order',
                'field_name': 'total_amount',
                'data_type': 'decimal',
                'available_aggregations': ['avg'],
                'default_aggregation': 'avg',
                'units': '₽',
                'is_system': True,
            },

            # Метрики товаров
            {
                'id': 'products_total',
                'name': 'Всего товаров',
                'description': 'Общее количество товаров в каталоге',
                'category': 'products',
                'table_name': 'products',
                'field_name': 'id',
                'data_type': 'integer',
                'available_aggregations': ['count'],
                'default_aggregation': 'count',
                'units': 'шт',
                'is_system': True,
            },
            {
                'id': 'products_in_stock',
                'name': 'В наличии',
                'description': 'Количество товаров в наличии',
                'category': 'products',
                'table_name': 'products',
                'field_name': 'id',
                'data_type': 'integer',
                'available_aggregations': ['count'],
                'default_aggregation': 'count',
                'units': 'шт',
                'is_system': True,
            },

            # Метрики курсов
            {
                'id': 'courses_total',
                'name': 'Всего курсов',
                'description': 'Количество доступных курсов',
                'category': 'courses',
                'table_name': 'training_course',
                'field_name': 'id',
                'data_type': 'integer',
                'available_aggregations': ['count'],
                'default_aggregation': 'count',
                'units': 'шт',
                'is_system': True,
            },
            {
                'id': 'courses_enrollments',
                'name': 'Записей на курсы',
                'description': 'Количество записей на курсы',
                'category': 'courses',
                'table_name': 'training_usercourse',
                'field_name': 'id',
                'data_type': 'integer',
                'available_aggregations': ['count'],
                'default_aggregation': 'count',
                'units': 'шт',
                'is_system': True,
            },
        ]

        for metric_data in base_metrics:
            AnalyticMetric.objects.update_or_create(
                id=metric_data['id'],
                defaults=metric_data
            )

        logger.info(f"Initialized {len(base_metrics)} base metrics")


class AnalyticsQueryBuilder:
    """
    Сервис для построения SQL запросов на основе конфигурации графиков.
    """

    def __init__(self):
        self.supported_aggregations = {
            'count': 'COUNT',
            'sum': 'SUM',
            'avg': 'AVG',
            'min': 'MIN',
            'max': 'MAX',
            'distinct': 'COUNT(DISTINCT {})',
        }

    def build_query(self, config: Dict[str, Any]) -> str:
        """Построить SQL запрос на основе конфигурации графика."""
        # Упрощенная реализация - используем ORM вместо raw SQL
        return ""
