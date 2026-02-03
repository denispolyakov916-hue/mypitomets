#!/bin/bash

# Скрипт для автоматического запуска Blender с процессом запекания текстур
# Использование: ./bake_and_export.sh

BLEND_FILE="/home/dmitry/Загрузки/Telegram Desktop/F-5.0.blend"
SCRIPT_FILE="/home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/scripts/bake_fur_model.py"

echo "=================================================="
echo "🎨 Запекание 3D модели для веб-сайта"
echo "=================================================="
echo ""

# Проверка наличия Blender
if ! command -v blender &> /dev/null; then
    echo "❌ Blender не найден в PATH"
    echo "💡 Установите Blender или добавьте его в PATH"
    exit 1
fi

# Проверка наличия файла .blend
if [ ! -f "$BLEND_FILE" ]; then
    echo "❌ Файл не найден: $BLEND_FILE"
    echo "💡 Проверьте путь к файлу"
    exit 1
fi

# Проверка наличия скрипта
if [ ! -f "$SCRIPT_FILE" ]; then
    echo "❌ Скрипт не найден: $SCRIPT_FILE"
    exit 1
fi

echo "📁 Blend файл: $BLEND_FILE"
echo "🐍 Python скрипт: $SCRIPT_FILE"
echo ""
echo "🚀 Запуск Blender в фоновом режиме..."
echo "⏳ Это может занять 5-15 минут..."
echo ""

# Запуск Blender в фоновом режиме с выполнением скрипта
blender "$BLEND_FILE" --background --python "$SCRIPT_FILE"

# Проверка результата
if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================="
    echo "✅ Процесс завершён успешно!"
    echo "=================================================="
    echo ""
    echo "📦 Проверьте результат:"
    echo "   GLB: /home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/frontend/public/models/assistant.glb"
    echo "   Текстуры: /home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/frontend/public/models/bakes/"
    echo ""
    echo "📝 Следующие шаги:"
    echo "   1. Обновите версию в Assistant3D.jsx: ?v=9"
    echo "   2. Перезапустите frontend"
    echo "   3. Очистите кэш браузера (Ctrl+Shift+R)"
    echo ""
else
    echo ""
    echo "❌ Произошла ошибка при выполнении скрипта"
    echo "💡 Проверьте вывод выше для деталей"
    exit 1
fi
