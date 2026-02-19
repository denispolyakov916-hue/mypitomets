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
from django.db import models, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, BasePermission
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action

from ..models import Course, CourseModule, CoursePage, ContentBlock, BlockTemplate


class IsAdminOrCourseAuthor(BasePermission):
    """Админ или создатель курса (владелец проверяется в каждом view)."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_staff or getattr(request.user, 'role', None) == 'course_creator'
from ..serializers import (
    CourseBuilderSerializer, CoursePageSerializer,
    ContentBlockSerializer, BlockTemplateSerializer
)

logger = logging.getLogger('apps.training')


class CourseBuilderView(APIView):
    """
    View для получения полной структуры курса с страницами и блоками.
    Используется в конструкторе курсов.
    Доступ: администраторы и авторы курса.
    """

    permission_classes = [IsAdminOrCourseAuthor]

    def _check_ownership(self, request, course):
        """Создатели курсов могут работать только со своими курсами."""
        if not request.user.is_staff and course.author_id != request.user.id:
            return Response(
                {'error': 'Вы можете редактировать только свои курсы'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def get(self, request, course_id):
        """Получить структуру курса для конструктора."""
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

        denied = self._check_ownership(request, course)
        if denied:
            return denied

        serializer = CourseBuilderSerializer(course)
        return Response(serializer.data)

    def put(self, request, course_id):
        """Сохранить структуру курса (bulk update)."""
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

        denied = self._check_ownership(request, course)
        if denied:
            return denied

        data = request.data
        if 'title' in data:
            course.title = data['title']
        if 'description' in data:
            course.description = data['description']
        course.save()

        serializer = CourseBuilderSerializer(course)
        return Response(serializer.data)


class CoursePublishView(APIView):
    """Публикация курса."""
    permission_classes = [IsAdminUser]

    def post(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({'error': 'Курс не найден'}, status=status.HTTP_404_NOT_FOUND)

        pages_count = CoursePage.objects.filter(course_id=course.id, is_active=True).count()
        if pages_count == 0:
            return Response(
                {'error': 'Нельзя опубликовать курс без страниц. Добавьте уроки в конструкторе.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        course.is_active = True
        course.status = 'published'
        course.lessons_count = pages_count
        course.save(update_fields=['is_active', 'status', 'lessons_count'])

        return Response({
            'message': 'Курс успешно опубликован',
            'course_id': course.id,
            'pages_count': pages_count,
        })


class BlockReorderView(APIView):
    """Reorder blocks within a page."""
    permission_classes = [IsAdminOrCourseAuthor]

    def patch(self, request, page_id):
        block_ids = request.data.get('block_ids', [])
        if not block_ids:
            return Response({'error': 'block_ids обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            page = CoursePage.objects.get(id=page_id)
        except CoursePage.DoesNotExist:
            return Response({'error': 'Страница не найдена'}, status=status.HTTP_404_NOT_FOUND)

        for i, block_id in enumerate(block_ids, start=1):
            ContentBlock.objects.filter(id=block_id, page=page).update(order=i)

        return Response({'message': 'Порядок обновлён', 'count': len(block_ids)})


class PagesReorderView(APIView):
    """Reorder pages within a module or among orphans."""
    permission_classes = [IsAdminOrCourseAuthor]

    def patch(self, request, course_id):
        module_id = request.data.get('module_id')
        page_ids = request.data.get('page_ids', [])
        if not page_ids:
            return Response({'error': 'page_ids обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        course = get_object_or_404(Course, id=course_id)
        if module_id is None:
            queryset = CoursePage.objects.filter(course_id=course.id, module__isnull=True, is_active=True)
        else:
            queryset = CoursePage.objects.filter(course_id=course.id, module_id=module_id, is_active=True)

        existing_ids = set(queryset.values_list('id', flat=True))
        if set(page_ids) != existing_ids:
            return Response(
                {'error': 'page_ids не совпадает с страницами модуля'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for i, page_id in enumerate(page_ids, start=1):
            CoursePage.objects.filter(id=page_id).update(order_number=i)

        return Response({'message': 'Порядок страниц обновлён', 'count': len(page_ids)})


class ModulesReorderView(APIView):
    """Reorder modules within a course."""
    permission_classes = [IsAdminOrCourseAuthor]

    def patch(self, request, course_id):
        module_ids = request.data.get('module_ids', [])
        if not module_ids:
            return Response({'error': 'module_ids обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        queryset = CourseModule.objects.filter(course_id=course_id, is_active=True)
        existing_ids = set(queryset.values_list('id', flat=True))
        if set(module_ids) != existing_ids:
            return Response(
                {'error': 'module_ids не совпадает с модулями курса'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Two-pass: temporary high values to avoid unique_together violation
            offset = 10000
            for i, mod_id in enumerate(module_ids):
                CourseModule.objects.filter(id=mod_id).update(order_number=offset + i)
            for i, mod_id in enumerate(module_ids, start=1):
                CourseModule.objects.filter(id=mod_id).update(order_number=i)

        return Response({'message': 'Порядок модулей обновлён', 'count': len(module_ids)})


class PageMoveToModuleView(APIView):
    """Move a page to a different module (or to orphan). Atomic operation."""
    permission_classes = [IsAdminUser]

    def patch(self, request, page_id):
        target_module_id = request.data.get('target_module_id')

        page = get_object_or_404(CoursePage, id=page_id, is_active=True)
        source_module_id = page.module_id

        if source_module_id == target_module_id:
            return Response({'message': 'Страница уже в этом модуле'})

        if target_module_id is not None:
            target_module = get_object_or_404(CourseModule, id=target_module_id)
            page.module = target_module
        else:
            page.module = None

        target_filter = {'course_id': page.course_id, 'is_active': True}
        if target_module_id is not None:
            target_filter['module_id'] = target_module_id
        else:
            target_filter['module__isnull'] = True

        max_order = CoursePage.objects.filter(**target_filter).exclude(
            id=page.id
        ).aggregate(max=models.Max('order_number'))['max'] or 0

        page.order_number = max_order + 1
        page.save(update_fields=['module', 'order_number'])

        source_filter = {'course_id': page.course_id, 'is_active': True}
        if source_module_id is not None:
            source_filter['module_id'] = source_module_id
        else:
            source_filter['module__isnull'] = True

        for i, p in enumerate(
            CoursePage.objects.filter(**source_filter).order_by('order_number'), start=1
        ):
            if p.order_number != i:
                CoursePage.objects.filter(id=p.id).update(order_number=i)

        serializer = CoursePageSerializer(page)
        return Response(serializer.data)


class CoursePageViewSet(ModelViewSet):
    """
    ViewSet для управления страницами курсов.
    Доступ: администраторы и авторы курса.
    """

    permission_classes = [IsAdminOrCourseAuthor]
    serializer_class = CoursePageSerializer

    def get_queryset(self):
        course_id = self.kwargs.get('course_id')
        if course_id is not None:
            return CoursePage.objects.filter(course_id=course_id, is_active=True)
        return CoursePage.objects.filter(is_active=True)

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
    Доступ: администраторы и авторы курса.
    """

    permission_classes = [IsAdminOrCourseAuthor]
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
