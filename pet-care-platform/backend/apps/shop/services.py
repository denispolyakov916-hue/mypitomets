"""
=============================================================================
СЕРВИСЫ МОДУЛЯ МАГАЗИНА
=============================================================================

Файл объединяет всю бизнес-логику магазина в одном месте.

СОДЕРЖИМОЕ:
- CartService: работа с корзиной (добавление, удаление, обновление)
- OrderService: создание и управление заказами  
- ReservationService: резервирование товаров на складе
- RecommendationEngine: интеллектуальные рекомендации товаров

ИСПОЛЬЗУЕТСЯ В:
- apps/shop/views.py → все views корзины и заказов
- apps/payments/services.py → при обработке платежей
- Celery tasks → обработка просроченных заказов

ПАТТЕРНЫ:
- Все сервисы наследуют BaseService из core.services
- Используют ServiceResult для унифицированного возврата результатов
- Транзакционная атомарность для операций с деньгами
=============================================================================
"""

import logging
from typing import Optional, Dict, Any, List, Set, Tuple
from dataclasses import dataclass, field
from decimal import Decimal
from datetime import timedelta
from collections import defaultdict

logger = logging.getLogger('apps.shop')

from django.db import transaction
from django.db.models import Count, Q, Avg
from django.utils import timezone
from django.core.cache import cache
from django.core.exceptions import ValidationError

from core.services import BaseService, BaseCRUDService, ServiceResult
from core.constants import RESERVATION_TIMEOUT_MINUTES, DELIVERY_COSTS

logger = logging.getLogger('apps.shop')


# =============================================================================
# DATACLASSES
# =============================================================================

@dataclass
class CartSummary:
    """Сводка по корзине."""
    products_count: int
    products_total: Decimal
    courses_count: int
    courses_total: Decimal
    total_items: int
    total_amount: Decimal
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'products_count': self.products_count,
            'products_total': float(self.products_total),
            'courses_count': self.courses_count,
            'courses_total': float(self.courses_total),
            'total_items': self.total_items,
            'total_amount': float(self.total_amount),
        }


@dataclass
class RecommendationItem:
    """Элемент рекомендации."""
    product_id: int
    product_data: Dict[str, Any]
    score: float
    reason: str
    reason_type: str  # 'frequently_bought', 'category_link', 'popular', 'pet_match'


@dataclass
class RecommendationResult:
    """Результат генерации рекомендаций."""
    items: List[RecommendationItem] = field(default_factory=list)
    source_product_id: Optional[int] = None
    total_analyzed_orders: int = 0
    
    def to_list(self) -> List[Dict[str, Any]]:
        """Преобразование в список для API."""
        return [
            {
                'id': item.product_id,
                'score': round(item.score, 2),
                'reason': item.reason,
                'reason_type': item.reason_type,
                **item.product_data
            }
            for item in self.items
        ]


# =============================================================================
# CART SERVICE
# =============================================================================

class CartService(BaseService):
    """
    Сервис для работы с корзиной пользователя.
    
    Методы:
    - get_or_create_cart(user) - получить/создать корзину
    - get_cart_items(user, item_type) - получить элементы
    - get_cart_summary(user) - получить сводку
    - add_product(user, product_id, quantity) - добавить товар
    - add_course(user, course_id, pet_id, disclaimer_accepted) - добавить курс
    - update_product_quantity(user, product_id, quantity/delta) - обновить количество
    - remove_item(user, product_id/course_id) - удалить элемент
    - clear_cart(user, item_type) - очистить корзину
    - validate_cart_for_checkout(user, selected_item_ids) - валидация перед оформлением
    - get_cart_data(user) - полные данные для API
    """
    
    @staticmethod
    def get_or_create_cart(user):
        """Получить или создать корзину пользователя."""
        from apps.shop.models import Cart
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart
    
    @classmethod
    def get_cart_items(cls, user, item_type: str = 'all') -> List[Any]:
        """Получить элементы корзины (all/products/courses)."""
        cart = cls.get_or_create_cart(user)
        items = cart.items.select_related('product', 'course', 'pet').order_by('id')
        
        if item_type == 'products':
            items = items.filter(product__isnull=False)
        elif item_type == 'courses':
            items = items.filter(course__isnull=False)
        
        return list(items)
    
    @classmethod
    def get_cart_summary(cls, user) -> CartSummary:
        """Получить сводку по корзине."""
        items = cls.get_cart_items(user)
        
        products_count = 0
        products_total = Decimal('0.00')
        courses_count = 0
        courses_total = Decimal('0.00')
        
        for item in items:
            if item.product:
                products_count += item.quantity
                products_total += Decimal(str(item.get_total()))
            elif item.course:
                courses_count += 1
                courses_total += Decimal(str(item.get_total()))
        
        return CartSummary(
            products_count=products_count,
            products_total=products_total,
            courses_count=courses_count,
            courses_total=courses_total,
            total_items=products_count + courses_count,
            total_amount=products_total + courses_total
        )
    
    @classmethod
    @transaction.atomic
    def add_product(cls, user, product_id: int, quantity: int = 1) -> ServiceResult:
        """Добавить товар в корзину."""
        from apps.shop.models import Product, CartItem
        
        # Валидация товара
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return ServiceResult(
                success=False,
                message='Товар не найден',
                error_code='PRODUCT_NOT_FOUND'
            )
        
        # Проверка наличия
        if not product.is_available:
            return ServiceResult(
                success=False,
                message='Товар отсутствует в наличии',
                error_code='OUT_OF_STOCK'
            )
        
        cart = cls.get_or_create_cart(user)
        existing_item = cart.items.filter(product=product).first()
        
        if existing_item:
            new_quantity = existing_item.quantity + quantity
            
            existing_item.quantity = new_quantity
            existing_item.save()
            
            cls.log_info(f"Товар обновлён в корзине: {product.name}, количество: {new_quantity}")
            return ServiceResult(
                success=True,
                message='Количество товара обновлено',
                data={'item': existing_item}
            )
        else:
            item = CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=quantity
            )
            
            cls.log_info(f"Товар добавлен в корзину: {product.name}, количество: {quantity}")
            return ServiceResult(
                success=True,
                message='Товар добавлен в корзину',
                data={'item': item}
            )
    
    @classmethod
    @transaction.atomic
    def add_course(cls, user, course_id: int, pet_id: Optional[str] = None,
                   disclaimer_accepted: bool = False) -> ServiceResult:
        """Добавить курс в корзину."""
        from apps.shop.models import CartItem
        from apps.training.models import Course, UserCourse
        from apps.pets.models import Pet
        
        # Валидация курса
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return ServiceResult(
                success=False,
                message='Курс не найден или недоступен',
                error_code='COURSE_NOT_FOUND'
            )
        
        # Проверка: уже куплен?
        if UserCourse.objects.filter(user=user, course=course).exists():
            return ServiceResult(
                success=False,
                message='Вы уже приобрели этот курс',
                error_code='ALREADY_PURCHASED'
            )
        
        # Проверка согласия для платных курсов
        if course.price > 0 and not disclaimer_accepted:
            return ServiceResult(
                success=False,
                message='Необходимо принять условия использования курса',
                error_code='DISCLAIMER_REQUIRED'
            )
        
        # Валидация питомца
        pet = None
        if pet_id:
            try:
                pet = Pet.objects.get(id=pet_id, owner=user)
                
                if course.pet_type != 'all' and course.pet_type != pet.species:
                    return ServiceResult(
                        success=False,
                        message=f'Этот курс не подходит для {pet.get_species_display()}',
                        error_code='PET_TYPE_MISMATCH'
                    )
            except Pet.DoesNotExist:
                return ServiceResult(
                    success=False,
                    message='Питомец не найден',
                    error_code='PET_NOT_FOUND'
                )
        
        cart = cls.get_or_create_cart(user)
        existing_item = cart.items.filter(course=course).first()
        
        if existing_item:
            if pet and existing_item.pet != pet:
                existing_item.pet = pet
                existing_item.save()
            
            return ServiceResult(
                success=True,
                message='Курс уже в корзине',
                data={'item': existing_item}
            )
        
        item = CartItem.objects.create(
            cart=cart,
            course=course,
            pet=pet,
            quantity=1,
            disclaimer_accepted=disclaimer_accepted
        )
        
        cls.log_info(f"Курс добавлен в корзину: {course.title}, пользователь: {user.email}")
        return ServiceResult(
            success=True,
            message='Курс добавлен в корзину',
            data={'item': item}
        )
    
    @classmethod
    @transaction.atomic
    def update_product_quantity(cls, user, product_id: int, 
                                quantity: Optional[int] = None,
                                delta: Optional[int] = None) -> ServiceResult:
        """Обновить количество товара в корзине."""
        from apps.shop.models import Product
        
        cart = cls.get_or_create_cart(user)
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return ServiceResult(
                success=False,
                message='Товар не найден',
                error_code='PRODUCT_NOT_FOUND'
            )
        
        item = cart.items.filter(product=product).first()
        
        if not item:
            return ServiceResult(
                success=False,
                message='Товар не найден в корзине',
                error_code='ITEM_NOT_IN_CART'
            )
        
        # Вычисляем новое количество
        if quantity is not None:
            new_quantity = quantity
        elif delta is not None:
            new_quantity = item.quantity + delta
        else:
            return ServiceResult(
                success=False,
                message='Укажите quantity или delta',
                error_code='INVALID_PARAMS'
            )
        
        # Удаление при нулевом количестве
        if new_quantity <= 0:
            item.delete()
            cls.log_info(f"Товар удалён из корзины: {product.name}")
            return ServiceResult(
                success=True,
                message='Товар удалён из корзины'
            )
        
        item.quantity = new_quantity
        item.save()
        
        cls.log_info(f"Количество товара обновлено: {product.name}, новое количество: {new_quantity}")
        return ServiceResult(
            success=True,
            message='Количество обновлено',
            data={'item': item}
        )
    
    @classmethod
    @transaction.atomic
    def remove_item(cls, user, product_id: Optional[int] = None,
                    course_id: Optional[int] = None) -> ServiceResult:
        """Удалить элемент из корзины."""
        cart = cls.get_or_create_cart(user)
        
        if product_id:
            item = cart.items.filter(product_id=product_id).first()
            item_name = f"товар ID={product_id}"
        elif course_id:
            item = cart.items.filter(course_id=course_id).first()
            item_name = f"курс ID={course_id}"
        else:
            return ServiceResult(
                success=False,
                message='Укажите product_id или course_id',
                error_code='INVALID_PARAMS'
            )
        
        if not item:
            return ServiceResult(
                success=False,
                message='Элемент не найден в корзине',
                error_code='ITEM_NOT_IN_CART'
            )
        
        item.delete()
        cls.log_info(f"Удалён из корзины: {item_name}, пользователь: {user.email}")
        
        return ServiceResult(
            success=True,
            message='Элемент удалён из корзины'
        )
    
    @classmethod
    @transaction.atomic
    def clear_cart(cls, user, item_type: str = 'all') -> Dict[str, int]:
        """Очистить корзину (all/products/courses)."""
        cart = cls.get_or_create_cart(user)
        
        items = cart.items.all()
        
        if item_type == 'products':
            items = items.filter(product__isnull=False)
        elif item_type == 'courses':
            items = items.filter(course__isnull=False)
        
        count = items.count()
        items.delete()
        
        cls.log_info(f"Корзина очищена: {count} элементов, тип: {item_type}, пользователь: {user.email}")
        
        return {'deleted_count': count}
    
    @classmethod
    def validate_cart_for_checkout(cls, user, selected_item_ids: Optional[List[int]] = None) -> Tuple[bool, List[str], List[Any]]:
        """Валидация корзины перед оформлением заказа."""
        cart = cls.get_or_create_cart(user)
        
        if selected_item_ids:
            items = cart.items.filter(id__in=selected_item_ids).select_related('product', 'course', 'pet')
        else:
            items = cart.items.select_related('product', 'course', 'pet').all()
        
        items = list(items)
        
        if not items:
            return False, ['Корзина пуста'], []
        
        errors = []
        valid_items = []
        
        for item in items:
            if item.product:
                if not item.product.is_available:
                    errors.append(f'Товар "{item.product.name}" отсутствует в наличии')
                    continue
                
                valid_items.append(item)
                
            elif item.course:
                from apps.training.models import UserCourse
                
                if not item.course.is_active:
                    errors.append(f'Курс "{item.course.title}" недоступен')
                    continue
                
                if UserCourse.objects.filter(user=user, course=item.course).exists():
                    errors.append(f'Курс "{item.course.title}" уже приобретён')
                    continue
                
                valid_items.append(item)
        
        is_valid = len(errors) == 0 and len(valid_items) > 0
        
        return is_valid, errors, valid_items
    
    @classmethod
    def get_cart_data(cls, user) -> Dict[str, Any]:
        """Получить полные данные корзины для API."""
        items = cls.get_cart_items(user)
        summary = cls.get_cart_summary(user)
        
        products = []
        courses = []
        
        for item in items:
            item_data = {
                'id': item.id,
                'quantity': item.quantity,
                'price': float(item.get_total()),
            }
            
            if item.product:
                item_data['product'] = item.product.to_dict()
                products.append(item_data)
            elif item.course:
                item_data['course'] = item.course.to_dict(detailed=True)
                item_data['disclaimer_accepted'] = item.disclaimer_accepted
                if item.pet:
                    item_data['pet'] = {
                        'id': str(item.pet.id),
                        'name': item.pet.name,
                        'species': item.pet.species,
                        'species_display': item.pet.get_species_display(),
                    }
                courses.append(item_data)
        
        return {
            'products': products,
            'courses': courses,
            'summary': summary.to_dict(),
            'has_products': len(products) > 0,
            'has_courses': len(courses) > 0,
        }


# =============================================================================
# RESERVATION SERVICE
# =============================================================================

class ReservationService:
    """
    Сервис резервирования товаров на складе.
    
    Обеспечивает атомарное резервирование товаров при оформлении заказа.
    Использует SELECT FOR UPDATE для предотвращения race conditions.
    """

    @staticmethod
    def create_reservations_from_cart(cart):
        """Создать резервирования для всех элементов корзины."""
        return ReservationService.create_reservations_from_items(
            cart.user, list(cart.items.all())
        )

    @staticmethod
    def create_reservations_from_items(user, items):
        """Создать резервирования для выбранных элементов корзины."""
        from apps.shop.models import Reservation, Product
        
        reservations = []
        expires_at = timezone.now() + timedelta(minutes=RESERVATION_TIMEOUT_MINUTES)

        with transaction.atomic():
            for item in items:
                if item.product:
                    # Блокировка строки товара для предотвращения race condition
                    product = Product.objects.select_for_update().get(id=item.product.id)
                    
                    if not product.is_available:
                        raise ValueError(
                            f"Товар {product.name} недоступен."
                        )

                    reservation = Reservation.objects.create(
                        user=user,
                        reservation_type='product',
                        object_id=str(product.id),
                        quantity=item.quantity,
                        expires_at=expires_at
                    )

                    reservations.append(reservation)

                elif item.course:
                    reservation = Reservation.objects.create(
                        user=user,
                        reservation_type='course',
                        object_id=str(item.course.id),
                        pet_id=str(item.pet.id) if item.pet else None,
                        quantity=1,
                        expires_at=expires_at
                    )

                    reservations.append(reservation)

        return reservations

    @staticmethod
    def cancel_reservations(reservations):
        """Отменить резервирования и вернуть товары на склад."""
        with transaction.atomic():
            for reservation in reservations:
                if reservation.reservation_type == 'product':
                    pass
                reservation.delete()

    @staticmethod
    def cleanup_expired_reservations():
        """Очистить истёкшие резервирования (запускается по cron)."""
        from apps.shop.models import Reservation
        
        expired = Reservation.objects.filter(expires_at__lt=timezone.now())

        with transaction.atomic():
            for reservation in expired:
                if reservation.reservation_type == 'product':
                    pass

            expired.delete()


# =============================================================================
# ORDER SERVICE
# =============================================================================

def process_expired_orders():
    """
    Обработка просроченных заказов (запускается по cron).
    
    Находит заказы со статусом 'pending', у которых истек срок оплаты:
    1. Возвращает товары на склад
    2. Меняет статус заказа на 'expired'
    3. Отменяет связанные платежи
    """
    from apps.shop.models import Order
    from apps.payments.models import Payment
    
    now = timezone.now()
    
    expired_orders = Order.objects.filter(
        status='pending',
        expires_at__isnull=False,
        expires_at__lt=now
    ).select_related('user').prefetch_related('items__product')
    
    stats = {'processed': 0, 'products_returned': 0, 'errors': 0}
    
    for order in expired_orders:
        try:
            with transaction.atomic():
                for order_item in order.items.filter(product__isnull=False):
                    product = order_item.product
                    product.is_available = True
                    product.save(update_fields=['is_available'])
                    stats['products_returned'] += 1
                    logger.info(f"Товар возвращен на склад: {product.name}, количество: {order_item.quantity}")
                
                order.status = 'expired'
                order.save()
                
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
            logger.error(f"Ошибка обработки заказа {order.id}: {e}")
    
    logger.info(f"Обработано просроченных заказов: {stats['processed']}, товаров возвращено: {stats['products_returned']}, ошибок: {stats['errors']}")
    
    return stats


class OrderService(BaseService):
    """
    Сервис для работы с заказами.
    
    Методы:
    - create_order_from_cart() - создание заказа из корзины
    - activate_order() - активация после оплаты
    - cancel_order() - отмена заказа
    - get_order_details() - детали заказа для API
    """
    
    @classmethod
    def calculate_delivery_cost(cls, delivery_type: str) -> Decimal:
        """Получить стоимость доставки."""
        return DELIVERY_COSTS.get(delivery_type, Decimal('0.00'))
    
    @classmethod
    def get_address(cls, user, address_id: Optional[str] = None,
                    shipping_address: Optional[str] = None) -> Tuple[Optional[Any], str]:
        """Получить адрес доставки."""
        from apps.shop.models import Address
        
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
    ) -> ServiceResult:
        """Создать заказ из элементов корзины."""
        from apps.shop.models import Order, OrderItem, Cart
        from apps.payments.services import PaymentService
        
        # Разделяем элементы на товары и курсы
        product_items = [item for item in cart_items if item.product]
        course_items = [item for item in cart_items if item.course]
        
        has_products = len(product_items) > 0
        has_courses = len(course_items) > 0
        
        # Валидация
        errors = []
        
        if not cart_items:
            return ServiceResult(
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
            return ServiceResult(
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
                    cls.log_error(e, {'user_id': user.id})
                    return ServiceResult(
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
                expires_at=timezone.now() + timedelta(minutes=RESERVATION_TIMEOUT_MINUTES)
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
            
            cls.log_info(f"Заказ создан: {order.id}, сумма: {total}", {'order_id': order.id, 'user_id': user.id})
            
            return ServiceResult(
                success=True,
                message='Заказ создан успешно',
                data={'order': order, 'payment': payment}
            )
            
        except Exception as e:
            cls.log_error(e, {'user_id': user.id})
            
            if reservations:
                ReservationService.cancel_reservations(reservations)
            
            return ServiceResult(
                success=False,
                message=f'Ошибка создания заказа: {str(e)}',
                error_code='CREATION_ERROR'
            )
    
    @classmethod
    @transaction.atomic
    def activate_order(cls, order) -> bool:
        """Активировать заказ после успешной оплаты."""
        from apps.training.models import UserCourse
        
        try:
            order.status = 'processing'
            order.expires_at = None
            order.save()
            
            for item in order.items.all():
                if item.product:
                    item.product.order_count += item.quantity
                    item.product.save()
                    cls.log_info(f"Товар куплен: {item.product.name}, количество: {item.quantity}")
                    
                elif item.course:
                    UserCourse.objects.get_or_create(
                        user=order.user,
                        course=item.course,
                        defaults={
                            'pet': item.pet,
                            'progress': 0
                        }
                    )
                    
                    item.course.order_count += 1
                    item.course.save()
                    cls.log_info(f"Курс активирован: {item.course.title}")
            
            cls.log_info(f"Заказ активирован: {order.id}", {'order_id': order.id})
            return True
            
        except Exception as e:
            cls.log_error(e, {'order_id': order.id})
            return False
    
    @classmethod
    @transaction.atomic
    def cancel_order(cls, order, reason: str = '') -> bool:
        """Отменить заказ."""
        from apps.payments.models import Payment
        
        if order.status not in ['pending', 'processing']:
            return False
        
        try:
            for item in order.items.filter(product__isnull=False):
                product = item.product
                product.is_available = True
                product.save(update_fields=['is_available'])
                cls.log_info(f"Товар возвращён: {product.name}, количество: {item.quantity}")
            
            order.status = 'cancelled'
            order.save()
            
            Payment.objects.filter(
                object_id=str(order.id),
                status__in=['pending', 'processing']
            ).update(status='cancelled')
            
            cls.log_info(f"Заказ отменён: {order.id}, причина: {reason}", {'order_id': order.id, 'reason': reason})
            return True
            
        except Exception as e:
            cls.log_error(e, {'order_id': order.id, 'reason': reason})
            return False
    
    @classmethod
    def get_order_details(cls, order) -> Dict[str, Any]:
        """Получить детали заказа для API."""
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


# =============================================================================
# RECOMMENDATION ENGINE
# =============================================================================

# Правила связывания категорий товаров
# Legacy-матрицы удалены, используем иерархию Category


class RecommendationEngine:
    """
    Интеллектуальный движок рекомендаций товаров.
    
    Алгоритмы:
    1. Collaborative Filtering (на основе истории заказов)
    2. Content-Based (на основе категорий и атрибутов)
    3. PetID Matching (на основе профиля питомца)
    
    Методы:
    - get_frequently_bought_together(product_id, limit, user)
    - get_cart_recommendations(user, limit)
    - get_cross_sell_for_courses(course_id, user, limit)
    """
    
    WEIGHTS = {
        'frequently_bought': 1.0,
        'category_link': 0.6,
        'popular': 0.4,
        'pet_match': 0.8,
    }
    
    CACHE_TTL = 300  # 5 минут
    RULES_CACHE = None
    RULES_CACHE_PATH = None

    FOOD_TYPE_CODES = [
        'food.dry',
        'food.wet',
        'food.semi_moist',
        'food.canned',
        'food.pouches',
        'food.pate',
        'food.holistic',
        'food.diet',
        'food.hypoallergenic',
    ]

    @classmethod
    def _load_recommendation_rules(cls):
        if cls.RULES_CACHE is not None:
            return cls.RULES_CACHE

        try:
            from django.conf import settings
            from pathlib import Path
            rules_path = Path(settings.BASE_DIR).parent / 'docs' / '04 Магазин' / 'recommendations_rules.md'
            cls.RULES_CACHE_PATH = str(rules_path)
            if not rules_path.exists():
                cls.RULES_CACHE = {}
                return cls.RULES_CACHE

            rules = {}
            for line in rules_path.read_text(encoding='utf-8').splitlines():
                line = line.strip()
                if not line.startswith('- `'):
                    continue
                if '→' not in line:
                    continue
                try:
                    left, right = line.split('→', 1)
                    source_code = left.split('`')[1].strip()
                    target_codes = [segment.split('`')[1].strip() for segment in right.split(',') if '`' in segment]
                    if source_code and target_codes:
                        rules[source_code] = target_codes
                except Exception:
                    continue
            cls.RULES_CACHE = rules
            return rules
        except Exception:
            cls.RULES_CACHE = {}
            return cls.RULES_CACHE
    
    @classmethod
    def get_frequently_bought_together(
        cls,
        product_id: int,
        limit: int = 6,
        user=None
    ) -> RecommendationResult:
        """Получить товары, которые часто покупают вместе."""
        from apps.shop.models import Product, OrderItem
        
        try:
            # Проверяем кэш
            cache_key = f'fbt_{product_id}_{limit}'
            cached = cache.get(cache_key)
            if cached:
                return cached
            
            try:
                source_product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                return RecommendationResult()
            
            result = RecommendationResult(source_product_id=product_id)
            seen_ids: Set[int] = {product_id}
            recommendations: List[RecommendationItem] = []
            
            # 1. Анализ истории заказов
            orders_with_product = OrderItem.objects.filter(
                product_id=product_id,
                order__status__in=['processing', 'shipped', 'delivered']
            ).values_list('order_id', flat=True).distinct()
            
            result.total_analyzed_orders = len(orders_with_product)
        
            if orders_with_product:
                related_items = OrderItem.objects.filter(
                    order_id__in=orders_with_product,
                    product__isnull=False,
                    product__is_available=True
                ).exclude(
                    product_id=product_id
                ).values('product_id').annotate(
                    frequency=Count('product_id')
                ).order_by('-frequency')[:limit * 2]
                
                product_ids = [item['product_id'] for item in related_items]
                products = Product.objects.catalog().filter(id__in=product_ids)
                products_dict = {p.id: p for p in products}
                
                for item in related_items:
                    pid = item['product_id']
                    if pid in products_dict and pid not in seen_ids:
                        product = products_dict[pid]
                        frequency = item['frequency']
                        
                        score = min(1.0, frequency / max(1, result.total_analyzed_orders)) * cls.WEIGHTS['frequently_bought']
                        
                        recommendations.append(RecommendationItem(
                            product_id=pid,
                            product_data=product.to_dict(),
                            score=score,
                            reason=f'Покупают вместе ({frequency} раз)',
                            reason_type='frequently_bought'
                        ))
                        seen_ids.add(pid)
                        
                        if len(recommendations) >= limit:
                            break
            
            # 2. Добавляем по категориям (логичные связи)
            if len(recommendations) < limit:
                category_recs = cls._get_category_based_recommendations(
                    source_product, 
                    limit - len(recommendations),
                    seen_ids
                )
                recommendations.extend(category_recs)
                seen_ids.update(r.product_id for r in category_recs)
            
            # 3. Популярные товары как fallback
            if len(recommendations) < limit:
                # Используем новое поле animal_type с fallback на legacy
                animal_type = source_product.animal_type
                popular_recs = cls._get_popular_recommendations(
                    animal_type,
                    limit - len(recommendations),
                    seen_ids
                )
                recommendations.extend(popular_recs)
            
            # 4. Персонализация
            if user and user.is_authenticated:
                recommendations = cls._apply_personalization(recommendations, user)
            
            recommendations.sort(key=lambda x: x.score, reverse=True)

            # Ограничение: для кормов показываем максимум 2 других корма
            from apps.shop.management.commands.populate_category_codes import CATEGORY_CODE_MAPPING

            def _normalize(code):
                if not code:
                    return None
                if code.endswith('.dog') or code.endswith('.cat'):
                    return code.rsplit('.', 1)[0]
                return code

            def _get_category_code(rec):
                cat = (rec.product_data or {}).get('category') or {}
                code = cat.get('code')
                return _normalize(code)

            source_code = None
            if source_product.new_category:
                source_code = _normalize(
                    source_product.new_category.code
                    or CATEGORY_CODE_MAPPING.get(source_product.new_category.kotmatros_category_id)
                )

            filtered = []
            food_count = 0
            for rec in recommendations:
                if source_code and source_code.startswith('food.'):
                    rec_code = _get_category_code(rec)
                    if rec_code and rec_code in cls.FOOD_TYPE_CODES:
                        if food_count >= 2:
                            continue
                        food_count += 1
                filtered.append(rec)
                if len(filtered) >= limit:
                    break

            result.items = filtered
            
            cache.set(cache_key, result, cls.CACHE_TTL)
            
            return result
        except Exception as exc:
            raise
    
    @classmethod
    def _get_category_based_recommendations(
        cls,
        source_product,
        limit: int,
        exclude_ids: Set[int]
    ) -> List[RecommendationItem]:
        """Рекомендации на основе логических связей категорий."""
        from apps.shop.models import Product, Category
        from apps.shop.management.commands.populate_category_codes import CATEGORY_CODE_MAPPING

        recommendations = []

        def _code_for(cat):
            return cat.code or CATEGORY_CODE_MAPPING.get(cat.kotmatros_category_id)

        def _normalize(code):
            if not code:
                return None
            if code.endswith('.dog') or code.endswith('.cat'):
                return code.rsplit('.', 1)[0]
            return code

        def _add_products(qs, reason, max_count=None):
            nonlocal recommendations
            added = 0
            for product in qs:
                if product.id in exclude_ids or product.id == source_product.id:
                    continue
                recommendations.append(RecommendationItem(
                    product_id=product.id,
                    product_data=product.to_dict(),
                    score=cls.WEIGHTS['category_link'],
                    reason=reason,
                    reason_type='category_link'
                ))
                exclude_ids.add(product.id)
                added += 1
                if max_count and added >= max_count:
                    break
                if len(recommendations) >= limit:
                    break

        def _apply_age_size_filters(qs):
            source_age = source_product.age_group
            if source_age and source_age != 'all':
                if source_age in ['kitten', 'puppy']:
                    qs = qs.filter(Q(age_group=source_age) | Q(age_group='all') | Q(age_group__isnull=True))
                else:
                    qs = qs.filter(Q(age_group__in=[source_age, 'all']) | Q(age_group__isnull=True))
                    qs = qs.exclude(age_group__in=['kitten', 'puppy'])
            if source_product.size_group and source_product.size_group != 'all':
                qs = qs.filter(Q(size_group=source_product.size_group) | Q(size_group='all') | Q(size_group__isnull=True))
            return qs

        def _select_diverse_items(qs, max_items=2):
            selected = []
            if max_items <= 0:
                return selected
            cheapest = qs.order_by('price', 'id').first()
            if cheapest:
                selected.append(cheapest)
            if max_items == 1:
                return selected
            expensive_qs = qs.order_by('-price', 'id')
            if selected and selected[0].brand_id:
                expensive = expensive_qs.exclude(brand_id=selected[0].brand_id).first() or expensive_qs.first()
            else:
                expensive = expensive_qs.first()
            if expensive and (not selected or expensive.id != selected[0].id):
                selected.append(expensive)
            return selected

        animal_type = source_product.animal_type
        brand_id = source_product.brand_id
        source_cat = source_product.new_category
        source_code = _normalize(_code_for(source_cat)) if source_cat else None
        source_root = source_code.split('.', 1)[0] if source_code else None

        categories = list(Category.objects.filter(is_active=True).only('id', 'code', 'kotmatros_category_id', 'name'))
        code_to_ids = {}
        code_to_name = {}
        for cat in categories:
            code = _normalize(_code_for(cat))
            if not code:
                continue
            code_to_ids.setdefault(code, []).append(cat.id)
            if code not in code_to_name:
                code_to_name[code] = cat.name

        def _ids_for_prefixes(prefixes):
            ids = []
            for code, code_ids in code_to_ids.items():
                if any(code == prefix or code.startswith(prefix + '.') for prefix in prefixes):
                    ids.extend(code_ids)
            return ids

        # 1) Логичные доп. категории по файлу рекомендаций
        rules_map = cls._load_recommendation_rules()
        target_codes = rules_map.get(source_code, [])
        if target_codes:
            for target_code in target_codes:
                if len(recommendations) >= limit:
                    break
                target_ids = _ids_for_prefixes([target_code])
                if not target_ids:
                    continue
                base_qs = Product.objects.catalog().filter(
                    new_category_id__in=target_ids,
                    animal_type__in=[animal_type, 'all'],
                    is_available=True
                ).exclude(id__in=exclude_ids)
                base_qs = _apply_age_size_filters(base_qs)

                chosen = _select_diverse_items(base_qs, max_items=2)
                if not chosen:
                    continue
                if len(chosen) == 2:
                    b1 = chosen[0].brand_id
                    b2 = chosen[1].brand_id
                    if b1 and b2 and b1 == b2:
                        alt = base_qs.exclude(brand_id=b1).order_by('-price', 'id').first()
                        if alt and alt.id not in {p.id for p in chosen}:
                            chosen[1] = alt
                reason_name = code_to_name.get(target_code, target_code)
                for product in chosen:
                    recommendations.append(RecommendationItem(
                        product_id=product.id,
                        product_data=product.to_dict(),
                        score=cls.WEIGHTS['category_link'],
                        reason=f'Рекомендуем: {reason_name}',
                        reason_type='category_link'
                    ))
                    exclude_ids.add(product.id)
                    if len(recommendations) >= limit:
                        break

        # 3) Похожие категории (fallback)
        if len(recommendations) < limit and source_cat:
            if source_cat.parent_id:
                related_cats = Category.objects.filter(Q(parent=source_cat.parent) | Q(id=source_cat.id))
            else:
                related_cats = Category.objects.filter(Q(parent=source_cat) | Q(id=source_cat.id))
            related_products = Product.objects.catalog().filter(
                Q(new_category__in=related_cats),
                Q(animal_type__in=[animal_type, 'all']),
                Q(is_available=True)
            ).exclude(id__in=exclude_ids).order_by('-order_count', '-_avg_rating')[:limit]
            _add_products(related_products, 'Похожие товары')

        return recommendations
    
    @classmethod
    def _get_popular_recommendations(
        cls,
        animal: str,
        limit: int,
        exclude_ids: Set[int]
    ) -> List[RecommendationItem]:
        """Популярные товары как fallback."""
        from apps.shop.models import Product
        
        recommendations = []
        
        popular_products = Product.objects.catalog().filter(
            animal_type__in=[animal, 'all'],
            is_available=True
        ).exclude(
            id__in=exclude_ids
        ).order_by('-order_count', '-_avg_rating')[:limit]
        
        for product in popular_products:
            recommendations.append(RecommendationItem(
                product_id=product.id,
                product_data=product.to_dict(),
                score=cls.WEIGHTS['popular'],
                reason='Популярный товар',
                reason_type='popular'
            ))
        
        return recommendations
    
    @classmethod
    def _apply_personalization(
        cls,
        recommendations: List[RecommendationItem],
        user
    ) -> List[RecommendationItem]:
        """Применить персонализацию на основе PetID."""
        from apps.pets.services import PersonalizationService
        
        context = PersonalizationService.get_context(user)
        
        if context.is_empty:
            return recommendations
        
        for rec in recommendations:
            product_data = rec.product_data
            
            product_animal = product_data.get('animal')
            if product_animal in context.animal_types:
                rec.score += 0.2
            
            product_name = product_data.get('name', '').lower()
            for allergen in context.all_allergies:
                if allergen.lower() in product_name:
                    rec.score -= 0.5
                    break
            
            for favorite in context.all_favorites:
                if favorite.lower() in product_name:
                    rec.score += 0.3
                    rec.reason_type = 'pet_match'
                    rec.reason = f'Подходит для ваших питомцев'
                    break
        
        return recommendations
    
    @classmethod
    def get_cart_recommendations(
        cls,
        user,
        limit: int = 6
    ) -> List[Dict[str, Any]]:
        """Получить рекомендации для корзины."""
        cart_items = CartService.get_cart_items(user, 'all')

        if not cart_items:
            return []

        product_items = [item for item in cart_items if item.product]
        course_items = [item for item in cart_items if item.course]

        cart_product_ids = {item.product_id for item in product_items if item.product}
        cart_course_ids = {item.course_id for item in course_items if item.course}

        all_product_recs: Dict[int, RecommendationItem] = {}
        course_recommendations: List[Dict[str, Any]] = []

        # Product-based recommendations
        for item in product_items:
            result = cls.get_frequently_bought_together(
                item.product_id,
                limit=4,
                user=user
            )

            for rec in result.items:
                if rec.product_id in cart_product_ids:
                    continue
                if rec.product_id in all_product_recs:
                    all_product_recs[rec.product_id].score += rec.score * 0.5
                else:
                    all_product_recs[rec.product_id] = rec

        # Course-based cross-sell products
        for item in course_items:
            cross_sell = cls.get_cross_sell_for_courses(item.course_id, user=user, limit=3)
            for product_data in cross_sell:
                pid = product_data.get('id')
                if not pid or pid in cart_product_ids or pid in all_product_recs:
                    continue
                all_product_recs[pid] = RecommendationItem(
                    product_id=pid,
                    product_data=product_data,
                    score=cls.WEIGHTS['category_link'],
                    reason=product_data.get('reason', 'К курсу'),
                    reason_type=product_data.get('reason_type', 'course_cross_sell')
                )

        # Course recommendations
        if course_items:
            from apps.training.models import Course
            pet_types = {item.course.pet_type for item in course_items if item.course}
            categories = {item.course.category for item in course_items if item.course}
            course_qs = Course.objects.filter(is_active=True).exclude(id__in=cart_course_ids)
            if categories:
                course_qs = course_qs.filter(category__in=categories)
            if pet_types and pet_types != {'all'}:
                course_qs = course_qs.filter(pet_type__in=list(pet_types) + ['all'])
            course_qs = course_qs.order_by('-order_count')[:max(2, limit // 3)]
            course_recommendations = [
                {
                    'type': 'course',
                    'course': {
                        **course.to_dict(),
                        'reason': 'Похожие курсы',
                        'reason_type': 'course_similar'
                    },
                    'reason': 'Похожие курсы',
                    'reason_type': 'course_similar'
                }
                for course in course_qs
            ]

        # Merge and cap results
        sorted_products = sorted(
            all_product_recs.values(),
            key=lambda x: x.score,
            reverse=True
        )

        max_courses = 2 if course_items else 0
        max_products = max(1, limit - max_courses)

        final_recs: List[Dict[str, Any]] = []
        for rec in sorted_products[:max_products]:
            final_recs.append({
                'type': 'product',
                'id': rec.product_id,
                'score': round(rec.score, 2),
                'reason': rec.reason,
                'reason_type': rec.reason_type,
                **rec.product_data
            })

        final_recs.extend(course_recommendations[:max_courses])
        return final_recs[:limit]
    
    @classmethod
    def get_cross_sell_for_courses(
        cls,
        course_id: int,
        user=None,
        limit: int = 4
    ) -> List[Dict[str, Any]]:
        """Получить рекомендации товаров для курса (кросс-продажи)."""
        from apps.training.models import Course
        from apps.shop.models import Product
        
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return []
        
        course_to_product_categories = {
            'basics': ['food', 'care'],
            'training': ['ammunition', 'toys', 'treats'],
            'care': ['care', 'pharmacy'],
            'health': ['pharmacy', 'food'],
            'nutrition': ['food'],
            'behavior': ['toys', 'ammunition'],
            'specialized': ['pharmacy', 'care'],
            'fun': ['toys'],
        }
        
        product_categories = course_to_product_categories.get(
            course.category, ['food', 'toys']
        )
        
        products = Product.objects.catalog().filter(
            product_group__in=product_categories,
            is_available=True
        )
        
        if course.pet_type != 'all':
            products = products.filter(
                Q(animal_type__in=[course.pet_type, 'all'])
            )
        
        products = products.order_by('-order_count', '-_avg_rating')[:limit]
        
        recommendations = []
        for product in products:
            recommendations.append({
                **product.to_dict(),
                'reason': f'Рекомендуем к курсу "{course.title}"',
                'reason_type': 'course_cross_sell'
            })
        
        return recommendations


# =============================================================================
# АНАЛИТИКА И КОНСТРУКТОР ГРАФИКОВ
# =============================================================================

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
                'data_points': sum(len(row) for row in data) if isinstance(data, list) else len(data)
            }

            result = {
                'data': data,
                'metadata': metadata
            }

            # Кэшировать результат
            cache.set(cache_key, result, self.cache_timeout)

            return result

        except Exception as e:
            logger.error(f"Error in get_chart_data: {e}", exc_info=True)
            return {
                'data': [],
                'metadata': {
                    'error': str(e),
                    'execution_time': (timezone.now() - start_time).total_seconds()
                }
            }

    def _generate_cache_key(self, config: Dict) -> str:
        """Создать ключ кэша для конфигурации."""
        import hashlib
        import json

        # Создать нормализованную версию конфигурации
        cache_config = {
            'metrics': config.get('metrics', []),
            'dimension': config.get('dimension'),
            'timeRange': config.get('timeRange'),
            'groupBy': config.get('groupBy'),
            'filters': config.get('filters', {}),
        }

        # Сериализовать в JSON с сортировкой ключей
        config_str = json.dumps(cache_config, sort_keys=True, default=str)
        config_hash = hashlib.md5(config_str.encode()).hexdigest()[:16]

        return f"analytics_chart_data_{config_hash}"

    def _fetch_metrics_data(self, metrics: List[Dict], start_date, end_date, group_by: str) -> List[Dict]:
        """Получить данные метрик с группировкой по времени."""
        from django.db.models.functions import TruncDate, TruncWeek, TruncMonth

        data = []
        date_field = 'created_at'  # Можно сделать параметром

        # Определить функцию группировки
        if group_by == 'day':
            trunc_func = TruncDate(date_field)
            date_format = '%Y-%m-%d'
        elif group_by == 'week':
            trunc_func = TruncWeek(date_field)
            date_format = '%Y-%U'
        elif group_by == 'month':
            trunc_func = TruncMonth(date_field)
            date_format = '%Y-%m'
        else:
            trunc_func = TruncDate(date_field)
            date_format = '%Y-%m-%d'

        # Для каждой метрики выполнить запрос
        for metric_config in metrics:
            metric_id = metric_config.get('id')
            if not metric_id:
                continue

            try:
                # Получить определение метрики
                from apps.shop.models import AnalyticMetric
                metric = AnalyticMetric.objects.get(id=metric_id, is_active=True)

                # Построить запрос
                queryset = self._build_metric_queryset(metric, start_date, end_date)

                # Группировать по дате
                grouped_data = queryset.annotate(
                    period=trunc_func
                ).values('period').annotate(
                    value=Sum(metric.field_name) if metric.default_aggregation == 'sum'
                    else Count(metric.field_name) if metric.default_aggregation == 'count'
                    else Avg(metric.field_name)
                ).order_by('period')

                # Форматировать результаты
                for item in grouped_data:
                    period_str = item['period'].strftime(date_format) if item['period'] else 'unknown'
                    value = float(item['value']) if item['value'] else 0

                    # Найти или создать запись для этой даты
                    existing = next((d for d in data if d.get('date') == period_str), None)
                    if existing:
                        existing[metric_config.get('field', metric_id)] = value
                    else:
                        data.append({
                            'date': period_str,
                            metric_config.get('field', metric_id): value
                        })

            except Exception as e:
                logger.error(f"Error fetching data for metric {metric_id}: {e}")

        return data

    def _fetch_dimension_data(self, metrics: List[Dict], dimension: str, start_date, end_date) -> List[Dict]:
        """Получить данные с группировкой по измерению (не времени)."""
        data = []

        for metric_config in metrics:
            metric_id = metric_config.get('id')
            if not metric_id:
                continue

            try:
                from apps.shop.models import AnalyticMetric
                metric = AnalyticMetric.objects.get(id=metric_id, is_active=True)

                queryset = self._build_metric_queryset(metric, start_date, end_date)

                # Группировать по измерению
                grouped_data = queryset.values(dimension).annotate(
                    value=Sum(metric.field_name) if metric.default_aggregation == 'sum'
                    else Count(metric.field_name) if metric.default_aggregation == 'count'
                    else Avg(metric.field_name)
                ).order_by('-value')[:50]  # Ограничить топ 50

                for item in grouped_data:
                    dimension_value = item[dimension] or 'unknown'
                    value = float(item['value']) if item['value'] else 0

                    existing = next((d for d in data if d.get(dimension) == dimension_value), None)
                    if existing:
                        existing[metric_config.get('field', metric_id)] = value
                    else:
                        data.append({
                            dimension: dimension_value,
                            metric_config.get('field', metric_id): value
                        })

            except Exception as e:
                logger.error(f"Error fetching dimension data for metric {metric_id}: {e}")

        return data

    def _build_metric_queryset(self, metric, start_date, end_date):
        """Построить базовый queryset для метрики."""
        from django.apps import apps

        # Получить модель по имени таблицы
        model = None
        for app_config in apps.get_app_configs():
            for model_class in app_config.get_models():
                if model_class._meta.db_table == metric.table_name:
                    model = model_class
                    break
            if model:
                break

        if not model:
            raise ValueError(f"Model for table {metric.table_name} not found")

        # Построить queryset
        queryset = model.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        )

        # Применить фильтры если есть
        # TODO: Добавить поддержку фильтров из config

        return queryset


class AnalyticsMetricsInitializer:
    """
    Сервис для инициализации стандартных метрик аналитики.
    """

    DEFAULT_METRICS = [
        {
            'id': 'users_total',
            'name': 'Всего пользователей',
            'description': 'Общее количество зарегистрированных пользователей',
            'category': 'users',
            'data_type': 'integer',
            'table_name': 'users_user',
            'field_name': 'id',
            'default_aggregation': 'count',
            'available_aggregations': ['count'],
            'units': 'чел.',
        },
        {
            'id': 'users_new',
            'name': 'Новые пользователи',
            'description': 'Количество новых регистраций',
            'category': 'users',
            'data_type': 'integer',
            'table_name': 'users_user',
            'field_name': 'id',
            'default_aggregation': 'count',
            'available_aggregations': ['count'],
            'units': 'чел.',
        },
        {
            'id': 'orders_total',
            'name': 'Всего заказов',
            'description': 'Общее количество оформленных заказов',
            'category': 'orders',
            'data_type': 'integer',
            'table_name': 'shop_order',
            'field_name': 'id',
            'default_aggregation': 'count',
            'available_aggregations': ['count'],
            'units': 'шт.',
        },
        {
            'id': 'orders_revenue',
            'name': 'Выручка',
            'description': 'Общая сумма выручки от заказов',
            'category': 'orders',
            'data_type': 'decimal',
            'table_name': 'shop_order',
            'field_name': 'total_amount',
            'default_aggregation': 'sum',
            'available_aggregations': ['sum', 'avg'],
            'units': '₽',
        },
        {
            'id': 'orders_avg_check',
            'name': 'Средний чек',
            'description': 'Средняя сумма заказа',
            'category': 'orders',
            'data_type': 'decimal',
            'table_name': 'shop_order',
            'field_name': 'total_amount',
            'default_aggregation': 'avg',
            'available_aggregations': ['avg', 'sum'],
            'units': '₽',
        },
        {
            'id': 'products_total',
            'name': 'Всего товаров',
            'description': 'Общее количество товаров в каталоге',
            'category': 'products',
            'data_type': 'integer',
            'table_name': 'shop_product',
            'field_name': 'id',
            'default_aggregation': 'count',
            'available_aggregations': ['count'],
            'units': 'шт.',
        },
        {
            'id': 'products_in_stock',
            'name': 'Товары в наличии',
            'description': 'Количество товаров доступных для заказа',
            'category': 'products',
            'data_type': 'integer',
            'table_name': 'shop_product',
            'field_name': 'id',
            'default_aggregation': 'count',
            'available_aggregations': ['count'],
            'filter_fields': [{'field': 'is_available', 'value': True}],
            'units': 'шт.',
        },
        {
            'id': 'courses_total',
            'name': 'Всего курсов',
            'description': 'Общее количество курсов',
            'category': 'courses',
            'data_type': 'integer',
            'table_name': 'training_course',
            'field_name': 'id',
            'default_aggregation': 'count',
            'available_aggregations': ['count'],
            'units': 'шт.',
        },
        {
            'id': 'courses_enrollments',
            'name': 'Записи на курсы',
            'description': 'Количество записей пользователей на курсы',
            'category': 'courses',
            'data_type': 'integer',
            'table_name': 'training_usercourse',
            'field_name': 'id',
            'default_aggregation': 'count',
            'available_aggregations': ['count'],
            'units': 'шт.',
        },
        {
            'id': 'pets_total',
            'name': 'Всего питомцев',
            'description': 'Общее количество зарегистрированных питомцев',
            'category': 'pets',
            'data_type': 'integer',
            'table_name': 'pets_pet',
            'field_name': 'id',
            'default_aggregation': 'count',
            'available_aggregations': ['count'],
            'units': 'шт.',
        },
    ]

    @classmethod
    def initialize_default_metrics(cls):
        """Инициализировать стандартные метрики."""
        from apps.shop.models import AnalyticMetric

        created_count = 0
        for metric_data in cls.DEFAULT_METRICS:
            metric, created = AnalyticMetric.objects.get_or_create(
                id=metric_data['id'],
                defaults=metric_data
            )
            if created:
                created_count += 1
                logger.info(f"Created metric: {metric.name}")

        logger.info(f"Initialized {created_count} new metrics")
        return created_count


# =============================================================================
# ЭКСПОРТЫ (для обратной совместимости)
# =============================================================================

cart_service = CartService()
order_service = OrderService()
recommendation_engine = RecommendationEngine()

__all__ = [
    # Dataclasses
    'CartSummary',
    'RecommendationItem', 
    'RecommendationResult',
    # Services
    'CartService',
    'cart_service',
    'ReservationService',
    'OrderService',
    'order_service',
    'process_expired_orders',
    'RecommendationEngine',
    'recommendation_engine',
    # Constants
    'CATEGORY_LINKS',
    'SUBCATEGORY_LINKS',
    # Analytics
    'AnalyticsDataService',
    'AnalyticsMetricsInitializer',
    # CRUD Services
    'ProductService',
    'product_service',
    'CartService',
    'cart_service',
    'OrderService',
    'order_service',
]


# =============================================================================
# CRUD СЕРВИСЫ НА БАЗЕ BaseCRUDService
# =============================================================================

class ProductService(BaseCRUDService):
    """
    Сервис для CRUD операций с товарами.

    Использует BaseCRUDService для стандартизации операций.
    """

    def __init__(self):
        from .models import Product
        super().__init__(Product)

    def get_queryset(self, user=None):
        """Переопределение для активных товаров."""
        return self.model.objects.filter(is_active=True)

    def create_product(self, data, user):
        """
        Создать товар с валидацией.

        @param data: Данные товара
        @param user: Создатель (админ)
        @return: Созданный товар
        """
        # Проверка прав администратора
        if not user.is_staff:
            raise ValueError("Только администраторы могут создавать товары")

        return self.create(data, user)

    def update_product_stock(self, product_id, new_stock, user):
        """
        Обновить количество товара на складе.

        @param product_id: ID товара
        @param new_stock: Новое количество
        @param user: Пользователь
        @return: Обновленный товар
        """
        if new_stock < 0:
            raise ValueError("Количество товара не может быть отрицательным")

        return self.update(product_id, {'stock_quantity': new_stock}, user)


class CartCRUDService(BaseCRUDService):
    """
    Сервис для CRUD операций с корзиной.

    Специфический сервис для корзины пользователя.
    """

    def __init__(self):
        from .models import Cart
        super().__init__(Cart)

    def get_queryset(self, user=None):
        """Переопределение для корзины пользователя."""
        if user:
            return self.model.objects.filter(user=user)
        return super().get_queryset(user)

    def get_or_create_cart(self, user):
        """
        Получить или создать корзину для пользователя.

        @param user: Пользователь
        @return: Корзина
        """
        cart, created = self.model.objects.get_or_create(user=user)
        if created:
            self.log_operation("Created cart", user=user)
        return cart


class OrderCRUDService(BaseCRUDService):
    """
    Сервис для CRUD операций с заказами.

    Использует BaseCRUDService для стандартизации операций.
    """

    def __init__(self):
        from .models import Order
        super().__init__(Order)

    def get_queryset(self, user=None):
        """Переопределение для заказов пользователя."""
        if user:
            return self.model.objects.filter(user=user)
        return super().get_queryset(user)

    def create_order_from_cart(self, cart, user, shipping_address=None):
        """
        Создать заказ из корзины.

        @param cart: Корзина
        @param user: Пользователь
        @param shipping_address: Адрес доставки
        @return: Созданный заказ
        """
        from .models import Order, OrderItem

        # Рассчитать итоговую сумму
        total_amount = sum(item.get_total_price() for item in cart.items.all())

        order_data = {
            'user': user,
            'total_amount': total_amount,
            'status': 'pending',
            'shipping_address': shipping_address,
        }

        # Создать заказ
        order = self.create(order_data, user)

        # Создать элементы заказа
        for cart_item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                course=cart_item.course,
                quantity=cart_item.quantity,
                price=cart_item.price,
                pet=cart_item.pet
            )

        # Очистить корзину
        cart.items.all().delete()

        self.log_operation("Created order from cart", order.id, user, f"Total: {total_amount}")
        return order


# =============================================================================
# ГЛОБАЛЬНЫЕ ЭКЗЕМПЛЯРЫ СЕРВИСОВ
# =============================================================================

# CRUD сервисы
product_service = ProductService()
cart_crud_service = CartCRUDService()
order_crud_service = OrderCRUDService()

