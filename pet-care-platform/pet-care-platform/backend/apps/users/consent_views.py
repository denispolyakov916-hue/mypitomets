"""Эндпоинт записи согласий (журнал ConsentEvent).

POST /api/consent/ — публичный (в т.ч. для анонимного cookie-баннера).
Тело: {"source": "cookie_banner", "doc_version": "...",
       "events": [{"type": "cookie_analytics", "granted": true, "meta": {}}, ...]}
"""
import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ConsentEvent, record_consent

logger = logging.getLogger('apps.users')

_VALID_TYPES = {c[0] for c in ConsentEvent.TYPE_CHOICES}
_MAX_EVENTS = 12


class ConsentRecordView(APIView):
    """Зафиксировать согласие(я) посетителя/пользователя в журнале."""

    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data or {}
        events = data.get('events')
        if not isinstance(events, list) or not events:
            return Response({'error': 'events: ожидается непустой список'},
                            status=status.HTTP_400_BAD_REQUEST)
        source = str(data.get('source', 'web'))[:32]
        doc_version = str(data.get('doc_version', ''))[:64]
        user = request.user if getattr(request.user, 'is_authenticated', False) else None

        recorded = 0
        for ev in events[:_MAX_EVENTS]:
            if not isinstance(ev, dict):
                continue
            ctype = ev.get('type')
            if ctype not in _VALID_TYPES:
                continue
            meta = ev.get('meta') if isinstance(ev.get('meta'), dict) else {}
            record_consent(
                request=request, user=user, consent_type=ctype,
                granted=bool(ev.get('granted', True)),
                doc_version=doc_version, source=source, meta=meta,
            )
            recorded += 1

        return Response({'ok': True, 'recorded': recorded}, status=status.HTTP_201_CREATED)
