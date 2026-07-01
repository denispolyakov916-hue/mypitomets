"""
Оркестратор ассистента «Пуф»: роутинг → грунтинг → провайдер → ответ.

Без персистентности (stateless v1): диалоги не сохраняются, общая БД не
затрагивается. Историю переписки можно добавить позже отдельной фазой.
"""

import logging
from dataclasses import dataclass, field

from core.exceptions import ApiError

from ..providers import get_provider
from . import food_service, health_service, support_service
from .prompts import NEEDS_PET_TEXT
from .router_service import RouterService

logger = logging.getLogger('apps.assistant')

VALID_CAPABILITIES = ('support', 'health', 'food')

# Столько последних реплик диалога максимум передаём провайдеру (память контекста).
MAX_HISTORY_TURNS = 10


def _build_provider_messages(history, message: str) -> list[dict]:
    """История клиента → чистая чередующаяся последовательность user/assistant,
    заканчивающаяся текущим сообщением. Схлопываем подряд идущие одной роли и
    отбрасываем ведущие assistant — важно для LLM со строгим чередованием (Claude)."""
    seq: list[dict] = []
    for item in (history or []):
        role = item.get('role') if isinstance(item, dict) else None
        content = ((item.get('content') if isinstance(item, dict) else '') or '').strip()
        if role not in ('user', 'assistant') or not content:
            continue
        if seq and seq[-1]['role'] == role:
            seq[-1]['content'] = content
        else:
            seq.append({'role': role, 'content': content})
    while seq and seq[0]['role'] == 'assistant':
        seq.pop(0)
    if len(seq) > MAX_HISTORY_TURNS * 2:
        seq = seq[-MAX_HISTORY_TURNS * 2:]
        while seq and seq[0]['role'] == 'assistant':
            seq.pop(0)
    if seq and seq[-1]['role'] == 'user':
        seq[-1] = {'role': 'user', 'content': message}
    else:
        seq.append({'role': 'user', 'content': message})
    return seq


@dataclass
class AssistantReply:
    """Ответ ассистента, готовый к сериализации в JSON."""
    reply: str
    capability: str
    sources: list = field(default_factory=list)
    disclaimer: str | None = None
    provider: str = 'stub'
    needs_pet: bool = False

    def to_dict(self) -> dict:
        return {
            'reply': self.reply,
            'capability': self.capability,
            'sources': self.sources,
            'disclaimer': self.disclaimer,
            'provider': self.provider,
            'needs_pet': self.needs_pet,
        }


class AssistantService:
    """Единая точка обработки сообщения пользователя."""

    @staticmethod
    def answer(*, user, message: str, pet_id=None, capability: str | None = None, history=None) -> AssistantReply:
        if capability not in VALID_CAPABILITIES:
            capability = RouterService.classify(message, pet_id)

        # Здоровье и питание требуют выбранного питомца.
        if capability in ('health', 'food') and not pet_id:
            return AssistantReply(reply=NEEDS_PET_TEXT, capability=capability, needs_pet=True)

        if capability == 'health':
            grounding = health_service.build(user, message, pet_id)
        elif capability == 'food':
            grounding = food_service.build(user, message, pet_id)
        else:
            grounding = support_service.build(message)

        provider = get_provider()
        try:
            result = provider.generate(
                system=grounding['system'],
                messages=_build_provider_messages(history, message),
                temperature=0.3,
                max_tokens=800,
            )
        except ApiError:
            raise
        except Exception as e:
            logger.error('[assistant] Провайдер %s упал: %s',
                         getattr(provider, 'name', '?'), e, exc_info=True)
            raise ApiError.internal_error(
                'Ассистент временно недоступен. Попробуйте позже.',
                error_code='ASSISTANT_PROVIDER_ERROR',
            ) from e

        return AssistantReply(
            reply=result.text,
            capability=grounding['capability'],
            sources=grounding.get('sources', []),
            disclaimer=grounding.get('disclaimer'),
            provider=getattr(provider, 'name', 'unknown'),
        )
