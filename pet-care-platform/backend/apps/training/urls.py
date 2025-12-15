"""
URL маршруты для эндпоинтов обучения (Курсы).

Эндпоинты:
    GET  /api/courses/               - Каталог курсов
    GET  /api/courses/{id}/          - Детали курса
    POST /api/courses/{id}/purchase/ - Покупка/запись на курс
    GET  /api/courses/my/            - Курсы пользователя

Все пути имеют префикс /api/courses/ в главном urls.py
"""

from django.urls import path
from .views import (
    CourseListView,
    CourseDetailView,
    CoursePurchaseView,
    UserCoursesView
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
    
    # Покупка/запись на курс
    # POST /api/courses/{id}/purchase/
    path('<int:course_id>/purchase/', CoursePurchaseView.as_view(), name='course-purchase'),
]
