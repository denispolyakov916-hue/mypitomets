# 📦 Система внедрения 3D модели с "шерстью"

## 📋 Созданные файлы и их назначение

### 🚀 Основные файлы

1. **`QUICK_START_3D.md`** ⭐ **НАЧНИТЕ ОТСЮДА**
   - Краткая инструкция (3 шага)
   - Время выполнения: ~20 минут
   - Для быстрой замены модели

2. **`EMBEDDING_3D_MODEL_GUIDE.md`**
   - Полное руководство со всеми деталями
   - Настройка компонента
   - Оптимизация и тестирование
   - Решение проблем

3. **`scripts/BLENDER_BAKING_GUIDE.md`**
   - Детальное описание процесса запекания
   - Ручной способ через Blender UI
   - Теория и best practices

### 🔧 Исполняемые скрипты

4. **`scripts/bake_fur_model.py`**
   - Python скрипт для Blender
   - Автоматизирует весь процесс запекания
   - Запускается через Blender (GUI или CLI)

5. **`scripts/bake_and_export.sh`** ⭐
   ```bash
   ./scripts/bake_and_export.sh
   ```
   - Bash launcher для автоматического запуска
   - Запускает Blender в фоновом режиме
   - Выводит прогресс и результаты

6. **`scripts/test_model.sh`**
   ```bash
   ./scripts/test_model.sh
   ```
   - Проверка корректности модели
   - Валидация текстур
   - Диагностика проблем

---

## 🎯 Быстрый старт

### Вариант 1: Автоматический (Рекомендуется)

```bash
# 1. Запустить процесс
cd /home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform
./scripts/bake_and_export.sh

# 2. Обновить версию в коде (v=8 → v=9)
# Файл: frontend/src/components/Assistant3D.jsx, строка 6

# 3. Перезапустить frontend
cd frontend && npm run dev
```

### Вариант 2: Через Blender UI

```bash
# 1. Открыть Blender
blender "/home/dmitry/Загрузки/Telegram Desktop/F-5.0.blend"

# 2. В Blender:
#    - Scripting → Open → scripts/bake_fur_model.py
#    - Alt+P (Run Script)

# 3-4. То же что в варианте 1
```

---

## 📁 Структура проекта

```
pet-care-platform/
│
├── 📄 QUICK_START_3D.md              ⭐ Начните отсюда
├── 📄 EMBEDDING_3D_MODEL_GUIDE.md     Полное руководство
│
├── frontend/
│   ├── public/
│   │   └── models/
│   │       ├── assistant.glb          🎨 Ваша 3D модель
│   │       └── bakes/                 🖼️ Запечённые текстуры
│   │           ├── *_basecolor.png
│   │           ├── *_normal.png
│   │           ├── *_roughness.png
│   │           └── *_ao.png
│   │
│   └── src/
│       └── components/
│           └── Assistant3D.jsx        ⚛️ React компонент
│
└── scripts/
    ├── 🐍 bake_fur_model.py           Python скрипт для Blender
    ├── 🚀 bake_and_export.sh          Bash launcher
    ├── 🧪 test_model.sh               Тестирование
    └── 📄 BLENDER_BAKING_GUIDE.md     Детальная документация
```

---

## 🔄 Процесс работы

```
┌─────────────────┐
│ F-5.0.blend     │  Исходный файл Blender
│ (116MB)         │  с процедурной "шерстью"
└────────┬────────┘
         │
         │ bake_fur_model.py
         │ (5-15 минут)
         ▼
┌─────────────────┐
│ Bake Textures   │  Запекание в PNG текстуры:
│                 │  • basecolor (цвет + ворс)
│                 │  • normal (рельеф)
│                 │  • roughness (блеск)
│                 │  • ao (тени)
└────────┬────────┘
         │
         │ PBR Material + Export
         │
         ▼
┌─────────────────┐
│ assistant.glb   │  GLB файл (7-10MB)
│ + textures      │  с embedded текстурами
└────────┬────────┘
         │
         │ React Three Fiber
         │
         ▼
┌─────────────────┐
│ Web Browser     │  Интерактивная 3D модель
│ /profile        │  на странице профиля
└─────────────────┘
```

---

## ⚙️ Системные требования

### Для запекания (Blender)
- ✅ Blender 5.0.1 (установлен: `/snap/bin/blender`)
- ✅ Python 3.x (встроен в Blender)
- ✅ Cycles render engine (встроен)
- RAM: ~4GB минимум, 8GB рекомендуется
- GPU: Опционально (ускорит процесс)
- Диск: ~500MB свободного места

### Для отображения (Web)
- React 18+
- Three.js 0.160+
- React Three Fiber 8+
- @react-three/drei 9+
- Современный браузер с WebGL 2.0

---

## 🎨 Компонент Assistant3D

### Возможности
- 🖱️ **Интерактивность**: следит за курсором, реагирует на клики
- 🎬 **Анимация**: idle покачивание, машет рукой при клике
- 💡 **Освещение**: ambient + hemisphere + directional + point lights
- 🌅 **Environment**: HDRI окружение (sunset preset)
- 🌗 **Тени**: реалистичные cast/receive shadows
- ✨ **Tone mapping**: ACESFilmic для кино-качества
- 🎯 **Позиция**: правый нижний угол (фиксированная)
- 📦 **Preloading**: быстрая загрузка через useGLTF.preload

### Расположение
```
frontend/src/components/Assistant3D.jsx (144 строки)
```

### Используется на страницах
- ✅ `/profile` (Profile.jsx, строка 291)

---

## 📊 Текущее состояние

### Модель
- **Файл**: `frontend/public/models/assistant.glb`
- **Размер**: 7.1MB
- **Дата**: 31.01.2026 15:34
- **Версия в коде**: `?v=8` (обновите на `?v=9` после замены)

### Текстуры
- **Директория**: `frontend/public/models/bakes/`
- **Количество**: 18 файлов PNG
- **Материалы**:
  - Body_#MainBody (4 текстуры)
  - Body_#MainBodyHorns (4 текстуры)
  - Body_#VioletHair (4 текстуры)
  - Eyes_Tiny Iris (3 текстуры)
  - Eyes_Tiny Sclera (3 текстуры)

### Исходник
- **Файл**: `/home/dmitry/Загрузки/Telegram Desktop/F-5.0.blend`
- **Размер**: 116MB
- **Дата**: 27.01.2026

---

## 🧪 Тестирование

### Автоматическое
```bash
./scripts/test_model.sh
```

Проверяет:
- ✅ Наличие GLB
- ✅ Размер файла
- ✅ Наличие текстур
- ✅ Версию в коде
- ✅ Структуру GLB (если установлен gltf_validator)

### Ручное
1. Открыть: `http://localhost:5173/profile`
2. Проверить: модель в правом нижнем углу
3. Навести мышь: модель следит за курсором
4. Кликнуть: машет рукой и пульсирует
5. F12 → Console: нет ошибок
6. F12 → Network: assistant.glb загрузился (200 OK)

---

## 🚨 Решение проблем

### Не запускается скрипт
```bash
# Дать права на выполнение
chmod +x scripts/*.sh
```

### Blender не найден
```bash
# Проверить установку
which blender

# Если не установлен
sudo snap install blender --classic
```

### Модель не загружается
1. Проверить путь: `ls -lh frontend/public/models/assistant.glb`
2. Проверить версию: `grep MODEL_URL frontend/src/components/Assistant3D.jsx`
3. Очистить кэш: Ctrl+Shift+R

### Модель чёрная
1. Убедиться что текстуры embedded: `./scripts/test_model.sh`
2. Повторить запекание: `./scripts/bake_and_export.sh`

### Низкий FPS
1. Уменьшить разрешение текстур (2048 → 1024)
2. Упростить освещение (убрать Environment)
3. Оптимизировать через Draco: `gltf-transform draco assistant.glb output.glb`

---

## 📚 Документация

### Внутренняя
1. `QUICK_START_3D.md` - Быстрый старт (3 шага)
2. `EMBEDDING_3D_MODEL_GUIDE.md` - Полное руководство
3. `scripts/BLENDER_BAKING_GUIDE.md` - Blender процесс

### Внешняя
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Docs](https://threejs.org/docs/)
- [Blender Manual](https://docs.blender.org/)
- [glTF 2.0 Spec](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)

---

## ✅ Чеклист

### Для первой установки
- [ ] Прочитать `QUICK_START_3D.md`
- [ ] Запустить `./scripts/bake_and_export.sh`
- [ ] Обновить версию в `Assistant3D.jsx`
- [ ] Перезапустить frontend
- [ ] Протестировать на `/profile`

### Для обновления модели
- [ ] Заменить файл `F-5.0.blend` новым
- [ ] Запустить `./scripts/bake_and_export.sh`
- [ ] Увеличить версию (v=9 → v=10)
- [ ] Протестировать
- [ ] Закоммитить в Git

---

## 🎉 Готово!

Всё настроено и готово к использованию. Следуйте инструкциям в `QUICK_START_3D.md` для замены модели.

**Время на замену модели:** ~20 минут  
**Сложность:** ⭐⭐☆☆☆ (Средняя)

---

**Создано:** 31.01.2026  
**Blender версия:** 5.0.1  
**Проект:** Pet Care Platform  
**Модуль:** 3D Assistant
