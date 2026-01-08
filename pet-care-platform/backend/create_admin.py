#!/usr/bin/env python
"""
Создание суперпользователя
"""

import os
import sys
import django

# Настройка Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Создание суперпользователя
try:
    if not User.objects.filter(email='admin@petcare.com').exists():
        user = User.objects.create_superuser(
            email='admin@petcare.com',
            password='578321'
        )
        user.first_name = 'Admin'
        user.last_name = 'User'
        user.is_staff = True
        user.is_superuser = True
        user.save()
        print("Суперпользователь создан!")
        print("Email: admin@petcare.com")
        print("Пароль: 578321")
    else:
        print("Суперпользователь уже существует")
except Exception as e:
    print(f"Ошибка создания суперпользователя: {e}")
    print("Попробую другой способ...")

    # Альтернативный способ
    try:
        user = User(
            email='admin@petcare.com',
            first_name='Admin',
            last_name='User',
            is_active=True,
            is_staff=True,
            is_superuser=True
        )
        user.set_password('578321')
        user.save()
        print("Суперпользователь создан альтернативным способом!")
    except Exception as e2:
        print(f"Ошибка и альтернативного способа: {e2}")
