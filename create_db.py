#!/usr/bin/env python
"""
Скрипт для создания базы данных и пользователя PostgreSQL
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def create_database():
    try:
        # Подключаемся к системной базе данных postgres
        conn = psycopg2.connect(
            dbname='postgres',
            user='postgres',  # Используем стандартного пользователя postgres
            password='',  # Пустой пароль для локального PostgreSQL
            host='localhost',
            port='5432'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Создаем пользователя, если не существует
        try:
            cursor.execute("CREATE USER pitomets WITH PASSWORD 'pitomets_password';")
            print("✅ Пользователь pitomets создан")
        except psycopg2.errors.DuplicateObject:
            print("⚠️ Пользователь pitomets уже существует")

        # Создаем базу данных, если не существует
        try:
            cursor.execute("CREATE DATABASE pitomets_db OWNER pitomets;")
            print("✅ База данных pitomets_db создана")
        except psycopg2.errors.DuplicateDatabase:
            print("⚠️ База данных pitomets_db уже существует")

        # Даем права пользователю на базу данных
        cursor.execute("GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;")
        print("✅ Права на базу данных выданы пользователю pitomets")

        cursor.close()
        conn.close()

        print("🎉 Настройка базы данных завершена успешно!")

    except Exception as e:
        print(f"❌ Ошибка при настройке базы данных: {e}")
        print("\nВозможные решения:")
        print("1. Убедитесь, что PostgreSQL запущен")
        print("2. Проверьте права доступа (возможно нужен пароль для пользователя postgres)")
        print("3. Попробуйте создать базу данных вручную:")
        print("   psql -U postgres -c \"CREATE USER pitomets WITH PASSWORD 'pitomets_password';\"")
        print("   psql -U postgres -c \"CREATE DATABASE pitomets_db OWNER pitomets;\"")

if __name__ == "__main__":
    create_database()
