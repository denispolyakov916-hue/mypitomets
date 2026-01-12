#!/usr/bin/env python
"""
Создание базы данных PostgreSQL с паролем 578321
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def setup_database():
    print("Начинаем настройку базы данных PostgreSQL...")

    # Параметры для подключения к системной базе
    # Сначала попробуем с текущим пользователем
    import getpass
    current_user = getpass.getuser()

    db_config = {
        'host': 'localhost',
        'port': '5432',
        'user': current_user,
        'password': '',  # Для trust аутентификации
    }

    try:
        print("Подключаемся к PostgreSQL...")
        conn = psycopg2.connect(**db_config)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        print("Подключение успешно!")

        # Создаем пользователя с паролем 578321
        try:
            print("Создаем пользователя pitomets...")
            cursor.execute("DROP USER IF EXISTS pitomets;")
            cursor.execute("CREATE USER pitomets WITH PASSWORD '578321';")
            print("Пользователь pitomets создан с паролем 578321!")
        except Exception as e:
            print(f"Ошибка создания пользователя: {e}")
            cursor.execute("ALTER USER pitomets PASSWORD '578321';")
            print("Пароль обновлен!")

        # Создаем базу данных
        try:
            print("Создаем базу данных pitomets_db...")
            cursor.execute("DROP DATABASE IF EXISTS pitomets_db;")
            cursor.execute("CREATE DATABASE pitomets_db OWNER pitomets;")
            print("База данных pitomets_db создана!")
        except Exception as e:
            print(f"Ошибка создания базы: {e}")

        # Даем права
        cursor.execute("GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;")
        print("Права выданы!")

        cursor.close()
        conn.close()

        # Проверяем подключение к новой базе данных
        print("Проверяем подключение к pitomets_db...")
        test_conn = psycopg2.connect(
            dbname='pitomets_db',
            user='pitomets',
            password='578321',
            host='localhost',
            port='5432'
        )
        test_conn.close()
        print("Подключение к pitomets_db успешно!")

        print("\nНастройка базы данных завершена!")
        return True

    except psycopg2.OperationalError as e:
        print(f"Ошибка подключения: {e}")
        print("\nВозможные решения:")
        print("1. Убедитесь, что PostgreSQL запущен")
        print("2. Возможно, нужен пароль для пользователя postgres")
        print("3. Попробуйте подключиться через pgAdmin")
        return False

    except Exception as e:
        print(f"Ошибка: {e}")
        return False

if __name__ == "__main__":
    success = setup_database()
    if success:
        print("\nТеперь можно применять миграции Django!")
    else:
        print("\nНастройте базу данных вручную через pgAdmin или psql")
