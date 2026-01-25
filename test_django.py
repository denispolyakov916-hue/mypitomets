#!/usr/bin/env python
"""
Тестирование Django с SQLite
"""

import os
import sys
import django

# Устанавливаем переменные окружения для PostgreSQL (для будущего)
os.environ['DB_NAME'] = 'pitomets_db'
os.environ['DB_USER'] = 'pitomets'
os.environ['DB_PASSWORD'] = 'pitomets_password'
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '5432'

# Настройка Django с временными настройками
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'pet-care-platform', 'backend'))

# Сначала попробуем с временными настройками (SQLite)
try:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings_temp')
    django.setup()

    print("Django настроен успешно с SQLite!")

    # Проверяем подключение к базе данных
    from django.db import connection
    cursor = connection.cursor()
    cursor.execute("SELECT 1")
    result = cursor.fetchone()
    cursor.close()
    print("База данных SQLite работает!")

    print("\nДля работы с PostgreSQL:")
    print("1. Создайте базу данных PostgreSQL:")
    print("   psql -U postgres -c \"CREATE USER pitomets WITH PASSWORD 'pitomets_password';\"")
    print("   psql -U postgres -c \"CREATE DATABASE pitomets_db OWNER pitomets;\"")
    print("2. Запустите миграции:")
    print("   python manage.py migrate")
    print("3. Создайте суперпользователя:")
    print("   python manage.py createsuperuser")

except Exception as e:
    print(f"Ошибка настройки Django: {e}")
    print("\nПопробуем с обычными настройками...")

    # Попробуем с обычными настройками
    try:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        django.setup()
        print("Django настроен с обычными настройками!")
    except Exception as e2:
        print(f"Ошибка и с обычными настройками: {e2}")
        print("\nПроверьте установку PostgreSQL и создайте базу данных вручную.")
