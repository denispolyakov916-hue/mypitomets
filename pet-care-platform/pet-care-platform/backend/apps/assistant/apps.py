from django.apps import AppConfig


class AssistantConfig(AppConfig):
    """Конфигурация приложения ИИ-ассистента «Пуф»."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.assistant'
    verbose_name = 'ИИ-ассистент (Пуф)'
