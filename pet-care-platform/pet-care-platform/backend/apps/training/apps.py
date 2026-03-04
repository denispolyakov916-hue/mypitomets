from django.apps import AppConfig


class TrainingConfig(AppConfig):
    """Configuration for Training app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.training'
    verbose_name = 'Курсы'
    
    def ready(self):
        """Импорт сигналов при загрузке приложения."""
        import apps.training.signals  # noqa

