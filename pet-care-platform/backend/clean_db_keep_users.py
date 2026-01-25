#!/usr/bin/env python
"""
Скрипт для очистки базы данных от всех данных пользователей,
но с сохранением указанных пользователей.
"""

import os
import sys
import django

# Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.db import connection
from apps.users.models import User

# Пользователи, которых нужно СОХРАНИТЬ
KEEP_USERS = [
    'oorapoo@mail.ru',
    'admin@pitomec.ru',
]

def clean_database():
    """Очистка базы данных с сохранением указанных пользователей."""
    print("=" * 60)
    print("   ОЧИСТКА БАЗЫ ДАННЫХ (с сохранением пользователей)")
    print("=" * 60)
    print()

    # Проверяем, существуют ли пользователи, которых нужно сохранить
    print("Проверка пользователей для сохранения...")
    existing_keep_users = []
    for email in KEEP_USERS:
        try:
            user = User.objects.get(email=email)
            existing_keep_users.append(user)
            print(f"  OK Найден: {email} (ID: {user.id})")
        except User.DoesNotExist:
            print(f"  -- Не найден: {email} (будет создан)")

    # Получаем ID пользователей для сохранения
    keep_user_ids = [str(u.id) for u in existing_keep_users]
    
    print()
    
    # Проверяем флаг --force
    if '--force' not in sys.argv:
        print("ВНИМАНИЕ: Будут удалены ВСЕ данные пользователей!")
        print(f"Сохраняются пользователи: {KEEP_USERS}")
        response = input("Введите 'YES' для подтверждения: ")
        if response != 'YES':
            print("Отменено.")
            return
    else:
        print("Режим --force: подтверждение не требуется")

    print("\nНачинаем очистку...")

    # ВСЕ таблицы для удаления (в порядке зависимостей - от дочерних к родительским)
    tables_to_clean = [
        # Лайки и комментарии
        'comment_likes',
        'comments',
        # Отзывы
        'reviews',
        # Аналитика (логи, сессии)
        'analytics_analyticslog',
        'analytics_logs',
        'analytics_chartsession',
        'analytics_chart_sessions',
        # Платежи и заказы
        'payments',
        'order_items',
        'returns',
        'reservations',
        'orders',
        # Корзина
        'cart_items',
        'carts',
        # Адреса
        'addresses',
        # Прогресс по курсам
        'user_lesson_progress',
        'user_course_progress',
        'user_courses',
        # Напоминания и календарь
        'reminders',
        'pets_eventreminder',
        'pets_calendarevent',
        'calendar_eventreminder',
        'calendar_calendarevent',
        # Питомцы
        'pets',
        # Права пользователей
        'users_user_permissions',
        'users_groups',
        # Токены
        'tokens',
        # Django admin log
        'django_admin_log',
    ]

    with connection.cursor() as cursor:
        for table in tables_to_clean:
            try:
                cursor.execute(f"DELETE FROM {table}")
                deleted = cursor.rowcount
                if deleted > 0:
                    print(f"  OK {table}: удалено {deleted}")
            except Exception as e:
                # Таблица не существует или ошибка - пропускаем
                pass

        # Удаляем пользователей, КРОМЕ указанных
        try:
            if keep_user_ids:
                placeholders = ', '.join([f"'{uid}'" for uid in keep_user_ids])
                cursor.execute(f"DELETE FROM users WHERE id NOT IN ({placeholders})")
            else:
                cursor.execute("DELETE FROM users")
            deleted_users = cursor.rowcount
            print(f"  OK users: удалено {deleted_users} (сохранено: {len(keep_user_ids)})")
        except Exception as e:
            print(f"  ERROR при удалении users: {e}")

    print("\n" + "=" * 60)
    print("ОЧИСТКА ЗАВЕРШЕНА!")
    print("=" * 60)

    # Показываем оставшихся пользователей
    print("\nОставшиеся пользователи:")
    for user in User.objects.all():
        staff_status = "[ADMIN]" if user.is_superuser else "[staff]" if user.is_staff else ""
        print(f"  - {user.email} {staff_status}")

    # Создаем недостающих пользователей
    print()
    for email in KEEP_USERS:
        if not User.objects.filter(email=email).exists():
            if email == 'admin@pitomec.ru':
                print(f"Создание admin пользователя: {email}")
                User.objects.create_superuser(
                    email=email,
                    password='Admin123!',
                    first_name='Admin',
                    is_activated=True
                )
                print(f"  OK Создан суперпользователь: {email}")
            elif email == 'oorapoo@mail.ru':
                print(f"Создание пользователя: {email}")
                User.objects.create_user(
                    email=email,
                    password='ZEd-9Kj-wFT-26k',
                    is_activated=True
                )
                print(f"  OK Создан пользователь: {email}")

    print("\n" + "=" * 60)
    print("ГОТОВО! База данных очищена.")
    print("Оставлены пользователи:")
    for user in User.objects.all():
        staff_status = "[ADMIN]" if user.is_superuser else "[staff]" if user.is_staff else ""
        activated = "активирован" if user.is_activated else "не активирован"
        print(f"  - {user.email} {staff_status} ({activated})")
    print("=" * 60)

if __name__ == '__main__':
    clean_database()
