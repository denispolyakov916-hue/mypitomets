"""
Модели для системы аналитики и конструктора графиков Питомец+

Содержит модели для метрик, конфигураций графиков и связанных сущностей.
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class AnalyticMetric(models.Model):
    """
    Модель для описания доступных метрик системы.

    Определяет все возможные показатели, которые можно использовать
    в конструкторе графиков.
    """

    METRIC_TYPES = [
        ('count', 'Количество'),
        ('sum', 'Сумма'),
        ('avg', 'Среднее'),
        ('min', 'Минимум'),
        ('max', 'Максимум'),
        ('percentile', 'Процентиль'),
        ('distinct', 'Уникальные значения'),
    ]

    DATA_TYPES = [
        ('integer', 'Целое число'),
        ('decimal', 'Десятичное число'),
        ('string', 'Строка'),
        ('date', 'Дата'),
        ('datetime', 'Дата и время'),
        ('boolean', 'Логический'),
        ('json', 'JSON'),
    ]

    AGGREGATION_TYPES = [
        ('count', 'COUNT'),
        ('sum', 'SUM'),
        ('avg', 'AVG'),
        ('min', 'MIN'),
        ('max', 'MAX'),
        ('stddev', 'STDDEV'),
        ('variance', 'VARIANCE'),
    ]

    # Основная информация
    id = models.CharField(
        max_length=100,
        primary_key=True,
        help_text="Уникальный идентификатор метрики"
    )
    name = models.CharField(
        max_length=200,
        help_text="Человеко-понятное название метрики"
    )
    description = models.TextField(
        blank=True,
        help_text="Подробное описание метрики"
    )

    # Классификация
    category = models.CharField(
        max_length=50,
        help_text="Категория метрики (users, pets, orders, courses, etc.)"
    )
    subcategory = models.CharField(
        max_length=100,
        blank=True,
        help_text="Подкатегория для дополнительной группировки"
    )

    # Типы данных и агрегации
    data_type = models.CharField(
        max_length=20,
        choices=DATA_TYPES,
        help_text="Тип данных метрики"
    )
    default_aggregation = models.CharField(
        max_length=20,
        choices=AGGREGATION_TYPES,
        default='count',
        help_text="Агрегация по умолчанию"
    )
    available_aggregations = models.JSONField(
        default=list,
        help_text="Список доступных типов агрегации"
    )

    # SQL и источники данных
    table_name = models.CharField(
        max_length=100,
        help_text="Имя таблицы в базе данных"
    )
    field_name = models.CharField(
        max_length=100,
        help_text="Имя поля в таблице"
    )
    sql_template = models.TextField(
        blank=True,
        help_text="SQL шаблон для сложных вычислений"
    )

    # Связи и фильтры
    related_fields = models.JSONField(
        default=list,
        help_text="Связанные поля для JOIN операций"
    )
    filter_fields = models.JSONField(
        default=list,
        help_text="Поля, доступные для фильтрации"
    )
    dimension_fields = models.JSONField(
        default=list,
        help_text="Поля, доступные для группировки (оси X)"
    )

    # Мета-информация
    units = models.CharField(
        max_length=50,
        blank=True,
        help_text="Единицы измерения"
    )
    format_pattern = models.CharField(
        max_length=100,
        blank=True,
        help_text="Шаблон форматирования (для чисел, дат)"
    )

    # Настройки
    is_active = models.BooleanField(
        default=True,
        help_text="Активна ли метрика"
    )
    is_system = models.BooleanField(
        default=False,
        help_text="Системная метрика (нельзя удалять)"
    )
    cache_ttl = models.PositiveIntegerField(
        default=300,
        help_text="Время жизни кэша в секундах"
    )

    # Отслеживание
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_metrics'
    )

    class Meta:
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['table_name', 'field_name']),
        ]

    def __str__(self):
        return f"{self.category}.{self.id} - {self.name}"

    def get_display_name(self):
        """Получить отображаемое имя с единицами измерения."""
        if self.units:
            return f"{self.name} ({self.units})"
        return self.name


class ChartConfig(models.Model):
    """
    Модель для хранения конфигураций графиков.

    Содержит полную конфигурацию графика, созданного в конструкторе.
    """

    CHART_TYPES = [
        ('line', 'Линейный график'),
        ('bar', 'Столбчатая диаграмма'),
        ('area', 'Диаграмма с областями'),
        ('scatter', 'Точечная диаграмма'),
        ('bubble', 'Пузырьковая диаграмма'),
        ('pie', 'Круговая диаграмма'),
        ('combo', 'Комбинированный график'),
        ('heatmap', 'Тепловая карта'),
    ]

    # Основная информация
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(
        max_length=200,
        help_text="Название графика"
    )
    description = models.TextField(
        blank=True,
        help_text="Описание графика"
    )

    # Конфигурация
    chart_type = models.CharField(
        max_length=20,
        choices=CHART_TYPES,
        default='line',
        help_text="Основной тип графика"
    )

    # Размеры и настройки canvas
    canvas_config = models.JSONField(
        default=dict,
        help_text="Настройки холста (ширина, высота, margins)"
    )

    # Конфигурация осей
    x_axis_config = models.JSONField(
        default=dict,
        help_text="Конфигурация оси X"
    )
    y_axis_config = models.JSONField(
        default=dict,
        help_text="Конфигурация оси Y (или осей Y для multi-axis)"
    )

    # Слои данных
    data_layers = models.JSONField(
        default=list,
        help_text="Конфигурация слоев данных"
    )

    # Фильтры и сегментация
    filters_config = models.JSONField(
        default=dict,
        help_text="Настройки фильтров"
    )
    segment_config = models.JSONField(
        default=dict,
        help_text="Настройки сегментации данных"
    )

    # Стили и оформление
    style_config = models.JSONField(
        default=dict,
        help_text="Настройки стилей и цветов"
    )
    legend_config = models.JSONField(
        default=dict,
        help_text="Настройки легенды"
    )

    # Интерактивность
    interaction_config = models.JSONField(
        default=dict,
        help_text="Настройки интерактивности (tooltips, drill-down)"
    )

    # Шаблоны и категории
    is_template = models.BooleanField(
        default=False,
        help_text="Является ли конфигурация шаблоном"
    )
    is_public = models.BooleanField(
        default=False,
        help_text="Доступен ли шаблон всем пользователям"
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        help_text="Категория шаблона"
    )
    tags = models.JSONField(
        default=list,
        help_text="Теги для поиска"
    )

    # Метаданные использования
    usage_count = models.PositiveIntegerField(
        default=0,
        help_text="Количество использований"
    )
    last_used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Последнее использование"
    )

    # Превью и экспорт
    preview_image = models.ImageField(
        upload_to='chart-previews/',
        null=True,
        blank=True,
        help_text="Превью изображение графика"
    )
    export_formats = models.JSONField(
        default=list,
        help_text="Доступные форматы экспорта"
    )

    # Отслеживание
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_charts'
    )

    # Версионность
    version = models.PositiveIntegerField(
        default=1,
        help_text="Версия конфигурации"
    )
    parent_config = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_configs',
        help_text="Родительская конфигурация (для версий)"
    )

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['created_by', '-updated_at']),
            models.Index(fields=['is_template', 'is_public']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"{self.name} ({self.chart_type})"

    def increment_usage(self):
        """Увеличить счетчик использования."""
        self.usage_count += 1
        self.last_used_at = timezone.now()
        self.save(update_fields=['usage_count', 'last_used_at'])

    def create_version(self, user):
        """Создать новую версию конфигурации."""
        # Копируем текущую конфигурацию
        new_config = ChartConfig.objects.create(
            name=self.name,
            description=self.description,
            chart_type=self.chart_type,
            canvas_config=self.canvas_config,
            x_axis_config=self.x_axis_config,
            y_axis_config=self.y_axis_config,
            data_layers=self.data_layers,
            filters_config=self.filters_config,
            segment_config=self.segment_config,
            style_config=self.style_config,
            legend_config=self.legend_config,
            interaction_config=self.interaction_config,
            is_template=self.is_template,
            is_public=self.is_public,
            category=self.category,
            tags=self.tags,
            created_by=user,
            parent_config=self,
            version=self.version + 1
        )
        return new_config


class ChartSession(models.Model):
    """
    Модель для отслеживания сессий работы с конструктором графиков.

    Позволяет сохранять промежуточное состояние работы пользователя.
    """

    STATUS_CHOICES = [
        ('active', 'Активная'),
        ('saved', 'Сохраненная'),
        ('expired', 'Истекшая'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chart_sessions'
    )
    config = models.JSONField(
        default=dict,
        help_text="Текущее состояние конфигурации"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )

    # Метаданные
    started_at = models.DateTimeField(auto_now_add=True)
    last_activity_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(
        help_text="Время истечения сессии"
    )

    class Meta:
        indexes = [
            models.Index(fields=['user', '-last_activity_at']),
            models.Index(fields=['status', 'expires_at']),
        ]

    def __str__(self):
        return f"Session {self.id} - {self.user.email}"

    def is_expired(self):
        """Проверить, истекла ли сессия."""
        return timezone.now() > self.expires_at

    def extend_session(self, minutes=30):
        """Продлить сессию на указанное количество минут."""
        self.expires_at = timezone.now() + timezone.timedelta(minutes=minutes)
        self.save(update_fields=['expires_at'])


class AnalyticsLog(models.Model):
    """
    Модель для логирования аналитических запросов.

    Обеспечивает аудит и мониторинг использования системы аналитики.
    """

    ACTION_TYPES = [
        ('view_metrics', 'Просмотр метрик'),
        ('create_chart', 'Создание графика'),
        ('save_config', 'Сохранение конфигурации'),
        ('export_data', 'Экспорт данных'),
        ('share_template', 'Поделиться шаблоном'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='analytics_logs'
    )
    action = models.CharField(
        max_length=50,
        choices=ACTION_TYPES,
        help_text="Тип действия"
    )
    resource_type = models.CharField(
        max_length=50,
        help_text="Тип ресурса (chart, metric, template, etc.)"
    )
    resource_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="ID ресурса"
    )

    # Детали запроса
    metadata = models.JSONField(
        default=dict,
        help_text="Дополнительная информация о действии"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP адрес пользователя"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="User-Agent браузера"
    )

    # Производительность
    execution_time = models.FloatField(
        null=True,
        blank=True,
        help_text="Время выполнения запроса (секунды)"
    )
    data_points = models.PositiveIntegerField(
        default=0,
        help_text="Количество точек данных"
    )

    # Результат
    success = models.BooleanField(
        default=True,
        help_text="Успешность операции"
    )
    error_message = models.TextField(
        blank=True,
        help_text="Сообщение об ошибке"
    )

    # Отслеживание
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

    def __str__(self):
        return f"{self.action} by {self.user.email if self.user else 'Anonymous'} at {self.timestamp}"