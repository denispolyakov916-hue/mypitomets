---
name: write-tests
description: Написание тестов для backend (Django TestCase) и frontend (Vitest + React Testing Library). Предоставляет шаблоны, паттерны и чеклисты. Используется когда пользователь просит написать тесты, покрыть код тестами, или создать тестовый файл.
---

# Написание тестов

## Выбор типа

| Платформа | Фреймворк | Расположение |
|-----------|-----------|--------------|
| Backend | Django `TestCase` | `backend/apps/{app}/tests/test_{feature}.py` |
| Frontend | Vitest + React Testing Library | `frontend/src/**/__tests__/{Component}.test.jsx` |

---

## Backend тесты (Django)

### Структура файла

```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.pets.models import Pet

User = get_user_model()


class MyFeatureTests(TestCase):
    """Тесты для MyFeature."""

    def setUp(self):
        """Подготовка тестовых данных."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )

    def _create_pet(self, **kwargs):
        """Хелпер для создания питомца."""
        defaults = {
            'owner': self.user,
            'name': 'Тестовый питомец',
            'species': 'dog',
            'weight': 10.0,
        }
        defaults.update(kwargs)
        return Pet.objects.create(**defaults)

    def test_basic_creation(self):
        """Создание объекта с базовыми параметрами."""
        pet = self._create_pet()
        self.assertIsNotNone(pet.id)
        self.assertEqual(pet.owner, self.user)

    def test_validation_error(self):
        """Проверка ошибки при невалидных данных."""
        with self.assertRaises(ValueError):
            self._create_pet(weight=-1)

    def test_edge_case(self):
        """Граничный случай: пустое имя."""
        pet = self._create_pet(name='')
        self.assertEqual(pet.name, '')
```

### Паттерны backend тестов

- **setUp()**: создание базовых объектов (User, категории)
- **Хелперы `_create_*()`**: фабрики для тестовых объектов с defaults + kwargs
- **Именование**: `test_{что_тестируем}` — описательное имя на английском
- **Docstrings**: краткое описание на русском
- **Assertions**: `assertEqual`, `assertTrue`, `assertIn`, `assertRaises`, `assertAlmostEqual`
- **Группировка**: один `TestCase` на одну логическую фичу

### Что тестировать

```
- [ ] Создание объекта с валидными данными
- [ ] Валидация обязательных полей
- [ ] Граничные значения (0, max, пустая строка)
- [ ] Бизнес-логика сервисов (расчёты, фильтрация)
- [ ] Права доступа (владелец vs чужой пользователь)
- [ ] Каскадное удаление
```

### Запуск

```bash
cd backend
python manage.py test apps.{app_name}.tests
python manage.py test apps.{app_name}.tests.test_{feature}
python manage.py test apps.{app_name}.tests.test_{feature}.MyFeatureTests.test_basic_creation
```

---

## Frontend тесты (Vitest)

### Структура файла

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import MyComponent from '../MyComponent';

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>{component}</BrowserRouter>
  );
};

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('рендерит заголовок', () => {
    renderWithRouter(<MyComponent />);
    expect(screen.getByText('Заголовок')).toBeInTheDocument();
  });

  it('обрабатывает клик по кнопке', async () => {
    const user = userEvent.setup();
    renderWithRouter(<MyComponent />);

    await user.click(screen.getByRole('button', { name: /добавить/i }));

    await waitFor(() => {
      expect(screen.getByText('Добавлено')).toBeInTheDocument();
    });
  });

  it('показывает ошибку при невалидном вводе', async () => {
    const user = userEvent.setup();
    renderWithRouter(<MyComponent />);

    await user.type(screen.getByRole('textbox'), '');
    await user.click(screen.getByRole('button', { name: /отправить/i }));

    expect(screen.getByText(/обязательное поле/i)).toBeInTheDocument();
  });
});
```

### Мокирование API

```javascript
import { vi } from 'vitest';

vi.mock('../../api', () => ({
  featureApi: {
    getAll: vi.fn().mockResolvedValue({ data: { data: [] } }),
    create: vi.fn().mockResolvedValue({ data: { data: { id: '1' } } }),
  },
}));
```

### Мокирование Zustand Store

```javascript
vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: '1', email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));
```

### Что тестировать

```
- [ ] Рендеринг компонента
- [ ] Пользовательские взаимодействия (клики, ввод)
- [ ] Состояния загрузки (spinner, skeleton)
- [ ] Обработка ошибок (toast, сообщения)
- [ ] Условный рендеринг (авторизован/нет, пусто/данные)
```

### Запуск

```bash
cd frontend
npm test                    # Все тесты
npm test -- --run           # Без watch
npm run test:coverage       # С покрытием
```
