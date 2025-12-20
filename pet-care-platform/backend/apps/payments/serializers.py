"""
Сериализаторы для API платежей
"""

from rest_framework import serializers
from .models import Payment


class PaymentCreateSerializer(serializers.Serializer):
    """
    Сериализатор для создания платежа.
    """
    payment_type = serializers.ChoiceField(
        choices=Payment.PAYMENT_TYPE_CHOICES,
        required=True,
        help_text='Тип платежа (shop_order, course, subscription)'
    )
    object_id = serializers.CharField(
        max_length=36,
        required=True,
        help_text='ID связанного объекта (заказа, курса и т.д.)'
    )
    payment_method = serializers.ChoiceField(
        choices=Payment.PAYMENT_METHOD_CHOICES,
        default='card',
        help_text='Метод оплаты'
    )
    metadata = serializers.DictField(
        required=False,
        default=dict,
        help_text='Дополнительные данные платежа'
    )


class PaymentSerializer(serializers.ModelSerializer):
    """
    Сериализатор для отображения платежа.
    """
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_type', 'object_id', 'amount', 'currency',
            'status', 'payment_method', 'external_payment_id',
            'payment_gateway', 'metadata', 'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = ['id', 'external_payment_id', 'payment_gateway', 'created_at', 'updated_at', 'completed_at']


class PaymentConfirmSerializer(serializers.Serializer):
    """
    Сериализатор для подтверждения платежа.
    """
    external_payment_id = serializers.CharField(
        max_length=100,
        required=False,
        help_text='ID платежа во внешней системе'
    )
