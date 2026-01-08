from django.apps import AppConfig


class ShopConfig(AppConfig):
    """Configuration for Shop app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.shop'
    verbose_name = 'Магазин'
    
    def ready(self):
        """Импорт сигналов при загрузке приложения."""
        import apps.shop.signals  # noqa

