# Документация по типизации компонентов

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 3.4 - Исправление проблем с типизацией

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [PropTypes](#proptypes)
3. [Общие типы](#общие-типы)
4. [Использование](#использование)
5. [Рекомендации](#рекомендации)
6. [Миграция на TypeScript](#миграция-на-typescript)

---

## Обзор

Типизация компонентов обеспечивает:
- Валидацию props во время разработки
- Документирование интерфейсов компонентов
- Раннее обнаружение ошибок
- Улучшение автодополнения в IDE
- Повышение надежности кода

В проекте используется **PropTypes** для валидации props React компонентов.

---

## PropTypes

### Установка

```bash
npm install prop-types
```

### Базовое использование

```jsx
import PropTypes from 'prop-types'

function MyComponent({ name, age, isActive }) {
  // ...
}

MyComponent.propTypes = {
  name: PropTypes.string.isRequired,
  age: PropTypes.number,
  isActive: PropTypes.bool,
}
```

### Основные типы

```jsx
PropTypes.string          // Строка
PropTypes.number          // Число
PropTypes.bool            // Булево значение
PropTypes.array           // Массив
PropTypes.object          // Объект
PropTypes.func            // Функция
PropTypes.node            // React node (любой рендеримый элемент)
PropTypes.element         // React элемент
PropTypes.instanceOf(Date) // Экземпляр класса
PropTypes.oneOf(['a', 'b']) // Одно из значений
PropTypes.oneOfType([PropTypes.string, PropTypes.number]) // Один из типов
PropTypes.arrayOf(PropTypes.string) // Массив строк
PropTypes.shape({ name: PropTypes.string }) // Объект с определенной структурой
PropTypes.exact({ name: PropTypes.string }) // Точное соответствие структуре
```

---

## Общие типы

### Файл `frontend/src/utils/propTypes.js`

Содержит переиспользуемые типы для часто используемых структур данных:

#### UserPropTypes
```jsx
import { UserPropTypes } from '../utils/propTypes'

UserPropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  email: PropTypes.string.isRequired,
  first_name: PropTypes.string,
  // ...
})
```

#### PetPropTypes
```jsx
import { PetPropTypes } from '../utils/propTypes'

PetPropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  name: PropTypes.string.isRequired,
  species: PropTypes.oneOf(['dog', 'cat', 'bird', 'other']).isRequired,
  // ...
})
```

#### ProductPropTypes
```jsx
import { ProductPropTypes } from '../utils/propTypes'

ProductPropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  name: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  // ...
})
```

#### CoursePropTypes
```jsx
import { CoursePropTypes } from '../utils/propTypes'

CoursePropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  title: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  // ...
})
```

#### Другие типы
- `CartItemPropTypes` - Элемент корзины
- `OrderPropTypes` - Заказ
- `ReviewPropTypes` - Отзыв
- `PaginationPropTypes` - Пагинация
- `FiltersPropTypes` - Фильтры
- `ApiResponsePropTypes` - API ответ
- `EventHandlerPropTypes` - Обработчик событий
- `ChildrenPropTypes` - Дочерние элементы
- `ClassNamePropTypes` - CSS классы
- `StylePropTypes` - Стили

---

## Использование

### Пример 1: Компонент карточки

```jsx
import PropTypes from 'prop-types'
import { ProductPropTypes } from '../utils/propTypes'

function ProductCard({ product, onAddToCart, isLoading = false }) {
  // ...
}

ProductCard.propTypes = {
  product: ProductPropTypes.isRequired,
  onAddToCart: PropTypes.func,
  isLoading: PropTypes.bool,
}
```

### Пример 2: Компонент с вложенными типами

```jsx
import PropTypes from 'prop-types'
import { CoursePropTypes, UserPropTypes } from '../utils/propTypes'

function CourseDetail({ course, instructor, onEnroll }) {
  // ...
}

CourseDetail.propTypes = {
  course: CoursePropTypes.isRequired,
  instructor: UserPropTypes,
  onEnroll: PropTypes.func.isRequired,
}
```

### Пример 3: Компонент с массивом

```jsx
import PropTypes from 'prop-types'
import { PetPropTypes } from '../utils/propTypes'

function PetList({ pets, onSelect }) {
  // ...
}

PetList.propTypes = {
  pets: PropTypes.arrayOf(PetPropTypes).isRequired,
  onSelect: PropTypes.func,
}
```

### Пример 4: Компонент с одним из значений

```jsx
import PropTypes from 'prop-types'

function Button({ variant, size, children }) {
  // ...
}

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  children: PropTypes.node.isRequired,
}
```

---

## Рекомендации

### 1. Всегда добавляйте PropTypes

```jsx
// ✅ Хорошо
function MyComponent({ name, age }) {
  // ...
}

MyComponent.propTypes = {
  name: PropTypes.string.isRequired,
  age: PropTypes.number,
}

// ❌ Плохо
function MyComponent({ name, age }) {
  // Нет PropTypes
}
```

### 2. Используйте isRequired для обязательных props

```jsx
// ✅ Хорошо
MyComponent.propTypes = {
  id: PropTypes.string.isRequired, // Обязательный
  name: PropTypes.string, // Опциональный
}

// ❌ Плохо
MyComponent.propTypes = {
  id: PropTypes.string, // Должен быть isRequired
}
```

### 3. Используйте значения по умолчанию

```jsx
// ✅ Хорошо
function MyComponent({ size = 'md', isActive = false }) {
  // ...
}

MyComponent.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  isActive: PropTypes.bool,
}

// ❌ Плохо
function MyComponent({ size, isActive }) {
  // Нет значений по умолчанию
}
```

### 4. Используйте общие типы из propTypes.js

```jsx
// ✅ Хорошо
import { ProductPropTypes } from '../utils/propTypes'

ProductCard.propTypes = {
  product: ProductPropTypes.isRequired,
}

// ❌ Плохо
ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    // ... дублирование кода
  }).isRequired,
}
```

### 5. Документируйте сложные типы

```jsx
/**
 * Компонент формы
 * 
 * @param {Object} formData - Данные формы
 * @param {Function} onSubmit - Обработчик отправки
 * @param {Object} validation - Правила валидации
 */
function Form({ formData, onSubmit, validation }) {
  // ...
}

Form.propTypes = {
  formData: PropTypes.object.isRequired,
  onSubmit: PropTypes.func.isRequired,
  validation: PropTypes.shape({
    required: PropTypes.arrayOf(PropTypes.string),
    rules: PropTypes.object,
  }),
}
```

### 6. Проверяйте типы в development

PropTypes проверяются только в режиме разработки. В production они не выполняются для оптимизации производительности.

---

## Миграция на TypeScript

### Текущее состояние

Проект использует **PropTypes** для валидации props. В будущем возможна миграция на **TypeScript** для более строгой типизации.

### Преимущества TypeScript

1. **Статическая типизация** - проверка типов на этапе компиляции
2. **Автодополнение** - улучшенная поддержка IDE
3. **Рефакторинг** - безопасное переименование и изменение типов
4. **Документация** - типы служат документацией
5. **Ошибки на этапе разработки** - раннее обнаружение проблем

### План миграции (будущее)

1. **Этап 1**: Настройка TypeScript в проекте
   - Установка `typescript`, `@types/react`, `@types/react-dom`
   - Настройка `tsconfig.json`
   - Обновление `vite.config.js` для поддержки TypeScript

2. **Этап 2**: Постепенная миграция
   - Переименование `.jsx` → `.tsx` для новых компонентов
   - Добавление типов для существующих компонентов
   - Создание файлов типов (`types/`)

3. **Этап 3**: Полная миграция
   - Конвертация всех компонентов
   - Типизация stores (Zustand)
   - Типизация API клиента
   - Типизация утилит

### Пример TypeScript компонента

```typescript
import React from 'react'

interface ProductCardProps {
  product: {
    id: string | number
    name: string
    price: number
    images?: string[]
  }
  onAddToCart?: (product: Product, quantity: number) => void
  isLoading?: boolean
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  isLoading = false
}) => {
  // ...
}
```

---

## Компоненты с PropTypes

### ✅ Реализовано

- `CourseCard` - Карточка курса
- `ProductCard` - Карточка товара
- `PetCard` - Карточка питомца
- `Loader` - Компонент загрузки
- `Rating` - Компонент рейтинга
- `FavoriteButton` - Кнопка избранного

### ⏳ В процессе

- Остальные компоненты будут типизированы по мере необходимости

---

## Проверка типов

### В режиме разработки

PropTypes автоматически проверяются в режиме разработки. Ошибки отображаются в консоли браузера.

### ESLint правила

Рекомендуется добавить ESLint правило для проверки использования PropTypes:

```json
{
  "rules": {
    "react/prop-types": "warn"
  }
}
```

---

## Следующие шаги

1. ✅ Создан файл `frontend/src/utils/propTypes.js` с общими типами
2. ✅ Добавлены PropTypes в ключевые компоненты
3. ✅ Установлен пакет `prop-types`
4. ✅ Создана документация `docs/TYPING.md`
5. ⏳ Добавить PropTypes в остальные компоненты по мере необходимости
6. ⏳ Рассмотреть миграцию на TypeScript в будущем

---

*Документ создан в рамках Этапа 3.4 рефакторинга*  
*Последнее обновление: Январь 2026*

