"""
URL маршруты для эндпоинтов обучения (Курсы).

Эндпоинты курсов:
    GET  /api/courses/               - Каталог курсов
    GET  /api/courses/{id}/          - Детали курса
    POST /api/courses/{id}/purchase/ - Покупка/запись на курс
    POST /api/courses/{id}/enroll/   - Прямая запись на бесплатный курс
    GET  /api/courses/my/            - Курсы пользователя

Новые эндпоинты системы обучения:
    GET  /api/courses/{id}/lessons/      - Уроки курса
    GET  /api/courses/{id}/progress/     - Прогресс по курсу
    GET  /api/courses/{id}/comments/     - Комментарии к курсу
    GET  /api/courses/{id}/ratings/      - Оценки курса
    POST /api/courses/{id}/ratings/      - Поставить оценку

    GET  /api/lessons/{id}/              - Детали урока
    POST /api/lessons/{id}/complete/     - Завершить урок
    PUT  /api/lessons/{id}/progress/     - Обновить прогресс урока
    GET  /api/lessons/{id}/comments/     - Комментарии к уроку
    POST /api/lessons/{id}/comments/     - Добавить комментарий

    POST /api/comments/{id}/like/        - Лайк комментария
    DELETE /api/comments/{id}/like/      - Удалить лайк

Все пути имеют префикс /api/courses/ в главном urls.py
"""

from django.urls import path
from .views import (
    CourseListView,
    CourseDetailView,
    CourseCheckoutView,
    CoursePurchaseView,
    FreeCourseEnrollView,
    UserCoursesView,
    # Новые вьюсы для системы обучения
    CourseLessonsView,
    LessonDetailView,
    LessonCompleteView,
    UserCourseProgressView,
    LessonProgressView,
    LessonCommentsView,
    CourseCommentsView,
    CommentLikeView,
    CourseRatingsView,
    # Новые вьюсы для комментариев и оценок
    CommentListView,
    CommentCreateView,
    CommentDetailView,
    CommentLikeView as NewCommentLikeView,
    CourseRatingListView,
    CourseRatingCreateView,
    RatingDetailView
)

urlpatterns = [
    # Каталог курсов
    # GET /api/courses/
    path('', CourseListView.as_view(), name='course-list'),
    
    # Курсы пользователя (должен быть перед маршрутом {id})
    # GET /api/courses/my/
    path('my/', UserCoursesView.as_view(), name='user-courses'),
    
    # Детали курса
    # GET /api/courses/{id}/
    path('<int:course_id>/', CourseDetailView.as_view(), name='course-detail'),
    
    # Страница оформления курса
    # GET /api/courses/{id}/checkout/
    path('<int:course_id>/checkout/', CourseCheckoutView.as_view(), name='course-checkout'),
    
    # Покупка/запись на курс
    # POST /api/courses/{id}/purchase/
    path('<int:course_id>/purchase/', CoursePurchaseView.as_view(), name='course-purchase'),
    
    # Прямая запись на бесплатный курс (без корзины)
    # POST /api/courses/{id}/enroll/
    path('<int:course_id>/enroll/', FreeCourseEnrollView.as_view(), name='course-enroll'),

    # ===== НОВЫЕ МАРШРУТЫ ДЛЯ СИСТЕМЫ ОБУЧЕНИЯ =====

    # Уроки курса
    # GET /api/courses/{course_id}/lessons/
    path('<int:course_id>/lessons/', CourseLessonsView.as_view(), name='course-lessons'),

    # Прогресс по курсу
    # GET /api/courses/{course_id}/progress/
    path('<int:course_id>/progress/', UserCourseProgressView.as_view(), name='course-progress'),

    # Комментарии к курсу
    # GET /api/courses/{course_id}/comments/
    path('<int:course_id>/comments/', CourseCommentsView.as_view(), name='course-comments'),

    # Оценки курса
    # GET /api/courses/{course_id}/ratings/
    # POST /api/courses/{course_id}/ratings/
    path('<int:course_id>/ratings/', CourseRatingsView.as_view(), name='course-ratings'),

    # Детали урока
    # GET /api/lessons/{id}/
    path('lessons/<int:lesson_id>/', LessonDetailView.as_view(), name='lesson-detail'),

    # Завершение урока
    # POST /api/lessons/{id}/complete/
    path('lessons/<int:lesson_id>/complete/', LessonCompleteView.as_view(), name='lesson-complete'),

    # Прогресс по уроку
    # PUT /api/lessons/{id}/progress/
    path('lessons/<int:lesson_id>/progress/', LessonProgressView.as_view(), name='lesson-progress'),

    # Комментарии к уроку
    # GET /api/lessons/{id}/comments/
    # POST /api/lessons/{id}/comments/
    path('lessons/<int:lesson_id>/comments/', LessonCommentsView.as_view(), name='lesson-comments'),

    # Лайк комментария (старый способ)
    # POST /api/comments/{id}/like/
    # DELETE /api/comments/{id}/like/
    path('comments/<uuid:comment_id>/like/', CommentLikeView.as_view(), name='comment-like'),

    # ===== РАСШИРЕННЫЕ МАРШРУТЫ КОММЕНТАРИЕВ И ОЦЕНОК =====

    # Комментарии к курсу
    # GET /api/courses/{course_id}/comments/
    # POST /api/courses/{course_id}/comments/
    path('<int:course_id>/comments/', CommentListView.as_view(), name='course-comments-list'),
    path('<int:course_id>/comments/create/', CommentCreateView.as_view(), name='course-comments-create'),

    # Комментарии к уроку
    # GET /api/lessons/{lesson_id}/comments/
    # POST /api/lessons/{lesson_id}/comments/
    path('lessons/<int:lesson_id>/comments/', CommentListView.as_view(), name='lesson-comments-list'),
    path('lessons/<int:lesson_id>/comments/create/', CommentCreateView.as_view(), name='lesson-comments-create'),

    # Управление комментариями
    # GET /api/comments/{id}/
    # PUT /api/comments/{id}/
    # DELETE /api/comments/{id}/
    path('comments/<uuid:comment_id>/', CommentDetailView.as_view(), name='comment-detail'),

    # Реакции на комментарии
    # POST /api/comments/{id}/like/
    # POST /api/comments/{id}/dislike/
    path('comments/<uuid:comment_id>/<str:action>/', NewCommentLikeView.as_view(), name='comment-reaction'),

    # Оценки курса (улучшенные)
    # GET /api/courses/{course_id}/ratings/
    # POST /api/courses/{course_id}/ratings/
    path('<int:course_id>/ratings/', CourseRatingListView.as_view(), name='course-ratings-list'),
    path('<int:course_id>/ratings/create/', CourseRatingCreateView.as_view(), name='course-ratings-create'),

    # Управление оценками
    # GET /api/ratings/{id}/
    # PUT /api/ratings/{id}/
    # DELETE /api/ratings/{id}/
    path('ratings/<uuid:rating_id>/', RatingDetailView.as_view(), name='rating-detail'),
]
