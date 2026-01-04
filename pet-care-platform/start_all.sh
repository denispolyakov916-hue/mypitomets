#!/bin/bash
# Скрипт одновременного запуска фронтенда и бэкенда
# Использование: ./start_all.sh

echo "================================================"
echo "     Питомец+ - Запуск всего проекта"
echo "================================================"
echo ""

# Переход в корневую директорию проекта
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)
echo "[INFO] Корневая директория проекта: $PROJECT_ROOT"
echo ""

# Функция для запуска сервиса в фоне
start_service() {
    local service_name=$1
    local service_dir=$2
    local start_command=$3

    echo "[INFO] Запуск $service_name..."
    cd "$service_dir"

    # Запуск в фоне
    $start_command &
    local pid=$!
    echo "[OK] $service_name запущен (PID: $pid)"

    cd "$PROJECT_ROOT"
    echo $pid
}

# Проверка наличия скриптов
if [ ! -f "backend/start_backend.sh" ]; then
    echo "[ОШИБКА] backend/start_backend.sh не найден!"
    exit 1
fi

if [ ! -f "frontend/start_frontend.sh" ]; then
    echo "[ОШИБКА] frontend/start_frontend.sh не найден!"
    exit 1
fi

echo "Запуск сервисов..."
echo ""

# Запуск бэкенда
BACKEND_PID=$(start_service "бэкенда" "backend" "./start_backend.sh")
echo ""

# Небольшая задержка перед запуском фронтенда
echo "[INFO] Ожидание запуска бэкенда..."
sleep 3

# Запуск фронтенда
FRONTEND_PID=$(start_service "фронтенда" "frontend" "./start_frontend.sh")
echo ""

echo "================================================"
echo "     Все сервисы запущены!"
echo "================================================"
echo ""
echo "🌐 Доступ к приложению:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  Admin:    http://localhost:8000/admin/"
echo ""
echo "📊 PID процессов:"
echo "  Backend:  $BACKEND_PID"
echo "  Frontend: $FRONTEND_PID"
echo ""
echo "Для остановки всех сервисов нажмите Ctrl+C"
echo "================================================"
echo ""

# Функция очистки при завершении
cleanup() {
    echo ""
    echo "================================================"
    echo "     Остановка сервисов..."
    echo "================================================"

    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "[INFO] Остановка бэкенда (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null
        echo "[OK] Бэкенд остановлен"
    fi

    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "[INFO] Остановка фронтенда (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null
        echo "[OK] Фронтенд остановлен"
    fi

    echo "Все сервисы остановлены."
    exit 0
}

# Обработка сигналов завершения
trap cleanup SIGINT SIGTERM

# Ожидание завершения любого из процессов
wait $BACKEND_PID $FRONTEND_PID








