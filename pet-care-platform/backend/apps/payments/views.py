"""
Views для единой системы платежей

Единая точка входа для всех платежей на платформе.
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Payment
from .serializers import PaymentCreateSerializer, PaymentSerializer, PaymentConfirmSerializer, PaymentPageSerializer
from .services import PaymentService

logger = logging.getLogger('apps.payments')


class PaymentCreateView(APIView):
    """
    Создание платежа.

    POST /api/payments/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PaymentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        payment_type = serializer.validated_data['payment_type']
        object_id = serializer.validated_data['object_id']
        payment_method = serializer.validated_data.get('payment_method', 'card')

        # Проверка существования связанного объекта и получение суммы
        try:
            amount = self._get_payment_amount(payment_type, object_id, request.user)
        except ValueError as e:
            # Обработка ошибок недоступных товаров
            error_msg = str(e)
            from core.exceptions import ApiError
            if 'Недоступные товары' in error_msg or 'Недоступные товары или курсы' in error_msg:
                raise ApiError.bad_request(error_msg, error_code='UNAVAILABLE_ITEMS')
            raise ApiError.bad_request(error_msg)
        
        if amount is None:
            # Пытаемся определить причину для более информативного сообщения
            error_message = 'Связанный объект не найден или недоступен'
            if payment_type == 'shop_order' or payment_type == 'unified_checkout':
                from apps.shop.models import Order
                try:
                    order = Order.objects.get(id=object_id, user=request.user)
                    if order.status not in ['pending', 'expired']:
                        if order.status == 'processing':
                            error_message = 'Заказ уже оплачен'
                        elif order.status == 'cancelled':
                            error_message = 'Заказ отменен'
                        else:
                            error_message = f'Заказ недоступен для оплаты (статус: {order.get_status_display()})'
                except Order.DoesNotExist:
                    pass
            elif payment_type == 'course':
                from apps.training.models import Course, UserCourse
                try:
                    course = Course.objects.get(id=object_id, is_active=True)
                    if UserCourse.objects.filter(user=request.user, course=course).exists():
                        error_message = 'Курс уже приобретен'
                except Course.DoesNotExist:
                    pass
            
            return Response(
                {'error': error_message},
                status=status.HTTP_404_NOT_FOUND
            )

        if amount == 0:
            return Response(
                {'error': 'Оплата не требуется (бесплатно)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Создание платежа (только создание, без автоматической обработки)
        try:
            payment = PaymentService.create_payment(
                user=request.user,
                payment_type=payment_type,
                object_id=object_id,
                amount=amount,
                payment_method=payment_method,
                metadata=serializer.validated_data.get('metadata', {})
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PaymentSerializer(payment)
        return Response({
            'message': 'Платеж создан',
            'payment': serializer.data
        }, status=status.HTTP_201_CREATED)

    def _get_payment_amount(self, payment_type, object_id, user):
        """
        Получение суммы платежа для разных типов объектов.
        """
        if payment_type == 'shop_order':
            from apps.shop.models import Order
            from django.utils import timezone
            from datetime import timedelta
            import logging
            logger = logging.getLogger('apps.payments')
            
            try:
                order = Order.objects.select_related('user').prefetch_related('items__product').get(id=object_id, user=user)
                
                # Проверяем, можно ли оплатить заказ
                # Можно оплатить только заказы со статусом 'pending' или 'expired'
                if order.status not in ['pending', 'expired']:
                    logger.warning(f"Попытка оплаты заказа с недопустимым статусом: {order.id}, статус: {order.status}")
                    return None  # Заказ уже оплачен или отменен
                
                # Если заказ просрочен - проверяем доступность товаров перед восстановлением
                if order.status == 'expired':
                    unavailable_items = []
                    insufficient_items = []
                    
                    for order_item in order.items.filter(product__isnull=False):
                        try:
                            product = order_item.product
                            # Проверяем, существует ли товар и доступен ли он
                            if not product:
                                unavailable_items.append({
                                    'product_id': order_item.product_id,
                                    'product_name': order_item.product_name,
                                    'quantity': order_item.quantity
                                })
                            # Проверяем наличие на складе
                            elif product.stock_count < order_item.quantity:
                                insufficient_items.append({
                                    'product_id': product.id,
                                    'product_name': order_item.product_name,
                                    'required': order_item.quantity,
                                    'available': product.stock_count
                                })
                        except Exception:
                            # Товар был удален
                            unavailable_items.append({
                                'product_id': order_item.product_id,
                                'product_name': order_item.product_name,
                                'quantity': order_item.quantity
                            })
                    
                    # Если есть недоступные товары - возвращаем ошибку
                    if unavailable_items or insufficient_items:
                        error_data = {}
                        if unavailable_items:
                            error_data['unavailable_items'] = unavailable_items
                        if insufficient_items:
                            error_data['insufficient_items'] = insufficient_items
                        # Сохраняем информацию об ошибке в metadata платежа (если он уже создан)
                        raise ValueError(f"Недоступные товары в заказе: {error_data}")
                    
                    # Все товары доступны - восстанавливаем заказ
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
            from datetime import timedelta
            import logging
            logger = logging.getLogger('apps.payments')
            
            try:
                # Для unified_checkout object_id может быть ID заказа товаров
                order = Order.objects.select_related('user').prefetch_related('items__product', 'items__course').get(id=object_id, user=user)
                
                # Проверяем, можно ли оплатить заказ
                # Можно оплатить только заказы со статусом 'pending' или 'expired'
                if order.status not in ['pending', 'expired']:
                    logger.warning(f"Попытка оплаты unified_checkout заказа с недопустимым статусом: {order.id}, статус: {order.status}")
                    return None  # Заказ уже оплачен или отменен
                
                # Если заказ просрочен - проверяем доступность товаров и курсов перед восстановлением
                if order.status == 'expired':
                    unavailable_items = []
                    insufficient_items = []
                    
                    # Проверяем товары
                    for order_item in order.items.filter(product__isnull=False):
                        try:
                            product = order_item.product
                            if not product:
                                unavailable_items.append({
                                    'product_id': order_item.product_id,
                                    'product_name': order_item.product_name,
                                    'quantity': order_item.quantity
                                })
                            elif product.stock_count < order_item.quantity:
                                insufficient_items.append({
                                    'product_id': product.id,
                                    'product_name': order_item.product_name,
                                    'required': order_item.quantity,
                                    'available': product.stock_count
                                })
                        except Exception:
                            unavailable_items.append({
                                'product_id': order_item.product_id,
                                'product_name': order_item.product_name,
                                'quantity': order_item.quantity
                            })
                    
                    # Проверяем курсы - они должны быть активны и не куплены
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
                                # Курс уже куплен - нельзя оплатить заказ с этим курсом
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
                    
                    # Если есть недоступные товары/курсы - возвращаем ошибку
                    if unavailable_items or insufficient_items:
                        error_data = {}
                        if unavailable_items:
                            error_data['unavailable_items'] = unavailable_items
                        if insufficient_items:
                            error_data['insufficient_items'] = insufficient_items
                        raise ValueError(f"Недоступные товары или курсы в заказе: {error_data}")
                    
                    # Все товары и курсы доступны - восстанавливаем заказ
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
                # Проверка, что курс ещё не куплен
                if UserCourse.objects.filter(user=user, course=course).exists():
                    return None  # Уже куплен
                return course.price
            except Course.DoesNotExist:
                return None

        elif payment_type == 'subscription':
            # Будущая функциональность подписок
            return None

        return None


class PaymentDetailView(APIView):
    """
    Детали платежа.

    GET /api/payments/{payment_id}/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, payment_id):
        try:
            payment = Payment.objects.get(id=payment_id, user=request.user)
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Платеж не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PaymentSerializer(payment)
        return Response({'payment': serializer.data}, status=status.HTTP_200_OK)


class PaymentListView(APIView):
    """
    Список платежей пользователя.

    GET /api/payments/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(user=request.user)

        # Фильтры
        payment_type = request.query_params.get('type')
        status_filter = request.query_params.get('status')

        if payment_type:
            payments = payments.filter(payment_type=payment_type)
        if status_filter:
            payments = payments.filter(status=status_filter)

        # Пагинация (упрощённая)
        payments = payments[:50]  # Ограничение для производительности

        serializer = PaymentSerializer(payments, many=True)
        return Response({
            'payments': serializer.data,
            'count': payments.count()
        }, status=status.HTTP_200_OK)


class PaymentByOrderView(APIView):
    """
    Получение платежа по ID заказа.

    GET /api/payments/by-order/{order_id}/
    
    Возвращает существующий платеж для заказа, если он существует и не завершен.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        try:
            # Ищем платеж для этого заказа (любой тип платежа)
            payment = Payment.objects.filter(
                user=request.user,
                object_id=order_id,
                status__in=['pending', 'processing']
            ).order_by('-created_at').first()

            if payment:
                serializer = PaymentSerializer(payment)
                return Response({'payment': serializer.data}, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Платеж не найден для этого заказа'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            logger.error(f"Ошибка при получении платежа по заказу: {str(e)}")
            return Response(
                {'error': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentConfirmView(APIView):
    """
    Подтверждение платежа.

    POST /api/payments/{payment_id}/confirm/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, payment_id):
        serializer = PaymentConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        external_payment_id = serializer.validated_data.get('external_payment_id')

        success = PaymentService.confirm_payment(payment_id, external_payment_id)

        if success:
            try:
                payment = Payment.objects.get(id=payment_id, user=request.user)
                serializer = PaymentSerializer(payment)
                return Response({
                    'message': 'Платеж успешно подтверждён',
                    'payment': serializer.data
                }, status=status.HTTP_200_OK)
            except Payment.DoesNotExist:
                return Response(
                    {'error': 'Платеж не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {'error': 'Не удалось подтвердить платеж'},
                status=status.HTTP_400_BAD_REQUEST
            )


class PaymentCancelView(APIView):
    """
    Отмена платежа.

    POST /api/payments/{payment_id}/cancel/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, payment_id):
        reason = request.data.get('reason', 'Отменено пользователем')

        success = PaymentService.cancel_payment(payment_id, reason)

        if success:
            try:
                payment = Payment.objects.get(id=payment_id, user=request.user)
                serializer = PaymentSerializer(payment)
                return Response({
                    'message': 'Платеж успешно отменён',
                    'payment': serializer.data
                }, status=status.HTTP_200_OK)
            except Payment.DoesNotExist:
                return Response(
                    {'error': 'Платеж не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {'error': 'Не удалось отменить платеж'},
                status=status.HTTP_400_BAD_REQUEST
            )


class PaymentStatisticsView(APIView):
    """
    Статистика платежей пользователя.

    GET /api/payments/statistics/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        stats = PaymentService.get_payment_statistics(request.user)
        return Response({'statistics': stats}, status=status.HTTP_200_OK)


class PaymentPageView(APIView):
    """
    Единая страница оплаты с полями для ввода карты.
    
    POST /api/payments/page/
    Принимает данные карты и создает/обрабатывает платеж.
    Любая карта принимается (заглушка для MVP).
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Обработка платежа с карты."""
        from .serializers import PaymentPageSerializer
        
        serializer = PaymentPageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        payment_type = serializer.validated_data['payment_type']
        object_id = serializer.validated_data['object_id']
        
        # Получение суммы платежа
        amount = self._get_payment_amount(payment_type, object_id, request.user)
        if amount is None:
            return Response(
                {'error': 'Связанный объект не найден или недоступен'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if amount == 0:
            return Response(
                {'error': 'Оплата не требуется (бесплатно)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создание платежа
        try:
            payment = PaymentService.create_payment(
                user=request.user,
                payment_type=payment_type,
                object_id=object_id,
                amount=amount,
                payment_method='card',
                metadata={
                    'card_last4': serializer.validated_data.get('card_number', '')[-4:] if serializer.validated_data.get('card_number') else None,
                    'cardholder_name': serializer.validated_data.get('cardholder_name'),
                }
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Обработка платежа (имитация - любая карта проходит)
        success = PaymentService.process_payment(payment)
        
        if success:
            serializer_response = PaymentSerializer(payment)
            return Response({
                'message': 'Платеж успешно обработан',
                'payment': serializer_response.data,
                'success': True
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Не удалось обработать платеж', 'success': False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_payment_amount(self, payment_type, object_id, user):
        """Получение суммы платежа для разных типов объектов."""
        if payment_type == 'shop_order':
            from apps.shop.models import Order
            import logging
            logger = logging.getLogger('apps.payments')
            
            try:
                order = Order.objects.get(id=object_id, user=user)
                # Проверяем, можно ли оплатить заказ
                # Можно оплатить только заказы со статусом 'pending' или 'expired'
                if order.status not in ['pending', 'expired']:
                    logger.warning(f"Попытка оплаты заказа с недопустимым статусом: {order.id}, статус: {order.status}")
                    return None  # Заказ уже оплачен или отменен
                return order.total_amount
            except Order.DoesNotExist:
                return None
        
        elif payment_type == 'unified_checkout':
            from apps.shop.models import Order
            from apps.training.models import Course, UserCourse
            import logging
            logger = logging.getLogger('apps.payments')
            
            try:
                order = Order.objects.select_related('user').prefetch_related('items__product', 'items__course').get(id=object_id, user=user)
                # Проверяем, можно ли оплатить заказ
                # Можно оплатить только заказы со статусом 'pending' или 'expired'
                if order.status not in ['pending', 'expired']:
                    logger.warning(f"Попытка оплаты unified_checkout заказа с недопустимым статусом: {order.id}, статус: {order.status}")
                    return None  # Заказ уже оплачен или отменен
                
                # Проверяем, что курсы в заказе еще не куплены
                for order_item in order.items.filter(course__isnull=False):
                    try:
                        course = order_item.course
                        if course and UserCourse.objects.filter(user=user, course=course).exists():
                            logger.warning(f"Курс {course.id} уже куплен пользователем {user.id}")
                            return None  # Курс уже куплен
                    except Exception:
                        pass
                
                return order.total_amount
            except Order.DoesNotExist:
                return None
        
        elif payment_type == 'course':
            from apps.training.models import Course, UserCourse
            try:
                course = Course.objects.get(id=object_id, is_active=True)
                # Проверка, что курс ещё не куплен
                if UserCourse.objects.filter(user=user, course=course).exists():
                    return None
                return course.price
            except Course.DoesNotExist:
                return None
        
        return None


