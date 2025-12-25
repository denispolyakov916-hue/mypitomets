# Питомец+ MVP — Документация проекта

## Содержание

1. [Обзор проекта](#обзор-проекта)
2. [Технологический стек](#технологический-стек)
3. [Архитектура системы](#архитектура-системы)
4. [Структура проекта](#структура-проекта)
5. [API документация](#api-документация)
6. [Модели данных](#модели-данных)
7. [Frontend архитектура](#frontend-архитектура)
8. [Система персонализации PetID](#система-персонализации-petid)
9. [Система рекомендаций](#система-рекомендаций)
10. [Запуск проекта](#запуск-проекта)
11. [Тестирование](#тестирование)

---

## Обзор проекта

**Питомец+** — комплексная экосистема для владельцев домашних животных, построенная вокруг единого цифрового профиля питомца (PetID).

### Основные модули

| Модуль | Описание | Статус |
|--------|----------|--------|
| **Авторизация** | Регистрация, вход, JWT токены с UUIDv7 пользователями | ✅ Готов |
| **PetID** | Расширенный цифровой паспорт питомца с health_issues и activity_level | ✅ Готов |
| **Магазин** | Каталог товаров, корзина, заказы, оптимизированные QuerySet | ✅ Готов |
| **Курсы** | Образовательная платформа с прогрессом обучения | ✅ Готов |
| **Платежи** | Единая система платежей для всех покупок | ✅ Готов |
| **Рекомендации** | Гибридная система рекомендаций (collaborative + content-based) | ✅ Готов |
| **Напоминания** | Система напоминаний по уходу за питомцами | ✅ Готов |
| **Отзывы** | Отзывы и рейтинги для товаров и курсов | ✅ Готов |
| **Избранное** | Сохранение товаров и курсов в избранное | ✅ Готов |
| **Админка** | Расширенная админ-панель с дашбордом и аналитикой | ✅ Готов |
| **Профиль** | Личный кабинет с историей заказов, курсов и напоминаниями | ✅ Готов |

### Ключевые особенности

- **UUIDv7 идентификаторы**: Сортируемые по времени уникальные идентификаторы
- **PostgreSQL**: Надёжное хранение данных с оптимизированными запросами
- **Персонализация PetID**: Рекомендации на основе профиля питомца
- **Гибридные рекомендации**: "Часто покупают вместе" + контентные рекомендации
- **Оптимизация N+1**: Кастомные QuerySet менеджеры с аннотациями
- **UI-кит**: Переиспользуемые компоненты (Button, Card, Modal, Badge, Progress)
- **Система напоминаний**: Управление уходом за питомцами с повторяющимися событиями

### Management команды

| Команда | Модуль | Описание |
|---------|--------|----------|
| `load_test_data` | shop | Загружает тестовый каталог товаров |
| `import_catalog` | shop | Импорт товаров из CSV файла |
| `import_xml_catalog` | shop | Импорт товаров из XML файла |
| `load_courses` | training | Загружает тестовые курсы обучения |

---

## Технологический стек

### Backend
| Компонент | Технология | Версия |
|-----------|------------|--------|
| Фреймворк | Django | 4.2.8 |
| REST API | Django REST Framework | 3.14.0 |
| Аутентификация | djangorestframework-simplejwt | 5.3.0 |
| CORS | django-cors-headers | 4.3.1 |
| База данных | PostgreSQL | 15+ |
| UUID | uuid-extensions | 1.0.0 |
| Кэширование | Django Cache Framework | - |

### Frontend
| Компонент | Технология | Версия |
|-----------|------------|--------|
| UI библиотека | React | 18.2.0 |
| Сборщик | Vite | 5.0.0 |
| Роутинг | React Router | 6.20.0 |
| HTTP клиент | Axios | 1.6.2 |
| State Management | Zustand | 4.4.7 |
| Стили | Tailwind CSS | 3.3.5 |

---

## Архитектура системы

### Backend архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      Django REST API                         │
├─────────────────────────────────────────────────────────────┤
│  Views (APIView)  →  Services  →  Managers  →  Models       │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                             │
│  ┌─────────────────┐  ┌────────────────────┐                │
│  │ PersonalizationService │  │ RecommendationEngine │       │
│  │ - get_context()        │  │ - get_frequently_bought() │  │
│  │ - get_pet_context()    │  │ - get_cart_recommendations()│ │
│  │ - get_recommendations()│  │ - get_cross_sell()        │  │
│  └─────────────────┘  └────────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│                   Custom Managers                            │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ ProductManager  │  │ CourseManager   │                   │
│  │ - catalog()     │  │ - catalog()     │                   │
│  │ - with_ratings()│  │ - with_ratings()│                   │
│  │ - for_animal()  │  │ - for_pet_type()│                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Frontend архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      React App                               │
├─────────────────────────────────────────────────────────────┤
│  Pages  →  Components  →  Hooks  →  Stores  →  API          │
├─────────────────────────────────────────────────────────────┤
│                     UI Kit                                   │
│  Button | Card | Modal | Input | Badge | Progress           │
├─────────────────────────────────────────────────────────────┤
│                   Custom Hooks                               │
│  useDebounce | useLocalStorage | useMediaQuery              │
├─────────────────────────────────────────────────────────────┤
│                   Zustand Stores                             │
│  authStore | cartStore | petStore | toastStore | favorites  │
└─────────────────────────────────────────────────────────────┘
```

---

## Структура проекта

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
│   │   ├── training/                 # Модуль курсов
│   │   │   ├── models.py             # Course, UserCourse модели
│   │   │   ├── managers.py           # CourseManager, CourseQuerySet
│   │   │   ├── views.py              # Каталог и покупка курсов
│   │   │   ├── admin.py              # Админка курсов
│   │   │   └── urls.py               # URL /api/courses/
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
│   │   │   ├── Training/             # Курсы
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

---

## Модели данных

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

## Админ-панель

### Кастомные страницы

| URL | Описание |
|-----|----------|
| `/admin/dashboard/` | Главный дашборд с метриками |
| `/admin/pet-analytics/` | Аналитика PetID |
| `/admin/recommendations/` | Настройки рекомендаций |

### Возможности

- **Дашборд**: Выручка, заказы, средний чек, топ товаров
- **Аналитика PetID**: Распределение по видам, здоровье, активность
- **Экспорт CSV**: Для товаров и заказов
- **Массовые операции**: Скидки, активация, деактивация
- **Прогресс-бары**: Визуализация статусов

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

1. Открыть http://localhost:5173
2. Зарегистрировать аккаунт
3. Создать профиль питомца с проблемами здоровья
4. Проверить персональные рекомендации в магазине
5. Добавить товары в корзину → проверить "Часто покупают вместе"
6. Создать напоминание для питомца
7. Оформить заказ
8. Проверить админ-панель: /admin/dashboard/

---

## История изменений

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

**Views (Представления):**
- `CourseListView.get()` - Каталог курсов с фильтрами
- `CourseDetailView.get()` - Детали курса с отзывами
- `UserCourseListView.get()` - Курсы пользователя с прогрессом
- `UserCoursePurchaseView.post()` - Покупка курса
- `UserCourseDetailView.get()` - Детали приобретенного курса
- `UserCourseProgressView.put()` - Обновление прогресса обучения
- `CourseReviewsView.get()` - Отзывы о курсе
- `CourseReviewsView.post()` - Добавление отзыва о курсе

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

## Контакты

**Проект:** Питомец+ MVP  
**Версия:** 0.2.0  
**Дата:** Декабрь 2024  
**Язык документации:** Русский
