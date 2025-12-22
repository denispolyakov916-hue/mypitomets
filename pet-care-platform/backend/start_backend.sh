#!/bin/bash
# Скрипт запуска бэкенда для Linux
# Использование: ./start_backend.sh

echo "================================================"
echo "     Питомец+ - Запуск бэкенда (Linux)"
echo "================================================"
echo ""

# Переход в директорию скрипта
cd "$(dirname "$0")"

# Проверка Python
echo "[1/6] Проверка Python..."
if ! command -v python3 &> /dev/null; then
    echo "[ОШИБКА] Python 3 не установлен!"
    echo "Установите Python 3.10+ через пакетный менеджер вашего дистрибутива"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "[OK] Python установлен: $PYTHON_VERSION"
echo ""

# Проверка виртуального окружения
echo "[2/6] Проверка виртуального окружения..."
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "[INFO] Виртуальное окружение не найдено. Создаю..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ОШИБКА] Не удалось создать виртуальное окружение!"
        exit 1
    fi
    echo "[OK] Виртуальное окружение создано"
    echo ""
    echo "[INFO] Установка зависимостей..."
    source venv/bin/activate
    python3 -m pip install --upgrade pip
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "[ОШИБКА] Не удалось установить зависимости!"
        exit 1
    fi
    echo "[OK] Зависимости установлены"
elif [ -d "venv" ]; then
    echo "[OK] Найдено виртуальное окружение venv"
else
    echo "[OK] Найдено виртуальное окружение .venv"
fi
echo ""

# Активация виртуального окружения
echo "[3/6] Активация виртуального окружения..."
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo "[ОШИБКА] Не удалось активировать виртуальное окружение!"
    exit 1
fi
echo "[OK] Виртуальное окружение активировано"
echo ""

# Проверка .env файла
echo "[4/6] Проверка конфигурации..."
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

# Проверка подключения к БД
echo "[5/6] Проверка подключения к базе данных..."
python3 manage.py check --database default > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "[ПРЕДУПРЕЖДЕНИЕ] Проблемы с подключением к БД"
    echo "Убедитесь, что:"
    echo "  1. PostgreSQL запущен (sudo systemctl start postgresql)"
    echo "  2. База данных создана (выполните ./setup_db.sh)"
    echo "  3. Настройки в .env файле корректны"
    echo ""
    read -p "Продолжить запуск? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Запуск отменен"
        exit 1
    fi
else
    echo "[OK] Подключение к БД успешно"
fi
echo ""

# Применение миграций
echo "[6/6] Проверка миграций..."
python3 manage.py migrate --check > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "[INFO] Обнаружены непримененные миграции. Применяю..."
    python3 manage.py migrate
    if [ $? -ne 0 ]; then
        echo "[ОШИБКА] Не удалось применить миграции!"
        exit 1
    fi
    echo "[OK] Миграции применены"
else
    echo "[OK] Все миграции применены"
fi
echo ""

# Запуск сервера
echo "================================================"
echo "     Запуск Django сервера..."
echo "================================================"
echo ""
echo "Бэкенд будет доступен по адресам:"
echo "  http://localhost:8000"
echo "  http://127.0.0.1:8000"
echo ""
echo "API эндпоинты:"
echo "  http://localhost:8000/api/"
echo "  http://localhost:8000/admin/"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo ""
echo "================================================"
echo ""

python3 manage.py runserver 0.0.0.0:8000

