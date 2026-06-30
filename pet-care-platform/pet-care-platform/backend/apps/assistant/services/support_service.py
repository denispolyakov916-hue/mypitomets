"""
Способность «Поддержка / FAQ»: ответ из статической базы FAQ, без БД и без PII.
"""

from ..knowledge.faq_ru import FAQS
from .prompts import build_system

_INSTRUCTION = (
    'Способность: поддержка. Ответь на вопрос пользователя, опираясь на записи FAQ '
    'из КОНТЕКСТА. Если подходящего ответа в FAQ нет — честно скажи это и предложи '
    'написать в поддержку на сайте.'
)


def _select_faqs(message: str, limit: int = 4) -> list:
    text = (message or '').lower()
    scored = []
    for item in FAQS:
        score = sum(1 for kw in item.get('keywords', []) if kw in text)
        if score == 0:
            # запасной сигнал: совпадение по длинным словам самого вопроса
            if any(w in text for w in item['q'].lower().split() if len(w) > 4):
                score = 0.5
        if score:
            scored.append((score, item))
    scored.sort(key=lambda s: s[0], reverse=True)
    selected = [it for _, it in scored[:limit]]
    if not selected:
        # ничего не совпало — даём базовые записи (что умеет Пуф / как связаться)
        selected = FAQS[:1] + FAQS[-1:]
    return selected


def build(message: str) -> dict:
    items = _select_faqs(message)
    context = '\n\n'.join(f'Вопрос: {it["q"]}\nОтвет: {it["a"]}' for it in items)
    system = build_system(_INSTRUCTION, context)
    sources = [{'type': 'faq', 'label': it['q']} for it in items]
    return {'capability': 'support', 'system': system, 'sources': sources, 'disclaimer': None}
