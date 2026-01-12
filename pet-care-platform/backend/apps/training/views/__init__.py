"""
Пакет views для приложения training.

Содержит разделенные по функционалу модули views:
    - course_views: Каталог курсов и покупка
    - user_course_views: Управление курсами пользователя
    - lesson_views: Просмотр уроков и прогресс
    - comment_views: Комментарии и рейтинги
    - course_builder_views: Конструктор курсов
"""

# Импорты всех views для обратной совместимости
from .course_views import *
from .user_course_views import *
from .lesson_views import *
from .comment_views import *
from .course_builder_views import *
