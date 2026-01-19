# API Спецификация: PetID и Калькулятор питания

> **Версия:** 1.0  
> **Дата:** 18.01.2026  
> **Base URL:** `/api/v1/`

---

## Оглавление

- [1. Справочники](#1-справочники)
  - [1.1 Заболевания](#11-заболевания)
  - [1.2 Аллергии](#12-аллергии)
- [2. Калькулятор питания](#2-калькулятор-питания)
- [3. Данные питомца](#3-данные-питомца)
  - [3.1 Заболевания питомца](#31-заболевания-питомца)
  - [3.2 Аллергии питомца](#32-аллергии-питомца)
  - [3.3 Исключения продуктов](#33-исключения-продуктов)
- [4. PetID CRUD](#4-petid-crud)
- [5. Подбор корма](#5-подбор-корма)

---

## 1. Справочники

### 1.1 Заболевания

#### GET /nutrition/conditions/

Получение списка заболеваний с коэффициентами для калькулятора.

**Query параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `species` | string | Фильтр по виду: `dog`, `cat` |
| `category` | string | Категория: `metabolic`, `endocrine`, `renal`, ... |
| `priority` | string | Приоритет: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |

**Ответ 200:**

```json
[
  {
    "code": "obesity_1",
    "name_ru": "Ожирение 1 степени",
    "category": "metabolic",
    "priority": "MEDIUM",
    "direction": "DECREASE"
  },
  {
    "code": "diabetes",
    "name_ru": "Сахарный диабет",
    "category": "endocrine",
    "priority": "HIGH",
    "direction": "DECREASE"
  }
]
```

#### GET /nutrition/conditions/{code}/

Получение детальной информации о заболевании.

**Ответ 200:**

```json
{
  "code": "obesity_1",
  "name_ru": "Ожирение 1 степени",
  "name_en": "Obesity Grade 1",
  "species": "both",
  "category": "metabolic",
  "coefficient_min": 0.80,
  "coefficient_max": 0.90,
  "coefficient": 0.85,
  "priority": "MEDIUM",
  "direction": "DECREASE",
  "symptoms": ["Рёбра прощупываются с трудом", "Заметный жировой слой"],
  "dietary_recommendations": {
    "reduce_calories_percent": 15,
    "increase_fiber": true,
    "feeding_frequency": 3
  },
  "contraindicated_ingredients": [],
  "bcs_range_min": 6,
  "bcs_range_max": 6,
  "source": "AAHA 2021",
  "clinical_notes": "Рекомендуется постепенное снижение веса на 1-2% в неделю"
}
```

---

### 1.2 Аллергии

#### GET /nutrition/allergies/

Получение списка аллергий.

**Query параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `animal_type` | string | Фильтр: `dog`, `cat` |
| `allergen_type` | string | Тип: `Food`, `Environmental`, `Flea`, `Contact`, `Drug`, `Seasonal` |
| `search` | string | Поиск по названию |

**Ответ 200:**

```json
[
  {
    "code": "dog_beef_protein",
    "display_name": "Аллергия на говядину",
    "allergen_type": "Food",
    "prevalence_rate": "Very Common"
  },
  {
    "code": "dog_chicken_protein",
    "display_name": "Аллергия на курицу",
    "allergen_type": "Food",
    "prevalence_rate": "Very Common"
  }
]
```

#### GET /nutrition/allergies/{code}/

Детальная информация об аллергии.

**Ответ 200:**

```json
{
  "code": "dog_beef_protein",
  "animal_type": "dog",
  "allergen_type": "Food",
  "specific_allergen": "Говяжий белок",
  "display_name": "Аллергия на говядину",
  "prevalence_rate": "Very Common",
  "typical_symptoms": "Хроническая диарея, рвота, зудящая кожа",
  "diagnostic_approach": "Проба элиминационной диеты (8-12 недель)",
  "management_strategies": "Полное исключение аллергена из рациона",
  "seasonal_pattern": null
}
```

---

## 2. Калькулятор питания

### POST /nutrition/calculate/

Расчёт суточной калорийности и нутриентов.

**Тело запроса:**

```json
{
  "pet_id": "01234567-89ab-cdef-0123-456789abcdef",
  
  // ИЛИ базовые данные (если нет pet_id):
  "species": "dog",
  "weight_kg": 25.5,
  "age_months": 36,
  
  // Опциональные параметры:
  "is_neutered": true,
  "activity_level": "moderate",
  "size_category": "large",
  "coat_type": "double",
  "housing_type": "house",
  "living_climate": "cool",
  "reproductive_state": "none",
  "litter_size": null,
  "health_conditions": ["obesity_1", "arthritis"]
}
```

**Ответ 200:**

```json
{
  "rer_kcal": 789.45,
  "mer_kcal": 1420.11,
  "coefficients": {
    "size": 0.90,
    "activity": 1.40,
    "neutering": 1.60,
    "coat": 1.12,
    "climate": 1.05,
    "housing": 1.00,
    "reproductive": 1.00,
    "health": 0.85
  },
  "kcal_min": 1278,
  "kcal_max": 1562,
  "kcal_recommended": 1420,
  "nutrients": {
    "protein_g": 63.9,
    "fat_g": 19.6,
    "fiber_g": 4.3,
    "calcium_g": 1.42,
    "phosphorus_g": 1.07
  },
  "warnings": [
    "Ожирение 1 степени: рекомендуется снижение калорий"
  ]
}
```

### GET /nutrition/coefficients/

Получение всех коэффициентов для калькулятора.

**Ответ 200:**

```json
{
  "_meta": {
    "version": "1.0",
    "sources": ["FEDIAF 2021", "NRC 2006", "AAHA 2021"]
  },
  "formulas": {
    "dog": {
      "rer": "70 × (weight_kg)^0.75",
      "mer": "RER × K_age × K_neutering × ..."
    }
  },
  "size_category": {
    "dog": [
      {"code": "toy", "coefficient": 1.30, "weight_max_kg": 5},
      {"code": "small", "coefficient": 1.20, "weight_max_kg": 10}
    ]
  },
  "activity_level": {
    "dog": [
      {"code": "very_low", "coefficient": 1.0},
      {"code": "moderate", "coefficient": 1.4}
    ]
  }
}
```

---

## 3. Данные питомца

### 3.1 Заболевания питомца

#### GET /pets/{pet_id}/health-conditions/

Список заболеваний питомца.

**Ответ 200:**

```json
[
  {
    "id": 1,
    "pet": "uuid",
    "condition": "obesity_1",
    "condition_detail": {
      "code": "obesity_1",
      "name_ru": "Ожирение 1 степени",
      "category": "metabolic",
      "priority": "MEDIUM"
    },
    "is_breed_risk": false,
    "breed_risk_level": null,
    "diagnosis_date": "2025-06-15",
    "severity": "moderate",
    "is_active": true,
    "notes": "Назначена диета",
    "created_at": "2025-06-15T10:00:00Z"
  }
]
```

#### POST /pets/{pet_id}/health-conditions/

Добавление заболевания питомцу.

**Тело запроса:**

```json
{
  "condition": "diabetes",
  "diagnosis_date": "2026-01-15",
  "severity": "moderate",
  "is_active": true,
  "notes": "Инсулинотерапия 2 ед/день"
}
```

#### DELETE /pets/{pet_id}/health-conditions/{id}/

Удаление записи о заболевании.

---

### 3.2 Аллергии питомца

#### GET /pets/{pet_id}/allergies/

Список аллергий питомца.

#### POST /pets/{pet_id}/allergies/

Добавление аллергии.

**Тело запроса:**

```json
{
  "allergy": "dog_chicken_protein",
  "diagnosis_date": "2025-03-20",
  "severity": "severe",
  "is_active": true,
  "notes": "Подтверждено элиминационной диетой"
}
```

---

### 3.3 Исключения продуктов

#### GET /pets/{pet_id}/food-exclusions/

Список исключённых ингредиентов.

#### POST /pets/{pet_id}/food-exclusions/

Добавление исключения.

**Тело запроса:**

```json
{
  "ingredient_code": "chicken_protein",
  "ingredient_name": "Куриный белок",
  "reason": "allergy",
  "related_allergy": "dog_chicken_protein",
  "notes": ""
}
```

---

## 4. PetID CRUD

### GET /pets/

Список питомцев текущего пользователя.

### POST /pets/

Создание нового питомца (Этап 1 - базовый профиль).

**Обязательные поля:**

```json
{
  "name": "Барсик",
  "species": "cat",
  "breed": 1001,
  "date_of_birth": "2023-05-15",
  "sex": "male",
  "weight": 5.2,
  "is_neutered": true
}
```

**Ответ 201:**

```json
{
  "id": "01234567-89ab-cdef-0123-456789abcdef",
  "name": "Барсик",
  "species": "cat",
  "breed": 1001,
  "date_of_birth": "2023-05-15",
  "weight": 5.2,
  "gender": "male",
  "is_neutered": true,
  
  "coat_type": "short",
  "size_category": "medium",
  "ideal_weight_kg": 4.5,
  "activity_level": "moderate",
  
  "age": 2,
  "age_months": 32,
  "age_category": "adult",
  "calculated_size": "medium",
  "profile_completeness": 55,
  
  "created_at": "2026-01-18T12:00:00Z"
}
```

### GET /pets/{id}/

Получение профиля питомца.

### PATCH /pets/{id}/

Обновление профиля (Этап 2 - расширенный профиль).

### GET /pets/{id}/specificity/

Динамически вычисляемые параметры breed_specificity.

**Ответ 200:**

```json
{
  "age_months": 32,
  "age_years": 2.67,
  "age_category": "adult",
  "life_stage_nutrition": "maintenance",
  "ideal_weight_kg": {"min": 3.5, "max": 5.5},
  "weight_status": "normal",
  "bcs_estimated": 5,
  "recommended_activity_level": "moderate",
  "growth_complete": true,
  "age_adjustments": {
    "activity_modifier": 1.0,
    "protein_needs": "normal",
    "calcium_needs": "normal"
  }
}
```

---

## 5. Подбор корма

### GET /shop/products/food-search/

Поиск и подбор корма по параметрам питомца.

**Query параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `pet_id` | uuid | ID питомца (автоматически загрузит параметры) |
| `species` | string | `dog` / `cat` |
| `life_stage` | string | `puppy`, `adult`, `senior` |
| `size_category` | string | `toy`, `small`, `medium`, `large`, `giant` |
| `exclude_allergens` | string[] | Коды аллергенов для исключения |
| `suitable_for` | string[] | Коды заболеваний (weight_control, joint_support) |
| `quality_class` | string[] | `premium`, `super_premium`, `holistic` |
| `food_category` | string | `dry_food`, `wet_food`, `treats` |
| `sort_by` | string | `relevance`, `price_asc`, `price_desc`, `rating` |
| `page` | int | Страница (default: 1) |
| `page_size` | int | Размер страницы (default: 20) |

**Пример запроса:**

```
GET /shop/products/food-search/?pet_id=uuid&exclude_allergens=chicken_protein&suitable_for=arthritis&quality_class=super_premium,holistic
```

**Ответ 200:**

```json
{
  "count": 45,
  "next": "/shop/products/food-search/?page=2",
  "previous": null,
  "results": [
    {
      "id": "product-uuid",
      "name": "Acana Adult Large Breed",
      "brand": "Acana",
      "price": 5490.00,
      "image_url": "https://...",
      "nutrition": {
        "food_category": "dry_food",
        "quality_class": "holistic",
        "guaranteed_analysis": {
          "crude_protein_percent": 31,
          "crude_fat_percent": 15
        },
        "calorie_content": {
          "kcal_per_100g": 365
        },
        "protein_sources": ["lamb", "salmon"],
        "contains_allergens": ["fish_protein"],
        "suitable_for_conditions": ["arthritis", "weight_control"]
      },
      "relevance_score": 85,
      "match_reasons": [
        "Не содержит курицу",
        "Подходит для суставов (глюкозамин)",
        "Контроль веса"
      ],
      "warnings": [],
      "recommended_portion_g": 390
    }
  ]
}
```

### POST /nutrition/calculate-portion/

Расчёт порции конкретного корма для питомца.

**Тело запроса:**

```json
{
  "product_id": "product-uuid",
  "pet_id": "pet-uuid",
  "include_treats": true,
  "treats_percent": 10
}
```

**Ответ 200:**

```json
{
  "daily_kcal_need": 1420,
  "food_kcal_per_100g": 365,
  "main_food_portion_g": 351,
  "treats_allowance_kcal": 142,
  "feeding_schedule": {
    "meals_per_day": 2,
    "portion_per_meal_g": 175
  },
  "notes": [
    "При высокой активности увеличьте порцию на 10-15%"
  ]
}
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Неверные параметры запроса |
| 401 | Требуется авторизация |
| 403 | Нет доступа к ресурсу |
| 404 | Ресурс не найден |
| 422 | Ошибка валидации данных |

---

## История изменений

| Дата | Версия | Изменения |
|------|--------|-----------|
| 18.01.2026 | 1.0 | Создание спецификации |
