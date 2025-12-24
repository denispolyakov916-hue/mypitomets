-- SQL скрипт для создания базы данных PostgreSQL
-- Выполните этот скрипт в pgAdmin или через psql

-- Создание пользователя
DROP USER IF EXISTS pitomets;
CREATE USER pitomets WITH PASSWORD '578321';

-- Создание базы данных
DROP DATABASE IF EXISTS pitomets_db;
CREATE DATABASE pitomets_db OWNER pitomets;

-- Выдача прав
GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;

-- Проверка
\connect pitomets_db;
SELECT version();
