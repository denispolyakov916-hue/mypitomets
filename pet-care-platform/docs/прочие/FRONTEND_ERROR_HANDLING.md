# Документация по обработке ошибок на фронтенде

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 3.2 - Добавление обработки ошибок во всех компонентах

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [ErrorBoundary](#errorboundary)
3. [Утилиты обработки ошибок](#утилиты-обработки-ошибок)
4. [Retry логика](#retry-логика)
5. [Обработка ошибок в компонентах](#обработка-ошибок-в-компонентах)
6. [Обработка ошибок в API клиенте](#обработка-ошибок-в-api-клиенте)
7. [Рекомендации](#рекомендации)

---

## Обзор

Система обработки ошибок на фронтенде обеспечивает:
- Перехват ошибок рендеринга через ErrorBoundary
- Стандартизированную обработку ошибок API
- Автоматические повторные попытки при сетевых ошибках
- Понятные сообщения для пользователей
- Логирование ошибок в dev режиме

---

## ErrorBoundary

### Расположение

`frontend/src/components/ErrorBoundary.jsx`

### Использование

ErrorBoundary используется в корне приложения (`main.jsx`) для перехвата всех ошибок рендеринга:

```jsx
<ErrorBoundary>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</ErrorBoundary>
```

### Функциональность

- Перехватывает ошибки рендеринга в дочерних компонентах
- Отображает fallback UI вместо белого экрана
- Показывает детали ошибки в dev режиме
- Предоставляет кнопки для повторной попытки или возврата на главную
- Готов к интеграции с системами мониторинга (Sentry, LogRocket)

### Пример использования

```jsx
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  )
}
```

---

## Утилиты обработки ошибок

### Расположение

`frontend/src/utils/errorHandler.js`

### Функции

#### getErrorMessage(error)

Извлекает сообщение об ошибке из разных форматов ответа API.

```javascript
import { getErrorMessage } from '../utils/errorHandler'

try {
  await api.call()
} catch (error) {
  const message = getErrorMessage(error)
  console.error(message)
}
```

**Поддерживаемые форматы**:
- `{ error: "message" }`
- `{ message: "message" }`
- `{ detail: "message" }`
- `{ errors: { field: ["message"] } }`
- Сетевые ошибки
- Статус коды ошибок

#### logError(error, context)

Логирует ошибку в консоль (только в dev режиме).

```javascript
import { logError } from '../utils/errorHandler'

try {
  await api.call()
} catch (error) {
  logError(error, 'ProductDetail')
}
```

#### handleError(error, context, showToast)

Обрабатывает ошибку: логирует и показывает уведомление.

```javascript
import { handleError } from '../utils/errorHandler'

try {
  await api.call()
} catch (error) {
  handleError(error, 'ProductDetail', true)
}
```

#### Проверочные функции

```javascript
import {
  isNetworkError,
  isAuthError,
  isForbiddenError,
  isValidationError
} from '../utils/errorHandler'

if (isNetworkError(error)) {
  // Обработка сетевой ошибки
}

if (isAuthError(error)) {
  // Обработка ошибки авторизации
}
```

---

## Retry логика

### Расположение

`frontend/src/utils/retry.js`

### Использование

#### retry(fn, options)

Выполняет функцию с повторными попытками при ошибках.

```javascript
import { retry } from '../utils/retry'

const result = await retry(
  () => api.get('/products/'),
  {
    maxRetries: 3,
    delay: 1000,
    shouldRetry: (error) => {
      // Повторяем только для сетевых ошибок
      return !error?.response
    }
  }
)
```

**Опции**:
- `maxRetries` - Максимальное количество попыток (по умолчанию 3)
- `delay` - Задержка между попытками в мс (по умолчанию 1000)
- `shouldRetry` - Функция для определения, нужно ли повторять
- `onRetry` - Callback при каждой попытке

#### retryRequest(axiosRequest, retryOptions)

Создает обертку для axios запросов с retry логикой.

```javascript
import { retryRequest } from '../utils/retry'
import api from '../api/client'

const response = await retryRequest(
  () => api.get('/products/'),
  { maxRetries: 3 }
)
```

#### shouldRetryRequest(error)

Проверяет, нужно ли повторять запрос для данной ошибки.

**Повторяет для**:
- Сетевых ошибок
- Серверных ошибок (5xx)
- 429 Too Many Requests
- 408 Request Timeout

---

## Обработка ошибок в компонентах

### Паттерн обработки ошибок

```jsx
import { useState, useEffect } from 'react'
import { handleError } from '../utils/errorHandler'
import { useToastStore } from '../store/toastStore'
import * as api from '../api/products'

function ProductDetail({ id }) {
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { error: showError } = useToastStore.getState()

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.getProduct(id)
      setProduct(response.product)
    } catch (err) {
      const message = handleError(err, 'ProductDetail', false)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <Loader />
  if (error) return <ErrorMessage message={error} />
  
  return <ProductView product={product} />
}
```

### Компонент для отображения ошибок

```jsx
function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-container">
      <p className="error-message">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Попробовать снова
        </button>
      )}
    </div>
  )
}
```

---

## Обработка ошибок в API клиенте

### Расположение

`frontend/src/api/client.js`

### Текущая обработка

API клиент уже обрабатывает:
- Сетевые ошибки
- 401 ошибки (автоматическое обновление токена)
- Извлечение сообщений об ошибках

### Улучшения

Можно добавить retry логику для сетевых ошибок:

```javascript
import { retryRequest, shouldRetryRequest } from '../utils/retry'

// В интерцепторе ответов
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    // Если это сетевая ошибка и нужно повторить
    if (shouldRetryRequest(error) && !error.config._retry) {
      error.config._retry = true
      return retryRequest(() => api(error.config), {
        maxRetries: 2,
        delay: 1000
      })
    }
    
    // Остальная обработка ошибок
    // ...
  }
)
```

---

## Рекомендации

### 1. Всегда обрабатывайте ошибки

```jsx
// ✅ Хорошо
try {
  await api.call()
} catch (error) {
  handleError(error, 'ComponentName')
}

// ❌ Плохо
await api.call() // Ошибка не обработана
```

### 2. Используйте ErrorBoundary для критических компонентов

```jsx
<ErrorBoundary>
  <CriticalComponent />
</ErrorBoundary>
```

### 3. Показывайте понятные сообщения

```jsx
// ✅ Хорошо
const message = getErrorMessage(error)
showError(message)

// ❌ Плохо
showError('Error') // Неинформативно
```

### 4. Логируйте ошибки в dev режиме

```jsx
if (process.env.NODE_ENV === 'development') {
  console.error('Error:', error)
}
```

### 5. Используйте retry для сетевых ошибок

```jsx
const result = await retry(
  () => api.get('/data/'),
  { maxRetries: 3 }
)
```

### 6. Обрабатывайте разные типы ошибок по-разному

```jsx
if (isNetworkError(error)) {
  // Показать сообщение о проблеме с сетью
} else if (isAuthError(error)) {
  // Перенаправить на страницу входа
} else if (isValidationError(error)) {
  // Показать ошибки валидации
}
```

---

## Следующие шаги

1. ⏳ Добавить retry логику в API клиент
2. ⏳ Создать компонент ErrorMessage для переиспользования
3. ⏳ Добавить ErrorBoundary в критические места
4. ⏳ Интегрировать с системой мониторинга (Sentry)
5. ⏳ Добавить обработку ошибок во все компоненты

---

*Документ создан в рамках Этапа 3.2 рефакторинга*  
*Последнее обновление: Январь 2026*

