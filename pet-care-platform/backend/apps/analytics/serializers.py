"""
Сериализаторы для API аналитики и конструктора графиков.

Содержит сериализаторы для метрик, конфигураций графиков и связанных данных.
"""

from rest_framework import serializers
from django.utils import timezone

from .models import AnalyticMetric, ChartConfig, ChartSession, AnalyticsLog


class AnalyticMetricSerializer(serializers.ModelSerializer):
    """Сериализатор для метрик аналитики."""

    display_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AnalyticMetric
        fields = [
            'id', 'name', 'display_name', 'description', 'category', 'subcategory',
            'data_type', 'default_aggregation', 'available_aggregations',
            'table_name', 'field_name', 'units', 'format_pattern',
            'related_fields', 'filter_fields', 'dimension_fields',
            'is_active', 'is_system', 'cache_ttl',
            'created_at', 'updated_at', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_name']

    def get_display_name(self, obj):
        """Получить отображаемое имя метрики."""
        return obj.get_display_name()

    def get_created_by_name(self, obj):
        """Получить имя создателя метрики."""
        if obj.created_by:
            return obj.created_by.email
        return None


class ChartConfigSerializer(serializers.ModelSerializer):
    """Сериализатор для конфигураций графиков."""

    created_by_name = serializers.SerializerMethodField()
    preview_image_url = serializers.SerializerMethodField()

    class Meta:
        model = ChartConfig
        fields = [
            'id', 'name', 'description', 'chart_type',
            'canvas_config', 'x_axis_config', 'y_axis_config',
            'data_layers', 'filters_config', 'segment_config',
            'style_config', 'legend_config', 'interaction_config',
            'is_template', 'is_public', 'category', 'tags',
            'usage_count', 'last_used_at', 'preview_image_url',
            'version', 'created_at', 'updated_at', 'created_by_name'
        ]
        read_only_fields = [
            'id', 'usage_count', 'last_used_at', 'version',
            'created_at', 'updated_at', 'created_by_name', 'preview_image_url'
        ]

    def get_created_by_name(self, obj):
        """Получить имя создателя графика."""
        return obj.created_by.email

    def get_preview_image_url(self, obj):
        """Получить URL превью изображения."""
        if obj.preview_image:
            return obj.preview_image.url
        return None

    def create(self, validated_data):
        """Создать новую конфигурацию графика."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ChartConfigCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания конфигураций графиков."""

    class Meta:
        model = ChartConfig
        fields = [
            'name', 'description', 'chart_type',
            'canvas_config', 'x_axis_config', 'y_axis_config',
            'data_layers', 'filters_config', 'segment_config',
            'style_config', 'legend_config', 'interaction_config',
            'is_template', 'is_public', 'category', 'tags'
        ]

    def create(self, validated_data):
        """Создать новую конфигурацию с установкой создателя."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ChartSessionSerializer(serializers.ModelSerializer):
    """Сериализатор для сессий конструктора графиков."""

    class Meta:
        model = ChartSession
        fields = [
            'id', 'config', 'status', 'started_at',
            'last_activity_at', 'expires_at'
        ]
        read_only_fields = ['id', 'started_at', 'last_activity_at']

    def create(self, validated_data):
        """Создать сессию с установкой пользователя и времени истечения."""
        validated_data['user'] = self.context['request'].user
        # Устанавливаем время истечения через 2 часа
        validated_data['expires_at'] = timezone.now() + timezone.timedelta(hours=2)
        return super().create(validated_data)


class AnalyticsLogSerializer(serializers.ModelSerializer):
    """Сериализатор для логов аналитики."""

    user_email = serializers.SerializerMethodField()

    class Meta:
        model = AnalyticsLog
        fields = [
            'id', 'user_email', 'action', 'resource_type', 'resource_id',
            'metadata', 'ip_address', 'execution_time', 'data_points',
            'success', 'error_message', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']

    def get_user_email(self, obj):
        """Получить email пользователя."""
        return obj.user.email if obj.user else None


# Специализированные сериализаторы для API запросов

class MetricListSerializer(serializers.ModelSerializer):
    """Оптимизированный сериализатор для списка метрик."""

    display_name = serializers.SerializerMethodField()

    class Meta:
        model = AnalyticMetric
        fields = [
            'id', 'name', 'display_name', 'description', 'category',
            'subcategory', 'data_type', 'units', 'is_active'
        ]

    def get_display_name(self, obj):
        return obj.get_display_name()


class ChartTemplateSerializer(serializers.ModelSerializer):
    """Сериализатор для шаблонов графиков."""

    created_by_name = serializers.SerializerMethodField()
    preview_image_url = serializers.SerializerMethodField()

    class Meta:
        model = ChartConfig
        fields = [
            'id', 'name', 'description', 'chart_type', 'category', 'tags',
            'usage_count', 'preview_image_url', 'created_by_name', 'created_at'
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.email

    def get_preview_image_url(self, obj):
        if obj.preview_image:
            return obj.preview_image.url
        return None


class ChartDataRequestSerializer(serializers.Serializer):
    """Сериализатор для запросов данных графиков."""

    config = serializers.JSONField(
        help_text="Конфигурация графика"
    )
    data_limit = serializers.IntegerField(
        default=10000,
        min_value=1,
        max_value=50000,
        help_text="Максимальное количество точек данных"
    )

    def validate_config(self, value):
        """Валидация конфигурации графика."""
        # Проверка наличия хотя бы одной метрики
        metrics = value.get('metrics', [])
        if not metrics:
            raise serializers.ValidationError(
                "Конфигурация должна содержать хотя бы одну метрику"
            )

        return value


class ChartExportSerializer(serializers.Serializer):
    """Сериализатор для запросов экспорта графиков."""

    format = serializers.ChoiceField(
        choices=['png', 'svg', 'pdf', 'csv', 'json'],
        default='png',
        help_text="Формат экспорта"
    )
    width = serializers.IntegerField(
        default=800,
        min_value=400,
        max_value=1920,
        help_text="Ширина изображения"
    )
    height = serializers.IntegerField(
        default=600,
        min_value=300,
        max_value=1080,
        help_text="Высота изображения"
    )
    include_legend = serializers.BooleanField(
        default=True,
        help_text="Включить легенду"
    )
    transparent_bg = serializers.BooleanField(
        default=False,
        help_text="Прозрачный фон"
    )


class AnalyticsFilterSerializer(serializers.Serializer):
    """Сериализатор для фильтров аналитики."""

    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    category = serializers.CharField(max_length=100, required=False)
    status = serializers.CharField(max_length=50, required=False)
    user_type = serializers.CharField(max_length=50, required=False)
    pet_species = serializers.CharField(max_length=50, required=False)
    order_status = serializers.CharField(max_length=50, required=False)
    course_category = serializers.CharField(max_length=100, required=False)
