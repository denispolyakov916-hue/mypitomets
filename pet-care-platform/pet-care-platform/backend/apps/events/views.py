"""
Публичные read-эндпоинты «Новости и Мероприятия».

Только опубликованный контент (status='published'), AllowAny. Пагинация и
формат ответа — по образцу apps/reviews (Paginator + Response).
"""

import logging

from django.core.paginator import Paginator
from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CalendarSubscriptionToken, Event, NewsPost, SavedEvent
from .services_ics import build_ics

logger = logging.getLogger('apps.events')

_TRUE = {'1', 'true', 'True', 'yes'}


def _paginate(request, qs, per_default=12, per_max=50):
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        per = min(per_max, max(1, int(request.query_params.get('per_page', per_default))))
    except (TypeError, ValueError):
        per = per_default
    paginator = Paginator(qs, per)
    page_obj = paginator.get_page(page)
    meta = {'page': page_obj.number, 'per_page': per, 'total': paginator.count, 'pages': paginator.num_pages}
    return page_obj, meta


class EventListView(APIView):
    """GET /api/events/ — список опубликованных мероприятий."""
    permission_classes = [AllowAny]

    def get(self, request):
        qs = Event.objects.filter(status='published')
        event_type = request.query_params.get('event_type')
        if event_type:
            qs = qs.filter(event_type=event_type)
        if request.query_params.get('featured') in _TRUE:
            qs = qs.filter(is_featured=True)
        date_from = request.query_params.get('from')
        date_to = request.query_params.get('to')
        if date_from:
            qs = qs.filter(start_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(start_at__date__lte=date_to)
        page_obj, meta = _paginate(request, qs.order_by('start_at'))
        return Response({'data': [e.to_dict() for e in page_obj], 'pagination': meta})


class EventDetailView(APIView):
    """GET /api/events/<uuid>/ или /api/events/by-slug/<slug>/."""
    permission_classes = [AllowAny]

    def get(self, request, pk=None, slug=None):
        lookup = {'slug': slug} if slug is not None else {'pk': pk}
        try:
            event = Event.objects.get(status='published', **lookup)
        except Event.DoesNotExist:
            return Response({'error': 'Мероприятие не найдено', 'code': 'NOT_FOUND'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response({'data': event.to_dict()})


class NewsListView(APIView):
    """GET /api/events/news/ — список опубликованных новостей."""
    permission_classes = [AllowAny]

    def get(self, request):
        qs = NewsPost.objects.filter(status='published')
        category = request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        if request.query_params.get('featured') in _TRUE:
            qs = qs.filter(is_featured=True)
        page_obj, meta = _paginate(request, qs.order_by('-published_at', '-created_at'))
        return Response({'data': [n.to_dict(with_body=False) for n in page_obj], 'pagination': meta})


class NewsDetailView(APIView):
    """GET /api/events/news/<uuid>/ или /api/events/news/by-slug/<slug>/."""
    permission_classes = [AllowAny]

    def get(self, request, pk=None, slug=None):
        lookup = {'slug': slug} if slug is not None else {'pk': pk}
        try:
            post = NewsPost.objects.get(status='published', **lookup)
        except NewsPost.DoesNotExist:
            return Response({'error': 'Новость не найдена', 'code': 'NOT_FOUND'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response({'data': post.to_dict()})


def _ics_response(ics_bytes, filename, inline=False):
    resp = HttpResponse(ics_bytes, content_type='text/calendar; charset=utf-8')
    disp = 'inline' if inline else 'attachment'
    resp['Content-Disposition'] = f'{disp}; filename="{filename}"'
    return resp


class EventICSView(APIView):
    """GET /api/events/<uuid>/calendar.ics — один .ics для «Добавить в календарь»."""
    permission_classes = [AllowAny]

    def get(self, request, pk=None):
        try:
            event = Event.objects.get(pk=pk, status='published')
        except Event.DoesNotExist:
            return Response({'error': 'Мероприятие не найдено', 'code': 'NOT_FOUND'},
                            status=status.HTTP_404_NOT_FOUND)
        return _ics_response(build_ics([event], calname=event.title), f'event-{event.slug}.ics')


class SaveEventView(APIView):
    """POST/DELETE /api/events/<uuid>/save/ — добавить/убрать из «моего календаря»."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        try:
            event = Event.objects.get(pk=pk, status='published')
        except Event.DoesNotExist:
            return Response({'error': 'Мероприятие не найдено', 'code': 'NOT_FOUND'},
                            status=status.HTTP_404_NOT_FOUND)
        SavedEvent.objects.get_or_create(user=request.user, event=event)
        return Response({'saved': True})

    def delete(self, request, pk=None):
        SavedEvent.objects.filter(user=request.user, event_id=pk).delete()
        return Response({'saved': False})


class MySavedEventsView(APIView):
    """GET /api/events/my/saved/ — мои сохранённые мероприятия (для «моего календаря»)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        saved = (SavedEvent.objects.filter(user=request.user, event__status='published')
                 .select_related('event').order_by('event__start_at'))
        data = []
        for item in saved:
            event_dict = item.event.to_dict()
            event_dict['saved'] = True
            data.append(event_dict)
        return Response({'data': data})


class CalendarSubscribeURLView(APIView):
    """
    GET  /api/events/calendar/subscribe-url/ — выдать стабильную webcal-ссылку (создать токен).
    POST /api/events/calendar/subscribe-url/ — ротировать токен (старая ссылка перестаёт работать).
    """
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _payload(request, sub):
        https_url = request.build_absolute_uri(f'/api/events/calendar.ics?t={sub.key}')
        webcal_url = https_url.replace('https://', 'webcal://').replace('http://', 'webcal://')
        return {'token': sub.key, 'https_url': https_url, 'webcal_url': webcal_url}

    def get(self, request):
        sub, _ = CalendarSubscriptionToken.objects.get_or_create(user=request.user)
        return Response(self._payload(request, sub))

    def post(self, request):
        CalendarSubscriptionToken.objects.filter(user=request.user).delete()
        sub = CalendarSubscriptionToken.objects.create(user=request.user)
        return Response(self._payload(request, sub))


class CalendarFeedICSView(APIView):
    """
    GET /api/events/calendar.ics?token=<t> — персональный фид «мои мероприятия»
    для подписки в Apple/Google (без JWT, по токену). Только опубликованные.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        feed_key = request.query_params.get('t')
        calname = 'Питомец+ — Мои мероприятия'
        if not feed_key:
            return _ics_response(build_ics([], calname=calname), 'petplus-events.ics', inline=True)
        try:
            sub = CalendarSubscriptionToken.objects.select_related('user').get(key=feed_key)
        except CalendarSubscriptionToken.DoesNotExist:
            return HttpResponse('Not found', status=status.HTTP_404_NOT_FOUND,
                                content_type='text/plain; charset=utf-8')
        saved = (SavedEvent.objects.filter(user=sub.user, event__status='published')
                 .select_related('event').order_by('event__start_at'))
        events = [item.event for item in saved]
        return _ics_response(build_ics(events, calname=calname), 'petplus-events.ics', inline=True)
