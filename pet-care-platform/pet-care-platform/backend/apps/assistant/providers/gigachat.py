"""
Адаптер GigaChat (Сбер). Включается через ``ASSISTANT_LLM_BACKEND=gigachat``.

RU-native, есть бесплатный тариф для физлиц — запасной вариант к YandexGPT.
Авторизация двухшаговая: по ключу получаем краткоживущий access-token (кэшируем
в Django cache), затем зовём chat/completions (формат, совместимый с OpenAI).

Переменные окружения:
- ``ASSISTANT_GIGACHAT_AUTH_KEY`` — ключ авторизации (Base64 client_id:secret), обязателен;
- ``ASSISTANT_GIGACHAT_SCOPE`` — ``GIGACHAT_API_PERS`` (физлица) | ``GIGACHAT_API_B2B``;
- ``ASSISTANT_GIGACHAT_MODEL`` — модель (по умолчанию ``GigaChat``);
- ``ASSISTANT_GIGACHAT_CA_BUNDLE`` — путь к корневому сертификату Минцифры (рекомендуется);
- ``ASSISTANT_GIGACHAT_VERIFY`` — ``false`` отключает проверку TLS (только для стенда).

ВНИМАНИЕ: реализовано по спецификации API, но ещё НЕ обкатано против живого API в
этом окружении (нет ключей). Перед боевым включением — проверить на стенде.
"""

import logging
import ssl
import time
import urllib.request
import uuid

from django.conf import settings
from django.core.cache import cache

from core.exceptions import ApiError

from ._http import post_json
from .base import LLMProvider, LLMResult

logger = logging.getLogger('apps.assistant')


class GigaChatProvider(LLMProvider):
    """Провайдер на базе GigaChat (OAuth + chat/completions)."""

    name = 'gigachat'
    OAUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth'
    CHAT_URL = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions'
    DEFAULT_MODEL = 'GigaChat'
    _TOKEN_CACHE_KEY = 'assistant:gigachat:access_token'  # noqa: S105 — имя ключа кэша, не секрет

    def generate(self, *, system: str, messages: list, tools: list | None = None,
                 temperature: float = 0.3, max_tokens: int = 1024) -> LLMResult:
        auth_key = getattr(settings, 'ASSISTANT_GIGACHAT_AUTH_KEY', '') or ''
        if not auth_key:
            raise ApiError.internal_error(
                'Провайдер GigaChat не настроен: задайте ASSISTANT_GIGACHAT_AUTH_KEY. '
                'Пока используйте ASSISTANT_LLM_BACKEND=stub.',
                error_code='ASSISTANT_PROVIDER_NOT_CONFIGURED',
            )

        bearer = self._access_token(auth_key)
        model = getattr(settings, 'ASSISTANT_GIGACHAT_MODEL', '') or self.DEFAULT_MODEL

        gc_messages = [{'role': 'system', 'content': system}]
        gc_messages += [{'role': m['role'], 'content': m['content']} for m in messages]
        payload = {
            'model': model,
            'messages': gc_messages,
            'temperature': temperature,
            'max_tokens': max_tokens,
        }
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': f'Bearer {bearer}',
        }

        try:
            data = post_json(self.CHAT_URL, payload=payload, headers=headers,
                             timeout=30, opener=self._opener())
        except Exception as e:
            logger.error('[assistant] Ошибка вызова GigaChat API: %s', e)
            raise ApiError.internal_error(
                'Ассистент временно недоступен. Попробуйте позже.',
                error_code='ASSISTANT_PROVIDER_ERROR',
            ) from e

        try:
            choice = data['choices'][0]
            text = choice['message']['content']
        except (KeyError, IndexError, TypeError):
            logger.error('[assistant] GigaChat: неожиданный формат ответа: %s', data)
            raise ApiError.internal_error(
                'Ассистент вернул некорректный ответ.',
                error_code='ASSISTANT_PROVIDER_ERROR',
            ) from None

        return LLMResult(
            text=text,
            finish_reason=choice.get('finish_reason', 'stop'),
            usage=data.get('usage', {}),
            raw=data,
        )

    def _access_token(self, auth_key: str) -> str:
        cached = cache.get(self._TOKEN_CACHE_KEY)
        if cached:
            return cached

        scope = getattr(settings, 'ASSISTANT_GIGACHAT_SCOPE', '') or 'GIGACHAT_API_PERS'
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'Authorization': f'Basic {auth_key}',
            'RqUID': str(uuid.uuid4()),
        }
        try:
            data = post_json(self.OAUTH_URL, payload={'scope': scope}, headers=headers,
                             timeout=20, opener=self._opener(), form=True)
        except Exception as e:
            logger.error('[assistant] Ошибка авторизации GigaChat: %s', e)
            raise ApiError.internal_error(
                'Не удалось авторизоваться в GigaChat.',
                error_code='ASSISTANT_PROVIDER_ERROR',
            ) from e

        tok = data.get('access_token')
        if not tok:
            logger.error('[assistant] GigaChat OAuth не вернул токен: %s', data)
            raise ApiError.internal_error(
                'GigaChat не вернул токен доступа.',
                error_code='ASSISTANT_PROVIDER_ERROR',
            )

        # expires_at приходит в миллисекундах эпохи; кэшируем с запасом 60 с.
        ttl = 25 * 60
        expires_at = data.get('expires_at')
        if expires_at:
            ttl = max(60, int(expires_at / 1000 - time.time()) - 60)
        cache.set(self._TOKEN_CACHE_KEY, tok, ttl)
        return tok

    @staticmethod
    def _opener() -> urllib.request.OpenerDirector:
        ca_bundle = getattr(settings, 'ASSISTANT_GIGACHAT_CA_BUNDLE', '') or ''
        verify = str(getattr(settings, 'ASSISTANT_GIGACHAT_VERIFY', 'true') or 'true').lower() != 'false'
        if ca_bundle:
            ctx = ssl.create_default_context(cafile=ca_bundle)
        elif not verify:
            logger.warning('[assistant] GigaChat: проверка TLS отключена '
                           '(ASSISTANT_GIGACHAT_VERIFY=false) — только для стенда')
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        else:
            ctx = ssl.create_default_context()
        return urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx))
