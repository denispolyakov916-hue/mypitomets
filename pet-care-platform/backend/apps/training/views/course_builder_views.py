"""
Views для конструктора курсов.

Этот модуль содержит views для:
- Получения полной структуры курса с страницами и блоками
- Управления страницами курсов (CRUD операции)
- Управления блоками контента страниц
- Управления шаблонами блоков

Основные классы:
    - CourseBuilderView: Полная структура курса для конструктора
    - CoursePageViewSet: CRUD операций со страницами курсов
    - ContentBlockViewSet: CRUD операций с блоками контента
    - BlockTemplateViewSet: Управление шаблонами блоков

Permissions:
    - CourseBuilderView, CoursePageViewSet, ContentBlockViewSet — только is_staff
    - BlockTemplateViewSet — is_staff для создания, IsAuthenticated для чтения публичных
"""

import logging
from django.db import models
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action

from ..models import Course, CoursePage, ContentBlock, BlockTemplate
from ..serializers import (
    CourseBuilderSerializer, CoursePageSerializer,
    ContentBlockSerializer, BlockTemplateSerializer
)

logger = logging.getLogger('apps.training')


class CourseBuilderView(APIView):
    """
    View для получения полной структуры курса с страницами и блоками.
    Используется в конструкторе курсов.
    Доступ: только администраторы (is_staff).
    """

    permission_classes = [IsAdminUser]

    def get(self, request, course_id):
        """Получить структуру курса для конструктора."""
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

        serializer = CourseBuilderSerializer(course)
        return Response(serializer.data)


class CoursePageViewSet(ModelViewSet):
    """
    ViewSet для управления страницами курсов.
    Доступ: только администраторы (is_staff).
    """

    permission_classes = [IsAdminUser]
    serializer_class = CoursePageSerializer

    def get_queryset(self):
        course_id = self.kwargs.get('course_id')
        return CoursePage.objects.filter(course_id=course_id, is_active=True)

    def perform_create(self, serializer):
        course_id = self.kwargs.get('course_id')
        course = get_object_or_404(Course, id=course_id)

        # Автоматически устанавливаем order_number
        max_order = CoursePage.objects.filter(course_id=course.id).aggregate(
            max_order=models.Max('order_number')
        )['max_order'] or 0
        serializer.save(course_id=course.id, order_number=max_order + 1)


class ContentBlockViewSet(ModelViewSet):
    """
    ViewSet для управления блоками контента.
    Доступ: только администраторы (is_staff).
    """

    permission_classes = [IsAdminUser]
    serializer_class = ContentBlockSerializer

    def get_queryset(self):
        page_id = self.kwargs.get('page_id')
        if page_id:
            return ContentBlock.objects.filter(page_id=page_id, is_active=True)
        return ContentBlock.objects.filter(is_active=True)

    def perform_create(self, serializer):
        page_id = self.kwargs.get('page_id')
        page = get_object_or_404(CoursePage, id=page_id)

        # Автоматически устанавливаем order
        max_order = ContentBlock.objects.filter(page=page).aggregate(
            max_order=models.Max('order')
        )['max_order'] or 0
        serializer.save(page=page, order=max_order + 1)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, page_id=None, pk=None):
        """Дублировать блок."""
        block = self.get_object()
        page = block.page

        # Создаем копию блока
        max_order = ContentBlock.objects.filter(page=page).aggregate(
            max_order=models.Max('order')
        )['max_order'] or 0

        new_block = ContentBlock.objects.create(
            page=page,
            block_type=block.block_type,
            content=block.content.copy() if block.content else {},
            settings=block.settings.copy() if block.settings else {},
            order=max_order + 1
        )

        serializer = self.get_serializer(new_block)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BlockTemplateViewSet(ModelViewSet):
    """
    ViewSet для управления шаблонами блоков.

    Permissions:
    - Чтение (list, retrieve): IsAuthenticated — видит публичные + свои
    - Создание/обновление/удаление: IsAdminUser — только администраторы
    """

    serializer_class = BlockTemplateSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'use_template']:
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def get_queryset(self):
        queryset = BlockTemplate.objects.filter(is_active=True)

        # Фильтр по публичным шаблонам и шаблонам пользователя
        user = self.request.user
        if not user.is_staff:
            queryset = queryset.filter(
                models.Q(is_public=True) | models.Q(created_by=user)
            )

        # Фильтр по типу блока
        block_type = self.request.query_params.get('block_type')
        if block_type:
            queryset = queryset.filter(block_type=block_type)

        # Фильтр по категории
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        return queryset.order_by('-usage_count', 'name')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def use_template(self, request, pk=None):
        """Использовать шаблон для создания блока."""
        template = self.get_object()
        page_id = request.data.get('page_id')

        if not page_id:
            return Response(
                {'error': 'page_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            page = CoursePage.objects.get(id=page_id)
        except CoursePage.DoesNotExist:
            return Response(
                {'error': 'Страница не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка прав: для создания блока нужно быть администратором
        if not request.user.is_staff:
            return Response(
                {'error': 'Недостаточно прав'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Создаем блок из шаблона
        block = template.create_block_from_template(page)
        serializer = ContentBlockSerializer(block)

        return Response(serializer.data, status=status.HTTP_201_CREATED)
