"""
Сериализаторы для отзывов.
"""

from rest_framework import serializers


class ReviewCreateSerializer(serializers.Serializer):
    """Сериализатор для создания отзыва."""
    
    rating = serializers.IntegerField(
        min_value=1,
        max_value=5,
        help_text="Рейтинг от 1 до 5"
    )
    comment = serializers.CharField(
        required=False,
        allow_blank=True,
        min_length=10,
        max_length=2000,
        help_text="Комментарий (10-2000 символов)"
    )
    parent_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID родительского отзыва (для ответов)"
    )
    
    def validate_comment(self, value):
        """Валидация комментария."""
        if value and len(value.strip()) < 10:
            raise serializers.ValidationError(
                "Комментарий должен содержать минимум 10 символов"
            )
        return value.strip() if value else None


class ReviewUpdateSerializer(serializers.Serializer):
    """Сериализатор для обновления отзыва."""
    
    rating = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=5
    )
    comment = serializers.CharField(
        required=False,
        allow_blank=True,
        min_length=10,
        max_length=2000
    )
    
    def validate_comment(self, value):
        """Валидация комментария."""
        if value and len(value.strip()) < 10:
            raise serializers.ValidationError(
                "Комментарий должен содержать минимум 10 символов"
            )
        return value.strip() if value else None
    
    def validate(self, attrs):
        """Проверка, что указано хотя бы одно поле для обновления."""
        if not attrs:
            raise serializers.ValidationError(
                "Необходимо указать хотя бы одно поле для обновления"
            )
        return attrs

