"""
Сервисы для обработки платежей

Включает: PaymentService - единая точка входа для всех платежей
"""

import logging
from decimal import Decimal
from typing import Optional, Dict, Any
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum

from .models import Payment

logger = logging.getLogger('apps.payments')


class PaymentService:
    """
    Единая служба для обработки всех платежей на платформе.

    Поддерживает разные типы платежей и платежные методы.
    """

    @staticmethod
    def create_payment(
        user,
        payment_type: str,
        object_id: str,
        amount: Decimal,
        payment_method: str = 'card',
        currency: str = 'RUB',
        metadata: Optional[Dict[str, Any]] = None
    ) -> Payment:
        """
        Создание нового платежа.

        Args:
            user: Пользователь
            payment_type: Тип платежа (shop_order, course, subscription)
            object_id: ID связанного объекта
            amount: Сумма платежа
            payment_method: Метод оплаты
            currency: Валюта
            metadata: Дополнительные данные

        Returns:
            Payment: Созданный объект платежа
        """
        if amount <= 0:
            raise ValueError("Сумма платежа должна быть положительной")

        if payment_type not in dict(Payment.PAYMENT_TYPE_CHOICES):
            raise ValueError(f"Неподдерживаемый тип платежа: {payment_type}")

        payment = Payment.objects.create(
            user=user,
            payment_type=payment_type,
            object_id=object_id,
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            metadata=metadata or {},
        )

        logger.info(f"Создан платеж: {payment.id}, тип={payment_type}, сумма={amount} {currency}")
        return payment

    @staticmethod
    def process_payment(payment: Payment) -> bool:
        """
        Обработка платежа (имитация реальной оплаты).

        В продакшене здесь будет интеграция с платежными шлюзами.

        Args:
            payment: Объект платежа

        Returns:
            bool: True если платеж успешен
        """
        if payment.status != 'pending':
            logger.warning(f"Попытка обработать платеж в статусе {payment.status}: {payment.id}")
            return False

        # Имитация обработки платежа
        # В реальном приложении здесь будет вызов API платежного шлюза
        payment.status = 'processing'
        payment.payment_gateway = 'mock_gateway'  # В продакшене: 'yookassa', 'stripe' и т.д.
        payment.external_payment_id = f"mock_{payment.id}"
        payment.save()

        logger.info(f"Начата обработка платежа: {payment.id}")

        # Имитация успешной оплаты (в реальности это будет webhook/callback)
        PaymentService._simulate_payment_success(payment)

        return True

    @staticmethod
    def _simulate_payment_success(payment: Payment):
        """
        Имитация успешного завершения платежа.

        В продакшене это будет обработчик webhook от платежного шлюза.
        """
        import time
        from django.core.management import call_command

        # Имитация задержки обработки
        time.sleep(0.1)  # В реальности webhook приходит асинхронно

        payment.mark_as_completed()
        logger.info(f"Платеж успешно завершён: {payment.id}")

        # Выполнение пост-платежных действий
        PaymentService._execute_post_payment_actions(payment)

    @staticmethod
    def confirm_payment(payment_id: str, external_payment_id: str = None) -> bool:
        """
        Подтверждение платежа (для ручного подтверждения или webhook).

        Args:
            payment_id: ID платежа в нашей системе
            external_payment_id: ID платежа во внешней системе

        Returns:
            bool: True если подтверждение успешно
        """
        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist:
            logger.error(f"Платеж не найден: {payment_id}")
            return False

        # Если платёж в статусе pending - сначала обрабатываем его
        if payment.status == 'pending':
            payment.status = 'processing'
            payment.payment_gateway = 'mock_gateway'
            payment.external_payment_id = external_payment_id or f"mock_{payment.id}"
            payment.save()
            logger.info(f"Платеж переведён в processing: {payment.id}")
        elif payment.status != 'processing':
            logger.warning(f"Попытка подтвердить платеж в статусе {payment.status}: {payment.id}")
            return False

        payment.mark_as_completed(external_payment_id)

        # Выполнение пост-платежных действий
        PaymentService._execute_post_payment_actions(payment)

        return True

    @staticmethod
    def cancel_payment(payment_id: str, reason: str = None) -> bool:
        """
        Отмена платежа.

        Args:
            payment_id: ID платежа
            reason: Причина отмены

        Returns:
            bool: True если отмена успешна
        """
        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist:
            logger.error(f"Платеж не найден: {payment_id}")
            return False

        if not payment.can_be_cancelled():
            logger.warning(f"Невозможно отменить платеж в статусе {payment.status}: {payment.id}")
            return False

        payment.status = 'cancelled'
        if reason:
            payment.metadata = payment.metadata or {}
            payment.metadata['cancellation_reason'] = reason
        payment.save()

        logger.info(f"Платеж отменён: {payment.id}")
        return True

    @staticmethod
    def refund_payment(payment_id: str, amount: Decimal = None, reason: str = None) -> bool:
        """
        Возврат платежа.

        Args:
            payment_id: ID платежа
            amount: Сумма возврата (если None - полный возврат)
            reason: Причина возврата

        Returns:
            bool: True если возврат успешен
        """
        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist:
            logger.error(f"Платеж не найден: {payment_id}")
            return False

        if payment.status != 'completed':
            logger.warning(f"Невозможно вернуть платеж в статусе {payment.status}: {payment.id}")
            return False

        refund_amount = amount or payment.amount

        # В реальном приложении здесь будет вызов API платежного шлюза для возврата
        payment.status = 'refunded'
        payment.metadata = payment.metadata or {}
        payment.metadata['refund_amount'] = float(refund_amount)
        payment.metadata['refund_reason'] = reason
        payment.save()

        logger.info(f"Платеж возвращён: {payment.id}, сумма={refund_amount}")
        return True

    @staticmethod
    def _execute_post_payment_actions(payment: Payment):
        """
        Выполнение действий после успешной оплаты.

        Args:
            payment: Успешный платеж
        """
        if payment.payment_type == 'shop_order':
            PaymentService._activate_shop_order(payment)
        elif payment.payment_type == 'course':
            PaymentService._activate_course_access(payment)
        elif payment.payment_type == 'subscription':
            PaymentService._activate_subscription(payment)
        elif payment.payment_type == 'unified_checkout':
            PaymentService._activate_unified_checkout(payment)

    @staticmethod
    def _activate_shop_order(payment: Payment):
        """Активация заказа товаров после оплаты."""
        from apps.shop.models import Order, OrderItem, Product
        from django.db import transaction
        from datetime import timedelta

        if not payment.user:
            logger.warning(f"Невозможно активировать заказ: пользователь удалён для платежа {payment.id}")
            return

        try:
            order = Order.objects.get(id=payment.object_id, user=payment.user)

            # Используем транзакцию для атомарности операции
            with transaction.atomic():
                # Если заказ был просрочен - возвращаем его в pending и устанавливаем новый срок
                if order.status == 'expired':
                    order.status = 'pending'
                    order.expires_at = timezone.now() + timedelta(minutes=10)
                    logger.info(f"Просроченный заказ восстановлен: {order.id}")
                
                # Списываем товары со склада (только если еще не списаны)
                # Для просроченных заказов товары уже возвращены на склад, так что списываем снова
                for order_item in order.items.filter(product__isnull=False):
                    product = order_item.product
                    if product.stock_count >= order_item.quantity:
                        product.stock_count -= order_item.quantity
                        # Если товаров не осталось, устанавливаем in_stock=False
                        if product.stock_count == 0:
                            product.in_stock = False
                        product.save()
                        logger.info(f"Списан товар: {product.name}, количество: {order_item.quantity}, остаток: {product.stock_count}")
                    else:
                        # Это не должно происходить, если проверки были сделаны при создании заказа
                        logger.error(f"Недостаточно товара на складе: {product.name}, требуется: {order_item.quantity}, доступно: {product.stock_count}")

                # Обновляем счетчики популярности товаров
                for order_item in order.items.filter(product__isnull=False):
                    product = order_item.product
                    product.order_count += order_item.quantity
                    product.save(update_fields=['order_count'])

                order.status = 'processing'
                order.expires_at = None  # Убираем срок истечения после успешной оплаты
                order.save()
                logger.info(f"Заказ активирован после оплаты и товары списаны: {order.id}")

        except Order.DoesNotExist:
            logger.error(f"Заказ не найден для платежа: {payment.id}")

    @staticmethod
    def _activate_course_access(payment: Payment):
        """Предоставление доступа к курсу после оплаты."""
        from apps.training.models import Course, UserCourse
        from apps.pets.models import Pet

        if not payment.user:
            logger.warning(f"Невозможно предоставить доступ к курсу: пользователь удалён для платежа {payment.id}")
            return

        try:
            course = Course.objects.get(id=payment.object_id)
            
            # Получение pet_id из metadata (если есть)
            pet = None
            if payment.metadata and payment.metadata.get('pet_id'):
                try:
                    pet = Pet.objects.get(id=payment.metadata['pet_id'], owner=payment.user)
                except Pet.DoesNotExist:
                    logger.warning(f"Питомец не найден для платежа {payment.id}, курс будет привязан без питомца")
            
            # Создание связи пользователь-курс (если ещё не существует)
            UserCourse.objects.get_or_create(
                user=payment.user,
                course=course,
                pet=pet,
                defaults={'progress': 0}
            )

            # Обновляем счетчик популярности курса
            course.order_count += 1
            course.save(update_fields=['order_count'])

            pet_info = f" для {pet.name}" if pet else ""
            logger.info(f"Доступ к курсу предоставлен: user={payment.user.email}, course={course.title}{pet_info}")
        except Course.DoesNotExist:
            logger.error(f"Курс не найден для платежа: {payment.id}")

    @staticmethod
    def _activate_subscription(payment: Payment):
        """Активация подписки после оплаты."""
        # Будущая функциональность
        logger.info(f"Подписка активирована: {payment.id}")

    @staticmethod
    def _activate_unified_checkout(payment: Payment):
        """Активация единого чекаута после оплаты (товары + курсы)."""
        from apps.shop.models import Order
        from apps.training.models import Course, UserCourse
        from apps.pets.models import Pet

        if not payment.user:
            logger.warning(f"Невозможно активировать unified checkout: пользователь удалён для платежа {payment.id}")
            return

        metadata = payment.metadata or {}

        # Активация заказа товаров
        products_order_id = metadata.get('products_order_id')
        if products_order_id:
            try:
                order = Order.objects.get(id=products_order_id, user=payment.user)

                # Используем транзакцию для атомарности операции
                with transaction.atomic():
                    # Списываем товары со склада
                    for order_item in order.items.filter(product__isnull=False):
                        product = order_item.product
                        if product.stock_count >= order_item.quantity:
                            product.stock_count -= order_item.quantity
                            # Если товаров не осталось, устанавливаем in_stock=False
                            if product.stock_count == 0:
                                product.in_stock = False
                            product.save()
                            logger.info(f"Списан товар в unified checkout: {product.name}, количество: {order_item.quantity}, остаток: {product.stock_count}")
                        else:
                            # Это не должно происходить, если проверки были сделаны при создании заказа
                            logger.error(f"Недостаточно товара на складе в unified checkout: {product.name}, требуется: {order_item.quantity}, доступно: {product.stock_count}")

                    order.status = 'processing'
                    order.save()
                    logger.info(f"Заказ товаров активирован в unified checkout и товары списаны: {order.id}")
            except Order.DoesNotExist:
                logger.error(f"Заказ товаров не найден для unified checkout платежа: {payment.id}")

        # Активация доступа к курсам
        course_ids = metadata.get('course_ids', [])
        for user_course_id in course_ids:
            try:
                user_course = UserCourse.objects.get(id=user_course_id, user=payment.user)
                # Доступ к курсу уже предоставлен при создании UserCourse
                logger.info(f"Доступ к курсу подтверждён в unified checkout: user={payment.user.email}, course={user_course.course.title}")
            except UserCourse.DoesNotExist:
                logger.error(f"UserCourse не найден для unified checkout платежа: {payment.id}, course_id={user_course_id}")

        logger.info(f"Unified checkout активирован: {payment.id}")

    @staticmethod
    def get_payment_statistics(user=None):
        """
        Получение статистики платежей.

        Args:
            user: Пользователь (если None - общая статистика)

        Returns:
            dict: Статистика платежей
        """
        queryset = Payment.objects.all()
        if user:
            queryset = queryset.filter(user=user)

        total_payments = queryset.count()
        successful_payments = queryset.filter(status='completed').count()
        total_amount = queryset.filter(status='completed').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')

        return {
            'total_payments': total_payments,
            'successful_payments': successful_payments,
            'success_rate': (successful_payments / total_payments * 100) if total_payments > 0 else 0,
            'total_amount': float(total_amount),
        }
