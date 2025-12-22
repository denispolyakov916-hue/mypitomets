#!/bin/bash
# Скрипт синхронизации проекта после Git Pull
# Использование: ./sync_after_pull.sh

echo "================================================"
echo "  Синхронизация проекта после Git Pull"
echo "================================================"
echo ""

BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"

# Бэкенд: применение миграций
echo "[1/4] Применение миграций Django..."
cd "$BACKEND_DIR"

if [ -d "venv" ]; then
    source venv/bin/activate
    python manage.py migrate --noinput
    if [ $? -eq 0 ]; then
        echo "[OK] Миграции применены"
    else
        echo "[ОШИБКА] Не удалось применить миграции"
    fi
    deactivate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
    python manage.py migrate --noinput
    if [ $? -eq 0 ]; then
        echo "[OK] Миграции применены"
    else
        echo "[ОШИБКА] Не удалось применить миграции"
    fi
    deactivate
else
    echo "[ПРЕДУПРЕЖДЕНИЕ] Виртуальное окружение не найдено"
    echo "Выполните: python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
fi

# Фронтенд: обновление зависимостей
echo ""
echo "[2/4] Обновление зависимостей фронтенда..."
cd "$FRONTEND_DIR"

if [ -d "node_modules" ]; then
    npm install
    if [ $? -eq 0 ]; then
        echo "[OK] Зависимости обновлены"
    else
        echo "[ОШИБКА] Не удалось обновить зависимости"
    fi
else
    npm install
    if [ $? -eq 0 ]; then
        echo "[OK] Зависимости установлены"
    else
        echo "[ОШИБКА] Не удалось установить зависимости"
    fi
fi

# Проверка .env файлов в бэкенде
echo ""
echo "[3/4] Проверка конфигурационных файлов бэкенда..."
cd "$BACKEND_DIR"

if [ ! -f ".env" ]; then
    echo "[INFO] Файл .env не найден. Создаю из .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "[OK] Файл .env создан. Отредактируйте его при необходимости."
    else
        echo "[ПРЕДУПРЕЖДЕНИЕ] .env.example не найден"
    fi
else
    echo "[OK] Файл .env найден"
fi

# Проверка .env файлов во фронтенде
echo ""
echo "[4/4] Проверка конфигурационных файлов фронтенда..."
cd "$FRONTEND_DIR"

if [ ! -f ".env" ]; then
    echo "[INFO] Файл .env не найден. Создаю из .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "[OK] Файл .env создан. Отредактируйте его при необходимости."
    else
        echo "[ПРЕДУПРЕЖДЕНИЕ] .env.example не найден"
    fi
else
    echo "[OK] Файл .env найден"
fi

echo ""
echo "================================================"
echo "  Синхронизация завершена!"
echo "================================================"
echo ""
echo "Следующие шаги:"
echo "  1. Проверьте настройки в backend/.env и frontend/.env"
echo "  2. Убедитесь, что PostgreSQL запущен"
echo "  3. Запустите бэкенд: cd backend && source venv/bin/activate && python manage.py runserver"
echo "  4. Запустите фронтенд: cd frontend && npm run dev"
echo ""

