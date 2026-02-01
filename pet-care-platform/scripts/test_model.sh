#!/bin/bash

# Тестовый скрипт для проверки корректности экспортированной 3D модели
# Использование: ./test_model.sh

MODEL_PATH="/home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/frontend/public/models/assistant.glb"
BAKES_DIR="/home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/frontend/public/models/bakes"

echo "=================================================="
echo "🧪 Тестирование 3D модели"
echo "=================================================="
echo ""

# Проверка существования GLB файла
if [ ! -f "$MODEL_PATH" ]; then
    echo "❌ GLB файл не найден: $MODEL_PATH"
    exit 1
fi

echo "✅ GLB файл найден: $MODEL_PATH"

# Проверка размера файла
FILE_SIZE=$(stat -c%s "$MODEL_PATH" 2>/dev/null || stat -f%z "$MODEL_PATH" 2>/dev/null)
FILE_SIZE_MB=$((FILE_SIZE / 1024 / 1024))

echo "📦 Размер файла: ${FILE_SIZE_MB}MB"

if [ $FILE_SIZE_MB -gt 10 ]; then
    echo "⚠️  Файл слишком большой (>${FILE_SIZE_MB}MB). Рекомендуется оптимизация."
elif [ $FILE_SIZE_MB -lt 1 ]; then
    echo "⚠️  Файл слишком маленький (<1MB). Возможно, текстуры не встроены."
else
    echo "✅ Размер файла в норме"
fi

# Проверка наличия запечённых текстур
echo ""
echo "🔍 Проверка запечённых текстур..."

if [ ! -d "$BAKES_DIR" ]; then
    echo "⚠️  Директория с текстурами не найдена: $BAKES_DIR"
else
    TEXTURE_COUNT=$(find "$BAKES_DIR" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.webp" \) 2>/dev/null | wc -l)
    
    if [ $TEXTURE_COUNT -eq 0 ]; then
        echo "⚠️  Текстуры не найдены в $BAKES_DIR"
    else
        echo "✅ Найдено текстур: $TEXTURE_COUNT"
        
        # Список текстур
        echo ""
        echo "📋 Список текстур:"
        find "$BAKES_DIR" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.webp" \) -exec basename {} \; | sort
    fi
fi

# Проверка версии в коде
echo ""
echo "🔍 Проверка версии модели в коде..."

ASSISTANT_FILE="/home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/frontend/src/components/Assistant3D.jsx"

if [ -f "$ASSISTANT_FILE" ]; then
    VERSION=$(grep -oP "MODEL_URL = '/models/assistant.glb\?v=\K[0-9]+" "$ASSISTANT_FILE" | head -1)
    
    if [ -n "$VERSION" ]; then
        echo "✅ Текущая версия в коде: v=$VERSION"
        echo "💡 После замены модели обновите версию на: v=$((VERSION + 1))"
    else
        echo "⚠️  Не удалось определить версию в коде"
    fi
fi

# Проверка последней модификации
echo ""
echo "📅 Последняя модификация модели:"
ls -lh "$MODEL_PATH" | awk '{print "   " $6, $7, $8}'

# Тест GLB структуры (если установлен gltf-validator)
echo ""
if command -v gltf_validator &> /dev/null; then
    echo "🔬 Валидация GLB структуры..."
    gltf_validator "$MODEL_PATH" --json-output validation_result.json 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ GLB структура валидна"
    else
        echo "⚠️  Обнаружены проблемы в GLB структуре"
        echo "   Подробности в validation_result.json"
    fi
else
    echo "💡 Для валидации GLB установите gltf_validator:"
    echo "   npm install -g gltf-validator"
fi

# Финальный отчёт
echo ""
echo "=================================================="
echo "📊 Итоговый отчёт"
echo "=================================================="

ISSUES=0

if [ ! -f "$MODEL_PATH" ]; then
    echo "❌ GLB файл отсутствует"
    ISSUES=$((ISSUES + 1))
fi

if [ $FILE_SIZE_MB -gt 10 ]; then
    echo "⚠️  Большой размер файла требует оптимизации"
fi

if [ ! -d "$BAKES_DIR" ] || [ $TEXTURE_COUNT -eq 0 ]; then
    echo "⚠️  Текстуры не найдены"
fi

if [ $ISSUES -eq 0 ]; then
    echo "✅ Модель готова к использованию!"
    echo ""
    echo "📝 Следующие шаги:"
    echo "   1. Обновите версию в Assistant3D.jsx"
    echo "   2. Перезапустите frontend: cd frontend && npm run dev"
    echo "   3. Откройте /profile в браузере"
    echo "   4. Очистите кэш: Ctrl+Shift+R"
else
    echo "❌ Обнаружены проблемы. Проверьте вывод выше."
fi

echo ""
