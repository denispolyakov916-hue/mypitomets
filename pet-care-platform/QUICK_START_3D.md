# 🎯 Быстрая инструкция: Замена 3D модели

## ⚡ За 3 шага

### Шаг 1: Запечь и экспортировать модель

**⚠️ Для Blender 5.0+ используйте упрощённый скрипт:**
```bash
cd /home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform
./scripts/bake_simple.sh
```
⏱️ Время: 5-10 минут

**Для Blender 3.x/4.x (старый скрипт):**
```bash
./scripts/bake_and_export.sh
```

> 💡 **Примечание:** В Blender 5.0+ изменился API. Если получаете ошибку `AttributeError: 'BakeSettings' object has no attribute 'bake_type'` или `Segmentation fault`, используйте `bake_simple.sh`. Подробности в `BLENDER_5_FIX.md`

**Вариант Б (Через Blender UI):**
1. Открыть: `blender "/home/dmitry/Загрузки/Telegram Desktop/F-5.0.blend"`
2. Вкладка **Scripting** → **Open** → `scripts/bake_fur_model.py`
3. Нажать **▶ Run Script** (Alt+P)
4. Дождаться "✅ Процесс завершён успешно!"

---

### Шаг 2: Обновить версию

Открыть файл:
```
frontend/src/components/Assistant3D.jsx
```

Изменить строку 6:
```javascript
// Было:
const MODEL_URL = '/models/assistant.glb?v=8'

// Стало:
const MODEL_URL = '/models/assistant.glb?v=9'
```

---

### Шаг 3: Перезапустить и проверить

```bash
# Перезапустить frontend
cd /home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/frontend
npm run dev

# В браузере открыть:
# http://localhost:5173/profile

# Очистить кэш: Ctrl+Shift+R
```

---

## ✅ Проверка результата

### Визуальная проверка:
- ✅ Модель отображается в правом нижнем углу
- ✅ Следует за курсором мыши
- ✅ Плавно покачивается
- ✅ При клике машет и пульсирует
- ✅ Шерсть выглядит детализированной (не чёрная/розовая)

### Техническая проверка:
```bash
# Запустить тестовый скрипт
./scripts/test_model.sh
```

Должно быть:
- ✅ GLB файл найден
- ✅ Размер 5-10MB (оптимально)
- ✅ Текстуры найдены (12-20 штук)

---

## 🚨 Если что-то пошло не так

### Ошибка: AttributeError или Segmentation fault
```bash
# Используйте упрощённый скрипт для Blender 5.0+
./scripts/bake_simple.sh

# Подробности в документе:
cat BLENDER_5_FIX.md
```

### Модель не загружается
```bash
# Проверить путь к файлу
ls -lh frontend/public/models/assistant.glb

# Проверить версию в коде
grep "MODEL_URL" frontend/src/components/Assistant3D.jsx
```

### Модель чёрная/без текстур
```bash
# Повторить процесс запекания
./scripts/bake_and_export.sh
```

### Не обновляется в браузере
1. Убедитесь что версия увеличена (?v=9)
2. Очистите кэш: Ctrl+Shift+R
3. Перезапустите frontend

---

## 📁 Что будет создано

```
frontend/public/models/
├── assistant.glb                    # ← Новая модель (заменит старую)
└── bakes/                           # ← Запечённые текстуры
    ├── Body_#MainBody_basecolor.png
    ├── Body_#MainBody_normal.png
    ├── Body_#MainBody_roughness.png
    ├── Body_#MainBody_ao.png
    └── ... (для каждого материала)
```

---

## 📚 Детальная документация

Для подробностей смотрите:
- `EMBEDDING_3D_MODEL_GUIDE.md` - Полное руководство
- `scripts/BLENDER_BAKING_GUIDE.md` - Ручной процесс в Blender

---

## 🎉 Готово!

После выполнения 3 шагов ваша новая модель с "шерстью" будет отображаться на странице `/profile`!

**Текущее состояние:**
- Модель: `assistant.glb` (7.1MB, обновлена 31.01.2026)
- Текстуры: 18 файлов PNG в `/bakes/`
- Версия в коде: `?v=8` → обновите на `?v=9`

---

**Время выполнения:** ~20 минут  
**Сложность:** ⭐⭐☆☆☆
