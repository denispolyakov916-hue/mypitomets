# Документация по тестированию API

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 4.2 - Интеграционное тестирование API

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Структура тестов](#структура-тестов)
3. [Auth API тесты](#auth-api-тесты)
4. [Shop API тесты](#shop-api-тесты)
5. [Training API тесты](#training-api-тесты)
6. [Pets API тесты](#pets-api-тесты)
7. [Admin API тесты](#admin-api-тесты)
8. [Тестирование производительности](#тестирование-производительности)
9. [Результаты тестирования](#результаты-тестирования)

---

## Обзор

Данный документ описывает интеграционные тесты для всех API эндпоинтов платформы "Питомец+". Тесты проверяют функциональность, валидацию, авторизацию и производительность API.

### Инструменты

- **Django TestCase**: Базовый класс для тестов
- **Django REST Framework APITestCase**: Для тестирования API
- **coverage**: Для измерения покрытия кода

### Запуск тестов

```bash
# Все тесты
python manage.py test

# Конкретное приложение
python manage.py test apps.shop

# С покрытием
coverage run --source='.' manage.py test
coverage report
coverage html
```

---

## Структура тестов

```
backend/
├── apps/
│   ├── users/
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── test_auth_api.py      # Тесты аутентификации
│   │       └── test_profile_api.py   # Тесты профиля
│   ├── shop/
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── test_products_api.py  # Тесты товаров
│   │       ├── test_cart_api.py      # Тесты корзины
│   │       └── test_orders_api.py    # Тесты заказов
│   ├── training/
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── test_courses_api.py   # Тесты курсов
│   │       └── test_lessons_api.py   # Тесты уроков
│   ├── pets/
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── test_pets_api.py      # Тесты питомцев
│   │       └── test_reminders_api.py # Тесты напоминаний
│   └── reviews/
│       └── tests/
│           ├── __init__.py
│           └── test_reviews_api.py   # Тесты отзывов
└── config/
    └── tests/
        ├── __init__.py
        └── test_admin_api.py         # Тесты админ API
```

---

## Auth API тесты

### Эндпоинты для тестирования

- `POST /api/auth/registration/` - Регистрация
- `POST /api/auth/login/` - Вход
- `POST /api/auth/logout/` - Выход
- `GET /api/auth/refresh/` - Обновление токена
- `GET /api/auth/activate/<link>/` - Активация по ссылке
- `POST /api/auth/activate-by-code/` - Активация по коду

### Примеры тестов

#### Регистрация

```python
def test_registration_success(self):
    """Тест успешной регистрации"""
    data = {
        'email': 'test@example.com',
        'password': 'Test123456!',
        'password_confirm': 'Test123456!',
        'first_name': 'Тест',
        'last_name': 'Пользователь'
    }
    response = self.client.post('/api/auth/registration/', data)
    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertIn('access', response.data)
    self.assertIn('refresh', response.data)
```

#### Вход

```python
def test_login_success(self):
    """Тест успешного входа"""
    user = User.objects.create_user(
        email='test@example.com',
        password='Test123456!'
    )
    data = {
        'email': 'test@example.com',
        'password': 'Test123456!'
    }
    response = self.client.post('/api/auth/login/', data)
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertIn('access', response.data)
```

#### Валидация

```python
def test_registration_validation(self):
    """Тест валидации при регистрации"""
    data = {
        'email': 'invalid-email',
        'password': '123',  # Слишком короткий
    }
    response = self.client.post('/api/auth/registration/', data)
    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

---

## Shop API тесты

### Эндпоинты для тестирования

- `GET /api/shop/products/` - Список товаров
- `GET /api/shop/products/<id>/` - Детали товара
- `GET /api/shop/cart/` - Корзина
- `POST /api/shop/cart/add/` - Добавление в корзину
- `PUT /api/shop/cart/update/<id>/` - Обновление корзины
- `DELETE /api/shop/cart/remove/<id>/` - Удаление из корзины
- `POST /api/checkout/` - Оформление заказа
- `GET /api/shop/orders/` - Список заказов
- `GET /api/shop/orders/<id>/` - Детали заказа

### Примеры тестов

#### Список товаров

```python
def test_products_list(self):
    """Тест получения списка товаров"""
    Product.objects.create(
        name='Тестовый товар',
        price=1000,
        animal='dog'
    )
    response = self.client.get('/api/shop/products/')
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data['results']), 1)
```

#### Корзина

```python
def test_add_to_cart(self):
    """Тест добавления товара в корзину"""
    self.client.force_authenticate(user=self.user)
    product = Product.objects.create(name='Товар', price=1000)
    data = {'product_id': product.id, 'quantity': 2}
    response = self.client.post('/api/shop/cart/add/', data)
    self.assertEqual(response.status_code, status.HTTP_200_OK)
```

---

## Training API тесты

### Эндпоинты для тестирования

- `GET /api/courses/` - Список курсов
- `GET /api/courses/<id>/` - Детали курса
- `GET /api/courses/<id>/lessons/` - Уроки курса
- `GET /api/courses/<id>/pages/` - Страницы курса
- `POST /api/courses/<id>/enroll/` - Запись на курс

### Примеры тестов

#### Список курсов

```python
def test_courses_list(self):
    """Тест получения списка курсов"""
    Course.objects.create(
        title='Тестовый курс',
        price=1000,
        pet_type='dog'
    )
    response = self.client.get('/api/courses/')
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data['results']), 1)
```

---

## Pets API тесты

### Эндпоинты для тестирования

- `GET /api/pets/` - Список питомцев
- `POST /api/pets/` - Создание питомца
- `GET /api/pets/<id>/` - Детали питомца
- `PUT /api/pets/<id>/` - Обновление питомца
- `DELETE /api/pets/<id>/` - Удаление питомца
- `GET /api/pets/reminders/` - Список напоминаний
- `POST /api/pets/reminders/` - Создание напоминания

### Примеры тестов

#### Создание питомца

```python
def test_create_pet(self):
    """Тест создания питомца"""
    self.client.force_authenticate(user=self.user)
    data = {
        'name': 'Барсик',
        'species': 'dog',
        'breed': 'Лабрадор',
        'gender': 'male',
        'date_of_birth': '2020-01-15'
    }
    response = self.client.post('/api/pets/', data)
    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertEqual(Pet.objects.count(), 1)
```

---

## Admin API тесты

### Эндпоинты для тестирования

- `GET /api/admin/stats/` - Статистика
- `GET /api/admin/users/` - Список пользователей
- `GET /api/admin/products/` - Список товаров
- `GET /api/admin/orders/` - Список заказов
- `GET /api/admin/courses/` - Список курсов

### Примеры тестов

#### Статистика

```python
def test_admin_stats(self):
    """Тест получения статистики"""
    self.client.force_authenticate(user=self.admin_user)
    response = self.client.get('/api/admin/stats/')
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertIn('users_count', response.data)
    self.assertIn('orders_count', response.data)
```

---

## Тестирование производительности

### Метрики

- **Время ответа**: < 500ms (95-й перцентиль)
- **Время ответа критичных эндпоинтов**: < 200ms
- **Количество запросов к БД**: Минимум

### Пример теста производительности

```python
import time
from django.test import TestCase

class PerformanceTestCase(APITestCase):
    def test_products_list_performance(self):
        """Тест производительности списка товаров"""
        # Создание тестовых данных
        for i in range(100):
            Product.objects.create(
                name=f'Товар {i}',
                price=1000 + i
            )
        
        start_time = time.time()
        response = self.client.get('/api/shop/products/')
        elapsed_time = time.time() - start_time
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(elapsed_time, 0.5)  # Меньше 500ms
```

### Медленные эндпоинты

Эндпоинты, требующие оптимизации:

1. ⏳ `/api/shop/products/` - Список товаров
2. ⏳ `/api/courses/` - Список курсов
3. ⏳ `/api/admin/stats/` - Статистика
4. ⏳ `/api/pets/reminders/` - Напоминания

---

## Результаты тестирования

### Статус: ⏳ В процессе

#### Auth API
- **Статус**: ⏳ Не начат
- **Покрытие**: 0%
- **Пройдено тестов**: 0/0

#### Shop API
- **Статус**: ⏳ Не начат
- **Покрытие**: 0%
- **Пройдено тестов**: 0/0

#### Training API
- **Статус**: ⏳ Не начат
- **Покрытие**: 0%
- **Пройдено тестов**: 0/0

#### Pets API
- **Статус**: ⏳ Не начат
- **Покрытие**: 0%
- **Пройдено тестов**: 0/0

#### Admin API
- **Статус**: ⏳ Не начат
- **Покрытие**: 0%
- **Пройдено тестов**: 0/0

### Общее покрытие

- **Целевое покрытие**: > 70%
- **Текущее покрытие**: ~5% (только analytics)
- **Критические компоненты**: > 90%

---

## Следующие шаги

1. ⏳ Создать структуру тестов для всех модулей
2. ⏳ Написать тесты для auth API
3. ⏳ Написать тесты для shop API
4. ⏳ Написать тесты для training API
5. ⏳ Написать тесты для pets API
6. ⏳ Написать тесты для admin API
7. ⏳ Добавить тесты производительности
8. ⏳ Достичь целевого покрытия кода

---

*Документ создан в рамках Этапа 4.2 рефакторинга*  
*Последнее обновление: Январь 2026*

