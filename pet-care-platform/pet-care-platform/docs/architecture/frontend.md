# Frontend Architecture

Дата ревизии: 2026-06-30

## Назначение

Этот документ описывает текущую frontend-архитектуру Питомец+. Он нужен разработчикам, тестировщикам и техническим лидам для навигации по React-приложению.

## Технологии

| Область | Технология |
|---------|------------|
| UI | React 18 |
| Сборка | Vite 5 |
| Роутинг | React Router 6 |
| Состояние | Zustand |
| HTTP | Axios |
| Стили | Tailwind CSS + локальные CSS-файлы |
| Иконки | lucide-react |
| Анимации | framer-motion |
| Графики | Chart.js, react-chartjs-2, D3 |
| Rich text | TipTap |
| Тесты | Vitest, Testing Library |

## Расположение

Frontend находится в:

```text
frontend/
  src/
    admin/
    api/
    components/
    constants/
    data/
    hooks/
    nav/
    pages/
    store/
    styles/
    test/
    utils/
    Страницы/
```

## Запуск и сборка

Команды:

```bash
cd frontend
npm run dev
npm run build
npm run preview
npm run lint
npm run test:run
```

Dev-сервер Vite слушает порт `5199`. Прокси `/api/*` направляет запросы на backend, по умолчанию `http://localhost:8077`.

Настройка прокси находится в `frontend/vite.config.js`.

## Корневой роутинг

Главный файл маршрутизации:

```text
frontend/src/App.jsx
```

Основные группы маршрутов:

| Группа | Примеры | Доступ |
|--------|---------|--------|
| Публичные страницы | `/`, `/landing`, `/shop`, `/courses`, `/breeds` | Без входа |
| Auth | `/login`, `/register`, `/activate`, `/forgot-password`, `/reset-password` | Без входа |
| Анонимная воронка | `/start`, `/pet-quiz`, `/pet-quiz/loading`, `/recommendations` | Без входа |
| Пользовательские разделы | `/pet-id`, `/cart`, `/checkout`, `/orders`, `/profile`, `/health-diary` | Через `PrivateRoute` |
| Оплата | `/payment` | Требует авторизации по логике страницы |
| React админка | `/admin-panel/*` | Через `AdminRoute` |
| Внутренняя витрина | `/brand-kit` | Публичный dev-route |

## Layout

Общий каркас сайта:

```text
frontend/src/components/Layout.jsx
```

Он подключает:

- основной `Navbar`;
- мобильные элементы навигации;
- `Footer`;
- toast-уведомления;
- виджет поддержки;
- общий контейнер страницы.

React админ-панель использует отдельный layout:

```text
frontend/src/admin/components/Layout/AdminLayout.jsx
```

## Защищенные маршруты

| Компонент | Назначение |
|-----------|------------|
| `PrivateRoute` | Проверяет авторизацию для пользовательских страниц. |
| `AdminRoute` | Проверяет доступ к `/admin-panel/*`. |

`AdminRoute` считает доступ разрешенным, если пользователь:

- `is_staff`;
- `is_superuser`;
- или `role === 'course_creator'`.

Важно: backend admin API в основном использует `IsAdminUser`, но часть курсовых endpoint-ов поддерживает `course_creator`. Поэтому доступ course creator нужно проверять отдельно на уровне backend-прав, а не только frontend-роута.

## API-слой

API-клиенты находятся в:

```text
frontend/src/api/
```

Основные файлы:

| Файл | Назначение |
|------|------------|
| `client.js` | Общий axios-клиент, токены, interceptors. |
| `auth.js` | Регистрация, вход, активация, телефонная авторизация. |
| `pets.js` | PetID, питомцы, породы, здоровье, напоминания. |
| `shop.js` | Магазин, корзина, checkout, заказы, wishlist. |
| `payments.js` | Платежи. |
| `courses.js` | Курсы и обучение. |
| `reviews.js` | Отзывы. |
| `calendar.js` | Календарные события. |

Правило: компоненты страниц не должны вручную собирать URL API, если уже есть функция в `src/api/`.

## Состояние

Глобальные хранилища находятся в:

```text
frontend/src/store/
```

Ключевые store:

| Store | Назначение |
|-------|------------|
| `authStore.js` | Пользователь, токены, вход, регистрация, телефонная авторизация, выход. |
| `cartStore.js` | Корзина, количество товаров, checkout-связанные операции. |
| `favoritesStore.js` | Избранное. |
| `shareableWishlistStore.js` | Публичный wishlist. |
| `toastStore.js` | Уведомления. |

Admin-часть имеет отдельное состояние:

```text
frontend/src/admin/stores/adminStore.js
```

## Основные страницы

| Раздел | Путь в коде | Назначение |
|--------|-------------|------------|
| Главная/воронка | `pages/Funnel/` | Главная, старт подбора, анкета, рекомендации. |
| Auth | `pages/Auth/` | Вход, регистрация, телефон, восстановление пароля. |
| PetID | `pages/PetId/` | Список питомцев, карточка, редактирование. |
| Shop | `pages/Shop/` | Каталог, карточка товара, корзина. |
| Checkout | `pages/Checkout/` | Единый checkout и выбор оплаты. |
| Payment | `pages/Payment/` | Страница оплаты. |
| Orders | `pages/Orders/` | Список и детали заказов. |
| Training | `pages/Training/` | Курсы и обучение. |
| HealthDiary | `pages/HealthDiary/` | Дневник здоровья. |
| Breeds | `pages/Breeds/` | Справочник пород. |
| Admin | `src/admin/` | React админ-панель. |

## Анонимная воронка питания

Ключевые файлы:

```text
frontend/src/pages/Funnel/PetQuizPage.jsx
frontend/src/pages/Funnel/RecommendationsPage.jsx
frontend/src/utils/petQuizDraft.js
frontend/src/utils/pendingFunnelAction.js
frontend/src/utils/executePendingFunnelAction.js
frontend/src/utils/postAuthRedirect.js
```

Сценарий:

1. Гость проходит анкету.
2. Данные сохраняются в `localStorage`.
3. При клике на действие сохраняется `pendingFunnelAction`.
4. После регистрации/входа `resolvePostAuthRedirect` возвращает пользователя в нужный сценарий.
5. `executePendingFunnelAction` выполняет отложенное действие.

Риск: этот flow критичен для конверсии. Любые изменения нужно проверять по `docs/qa/critical-user-scenarios.md`.

## Админ-панель

React админка находится в:

```text
frontend/src/admin/
```

Маршруты:

| URL | Компонент |
|-----|-----------|
| `/admin-panel` | Редирект по роли |
| `/admin-panel/dashboard` | `DashboardSelector` |
| `/admin-panel/analytics` | `AnalyticsDashboard` |
| `/admin-panel/analytics/builder` | `ChartBuilder` |
| `/admin-panel/users` | `UsersTable` |
| `/admin-panel/pets` | `PetsTable` |
| `/admin-panel/products` | `ProductsTable` |
| `/admin-panel/orders` | `OrdersTable` |
| `/admin-panel/courses` | `CoursesTable` |
| `/admin-panel/courses/:id/edit` | `CourseEditorPage` |

Подробности: `docs/modules/13-admin-panel/admin-access-guide.md`.

## Работа с localStorage

Frontend использует localStorage для:

- access token;
- auth state bootstrap;
- анонимной анкеты питания;
- pending action после регистрации;
- некоторых fallback-сценариев.

Правило: все данные в localStorage считать пользовательскими и недоверенными. Перед отправкой на backend они должны валидироваться.

## Ошибки и уведомления

Пользовательские уведомления должны идти через `toastStore`, где это возможно. Ошибка API не должна приводить к:

- пустой странице;
- бесконечному loader;
- молчаливой потере данных;
- показу успешного состояния при неуспешном ответе backend.

## Тестирование frontend

Минимум перед сдачей:

```bash
cd frontend
npm run lint
npm run test:run
npm run build
```

Для сценариев, связанных с Safari, обязательно вручную проверять desktop Safari или WebKit-совместимый браузер.

## Правила доработки

- Новая страница должна быть добавлена в `App.jsx` и задокументирована в `docs/project/user-flows.md`, если она меняет пользовательский сценарий.
- Новый API-вызов должен жить в `src/api/`.
- Новый глобальный state должен иметь понятную границу ответственности.
- Новый admin route должен быть описан в `admin-access-guide.md`.
- Изменения анонимной воронки должны проверяться по критическому сценарию `CUS-06`.

