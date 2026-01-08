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

def create_custom_superuser():
    """Создание кастомного суперпользователя для админ-панели."""

    email = 'superadmin@example.com'
    password = 'super123'
    first_name = 'Super'
    last_name = 'Admin'

    # Проверяем, существует ли уже пользователь с таким email
    existing_user = User.objects.filter(email=email).first()
    if existing_user:
        if existing_user.is_superuser:
            print(f'✅ Суперпользователь уже существует: {email}')
            print(f'🔑 Пароль: {password} (если не менялся)')
            print(f'🌐 Админ-панель: http://localhost:8000/admin-panel/')
            return
        else:
            # Если пользователь существует но не суперпользователь, делаем его суперпользователем
            existing_user.is_superuser = True
            existing_user.is_staff = True
            existing_user.save()
            print(f'✅ Пользователь повышен до суперпользователя: {email}')
            print(f'🔑 Пароль: {password} (если не менялся)')
            print(f'🌐 Админ-панель: http://localhost:8000/admin-panel/')
            return

    # Создаем нового суперпользователя
    try:
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_activated=True  # Активируем аккаунт сразу
        )
        print(f'✅ Суперпользователь создан успешно!')
        print(f'📧 Email: {user.email}')
        print(f'🔑 Пароль: {password}')
        print(f'👤 Имя: {user.first_name} {user.last_name}')
        print(f'🌐 Админ-панель: http://localhost:8000/admin-panel/')
    except Exception as e:
        print(f'❌ Ошибка при создании суперпользователя: {e}')

if __name__ == '__main__':
    create_custom_superuser()
