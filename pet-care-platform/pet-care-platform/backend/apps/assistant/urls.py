"""
URL-маршруты ассистента. Подключаются в config/urls.py с префиксом /api/assistant/.
"""

from django.urls import path

from .views import AssistantChatView, AssistantFeedbackView

urlpatterns = [
    # POST /api/assistant/chat/ — диалог с ассистентом «Пуф»
    path('chat/', AssistantChatView.as_view(), name='assistant-chat'),
    # POST /api/assistant/feedback/ — оценка ответа (👍/👎)
    path('feedback/', AssistantFeedbackView.as_view(), name='assistant-feedback'),
]
