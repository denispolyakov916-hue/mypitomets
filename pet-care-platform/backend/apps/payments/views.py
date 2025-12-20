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
from .serializers import PaymentCreateSerializer, PaymentSerializer, PaymentConfirmSerializer
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
                payment_method=payment_method,
                metadata=serializer.validated_data.get('metadata', {})
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Автоматическая обработка платежа (имитация)
        success = PaymentService.process_payment(payment)

        if success:
            serializer = PaymentSerializer(payment)
            return Response({
                'message': 'Платеж создан и обрабатывается',
                'payment': serializer.data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {'error': 'Не удалось создать платеж'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _get_payment_amount(self, payment_type, object_id, user):
        """
        Получение суммы платежа для разных типов объектов.
        """
        if payment_type == 'shop_order':
            from apps.shop.models import Order
            try:
                order = Order.objects.get(id=object_id, user=user)
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
