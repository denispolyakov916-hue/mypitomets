# Настройка базы данных PostgreSQL

## ⚠️ ВАЖНО: Исправлены учетные данные БД

В ветке `refact` используется пароль `pitomets_password` (а не `578321`).

## 🚀 Быстрая настройка (рекомендуется)

```bash
cd pet-care-platform/backend
./setup_database.sh
```

## 📋 Ручная настройка

### Вариант 1: Через bash скрипт
```bash
cd pet-care-platform/backend
sudo -u postgres psql -f setup_database.sql
```

### Вариант 2: Через psql
```bash
# Подключаемся к PostgreSQL как postgres
sudo -u postgres psql

# Выполняем команды:
CREATE USER pitomets WITH PASSWORD 'pitomets_password';
CREATE DATABASE pitomets_db OWNER pitomets;
GRANT ALL PRIVILEGES ON DATABASE pitomets_db TO pitomets;
\q
```

### Вариант 3: Через pgAdmin
1. Откройте pgAdmin
2. Создайте пользователя `pitomets` с паролем `pitomets_password`
3. Создайте базу данных `pitomets_db` с владельцем `pitomets`

## ✅ Проверка настройки

После настройки запустите Django:

```bash
cd pet-care-platform/backend
source .venv/bin/activate
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## 🔧 Учетные данные базы данных

```
DB_NAME=pitomets_db
DB_USER=pitomets
DB_PASSWORD=pitomets_password
DB_HOST=localhost
DB_PORT=5432
```

## 🐛 Проблемы и решения

### Ошибка "fe_sendauth: no password supplied"
```bash
# Настройте trust аутентификацию
sudo nano /etc/postgresql/16/main/pg_hba.conf
# Измените: local all postgres peer
# На: local all postgres trust
sudo systemctl restart postgresql
```

### Ошибка "authentication failed"
```bash
# Установите пароль для postgres
sudo -u postgres psql
\password postgres
# Введите пароль (например: postgres)
\q
```
