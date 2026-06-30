"""
Адаптер Claude (Anthropic Messages API). Включается через
``ASSISTANT_LLM_BACKEND=claude``.

Прямой доступ к ``api.anthropic.com`` с российского сервера (Timeweb), скорее
всего, заблокирован — поэтому поддержан HTTP(S)-прокси через
``ASSISTANT_HTTP_PROXY``.

Переменные окружения:
- ``ASSISTANT_ANTHROPIC_API_KEY`` — ключ API (обязателен);
- ``ASSISTANT_CLAUDE_MODEL`` — модель (по умолчанию см. ``DEFAULT_MODEL``);
- ``ASSISTANT_HTTP_PROXY`` — http(s)-прокси для обхода блокировки (опционально).

ВНИМАНИЕ: адаптер написан по спецификации Messages API, но ещё НЕ обкатан против
живого API в этом окружении. Перед боевым включением — проверить на стенде.
HTTP реализован на ``urllib`` по образцу ``apps/users/services/sms_service.py``.
"""

import json
import logging
import urllib.request

from django.conf import settings

from core.exceptions import ApiError

from .base import LLMProvider, LLMResult

logger = logging.getLogger('apps.assistant')


class ClaudeProvider(LLMProvider):
    """Провайдер на базе Anthropic Messages API."""

    name = 'claude'
    API_URL = 'https://api.anthropic.com/v1/messages'
    ANTHROPIC_VERSION = '2023-06-01'
    DEFAULT_MODEL = 'claude-3-5-sonnet-latest'

    def supports_tools(self) -> bool:
        return True

    def generate(self, *, system: str, messages: list, tools: list | None = None,
                 temperature: float = 0.3, max_tokens: int = 1024) -> LLMResult:
        apikey = getattr(settings, 'ASSISTANT_ANTHROPIC_API_KEY', '') or ''
        if not apikey:
            raise ApiError.internal_error(
                'Провайдер Claude не настроен: задайте ASSISTANT_ANTHROPIC_API_KEY '
                '(и при необходимости ASSISTANT_HTTP_PROXY). Пока используйте ASSISTANT_LLM_BACKEND=stub.',
                error_code='ASSISTANT_PROVIDER_NOT_CONFIGURED',
            )

        model = getattr(settings, 'ASSISTANT_CLAUDE_MODEL', '') or self.DEFAULT_MODEL
        payload = {
            'model': model,
            'max_tokens': max_tokens,
            'temperature': temperature,
            'system': system,
            'messages': [{'role': m['role'], 'content': m['content']} for m in messages],
        }
        if tools:
            payload['tools'] = tools

        body = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(self.API_URL, data=body, method='POST')
        req.add_header('content-type', 'application/json')
        req.add_header('x-api-key', apikey)
        req.add_header('anthropic-version', self.ANTHROPIC_VERSION)

        try:
            with self._opener().open(req, timeout=30) as resp:
                data = json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            logger.error('[assistant] Ошибка вызова Claude API: %s', e)
            raise ApiError.internal_error(
                'Ассистент временно недоступен. Попробуйте позже.',
                error_code='ASSISTANT_PROVIDER_ERROR',
            ) from e

        text = ''.join(
            block.get('text', '')
            for block in data.get('content', [])
            if block.get('type') == 'text'
        )
        return LLMResult(
            text=text,
            finish_reason=data.get('stop_reason', 'stop'),
            usage=data.get('usage', {}),
            raw=data,
        )

    @staticmethod
    def _opener() -> urllib.request.OpenerDirector:
        proxy = getattr(settings, 'ASSISTANT_HTTP_PROXY', '') or ''
        if proxy:
            handler = urllib.request.ProxyHandler({'http': proxy, 'https': proxy})
            return urllib.request.build_opener(handler)
        return urllib.request.build_opener()
