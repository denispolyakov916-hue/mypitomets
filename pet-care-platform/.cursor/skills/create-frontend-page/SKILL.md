---
name: create-frontend-page
description: Создание новой страницы на React фронтенде с роутингом, API модулем, Zustand store и хуками. Используется когда пользователь просит добавить новую страницу, экран, раздел или фичу на фронтенде.
---

# Создание новой страницы на фронтенде

## Воркфлоу

```
- [ ] Шаг 1: Создать API модуль (если нужен новый)
- [ ] Шаг 2: Создать Zustand store (если нужен)
- [ ] Шаг 3: Создать кастомный хук (если сложная логика)
- [ ] Шаг 4: Создать компонент страницы
- [ ] Шаг 5: Добавить роут в App.jsx
```

## Шаг 1: API модуль

Если для страницы нужны новые API вызовы, создать `frontend/src/api/{feature}.js`:

```javascript
import apiClient from './client';

export const featureApi = {
  getAll: () => apiClient.get('/feature/'),
  getById: (id) => apiClient.get(`/feature/${id}/`),
  create: (data) => apiClient.post('/feature/', data),
  update: (id, data) => apiClient.patch(`/feature/${id}/`, data),
  delete: (id) => apiClient.delete(`/feature/${id}/`),
};
```

Зарегистрировать в `src/api/index.js`:

```javascript
export { featureApi } from './feature';
```

## Шаг 2: Zustand Store

Создать `frontend/src/store/{feature}Store.js` если нужно глобальное состояние:

```javascript
import { create } from 'zustand';
import { featureApi } from '../api';

export const useFeatureStore = create((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  loadItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await featureApi.getAll();
      set({ items: response.data.data, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  reset: () => set({ items: [], isLoading: false, error: null }),
}));
```

## Шаг 3: Кастомный хук

Создать `frontend/src/hooks/use{Feature}.js` если сложная логика загрузки/фильтрации:

```javascript
import { useState, useEffect, useCallback } from 'react';
import { featureApi } from '../api';

export const useFeature = (initialFilters = {}) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (filters) => {
    setIsLoading(true);
    try {
      const response = await featureApi.getAll(filters);
      setData(response.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(initialFilters);
  }, []);

  return { data, isLoading, error, refetch: fetchData };
};
```

## Шаг 4: Компонент страницы

Создать `frontend/src/pages/{Feature}/{Feature}.jsx`:

```javascript
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

const FeaturePage = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Загрузка данных
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 py-8"
    >
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Заголовок страницы
      </h1>

      {/* Контент */}
    </motion.div>
  );
};

export default FeaturePage;
```

## Шаг 5: Роутинг

В `frontend/src/App.jsx` добавить:

```javascript
const FeaturePage = lazy(() => import('./pages/Feature/Feature'));

// Публичная страница:
<Route path="/feature" element={<FeaturePage />} />

// Защищённая (нужна авторизация):
<Route path="/feature" element={<PrivateRoute><FeaturePage /></PrivateRoute>} />

// Админская (нужен is_staff):
<Route path="/admin-panel/feature" element={<AdminRoute><FeaturePage /></AdminRoute>} />
```

## Паттерны UI

- **Tailwind классы**: `max-w-7xl mx-auto px-4 py-8` для контейнера
- **Цвета**: `primary-500` (purple), `secondary-500` (green), `accent-500` (orange)
- **Анимации**: `motion.div` с `initial/animate` для появления
- **Загрузка**: Spinner или skeleton, `min-h-[50vh]` для центрирования
- **Тосты**: `useToastStore().addToast({ type: 'success', message: '...' })`
- **Иконки**: `import { IconName } from 'lucide-react'`
