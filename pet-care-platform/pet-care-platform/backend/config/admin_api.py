"""
REST API для админ-панели Питомец+.

Предоставляет эндпоинты для аналитики, управления данными
и интеграции с новым React интерфейсом админки.
"""

import io
import csv
import json
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum, Avg, Q, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.http import HttpResponse

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, BasePermission
from rest_framework.pagination import PageNumberPagination

# Импорт моделей
from apps.users.models import User
from apps.pets.models import Pet
from apps.shop.models import Product, Order, OrderItem
from apps.training.models import Course, UserCourse, UserCourseProgress
from apps.payments.models import Payment
from apps.reviews.models import Review

# Импорт системы кэширования
from .admin_cache import (
    DashboardCacheMixin,
    cached_dashboard_overview,
    cached_charts_data,
    cached_top_products,
    cached_recent_orders,
    cached_stats_summary
)


class AdminAnalyticsViewSet(viewsets.ViewSet, DashboardCacheMixin):
    """ViewSet для аналитических данных админки."""

    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    @cached_dashboard_overview
    def dashboard_overview(self, request):
        """Обзорная аналитика для главного дашборда."""
        today = timezone.now()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        # Базовые метрики пользователей
        total_users = User.objects.count()
        active_users = User.objects.filter(last_login__gte=week_ago).count()
        new_users_week = User.objects.filter(created_at__gte=week_ago).count()

        # Метрики питомцев
        total_pets = Pet.objects.count()
        pets_with_health_issues = Pet.objects.exclude(health_issues=[]).count()
        new_pets_week = Pet.objects.filter(created_at__gte=week_ago).count()

        # Метрики товаров
        total_products = Product.objects.count()
        active_products = Product.objects.filter(is_available=True).count()
        low_stock_products = Product.objects.filter(
            is_available=True, sku_count__lte=1
        ).count()

        # Метрики курсов
        total_courses = Course.objects.count()
        active_courses = Course.objects.filter(is_active=True).count()

        # Метрики заказов
        orders_week = Order.objects.filter(created_at__gte=week_ago)
        orders_week_count = orders_week.count()
        orders_week_revenue = orders_week.filter(
            status__in=['processing', 'shipped', 'delivered']
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')

        orders_month = Order.objects.filter(created_at__gte=month_ago)
        orders_month_count = orders_month.count()
        orders_month_revenue = orders_month.filter(
            status__in=['processing', 'shipped', 'delivered']
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')

        # Средний чек
        avg_order_value = Order.objects.filter(
            status__in=['processing', 'shipped', 'delivered']
        ).aggregate(avg=Avg('total_amount'))['avg'] or Decimal('0')

        # Метрики платежей
        total_payments = Payment.objects.count()
        successful_payments = Payment.objects.filter(status='completed').count()
        payments_week_revenue = Payment.objects.filter(
            status='completed', created_at__gte=week_ago
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Метрики отзывов
        total_reviews = Review.objects.count()
        pending_reviews = Review.objects.filter(is_approved=False).count()
        avg_rating = Review.objects.filter(is_approved=True).aggregate(
            avg=Avg('rating')
        )['avg'] or 0

        # Метрики календаря (временно отключены)
        total_events = 0
        upcoming_events = 0

        # Тренды (сравнение с предыдущим периодом)
        prev_week_start = week_ago - timedelta(days=7)
        prev_week_orders = Order.objects.filter(
            created_at__gte=prev_week_start, created_at__lt=week_ago
        ).count()
        orders_trend = ((orders_week_count - prev_week_orders) / max(prev_week_orders, 1)) * 100

        return Response({
            'overview': {
                'users': {
                    'total': total_users,
                    'active': active_users,
                    'new_week': new_users_week,
                },
                'pets': {
                    'total': total_pets,
                    'with_health_issues': pets_with_health_issues,
                    'new_week': new_pets_week,
                },
                'products': {
                    'total': total_products,
                    'active': active_products,
                    'low_stock': low_stock_products,
                },
                'courses': {
                    'total': total_courses,
                    'active': active_courses,
                },
                'orders': {
                    'week_count': orders_week_count,
                    'week_revenue': float(orders_week_revenue),
                    'month_count': orders_month_count,
                    'month_revenue': float(orders_month_revenue),
                    'avg_value': float(avg_order_value),
                    'trend': float(orders_trend),
                },
                'payments': {
                    'total': total_payments,
                    'successful': successful_payments,
                    'week_revenue': float(payments_week_revenue),
                },
                'reviews': {
                    'total': total_reviews,
                    'pending': pending_reviews,
                    'avg_rating': float(avg_rating),
                },
                'events': {
                    'total': total_events,
                    'upcoming': upcoming_events,
                }
            }
        })

    @action(detail=False, methods=['get'])
    @cached_charts_data
    def charts_data(self, request):
        """Данные для графиков аналитики."""
        period = request.query_params.get('period', '30')
        try:
            days = int(period)
        except ValueError:
            days = 30

        start_date = timezone.now() - timedelta(days=days)

        # График заказов по дням
        orders_by_day = Order.objects.filter(
            created_at__gte=start_date
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id'),
            revenue=Sum('total_amount')
        ).order_by('date')

        # График платежей по дням
        payments_by_day = Payment.objects.filter(
            created_at__gte=start_date,
            status='completed'
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            revenue=Sum('amount'),
            count=Count('id')
        ).order_by('date')

        # Распределение питомцев по видам
        pets_by_species = Pet.objects.values('species').annotate(
            count=Count('id')
        ).order_by('-count')

        # Распределение заказов по статусам
        orders_by_status = Order.objects.values('status').annotate(
            count=Count('id')
        ).order_by('-count')

        return Response({
            'orders_by_day': list(orders_by_day),
            'payments_by_day': list(payments_by_day),
            'pets_by_species': list(pets_by_species),
            'orders_by_status': list(orders_by_status),
        })

    @action(detail=False, methods=['get'])
    def sales_trends(self, request):
        """Тренды продаж по периодам для графиков"""
        period = request.query_params.get('period', '30d')
        days = self._parse_period(period)

        # Получаем данные продаж
        sales_data = Payment.objects.filter(
            status='completed',
            created_at__gte=timezone.now() - timedelta(days=days)
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('date')

        # Форматируем данные для графика
        dates = []
        totals = []
        counts = []

        for i in range(days):
            date = (timezone.now() - timedelta(days=days-i-1)).date()
            dates.append(date.strftime('%d.%m'))

            day_data = next((item for item in sales_data if item['date'] == date), None)
            totals.append(float(day_data['total']) if day_data else 0)
            counts.append(day_data['count'] if day_data else 0)

        return Response({
            'labels': dates,
            'datasets': [
                {
                    'label': 'Продажи (₽)',
                    'data': totals,
                    'borderColor': 'rgb(59, 130, 246)',
                    'backgroundColor': 'rgba(59, 130, 246, 0.5)',
                    'yAxisID': 'y'
                },
                {
                    'label': 'Количество заказов',
                    'data': counts,
                    'borderColor': 'rgb(16, 185, 129)',
                    'backgroundColor': 'rgba(16, 185, 129, 0.1)',
                    'yAxisID': 'y1',
                    'type': 'line'
                }
            ]
        })

    @action(detail=False, methods=['get'])
    def users_trends(self, request):
        """Тренды регистрации пользователей для графиков"""
        period = request.query_params.get('period', '30d')
        days = self._parse_period(period)

        # Получаем данные пользователей
        users_data = User.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=days)
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')

        # Форматируем данные
        dates = []
        counts = []

        for i in range(days):
            date = (timezone.now() - timedelta(days=days-i-1)).date()
            dates.append(date.strftime('%d.%m'))

            day_data = next((item for item in users_data if item['date'] == date), None)
            counts.append(day_data['count'] if day_data else 0)

        return Response({
            'labels': dates,
            'datasets': [{
                'label': 'Новые пользователи',
                'data': counts,
                'backgroundColor': 'rgba(245, 101, 101, 0.8)',
                'borderColor': 'rgb(245, 101, 101)',
                'borderWidth': 1
            }]
        })

    @action(detail=False, methods=['get'])
    def pets_distribution(self, request):
        """Распределение питомцев по видам для круговой диаграммы"""
        pets_data = Pet.objects.values('species').annotate(
            count=Count('id')
        ).order_by('-count')

        species_map = {
            'dog': 'Собаки',
            'cat': 'Кошки',
            'bird': 'Птицы',
            'rodent': 'Грызуны',
            'fish': 'Рыбки',
            'reptile': 'Рептилии',
            'other': 'Другие'
        }

        colors = [
            'rgba(59, 130, 246, 0.8)',
            'rgba(245, 101, 101, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(139, 69, 19, 0.8)',
            'rgba(107, 114, 128, 0.8)',
            'rgba(156, 163, 175, 0.8)'
        ]

        labels = []
        data = []
        bg_colors = []
        border_colors = []

        for idx, item in enumerate(pets_data):
            labels.append(species_map.get(item['species'], item['species']))
            data.append(item['count'])
            color_idx = idx % len(colors)
            bg_colors.append(colors[color_idx])
            border_colors.append(colors[color_idx].replace('0.8', '1'))

        return Response({
            'labels': labels,
            'datasets': [{
                'data': data,
                'backgroundColor': bg_colors,
                'borderColor': border_colors,
                'borderWidth': 1
            }]
        })

    @action(detail=False, methods=['get'])
    def orders_trends(self, request):
        """Тренды заказов по статусам для круговой диаграммы"""
        period = request.query_params.get('period', '30d')
        days = self._parse_period(period)

        # Получаем данные заказов по статусам
        orders_data = Order.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=days)
        ).values('status').annotate(
            count=Count('id')
        )

        status_map = {
            'pending': 'Ожидают',
            'processing': 'В обработке',
            'shipped': 'Отправлены',
            'delivered': 'Доставлены',
            'cancelled': 'Отменены'
        }

        colors = {
            'pending': 'rgba(245, 158, 11, 0.8)',
            'processing': 'rgba(59, 130, 246, 0.8)',
            'shipped': 'rgba(16, 185, 129, 0.8)',
            'delivered': 'rgba(5, 150, 105, 0.8)',
            'cancelled': 'rgba(239, 68, 68, 0.8)'
        }

        labels = []
        data = []
        bg_colors = []

        for item in orders_data:
            status = item['status']
            labels.append(status_map.get(status, status))
            data.append(item['count'])
            bg_colors.append(colors.get(status, 'rgba(107, 114, 128, 0.8)'))

        return Response({
            'labels': labels,
            'datasets': [{
                'data': data,
                'backgroundColor': bg_colors,
                'borderWidth': 1
            }]
        })

    @action(detail=False, methods=['get'])
    def sales_by_products(self, request):
        """Продажи по товарам для drill-down аналитики"""
        period = request.query_params.get('period', '30d')
        days = self._parse_period(period)
        limit = int(request.query_params.get('limit', 20))

        # Получаем завершенные платежи за период
        payments = Payment.objects.filter(
            status='completed',
            payment_type__in=['shop_order', 'unified_checkout'],
            created_at__gte=timezone.now() - timedelta(days=days)
        )

        # Агрегируем данные по товарам через OrderItem
        sales_by_product = OrderItem.objects.filter(
            order__id__in=[p.object_id for p in payments],
            product__isnull=False  # Только товары, не курсы
        ).values(
            'product__name',
            'product__external_id'
        ).annotate(
            total_sales=Sum(F('quantity') * F('price')),
            total_quantity=Sum('quantity'),
            order_count=Count('order', distinct=True)
        ).order_by('-total_sales')[:limit]

        labels = []
        sales_data = []
        quantity_data = []
        product_data = []

        for item in sales_by_product:
            product_name = item['product__name'] or 'Неизвестный товар'
            sales = float(item['total_sales'] or 0)
            quantity = item['total_quantity'] or 0
            order_count = item['order_count'] or 0

            labels.append(product_name[:30] + ('...' if len(product_name) > 30 else ''))
            sales_data.append(sales)
            quantity_data.append(quantity)
            product_data.append({
                'name': product_name,
                'sales': sales,
                'quantity': quantity,
                'order_count': order_count
            })

        # Расчет дополнительных метрик
        total_sales = sum(sales_data) if sales_data else 0
        total_orders = sum(item['order_count'] for item in product_data) if product_data else 0
        average_check = total_sales / total_orders if total_orders > 0 else 0
        top_product = product_data[0] if product_data else None

        return Response({
            'labels': labels,
            'datasets': [
                {
                    'label': 'Продажи (₽)',
                    'data': sales_data,
                    'backgroundColor': 'rgba(59, 130, 246, 0.8)',
                    'borderColor': 'rgb(59, 130, 246)',
                    'borderWidth': 1
                },
                {
                    'label': 'Количество',
                    'data': quantity_data,
                    'backgroundColor': 'rgba(16, 185, 129, 0.8)',
                    'borderColor': 'rgb(16, 185, 129)',
                    'borderWidth': 1
                }
            ],
            'total': len(labels),
            'summary': {
                'total_sales': total_sales,
                'total_orders': total_orders,
                'average_check': round(average_check, 2),
                'top_product': {
                    'name': top_product['name'] if top_product else None,
                    'sales': top_product['sales'] if top_product else 0
                }
            }
        })

    @action(detail=False, methods=['get'])
    def sales_by_category(self, request):
        """Продажи по категориям для drill-down аналитики"""
        period = request.query_params.get('period', '30d')
        days = self._parse_period(period)

        # Получаем завершенные платежи за период
        payments = Payment.objects.filter(
            status='completed',
            payment_type__in=['shop_order', 'unified_checkout'],
            created_at__gte=timezone.now() - timedelta(days=days)
        )

        # Агрегируем данные по категориям товаров через OrderItem
        sales_by_category = OrderItem.objects.filter(
            order__id__in=[p.object_id for p in payments],
            product__isnull=False  # Только товары, не курсы
        ).values(
            'product__new_category__name'
        ).annotate(
            total_sales=Sum(F('quantity') * F('price')),
            order_count=Count('order', distinct=True),
            product_count=Count('product', distinct=True)
        ).order_by('-total_sales')

        colors = [
            'rgba(59, 130, 246, 0.8)',
            'rgba(245, 101, 101, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(139, 69, 19, 0.8)',
            'rgba(107, 114, 128, 0.8)'
        ]

        labels = []
        data = []
        category_data = []

        for item in sales_by_category:
            category_name = item['product__new_category__name'] or 'Прочее'
            sales = float(item['total_sales'] or 0)
            order_count = item['order_count'] or 0

            labels.append(category_name)
            data.append(sales)
            category_data.append({
                'name': category_name,
                'sales': sales,
                'order_count': order_count
            })

        # Расчет дополнительных метрик
        total_sales = sum(data) if data else 0
        top_category = category_data[0] if category_data else None
        top_category_share = (top_category['sales'] / total_sales * 100) if total_sales > 0 else 0

        return Response({
            'labels': labels,
            'datasets': [{
                'data': data,
                'backgroundColor': colors[:len(labels)],
                'borderWidth': 1
            }],
            'total': len(labels),
            'summary': {
                'total_sales': total_sales,
                'top_category': {
                    'name': top_category['name'] if top_category else None,
                    'sales': top_category['sales'] if top_category else 0,
                    'order_count': top_category['order_count'] if top_category else 0,
                    'share_percentage': round(top_category_share, 1)
                }
            }
        })

    @action(detail=False, methods=['get'])
    def user_activity_detail(self, request):
        """Детальная активность пользователей"""
        period = request.query_params.get('period', '30d')
        days = self._parse_period(period)

        # Статистика активности пользователей
        user_activity = User.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=days)
        ).aggregate(
            total_users=Count('id'),
            active_users=Count('id', filter=Q(is_active=True)),
            staff_users=Count('id', filter=Q(is_staff=True)),
            superuser_count=Count('id', filter=Q(is_superuser=True))
        )

        # Динамика регистраций по дням
        registrations_by_day = User.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=days)
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')

        dates = []
        reg_counts = []

        for i in range(days):
            date = (timezone.now() - timedelta(days=days-i-1)).date()
            dates.append(date.strftime('%d.%m'))

            day_data = next((item for item in registrations_by_day if item['date'] == date), None)
            reg_counts.append(day_data['count'] if day_data else 0)

        return Response({
            'summary': user_activity,
            'registrations_trend': {
                'labels': dates,
                'datasets': [{
                    'label': 'Регистрации',
                    'data': reg_counts,
                    'borderColor': 'rgb(16, 185, 129)',
                    'backgroundColor': 'rgba(16, 185, 129, 0.1)',
                    'fill': True
                }]
            }
        })

    @action(detail=False, methods=['get'])
    def orders_delivery_analysis(self, request):
        """Анализ времени доставки и возвратов заказов для drill-down аналитики"""
        period = request.query_params.get('period', '30d')
        days = self._parse_period(period)

        # Получаем заказы за период
        orders = Order.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=days)
        ).select_related('user')

        # Анализ времени доставки для доставленных заказов
        delivered_orders = orders.filter(status='delivered')

        delivery_times = []
        for order in delivered_orders:
            if order.delivery_date and order.created_at:
                delivery_time = (order.delivery_date - order.created_at.date()).days
                delivery_times.append(max(0, delivery_time))  # Не отрицательные значения

        # Группируем по времени доставки
        delivery_time_groups = {}
        for days_count in delivery_times:
            if days_count <= 1:
                key = '1 день'
            elif days_count <= 3:
                key = '2-3 дня'
            elif days_count <= 7:
                key = '4-7 дней'
            elif days_count <= 14:
                key = '1-2 недели'
            else:
                key = 'Более 2 недель'

            delivery_time_groups[key] = delivery_time_groups.get(key, 0) + 1

        # Сортируем группы по порядку и всегда показываем все категории
        ordered_groups = ['1 день', '2-3 дня', '4-7 дней', '1-2 недели', 'Более 2 недель']
        delivery_labels = []
        delivery_data = []

        for group in ordered_groups:
            delivery_labels.append(group)
            delivery_data.append(delivery_time_groups.get(group, 0))

        # Анализ возвратов/отмен заказов
        cancelled_orders = orders.filter(status='cancelled')
        returns_by_reason = {}

        # Группируем отмены по времени (предполагаем причины на основе времени отмены)
        for order in cancelled_orders:
            if order.updated_at and order.created_at:
                time_to_cancel = (order.updated_at - order.created_at).total_seconds() / 3600  # в часах

                if time_to_cancel < 1:
                    reason = 'Отмена сразу'
                elif time_to_cancel < 24:
                    reason = 'Отмена в первый день'
                elif time_to_cancel < 168:  # 7 дней
                    reason = 'Отмена в первую неделю'
                else:
                    reason = 'Отмена позже'

                returns_by_reason[reason] = returns_by_reason.get(reason, 0) + 1

        # Сортируем причины возвратов
        returns_ordered = ['Отмена сразу', 'Отмена в первый день', 'Отмена в первую неделю', 'Отмена позже']
        returns_labels = []
        returns_data = []

        for reason in returns_ordered:
            if reason in returns_by_reason:
                returns_labels.append(reason)
                returns_data.append(returns_by_reason[reason])

        # Сводная статистика
        total_orders = orders.count()
        delivered_count = delivered_orders.count()
        cancelled_count = cancelled_orders.count()
        avg_delivery_time = sum(delivery_times) / len(delivery_times) if delivery_times else 0

        return Response({
            'delivery_time_analysis': {
                'labels': delivery_labels,
                'datasets': [{
                    'label': 'Количество заказов',
                    'data': delivery_data,
                    'backgroundColor': [
                        'rgba(16, 185, 129, 0.8)',   # зеленый
                        'rgba(59, 130, 246, 0.8)',   # синий
                        'rgba(245, 158, 11, 0.8)',   # оранжевый
                        'rgba(245, 101, 101, 0.8)',  # красный
                        'rgba(107, 114, 128, 0.8)'   # серый
                    ][:len(delivery_labels)]
                }]
            },
            'returns_analysis': {
                'labels': returns_labels,
                'datasets': [{
                    'label': 'Количество отмен',
                    'data': returns_data,
                    'backgroundColor': [
                        'rgba(239, 68, 68, 0.8)',    # красный
                        'rgba(245, 101, 101, 0.8)',  # светло-красный
                        'rgba(245, 158, 11, 0.8)',   # оранжевый
                        'rgba(107, 114, 128, 0.8)'   # серый
                    ][:len(returns_labels)]
                }]
            },
            'summary': {
                'total_orders': total_orders,
                'delivered_orders': delivered_count,
                'cancelled_orders': cancelled_count,
                'delivery_rate': (delivered_count / total_orders * 100) if total_orders > 0 else 0,
                'cancellation_rate': (cancelled_count / total_orders * 100) if total_orders > 0 else 0,
                'average_delivery_time': round(avg_delivery_time, 1)
            }
        })

    def _parse_period(self, period):
        """Парсинг периода в дни"""
        period_map = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365
        }
        return period_map.get(period, 30)

    @action(detail=False, methods=['get'])
    @cached_top_products
    def top_products(self, request):
        """Топ товаров по продажам."""
        limit = int(request.query_params.get('limit', 10))

        top_sales = list(OrderItem.objects.filter(
            product__isnull=False,
            order__status__in=['processing', 'partially_delivered', 'shipped', 'delivered']
        ).values('product_id').annotate(
            orders_count=Sum('quantity')
        ).filter(
            orders_count__gt=0
        ).order_by('-orders_count')[:limit])

        products_by_id = {
            product.id: product
            for product in Product.objects.filter(
                id__in=[item['product_id'] for item in top_sales],
                status=1
            ).select_related('brand', 'new_category')
        }

        data = []
        for item in top_sales:
            product = products_by_id.get(item['product_id'])
            if not product:
                continue

            data.append({
                'id': str(product.kotmatros_product_id or product.id),
                'name': product.name,
                'orders_count': item['orders_count'],
                'price': float(product.price),
                'compare_price': float(product.compare_price) if product.compare_price else None,
                'brand': product.brand.name if product.brand else None,
                'category': product.new_category.name if product.new_category else None,
                'is_available': product.is_available,
            })

        return Response({'products': data})

    @action(detail=False, methods=['get'])
    @cached_recent_orders
    def recent_orders(self, request):
        """Последние заказы для дашборда."""
        limit = int(request.query_params.get('limit', 10))

        recent_orders = Order.objects.select_related('user').order_by('-created_at')[:limit]

        data = []
        for order in recent_orders:
            data.append({
                'id': order.id,
                'user_email': order.user.email if order.user else 'Аноним',
                'total_amount': float(order.total_amount),
                'status': order.status,
                'created_at': order.created_at.isoformat(),
                'items_count': order.items.count(),
            })

        return Response({'orders': data})


class AdminManagementViewSet(viewsets.ViewSet):
    """ViewSet для операций управления данными."""

    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['post'])
    def bulk_update_products(self, request):
        """Массовое обновление товаров."""
        product_ids = request.data.get('product_ids', [])
        updates = request.data.get('updates', {})

        if not product_ids:
            return Response(
                {'error': 'Не указаны ID товаров'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Преобразуем external_id в pk для фильтрации
        products = Product.objects.filter(external_id__in=product_ids)
        updated_count = products.update(**updates)

        return Response({
            'updated_count': updated_count,
            'message': f'Обновлено товаров: {updated_count}'
        })

    @action(detail=False, methods=['post'])
    def bulk_update_orders(self, request):
        """Массовое обновление заказов."""
        order_ids = request.data.get('order_ids', [])
        new_status = request.data.get('status')

        if not order_ids or not new_status:
            return Response(
                {'error': 'Не указаны ID заказов или новый статус'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Неверный статус. Допустимые: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        updated_count = Order.objects.filter(id__in=order_ids).update(status=new_status)

        return Response({
            'updated_count': updated_count,
            'message': f'Обновлено заказов: {updated_count}'
        })

    @action(detail=False, methods=['post'])
    def bulk_update_users(self, request):
        """Массовое обновление пользователей."""
        user_ids = request.data.get('user_ids', [])
        updates = request.data.get('updates', {})

        if not user_ids:
            return Response(
                {'error': 'Не указаны ID пользователей'},
                status=status.HTTP_400_BAD_REQUEST
            )

        updated_count = User.objects.filter(id__in=user_ids).update(**updates)

        return Response({
            'updated_count': updated_count,
            'message': f'Обновлено пользователей: {updated_count}'
        })

    @action(detail=False, methods=['post'])
    def bulk_update_courses(self, request):
        """Массовое обновление курсов."""
        course_ids = request.data.get('course_ids', [])
        updates = request.data.get('updates', {})

        if not course_ids:
            return Response(
                {'error': 'Не указаны ID курсов'},
                status=status.HTTP_400_BAD_REQUEST
            )

        updated_count = Course.objects.filter(id__in=course_ids).update(**updates)

        return Response({
            'updated_count': updated_count,
            'message': f'Обновлено курсов: {updated_count}'
        })

    @action(detail=False, methods=['get', 'post'])
    def export_data(self, request):
        """Экспорт данных в разные форматы (CSV, Excel, PDF, JSON)."""
        # Сначала проверяем POST данные, затем GET параметры
        if request.method == 'POST':
            model_name = request.data.get('model')
            format_type = request.data.get('format', 'csv')
            filters = request.data.get('filters', '{}')
            filename = request.data.get('filename')
        else:
            model_name = request.query_params.get('model')
            format_type = request.query_params.get('format', 'csv')
            filters = request.query_params.get('filters', '{}')
            filename = request.query_params.get('filename')

        # Отладка параметров
        print(f"DEBUG: export_data called with method={request.method}")
        print(f"DEBUG: model_name={model_name}, format_type={format_type}, filters={filters}")
        print(f"DEBUG: request.data={request.data if request.method == 'POST' else 'N/A'}")
        print(f"DEBUG: request.POST={dict(request.POST) if hasattr(request, 'POST') else 'N/A'}")

        try:
            filters_dict = json.loads(filters) if filters else {}
        except json.JSONDecodeError as e:
            print(f"DEBUG: JSON decode error: {e}")
            filters_dict = {}

        # Получаем queryset в зависимости от модели
        queryset = self._get_export_queryset(model_name, filters_dict)

        if queryset is None:
            print(f"DEBUG: Model {model_name} not found in model_map")
            return Response(
                {'error': f'Модель {model_name} не найдена'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Генерируем данные экспорта
        data = self._prepare_export_data(model_name, queryset)

        # Экспортируем в выбранный формат
        if format_type == 'csv':
            return self._export_csv(data, model_name)
        elif format_type == 'excel':
            return self._export_excel(data, model_name)
        elif format_type == 'pdf':
            return self._export_pdf(data, model_name)
        elif format_type == 'json':
            return self._export_json(data)
        else:
            return Response(
                {'error': f'Формат {format_type} не поддерживается'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _get_export_queryset(self, model_name, filters):
        """Получить queryset для экспорта с фильтрами."""
        model_map = {
            'users': User,
            'pets': Pet,
            'products': Product,
            'orders': Order,
            'courses': Course,
            'payments': Payment,
            'reviews': Review
        }

        model_class = model_map.get(model_name)
        if not model_class:
            return None

        queryset = model_class.objects.all()

        # Применяем фильтры
        if 'date_from' in filters and filters['date_from']:
            queryset = queryset.filter(created_at__gte=filters['date_from'])

        if 'date_to' in filters and filters['date_to']:
            queryset = queryset.filter(created_at__lte=filters['date_to'])

        if 'status' in filters and filters['status']:
            if hasattr(model_class, 'status'):
                queryset = queryset.filter(status=filters['status'])
            elif hasattr(model_class, 'is_active') and model_name == 'users':
                queryset = queryset.filter(is_active=filters['status'] == 'true')

        return queryset

    def _prepare_export_data(self, model_name, queryset):
        """Подготовить данные для экспорта."""
        data = []

        if model_name == 'users':
            for user in queryset:
                data.append({
                    'ID': str(user.id),
                    'Email': user.email,
                    'Имя': user.first_name or '',
                    'Фамилия': user.last_name or '',
                    'Телефон': user.phone or '',
                    'Активен': 'Да' if user.is_active else 'Нет',
                    'Администратор': 'Да' if user.is_staff else 'Нет',
                    'Дата регистрации': user.created_at.strftime('%d.%m.%Y %H:%M'),
                    'Количество питомцев': user.pets.count(),
                    'Количество заказов': user.orders.count(),
                })

        elif model_name == 'pets':
            for pet in queryset:
                data.append({
                    'ID': str(pet.id),
                    'Кличка': pet.name,
                    'Вид': pet.species,
                    'Порода': pet.breed or '',
                    'Пол': pet.gender,
                    'Дата рождения': pet.date_of_birth.strftime('%d.%m.%Y') if pet.date_of_birth else '',
                    'Вес (кг)': str(pet.weight) if pet.weight else '',
                    'Владелец': pet.owner.email if pet.owner else '',
                    'Дата добавления': pet.created_at.strftime('%d.%m.%Y %H:%M'),
                })

        elif model_name == 'products':
            for product in queryset:
                discount_percent = 0
                if product.compare_price and product.compare_price > product.price:
                    discount_percent = round((1 - float(product.price) / float(product.compare_price)) * 100)
                data.append({
                    'ID': str(product.kotmatros_product_id or product.id),
                    'Название': product.name,
                    'Цена': float(product.price),
                    'Скидка (%)': discount_percent,
                    'В наличии': 'Да' if product.is_available else 'Нет',
                    'Количество вариаций': product.sku_count,
                    'Категория': product.new_category.name if product.new_category else '',
                    'Бренд': product.brand.name if product.brand else '',
                    'Дата добавления': product.created_at.strftime('%d.%m.%Y %H:%M'),
                })

        elif model_name == 'orders':
            for order in queryset.select_related('user'):
                data.append({
                    'ID': order.id,
                    'Пользователь': order.user.email if order.user else '',
                    'Сумма': float(order.total_amount),
                    'Статус': order.status,
                    'Способ доставки': order.delivery_type or '',
                    'Адрес доставки': order.shipping_address or '',
                    'Дата заказа': order.created_at.strftime('%d.%m.%Y %H:%M'),
                    'Дата обновления': order.updated_at.strftime('%d.%m.%Y %H:%M'),
                })

        elif model_name == 'courses':
            for course in queryset:
                data.append({
                    'ID': str(course.id),
                    'Название': course.title,
                    'Категория': course.category or '',
                    'Уровень': course.level or '',
                    'Цена': float(course.price) if course.price else 0,
                    'Активен': 'Да' if course.is_active else 'Нет',
                    'Дата создания': course.created_at.strftime('%d.%m.%Y %H:%M'),
                })

        elif model_name == 'payments':
            for payment in queryset.select_related('user'):
                data.append({
                    'ID': str(payment.id),
                    'Пользователь': payment.user.email if payment.user else '',
                    'Сумма': float(payment.amount),
                    'Статус': payment.status,
                    'Метод': payment.payment_method or '',
                    'Дата': payment.created_at.strftime('%d.%m.%Y %H:%M'),
                })

        elif model_name == 'reviews':
            for review in queryset.select_related('user'):
                data.append({
                    'ID': str(review.id),
                    'Пользователь': review.user.email if review.user else '',
                    'Рейтинг': review.rating,
                    'Текст': review.text[:100] + '...' if len(review.text) > 100 else review.text,
                    'Одобрен': 'Да' if review.is_approved else 'Нет',
                    'Дата': review.created_at.strftime('%d.%m.%Y %H:%M'),
                })

        return data

    def _export_csv(self, data, model_name):
        """Экспорт в CSV."""
        if not data:
            return Response({'error': 'Нет данных для экспорта'}, status=status.HTTP_400_BAD_REQUEST)

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys(), delimiter=';')
        writer.writeheader()
        writer.writerows(data)

        response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{model_name}_export.csv"'
        return response

    def _export_excel(self, data, model_name):
        """Экспорт в Excel (упрощенная версия через CSV)."""
        if not data:
            return Response({'error': 'Нет данных для экспорта'}, status=status.HTTP_400_BAD_REQUEST)

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys(), delimiter=';')
        writer.writeheader()
        writer.writerows(data)

        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{model_name}_export.xlsx"'
        return response

    def _export_pdf(self, data, model_name):
        """Экспорт в PDF (упрощенная версия - текстовый файл)."""
        if not data:
            return Response({'error': 'Нет данных для экспорта'}, status=status.HTTP_400_BAD_REQUEST)

        output = io.StringIO()
        output.write(f"Экспорт данных: {model_name}\n")
        output.write("=" * 50 + "\n\n")

        if data:
            headers = list(data[0].keys())
            output.write(";".join(headers) + "\n")

            for row in data:
                values = [str(row.get(header, '')) for header in headers]
                output.write(";".join(values) + "\n")

        response = HttpResponse(output.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{model_name}_export.pdf"'
        return response

    def _export_json(self, data):
        """Экспорт в JSON."""
        response = HttpResponse(
            json.dumps(data, ensure_ascii=False, indent=2),
            content_type='application/json; charset=utf-8'
        )
        response['Content-Disposition'] = 'attachment; filename="data_export.json"'
        return response


class AdminPagination(PageNumberPagination):
    """Кастомная пагинация для админки."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000

    def get_paginated_response(self, data):
        """Единый формат пагинации для таблиц React-админки."""
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
            'pagination': {
                'count': self.page.paginator.count,
                'current_page': self.page.number,
                'num_pages': self.page.paginator.num_pages,
                'has_next': self.page.has_next(),
                'has_previous': self.page.has_previous(),
                'start_index': self.page.start_index(),
                'end_index': self.page.end_index(),
            }
        })


class AdminModelViewSet(viewsets.ModelViewSet):
    """Базовый ViewSet для моделей админки с пагинацией."""
    permission_classes = [IsAdminUser]
    pagination_class = AdminPagination

    def get_queryset(self):
        """Базовый queryset с возможностью фильтрации."""
        queryset = super().get_queryset()

        # Добавляем базовую фильтрацию по query параметрам
        for field, value in self.request.query_params.items():
            if field not in ['page', 'page_size', 'ordering', 'search']:
                if hasattr(queryset.model, field) and value:
                    queryset = queryset.filter(**{field: value})

        return queryset


# Специфические ViewSets для каждой модели
class AdminUserViewSet(AdminModelViewSet):
    """ViewSet для управления пользователями."""
    queryset = User.objects.all()
    ordering = ('-created_at',)

    def get_queryset(self):
        queryset = User.objects.all()
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        role = self.request.query_params.get('role', '')
        if role:
            queryset = queryset.filter(role=role)

        is_active = self.request.query_params.get('is_active', '')
        if is_active:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.annotate(
            pets_count=Count('pets', distinct=True),
            orders_count=Count('orders', distinct=True),
            payments_count=Count('payments', distinct=True)
        ).order_by('-created_at')

    def _serialize_user(self, user):
        """Сериализация пользователя в формат для API."""
        return {
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name or '',
            'last_name': user.last_name or '',
            'phone': user.phone or '',
            'role': getattr(user, 'role', 'user'),
            'is_active': user.is_active,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'created_at': user.created_at.isoformat(),
            'pets_count': getattr(user, 'pets_count', user.pets.count()),
            'orders_count': getattr(user, 'orders_count', user.orders.count()),
        }

    def list(self, request):
        """Список пользователей с пагинацией."""
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        
        data = [self._serialize_user(user) for user in (page if page else queryset)]
        
        if page:
            return self.get_paginated_response(data)
        return Response(data)

    def retrieve(self, request, pk=None):
        """Получить одного пользователя."""
        try:
            user = User.objects.get(id=pk)
            return Response(self._serialize_user(user))
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

    def update(self, request, pk=None, **kwargs):
        """Обновить пользователя (PUT и PATCH)."""
        try:
            user = User.objects.get(id=pk)
            allowed_fields = ['email', 'first_name', 'last_name', 'phone', 'is_active', 'role']
            for field in allowed_fields:
                if field in request.data:
                    setattr(user, field, request.data[field])
            user.save()
            return Response(self._serialize_user(user))
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

    def destroy(self, request, pk=None):
        """Удалить пользователя."""
        try:
            user = User.objects.get(id=pk)
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminPetViewSet(AdminModelViewSet):
    """ViewSet для управления питомцами."""
    queryset = Pet.objects.select_related('owner').all()
    ordering = ('-created_at',)

    def _serialize_pet(self, pet):
        """Сериализация питомца в формат для API."""
        return {
            'id': str(pet.id),
            'name': pet.name,
            'species': pet.species,
            'breed': pet.breed.name if pet.breed else '',
            'gender': pet.sex,
            'date_of_birth': pet.date_of_birth.isoformat() if pet.date_of_birth else None,
            'weight': float(pet.weight) if pet.weight else None,
            'owner_email': pet.owner.email if pet.owner else '',
            'owner_id': str(pet.owner.id) if pet.owner else None,
            'created_at': pet.created_at.isoformat(),
        }

    def list(self, request):
        """Список питомцев с пагинацией."""
        queryset = self.get_queryset()
        search = request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(owner__email__icontains=search)
            )
        
        species = request.query_params.get('species', '')
        if species:
            queryset = queryset.filter(species=species)
        
        queryset = queryset.order_by('-created_at')
        page = self.paginate_queryset(queryset)
        
        data = [self._serialize_pet(pet) for pet in (page if page else queryset)]
        
        if page:
            return self.get_paginated_response(data)
        return Response(data)

    def retrieve(self, request, pk=None):
        """Получить одного питомца."""
        try:
            pet = Pet.objects.select_related('owner').get(id=pk)
            return Response(self._serialize_pet(pet))
        except Pet.DoesNotExist:
            return Response(
                {'error': 'Питомец не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

    def update(self, request, pk=None, **kwargs):
        """Обновить питомца."""
        try:
            pet = Pet.objects.get(id=pk)
            allowed_fields = ['name', 'species', 'breed', 'gender', 'date_of_birth', 'weight']
            for field in allowed_fields:
                if field in request.data:
                    value = request.data[field]
                    if field == 'date_of_birth' and value:
                        value = parse_date(value)
                    elif field == 'weight' and value:
                        value = Decimal(str(value))
                    setattr(pet, field, value)
            pet.save()
            return Response(self._serialize_pet(pet))
        except Pet.DoesNotExist:
            return Response(
                {'error': 'Питомец не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

    def destroy(self, request, pk=None):
        """Удалить питомца."""
        try:
            pet = Pet.objects.get(id=pk)
            pet.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Pet.DoesNotExist:
            return Response(
                {'error': 'Питомец не найден'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminProductViewSet(AdminModelViewSet):
    """ViewSet для управления товарами."""
    queryset = Product.objects.all()
    ordering = ('-order_count', 'name')
    lookup_field = 'kotmatros_product_id'
    lookup_url_kwarg = 'id'

    def _serialize_product(self, product):
        """Сериализация товара в формат для API."""
        discount_percent = 0
        if product.compare_price and product.compare_price > product.price:
            discount_percent = round((1 - float(product.price) / float(product.compare_price)) * 100)
        return {
            'id': str(product.kotmatros_product_id or product.id),
            'name': product.name,
            'description': product.description or '',
            'price': float(product.price),
            'compare_price': float(product.compare_price) if product.compare_price else None,
            'discount_percent': discount_percent,
            'is_available': product.is_available,
            'category': product.new_category.name if product.new_category else None,
            'category_slug': product.new_category.slug if product.new_category else None,
            'product_group': product.product_group,
            'brand_name': product.brand.name if product.brand else None,
            'order_count': product.order_count,
            'animal_type': product.animal_type,
            'rating': float(product.rating) if product.rating else 0,
            'rating_count': product.rating_count,
            'created_at': product.created_at.isoformat(),
            'main_image': product.image_url,
        }

    def list(self, request):
        """Список товаров с пагинацией."""
        queryset = self.get_queryset()
        search = request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(brand__name__icontains=search) |
                Q(kotmatros_product_id__icontains=search)
            )
        
        category_slug = request.query_params.get('category_slug', '')
        if category_slug:
            queryset = queryset.filter(new_category__slug=category_slug)
        
        in_stock = request.query_params.get('in_stock', '')
        if in_stock:
            queryset = queryset.filter(is_available=in_stock.lower() == 'true')
        
        queryset = queryset.order_by('-order_count', 'name')
        page = self.paginate_queryset(queryset)
        
        data = [self._serialize_product(product) for product in (page if page else queryset)]
        
        if page:
            return self.get_paginated_response(data)
        return Response(data)

    def retrieve(self, request, id=None):
        """Получить один товар по external_id."""
        try:
            product = Product.objects.get(kotmatros_product_id=id)
            return Response(self._serialize_product(product))
        except Product.DoesNotExist:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

    def update(self, request, id=None, **kwargs):
        """Обновить товар."""
        try:
            product = Product.objects.get(kotmatros_product_id=id)
            allowed_fields = [
                'name', 'description', 'price', 'compare_price', 'is_available',
                'product_group', 'animal_type', 'brand_id', 'category_id'
            ]
            for field in allowed_fields:
                if field in request.data:
                    value = request.data[field]
                    if field in ['price', 'compare_price']:
                        value = Decimal(str(value))
                    elif field in ['brand_id', 'category_id']:
                        value = int(value) if value else None
                    setattr(product, field, value)
            product.save()
            return Response(self._serialize_product(product))
        except Product.DoesNotExist:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

    def destroy(self, request, id=None):
        """Удалить товар."""
        try:
            product = Product.objects.get(kotmatros_product_id=id)
            product.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Товар не найден'},
                status=status.HTTP_404_NOT_FOUND
            )


class AdminOrderViewSet(AdminModelViewSet):
    """ViewSet для управления заказами."""
    queryset = Order.objects.select_related('user', 'address').prefetch_related(
        'items__product',
        'items__course',
        'items__pet'
    ).all()
    ordering = ('-created_at',)

    def get_queryset(self):
        """Переопределяем get_queryset, чтобы избежать проблем с фильтрами."""
        return Order.objects.select_related('user', 'address').prefetch_related(
            'items__product',
            'items__course',
            'items__pet'
        ).all()

    def _serialize_order(self, order):
        """Сериализация заказа в формат для API."""
        try:
            items_count = order.items.count()
        except:
            items_count = 0
        return {
            'id': order.id,
            'user_email': order.user.email if order.user else '',
            'user_id': str(order.user.id) if order.user else None,
            'total_amount': float(order.total_amount or 0),
            'status': order.status,
            'delivery_method': order.delivery_type or '',
            'delivery_address': order.shipping_address or '',
            'items_count': items_count,
            'created_at': order.created_at.isoformat(),
            'updated_at': order.updated_at.isoformat(),
        }

    def list(self, request):
        """Список заказов с пагинацией."""
        queryset = self.get_queryset()
        
        status_filter = request.query_params.get('status', '')
        if status_filter:
            # Поддержка фильтрации по нескольким статусам через запятую
            statuses = [s.strip() for s in status_filter.split(',') if s.strip()]
            if len(statuses) == 1:
                queryset = queryset.filter(status=status_filter)
            else:
                queryset = queryset.filter(status__in=statuses)
        
        search = request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(user__email__icontains=search) |
                Q(id__icontains=search)
            )
        
        queryset = queryset.order_by('-created_at')
        page = self.paginate_queryset(queryset)
        
        data = []
        for order in (page if page else queryset):
            try:
                data.append(self._serialize_order(order))
            except Exception as e:
                # Если есть проблема с заказом, пропускаем его
                print(f"Warning: Skipping order {order.id} due to error: {e}")
                continue
        
        if page:
            return self.get_paginated_response(data)
        return Response(data)

    def retrieve(self, request, pk=None):
        """Получить один заказ."""
        try:
            order = Order.objects.select_related('user', 'address').prefetch_related(
                'items__product',
                'items__course',
                'items__pet'
            ).get(id=pk)
            return Response(self._serialize_order(order))
        except Order.DoesNotExist:
            return Response(
                {'error': 'Заказ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

    def update(self, request, pk=None, **kwargs):
        """Обновить заказ."""
        try:
            order = Order.objects.get(id=pk)
            allowed_fields = ['status', 'delivery_method', 'delivery_address', 'total_amount']
            for field in allowed_fields:
                if field in request.data:
                    value = request.data[field]
                    if field == 'total_amount':
                        value = Decimal(str(value))
                    setattr(order, field, value)
            order.save()
            return Response(self._serialize_order(order))
        except Order.DoesNotExist:
            return Response(
                {'error': 'Заказ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

    def destroy(self, request, pk=None):
        """Удалить заказ."""
        try:
            order = Order.objects.get(id=pk)
            order.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Заказ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )


class IsAdminOrCourseCreator(BasePermission):
    """Доступ для администраторов и создателей курсов."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_staff or request.user.is_superuser or getattr(request.user, 'role', None) == 'course_creator'


COURSE_ADMIN_WRITE_FIELDS = [
    'title', 'description', 'detailed_description', 'what_you_will_learn',
    'category', 'subcategory', 'level', 'pet_type', 'format_type',
    'price', 'duration', 'completion_time',
    'is_active', 'status',
    'instructor_name', 'instructor_bio',
    'author_id',
    'course_type',
    'recommended_behavior_types', 'recommended_activity_levels',
    'recommended_social_levels', 'min_training_experience',
    'compatible_health_issues', 'addresses_special_needs',
    'suitable_activities', 'addresses_behavioral_problems',
    'correction_problem', 'correction_problem_tags', 'correction_symptoms',
    'correction_goal', 'success_metrics', 'risk_level',
    'contraindications', 'red_flags', 'safety_notes', 'required_equipment',
    'owner_daily_time_minutes', 'min_age_months', 'max_age_months',
    'excluded_behavioral_problems', 'excluded_health_issues',
    'requires_specialist_supervision', 'requires_vet_clearance',
    'review_status', 'review_notes',
]

COURSE_ADMIN_LIST_FIELDS = [
    'recommended_behavior_types', 'recommended_activity_levels',
    'recommended_social_levels', 'compatible_health_issues',
    'addresses_special_needs', 'suitable_activities',
    'addresses_behavioral_problems', 'correction_problem_tags',
    'correction_symptoms', 'success_metrics', 'contraindications',
    'red_flags', 'required_equipment', 'excluded_behavioral_problems',
    'excluded_health_issues',
]


class AdminCourseViewSet(viewsets.ModelViewSet):
    """ViewSet для управления курсами."""
    queryset = Course.objects.all().order_by('-created_at')
    permission_classes = [IsAdminOrCourseCreator]
    pagination_class = AdminPagination

    def _serialize_course(self, course):
        """Сериализация курса в формат для API."""
        # Сериализуем уроки (уже предзагружены через prefetch_related)
        lessons = []
        for lesson in course.lessons.all().order_by('order'):
            lessons.append({
                'id': str(lesson.id),
                'title': lesson.title,
                'content_type': lesson.content_type,
                'content': lesson.content,
                'duration': lesson.duration,
                'order': lesson.order,
                'is_required': lesson.is_required,
                'additional_materials': lesson.additional_materials,
                'is_active': lesson.is_active,
                'created_at': lesson.created_at.isoformat(),
            })

        students_count = getattr(course, 'students_count_value', None)
        if students_count is None:
            students_count = course.user_courses.count()

        pets_count = getattr(course, 'pets_count_value', None)
        if pets_count is None:
            pets_count = course.user_courses.exclude(pet__isnull=True).values('pet_id').distinct().count()

        avg_progress = getattr(course, 'avg_progress_value', None)
        publish_check = course.get_behavior_correction_publish_check(getattr(self.request, 'user', None))

        return {
            'id': str(course.id),
            'title': course.title,
            'description': course.description or '',
            'detailed_description': course.detailed_description or '',
            'what_you_will_learn': course.what_you_will_learn or '',
            'category': course.category or '',
            'subcategory': course.subcategory or '',
            'level': course.level or '',
            'price': float(course.price) if course.price else 0,
            'is_active': course.is_active,
            'is_free': course.is_free,
            'status': course.status,
            'pet_type': getattr(course, 'pet_type', None),
            'course_type': course.course_type,
            'duration': course.duration,
            'format_type': course.format_type,
            'completion_time': course.completion_time or '',
            'instructor_name': course.instructor_name or '',
            'instructor_bio': course.instructor_bio or '',
            'recommended_behavior_types': course.recommended_behavior_types or [],
            'recommended_activity_levels': course.recommended_activity_levels or [],
            'recommended_social_levels': course.recommended_social_levels or [],
            'min_training_experience': course.min_training_experience or '',
            'compatible_health_issues': course.compatible_health_issues or [],
            'addresses_special_needs': course.addresses_special_needs or [],
            'suitable_activities': course.suitable_activities or [],
            'addresses_behavioral_problems': course.addresses_behavioral_problems or [],
            'correction_problem': course.correction_problem or '',
            'correction_problem_tags': course.correction_problem_tags or [],
            'correction_symptoms': course.correction_symptoms or [],
            'correction_goal': course.correction_goal or '',
            'success_metrics': course.success_metrics or [],
            'risk_level': course.risk_level,
            'contraindications': course.contraindications or [],
            'red_flags': course.red_flags or [],
            'safety_notes': course.safety_notes or '',
            'required_equipment': course.required_equipment or [],
            'owner_daily_time_minutes': course.owner_daily_time_minutes,
            'min_age_months': course.min_age_months,
            'max_age_months': course.max_age_months,
            'excluded_behavioral_problems': course.excluded_behavioral_problems or [],
            'excluded_health_issues': course.excluded_health_issues or [],
            'requires_specialist_supervision': course.requires_specialist_supervision,
            'requires_vet_clearance': course.requires_vet_clearance,
            'review_status': course.review_status,
            'review_notes': course.review_notes or '',
            'lessons': lessons,
            'lessons_count': len(lessons),
            'students': students_count,
            'students_count': students_count,
            'pets_count': pets_count,
            'completion_rate': round(float(avg_progress or 0), 1),
            'publish_check': publish_check,
            'author_id': str(course.author_id) if course.author_id else None,
            'author_email': course.author.email if course.author else '',
            'created_at': course.created_at.isoformat(),
            'updated_at': course.updated_at.isoformat(),
        }

    def _is_course_creator(self):
        return getattr(self.request.user, 'role', None) == 'course_creator'

    def _normalize_field_value(self, field, value):
        """Привести значение из админки к типу поля модели Course."""
        if field == 'price':
            return Decimal(str(value)) if value not in (None, '') else Decimal('0')
        if field == 'duration':
            return int(value) if value not in (None, '') else 60
        if field in ('owner_daily_time_minutes', 'min_age_months', 'max_age_months'):
            return int(value) if value not in (None, '') else None
        if field in (
            'is_active', 'requires_specialist_supervision',
            'requires_vet_clearance',
        ):
            if isinstance(value, str):
                return value.lower() in ('true', '1', 'yes', 'on')
            return bool(value)
        if field in COURSE_ADMIN_LIST_FIELDS:
            return value if isinstance(value, list) else []
        return value

    def _apply_course_data(self, course, data, allowed_fields):
        """Записать разрешенные поля курса из request.data."""
        for field in allowed_fields:
            if field in data:
                if field == 'author_id':
                    author_id = data[field]
                    if author_id in (None, ''):
                        course.author = None
                    else:
                        course.author = User.objects.get(id=author_id, role='course_creator')
                    continue
                setattr(course, field, self._normalize_field_value(field, data[field]))

        if course.course_type == 'behavior_correction':
            course.category = course.category or 'behavior'
            if course.category != 'behavior':
                course.category = 'behavior'
            if not course.format_type:
                course.format_type = 'mixed'
            course.is_active = course.status == 'published'

        return course

    def get_queryset(self):
        """Получить queryset с фильтрами."""
        # Оптимизация: предзагружаем уроки для избежания N+1
        queryset = (
            Course.objects
            .prefetch_related('lessons')
            .annotate(
                students_count_value=Count('user_courses', distinct=True),
                pets_count_value=Count('user_courses__pet', distinct=True),
                avg_progress_value=Avg('user_progress__progress_percent'),
            )
            .all()
        )

        # Создатели курсов видят только свои курсы
        if self._is_course_creator():
            queryset = queryset.filter(author=self.request.user)

        # Поиск
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )

        # Фильтры
        category = self.request.query_params.get('category', '')
        if category:
            queryset = queryset.filter(category=category)

        course_type = self.request.query_params.get('course_type', '')
        if course_type:
            queryset = queryset.filter(course_type=course_type)

        pet_type = self.request.query_params.get('pet_type', '')
        if pet_type:
            queryset = queryset.filter(pet_type=pet_type)

        level = self.request.query_params.get('level', '')
        if level:
            queryset = queryset.filter(level=level)

        risk_level = self.request.query_params.get('risk_level', '')
        if risk_level:
            queryset = queryset.filter(risk_level=risk_level)

        correction_problem = self.request.query_params.get('correction_problem', '')
        if correction_problem:
            queryset = queryset.filter(correction_problem=correction_problem)

        review_status = self.request.query_params.get('review_status', '')
        if review_status:
            queryset = queryset.filter(review_status=review_status)

        is_active = self.request.query_params.get('is_active', '')
        if is_active:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.order_by('-created_at')

    def list(self, request):
        """Список курсов с пагинацией."""
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)

        data = [self._serialize_course(course) for course in (page if page else queryset)]

        if page:
            return self.get_paginated_response(data)
        return Response(data)

    def create(self, request):
        """Создать новый курс (черновик)."""
        try:
            data = request.data.copy()
            course_type = data.get('course_type', 'general')
            course = Course.objects.create(
                title=data.get('title', 'Новый курс'),
                description=data.get('description', ''),
                duration=int(data.get('duration', 60)),
                category='behavior' if course_type == 'behavior_correction' else data.get('category', 'basics'),
                level=data.get('level', 'beginner'),
                pet_type=data.get('pet_type', 'all'),
                format_type='mixed' if course_type == 'behavior_correction' else data.get('format_type', 'video'),
                price=Decimal(str(data.get('price', 0))) if data.get('price') else Decimal('0'),
                is_active=False,
                status='draft',
                instructor_name=data.get('instructor_name', ''),
                instructor_bio=data.get('instructor_bio', ''),
                author=request.user,
                course_type=course_type,
            )
            if not self._is_course_creator() and data.get('author_id'):
                course.author = User.objects.get(id=data.get('author_id'), role='course_creator')
            self._apply_course_data(course, data, COURSE_ADMIN_WRITE_FIELDS)
            course.is_active = False
            course.status = 'draft'
            if self._is_course_creator():
                course.author = request.user
            course.save()
            return Response(self._serialize_course(course), status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        """Получить один курс."""
        try:
            course = Course.objects.get(id=pk)
            if self._is_course_creator() and course.author_id != request.user.id:
                return Response(
                    {'error': 'Вы можете смотреть только свои курсы'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return Response(self._serialize_course(course))
        except Course.DoesNotExist:
            return Response({'error': 'Курс не найден'}, status=status.HTTP_404_NOT_FOUND)

    def update(self, request, pk=None):
        """Обновить курс (PUT)."""
        return self._do_update(request, pk)

    def partial_update(self, request, pk=None):
        """Частичное обновление курса (PATCH)."""
        return self._do_update(request, pk)

    def _do_update(self, request, pk):
        try:
            course = Course.objects.get(id=pk)

            # Создатели курсов могут редактировать только свои курсы
            if self._is_course_creator() and course.author_id != request.user.id:
                return Response(
                    {'error': 'Вы можете редактировать только свои курсы'},
                    status=status.HTTP_403_FORBIDDEN,
                )

            allowed_fields = list(COURSE_ADMIN_WRITE_FIELDS)

            # Создатели курсов не могут менять статус и is_active
            if self._is_course_creator():
                allowed_fields = [
                    f for f in allowed_fields
                    if f not in ('status', 'is_active', 'review_status', 'review_notes', 'author_id')
                ]

            self._apply_course_data(course, request.data, allowed_fields)
            course.save()
            return Response(self._serialize_course(course))
        except Course.DoesNotExist:
            return Response({'error': 'Курс не найден'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        """Удалить курс. Только для администраторов."""
        if self._is_course_creator():
            return Response(
                {'error': 'Создатели курсов не могут удалять курсы'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            course = Course.objects.get(id=pk)
            course.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'], url_path='publish-check')
    def publish_check(self, request, pk=None):
        """Проверка готовности курса к публикации."""
        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({'error': 'Курс не найден'}, status=status.HTTP_404_NOT_FOUND)

        if self._is_course_creator() and course.author_id != request.user.id:
            return Response(
                {'error': 'Вы можете проверять только свои курсы'},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(course.get_behavior_correction_publish_check(request.user))

    @action(detail=True, methods=['post'], url_path='submit-for-review')
    def submit_for_review(self, request, pk=None):
        """Отправить курс на проверку."""
        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({'error': 'Курс не найден'}, status=status.HTTP_404_NOT_FOUND)

        if self._is_course_creator() and course.author_id != request.user.id:
            return Response(
                {'error': 'Вы можете отправлять на проверку только свои курсы'},
                status=status.HTTP_403_FORBIDDEN,
            )

        course.review_status = 'in_review'
        course.save(update_fields=['review_status', 'updated_at'])
        return Response(self._serialize_course(course))

    @action(detail=True, methods=['post'], url_path='request-changes')
    def request_changes(self, request, pk=None):
        """Вернуть курс автору на доработку."""
        if self._is_course_creator():
            return Response({'error': 'Недостаточно прав'}, status=status.HTTP_403_FORBIDDEN)

        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({'error': 'Курс не найден'}, status=status.HTTP_404_NOT_FOUND)

        course.review_status = 'changes_requested'
        course.review_notes = request.data.get('review_notes', course.review_notes or '')
        course.save(update_fields=['review_status', 'review_notes', 'updated_at'])
        return Response(self._serialize_course(course))

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Одобрить курс после проверки."""
        if self._is_course_creator():
            return Response({'error': 'Недостаточно прав'}, status=status.HTTP_403_FORBIDDEN)

        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({'error': 'Курс не найден'}, status=status.HTTP_404_NOT_FOUND)

        course.review_status = 'approved'
        course.review_notes = request.data.get('review_notes', course.review_notes or '')
        course.save(update_fields=['review_status', 'review_notes', 'updated_at'])
        return Response(self._serialize_course(course))

    @action(detail=True, methods=['get'], url_path='students')
    def students(self, request, pk=None):
        """Реальные пользователи и питомцы, проходящие курс."""
        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({'error': 'Курс не найден'}, status=status.HTTP_404_NOT_FOUND)

        if self._is_course_creator() and course.author_id != request.user.id:
            return Response({'error': 'Недостаточно прав'}, status=status.HTTP_403_FORBIDDEN)

        enrollments = (
            UserCourse.objects
            .filter(course=course)
            .select_related('user', 'pet', 'pet__breed')
            .order_by('-purchased_at')
        )
        progress_by_key = {
            (progress.user_id, progress.pet_id): progress
            for progress in UserCourseProgress.objects.filter(course=course)
        }

        data = []
        for enrollment in enrollments:
            progress = progress_by_key.get((enrollment.user_id, enrollment.pet_id))
            pet = enrollment.pet
            user_name = ' '.join(
                part for part in [
                    getattr(enrollment.user, 'first_name', ''),
                    getattr(enrollment.user, 'last_name', ''),
                ] if part
            ) or enrollment.user.email
            data.append({
                'id': enrollment.id,
                'user_id': str(enrollment.user_id),
                'user_email': enrollment.user.email,
                'user_name': user_name,
                'pet': {
                    'id': str(pet.id),
                    'name': pet.name,
                    'species': pet.species,
                    'breed_name': pet.breed.name if pet.breed else None,
                    'age_months': pet.age_months,
                    'behavioral_problems': getattr(pet, 'behavioral_problems', []) or [],
                } if pet else None,
                'purchased_at': enrollment.purchased_at.isoformat() if enrollment.purchased_at else None,
                'progress': progress.progress_percent if progress else enrollment.progress,
                'status': progress.status if progress else 'not_started',
                'last_activity_at': progress.last_activity_at.isoformat() if progress and progress.last_activity_at else None,
            })

        return Response({
            'count': len(data),
            'results': data,
        })

    @action(detail=True, methods=['get'], url_path='analytics')
    def analytics(self, request, pk=None):
        """Базовая аналитика курса только по реальным данным."""
        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({'error': 'Курс не найден'}, status=status.HTTP_404_NOT_FOUND)

        if self._is_course_creator() and course.author_id != request.user.id:
            return Response({'error': 'Недостаточно прав'}, status=status.HTTP_403_FORBIDDEN)

        enrollments = UserCourse.objects.filter(course=course)
        progress_qs = UserCourseProgress.objects.filter(course=course)
        total_students = enrollments.count()
        total_pets = enrollments.exclude(pet__isnull=True).values('pet_id').distinct().count()
        completed = progress_qs.filter(status='completed').count()
        avg_progress = progress_qs.aggregate(value=Avg('progress_percent'))['value'] or 0

        return Response({
            'students_count': total_students,
            'pets_count': total_pets,
            'completed_count': completed,
            'completion_rate': round(float(avg_progress), 1),
            'in_progress_count': progress_qs.filter(status='in_progress').count(),
            'not_started_count': max(total_students - progress_qs.exclude(status='not_started').count(), 0),
            'revenue': None,
            'revenue_note': 'Выручка не рассчитана: в модели курса нет отдельной подтвержденной оплаты курса',
        })


@api_view(['GET'])
@permission_classes([IsAdminUser])
@cached_stats_summary
def admin_stats_summary(request):
    """Краткая сводка статистики для быстрого просмотра."""
    return Response({
        'timestamp': timezone.now().isoformat(),
        'summary': {
            'users': User.objects.count(),
            'pets': Pet.objects.count(),
            'products': Product.objects.count(),
            'orders_today': Order.objects.filter(
                created_at__date=timezone.now().date()
            ).count(),
            'revenue_today': float(Order.objects.filter(
                created_at__date=timezone.now().date(),
                status__in=['processing', 'shipped', 'delivered']
            ).aggregate(total=Sum('total_amount'))['total'] or 0),
        }
    })
