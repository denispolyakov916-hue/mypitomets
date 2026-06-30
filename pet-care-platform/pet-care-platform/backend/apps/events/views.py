"""
Публичные read-эндпоинты «Новости и Мероприятия».

Только опубликованный контент (status='published'), AllowAny. Пагинация и
формат ответа — по образцу apps/reviews (Paginator + Response).
"""

import logging

from django.core.paginator import Paginator
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Event, NewsPost

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
