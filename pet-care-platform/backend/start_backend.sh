#!/bin/bash
# Скрипт запуска бэкенда для Linux
# Использование: ./start_backend.sh

echo "================================================"
echo "     Питомец+ - Запуск бэкенда (Linux)"
echo "================================================"
echo ""

# Переход в директорию скрипта
cd "$(dirname "$0")"
echo "[INFO] Рабочая директория: $(pwd)"
echo ""

# Шаг 1: Проверка Python
echo "[1/6] Проверка Python..."
if ! command -v python3 &> /dev/null; then
    echo "[ОШИБКА] Python3 не установлен!"
    echo "Установите Python 3.10+"
    echo "Ubuntu/Debian: sudo apt install python3 python3-pip python3-venv"
    echo "Fedora: sudo dnf install python3 python3-pip"
    echo "Arch: sudo pacman -S python python-pip"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "[OK] Python найден: $PYTHON_VERSION"
echo ""

# Шаг 2: Виртуальное окружение
echo "[2/6] Проверка виртуального окружения..."
if [ -d ".venv" ] && [ -f ".venv/bin/activate" ]; then
    echo "[OK] Виртуальное окружение найдено"
else
    echo "[INFO] Создание виртуального окружения..."
    rm -rf .venv 2>/dev/null
    python3 -m venv .venv
    if [ $? -ne 0 ]; then
        echo "[ОШИБКА] Не удалось создать виртуальное окружение!"
        exit 1
    fi
    echo "[OK] Виртуальное окружение создано"
fi
echo ""

# Шаг 3: Установка зависимостей
echo "[3/6] Установка зависимостей..."
if [ ! -f "requirements.txt" ]; then
    echo "[ОШИБКА] requirements.txt не найден!"
    exit 1
fi

echo "[INFO] Обновление pip..."
.venv/bin/python -m pip install --upgrade pip -q

echo "[INFO] Установка пакетов..."
.venv/bin/python -m pip install -r requirements.txt -q
if [ $? -ne 0 ]; then
    echo "[ПРЕДУПРЕЖДЕНИЕ] Некоторые пакеты не установились, повторная попытка..."
    .venv/bin/python -m pip install -r requirements.txt --no-cache-dir
fi

.venv/bin/python -m pip install setuptools -q 2>/dev/null
echo "[OK] Зависимости установлены"
echo ""

# Шаг 4: Проверка .env файла
echo "[4/6] Проверка конфигурации..."
if [ ! -f ".env" ]; then
    echo "[INFO] Создание .env файла..."
    cat > .env << EOF
DB_NAME=pitomets_db
DB_USER=pitomets
DB_PASSWORD=pitomets_password
DB_HOST=localhost
DB_PORT=5432
DEBUG=True
DJANGO_SECRET_KEY=django-insecure-change-in-production
CLIENT_URL=http://localhost:5173
API_URL=http://localhost:8000
EOF
    echo "[OK] .env файл создан"
    echo "[ВАЖНО] Проверьте настройки базы данных в .env файле!"
else
    echo "[OK] .env файл найден"
fi
echo ""

# Шаг 5: База данных и миграции
echo "[5/6] Проверка базы данных..."
if [ ! -f "manage.py" ]; then
    echo "[ОШИБКА] manage.py не найден!"
    exit 1
fi

# Проверка подключения к БД
.venv/bin/python manage.py check --database default &>/dev/null
if [ $? -ne 0 ]; then
    echo "[ОШИБКА] Не удается подключиться к базе данных!"
    echo "Проверьте что PostgreSQL запущен и настройки в .env корректны"
    if [ -f ".env" ]; then
        grep "DB_" .env
    fi
    echo ""
    echo "Для настройки базы данных запустите:"
    echo "  ./setup_db.sh"
    exit 1
fi
echo "[OK] Подключение к базе данных успешно"

echo "[INFO] Применение миграций..."
.venv/bin/python manage.py migrate --noinput &>/dev/null
if [ $? -ne 0 ]; then
    echo "[ПРЕДУПРЕЖДЕНИЕ] Проблемы с миграциями, попытка исправить..."
    .venv/bin/python manage.py migrate --fake-initial --noinput &>/dev/null
    .venv/bin/python manage.py migrate --noinput &>/dev/null
fi
echo "[OK] Миграции применены"
echo ""

# Шаг 6: Проверка порта
echo "[6/6] Проверка порта 8000..."
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "[ПРЕДУПРЕЖДЕНИЕ] Порт 8000 уже используется!"
fi
echo ""

# Запуск сервера
echo "================================================"
echo "     Запуск Django сервера..."
echo "================================================"
echo ""
echo "Бэкенд будет доступен по адресам:"
echo "  http://localhost:8000"
echo "  http://localhost:8000/api/"
echo "  http://localhost:8000/admin/"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo "================================================"
echo ""

.venv/bin/python manage.py runserver 0.0.0.0:8000

echo ""
echo "Сервер остановлен."













