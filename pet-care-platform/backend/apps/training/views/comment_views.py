"""
Views для комментариев и рейтингов курсов и уроков.

Этот модуль содержит views для:
- Просмотра комментариев к курсам и урокам
- Создания, редактирования и удаления комментариев
- Управления лайками/дизлайками комментариев
- Просмотра и создания оценок курсов

Основные классы:
    - CourseCommentsView: Комментарии к курсу
    - CommentLikeView: Лайки/дизлайки комментариев
    - CommentListView: Список комментариев с пагинацией
    - CommentCreateView: Создание комментариев
    - CommentDetailView: Детали, редактирование, удаление комментариев
    - CommentReactionView: Реакции на комментарии

Используемые модели:
    - Comment, CommentLike
"""

import logging
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db.models import Avg, Count
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from ..models import Course, Lesson, CoursePage, UserCourse, Comment, CommentLike
from ..serializers import (
    CommentSerializer, CommentCreateSerializer
)
from apps.pets.models import Pet

logger = logging.getLogger('apps.training')


class CourseCommentsView(APIView):
    """
    Комментарии к курсу.

    GET /api/courses/{id}/comments/
    """

    permission_classes = [AllowAny]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

        comments = Comment.objects.filter(
            course=course,
            parent__isnull=True
        ).select_related('user').order_by('-created_at')

        comments_data = []
        for comment in comments:
            comment_data = {
                'id': str(comment.id),
                'user': {
                    'id': str(comment.user.id),
                    'username': comment.user.first_name or comment.user.email.split('@')[0],
                    'email': comment.user.email,
                },
                'content': comment.content,
                'attachments': comment.attachments,
                'likes_count': comment.likes_count,
                'dislikes_count': comment.dislikes_count,
                'replies_count': comment.get_replies().count(),
                'created_at': comment.created_at.isoformat(),
            }

            if request.user.is_authenticated:
                user_like = CommentLike.objects.filter(
                    comment=comment,
                    user=request.user
                ).first()
                comment_data['user_like'] = {
                    'is_liked': user_like.is_like if user_like else None
                } if user_like else None

            comments_data.append(comment_data)

        return Response({
            'comments': comments_data,
            'count': len(comments_data)
        }, status=status.HTTP_200_OK)


class CommentLikeView(APIView):
    """
    Лайк/дизлайк комментария.

    POST /api/comments/{id}/like/
    DELETE /api/comments/{id}/like/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Комментарий не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        is_like = request.data.get('is_like', True)

        if is_like:
            comment.add_like(request.user)
            action = 'лайк'
        else:
            comment.add_dislike(request.user)
            action = 'дизлайк'

        return Response({
            'message': f'{action.capitalize()} добавлен',
            'likes_count': comment.likes_count,
            'dislikes_count': comment.dislikes_count,
        }, status=status.HTTP_200_OK)

    def delete(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Комментарий не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        CommentLike.objects.filter(
            comment=comment,
            user=request.user
        ).delete()

        comment.update_rating()

        return Response({
            'message': 'Лайк удалён',
            'likes_count': comment.likes_count,
            'dislikes_count': comment.dislikes_count,
        }, status=status.HTTP_200_OK)


class PageCommentsView(APIView):
    """
    Комментарии к странице курса (CoursePage).

    GET  /api/courses/{course_id}/pages/{page_id}/comments/
    POST /api/courses/{course_id}/pages/{page_id}/comments/
    """
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, course_id, page_id):
        try:
            page = CoursePage.objects.select_related('module').get(
                id=page_id, course_id=course_id, is_active=True
            )
        except CoursePage.DoesNotExist:
            return Response(
                {'error': 'Страница не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        comments = Comment.objects.filter(
            page=page,
            parent__isnull=True
        ).select_related('user').prefetch_related('replies__user').order_by('-created_at')

        comments_data = _build_comments_tree(comments, request)

        return Response({
            'comments': comments_data,
            'count': len(comments_data),
            'pagination': None
        }, status=status.HTTP_200_OK)

    def post(self, request, course_id, page_id):
        try:
            page = CoursePage.objects.get(id=page_id, course_id=course_id, is_active=True)
        except CoursePage.DoesNotExist:
            return Response(
                {'error': 'Страница не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not UserCourse.objects.filter(user=request.user, course_id=course_id).exists():
            return Response(
                {'error': 'У вас нет доступа к этому курсу'},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data.copy()
        data['page'] = page.id
        # Не передаём course/lesson — комментарий привязан к странице
        data.pop('course', None)
        data.pop('lesson', None)

        # Поддержка parent_id для ответов (фронт может слать parent или parent_id)
        if data.get('parent_id') and not data.get('parent'):
            data['parent'] = data.pop('parent_id')

        serializer = CommentCreateSerializer(data=data)
        if serializer.is_valid():
            comment = serializer.save(user=request.user)
            comment_data = _serialize_comment(comment, request)
            return Response(comment_data, status=status.HTTP_201_CREATED)

        logger.warning("Page comment create validation failed: data=%s errors=%s", data, serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def _get_username(user):
    """Получить отображаемое имя пользователя."""
    return user.first_name or user.email.split('@')[0]


def _serialize_comment(comment, request):
    """Сериализовать комментарий с ответами."""
    user_like = None
    if request.user.is_authenticated:
        like = CommentLike.objects.filter(comment=comment, user=request.user).first()
        if like:
            user_like = {'is_liked': like.is_like}

    user_reaction = None
    if request.user.is_authenticated:
        user_reaction = comment.get_user_reaction(request.user)

    return {
        'id': str(comment.id),
        'user': {
            'id': str(comment.user.id),
            'username': _get_username(comment.user),
            'email': comment.user.email,
        },
        'content': comment.content,
        'attachments': comment.attachments or [],
        'likes_count': comment.likes_count,
        'dislikes_count': comment.dislikes_count,
        'replies_count': comment.get_replies().count(),
        'replies': [
            _serialize_comment(reply, request)
            for reply in comment.get_replies().select_related('user')
        ],
        'parent': str(comment.parent_id) if comment.parent_id else None,
        'user_like': user_like,
        'user_reaction': 'like' if user_reaction == 'like' else 'dislike' if user_reaction == 'dislike' else None,
        'created_at': comment.created_at.isoformat(),
        'updated_at': comment.updated_at.isoformat(),
    }


def _build_comments_tree(comments, request):
    """Построить дерево комментариев с ответами."""
    result = []
    for comment in comments:
        data = _serialize_comment(comment, request)
        result.append(data)
    return result


class CommentListView(APIView):
    """
    Список комментариев к курсу или уроку.

    GET /api/courses/{course_id}/comments/ - комментарии к курсу
    GET /api/lessons/{lesson_id}/comments/ - комментарии к уроку
    """
    permission_classes = [AllowAny]

    def get(self, request, course_id=None, lesson_id=None):
        if course_id:
            try:
                course = Course.objects.get(id=course_id, is_active=True)
            except Course.DoesNotExist:
                return Response(
                    {'error': 'Курс не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Получаем только корневые комментарии (без parent)
            comments = Comment.objects.filter(
                course=course,
                parent__isnull=True,
                is_moderated=True
            ).order_by('-created_at').prefetch_related('replies', 'user')

        elif lesson_id:
            try:
                lesson = Lesson.objects.get(id=lesson_id)
            except Lesson.DoesNotExist:
                return Response(
                    {'error': 'Урок не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Получаем только корневые комментарии (без parent)
            comments = Comment.objects.filter(
                lesson=lesson,
                parent__isnull=True,
                is_moderated=True
            ).order_by('-created_at').prefetch_related('replies', 'user')
        else:
            return Response(
                {'error': 'Необходимо указать course_id или lesson_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Пагинация
        page = request.query_params.get('page', 1)
        per_page = min(int(request.query_params.get('per_page', 10)), 50)

        paginator = Paginator(comments, per_page)
        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages)

        serializer = CommentSerializer(
            page_obj,
            many=True,
            context={'request': request}
        )

        return Response({
            'comments': serializer.data,
            'pagination': {
                'total': paginator.count,
                'page': page_obj.number,
                'per_page': per_page,
                'total_pages': paginator.num_pages,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous()
            }
        })


class CommentCreateView(APIView):
    """
    Создание комментария к курсу или уроку.

    POST /api/courses/{course_id}/comments/ - комментарий к курсу
    POST /api/lessons/{lesson_id}/comments/ - комментарий к уроку
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id=None, lesson_id=None):
        if course_id:
            try:
                course = Course.objects.get(id=course_id, is_active=True)
            except Course.DoesNotExist:
                return Response(
                    {'error': 'Курс не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Проверяем доступ к курсу
            if not UserCourse.objects.filter(user=request.user, course=course).exists():
                return Response(
                    {'error': 'У вас нет доступа к этому курсу'},
                    status=status.HTTP_403_FORBIDDEN
                )

            data = request.data.copy()
            data['course'] = course.id
            if data.get('parent_id') and not data.get('parent'):
                data['parent'] = data.pop('parent_id')

        elif lesson_id:
            try:
                lesson = Lesson.objects.get(id=lesson_id)
            except Lesson.DoesNotExist:
                return Response(
                    {'error': 'Урок не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Проверяем доступ к уроку через курс
            if not UserCourse.objects.filter(user=request.user, course=lesson.course).exists():
                return Response(
                    {'error': 'У вас нет доступа к этому уроку'},
                    status=status.HTTP_403_FORBIDDEN
                )

            data = request.data.copy()
            data['lesson'] = lesson.id
            if data.get('parent_id') and not data.get('parent'):
                data['parent'] = data.pop('parent_id')
        else:
            return Response(
                {'error': 'Необходимо указать course_id или lesson_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CommentCreateSerializer(data=data)
        if serializer.is_valid():
            comment = serializer.save(user=request.user)
            # Возвращаем созданный комментарий с дополнительной информацией
            response_serializer = CommentSerializer(
                comment,
                context={'request': request}
            )
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CommentDetailView(APIView):
    """
    Детали, редактирование и удаление комментария.

    GET /api/comments/{id}/ - детали комментария
    PUT /api/comments/{id}/ - редактирование
    DELETE /api/comments/{id}/ - удаление
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Комментарий не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем доступ к комментарию
        if comment.course and not UserCourse.objects.filter(
            user=request.user, course=comment.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому комментарию'},
                status=status.HTTP_403_FORBIDDEN
            )

        if comment.lesson and not UserCourse.objects.filter(
            user=request.user, course=comment.lesson.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому комментарию'},
                status=status.HTTP_403_FORBIDDEN
            )

        if comment.page and not UserCourse.objects.filter(
            user=request.user, course_id=comment.page.course_id
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому комментарию'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data)

    def put(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Комментарий не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем права на редактирование
        if not comment.can_edit(request.user):
            return Response(
                {'error': 'У вас нет прав на редактирование этого комментария'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CommentCreateSerializer(comment, data=request.data, partial=True)
        if serializer.is_valid():
            updated_comment = serializer.save()
            response_serializer = CommentSerializer(
                updated_comment,
                context={'request': request}
            )
            return Response(response_serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Комментарий не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем права на удаление
        if not comment.can_delete(request.user):
            return Response(
                {'error': 'У вас нет прав на удаление этого комментария'},
                status=status.HTTP_403_FORBIDDEN
            )

        comment.delete()
        return Response(
            {'message': 'Комментарий удален'},
            status=status.HTTP_204_NO_CONTENT
        )


class CommentReactionView(APIView):
    """
    Добавление/удаление реакции на комментарий (лайк/дизлайк).

    POST /api/comments/{id}/like/ - лайк
    POST /api/comments/{id}/dislike/ - дизлайк
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, comment_id, action):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Комментарий не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем доступ к комментарию
        if comment.course and not UserCourse.objects.filter(
            user=request.user, course=comment.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому комментарию'},
                status=status.HTTP_403_FORBIDDEN
            )

        if comment.lesson and not UserCourse.objects.filter(
            user=request.user, course=comment.lesson.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому комментарию'},
                status=status.HTTP_403_FORBIDDEN
            )

        if comment.page and not UserCourse.objects.filter(
            user=request.user, course_id=comment.page.course_id
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому комментарию'},
                status=status.HTTP_403_FORBIDDEN
            )

        is_like = action == 'like'
        created, was_like = comment.add_like(request.user, is_like)

        return Response({
            'message': 'Реакция добавлена' if created else 'Реакция обновлена',
            'action': action,
            'likes_count': comment.likes_count,
            'dislikes_count': comment.dislikes_count
        })
