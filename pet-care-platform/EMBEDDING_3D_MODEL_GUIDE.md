# 🎨 Руководство по внедрению 3D модели с "шерстью" на сайт

## 📋 Обзор

Это руководство поможет вам запечь процедурную "шерсть" из Blender в текстуры и внедрить 3D модель на страницу профиля вашего веб-сайта.

### Что уже готово ✅
- ✅ Компонент `Assistant3D` создан и настроен
- ✅ Компонент подключен на странице `/profile`
- ✅ Настроено освещение и окружение
- ✅ Реализована анимация и взаимодействие (клик, движение мышью)
- ✅ Настроена система версионирования кэша (?v=8)

### Что нужно сделать 🎯
1. Запечь текстуры из Blender файла
2. Экспортировать модель в GLB формат
3. Заменить существующий файл модели
4. Обновить версию кэша
5. Протестировать на сайте

---

## 🚀 Быстрый старт (3 команды)

### Вариант 1: Автоматический (Рекомендуется)

```bash
# 1. Запустить процесс запекания и экспорта
cd /home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform
./scripts/bake_and_export.sh

# 2. Обновить версию (замените v=8 на v=9)
# Откройте файл: frontend/src/components/Assistant3D.jsx
# Строка 6: const MODEL_URL = '/models/assistant.glb?v=9'

# 3. Перезапустить frontend
cd frontend
npm run dev
```

### Вариант 2: Ручной (Через UI Blender)

```bash
# 1. Открыть Blender с вашим файлом
blender "/home/dmitry/Загрузки/Telegram Desktop/F-5.0.blend"

# 2. В Blender: Scripting → Open → выбрать scripts/bake_fur_model.py
# 3. Нажать ▶ Run Script (или Alt+P)
# 4. Дождаться завершения (5-15 минут)
# 5. Обновить версию и перезапустить frontend (как выше)
```

---

## 📁 Структура файлов

```
pet-care-platform/
├── frontend/
│   ├── public/
│   │   └── models/
│   │       ├── assistant.glb          # ← Ваша модель (заменится)
│   │       └── bakes/                 # ← Запечённые текстуры
│   │           ├── *_basecolor.png
│   │           ├── *_normal.png
│   │           ├── *_roughness.png
│   │           └── *_ao.png
│   └── src/
│       └── components/
│           └── Assistant3D.jsx        # ← Компонент 3D ассистента
└── scripts/
    ├── bake_fur_model.py              # ← Python скрипт для Blender
    ├── bake_and_export.sh             # ← Bash launcher
    ├── test_model.sh                  # ← Тестирование модели
    └── BLENDER_BAKING_GUIDE.md        # ← Детальная документация
```

---

## 🔥 Процесс запекания (что происходит внутри)

### 1. Подготовка (Auto)
- Проверка UV-развертки (создание если нет)
- Переключение на Cycles render engine
- Настройка параметров запекания

### 2. Создание текстур (Auto)
Для каждого материала создаются 4 текстуры:
- **basecolor.png** (2048×2048, sRGB) - основной цвет с "ворсом"
- **normal.png** (2048×2048, Non-Color) - карта нормалей для объёма
- **roughness.png** (2048×2048, Non-Color) - шероховатость поверхности
- **ao.png** (2048×2048, Non-Color) - ambient occlusion для глубины

### 3. Запекание (Auto)
- **Base Color**: Bake Type = Diffuse (Color only)
- **Normal**: Bake Type = Normal
- **Roughness**: Bake Type = Emit (через временный Emission shader)
- **AO**: Bake Type = Ambient Occlusion

### 4. PBR материал (Auto)
- Создание Principled BSDF материала
- Подключение всех запечённых текстур
- Настройка Normal Map node

### 5. Экспорт GLB (Auto)
- Формат: glTF Binary (.glb)
- Embedded текстуры
- С UV, нормалями, материалами
- Целевой путь: `frontend/public/models/assistant.glb`

---

## 🎮 Компонент Assistant3D

Ваш 3D ассистент уже имеет следующие возможности:

### Визуальные эффекты
- 🌅 **Environment mapping** (HDRI окружение)
- 💡 **Динамическое освещение** (ambient + hemisphere + directional + point)
- 🌗 **Тени** (cast & receive shadows)
- ✨ **Tone mapping** (ACESFilmic для реалистичности)
- 🎨 **Правильное цветовое пространство** (sRGB)

### Интерактивность
- 🖱️ **Следит за курсором** (поворот головы/тела)
- 🤚 **Реагирует на клик** (машет рукой)
- 💓 **Пульсация при клике** (scale animation)
- 🌊 **Idle анимация** (плавное покачивание)
- 🎬 **Автоматическая анимация** (проигрывание первой анимации)

### Оптимизация
- 📦 **Preloading** (модель загружается заранее)
- 🔄 **Версионирование** (?v=8 для обхода кэша)
- 🎯 **Фиксированная позиция** (правый нижний угол)
- 📱 **Адаптивный размер** (260×260px)

---

## ⚙️ Настройка компонента

Если нужно изменить параметры, отредактируйте `Assistant3D.jsx`:

### Изменить размер
```javascript
// Строки 111-116
<div style={{
  width: 300,  // ← Измените
  height: 300, // ← Измените
  ...
}}>
```

### Изменить позицию
```javascript
// Строки 111-116
<div style={{
  right: 20,   // ← Расстояние от правого края
  bottom: 20,  // ← Расстояние от нижнего края
  ...
}}>
```

### Изменить камеру
```javascript
// Строка 124
camera={{ 
  position: [0, 0.2, 2.4],  // ← [x, y, z]
  fov: 45                    // ← Угол обзора
}}
```

### Изменить фон
```javascript
// Строка 132
<color attach="background" args={['#f8fafc']} /> {/* ← HEX цвет */}
```

### Изменить освещение
```javascript
// Строки 133-137
<ambientLight intensity={0.7} />  {/* ← Общая яркость */}
<hemisphereLight 
  skyColor="#ffffff"              {/* ← Цвет неба */}
  groundColor="#cbd5f5"           {/* ← Цвет земли */}
  intensity={0.65} 
/>
<directionalLight 
  position={[2, 2, 2]}            {/* ← Позиция */}
  intensity={0.8}                 {/* ← Яркость */}
  castShadow 
/>
<pointLight 
  position={[-2, 1.5, 2]}         {/* ← Позиция */}
  intensity={0.5}                 {/* ← Яркость */}
/>
```

---

## 🧪 Тестирование

### Автоматическая проверка

```bash
./scripts/test_model.sh
```

Скрипт проверит:
- ✅ Наличие GLB файла
- ✅ Размер файла (оптимальный < 10MB)
- ✅ Наличие запечённых текстур
- ✅ Текущую версию в коде
- ✅ Структуру GLB (если установлен gltf_validator)

### Ручная проверка

1. **Открыть страницу профиля**
   ```
   http://localhost:5173/profile
   ```

2. **Проверить загрузку модели**
   - Открыть DevTools (F12)
   - Вкладка Network
   - Фильтр: "assistant.glb"
   - Статус должен быть 200
   - Размер файла должен отображаться

3. **Проверить рендеринг**
   - Модель отображается в правом нижнем углу
   - Следует за курсором мыши
   - Плавно покачивается
   - При клике машет и пульсирует

4. **Проверить текстуры**
   - Открыть DevTools → Console
   - Не должно быть ошибок о текстурах
   - Модель не должна быть чёрной/розовой
   - Шерсть выглядит детализированной

5. **Проверить производительность**
   - DevTools → Performance
   - Записать ~5 секунд
   - FPS должен быть стабильным (60 fps)
   - CPU не должен быть перегружен

### Типичные проблемы

| Проблема | Причина | Решение |
|----------|---------|---------|
| Модель не загружается | Путь неверный | Проверьте `MODEL_URL` |
| Модель чёрная | Текстуры не встроены | Пересоберите с embed текстурами |
| Модель розовая | Ошибка в материале | Проверьте PBR материал |
| Низкий FPS | Модель слишком тяжёлая | Оптимизируйте (см. ниже) |
| Не обновляется | Кэш браузера | Увеличьте версию ?v=9 |
| Нет текстур шерсти | Не запеклись | Повторите bake процесс |

---

## 🚀 Оптимизация

### Если модель слишком большая (> 10MB)

#### 1. Уменьшить разрешение текстур

Отредактируйте `scripts/bake_fur_model.py`:
```python
TEXTURE_SIZE = 1024  # Вместо 2048
```

#### 2. Использовать Draco сжатие

```bash
npm install -g @gltf-transform/cli

gltf-transform draco \
  frontend/public/models/assistant.glb \
  frontend/public/models/assistant_compressed.glb

# Переименовать обратно
mv frontend/public/models/assistant_compressed.glb \
   frontend/public/models/assistant.glb
```

#### 3. Конвертировать текстуры в WebP

```bash
cd frontend/public/models/bakes

for file in *.png; do
  cwebp -q 85 "$file" -o "${file%.png}.webp"
  rm "$file"
done
```

#### 4. Уменьшить полигоны в Blender

1. Выбрать объект
2. Modifiers → Add Modifier → Decimate
3. Ratio: 0.5 (50% полигонов)
4. Apply
5. Пересобрать GLB

### Если низкий FPS

#### 1. Уменьшить качество теней

```javascript
// Assistant3D.jsx
<Canvas
  shadows="soft"  // Вместо shadows (или вообще убрать)
  dpr={[1, 1.5]}  // Вместо [1, 2]
  ...
/>
```

#### 2. Упростить освещение

```javascript
// Убрать Environment или уменьшить qualit
<Environment preset="sunset" background={false} />

// Или заменить на простой фон
// <color attach="background" args={['#f8fafc']} />
```

#### 3. Ограничить анимацию

```javascript
// В useFrame, добавить throttling
useFrame((state) => {
  if (state.clock.getElapsedTime() % 2 < 0.016) return  // Каждый 2-й фрейм
  // ... остальной код
})
```

---

## 📊 Мониторинг

### Проверка размера бандла

```bash
cd frontend
npm run build -- --mode production

# Посмотреть размер
ls -lh dist/assets/*.js
```

### Lighthouse аудит

1. Открыть Chrome DevTools
2. Lighthouse вкладка
3. Выбрать Performance
4. Generate report
5. Проверить:
   - First Contentful Paint < 1.5s
   - Largest Contentful Paint < 2.5s
   - Time to Interactive < 3s

---

## 🎨 Кастомизация

### Добавить другие анимации

```javascript
// В handleClick функции
const animations = {
  wave: pickWaveAction(names),
  idle: names[0],
  dance: names.find(n => n.includes('dance')),
  jump: names.find(n => n.includes('jump'))
}

// Случайная анимация при клике
const randomAnim = Object.values(animations)[Math.floor(Math.random() * 4)]
```

### Добавить звуки

```javascript
const [audioListener] = useState(() => new THREE.AudioListener())
const [sound] = useState(() => new THREE.Audio(audioListener))

// В useEffect
const audioLoader = new THREE.AudioLoader()
audioLoader.load('/sounds/click.mp3', (buffer) => {
  sound.setBuffer(buffer)
  sound.setVolume(0.5)
})

// В handleClick
sound.play()
```

### Добавить диалоги

```javascript
const [message, setMessage] = useState('')

const dialogues = [
  'Привет! 👋',
  'Как твои питомцы?',
  'Не забудь покормить! 🍖',
  'Пора на прогулку! 🦴'
]

// В handleClick
const randomMsg = dialogues[Math.floor(Math.random() * dialogues.length)]
setMessage(randomMsg)
setTimeout(() => setMessage(''), 3000)

// В JSX
{message && (
  <div className="speech-bubble">{message}</div>
)}
```

---

## 📚 Дополнительные ресурсы

### Документация
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Three.js](https://threejs.org/docs/)
- [Blender Manual](https://docs.blender.org/)
- [glTF 2.0 Spec](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)

### Инструменты
- [gltf.report](https://gltf.report/) - Анализ GLB файлов
- [glTF-Transform](https://gltf-transform.dev/) - Оптимизация GLB
- [Blender](https://www.blender.org/) - 3D редактор
- [Three.js Editor](https://threejs.org/editor/) - Просмотр GLB онлайн

### Примеры
- [Drei Examples](https://github.com/pmndrs/drei#examples)
- [React Three Fiber Examples](https://docs.pmnd.rs/react-three-fiber/getting-started/examples)

---

## ✅ Чеклист финального деплоя

- [ ] 1. Запечь текстуры через `bake_and_export.sh`
- [ ] 2. Проверить модель через `test_model.sh`
- [ ] 3. Обновить версию в `Assistant3D.jsx` (v=9)
- [ ] 4. Протестировать локально (http://localhost:5173/profile)
- [ ] 5. Проверить в разных браузерах (Chrome, Firefox, Safari)
- [ ] 6. Проверить на мобильных (отключить если лагает)
- [ ] 7. Запустить Lighthouse аудит
- [ ] 8. Проверить размер бандла (< 500KB для 3D части)
- [ ] 9. Оптимизировать если нужно (см. раздел Оптимизация)
- [ ] 10. Закоммитить изменения в Git
- [ ] 11. Задеплоить на production

---

## 🆘 Поддержка

Если возникли проблемы:

1. **Проверьте логи Blender** при запекании
2. **Проверьте консоль браузера** (F12)
3. **Запустите тестовый скрипт**: `./scripts/test_model.sh`
4. **Посмотрите детальное руководство**: `scripts/BLENDER_BAKING_GUIDE.md`
5. **Проверьте версию Three.js**: должна быть 0.160+

---

**Успехов! 🚀**

Дата создания: 31.01.2026  
Версия документа: 1.0
