# Стратегия тестирования

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 4 - Интеграция и тестирование

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Типы тестов](#типы-тестов)
3. [Backend тестирование](#backend-тестирование)
4. [Frontend тестирование](#frontend-тестирование)
5. [Интеграционное тестирование](#интеграционное-тестирование)
6. [E2E тестирование](#e2e-тестирование)
7. [Нагрузочное тестирование](#нагрузочное-тестирование)
8. [CI/CD интеграция](#cicd-интеграция)

---

## Обзор

Стратегия тестирования платформы "Питомец+" включает несколько уровней тестирования для обеспечения качества и надежности системы.

### Пирамида тестирования

```
        /\
       /E2E\          (10%) - End-to-end тесты
      /------\
     /Integration\    (20%) - Интеграционные тесты
    /------------\
   /    Unit      \   (70%) - Unit тесты
  /----------------\
```

---

## Типы тестов

### 1. Unit тесты
- **Цель**: Тестирование отдельных функций и компонентов
- **Инструменты**: 
  - Backend: Django TestCase, pytest
  - Frontend: Vitest, React Testing Library
- **Покрытие**: > 70%

### 2. Интеграционные тесты
- **Цель**: Тестирование взаимодействия между компонентами
- **Инструменты**: 
  - Backend: Django APITestCase
  - Frontend: Vitest с моками API
- **Покрытие**: > 50%

### 3. E2E тесты
- **Цель**: Тестирование полных пользовательских сценариев
- **Инструменты**: Playwright, Cypress (будущее)
- **Покрытие**: Критические сценарии

### 4. Нагрузочное тестирование
- **Цель**: Проверка производительности под нагрузкой
- **Инструменты**: Locust, Apache JMeter
- **Частота**: Перед релизом

---

## Backend тестирование

### Структура тестов

```
backend/
├── apps/
│   ├── shop/
│   │   └── tests/
│   │       ├── test_models.py
│   │       ├── test_views.py
│   │       ├── test_serializers.py
│   │       └── test_services.py
│   ├── training/
│   │   └── tests/
│   │       ├── test_models.py
│   │       ├── test_views.py
│   │       └── test_services.py
│   └── users/
│       └── tests/
│           ├── test_auth.py
│           └── test_views.py
└── core/
    └── tests/
        ├── test_validators.py
        └── test_services.py
```

### Пример теста

```python
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from apps.shop.models import Product, Category

class ProductAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.category = Category.objects.create(name='Корм')
        
    def test_create_product(self):
        """Тест создания товара"""
        self.client.force_authenticate(user=self.user)
        data = {
            'name': 'Тестовый корм',
            'price': 1000,
            'category': self.category.id
        }
        response = self.client.post('/api/shop/products/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 1)
```

### Запуск тестов

```bash
# Все тесты
python manage.py test

# Конкретное приложение
python manage.py test apps.shop

# Конкретный тест
python manage.py test apps.shop.tests.test_views.ProductAPITestCase

# С покрытием
coverage run --source='.' manage.py test
coverage report
coverage html
```

---

## Frontend тестирование

### Структура тестов

```
frontend/src/
├── test/
│   ├── setup.ts          # Настройка тестовой среды
│   ├── utils/            # Тестовые утилиты
│   ├── unit/             # Unit тесты
│   │   ├── components/
│   │   │   ├── ProductCard.test.jsx
│   │   │   └── CourseCard.test.jsx
│   │   ├── store/
│   │   │   ├── cartStore.test.js
│   │   │   └── authStore.test.js
│   │   └── utils/
│   │       └── errorHandler.test.js
│   ├── integration/      # Интеграционные тесты
│   │   ├── shop.test.jsx
│   │   └── courses.test.jsx
│   └── e2e/              # E2E тесты (будущее)
│       └── purchase-flow.test.js
```

### Пример теста

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductCard } from '../components/ProductCard'

describe('ProductCard', () => {
  const mockProduct = {
    id: 1,
    name: 'Тестовый товар',
    price: 1000,
    images: ['image.jpg']
  }

  it('отображает название товара', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('Тестовый товар')).toBeInTheDocument()
  })

  it('вызывает onAddToCart при клике на кнопку', () => {
    const onAddToCart = vi.fn()
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />)
    
    fireEvent.click(screen.getByText('Купить'))
    expect(onAddToCart).toHaveBeenCalledWith(mockProduct, 1)
  })
})
```

### Запуск тестов

```bash
# Интерактивный режим
npm run test

# Одноразовый запуск
npm run test:run

# С покрытием
npm run test:coverage

# UI режим
npm run test:ui
```

---

## Интеграционное тестирование

### API тесты

Тестирование взаимодействия между фронтендом и бэкендом через API.

```python
class ShopIntegrationTestCase(APITestCase):
    def test_product_list_integration(self):
        """Тест интеграции списка товаров"""
        # Создание тестовых данных
        product = Product.objects.create(
            name='Тестовый товар',
            price=1000
        )
        
        # API запрос
        response = self.client.get('/api/shop/products/')
        
        # Проверка ответа
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
```

### Frontend интеграционные тесты

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Shop } from '../pages/Shop/Shop'
import * as shopAPI from '../api/shop'

vi.mock('../api/shop')

describe('Shop Integration', () => {
  beforeEach(() => {
    shopAPI.getProducts.mockResolvedValue({
      data: [
        { id: 1, name: 'Товар 1', price: 1000 },
        { id: 2, name: 'Товар 2', price: 2000 }
      ]
    })
  })

  it('загружает и отображает товары', async () => {
    render(<Shop />)
    
    await waitFor(() => {
      expect(screen.getByText('Товар 1')).toBeInTheDocument()
      expect(screen.getByText('Товар 2')).toBeInTheDocument()
    })
  })
})
```

---

## E2E тестирование

### Playwright (рекомендуется)

```javascript
// e2e/purchase-flow.spec.js
import { test, expect } from '@playwright/test'

test('полный цикл покупки', async ({ page }) => {
  // 1. Регистрация
  await page.goto('/register')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'Test123456!')
  await page.click('button[type="submit"]')
  
  // 2. Создание профиля питомца
  await page.goto('/pet-id')
  await page.fill('input[name="name"]', 'Барсик')
  // ... заполнение формы
  
  // 3. Просмотр товаров
  await page.goto('/shop')
  await expect(page.locator('.product-card')).toBeVisible()
  
  // 4. Добавление в корзину
  await page.click('.product-card:first-child button')
  await expect(page.locator('.cart-counter')).toHaveText('1')
  
  // 5. Оформление заказа
  await page.goto('/cart')
  await page.click('button:has-text("Оформить заказ")')
  // ... остальные шаги
})
```

### Запуск E2E тестов

```bash
# Установка Playwright
npm install -D @playwright/test
npx playwright install

# Запуск тестов
npx playwright test

# С UI
npx playwright test --ui
```

---

## Нагрузочное тестирование

### Locust

```python
# load_tests/locustfile.py
from locust import HttpUser, task, between

class PetCareUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Авторизация перед тестами"""
        self.client.post("/api/auth/login/", {
            "email": "test@example.com",
            "password": "test123"
        })
    
    @task(3)
    def view_products(self):
        """Просмотр товаров (высокая частота)"""
        self.client.get("/api/shop/products/")
    
    @task(1)
    def view_courses(self):
        """Просмотр курсов (низкая частота)"""
        self.client.get("/api/courses/")
    
    @task(2)
    def view_cart(self):
        """Просмотр корзины"""
        self.client.get("/api/cart/")
```

### Запуск нагрузочных тестов

```bash
# Установка
pip install locust

# Запуск
locust -f load_tests/locustfile.py

# С параметрами
locust -f load_tests/locustfile.py --host=http://localhost:8077 --users=100 --spawn-rate=10
```

---

## CI/CD интеграция

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - run: |
          cd backend
          pip install -r requirements.txt
          python manage.py test
          
  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: |
          cd frontend
          npm install
          npm run test:run
```

---

## Метрики качества

### Покрытие кода

- **Unit тесты**: > 70%
- **Интеграционные тесты**: > 50%
- **Критические компоненты**: > 90%

### Производительность

- **API ответ**: < 500ms (95-й перцентиль)
- **Время загрузки страницы**: < 3s
- **Time to Interactive**: < 3.5s

### Надежность

- **Все тесты проходят**: 100%
- **Критические баги**: 0
- **Средние баги**: < 5

---

## Следующие шаги

1. ⏳ Создать структуру тестов
2. ⏳ Написать unit тесты для ключевых компонентов
3. ⏳ Написать интеграционные тесты для API
4. ⏳ Настроить E2E тесты
5. ⏳ Настроить CI/CD для автоматического запуска тестов
6. ⏳ Достичь целевого покрытия кода

---

*Документ создан в рамках Этапа 4 рефакторинга*  
*Последнее обновление: Январь 2026*

