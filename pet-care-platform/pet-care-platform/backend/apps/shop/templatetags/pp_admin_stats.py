"""
Простые теги для реальной статистики на дашборде админки.
Все запросы обёрнуты в try/except — статистика никогда не должна ронять админку.
"""

from django import template
from django.db.models import Sum
from django.utils import timezone

register = template.Library()


def _today():
    return timezone.localdate()


@register.simple_tag
def pp_orders_today():
    try:
        from apps.shop.models import Order
        return Order.objects.filter(created_at__date=_today()).count()
    except Exception:
        return 0


@register.simple_tag
def pp_revenue_today():
    """Выручка за сегодня (целые рубли, с пробелами как разделителями тысяч)."""
    try:
        from apps.shop.models import Order
        total = (
            Order.objects.filter(created_at__date=_today())
            .exclude(status__in=["cancelled", "canceled"])
            .aggregate(s=Sum("total_amount"))["s"]
            or 0
        )
        return f"{int(total):,}".replace(",", " ")
    except Exception:
        return "0"


@register.simple_tag
def pp_new_users_today():
    try:
        from apps.users.models import User
        return User.objects.filter(created_at__date=_today()).count()
    except Exception:
        return 0


@register.simple_tag
def pp_pending_orders():
    try:
        from apps.shop.models import Order
        return Order.objects.filter(status="pending").count()
    except Exception:
        return 0


@register.simple_tag
def pp_attention_count():
    """Сколько всего требует внимания: новые заказы + новые возвраты."""
    try:
        from apps.shop.models import Order
        n = Order.objects.filter(status="pending").count()
        try:
            from apps.shop.models import Return
            n += Return.objects.filter(status="requested").count()
        except Exception:
            pass
        return n
    except Exception:
        return 0


@register.simple_tag
def pp_total_pets():
    try:
        from apps.pets.models import Pet
        return Pet.objects.count()
    except Exception:
        return 0


@register.simple_tag
def pp_total_users():
    try:
        from apps.users.models import User
        return User.objects.count()
    except Exception:
        return 0
