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
    - CourseRatingsView: Оценки курса (GET/POST)
    - CommentListView: Список комментариев с пагинацией
    - CommentCreateView: Создание комментариев
    - CommentDetailView: Детали, редактирование, удаление комментариев
    - CommentReactionView: Реакции на комментарии
    - CourseRatingListView: Список оценок курса
    - CourseRatingCreateView: Создание оценок
    - RatingDetailView: Управление оценками

Используемые модели:
    - Comment, CommentLike, Rating
"""

import logging
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db.models import Avg, Count
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from ..models import Course, Lesson, UserCourse, Comment, CommentLike, Rating
from ..serializers import (
    CommentSerializer, CommentCreateSerializer,
    RatingSerializer, RatingCreateSerializer
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
                    'id': comment.user.id,
                    'username': comment.user.username,
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


class CourseRatingsView(APIView):
    """
    Оценки курса.

    GET /api/courses/{id}/ratings/ - получить оценки
    POST /api/courses/{id}/ratings/ - поставить оценку
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

        ratings = Rating.objects.filter(
            course=course,
            is_approved=True
        ).select_related('user', 'pet').order_by('-created_at')

        ratings_data = []
        for rating in ratings:
            rating_data = {
                'id': str(rating.id),
                'user': {
                    'id': rating.user.id,
                    'username': rating.user.username,
                },
                'rating': rating.rating,
                'review': rating.review,
                'pet_name': rating.pet.name if rating.pet else None,
                'created_at': rating.created_at.isoformat(),
            }
            ratings_data.append(rating_data)

        # Статистика рейтингов
        from django.db.models import Avg, Count
        stats = ratings.aggregate(
            avg_rating=Avg('rating'),
            total_ratings=Count('id')
        )

        rating_distribution = {}
        for i in range(1, 6):
            rating_distribution[i] = ratings.filter(rating=i).count()

        return Response({
            'ratings': ratings_data,
            'stats': {
                'average_rating': round(stats['avg_rating'], 1) if stats['avg_rating'] else 0,
                'total_ratings': stats['total_ratings'],
                'distribution': rating_distribution,
            }
        }, status=status.HTTP_200_OK)

    def post(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

        # Проверка, что пользователь имеет доступ к курсу
        if not UserCourse.objects.filter(
            user=request.user,
            course=course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому курсу'},
                status=status.HTTP_403_FORBIDDEN
            )

        rating_value = request.data.get('rating')
        if not rating_value or not isinstance(rating_value, int) or rating_value < 1 or rating_value > 5:
            return Response(
                {'error': 'Оценка должна быть целым числом от 1 до 5'},
                status=status.HTTP_400_BAD_REQUEST
            )

        review_text = request.data.get('review', '').strip()
        pet_id = request.data.get('pet_id')

        # Проверка, не ставил ли уже оценку
        existing_rating = Rating.objects.filter(
            user=request.user,
            course=course,
            pet_id=pet_id
        ).first()

        if existing_rating:
            # Обновляем существующую оценку
            existing_rating.rating = rating_value
            existing_rating.review = review_text
            existing_rating.save()
            message = 'Оценка обновлена'
        else:
            # Создаем новую оценку
            pet = None
            if pet_id:
                try:
                    pet = Pet.objects.get(id=pet_id, owner=request.user)
                except Pet.DoesNotExist:
                    pass

            Rating.objects.create(
                user=request.user,
                course=course,
                rating=rating_value,
                review=review_text,
                pet=pet
            )
            message = 'Оценка добавлена'

        return Response({
            'message': message,
            'rating': rating_value,
            'review': review_text,
        }, status=status.HTTP_201_CREATED)


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

        is_like = action == 'like'
        created, was_like = comment.add_like(request.user, is_like)

        return Response({
            'message': 'Реакция добавлена' if created else 'Реакция обновлена',
            'action': action,
            'likes_count': comment.likes_count,
            'dislikes_count': comment.dislikes_count
        })


class CourseRatingListView(APIView):
    """
    Список оценок курса (улучшенная версия).

    GET /api/courses/{course_id}/ratings/
    """
    permission_classes = [AllowAny]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

        # Получаем одобренные оценки с пагинацией
        ratings = Rating.objects.filter(
            course=course,
            is_approved=True
        ).select_related('user', 'pet').order_by('-created_at')

        # Пагинация
        page = request.query_params.get('page', 1)
        per_page = min(int(request.query_params.get('per_page', 10)), 50)

        paginator = Paginator(ratings, per_page)
        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages)

        serializer = RatingSerializer(
            page_obj,
            many=True,
            context={'request': request}
        )

        # Статистика оценок
        stats = Rating.objects.filter(course=course, is_approved=True).aggregate(
            avg_rating=Avg('rating'),
            total_ratings=Count('id')
        )

        # Распределение по звездам
        rating_distribution = {}
        for i in range(1, 6):
            rating_distribution[i] = Rating.objects.filter(
                course=course,
                rating=i,
                is_approved=True
            ).count()

        return Response({
            'results': serializer.data,
            'stats': {
                'average_rating': round(stats['avg_rating'], 1) if stats['avg_rating'] else 0,
                'total_ratings': stats['total_ratings'],
                'distribution': rating_distribution,
            },
            'total_ratings': paginator.count,
            'total_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'per_page': per_page
        })


class CourseRatingCreateView(APIView):
    """
    Создание оценки курса.

    POST /api/courses/{course_id}/ratings/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

        # Проверяем доступ к курсу
        if not UserCourse.objects.filter(user=request.user, course=course).exists():
            return Response(
                {'error': 'У вас нет доступа к этому курсу'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = RatingCreateSerializer(data=request.data)
        if serializer.is_valid():
            rating = serializer.save(user=request.user, course=course)

            response_serializer = RatingSerializer(
                rating,
                context={'request': request}
            )
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RatingDetailView(APIView):
    """
    Детали, редактирование и удаление оценки.

    GET /api/ratings/{id}/ - детали оценки
    PUT /api/ratings/{id}/ - редактирование
    DELETE /api/ratings/{id}/ - удаление
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, rating_id):
        try:
            rating = Rating.objects.get(id=rating_id)
        except Rating.DoesNotExist:
            return Response(
                {'error': 'Оценка не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем доступ к оценке
        if not rating.can_edit(request.user) and not request.user.is_staff:
            return Response(
                {'error': 'У вас нет доступа к этой оценке'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = RatingSerializer(rating, context={'request': request})
        return Response(serializer.data)

    def put(self, request, rating_id):
        try:
            rating = Rating.objects.get(id=rating_id)
        except Rating.DoesNotExist:
            return Response(
                {'error': 'Оценка не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем права на редактирование
        if not rating.can_edit(request.user):
            return Response(
                {'error': 'У вас нет прав на редактирование этой оценки'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = RatingCreateSerializer(rating, data=request.data, partial=True)
        if serializer.is_valid():
            updated_rating = serializer.save()
            response_serializer = RatingSerializer(
                updated_rating,
                context={'request': request}
            )
            return Response(response_serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, rating_id):
        try:
            rating = Rating.objects.get(id=rating_id)
        except Rating.DoesNotExist:
            return Response(
                {'error': 'Оценка не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем права на удаление
        if not rating.can_delete(request.user):
            return Response(
                {'error': 'У вас нет прав на удаление этой оценки'},
                status=status.HTTP_403_FORBIDDEN
            )

        rating.delete()
        return Response(
            {'message': 'Оценка удалена'},
            status=status.HTTP_204_NO_CONTENT
        )
