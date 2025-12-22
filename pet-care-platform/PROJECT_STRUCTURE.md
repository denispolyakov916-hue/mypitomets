# Питомец+ MVP — Документация проекта

## Содержание

1. [Обзор проекта](#обзор-проекта)
2. [Технологический стек](#технологический-стек)
3. [Структура проекта](#структура-проекта)
4. [API документация](#api-документация)
5. [Модели данных](#модели-данных)
6. [Frontend архитектура](#frontend-архитектура)
7. [Запуск проекта](#запуск-проекта)
8. [Тестирование](#тестирование)

---

## Обзор проекта

**Питомец+** — комплексная экосистема для владельцев домашних животных, построенная вокруг единого цифрового профиля питомца (PetID).

### Основные модули

| Модуль | Описание | Приоритет |
|--------|----------|-----------|
| **Авторизация** | Регистрация, вход, JWT токены с UUIDv7 пользователями | Высокий |
| **PetID** | Расширенный цифровой паспорт питомца (фото, аллергии, предпочтения) | Высокий |
| **Магазин** | Каталог товаров с импортом, корзина, заказы, управление складом | Высокий |
| **Курсы** | Образовательная платформа с категориями и прогрессом обучения | Средний |
| **Платежи** | Единая система платежей для всех покупок | Высокий |
| **Календарь** | Календарь событий питомца (в разработке) | Низкий |
| **Профиль** | Личный кабинет с историей заказов и курсов | Средний |

### Management команды

Проект включает специализированные команды для управления данными:

| Команда | Модуль | Описание |
|---------|--------|----------|
| `load_test_data` | shop | Загружает тестовый каталог товаров (15+ позиций) |
| `import_catalog` | shop | Импорт товаров из CSV файла |
| `import_xml_catalog` | shop | Импорт товаров из XML файла |
| `load_courses` | training | Загружает тестовые курсы обучения (7+ курсов) |

### Ключевые особенности

- **UUIDv7 идентификаторы**: Сортируемые по времени уникальные идентификаторы для всех сущностей
- **PostgreSQL база данных**: Надёжное хранение данных с индексами и связями
- **Единая система платежей**: Универсальный механизм оплаты для товаров и курсов
- **Расширенный профиль питомца**: Фото, аллергии, предпочтения в питании
- **Категоризация товаров**: Многоуровневая классификация с внешними ID
- **Образовательная платформа**: Курсы с прогрессом и категориями сложности

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
| Хранение файлов | Django File Storage | - |

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

## Структура проекта

```
pet-care-platform/
│
├── backend/                          # Django Backend
│   ├── config/                       # Конфигурация Django
│   │   ├── __init__.py
│   │   ├── settings.py               # Настройки приложения
│   │   ├── urls.py                   # Корневые URL маршруты
│   │   ├── wsgi.py                   # WSGI точка входа
│   │   └── asgi.py                   # ASGI точка входа
│   │
│   ├── core/                         # Ядро приложения
│   │   ├── __init__.py
│   │   ├── authentication.py         # Кастомная JWT аутентификация
│   │   ├── permissions.py            # Кастомные разрешения
│   │   ├── pagination.py             # Кастомная пагинация
│   │   └── utils.py                  # Утилиты (UUIDv7 генерация)
│   │
│   ├── apps/                         # Django приложения
│   │   ├── __init__.py
│   │   │
│   │   ├── users/                    # Модуль пользователей
│   │   │   ├── __init__.py
│   │   │   ├── apps.py
│   │   │   ├── admin.py              # Админ-интерфейс
│   │   │   ├── models.py             # Кастомная модель User с UUIDv7
│   │   │   ├── views.py              # API views для авторизации
│   │   │   ├── serializers.py        # Сериализаторы данных
│   │   │   ├── urls.py               # URL для /api/auth/
│   │   │   ├── profile_urls.py       # URL для /api/users/
│   │   │   └── migrations/           # Миграции базы данных
│   │   │
│   │   ├── pets/                     # Модуль PetID
│   │   │   ├── __init__.py
│   │   │   ├── apps.py
│   │   │   ├── admin.py              # Админ-интерфейс
│   │   │   ├── models.py             # Модель Pet с расширенными полями
│   │   │   ├── views.py              # CRUD операции с питомцами
│   │   │   ├── serializers.py        # Сериализаторы данных питомцев
│   │   │   ├── urls.py               # URL для /api/pets/
│   │   │   ├── services.py           # Бизнес-логика
│   │   │   └── migrations/           # Миграции базы данных
│   │   │
│   │   ├── shop/                     # Модуль магазина
│   │   │   ├── __init__.py
│   │   │   ├── apps.py
│   │   │   ├── admin.py              # Админ-интерфейс
│   │   │   ├── models.py             # Product, Cart, Order модели
│   │   │   ├── views.py              # Каталог, корзина, заказы
│   │   │   ├── serializers.py        # Сериализаторы данных магазина
│   │   │   ├── urls.py               # URL для /api/shop/
│   │   │   ├── services.py           # Бизнес-логика
│   │   │   ├── management/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── import_catalog.py     # Импорт каталога
│   │   │   │   │   ├── import_xml_catalog.py # Импорт XML каталога
│   │   │   │   │   └── load_test_data.py     # Загрузка тестовых данных
│   │   │   └── migrations/           # Миграции базы данных
│   │   │
│   │   ├── training/                 # Модуль курсов
│   │   │   ├── __init__.py
│   │   │   ├── apps.py
│   │   │   ├── admin.py              # Админ-интерфейс
│   │   │   ├── models.py             # Course, UserCourse модели
│   │   │   ├── views.py              # Каталог и покупка курсов
│   │   │   ├── serializers.py        # Сериализаторы данных курсов
│   │   │   ├── urls.py               # URL для /api/courses/
│   │   │   ├── management/
│   │   │   │   ├── commands/
│   │   │   │   │   └── load_courses.py       # Загрузка курсов
│   │   │   └── migrations/           # Миграции базы данных
│   │   │
│   │   ├── payments/                 # Модуль платежей
│   │   │   ├── __init__.py
│   │   │   ├── apps.py
│   │   │   ├── admin.py              # Админ-интерфейс
│   │   │   ├── models.py             # Payment модель
│   │   │   ├── views.py              # API платежей
│   │   │   ├── serializers.py        # Сериализаторы платежей
│   │   │   ├── urls.py               # URL для /api/payments/
│   │   │   ├── services.py           # Сервис платежей
│   │   │   └── migrations/           # Миграции базы данных
│   │   │
│   │   └── calendar/                 # Модуль календаря (в разработке)
│   │       ├── __init__.py
│   │       ├── admin.py
│   │       └── models.py
│   │
│   ├── manage.py                     # Django CLI
│   ├── requirements.txt              # Python зависимости
│   ├── create_admin.py               # Скрипт создания админа
│   ├── init_db.sql                   # Инициализация БД
│   ├── setup_database.bat            # Настройка БД (Windows)
│   ├── setup_db.sh                   # Настройка БД (Linux/Mac)
│   ├── start_backend.bat             # Запуск бэкенда (Windows)
│   ├── start_backend.sh              # Запуск бэкенда (Linux)
│   └── bb8f34a4-9259-47cc-9a89-9ed0f740064e.xml  # XML каталог товаров
│
├── .gitignore                        # Git ignore правила
└── PROJECT_STRUCTURE.md              # Эта документация
```

---

## API документация

### Базовый URL

```
Разработка: http://localhost:8000/api
```

### Формат ответов

Все ответы возвращаются в формате JSON:

```json
{
  "message": "Описание результата",
  "data": { ... }
}
```

### Коды ответов

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос |
| 201 | Ресурс создан |
| 400 | Ошибка валидации |
| 401 | Не авторизован |
| 403 | Доступ запрещён |
| 404 | Ресурс не найден |
| 500 | Внутренняя ошибка сервера |

---

### 1. Авторизация (`/api/auth/`)

#### 1.1 Регистрация пользователя

```http
POST /api/auth/register/
```

**Описание:** Создаёт новый аккаунт и возвращает JWT токены для немедленного входа.

**Тело запроса:**
```json
{
  "email": "user@example.com",
  "password": "минимум 6 символов",
  "password_confirm": "повтор пароля"
}
```

**Успешный ответ (201):**
```json
{
  "message": "Регистрация успешна",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2024-01-15T10:30:00"
  },
  "tokens": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

**Ошибки:**
| Код | Причина |
|-----|---------|
| 400 | Невалидные данные (email формат, пароли не совпадают) |
| 409 | Email уже зарегистрирован |

---

#### 1.2 Вход в систему

```http
POST /api/auth/login/
```

**Описание:** Аутентифицирует пользователя и возвращает JWT токены.

**Тело запроса:**
```json
{
  "email": "user@example.com",
  "password": "пароль пользователя"
}
```

**Успешный ответ (200):**
```json
{
  "message": "Вход выполнен успешно",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2024-01-15T10:30:00"
  },
  "tokens": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

**Ошибки:**
| Код | Причина |
|-----|---------|
| 400 | Невалидный формат данных |
| 401 | Неверный email или пароль |

---

#### 1.3 Обновление токена

```http
POST /api/auth/token/refresh/
```

**Описание:** Обновляет access токен используя refresh токен.

**Тело запроса:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Успешный ответ (200):**
```json
{
  "access": "новый_access_токен"
}
```

---

### 2. Профиль пользователя (`/api/users/`)

#### 2.1 Получение профиля

```http
GET /api/users/profile/
Authorization: Bearer <access_token>
```

**Описание:** Возвращает полную информацию о пользователе, включая питомцев, заказы и курсы.

**Успешный ответ (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2024-01-15T10:30:00"
  },
  "pets": [
    {
      "id": 1,
      "name": "Барсик",
      "species": "cat",
      "breed": "Персидская",
      "weight": 5.2
    }
  ],
  "orders": [
    {
      "id": 1,
      "total_amount": 4500,
      "status": "pending",
      "created_at": "2024-01-16T14:20:00"
    }
  ],
  "courses": [
    {
      "course": {
        "id": 1,
        "title": "Основы дрессировки"
      },
      "purchased_at": "2024-01-15T12:00:00",
      "progress": 0
    }
  ]
}
```

---

#### 2.2 История заказов

```http
GET /api/users/orders/
Authorization: Bearer <access_token>
```

**Описание:** Возвращает список всех заказов пользователя.

**Успешный ответ (200):**
```json
{
  "orders": [
    {
      "id": 1,
      "items": [
        {
          "product_id": 5,
          "product_name": "Royal Canin Adult Dog",
          "quantity": 2,
          "price": 4500,
          "total": 9000
        }
      ],
      "total_amount": 9000,
      "shipping_address": "Москва, ул. Ленина, 1",
      "status": "pending",
      "created_at": "2024-01-16T14:20:00"
    }
  ]
}
```

---

#### 2.3 Курсы пользователя

```http
GET /api/users/courses/
Authorization: Bearer <access_token>
```

**Описание:** Возвращает список приобретённых курсов.

---

### 3. Питомцы (`/api/pets/`)

#### 3.1 Список питомцев

```http
GET /api/pets/
Authorization: Bearer <access_token>
```

**Описание:** Возвращает всех питомцев текущего пользователя.

**Успешный ответ (200):**
```json
{
  "pets": [
    {
      "id": 1,
      "owner_id": 1,
      "name": "Барсик",
      "species": "cat",
      "breed": "Персидская",
      "date_of_birth": "2020-05-15",
      "weight": 5.2,
      "created_at": "2024-01-15T10:30:00",
      "updated_at": "2024-01-15T10:30:00"
    }
  ],
  "count": 1
}
```

---

#### 3.2 Создание питомца

```http
POST /api/pets/
Authorization: Bearer <access_token>
```

**Описание:** Создаёт новый профиль питомца для текущего пользователя.

**Тело запроса:**
```json
{
  "name": "Барсик",
  "species": "cat",
  "breed": "Персидская",
  "date_of_birth": "2020-05-15",
  "weight": 5.2
}
```

**Допустимые значения `species`:**
| Значение | Описание |
|----------|----------|
| `dog` | Собака |
| `cat` | Кошка |
| `bird` | Птица |
| `rodent` | Грызун |
| `fish` | Рыбка |
| `reptile` | Рептилия |
| `other` | Другое |

**Успешный ответ (201):**
```json
{
  "message": "Питомец успешно добавлен",
  "pet": {
    "id": 1,
    "owner_id": 1,
    "name": "Барсик",
    "species": "cat",
    "breed": "Персидская",
    "date_of_birth": "2020-05-15",
    "weight": 5.2,
    "created_at": "2024-01-15T10:30:00",
    "updated_at": "2024-01-15T10:30:00"
  }
}
```

**Ошибки:**
| Код | Причина |
|-----|---------|
| 400 | Невалидные данные (пустое имя, неверный вид животного) |

---

#### 3.3 Получение питомца

```http
GET /api/pets/{id}/
Authorization: Bearer <access_token>
```

**Описание:** Возвращает данные конкретного питомца.

**Параметры пути:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | int | ID питомца |

**Ошибки:**
| Код | Причина |
|-----|---------|
| 403 | Питомец принадлежит другому пользователю |
| 404 | Питомец не найден |

---

#### 3.4 Обновление питомца

```http
PUT /api/pets/{id}/
Authorization: Bearer <access_token>
```

**Описание:** Обновляет данные питомца. Поддерживает частичное обновление.

**Тело запроса (все поля опциональны):**
```json
{
  "name": "Барсик",
  "species": "cat",
  "breed": "Персидская",
  "date_of_birth": "2020-05-15",
  "weight": 5.5
}
```

**Успешный ответ (200):**
```json
{
  "message": "Данные питомца обновлены",
  "pet": { ... }
}
```

---

#### 3.5 Удаление питомца

```http
DELETE /api/pets/{id}/
Authorization: Bearer <access_token>
```

**Описание:** Удаляет профиль питомца. Действие необратимо.

**Успешный ответ (200):**
```json
{
  "message": "Питомец удалён"
}
```

---

### 4. Магазин (`/api/shop/`)

#### 4.1 Каталог товаров

```http
GET /api/shop/products/
```

**Описание:** Возвращает список товаров с возможностью фильтрации. Публичный эндпоинт.

**Query параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `pet_type` | string | Фильтр по животному: `dog`, `cat` |
| `product_type` | string | Фильтр по типу: `dry_food`, `wet_food`, `treats` |

**Примеры запросов:**
```http
GET /api/shop/products/                              # Все товары
GET /api/shop/products/?pet_type=dog                 # Только для собак
GET /api/shop/products/?product_type=dry_food        # Только сухой корм
GET /api/shop/products/?pet_type=cat&product_type=treats  # Лакомства для кошек
```

**Успешный ответ (200):**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Royal Canin Adult Dog",
      "description": "Полнорационный сухой корм для взрослых собак",
      "price": 4500,
      "image_url": "/images/products/1.jpg",
      "pet_type": "dog",
      "product_type": "dry_food",
      "in_stock": true
    }
  ],
  "count": 15,
  "filters": {
    "pet_type": ["dog", "cat", "all"],
    "product_type": ["dry_food", "wet_food", "treats"]
  }
}
```

---

#### 4.2 Информация о товаре

```http
GET /api/shop/products/{id}/
```

**Описание:** Возвращает детальную информацию о товаре.

---

#### 4.3 Просмотр корзины

```http
GET /api/shop/cart/
Authorization: Bearer <access_token>
```

**Описание:** Возвращает содержимое корзины пользователя.

**Успешный ответ (200):**
```json
{
  "cart": [
    {
      "product": {
        "id": 1,
        "name": "Royal Canin Adult Dog",
        "price": 4500,
        ...
      },
      "quantity": 2
    }
  ],
  "total": 9000,
  "items_count": 2
}
```

---

#### 4.4 Добавление в корзину

```http
POST /api/shop/cart/
Authorization: Bearer <access_token>
```

**Описание:** Добавляет товар в корзину. Если товар уже есть, увеличивает количество.

**Тело запроса:**
```json
{
  "product_id": 1,
  "quantity": 2
}
```

**Успешный ответ (200):**
```json
{
  "message": "Товар добавлен в корзину",
  "cart": [ ... ],
  "total": 9000
}
```

---

#### 4.5 Обновление количества в корзине

```http
PUT /api/shop/cart/item/
Authorization: Bearer <access_token>
```

**Описание:** Изменяет количество товара в корзине. При quantity=0 товар удаляется.

**Тело запроса:**
```json
{
  "product_id": 1,
  "quantity": 3
}
```

---

#### 4.6 Удаление из корзины

```http
DELETE /api/shop/cart/item/
Authorization: Bearer <access_token>
```

**Тело запроса:**
```json
{
  "product_id": 1
}
```

---

#### 4.7 Оформление заказа

```http
POST /api/shop/orders/
Authorization: Bearer <access_token>
```

**Описание:** Создаёт заказ из содержимого корзины. Корзина очищается после оформления.

**Тело запроса:**
```json
{
  "shipping_address": "Москва, ул. Ленина, д. 1, кв. 5"
}
```

**Успешный ответ (201):**
```json
{
  "message": "Заказ успешно оформлен",
  "order": {
    "id": 1,
    "user_id": 1,
    "items": [
      {
        "product_id": 1,
        "product_name": "Royal Canin Adult Dog",
        "quantity": 2,
        "price": 4500,
        "total": 9000
      }
    ],
    "total_amount": 9000,
    "shipping_address": "Москва, ул. Ленина, д. 1, кв. 5",
    "status": "pending",
    "created_at": "2024-01-16T14:20:00"
  }
}
```

**Ошибки:**
| Код | Причина |
|-----|---------|
| 400 | Корзина пуста или не указан адрес |

---

#### 4.8 История заказов

```http
GET /api/shop/orders/history/
Authorization: Bearer <access_token>
```

**Описание:** Возвращает историю заказов пользователя.

---

### 5. Курсы (`/api/courses/`)

#### 5.1 Каталог курсов

```http
GET /api/courses/
```

**Описание:** Возвращает список доступных курсов. Публичный эндпоинт.

**Query параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `pet_type` | string | Фильтр: `dog`, `cat`, `all` |

**Успешный ответ (200):**
```json
{
  "courses": [
    {
      "id": 1,
      "title": "Основы дрессировки собак",
      "description": "Базовые команды и послушание для начинающих",
      "duration": 120,
      "price": 0,
      "image_url": "/images/courses/1.jpg",
      "pet_type": "dog",
      "is_free": true
    },
    {
      "id": 3,
      "title": "Продвинутая дрессировка",
      "description": "Сложные трюки и команды",
      "duration": 180,
      "price": 1990,
      "image_url": "/images/courses/3.jpg",
      "pet_type": "dog",
      "is_free": false
    }
  ],
  "count": 7
}
```

---

#### 5.2 Информация о курсе

```http
GET /api/courses/{id}/
```

**Описание:** Возвращает детали курса. Для авторизованных пользователей показывает статус владения.

**Успешный ответ (200):**
```json
{
  "course": {
    "id": 1,
    "title": "Основы дрессировки собак",
    ...
  },
  "is_owned": false
}
```

---

#### 5.3 Покупка/Регистрация на курс

```http
POST /api/courses/{id}/purchase/
Authorization: Bearer <access_token>
```

**Описание:** Оформляет покупку курса или регистрирует на бесплатный курс.

**Успешный ответ (200):**
```json
{
  "message": "Курс успешно приобретён",
  "course": { ... }
}
```

**Ошибки:**
| Код | Причина |
|-----|---------|
| 400 | Курс уже приобретён |
| 404 | Курс не найден |

---

#### 5.4 Мои курсы

```http
GET /api/courses/my/
Authorization: Bearer <access_token>
```

**Описание:** Возвращает список курсов, приобретённых пользователем.

**Успешный ответ (200):**
```json
{
  "courses": [
    {
      "course": {
        "id": 1,
        "title": "Основы дрессировки собак",
        ...
      },
      "purchased_at": "2024-01-15T12:00:00",
      "progress": 25
    }
  ],
  "count": 1
}
```

---

#### 5.6 Статистика курсов

```http
GET /api/courses/statistics/
Authorization: Bearer <access_token>
```

**Описание:** Возвращает статистику по курсам пользователя.

---

### 6. Платежи (`/api/payments/`)

#### 6.1 Создание платежа

```http
POST /api/payments/create/
Authorization: Bearer <access_token>
```

**Описание:** Создаёт новый платёж для покупки товаров или курсов.

**Тело запроса:**
```json
{
  "payment_type": "shop_order",
  "object_id": "uuid-заказа",
  "amount": 1500.00,
  "payment_method": "card"
}
```

**Успешный ответ (201):**
```json
{
  "message": "Платеж создан",
  "payment": {
    "id": "uuid-платежа",
    "status": "pending",
    "amount": 1500.00,
    "created_at": "2024-01-16T15:30:00"
  }
}
```

#### 6.2 Список платежей

```http
GET /api/payments/
Authorization: Bearer <access_token>
```

**Описание:** Возвращает список платежей пользователя.

**Query параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `status` | string | Фильтр по статусу |
| `payment_type` | string | Фильтр по типу платежа |

#### 6.3 Детали платежа

```http
GET /api/payments/{id}/
Authorization: Bearer <access_token>
```

**Описание:** Возвращает детальную информацию о платеже.

#### 6.4 Подтверждение платежа

```http
POST /api/payments/{id}/confirm/
Authorization: Bearer <access_token>
```

**Описание:** Подтверждает успешное завершение платежа.

#### 6.5 Отмена платежа

```http
POST /api/payments/{id}/cancel/
Authorization: Bearer <access_token>
```

**Описание:** Отменяет платёж (если он ещё не завершён).

#### 6.6 Статистика платежей

```http
GET /api/payments/statistics/
Authorization: Bearer <access_token>
```

**Описание:** Возвращает статистику платежей пользователя.

---

## Модели данных

### User (Пользователь)

```python
class User(AbstractBaseUser, PermissionsMixin):
    id: str                     # UUIDv7 идентификатор (первичный ключ)
    email: str                  # Email (логин, уникальный)
    first_name: str             # Имя
    last_name: str              # Фамилия
    phone: str                  # Телефон
    default_address: str        # Адрес доставки по умолчанию
    is_active: bool             # Активен ли аккаунт
    is_staff: bool              # Доступ к админ-панели
    date_joined: datetime       # Дата регистрации
```

### Pet (Питомец / PetID)

```python
class Pet(models.Model):
    id: str                     # UUIDv7 идентификатор (первичный ключ)
    owner: User                 # Владелец (FK -> User)
    name: str                   # Кличка
    species: str                # Вид животного (dog/cat/bird/rodent/fish/reptile/other)
    breed: str | None           # Порода
    date_of_birth: date | None  # Дата рождения
    weight: Decimal | None      # Вес в кг
    gender: str                 # Пол (male/female/unknown)
    is_neutered: bool           # Кастрирован/Стерилизован
    photo: ImageField | None    # Фото питомца
    favorite_foods: list        # Любимые продукты/корма (JSON)
    allergies: list             # Аллергии (JSON)
    created_at: datetime        # Дата создания профиля
    updated_at: datetime        # Дата последнего обновления
```

### Product (Товар)

```python
class Product(models.Model):
    external_id: str            # Внешний ID из каталога
    group_id: str | None        # ID группы товаров
    name: str                   # Название товара
    description: str | None     # Описание
    price: Decimal              # Цена
    vendor: str | None          # Бренд/Производитель
    vendor_code: str | None     # Артикул
    barcode: str | None         # Штрихкод
    weight: Decimal | None      # Вес товара
    url: str | None             # URL товара на сайте производителя
    images: list                # Массив URL изображений (JSON)
    animal: str                 # Животное (dog/cat)
    category: str               # Категория (food/pharmacy/ammunition/care/transport/toys)
    subcategory: str | None     # Подкатегория
    category_name: str | None   # Название категории
    in_stock: bool              # Наличие на складе
    stock_count: int            # Количество на складе
    params: dict                # Дополнительные параметры (JSON)
    created_at: datetime        # Дата создания
    updated_at: datetime        # Дата обновления
```

### Cart & Order (Корзина и Заказы)

```python
class Cart(models.Model):
    id: str                     # UUIDv7 идентификатор
    user: User                  # Пользователь (FK, OneToOne)
    created_at: datetime        # Дата создания
    updated_at: datetime        # Дата обновления

class CartItem(models.Model):
    cart: Cart                  # Корзина (FK)
    product: Product            # Товар (FK)
    quantity: int               # Количество

class Order(models.Model):
    id: str                     # UUIDv7 идентификатор
    user: User                  # Пользователь (FK)
    total_amount: Decimal       # Общая сумма
    shipping_address: str       # Адрес доставки
    status: str                 # Статус (pending/processing/shipped/delivered/cancelled)
    created_at: datetime        # Дата заказа
    updated_at: datetime        # Дата обновления

class OrderItem(models.Model):
    order: Order                # Заказ (FK)
    product: Product | None     # Товар (FK, может быть NULL)
    product_name: str           # Название товара (снимок)
    price: Decimal              # Цена (снимок)
    quantity: int               # Количество
```

### Course (Курс)

```python
class Course(models.Model):
    title: str                  # Название курса
    description: str            # Описание
    duration: int               # Длительность в минутах
    price: Decimal              # Цена (0 = бесплатный)
    image_url: str | None       # URL обложки
    pet_type: str               # Тип животного (dog/cat/all)
    category: str               # Категория курса
    subcategory: str | None     # Подкатегория
    level: str                  # Уровень сложности (beginner/intermediate/advanced/expert)
    format_type: str            # Формат (video/text/interactive/mixed/webinar/workshop)
    is_active: bool             # Активен ли курс
    created_at: datetime        # Дата создания
    updated_at: datetime        # Дата обновления

class UserCourse(models.Model):
    user: User                  # Пользователь (FK)
    course: Course              # Курс (FK)
    purchased_at: datetime      # Дата покупки
    progress: int               # Прогресс прохождения (0-100%)
```

### Payment (Платёж)

```python
class Payment(models.Model):
    id: str                     # UUIDv7 идентификатор
    user: User                  # Пользователь (FK)
    payment_type: str           # Тип платежа (shop_order/course/subscription)
    object_id: str              # ID связанного объекта
    amount: Decimal             # Сумма платежа
    currency: str               # Валюта (RUB по умолчанию)
    status: str                 # Статус (pending/processing/completed/failed/cancelled/refunded)
    payment_method: str         # Метод оплаты (card/bank_transfer/cash/digital_wallet)
    external_payment_id: str | None  # ID во внешней системе
    payment_gateway: str | None # Платёжный шлюз (yookassa/stripe)
    metadata: dict              # Метаданные платежа (JSON)
    created_at: datetime        # Дата создания
    updated_at: datetime        # Дата обновления
    completed_at: datetime | None # Дата завершения
```

---

## Frontend архитектура

### Маршрутизация

| Путь | Компонент | Защита | Описание |
|------|-----------|--------|----------|
| `/` | Home | Нет | Главная страница |
| `/login` | Login | Нет* | Страница входа |
| `/register` | Register | Нет* | Страница регистрации |
| `/shop` | Shop | Нет | Каталог товаров |
| `/courses` | Courses | Нет | Каталог курсов |
| `/pets` | PetList | Да | Список питомцев |
| `/pets/new` | PetForm | Да | Создание питомца |
| `/pets/:id` | PetProfile | Да | Профиль питомца |
| `/pets/:id/edit` | PetForm | Да | Редактирование питомца |
| `/cart` | Cart | Да | Корзина |
| `/profile` | Profile | Да | Личный кабинет |

*Авторизованные пользователи перенаправляются на `/pets`

### State Management (Zustand)

**authStore** - управление авторизацией:
```javascript
{
  user: null | User,
  isAuthenticated: boolean,
  isLoading: boolean,
  error: string | null,
  
  login(email, password),
  register(email, password, passwordConfirm),
  logout(),
  loadProfile()
}
```

**cartStore** - управление корзиной:
```javascript
{
  items: CartItem[],
  total: number,
  itemsCount: number,
  isLoading: boolean,
  error: string | null,
  
  loadCart(),
  addItem(productId, quantity),
  updateQuantity(productId, quantity),
  removeItem(productId),
  checkout(shippingAddress)
}
```

---

## Запуск проекта

### Требования

- Python 3.10+
- PostgreSQL 15+
- pip (менеджер пакетов Python)

### Локальный запуск

**Настройка базы данных:**
```bash
# Создание базы данных PostgreSQL
createdb pet_care_db

# Или используя скрипт настройки
./setup_db.sh
```

**Backend:**
```bash
cd backend

# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
.\venv\Scripts\activate   # Windows

# Установка зависимостей
pip install -r requirements.txt

# Выполнение миграций
python manage.py migrate

# Создание суперпользователя
python manage.py createsuperuser

# Загрузка тестовых данных (опционально)
python manage.py load_test_data

# Запуск сервера
python manage.py runserver
```
Backend доступен на: `http://localhost:8000`

### Management команды

**Загрузка тестовых данных:**
```bash
# Товары магазина
python manage.py load_test_data

# Курсы обучения
python manage.py load_courses

# Импорт каталога из XML
python manage.py import_xml_catalog path/to/catalog.xml

# Импорт каталога из CSV
python manage.py import_catalog path/to/catalog.csv
```

---

## Тестирование

### Тестовые данные

При запуске backend автоматически создаются:

**Товары (15 шт):**
- Сухой корм: Royal Canin, Purina Pro Plan, Hill's, Acana (для собак)
- Сухой корм: Royal Canin Indoor, Purina ONE, Brit Premium (для кошек)
- Влажный корм: Cesar, Pedigree (для собак)
- Влажный корм: Whiskas, Felix, Sheba (для кошек)
- Лакомства: Titbit, Dreamies, Мнямс

**Курсы (7 шт):**
- Бесплатные: Основы дрессировки, Приучение к туалету, Уход за шерстью
- Платные: Продвинутая дрессировка (1990₽), Игры с кошкой (990₽), Питание (1490₽), Первая помощь (2490₽)

### Сценарий тестирования

1. Зарегистрировать аккаунт на `/register`
2. Создать профиль питомца на `/pets/new`
3. Просмотреть каталог товаров на `/shop`
4. Добавить товары в корзину
5. Оформить заказ на `/cart`
6. Приобрести курс на `/courses`
7. Проверить данные в профиле на `/profile`

---

## Соглашения по коду

### Язык комментариев

Все комментарии в коде должны быть на **русском языке**. Это касается:
- Docstrings в Python файлах
- Комментарии в коде
- Сообщения об ошибках для пользователей
- Логи (можно оставить на английском для совместимости)

### Структура docstring

Используем стиль Google для docstrings:

```python
def my_function(arg1: str, arg2: int) -> bool:
    """
    Краткое описание функции.
    
    Более подробное описание, если необходимо.
    
    Аргументы:
        arg1: Описание первого аргумента
        arg2: Описание второго аргумента
        
    Возвращает:
        Описание возвращаемого значения
        
    Исключения:
        ValueError: Когда происходит эта ошибка
    """
    pass
```

### Именование

| Элемент | Стиль | Пример |
|---------|-------|--------|
| Классы | PascalCase | `UserProfile`, `PetCreateSerializer` |
| Функции | snake_case | `get_user_pets`, `validate_email` |
| Переменные | snake_case | `user_id`, `cart_items` |
| Константы | UPPER_SNAKE | `VALID_SPECIES`, `MAX_WEIGHT` |
| URL маршруты | kebab-case | `/api/auth/register/`, `/api/pets/` |

### Структура файлов views.py

1. Импорты (стандартные → сторонние → локальные)
2. Настройка логгера
3. Классы View (в порядке API документации)
4. Каждый View класс имеет docstring с описанием эндпоинта

### Структура файлов serializers.py

1. Импорты
2. Константы (choices, валидация)
3. Сериализаторы для ввода (Create, Update)
4. Сериализаторы для вывода (только read_only поля)

---

## Дальнейшее развитие

### Рекомендуемые следующие шаги

1. **Интеграция PostgreSQL** — замена in-memory хранилища на реальную БД
2. **Добавление тестов** — unit и integration тесты для API
3. **Модуль подписок** — регулярная доставка кормов
4. **Умный календарь** — напоминания о прививках и ветеринаре
5. **Интеграция оплаты** — подключение платёжного шлюза (ЮKassa, Stripe)
6. **Push-уведомления** — напоминания через Firebase

### Переход на PostgreSQL

```python
# config/settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'pitomets_db'),
        'USER': os.environ.get('DB_USER', 'pitomets'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}
```

---

## Контакты

**Проект:** Питомец+ MVP  
**Версия:** 0.1.0  
**Дата:** Декабрь 2024  
**Язык документации:** Русский
