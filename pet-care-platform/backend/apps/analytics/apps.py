from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.analytics'
    verbose_name = 'Аналитика и конструктор графиков'

    def ready(self):
        """Инициализация приложения при запуске Django."""
        # Импорт сигналов для автоматической настройки
        try:
            import apps.analytics.signals  # noqa
        except ImportError:
            pass