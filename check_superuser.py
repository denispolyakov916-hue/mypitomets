#!/usr/bin/env python
import os
import sys
import django

# Добавляем путь к проекту
sys.path.append('pet-care-platform/backend')

# Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

# Проверяем суперпользователей
superusers = User.objects.filter(is_superuser=True)
print(f'Superusers found: {superusers.count()}')
for user in superusers:
    print(f'  - {user.email} ({user.first_name} {user.last_name})')

# Если нет суперпользователей, создаем одного
if superusers.count() == 0:
    print('\nCreating superuser...')
    try:
        user = User.objects.create_superuser(
            email='admin@petcare.local',
            password='admin123',
            first_name='Админ',
            last_name='Питомец+'
        )
        print(f'Superuser created: {user.email}')
    except Exception as e:
        print(f'Error creating superuser: {e}')
else:
    print('\nSuperuser already exists.')
