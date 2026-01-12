-- SQL скрипт для настройки базы данных PostgreSQL
-- Выполните этот скрипт в psql или pgAdmin как пользователь postgres

-- Создание пользователя pitomets с паролем pitomets_password
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pitomets') THEN
      CREATE USER pitomets WITH PASSWORD 'pitomets_password';
      RAISE NOTICE 'Пользователь pitomets создан';
   ELSE
      ALTER USER pitomets PASSWORD 'pitomets_password';
      RAISE NOTICE 'Пароль пользователя pitomets обновлен';
   END IF;
END
$$;

-- Создание базы данных pitomets_db
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pitomets_db') THEN
      CREATE DATABASE pitomets_db OWNER pitomets;
      RAISE NOTICE 'База данных pitomets_db создана';
   ELSE
      RAISE NOTICE 'База данных pitomets_db уже существует';
   END IF;
END
$$;

-- Выдача прав пользователю pitomets на базу данных
GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;

-- Проверка создания
SELECT 'Пользователь pitomets:' as info, rolname, rolcanlogin 
FROM pg_roles 
WHERE rolname = 'pitomets';

SELECT 'База данных pitomets_db:' as info, datname, rolname as owner
FROM pg_database d
JOIN pg_roles r ON d.datdba = r.oid
WHERE datname = 'pitomets_db';
