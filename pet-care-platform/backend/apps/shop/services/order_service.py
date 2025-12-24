"""
OrderService - сервис для работы с заказами.

Централизует бизнес-логику заказов:
- Создание заказов из корзины
- Валидация и резервирование
- Активация после оплаты
- Обработка просроченных заказов
"""

import logging
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from decimal import Decimal
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.shop.models import Order, OrderItem, Cart, Address
from apps.payments.models import Payment

logger = logging.getLogger('apps.shop')


@dataclass
class OrderResult:
    """Результат создания заказа."""
    success: bool
    message: str
    order: Optional[Order] = None
    payment: Optional[Payment] = None
    error_code: Optional[str] = None
    errors: Optional[List[str]] = None


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


class OrderService:
    """
    Сервис для работы с заказами.
    
    Предоставляет методы для:
    - Создания заказов из корзины
    - Валидации элементов
    - Резервирования товаров
    - Активации после оплаты
    """
    
    # Время жизни заказа (минуты)
    ORDER_EXPIRY_MINUTES = 10
    
    # Стоимость доставки по типам
    DELIVERY_COSTS = {
        'standard': Decimal('300.00'),
        'express': Decimal('600.00'),
        'pickup': Decimal('0.00'),
    }
    
    @classmethod
    def calculate_delivery_cost(cls, delivery_type: str) -> Decimal:
        """Получить стоимость доставки."""
        return cls.DELIVERY_COSTS.get(delivery_type, Decimal('0.00'))
    
    @classmethod
    def get_address(cls, user, address_id: Optional[str] = None,
                    shipping_address: Optional[str] = None) -> Tuple[Optional[Address], str]:
        """
        Получить адрес доставки.
        
        Args:
            user: Пользователь
            address_id: ID сохранённого адреса
            shipping_address: Текстовый адрес
            
        Returns:
            Tuple[Address, str]: Объект адреса и текстовое представление
        """
        address = None
        address_text = ''
        
        if address_id:
            try:
                address = Address.objects.get(id=address_id, user=user)
                address_text = address.full_address
            except Address.DoesNotExist:
                pass
        
        if not address_text and shipping_address:
            address_text = shipping_address.strip()
        
        return address, address_text
    
    @classmethod
    @transaction.atomic
    def create_order_from_cart(
        cls,
        user,
        cart_items: List,
        delivery_type: str = 'standard',
        address_id: Optional[str] = None,
        shipping_address: Optional[str] = None,
        recipient_name: Optional[str] = None,
        recipient_phone: Optional[str] = None,
        courses_disclaimer_accepted: bool = False
    ) -> OrderResult:
        """
        Создать заказ из элементов корзины.
        
        Args:
            user: Пользователь
            cart_items: Список элементов корзины
            delivery_type: Тип доставки
            address_id: ID адреса
            shipping_address: Текстовый адрес
            recipient_name: Имя получателя
            recipient_phone: Телефон получателя
            courses_disclaimer_accepted: Согласие с условиями курсов
            
        Returns:
            OrderResult: Результат создания
        """
        from .reservation_service import ReservationService
        from .cart_service import CartService
        from apps.payments.services import PaymentService
        from apps.training.models import Course
        
        # Разделяем элементы на товары и курсы
        product_items = [item for item in cart_items if item.product]
        course_items = [item for item in cart_items if item.course]
        
        has_products = len(product_items) > 0
        has_courses = len(course_items) > 0
        
        # Валидация
        errors = []
        
        if not cart_items:
            return OrderResult(
                success=False,
                message='Корзина пуста',
                error_code='EMPTY_CART'
            )
        
        # Валидация доставки для товаров
        if has_products:
            if delivery_type not in ['standard', 'express', 'pickup']:
                errors.append('Неверный тип доставки')
            
            if delivery_type != 'pickup':
                address, address_text = cls.get_address(user, address_id, shipping_address)
                if not address_text:
                    errors.append('Необходимо указать адрес доставки')
            else:
                address = None
                address_text = 'Самовывоз'
        
        # Валидация согласия для платных курсов
        if has_courses:
            paid_courses = [item for item in course_items if item.course.price > 0]
            if paid_courses and not courses_disclaimer_accepted:
                errors.append('Необходимо принять условия для курсов')
        
        if errors:
            return OrderResult(
                success=False,
                message='Ошибки валидации',
                error_code='VALIDATION_ERROR',
                errors=errors
            )
        
        try:
            # Создаём резервирования для товаров
            reservations = []
            if product_items:
                try:
                    reservations = ReservationService.create_reservations_from_items(user, product_items)
                except ValueError as e:
                    return OrderResult(
                        success=False,
                        message=str(e),
                        error_code='RESERVATION_ERROR'
                    )
            
            # Вычисляем суммы
            subtotal = Decimal('0.00')
            for item in cart_items:
                subtotal += Decimal(str(item.get_total()))
            
            delivery_cost = cls.calculate_delivery_cost(delivery_type) if has_products else Decimal('0.00')
            total = subtotal + delivery_cost
            
            # Создаём заказ
            order = Order.objects.create(
                user=user,
                subtotal_amount=subtotal,
                delivery_cost=delivery_cost,
                total_amount=total,
                shipping_address=address_text if has_products else '',
                address=address if has_products else None,
                delivery_type=delivery_type if has_products else 'pickup',
                recipient_name=recipient_name or user.get_full_name() or user.email,
                recipient_phone=recipient_phone or user.phone or '',
                status='pending',
                expires_at=timezone.now() + timedelta(minutes=cls.ORDER_EXPIRY_MINUTES)
            )
            
            # Создаём элементы заказа
            for item in cart_items:
                if item.product:
                    OrderItem.objects.create(
                        order=order,
                        product=item.product,
                        product_name=item.product.name,
                        price=item.product.discounted_price,
                        quantity=item.quantity
                    )
                elif item.course:
                    OrderItem.objects.create(
                        order=order,
                        course=item.course,
                        product_name=item.course.title,
                        price=item.course.effective_price,
                        quantity=1,
                        disclaimer_accepted=item.disclaimer_accepted or courses_disclaimer_accepted,
                        pet=item.pet
                    )
            
            # Создаём платёж
            payment = PaymentService.create_payment(
                user=user,
                amount=float(total),
                payment_type='unified_checkout',
                object_id=str(order.id),
                metadata={
                    'has_products': has_products,
                    'has_courses': has_courses,
                    'products_count': len(product_items),
                    'courses_count': len(course_items),
                    'delivery_type': delivery_type,
                    'reservation_ids': [str(r.id) for r in reservations]
                }
            )
            
            # Удаляем элементы из корзины
            cart = Cart.objects.filter(user=user).first()
            if cart:
                for item in cart_items:
                    item.delete()
            
            logger.info(f"Заказ создан: {order.id}, сумма: {total}")
            
            return OrderResult(
                success=True,
                message='Заказ создан успешно',
                order=order,
                payment=payment
            )
            
        except Exception as e:
            logger.error(f"Ошибка создания заказа: {str(e)}")
            
            # Отменяем резервирования
            if reservations:
                ReservationService.cancel_reservations(reservations)
            
            return OrderResult(
                success=False,
                message=f'Ошибка создания заказа: {str(e)}',
                error_code='CREATION_ERROR'
            )
    
    @classmethod
    @transaction.atomic
    def activate_order(cls, order: Order) -> bool:
        """
        Активировать заказ после успешной оплаты.
        
        - Меняет статус на 'processing'
        - Активирует доступ к курсам
        - Обновляет счётчики покупок
        
        Args:
            order: Объект заказа
            
        Returns:
            bool: Успех операции
        """
        from apps.training.models import UserCourse
        
        try:
            # Обновляем статус заказа
            order.status = 'processing'
            order.expires_at = None
            order.save()
            
            # Обрабатываем элементы
            for item in order.items.all():
                if item.product:
                    # Увеличиваем счётчик покупок товара
                    item.product.order_count += item.quantity
                    item.product.save()
                    
                    logger.info(f"Товар куплен: {item.product.name}, количество: {item.quantity}")
                    
                elif item.course:
                    # Активируем доступ к курсу
                    UserCourse.objects.get_or_create(
                        user=order.user,
                        course=item.course,
                        defaults={
                            'pet': item.pet,
                            'progress': 0
                        }
                    )
                    
                    # Увеличиваем счётчик покупок курса
                    item.course.order_count += 1
                    item.course.save()
                    
                    logger.info(f"Курс активирован: {item.course.title}")
            
            logger.info(f"Заказ активирован: {order.id}")
            return True
            
        except Exception as e:
            logger.error(f"Ошибка активации заказа {order.id}: {str(e)}")
            return False
    
    @classmethod
    @transaction.atomic
    def cancel_order(cls, order: Order, reason: str = '') -> bool:
        """
        Отменить заказ.
        
        - Возвращает товары на склад
        - Меняет статус на 'cancelled'
        - Отменяет платежи
        
        Args:
            order: Объект заказа
            reason: Причина отмены
            
        Returns:
            bool: Успех операции
        """
        if order.status not in ['pending', 'processing']:
            return False
        
        try:
            # Возвращаем товары на склад
            for item in order.items.filter(product__isnull=False):
                product = item.product
                product.stock_count += item.quantity
                product.in_stock = True
                product.save()
                
                logger.info(f"Товар возвращён: {product.name}, количество: {item.quantity}")
            
            # Обновляем статус
            order.status = 'cancelled'
            order.save()
            
            # Отменяем платежи
            Payment.objects.filter(
                object_id=str(order.id),
                status__in=['pending', 'processing']
            ).update(
                status='cancelled'
            )
            
            logger.info(f"Заказ отменён: {order.id}, причина: {reason}")
            return True
            
        except Exception as e:
            logger.error(f"Ошибка отмены заказа {order.id}: {str(e)}")
            return False
    
    @classmethod
    def get_order_details(cls, order: Order) -> Dict[str, Any]:
        """
        Получить детали заказа для API.
        
        Args:
            order: Объект заказа
            
        Returns:
            Dict: Данные заказа
        """
        items = []
        
        for item in order.items.select_related('product', 'course', 'pet').all():
            item_data = {
                'id': item.id,
                'product_name': item.product_name,
                'price': float(item.price),
                'quantity': item.quantity,
                'total': float(item.get_total()),
            }
            
            if item.product:
                item_data['product_id'] = item.product.id
                item_data['product'] = item.product.to_dict()
            
            if item.course:
                item_data['course_id'] = item.course.id
                item_data['course'] = item.course.to_dict()
                item_data['disclaimer_accepted'] = item.disclaimer_accepted
                
                if item.pet:
                    item_data['pet'] = {
                        'id': str(item.pet.id),
                        'name': item.pet.name,
                        'species': item.pet.species,
                    }
            
            items.append(item_data)
        
        return {
            'id': str(order.id),
            'user_id': str(order.user.id) if order.user else None,
            'status': order.status,
            'status_display': order.get_status_display(),
            'items': items,
            'subtotal_amount': float(order.subtotal_amount),
            'delivery_cost': float(order.delivery_cost),
            'total_amount': float(order.total_amount),
            'delivery_type': order.delivery_type,
            'delivery_type_display': order.get_delivery_type_display(),
            'shipping_address': order.shipping_address,
            'address': order.address.to_dict() if order.address else None,
            'recipient_name': order.recipient_name,
            'recipient_phone': order.recipient_phone,
            'created_at': order.created_at.isoformat(),
            'expires_at': order.expires_at.isoformat() if order.expires_at else None,
            'has_products': any(item.product for item in order.items.all()),
            'has_courses': any(item.course for item in order.items.all()),
        }


# Сокращённый импорт
order_service = OrderService()
