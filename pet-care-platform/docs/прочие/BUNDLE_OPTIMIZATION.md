# Документация по оптимизации бандла и загрузке компонентов

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 3.3 - Оптимизация загрузки компонентов

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Lazy Loading](#lazy-loading)
3. [Code Splitting](#code-splitting)
4. [Оптимизация импортов](#оптимизация-импортов)
5. [Конфигурация Vite](#конфигурация-vite)
6. [Анализ бандла](#анализ-бандла)
7. [Рекомендации](#рекомендации)

---

## Обзор

Оптимизация загрузки компонентов обеспечивает:
- Уменьшение размера начального бандла
- Улучшение времени первой загрузки (FCP, LCP)
- Ленивую загрузку некритичных компонентов
- Оптимизацию импортов библиотек
- Разделение кода на chunks

---

## Lazy Loading

### Текущее состояние

В `App.jsx` уже используется lazy loading для:
- `CourseLearningPage` - Страница обучения курсу
- `CoursePageLearning` - Страница обучения с архитектурой страниц
- `LessonPage` - Страница урока
- `CourseBuilderPage` - Конструктор курсов
- `AdminApp` - React админ-панель

### Компоненты для ленивой загрузки

**Рекомендуется добавить lazy loading для**:
- `HealthDiary` - Дневник здоровья (редко используется)
- `Settings` - Настройки (редко используется)
- `Orders` - Список заказов (используется периодически)
- `OrderDetail` - Детали заказа (используется периодически)
- `PetIdPage` - Pet ID страница (может быть тяжелой)
- `UnifiedCheckout` - Checkout (используется только при оформлении)
- `PaymentMethodSelection` - Выбор способа оплаты (используется редко)

**Критичные компоненты (не ленивые)**:
- `Home` - Главная страница
- `AuthModal` - Модальное окно авторизации
- `Shop` - Каталог товаров
- `ProductDetail` - Детали товара
- `Cart` - Корзина
- `Courses` - Каталог курсов
- `CourseDetail` - Детали курса

### Использование

```jsx
import { lazy, Suspense } from 'react'

// Ленивая загрузка
const HealthDiary = lazy(() => import('./pages/HealthDiary/HealthDiary'))

// Использование с Suspense
<Suspense fallback={<Loader />}>
  <HealthDiary />
</Suspense>
```

---

## Code Splitting

### Стратегия разделения

1. **Критичный код** (начальный бандл):
   - React, React Router
   - Zustand stores
   - API клиент
   - Layout компоненты
   - Главная страница

2. **Маршрутные chunks**:
   - Каждый маршрут в отдельный chunk
   - Общие зависимости выносятся в vendor chunk

3. **Vendor chunks**:
   - React и React DOM
   - React Router
   - Axios
   - Zustand
   - Chart.js и react-chartjs-2
   - D3
   - TipTap

### Конфигурация Vite

Vite автоматически создает chunks на основе:
- Динамических импортов (`lazy()`)
- Настроек `build.rollupOptions.output.manualChunks`

---

## Оптимизация импортов

### Tree Shaking

Используйте именованные импорты вместо default:

```jsx
// ✅ Хорошо - tree shaking работает
import { useState, useEffect } from 'react'
import { useAuthStore } from './store'

// ❌ Плохо - импортируется весь модуль
import React from 'react'
const { useState, useEffect } = React
```

### Импорты библиотек

```jsx
// ✅ Хорошо - импортируем только нужное
import { Bar } from 'react-chartjs-2'
import { CategoryScale } from 'chart.js/auto'

// ❌ Плохо - импортируем всю библиотеку
import * as ChartJS from 'chart.js'
```

### Динамические импорты

Для больших библиотек используйте динамические импорты:

```jsx
// Динамический импорт D3 только когда нужен
const loadD3 = async () => {
  const d3 = await import('d3')
  return d3
}
```

---

## Конфигурация Vite

### Оптимизация сборки

```javascript
// vite.config.js
export default defineConfig({
  build: {
    // Разделение на chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // React и React DOM в отдельный chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Chart библиотеки
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          // D3
          'd3-vendor': ['d3'],
          // TipTap
          'tiptap-vendor': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-image',
            '@tiptap/extension-link'
          ],
          // Zustand
          'zustand-vendor': ['zustand'],
          // Axios
          'axios-vendor': ['axios']
        }
      }
    },
    // Минификация
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Удалить console.log в продакшене
      }
    },
    // Source maps только для продакшена (опционально)
    sourcemap: false,
    // Размер предупреждений
    chunkSizeWarningLimit: 1000
  }
})
```

---

## Анализ бандла

### Установка vite-bundle-analyzer

```bash
npm install --save-dev rollup-plugin-visualizer
```

### Конфигурация

```javascript
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true
    })
  ]
})
```

### Запуск анализа

```bash
npm run build
# Откроется HTML файл с визуализацией бандла
```

---

## Рекомендации

### 1. Ленивая загрузка некритичных страниц

```jsx
// Страницы, которые не нужны при первой загрузке
const HealthDiary = lazy(() => import('./pages/HealthDiary/HealthDiary'))
const Settings = lazy(() => import('./pages/Dashboard/Settings'))
const Orders = lazy(() => import('./pages/Orders/Orders'))
```

### 2. Предзагрузка при наведении

```jsx
// Предзагрузка при наведении на ссылку
<Link
  to="/health-diary"
  onMouseEnter={() => {
    import('./pages/HealthDiary/HealthDiary')
  }}
>
  Дневник здоровья
</Link>
```

### 3. Оптимизация изображений

```jsx
// Ленивая загрузка изображений
<img
  src={imageUrl}
  loading="lazy"
  alt="Description"
/>
```

### 4. Удаление неиспользуемых импортов

Используйте ESLint правило:
```json
{
  "rules": {
    "no-unused-vars": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### 5. Оптимизация библиотек

- Используйте tree shaking
- Импортируйте только нужные части
- Используйте динамические импорты для больших библиотек

---

## Метрики производительности

### Целевые показатели

- **Initial Bundle Size**: < 200 KB (gzipped)
- **Time to Interactive (TTI)**: < 3 секунды
- **First Contentful Paint (FCP)**: < 1.8 секунды
- **Largest Contentful Paint (LCP)**: < 2.5 секунды

### Измерение

```javascript
// Использование Performance API
const measurePerformance = () => {
  const perfData = performance.getEntriesByType('navigation')[0]
  console.log('Page Load Time:', perfData.loadEventEnd - perfData.fetchStart)
  console.log('DOM Content Loaded:', perfData.domContentLoadedEventEnd - perfData.fetchStart)
}
```

---

## Следующие шаги

1. ⏳ Добавить lazy loading для некритичных страниц
2. ⏳ Настроить manual chunks в Vite
3. ⏳ Установить и настроить bundle analyzer
4. ⏳ Оптимизировать импорты библиотек
5. ⏳ Добавить предзагрузку при наведении
6. ⏳ Измерить и сравнить метрики производительности

---

*Документ создан в рамках Этапа 3.3 рефакторинга*  
*Последнее обновление: Январь 2026*

