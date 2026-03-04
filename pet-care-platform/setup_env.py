#!/usr/bin/env python
"""
Настройка переменных окружения и проверка подключения к базе данных
"""

import os
import sys
import django

# Устанавливаем переменные окружения напрямую
os.environ['DB_NAME'] = 'pitomets_db'
os.environ['DB_USER'] = 'pitomets'
os.environ['DB_PASSWORD'] = 'pitomets_password'
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '5432'
os.environ['DEBUG'] = 'True'
os.environ['SECRET_KEY'] = 'django-insecure-change-in-production-pet-care-platform-2024'
os.environ['ALLOWED_HOSTS'] = 'localhost,127.0.0.1,0.0.0.0'

# Настройка Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'pet-care-platform', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django.setup()

def test_database_connection():
    """Тестируем подключение к базе данных"""
    from django.db import connection

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        cursor.close()
        print("✅ Подключение к базе данных успешно!")
        return True
    except Exception as e:
        print(f"❌ Ошибка подключения к базе данных: {e}")
        return False

def create_database_manually():
    """Инструкции по ручному созданию базы данных"""
    print("\n📋 Инструкции по настройке базы данных:")
    print("\n1. Откройте командную строку PostgreSQL (psql) или pgAdmin")
    print("2. Выполните следующие команды:")
    print()
    print("   -- Создание пользователя")
    print("   CREATE USER pitomets WITH PASSWORD 'pitomets_password';")
    print()
    print("   -- Создание базы данных")
    print("   CREATE DATABASE pitomets_db OWNER pitomets;")
    print()
    print("   -- Выдача прав")
    print("   GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;")
    print()
    print("3. Или используйте эти команды в командной строке:")
    print("   psql -U postgres -c \"CREATE USER pitomets WITH PASSWORD 'pitomets_password';\"")
    print("   psql -U postgres -c \"CREATE DATABASE pitomets_db OWNER pitomets;\"")
    print("   psql -U postgres -c \"GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;\"")

def check_database_exists():
    """Проверяем, существует ли база данных"""
    import psycopg2

    try:
        # Пытаемся подключиться к pitomets_db
        conn = psycopg2.connect(
            dbname='pitomets_db',
            user='pitomets',
            password='pitomets_password',
            host='localhost',
            port='5432'
        )
        conn.close()
        print("✅ База данных pitomets_db существует и доступна!")
        return True
    except psycopg2.OperationalError as e:
        if 'does not exist' in str(e).lower():
            print("⚠️ База данных pitomets_db не существует")
            create_database_manually()
            return False
        elif 'authentication failed' in str(e).lower():
            print("⚠️ Ошибка аутентификации пользователя pitomets")
            create_database_manually()
            return False
        else:
            print(f"❌ Ошибка подключения: {e}")
            return False
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Проверка настройки базы данных...\n")

    # Проверяем существование базы данных
    db_exists = check_database_exists()

    if db_exists:
        # Тестируем подключение через Django
        test_database_connection()
        print("\n🎉 Настройка завершена! Теперь можно запускать Django сервер.")
    else:
        print("\n❌ Сначала настройте базу данных согласно инструкциям выше.")
