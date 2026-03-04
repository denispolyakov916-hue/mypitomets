from apps.training.models import UserCourse


def has_course_access(user, course):
    """
    Проверка доступа пользователя к контенту курса.

    Доступ имеют:
    - Администраторы (is_staff) — ко всем курсам
    - Авторы — к своим курсам
    - Пользователи с активной подпиской (UserCourse)
    """
    if user.is_staff or user.is_superuser:
        return True
    if course.author_id and course.author_id == user.id:
        return True
    return UserCourse.objects.filter(user=user, course=course).exists()
