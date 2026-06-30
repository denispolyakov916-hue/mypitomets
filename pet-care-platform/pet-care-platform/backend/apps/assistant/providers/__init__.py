"""
Фабрика LLM-провайдеров.

Выбор реализации — по ``settings.ASSISTANT_LLM_BACKEND``
(``'stub' | 'claude' | 'yandex' | 'gigachat'``), по умолчанию ``'stub'``.
Паттерн повторяет ``SmsService._backend()`` в ``apps/users``: одна переменная
окружения переключает реализацию, секреты — только в env.
"""

import logging

from django.conf import settings

from .base import LLMProvider, LLMResult
from .stub import StubProvider

logger = logging.getLogger('apps.assistant')

__all__ = ['LLMProvider', 'LLMResult', 'get_provider']


def get_provider(name: str | None = None) -> LLMProvider:
    """Вернуть экземпляр провайдера по имени бэкенда (или из настроек)."""
    backend = (name or getattr(settings, 'ASSISTANT_LLM_BACKEND', '') or 'stub').lower()

    if backend == 'stub':
        return StubProvider()
    if backend == 'claude':
        from .claude import ClaudeProvider
        return ClaudeProvider()
    if backend == 'yandex':
        from .yandex import YandexGPTProvider
        return YandexGPTProvider()
    if backend == 'gigachat':
        from .gigachat import GigaChatProvider
        return GigaChatProvider()

    logger.warning("Неизвестный ASSISTANT_LLM_BACKEND=%r — использую заглушку (stub)", backend)
    return StubProvider()
