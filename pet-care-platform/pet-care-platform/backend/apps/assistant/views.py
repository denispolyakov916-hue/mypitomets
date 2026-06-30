"""
Вью ассистента «Пуф».

POST /api/assistant/chat/ — диалог (требует авторизации). Паттерн вью/ошибок —
как в ``apps/users/views.py``: APIView + try/except ApiError + logger.
"""

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from core.exceptions import ApiError

from .serializers import ChatRequestSerializer, FeedbackSerializer
from .services.assistant_service import AssistantService

logger = logging.getLogger('apps.assistant')


class AssistantChatView(APIView):
    """
    Чат с ассистентом.

    Тело: ``{"message": "...", "pet_id": "<uuid>"?, "capability": "support|health|food"?}``
    Ответ: ``{"reply", "capability", "sources", "disclaimer", "provider", "needs_pet"}``

    Ограничение частоты — на пользователя (scope 'assistant', rate из
    ``ASSISTANT_RATE_LIMIT``), чтобы защитить стоимость/квоту реального LLM.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'assistant'

    def post(self, request):
        try:
            serializer = ChatRequestSerializer(data=request.data)
            if not serializer.is_valid():
                raise ApiError.bad_request('Ошибка валидации', serializer.errors)

            data = serializer.validated_data
            reply = AssistantService.answer(
                user=request.user,
                message=data['message'],
                pet_id=data.get('pet_id'),
                capability=data.get('capability'),
            )
            return Response(reply.to_dict(), status=status.HTTP_200_OK)

        except ApiError as e:
            logger.warning('[assistant] ApiError: %s (%s)', e.detail, e.error_code)
            return Response(e.get_full_details(), status=e.status_code)
        except Exception as e:
            logger.error('[assistant] Необработанная ошибка: %s', e, exc_info=True)
            return Response(
                {'error': 'Внутренняя ошибка сервера', 'code': 'INTERNAL_ERROR'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AssistantFeedbackView(APIView):
    """
    Оценка ответа ассистента (👍/👎).

    POST /api/assistant/feedback/  ``{"rating": "up|down", "message"?, "reply"?, "capability"?}``

    Stateless v1: оценку только ЛОГИРУЕМ (без своих таблиц) — этого достаточно
    для еженедельного разбора и улучшения промптов/FAQ. Текст усечён до 500 симв.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'assistant'

    def post(self, request):
        try:
            serializer = FeedbackSerializer(data=request.data)
            if not serializer.is_valid():
                raise ApiError.bad_request('Ошибка валидации', serializer.errors)

            data = serializer.validated_data
            logger.info(
                '[assistant][feedback] user=%s rating=%s capability=%s q=%r reply=%r',
                getattr(request.user, 'id', None),
                data['rating'],
                data.get('capability'),
                (data.get('message') or '')[:500],
                (data.get('reply') or '')[:500],
            )
            return Response({'ok': True}, status=status.HTTP_200_OK)

        except ApiError as e:
            return Response(e.get_full_details(), status=e.status_code)
        except Exception as e:
            logger.error('[assistant] Ошибка обработки фидбэка: %s', e, exc_info=True)
            return Response(
                {'error': 'Внутренняя ошибка сервера', 'code': 'INTERNAL_ERROR'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
