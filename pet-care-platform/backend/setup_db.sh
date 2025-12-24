#!/bin/bash
# Скрипт для настройки базы данных PostgreSQL

echo "Настройка базы данных PostgreSQL для Питомец+"
echo ""

# Создание пользователя (если не существует)
echo "Создание пользователя pitomets..."
sudo -u postgres psql -c "DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pitomets') THEN
        CREATE USER pitomets WITH PASSWORD 'pitomets_password';
        RAISE NOTICE 'Пользователь pitomets создан';
    ELSE
        RAISE NOTICE 'Пользователь pitomets уже существует';
    END IF;
END
\$\$;"

# Изменение пароля пользователя (если существует)
echo "Установка пароля для пользователя pitomets..."
sudo -u postgres psql -c "ALTER USER pitomets WITH PASSWORD 'pitomets_password';"

# Создание базы данных
echo "Создание базы данных pitomets_db..."
sudo -u postgres psql -c "SELECT 'CREATE DATABASE pitomets_db OWNER pitomets'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pitomets_db')\gexec" || \
sudo -u postgres createdb -O pitomets pitomets_db 2>/dev/null || \
echo "База данных уже существует или произошла ошибка"

# Предоставление прав
echo "Предоставление прав..."
sudo -u postgres psql -d pitomets_db -c "GRANT ALL ON SCHEMA public TO pitomets;"

echo ""
echo "Готово! База данных настроена."
echo "Пользователь: pitomets"
echo "Пароль: pitomets_password"
echo "База данных: pitomets_db"




