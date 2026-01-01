"""
Кастомные административные представления для дашборда и аналитики.
"""

from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render
from django.db.models import Sum, Count, Avg, F, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import Product, Order, OrderItem


@staff_member_required
def admin_dashboard(request):
    """
    Главный дашборд администратора с ключевыми метриками.
    """
    from apps.users.models import User
    from apps.pets.models import Pet
    from apps.training.models import Course, UserCourse
    from apps.payments.models import Payment
    from apps.reviews.models import Review
    # from apps.calendar.models import CalendarEvent  # Временно отключено

    today = timezone.now()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    yesterday = today - timedelta(days=1)

    # Общие метрики
    total_users = User.objects.count()
    active_users = User.objects.filter(last_login__gte=week_ago).count()
    new_users_week = User.objects.filter(created_at__gte=week_ago).count()
    new_users_yesterday = User.objects.filter(created_at__date=yesterday.date()).count()

    total_pets = Pet.objects.count()
    pets_with_health_issues = Pet.objects.exclude(health_issues=[]).count()
    new_pets_week = Pet.objects.filter(created_at__gte=week_ago).count()

    total_products = Product.objects.count()
    active_products = Product.objects.filter(is_active=True, in_stock=True).count()
    low_stock_products = Product.objects.filter(
        is_active=True,
        stock_count__gt=0,
        stock_count__lte=5
    ).count()

    total_courses = Course.objects.count()
    active_courses = Course.objects.filter(is_active=True).count()

    # Метрики заказов
    total_orders = Order.objects.count()
    pending_orders = Order.objects.filter(status='pending').count()
    processing_orders = Order.objects.filter(status='processing').count()
    delivered_orders = Order.objects.filter(status='delivered').count()

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
    failed_payments = Payment.objects.filter(status='failed').count()
    refunded_payments = Payment.objects.filter(status='refunded').count()

    payments_week_revenue = Payment.objects.filter(
        status='completed',
        created_at__gte=week_ago
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    # Метрики отзывов
    total_reviews = Review.objects.count()
    approved_reviews = Review.objects.filter(is_approved=True).count()
    pending_reviews = Review.objects.filter(is_approved=False).count()
    avg_rating = Review.objects.filter(is_approved=True).aggregate(avg=Avg('rating'))['avg'] or 0

    # Метрики календаря (временно отключены)
    total_events = 0  # CalendarEvent.objects.count()
    upcoming_events = 0  # CalendarEvent.objects.filter(start_date__gte=today.date(), status='scheduled').count()
    completed_events = 0  # CalendarEvent.objects.filter(status='completed').count()
    today_events = 0  # CalendarEvent.objects.filter(start_date=today.date(), status='scheduled').count()

    # Топ товаров
    top_products = Product.objects.filter(
        is_active=True
    ).order_by('-order_count')[:8]

    # Топ курсов
    top_courses = Course.objects.filter(
        is_active=True
    ).annotate(
        students=Count('user_courses')
    ).order_by('-students')[:5]

    # Последние заказы
    recent_orders = Order.objects.select_related('user').order_by('-created_at')[:8]

    # Последние отзывы
    recent_reviews = Review.objects.select_related('user', 'product', 'course').order_by('-created_at')[:6]

    # Распределение питомцев по видам
    pets_by_species = Pet.objects.values('species').annotate(
        count=Count('id')
    ).order_by('-count')

    # График заказов за последние 7 дней
    orders_by_day = Order.objects.filter(
        created_at__gte=week_ago
    ).annotate(
        date=TruncDate('created_at')
    ).values('date').annotate(
        count=Count('id'),
        revenue=Sum('total_amount')
    ).order_by('date')

    # График платежей за последние 7 дней
    payments_by_day = Payment.objects.filter(
        created_at__gte=week_ago,
        status='completed'
    ).annotate(
        date=TruncDate('created_at')
    ).values('date').annotate(
        revenue=Sum('amount'),
        count=Count('id')
    ).order_by('date')

    # Тренды (сравнение с предыдущим периодом)
    prev_week_start = week_ago - timedelta(days=7)
    prev_week_orders = Order.objects.filter(
        created_at__gte=prev_week_start,
        created_at__lt=week_ago
    ).count()
    orders_trend = ((orders_week_count - prev_week_orders) / max(prev_week_orders, 1)) * 100

    prev_week_revenue = Order.objects.filter(
        created_at__gte=prev_week_start,
        created_at__lt=week_ago,
        status__in=['processing', 'shipped', 'delivered']
    ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
    revenue_trend = ((orders_week_revenue - prev_week_revenue) / max(float(prev_week_revenue), 1)) * 100

    context = {
        'title': 'Панель управления',

        # Пользователи
        'total_users': total_users,
        'active_users': active_users,
        'new_users_week': new_users_week,
        'new_users_yesterday': new_users_yesterday,

        # Питомцы
        'total_pets': total_pets,
        'pets_with_health_issues': pets_with_health_issues,
        'new_pets_week': new_pets_week,
        'pets_by_species': list(pets_by_species),

        # Товары
        'total_products': total_products,
        'active_products': active_products,
        'low_stock_products': low_stock_products,

        # Курсы
        'total_courses': total_courses,
        'active_courses': active_courses,
        'top_courses': top_courses,

        # Заказы
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'processing_orders': processing_orders,
        'delivered_orders': delivered_orders,
        'orders_week_count': orders_week_count,
        'orders_week_revenue': orders_week_revenue,
        'orders_month_count': orders_month_count,
        'orders_month_revenue': orders_month_revenue,
        'avg_order_value': avg_order_value,

        # Платежи
        'total_payments': total_payments,
        'successful_payments': successful_payments,
        'failed_payments': failed_payments,
        'refunded_payments': refunded_payments,
        'payments_week_revenue': payments_week_revenue,

        # Отзывы
        'total_reviews': total_reviews,
        'approved_reviews': approved_reviews,
        'pending_reviews': pending_reviews,
        'avg_rating': avg_rating,
        'recent_reviews': recent_reviews,

        # Календарь
        'total_events': total_events,
        'upcoming_events': upcoming_events,
        'completed_events': completed_events,
        'today_events': today_events,

        # Тренды
        'orders_trend': orders_trend,
        'revenue_trend': revenue_trend,

        # Топы и последние
        'top_products': top_products,
        'recent_orders': recent_orders,
        'orders_by_day': list(orders_by_day),
        'payments_by_day': list(payments_by_day),
    }

    return render(request, 'admin/dashboard.html', context)


@staff_member_required
def recommendation_settings(request):
    """
    Настройки системы рекомендаций.
    """
    from apps.pets.services import HEALTH_ISSUE_PRODUCT_CATEGORIES
    
    if request.method == 'POST':
        # Здесь можно добавить обработку сохранения настроек
        pass
    
    context = {
        'title': 'Настройки рекомендаций',
        'health_issue_categories': HEALTH_ISSUE_PRODUCT_CATEGORIES,
    }
    
    return render(request, 'admin/recommendation_settings.html', context)


@staff_member_required
def payment_analytics(request):
    """
    Аналитика платежей и финансов.
    """
    from apps.payments.models import Payment
    from apps.shop.models import Order, Return
    from decimal import Decimal

    today = timezone.now()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Общие метрики платежей
    total_payments = Payment.objects.count()
    total_amount = Payment.objects.filter(status='completed').aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')

    # Метрики по статусам
    status_stats = Payment.objects.values('status').annotate(
        count=Count('id'),
        amount=Sum('amount')
    ).order_by('-count')

    # Метрики по методам оплаты
    method_stats = Payment.objects.values('payment_method').annotate(
        count=Count('id'),
        amount=Sum('amount')
    ).order_by('-amount')

    # Метрики по типам платежей
    type_stats = Payment.objects.values('payment_type').annotate(
        count=Count('id'),
        amount=Sum('amount')
    ).order_by('-amount')

    # Динамика платежей за последние 30 дней
    payments_by_day = Payment.objects.filter(
        created_at__gte=month_ago,
        status='completed'
    ).annotate(
        date=TruncDate('created_at')
    ).values('date').annotate(
        count=Count('id'),
        amount=Sum('amount')
    ).order_by('date')

    # Возвраты
    total_returns = Return.objects.count()
    approved_returns = Return.objects.filter(status='approved').count()
    refunded_returns = Return.objects.filter(status='refunded').count()
    returns_amount = Return.objects.filter(status='refunded').aggregate(
        total=Sum('refund_amount')
    )['total'] or Decimal('0')

    # Последние платежи
    recent_payments = Payment.objects.select_related('user').order_by('-created_at')[:15]

    # Последние возвраты
    recent_returns = Return.objects.select_related('user', 'order').order_by('-requested_at')[:10]

    # Топ пользователей по тратам
    top_spenders = Payment.objects.filter(
        status='completed'
    ).values('user__email', 'user__first_name', 'user__last_name').annotate(
        total_spent=Sum('amount'),
        payments_count=Count('id')
    ).order_by('-total_spent')[:10]

    # Конверсия платежей
    total_initiated = Payment.objects.count()
    total_completed = Payment.objects.filter(status='completed').count()
    conversion_rate = (total_completed / total_initiated * 100) if total_initiated > 0 else 0

    # Средние суммы
    avg_payment = Payment.objects.filter(status='completed').aggregate(
        avg=Avg('amount')
    )['avg'] or Decimal('0')

    # Платежи по дням недели
    payments_by_weekday = Payment.objects.filter(
        status='completed',
        created_at__gte=month_ago
    ).annotate(
        weekday=TruncDate('created_at')
    ).extra(select={'day_of_week': 'EXTRACT(DOW FROM created_at)'}).values(
        'day_of_week'
    ).annotate(
        count=Count('id'),
        amount=Sum('amount')
    ).order_by('day_of_week')

    context = {
        'title': 'Аналитика платежей',
        'total_payments': total_payments,
        'total_amount': total_amount,
        'status_stats': list(status_stats),
        'method_stats': list(method_stats),
        'type_stats': list(type_stats),
        'payments_by_day': list(payments_by_day),
        'total_returns': total_returns,
        'approved_returns': approved_returns,
        'refunded_returns': refunded_returns,
        'returns_amount': returns_amount,
        'recent_payments': recent_payments,
        'recent_returns': recent_returns,
        'top_spenders': list(top_spenders),
        'conversion_rate': conversion_rate,
        'avg_payment': avg_payment,
        'payments_by_weekday': list(payments_by_weekday),
    }

    return render(request, 'admin/payment_analytics.html', context)


@staff_member_required
def pet_analytics(request):
    """
    Аналитика по питомцам и PetID.
    """
    from apps.pets.models import Pet

    # Распределение по видам
    species_stats = Pet.objects.values('species').annotate(
        count=Count('id')
    ).order_by('-count')

    # Распределение по полу
    gender_stats = Pet.objects.values('gender').annotate(
        count=Count('id')
    ).order_by('-count')

    # Распределение по уровню активности
    activity_stats = Pet.objects.values('activity_level').annotate(
        count=Count('id')
    ).order_by('-count')

    # Проблемы здоровья
    # Сложнее, т.к. это JSONField
    pets_with_issues = Pet.objects.exclude(health_issues=[])

    # Питомцы с аллергиями
    pets_with_allergies = Pet.objects.exclude(allergies=[]).count()

    # Стерилизованные
    neutered_stats = Pet.objects.values('is_neutered').annotate(
        count=Count('id')
    )

    context = {
        'title': 'Аналитика PetID',
        'species_stats': list(species_stats),
        'gender_stats': list(gender_stats),
        'activity_stats': list(activity_stats),
        'pets_with_issues_count': pets_with_issues.count(),
        'pets_with_allergies': pets_with_allergies,
        'neutered_stats': list(neutered_stats),
        'total_pets': Pet.objects.count(),
    }

    return render(request, 'admin/pet_analytics.html', context)

