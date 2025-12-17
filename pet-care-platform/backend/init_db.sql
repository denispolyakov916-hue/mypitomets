-- Скрипт инициализации базы данных для Питомец+
-- Выполните в pgAdmin или psql от имени postgres

-- Создание пользователя (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pitomets') THEN
        CREATE USER pitomets WITH PASSWORD 'pitomets_password';
    END IF;
END
$$;

-- Создание базы данных (если не существует)
SELECT 'CREATE DATABASE pitomets_db OWNER pitomets'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pitomets_db')\gexec

-- Предоставление прав
GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;

-- Подключитесь к pitomets_db и выполните:
-- GRANT ALL ON SCHEMA public TO pitomets;

