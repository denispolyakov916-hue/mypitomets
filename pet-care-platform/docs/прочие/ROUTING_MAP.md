# Карта роутинга платформы "Питомец+"

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 0 - Предварительный анализ

---

## 📋 Содержание

1. [Backend API маршруты](#backend-api-маршруты)
2. [Frontend маршруты](#frontend-маршруты)
3. [Диаграмма роутинга](#диаграмма-роутинга)
4. [Дублирующиеся маршруты](#дублирующиеся-маршруты)
5. [Неиспользуемые маршруты](#неиспользуемые-маршруты)

---

## Backend API маршруты

### Корневой URL конфиг
**Файл**: `backend/config/urls.py`

```
/ (root)
├── admin/                    # Django Admin (для разработки)
└── api/                      # API эндпоинты
    ├── auth/                 # Аутентификация
    ├── users/                # Профиль пользователя
    ├── pets/                 # Питомцы
    ├── shop/                 # Магазин
    ├── courses/              # Курсы
    ├── payments/             # Платежи
    ├── checkout/             # Checkout
    ├── reviews/              # Отзывы
    └── admin/                # Admin API
```

---

### `/api/auth/` - Аутентификация
**Файл**: `backend/apps/users/urls.py`  
**Префикс**: `/api/auth/`

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| POST | `/register/` | `RegisterView` | Регистрация (старый URL) |
| POST | `/registration/` | `RegisterView` | Регистрация |
| POST | `/login/` | `LoginView` | Вход |
| POST | `/logout/` | `LogoutView` | Выход |
| GET | `/refresh/` | `RefreshView` | Обновление токена |
| GET | `/activate/<link>/` | `ActivateView` | Активация по ссылке |
| POST | `/activate-by-code/` | `ActivateByCodeView` | Активация по коду |
| POST | `/exchange-auth-code/` | `ExchangeAuthCodeView` | Обмен кода на токены |
| GET | `/users/` | `GetUsersView` | Список пользователей (тест) |

**Примечание**: Дублирование `/register/` и `/registration/` - для обратной совместимости.

---

### `/api/users/` - Профиль пользователя
**Файл**: `backend/apps/users/profile_urls.py`  
**Префикс**: `/api/users/`

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| GET | `/profile/` | `ProfileView` | Профиль пользователя |
| GET | `/orders/` | `UserOrdersView` | Заказы пользователя |
| GET | `/courses/` | `UserCoursesView` | Курсы пользователя |

---

### `/api/pets/` - Питомцы
**Файл**: `backend/apps/pets/urls.py`  
**Префикс**: `/api/pets/`

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| GET | `/` | `PetListCreateView` | Список питомцев |
| POST | `/` | `PetListCreateView` | Создание питомца |
| GET | `/<id>/` | `PetDetailView` | Детали питомца |
| PUT | `/<id>/` | `PetDetailView` | Обновление питомца |
| DELETE | `/<id>/` | `PetDetailView` | Удаление питомца |

**Напоминания** (`/api/pets/reminders/`):
**Файл**: `backend/apps/pets/reminder_views.py`

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| GET | `/` | `ReminderListView` | Список напоминаний |
| POST | `/` | `ReminderCreateView` | Создание напоминания |
| GET | `/categories/` | `ReminderCategoryListView` | Категории напоминаний |
| GET | `/upcoming/` | `UpcomingRemindersView` | Предстоящие напоминания |
| GET | `/<id>/` | `ReminderDetailView` | Детали напоминания |
| PUT | `/<id>/` | `ReminderDetailView` | Обновление напоминания |
| DELETE | `/<id>/` | `ReminderDetailView` | Удаление напоминания |
| POST | `/<id>/complete/` | `ReminderCompleteView` | Отметить выполненным |

---

### `/api/shop/` - Магазин
**Файл**: `backend/apps/shop/urls.py`  
**Префикс**: `/api/shop/`

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| GET | `/products/` | `ProductListView` | Каталог товаров |
| GET | `/products/<id>/` | `ProductDetailView` | Детали товара |
| GET | `/products/<id>/frequently-bought/` | `FrequentlyBoughtTogetherView` | Часто покупают вместе |
| GET | `/cart/` | `CartView` | Просмотр корзины |
| POST | `/cart/` | `CartView` | Добавление в корзину |
| PUT | `/cart/item/` | `CartItemView` | Обновление элемента корзины |
| DELETE | `/cart/item/` | `CartItemView` | Удаление из корзины |
| GET | `/cart/recommendations/` | `CartRecommendationsView` | Рекомендации для корзины |
| GET | `/cart/refresh/` | `CartRefreshView` | Обновление корзины |
| GET | `/recommendations/` | `PersonalRecommendationsView` | Персональные рекомендации |
| GET | `/health-issues/` | `HealthFilteredProductsView` | Фильтр по проблемам здоровья |
| POST | `/orders/` | `OrderCreateView` | Оформление заказа |
| GET | `/orders/history/` | `OrderHistoryView` | История заказов |
| GET | `/orders/<id>/` | `OrderDetailView` | Детали заказа |
| POST | `/orders/<id>/confirm-payment/` | `OrderConfirmPaymentView` | Подтверждение оплаты |
| GET | `/addresses/` | `AddressListView` | Список адресов |
| GET | `/addresses/search/` | `AddressSearchView` | Поиск адресов |
| POST | `/returns/` | `ReturnCreateView` | Создание возврата |
| GET | `/returns/` | `ReturnListView` | Список возвратов |
| GET | `/returns/<id>/` | `ReturnDetailView` | Детали возврата |

---

### `/api/courses/` - Курсы
**Файл**: `backend/apps/training/urls.py`  
**Префикс**: `/api/courses/`

#### Основные эндпоинты курсов

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| GET | `/` | `CourseListView` | Каталог курсов |
| GET | `/<id>/` | `CourseDetailView` | Детали курса |
| POST | `/<id>/purchase/` | `CoursePurchaseView` | Покупка курса |
| POST | `/<id>/enroll/` | `FreeCourseEnrollView` | Запись на бесплатный курс |
| POST | `/<id>/checkout/` | `CourseCheckoutView` | Checkout курса |
| GET | `/my/` | `UserCoursesView` | Курсы пользователя |

#### Система обучения (старая архитектура)

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| GET | `/<id>/lessons/` | `CourseLessonsView` | Уроки курса |
| GET | `/<id>/progress/` | `UserCourseProgressView` | Прогресс по курсу |
| GET | `/<id>/comments/` | `CourseCommentsView` | Комментарии к курсу |
| GET | `/<id>/ratings/` | `CourseRatingsView` | Оценки курса |
| POST | `/<id>/ratings/` | `CourseRatingsView` | Поставить оценку |
| GET | `/lessons/<id>/` | `LessonDetailView` | Детали урока |
| POST | `/lessons/<id>/complete/` | `LessonCompleteView` | Завершить урок |
| PUT | `/lessons/<id>/progress/` | `LessonProgressView` | Обновить прогресс урока |
| GET | `/lessons/<id>/comments/` | `LessonCommentsView` | Комментарии к уроку |
| POST | `/lessons/<id>/comments/` | `LessonCommentsView` | Добавить комментарий |

#### Конструктор курсов (новая архитектура)

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| GET | `/<id>/builder/` | `CourseBuilderView` | Структура курса для конструктора |
| PUT | `/<id>/builder/` | `CourseBuilderView` | Сохранение курса из конструктора |
| GET | `/<id>/pages/` | `CoursePageListView` | Список страниц курса |
| POST | `/<id>/pages/` | `CoursePageCreateView` | Создание страницы |
| GET | `/<id>/pages/<pageId>/` | `CoursePageDetailView` | Детали страницы |
| PUT | `/<id>/pages/<pageId>/` | `CoursePageDetailView` | Обновление страницы |
| DELETE | `/<id>/pages/<pageId>/` | `CoursePageDetailView` | Удаление страницы |
| GET | `/pages/<pageId>/blocks/` | `ContentBlockListView` | Список блоков страницы |
| POST | `/pages/<pageId>/blocks/` | `ContentBlockCreateView` | Создание блока |
| GET | `/blocks/<id>/` | `ContentBlockDetailView` | Детали блока |
| PUT | `/blocks/<id>/` | `ContentBlockDetailView` | Обновление блока |
| DELETE | `/blocks/<id>/` | `ContentBlockDetailView` | Удаление блока |
| POST | `/blocks/<id>/duplicate/` | `ContentBlockDuplicateView` | Дублирование блока |
| GET | `/block-templates/` | `BlockTemplateListView` | Список шаблонов блоков |
| POST | `/block-templates/` | `BlockTemplateCreateView` | Создание шаблона |
| GET | `/block-templates/<id>/` | `BlockTemplateDetailView` | Детали шаблона |
| PUT | `/block-templates/<id>/` | `BlockTemplateDetailView` | Обновление шаблона |
| DELETE | `/block-templates/<id>/` | `BlockTemplateDetailView` | Удаление шаблона |
| POST | `/block-templates/<id>/use/` | `BlockTemplateUseView` | Использование шаблона |

#### Комментарии и рейтинги

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| GET | `/comments/` | `CommentListView` | Список комментариев |
| POST | `/comments/` | `CommentCreateView` | Создание комментария |
| GET | `/comments/<id>/` | `CommentDetailView` | Детали комментария |
| PUT | `/comments/<id>/` | `CommentDetailView` | Обновление комментария |
| DELETE | `/comments/<id>/` | `CommentDetailView` | Удаление комментария |
| POST | `/comments/<id>/like/` | `CommentReactionView` | Лайк комментария |
| DELETE | `/comments/<id>/like/` | `CommentReactionView` | Удалить лайк |
| GET | `/ratings/` | `CourseRatingListView` | Список оценок |
| POST | `/ratings/` | `CourseRatingCreateView` | Создание оценки |
| GET | `/ratings/<id>/` | `RatingDetailView` | Детали оценки |
| PUT | `/ratings/<id>/` | `RatingDetailView` | Обновление оценки |
| DELETE | `/ratings/<id>/` | `RatingDetailView` | Удаление оценки |

---

### `/api/payments/` - Платежи
**Файл**: `backend/apps/payments/urls.py`  
**Префикс**: `/api/payments/`

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| POST | `/create/` | `PaymentCreateView` | Создание платежа |
| POST | `/confirm/` | `PaymentConfirmView` | Подтверждение платежа |
| GET | `/<id>/` | `PaymentDetailView` | Детали платежа |

---

### `/api/reviews/` - Отзывы
**Файл**: `backend/apps/reviews/urls.py`  
**Префикс**: `/api/reviews/`

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| GET | `/` | `ReviewListView` | Список отзывов |
| POST | `/` | `ReviewCreateView` | Создание отзыва |
| GET | `/<id>/` | `ReviewDetailView` | Детали отзыва |
| PUT | `/<id>/` | `ReviewDetailView` | Обновление отзыва |
| DELETE | `/<id>/` | `ReviewDetailView` | Удаление отзыва |

---

### `/api/checkout/` - Checkout
**Файл**: `backend/apps/shop/urls_checkout.py`  
**Префикс**: `/api/checkout/`

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| GET | `/` | `UnifiedCheckoutView` | Получить данные checkout |
| POST | `/` | `UnifiedCheckoutView` | Создать заказ |

---

### `/api/admin/` - Admin API
**Файл**: `backend/config/urls_admin.py`  
**Префикс**: `/api/admin/`

#### Статистика

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| GET | `/stats/summary/` | `AdminStatsView` | Общая статистика |
| GET | `/stats/detailed/` | `AdminStatsView` | Детальная статистика |

#### Управление данными

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| GET | `/data/<model>/` | `AdminDataView` | Список записей модели |
| POST | `/data/<model>/` | `AdminDataView` | Создание записи |
| GET | `/data/<model>/<id>/` | `AdminDataView` | Детали записи |
| PUT | `/data/<model>/<id>/` | `AdminDataView` | Обновление записи |
| DELETE | `/data/<model>/<id>/` | `AdminDataView` | Удаление записи |

**Доступные модели**: `users`, `pets`, `products`, `orders`, `courses`, `payments`, `reviews`

#### Аналитика

| Метод | URL | View | Описание |
|-------|-----|------|----------|
| GET | `/analytics/metrics/` | `AnalyticMetricsViewSet` | Метрики аналитики |
| POST | `/analytics/charts/` | `ChartConstructorViewSet` | Создание графика |
| GET | `/analytics/charts/<id>/` | `ChartConfigViewSet` | Детали графика |
| PUT | `/analytics/charts/<id>/` | `ChartConfigViewSet` | Обновление графика |
| DELETE | `/analytics/charts/<id>/` | `ChartConfigViewSet` | Удаление графика |

---

## Frontend маршруты

### Корневой роутинг
**Файл**: `frontend/src/App.jsx`

```
/ (root)
├── /admin-panel/*           # React админ-панель (отдельный layout)
└── /*                       # Основной сайт (общий layout)
    ├── /                    # Главная страница
    ├── /login               # Вход
    ├── /register            # Регистрация
    ├── /activate            # Активация аккаунта
    ├── /shop                # Каталог товаров (публичный)
    ├── /shop/products/:id   # Детали товара (публичный)
    ├── /courses             # Каталог курсов (публичный)
    ├── /courses/:id         # Детали курса (публичный)
    ├── /payment             # Оплата (защищенный)
    └── [Protected Routes]   # Защищенные маршруты
        ├── /pet-id          # Pet ID
        ├── /cart            # Корзина
        ├── /checkout        # Оформление заказа
        ├── /payment-method  # Выбор способа оплаты
        ├── /profile         # Профиль
        ├── /settings        # Настройки
        ├── /orders          # Заказы
        ├── /orders/:id      # Детали заказа
        ├── /health-diary    # Дневник здоровья
        ├── /training/courses/:courseId/learn
        ├── /training/courses/:courseId/learn/pages/:pageId
        ├── /training/lessons/:lessonId
        └── /admin/courses/:courseId/builder
```

---

### Публичные маршруты

| Маршрут | Компонент | Описание |
|---------|-----------|----------|
| `/` | `Home` | Главная страница |
| `/login` | `AuthModal` | Вход (редирект если авторизован) |
| `/register` | `AuthModal` | Регистрация (редирект если авторизован) |
| `/activate` | `Activate` | Активация аккаунта |
| `/shop` | `Shop` | Каталог товаров |
| `/shop/products/:id` | `ProductDetail` | Детали товара |
| `/courses` | `Courses` | Каталог курсов |
| `/courses/:id` | `CourseDetail` | Детали курса |

---

### Защищенные маршруты (требуют аутентификации)

| Маршрут | Компонент | Описание |
|---------|-----------|----------|
| `/pet-id` | `PetIdPage` | Pet ID (цифровые паспорта) |
| `/cart` | `Cart` | Корзина |
| `/checkout` | `UnifiedCheckout` | Оформление заказа |
| `/payment-method` | `PaymentMethodSelection` | Выбор способа оплаты |
| `/payment` | `Payment` | Оплата |
| `/profile` | `Profile` | Профиль пользователя |
| `/settings` | `Settings` | Настройки |
| `/orders` | `Orders` | Заказы |
| `/orders/:id` | `OrderDetail` | Детали заказа |
| `/health-diary` | `HealthDiary` | Дневник здоровья |
| `/training/courses/:courseId/learn` | `CourseLearningPage` (lazy) | Обучение на курсе |
| `/training/courses/:courseId/learn/pages/:pageId` | `CoursePageLearning` (lazy) | Страница курса |
| `/training/lessons/:lessonId` | `LessonPage` (lazy) | Страница урока |
| `/admin/courses/:courseId/builder` | `CourseBuilderPage` (lazy) | Конструктор курсов |

---

### Редиректы

| Старый маршрут | Новый маршрут | Причина |
|----------------|---------------|---------|
| `/pets` | `/pet-id` | Унификация на Pet ID |
| `/pets/new` | `/pet-id` | Унификация на Pet ID |
| `/pets/:id` | `/pet-id` | Унификация на Pet ID |
| `/pets/:id/edit` | `/pet-id` | Унификация на Pet ID |

---

### Административные маршруты (требуют is_staff)

**Файл**: `frontend/src/admin/App.jsx`

| Маршрут | Компонент | Описание |
|---------|-----------|----------|
| `/admin-panel/dashboard` | `Dashboard` | Дашборд |
| `/admin-panel/analytics` | `AnalyticsDashboard` | Аналитика |
| `/admin-panel/data/:model` | `DataTable` | Управление данными |
| `/admin-panel/charts` | `ChartBuilder` | Конструктор графиков |
| `/admin-panel/courses` | `CourseCreatePage` | Управление курсами |

---

## Диаграмма роутинга

```mermaid
graph TB
    Root[Root /] --> AdminPanel[Admin Panel /admin-panel/*]
    Root --> MainSite[Main Site /*]
    
    MainSite --> Public[Public Routes]
    MainSite --> Protected[Protected Routes]
    
    Public --> Home[/]
    Public --> Auth[/login, /register]
    Public --> Shop[/shop, /shop/products/:id]
    Public --> Courses[/courses, /courses/:id]
    
    Protected --> PetID[/pet-id]
    Protected --> Cart[/cart]
    Protected --> Checkout[/checkout]
    Protected --> Profile[/profile, /settings]
    Protected --> Orders[/orders, /orders/:id]
    Protected --> Training[/training/*]
    
    AdminPanel --> Dashboard[/dashboard]
    AdminPanel --> Analytics[/analytics]
    AdminPanel --> Data[/data/:model]
    AdminPanel --> Charts[/charts]
    
    API[API /api/] --> AuthAPI[/auth/]
    API --> UsersAPI[/users/]
    API --> PetsAPI[/pets/]
    API --> ShopAPI[/shop/]
    API --> CoursesAPI[/courses/]
    API --> PaymentsAPI[/payments/]
    API --> ReviewsAPI[/reviews/]
    API --> CheckoutAPI[/checkout/]
    API --> AdminAPI[/admin/]
```

---

## Дублирующиеся маршруты

### Backend

1. **`/api/auth/register/` и `/api/auth/registration/`**
   - Оба ведут на `RegisterView`
   - Причина: обратная совместимость
   - Рекомендация: Оставить оба, но документировать что `/registration/` - основной

### Frontend

1. **Редиректы `/pets/*` → `/pet-id`**
   - Множественные редиректы для старой структуры
   - Рекомендация: Оставить для обратной совместимости

---

## Неиспользуемые маршруты

### Backend

1. **Закомментированные admin views** (`backend/config/urls.py`, строки 30-37)
   - `/admin/dashboard/`
   - `/admin/recommendations/`
   - `/admin/pet-analytics/`
   - `/admin/payment-analytics/`
   
   **Статус**: Временно отключены  
   **Причина**: Заменены на React админ-панель  
   **Рекомендация**: Удалить после полного перехода на React админку

---

## Заметки

1. **Смешение архитектур**: Старая архитектура курсов (`/api/courses/lessons/`) и новая (`/api/courses/<id>/pages/`) существуют параллельно
2. **Двойная админка**: Django Admin (`/admin/`) и React Admin (`/admin-panel/`)
3. **Много редиректов**: Старые маршруты `/pets/*` редиректят на `/pet-id`
4. **Lazy loading**: Некоторые компоненты используют lazy loading для оптимизации

---

*Документ создан в рамках Этапа 0 рефакторинга*  
*Последнее обновление: Январь 2026*

