"""
Сервисы для работы с заказами
"""

import logging
from django.utils import timezone
from django.db import transaction
from apps.shop.models import Order, OrderItem
from apps.payments.models import Payment

logger = logging.getLogger('apps.shop')


def process_expired_orders():
    """
    Обработка просроченных заказов.
    
    Находит все заказы со статусом 'pending', у которых истек срок оплаты,
    и выполняет следующие действия:
    1. Возвращает товары на склад
    2. Меняет статус заказа на 'expired'
    3. Отменяет связанные платежи (если есть)
    
    Returns:
        dict: Статистика обработки
    """
    now = timezone.now()
    
    # Находим просроченные заказы
    expired_orders = Order.objects.filter(
        status='pending',
        expires_at__isnull=False,
        expires_at__lt=now
    ).select_related('user').prefetch_related('items__product')
    
    stats = {
        'processed': 0,
        'products_returned': 0,
        'errors': 0
    }
    
    for order in expired_orders:
        try:
            with transaction.atomic():
                # Возвращаем товары на склад
                for order_item in order.items.filter(product__isnull=False):
                    product = order_item.product
                    product.stock_count += order_item.quantity
                    if product.stock_count > 0 and not product.in_stock:
                        product.in_stock = True
                    product.save()
                    stats['products_returned'] += 1
                    logger.info(f"Товар возвращен на склад: {product.name}, количество: {order_item.quantity}")
                
                # Меняем статус заказа
                order.status = 'expired'
                order.save()
                
                # Отменяем связанные платежи (если есть)
                payments = Payment.objects.filter(
                    payment_type='shop_order',
                    object_id=str(order.id),
                    status__in=['pending', 'processing']
                )
                
                for payment in payments:
                    payment.status = 'cancelled'
                    if not payment.metadata:
                        payment.metadata = {}
                    payment.metadata['cancellation_reason'] = 'Истек срок оплаты заказа'
                    payment.save()
                    logger.info(f"Платеж отменен: {payment.id}")
                
                stats['processed'] += 1
                logger.info(f"Заказ помечен как просроченный: {order.id}")
                
        except Exception as e:
            stats['errors'] += 1
            logger.error(f"Ошибка при обработке просроченного заказа {order.id}: {str(e)}")
    
    logger.info(f"Обработано просроченных заказов: {stats['processed']}, товаров возвращено: {stats['products_returned']}, ошибок: {stats['errors']}")
    
    return stats

