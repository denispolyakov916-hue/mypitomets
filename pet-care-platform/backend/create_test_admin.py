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

def create_test_admin():
    # Удаляем существующего тестового админа если есть
    User.objects.filter(email='testadmin@test.com').delete()

    # Создаем нового тестового админа
    try:
        user = User.objects.create_user(
            email='testadmin@test.com',
            password='admin123',
            first_name='Test',
            last_name='Admin',
            is_staff=True,
            is_superuser=True,
            is_active=True
        )
        print('Тестовый админ создан успешно!')
        print('Email: testadmin@test.com')
        print('Пароль: admin123')
        print('Админ-панель: /admin-panel')
        return user
    except Exception as e:
        print(f'Ошибка при создании админа: {e}')
        return None

if __name__ == '__main__':
    create_test_admin()
