"""
Основной модуль views для приложения training.

Этот файл теперь служит только для импорта всех views из отдельных модулей.
Разделение на модули позволяет лучше организовать код и упростить поддержку.

Импортируемые модули:
    - course_views: Каталог курсов и покупка
    - user_course_views: Управление курсами пользователя
    - lesson_views: Просмотр уроков и прогресс
    - comment_views: Комментарии и рейтинги
    - course_builder_views: Конструктор курсов
"""

# Импорты из отдельных модулей
from .views.course_views import *
from .views.user_course_views import *
from .views.lesson_views import *
from .views.comment_views import *
from .views.course_builder_views import *