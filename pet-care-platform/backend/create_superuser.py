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

def create_superuser():
    # Проверяем, есть ли уже суперпользователи
    superusers = User.objects.filter(is_superuser=True)
    if superusers.exists():
        print(f'Суперпользователь уже существует: {superusers.first().email}')
        return

    # Создаем суперпользователя
    try:
        user = User.objects.create_superuser(
            email='admin@petcare.local',
            password='admin123',
            first_name='Админ',
            last_name='Питомец+'
        )
        print(f'✅ Суперпользователь создан успешно!')
        print(f'📧 Email: {user.email}')
        print(f'🔑 Пароль: admin123')
        print(f'🌐 Админка: http://localhost:8000/admin/')
    except Exception as e:
        print(f'❌ Ошибка при создании суперпользователя: {e}')

if __name__ == '__main__':
    create_superuser()
