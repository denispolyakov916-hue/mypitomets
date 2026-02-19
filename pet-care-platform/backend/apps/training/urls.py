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

Новые эндпоинты конструктора курсов:
    GET  /api/courses/{id}/builder/      - Структура курса для конструктора
    CRUD /api/courses/{id}/pages/        - Управление страницами курса
    CRUD /api/pages/{id}/blocks/         - Управление блоками страницы
    POST /api/blocks/{id}/duplicate/     - Дублирование блока
    CRUD /api/block-templates/           - Управление шаблонами блоков
    POST /api/block-templates/{id}/use/  - Использование шаблона

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
    CommentReactionView,
    # Новые вьюсы для комментариев и оценок
    CommentListView,
    CommentCreateView,
    CommentDetailView,
    PageCommentsView,
    # Новые вьюсы для конструктора курсов
    CourseBuilderView,
    CoursePublishView,
    BlockReorderView,
    PagesReorderView,
    ModulesReorderView,
    CoursePageViewSet,
    ContentBlockViewSet,
    BlockTemplateViewSet,
)
from .views.lesson_views import (
    CoursePageLearningView,
    CoursePageListLearningView,
    CoursePageCompleteView,
)
from .views.module_views import CourseModuleViewSet, CourseStructureView


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
    # Отзывы курсов теперь обрабатываются в reviews app (/api/reviews/courses/...)

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
    path('comments/<uuid:comment_id>/<str:action>/', CommentReactionView.as_view(), name='comment-reaction'),

    # Отзывы курсов теперь обрабатываются в reviews app (/api/reviews/courses/...)

    # ===== МАРШРУТЫ МОДУЛЕЙ И СТРУКТУРЫ КУРСА =====

    # Структура курса для обучения (с прогрессом)
    # GET /api/courses/{course_id}/structure/
    path('<int:course_id>/structure/', CourseStructureView.as_view(), name='course-structure'),

    # Управление модулями курса
    # GET /api/courses/{course_id}/modules/
    # POST /api/courses/{course_id}/modules/
    path('<int:course_id>/modules/', CourseModuleViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }), name='course-modules'),

    # Управление конкретным модулем
    # GET /api/modules/{module_id}/
    # PUT /api/modules/{module_id}/
    # DELETE /api/modules/{module_id}/
    path('modules/<int:pk>/', CourseModuleViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='course-module-detail'),

    # ===== МАРШРУТЫ ОБУЧЕНИЯ: СТРАНИЦЫ КУРСА =====

    # Список страниц курса для обучения (авторизованный пользователь)
    # GET /api/courses/{course_id}/pages/
    path('<int:course_id>/pages/', CoursePageListLearningView.as_view(), name='course-pages-learning'),

    # Получение страницы курса для обучения (авторизованный пользователь)
    # GET /api/courses/{course_id}/pages/{page_id}/
    path('<int:course_id>/pages/<int:page_id>/', CoursePageLearningView.as_view(), name='course-page-learning'),

    # Комментарии к странице курса
    # GET  /api/courses/{course_id}/pages/{page_id}/comments/
    # POST /api/courses/{course_id}/pages/{page_id}/comments/
    path('<int:course_id>/pages/<int:page_id>/comments/', PageCommentsView.as_view(), name='page-comments'),

    # Завершение страницы курса
    # POST /api/courses/pages/{page_id}/complete/
    path('pages/<int:page_id>/complete/', CoursePageCompleteView.as_view(), name='course-page-complete'),

    # ===== МАРШРУТЫ КОНСТРУКТОРА КУРСОВ =====

    # Структура курса для конструктора
    # GET/PUT /api/courses/{course_id}/builder/
    path('<int:course_id>/builder/', CourseBuilderView.as_view(), name='course-builder'),

    # Публикация курса
    # POST /api/courses/{course_id}/publish/
    path('<int:course_id>/publish/', CoursePublishView.as_view(), name='course-publish'),

    # Перестановка блоков на странице
    # PATCH /api/courses/pages/{page_id}/blocks/reorder/
    path('pages/<int:page_id>/blocks/reorder/', BlockReorderView.as_view(), name='block-reorder'),

    # Перестановка страниц курса
    # PATCH /api/courses/{course_id}/builder/pages/reorder/
    path('<int:course_id>/builder/pages/reorder/', PagesReorderView.as_view(), name='pages-reorder'),
    # Перестановка модулей курса
    # PATCH /api/courses/{course_id}/builder/modules/reorder/
    path('<int:course_id>/builder/modules/reorder/', ModulesReorderView.as_view(), name='modules-reorder'),
    # Управление страницами курса (ADMIN: создание)
    # POST /api/courses/{course_id}/builder/pages/
    path('<int:course_id>/builder/pages/', CoursePageViewSet.as_view({
        'post': 'create'
    }), name='course-pages-builder'),

    # Управление конкретной страницей (ADMIN)
    # PUT /api/courses/pages/{page_id}/
    # DELETE /api/courses/pages/{page_id}/
    path('pages/<int:pk>/', CoursePageViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'delete': 'destroy'
    }), name='course-page-detail-short'),

    # Управление блоками страницы
    # GET /api/pages/{page_id}/blocks/
    # POST /api/pages/{page_id}/blocks/
    path('pages/<int:page_id>/blocks/', ContentBlockViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='page-blocks'),

    # Управление конкретным блоком
    # GET /api/blocks/{block_id}/
    # PUT /api/blocks/{block_id}/
    # DELETE /api/blocks/{block_id}/
    path('blocks/<int:pk>/', ContentBlockViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'delete': 'destroy'
    }), name='content-block-detail'),

    # Дублирование блока
    # POST /api/blocks/{block_id}/duplicate/
    path('blocks/<int:pk>/duplicate/', ContentBlockViewSet.as_view({
        'post': 'duplicate'
    }), name='content-block-duplicate'),

    # Шаблоны блоков
    # GET /api/block-templates/
    # POST /api/block-templates/
    path('block-templates/', BlockTemplateViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='block-templates'),

    # Управление шаблоном блока
    # GET /api/block-templates/{id}/
    # PUT /api/block-templates/{id}/
    # DELETE /api/block-templates/{id}/
    path('block-templates/<int:pk>/', BlockTemplateViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'delete': 'destroy'
    }), name='block-template-detail'),

    # Использование шаблона
    # POST /api/block-templates/{id}/use/
    path('block-templates/<int:pk>/use/', BlockTemplateViewSet.as_view({
        'post': 'use_template'
    }), name='block-template-use'),
]
