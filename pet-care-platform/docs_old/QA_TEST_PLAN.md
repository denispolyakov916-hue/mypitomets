# План комплексного тестирования — Питомец+

**Версия документа**: 1.0  
**Дата**: 15 февраля 2026  
**Роль**: Старший QA-инженер  

---

## 1. Цели и объём тестирования

**Цель**: Подготовить комплексное тестирование платформы «Питомец+» для проверки корректности работы функционала перед релизом.

**Объём**:
- Backend: Django REST API (бизнес-логика, эндпоинты, интеграции)
- Frontend: React-приложение (UI/UX, E2E сценарии)
- Интеграционное тестирование критичных пользовательских потоков

**Текущее состояние**:
- ✅ Backend: есть unit-тесты для `calorie_calculator` и `food_recommendation_service`
- ✅ Frontend: Vitest настроен, есть 2 теста в ChartBuilder (MetricsPanel, Canvas)
- ❌ Нет API-тестов для views/эндпоинтов
- ❌ Нет E2E-тестов
- ❌ Нет тестов для большинства frontend-страниц и компонентов

---

## 2. Матрица функционала для тестирования

### 2.1 Аутентификация и авторизация

| ID | Функционал | Приоритет | Тип тестов | Описание |
|----|------------|-----------|------------|----------|
| AUTH-01 | Регистрация | Critical | API, E2E | POST /api/auth/registration/ — валидация email, пароля, создание пользователя |
| AUTH-02 | Вход (Login) | Critical | API, E2E | POST /api/auth/login/ — JWT access + refresh токены |
| AUTH-03 | Выход (Logout) | High | API | POST /api/auth/logout/ — инвалидация refresh-токена |
| AUTH-04 | Обновление токена | Critical | API | GET /api/auth/refresh/ — продление сессии |
| AUTH-05 | Активация аккаунта | High | API | GET activate/<link>/, POST activate-by-code/, exchange-auth-code |
| AUTH-06 | Восстановление пароля | High | API | password-reset, password-reset/confirm |
| AUTH-07 | Защита маршрутов | Critical | API | PrivateRoute — доступ без токена → 401 |
| AUTH-08 | Админ-доступ | High | API | AdminRoute — только is_staff → 403 для обычных пользователей |

### 2.2 Pet ID (цифровой паспорт питомца)

| ID | Функционал | Приоритет | Тип тестов | Описание |
|----|------------|-----------|------------|----------|
| PET-01 | Создание питомца | Critical | API, E2E | POST /api/pets/ — wizard, базовые данные |
| PET-02 | CRUD питомца | Critical | API | GET, PUT, DELETE /api/pets/{uuid}/ |
| PET-03 | Анализ профиля | High | API | GET /api/pets/{uuid}/analysis/ |
| PET-04 | Справочник пород | High | API | GET /api/pets/breeds/, by-slug |
| PET-05 | Подсказки автозаполнения | Medium | API | GET /api/pets/{uuid}/autofill-suggestions/ |
| PET-06 | Калькулятор калорий | Critical | Unit, API | calorie_calculator + GET calculate-calories/ |
| PET-07 | Подбор корма | Critical | Unit, API | food_recommendation_service + diet-calculation, feeding-plan |
| PET-08 | Вакцинации | Medium | API | vaccinations CRUD |
| PET-09 | Медикаменты | Medium | API | medications CRUD |
| PET-10 | Напоминания | Medium | API | reminders CRUD, complete |
| PET-11 | Календарь событий | Medium | API | calendar/events CRUD, today, upcoming |
| PET-12 | Сравнение с породой | Low | API | breed-comparison |
| PET-13 | Медицинские записи (аллергии, заболевания) | High | API | nutrition patterns (pet_nutrition) |

### 2.3 Магазин

| ID | Функционал | Приоритет | Тип тестов | Описание |
|----|------------|-----------|------------|----------|
| SHOP-01 | Каталог товаров (v1, v2) | Critical | API | GET /products/, /v2/products/ — фильтры, пагинация |
| SHOP-02 | Детали товара | Critical | API | GET /products/{id}/, by-slug |
| SHOP-03 | Категории и бренды | High | API | GET categories/, brands/ |
| SHOP-04 | Корзина | Critical | API, E2E | GET/POST cart/, PUT/DELETE cart/item/ |
| SHOP-05 | Оформление заказа | Critical | API | checkout, orders/ |
| SHOP-06 | Адреса доставки | High | API | addresses CRUD, search |
| SHOP-07 | Возвраты | Medium | API | returns CRUD |
| SHOP-08 | Рекомендации | Medium | API | personal-recommendations, frequently-bought, breed-recommendations |
| SHOP-09 | Избранное | Medium | API (если есть) / Frontend | Добавление/удаление из избранного |

### 2.4 Курсы и обучение

| ID | Функционал | Приоритет | Тип тестов | Описание |
|----|------------|-----------|------------|----------|
| COURSE-01 | Каталог курсов | Critical | API | GET /api/courses/ |
| COURSE-02 | Детали курса | Critical | API | GET /api/courses/{id}/ |
| COURSE-03 | Покупка/запись на курс | Critical | API | purchase, enroll (бесплатный) |
| COURSE-04 | Мои курсы | High | API | GET /api/courses/my/ |
| COURSE-05 | Структура курса (модули, страницы) | High | API | GET structure/, pages/ |
| COURSE-06 | Обучение (страницы урока) | Critical | API | GET pages/{page_id}/, POST complete/ |
| COURSE-07 | Прогресс пользователя | High | API | progress, completed_pages |
| COURSE-08 | Комментарии и реакции | Medium | API | comments CRUD, like/dislike |
| COURSE-09 | Конструктор курсов | High | API | builder, pages, blocks — только для staff |

### 2.5 Платежи и Checkout

| ID | Функционал | Приоритет | Тип тестов | Описание |
|----|------------|-----------|------------|----------|
| PAY-01 | Единый Checkout | Critical | API | /api/checkout/ — товары + курсы |
| PAY-02 | Создание платежа | Critical | API | POST /api/payments/ |
| PAY-03 | Подтверждение/отмена | Critical | API | confirm, cancel |
| PAY-04 | Страница оплаты | High | API | POST /api/payments/page/ |
| PAY-05 | История платежей | Medium | API | GET /api/payments/ |
| PAY-06 | Интеграция с заказами | Critical | API | by-order, confirm-payment для order |

### 2.6 Отзывы

| ID | Функционал | Приоритет | Тип тестов | Описание |
|----|------------|-----------|------------|----------|
| REV-01 | Отзывы на товары | High | API | GET, POST, PUT, DELETE |
| REV-02 | Отзывы на курсы | High | API | Аналогично |
| REV-03 | Eligibility (кто может писать отзыв) | Medium | API | eligibility endpoints |
| REV-04 | Лайки/дизлайки | Low | API | like, dislike, remove-reaction |

### 2.7 Питание (Nutrition)

| ID | Функционал | Приоритет | Тип тестов | Описание |
|----|------------|-----------|------------|----------|
| NUT-01 | Справочник заболеваний | Medium | API | /api/v1/nutrition/ |
| NUT-02 | Справочник аллергий | Medium | API | |
| NUT-03 | Калькулятор (отдельно от PET) | Critical | Unit | Уже покрыто test_calorie_calculator.py |
| NUT-04 | Food statistics | Low | API | food-statistics |

### 2.8 Профиль и пользовательские данные

| ID | Функционал | Приоритет | Тип тестов | Описание |
|----|------------|-----------|------------|----------|
| USER-01 | Профиль пользователя | High | API | GET/PUT /api/users/ |
| USER-02 | Настройки | Medium | Frontend | Страница Settings |
| USER-03 | История заказов | High | API | orders/history |

### 2.9 Админ-панель

| ID | Функционал | Приоритет | Тип тестов | Описание |
|----|------------|-----------|------------|----------|
| ADMIN-01 | Доступ только staff | Critical | API | /api/admin/* |
| ADMIN-02 | Аналитика | Medium | API, Frontend | metrics, charts |
| ADMIN-03 | Конструктор графиков | Medium | Frontend | Уже есть MetricsPanel.test, Canvas.test |
| ADMIN-04 | Dashboard | Medium | Frontend | AnalyticsDashboard |

### 2.10 Прочее

| ID | Функционал | Приоритет | Тип тестов | Описание |
|----|------------|-----------|------------|----------|
| MISC-01 | Health check | High | API | /api/health/, /api/health/detailed/ |
| MISC-02 | Metrics (мониторинг) | Low | API | /api/metrics/ |
| MISC-03 | Обработка ошибок | High | Frontend | Error404, 403, 500, ErrorBoundary |
| MISC-04 | Загрузка файлов / S3 | Medium | API | core/upload_views, presigned URLs |

---

## 3. Рекомендуемая структура тестов

### 3.1 Backend (pytest или Django TestCase)

```
backend/
├── apps/
│   ├── users/tests/
│   │   ├── test_registration.py
│   │   ├── test_login.py
│   │   ├── test_auth_flows.py
│   │   └── test_password_reset.py
│   ├── pets/tests/
│   │   ├── test_calorie_calculator.py  ✅ есть
│   │   ├── test_food_recommendation_service.py  ✅ есть
│   │   ├── test_pet_views.py
│   │   ├── test_breeds_api.py
│   │   ├── test_reminders_api.py
│   │   └── test_calendar_api.py
│   ├── shop/tests/
│   │   ├── test_products_api.py
│   │   ├── test_cart_api.py
│   │   ├── test_orders_api.py
│   │   └── test_checkout_api.py
│   ├── training/tests/
│   │   ├── test_courses_api.py
│   │   ├── test_learning_api.py
│   │   └── test_course_builder_api.py
│   ├── payments/tests/
│   │   └── test_payments_api.py
│   └── reviews/tests/
│       └── test_reviews_api.py
```

### 3.2 Frontend (Vitest + React Testing Library)

```
frontend/src/
├── pages/
│   ├── Home.test.jsx
│   ├── Auth/
│   │   └── AuthModal.test.jsx
│   ├── Shop/
│   │   ├── Shop.test.jsx
│   │   └── Cart.test.jsx
│   ├── PetId/
│   │   └── PetIdPage.test.jsx
│   └── Training/
│       └── Courses.test.jsx
├── components/
│   ├── Navbar.test.jsx
│   ├── PrivateRoute.test.jsx
│   └── ...
└── __mocks__/  # моки для axios, api
```

### 3.3 E2E (Playwright / Cypress — на будущее)

```
e2e/
├── auth.spec.js       # регистрация, вход, выход
├── pet-creation.spec.js
├── shop-flow.spec.js  # каталог → корзина → checkout
├── course-enrollment.spec.js
└── fixtures/
```

---

## 4. Приоритизация по фазам

### Фаза 1: Критичный минимум (2–3 недели)

**Цель**: Покрыть основной путь пользователя и критические сбои.

| Область | Тесты |
|---------|-------|
| Auth | AUTH-01, AUTH-02, AUTH-04, AUTH-07 |
| Pets | PET-01, PET-02, PET-06, PET-07 |
| Shop | SHOP-01, SHOP-02, SHOP-04, SHOP-05 |
| Courses | COURSE-01, COURSE-02, COURSE-03, COURSE-06 |
| Payments | PAY-01, PAY-02, PAY-03 |

### Фаза 2: Расширенное покрытие (2–3 недели)

**Цель**: Все High-приоритетные сценарии + часть Medium.

| Область | Тесты |
|---------|-------|
| Auth | AUTH-03, AUTH-05, AUTH-06, AUTH-08 |
| Pets | PET-03, PET-04, PET-05, PET-13 |
| Shop | SHOP-03, SHOP-06, SHOP-08 |
| Courses | COURSE-04, COURSE-05, COURSE-07, COURSE-09 |
| Payments | PAY-04, PAY-05, PAY-06 |
| Reviews | REV-01, REV-02 |
| User | USER-01, USER-03 |

### Фаза 3: Полное покрытие + E2E (2–3 недели)

**Цель**: Medium/Low, E2E сценарии, стабильность.

| Область | Тесты |
|---------|-------|
| Pets | PET-08–PET-12 |
| Shop | SHOP-07, SHOP-09 |
| Courses | COURSE-08 |
| Nutrition | NUT-01, NUT-02, NUT-04 |
| Admin | ADMIN-01–04 |
| Misc | MISC-01–04 |
| E2E | auth, pet-creation, shop-flow, course-enrollment |

---

## 5. Вопросы для уточнения

1. **E2E**: Используете ли Playwright, Cypress или что-то другое? Или E2E пока не планируется?
2. **Тестовые данные**: Есть ли fixtures / seed-скрипты для тестов? Нужно ли использовать `load_test_data`, `create_test_users`?
3. **Платежи**: Используете mock-провайдер для тестов или реальный sandbox (например, Stripe test mode)?
4. **CI/CD**: Где запускаются тесты (GitHub Actions, GitLab CI, Jenkins)? Нужны ли конфиги под pipeline?
5. **Покрытие**: Есть ли целевые метрики покрытия (например, 80% по backend, 60% по frontend)?
6. **Доступность**: Нужно ли включать в план тестирование a11y (доступность)?

---

## 6. Следующие шаги

1. **Согласовать приоритеты** — подтвердить фазы и список функционала.
2. **Ответить на вопросы** из раздела 5.
3. **Начать Фазу 1** — написать API-тесты для Auth, Pets, Shop, Courses, Payments.
4. **Настроить CI** — автоматический запуск тестов при push/PR.

---

*Документ подготовлен в рамках планирования QA-работ для платформы «Питомец+».*
