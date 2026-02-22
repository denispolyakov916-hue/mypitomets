# Инвентаризация проекта "Питомец+"

**Дата создания**: Январь 2026  
**Версия**: 2.0  
**Статус**: ✅ Рефакторинг завершен - Платформа стабилизирована и готова к тестированию  
**Последнее обновление**: Январь 2026

---

## 📋 Содержание

1. [Backend структура](#backend-структура)
2. [Frontend структура](#frontend-структура)
3. [Модели данных](#модели-данных)
4. [API эндпоинты](#api-эндпоинты)
5. [React компоненты](#react-компоненты)
6. [Неиспользуемые файлы](#неиспользуемые-файлы)

---

## Backend структура

### Приложения Django

| Приложение | Описание | Модели | Views | Services |
|------------|----------|--------|-------|----------|
| `apps.users` | Управление пользователями, аутентификация | 2 | 8 | 3 |
| `apps.pets` | Профили питомцев (PetID), напоминания | 2 | 2 | 1 |
| `apps.shop` | Магазин, корзина, заказы | 9 | Множество | 4 |
| `apps.training` | Курсы обучения, конструктор курсов | 12 | 19 | - |
| `apps.payments` | Система платежей | 1 | Множество | 1 |
| `apps.reviews` | Отзывы и рейтинги | 1 | Множество | - |
| `apps.calendar` | Календарь событий | 2 | - | 1 |
| `apps.analytics` | Аналитика для админки | 4 | 5 | 1 |

### Структура файлов backend

```
backend/
├── apps/
│   ├── analytics/          # Аналитика
│   ├── calendar/           # Календарь
│   ├── payments/           # Платежи
│   ├── pets/               # Питомцы
│   ├── reviews/            # Отзывы
│   ├── shop/               # Магазин
│   ├── training/           # Обучение
│   └── users/              # Пользователи
├── config/                 # Конфигурация Django
│   ├── settings.py
│   ├── urls.py
│   ├── urls_admin.py      # Admin API
│   └── admin_api.py       # Admin API views
└── core/                   # Общие утилиты
    ├── authentication.py
    ├── exceptions.py
    ├── pagination.py
    ├── permissions.py
    ├── tokens.py
    └── utils.py
```

---

## Frontend структура

### Основные директории

| Директория | Описание | Количество файлов |
|------------|----------|-------------------|
| `src/admin/` | React админ-панель | ~77 файлов |
| `src/components/` | Переиспользуемые компоненты | ~62 файла |
| `src/pages/` | Страницы приложения | ~41 файл |
| `src/store/` | Zustand stores | 6 файлов |
| `src/api/` | API клиенты | 9 файлов |
| `src/hooks/` | Custom hooks | 12 файлов |
| `src/utils/` | Утилиты | 5 файлов |

### Структура файлов frontend

```
frontend/src/
├── admin/                  # React админ-панель
│   ├── components/
│   │   ├── Analytics/      # Аналитика
│   │   ├── Auth/           # Авторизация
│   │   ├── ChartBuilder/   # Конструктор графиков
│   │   ├── Charts/         # Компоненты графиков
│   │   ├── Courses/        # Управление курсами
│   │   ├── Dashboard/      # Дашборд
│   │   ├── Export/         # Экспорт данных
│   │   ├── Forms/          # Формы
│   │   ├── Layout/         # Layout компоненты
│   │   ├── Notifications/  # Уведомления
│   │   └── Tables/         # Таблицы данных
│   ├── hooks/              # Admin hooks
│   ├── stores/             # Admin stores
│   └── utils/              # Admin utils
├── components/             # Общие компоненты
│   ├── CourseBuilder/      # Конструктор курсов
│   ├── Learning/           # Компоненты обучения
│   ├── Skeletons/          # Skeleton loaders
│   └── ui/                 # UI Kit
├── pages/                  # Страницы
│   ├── Auth/               # Авторизация
│   ├── Checkout/           # Оформление заказа
│   ├── CourseBuilder/      # Конструктор курсов
│   ├── Dashboard/          # Личный кабинет
│   ├── HealthDiary/        # Дневник здоровья
│   ├── Orders/             # Заказы
│   ├── Payment/            # Оплата
│   ├── PetId/              # Pet ID
│   ├── PetProfile/         # Профиль питомца
│   ├── Shop/               # Магазин
│   └── Training/           # Обучение
├── api/                    # API клиенты
├── hooks/                  # Custom hooks
├── store/                  # Zustand stores
└── utils/                  # Утилиты
```

---

## Модели данных

### Backend модели (30 моделей)

#### apps.users
- `User` - Пользователь (кастомная модель)
- `Token` - Токены активации

#### apps.pets
- `Pet` - Профиль питомца (PetID)
- `Reminder` - Напоминания
- `ReminderCategory` - Категории напоминаний
- `ReminderFrequency` - Частота напоминаний

#### apps.shop
- `Product` - Товар
- `Cart` - Корзина
- `CartItem` - Элемент корзины
- `Reservation` - Резервирование
- `Address` - Адрес доставки
- `Order` - Заказ
- `OrderItem` - Элемент заказа
- `Return` - Возврат товара

#### apps.training
- `Course` - Курс
- `UserCourse` - Связь пользователь-курс
- `Lesson` - Урок (старая архитектура)
- `UserCourseProgress` - Прогресс по курсу
- `UserLessonProgress` - Прогресс по уроку
- `Comment` - Комментарии
- `CommentLike` - Лайки комментариев
- `Rating` - Оценки курсов
- `CoursePage` - Страница курса (новая архитектура)
- `ContentBlock` - Блок контента
- `BlockTemplate` - Шаблон блока

#### apps.payments
- `Payment` - Платеж

#### apps.reviews
- `Review` - Отзыв

#### apps.calendar
- `CalendarEvent` - Событие календаря
- `EventReminder` - Напоминание о событии

#### apps.analytics
- `AnalyticMetric` - Метрика аналитики
- `ChartConfig` - Конфигурация графика
- `ChartSession` - Сессия графика
- `AnalyticsLog` - Лог аналитики

---

## API эндпоинты

### Backend API маршруты

#### `/api/auth/` - Аутентификация
- `POST /api/auth/register/` - Регистрация
- `POST /api/auth/login/` - Вход
- `POST /api/auth/logout/` - Выход
- `POST /api/auth/refresh/` - Обновление токена
- `GET /api/auth/activate/` - Активация по ссылке
- `POST /api/auth/activate-by-code/` - Активация по коду
- `POST /api/auth/exchange-auth-code/` - Обмен кода

#### `/api/users/` - Профиль пользователя
- `GET /api/users/profile/` - Профиль
- `GET /api/users/orders/` - Заказы пользователя
- `GET /api/users/courses/` - Курсы пользователя

#### `/api/pets/` - Питомцы
- `GET /api/pets/` - Список питомцев
- `POST /api/pets/` - Создание питомца
- `GET /api/pets/{id}/` - Детали питомца
- `PUT /api/pets/{id}/` - Обновление питомца
- `DELETE /api/pets/{id}/` - Удаление питомца
- `GET /api/pets/reminders/` - Напоминания
- `POST /api/pets/reminders/` - Создание напоминания
- `GET /api/pets/reminders/{id}/` - Детали напоминания
- `PUT /api/pets/reminders/{id}/` - Обновление напоминания
- `DELETE /api/pets/reminders/{id}/` - Удаление напоминания
- `POST /api/pets/reminders/{id}/complete/` - Отметить выполненным

#### `/api/shop/` - Магазин
- `GET /api/shop/products/` - Каталог товаров
- `GET /api/shop/products/{id}/` - Детали товара
- `GET /api/shop/products/{id}/frequently-bought/` - Часто покупают вместе
- `GET /api/shop/cart/` - Корзина
- `POST /api/shop/cart/add/` - Добавить в корзину
- `PUT /api/shop/cart/update/` - Обновить корзину
- `DELETE /api/shop/cart/remove/` - Удалить из корзины
- `GET /api/shop/cart/recommendations/` - Рекомендации для корзины
- `GET /api/shop/recommendations/` - Персональные рекомендации
- `GET /api/shop/orders/` - Заказы
- `GET /api/shop/orders/{id}/` - Детали заказа

#### `/api/courses/` - Курсы
- `GET /api/courses/` - Каталог курсов
- `GET /api/courses/{id}/` - Детали курса
- `POST /api/courses/{id}/purchase/` - Покупка курса
- `POST /api/courses/{id}/enroll/` - Запись на бесплатный курс
- `GET /api/courses/my/` - Курсы пользователя
- `GET /api/courses/{id}/lessons/` - Уроки курса
- `GET /api/courses/{id}/progress/` - Прогресс по курсу
- `GET /api/courses/{id}/comments/` - Комментарии к курсу
- `POST /api/courses/{id}/ratings/` - Поставить оценку
- `GET /api/courses/{id}/builder/` - Структура курса для конструктора
- `PUT /api/courses/{id}/builder/` - Сохранение курса из конструктора
- `GET /api/courses/{id}/pages/` - Список страниц курса
- `POST /api/courses/{id}/pages/` - Создание страницы
- `GET /api/lessons/{id}/` - Детали урока
- `POST /api/lessons/{id}/complete/` - Завершить урок
- `PUT /api/lessons/{id}/progress/` - Обновить прогресс урока

#### `/api/payments/` - Платежи
- `POST /api/payments/create/` - Создание платежа
- `POST /api/payments/confirm/` - Подтверждение платежа
- `GET /api/payments/{id}/` - Детали платежа

#### `/api/reviews/` - Отзывы
- `GET /api/reviews/` - Список отзывов
- `POST /api/reviews/` - Создание отзыва
- `GET /api/reviews/{id}/` - Детали отзыва
- `PUT /api/reviews/{id}/` - Обновление отзыва
- `DELETE /api/reviews/{id}/` - Удаление отзыва

#### `/api/admin/` - Admin API
- `GET /api/admin/stats/summary/` - Общая статистика
- `GET /api/admin/stats/detailed/` - Детальная статистика
- `GET /api/admin/data/{model}/` - Данные модели
- `POST /api/admin/data/{model}/` - Создание записи
- `GET /api/admin/data/{model}/{id}/` - Детали записи
- `PUT /api/admin/data/{model}/{id}/` - Обновление записи
- `DELETE /api/admin/data/{model}/{id}/` - Удаление записи
- `GET /api/admin/analytics/metrics/` - Метрики аналитики
- `POST /api/admin/analytics/charts/` - Создание графика
- `GET /api/admin/analytics/charts/{id}/` - Детали графика

#### `/api/checkout/` - Checkout
- `GET /api/checkout/` - Получить данные checkout
- `POST /api/checkout/` - Создать заказ

---

## React компоненты

### Основные компоненты (62 файла)

#### UI Kit (`src/components/ui/`)
- `Button.jsx` - Кнопка
- `Card.jsx` - Карточка
- `Modal.jsx` - Модальное окно
- `Input.jsx` - Поле ввода
- `Badge.jsx` - Бейдж
- `Progress.jsx` - Прогресс-бар
- `CustomCheckbox.jsx` - Чекбокс

#### Общие компоненты
- `Layout.jsx` - Основной layout
- `Navbar.jsx` - Навигация
- `Footer.jsx` - Футер
- `ErrorBoundary.jsx` - Обработка ошибок
- `Loader.jsx` - Загрузчик
- `Toast.jsx` - Уведомления
- `ProductCard.jsx` - Карточка товара
- `CourseCard.jsx` - Карточка курса
- `PetCard.jsx` - Карточка питомца
- `Rating.jsx` - Рейтинг
- `ReviewForm.jsx` - Форма отзыва
- `ReviewList.jsx` - Список отзывов
- `FavoriteButton.jsx` - Кнопка избранного
- `PersonalRecommendations.jsx` - Персональные рекомендации
- `RemindersWidget.jsx` - Виджет напоминаний
- `OrderTimer.jsx` - Таймер заказа
- `HeaderCounters.jsx` - Счетчики в хедере
- `OrdersDropdown.jsx` - Выпадающий список заказов

#### Конструктор курсов (`src/components/CourseBuilder/`)
- `CourseBuilder.jsx` - Основной компонент
- `CanvasArea.jsx` - Область канваса
- `ToolboxPanel.jsx` - Панель инструментов
- `PropertiesPanel.jsx` - Панель свойств
- `PageNavigation.jsx` - Навигация по страницам
- `ContentBlock.jsx` - Блок контента
- `DroppablePage.jsx` - Перетаскиваемая страница
- `CoursePreview.jsx` - Превью курса
- `CourseImportExport.jsx` - Импорт/экспорт
- `BlockAnalytics.jsx` - Аналитика блоков
- `PageTemplates.jsx` - Шаблоны страниц

#### Блоки конструктора (`src/components/CourseBuilder/Blocks/`)
- `BlockRenderers.jsx` - Рендереры блоков
- `RichTextEditor.jsx` - Редактор текста
- `VideoPlayer.jsx` - Видео-плеер
- `GalleryBlock.jsx` - Галерея
- `FileDownloadBlock.jsx` - Файл для скачивания
- `QuizBuilder.jsx` - Конструктор тестов
- `PetActionBlock.jsx` - Действие с питомцем
- `BlockTemplates.jsx` - Шаблоны блоков

#### Обучение (`src/components/Learning/`)
- `LessonPlayer.jsx` - Плеер урока
- `ProgressTracker.jsx` - Трекер прогресса
- `CommentsSection.jsx` - Секция комментариев
- `RatingWidget.jsx` - Виджет оценки
- `CourseRecommendations.jsx` - Рекомендации курсов
- `CoursePersonalizationWidget.jsx` - Виджет персонализации

#### Skeleton loaders (`src/components/Skeletons/`)
- `CourseSkeleton.jsx` - Skeleton для курса

### Admin компоненты (~77 файлов)

#### Dashboard
- `Dashboard.jsx` - Основной дашборд
- `MetricCard.jsx` - Карточка метрики
- `RecentOrders.jsx` - Недавние заказы
- `RecentUsers.jsx` - Недавние пользователи
- `RecentPets.jsx` - Недавние питомцы
- `RecentReviews.jsx` - Недавние отзывы
- `TopProducts.jsx` - Топ товаров
- `PetsBySpecies.jsx` - Питомцы по видам
- `QuickActions.jsx` - Быстрые действия
- `DashboardSelector.jsx` - Выбор дашборда

#### Tables
- `DataTable.jsx` - Основная таблица
- `ProductsTable.jsx` - Таблица товаров
- `OrdersTable.jsx` - Таблица заказов
- `UsersTable.jsx` - Таблица пользователей
- `PetsTable.jsx` - Таблица питомцев
- `CoursesTable.jsx` - Таблица курсов
- `TableHeader.jsx` - Заголовок таблицы
- `TableFilters.jsx` - Фильтры таблицы
- `TablePagination.jsx` - Пагинация
- `BulkActions.jsx` - Массовые действия

#### Forms
- `ProductForm.jsx` - Форма товара
- `UserForm.jsx` - Форма пользователя
- `CourseForm.jsx` - Форма курса
- `LessonForm.jsx` - Форма урока
- `FormField.jsx` - Поле формы
- `FormButtons.jsx` - Кнопки формы
- `ImageUpload.jsx` - Загрузка изображений
- `Modal.jsx` - Модальное окно

#### Charts
- `BarChart.jsx` - Столбчатая диаграмма
- `LineChart.jsx` - Линейный график
- `PieChart.jsx` - Круговая диаграмма
- `ComboChart.jsx` - Комбинированный график

#### Chart Builder
- `ChartBuilder.jsx` - Основной компонент
- `Canvas.jsx` - Канвас
- `ChartTypeSelector.jsx` - Выбор типа графика
- `ChartStyleConfigurator.jsx` - Настройка стиля
- `AxisConfigurator.jsx` - Настройка осей
- `FilterPanel.jsx` - Панель фильтров
- `MetricsPanel.jsx` - Панель метрик
- `LayerManager.jsx` - Менеджер слоев
- `ExportPanel.jsx` - Панель экспорта
- `PerformanceMonitor.jsx` - Монитор производительности

#### Analytics
- `AnalyticsDashboard.jsx` - Дашборд аналитики
- `DrillDownModal.jsx` - Модальное окно drill-down

#### Export
- `ExportButton.jsx` - Кнопка экспорта
- `ExportModal.jsx` - Модальное окно экспорта

#### Courses
- `CourseCreatePage.jsx` - Создание курса
- `LessonManager.jsx` - Менеджер уроков
- `LessonItem.jsx` - Элемент урока

#### Layout
- `AdminLayout.jsx` - Layout админки
- `Header.jsx` - Хедер
- `Sidebar.jsx` - Боковая панель

#### Notifications
- `NotificationCenter.jsx` - Центр уведомлений

#### Auth
- `AdminLoginPage.jsx` - Страница входа

---

## React маршруты

### Публичные маршруты
- `/` - Главная страница
- `/login` - Вход
- `/register` - Регистрация
- `/activate` - Активация аккаунта
- `/shop` - Каталог товаров
- `/shop/products/:id` - Детали товара
- `/courses` - Каталог курсов
- `/courses/:id` - Детали курса

### Защищенные маршруты (требуют аутентификации)
- `/pet-id` - Pet ID (цифровые паспорта)
- `/cart` - Корзина
- `/checkout` - Оформление заказа
- `/payment-method` - Выбор способа оплаты
- `/payment` - Оплата
- `/profile` - Профиль пользователя
- `/settings` - Настройки
- `/orders` - Заказы
- `/orders/:id` - Детали заказа
- `/health-diary` - Дневник здоровья
- `/training/courses/:courseId/learn` - Обучение на курсе
- `/training/courses/:courseId/learn/pages/:pageId` - Страница курса
- `/training/lessons/:lessonId` - Страница урока
- `/admin/courses/:courseId/builder` - Конструктор курсов

### Административные маршруты (требуют is_staff)
- `/admin-panel/*` - React админ-панель

### Редиректы
- `/pets` → `/pet-id`
- `/pets/new` → `/pet-id`
- `/pets/:id` → `/pet-id`
- `/pets/:id/edit` → `/pet-id`

---

## Неиспользуемые файлы

### Backend
- `backend/apps/shop/admin_views.py` - Закомментированные admin views (строки 30-37 в urls.py)
- Возможно неиспользуемые management команды (требует проверки)

### Frontend
- Требуется проверка на неиспользуемые компоненты
- Возможно дублирование компонентов в разных директориях

---

## Статистика проекта

### Backend
- **Приложений Django**: 8
- **Моделей**: 30
- **API эндпоинтов**: ~80+
- **Python файлов**: ~152

### Frontend
- **React компонентов**: ~154 JSX файла
- **Страниц**: ~41
- **Stores (Zustand)**: 6
- **API клиентов**: 9
- **Custom hooks**: 12

---

## Заметки

1. **Смешение архитектур**: Старая архитектура (Lesson) и новая (CoursePage) существуют параллельно
2. **Двойная админка**: Django Admin + React Admin панель
3. **Большое количество компонентов**: Требуется унификация и оптимизация
4. **Много JSON полей**: Требуется валидация

---

*Документ создан в рамках Этапа 0 рефакторинга*  
*Последнее обновление: Январь 2026*

