"""
Заглушка-провайдер: детерминированные ответы без сети и без ключей.

Назначение — гонять весь конвейер (роутинг → грунтинг → ответ → виджет) и писать
стабильные юнит-тесты ещё до выбора реальной модели. Заглушка не выдумывает
факты: она отвечает на основе блока КОНТЕКСТ, который сервис-слой кладёт в
системный промпт (заголовок ``services.prompts.CONTEXT_HEADER``).
"""

from ..services.prompts import CONTEXT_HEADER
from .base import LLMProvider, LLMResult


class StubProvider(LLMProvider):
    """Детерминированный провайдер для разработки и тестов."""

    name = 'stub'

    def generate(self, *, system: str, messages: list, tools: list | None = None,
                 temperature: float = 0.3, max_tokens: int = 1024) -> LLMResult:
        user_text = ''
        for m in reversed(messages or []):
            if m.get('role') == 'user':
                user_text = (m.get('content') or '').strip()
                break

        context = ''
        if system and CONTEXT_HEADER in system:
            context = system.split(CONTEXT_HEADER, 1)[1].strip()

        if context:
            lines = [ln.strip() for ln in context.splitlines() if ln.strip()]
            facts = '\n'.join(f'• {ln}' for ln in lines[:6])
            text = (
                'Это ответ тестовой заглушки (реальная модель ещё не подключена).\n'
                f'Вопрос: «{user_text}».\n'
                f'Опираюсь на данные:\n{facts}'
            )
        else:
            text = (
                'Это ответ тестовой заглушки (реальная модель ещё не подключена). '
                f'Вы написали: «{user_text}».'
            )

        return LLMResult(
            text=text,
            finish_reason='stop',
            usage={'input_tokens': 0, 'output_tokens': 0},
            raw={'provider': 'stub'},
        )
