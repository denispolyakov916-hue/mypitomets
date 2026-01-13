"""
Views для работы с уроками курсов и прогрессом обучения.

Этот модуль содержит views для:
- Просмотра уроков курса (новая архитектура с CoursePage)
- Детального просмотра уроков
- Отслеживания прогресса по урокам
- Управления прогрессом обучения

Основные классы:
    - CourseLessonsView: Список уроков/страниц курса с поддержкой двух архитектур
    - LessonDetailView: Детали конкретного урока с прогрессом
    - LessonCompleteView: Отметка урока как завершённого
    - UserCourseProgressView: Общий прогресс пользователя по курсу
    - LessonProgressView: Обновление прогресса по конкретному уроку
    - LessonCommentsView: Комментарии к урокам

Особенности:
    - Поддержка новой архитектуры с CoursePage и старой с Lesson
    - Персонализация прогресса по питомцам
    - Оптимизированные запросы с select_related/prefetch_related
"""

import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from ..models import (
    Course, Lesson, UserCourse, UserCourseProgress, UserLessonProgress,
    Comment
)
from apps.pets.models import Pet

logger = logging.getLogger('apps.training')


class CourseLessonsView(APIView):
    """
    Уроки курса.

    GET /api/courses/{course_id}/lessons/
    Возвращает список уроков курса в правильном порядке.
    """

    permission_classes = [AllowAny]

    def get(self, request, course_id):
        try:
            # Оптимизация: используем with_ratings() для консистентности
            course = Course.objects.with_ratings().get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

        # Поддержка обеих архитектур: CoursePage (новая) и Lesson (старая)
        use_new_architecture = course.has_pages()

        if use_new_architecture:
            # Новая архитектура: CoursePage
            pages = course.get_pages_ordered().prefetch_related('blocks')
            items_data = []

            for page in pages:
                page_data = {
                    'id': page.id,
                    'title': page.title,
                    'page_type': page.page_type,
                    'order': page.order_number,
                    'is_required': page.settings.get('required_completion', False),
                    'blocks_count': page.blocks.filter(is_active=True).count(),
                    'architecture': 'page'  # Указываем тип архитектуры
                }
                items_data.append(page_data)
        else:
            # Старая архитектура: Lesson
            lessons = course.get_lessons_ordered()
            items_data = []

            # Оптимизация: предзагружаем прогресс для всех уроков одним запросом
            lesson_progresses = {}
            if request.user.is_authenticated:
                pet_id = request.query_params.get('pet_id')
                try:
                    course_progress = UserCourseProgress.objects.select_related('user', 'course', 'pet').get(
                        user=request.user,
                        course=course,
                        pet_id=pet_id
                    )
                    # Предзагружаем прогресс всех уроков одним запросом
                    progresses = UserLessonProgress.objects.filter(
                        course_progress=course_progress,
                        lesson__in=lessons
                    ).select_related('lesson')
                    lesson_progresses = {p.lesson_id: p for p in progresses}
                except UserCourseProgress.DoesNotExist:
                    pass

            for lesson in lessons:
                lesson_data = {
                    'id': lesson.id,
                    'title': lesson.title,
                    'content_type': lesson.content_type,
                    'content_type_display': lesson.get_content_type_display_name(),
                    'duration': lesson.duration,
                    'order': lesson.order,
                    'is_required': lesson.is_required,
                    'architecture': 'lesson'  # Указываем тип архитектуры
                }

                # Для авторизованных пользователей добавляем статус прогресса
                if request.user.is_authenticated and lesson.id in lesson_progresses:
                    lesson_progress = lesson_progresses[lesson.id]

                    lesson_data['progress'] = {
                        'status': lesson_progress.status,
                        'time_spent': lesson_progress.time_spent,
                        'completed_at': lesson_progress.completed_at.isoformat() if lesson_progress.completed_at else None,
                    }

                items_data.append(lesson_data)

        return Response({
            'items': items_data,  # Универсальное название для обеих архитектур
            'lessons': items_data,  # Обратная совместимость
            'count': len(items_data),
            'architecture': 'page' if use_new_architecture else 'lesson'
        }, status=status.HTTP_200_OK)


class LessonDetailView(APIView):
    """
    Детали урока.

    GET /api/lessons/{id}/
    Возвращает полную информацию об уроке.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_id):
        try:
            lesson = Lesson.objects.select_related('course').get(id=lesson_id, is_active=True)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Урок не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка доступа к курсу
        if not UserCourse.objects.filter(
            user=request.user,
            course=lesson.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому уроку'},
                status=status.HTTP_403_FORBIDDEN
            )

        lesson_data = {
            'id': lesson.id,
            'course_id': lesson.course.id,
            'title': lesson.title,
            'content_type': lesson.content_type,
            'content_type_display': lesson.get_content_type_display_name(),
            'content': lesson.content,
            'duration': lesson.duration,
            'order': lesson.order,
            'is_required': lesson.is_required,
            'additional_materials': lesson.additional_materials,
        }

        # Прогресс пользователя по уроку
        pet_id = request.query_params.get('pet_id')
        try:
            course_progress = UserCourseProgress.objects.get(
                user=request.user,
                course=lesson.course,
                pet_id=pet_id
            )
            lesson_progress = UserLessonProgress.objects.filter(
                course_progress=course_progress,
                lesson=lesson
            ).first()

            if lesson_progress:
                lesson_data['progress'] = {
                    'id': str(lesson_progress.id),
                    'status': lesson_progress.status,
                    'time_spent': lesson_progress.time_spent,
                    'attempts_count': lesson_progress.attempts_count,
                    'success_rate': lesson_progress.success_rate,
                    'notes': lesson_progress.notes,
                    'started_at': lesson_progress.started_at.isoformat() if lesson_progress.started_at else None,
                    'completed_at': lesson_progress.completed_at.isoformat() if lesson_progress.completed_at else None,
                }
            else:
                lesson_data['progress'] = None
        except UserCourseProgress.DoesNotExist:
            lesson_data['progress'] = None

        return Response({'lesson': lesson_data}, status=status.HTTP_200_OK)


class LessonCompleteView(APIView):
    """
    Завершение урока.

    POST /api/lessons/{id}/complete/
    Отмечает урок как завершённый и обновляет прогресс.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, lesson_id):
        try:
            lesson = Lesson.objects.select_related('course').get(id=lesson_id, is_active=True)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Урок не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка доступа к курсу
        if not UserCourse.objects.filter(
            user=request.user,
            course=lesson.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому уроку'},
                status=status.HTTP_403_FORBIDDEN
            )

        pet_id = request.data.get('pet_id')
        time_spent = request.data.get('time_spent', 0)

        try:
            course_progress = UserCourseProgress.objects.get(
                user=request.user,
                course=lesson.course,
                pet_id=pet_id
            )
        except UserCourseProgress.DoesNotExist:
            return Response(
                {'error': 'Прогресс по курсу не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Получаем или создаем прогресс по уроку
        lesson_progress, created = UserLessonProgress.objects.get_or_create(
            course_progress=course_progress,
            lesson=lesson,
            defaults={
                'status': 'not_started',
            }
        )

        # Отмечаем урок как завершённый
        lesson_progress.mark_completed(time_spent)

        return Response({
            'message': 'Урок успешно завершён',
            'lesson_progress': {
                'id': str(lesson_progress.id),
                'status': lesson_progress.status,
                'completed_at': lesson_progress.completed_at.isoformat(),
                'time_spent': lesson_progress.time_spent,
            },
            'course_progress': {
                'progress_percent': course_progress.progress_percent,
                'status': course_progress.status,
            }
        }, status=status.HTTP_200_OK)


class UserCourseProgressView(APIView):
    """
    Прогресс пользователя по курсу.

    GET /api/courses/{course_id}/progress/
    Возвращает детальный прогресс по курсу для указанного питомца.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

        # Проверка доступа к курсу
        if not UserCourse.objects.filter(
            user=request.user,
            course=course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому курсу'},
                status=status.HTTP_403_FORBIDDEN
            )

        pet_id = request.query_params.get('pet_id')
        if not pet_id:
            return Response(
                {'error': 'Необходимо указать pet_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            course_progress = UserCourseProgress.objects.select_related(
                'course', 'pet'
            ).get(
                user=request.user,
                course=course,
                pet_id=pet_id
            )
        except UserCourseProgress.DoesNotExist:
            # Создаем прогресс если его нет
            course_progress = UserCourseProgress.objects.create(
                user=request.user,
                course=course,
                pet_id=pet_id,
                status='not_started'
            )

        # Получаем прогресс по всем урокам
        lessons_progress = []
        for lesson in course.get_lessons_ordered():
            lesson_progress = UserLessonProgress.objects.filter(
                course_progress=course_progress,
                lesson=lesson
            ).first()

            lesson_data = {
                'lesson_id': lesson.id,
                'title': lesson.title,
                'order': lesson.order,
                'is_required': lesson.is_required,
                'progress': None
            }

            if lesson_progress:
                lesson_data['progress'] = {
                    'id': str(lesson_progress.id),
                    'status': lesson_progress.status,
                    'time_spent': lesson_progress.time_spent,
                    'attempts_count': lesson_progress.attempts_count,
                    'success_rate': lesson_progress.success_rate,
                    'completed_at': lesson_progress.completed_at.isoformat() if lesson_progress.completed_at else None,
                }

            lessons_progress.append(lesson_data)

        progress_data = {
            'id': str(course_progress.id),
            'course_id': course.id,
            'pet_id': str(course_progress.pet_id) if course_progress.pet else None,
            'pet_name': course_progress.pet.name if course_progress.pet else None,
            'status': course_progress.status,
            'progress_percent': course_progress.progress_percent,
            'started_at': course_progress.started_at.isoformat() if course_progress.started_at else None,
            'last_activity_at': course_progress.last_activity_at.isoformat(),
            'completed_at': course_progress.completed_at.isoformat() if course_progress.completed_at else None,
            'total_time_spent': course_progress.total_time_spent,
            'completed_lessons_count': course_progress.completed_lessons_count,
            'notifications_enabled': course_progress.notifications_enabled,
            'lessons_progress': lessons_progress,
        }

        return Response({'progress': progress_data}, status=status.HTTP_200_OK)


class LessonProgressView(APIView):
    """
    Обновление прогресса по уроку.

    PUT /api/lessons/{id}/progress/
    Обновляет время просмотра, статус и другие метрики урока.
    """

    permission_classes = [IsAuthenticated]

    def put(self, request, lesson_id):
        try:
            lesson = Lesson.objects.select_related('course').get(id=lesson_id, is_active=True)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Урок не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка доступа к курсу
        if not UserCourse.objects.filter(
            user=request.user,
            course=lesson.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому уроку'},
                status=status.HTTP_403_FORBIDDEN
            )

        pet_id = request.data.get('pet_id')
        if not pet_id:
            return Response(
                {'error': 'Необходимо указать pet_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            course_progress = UserCourseProgress.objects.get(
                user=request.user,
                course=lesson.course,
                pet_id=pet_id
            )
        except UserCourseProgress.DoesNotExist:
            return Response(
                {'error': 'Прогресс по курсу не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Получаем или создаем прогресс по уроку
        lesson_progress, created = UserLessonProgress.objects.get_or_create(
            course_progress=course_progress,
            lesson=lesson,
            defaults={
                'status': 'in_progress',
                'started_at': timezone.now(),
            }
        )

        # Обновляем данные прогресса
        if not lesson_progress.started_at:
            lesson_progress.started_at = timezone.now()

        lesson_progress.status = request.data.get('status', lesson_progress.status)
        lesson_progress.time_spent = request.data.get('time_spent', lesson_progress.time_spent)
        lesson_progress.attempts_count = request.data.get('attempts_count', lesson_progress.attempts_count)
        lesson_progress.success_rate = request.data.get('success_rate', lesson_progress.success_rate)
        lesson_progress.notes = request.data.get('notes', lesson_progress.notes)

        lesson_progress.save()

        # Если урок завершён, обновляем общий прогресс курса
        if lesson_progress.status == 'completed' and not lesson_progress.completed_at:
            lesson_progress.mark_completed()

        return Response({
            'lesson_progress': {
                'id': str(lesson_progress.id),
                'status': lesson_progress.status,
                'time_spent': lesson_progress.time_spent,
                'attempts_count': lesson_progress.attempts_count,
                'success_rate': lesson_progress.success_rate,
                'updated_at': lesson_progress.updated_at.isoformat(),
            }
        }, status=status.HTTP_200_OK)


class LessonCommentsView(APIView):
    """
    Комментарии к уроку.

    GET /api/lessons/{id}/comments/ - получить комментарии
    POST /api/lessons/{id}/comments/ - добавить комментарий
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, lesson_id):
        try:
            lesson = Lesson.objects.select_related('course').get(id=lesson_id, is_active=True)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Урок не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем доступ к курсу для приватных комментариев
        has_access = UserCourse.objects.filter(
            user=request.user,
            course=lesson.course
        ).exists() if request.user.is_authenticated else False

        comments = Comment.objects.filter(
            lesson=lesson,
            is_active=True
        ).select_related('user', 'parent')

        # Для неавторизованных пользователей показываем только публичные комментарии
        if not request.user.is_authenticated:
            comments = comments.filter(is_private=False)
        elif not has_access:
            # Для авторизованных, но не имеющих доступа - только публичные
            comments = comments.filter(is_private=False)

        comments = comments.order_by('created_at')

        comments_data = []
        for comment in comments:
            comment_data = {
                'id': comment.id,
                'content': comment.content,
                'created_at': comment.created_at.isoformat(),
                'updated_at': comment.updated_at.isoformat(),
                'is_private': comment.is_private,
                'likes_count': comment.likes_count,
                'replies_count': comment.replies_count,
                'user': {
                    'id': comment.user.id,
                    'username': comment.user.username,
                    'avatar': comment.user.profile.avatar.url if hasattr(comment.user, 'profile') and comment.user.profile.avatar else None,
                } if comment.user else None,
                'parent_id': comment.parent.id if comment.parent else None,
            }

            # Для авторизованного пользователя добавляем информацию о лайке
            if request.user.is_authenticated:
                comment_data['is_liked'] = CommentLike.objects.filter(
                    user=request.user,
                    comment=comment
                ).exists()

            comments_data.append(comment_data)

        return Response({
            'comments': comments_data,
            'count': len(comments_data),
            'has_access': has_access
        }, status=status.HTTP_200_OK)

    def post(self, request, lesson_id):
        try:
            lesson = Lesson.objects.select_related('course').get(id=lesson_id, is_active=True)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Урок не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем доступ к курсу
        if not UserCourse.objects.filter(
            user=request.user,
            course=lesson.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому уроку'},
                status=status.HTTP_403_FORBIDDEN
            )

        content = request.data.get('content', '').strip()
        if not content:
            return Response(
                {'error': 'Текст комментария не может быть пустым'},
                status=status.HTTP_400_BAD_REQUEST
            )

        parent_id = request.data.get('parent_id')
        parent_comment = None
        if parent_id:
            try:
                parent_comment = Comment.objects.get(
                    id=parent_id,
                    lesson=lesson,
                    is_active=True
                )
            except Comment.DoesNotExist:
                return Response(
                    {'error': 'Родительский комментарий не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Создаем комментарий
        comment = Comment.objects.create(
            lesson=lesson,
            user=request.user,
            content=content,
            parent=parent_comment,
            is_private=request.data.get('is_private', False)
        )

        # Обновляем счетчики
        comment.refresh_counts()

        comment_data = {
            'id': comment.id,
            'content': comment.content,
            'created_at': comment.created_at.isoformat(),
            'updated_at': comment.updated_at.isoformat(),
            'is_private': comment.is_private,
            'likes_count': comment.likes_count,
            'replies_count': comment.replies_count,
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'avatar': request.user.profile.avatar.url if hasattr(request.user, 'profile') and request.user.profile.avatar else None,
            },
            'parent_id': comment.parent.id if comment.parent else None,
            'is_liked': False  # Новый комментарий не может быть лайкнут
        }

        return Response(comment_data, status=status.HTTP_201_CREATED)
