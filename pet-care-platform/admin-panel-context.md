# Контекст отладки React Админ-панели Питомец+

## Версия документа
- **Создан:** 27 декабря 2025
- **Последнее обновление:** 27 декабря 2025
- **Текущий этап:** 4 - Проверка и тестирование
- **Статус этапа 1:** ✅ Завершён
- **Статус этапа 2:** ✅ Завершён (см. admin-user-stories-flow.md)
- **Статус этапа 3:** ✅ Завершён (реализация выполнена)

---

## 1. Текущее состояние проекта

### 1.1 Архитектура системы авторизации

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   App.jsx                                                        │
│   └── /admin-panel/* → AdminRoute → AdminApp                     │
│                           │              │                       │
│                           ▼              ▼                       │
│                      authStore      adminStore                   │
│                           │              │                       │
│                           └──────┬───────┘                       │
│                                  ▼                               │
│                          localStorage                            │
│                         (access_token)                           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                    BACKEND (Django REST)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   /api/auth/login/     → JWT токены + user data                  │
│   /api/admin/*         → IsAdminUser permission (is_staff=True)  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Файлы админ-панели (ОБНОВЛЕНО)

```
frontend/src/admin/
├── App.jsx                    # Главный компонент (упрощён)
├── index.js                   # Экспорт компонентов
├── components/
│   ├── Auth/                  # 🆕 НОВОЕ - Аутентификация
│   │   ├── AdminLoginPage.jsx # Страница входа для админов
│   │   └── index.js           # Экспорт
│   ├── Layout/
│   │   ├── AdminLayout.jsx    # Основной layout с sidebar
│   │   ├── Sidebar.jsx        # Боковая навигация
│   │   └── Header.jsx         # Верхняя панель
│   ├── Dashboard/
│   │   ├── Dashboard.jsx      # Главный дашборд
│   │   ├── DashboardSelector.jsx # Выбор дашборда по ролям
│   │   └── MetricCard.jsx     # Карточки метрик
│   ├── Tables/                # Таблицы данных
│   ├── Charts/                # Графики Chart.js
│   ├── Analytics/             # Аналитика
│   ├── Forms/                 # Формы редактирования
│   └── Export/                # Экспорт данных
├── hooks/
│   ├── useAdminAuth.js        # Хук авторизации админа
│   ├── useAnalytics.js        # Хук аналитических данных
│   └── useDashboardData.js    # Хук данных дашборда
├── stores/
│   └── adminStore.js          # Zustand store для админки (обновлён)
└── utils/
    └── api.js                 # API клиент для /api/admin/

Изменённые файлы (вне admin/):
├── src/components/AdminRoute.jsx  # Обновлён - показывает AdminLoginPage
└── src/main.jsx                   # Обновлён - AppInitializer для загрузки профиля
```

### 1.3 Текущая логика авторизации

#### AdminRoute (frontend/src/components/AdminRoute.jsx)
1. Проверяет `loading` из authStore → показывает спиннер
2. Проверяет `isAuthenticated && token` → если нет, редирект на `/login`
3. Проверяет `user.is_staff || user.is_superuser` → если нет, показывает "Доступ запрещён"
4. Если всё ок → рендерит children (AdminApp)

#### AdminApp (frontend/src/admin/App.jsx)
1. Вызывает `adminStore.checkAuth()` при монтировании
2. Если `!isAuthenticated` → показывает сообщение с ссылкой на `/login`
3. Если авторизован → рендерит маршруты админки

#### adminStore.checkAuth()
1. Берёт токен из localStorage
2. Делает запрос к `/api/admin/stats/summary/`
3. Если успех → `isAuthenticated: true`
4. Если 401/403 → `isAuthenticated: false`

---

## 2. Выявленные проблемы

### 2.1 Критические проблемы

| # | Проблема | Влияние | Приоритет |
|---|----------|---------|-----------|
| 1 | **Нет страницы входа для админов** | Пользователь не понимает куда попал и что нужны права staff | 🔴 Высокий |
| 2 | **Неправильный redirect после входа** | После входа редирект на `/pets` вместо `/admin-panel` | 🔴 Высокий |
| 3 | **Двойная проверка авторизации** | AdminRoute и AdminApp проверяют отдельно, race condition | 🟡 Средний |
| 4 | **Отсутствует загрузка профиля при старте** | При refresh страницы user=null, права не проверяются | 🔴 Высокий |

### 2.2 UX проблемы

| # | Проблема | Описание |
|---|----------|----------|
| 1 | Непонятные сообщения | "Доступ запрещён" без объяснения причины |
| 2 | Нет визуального отличия | Страница входа в админку идентична обычной |
| 3 | Потеря контекста | Пользователь забывает откуда пришёл |
| 4 | Нет индикации роли | Не показано, что нужны права staff |

### 2.3 Технические проблемы

```javascript
// ПРОБЛЕМА 1: AdminRoute пропускает если user ещё не загружен
// frontend/src/components/AdminRoute.jsx:50-51
if (user && !user.is_staff && !user.is_superuser) {
  // Проверка только если user есть
  // Если user=null, проверка пропускается!
}

// ПРОБЛЕМА 2: Нет загрузки профиля при старте
// frontend/src/main.jsx - нет вызова validateToken() или loadProfile()

// ПРОБЛЕМА 3: AuthModal редиректит на /pets
// frontend/src/pages/Auth/AuthModal.jsx:155
const from = location.state?.from?.pathname || '/pets'
// Работает, но пользователь не видит сообщения о правах
```

---

## 3. Карта текущих маршрутов

### 3.1 Основные маршруты

| Путь | Компонент | Защита | Описание |
|------|-----------|--------|----------|
| `/` | Home | - | Главная страница |
| `/login` | AuthModal | - | Страница входа |
| `/register` | AuthModal | - | Страница регистрации |
| `/pets` | PetList | PrivateRoute | Список питомцев |
| `/shop` | Shop | - | Магазин |
| `/courses` | Courses | - | Курсы |
| `/profile` | Profile | PrivateRoute | Профиль пользователя |

### 3.2 Маршруты админ-панели

| Путь | Компонент | Защита | Описание |
|------|-----------|--------|----------|
| `/admin-panel` | DashboardSelector | AdminRoute | Главный дашборд |
| `/admin-panel/dashboard` | DashboardSelector | AdminRoute | Дашборд |
| `/admin-panel/analytics` | AnalyticsDashboard | AdminRoute | Аналитика |
| `/admin-panel/users` | UsersTable | AdminRoute | Управление пользователями |
| `/admin-panel/pets` | PetsTable | AdminRoute | Управление питомцами |
| `/admin-panel/products` | ProductsTable | AdminRoute | Управление товарами |
| `/admin-panel/orders` | OrdersTable | AdminRoute | Управление заказами |
| `/admin-panel/courses` | CoursesTable | AdminRoute | Управление курсами |

### 3.3 Отсутствующие маршруты ❌

| Путь | Описание | Статус |
|------|----------|--------|
| `/admin-panel/login` | Страница входа для админов | ❌ Отсутствует |
| `/admin-panel/logout` | Выход из админки | ❌ Отсутствует |

---

## 4. Backend API для админки

### 4.1 Аутентификация

| Метод | URL | Описание | Permission |
|-------|-----|----------|------------|
| POST | `/api/auth/login/` | Вход пользователя | AllowAny |
| POST | `/api/auth/logout/` | Выход | IsAuthenticated |
| GET | `/api/auth/refresh/` | Обновление токена | AllowAny |
| GET | `/api/users/profile/` | Профиль пользователя | IsAuthenticated |

### 4.2 Admin API

| Метод | URL | Описание | Permission |
|-------|-----|----------|------------|
| GET | `/api/admin/stats/summary/` | Быстрая статистика | IsAdminUser |
| GET | `/api/admin/analytics/*` | Аналитика | IsAdminUser |
| GET/POST/PATCH/DELETE | `/api/admin/users/` | CRUD пользователей | IsAdminUser |
| GET/POST/PATCH/DELETE | `/api/admin/products/` | CRUD товаров | IsAdminUser |
| GET/POST/PATCH/DELETE | `/api/admin/orders/` | CRUD заказов | IsAdminUser |
| GET/POST/PATCH/DELETE | `/api/admin/courses/` | CRUD курсов | IsAdminUser |

---

## 5. План исправлений (для Этапа 3)

### 5.1 Создать страницу входа для админов

```javascript
// frontend/src/admin/components/Auth/AdminLoginPage.jsx
// - Специальный дизайн для админки
// - Проверка is_staff после входа
// - Понятные сообщения об ошибках
```

### 5.2 Обновить AdminRoute

```javascript
// Улучшенная логика:
// 1. Если не авторизован → показать AdminLoginPage (не редирект)
// 2. Если авторизован, но user не загружен → загрузить профиль
// 3. Если user загружен, но не staff → показать "Нет прав" с объяснением
// 4. Если staff → пропустить в админку
```

### 5.3 Добавить загрузку профиля при старте

```javascript
// frontend/src/main.jsx или App.jsx
// При наличии токена - загрузить профиль пользователя
// Это нужно для корректной проверки is_staff
```

---

## 6. Следующие шаги

### Этап 2: User Story и User Flow ✅ ЗАВЕРШЁН
- [x] Определить роли пользователей (Superuser, Staff, Manager)
- [x] Описать сценарии использования
- [x] Создать User Story с критериями INVEST
- [x] Создать файл `admin-user-stories-flow.md`

### Этап 3: Реализация ✅ ЗАВЕРШЁН
- [x] Создать AdminLoginPage — `frontend/src/admin/components/Auth/AdminLoginPage.jsx`
- [x] Обновить AdminRoute — показывает AdminLoginPage вместо редиректа
- [x] Добавить загрузку профиля при старте — `main.jsx` с AppInitializer
- [x] Настроить redirect логику — сохранение исходного URL
- [x] Интеграция всех компонентов — AdminApp упрощён

### Этап 4: Проверка 🔄 В РАБОТЕ
- [ ] Запуск frontend и backend серверов
- [ ] Тестирование сценария входа без токена
- [ ] Тестирование входа с правами staff
- [ ] Тестирование входа без прав staff
- [ ] Проверка обработки ошибок (401, 403)
- [ ] Тестирование выхода из системы

---

## 7. Технические детали

### 7.1 Порты

| Сервис | Порт |
|--------|------|
| Frontend (Vite) | 5199 |
| Backend (Django) | 8077 |

### 7.2 Токены

```javascript
// Хранение в localStorage:
localStorage.getItem('access_token')  // JWT access token
localStorage.getItem('refresh_token') // JWT refresh token

// Формат заголовка:
Authorization: Bearer <access_token>
```

### 7.3 Структура user объекта

```javascript
{
  id: "uuid-v7",
  email: "user@example.com",
  first_name: "Имя",
  last_name: "Фамилия",
  is_staff: true,      // Доступ к React Admin
  is_superuser: true,  // Доступ к Django Admin + React Admin
  is_active: true,
  created_at: "2025-01-01T00:00:00Z"
}
```

---

## 8. Ссылки на файлы

### Ключевые файлы для изменений:
- `frontend/src/components/AdminRoute.jsx` - защита маршрутов
- `frontend/src/admin/App.jsx` - главный компонент админки
- `frontend/src/admin/stores/adminStore.js` - состояние админки
- `frontend/src/store/authStore.js` - состояние авторизации
- `frontend/src/App.jsx` - маршрутизация

### Документация:
- `PROJECT_STRUCTURE.md` - структура проекта
- `admin-redesign-context.md` - контекст редизайна админки

