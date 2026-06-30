"""
Небольшой помощник для HTTP-POST через urllib — общий для адаптеров провайдеров.

Намеренно без сторонних зависимостей (как ``apps/users/services/sms_service.py``):
только стандартная библиотека. Бросает исключения urllib наверх — провайдер сам
логирует и оборачивает в ApiError.
"""

import json
import urllib.parse
import urllib.request


def post_json(url, *, payload, headers, timeout=30, opener=None, form=False):
    """
    POST-запрос. По умолчанию тело — JSON; ``form=True`` — application/x-www-form-urlencoded.

    Возвращает разобранный JSON-ответ (или ``{}`` при пустом теле).
    """
    data = (urllib.parse.urlencode(payload).encode('utf-8') if form
            else json.dumps(payload).encode('utf-8'))

    req = urllib.request.Request(url, data=data, method='POST')
    for key, value in headers.items():
        req.add_header(key, value)

    op = opener or urllib.request.build_opener()
    with op.open(req, timeout=timeout) as resp:
        raw = resp.read().decode('utf-8')
    return json.loads(raw) if raw else {}
