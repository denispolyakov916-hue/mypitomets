#!/bin/bash
# Скрипт запуска фронтенда для Linux
# Использование: ./start_frontend.sh

echo "================================================"
echo "     Питомец+ - Запуск фронтенда (Linux)"
echo "================================================"
echo ""

# Переход в директорию скрипта
cd "$(dirname "$0")"

# Проверка Node.js
echo "[1/5] Проверка Node.js..."
if ! command -v node &> /dev/null; then
    echo "[ОШИБКА] Node.js не установлен!"
    echo "Установите Node.js 18+ с https://nodejs.org/"
    echo "Или через пакетный менеджер:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  Fedora: sudo dnf install nodejs npm"
    echo "  Arch: sudo pacman -S nodejs npm"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "[OK] Node.js установлен: $NODE_VERSION"
echo ""

# Проверка npm
echo "[2/5] Проверка npm..."
if ! command -v npm &> /dev/null; then
    echo "[ОШИБКА] npm не найден!"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "[OK] npm установлен: $NPM_VERSION"
echo ""

# Проверка и установка зависимостей
echo "[3/5] Проверка зависимостей..."
if [ ! -d "node_modules" ]; then
    echo "[INFO] Зависимости не найдены. Устанавливаю..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ОШИБКА] Ошибка при установке зависимостей!"
        exit 1
    fi
    echo "[OK] Зависимости установлены"
else
    echo "[OK] Зависимости найдены"
    echo "[INFO] Проверка обновлений..."
    npm install
fi
echo ""

# Проверка .env файла
echo "[4/5] Проверка конфигурации..."
if [ ! -f ".env" ]; then
    echo "[INFO] Файл .env не найден. Создаю из .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "[OK] Файл .env создан с настройками по умолчанию"
        echo "[INFO] Отредактируйте .env, указав правильный URL бэкенда"
    else
        echo "[ПРЕДУПРЕЖДЕНИЕ] .env.example не найден"
        echo "[INFO] Создаю базовый .env файл..."
        echo "VITE_API_URL=http://localhost:8000/api" > .env
        echo "[OK] Файл .env создан"
    fi
else
    echo "[OK] Файл .env найден"
fi
echo ""

# Предупреждение о бэкенде
echo "[5/5] Проверка готовности..."
echo ""
echo "⚠️  ВАЖНО: Убедитесь, что бэкенд запущен!"
echo ""
echo "Если бэкенд не запущен, выполните в другом терминале:"
echo "  cd ../backend"
echo "  ./start_backend.sh"
echo ""
echo "Или вручную:"
echo "  cd ../backend"
echo "  source venv/bin/activate"
echo "  python3 manage.py runserver 0.0.0.0:8000"
echo ""
read -p "Нажмите Enter для запуска фронтенда..."
echo ""

# Запуск dev сервера
echo "================================================"
echo "     Запуск Vite dev-сервера..."
echo "================================================"
echo ""
echo "Фронтенд будет доступен по адресам:"
echo "  http://localhost:5199"
echo "  http://127.0.0.1:5199"
echo ""
echo "ВАЖНО: Бекенд должен быть запущен на http://localhost:8077"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo ""
echo "================================================"
echo ""

npm run dev -- --port 5199 --host localhost

