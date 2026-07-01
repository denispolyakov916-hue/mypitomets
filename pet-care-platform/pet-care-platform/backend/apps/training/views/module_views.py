"""
Views для модулей курсов и структуры курса.
"""

import logging
from django.db.models import Max
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.training.models import (
    Course, CourseModule, CoursePage, UserCourse, UserCourseProgress,
)
from apps.training.utils import has_course_access
from apps.training.serializers import (
    CourseModuleSerializer,
    CourseStructureSerializer,
    CourseStructureModuleSerializer,
    CourseStructurePageSerializer,
)

logger = logging.getLogger(__name__)


class _IsAdminOrCourseCreator(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_staff or getattr(request.user, 'role', None) == 'course_creator'

    def has_object_permission(self, request, view, obj):
        # obj — CourseModule. Владелец = автор курса; администратор — ко всем.
        # P0: закрывает доступ специалиста к модулям ЧУЖОГО курса.
        u = request.user
        if u.is_staff or u.is_superuser:
            return True
        author_id = getattr(obj.course, 'author_id', None)
        return author_id is not None and author_id == u.id


class CourseModuleViewSet(ModelViewSet):
    """
    CRUD для модулей курса. Админ — ко всем; специалист (course_creator) — только
    к модулям СВОИХ курсов (author == пользователь).
    """
    serializer_class = CourseModuleSerializer
    permission_classes = [_IsAdminOrCourseCreator]

    def _is_admin(self):
        u = self.request.user
        return bool(u.is_staff or u.is_superuser)

    def get_queryset(self):
        qs = CourseModule.objects.filter(is_active=True)
        course_id = self.kwargs.get('course_id')
        if course_id is not None:
            qs = qs.filter(course_id=course_id)
        # Специалист видит/правит только модули своих курсов (иначе detail → 404).
        if not self._is_admin():
            qs = qs.filter(course__author_id=self.request.user.id)
        return qs.order_by('order_number')

    def perform_create(self, serializer):
        from rest_framework.exceptions import NotFound, PermissionDenied
        course_id = self.kwargs.get('course_id')
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            raise NotFound('Курс не найден')
        # Owner-check: добавлять модули можно только в свой курс.
        if not self._is_admin() and course.author_id != self.request.user.id:
            raise PermissionDenied('Можно управлять модулями только своих курсов')

        # Автоинкремент order_number (используем _base_manager для учёта soft-deleted)
        max_order = CourseModule._base_manager.filter(course_id=course_id).aggregate(
            m=Max('order_number')
        )['m']
        next_order = (max_order + 1) if max_order is not None else 1

        # Обязательно перезаписываем в validated_data, т.к. модель имеет default=1
        serializer.validated_data['course'] = course
        serializer.validated_data['order_number'] = next_order
        serializer.save()

    def perform_destroy(self, instance):
        """Мягкое удаление."""
        instance.is_active = False
        instance.save(update_fields=['is_active'])


class CourseStructureView(APIView):
    """
    Получение полной структуры курса с прогрессом пользователя.
    Используется на странице обучения (Stepik-стиль).

    GET /api/courses/<course_id>/structure/?pet_id=<pet_id>
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not has_course_access(request.user, course):
            return Response(
                {'error': 'У вас нет доступа к этому курсу'},
                status=status.HTTP_403_FORBIDDEN,
            )

        pet_id = request.query_params.get('pet_id')

        # Загружаем модули с вложенными страницами
        modules = CourseModule.objects.filter(
            course=course, is_active=True,
        ).prefetch_related('pages__blocks').order_by('order_number')

        # Загружаем прогресс пользователя
        completed_page_ids = set()
        completed_pages = 0
        total_pages = 0

        # Получаем прогресс по курсу
        progress_filter = {'user': request.user, 'course': course}
        if pet_id:
            progress_filter['pet_id'] = pet_id

        course_progress = UserCourseProgress.objects.filter(**progress_filter).first()

        if course_progress:
            # Получаем список завершённых страниц из JSON-поля
            completed_page_ids = set(course_progress.completed_pages_ids or [])

        # Формируем структуру с прогрессом
        modules_data = []
        for module in modules:
            pages = module.pages.filter(is_active=True).order_by('order_number')
            pages_data = []
            module_completed = 0
            module_total = 0

            for page in pages:
                total_pages += 1
                module_total += 1
                page_status = 'completed' if page.id in completed_page_ids else 'not_started'
                if page_status == 'completed':
                    completed_pages += 1
                    module_completed += 1

                pages_data.append({
                    'id': page.id,
                    'title': page.title,
                    'order_number': page.order_number,
                    'page_type': page.page_type,
                    'blocks_count': page.blocks.filter(is_active=True).count(),
                    'status': page_status,
                })

            module_progress = (module_completed / module_total * 100) if module_total > 0 else 0

            modules_data.append({
                'id': module.id,
                'title': module.title,
                'description': module.description,
                'order_number': module.order_number,
                'pages': pages_data,
                'progress_percent': round(module_progress, 1),
            })

        # Также добавляем orphan-страницы (без модуля)
        orphan_pages = CoursePage.objects.filter(
            course_id=course.id, module__isnull=True, is_active=True,
        ).order_by('order_number')

        if orphan_pages.exists():
            orphan_pages_data = []
            for page in orphan_pages:
                total_pages += 1
                page_status = 'completed' if page.id in completed_page_ids else 'not_started'
                if page_status == 'completed':
                    completed_pages += 1

                orphan_pages_data.append({
                    'id': page.id,
                    'title': page.title,
                    'order_number': page.order_number,
                    'page_type': page.page_type,
                    'blocks_count': page.blocks.filter(is_active=True).count(),
                    'status': page_status,
                })

            # Добавляем orphan-страницы как псевдо-модуль
            modules_data.insert(0, {
                'id': None,
                'title': 'Основной',
                'description': '',
                'order_number': 0,
                'pages': orphan_pages_data,
                'progress_percent': 0,
            })

        overall_progress = (completed_pages / total_pages * 100) if total_pages > 0 else 0

        return Response({
            'course_id': course.id,
            'course_title': course.title,
            'modules': modules_data,
            'progress_percent': round(overall_progress, 1),
            'completed_pages': completed_pages,
            'total_pages': total_pages,
        })
