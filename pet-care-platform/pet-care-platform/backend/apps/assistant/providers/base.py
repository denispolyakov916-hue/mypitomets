"""
Контракт LLM-провайдера для ассистента «Пуф».

Любой провайдер (заглушка, Claude, YandexGPT, GigaChat) реализует один метод
``generate(...)``. Это единственная точка, которую нужно поменять при выборе
реальной модели — роутинг, грунтинг и вью от провайдера не зависят. Выбор
провайдера — через переменную окружения ``ASSISTANT_LLM_BACKEND`` (см.
``providers/__init__.py``), по умолчанию ``'stub'``.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class LLMResult:
    """Унифицированный результат генерации, независимый от провайдера."""
    text: str
    tool_calls: list = field(default_factory=list)
    finish_reason: str = 'stop'
    usage: dict = field(default_factory=dict)
    raw: dict = field(default_factory=dict)


class LLMProvider(ABC):
    """Базовый контракт провайдера."""

    name = 'base'

    @abstractmethod
    def generate(self, *, system: str, messages: list, tools: list | None = None,
                 temperature: float = 0.3, max_tokens: int = 1024) -> LLMResult:
        """
        Сгенерировать ответ.

        :param system:   системный промпт (правила + инструкция способности +
                         блок КОНТЕКСТ с фактами).
        :param messages: история диалога ``[{'role': 'user'|'assistant', 'content': str}]``.
        :param tools:    описания инструментов (для провайдеров с tool-calling);
                         провайдер вправе игнорировать.
        :returns:        :class:`LLMResult`.
        """
        raise NotImplementedError

    def supports_tools(self) -> bool:
        """Поддерживает ли провайдер вызов инструментов (function calling)."""
        return False
