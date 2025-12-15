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
| **Авторизация** | Регистрация, вход, JWT токены | Высокий |
| **PetID** | Цифровой паспорт питомца | Высокий |
| **Магазин** | Каталог кормов, корзина, заказы | Высокий |
| **Курсы** | Образовательная платформа | Средний |
| **Профиль** | Личный кабинет пользователя | Средний |

---

## Технологический стек

### Backend
| Компонент | Технология | Версия |
|-----------|------------|--------|
| Фреймворк | Django | 4.2.8 |
| REST API | Django REST Framework | 3.14.0 |
| Аутентификация | djangorestframework-simplejwt | 5.3.0 |
| CORS | django-cors-headers | 4.3.1 |
| Хранение данных | In-memory (Python dict) | - |

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
│   │   ├── data_store.py             # In-memory хранилище данных
│   │   └── authentication.py         # Кастомная JWT аутентификация
│   │
│   ├── apps/                         # Django приложения
│   │   ├── __init__.py
│   │   │
│   │   ├── users/                    # Модуль пользователей
│   │   │   ├── __init__.py
│   │   │   ├── apps.py
│   │   │   ├── views.py              # API views для авторизации
│   │   │   ├── serializers.py        # Сериализаторы данных
│   │   │   ├── urls.py               # URL для /api/auth/
│   │   │   └── profile_urls.py       # URL для /api/users/
│   │   │
│   │   ├── pets/                     # Модуль PetID
│   │   │   ├── __init__.py
│   │   │   ├── apps.py
│   │   │   ├── views.py              # CRUD операции с питомцами
│   │   │   ├── serializers.py        # Валидация данных питомцев
│   │   │   └── urls.py               # URL для /api/pets/
│   │   │
│   │   ├── shop/                     # Модуль магазина
│   │   │   ├── __init__.py
│   │   │   ├── apps.py
│   │   │   ├── views.py              # Каталог, корзина, заказы
│   │   │   ├── serializers.py        # Валидация данных магазина
│   │   │   └── urls.py               # URL для /api/shop/
│   │   │
│   │   └── training/                 # Модуль курсов
│   │       ├── __init__.py
│   │       ├── apps.py
│   │       ├── views.py              # Каталог и покупка курсов
│   │       ├── serializers.py        # Валидация данных курсов
│   │       └── urls.py               # URL для /api/courses/
│   │
│   ├── manage.py                     # Django CLI
│   ├── requirements.txt              # Python зависимости
│   └── Dockerfile                    # Docker образ backend
│
├── frontend/                         # React Frontend
│   ├── src/
│   │   ├── api/                      # API клиент
│   │   │   ├── client.js             # Axios конфигурация
│   │   │   ├── auth.js               # API авторизации
│   │   │   ├── pets.js               # API питомцев
│   │   │   ├── shop.js               # API магазина
│   │   │   └── courses.js            # API курсов
│   │   │
│   │   ├── store/                    # Zustand хранилища
│   │   │   ├── index.js
│   │   │   ├── authStore.js          # Состояние авторизации
│   │   │   └── cartStore.js          # Состояние корзины
│   │   │
│   │   ├── components/               # UI компоненты
│   │   │   ├── Layout.jsx            # Основной layout
│   │   │   ├── Navbar.jsx            # Навигация
│   │   │   ├── PrivateRoute.jsx      # Защита маршрутов
│   │   │   ├── Loader.jsx            # Индикаторы загрузки
│   │   │   ├── PetCard.jsx           # Карточка питомца
│   │   │   └── ProductCard.jsx       # Карточка товара
│   │   │
│   │   ├── pages/                    # Страницы приложения
│   │   │   ├── Home.jsx              # Главная страница
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx         # Страница входа
│   │   │   │   └── Register.jsx      # Страница регистрации
│   │   │   ├── PetProfile/
│   │   │   │   ├── PetList.jsx       # Список питомцев
│   │   │   │   ├── PetProfile.jsx    # Профиль питомца
│   │   │   │   └── PetForm.jsx       # Форма создания/редактирования
│   │   │   ├── Shop/
│   │   │   │   ├── Shop.jsx          # Каталог товаров
│   │   │   │   └── Cart.jsx          # Корзина и оформление
│   │   │   ├── Training/
│   │   │   │   └── Courses.jsx       # Каталог курсов
│   │   │   └── Dashboard/
│   │   │       └── Profile.jsx       # Личный кабинет
│   │   │
│   │   ├── App.jsx                   # Корневой компонент
│   │   ├── main.jsx                  # Точка входа
│   │   └── index.css                 # Глобальные стили
│   │
│   ├── package.json                  # NPM зависимости
│   ├── vite.config.js                # Конфигурация Vite
│   ├── tailwind.config.js            # Конфигурация Tailwind
│   └── Dockerfile                    # Docker образ frontend
│
├── docker-compose.yml                # Docker Compose конфигурация
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

## Модели данных

### User (Пользователь)

```python
class User:
    id: int                    # Уникальный идентификатор
    email: str                 # Email (логин)
    password_hash: str         # Хеш пароля (SHA-256)
    created_at: datetime       # Дата регистрации
```

### Pet (Питомец / PetID)

```python
class Pet:
    id: int                    # Уникальный идентификатор
    owner_id: int              # ID владельца (FK -> User)
    name: str                  # Кличка
    species: str               # Вид животного
    breed: str | None          # Порода
    date_of_birth: str | None  # Дата рождения (ISO формат)
    weight: float | None       # Вес в кг
    created_at: datetime       # Дата создания профиля
    updated_at: datetime       # Дата последнего обновления
```

### Product (Товар)

```python
class Product:
    id: int                    # Уникальный идентификатор
    name: str                  # Название товара
    description: str           # Описание
    price: float               # Цена в рублях
    image_url: str             # URL изображения
    pet_type: str              # Тип животного (dog/cat/all)
    product_type: str          # Тип товара (dry_food/wet_food/treats)
    in_stock: bool             # Наличие на складе
```

### Order (Заказ)

```python
class Order:
    id: int                    # Уникальный идентификатор
    user_id: int               # ID пользователя (FK -> User)
    items: list[dict]          # Список товаров с количеством
    total_amount: float        # Общая сумма
    shipping_address: str      # Адрес доставки
    status: str                # Статус заказа
    created_at: datetime       # Дата оформления
```

### Course (Курс)

```python
class Course:
    id: int                    # Уникальный идентификатор
    title: str                 # Название курса
    description: str           # Описание
    duration: int              # Длительность в минутах
    price: float               # Цена (0 = бесплатный)
    image_url: str             # URL обложки
    pet_type: str              # Целевое животное
    
    @property
    def is_free(self) -> bool  # Бесплатный ли курс
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
- Node.js 18+
- npm или yarn

### Локальный запуск

**Backend:**
```powershell
cd pet-care-platform\backend

# Создание виртуального окружения
python -m venv venv
.\venv\Scripts\activate

# Установка зависимостей
pip install -r requirements.txt

# Запуск сервера
python manage.py runserver
```
Backend доступен на: `http://localhost:8000`

**Frontend:**
```powershell
cd pet-care-platform\frontend

# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev
```
Frontend доступен на: `http://localhost:5173`

### Docker запуск

```powershell
cd pet-care-platform
docker-compose up
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
