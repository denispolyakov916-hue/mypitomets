# Питомец+ — Структура проекта

**Дата создания**: Январь 2026
**Версия**: 2.1
**Статус**: ✅ Рефакторинг завершен - Платформа стабилизирована и очищена
**Последнее обновление**: Январь 2026 - Очистка проекта от временных файлов и дубликатов

---

## 📋 Содержание

1. [Технологический стек](#технологический-стек)
2. [Структура проекта](#структура-проекта)
3. [Backend структура](#backend-структура)
4. [Frontend структура](#frontend-структура)
5. [Модели данных](#модели-данных)
6. [API эндпоинты](#api-эндпоинты)
7. [React компоненты](#react-компоненты)

---

## Технологический стек

### Backend
| Компонент | Технология | Версия |
|-----------|------------|--------|
| Фреймворк | Django | 5.1.5 |
| REST API | Django REST Framework | 3.15.2 |
| Аутентификация | djangorestframework-simplejwt | 5.3.1 |
| CORS | django-cors-headers | 4.6.0 |
| База данных | PostgreSQL | 15+ |
| UUID | uuid7 | 0.1.0 |
| Кэширование | Django Cache Framework | - |
| Логирование | pythonjsonlogger | 2.0.7 |

### Frontend
| Компонент | Технология | Версия |
|-----------|------------|--------|
| UI библиотека | React | 18.2.0 |
| Сборщик | Vite | 5.0.0 |
| Роутинг | React Router | 6.20.0 |
| HTTP клиент | Axios | 1.6.2 |
| State Management | Zustand | 4.4.7 |
| Drag-and-Drop | @dnd-kit | 6.0.8 |
| Rich Text Editor | @tiptap | 3.14.0 |
| Video Player | react-player | 3.4.0 |
| Charts | Chart.js + react-chartjs-2 | 4.5.1 |
| Стили | Tailwind CSS | 3.3.5 |

---

## Структура проекта

```
pet-care-platform/
│
├── backend/                          # Django Backend
│   ├── apps/                         # Django приложения
│   │   ├── users/                    # Модуль пользователей
│   │   ├── pets/                     # Модуль PetID + Напоминания
│   │   ├── shop/                     # Модуль магазина
│   │   ├── training/                 # Модуль курсов + Конструктор
│   │   ├── payments/                 # Модуль платежей
│   │   ├── reviews/                  # Модуль отзывов
│   │   ├── calendar/                 # Модуль календаря
│   │   ├── analytics/                # Модуль аналитики
│   │   └── __init__.py
│   │
│   ├── core/                         # Общие компоненты
│   │   ├── authentication.py         # Кастомная аутентификация
│   │   ├── cache_utils.py            # Утилиты кэширования
│   │   ├── exception_handler.py      # Обработчик исключений
│   │   ├── exceptions.py             # Кастомные исключения
│   │   ├── health.py                 # Мониторинг здоровья
│   │   ├── middleware.py             # Кастомное middleware
│   │   ├── pagination.py             # Кастомная пагинация
│   │   ├── permissions.py            # Кастомные разрешения
│   │   ├── services.py               # Базовый сервис
│   │   ├── tokens.py                 # Кастомные токены
│   │   ├── utils.py                  # Утилиты
│   │   ├── validators.py             # Валидаторы
│   │   └── views.py                  # API для мониторинга
│   │
│   ├── config/                       # Конфигурация Django
│   │   ├── settings.py               # Настройки приложения
│   │   ├── urls.py                   # Корневые URL маршруты
│   │   ├── urls_admin.py             # Admin API
│   │   ├── admin_api.py              # Admin API views
│   │   └── wsgi.py                   # WSGI приложение
│   │
│   ├── manage.py                     # Django management
│   ├── requirements.txt              # Python зависимости
│   └── logs/                         # Логи приложения
│
├── frontend/                         # React Frontend
│   ├── src/
│   │   ├── admin/                    # React админ-панель
│   │   ├── api/                      # API клиенты
│   │   ├── components/               # React компоненты
│   │   ├── hooks/                    # Кастомные хуки
│   │   ├── pages/                    # Страницы приложения
│   │   ├── store/                    # Zustand stores
│   │   ├── utils/                    # Утилиты
│   │   └── data/                     # Статические данные
│   │
│   ├── public/                       # Статические файлы
│   ├── package.json                  # Node зависимости
│   └── vite.config.js                # Конфигурация Vite
│
├── docs/                             # Документация
│   ├── api/                          # API документация
│   ├── deployment/                   # Скрипты развертывания
│   ├── development/                  # Документация разработки
│   └── *.md                          # Документы проекта
│
└── scripts/                          # Скрипты развертывания
    ├── deploy.sh                     # Linux/macOS
    └── deploy.ps1                    # Windows
```

```
pet-care-platform/
│
├── backend/                          # Django Backend
│   ├── config/                       # Конфигурация Django
│   │   ├── settings.py               # Настройки приложения
│   │   └── urls.py                   # Корневые URL маршруты
│   │
│   ├── core/                         # Ядро приложения
│   │   ├── authentication.py         # Кастомная JWT аутентификация
│   │   ├── permissions.py            # Кастомные разрешения
│   │   ├── pagination.py             # Кастомная пагинация
│   │   └── utils.py                  # Утилиты (UUIDv7 генерация)
│   │
│   ├── templates/                    # Django шаблоны
│   │   └── admin/                    # Кастомные шаблоны админки
│   │       ├── index.html            # Главная страница админки
│   │       ├── dashboard.html        # Дашборд аналитики
│   │       ├── pet_analytics.html    # Аналитика PetID
│   │       └── recommendation_settings.html  # Настройки рекомендаций
│   │
│   ├── apps/                         # Django приложения
│   │   │
│   │   ├── users/                    # Модуль пользователей
│   │   │   ├── models.py             # User, Token модели
│   │   │   ├── views.py              # Авторизация API
│   │   │   ├── urls.py               # URL /api/auth/
│   │   │   └── profile_urls.py       # URL /api/users/
│   │   │
│   │   ├── pets/                     # Модуль PetID + Напоминания
│   │   │   ├── models.py             # Pet модель (с health_issues, activity_level)
│   │   │   ├── reminder_models.py    # Reminder модель
│   │   │   ├── views.py              # CRUD питомцев
│   │   │   ├── reminder_views.py     # API напоминаний
│   │   │   ├── services.py           # PersonalizationService
│   │   │   ├── admin.py              # Админка Pet + Reminder
│   │   │   └── urls.py               # URL /api/pets/, /api/pets/reminders/
│   │   │
│   │   ├── shop/                     # Модуль магазина
│   │   │   ├── models.py             # Product, Cart, Order модели
│   │   │   ├── managers.py           # ProductManager, ProductQuerySet
│   │   │   ├── views.py              # Каталог, корзина, заказы, рекомендации
│   │   │   ├── admin.py              # Админка с экспортом CSV
│   │   │   ├── admin_views.py        # Кастомные view для админки
│   │   │   ├── urls.py               # URL /api/shop/
│   │   │   └── services/
│   │   │       ├── order_service.py  # Сервис заказов
│   │   │       ├── cart_service.py   # Сервис корзины
│   │   │       └── recommendation_service.py  # RecommendationEngine
│   │   │
│   │   ├── training/                 # Модуль курсов + Конструктор
│   │   │   ├── models.py             # Course, CoursePage, ContentBlock, BlockTemplate модели
│   │   │   ├── managers.py           # CourseManager, CourseQuerySet
│   │   │   ├── views.py              # API для курсов, страниц, блоков
│   │   │   ├── serializers.py        # Сериализаторы для всех моделей
│   │   │   ├── admin.py              # Админка курсов и конструктора
│   │   │   ├── urls.py               # URL /api/courses/, /api/pages/, /api/blocks/
│   │   │   └── management/commands/  # Management команды
│   │   │       └── migrate_lessons_to_pages.py  # Миграция данных
│   │   │
│   │   ├── payments/                 # Модуль платежей
│   │   │   ├── models.py             # Payment модель
│   │   │   ├── views.py              # API платежей
│   │   │   ├── services.py           # PaymentService
│   │   │   └── urls.py               # URL /api/payments/
│   │   │
│   │   └── reviews/                  # Модуль отзывов
│   │       ├── models.py             # Review модель
│   │       ├── views.py              # API отзывов
│   │       └── urls.py               # URL /api/reviews/
│   │
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/                         # React Frontend
│   ├── src/
│   │   ├── api/                      # API клиенты
│   │   │   ├── api.js                # Axios клиент
│   │   │   ├── auth.js               # API авторизации
│   │   │   ├── pets.js               # API питомцев
│   │   │   ├── shop.js               # API магазина
│   │   │   ├── courses.js            # API курсов
│   │   │   ├── payments.js           # API платежей
│   │   │   ├── reviews.js            # API отзывов
│   │   │   └── reminders.js          # API напоминаний (NEW)
│   │   │
│   │   ├── components/               # React компоненты
│   │   │   ├── ui/                   # UI Kit (NEW)
│   │   │   │   ├── Button.jsx        # Кнопки
│   │   │   │   ├── Card.jsx          # Карточки
│   │   │   │   ├── Modal.jsx         # Модальные окна
│   │   │   │   ├── Input.jsx         # Поля ввода
│   │   │   │   ├── Badge.jsx         # Бейджи
│   │   │   │   ├── Progress.jsx      # Прогресс-бары
│   │   │   │   └── index.js          # Экспорт
│   │   │   │
│   │   │   │   ├── CourseBuilder/        # Конструктор курсов (NEW)
│   │   │   │   │   ├── CourseBuilder.jsx # Основной конструктор
│   │   │   │   │   ├── ToolboxPanel.jsx  # Панель инструментов
│   │   │   │   │   ├── CanvasArea.jsx    # Рабочая область
│   │   │   │   │   ├── PropertiesPanel.jsx # Панель свойств
│   │   │   │   │   ├── PageNavigation.jsx # Навигация страниц
│   │   │   │   │   ├── DroppablePage.jsx # Страница для блоков
│   │   │   │   │   ├── ContentBlock.jsx  # Компонент блока
│   │   │   │   │   ├── CoursePreview.jsx # Предпросмотр курса
│   │   │   │   │   ├── PageTemplates.jsx # Шаблоны страниц
│   │   │   │   │   ├── BlockAnalytics.jsx # Аналитика блоков
│   │   │   │   │   ├── CourseImportExport.jsx # Импорт/экспорт
│   │   │   │   │   ├── Blocks/           # Специализированные блоки
│   │   │   │   │   │   ├── RichTextEditor.jsx    # WYSIWYG редактор
│   │   │   │   │   │   ├── VideoPlayer.jsx       # Видео-плеер
│   │   │   │   │   │   ├── QuizBuilder.jsx       # Конструктор тестов
│   │   │   │   │   │   ├── PetActionBlock.jsx    # Действия с питомцем
│   │   │   │   │   │   ├── GalleryBlock.jsx      # Галерея изображений
│   │   │   │   │   │   ├── FileDownloadBlock.jsx # Скачивание файлов
│   │   │   │   │   │   ├── BlockTemplates.jsx    # Управление шаблонами
│   │   │   │   │   │   └── BlockRenderers.jsx    # Рендереры для обучения
│   │   │   │   │   └── index.js          # Экспорт компонентов
│   │   │   │
│   │   │   ├── Layout.jsx            # Основной layout
│   │   │   ├── Navbar.jsx            # Навигация
│   │   │   ├── PetCard.jsx           # Карточка питомца
│   │   │   ├── ProductCard.jsx       # Карточка товара (с FavoriteButton)
│   │   │   ├── CourseCard.jsx        # Карточка курса (с FavoriteButton)
│   │   │   ├── RecommendationBlock.jsx # Блок рекомендаций (NEW)
│   │   │   ├── RemindersWidget.jsx   # Виджет напоминаний (NEW)
│   │   │   ├── FavoriteButton.jsx    # Кнопка избранного (NEW)
│   │   │   ├── ReviewsSection.jsx    # Секция отзывов
│   │   │   ├── Rating.jsx            # Компонент рейтинга
│   │   │   └── Loader.jsx            # Индикаторы загрузки
│   │   │
│   │   ├── hooks/                    # Кастомные хуки (NEW)
│   │   │   ├── useDebounce.js        # Дебаунс значений
│   │   │   ├── useLocalStorage.js    # Работа с localStorage
│   │   │   ├── useMediaQuery.js      # Media queries
│   │   │   └── index.js              # Экспорт
│   │   │
│   │   ├── pages/                    # Страницы приложения
│   │   │   ├── Auth/                 # Авторизация
│   │   │   ├── PetProfile/           # Профили питомцев
│   │   │   ├── Shop/                 # Магазин (с рекомендациями)
│   │   │   ├── Training/             # Курсы + Конструктор
│   │   │   │   ├── Learning/         # Обучение (новая архитектура)
│   │   │   │   │   ├── CourseLearningPage.jsx    # Обзор курса (старая)
│   │   │   │   │   ├── CoursePageLearning.jsx    # Обучение с страницами (новая)
│   │   │   │   │   ├── LessonPage.jsx            # Урок (унаследован)
│   │   │   │   │   └── index.js                  # Экспорт
│   │   │   │   └── CourseBuilderPage.jsx # Конструктор курсов (NEW)
│   │   │   ├── Checkout/             # Оформление заказа
│   │   │   ├── Orders/               # Заказы
│   │   │   └── Dashboard/            # Личный кабинет (обновлён)
│   │   │       ├── Profile.jsx       # Профиль с напоминаниями
│   │   │       └── Settings.jsx      # Настройки
│   │   │
│   │   ├── store/                    # Zustand хранилища
│   │   │   ├── authStore.js          # Авторизация
│   │   │   ├── cartStore.js          # Корзина
│   │   │   ├── petStore.js           # Питомцы
│   │   │   ├── toastStore.js         # Уведомления
│   │   │   └── favoritesStore.js     # Избранное (NEW)
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── tailwind.config.js            # Tailwind с брендовыми цветами
│   └── package.json
│
└── PROJECT_STRUCTURE.md              # Эта документация
```

---

## API документация

### Базовые URL

```
Backend API:  http://localhost:8000/api
Frontend:     http://localhost:5173
Admin Panel:  http://localhost:8000/admin/
Dashboard:    http://localhost:8000/admin/dashboard/
```

### Новые эндпоинты (добавлены в этой версии)

#### Напоминания (`/api/pets/reminders/`)

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/pets/reminders/` | Список напоминаний |
| POST | `/api/pets/reminders/` | Создание напоминания |
| GET | `/api/pets/reminders/categories/` | Категории напоминаний |
| GET | `/api/pets/reminders/upcoming/` | Предстоящие напоминания |
| GET | `/api/pets/reminders/{id}/` | Детали напоминания |
| PUT | `/api/pets/reminders/{id}/` | Обновление напоминания |
| DELETE | `/api/pets/reminders/{id}/` | Удаление напоминания |
| POST | `/api/pets/reminders/{id}/complete/` | Отметить выполненным |

#### Рекомендации (`/api/shop/`)

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/shop/products/{id}/frequently-bought/` | Часто покупают вместе |
| GET | `/api/shop/cart/recommendations/` | Рекомендации для корзины |
| GET | `/api/shop/health-issues/` | Фильтры по проблемам здоровья |
| GET | `/api/shop/recommendations/` | Персональные рекомендации |

#### Конструктор курсов — NEW API (`/api/courses/`)
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/courses/{id}/builder/` | Структура курса для конструктора |
| PUT | `/api/courses/{id}/builder/` | Сохранение курса из конструктора |
| GET | `/api/courses/{id}/pages/` | Список страниц курса |
| POST | `/api/courses/{id}/pages/` | Создание страницы |
| GET | `/api/courses/{id}/pages/{pageId}/` | Детали страницы с блоками |
| PUT | `/api/courses/{id}/pages/{pageId}/` | Обновление страницы |
| DELETE | `/api/courses/{id}/pages/{pageId}/` | Удаление страницы |
| POST | `/api/pages/{pageId}/blocks/` | Создание блока |
| PUT | `/api/blocks/{blockId}/` | Обновление блока |
| DELETE | `/api/blocks/{blockId}/` | Удаление блока |
| POST | `/api/blocks/{blockId}/duplicate/` | Дублирование блока |
| POST | `/api/pages/{pageId}/complete/` | Завершение страницы |
| GET | `/api/page-templates/` | Шаблоны страниц |
| POST | `/api/page-templates/` | Создание шаблона страницы |
| POST | `/api/page-templates/{id}/use/` | Применение шаблона страницы |
| GET | `/api/block-templates/` | Шаблоны блоков |
| POST | `/api/block-templates/` | Создание шаблона блока |
| POST | `/api/block-templates/{id}/use/` | Использование шаблона блока |

---

## Модели данных

### Backend модели (38 моделей)

#### apps.users
- `User` - Пользователь (UUID, email auth)
- `Token` - Refresh токены пользователей

#### apps.pets
- `Pet` - Профиль питомца (PetID)
- `Reminder` - Напоминания по уходу
- `ReminderCategory` - Категории напоминаний
- `ReminderFrequency` - Частота напоминаний
- `EventReminder` - Напоминания о событиях

#### apps.shop
- `Product` - Товар в каталоге
- `Cart` - Корзина пользователя
- `CartItem` - Элемент корзины
- `Order` - Заказ
- `OrderItem` - Элемент заказа
- `Reservation` - Бронирование товара
- `Address` - Адрес доставки
- `Return` - Возврат товара
- `Review` - Отзыв о товаре

#### apps.training
- `Course` - Курс обучения
- `CoursePage` - Страница курса (новая архитектура)
- `ContentBlock` - Блок контента
- `BlockTemplate` - Шаблоны блоков
- `UserCourse` - Приобретенный курс
- `UserCourseProgress` - Прогресс обучения
- `UserLessonProgress` - Прогресс по уроку (унаследовано)
- `Lesson` - Урок (старая архитектура)
- `Comment` - Комментарии
- `CommentLike` - Лайки комментариев
- `Rating` - Оценки курсов

#### apps.payments
- `Payment` - Платеж

#### apps.calendar
- `CalendarEvent` - Событие календаря

#### apps.analytics
- `AnalyticMetric` - Метрика аналитики
- `ChartConfig` - Конфигурация графика
- `ChartSession` - Сессия графика
- `AnalyticsLog` - Лог аналитики

### Pet (Питомец / PetID) — обновлено

```python
class Pet(models.Model):
    id: UUID                    # UUIDv7 идентификатор
    owner: User                 # Владелец (FK)
    name: str                   # Кличка
    species: str                # Вид (dog/cat/bird/rodent/fish/reptile/other)
    breed: str | None           # Порода
    date_of_birth: date | None  # Дата рождения
    weight: Decimal | None      # Вес в кг
    gender: str                 # Пол (male/female/unknown)
    is_neutered: bool           # Кастрирован/Стерилизован
    photo: ImageField | None    # Фото питомца
    favorite_foods: list        # Любимые продукты (JSON)
    allergies: list             # Аллергии (JSON)
    health_issues: list         # Проблемы здоровья (JSON) - NEW
    activity_level: str         # Уровень активности (low/medium/high) - NEW
    created_at: datetime
    updated_at: datetime
```

### CoursePage (Страница курса) — NEW

```python
class CoursePage(models.Model):
    id: UUID                    # UUIDv7 идентификатор
    course: Course              # Курс (FK)
    title: str                  # Название страницы
    order_number: int           # Порядок в курсе
    page_type: str              # Тип страницы (text/video/interactive/quiz/webinar/assignment)
    settings: dict              # Настройки страницы (JSON)
    is_active: bool             # Активна ли страница
    created_at: datetime
    updated_at: datetime
```

### ContentBlock (Блок контента) — NEW

```python
class ContentBlock(models.Model):
    id: UUID                    # UUIDv7 идентификатор
    page: CoursePage            # Страница (FK)
    block_type: str             # Тип блока (rich_text/video_player/quiz/pet_action/gallery/etc.)
    content: dict               # Содержимое блока (JSON)
    settings: dict              # Настройки блока (JSON)
    order: int                  # Порядок в странице
    is_active: bool             # Активен ли блок
    created_at: datetime
    updated_at: datetime
```

### BlockTemplate (Шаблон блока) — NEW

```python
class BlockTemplate(models.Model):
    id: UUID                    # UUIDv7 идентификатор
    name: str                   # Название шаблона
    description: str            # Описание
    block_type: str             # Тип блока
    content: dict               # Содержимое шаблона (JSON)
    settings: dict              # Настройки шаблона (JSON)
    category: str               # Категория (text/media/interactive/pet_specific/utility)
    is_public: bool             # Публичный шаблон
    created_by: User            # Создатель (FK)
    usage_count: int            # Количество использований
    is_active: bool             # Активен ли шаблон
    created_at: datetime
    updated_at: datetime
```

### Reminder (Напоминание) — NEW

```python
class Reminder(models.Model):
    id: UUID                    # UUIDv7 идентификатор
    user: User                  # Владелец (FK)
    pet: Pet                    # Питомец (FK)
    title: str                  # Название
    description: str            # Описание
    category: str               # Категория (feeding/medication/vaccination/vet_visit/grooming/walk/training/hygiene/other)
    frequency: str              # Частота (once/daily/weekly/biweekly/monthly/quarterly/yearly)
    reminder_date: date         # Дата напоминания
    reminder_time: time | None  # Время напоминания
    is_active: bool             # Активно
    is_completed: bool          # Выполнено
    completed_at: datetime      # Дата выполнения
    notify_email: bool          # Email уведомление
    notify_push: bool           # Push уведомление
    notify_before: int          # Напомнить за N минут
    created_at: datetime
    updated_at: datetime
```

---

## Frontend архитектура

### UI Kit компоненты

| Компонент | Описание | Варианты |
|-----------|----------|----------|
| `Button` | Кнопки | primary, secondary, success, danger, warning, ghost, link |
| `Card` | Карточки | - |
| `Modal` | Модальные окна | sm, md, lg, xl |
| `Input` | Поля ввода | с валидацией |
| `Badge` | Бейджи/Метки | primary, secondary, success, danger, warning, info |
| `Progress` | Прогресс-бары | с кастомными цветами |

### Кастомные хуки

| Хук | Описание |
|-----|----------|
| `useDebounce` | Дебаунс значений для оптимизации запросов |
| `useLocalStorage` | Синхронизация состояния с localStorage |
| `useMediaQuery` | Реактивные media queries для адаптивности |

### Zustand stores

| Store | Описание |
|-------|----------|
| `authStore` | Авторизация, профиль пользователя |
| `cartStore` | Корзина покупок |
| `petStore` | Данные о питомцах |
| `toastStore` | Уведомления/тосты |
| `favoritesStore` | Избранные товары и курсы (NEW) |

---

## Система персонализации PetID

### PersonalizationService

```python
class PersonalizationService:
    @staticmethod
    def get_context(user) -> PersonalizationContext
        """Получает контекст всех питомцев пользователя."""
    
    @staticmethod
    def get_pet_context(user, pet_id) -> PetContext
        """Получает контекст конкретного питомца."""
    
    @classmethod
    def get_health_based_recommendations(cls, user, health_issue, limit=12)
        """Рекомендации на основе проблем здоровья."""
    
    @classmethod
    def get_full_recommendations(cls, user, products_limit=8, courses_limit=4)
        """Полные персонализированные рекомендации."""
```

### Маппинг проблем здоровья → категории товаров

| Проблема | Категории товаров |
|----------|-------------------|
| overweight | Диетические корма, контроль веса |
| sensitive_digestion | Гастро-корма, пробиотики |
| skin_issues | Шампуни, добавки Омега-3 |
| joint_problems | Хондропротекторы, добавки |
| dental_issues | Средства для зубов, игрушки |
| allergies | Гипоаллергенные корма |

---

## Система рекомендаций

### RecommendationEngine

Гибридная система рекомендаций:

1. **Collaborative Filtering** — "Часто покупают вместе"
   - Анализ истории заказов
   - Кэширование результатов (5 минут)

2. **Content-Based** — по категориям и атрибутам
   - Связи категорий товаров
   - Кросс-продажи курсов → товары

3. **PetID Personalization** — на основе профиля питомца
   - Учёт вида животного
   - Учёт проблем здоровья
   - Учёт уровня активности

---

## Система администрирования

Проект использует **двойную систему администрирования** для разных целей и ролей пользователей.

### Обзор админ-систем

| Админ-панель | URL | Для кого | Назначение |
|--------------|-----|----------|------------|
| **Django Admin** | `/admin/` | Superuser (разработчики, тех.админы) | Технические операции, миграции, отладка |
| **React Admin** | `/admin-panel/` | Staff (менеджеры, операторы, контент-менеджеры) | Ежедневное управление: заказы, курсы, товары |

---

### Django Admin (Техническая админка)

**URL:** `http://localhost:8000/admin/`

**Доступ:** Только для пользователей с `is_superuser=True`

**Назначение:**
- Прямой доступ к базе данных
- Миграции и обслуживание БД
- Отладка и диагностика
- Управление правами пользователей
- Технические операции

**Как получить доступ:**
```bash
cd backend
python manage.py createsuperuser
# Ввести email, пароль
```

---

### React Admin (Бизнес-админка)

**URL:** `http://localhost:5173/admin-panel/`

**Доступ:** Для пользователей с `is_staff=True` или `is_superuser=True`

**Назначение:**
- Управление заказами и доставками
- Создание и редактирование курсов
- Управление каталогом товаров
- Аналитика и отчёты
- Работа с отзывами и контентом

#### Архитектура React Admin

```
frontend/src/admin/
├── App.jsx                    # Главный компонент (без вложенного Router)
├── index.js                   # Экспорт компонентов
├── components/
│   ├── Layout/
│   │   ├── AdminLayout.jsx    # Основной layout с sidebar
│   │   ├── Sidebar.jsx        # Боковая навигация
│   │   └── Header.jsx         # Верхняя панель с профилем
│   ├── Dashboard/
│   │   ├── Dashboard.jsx      # Главный дашборд
│   │   ├── DashboardSelector.jsx # Выбор дашборда по ролям
│   │   ├── MetricCard.jsx     # Карточки метрик
│   │   └── ...                # Виджеты дашборда
│   ├── Tables/
│   │   ├── DataTable.jsx      # Универсальная таблица
│   │   ├── UsersTable.jsx     # Управление пользователями
│   │   ├── ProductsTable.jsx  # Управление товарами
│   │   ├── OrdersTable.jsx    # Управление заказами
│   │   ├── CoursesTable.jsx   # Управление курсами
│   │   └── PetsTable.jsx      # Управление питомцами
│   ├── Charts/
│   │   ├── LineChart.jsx      # Линейные графики
│   │   ├── BarChart.jsx       # Столбчатые диаграммы
│   │   ├── PieChart.jsx       # Круговые диаграммы
│   │   └── ComboChart.jsx     # Комбинированные графики
│   ├── Analytics/
│   │   ├── AnalyticsDashboard.jsx # Аналитический дашборд
│   │   └── DrillDownModal.jsx # Детализация данных
│   ├── Forms/
│   │   ├── Modal.jsx          # Модальные окна
│   │   ├── UserForm.jsx       # Форма пользователя
│   │   └── ProductForm.jsx    # Форма товара
│   ├── Export/
│   │   ├── ExportButton.jsx   # Кнопка экспорта
│   │   └── ExportModal.jsx    # Модалка выбора формата
│   └── Notifications/
│       └── NotificationCenter.jsx # Центр уведомлений
├── hooks/
│   ├── useAdminAuth.js        # Хук авторизации админа
│   ├── useAnalytics.js        # Хук аналитических данных
│   ├── useDashboardData.js    # Хук данных дашборда
│   └── useForm.js             # Хук управления формами
├── stores/
│   └── adminStore.js          # Zustand store для админки
└── utils/
    └── api.js                 # API клиент для /api/admin/
```

#### Backend API для React Admin

**URL:** `/api/admin/`

**Защита:** Все эндпоинты требуют `is_staff=True` (permission `IsAdminUser`)

| Группа | Эндпоинт | Методы | Описание |
|--------|----------|--------|----------|
| **Аналитика** | `/api/admin/analytics/dashboard_overview/` | GET | Обзорные метрики |
| | `/api/admin/analytics/charts_data/` | GET | Данные для графиков |
| | `/api/admin/analytics/sales_trends/` | GET | Тренды продаж |
| | `/api/admin/analytics/users_trends/` | GET | Тренды регистраций |
| | `/api/admin/analytics/pets_distribution/` | GET | Распределение питомцев |
| | `/api/admin/analytics/top_products/` | GET | Топ товаров |
| | `/api/admin/analytics/recent_orders/` | GET | Последние заказы |
| **Управление** | `/api/admin/management/bulk_update_products/` | POST | Массовое обновление товаров |
| | `/api/admin/management/bulk_update_orders/` | POST | Массовое обновление заказов |
| | `/api/admin/management/export_data/` | GET | Экспорт данных (CSV/Excel/PDF/JSON) |
| **CRUD** | `/api/admin/users/` | GET, POST, PATCH, DELETE | Управление пользователями |
| | `/api/admin/pets/` | GET, POST, PATCH, DELETE | Управление питомцами |
| | `/api/admin/products/` | GET, POST, PATCH, DELETE | Управление товарами |
| | `/api/admin/orders/` | GET, POST, PATCH, DELETE | Управление заказами |
| | `/api/admin/courses/` | GET, POST, PATCH, DELETE | Управление курсами |
| `/admin-panel/courses/create` | Страница создания курса | Новая страница с формой |
| `/admin-panel/courses/{id}/edit` | Страница редактирования | Редактирование + билдер |
| `/admin-panel/courses/{id}/builder` | Конструктор курса | Drag-and-drop билдер |
| **Статистика** | `/api/admin/stats/summary/` | GET | Быстрая сводка |

#### Система безопасности

**Frontend защита (AdminRoute):**
```jsx
// Проверяет авторизацию и права доступа
<Route path="/admin-panel/*" element={
  <AdminRoute>  {/* Проверяет is_staff */}
    <AdminApp />
  </AdminRoute>
} />
```

**Backend защита (IsAdminUser):**
```python
class AdminAnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]  # Требует is_staff=True
```

**Уровни доступа:**

| Роль | is_staff | is_superuser | Django Admin | React Admin |
|------|----------|--------------|--------------|-------------|
| Обычный пользователь | ❌ | ❌ | ❌ | ❌ |
| Менеджер (staff) | ✅ | ❌ | ❌ | ✅ |
| Администратор | ✅ | ✅ | ✅ | ✅ |

#### Как назначить права staff

**Через Django Admin:**
1. Войти в `/admin/` как superuser
2. Перейти в "Пользователи"
3. Выбрать пользователя
4. Установить галочку "Статус персонала" (is_staff)
5. Сохранить

**Через код:**
```python
from apps.users.models import User

user = User.objects.get(email='manager@example.com')
user.is_staff = True
user.save()
```

#### Возможности React Admin

| Функция | Описание | Статус |
|---------|----------|--------|
| **Дашборд** | Обзор метрик: пользователи, заказы, выручка, питомцы | ✅ Работает с данными из базы |
| **Аналитика** | Интерактивные графики Chart.js с drill-down | ✅ Работает с данными из базы |
| **Таблицы** | Фильтрация, сортировка, поиск, пагинация | ✅ Работают с данными из базы |
| **Массовые операции** | Bulk update статусов, активации | ✅ Реализованы для всех таблиц |
| **Экспорт** | CSV, Excel, PDF, JSON с фильтрами | ✅ Реализован через API |
| **Формы редактирования** | CourseForm, UserForm, ProductForm | ✅ Полная валидация и UX |
| **Управление курсами** | Создание, просмотр и редактирование курсов | ✅ Полная CRUD функциональность |
| **Управление товарами** | Просмотр каталога, редактирование цен | ✅ Работает с данными из базы |
| **Управление заказами** | Смена статусов, просмотр деталей | ✅ Работает с данными из базы |

#### Тестовые данные

| Сущность | Количество | Заполнение | Статус |
|----------|------------|------------|--------|
| **Пользователи** | 57 | Реальные профили с email, именами, телефонами | ✅ Полностью заполнено |
| **Питомцы** | 106 | Собаки и кошки с породами и владельцами | ✅ Полностью заполнено |
| **Товары** | 11,143 | Каталог с ценами, брендами, остатками на складе | ✅ Полностью заполнено |
| **Заказы** | 226 | Полная история заказов с товарами и статусами | ✅ Полностью заполнено |
| **Курсы** | 63 | Образовательный контент со статистикой + тестовый курс | ✅ Полностью заполнено |

#### Создание курсов в админке

**Расположение:** `/admin-panel/courses`

**Кнопка создания:** Синяя кнопка "Создать курс" в верхней части таблицы ведет на **отдельную страницу** `/admin-panel/courses/create`

**Процесс создания курса (расширенный):**
1. **Вкладка "Основная информация"** - заполнение базовых данных курса
2. **Вкладка "Структура курса"** - создание уроков и наполнения
3. **Кнопка "Создать курс с уроками"** - одновременное создание курса и всех уроков

**Форма создания включает:**

**Вкладка "Основная информация":**
- Название и описание курса
- Категорию, уровень сложности, тип животного
- Цену, длительность, формат обучения
- Информацию об инструкторе
- Статус активности

**Вкладка "Структура курса":**
- **Управление уроками:**
  - Добавление новых уроков
  - Редактирование существующих уроков
  - Удаление уроков
  - Изменение порядка уроков (вверх/вниз)
- **Параметры уроков:**
  - Название и описание урока
  - Тип контента (видео, текст, интерактив, смешанный, вебинар, мастер-класс)
  - Длительность урока
  - Обязательность прохождения
  - Контент в зависимости от типа:
    - **Видео:** URL видео, описание, транскрипт
    - **Текст:** Текстовый контент
    - **Интерактив:** Викторины и тесты
    - **Смешанный:** Комбинация видео + текст + викторины
    - **Вебинар:** Ссылка на вебинарную платформу
    - **Мастер-класс:** Пошаговые инструкции
- **Дополнительные материалы:** PDF, ссылки и ресурсы

**Опции после создания:**
- "Сохранить и перейти в билдер" - переход в конструктор для детальной настройки
- "К списку курсов" - возврат к таблице курсов

**Редактирование курсов:**
- Кнопка "Редактировать" ведет на страницу `/admin-panel/courses/{id}/edit`
- Возможность "Перейти в билдер" для существующих курсов
- Полная интеграция с конструктором курсов

**Конструктор курсов:**
- Доступен по маршруту `/admin-panel/courses/{id}/builder`
- Полная функциональность drag-and-drop для создания уроков
- Управление блоками контента

#### Финальное тестирование ✅

| Компонент | Статус | Примечания |
|-----------|--------|------------|
| **React Admin UI** | ✅ Работает | Все компоненты рендерятся корректно |
| **API Backend** | ✅ Работает | Все эндпоинты доступны |
| **Аутентификация** | ✅ Работает | JWT токены, IsAdminUser |
| **База данных** | ✅ Заполнена | Реальные данные для тестирования |
| **Frontend сборка** | ✅ Проходит | Vite build без ошибок |
| **Обработка ошибок** | ✅ Исправлена | DataTable показывает ошибки корректно |
| **API пути** | ✅ Исправлены | Правильные эндпоинты для всех таблиц |

#### Исправленные проблемы

| Проблема | Решение | Статус |
|----------|---------|--------|
| **Ошибки в API путях** | Исправлен baseURL в admin/utils/api.js | ✅ |
| **Отсутствие обработки ошибок** | Добавлена обработка ошибок в DataTable | ✅ |
| **Тестовые заглушки** | Убраны все заглушки, только реальные данные | ✅ |
| **Некорректная сериализация** | Исправлены поля в компонентах RecentPets | ✅ |
| **Проблемы с авторизацией** | Улучшено логирование в API интерцепторах | ✅ |
| **AdminCourseViewSet ошибки** | Переписан с нуля без AdminModelViewSet | ✅ |
| **Отсутствие форм редактирования** | Создан CourseForm с полной валидацией | ✅ |
| **Отсутствие действий в таблицах** | Добавлены row actions для всех таблиц | ✅ |
| **Отсутствие создания курсов** | Добавлена кнопка "Создать курс" и API | ✅ |

#### Система экспорта данных

| Формат | Описание | Использование |
|--------|----------|---------------|
| **CSV** | Текстовый с разделителями `;` | Excel, Google Sheets |
| **Excel** | XLSX формат | Нативная работа в Excel |
| **PDF** | Структурированные отчёты | Печать, архивирование |
| **JSON** | Структурированные данные | API интеграции, импорт |

---

## Запуск проекта

### Быстрый старт

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py load_test_data
python manage.py load_courses

# Создание суперпользователя (для админ-панели)
python manage.py createsuperuser

# Миграция курсов в новую архитектуру (опционально)
python manage.py migrate_lessons_to_pages --dry-run  # Предварительный просмотр
python manage.py migrate_lessons_to_pages            # Выполнение миграции

python manage.py runserver

# Frontend (в другом терминале)
cd frontend
npm install
npm run dev
```

### Доступ

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **Admin Panel**: http://localhost:8000/admin
- **Dashboard**: http://localhost:8000/admin/dashboard/

---

## Тестирование

### Сценарий тестирования

#### Базовое тестирование
1. Открыть http://localhost:5173
2. Зарегистрировать аккаунт
3. Создать профиль питомца с проблемами здоровья
4. Проверить персональные рекомендации в магазине
5. Добавить товары в корзину → проверить "Часто покупают вместе"
6. Создать напоминание для питомца
7. Оформить заказ
8. Проверить админ-панель: /admin/dashboard/

#### Тестирование конструктора курсов
1. Войти как администратор
2. Перейти в раздел "Курсы" → выбрать курс → "Конструктор"
3. Протестировать drag-and-drop блоков из панели инструментов
4. Создать новую страницу и наполнить её блоками
5. Использовать предпросмотр на разных устройствах
6. Проверить вкладки: Шаблоны, Аналитика, Импорт/Экспорт
7. Создать шаблон блока или страницы
8. Экспортировать курс и импортировать обратно
9. Перейти к обучению и проверить отображение блоков

#### Тестирование новой системы обучения
1. Записаться на курс как студент
2. Проверить автоматическое перенаправление на новую архитектуру страниц
3. Протестировать навигацию между страницами
4. Проверить интерактивные блоки (тесты, действия с питомцем)
5. Завершить страницу и проверить прогресс

---

## История изменений

### v2.1 (Январь 2026) — Очистка проекта

**Очистка:**
- ✅ Удалены временные файлы (cookies.txt, .xml файлы)
- ✅ Удалены дублирующиеся скрипты создания пользователей (4 файла объединены в стандартную Django команду)
- ✅ Удалены тестовые скрипты из корня проекта (check_data.py, check_db.py, test_api.py)
- ✅ Удалены дублирующиеся setup скрипты (setup_db_final.py, setup_simple.py)
- ✅ Удалены временные настройки (settings_temp.py)
- ✅ Удалена ошибочная директория Pet_dev
- ✅ Удален неиспользуемый тестовый компонент (FavoritesTest.jsx)
- ✅ Максимизировано переиспользование кода
- ✅ Обновлена документация структуры проекта

**Результат:** Проект очищен от временных файлов, дубликатов и неиспользуемого кода. Все функции сохранены.

### v0.2.0 (Декабрь 2024) — Модернизация

**Backend:**
- ✅ Кастомные QuerySet менеджеры (ProductManager, CourseManager)
- ✅ Service Layer (PersonalizationService, RecommendationEngine)
- ✅ Система напоминаний (Reminder model + API)
- ✅ Расширение Pet модели (health_issues, activity_level)
- ✅ Кастомная админ-панель с дашбордом
- ✅ Экспорт CSV и массовые операции
- ✅ Оптимизация N+1 запросов

**Frontend:**
- ✅ UI Kit (Button, Card, Modal, Input, Badge, Progress)
- ✅ Кастомные хуки (useDebounce, useLocalStorage, useMediaQuery)
- ✅ Система избранного (favoritesStore + FavoriteButton)
- ✅ Блок рекомендаций (RecommendationBlock)
- ✅ Виджет напоминаний (RemindersWidget)
- ✅ Улучшенный профиль с прогрессом курсов
- ✅ Tailwind с брендовыми цветами

### v0.4.0 (Декабрь 2025) — Редизайн админ-панели

**Backend:**
- ✅ Полная замена Django admin на React интерфейс
- ✅ REST API для админки с 15+ эндпоинтами аналитики
- ✅ Система экспорта данных (CSV, Excel, PDF, JSON)
- ✅ Оптимизированные запросы для графиков с кэшированием
- ✅ Drill-down аналитика с агрегацией данных

**Frontend:**
- ✅ React админ-панель с модульной архитектурой
- ✅ Chart.js интеграция с 4 типами графиков
- ✅ Ролевая система дашбордов (admin/manager/staff)
- ✅ Модальные формы с drag-and-drop загрузкой изображений
- ✅ Система уведомлений с категориями и фильтрами
- ✅ Адаптивный дизайн для всех устройств
- ✅ Real-time обновления каждые 5 минут

### v0.3.0 (Декабрь 2025) — Конструктор курсов

**Backend:**
- ✅ Новая архитектура курсов: Страницы + Блоки контента
- ✅ Модели CoursePage, ContentBlock, BlockTemplate
- ✅ API для управления страницами и блоками
- ✅ Сериализаторы для всех новых моделей
- ✅ Management команда migrate_lessons_to_pages
- ✅ 9 типов блоков контента (текст, видео, тесты, галереи, действия с питомцем и др.)
- ✅ Шаблоны блоков и страниц для переиспользования
- ✅ Аналитика использования блоков
- ✅ Импорт/экспорт курсов в JSON формате

**Frontend:**
- ✅ Полнофункциональный конструктор курсов с drag-and-drop
- ✅ CourseBuilder компонент с тремя панелями (инструменты, холст, свойства)
- ✅ 7 специализированных блоков контента с визуальными редакторами
- ✅ Предпросмотр курса на разных устройствах
- ✅ Система шаблонов страниц и блоков
- ✅ Аналитика эффективности блоков
- ✅ Импорт/экспорт курсов
- ✅ Новая система обучения с архитектурой страниц
- ✅ Обратная совместимость с существующими уроками
- ✅ React Router интеграция для новых маршрутов

### v0.2.0 (Декабрь 2024) — Модернизация

**Backend:**
- ✅ Кастомные QuerySet менеджеры (ProductManager, CourseManager)
- ✅ Service Layer (PersonalizationService, RecommendationEngine)
- ✅ Система напоминаний (Reminder model + API)
- ✅ Расширение Pet модели (health_issues, activity_level)
- ✅ Кастомная админ-панель с дашбордом
- ✅ Экспорт CSV и массовые операции
- ✅ Оптимизация N+1 запросов

**Frontend:**
- ✅ UI Kit (Button, Card, Modal, Input, Badge, Progress)
- ✅ Кастомные хуки (useDebounce, useLocalStorage, useMediaQuery)
- ✅ Система избранного (favoritesStore + FavoriteButton)
- ✅ Блок рекомендаций (RecommendationBlock)
- ✅ Виджет напоминаний (RemindersWidget)
- ✅ Улучшенный профиль с прогрессом курсов
- ✅ Tailwind с брендовыми цветами

### v0.1.0 (Ноябрь 2024) — MVP

- Базовая авторизация и профиль
- Каталог товаров и курсов
- Корзина и заказы
- Единая система платежей

---

## Функции проекта

### Backend API (Django REST Framework)

#### Модуль пользователей (`apps.users`)

**Views (Представления):**
- `RegisterView.post()` - Регистрация нового пользователя с отправкой email активации
- `LoginView.post()` - Аутентификация пользователя с JWT токенами
- `LogoutView.post()` - Выход пользователя с удалением refresh токена
- `RefreshView.get()` - Обновление access токена по refresh токену
- `ActivateView.get()` - Активация аккаунта по ссылке из email
- `ActivateByCodeView.post()` - Активация аккаунта по коду из email
- `ExchangeAuthCodeView.post()` - Обмен временного кода на токены после активации
- `ProfileView.get()` - Получение профиля пользователя с питомцами и заказами
- `ProfileView.put()` - Обновление данных профиля
- `UserOrdersView.get()` - Получение истории заказов пользователя
- `UserCoursesView.get()` - Получение курсов пользователя
- `GetUsersView.get()` - Получение списка всех пользователей (для тестирования)

**Services (Сервисы):**
- `UserService.registration()` - Регистрация пользователя с генерацией кодов активации
- `UserService.activate()` - Активация аккаунта по ссылке или коду
- `UserService.exchange_temp_code_for_tokens()` - Обмен временного кода на токены
- `UserService.login()` - Вход с валидацией и генерацией токенов
- `UserService.logout()` - Выход с удалением токена из БД
- `UserService.refresh()` - Обновление токенов по refresh токену
- `UserService.get_all_users()` - Получение всех пользователей
- `TokenService.generate_tokens()` - Генерация JWT токенов для пользователя
- `TokenService.validate_access_token()` - Валидация access токена
- `TokenService.validate_refresh_token()` - Валидация refresh токена
- `TokenService.save_token()` - Сохранение refresh токена в БД
- `TokenService.remove_token()` - Удаление refresh токена из БД
- `TokenService.find_token()` - Поиск refresh токена в БД
- `MailService.send_activation_mail()` - Отправка email активации с кодом и ссылкой

#### Модуль питомцев (`apps.pets`)

**Views (Представления):**
- `PetListCreateView.get()` - Получение списка питомцев пользователя
- `PetListCreateView.post()` - Создание нового питомца
- `PetDetailView.get()` - Получение деталей питомца
- `PetDetailView.put()` - Обновление данных питомца
- `PetDetailView.delete()` - Удаление питомца
- `ReminderListView.get()` - Получение списка напоминаний с фильтрами
- `ReminderListView.post()` - Создание нового напоминания
- `ReminderDetailView.get()` - Получение деталей напоминания
- `ReminderDetailView.put()` - Обновление напоминания
- `ReminderDetailView.delete()` - Удаление напоминания
- `ReminderCompleteView.post()` - Отметка напоминания как выполненного
- `ReminderCategoriesView.get()` - Получение категорий и частот напоминаний
- `UpcomingRemindersView.get()` - Получение предстоящих напоминаний для дашборда

**Services (Сервисы):**
- `PersonalizationService.get_context()` - Получение контекста персонализации для пользователя
- `PersonalizationService.get_pet_context()` - Получение контекста конкретного питомца
- `PersonalizationService.filter_products()` - Фильтрация товаров по контексту питомцев
- `PersonalizationService.filter_courses()` - Фильтрация курсов по контексту питомцев
- `PersonalizationService.get_product_recommendations()` - Персональные рекомендации товаров
- `PersonalizationService.get_course_recommendations()` - Персональные рекомендации курсов
- `PersonalizationService.get_health_based_recommendations()` - Рекомендации по проблемам здоровья
- `PersonalizationService.get_available_health_filters()` - Доступные фильтры здоровья
- `PersonalizationService.get_full_recommendations()` - Полные персонализированные рекомендации

#### Модуль магазина (`apps.shop`)

**Views (Представления):**
- `ProductListView.get()` - Каталог товаров с расширенной фильтрацией и пагинацией
- `ProductDetailView.get()` - Детали товара с рекомендациями
- `ProductFrequentlyBoughtView.get()` - "Часто покупают вместе" для товара
- `CartView.get()` - Получение содержимого корзины
- `CartView.post()` - Добавление товара в корзину
- `CartView.delete()` - Очистка корзины
- `CartItemView.put()` - Обновление количества товара в корзине
- `CartItemView.delete()` - Удаление товара из корзины
- `CartRecommendationsView.get()` - Рекомендации для корзины
- `OrderListView.get()` - Список заказов пользователя
- `OrderDetailView.get()` - Детали заказа
- `OrderCreateView.post()` - Создание заказа из корзины
- `OrderCancelView.post()` - Отмена заказа
- `PersonalRecommendationsView.get()` - Персональные рекомендации товаров и курсов
- `HealthIssuesFilterView.get()` - Фильтры по проблемам здоровья
- `ReservationCreateView.post()` - Бронирование товаров
- `ReservationListView.get()` - Список броней пользователя

**Managers (Менеджеры):**
- `ProductQuerySet.with_ratings()` - Добавление аннотаций рейтинга и отзывов
- `ProductQuerySet.available()` - Фильтр доступных товаров
- `ProductQuerySet.for_animal()` - Фильтр по типу животного
- `ProductQuerySet.in_category()` - Фильтр по категории и подкатегории
- `ProductQuerySet.by_price_range()` - Фильтр по диапазону цен
- `ProductQuerySet.with_discount()` - Фильтр товаров со скидкой
- `ProductQuerySet.search()` - Поиск по названию товара
- `ProductQuerySet.by_vendor()` - Фильтр по бренду
- `ProductQuerySet.with_min_rating()` - Фильтр по минимальному рейтингу
- `ProductQuerySet.order_by_rating()` - Сортировка по рейтингу
- `ProductQuerySet.order_by_popularity()` - Сортировка по популярности
- `ProductManager.catalog()` - Оптимизированный менеджер для каталога
- `ProductManager.with_ratings()` - Менеджер с аннотациями рейтинга

**Services (Сервисы):**
- `CartService.get_cart_items()` - Получение товаров в корзине с оптимизацией
- `CartService.add_to_cart()` - Добавление товара в корзину
- `CartService.update_cart_item()` - Обновление количества в корзине
- `CartService.remove_from_cart()` - Удаление товара из корзины
- `CartService.clear_cart()` - Очистка корзины
- `CartService.get_cart_summary()` - Суммарная информация о корзине
- `OrderService.create_order()` - Создание заказа из корзины
- `OrderService.cancel_order()` - Отмена заказа
- `OrderService.get_user_orders()` - Получение заказов пользователя
- `OrderService.process_expired_orders()` - Обработка просроченных заказов
- `ReservationService.create_reservation()` - Создание брони товара
- `ReservationService.cancel_reservation()` - Отмена брони
- `ReservationService.check_reservation_status()` - Проверка статуса брони

**Recommendation Engine:**
- `RecommendationEngine.get_frequently_bought_together()` - Анализ "Часто покупают вместе"
- `RecommendationEngine.get_cart_recommendations()` - Рекомендации для корзины
- `RecommendationEngine.get_cross_sell_for_courses()` - Кросс-продажи курсов → товары
- `RecommendationEngine._get_category_based_recommendations()` - Рекомендации по категориям
- `RecommendationEngine._get_popular_recommendations()` - Популярные товары
- `RecommendationEngine._apply_personalization()` - Применение персонализации PetID

#### Модуль курсов (`apps.training`)

**Models (Модели):**
- `Course` - Курс обучения с базовой информацией
- `Lesson` - Урок (унаследован от старой архитектуры)
- `CoursePage` - Страница курса (новая архитектура)
- `ContentBlock` - Блок контента на странице
- `BlockTemplate` - Шаблоны блоков для переиспользования
- `UserCourse` - Приобретенный курс пользователя
- `UserCourseProgress` - Прогресс обучения
- `Comment` - Комментарии к урокам
- `CommentLike` - Лайки комментариев
- `Rating` - Рейтинги курсов

**Views (Представления):**
- `CourseListView.get()` - Каталог курсов с фильтрами
- `CourseDetailView.get()` - Детали курса с отзывами
- `UserCourseListView.get()` - Курсы пользователя с прогрессом
- `UserCoursePurchaseView.post()` - Покупка курса
- `UserCourseDetailView.get()` - Детали приобретенного курса
- `UserCourseProgressView.put()` - Обновление прогресса обучения
- `CourseReviewsView.get()` - Отзывы о курсе
- `CourseReviewsView.post()` - Добавление отзыва о курсе
- `CourseBuilderView.get()` - Получение структуры курса для конструктора
- `CoursePageListView.get()` - Список страниц курса
- `CoursePageDetailView.get()` - Детали страницы курса
- `CoursePageCreateView.post()` - Создание страницы курса
- `CoursePageUpdateView.put()` - Обновление страницы курса
- `CoursePageDeleteView.delete()` - Удаление страницы курса
- `ContentBlockListView.get()` - Список блоков страницы
- `ContentBlockCreateView.post()` - Создание блока контента
- `ContentBlockUpdateView.put()` - Обновление блока контента
- `ContentBlockDeleteView.delete()` - Удаление блока контента
- `ContentBlockDuplicateView.post()` - Дублирование блока
- `BlockTemplateListView.get()` - Список шаблонов блоков
- `BlockTemplateCreateView.post()` - Создание шаблона блока
- `BlockTemplateUseView.post()` - Использование шаблона
- `CoursePageCompleteView.post()` - Завершение страницы курса
- `PageTemplateListView.get()` - Шаблоны страниц
- `PageTemplateUseView.post()` - Использование шаблона страницы

**Managers (Менеджеры):**
- `CourseQuerySet.with_ratings()` - Аннотации рейтинга курсов
- `CourseQuerySet.catalog()` - Оптимизированный каталог курсов
- `CourseQuerySet.for_pet_type()` - Фильтр по типу животного
- `CourseQuerySet.by_level()` - Фильтр по уровню сложности
- `CourseQuerySet.by_category()` - Фильтр по категории
- `CourseManager.catalog()` - Менеджер каталога курсов

#### Модуль платежей (`apps.payments`)

**Views (Представления):**
- `PaymentListView.get()` - История платежей
- `PaymentDetailView.get()` - Детали платежа
- `PaymentCreateView.post()` - Создание платежа
- `PaymentStatusView.get()` - Проверка статуса платежа
- `PaymentWebhookView.post()` - Обработка вебхуков платежной системы

**Services (Сервисы):**
- `PaymentService.create_payment()` - Создание платежа
- `PaymentService.process_payment()` - Обработка платежа
- `PaymentService.refund_payment()` - Возврат платежа
- `PaymentService.get_payment_status()` - Получение статуса платежа

#### Модуль отзывов (`apps.reviews`)

**Views (Представления):**
- `ReviewListView.get()` - Список отзывов с фильтрами
- `ReviewCreateView.post()` - Создание отзыва
- `ReviewDetailView.get()` - Детали отзыва
- `ReviewDetailView.put()` - Обновление отзыва
- `ReviewDetailView.delete()` - Удаление отзыва
- `ReviewApproveView.post()` - Одобрение отзыва (админ)
- `ReviewRejectView.post()` - Отклонение отзыва (админ)

**Utils (Утилиты):**
- `calculate_rating_stats()` - Расчёт статистики рейтингов

#### Модуль календаря (`apps.calendar`)

**Views (Представления):**
- `CalendarEventListView.get()` - События календаря
- `CalendarEventCreateView.post()` - Создание события
- `CalendarEventDetailView.get()` - Детали события
- `CalendarEventDetailView.put()` - Обновление события
- `CalendarEventDetailView.delete()` - Удаление события
- `CalendarSyncView.post()` - Синхронизация с внешними календарями

### Frontend API (React + Axios)

#### Модуль аутентификации (`api/auth.js`)
- `login()` - Вход по email и паролю
- `register()` - Регистрация нового пользователя
- `logout()` - Выход пользователя
- `refresh()` - Обновление токенов
- `activateByCode()` - Активация по коду
- `exchangeAuthCode()` - Обмен кода на токены
- `getProfile()` - Получение профиля пользователя
- `updateProfile()` - Обновление профиля
- `getUserOrders()` - Заказы пользователя
- `getUserCourses()` - Курсы пользователя

#### Модуль питомцев (`api/pets.js`)
- `getPets()` - Список питомцев пользователя
- `getPet()` - Детали питомца
- `createPet()` - Создание питомца
- `updatePet()` - Обновление питомца
- `deletePet()` - Удаление питомца

#### Модуль напоминаний (`api/reminders.js`)
- `getReminders()` - Список напоминаний
- `createReminder()` - Создание напоминания
- `getReminder()` - Детали напоминания
- `updateReminder()` - Обновление напоминания
- `deleteReminder()` - Удаление напоминания
- `completeReminder()` - Отметка выполненным
- `getReminderCategories()` - Категории напоминаний
- `getUpcomingReminders()` - Предстоящие напоминания

#### Модуль магазина (`api/shop.js`)
- `getProducts()` - Каталог товаров с фильтрами
- `getProduct()` - Детали товара
- `getFrequentlyBoughtTogether()` - "Часто покупают вместе"
- `getPersonalRecommendations()` - Персональные рекомендации
- `getCartRecommendations()` - Рекомендации для корзины
- `getHealthIssuesFilters()` - Фильтры по здоровью
- `getCart()` - Содержимое корзины
- `addToCart()` - Добавление в корзину
- `updateCartItem()` - Обновление количества
- `removeFromCart()` - Удаление из корзины
- `clearCart()` - Очистка корзины
- `createOrder()` - Создание заказа
- `getOrders()` - Список заказов
- `getOrder()` - Детали заказа
- `cancelOrder()` - Отмена заказа

#### Модуль курсов (`api/courses.js`)
- `getCourses()` - Каталог курсов
- `getCourse()` - Детали курса
- `purchaseCourse()` - Покупка курса
- `getUserCourses()` - Курсы пользователя
- `updateCourseProgress()` - Обновление прогресса
- `getCourseReviews()` - Отзывы о курсе
- `createCourseReview()` - Создание отзыва

#### Конструктор курсов — NEW API
- `getCourseBuilder()` - Структура курса для конструктора
- `saveCourseBuilder()` - Сохранение изменений курса
- `getCoursePages()` - Список страниц курса
- `getCoursePage()` - Детали страницы с блоками
- `createCoursePage()` - Создание новой страницы
- `updateCoursePage()` - Обновление страницы
- `deleteCoursePage()` - Удаление страницы
- `createContentBlock()` - Создание блока контента
- `updateContentBlock()` - Обновление блока
- `deleteContentBlock()` - Удаление блока
- `duplicateContentBlock()` - Дублирование блока
- `completeCoursePage()` - Завершение страницы
- `getPageTemplates()` - Шаблоны страниц
- `createPageTemplate()` - Создание шаблона страницы
- `usePageTemplate()` - Применение шаблона страницы
- `getBlockTemplates()` - Шаблоны блоков
- `createBlockTemplate()` - Создание шаблона блока
- `useBlockTemplate()` - Использование шаблона блока
- `previewCourse()` - Предпросмотр курса
- `publishCourse()` - Публикация курса

#### Модуль платежей (`api/payments.js`)
- `getPayments()` - История платежей
- `getPayment()` - Детали платежа
- `createPayment()` - Создание платежа
- `getPaymentStatus()` - Статус платежа

#### Модуль отзывов (`api/reviews.js`)
- `getReviews()` - Список отзывов
- `createReview()` - Создание отзыва
- `updateReview()` - Обновление отзыва
- `deleteReview()` - Удаление отзыва

### React Components (UI Kit)

#### Базовые компоненты (`components/ui/`)
- `Button` - Кнопки с вариантами (primary, secondary, success, danger, warning, ghost, link)
- `Card` - Карточки для контента
- `Modal` - Модальные окна с размерами (sm, md, lg, xl)
- `Input` - Поля ввода с валидацией
- `Badge` - Бейджи/метки с цветами
- `Progress` - Прогресс-бары с кастомными цветами

#### Конструктор курсов (`components/CourseBuilder/`) — NEW
- `CourseBuilder` - Основной компонент конструктора с тремя панелями
- `ToolboxPanel` - Панель инструментов с вкладками (Блоки, Шаблоны, Страницы, Аналитика, Импорт/Экспорт)
- `CanvasArea` - Рабочая область с drag-and-drop для страниц и блоков
- `PropertiesPanel` - Панель свойств для настройки выбранных элементов
- `PageNavigation` - Навигация по страницам курса
- `DroppablePage` - Контейнер для блоков на странице
- `ContentBlock` - Универсальный компонент блока с drag-and-drop
- `CoursePreview` - Предпросмотр курса на разных устройствах
- `PageTemplates` - Управление шаблонами страниц
- `BlockAnalytics` - Аналитика использования блоков
- `CourseImportExport` - Импорт/экспорт курсов в JSON

#### Специализированные блоки (`components/CourseBuilder/Blocks/`) — NEW
- `RichTextEditor` - WYSIWYG редактор с TipTap для форматированного текста
- `VideoPlayer` - Конструктор видео-блоков с настройками плеера
- `QuizBuilder` - Визуальный конструктор тестов с вариантами ответов
- `PetActionBlock` - Конфигуратор действий с питомцем (упражнения, команды)
- `GalleryBlock` - Галерея изображений с загрузкой и сортировкой
- `FileDownloadBlock` - Блок для предоставления файлов пользователям
- `BlockTemplates` - Управление шаблонами блоков
- `BlockRenderers` - Компоненты для отображения блоков в режиме обучения

#### Основные компоненты (`components/`)
- `Layout` - Основной макет приложения
- `Navbar` - Навигационная панель
- `PetCard` - Карточка питомца
- `ProductCard` - Карточка товара с кнопкой избранного
- `CourseCard` - Карточка курса с кнопкой избранного
- `RecommendationBlock` - Блок рекомендаций
- `RemindersWidget` - Виджет напоминаний
- `FavoriteButton` - Кнопка добавления в избранное
- `ReviewsSection` - Секция отзывов
- `Rating` - Компонент рейтинга
- `Loader` - Индикаторы загрузки

### React Hooks (Custom Hooks)

#### Хуки (`hooks/`)
- `useDebounce(value, delay)` - Дебаунс значения для оптимизации запросов
- `useDebouncedCallback(callback, delay)` - Дебаунсированная функция
- `useLocalStorage(key, initialValue)` - Синхронизация с localStorage
- `useMediaQuery(query)` - Реактивные media queries
- `useIsMobile()` - Проверка мобильного устройства
- `useIsTablet()` - Проверка планшета
- `useIsDesktop()` - Проверка десктопа
- `usePrefersReducedMotion()` - Предпочтения анимаций
- `usePrefersDarkMode()` - Предпочтения тёмной темы

### Конструктор курсов (Course Builder)

#### Архитектура конструктора
- **Модульная структура**: Курс → Страницы → Блоки контента
- **9 типов блоков**: Rich Text, Video, Quiz, Pet Action, Gallery, File Download, Checklist, Timer, Progress Tracker
- **Drag-and-drop интерфейс**: @dnd-kit для интуитивного создания контента
- **Шаблоны**: Переиспользуемые блоки и страницы для быстрого создания
- **Предпросмотр**: На мобильных, планшетных и десктопных устройствах
- **Аналитика**: Статистика эффективности различных типов контента

#### Backend API конструктора
- `CourseBuilderView` - Получение полной структуры курса для редактирования
- `CoursePageViewSet` - CRUD операции со страницами курса
- `ContentBlockViewSet` - Управление блоками контента
- `BlockTemplateViewSet` - Система шаблонов блоков
- `PageTemplateViewSet` - Шаблоны целых страниц
- `CoursePageCompleteView` - Отметка страниц как завершенных
- `migrate_lessons_to_pages` - Management команда для миграции данных

#### Frontend конструктора
- `CourseBuilder` - Основной компонент с тремя панелями (инструменты/холст/свойства)
- `ToolboxPanel` - Панель инструментов с 5 вкладками (Блоки/Шаблоны/Страницы/Аналитика/Импорт)
- `CanvasArea` - Рабочая область с drag-and-drop поддержкой
- `PropertiesPanel` - Панель настройки выбранных элементов
- `ContentBlock` - Универсальный компонент блока с типизацией
- `BlockRenderers` - Компоненты для отображения блоков в режиме обучения

#### Специализированные блоки контента
- `RichTextEditor` - WYSIWYG редактор на базе TipTap
- `VideoPlayer` - Конструктор видео с поддержкой YouTube/Vimeo
- `QuizBuilder` - Визуальный конструктор тестов с вариантами ответов
- `PetActionBlock` - Конфигуратор действий для питомцев
- `GalleryBlock` - Управление коллекциями изображений
- `FileDownloadBlock` - Предоставление файлов для скачивания
- `CheckListRenderer` - Интерактивные списки задач
- `TimerRenderer` - Таймеры для упражнений
- `ProgressTrackerRenderer` - Отображение прогресса обучения

#### Новая система обучения
- `CoursePageLearning` - Страница обучения с архитектурой страниц
- `BlockRenderer` - Универсальный рендерер для всех типов блоков
- `PageNavigation` - Навигация между страницами курса
- `Progress tracking` - Отслеживание прогресса по страницам
- `Completion system` - Система завершения страниц и блоков
- `Backward compatibility` - Автоматическое определение архитектуры курса

### Zustand Stores (State Management)

#### Хранилища состояния (`store/`)
- `authStore` - Аутентификация пользователя
  - `login()`, `register()`, `logout()` - Основные действия аутентификации
  - `validateToken()` - Валидация токена
  - `loadProfile()` - Загрузка профиля
  - `startTokenValidation()` - Периодическая проверка токена

- `cartStore` - Корзина покупок
  - `addToCart()`, `updateItem()`, `removeFromCart()` - Управление товарами
  - `clearCart()` - Очистка корзины
  - `getTotal()` - Расчёт суммы

- `petStore` - Данные о питомцах
  - `loadPets()` - Загрузка питомцев
  - `addPet()`, `updatePet()`, `deletePet()` - CRUD операции
  - `setActivePet()` - Установка активного питомца

- `toastStore` - Уведомления/тосты
  - `showToast()` - Показ уведомления
  - `showSuccess()`, `showError()`, `showWarning()` - Типизированные уведомления
  - `clearToast()` - Очистка уведомлений

- `favoritesStore` - Избранные товары и курсы
  - `toggleFavorite()` - Добавление/удаление из избранного
  - `isFavorite()` - Проверка избранного
  - `getFavorites()` - Получение списка избранного

### React Pages (Страницы приложения)

#### Аутентификация (`pages/Auth/`)
- `LoginPage` - Страница входа
- `RegisterPage` - Страница регистрации
- `ActivationPage` - Страница активации аккаунта

#### Профиль питомцев (`pages/PetProfile/`)
- `PetListPage` - Список питомцев
- `PetCreatePage` - Создание питомца
- `PetEditPage` - Редактирование питомца
- `PetDetailPage` - Детали питомца

#### Магазин (`pages/Shop/`)
- `ShopPage` - Каталог товаров с фильтрами
- `ProductDetailPage` - Детали товара с рекомендациями
- `CartPage` - Корзина покупок

#### Курсы (`pages/Training/`)
- `CoursesPage` - Каталог курсов
- `CourseDetailPage` - Детали курса
- `MyCoursesPage` - Мои курсы с прогрессом
- `CourseBuilderPage` - Конструктор курсов (NEW)

#### Обучение (`pages/Training/Learning/`) — NEW
- `CourseLearningPage` - Обзор курса (унаследованная архитектура)
- `CoursePageLearning` - Обучение с новой архитектурой страниц (NEW)
- `LessonPage` - Урок (унаследованная архитектура)

#### Заказы (`pages/Orders/`)
- `OrdersPage` - Список заказов
- `OrderDetailPage` - Детали заказа

#### Платежи (`pages/Payment/`)
- `PaymentPage` - Оформление платежа

#### Дашборд (`pages/Dashboard/`)
- `ProfilePage` - Личный кабинет с напоминаниями
- `SettingsPage` - Настройки профиля

### Management команды Django

#### Shop (`apps.shop.management.commands`)
- `load_test_data` - Загрузка тестового каталога товаров
- `import_catalog` - Импорт товаров из CSV файла
- `import_xml_catalog` - Импорт товаров из XML файла
- `process_expired_orders` - Обработка просроченных заказов

#### Training (`apps.training.management.commands`)
- `load_courses` - Загружает тестовые курсы обучения
- `migrate_lessons_to_pages` - Миграция уроков в новую архитектуру страниц и блоков

#### Users (`apps.users.management.commands`)
- `create_test_users` - Создание тестовых пользователей с полными профилями, питомцами, заказами и записями на курсы

### Core utilities (Ядро приложения)

#### Аутентификация (`core.authentication`)
- `JWTAuthentication` - Кастомная JWT аутентификация
- `TokenAuthentication` - Аутентификация по токену

#### Разрешения (`core.permissions`)
- `IsOwner` - Проверка владения объектом
- `IsAdminOrReadOnly` - Админ или только чтение
- `HasPetAccess` - Доступ к данным питомца

#### Пагинация (`core.pagination`)
- `CustomPagination` - Кастомная пагинация с метаданными

#### Токены (`core.tokens`)
- `CustomRefreshToken` - Кастомный refresh токен
- `CustomAccessToken` - Кастомный access токен

#### Утилиты (`core.utils`)
- `generate_uuid7()` - Генерация UUIDv7
- `get_client_ip()` - Получение IP клиента
- `validate_email_domain()` - Валидация домена email

---
