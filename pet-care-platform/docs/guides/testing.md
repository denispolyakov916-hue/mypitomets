# Тестирование

## Backend (Django)

### Запуск тестов

```bash
cd backend

# Все тесты
python manage.py test

# Тесты конкретного app
python manage.py test apps.pets.tests

# Конкретный файл
python manage.py test apps.pets.tests.test_calorie_calculator

# Конкретный тест
python manage.py test apps.pets.tests.test_calorie_calculator.CalorieCalculatorTests.test_basic_calculation
```

### Структура тестов

```
backend/apps/{app}/tests/
├── __init__.py
├── test_{feature_1}.py
└── test_{feature_2}.py
```

### Паттерн тестового класса

```python
from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class MyFeatureTests(TestCase):
    """Тесты для MyFeature."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )

    def _create_helper(self, **kwargs):
        defaults = { ... }
        defaults.update(kwargs)
        return Model.objects.create(**defaults)

    def test_feature_works(self):
        """Описание теста на русском."""
        result = ...
        self.assertEqual(result, expected)
```

## Frontend (Vitest)

### Запуск тестов

```bash
cd frontend

npm test                # Watch mode
npm test -- --run       # Один запуск
npm run test:coverage   # С покрытием
```

### Структура тестов

Тесты рядом с компонентами или в `__tests__/`:

```
src/components/__tests__/ProductCard.test.jsx
src/pages/Shop/__tests__/Shop.test.jsx
```
