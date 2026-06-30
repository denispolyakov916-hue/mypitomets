"""
Маршруты «Новости и Мероприятия». Подключаются в config/urls.py с префиксом
/api/events/. Конкретные пути (news/, by-slug/) — ДО catch-all <uuid:pk>/.
"""

from django.urls import path

from .views import EventDetailView, EventListView, NewsDetailView, NewsListView

urlpatterns = [
    path('', EventListView.as_view(), name='events-list'),

    # Новости
    path('news/', NewsListView.as_view(), name='news-list'),
    path('news/by-slug/<slug:slug>/', NewsDetailView.as_view(), name='news-detail-slug'),
    path('news/<uuid:pk>/', NewsDetailView.as_view(), name='news-detail'),

    # Мероприятия (детали — после news/, чтобы 'news' не попал в slug)
    path('by-slug/<slug:slug>/', EventDetailView.as_view(), name='events-detail-slug'),
    path('<uuid:pk>/', EventDetailView.as_view(), name='events-detail'),
]
