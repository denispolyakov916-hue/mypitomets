#!/bin/bash

# Упрощённый скрипт запекания для Blender 5.0+
# Использует bake_fur_model_simple.py для избежания ошибок памяти

BLEND_FILE="/home/dmitry/Загрузки/Telegram Desktop/F-5.0.blend"
SCRIPT_FILE="/home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/scripts/bake_fur_model_simple.py"

echo "=================================================="
echo "🎨 Упрощённое запекание (Blender 5.0+)"
echo "=================================================="
echo ""

# Проверка Blender
if ! command -v blender &> /dev/null; then
    echo "❌ Blender не найден"
    exit 1
fi

# Проверка файлов
if [ ! -f "$BLEND_FILE" ]; then
    echo "❌ Файл не найден: $BLEND_FILE"
    exit 1
fi

if [ ! -f "$SCRIPT_FILE" ]; then
    echo "❌ Скрипт не найден: $SCRIPT_FILE"
    exit 1
fi

echo "📁 Blend файл: $BLEND_FILE"
echo "🐍 Python скрипт: $SCRIPT_FILE"
echo ""
echo "🚀 Запуск Blender..."
echo "⏳ Время: ~5-10 минут"
echo ""

# Запуск
blender "$BLEND_FILE" --background --python "$SCRIPT_FILE"

# Результат
if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================="
    echo "✅ Успешно!"
    echo "=================================================="
    echo ""
    echo "📝 Следующие шаги:"
    echo "   1. Обновите версию: ?v=9"
    echo "   2. Перезапустите: cd frontend && npm run dev"
    echo ""
else
    echo ""
    echo "❌ Ошибка"
    echo "💡 Смотрите: BLENDER_5_FIX.md"
    exit 1
fi
