# Руководство по запеканию 3D модели с "шерстью" для веб-сайта

## 📋 Что делает этот процесс?

Процесс запекания (baking) преобразует сложные процедурные материалы Blender (например, шерсть, созданную через Hair Particle System или Shader Nodes) в простые текстуры, которые могут отображаться в веб-браузере.

## 🎯 Автоматический способ (Рекомендуется)

### Шаг 1: Откройте файл в Blender

1. Откройте Blender
2. File → Open → выберите `/home/dmitry/Загрузки/Telegram Desktop/F-5.0.blend`

### Шаг 2: Запустите скрипт

1. В Blender переключитесь на вкладку **Scripting** (вверху окна)
2. Нажмите **Open** (или кнопка папки)
3. Выберите файл: `/home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/scripts/bake_fur_model.py`
4. Нажмите кнопку **▶ Run Script** (или Alt+P)

### Шаг 3: Дождитесь завершения

Скрипт автоматически:
- ✅ Проверит UV-развертку (создаст при необходимости)
- ✅ Переключится на Cycles renderer
- ✅ Создаст текстуры: basecolor, normal, roughness, ao
- ✅ Запечёт все текстуры
- ✅ Создаст PBR материал с текстурами
- ✅ Экспортирует GLB файл в `/frontend/public/models/assistant.glb`

**Время выполнения:** 5-15 минут в зависимости от сложности модели и мощности ПК.

### Шаг 4: Обновите версию на сайте

После успешного экспорта отредактируйте файл:
`/frontend/src/components/Assistant3D.jsx`

Измените строку:
```javascript
const MODEL_URL = '/models/assistant.glb?v=8'
```
на:
```javascript
const MODEL_URL = '/models/assistant.glb?v=9'
```

---

## 🔧 Ручной способ (Если нужен больший контроль)

### 1. Подготовка UV-развертки

```
1. Выберите объект в 3D View
2. Tab → Edit Mode
3. A → Select All
4. U → Smart UV Project
5. Настройте Island Margin: 0.02
6. OK
7. Tab → Object Mode
```

### 2. Настройка рендера

```
Render Properties (справа):
- Render Engine: Cycles
- Device: GPU Compute (если доступно)
- Samples: 128-256
```

### 3. Создание материала "шерсти"

В **Shader Editor**:

```
Noise Texture → ColorRamp → Principled BSDF (Base Color)
                           ↓
Noise Texture → Bump → Principled BSDF (Normal)
```

Настройки Noise Texture:
- Scale: 150-300 (для имитации короткого ворса)
- Detail: 5-8

### 4. Создание изображений для бейка

В **Shader Editor**:
```
Add → Texture → Image Texture (создайте 4 штуки)
- basecolor.png (2048x2048, sRGB)
- normal.png (2048x2048, Non-Color)
- roughness.png (2048x2048, Non-Color)
- ao.png (2048x2048, Non-Color)
```

### 5. Запекание Base Color

```
1. Выберите объект
2. В Shader Editor выберите Image Texture node с basecolor.png
3. Render Properties → Bake:
   - Bake Type: Diffuse
   - Influence: Color ✓, Direct ✗, Indirect ✗
4. Bake
5. Image → Save (сохраните basecolor.png)
```

### 6. Запекание Normal

```
1. Выберите Image Texture node с normal.png
2. Bake Type: Normal
3. Bake
4. Save
```

### 7. Запекание Roughness

```
1. Отключите Principled BSDF от Material Output
2. Add → Shader → Emission
3. Подключите Roughness значение к Emission → Color
4. Подключите Emission к Material Output → Surface
5. Выберите roughness.png node
6. Bake Type: Emit
7. Bake
8. Save
9. Восстановите подключение Principled BSDF
```

### 8. Запекание Ambient Occlusion

```
1. Выберите ao.png node
2. Bake Type: Ambient Occlusion
3. Bake
4. Save
```

### 9. Создание финального PBR материала

```
1. Создайте новый материал или очистите существующий
2. Add → Shader → Principled BSDF (если нет)
3. Add → Texture → Image Texture (4 штуки)
4. Загрузите запечённые текстуры
5. Подключите:
   - basecolor → Base Color
   - normal → Normal Map → Normal
   - roughness → Roughness
   - ao → (опционально через MixRGB)
```

### 10. Экспорт GLB

```
File → Export → glTF 2.0 (.glb/.gltf):
- Format: glTF Binary (.glb)
- Include: Selected Objects ✓
- Transform: +Y Up ✓
- Geometry: UVs ✓, Normals ✓, Apply Modifiers ✓
- Materials: Export ✓
- Compression: None (или Draco если нужно)
- Путь: /home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/frontend/public/models/assistant.glb
```

---

## 🚨 Частые проблемы

### "UV map not found"
- Создайте UV-развертку: Edit Mode → U → Smart UV Project

### "Black textures after bake"
- Проверьте, что используете **Cycles**, а не Eevee
- Убедитесь, что активна правильная Image Texture node

### "Normal map looks wrong"
- Убедитесь, что normal.png имеет Color Space: **Non-Color**
- Используйте Normal Map node между текстурой и Principled BSDF

### "Model looks flat in browser"
- Проверьте, что все текстуры правильно подключены
- Убедитесь, что материал экспортировался вместе с GLB

### "Changes not visible on website"
- Измените версию в `MODEL_URL = '/models/assistant.glb?v=9'`
- Очистите кэш браузера (Ctrl+Shift+R)

---

## 📊 Рекомендуемые настройки

| Параметр | Значение | Описание |
|----------|----------|----------|
| Texture Size | 2048x2048 | Баланс между качеством и размером |
| Bake Samples | 128-256 | Больше = лучше качество, но дольше |
| Noise Scale | 150-300 | Для имитации короткого ворса |
| UV Island Margin | 0.02 | Предотвращает артефакты |

---

## 🎨 Оптимизация для веб

После экспорта можно дополнительно оптимизировать:

1. **Сжатие текстур:**
   ```bash
   cd /home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/frontend/public/models/bakes
   
   # Конвертация в WebP (лучшее сжатие)
   for file in *.png; do
     cwebp -q 85 "$file" -o "${file%.png}.webp"
   done
   ```

2. **glTF-Transform (сжатие GLB):**
   ```bash
   npm install -g @gltf-transform/cli
   
   gltf-transform optimize assistant.glb assistant_optimized.glb \
     --compress draco \
     --texture-compress webp
   ```

3. **Проверка размера:**
   ```bash
   ls -lh /home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/frontend/public/models/assistant.glb
   ```
   Оптимальный размер: < 5MB

---

## ✅ Чеклист

- [ ] Blender файл открыт: F-5.0.blend
- [ ] Скрипт запущен или ручное запекание выполнено
- [ ] GLB файл создан в `/frontend/public/models/assistant.glb`
- [ ] Текстуры сохранены в `/frontend/public/models/bakes/`
- [ ] Версия обновлена в `Assistant3D.jsx` (v=9)
- [ ] Сайт перезапущен
- [ ] Кэш браузера очищен
- [ ] Модель корректно отображается на странице `/profile`

---

## 📞 Поддержка

Если что-то пошло не так:
1. Проверьте консоль Blender на наличие ошибок
2. Убедитесь, что путь к файлу правильный
3. Проверьте, что у вас установлен Blender 3.0+
4. Посмотрите логи в консоли браузера (F12)
