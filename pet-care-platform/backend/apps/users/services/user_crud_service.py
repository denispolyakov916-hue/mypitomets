"""
CRUD сервис для работы с пользователями.

Использует BaseCRUDService для стандартизации операций с пользователями.
"""

import logging
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

from core.services import BaseCRUDService

User = get_user_model()
logger = logging.getLogger('apps.users')


class UserCRUDService(BaseCRUDService):
    """
    Сервис для CRUD операций с пользователями.

    Использует BaseCRUDService для стандартизации операций.
    """

    def __init__(self):
        super().__init__(User)

    def get_queryset(self, user=None):
        """Переопределение для фильтрации пользователей."""
        queryset = self.model.objects.all()

        # Для обычных пользователей показывать только себя
        if user and not user.is_staff:
            queryset = queryset.filter(id=user.id)

        return queryset

    def create_user(self, data, creator=None):
        """
        Создать пользователя с валидацией.

        @param data: Данные пользователя
        @param creator: Создатель (админ)
        @return: Созданный пользователь
        """
        # Проверка прав на создание пользователей
        if creator and not creator.is_staff:
            raise ValueError("Только администраторы могут создавать пользователей")

        # Валидация email
        email = data.get('email')
        if not email:
            raise ValueError("Email обязателен")

        if self.model.objects.filter(email=email).exists():
            raise ValueError("Пользователь с таким email уже существует")

        # Создание пользователя
        return self.create(data, creator)

    def update_user_profile(self, user_id, data, current_user):
        """
        Обновить профиль пользователя.

        @param user_id: ID пользователя
        @param data: Данные для обновления
        @param current_user: Текущий пользователь
        @return: Обновленный пользователь
        """
        # Проверка прав доступа
        if not current_user.is_staff and current_user.id != user_id:
            raise ValueError("Вы можете редактировать только свой профиль")

        return self.update(user_id, data, current_user)

    def deactivate_user(self, user_id, current_user):
        """
        Деактивировать пользователя.

        @param user_id: ID пользователя
        @param current_user: Текущий пользователь (админ)
        @return: Деактивированный пользователь
        """
        if not current_user.is_staff:
            raise ValueError("Только администраторы могут деактивировать пользователей")

        return self.update(user_id, {'is_active': False}, current_user)

    def get_user_stats(self, user=None):
        """
        Получить статистику пользователей.

        @param user: Пользователь (если указан, только его статистика)
        @return: Статистика
        """
        if user and not user.is_staff:
            # Статистика для обычного пользователя
            return {
                'pets_count': user.pets.count(),
                'orders_count': user.orders.count(),
                'courses_count': user.user_courses.count(),
                'reviews_count': user.reviews.count(),
            }
        else:
            # Общая статистика для админов
            return {
                'total_users': self.model.objects.count(),
                'active_users': self.model.objects.filter(is_active=True).count(),
                'staff_users': self.model.objects.filter(is_staff=True).count(),
                'recent_users': self.model.objects.filter(
                    date_joined__gte=timezone.now() - timedelta(days=30)
                ).count(),
            }
