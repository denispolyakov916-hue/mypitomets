"""Сериализаторы ассистента."""

from rest_framework import serializers


class ChatHistoryItemSerializer(serializers.Serializer):
    """Одна прошлая реплика диалога (шлёт клиент для памяти контекста)."""
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    content = serializers.CharField(max_length=4000, allow_blank=True, trim_whitespace=False)


class ChatRequestSerializer(serializers.Serializer):
    """Входящее сообщение в чат ассистента."""
    message = serializers.CharField(max_length=2000, trim_whitespace=True, allow_blank=False)
    pet_id = serializers.UUIDField(required=False, allow_null=True)
    capability = serializers.ChoiceField(
        choices=['support', 'health', 'food'],
        required=False,
        allow_null=True,
    )
    # Недавняя история диалога — для памяти контекста. Нормализуется/обрезается в сервисе.
    history = ChatHistoryItemSerializer(many=True, required=False, default=list)


class FeedbackSerializer(serializers.Serializer):
    """Оценка ответа ассистента (👍/👎)."""
    rating = serializers.ChoiceField(choices=['up', 'down'])
    message = serializers.CharField(max_length=2000, allow_blank=True, required=False, default='')
    reply = serializers.CharField(max_length=8000, allow_blank=True, required=False, default='')
    capability = serializers.ChoiceField(
        choices=['support', 'health', 'food'],
        required=False,
        allow_null=True,
    )
