# Спецификация нутриентов для товаров магазина

> **Версия:** 1.0  
> **Дата:** 18.01.2026  
> **Назначение:** Расширение существующих товаров магазина данными о питательной ценности для расчёта рациона и подбора корма

---

## Оглавление

- [1. Введение](#1-введение)
- [2. Категории товаров](#2-категории-товаров)
- [3. Структура нутриентов для товаров](#3-структура-нутриентов-для-товаров)
  - [3.1 Базовый гарантированный анализ](#31-базовый-гарантированный-анализ)
  - [3.2 Калорийность](#32-калорийность)
  - [3.3 Макронутриенты (расширенные)](#33-макронутриенты-расширенные)
  - [3.4 Витамины](#34-витамины)
  - [3.5 Минералы](#35-минералы)
  - [3.6 Функциональные добавки](#36-функциональные-добавки)
  - [3.7 Ингредиенты и аллергены](#37-ингредиенты-и-аллергены)
- [4. Полная структура данных](#4-полная-структура-данных)
- [5. Специфика по категориям товаров](#5-специфика-по-категориям-товаров)
- [6. Алгоритм подбора корма](#6-алгоритм-подбора-корма)
- [7. Интеграция с магазином](#7-интеграция-с-магазином)

---

## 1. Введение

Данный документ описывает структуру данных о питательной ценности, которые необходимо добавить к существующим товарам в магазине для реализации функции **подбора корма** и **расчёта рациона питания**.

**Принцип:** Не создавать отдельную таблицу `foods`, а расширить существующие товары магазина дополнительными полями в JSONB поле `nutrition_data`.

---

## 2. Категории товаров

Для расчёта рациона важно разделять товары на категории:

| Код | Название | Описание | % рациона |
|-----|----------|----------|-----------|
| `dry_food` | Сухой корм | Основа рациона, гранулированный | 80-100% |
| `wet_food` | Влажный корм | Консервы, паучи, паштеты | 0-50% |
| `semi_moist` | Полувлажный корм | Промежуточная влажность | 0-30% |
| `treats` | Лакомства | Поощрения, функциональные снеки | 5-10% |
| `supplements` | Добавки | Витамины, масла, пробиотики | Дополнительно |
| `raw_frozen` | Сырые замороженные | BARF, натуральное питание | 80-100% |
| `dehydrated` | Сублимированные | Восстанавливаемые водой | 80-100% |

**Класс качества:**

| Код | Название | Описание | Ккал/100г (сухой) |
|-----|----------|----------|-------------------|
| `economy` | Эконом | Базовые ингредиенты | 300-340 |
| `premium` | Премиум | Улучшенный состав | 340-380 |
| `super_premium` | Супер-премиум | Высококачественные ингредиенты | 380-420 |
| `holistic` | Холистик | Цельные натуральные продукты | 380-450 |
| `veterinary` | Ветеринарный | Лечебные диеты | 300-420 |

---

## 3. Структура нутриентов для товаров

### 3.1 Базовый гарантированный анализ

**Обязательные поля** (указываются на упаковке):

| Поле | Тип | Единица | Описание |
|------|-----|---------|----------|
| `crude_protein_percent` | DECIMAL(5,2) | % | Сырой протеин |
| `crude_fat_percent` | DECIMAL(5,2) | % | Сырой жир |
| `crude_fiber_percent` | DECIMAL(5,2) | % | Сырая клетчатка |
| `crude_ash_percent` | DECIMAL(5,2) | % | Сырая зола |
| `moisture_percent` | DECIMAL(5,2) | % | Влажность |

**Расчётные поля:**

| Поле | Формула | Описание |
|------|---------|----------|
| `carbohydrate_percent` | 100 - (protein + fat + fiber + ash + moisture) | Углеводы (NFE) |
| `dry_matter_percent` | 100 - moisture | Сухое вещество |

### 3.2 Калорийность

| Поле | Тип | Единица | Описание |
|------|-----|---------|----------|
| `kcal_per_kg` | INTEGER | ккал/кг | Метаболическая энергия (ME) |
| `kcal_per_100g` | DECIMAL(6,2) | ккал/100г | Рассчитывается: kcal_per_kg / 10 |
| `kcal_per_cup` | INTEGER | ккал/стакан | Для сухого корма (250 мл) |
| `kcal_per_can` | INTEGER | ккал/банка | Для влажного корма |
| `kcal_calculation_method` | ENUM | — | modified_atwater / bomb_calorimetry / estimated |

**Формула Modified Atwater (если нет данных производителя):**

```
ME (ккал/кг) = 10 × [(3.5 × protein%) + (8.5 × fat%) + (3.5 × NFE%)]

где NFE = 100 - protein - fat - fiber - ash - moisture
```

### 3.3 Макронутриенты (расширенные)

| Поле | Тип | Единица | Описание |
|------|-----|---------|----------|
| `protein_sources` | VARCHAR(50)[] | — | Источники белка (коды) |
| `fat_sources` | VARCHAR(50)[] | — | Источники жиров |
| `carb_sources` | VARCHAR(50)[] | — | Источники углеводов |
| `omega_3_percent` | DECIMAL(4,2) | % | Омега-3 жирные кислоты |
| `omega_6_percent` | DECIMAL(4,2) | % | Омега-6 жирные кислоты |
| `omega_6_to_3_ratio` | DECIMAL(4,2) | — | Соотношение омега-6:омега-3 |
| `epa_dha_mg_per_kg` | INTEGER | мг/кг | EPA + DHA (для суставов, кожи) |

**Источники белка (protein_sources):**

| Код | Название | Примечание |
|-----|----------|------------|
| `chicken` | Курица | Частый аллерген |
| `beef` | Говядина | Частый аллерген |
| `lamb` | Ягнёнок | Гипоаллергенный |
| `fish` | Рыба (общее) | — |
| `salmon` | Лосось | Омега-3 |
| `duck` | Утка | Гипоаллергенный |
| `turkey` | Индейка | Диетический |
| `rabbit` | Кролик | Гипоаллергенный |
| `venison` | Оленина | Новый белок |
| `pork` | Свинина | — |
| `egg` | Яйцо | Высокоусвояемый |
| `hydrolyzed` | Гидролизованный | Для аллергиков |
| `insect` | Насекомые | Новый источник |
| `plant_protein` | Растительный белок | Соя, горох |

### 3.4 Витамины

| Поле | Тип | Единица | Норма собаки | Норма кошки |
|------|-----|---------|--------------|-------------|
| `vitamin_a_iu_per_kg` | INTEGER | МЕ/кг | 5000-250000 | 3333-333300 |
| `vitamin_d_iu_per_kg` | INTEGER | МЕ/кг | 500-3000 | 280-30080 |
| `vitamin_e_iu_per_kg` | INTEGER | МЕ/кг | 50+ | 40+ |
| `vitamin_b1_mg_per_kg` | DECIMAL(6,2) | мг/кг | 2.25+ | 5.6+ |
| `vitamin_b2_mg_per_kg` | DECIMAL(6,2) | мг/кг | 5.2+ | 4+ |
| `vitamin_b6_mg_per_kg` | DECIMAL(6,2) | мг/кг | 1.5+ | 2.5+ |
| `vitamin_b12_mcg_per_kg` | DECIMAL(6,2) | мкг/кг | 28+ | 20+ |
| `niacin_mg_per_kg` | DECIMAL(6,2) | мг/кг | 13.6+ | 60+ |
| `pantothenic_acid_mg_per_kg` | DECIMAL(6,2) | мг/кг | 12+ | 5.75+ |
| `folic_acid_mcg_per_kg` | INTEGER | мкг/кг | 216+ | 750+ |
| `biotin_mcg_per_kg` | INTEGER | мкг/кг | — | 75+ |
| `choline_mg_per_kg` | INTEGER | мг/кг | 1360+ | 2400+ |

### 3.5 Минералы

| Поле | Тип | Единица | Описание |
|------|-----|---------|----------|
| `calcium_percent` | DECIMAL(4,2) | % | Кальций |
| `phosphorus_percent` | DECIMAL(4,2) | % | Фосфор |
| `ca_p_ratio` | DECIMAL(3,2) | — | Соотношение Ca:P (норма 1:1-2:1) |
| `sodium_percent` | DECIMAL(4,3) | % | Натрий |
| `chloride_percent` | DECIMAL(4,3) | % | Хлорид |
| `potassium_percent` | DECIMAL(4,2) | % | Калий |
| `magnesium_percent` | DECIMAL(4,3) | % | Магний |
| `iron_mg_per_kg` | INTEGER | мг/кг | Железо |
| `copper_mg_per_kg` | DECIMAL(6,2) | мг/кг | Медь |
| `manganese_mg_per_kg` | DECIMAL(6,2) | мг/кг | Марганец |
| `zinc_mg_per_kg` | INTEGER | мг/кг | Цинк |
| `iodine_mg_per_kg` | DECIMAL(4,2) | мг/кг | Йод |
| `selenium_mg_per_kg` | DECIMAL(4,3) | мг/кг | Селен |

### 3.6 Функциональные добавки

| Поле | Тип | Единица | Для чего |
|------|-----|---------|----------|
| `taurine_mg_per_kg` | INTEGER | мг/кг | **Обязательно для кошек!** Сердце, зрение |
| `l_carnitine_mg_per_kg` | INTEGER | мг/кг | Метаболизм жиров, энергия |
| `glucosamine_mg_per_kg` | INTEGER | мг/кг | Суставы |
| `chondroitin_mg_per_kg` | INTEGER | мг/кг | Суставы |
| `msm_mg_per_kg` | INTEGER | мг/кг | Суставы, воспаление |
| `prebiotics` | BOOLEAN | — | Пребиотики (FOS, MOS) |
| `probiotics` | BOOLEAN | — | Пробиотики |
| `yucca_extract` | BOOLEAN | — | Уменьшение запаха стула |
| `antioxidants` | VARCHAR(50)[] | — | Антиоксиданты (vitamin_e, rosemary, etc.) |

### 3.7 Ингредиенты и аллергены

| Поле | Тип | Описание |
|------|-----|----------|
| `ingredients_list` | TEXT | Полный список ингредиентов |
| `first_ingredient` | VARCHAR(100) | Первый ингредиент (основной) |
| `contains_grains` | BOOLEAN | Содержит зерновые |
| `grain_types` | VARCHAR(50)[] | Типы зерновых: wheat, corn, rice, barley, oats |
| `is_grain_free` | BOOLEAN | Беззерновой |
| `contains_allergens` | VARCHAR(50)[] | Содержит аллергены (коды из allergies.json) |
| `allergen_free` | VARCHAR(50)[] | Гарантированно не содержит |
| `is_limited_ingredient` | BOOLEAN | Ограниченный состав |
| `is_single_protein` | BOOLEAN | Монопротеин |
| `novel_protein` | BOOLEAN | Новый/редкий источник белка |

**Коды аллергенов:**

```
chicken_protein, beef_protein, fish_protein, egg_protein,
dairy_protein, wheat_protein, corn_protein, soy_protein,
lamb_protein, pork_protein
```

---

## 4. Полная структура данных

### JSONB поле `nutrition_data` для товара магазина

```json
{
  "food_category": "dry_food",
  "quality_class": "super_premium",
  "species": "dog",
  "life_stages": ["adult", "senior"],
  "size_categories": ["medium", "large"],
  "special_needs": ["weight_control", "joint_support"],
  
  "guaranteed_analysis": {
    "crude_protein_percent": 25.0,
    "crude_fat_percent": 12.0,
    "crude_fiber_percent": 5.0,
    "crude_ash_percent": 7.5,
    "moisture_percent": 9.0,
    "carbohydrate_percent": 41.5
  },
  
  "calorie_content": {
    "kcal_per_kg": 3450,
    "kcal_per_100g": 345.0,
    "kcal_per_cup": 320,
    "calculation_method": "modified_atwater"
  },
  
  "macronutrients": {
    "protein_sources": ["chicken", "salmon"],
    "fat_sources": ["chicken_fat", "fish_oil"],
    "carb_sources": ["rice", "barley"],
    "omega_3_percent": 0.8,
    "omega_6_percent": 2.5,
    "omega_6_to_3_ratio": 3.1,
    "epa_dha_mg_per_kg": 1500
  },
  
  "minerals": {
    "calcium_percent": 1.2,
    "phosphorus_percent": 1.0,
    "ca_p_ratio": 1.2,
    "sodium_percent": 0.35,
    "potassium_percent": 0.6,
    "magnesium_percent": 0.08,
    "zinc_mg_per_kg": 150,
    "iron_mg_per_kg": 200,
    "copper_mg_per_kg": 15,
    "selenium_mg_per_kg": 0.35,
    "iodine_mg_per_kg": 1.5
  },
  
  "vitamins": {
    "vitamin_a_iu_per_kg": 15000,
    "vitamin_d_iu_per_kg": 1500,
    "vitamin_e_iu_per_kg": 500,
    "vitamin_b1_mg_per_kg": 10,
    "vitamin_b2_mg_per_kg": 10,
    "vitamin_b6_mg_per_kg": 5,
    "vitamin_b12_mcg_per_kg": 50,
    "niacin_mg_per_kg": 45,
    "folic_acid_mcg_per_kg": 1500,
    "choline_mg_per_kg": 2000
  },
  
  "functional_additives": {
    "taurine_mg_per_kg": null,
    "l_carnitine_mg_per_kg": 300,
    "glucosamine_mg_per_kg": 500,
    "chondroitin_mg_per_kg": 300,
    "prebiotics": true,
    "probiotics": true,
    "antioxidants": ["vitamin_e", "rosemary_extract"]
  },
  
  "ingredients": {
    "ingredients_list": "Дегидрированное мясо курицы, рис, животные жиры...",
    "first_ingredient": "chicken_meal",
    "contains_grains": true,
    "grain_types": ["rice", "barley"],
    "is_grain_free": false,
    "contains_allergens": ["chicken_protein"],
    "allergen_free": ["beef_protein", "soy_protein"],
    "is_limited_ingredient": false,
    "is_single_protein": false,
    "novel_protein": false
  },
  
  "suitability": {
    "suitable_for_conditions": ["arthritis", "obesity_1"],
    "contraindicated_for": ["pancreatitis", "ckd_3_4"],
    "special_diet_type": null
  },
  
  "feeding_guidelines": {
    "weight_ranges": [
      {"weight_min_kg": 10, "weight_max_kg": 15, "grams_per_day_min": 150, "grams_per_day_max": 200},
      {"weight_min_kg": 15, "weight_max_kg": 25, "grams_per_day_min": 200, "grams_per_day_max": 280},
      {"weight_min_kg": 25, "weight_max_kg": 35, "grams_per_day_min": 280, "grams_per_day_max": 360}
    ],
    "activity_adjustment": {
      "low": 0.9,
      "moderate": 1.0,
      "high": 1.2
    }
  }
}
```

---

## 5. Специфика по категориям товаров

### 5.1 Сухой корм (dry_food)

- ✅ Полный гарантированный анализ
- ✅ Калорийность на кг и на стакан
- ✅ Все минералы и витамины
- ✅ Рекомендации по кормлению

### 5.2 Влажный корм (wet_food)

- ✅ Гарантированный анализ
- ✅ Калорийность на банку/пауч
- ⚠️ Учитывать высокую влажность (75-82%)
- 📝 Пересчёт на сухое вещество для сравнения

```
Пересчёт на сухое вещество:
Белок СВ = (Белок% × 100) / (100 - Влажность%)

Пример: 10% белка при 80% влажности = 50% белка в сухом веществе
```

### 5.3 Лакомства (treats)

- ⚠️ Ограниченный набор данных
- ✅ Калорийность на штуку/порцию
- ✅ Основные макронутриенты
- 📝 Максимум 10% суточного рациона

```json
{
  "food_category": "treats",
  "treat_type": "dental",
  "calorie_content": {
    "kcal_per_piece": 25,
    "pieces_per_pack": 12,
    "max_daily_pieces": {
      "small_dog": 1,
      "medium_dog": 2,
      "large_dog": 3
    }
  },
  "functional_benefit": "dental_care"
}
```

### 5.4 Добавки (supplements)

- ✅ Только активные вещества
- ✅ Дозировка по весу
- ❌ Не является полноценным питанием

```json
{
  "food_category": "supplements",
  "supplement_type": "joint_support",
  "active_ingredients": {
    "glucosamine_mg_per_tablet": 500,
    "chondroitin_mg_per_tablet": 400,
    "msm_mg_per_tablet": 250
  },
  "dosage_by_weight": [
    {"weight_max_kg": 10, "tablets_per_day": 0.5},
    {"weight_max_kg": 25, "tablets_per_day": 1},
    {"weight_max_kg": 50, "tablets_per_day": 2}
  ]
}
```

---

## 6. Алгоритм подбора корма

### 6.1 Входные данные от PetID

```python
{
    "species": "dog",
    "size_category": "large",
    "age_months": 48,  # → life_stage: adult
    "weight_kg": 35,
    "ideal_weight_kg": 32,  # → weight_control
    "is_neutered": True,
    "activity_level": "moderate",
    "health_conditions": ["arthritis"],
    "allergies": ["chicken_protein"],
    "food_exclusions": ["wheat_protein"]
}
```

### 6.2 Шаги подбора

```
1. ФИЛЬТРАЦИЯ (обязательные критерии):
   - species = "dog"
   - life_stages CONTAINS "adult"
   - size_categories CONTAINS "large"
   - contains_allergens NOT CONTAINS ["chicken_protein", "wheat_protein"]

2. ПРИОРИТИЗАЦИЯ (ранжирование):
   - suitable_for_conditions CONTAINS "arthritis" → +50 баллов
   - suitable_for_conditions CONTAINS "weight_control" → +30 баллов
   - glucosamine_mg_per_kg > 0 → +20 баллов
   - is_grain_free = true → +10 баллов (для аллергиков)
   - quality_class = "super_premium" → +15 баллов

3. РАСЧЁТ ПОРЦИИ:
   - MER = 1400 ккал (из калькулятора)
   - Корм: 345 ккал/100г
   - Порция = (1400 / 345) × 100 = 406 г/день
   - Лакомства: 10% = 140 ккал → основной корм: 365 г/день

4. ВЫВОД РЕЗУЛЬТАТА:
   - Топ-5 подходящих кормов
   - Расчётная порция для каждого
   - Процент покрытия потребностей в нутриентах
```

### 6.3 Проверка соответствия нутриентов

```python
def check_nutrient_coverage(food, pet_needs):
    """
    Проверяет, покрывает ли корм потребности питомца.
    """
    coverage = {}
    
    # Белок (на 1000 ккал)
    food_protein_per_1000kcal = (food.protein_percent / food.kcal_per_100g) * 1000
    coverage['protein'] = food_protein_per_1000kcal / pet_needs.protein_min
    
    # Кальций:Фосфор
    if food.ca_p_ratio < 1.0 or food.ca_p_ratio > 2.0:
        coverage['ca_p_ratio'] = "WARNING"
    
    # Таурин (для кошек)
    if pet.species == 'cat':
        if food.taurine_mg_per_kg < 1000:
            coverage['taurine'] = "WARNING"
    
    return coverage
```

---

## 7. Интеграция с магазином

### 7.1 Изменения в модели товара

```python
# backend/apps/shop/models.py

class Product(models.Model):
    # ... существующие поля ...
    
    # Новое поле для нутриентов
    nutrition_data = models.JSONField(
        null=True, 
        blank=True,
        verbose_name="Данные о питательной ценности"
    )
    
    # Для быстрой фильтрации
    food_category = models.CharField(
        max_length=20,
        choices=FOOD_CATEGORY_CHOICES,
        null=True,
        blank=True
    )
    species_for = models.CharField(
        max_length=10,
        choices=[('dog', 'Собаки'), ('cat', 'Кошки'), ('both', 'Оба')],
        null=True,
        blank=True
    )
    kcal_per_100g = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Калорийность на 100г"
    )
```

### 7.2 Индексы для фильтрации

```sql
-- Индекс для быстрого поиска по аллергенам
CREATE INDEX idx_product_allergens ON products 
USING GIN ((nutrition_data->'ingredients'->'contains_allergens'));

-- Индекс для фильтрации по категории и виду
CREATE INDEX idx_product_food_filter ON products (food_category, species_for);

-- Индекс для сортировки по калорийности
CREATE INDEX idx_product_kcal ON products (kcal_per_100g);
```

### 7.3 API эндпоинты

```
GET /api/v1/shop/products/food-search/
    ?species=dog
    &life_stage=adult
    &size_category=large
    &exclude_allergens=chicken_protein,wheat_protein
    &suitable_for=arthritis,weight_control
    &quality_class=super_premium,holistic
    &sort_by=relevance

GET /api/v1/shop/products/{id}/nutrition/
    → Возвращает полные данные о нутриентах

POST /api/v1/nutrition/calculate-portion/
    {
        "product_id": "uuid",
        "pet_id": "uuid",
        "include_treats": true,
        "treats_percent": 10
    }
    → Возвращает расчётную порцию
```

---

## История изменений

| Дата | Версия | Изменения |
|------|--------|-----------|
| 18.01.2026 | 1.0 | Создание документа |
