#!/usr/bin/env python
"""
Простая настройка для быстрого запуска
"""

import os
import sys
import subprocess

# Устанавливаем переменные окружения
os.environ['DB_NAME'] = 'pitomets_db'
os.environ['DB_USER'] = 'pitomets'
os.environ['DB_PASSWORD'] = '578321'
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '5432'
os.environ['DEBUG'] = 'True'
os.environ['SECRET_KEY'] = 'django-insecure-pet-care-platform-2024'
os.environ['ALLOWED_HOSTS'] = 'localhost,127.0.0.1,0.0.0.0'

print("Переменные окружения установлены:")
print(f"DB_PASSWORD: {os.environ.get('DB_PASSWORD')}")
print()

# Создаем базу данных через psql если возможно
try:
    print("Пытаемся создать базу данных...")
    result = subprocess.run([
        'psql', '-U', 'postgres', '-h', 'localhost', '-c',
        "DROP USER IF EXISTS pitomets; CREATE USER pitomets WITH PASSWORD '578321'; DROP DATABASE IF EXISTS pitomets_db; CREATE DATABASE pitomets_db OWNER pitomets; GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;"
    ], capture_output=True, text=True, timeout=10)

    if result.returncode == 0:
        print("База данных создана успешно!")
    else:
        print(f"Ошибка создания базы данных: {result.stderr}")
        print("Используем SQLite для тестирования...")

        # Переключаемся на SQLite
        os.environ['DB_ENGINE'] = 'django.db.backends.sqlite3'
        os.environ['DB_NAME'] = 'db.sqlite3'

except Exception as e:
    print(f"Ошибка: {e}")
    print("Используем SQLite для тестирования...")

    # Переключаемся на SQLite
    os.environ['DB_ENGINE'] = 'django.db.backends.sqlite3'
    os.environ['DB_NAME'] = 'db.sqlite3'

print("\nНастройки:")
print(f"База данных: {os.environ.get('DB_NAME')}")
print(f"Пользователь: {os.environ.get('DB_USER')}")
print(f"Пароль: {os.environ.get('DB_PASSWORD')}")

print("\nТеперь можно запускать Django команды!")
