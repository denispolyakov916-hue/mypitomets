"""
Сервисы для обработки платежей

Включает: PaymentService - единая точка входа для всех платежей
"""

import logging
from decimal import Decimal
from typing import Optional, Dict, Any
from django.conf import settings
from django.utils import timezone

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

        if payment.status != 'processing':
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

    @staticmethod
    def _activate_shop_order(payment: Payment):
        """Активация заказа товаров после оплаты."""
        from apps.shop.models import Order

        try:
            order = Order.objects.get(id=payment.object_id, user=payment.user)
            order.status = 'processing'
            order.save()
            logger.info(f"Заказ активирован после оплаты: {order.id}")
        except Order.DoesNotExist:
            logger.error(f"Заказ не найден для платежа: {payment.id}")

    @staticmethod
    def _activate_course_access(payment: Payment):
        """Предоставление доступа к курсу после оплаты."""
        from apps.training.models import Course, UserCourse

        try:
            course = Course.objects.get(id=payment.object_id)
            # Создание связи пользователь-курс (если ещё не существует)
            UserCourse.objects.get_or_create(
                user=payment.user,
                course=course,
                defaults={'progress': 0}
            )
            logger.info(f"Доступ к курсу предоставлен: user={payment.user.email}, course={course.title}")
        except Course.DoesNotExist:
            logger.error(f"Курс не найден для платежа: {payment.id}")

    @staticmethod
    def _activate_subscription(payment: Payment):
        """Активация подписки после оплаты."""
        # Будущая функциональность
        logger.info(f"Подписка активирована: {payment.id}")

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
            total=models.Sum('amount')
        )['total'] or Decimal('0')

        return {
            'total_payments': total_payments,
            'successful_payments': successful_payments,
            'success_rate': (successful_payments / total_payments * 100) if total_payments > 0 else 0,
            'total_amount': float(total_amount),
        }
