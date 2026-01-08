# Документация по валидации JSON полей

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 1.3 - Валидация JSON полей

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Созданные валидаторы](#созданные-валидаторы)
3. [Применение валидации в моделях](#применение-валидации-в-моделях)
4. [Примеры использования](#примеры-использования)

---

## Обзор

В рамках рефакторинга добавлена комплексная валидация для всех JSON полей в моделях. Это обеспечивает:

- ✅ Проверку структуры данных на уровне модели
- ✅ Предотвращение некорректных данных в базе
- ✅ Понятные сообщения об ошибках для пользователей
- ✅ Консистентность данных во всех модулях

---

## Созданные валидаторы

### Базовые валидаторы

#### `validate_json_list(value, allowed_values=None, item_type=str, max_length=None, min_length=None)`

Валидация JSON списка.

**Параметры**:
- `value`: Значение для валидации
- `allowed_values`: Список допустимых значений (опционально)
- `item_type`: Тип элементов списка (по умолчанию str)
- `max_length`: Максимальная длина списка (опционально)
- `min_length`: Минимальная длина списка (опционально)

**Пример**:
```python
validate_json_list(['item1', 'item2'], allowed_values=['item1', 'item2', 'item3'])
```

#### `validate_json_dict(value, required_keys=None, allowed_keys=None, key_type=str, value_type=None)`

Валидация JSON словаря.

**Параметры**:
- `value`: Значение для валидации
- `required_keys`: Список обязательных ключей (опционально)
- `allowed_keys`: Список допустимых ключей (опционально)
- `key_type`: Тип ключей (по умолчанию str)
- `value_type`: Тип значений (опционально)

**Пример**:
```python
validate_json_dict({'key1': 'value1'}, required_keys=['key1'])
```

#### `validate_url_list(value)`

Валидация списка URL.

**Параметры**:
- `value`: Список URL для валидации

**Пример**:
```python
validate_url_list(['https://example.com/image.jpg', '/static/image.png'])
```

#### `validate_string_list(value, max_item_length=None)`

Валидация списка строк.

**Параметры**:
- `value`: Список строк для валидации
- `max_item_length`: Максимальная длина каждого элемента (опционально)

**Пример**:
```python
validate_string_list(['string1', 'string2'], max_item_length=100)
```

### Специфичные валидаторы

#### `validate_behavior_types(value)`

Валидация типов поведения.

**Допустимые значения**: `calm`, `active`, `aggressive`, `shy`, `playful`

**Использование**: `Course.recommended_behavior_types`

#### `validate_activity_levels(value)`

Валидация уровней активности.

**Допустимые значения**: `low`, `medium`, `high`

**Использование**: `Course.recommended_activity_levels`

#### `validate_social_levels(value)`

Валидация уровней социализации.

**Допустимые значения**: `home_only`, `street`, `social`, `mixed`

**Использование**: `Course.recommended_social_levels`

#### `validate_product_params(value)`

Валидация параметров товара.

**Требования**: Словарь с ключами-строками и значениями строкового, числового или булевого типа.

**Использование**: `Product.params`

#### `validate_lesson_content(value)`

Валидация контента урока.

**Требования**: Словарь с обязательными полями в зависимости от типа урока.

**Использование**: `Lesson.content`

#### `validate_content_block_content(value)`

Валидация контента блока конструктора курсов.

**Требования**: Словарь с обязательным полем `type`.

**Использование**: `ContentBlock.content`, `BlockTemplate.content`

#### `validate_content_block_settings(value)`

Валидация настроек блока конструктора курсов.

**Требования**: Словарь с произвольными ключами.

**Использование**: `ContentBlock.settings`, `BlockTemplate.settings`

---

## Применение валидации в моделях

### Shop App

#### Product

| Поле | Валидатор | Описание |
|------|-----------|----------|
| `images` | `validate_url_list` | Массив URL изображений |
| `params` | `validate_product_params` | Параметры товара |

### Pets App

#### Pet

| Поле | Валидатор | Описание |
|------|-----------|----------|
| `favorite_foods` | `validate_string_list` | Любимые продукты/корма |
| `allergies` | `validate_string_list` | Аллергии |
| `health_issues` | `validate_string_list` | Проблемы здоровья |
| `special_needs` | `validate_string_list` | Особые потребности |
| `preferred_activities` | `validate_string_list` | Предпочитаемые активности |
| `behavioral_problems` | `validate_string_list` | Поведенческие проблемы |
| `excluded_ingredients` | `validate_string_list` | Исключаемые ингредиенты |
| `character_traits` | `validate_string_list` | Черты характера |

### Training App

#### Course

| Поле | Валидатор | Описание |
|------|-----------|----------|
| `recommended_behavior_types` | `validate_behavior_types` | Рекомендуемые типы поведения |
| `recommended_activity_levels` | `validate_activity_levels` | Рекомендуемые уровни активности |
| `recommended_social_levels` | `validate_social_levels` | Рекомендуемые уровни социализации |
| `compatible_health_issues` | `validate_string_list` | Совместимые проблемы здоровья |
| `addresses_special_needs` | `validate_string_list` | Учитываемые особые потребности |
| `suitable_activities` | `validate_string_list` | Подходящие активности |
| `addresses_behavioral_problems` | `validate_string_list` | Решаемые поведенческие проблемы |
| `additional_images` | `validate_url_list` | Дополнительные изображения |

#### Lesson

| Поле | Валидатор | Описание |
|------|-----------|----------|
| `content` | `validate_lesson_content` | Контент урока |
| `additional_materials` | `validate_url_list` | Дополнительные материалы |

#### ContentBlock

| Поле | Валидатор | Описание |
|------|-----------|----------|
| `content` | `validate_content_block_content` | Содержимое блока |
| `settings` | `validate_content_block_settings` | Настройки блока |

#### BlockTemplate

| Поле | Валидатор | Описание |
|------|-----------|----------|
| `content` | `validate_content_block_content` | Содержимое шаблона |
| `settings` | `validate_content_block_settings` | Настройки шаблона |

#### Comment

| Поле | Валидатор | Описание |
|------|-----------|----------|
| `attachments` | `validate_url_list` | Вложения (фото, видео) |

---

## Примеры использования

### Пример 1: Валидация списка строк

```python
from core.validators import validate_string_list

# ✅ Корректно
validate_string_list(['аллергия1', 'аллергия2'])

# ❌ Ошибка: не список
validate_string_list('не список')  # ValidationError

# ❌ Ошибка: не все элементы - строки
validate_string_list(['строка', 123])  # ValidationError
```

### Пример 2: Валидация типов поведения

```python
from core.validators import validate_behavior_types

# ✅ Корректно
validate_behavior_types(['calm', 'active'])

# ❌ Ошибка: недопустимое значение
validate_behavior_types(['invalid_type'])  # ValidationError
```

### Пример 3: Валидация URL списка

```python
from core.validators import validate_url_list

# ✅ Корректно
validate_url_list(['https://example.com/image.jpg', '/static/image.png'])

# ❌ Ошибка: некорректный URL
validate_url_list(['not-a-url'])  # ValidationError
```

### Пример 4: Валидация в модели

```python
from django.db import models
from core.validators import validate_string_list

class Pet(models.Model):
    allergies = models.JSONField(
        default=list,
        validators=[validate_string_list],
        verbose_name='Аллергии'
    )
```

### Пример 5: Обработка ошибок валидации

```python
from django.core.exceptions import ValidationError
from core.validators import validate_behavior_types

try:
    validate_behavior_types(['invalid'])
except ValidationError as e:
    print(e.message)  # "Недопустимое значение: invalid. Допустимые значения: calm, active, aggressive, shy, playful"
```

---

## Результаты

✅ **Создан файл** `backend/core/validators.py` с комплексными валидаторами  
✅ **Добавлена валидация** во все модели с JSON полями:
- Product (2 поля)
- Pet (8 полей)
- Course (8 полей)
- Lesson (2 поля)
- ContentBlock (2 поля)
- BlockTemplate (2 поля)
- Comment (1 поле)

✅ **Всего валидируется**: 25 JSON полей

---

## Следующие шаги

1. ⏳ Добавить валидацию в сериализаторы DRF
2. ⏳ Добавить валидацию для analytics моделей
3. ⏳ Создать тесты для валидаторов
4. ⏳ Обновить документацию API с примерами валидных JSON структур

---

*Документ создан в рамках Этапа 1.3 рефакторинга*  
*Последнее обновление: Январь 2026*

