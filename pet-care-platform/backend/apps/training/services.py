"""
Сервисы для работы с курсами обучения и прогрессом пользователей.

Этот модуль предоставляет сервисы для управления образовательным контентом:
- CourseService: CRUD операции с курсами через BaseCRUDService
- UserCourseService: Управление записями пользователей на курсы
- LessonService: Операции с уроками и их прогрессом

Основные функции:
    - Управление каталогом курсов с фильтрацией и поиском
    - Запись пользователей на курсы с валидацией прав
    - Отслеживание прогресса обучения по урокам
    - Управление персонализированными курсами для питомцев
    - Конструктор курсов с блоками контента

Используется в:
    - Каталоге курсов для фильтрации и персонализации
    - Системе обучения для отслеживания прогресса
    - Конструкторе курсов для создания контента
    - Админ-панели для управления образовательными материалами
"""

import logging
from django.utils import timezone

from core.services import BaseCRUDService

logger = logging.getLogger('apps.training')


class CourseService(BaseCRUDService):
    """
    Сервис для CRUD операций с курсами.

    Использует BaseCRUDService для стандартизации операций.
    """

    def __init__(self):
        from .models import Course
        super().__init__(Course)

    def get_queryset(self, user=None):
        """Переопределение для активных курсов."""
        return self.model.objects.filter(is_active=True)

    def create_course(self, data, user):
        """
        Создать курс с валидацией прав.

        @param data: Данные курса
        @param user: Создатель (админ)
        @return: Созданный курс
        """
        # Проверка прав администратора
        if not user.is_staff:
            raise ValueError("Только администраторы могут создавать курсы")

        return self.create(data, user)

    def publish_course(self, course_id, user):
        """
        Опубликовать курс.

        @param course_id: ID курса
        @param user: Пользователь
        @return: Опубликованный курс
        """
        if not user.is_staff:
            raise ValueError("Только администраторы могут публиковать курсы")

        return self.update(course_id, {'is_published': True}, user)

    def get_catalog_courses(self, filters=None, user=None):
        """
        Получить курсы для каталога с оптимизациями.

        @param filters: Фильтры
        @param user: Пользователь для персонализации
        @return: QuerySet курсов
        """
        queryset = self.model.objects.catalog()

        if filters:
            queryset = self.apply_filters(queryset, filters)

        return queryset

    def apply_filters(self, queryset, filters):
        """
        Применить фильтры к queryset курсов.

        @param queryset: Базовый queryset
        @param filters: Словарь фильтров
        @return: Отфильтрованный queryset
        """
        if 'category' in filters:
            queryset = queryset.in_category(filters['category'])

        if 'level' in filters:
            queryset = queryset.by_level(filters['level'])

        if 'pet_type' in filters and filters['pet_type'] != 'all':
            queryset = queryset.for_pet_type(filters['pet_type'])

        if 'search' in filters:
            queryset = queryset.search(filters['search'])

        return queryset


class UserCourseService(BaseCRUDService):
    """
    Сервис для CRUD операций с курсами пользователей.

    Использует BaseCRUDService для стандартизации операций.
    """

    def __init__(self):
        from .models import UserCourse
        super().__init__(UserCourse)

    def get_queryset(self, user=None):
        """Переопределение для курсов пользователя."""
        if user:
            return self.model.objects.filter(user=user)
        return super().get_queryset(user)

    def enroll_in_course(self, data, user):
        """
        Записать пользователя на курс.

        @param data: Данные записи (course_id, pet_id)
        @param user: Пользователь
        @return: Запись на курс
        """
        from .models import Course

        course_id = data.get('course_id')
        pet_id = data.get('pet_id')

        # Проверки
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            raise ValueError("Курс не найден")

        if course.price > 0:
            raise ValueError("Для платных курсов используйте оформление заказа")

        # Проверка существующей записи
        existing = self.model.objects.filter(
            user=user,
            course=course,
            pet_id=pet_id
        ).exists()

        if existing:
            raise ValueError("Вы уже записаны на этот курс")

        # Создание записи
        enrollment_data = {
            'user': user,
            'course': course,
            'pet_id': pet_id,
        }

        return self.create(enrollment_data, user)

    def get_user_progress(self, user, course_id=None):
        """
        Получить прогресс пользователя по курсам.

        @param user: Пользователь
        @param course_id: ID конкретного курса (опционально)
        @return: Прогресс по курсам
        """
        from .models import UserCourseProgress

        queryset = UserCourseProgress.objects.filter(user=user)
        if course_id:
            queryset = queryset.filter(course_id=course_id)

        return queryset.select_related('course', 'pet')


class LessonService(BaseCRUDService):
    """
    Сервис для CRUD операций с уроками.

    Использует BaseCRUDService для стандартизации операций.
    """

    def __init__(self):
        from .models import Lesson
        super().__init__(Lesson)

    def get_queryset(self, user=None):
        """Переопределение для активных уроков."""
        return self.model.objects.filter(is_active=True)

    def get_course_lessons(self, course_id, user=None):
        """
        Получить уроки курса в правильном порядке.

        @param course_id: ID курса
        @param user: Пользователь (для прогресса)
        @return: Уроки с прогрессом
        """
        from .models import Course
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            raise ValueError("Курс не найден")

        return course.get_lessons_ordered()


# =============================================================================
# ГЛОБАЛЬНЫЕ ЭКЗЕМПЛЯРЫ СЕРВИСОВ
# =============================================================================

# CRUD сервисы
course_service = CourseService()
user_course_service = UserCourseService()
lesson_service = LessonService()
