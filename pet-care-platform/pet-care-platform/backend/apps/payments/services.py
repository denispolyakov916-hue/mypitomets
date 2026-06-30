"""
Сервисы для обработки платежей

Включает: PaymentService - единая точка входа для всех платежей
"""

from decimal import Decimal
from typing import Optional, Dict, Any
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum

from core.services import BaseService
from .models import Payment


class PaymentService(BaseService):
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

        PaymentService.log_info(f"Создан платеж: {payment.id}, тип={payment_type}, сумма={amount} {currency}", {
            'payment_id': payment.id,
            'user_id': user.id,
            'payment_type': payment_type
        })
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
            PaymentService.log_info(f"Попытка обработать платеж в статусе {payment.status}: {payment.id}", {
                'payment_id': payment.id,
                'status': payment.status
            })
            return False

        # Имитация обработки платежа
        # В реальном приложении здесь будет вызов API платежного шлюза
        payment.status = 'processing'
        payment.payment_gateway = 'mock_gateway'  # В продакшене: 'yookassa', 'stripe' и т.д.
        payment.external_payment_id = f"mock_{payment.id}"
        payment.save()

        PaymentService.log_info(f"Начата обработка платежа: {payment.id}", {'payment_id': payment.id})

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

        # Выполнение пост-платежных действий ДО отметки платежа как completed
        try:
            PaymentService._execute_post_payment_actions(payment)
            # Только после успешной активации отмечаем платеж как completed
            payment.mark_as_completed()
            PaymentService.log_info(f"Платеж успешно завершён: {payment.id}", {'payment_id': payment.id})
        except Exception as e:
            # Если активация заказа провалилась - отмечаем платеж как failed
            payment.mark_as_failed(str(e))
            PaymentService.log_error(e, {
                'payment_id': payment.id,
                'error_type': type(e).__name__,
                'action': 'post_payment_activation_failed'
            })
            # Пробрасываем исключение выше, чтобы OrderConfirmPaymentView вернул ошибку
            raise

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
            PaymentService.log_error(Exception(f"Платеж не найден: {payment_id}"), {'payment_id': payment_id})
            return False

        # Если платёж в статусе pending - сначала обрабатываем его
        if payment.status == 'pending':
            payment.status = 'processing'
            payment.payment_gateway = 'mock_gateway'
            payment.external_payment_id = external_payment_id or f"mock_{payment.id}"
            payment.save()
            PaymentService.log_info(f"Платеж переведён в processing: {payment.id}", {'payment_id': payment.id})
        elif payment.status != 'processing':
            PaymentService.log_info(f"Попытка подтвердить платеж в статусе {payment.status}: {payment.id}", {
                'payment_id': payment.id,
                'status': payment.status
            })
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
            PaymentService.log_error(Exception(f"Платеж не найден: {payment_id}"), {'payment_id': payment_id})
            return False

        if not payment.can_be_cancelled():
            PaymentService.log_info(f"Невозможно отменить платеж в статусе {payment.status}: {payment.id}", {
                'payment_id': payment.id,
                'status': payment.status
            })
            return False

        payment.status = 'cancelled'
        if reason:
            payment.metadata = payment.metadata or {}
            payment.metadata['cancellation_reason'] = reason
        payment.save()

        PaymentService.log_info(f"Платеж отменён: {payment.id}", {'payment_id': payment.id, 'reason': reason})
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
            PaymentService.log_error(Exception(f"Платеж не найден: {payment_id}"), {'payment_id': payment_id})
            return False

        if payment.status != 'completed':
            PaymentService.log_info(f"Невозможно вернуть платеж в статусе {payment.status}: {payment.id}", {
                'payment_id': payment.id,
                'status': payment.status
            })
            return False

        refund_amount = amount or payment.amount

        # В реальном приложении здесь будет вызов API платежного шлюза для возврата
        payment.status = 'refunded'
        payment.metadata = payment.metadata or {}
        payment.metadata['refund_amount'] = float(refund_amount)
        payment.metadata['refund_reason'] = reason
        payment.save()

        PaymentService.log_info(f"Платеж возвращён: {payment.id}, сумма={refund_amount}", {
            'payment_id': payment.id,
            'refund_amount': float(refund_amount)
        })
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
    def _get_order_item_available_quantity(order_item):
        """Возвращает доступный остаток по строке заказа. None означает без точного лимита."""
        product = order_item.product
        if not product:
            return 0

        sku = getattr(order_item, 'sku', None)
        if sku:
            if not sku.available or sku.status != 1:
                return 0
            if sku.stock_quantity is None:
                return None
            return max(0, sku.stock_quantity)

        skus = list(product.skus.filter(status=1, available=True))
        if skus:
            if any(sku.stock_quantity is None for sku in skus):
                return None
            return sum(max(0, sku.stock_quantity or 0) for sku in skus)

        return None if product.is_available else 0

    @staticmethod
    def _refresh_product_availability(product):
        if not product:
            return
        active_skus = product.skus.filter(status=1)
        if active_skus.exists():
            product.is_available = active_skus.filter(available=True).exists()
            product.save(update_fields=['is_available', 'updated_at'])

    @staticmethod
    def _decrement_order_item_stock(order_item):
        """Списывает остаток с выбранного SKU, если у него ведётся количественный учёт."""
        product = order_item.product
        if not product:
            return None

        sku = getattr(order_item, 'sku', None)
        if not sku:
            sku = product.skus.filter(status=1, available=True).order_by('-is_default', 'sort_order', 'id').first()

        if sku and sku.stock_quantity is not None:
            sku.stock_quantity = max(0, sku.stock_quantity - order_item.quantity)
            sku.available = sku.stock_quantity > 0
            sku.save(update_fields=['stock_quantity', 'available'])

        PaymentService._refresh_product_availability(product)
        return sku

    @staticmethod
    def _activate_shop_order(payment: Payment):
        """Активация заказа товаров и курсов после оплаты."""
        from apps.shop.models import Order, OrderItem, Product
        from apps.training.models import UserCourse
        from django.db import transaction
        from datetime import timedelta

        if not payment.user:
            PaymentService.log_info(f"Невозможно активировать заказ: пользователь удалён для платежа {payment.id}", {
                'payment_id': payment.id
            })
            return

        try:
            order = Order.objects.prefetch_related(
                'items__product', 'items__sku', 'items__course', 'items__pet'
            ).get(id=payment.object_id, user=payment.user)

            # Анализируем состав заказа
            total_items = order.items.count()
            product_items = order.items.filter(product__isnull=False).count()
            course_items = order.items.filter(course__isnull=False).count()
            invalid_items = order.items.filter(product__isnull=True, course__isnull=True).count()

            PaymentService.log_info(f"Начинаем активацию заказа {order.id} для платежа {payment.id}", {
                'order_id': order.id,
                'payment_id': payment.id,
                'order_status': order.status,
                'total_items': total_items,
                'product_items': product_items,
                'course_items': course_items,
                'invalid_items': invalid_items
            })

            if invalid_items > 0:
                PaymentService.log_error(f"Заказ {order.id} содержит некорректные элементы", {
                    'order_id': order.id,
                    'invalid_items': invalid_items
                })
                raise ValueError(f"Заказ содержит {invalid_items} некорректных элементов")

            # Используем транзакцию для атомарности операции
            with transaction.atomic():
                # Если заказ был просрочен - возвращаем его в pending и устанавливаем новый срок
                if order.status == 'expired':
                    order.status = 'pending'
                    order.expires_at = timezone.now() + timedelta(minutes=10)
                    PaymentService.log_info(f"Просроченный заказ восстановлен: {order.id}", {
                        'order_id': order.id,
                        'payment_id': payment.id
                    })

                # Проверяем доступность товаров перед списанием
                unavailable_items = []
                insufficient_items = []

                for order_item in order.items.filter(product__isnull=False):
                    try:
                        product = order_item.product
                        # Проверяем, существует ли товар
                        if not product:
                            unavailable_items.append({
                                'product_id': order_item.product_id,
                                'product_name': order_item.product_name,
                                'quantity': order_item.quantity
                            })
                        else:
                            available_quantity = PaymentService._get_order_item_available_quantity(order_item)
                        if product and available_quantity is not None and available_quantity < order_item.quantity:
                            insufficient_items.append({
                                'product_id': product.id,
                                'product_name': order_item.product_name,
                                'required': order_item.quantity,
                                'available': available_quantity
                            })
                    except Exception:
                        # Товар был удален
                        unavailable_items.append({
                            'product_id': order_item.product_id,
                            'product_name': order_item.product_name,
                            'quantity': order_item.quantity
                        })

                # Если есть недоступные товары - откатываем транзакцию и возвращаем ошибку
                if unavailable_items or insufficient_items:
                    error_msg = "Недоступные товары в заказе"
                    if unavailable_items:
                        error_msg += f": недоступны {len(unavailable_items)} товар(ов)"
                    if insufficient_items:
                        error_msg += f": недостаточно {len(insufficient_items)} товар(ов)"

                    PaymentService.log_error(
                        ValueError(error_msg),
                        {
                            'order_id': order.id,
                            'payment_id': payment.id,
                            'unavailable_items': unavailable_items,
                            'insufficient_items': insufficient_items
                        }
                    )
                    raise ValueError(error_msg)

                # Все товары доступны - списываем со склада
                # Для просроченных заказов товары уже возвращены на склад, так что списываем снова
                for order_item in order.items.filter(product__isnull=False):
                    sku = PaymentService._decrement_order_item_stock(order_item)
                    stock_left = sku.stock_quantity if sku and sku.stock_quantity is not None else 'unlimited'
                    PaymentService.log_info(
                        f"Списан товар: {order_item.product.name}, количество: {order_item.quantity}, остаток: {stock_left}"
                    )

                # Обновляем счетчики популярности товаров
                for order_item in order.items.filter(product__isnull=False):
                    product = order_item.product
                    product.order_count += order_item.quantity
                    product.save(update_fields=['order_count'])

                # Активируем курсы в заказе
                courses_activated = 0
                for order_item in order.items.filter(course__isnull=False):
                    try:
                        # Проверяем согласие с условиями для платных курсов
                        if order_item.course.price > 0 and not order_item.disclaimer_accepted:
                            PaymentService.log_warning(f"Курс {order_item.course.title} не имеет согласия с условиями при активации, пропускаем")
                            continue  # Пропускаем курс без согласия

                        # Создаем UserCourse для предоставления доступа к курсу
                        user_course, created = UserCourse.objects.get_or_create(
                            user=payment.user,
                            course=order_item.course,
                            pet=order_item.pet,
                            defaults={'purchased_at': order.created_at}
                        )

                        if created:
                            PaymentService.log_info(f"Создан UserCourse для курса {order_item.course.title}")
                        else:
                            PaymentService.log_info(f"UserCourse уже существует для курса {order_item.course.title}")

                        # Обновляем счетчик популярности курса
                        order_item.course.order_count += 1
                        order_item.course.save(update_fields=['order_count'])

                        courses_activated += 1
                        PaymentService.log_info(f"Доступ к курсу предоставлен: user={payment.user.email}, course={order_item.course.title}", {
                            'payment_id': payment.id,
                            'user_id': payment.user.id,
                            'course_id': order_item.course.id,
                            'order_id': order.id
                        })

                    except Exception as e:
                        PaymentService.log_error(f"Ошибка активации курса {order_item.course.title}: {e}", {
                            'payment_id': payment.id,
                            'order_id': order.id,
                            'course_id': order_item.course.id,
                            'error': str(e)
                        })
                        raise  # Пробрасываем исключение, чтобы транзакция откатилась

                # Определяем статус заказа в зависимости от состава
                if course_items > 0 and product_items == 0:
                    # Только курсы - доставлены сразу
                    order.status = 'delivered'
                    PaymentService.log_info(f"Заказ курсов доставлен автоматически: {order.id} (активировано {courses_activated} курсов)", {
                        'order_id': order.id,
                        'payment_id': payment.id,
                        'courses_activated': courses_activated
                    })
                elif product_items > 0 and course_items == 0:
                    # Только товары - в обработке
                    order.status = 'processing'
                    PaymentService.log_info(f"Заказ товаров активирован после оплаты и товары списаны: {order.id}", {
                        'order_id': order.id,
                        'payment_id': payment.id
                    })
                elif product_items > 0 and course_items > 0:
                    # Товары И курсы - курсы активированы, товары в обработке
                    order.status = 'partially_delivered'
                    PaymentService.log_info(f"Заказ с товарами и курсами: активировано {courses_activated} курсов, товары в обработке: {order.id}", {
                        'order_id': order.id,
                        'payment_id': payment.id,
                        'courses_activated': courses_activated
                    })
                else:
                    # Неверный состав заказа
                    PaymentService.log_error(f"Заказ {order.id} имеет некорректный состав", {
                        'order_id': order.id,
                        'product_items': product_items,
                        'course_items': course_items
                    })
                    raise ValueError(f"Заказ имеет некорректный состав: {product_items} товаров, {course_items} курсов")

                order.expires_at = None  # Убираем срок истечения после успешной оплаты
                order.save()

                try:
                    from apps.integrations.services import DinozavrikOrderService
                    DinozavrikOrderService.send_after_payment(payment)
                except Exception as e:
                    PaymentService.log_error(e, {
                        'payment_id': payment.id,
                        'order_id': order.id,
                        'action': 'dinozavrik_send_after_payment_failed'
                    })
                    if getattr(settings, 'DINOZAVRIK_ORDER_SYNC_STRICT', False):
                        raise

        except ValueError:
            # Бизнес-логика ошибки (недоступные товары) - пробрасываем выше
            raise
        except Exception as e:
            # Неожиданная ошибка активации - логируем и пробрасываем
            PaymentService.log_error(e, {
                'payment_id': payment.id,
                'order_id': payment.object_id,
                'error_type': type(e).__name__
            })
            raise

    @staticmethod
    def _activate_course_access(payment: Payment):
        """Предоставление доступа к курсу после оплаты."""
        from apps.training.models import Course, UserCourse
        from apps.pets.models import Pet

        if not payment.user:
            PaymentService.log_info(f"Невозможно предоставить доступ к курсу: пользователь удалён для платежа {payment.id}", {
                'payment_id': payment.id
            })
            return

        try:
            course = Course.objects.get(id=payment.object_id)
            
            # Получение pet_id из metadata (если есть)
            pet = None
            if payment.metadata and payment.metadata.get('pet_id'):
                try:
                    pet = Pet.objects.get(id=payment.metadata['pet_id'], owner=payment.user)
                except Pet.DoesNotExist:
                    PaymentService.log_info(f"Питомец не найден для платежа {payment.id}, курс будет привязан без питомца", {
                        'payment_id': payment.id
                    })
            
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
            PaymentService.log_info(f"Доступ к курсу предоставлен: user={payment.user.email}, course={course.title}{pet_info}", {
                'payment_id': payment.id,
                'user_id': payment.user.id,
                'course_id': course.id
            })
        except Course.DoesNotExist:
            PaymentService.log_error(Exception(f"Курс не найден для платежа: {payment.id}"), {
                'payment_id': payment.id
            })

    @staticmethod
    def _activate_subscription(payment: Payment):
        """Активация подписки после оплаты."""
        # Будущая функциональность
        PaymentService.log_info(f"Подписка активирована: {payment.id}", {'payment_id': payment.id})

    @staticmethod
    def _activate_unified_checkout(payment: Payment):
        """Активация единого чекаута после оплаты (товары + курсы)."""
        from apps.shop.models import Order, OrderItem
        from apps.training.models import Course, UserCourse
        from apps.pets.models import Pet

        if not payment.user:
            PaymentService.log_info(f"Невозможно активировать unified checkout: пользователь удалён для платежа {payment.id}", {
                'payment_id': payment.id
            })
            return

        metadata = payment.metadata or {}

        # Получаем заказ (для unified_checkout object_id - это ID заказа)
        try:
            order = Order.objects.prefetch_related(
                'items__product', 'items__sku', 'items__course', 'items__pet'
            ).get(id=payment.object_id, user=payment.user)

            # Анализируем состав заказа
            total_items = order.items.count()
            product_items = order.items.filter(product__isnull=False).count()
            course_items = order.items.filter(course__isnull=False).count()
            invalid_items = order.items.filter(product__isnull=True, course__isnull=True).count()

            PaymentService.log_info(f"Начинаем активацию unified checkout заказа {order.id} для платежа {payment.id}", {
                'order_id': order.id,
                'payment_id': payment.id,
                'order_status': order.status,
                'total_items': total_items,
                'product_items': product_items,
                'course_items': course_items,
                'invalid_items': invalid_items
            })

            if invalid_items > 0:
                PaymentService.log_error(f"Unified checkout заказ {order.id} содержит некорректные элементы", {
                    'order_id': order.id,
                    'invalid_items': invalid_items
                })
                raise ValueError(f"Заказ содержит {invalid_items} некорректных элементов")

            # Используем транзакцию для атомарности операции
            with transaction.atomic():
                # Если заказ был просрочен - возвращаем его в pending и устанавливаем новый срок
                if order.status == 'expired':
                    order.status = 'pending'
                    order.expires_at = timezone.now() + timedelta(minutes=10)
                    PaymentService.log_info(f"Просроченный unified checkout заказ восстановлен: {order.id}", {
                        'order_id': order.id,
                        'payment_id': payment.id
                    })

                # Проверяем и списываем товары со склада
                for order_item in order.items.filter(product__isnull=False):
                    product = order_item.product
                    available_quantity = PaymentService._get_order_item_available_quantity(order_item)
                    if available_quantity is not None and available_quantity < order_item.quantity:
                        # Это не должно происходить, если проверки были сделаны при создании заказа
                        PaymentService.log_error(
                            Exception(f"Недостаточно товара на складе в unified checkout: {product.name}"),
                            {
                                'payment_id': payment.id,
                                'product_name': product.name,
                                'required': order_item.quantity,
                                'available': available_quantity
                            }
                        )
                        raise ValueError(f"Недостаточно товара {product.name} на складе")
                    sku = PaymentService._decrement_order_item_stock(order_item)
                    stock_left = sku.stock_quantity if sku and sku.stock_quantity is not None else 'unlimited'
                    PaymentService.log_info(
                        f"Списан товар в unified checkout: {product.name}, количество: {order_item.quantity}, остаток: {stock_left}"
                    )

                # Активируем курсы в заказе
                courses_activated = 0
                for order_item in order.items.filter(course__isnull=False):
                    try:
                        # Проверяем согласие с условиями для платных курсов
                        if order_item.course.price > 0 and not order_item.disclaimer_accepted:
                            PaymentService.log_warning(f"Курс {order_item.course.title} не имеет согласия с условиями при активации, пропускаем")
                            continue  # Пропускаем курс без согласия

                        # Доступ к курсу уже должен быть предоставлен при создании UserCourse
                        # Просто проверяем, что UserCourse существует
                        user_course_exists = UserCourse.objects.filter(
                            user=payment.user,
                            course=order_item.course,
                            pet=order_item.pet
                        ).exists()

                        if user_course_exists:
                            PaymentService.log_info(f"Доступ к курсу подтверждён: user={payment.user.email}, course={order_item.course.title}", {
                                'payment_id': payment.id,
                                'user_id': payment.user.id,
                                'course_id': order_item.course.id,
                                'order_id': order.id
                            })
                        else:
                            PaymentService.log_error(f"UserCourse не найден для курса {order_item.course.title}", {
                                'payment_id': payment.id,
                                'order_id': order.id,
                                'course_id': order_item.course.id
                            })

                        # Обновляем счетчик популярности курса
                        order_item.course.order_count += 1
                        order_item.course.save(update_fields=['order_count'])

                        courses_activated += 1

                    except Exception as e:
                        PaymentService.log_error(f"Ошибка активации курса {order_item.course.title}: {e}", {
                            'payment_id': payment.id,
                            'order_id': order.id,
                            'course_id': order_item.course.id,
                            'error': str(e)
                        })
                        raise  # Пробрасываем исключение, чтобы транзакция откатилась

                # Определяем статус заказа в зависимости от состава
                if course_items > 0 and product_items == 0:
                    # Только курсы - доставлены сразу
                    order.status = 'delivered'
                    PaymentService.log_info(f"Unified checkout заказ курсов доставлен автоматически: {order.id} (активировано {courses_activated} курсов)", {
                        'order_id': order.id,
                        'payment_id': payment.id,
                        'courses_activated': courses_activated
                    })
                elif product_items > 0 and course_items == 0:
                    # Только товары - в обработке
                    order.status = 'processing'
                    PaymentService.log_info(f"Unified checkout заказ товаров активирован после оплаты и товары списаны: {order.id}", {
                        'order_id': order.id,
                        'payment_id': payment.id
                    })
                elif product_items > 0 and course_items > 0:
                    # Товары И курсы - курсы активированы, товары в обработке
                    order.status = 'partially_delivered'
                    PaymentService.log_info(f"Unified checkout заказ с товарами и курсами: активировано {courses_activated} курсов, товары в обработке: {order.id}", {
                        'order_id': order.id,
                        'payment_id': payment.id,
                        'courses_activated': courses_activated
                    })
                else:
                    # Неверный состав заказа
                    PaymentService.log_error(f"Unified checkout заказ {order.id} имеет некорректный состав", {
                        'order_id': order.id,
                        'product_items': product_items,
                        'course_items': course_items
                    })
                    raise ValueError(f"Заказ имеет некорректный состав: {product_items} товаров, {course_items} курсов")

                order.expires_at = None  # Убираем срок истечения после успешной оплаты
                order.save()

                try:
                    from apps.integrations.services import DinozavrikOrderService
                    DinozavrikOrderService.send_after_payment(payment)
                except Exception as e:
                    PaymentService.log_error(e, {
                        'payment_id': payment.id,
                        'order_id': order.id,
                        'action': 'dinozavrik_send_after_payment_failed'
                    })
                    if getattr(settings, 'DINOZAVRIK_ORDER_SYNC_STRICT', False):
                        raise

        except Order.DoesNotExist:
            PaymentService.log_error(Exception(f"Заказ не найден для unified checkout платежа: {payment.id}"), {
                'payment_id': payment.id,
                'object_id': payment.object_id
            })
        except ValueError:
            # Бизнес-логика ошибки - пробрасываем выше
            raise
        except Exception as e:
            # Неожиданная ошибка активации - логируем и пробрасываем
            PaymentService.log_error(e, {
                'payment_id': payment.id,
                'order_id': payment.object_id,
                'error_type': type(e).__name__
            })
            raise

    @staticmethod
    def get_payment_amount(payment_type: str, object_id: str, user) -> Optional[Decimal]:
        """
        Получение суммы платежа для разных типов объектов.

        Args:
            payment_type: Тип платежа (shop_order, unified_checkout, course, subscription)
            object_id: ID связанного объекта
            user: Пользователь

        Returns:
            Decimal или None: Сумма платежа или None если объект недоступен

        Raises:
            ValueError: При недоступных товарах/курсах в заказе (с деталями в сообщении)
        """
        import logging
        from datetime import timedelta

        logger = logging.getLogger('apps.payments')

        if payment_type == 'shop_order':
            from apps.shop.models import Order
            from django.utils import timezone

            try:
                order = Order.objects.select_related('user').prefetch_related('items__product', 'items__sku').get(
                    id=object_id, user=user
                )

                if order.status not in ['pending', 'expired']:
                    logger.warning(
                        f"Попытка оплаты заказа с недопустимым статусом: {order.id}, статус: {order.status}"
                    )
                    return None

                if order.status == 'expired':
                    unavailable_items = []
                    insufficient_items = []

                    for order_item in order.items.filter(product__isnull=False):
                        try:
                            product = order_item.product
                            if not product:
                                unavailable_items.append({
                                    'product_id': order_item.product_id,
                                    'product_name': order_item.product_name,
                                    'quantity': order_item.quantity
                                })
                            else:
                                available_quantity = PaymentService._get_order_item_available_quantity(order_item)
                            if product and available_quantity is not None and available_quantity < order_item.quantity:
                                insufficient_items.append({
                                    'product_id': product.id,
                                    'product_name': order_item.product_name,
                                    'required': order_item.quantity,
                                    'available': available_quantity
                                })
                        except Exception:
                            unavailable_items.append({
                                'product_id': order_item.product_id,
                                'product_name': order_item.product_name,
                                'quantity': order_item.quantity
                            })

                    if unavailable_items or insufficient_items:
                        error_data = {}
                        if unavailable_items:
                            error_data['unavailable_items'] = unavailable_items
                        if insufficient_items:
                            error_data['insufficient_items'] = insufficient_items
                        raise ValueError(f"Недоступные товары в заказе: {error_data}")

                    order.status = 'pending'
                    order.expires_at = timezone.now() + timedelta(minutes=10)
                    order.save()
                    logger.info(f"Просроченный заказ восстановлен для оплаты: {order.id}")

                return order.total_amount
            except Order.DoesNotExist:
                return None

        elif payment_type == 'unified_checkout':
            from apps.shop.models import Order
            from apps.training.models import Course, UserCourse
            from django.utils import timezone

            try:
                order = Order.objects.select_related('user').prefetch_related(
                    'items__product', 'items__sku', 'items__course'
                ).get(id=object_id, user=user)

                if order.status not in ['pending', 'expired']:
                    logger.warning(
                        f"Попытка оплаты unified_checkout заказа с недопустимым статусом: "
                        f"{order.id}, статус: {order.status}"
                    )
                    return None

                if order.status == 'expired':
                    unavailable_items = []
                    insufficient_items = []

                    for order_item in order.items.filter(product__isnull=False):
                        try:
                            product = order_item.product
                            if not product:
                                unavailable_items.append({
                                    'product_id': order_item.product_id,
                                    'product_name': order_item.product_name,
                                    'quantity': order_item.quantity
                                })
                            else:
                                available_quantity = PaymentService._get_order_item_available_quantity(order_item)
                            if product and available_quantity is not None and available_quantity < order_item.quantity:
                                insufficient_items.append({
                                    'product_id': product.id,
                                    'product_name': order_item.product_name,
                                    'required': order_item.quantity,
                                    'available': available_quantity
                                })
                        except Exception:
                            unavailable_items.append({
                                'product_id': order_item.product_id,
                                'product_name': order_item.product_name,
                                'quantity': order_item.quantity
                            })

                    for order_item in order.items.filter(course__isnull=False):
                        try:
                            course = order_item.course
                            if not course or not course.is_active:
                                unavailable_items.append({
                                    'course_id': order_item.course_id,
                                    'course_name': order_item.product_name,
                                    'quantity': 1
                                })
                            elif UserCourse.objects.filter(user=user, course=course).exists():
                                unavailable_items.append({
                                    'course_id': course.id,
                                    'course_name': course.title,
                                    'quantity': 1,
                                    'reason': 'already_purchased'
                                })
                        except Exception:
                            unavailable_items.append({
                                'course_id': order_item.course_id,
                                'course_name': order_item.product_name,
                                'quantity': 1
                            })

                    if unavailable_items or insufficient_items:
                        error_data = {}
                        if unavailable_items:
                            error_data['unavailable_items'] = unavailable_items
                        if insufficient_items:
                            error_data['insufficient_items'] = insufficient_items
                        raise ValueError(f"Недоступные товары или курсы в заказе: {error_data}")

                    order.status = 'pending'
                    order.expires_at = timezone.now() + timedelta(minutes=10)
                    order.save()
                    logger.info(f"Просроченный unified_checkout заказ восстановлен для оплаты: {order.id}")

                return order.total_amount
            except Order.DoesNotExist:
                return None

        elif payment_type == 'course':
            from apps.training.models import Course, UserCourse

            try:
                course = Course.objects.get(id=object_id, is_active=True)
                if UserCourse.objects.filter(user=user, course=course).exists():
                    return None
                return course.price
            except Course.DoesNotExist:
                return None

        elif payment_type == 'subscription':
            return None

        return None

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
