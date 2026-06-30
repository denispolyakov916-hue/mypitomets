"""
Адаптер YandexGPT (Yandex Foundation Models). Включается через
``ASSISTANT_LLM_BACKEND=yandex``.

RU-native: доступен с серверов в РФ без прокси — главный кандидат, если прямой
доступ к Claude заблокирован.

Переменные окружения:
- ``ASSISTANT_YANDEX_API_KEY`` — API-ключ сервисного аккаунта (обязателен);
- ``ASSISTANT_YANDEX_FOLDER_ID`` — идентификатор каталога (обязателен);
- ``ASSISTANT_YANDEX_MODEL`` — модель (по умолчанию ``yandexgpt/latest``).

ВНИМАНИЕ: реализовано по спецификации API, но ещё НЕ обкатано против живого API в
этом окружении (нет ключей). Перед боевым включением — проверить на стенде.
"""

import logging

from django.conf import settings

from core.exceptions import ApiError

from ._http import post_json
from .base import LLMProvider, LLMResult

logger = logging.getLogger('apps.assistant')


class YandexGPTProvider(LLMProvider):
    """Провайдер на базе Yandex Foundation Models (completion API)."""

    name = 'yandex'
    API_URL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion'
    DEFAULT_MODEL = 'yandexgpt/latest'

    def generate(self, *, system: str, messages: list, tools: list | None = None,
                 temperature: float = 0.3, max_tokens: int = 1024) -> LLMResult:
        apikey = getattr(settings, 'ASSISTANT_YANDEX_API_KEY', '') or ''
        folder_id = getattr(settings, 'ASSISTANT_YANDEX_FOLDER_ID', '') or ''
        if not apikey or not folder_id:
            raise ApiError.internal_error(
                'Провайдер YandexGPT не настроен: задайте ASSISTANT_YANDEX_API_KEY и '
                'ASSISTANT_YANDEX_FOLDER_ID. Пока используйте ASSISTANT_LLM_BACKEND=stub.',
                error_code='ASSISTANT_PROVIDER_NOT_CONFIGURED',
            )

        model = getattr(settings, 'ASSISTANT_YANDEX_MODEL', '') or self.DEFAULT_MODEL
        ya_messages = [{'role': 'system', 'text': system}]
        ya_messages += [{'role': m['role'], 'text': m['content']} for m in messages]

        payload = {
            'modelUri': f'gpt://{folder_id}/{model}',
            'completionOptions': {
                'stream': False,
                'temperature': temperature,
                'maxTokens': str(max_tokens),
            },
            'messages': ya_messages,
        }
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Api-Key {apikey}',
            'x-folder-id': folder_id,
        }

        try:
            data = post_json(self.API_URL, payload=payload, headers=headers, timeout=30)
        except Exception as e:
            logger.error('[assistant] Ошибка вызова YandexGPT API: %s', e)
            raise ApiError.internal_error(
                'Ассистент временно недоступен. Попробуйте позже.',
                error_code='ASSISTANT_PROVIDER_ERROR',
            ) from e

        try:
            alt = data['result']['alternatives'][0]
            text = alt['message']['text']
        except (KeyError, IndexError, TypeError):
            logger.error('[assistant] YandexGPT: неожиданный формат ответа: %s', data)
            raise ApiError.internal_error(
                'Ассистент вернул некорректный ответ.',
                error_code='ASSISTANT_PROVIDER_ERROR',
            ) from None

        return LLMResult(
            text=text,
            finish_reason=alt.get('status', 'stop'),
            usage=(data.get('result') or {}).get('usage', {}),
            raw=data,
        )
