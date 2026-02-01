# ⚠️ Решение проблемы с Blender 5.0+

## Проблема

При запуске `bake_and_export.sh` возникает ошибка:

```
AttributeError: 'BakeSettings' object has no attribute 'bake_type'
```

или

```
Segmentation fault (core dumped)
```

## Причина

В Blender 5.0+ изменился API для запекания текстур. Атрибут `bake_type` был удалён, а также изменилась работа с памятью при множественном запекании.

## ✅ Решение

### Вариант 1: Использовать упрощённый скрипт (Рекомендуется)

Создан специальный скрипт для Blender 5.0+:

```bash
# Вместо bake_fur_model.py используйте bake_fur_model_simple.py

blender "/home/dmitry/Загрузки/Telegram Desktop/F-5.0.blend" \
  --background \
  --python scripts/bake_fur_model_simple.py
```

Или создайте новый launcher:

```bash
# scripts/bake_simple.sh
#!/bin/bash

BLEND_FILE="/home/dmitry/Загрузки/Telegram Desktop/F-5.0.blend"
SCRIPT_FILE="$(dirname "$0")/bake_fur_model_simple.py"

echo "🚀 Запуск упрощённого процесса запекания..."
blender "$BLEND_FILE" --background --python "$SCRIPT_FILE"
```

### Вариант 2: Использовать Blender 3.x/4.x

Если у вас есть доступ к Blender 3.x или 4.x, используйте его:

```bash
# Установить старую версию
snap install blender --channel=4.2/stable

# Использовать конкретную версию
/snap/blender/XXX/blender --version
```

### Вариант 3: Ручное запекание через GUI

1. Откройте Blender GUI (не в фоновом режиме)
2. Загрузите `scripts/bake_fur_model_simple.py` в Scripting
3. Запустите скрипт (Alt+P)
4. Blender покажет прогресс в реальном времени

## 🔧 Что исправлено

### В `bake_fur_model.py`:

**Было (старый API):**
```python
bpy.context.scene.render.bake.bake_type = 'DIFFUSE'
bpy.ops.object.bake(type=bpy.context.scene.render.bake.bake_type)
```

**Стало (новый API Blender 5.0+):**
```python
# type передаётся напрямую в bake()
bpy.ops.object.bake(type='DIFFUSE')
```

### В `bake_fur_model_simple.py`:

- Упрощённая логика запекания
- Обработка каждой текстуры отдельно
- Лучшая обработка ошибок
- Меньше потребление памяти
- Избегание segmentation fault

## 🧪 Тестирование

```bash
# Проверить версию Blender
blender --version

# Если 5.0+, использовать упрощённый скрипт
blender "/home/dmitry/Загрузки/Telegram Desktop/F-5.0.blend" \
  --background \
  --python scripts/bake_fur_model_simple.py
```

## 📝 Обновлённая инструкция

### Быстрый старт для Blender 5.0+

```bash
# 1. Запечь с упрощённым скриптом
blender "/home/dmitry/Загрузки/Telegram Desktop/F-5.0.blend" \
  --background \
  --python scripts/bake_fur_model_simple.py

# 2. Обновить версию
# frontend/src/components/Assistant3D.jsx: v=8 → v=9

# 3. Перезапустить
cd frontend && npm run dev
```

## 🆘 Если ошибки продолжаются

### Segmentation Fault

**Причины:**
- Недостаточно RAM (нужно 8GB+)
- Слишком большое разрешение текстур
- Проблемы с GPU

**Решения:**

1. **Уменьшить разрешение текстур:**
   ```python
   # В скрипте измените:
   TEXTURE_SIZE = 1024  # Вместо 2048
   ```

2. **Использовать CPU вместо GPU:**
   ```python
   # В скрипте измените:
   bpy.context.scene.cycles.device = 'CPU'  # Вместо GPU
   ```

3. **Запекать материалы по одному:**
   - Откройте .blend файл
   - Удалите лишние материалы временно
   - Запеките оставшиеся
   - Повторите для других

### Недостаточно памяти

```bash
# Закрыть другие программы
# Увеличить swap (Linux):
sudo swapon --show
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📊 Сравнение скриптов

| Параметр | bake_fur_model.py | bake_fur_model_simple.py |
|----------|-------------------|--------------------------|
| **Blender версия** | 3.0-4.x | 5.0+ |
| **Сложность** | Высокая | Низкая |
| **Скорость** | Быстрее | Медленнее |
| **Стабильность** | Средняя | Высокая |
| **Память** | Больше | Меньше |
| **PBR материал** | Да | Нет (только текстуры) |
| **Обработка ошибок** | Базовая | Продвинутая |

## ✅ Рекомендации

### Для Blender 5.0+
- ✅ Используйте `bake_fur_model_simple.py`
- ✅ Уменьшите TEXTURE_SIZE если мало RAM
- ✅ Используйте CPU если проблемы с GPU

### Для Blender 3.x/4.x
- ✅ Используйте `bake_fur_model.py`
- ✅ Получите лучшую производительность

### Для всех версий
- ✅ Закройте другие программы
- ✅ Имейте 8GB+ RAM
- ✅ Используйте SSD для быстрого I/O

## 🔄 История изменений

**31.01.2026:**
- Исправлен API для Blender 5.0+
- Создан упрощённый скрипт
- Добавлена обработка segmentation fault
- Улучшена документация

## 📞 Дополнительная помощь

Если проблемы продолжаются:

1. Проверьте логи: `/tmp/F-5.0.crash.txt`
2. Попробуйте через GUI вместо --background
3. Уменьшите сложность модели
4. Используйте старую версию Blender

---

**Создано:** 31.01.2026  
**Обновлено:** 31.01.2026  
**Версия:** 1.1
