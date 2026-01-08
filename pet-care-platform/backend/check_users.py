#!/usr/bin/env python
import os
import sys
import django

# Добавляем путь к проекту
sys.path.append('.')

# Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

def check_users():
    print("Проверка пользователей в базе данных:")
    print("=" * 50)

    # Все пользователи
    all_users = User.objects.all()
    print(f"Всего пользователей: {all_users.count()}")

    # Staff пользователи
    staff_users = User.objects.filter(is_staff=True)
    print(f"Staff пользователей: {staff_users.count()}")

    # Superuser пользователи
    super_users = User.objects.filter(is_superuser=True)
    print(f"Superuser пользователей: {super_users.count()}")

    print("\nStaff пользователи:")
    for user in staff_users:
        print(f"  - {user.email} (staff: {user.is_staff}, superuser: {user.is_superuser})")

    print("\nSuperuser пользователи:")
    for user in super_users:
        print(f"  - {user.email} (staff: {user.is_staff}, superuser: {user.is_superuser})")

if __name__ == '__main__':
    check_users()

