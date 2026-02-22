# Питомец+ — Структура проекта

**Дата создания**: Январь 2026
**Версия**: 2.3 (Улучшение аутентификации)
**Статус**: ✅ PetID 2.0 + Аутентификация 2.0 + Рефакторинг завершен
**Последнее обновление**: Январь 2026 - Улучшение security аутентификации

> ⚠️ **ВАЖНО**: 9 января 2026 проведён рефакторинг для уменьшения количества файлов

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
│   │   ├── pets/                     # Модуль PetID + Календарь + Напоминания ⭐
│   │   │   ├── services.py           # PersonalizationService + BaseCRUDService ⭐
│   │   ├── shop/                     # Модуль магазина + Аналитика ⭐
│   │   │   ├── services.py           # CartService + OrderService + BaseCRUDService ⭐
│   │   ├── training/                 # Модуль курсов + Конструктор ⭐
│   │   │   ├── services.py           # CourseService + BaseCRUDService ⭐
│   │   │   ├── views/                # Разбит на 5 модулей по функционалу ⭐
│   │   ├── payments/                 # Модуль платежей
│   │   ├── reviews/                  # Модуль отзывов
│   │   └── __init__.py
│   │
│   ├── core/                         # Общие компоненты ⭐
│   │   ├── authentication.py         # Кастомная JWT аутентификация
│   │   ├── cache_utils.py            # Утилиты кэширования
│   │   ├── crud_views.py             # Базовые CRUD классы
│   │   ├── exceptions.py             # Кастомные исключения + декораторы ⭐
│   │   ├── exception_handler.py      # Обработчик исключений
│   │   ├── services.py               # BaseCRUDService + декораторы ⭐
│   │   ├── permissions.py            # Права доступа (IsOwner)
│   │   ├── health.py                 # Мониторинг здоровья
│   │   ├── middleware.py             # Кастомное middleware
│   │   ├── permissions.py            # Кастомные разрешения (IsOwner)
│   │   ├── serializers.py            # Базовые сериализаторы
│   │   ├── services.py               # ServiceResult, BaseService ⭐
│   │   ├── tokens.py                 # Кастомные JWT токены
│   │   ├── utils.py                  # Утилиты (generate_uuid7)
│   │   ├── validators.py             # JSON валидаторы
│   │   └── views.py                  # API для health check
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

## Функциональные модули

### Реализованные функции
1. **Регистрация и аутентификация** - Улучшенная система с JWT токенами, email активацией, сроком действия кодов и усиленной password policy
2. **PetID** - Расширенные профили питомцев с персонализацией на основе 128 пород (58 кошек, 66 собак)
3. **Справочник пород** - Комплексная база данных характеристик собак и кошек с анализом здоровья, питания и ухода
4. **Магазин** - Полнофункциональный интернет-магазин с корзиной и заказами
5. **Подбор корма** - Интеллектуальная система персонализированных рекомендаций
6. **Заказы** - Система оформления и отслеживания заказов
7. **Курсы** - Образовательная платформа с drag-and-drop конструктором
8. **Платежи** - Интеграция с платежными системами
9. **Отзывы** - Система рейтингов и комментариев

### Структура для развития
10. **Аналитика** - Сбор и анализ данных о работе платформы
11. **Календарь** - Планирование ухода за питомцами
12. **Уведомления** - Push и email рассылки пользователям
13. **Админ-панель** - React интерфейс управления платформой
14. **Конструктор графиков** - Визуализация данных и отчетов

## API структура

### Основные эндпоинты
- **/api/auth/** - Аутентификация (регистрация, вход, токены)
- **/api/users/** - Профили пользователей
- **/api/pets/** - PetID и питомцы
- **/api/shop/** - Магазин и заказы
- **/api/courses/** - Курсы и обучение
- **/api/payments/** - Платежи
- **/api/reviews/** - Отзывы

### Архитектурные принципы
- Service Layer паттерн для бизнес-логики
- JWT аутентификация с refresh токенами
- Централизованная обработка ошибок
- Оптимизированные запросы к БД

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
│   │   ├── users/                    # Модуль пользователей и аутентификации ⭐
│   │   │   ├── models.py             # User модель (UUID, email auth) + Token модель
│   │   │   ├── views.py              # 15 API эндпоинтов аутентификации
│   │   │   ├── serializers.py        # Сериализаторы для всех форм
│   │   │   ├── services/             # Бизнес-логика аутентификации ⭐
│   │   │   │   ├── user_service.py   # Регистрация, вход, активация
│   │   │   │   ├── token_service.py  # Управление JWT токенами
│   │   │   │   └── mail_service.py   # Email рассылки
│   │   │   ├── urls.py               # URL /api/auth/ + /api/users/
│   │   │   ├── admin.py              # Админка пользователей
│   │   │   └── management/commands/  # Команды для тестовых данных
│   │   │
│   │   ├── pets/                     # Модуль PetID + Напоминания + Справочник пород
│   │   │   ├── models.py             # Pet модель (расширенная v2.0)
│   │   │   ├── breed_models.py       # Breed + BreedHealth + BreedNutrition + BreedCare модели — NEW
│   │   │   ├── reminder_models.py    # Reminder модель
│   │   │   ├── views.py              # CRUD питомцев + API пород + анализ
│   │   │   ├── breed_views.py        # API сравнения питомца с породой — NEW
│   │   │   ├── reminder_views.py     # API напоминаний
│   │   │   ├── serializers.py        # Pet сериализаторы
│   │   │   ├── serializers_breeds.py # Breed сериализаторы — NEW
│   │   │   ├── services.py           # PersonalizationService (v2.0)
│   │   │   ├── admin.py              # Админка Pet + Reminder
│   │   │   ├── urls.py               # URL /api/pets/, /api/pets/breeds/, /api/pets/reminders/
│   │   │   └── management/commands/
│   │   │       ├── import_breeds.py      # Импорт из Markdown — NEW
│   │   │       └── load_breeds.py        # Загрузка данных пород из JSON — NEW
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
│   │   │   ├── PetId/                # PetID 2.0 — NEW
│   │   │   │   ├── PetIdPage.jsx     # Главная страница PetID
│   │   │   │   ├── index.js          # Экспорт компонентов
│   │   │   │   └── components/
│   │   │   │       ├── PetQuickCreate.jsx   # Быстрое создание питомца
│   │   │   │       └── PetProfileEditor.jsx # Редактор профиля
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
Backend API:     http://192.168.1.11:8077/api
Frontend:        http://localhost:5199
Admin Panel:     http://192.168.1.11:8077/admin/
Dashboard:       http://192.168.1.11:8077/admin/dashboard/
React Admin:     http://localhost:5199/admin/dashboard
API Health:      http://192.168.1.11:8077/api/health/

# Альтернативные URL:
Backend API:     http://127.0.0.1:8077/api
Frontend:        http://127.0.0.1:5199
Admin Panel:     http://127.0.0.1:8077/admin/
```

### Новые эндпоинты (добавлены в этой версии)

#### Аутентификация (`/api/auth/`) — UPDATED v2.3

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/auth/registration/` | Регистрация с улучшенной password policy |
| POST | `/api/auth/login/` | Вход с проверкой активации |
| POST | `/api/auth/logout/` | Выход с очисткой токенов |
| GET | `/api/auth/refresh/` | Обновление access токена |
| GET | `/api/auth/activate/{link}/` | Активация по ссылке из email |
| POST | `/api/auth/activate-by-code/` | Активация по 6-значному коду |
| POST | `/api/auth/exchange-auth-code/` | Обмен временного кода на токены |
| POST | `/api/auth/resend-activation/` | **NEW** — Повторная отправка кода активации |
| POST | `/api/auth/password-reset/` | Запрос восстановления пароля |
| POST | `/api/auth/password-reset/confirm/` | Подтверждение с улучшенной валидацией |

#### Справочник пород (`/api/pets/breeds/`) — NEW

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/pets/breeds/` | Список пород (фильтры: species, size, hypoallergenic, apartment_friendly) |
| GET | `/api/pets/breeds/by-slug/{slug}/` | Детали породы по slug |
| GET | `/api/pets/breeds/{id}/` | Детали породы по ID |
| GET | `/api/pets/{pet_id}/breed-comparison/` | Сравнение питомца с эталоном породы |
| GET | `/api/pets/breeds/{id}/health/` | Риски здоровья породы |

#### Анализ питомца (`/api/pets/{uuid}/analysis/`) — NEW

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/pets/{uuid}/analysis/` | Анализ профиля питомца с рекомендациями |

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

### Backend модели (38 моделей) — UPDATED v2.3

#### apps.users — UPDATED v2.3
- `User` - Пользователь (UUID, email auth, code_created_at для срока действия)
- `Token` - Refresh токены пользователей

#### apps.pets
- `Pet` - Профиль питомца (PetID) с расширенными полями персонализации
- `Breed` - Справочник пород (128 пород: 58 кошек, 66 собак) — NEW
- `BreedHealth` - Генетические риски здоровья пород (220 записей) — NEW
- `BreedNutrition` - Рекомендации по питанию пород (55 записей) — NEW
- `BreedCare` - Процедуры ухода за породами (31 запись) — NEW
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

### User (Пользователь) — обновлено v2.3

```python
class User(AbstractBaseUser, PermissionsMixin):
    """
    Кастомная модель пользователя с расширенной аутентификацией.

    Использует email вместо username для аутентификации.
    UUID в качестве первичного ключа для безопасности.
    """

    # Основные поля
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, verbose_name='Email')

    # Дополнительные поля профиля
    first_name = models.CharField(max_length=150, blank=True, verbose_name='Имя')
    last_name = models.CharField(max_length=150, blank=True, verbose_name='Фамилия')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    default_address = models.TextField(blank=True, verbose_name='Адрес доставки по умолчанию')

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Поля для активации через email
    is_activated = models.BooleanField(
        default=False,
        help_text="Активирован ли аккаунт через email"
    )

    activation_link = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        unique=True,
        help_text="Ссылка для активации аккаунта"
    )

    activation_code = models.CharField(
        max_length=6,
        blank=True,
        null=True,
        help_text="Код активации (6 цифр) для подтверждения email"
    )

    code_created_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Время создания кода активации/восстановления для проверки срока действия"
    )

    # Расширенные настройки профиля
    avatar = models.ImageField(
        upload_to='users/avatars/',
        blank=True,
        null=True,
        verbose_name='Аватар'
    )
    bio = models.TextField(blank=True, verbose_name='О себе')
    date_of_birth = models.DateField(blank=True, null=True, verbose_name='Дата рождения')
    city = models.CharField(max_length=100, blank=True, verbose_name='Город')
    website = models.URLField(blank=True, verbose_name='Сайт')

    # Настройки уведомлений
    email_notifications = models.BooleanField(default=True, verbose_name='Email уведомления')
    push_notifications = models.BooleanField(default=True, verbose_name='Push уведомления')
    order_notifications = models.BooleanField(default=True, verbose_name='Уведомления о заказах')
    marketing_notifications = models.BooleanField(default=False, verbose_name='Маркетинговые уведомления')

    # Предпочтения персонализации
    preferred_pet_types = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Предпочитаемые типы питомцев',
        help_text='Список предпочитаемых типов питомцев для персонализации'
    )

    created_at = models.DateTimeField(default=timezone.now, verbose_name='Дата регистрации')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return self.email

    def to_dict(self):
        """Сериализация для API (DTO)."""
        return {
            'id': str(self.id),
            'email': self.email,
            'isActivated': self.is_activated,
            'is_staff': self.is_staff,
            'is_superuser': self.is_superuser,
        }

    def to_dict_full(self):
        """Полная сериализация для API."""
        # Обработка аватара
        avatar_url = None
        if self.avatar:
            try:
                avatar_url = self.avatar.url
            except (ValueError, AttributeError):
                avatar_url = None

        return {
            'id': str(self.id),
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'default_address': self.default_address,
            'avatar': avatar_url,
            'bio': self.bio,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'city': self.city,
            'website': self.website,
            'email_notifications': self.email_notifications,
            'push_notifications': self.push_notifications,
            'order_notifications': self.order_notifications,
            'marketing_notifications': self.marketing_notifications,
            'preferred_pet_types': self.preferred_pet_types,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'isActivated': self.is_activated,
            'is_staff': self.is_staff,
            'is_superuser': self.is_superuser,
        }
```

### Token (Refresh токен)

```python
class Token(models.Model):
    """
    Модель для хранения refresh токенов пользователей.

    Хранит refresh токены в базе данных для возможности их отзыва
    и проверки валидности при обновлении access токенов.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='tokens',
        help_text="Пользователь, которому принадлежит токен"
    )

    refresh_token = models.TextField(
        unique=True,
        help_text="Refresh токен (JWT строка)"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Дата создания токена"
    )

    class Meta:
        verbose_name = 'Токен'
        verbose_name_plural = 'Токены'
        db_table = 'tokens'
        ordering = ['-created_at']

    def __str__(self):
        return f"Token for {self.user.email}"
```

### Pet (Питомец / PetID) — обновлено v2.0

```python
class Pet(models.Model):
    # Основные данные
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
    
    # Питание и здоровье
    favorite_foods: list        # Любимые продукты (JSON)
    allergies: list             # Аллергии (JSON)
    health_issues: list         # Проблемы здоровья (JSON)
    sensitive_digestion: bool   # Чувствительное пищеварение - NEW
    chronic_conditions: str     # Хронические заболевания - NEW
    diet_type: str              # Тип питания (dry/wet/mixed/raw/home) - NEW
    
    # Поведение и дрессировка - NEW
    activity_level: str         # Уровень активности (low/medium/high)
    behavior_type: str          # Тип поведения (calm/active/aggressive/shy/playful)
    social_level: str           # Уровень социализации
    training_experience: str    # Опыт дрессировки (none/basic/intermediate/advanced)
    behavioral_problems: list   # Поведенческие проблемы (JSON)
    character_traits: list      # Черты характера (JSON)
    
    # Образ жизни владельца - NEW
    housing_type: str           # Тип жилья (apartment/house/cottage)
    has_yard: bool              # Есть ли двор
    has_children: bool          # Есть ли дети
    other_pets: str             # Другие питомцы
    
    # Метаданные
    profile_completeness: int   # Процент заполненности профиля (0-100) - NEW
    is_extended_profile: bool   # Расширенный профиль заполнен - NEW
    created_at: datetime
    updated_at: datetime
    
    # Вычисляемые свойства (properties) - NEW
    @property age: int          # Возраст в годах
    @property age_months: int   # Возраст в месяцах
    @property age_category: str # Категория возраста (puppy/kitten/adult/senior)
    @property calculated_size: str  # Размер на основе веса и породы
```

### Breed (Справочник пород) — UPDATED

```python
class Breed(models.Model):
    # Основная информация
    id: int                     # ID из JSON (primary key)
    species: str                # Вид (dog/cat)
    name: str                   # Название породы (уникальное)
    name_en: str                # Название на английском
    slug: str                   # URL-slug (уникальный)

    # Описания
    description: str            # Полное описание
    short_description: str      # Краткое описание

    # Физические характеристики
    size_category: str          # Размер (tiny/small/medium/large/giant)
    weight_min: Decimal         # Мин. вес (кг)
    weight_max: Decimal         # Макс. вес (кг)
    height_min: int             # Мин. рост (см)
    height_max: int             # Макс. рост (см)
    lifespan_min: int           # Мин. продолжительность жизни
    lifespan_max: int           # Макс. продолжительность жизни

    # Характер и поведение
    energy_level: str           # Энергичность (very_low/low/medium/high/very_high)
    trainability: str           # Обучаемость
    intelligence: str           # Интеллект
    friendliness_to_children: str  # Отношение к детям
    friendliness_to_pets: str   # Отношение к другим животным
    friendliness_to_strangers: str  # Отношение к незнакомцам
    independence: str           # Независимость

    # Уход
    grooming_frequency: str     # Частота груминга (minimal/weekly/regular/daily/professional)
    shedding_level: str         # Линька
    coat_type: str              # Тип шерсти (hairless/short/medium/long/wire/curly/double)

    # Здоровье
    health_risk_level: str      # Уровень риска здоровья
    hypoallergenic: bool        # Гипоаллергенная
    brachycephalic: bool        # Брахицефал

    # Условия содержания
    apartment_friendly: bool    # Подходит для квартиры
    good_for_novice: bool       # Подходит новичкам

    # Метаданные
    created_at: datetime
    updated_at: datetime

    # Методы
    def to_dict() -> dict        # Сериализация в словарь
    @property ideal_weight: tuple  # Идеальный диапазон веса
    @property average_lifespan: float  # Средняя продолжительность жизни
```

### BreedHealth (Риски здоровья) — NEW

```python
class BreedHealth(models.Model):
    breed: ForeignKey(Breed)    # Связь с породой
    condition_name: str         # Название заболевания
    condition_type: str         # Тип (genetic/congenital)
    affected_system: str        # Затронутая система
    severity: str               # Тяжесть (low/medium/high)
    prevalence_percent: Decimal # Распространенность (%)
    age_of_onset: str           # Возраст проявления
    prevention: str             # Профилактика
    screening: str              # Рекомендуемые обследования
    created_at: datetime

    # Методы
    def to_dict() -> dict        # Сериализация
```

### BreedNutrition (Рекомендации по питанию) — NEW

```python
class BreedNutrition(models.Model):
    breed: OneToOne(Breed)      # Связь с породой
    protein_need: str           # Потребность в белке
    calorie_density: str        # Калорийность
    diet_type: str              # Тип питания (dry/wet/mixed)
    feeding_frequency: str      # Частота кормлений
    special_considerations: str  # Особые рекомендации
    common_allergens: list       # Аллергены (JSON)
    created_at: datetime
    updated_at: datetime

    # Методы
    def to_dict() -> dict        # Сериализация
```

### BreedCare (Процедуры ухода) — NEW

```python
class BreedCare(models.Model):
    breed: ForeignKey(Breed)    # Связь с породой
    care_category: str          # Категория ухода (coat/skin/ears/eyes/dental/nails)
    procedure: str              # Процедура
    frequency: str              # Частота
    importance: str             # Важность (low/medium/high/critical)
    season: str                 # Сезон (all/spring/summer/autumn/winter)
    notes: str                  # Примечания
    created_at: datetime

    # Методы
    def to_dict() -> dict        # Сериализация
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

## Система персонализации PetID — v2.0

### PersonalizationService (обновлён)

```python
class PersonalizationService:
    @staticmethod
    def get_context(user) -> PersonalizationContext
        """Получает контекст всех питомцев с поведенческими данными и данными породы."""
    
    @staticmethod
    def get_pet_context(user, pet_id) -> PetContext
        """Получает контекст конкретного питомца с данными породы из справочника."""
    
    @classmethod
    def get_health_based_recommendations(cls, user, health_issue, limit=12)
        """Рекомендации на основе проблем здоровья."""
    
    @classmethod
    def get_course_recommendations(cls, user, limit=6)
        """Рекомендации курсов с учётом поведенческих проблем и опыта дрессировки."""
    
    @classmethod
    def get_full_recommendations(cls, user, products_limit=8, courses_limit=4)
        """Полные персонализированные рекомендации."""
```

### PetContext (расширенный) — NEW

```python
@dataclass
class PetContext:
    pet_id: str
    name: str
    species: str
    breed: str | None
    age: int | None
    age_category: str | None       # puppy/kitten/adult/senior
    weight: float | None
    activity_level: str            # low/medium/high
    # Поведенческие данные для персонализации курсов
    behavior_type: str | None      # calm/active/aggressive/shy/playful
    social_level: str | None       # Уровень социализации
    training_experience: str | None # none/basic/intermediate/advanced
    behavioral_problems: list      # Поведенческие проблемы
    profile_completeness: int      # Процент заполненности профиля
    # Данные породы из справочника
    breed_energy_level: str | None
    breed_trainability: str | None
    breed_health_risks: list       # Генетические риски породы
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
| kidney_issues | Ренальные диеты |
| heart_issues | Кардио-поддержка |

### Персонализация курсов по поведению — NEW

| Поведенческая проблема | Рекомендуемые курсы |
|------------------------|---------------------|
| Лает/мяукает без причины | Курсы по контролю лая, вокализации |
| Агрессия | Курсы коррекции, социализации |
| Страх громких звуков | Десенсибилизация |
| Боязнь одиночества | Сепарационная тревожность |
| Тянет поводок | Курсы прогулок, поводка |
| Не слушается команд | Курсы послушания |

### Справочник пород (128 пород) — UPDATED

| Вид | Количество | Размеры |
|-----|------------|---------|
| 🐕 Собаки | 66 | tiny, small, medium, large, giant |
| 🐱 Кошки | 58 | small, medium, large |

**Комплексный анализ питомца:**
- **Вес**: сравнение с эталоном (±15% = норма)
- **Активность**: маппинг уровней энергии
- **Здоровье**: риски породы + текущее состояние
- **Поведение**: совместимость с типичным характером
- **Условия**: проверка apartment_friendly, has_yard

**Персонализированные рекомендации:**
- Диета и корм по потребностям породы
- Курсы обучения по обучаемости
- Профилактика по генетическим рискам
- Уход по типу шерсти и частоте груминга

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
| **Породы** | 166 | 101 собака + 65 кошек с характеристиками | ✅ Полностью заполнено — NEW |
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

- **Frontend**: http://localhost:5199
- **Backend API**: http://192.168.1.11:8077/api
- **Admin Panel**: http://192.168.1.11:8077/admin
- **Dashboard**: http://192.168.1.11:8077/admin/dashboard/
- **React Admin**: http://localhost:5199/admin/dashboard

### Альтернативный доступ (localhost)

- **Backend API**: http://127.0.0.1:8077/api
- **Admin Panel**: http://127.0.0.1:8077/admin
- **Dashboard**: http://127.0.0.1:8077/admin/dashboard/

---

## Система Email-рассылок

### Текущая конфигурация (Локальная разработка)

Для локальной разработки используется **Mail.ru SMTP**:

| Параметр | Значение |
|----------|----------|
| **SMTP Host** | smtp.mail.ru |
| **SMTP Port** | 587 (TLS) |
| **Email** | testpetplus@mail.ru |
| **Backend** | django.core.mail.backends.smtp.EmailBackend |

**Типы писем:**
- ✅ Регистрация (код активации)
- ✅ Восстановление пароля (код сброса)
- 🔜 Подтверждение заказа (планируется)
- 🔜 Напоминания о событиях (планируется)

### Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      MailService                            │
│  backend/apps/users/services/mail_service.py               │
├─────────────────────────────────────────────────────────────┤
│  send_activation_mail(email, link, code)                    │
│  send_password_reset_mail(email, code)                      │
│  # Будущие методы:                                          │
│  # send_order_confirmation(email, order)                    │
│  # send_reminder_email(email, reminder)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Django Email Backend                           │
│  config/settings.py → EMAIL_BACKEND                         │
├─────────────────────────────────────────────────────────────┤
│  Локально: smtp.EmailBackend → smtp.mail.ru                 │
│  Продакшен: smtp.EmailBackend → SendGrid/SES/Mailgun        │
│  Отладка: console.EmailBackend → консоль сервера            │
└─────────────────────────────────────────────────────────────┘
```

### Различия: Локальная разработка vs Продакшен

| Аспект | Локальная разработка | Продакшен |
|--------|---------------------|-----------|
| **SMTP провайдер** | Mail.ru (бесплатно) | SendGrid / Amazon SES / Mailgun |
| **Домен отправителя** | @mail.ru | Собственный домен (pitomets.ru) |
| **Лимиты** | ~100 писем/день | Неограниченно (по тарифу) |
| **Доставляемость** | Может попадать в спам | Высокая (SPF, DKIM, DMARC) |
| **Шаблоны** | Inline HTML в коде | Шаблоны в сервисе рассылки |
| **Аналитика** | Нет | Открытия, клики, bounce rate |
| **Безопасность** | Пароль в settings.py | API ключ в переменных окружения |

### Настройка для Продакшена

#### Вариант 1: SendGrid (рекомендуется)

```bash
# Переменные окружения
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEFAULT_FROM_EMAIL=noreply@pitomets.ru
```

**Плюсы SendGrid:**
- Бесплатно до 100 писем/день
- Высокая доставляемость
- Подробная аналитика
- Шаблоны с drag-and-drop редактором
- Webhook для событий (доставка, открытие, клик)

#### Вариант 2: Amazon SES

```bash
SMTP_HOST=email-smtp.eu-west-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIAXXXXXXXXXXXXXXXX
SMTP_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEFAULT_FROM_EMAIL=noreply@pitomets.ru
```

**Плюсы SES:**
- Самый дешёвый ($0.10 за 1000 писем)
- Интеграция с AWS экосистемой
- Высокая надёжность

#### Вариант 3: Mailgun

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.pitomets.ru
SMTP_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEFAULT_FROM_EMAIL=noreply@pitomets.ru
```

### Переход на продакшен (чеклист)

1. ☐ Зарегистрироваться в сервисе рассылки
2. ☐ Верифицировать домен (добавить DNS записи SPF, DKIM, DMARC)
3. ☐ Получить API ключ / SMTP credentials
4. ☐ Настроить переменные окружения на сервере
5. ☐ Убрать пароль Mail.ru из settings.py
6. ☐ Создать красивые HTML шаблоны писем
7. ☐ Настроить webhook для отслеживания доставки
8. ☐ Тестовая отправка на разные почтовые сервисы

---

## Тестирование

### Сценарий тестирования

#### Базовое тестирование
1. Открыть http://localhost:5199
2. Зарегистрировать аккаунт
3. Создать профиль питомца с проблемами здоровья
4. Проверить персональные рекомендации в магазине
5. Добавить товары в корзину → проверить "Часто покупают вместе"
6. Создать напоминание для питомца
7. Оформить заказ
8. Проверить админ-панель: http://192.168.1.11:8077/admin/dashboard/

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

### v2.3 (Январь 2026) — Улучшение аутентификации

**Backend:**
- ✅ Поле `code_created_at` в User модели для проверки срока действия кодов
- ✅ Проверка срока действия кодов активации и восстановления (15 минут)
- ✅ Эндпоинт `POST /api/auth/resend-activation/` для повторной отправки кода
- ✅ Улучшенная password policy (8+ символов, буквы+цифры+спецсимволы)
- ✅ Проверка на распространённые пароли (30+ паролей в чёрном списке)
- ✅ Обновлены email шаблоны с информацией о сроке действия

**Frontend:**
- ✅ Индикатор силы пароля с 4-уровневой шкалой (слабый/средний/хороший/отличный)
- ✅ Визуальные подсказки выполнения требований пароля
- ✅ Кнопка "Отправить код повторно" с таймером 60 секунд
- ✅ Улучшенные API функции для повторной отправки кодов
- ✅ Расширенный authStore с методом `resendActivationCode`

**Security улучшения:**
- ✅ Закрыта уязвимость бессрочных кодов активации
- ✅ Улучшена защита от brute force через временные ограничения
- ✅ Усилена password policy для предотвращения слабых паролей

### v2.2 (Январь 2026) — PetID 2.0 + Очистка проекта

**Backend:**
- ✅ Модели пород: Breed + BreedHealth + BreedNutrition + BreedCare (128 пород)
- ✅ API сравнения питомца с эталоном породы (/breed-comparison/)
- ✅ Комплексный анализ: вес, активность, здоровье, поведение, условия
- ✅ Персонализированные рекомендации по всем категориям
- ✅ Расширенная модель Pet (поведение, образ жизни, profile_completeness)
- ✅ PetAnalysisView — анализ профиля с рекомендациями
- ✅ Улучшенный PersonalizationService с поведенческими данными
- ✅ Персонализация курсов по поведенческим проблемам и опыту дрессировки
- ✅ Management команда load_breeds для загрузки данных из JSON

**Frontend:**
- ✅ PetQuickCreate — компактная форма создания питомца с автозаполнением
- ✅ PetProfileEditor — редактор профиля с 6 секциями
- ✅ Обновлённый PetIdPage с карточками и прогресс-баром заполненности
- ✅ API клиент для справочника пород (getBreeds, getBreedSuggestions)
- ✅ Константы для всех полей PetID
- ✅ Удалён старый PetIdWizard (600+ строк нефункционального кода)

**Очистка:**
- ✅ Удалены временные файлы (cookies.txt, .xml файлы)
- ✅ Удалены дублирующиеся скрипты создания пользователей
- ✅ Удалены тестовые скрипты из корня проекта
- ✅ Максимизировано переиспользование кода

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
- `RegisterView.post()` - Регистрация с улучшенной password policy
- `LoginView.post()` - Аутентификация с проверкой активации аккаунта
- `LogoutView.post()` - Выход с удалением refresh токена
- `RefreshView.get()` - Обновление access токена по refresh токену
- `ActivateView.get()` - Активация по ссылке с проверкой срока действия
- `ActivateByCodeView.post()` - Активация по коду с проверкой срока действия
- `ExchangeAuthCodeView.post()` - Обмен временного кода на токены
- `ResendActivationCodeView.post()` - **NEW** — Повторная отправка кода активации
- `PasswordResetRequestView.post()` - Запрос восстановления с временной меткой
- `PasswordResetConfirmView.post()` - Подтверждение с улучшенной валидацией
- `ProfileView.get()` - Получение профиля пользователя с питомцами и заказами
- `ProfileView.put()` - Обновление данных профиля
- `UserOrdersView.get()` - Получение истории заказов пользователя
- `UserCoursesView.get()` - Получение курсов пользователя
- `GetUsersView.get()` - Получение списка всех пользователей (для тестирования)

**Services (Сервисы):**
- `UserService.registration()` - Регистрация с улучшенной password policy
- `UserService.activate()` - Активация с проверкой срока действия (15 мин)
- `UserService.resend_activation_code()` - **NEW** — Повторная отправка кода активации
- `UserService.exchange_temp_code_for_tokens()` - Обмен временного кода на токены
- `UserService.login()` - Вход с валидацией и генерацией токенов
- `UserService.logout()` - Выход с удалением токена из БД
- `UserService.refresh()` - Обновление токенов по refresh токену
- `UserService.request_password_reset()` - Запрос восстановления с временной меткой
- `UserService.confirm_password_reset()` - Подтверждение с проверкой срока действия
- `UserService.get_all_users()` - Получение всех пользователей
- `TokenService.generate_tokens()` - Генерация JWT токенов для пользователя
- `TokenService.validate_access_token()` - Валидация access токена
- `TokenService.validate_refresh_token()` - Валидация refresh токена
- `TokenService.save_token()` - Сохранение refresh токена в БД
- `TokenService.remove_token()` - Удаление refresh токена из БД
- `TokenService.find_token()` - Поиск refresh токена в БД
- `MailService.send_activation_mail()` - Отправка email с информацией о сроке действия

#### Модуль питомцев (`apps.pets`)

**Views (Представления):**
- `PetListCreateView.get()` - Получение списка питомцев пользователя
- `PetListCreateView.post()` - Создание нового питомца
- `PetDetailView.get()` - Получение деталей питомца
- `PetDetailView.put()` - Обновление данных питомца
- `PetDetailView.delete()` - Удаление питомца
- `PetAnalysisView.get()` - Анализ профиля питомца с рекомендациями — NEW
- `BreedListView.get()` - Список пород с расширенной фильтрацией (species, size, hypoallergenic, apartment_friendly) — UPDATED
- `BreedDetailView.get()` - Детали породы по slug с полными данными — UPDATED
- `PetBreedComparisonView.get()` - Комплексное сравнение питомца с эталоном породы — NEW
- `BreedHealthView.get()` - Риски здоровья конкретной породы — NEW
- `ReminderListView.get()` - Получение списка напоминаний с фильтрами
- `ReminderListView.post()` - Создание нового напоминания
- `ReminderDetailView.get()` - Получение деталей напоминания
- `ReminderDetailView.put()` - Обновление напоминания
- `ReminderDetailView.delete()` - Удаление напоминания
- `ReminderCompleteView.post()` - Отметка напоминания как выполненного
- `ReminderCategoriesView.get()` - Получение категорий и частот напоминаний
- `UpcomingRemindersView.get()` - Получение предстоящих напоминаний для дашборда

**Serializers (Сериализаторы):** — NEW
- `BreedListSerializer` - Краткая сериализация для списков пород
- `BreedDetailSerializer` - Полная сериализация с related данными
- `BreedHealthSerializer` - Сериализация рисков здоровья
- `BreedNutritionSerializer` - Сериализация рекомендаций по питанию
- `BreedCareSerializer` - Сериализация процедур ухода
- `PetBreedComparisonSerializer` - Сериализация результатов сравнения

**Services (Сервисы):**
- `PersonalizationService.get_context()` - Получение контекста персонализации для пользователя (с поведенческими данными) — UPDATED
- `PersonalizationService.get_pet_context()` - Получение контекста конкретного питомца
- `PersonalizationService.filter_products()` - Фильтрация товаров по контексту питомцев
- `PersonalizationService.filter_courses()` - Фильтрация курсов по контексту питомцев (с учётом поведения) — UPDATED
- `PersonalizationService.get_product_recommendations()` - Персональные рекомендации товаров
- `PersonalizationService.get_course_recommendations()` - Персональные рекомендации курсов (по поведенческим проблемам, опыту дрессировки) — UPDATED
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
- `register()` - Регистрация с улучшенной password policy
- `login()` - Вход с проверкой активации аккаунта
- `logout()` - Выход пользователя
- `refreshToken()` - Обновление access токена
- `activateByCode()` - Активация по коду с проверкой срока действия
- `exchangeAuthCode()` - Обмен временного кода на токены
- `resendActivationCode()` - **NEW** — Повторная отправка кода активации
- `requestPasswordReset()` - **NEW** — Запрос восстановления пароля
- `confirmPasswordReset()` - **NEW** — Подтверждение с улучшенной валидацией
- `getProfile()` - Получение профиля
- `updateProfile()` - Обновление профиля пользователя
- `updateProfile()` - Обновление профиля
- `getUserOrders()` - Заказы пользователя
- `getUserCourses()` - Курсы пользователя

#### Модуль питомцев (`api/pets.js`)
- `getPets()` - Список питомцев пользователя
- `getPet()` - Детали питомца
- `createPet()` - Создание питомца
- `updatePet()` - Обновление питомца
- `deletePet()` - Удаление питомца
- `getPetAnalysis()` - Анализ профиля питомца с рекомендациями — NEW

#### Справочник пород (`api/pets.js`) — NEW
- `getBreeds()` - Список пород с расширенной фильтрацией (species, size, hypoallergenic, apartment_friendly)
- `getBreed()` - Детали породы по slug с полными данными
- `getPetBreedComparison()` - Сравнение питомца с эталоном породы — NEW

#### Константы для PetID (`api/pets.js`) — NEW
- `SPECIES_OPTIONS` - Виды животных
- `ACTIVITY_LEVEL_OPTIONS` - Уровни активности
- `BEHAVIOR_TYPE_OPTIONS` - Типы поведения
- `SOCIAL_LEVEL_OPTIONS` - Уровни социализации
- `TRAINING_EXPERIENCE_OPTIONS` - Опыт дрессировки
- `SIZE_OPTIONS` - Размеры животных
- `BODY_TYPE_OPTIONS` - Типы телосложения
- `DIET_TYPE_OPTIONS` - Типы питания
- `FEEDING_FREQUENCY_OPTIONS` - Частота кормления
- `HOUSING_TYPE_OPTIONS` - Типы жилья
- `DENTAL_HEALTH_OPTIONS` - Состояние зубов
- `CHARACTER_TRAITS` - Черты характера
- `BEHAVIORAL_PROBLEMS` - Поведенческие проблемы

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
  - `register()` - Регистрация с улучшенной password policy
  - `login()` - Вход с проверкой активации
  - `logout()` - Выход пользователя
  - `activateByCode()` - Активация по коду
  - `resendActivationCode()` - **NEW** — Повторная отправка кода активации
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

#### Профиль питомцев (`pages/PetProfile/`, `pages/PetId/`)
- `PetListPage` - Список питомцев
- `PetCreatePage` - Создание питомца
- `PetEditPage` - Редактирование питомца
- `PetDetailPage` - Детали питомца
- `PetIdPage` - Главная страница управления PetID — NEW
- `PetQuickCreate` - Компактная форма быстрого создания питомца с автозаполнением — NEW
- `PetProfileEditor` - Редактор профиля с секциями (Основное/Здоровье/Питание/Поведение/Образ жизни) — NEW

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

#### Pets (`apps.pets.management.commands`) — NEW
- `load_breeds` - Загрузка данных пород из JSON файлов (breeds.json, breed_health.json, breed_nutrition.json, breed_care.json)

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
