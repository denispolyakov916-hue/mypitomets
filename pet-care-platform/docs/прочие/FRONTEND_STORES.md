# Документация по Zustand Stores

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 3.1 - Рефакторинг системы состояний

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Структура stores](#структура-stores)
3. [Базовые утилиты](#базовые-утилиты)
4. [Описание stores](#описание-stores)
5. [Паттерны использования](#паттерны-использования)
6. [Рекомендации](#рекомендации)

---

## Обзор

Zustand stores используются для управления глобальным состоянием приложения. Все stores следуют единой структуре и используют общие паттерны для обработки ошибок и состояний загрузки.

### Принципы

1. **Единообразие**: Все stores следуют единой структуре
2. **Обработка ошибок**: Стандартизированная обработка ошибок через `baseStore`
3. **Состояния загрузки**: Единый подход к `isLoading` и `error`
4. **Документация**: Все stores хорошо документированы
5. **Типизация**: Использование JSDoc для описания типов

---

## Структура stores

### Расположение

```
frontend/src/store/
├── baseStore.js          # Базовые утилиты для всех stores
├── authStore.js          # Аутентификация
├── cartStore.js          # Корзина покупок
├── favoritesStore.js     # Избранное
├── petStore.js           # Питомцы
├── toastStore.js         # Уведомления
└── index.js              # Центральный экспорт
```

### Базовая структура store

```javascript
import { create } from 'zustand'
import { createBaseState, handleStoreError, createAsyncAction } from './baseStore'

export const useMyStore = create((set, get) => ({
  // Начальное состояние
  ...createBaseState({
    // Специфичные поля store
  }),
  
  // Синхронные действия
  clearError: () => set({ error: null }),
  
  // Асинхронные действия
  loadData: createAsyncAction(
    async () => {
      // Логика загрузки
    },
    set,
    'Не удалось загрузить данные'
  ),
}))
```

---

## Базовые утилиты

### baseStore.js

Файл `baseStore.js` предоставляет общие утилиты для всех stores:

#### createBaseState(initialState)

Создает стандартную структуру состояния с `isLoading` и `error`.

```javascript
const state = createBaseState({
  items: [],
  total: 0,
})
// Результат: { isLoading: false, error: null, items: [], total: 0 }
```

#### handleStoreError(error, setState, defaultMessage)

Обрабатывает ошибки из API и устанавливает состояние ошибки.

```javascript
try {
  await api.call()
} catch (error) {
  handleStoreError(error, set, 'Не удалось выполнить операцию')
}
```

#### createAsyncAction(asyncAction, setState, errorMessage)

Создает обертку для async действий с автоматической обработкой загрузки и ошибок.

```javascript
loadData: createAsyncAction(
  async () => {
    const response = await api.getData()
    return response.data
  },
  set,
  'Не удалось загрузить данные'
)
```

---

## Описание stores

### authStore

**Назначение**: Управление аутентификацией пользователя

**Состояние**:
- `user` - Объект пользователя или null
- `isAuthenticated` - Флаг аутентификации
- `isLoading` - Состояние загрузки
- `error` - Сообщение об ошибке
- `tokenValidationInterval` - Интервал проверки токена

**Действия**:
- `login(email, password)` - Вход пользователя
- `register(email, password, passwordConfirm, firstName, lastName)` - Регистрация
- `activateByCode(code)` - Активация аккаунта
- `logout()` - Выход
- `setUser(user)` - Обновление данных пользователя
- `clearError()` - Очистка ошибки
- `validateToken()` - Проверка токена
- `loadProfile()` - Загрузка профиля
- `startTokenValidation()` - Запуск периодической проверки
- `stopTokenValidation()` - Остановка проверки
- `forceLogout()` - Принудительный выход

**Особенности**:
- Автоматическая проверка токена каждые 5 минут
- Восстановление состояния из localStorage
- Обработка истекших токенов

**Использование**:
```javascript
import { useAuthStore } from './store'

const { user, isAuthenticated, login, logout } = useAuthStore()
```

---

### cartStore

**Назначение**: Управление корзиной покупок

**Состояние**:
- `items` - Массив элементов корзины
- `total` - Общая сумма
- `itemsCount` - Количество товаров
- `selectedItems` - Set с ID выбранных элементов
- `isLoading` - Состояние загрузки
- `error` - Сообщение об ошибке

**Действия**:
- `loadCart()` - Загрузка корзины из API
- `addItem(productId, quantity)` - Добавление товара
- `addCourse(courseId, petId, disclaimerAccepted)` - Добавление курса
- `updateQuantity(productId, quantity)` - Обновление количества
- `removeItem(productId)` - Удаление товара
- `removeCourse(courseId)` - Удаление курса
- `clearCart()` - Очистка корзины
- `checkout(shippingAddress)` - Оформление заказа
- `refreshCart()` - Обновление корзины
- `refreshCount()` - Обновление только количества
- `toggleItemSelection(itemId)` - Переключение выбора
- `selectAllItems()` - Выбрать все
- `deselectAllItems()` - Снять выбор
- `getSelectedTotal()` - Сумма выбранных
- `getItemInCart(productId)` - Проверка наличия товара
- `getCourseInCart(courseId)` - Проверка наличия курса
- `removeSelectedItems()` - Удаление выбранных

**Особенности**:
- Автоматическое обновление каждые 60 секунд
- Поддержка товаров и курсов
- Сохранение порядка элементов
- Синхронизация с API

**Использование**:
```javascript
import { useCartStore } from './store'

const { items, total, addItem, loadCart } = useCartStore()
```

---

### favoritesStore

**Назначение**: Управление избранным

**Состояние**:
- `products` - Массив ID товаров
- `courses` - Массив ID курсов
- `isSyncing` - Состояние синхронизации
- `lastSyncedAt` - Время последней синхронизации

**Действия**:
- `addProduct(productId)` - Добавить товар
- `removeProduct(productId)` - Удалить товар
- `toggleProduct(productId)` - Переключить товар
- `isProductFavorite(productId)` - Проверить товар
- `addCourse(courseId)` - Добавить курс
- `removeCourse(courseId)` - Удалить курс
- `toggleCourse(courseId)` - Переключить курс
- `isCourseFavorite(courseId)` - Проверить курс
- `getTotalCount()` - Общее количество
- `clearAll()` - Очистить всё
- `clearProducts()` - Очистить товары
- `clearCourses()` - Очистить курсы

**Особенности**:
- Сохранение в localStorage через persist middleware
- Синхронизация с API (планируется)

**Использование**:
```javascript
import { useFavoritesStore } from './store'

const { products, addProduct, isProductFavorite } = useFavoritesStore()
```

---

### toastStore

**Назначение**: Управление уведомлениями

**Состояние**:
- `toasts` - Массив уведомлений

**Действия**:
- `showToast(message, type, duration)` - Показать уведомление
- `removeToast(id)` - Удалить уведомление
- `success(message, duration)` - Успех
- `error(message, duration)` - Ошибка
- `warning(message, duration)` - Предупреждение
- `info(message, duration)` - Информация

**Типы уведомлений**:
- `success` - Успешная операция
- `error` - Ошибка
- `warning` - Предупреждение
- `info` - Информация

**Использование**:
```javascript
import { useToastStore } from './store'

const { success, error } = useToastStore.getState()
success('Операция выполнена успешно')
error('Произошла ошибка')
```

---

### petStore

**Назначение**: Управление данными питомцев

**Статус**: В разработке

**Планируемый функционал**:
- Кэширование данных питомцев
- Синхронизация с API
- Оптимистичные обновления

---

### adminStore

**Назначение**: Управление состоянием админ-панели

**Расположение**: `frontend/src/admin/stores/adminStore.js`

**Состояние**:
- `isAuthenticated` - Флаг аутентификации админа
- `user` - Данные пользователя
- `role` - Роль (superuser, staff, null)
- `loading` - Состояние загрузки
- `error` - Сообщение об ошибке

**Действия**:
- `checkAuth()` - Проверка аутентификации
- `setUser(user)` - Установка пользователя
- `logout()` - Выход

**Особенности**:
- Использует токены из основного authStore
- Проверка прав доступа через API

---

## Паттерны использования

### Подписка на изменения

```javascript
import { useAuthStore } from './store'

function MyComponent() {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  // Компонент будет перерендериваться только при изменении user или isAuthenticated
}
```

### Использование действий

```javascript
import { useAuthStore } from './store'

function LoginForm() {
  const login = useAuthStore((state) => state.login)
  const isLoading = useAuthStore((state) => state.isLoading)
  const error = useAuthStore((state) => state.error)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    const success = await login(email, password)
    if (success) {
      // Перенаправление
    }
  }
}
```

### Обработка ошибок

```javascript
import { useCartStore } from './store'
import { useToastStore } from './store'

function AddToCartButton({ productId }) {
  const addItem = useCartStore((state) => state.addItem)
  const error = useCartStore((state) => state.error)
  const { error: showError } = useToastStore.getState()
  
  const handleAdd = async () => {
    const success = await addItem(productId)
    if (!success && error) {
      showError(error)
    }
  }
}
```

---

## Рекомендации

### 1. Использование селекторов

Всегда используйте селекторы для подписки на изменения:

```javascript
// ✅ Хорошо - подписка только на нужные поля
const user = useAuthStore((state) => state.user)

// ❌ Плохо - подписка на весь store
const { user } = useAuthStore()
```

### 2. Обработка ошибок

Всегда обрабатывайте ошибки из stores:

```javascript
const { addItem, error, clearError } = useCartStore()

useEffect(() => {
  if (error) {
    showToast(error, 'error')
    clearError()
  }
}, [error])
```

### 3. Очистка ресурсов

Очищайте интервалы и подписки при размонтировании:

```javascript
useEffect(() => {
  const interval = setInterval(() => {
    refreshCart()
  }, 60000)
  
  return () => clearInterval(interval)
}, [])
```

### 4. Оптимистичные обновления

Используйте оптимистичные обновления для лучшего UX:

```javascript
const addItem = async (productId) => {
  // Оптимистичное обновление
  set({ items: [...items, newItem] })
  
  try {
    await api.addToCart(productId)
  } catch (error) {
    // Откат при ошибке
    set({ items: previousItems })
  }
}
```

---

## Следующие шаги

1. ⏳ Рефакторинг cartStore для устранения дублирования
2. ⏳ Добавление синхронизации favoritesStore с API
3. ⏳ Реализация petStore
4. ⏳ Добавление TypeScript типов (опционально)
5. ⏳ Создание тестов для stores

---

*Документ создан в рамках Этапа 3.1 рефакторинга*  
*Последнее обновление: Январь 2026*

