#!/bin/bash

echo "🚀 Начинаем настройку базы данных PostgreSQL..."
echo

# Проверяем, запущен ли PostgreSQL
if ! systemctl is-active --quiet postgresql; then
    echo "⚠️ PostgreSQL не запущен. Запускаем..."
    sudo systemctl start postgresql
    sleep 2
fi

echo "Создаем пользователя и базу данных..."

# Выполняем SQL скрипт
sudo -u postgres psql -f setup_database.sql

if [ $? -eq 0 ]; then
    echo
    echo "✅ Настройка базы данных завершена успешно!"
    echo
    echo "🔧 Теперь можно запускать Django:"
    echo "   cd pet-care-platform/backend"
    echo "   source .venv/bin/activate"
    echo "   python manage.py migrate"
    echo "   python manage.py createsuperuser"
    echo "   python manage.py runserver"
else
    echo
    echo "❌ Ошибка при настройке базы данных"
    echo
    echo "🔧 Попробуйте выполнить скрипт вручную:"
    echo "   sudo -u postgres psql -f setup_database.sql"
    echo
    echo "Или настройте через pgAdmin:"
    echo "1. Создайте пользователя 'pitomets' с паролем 'pitomets_password'"
    echo "2. Создайте базу данных 'pitomets_db' с владельцем 'pitomets'"
fi
