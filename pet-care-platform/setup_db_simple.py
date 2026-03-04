#!/usr/bin/env python
"""
Простая настройка базы данных PostgreSQL
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def setup_database():
    print("Начинаем настройку базы данных PostgreSQL...\n")

    # Параметры подключения
    db_config = {
        'host': 'localhost',
        'port': '5432',
        'user': 'postgres',  # Системный пользователь PostgreSQL
        'password': '',  # Обычно пустой для локальной установки
    }

    try:
        # Подключаемся к системной базе данных
        print("Подключаемся к PostgreSQL...")
        conn = psycopg2.connect(**db_config)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        print("Подключение к PostgreSQL успешно!")

        # Создаем пользователя
        try:
            print("Создаем пользователя pitomets...")
            cursor.execute("CREATE USER pitomets WITH PASSWORD 'pitomets_password';")
            print("Пользователь pitomets создан!")
        except psycopg2.errors.DuplicateObject:
            print("Пользователь pitomets уже существует")

        # Создаем базу данных
        try:
            print("Создаем базу данных pitomets_db...")
            cursor.execute("CREATE DATABASE pitomets_db OWNER pitomets;")
            print("База данных pitomets_db создана!")
        except psycopg2.errors.DuplicateDatabase:
            print("База данных pitomets_db уже существует")

        # Даем права
        print("Выдаем права пользователю...")
        cursor.execute("GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;")
        print("Права выданы!")

        cursor.close()
        conn.close()

        # Проверяем подключение к новой базе данных
        print("\nПроверяем подключение к pitomets_db...")
        test_conn = psycopg2.connect(
            dbname='pitomets_db',
            user='pitomets',
            password='pitomets_password',
            host='localhost',
            port='5432'
        )
        test_conn.close()
        print("Подключение к pitomets_db успешно!")

        print("\nНастройка базы данных завершена!")
        print("\nТеперь можно запускать Django:")
        print("   cd pet-care-platform/backend")
        print("   python manage.py migrate")
        print("   python manage.py createsuperuser")
        print("   python manage.py runserver")

        return True

    except psycopg2.OperationalError as e:
        print(f"Ошибка подключения к PostgreSQL: {e}")
        print("\nВозможные решения:")
        print("1. Убедитесь, что PostgreSQL установлен и запущен")
        print("2. Проверьте настройки подключения")
        print("3. Возможно, нужно указать пароль для пользователя postgres")
        print("\nПопробуйте запустить PostgreSQL через pgAdmin или командную строку")

    except Exception as e:
        print(f"Неожиданная ошибка: {e}")

    return False

if __name__ == "__main__":
    success = setup_database()
    if not success:
        print("\nАльтернативный способ настройки:")
        print("1. Откройте pgAdmin или командную строку PostgreSQL")
        print("2. Выполните команды:")
        print("   CREATE USER pitomets WITH PASSWORD 'pitomets_password';")
        print("   CREATE DATABASE pitomets_db OWNER pitomets;")
        print("   GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;")
        print("\nИли установите переменные окружения:")
        print("   set DB_NAME=pitomets_db")
        print("   set DB_USER=pitomets")
        print("   set DB_PASSWORD=pitomets_password")
        print("   set DB_HOST=localhost")
        print("   set DB_PORT=5432")
