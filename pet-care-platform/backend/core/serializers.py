"""
Базовые сериализаторы и миксины для исключения дублирования.

Предоставляет готовые миксины для типичных сценариев сериализации:
- TimestampMixin: добавляет created_at, updated_at
- OwnerMixin: добавляет owner поле
- BaseModelSerializer: базовый сериализатор с общими полями
"""

from rest_framework import serializers
from django.utils import timezone


class TimestampMixin(serializers.Serializer):
    """
    Миксин для добавления полей времени создания и обновления.

    Автоматически добавляет:
    - created_at: время создания (только чтение)
    - updated_at: время последнего обновления (только чтение)
    """

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class OwnerMixin(serializers.Serializer):
    """
    Миксин для добавления поля owner.

    Автоматически добавляет:
    - owner: ссылка на пользователя-владельца (только чтение)
    - owner_id: ID владельца (только чтение)
    """

    owner = serializers.ReadOnlyField(source='owner.username')
    owner_id = serializers.ReadOnlyField(source='owner.id')


class BaseModelSerializer(TimestampMixin, OwnerMixin, serializers.ModelSerializer):
    """
    Базовый сериализатор для моделей.

    Включает общие поля и методы для всех моделей:
    - ID поля
    - поля времени
    - поля владельца
    - базовая валидация
    """

    class Meta:
        # Определяется в наследниках
        model = None
        fields = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Автоматически добавляем ID поле если его нет
        if 'id' not in self.fields and hasattr(self.Meta, 'model'):
            self.fields['id'] = serializers.ReadOnlyField()

    def create(self, validated_data):
        """Создание объекта с автоматической установкой owner."""
        # Если модель имеет поле owner и пользователь аутентифицирован
        if (hasattr(self.Meta.model, 'owner') and
            self.context.get('request') and
            self.context['request'].user.is_authenticated):

            validated_data['owner'] = self.context['request'].user

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Обновление объекта с автоматической установкой updated_at."""
        # Автоматически обновляем updated_at если поле существует
        if hasattr(instance, 'updated_at'):
            validated_data['updated_at'] = timezone.now()

        return super().update(instance, validated_data)


class CreateUpdateSerializerMixin:
    """
    Миксин для разделения сериализаторов создания и обновления.

    Позволяет использовать разные сериализаторы для POST и PUT/PATCH операций.
    """

    def get_serializer_class(self):
        """Получить класс сериализатора в зависимости от метода."""
        if self.action == 'create':
            return self.get_create_serializer_class()
        elif self.action in ['update', 'partial_update']:
            return self.get_update_serializer_class()
        return super().get_serializer_class()

    def get_create_serializer_class(self):
        """Получить сериализатор для создания. Переопределить в наследниках."""
        return self.serializer_class

    def get_update_serializer_class(self):
        """Получить сериализатор для обновления. Переопределить в наследниках."""
        return self.serializer_class


class ListDetailSerializerMixin:
    """
    Миксин для разделения сериализаторов списка и деталей.

    Позволяет использовать разные сериализаторы для list и retrieve операций.
    """

    def get_serializer_class(self):
        """Получить класс сериализатора в зависимости от действия."""
        if self.action == 'list':
            return self.get_list_serializer_class()
        elif self.action == 'retrieve':
            return self.get_detail_serializer_class()
        return super().get_serializer_class()

    def get_list_serializer_class(self):
        """Получить сериализатор для списка. Переопределить в наследниках."""
        return self.serializer_class

    def get_detail_serializer_class(self):
        """Получить сериализатор для деталей. Переопределить в наследниках."""
        return self.serializer_class


class DynamicFieldsSerializer(serializers.ModelSerializer):
    """
    Сериализатор с динамическими полями.

    Позволяет клиенту указывать какие поля нужны через query параметр 'fields'.

    Пример использования:
    GET /api/items/?fields=id,name,price
    """

    def __init__(self, *args, **kwargs):
        # Получаем список запрашиваемых полей
        fields = kwargs.pop('fields', None)
        super().__init__(*args, **kwargs)

        if fields:
            # Преобразуем строку в список
            if isinstance(fields, str):
                fields = fields.split(',')

            # Оставляем только запрашиваемые поля
            allowed = set(fields)
            existing = set(self.fields.keys())

            # Удаляем поля которых нет в запросе
            for field_name in existing - allowed:
                self.fields.pop(field_name, None)


class ReadOnlySerializer(serializers.Serializer):
    """
    Базовый сериализатор только для чтения.

    Полезен для эндпоинтов которые возвращают вычисляемые данные,
    не связанные с конкретной моделью.
    """

    def create(self, validated_data):
        raise NotImplementedError("Этот сериализатор только для чтения")

    def update(self, instance, validated_data):
        raise NotImplementedError("Этот сериализатор только для чтения")


