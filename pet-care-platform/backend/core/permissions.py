"""
Базовые permissions для исключения дублирования.

Предоставляет готовые классы permissions для типичных сценариев:
- IsOwner: Проверка владения объектом
- IsOwnerOrReadOnly: Владелец может изменять, остальные только читать
- IsStaffOrReadOnly: Staff может изменять, остальные только читать
"""

from rest_framework import permissions
from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Permission для проверки владения объектом.

    Объект должен иметь поле 'owner' с ссылкой на User.
    """

    def has_object_permission(self, request, view, obj):
        # Проверяем, что объект имеет поле owner
        if not hasattr(obj, 'owner'):
            return False

        # Владелец может делать всё
        return obj.owner == request.user


class IsOwnerOrReadOnly(BasePermission):
    """
    Permission: владелец может изменять, остальные только читать.

    Объект должен иметь поле 'owner' с ссылкой на User.
    """

    def has_object_permission(self, request, view, obj):
        # SAFE методы (GET, HEAD, OPTIONS) разрешены всем
        if request.method in permissions.SAFE_METHODS:
            return True

        # Для изменяющих методов - только владелец
        if not hasattr(obj, 'owner'):
            return False

        return obj.owner == request.user


class IsStaffOrReadOnly(BasePermission):
    """
    Permission: staff может изменять, остальные только читать.
    """

    def has_permission(self, request, view):
        # SAFE методы разрешены всем
        if request.method in permissions.SAFE_METHODS:
            return True

        # Изменяющие методы - только staff
        return request.user and request.user.is_staff

    def has_object_permission(self, request, view, obj):
        # SAFE методы разрешены всем
        if request.method in permissions.SAFE_METHODS:
            return True

        # Изменяющие методы - только staff
        return request.user and request.user.is_staff


class IsAuthenticatedOrReadOnly(BasePermission):
    """
    Permission: аутентифицированные пользователи могут изменять, остальные только читать.
    """

    def has_permission(self, request, view):
        # SAFE методы разрешены всем
        if request.method in permissions.SAFE_METHODS:
            return True

        # Изменяющие методы - только аутентифицированные
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # SAFE методы разрешены всем
        if request.method in permissions.SAFE_METHODS:
            return True

        # Изменяющие методы - только аутентифицированные
        return request.user and request.user.is_authenticated


class IsAdminOrReadOnly(BasePermission):
    """
    Permission: администраторы могут изменять, остальные только читать.
    """

    def has_permission(self, request, view):
        # SAFE методы разрешены всем
        if request.method in permissions.SAFE_METHODS:
            return True

        # Изменяющие методы - только администраторы
        return request.user and request.user.is_superuser

    def has_object_permission(self, request, view, obj):
        # SAFE методы разрешены всем
        if request.method in permissions.SAFE_METHODS:
            return True

        # Изменяющие методы - только администраторы
        return request.user and request.user.is_superuser
