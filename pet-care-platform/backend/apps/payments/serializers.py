"""
Сериализаторы для API платежей
"""

from rest_framework import serializers
from django.utils import timezone
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


class PaymentPageSerializer(serializers.Serializer):
    """
    Сериализатор для единой страницы оплаты.
    
    Принимает данные карты и информацию о платеже.
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
    
    # Данные карты
    card_number = serializers.CharField(
        max_length=19,
        required=True,
        help_text='Номер карты (может содержать пробелы или дефисы)'
    )
    cardholder_name = serializers.CharField(
        max_length=100,
        required=True,
        help_text='Имя держателя карты'
    )
    expiry_month = serializers.CharField(
        max_length=2,
        required=True,
        help_text='Месяц окончания действия (MM)'
    )
    expiry_year = serializers.CharField(
        max_length=4,
        required=True,
        help_text='Год окончания действия (YYYY)'
    )
    cvv = serializers.CharField(
        max_length=4,
        required=True,
        help_text='CVV код карты'
    )
    
    def validate_card_number(self, value):
        """Валидация номера карты (базовая проверка)."""
        # Удаляем пробелы и дефисы
        cleaned = value.replace(' ', '').replace('-', '')
        # Проверяем, что это цифры и длина корректна
        if not cleaned.isdigit():
            raise serializers.ValidationError('Номер карты должен содержать только цифры')
        if len(cleaned) < 13 or len(cleaned) > 19:
            raise serializers.ValidationError('Номер карты должен содержать от 13 до 19 цифр')
        return cleaned
    
    def validate_expiry_month(self, value):
        """Валидация месяца."""
        try:
            month = int(value)
            if month < 1 or month > 12:
                raise serializers.ValidationError('Месяц должен быть от 01 до 12')
        except ValueError:
            raise serializers.ValidationError('Месяц должен быть числом')
        return value.zfill(2)
    
    def validate_expiry_year(self, value):
        """Валидация года."""
        try:
            year = int(value)
            current_year = int(str(timezone.now().year)[-2:])  # Последние 2 цифры
            if len(value) == 2:
                if year < current_year:
                    raise serializers.ValidationError('Год не может быть в прошлом')
            elif len(value) == 4:
                if year < timezone.now().year:
                    raise serializers.ValidationError('Год не может быть в прошлом')
        except ValueError:
            raise serializers.ValidationError('Год должен быть числом')
        return value
    
    def validate_cvv(self, value):
        """Валидация CVV."""
        if not value.isdigit():
            raise serializers.ValidationError('CVV должен содержать только цифры')
        if len(value) < 3 or len(value) > 4:
            raise serializers.ValidationError('CVV должен содержать 3 или 4 цифры')
        return value


