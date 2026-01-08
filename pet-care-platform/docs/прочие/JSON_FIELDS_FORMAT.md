# Документация форматов JSON полей

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 2.2 - Приведение JSON полей к единому формату

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Shop App - Product](#shop-app---product)
3. [Pets App - Pet](#pets-app---pet)
4. [Training App - Course](#training-app---course)
5. [Training App - Lesson](#training-app---lesson)
6. [Training App - ContentBlock](#training-app---contentblock)
7. [Стандарты форматов](#стандарты-форматов)

---

## Обзор

Этот документ описывает единые форматы для всех JSON полей в моделях платформы "Питомец+". Все JSON поля должны соответствовать этим форматам для обеспечения консистентности данных.

---

## Shop App - Product

### `images` (JSONField, default=list)

**Тип**: Список URL строк  
**Формат**: `["url1", "url2", ...]`  
**Валидатор**: `validate_url_list`

**Пример**:
```json
[
  "https://example.com/image1.jpg",
  "https://example.com/image2.jpg",
  "https://example.com/image3.jpg"
]
```

**Правила**:
- Все элементы должны быть валидными URL (начинаться с `http://` или `https://`)
- Пустой список `[]` допустим
- `null` недопустим (должен быть `[]`)

---

### `params` (JSONField, default=dict)

**Тип**: Словарь с произвольными ключами  
**Формат**: `{"key1": "value1", "key2": 123, ...}`  
**Валидатор**: `validate_product_params`

**Пример**:
```json
{
  "weight": "500г",
  "volume": "1л",
  "flavor": "курица",
  "age_group": "для щенков"
}
```

**Правила**:
- Ключи должны быть строками
- Значения могут быть: строка, число, булево, список, словарь
- Пустой словарь `{}` допустим
- `null` недопустим (должен быть `{}`)

---

## Pets App - Pet

Все JSON поля в модели Pet имеют тип **список строк** и используют валидатор `validate_string_list`.

### `favorite_foods` (JSONField, default=list)

**Тип**: Список строк  
**Формат**: `["продукт1", "продукт2", ...]`  
**Валидатор**: `validate_string_list`

**Пример**:
```json
["Royal Canin", "Pedigree", "мясо курицы"]
```

---

### `allergies` (JSONField, default=list)

**Тип**: Список строк  
**Формат**: `["аллерген1", "аллерген2", ...]`  
**Валидатор**: `validate_string_list`

**Пример**:
```json
["курица", "зерновые", "молочные продукты"]
```

---

### `health_issues` (JSONField, default=list)

**Тип**: Список строк  
**Формат**: `["проблема1", "проблема2", ...]`  
**Валидатор**: `validate_string_list`

**Пример**:
```json
["лишний вес", "чувствительное пищеварение", "аллергия"]
```

---

### `special_needs` (JSONField, default=list)

**Тип**: Список строк  
**Формат**: `["потребность1", "потребность2", ...]`  
**Валидатор**: `validate_string_list`

**Пример**:
```json
["низкокалорийная диета", "гипоаллергенный корм"]
```

---

### `preferred_activities` (JSONField, default=list)

**Тип**: Список строк  
**Формат**: `["активность1", "активность2", ...]`  
**Валидатор**: `validate_string_list`

**Пример**:
```json
["прогулки", "игры с мячом", "плавание"]
```

---

### `behavioral_problems` (JSONField, default=list)

**Тип**: Список строк  
**Формат**: `["проблема1", "проблема2", ...]`  
**Валидатор**: `validate_string_list`

**Пример**:
```json
["агрессия к другим собакам", "страх громких звуков"]
```

---

### `excluded_ingredients` (JSONField, default=list)

**Тип**: Список строк  
**Формат**: `["ингредиент1", "ингредиент2", ...]`  
**Валидатор**: `validate_string_list`

**Пример**:
```json
["курица", "пшеница", "соя"]
```

---

### `character_traits` (JSONField, default=list)

**Тип**: Список строк  
**Формат**: `["черта1", "черта2", ...]`  
**Валидатор**: `validate_string_list`

**Пример**:
```json
["дружелюбный", "активный", "любопытный"]
```

---

## Training App - Course

### `recommended_behavior_types` (JSONField, default=list)

**Тип**: Список строк с ограниченными значениями  
**Формат**: `["calm", "active", "aggressive", "shy", "playful"]`  
**Валидатор**: `validate_behavior_types`

**Допустимые значения**:
- `calm` - спокойный
- `active` - активный
- `aggressive` - агрессивный
- `shy` - застенчивый
- `playful` - игривый

**Пример**:
```json
["calm", "playful"]
```

---

### `recommended_activity_levels` (JSONField, default=list)

**Тип**: Список строк с ограниченными значениями  
**Формат**: `["low", "medium", "high"]`  
**Валидатор**: `validate_activity_levels`

**Допустимые значения**:
- `low` - низкий
- `medium` - средний
- `high` - высокий

**Пример**:
```json
["medium", "high"]
```

---

### `recommended_social_levels` (JSONField, default=list)

**Тип**: Список строк с ограниченными значениями  
**Формат**: `["home_only", "street", "social", "mixed"]`  
**Валидатор**: `validate_social_levels`

**Допустимые значения**:
- `home_only` - только домашний
- `street` - уличный
- `social` - социальный
- `mixed` - смешанный

**Пример**:
```json
["home_only", "social"]
```

---

### `compatible_health_issues` (JSONField, default=list)

**Тип**: Список строк  
**Формат**: `["проблема1", "проблема2", ...]`  
**Валидатор**: `validate_string_list`

**Пример**:
```json
["лишний вес", "чувствительное пищеварение"]
```

---

### `addresses_special_needs` (JSONField, default=list)

**Тип**: Список строк  
**Формат**: `["потребность1", "потребность2", ...]`  
**Валидатор**: `validate_string_list`

**Пример**:
```json
["низкокалорийная диета", "гипоаллергенный корм"]
```

---

### `suitable_activities` (JSONField, default=list)

**Тип**: Список строк  
**Формат**: `["активность1", "активность2", ...]`  
**Валидатор**: `validate_string_list`

**Пример**:
```json
["прогулки", "игры", "дрессировка"]
```

---

### `addresses_behavioral_problems` (JSONField, default=list)

**Тип**: Список строк  
**Формат**: `["проблема1", "проблема2", ...]`  
**Валидатор**: `validate_string_list`

**Пример**:
```json
["агрессия", "страх", "непослушание"]
```

---

### `additional_images` (JSONField, default=list)

**Тип**: Список URL строк  
**Формат**: `["url1", "url2", ...]`  
**Валидатор**: `validate_url_list`

**Пример**:
```json
[
  "https://example.com/course-image1.jpg",
  "https://example.com/course-image2.jpg"
]
```

---

## Training App - Lesson

### `content` (JSONField, default=dict)

**Тип**: Словарь с обязательным ключом `type`  
**Формат**: Зависит от `content_type` урока  
**Валидатор**: `validate_lesson_content`

**Базовая структура**:
```json
{
  "type": "video",
  ...
}
```

**Типы контента**:

#### Видео (`content_type: "video"`)
```json
{
  "type": "video",
  "url": "https://example.com/video.mp4",
  "title": "Название видео",
  "duration": 300,
  "thumbnail": "https://example.com/thumbnail.jpg",
  "subtitles": false,
  "autoplay": false
}
```

#### Текст (`content_type: "text"`)
```json
{
  "type": "text",
  "text_blocks": [
    {
      "title": "Заголовок",
      "content": "Текст блока"
    }
  ]
}
```

#### Интерактивный (`content_type: "interactive"`)
```json
{
  "type": "interactive",
  "pet_action": {
    "action_type": "training",
    "description": "Описание действия",
    "timer": false
  }
}
```

---

### `additional_materials` (JSONField, default=list)

**Тип**: Список URL строк  
**Формат**: `["url1", "url2", ...]`  
**Валидатор**: `validate_url_list`

**Пример**:
```json
[
  "https://example.com/material1.pdf",
  "https://example.com/material2.pdf"
]
```

---

## Training App - ContentBlock

### `content` (JSONField, default=dict)

**Тип**: Словарь, структура зависит от `block_type`  
**Формат**: Зависит от типа блока  
**Валидатор**: `validate_content_block_content`

**Примеры**:

#### Текстовый блок (`block_type: "rich_text"`)
```json
{
  "html": "<p>Текст блока</p>"
}
```

#### Видео блок (`block_type: "video_player"`)
```json
{
  "video_url": "https://example.com/video.mp4",
  "title": "Название видео",
  "duration": 300,
  "thumbnail": "https://example.com/thumbnail.jpg"
}
```

#### Изображение (`block_type: "image"`)
```json
{
  "url": "https://example.com/image.jpg",
  "alt": "Альтернативный текст",
  "caption": "Подпись"
}
```

---

### `settings` (JSONField, default=dict)

**Тип**: Словарь с настройками блока  
**Формат**: `{"key": "value", ...}`  
**Валидатор**: `validate_content_block_settings`

**Пример**:
```json
{
  "autoplay": false,
  "controls": true,
  "show_subtitles": false
}
```

---

## Стандарты форматов

### Общие правила

1. **Списки**:
   - Всегда массив `[]`, никогда `null`
   - Пустой массив `[]` для отсутствующих данных
   - Все элементы одного типа

2. **Словари**:
   - Всегда объект `{}`, никогда `null`
   - Пустой объект `{}` для отсутствующих данных
   - Ключи всегда строки

3. **URL**:
   - Всегда начинаются с `http://` или `https://`
   - Валидные URL согласно RFC 3986

4. **Строки**:
   - Непустые строки (после trim)
   - UTF-8 кодировка
   - Максимальная длина зависит от поля

### Значения по умолчанию

| Тип поля | Значение по умолчанию |
|----------|----------------------|
| Список | `[]` |
| Словарь | `{}` |
| URL список | `[]` |
| Строковый список | `[]` |

### Нормализация

При нормализации данных:
1. `null` → значение по умолчанию (`[]` или `{}`)
2. Неправильный тип → значение по умолчанию
3. Некорректные URL → удаление из списка
4. Пустые строки в списках → удаление

---

## Следующие шаги

1. ⏳ Выполнить аудит всех JSON полей
2. ⏳ Нормализовать все данные согласно форматам
3. ⏳ Валидировать данные после нормализации
4. ⏳ Обновить документацию при необходимости

---

*Документ создан в рамках Этапа 2.2 рефакторинга*  
*Последнее обновление: Январь 2026*

