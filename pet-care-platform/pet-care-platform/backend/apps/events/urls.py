"""
Маршруты «Новости и Мероприятия». Подключаются в config/urls.py с префиксом
/api/events/. Специфичные пути (calendar*, my/, news/, <uuid>/save|calendar.ics)
идут ДО catch-all <uuid:pk>/ и by-slug.
"""

from django.urls import path

from .views import (
    CalendarFeedICSView,
    CalendarSubscribeURLView,
    EventDetailView,
    EventICSView,
    EventListView,
    MySavedEventsView,
    NewsDetailView,
    NewsListView,
    SaveEventView,
)

urlpatterns = [
    path('', EventListView.as_view(), name='events-list'),

    # Календарь / подписка (литеральные пути — раньше catch-all)
    path('calendar.ics', CalendarFeedICSView.as_view(), name='events-feed-ics'),
    path('calendar/subscribe-url/', CalendarSubscribeURLView.as_view(), name='events-subscribe-url'),
    path('my/saved/', MySavedEventsView.as_view(), name='events-my-saved'),

    # Новости
    path('news/', NewsListView.as_view(), name='news-list'),
    path('news/by-slug/<slug:slug>/', NewsDetailView.as_view(), name='news-detail-slug'),
    path('news/<uuid:pk>/', NewsDetailView.as_view(), name='news-detail'),

    # Мероприятие: спец-пути по uuid — раньше catch-all detail
    path('<uuid:pk>/calendar.ics', EventICSView.as_view(), name='events-ics'),
    path('<uuid:pk>/save/', SaveEventView.as_view(), name='events-save'),
    path('by-slug/<slug:slug>/', EventDetailView.as_view(), name='events-detail-slug'),
    path('<uuid:pk>/', EventDetailView.as_view(), name='events-detail'),
]
