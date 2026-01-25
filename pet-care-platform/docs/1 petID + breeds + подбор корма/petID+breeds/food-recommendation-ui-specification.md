# Техническое задание: Страница подбора корма

## Содержание
1. [Обзор функционала](#1-обзор-функционала)
2. [Точки входа](#2-точки-входа)
3. [UI/UX спецификация](#3-uiux-спецификация)
4. [Бизнес-логика](#4-бизнес-логика)
5. [Расчёт рациона](#5-расчёт-рациона)
6. [Совместимость кормов](#6-совместимость-кормов)
7. [План питания](#7-план-питания)
8. [Интеграция с корзиной](#8-интеграция-с-корзиной)
9. [История питания](#9-история-питания)
10. [Модель данных](#10-модель-данных)
11. [API Endpoints](#11-api-endpoints)
12. [Специальные случаи](#12-специальные-случаи)

---

## 1. Обзор функционала

### 1.1 Назначение
Страница `/food-recommendation` — интеллектуальный конструктор рациона питания для питомца. Система автоматически подбирает оптимальный набор продуктов (корм + лакомства + добавки) на основе индивидуальных параметров питомца из PetID.

### 1.2 Ключевые возможности
- Персонализированный подбор на основе PetID (порода, возраст, вес, здоровье, аллергии)
- Два варианта набора: **Базовый** и **Продвинутый**
- Три типа питания: **Сухой**, **Влажный**, **Мультипитание**
- Интерактивная замена компонентов на аналоги
- Расчёт порций и калорийности
- Формирование плана питания на период (7-90 дней)
- Экспорт плана в PDF
- Добавление всех товаров в корзину одним кликом

### 1.3 Целевые пользователи
- Владельцы питомцев с заполненным PetID
- Пользователи с несколькими питомцами (выбор при подборе)

---

## 2. Точки входа

### 2.1 Навигация
| Точка входа | Действие |
|-------------|----------|
| **Хедер сайта** | Кнопка "🍽️ Подбор корма" → `/food-recommendation` (всегда видна) |
| **Главная страница** | Кнопка "🍽️ Подбор корма" на карточке питомца → `/food-recommendation?pet_id={id}` |
| **Профиль питомца** | Кнопка "Подобрать корм" → `/food-recommendation?pet_id={id}` |
| **Каталог магазина** | Кнопка "Персональный подбор" в разделе "Корм" → `/food-recommendation` |

**При клике на "Подбор корма" в хедере:**
- Если 1 питомец → сразу переход с `pet_id`
- Если несколько → модальное окно выбора питомца

### 2.2 Предварительные условия
- Пользователь авторизован
- У пользователя есть хотя бы один питомец с созданным PetID (Этап 1 завершён)

### 2.3 Доступность подбора

**Подбор корма доступен СРАЗУ после создания PetID (Этап 1).**

Минимальные данные для расчёта (всегда есть после Этапа 1):
- `species` — вид (dog/cat)
- `weight_kg` — вес
- `date_of_birth` → `age_months` — возраст
- `is_neutered` — кастрация

Дополнительные данные (улучшают точность):
- `size_category` — автозаполняется из породы или рассчитывается
- `activity_level` — автозаполняется или defaults
- `health_conditions` — из Этапа 2
- `allergies` — из Этапа 2
- `diet_type` (текущий корм) — из Этапа 2

---

## 3. UI/UX спецификация

### 3.1 Структура страницы (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HEADER (сайта)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ВЫБОР ПИТОМЦА                                                       │   │
│  │  [🐕 Барон] [🐱 Мурка] [🐕 Рекс]                                     │   │
│  │  ▼ выбран: Барон (Лабрадор, 3 года, 28 кг)                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ТИП ПИТАНИЯ                     ВАРИАНТ НАБОРА                      │   │
│  │  [Сухой] [Влажный] [Мульти●]    [Базовый] [Продвинутый●]            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ПЕРИОД ПОДБОРА                                                      │   │
│  │  [7 дней] [14 дней] [30 дней] [___] дней                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐   │
│  │      КОНСТРУКТОР РАЦИОНА       │  │       ПЛАН ПИТАНИЯ             │   │
│  │  ┌────────────────────────┐    │  │                                │   │
│  │  │ 🟢 Идеально подходит   │    │  │  Дневной рацион: 1250 ккал    │   │
│  │  └────────────────────────┘    │  │                                │   │
│  │                                │  │  ОБЫЧНЫЙ ДЕНЬ                  │   │
│  │  ← [Сухой корм Brand X   ] →  │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━    │   │
│  │    🏷️Рекомендуем  -15%        │  │  Утро (08:00):                 │   │
│  │    2 кг — 1 500 ₽             │  │  • Сухой корм — 180г           │   │
│  │                                │  │                                │   │
│  │  ← [Влажный корм Brand Y ] →  │  │  Вечер (18:00):                │   │
│  │    🟢 Идеально                 │  │  • Влажный корм — 1 пауч       │   │
│  │    24 × 85г — 2 400 ₽         │  │                                │   │
│  │                                │  │  Лакомства (до 3 шт/день)     │   │
│  │  ← [Лакомства Brand Z    ] →  │  │                                │   │
│  │    🏷️Топ продаж               │  │  АКТИВНЫЙ ДЕНЬ (+15%)         │   │
│  │    200г — 350 ₽               │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━    │   │
│  │                                │  │  Утро: Сухой корм — 207г      │   │
│  │  ← [Витамины для суставов] →  │  │  Вечер: Влажный — 1.5 пауча   │   │
│  │    🟢 Хорошо подходит          │  │                                │   │
│  │    60 табл — 800 ₽            │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━    │   │
│  │                                │  │  📅 Активные дни: Пн, Ср, Пт  │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━   │  │                                │   │
│  │  ИТОГО на 30 дней: 5 050 ₽    │  │  [📄 Скачать PDF]              │   │
│  │                                │  │                                │   │
│  │  💡 План на 60 дней выгоднее  │  └────────────────────────────────┘   │
│  │     на 18%! [Показать]        │                                       │
│  │                                │                                       │
│  │  [🛒 Добавить в корзину]      │                                       │
│  └────────────────────────────────┘                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ЧАСТО ПОКУПАЮТ ВМЕСТЕ                                              │   │
│  │  [Миска] [Игрушка] [Поводок] [Пелёнки]                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Структура страницы (Mobile)

```
┌─────────────────────────┐
│  ← Подбор корма         │
├─────────────────────────┤
│                         │
│  Питомец: [▼ Барон   ]  │
│  Лабрадор, 3 года, 28кг │
│                         │
├─────────────────────────┤
│  Тип питания:           │
│  [Сухой][Влаж][Мульти●] │
├─────────────────────────┤
│  Набор:                 │
│  [Базовый][Продвинут●]  │
├─────────────────────────┤
│  Период: [14▼] дней     │
├─────────────────────────┤
│                         │
│  🟢 Идеально подходит   │
│                         │
│  ┌───────────────────┐  │
│  │ ← Сухой корм    → │  │  ← свайп
│  │   Brand X Premium │  │
│  │   🏷️Рекомендуем   │  │
│  │   2кг — 1 500 ₽   │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ ← Влажный корм  → │  │
│  │   Brand Y         │  │
│  │   24×85г—2 400 ₽  │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ ← Лакомства     → │  │
│  │   Brand Z         │  │
│  │   200г — 350 ₽    │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ ← Витамины      → │  │
│  │   Для суставов    │  │
│  │   60табл — 800 ₽  │  │
│  └───────────────────┘  │
│                         │
├─────────────────────────┤
│  ИТОГО: 5 050 ₽         │
│  [📄 План] [🛒 Корзина] │
└─────────────────────────┘
```

### 3.3 Карточка компонента

```
┌──────────────────────────────────────────────────┐
│  🏷️ Рекомендуем    🟢 Идеально    -15%          │
├──────────────────────────────────────────────────┤
│  [Фото]  Brand X Premium Adult Large Breed       │
│          Сухой корм для крупных собак            │
│                                                  │
│  ←  ●○○○○○○○○○  →                               │
│     1 из 23 вариантов                            │
│                                                  │
│  📦 4 кг (хватит на ~35 дней)                   │
│  💰 2 850 ₽  ̶3̶ ̶3̶5̶0̶ ̶₽̶                           │
└──────────────────────────────────────────────────┘
```

### 3.4 Бейджи на карточках

| Бейдж | Условие | Цвет |
|-------|---------|------|
| 🏷️ Рекомендуем | `product.priority >= 8` | Фиолетовый |
| 🟢 Идеально подходит | `match_score >= 90` | Зелёный |
| 🟡 Хорошо подходит | `match_score >= 70` | Жёлтый |
| 🔥 Топ продаж | `product.order_count` в топ-10 | Оранжевый |
| ✨ Новинка | Добавлен < 30 дней | Синий |
| -X% | `product.discount_percent > 0` | Красный |
| 🩺 Лечебный | `product.is_therapeutic` | Голубой |
| 🌿 Гипоаллергенный | `product.subcategory == 'hypoallergenic'` | Мятный |

**Правило:** Показывать максимум 3 бейджа на карточке. Приоритет: Скидка > Рекомендуем > Совместимость > Остальные.

### 3.5 Анимации

| Действие | Анимация |
|----------|----------|
| Смена компонента (стрелки) | Slide left/right, 200ms |
| Пересчёт плана | Fade out → Fade in, 150ms |
| Добавление в корзину | Scale pulse + check icon |
| Предупреждение | Shake + highlight border |

---

## 4. Бизнес-логика

### 4.1 Состав наборов

#### Базовый набор

| Тип питания | Компоненты |
|-------------|------------|
| Сухой | Сухой корм + Лакомства |
| Влажный | Влажный корм + Лакомства |
| Мультипитание | Сухой корм + Влажный корм + Лакомства |

#### Продвинутый набор

| Тип питания | Компоненты |
|-------------|------------|
| Сухой | Сухой корм + Лакомства + Добавки (1-4) |
| Влажный | Влажный корм + Лакомства + Добавки (1-4) |
| Мультипитание | Сухой + Влажный + Лакомства + Добавки (1-4) |

### 4.2 Автоматический выбор добавок (Продвинутый набор)

Система автоматически подбирает добавки на основе данных PetID:

```python
def get_recommended_supplements(pet):
    supplements = []
    
    # По возрасту
    if pet.age_months < 12:  # Щенок/котёнок
        supplements.append('calcium_vitamin_d')  # Кальций + Витамин D
    elif pet.age_months > 84:  # Пожилой (>7 лет)
        supplements.append('antioxidants')  # Антиоксиданты
        supplements.append('joint_support')  # Поддержка суставов
    
    # По размеру (собаки)
    if pet.species == 'dog' and pet.size_category in ['large', 'giant']:
        supplements.append('joint_support')  # Глюкозамин, хондроитин
    
    # По здоровью
    health_supplement_map = {
        'joint_problems': 'joint_support',
        'skin_problems': 'omega3_biotin',
        'digestive_issues': 'probiotics',
        'weak_immunity': 'vitamin_complex',
        'dental_problems': 'dental_care',
    }
    
    for condition in pet.health_conditions:
        if condition.code in health_supplement_map:
            supplements.append(health_supplement_map[condition.code])
    
    # Репродуктивное состояние
    if pet.reproductive_state in ['pregnant', 'lactating']:
        supplements.append('calcium_folic')  # Кальций + фолиевая кислота
    
    # Убираем дубликаты, ограничиваем 4 добавками
    return list(set(supplements))[:4]
```

### 4.3 Фильтрация продуктов

Продукт попадает в выборку, если:

```python
def is_product_suitable(product, pet):
    # 1. Базовые критерии
    if product.animal != pet.species:
        return False
    if not product.in_stock:
        return False
    
    # 2. Возрастное соответствие
    if product.min_age_months and pet.age_months < product.min_age_months:
        return False
    if product.max_age_months and pet.age_months > product.max_age_months:
        return False
    
    # 3. Размерное соответствие (для собак)
    if pet.species == 'dog' and product.size_categories:
        if pet.size_category not in product.size_categories:
            return False
    
    # 4. Аллергены — КРИТИЧНЫЙ ФИЛЬТР
    pet_allergens = get_pet_allergens(pet)  # Из PetAllergy
    product_allergens = product.allergens or []
    if set(pet_allergens) & set(product_allergens):
        return False  # Есть пересечение — исключаем
    
    # 5. Здоровье — приоритетный подбор
    # Если есть терапевтические потребности — предпочитаем лечебные корма
    if pet.has_therapeutic_needs and not product.is_therapeutic:
        # Не исключаем, но понижаем score
        pass
    
    return True
```

### 4.4 Сортировка продуктов

```python
def calculate_match_score(product, pet):
    score = 50  # Базовый
    
    # +20: Приоритетный бренд
    if product.priority >= 8:
        score += 20
    elif product.priority >= 5:
        score += 10
    
    # +15: Идеальное возрастное соответствие
    if is_age_perfect_match(product, pet):
        score += 15
    
    # +15: Идеальное размерное соответствие
    if is_size_perfect_match(product, pet):
        score += 15
    
    # +10: Лечебный корм при наличии заболеваний
    if product.is_therapeutic and pet.has_therapeutic_needs:
        score += 10
    
    # +5: Гипоаллергенный при наличии аллергий
    if product.subcategory == 'hypoallergenic' and pet.has_allergies:
        score += 5
    
    # -10: Слишком дорогой (выше среднего в 2+ раза)
    if product.price > average_price * 2:
        score -= 10
    
    return min(100, score)

# Итоговая сортировка
products.sort(key=lambda p: (
    -calculate_match_score(p, pet),  # По score (desc)
    -p.priority,                      # По приоритету бренда (desc)
    p.price                           # По цене (asc)
))
```

### 4.5 Ротация компонентов (стрелки ← →)

При нажатии стрелки:
1. Берём отсортированный список подходящих продуктов
2. Находим текущий индекс
3. Переходим к следующему/предыдущему
4. При достижении конца — переходим к началу (циклически)

```python
def get_next_product(current_product, direction, pet, component_type):
    suitable_products = get_suitable_products(pet, component_type)
    # Сортируем
    sorted_products = sort_by_match_score(suitable_products, pet)
    
    current_index = sorted_products.index(current_product)
    
    if direction == 'next':
        new_index = (current_index + 1) % len(sorted_products)
    else:  # prev
        new_index = (current_index - 1) % len(sorted_products)
    
    return sorted_products[new_index]
```

---

## 5. Расчёт рациона

### 5.1 Базовые формулы калорийности

Используем уже реализованный `CalorieCalculatorService`:

```python
# RER (Resting Energy Requirement)
RER = 70 * (weight_kg ** 0.75)

# MER (Maintenance Energy Requirement)
MER = RER * K_base * K_neuter * K_activity * K_health * K_climate * ...
```

### 5.2 Распределение калорий по компонентам

#### Мировые рекомендации (AAFCO, FEDIAF)

```python
CALORIE_DISTRIBUTION = {
    # Тип питания: {компонент: процент}
    'dry': {
        'dry_food': 0.90,      # 90% калорий
        'treats': 0.10,        # 10% калорий (MAX)
    },
    'wet': {
        'wet_food': 0.90,
        'treats': 0.10,
    },
    'multi': {
        'dry_food': 0.60,      # 60% калорий — сухой
        'wet_food': 0.30,      # 30% калорий — влажный
        'treats': 0.10,        # 10% калорий — лакомства
    },
}
```

**Примечание:** Пропорция 60/30 для мультипитания основана на рекомендациях ветеринарных диетологов. Сухой корм — основа рациона (более сбалансирован), влажный — дополнение для гидратации и вкусового разнообразия.

### 5.3 Расчёт порций

```python
def calculate_portions(pet, selected_products, feeding_type):
    """
    Рассчитать порции для каждого компонента.
    
    Args:
        pet: объект Pet
        selected_products: dict {component_type: Product}
        feeding_type: 'dry' | 'wet' | 'multi'
    
    Returns:
        dict с порциями в граммах и калориях
    """
    # 1. Получаем MER из калькулятора
    calorie_result = calorie_calculator.calculate_daily_calories(pet)
    daily_mer = calorie_result.daily_calories_kcal
    
    # 2. Получаем распределение
    distribution = CALORIE_DISTRIBUTION[feeding_type]
    
    portions = {}
    
    for component, percent in distribution.items():
        if component not in selected_products:
            continue
        
        product = selected_products[component]
        
        # Калории на этот компонент
        component_kcal = daily_mer * percent
        
        # Калорийность продукта (ккал/100г) — ОБЯЗАТЕЛЬНОЕ ПОЛЕ в БД
        # Каждый корм должен иметь реальное значение kcal_per_100g
        kcal_per_100g = product.kcal_per_100g
        
        if not kcal_per_100g:
            raise ValueError(f"Продукт {product.name} не имеет данных о калорийности")
        
        # Порция в граммах
        portion_grams = (component_kcal / kcal_per_100g) * 100
        
        portions[component] = {
            'product': product,
            'daily_kcal': round(component_kcal),
            'daily_grams': round(portion_grams, 1),
            'percent_of_diet': percent * 100,
        }
    
    return {
        'total_daily_kcal': round(daily_mer),
        'portions': portions,
    }
```

### 5.4 Автоматический пересчёт при замене компонента

```python
def recalculate_on_component_change(current_plan, changed_component, new_product, pet):
    """
    Пересчитать план при замене компонента.
    
    Логика:
    - При замене на более калорийный продукт → уменьшаем порцию
    - Остальные компоненты корректируются пропорционально
    """
    new_plan = current_plan.copy()
    
    # Обновляем выбранный компонент
    new_plan['selected_products'][changed_component] = new_product
    
    # Пересчитываем все порции
    recalculated = calculate_portions(
        pet,
        new_plan['selected_products'],
        new_plan['feeding_type']
    )
    
    return recalculated
```

### 5.5 Расчёт для активных дней

```python
def calculate_active_day_portions(pet, base_portions):
    """
    Порции для активного дня.
    
    Коэффициенты из CalorieCalculatorService:
    - walk_1h: +10% ккал
    - walk_2h: +20% ккал
    - training: +25% ккал
    - competition: +40% ккал
    """
    # Получаем активности из PetID
    activities = get_pet_scheduled_activities(pet)
    
    if not activities:
        return None  # Нет активностей — не показываем активный день
    
    # Суммируем дополнительные калории
    extra_kcal_percent = 0
    for activity in activities:
        extra_kcal_percent += ACTIVITY_CALORIES[activity.type]
    
    # Увеличиваем порции
    active_portions = {}
    for component, data in base_portions['portions'].items():
        active_portions[component] = {
            **data,
            'daily_kcal': round(data['daily_kcal'] * (1 + extra_kcal_percent / 100)),
            'daily_grams': round(data['daily_grams'] * (1 + extra_kcal_percent / 100), 1),
        }
    
    return {
        'extra_percent': extra_kcal_percent,
        'activities': [a.name for a in activities],
        'portions': active_portions,
    }
```

---

## 6. Совместимость кормов

### 6.1 Принцип: ТОЛЬКО совместимые корма в подборке

**ВАЖНО:** В финальной подборке НЕ должно быть конфликтующих кормов. 
Пользователь выбирает ТОЛЬКО из совместимых вариантов.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ПРИНЦИП СОВМЕСТИМОСТИ                                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. Пользователь выбирает СУХОЙ корм (например, Royal Canin Renal)             │
│                                                                                 │
│  2. Система определяет группу совместимости: therapeutic_renal                  │
│                                                                                 │
│  3. Для ВЛАЖНОГО корма показываем ТОЛЬКО совместимые:                          │
│     ✓ Royal Canin Renal Wet                                                    │
│     ✓ Hill's k/d Kidney Care Wet                                               │
│     ✗ Обычные корма — НЕ показываем                                            │
│     ✗ Diabetic корма — НЕ показываем                                           │
│                                                                                 │
│  4. Пользователь НЕ МОЖЕТ выбрать несовместимый корм — его просто нет в списке│
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Группы совместимости

```python
COMPATIBILITY_GROUPS = {
    # Обычные корма — совместимы между собой
    'regular': ['dry', 'wet', 'canned', 'pouch', 'pate', 'holistic', 'premium', 'super_premium'],
    
    # Гипоаллергенные — совместимы с обычными и между собой
    'hypoallergenic': ['hypoallergenic', 'limited_ingredient', 'single_protein'],
    
    # Терапевтические — ТОЛЬКО с такой же терапевтической группой
    'therapeutic_renal': ['renal', 'kidney_care'],
    'therapeutic_diabetic': ['diabetic', 'weight_diabetic'],
    'therapeutic_digestive': ['gastro', 'sensitive', 'digestive_care'],
    'therapeutic_weight': ['diet', 'light', 'satiety', 'metabolic'],
    'therapeutic_urinary': ['urinary', 'struvite', 'oxalate'],
    'therapeutic_hepatic': ['hepatic', 'liver_care'],
    'therapeutic_cardiac': ['cardiac', 'heart_care'],
}

# Матрица совместимости
COMPATIBILITY_MATRIX = {
    'regular': ['regular', 'hypoallergenic'],
    'hypoallergenic': ['regular', 'hypoallergenic'],
    
    # Терапевтические — только сами с собой
    'therapeutic_renal': ['therapeutic_renal'],
    'therapeutic_diabetic': ['therapeutic_diabetic'],
    'therapeutic_digestive': ['therapeutic_digestive'],
    'therapeutic_weight': ['therapeutic_weight'],
    'therapeutic_urinary': ['therapeutic_urinary'],
    'therapeutic_hepatic': ['therapeutic_hepatic'],
    'therapeutic_cardiac': ['therapeutic_cardiac'],
}
```

### 6.3 Фильтрация альтернатив по совместимости

```python
def get_compatible_alternatives(pet, component_type, current_plan):
    """
    Получить список альтернатив, совместимых с текущим планом.
    
    Пользователь видит ТОЛЬКО эти варианты при свайпе/листании.
    """
    # Определяем группу совместимости текущего плана
    plan_compatibility_group = get_plan_compatibility_group(current_plan)
    
    # Базовая фильтрация (вид, возраст, размер, аллергены)
    base_products = get_suitable_products(pet, component_type)
    
    # Фильтруем по совместимости
    compatible_products = []
    allowed_groups = COMPATIBILITY_MATRIX.get(plan_compatibility_group, ['regular'])
    
    for product in base_products:
        product_group = get_compatibility_group(product)
        if product_group in allowed_groups:
            compatible_products.append(product)
    
    return compatible_products

def get_plan_compatibility_group(plan):
    """
    Определить группу совместимости всего плана.
    Берётся по первому терапевтическому корму или 'regular'.
    """
    for component in plan.get('components', []):
        product = component.get('product')
        if product:
            group = get_compatibility_group(product)
            if group.startswith('therapeutic_'):
                return group
    return 'regular'
```

### 6.4 Результат: нет конфликтов в UI

При таком подходе:
- Пользователь **не может** случайно выбрать несовместимые корма
- Список альтернатив **динамически обновляется** при смене основного корма
- Если выбран терапевтический сухой корм → влажный будет из той же терапевтической линейки

---

## 7. План питания

### 7.1 Структура плана

```python
@dataclass
class FeedingPlan:
    pet_id: str
    pet_name: str
    breed: str
    weight_kg: float
    age_months: int
    
    period_days: int
    feeding_type: str  # 'dry' | 'wet' | 'multi'
    plan_type: str  # 'basic' | 'advanced'
    
    daily_calories: int
    
    components: List[PlanComponent]
    supplements: List[PlanSupplement]  # Для advanced
    
    regular_day_schedule: DaySchedule
    active_day_schedule: Optional[DaySchedule]
    active_days: List[str]  # ['monday', 'wednesday', 'friday']
    
    total_price: Decimal
    savings_info: Optional[SavingsInfo]
    
    created_at: datetime
    expires_at: datetime  # Когда закончится корм

@dataclass
class PlanComponent:
    product: Product
    component_type: str  # 'dry_food', 'wet_food', 'treats'
    daily_portion_grams: float
    daily_calories: int
    package_size: str  # '4 кг'
    quantity: int  # Сколько упаковок на период
    price_total: Decimal
    days_supply: int  # На сколько дней хватит
```

### 7.2 Расчёт количества упаковок

```python
def calculate_packages(product, daily_grams, period_days, buffer_percent=15):
    """
    Рассчитать количество упаковок на период.
    
    Args:
        product: Product
        daily_grams: дневная порция в граммах
        period_days: количество дней
        buffer_percent: запас (15%)
    
    Returns:
        dict с количеством и информацией
    """
    # Общее количество с запасом
    total_grams_needed = daily_grams * period_days * (1 + buffer_percent / 100)
    
    # Вес упаковки в граммах
    package_weight_g = float(product.weight) * 1000 if product.weight else None
    
    if not package_weight_g:
        # Для паучей/консервов — считаем штуками
        return calculate_unit_packages(product, daily_grams, period_days, buffer_percent)
    
    # Сколько упаковок нужно
    packages_needed = math.ceil(total_grams_needed / package_weight_g)
    
    # Проверяем — не слишком ли много мелких упаковок
    if packages_needed > 5:
        # Ищем бОльшую упаковку того же продукта
        larger_package = find_larger_package(product)
        if larger_package:
            return calculate_packages(larger_package, daily_grams, period_days, buffer_percent)
    
    # На сколько дней реально хватит
    actual_supply_days = (packages_needed * package_weight_g) / daily_grams
    
    return {
        'product': product,
        'quantity': packages_needed,
        'package_size': f"{product.weight} кг",
        'total_grams': packages_needed * package_weight_g,
        'days_supply': round(actual_supply_days),
        'buffer_days': round(actual_supply_days - period_days),
        'price_per_unit': product.discounted_price,
        'price_total': product.discounted_price * packages_needed,
    }
```

### 7.3 Показ экономии

```python
def calculate_savings_info(current_plan, pet):
    """
    Рассчитать потенциальную экономию при увеличении периода.
    """
    current_period = current_plan['period_days']
    current_price = current_plan['total_price']
    
    # Проверяем план на 30 дней (если текущий < 30)
    if current_period < 30:
        plan_30 = recalculate_for_period(current_plan, 30)
        price_per_day_current = current_price / current_period
        price_per_day_30 = plan_30['total_price'] / 30
        
        if price_per_day_30 < price_per_day_current:
            savings_percent = round((1 - price_per_day_30 / price_per_day_current) * 100)
            return {
                'suggested_period': 30,
                'savings_percent': savings_percent,
                'message': f'План на 30 дней выгоднее на {savings_percent}%!',
            }
    
    # Проверяем план на 60 дней
    if current_period < 60:
        plan_60 = recalculate_for_period(current_plan, 60)
        # ... аналогичный расчёт
    
    return None
```

### 7.4 PDF-экспорт

Содержимое PDF:

```
═══════════════════════════════════════════════════════
        ПЛАН ПИТАНИЯ ДЛЯ [ИМЯ ПИТОМЦА]
═══════════════════════════════════════════════════════

Питомец: Барон
Порода: Лабрадор ретривер
Возраст: 3 года
Вес: 28 кг

Период: 01.02.2026 — 02.03.2026 (30 дней)
Тип питания: Мультипитание (сухой + влажный)
Дневная норма: 1 250 ккал

═══════════════════════════════════════════════════════
                   СОСТАВ РАЦИОНА
═══════════════════════════════════════════════════════

1. Сухой корм
   Brand X Premium Adult Large Breed
   Упаковка: 4 кг × 2 шт = 8 кг
   Порция: 180 г/день (750 ккал)
   Цена: 2 850 ₽ × 2 = 5 700 ₽

2. Влажный корм
   Brand Y Adult Dog Chicken
   Упаковка: 85 г × 30 шт
   Порция: 1 пауч/день (85 ккал)
   Цена: 80 ₽ × 30 = 2 400 ₽

3. Лакомства
   Brand Z Training Treats
   Упаковка: 200 г × 1 шт
   Порция: до 30 г/день (MAX 10% рациона)
   Цена: 350 ₽

4. Добавка: Глюкозамин для суставов
   Joint Support Plus
   Упаковка: 60 табл
   Порция: 2 табл/день
   Цена: 800 ₽

═══════════════════════════════════════════════════════
                  РАСПИСАНИЕ КОРМЛЕНИЯ
═══════════════════════════════════════════════════════

ОБЫЧНЫЙ ДЕНЬ
────────────────────────────────────────────────────────
Утро (08:00):
  • Сухой корм — 180 г
  • Добавка — 1 табл

Вечер (18:00):
  • Влажный корм — 1 пауч (85 г)
  • Добавка — 1 табл

Лакомства: до 3 шт в течение дня (для тренировки)

АКТИВНЫЙ ДЕНЬ (Пн, Ср, Пт) — +15% калорий
────────────────────────────────────────────────────────
Утро (08:00):
  • Сухой корм — 207 г (+27 г)
  • Добавка — 1 табл

Вечер (18:00):
  • Влажный корм — 1.5 пауча (128 г)
  • Добавка — 1 табл

═══════════════════════════════════════════════════════
                      ИТОГО
═══════════════════════════════════════════════════════

Стоимость на 30 дней: 9 250 ₽
Стоимость в день: ~308 ₽

Хватит примерно на: 33 дня (±3 дня)
Следующий заказ: ~28 февраля 2026

═══════════════════════════════════════════════════════
                     ВАЖНО
═══════════════════════════════════════════════════════

⚠️ Всегда должна быть свежая вода в доступе!

⚠️ При смене корма — постепенный переход 7-10 дней:
   Дни 1-3: 75% старого + 25% нового
   Дни 4-6: 50% + 50%
   Дни 7-9: 25% + 75%
   День 10+: 100% нового

═══════════════════════════════════════════════════════

[QR-код для повторного заказа]

Создано: 01.02.2026 на pet-care-platform.ru
```

---

## 8. Интеграция с корзиной

### 8.1 Добавление в корзину

При нажатии "Добавить в корзину":

1. **Показать модальное окно подтверждения:**

```
┌─────────────────────────────────────────────────────┐
│  В корзину будут добавлены:                         │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [Фото] Brand X Premium 4кг × 2              │   │
│  │         2 850 ₽ × 2 = 5 700 ₽               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [Фото] Brand Y Pouches × 30                 │   │
│  │         80 ₽ × 30 = 2 400 ₽                 │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [Фото] Brand Z Treats 200г × 1              │   │
│  │         350 ₽                               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [Фото] Joint Support 60табл × 1             │   │
│  │         800 ₽                               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  ИТОГО: 9 250 ₽                                    │
│  Хватит на ~33 дня                                 │
│                                                     │
│  [Отмена]              [✓ Добавить в корзину]      │
└─────────────────────────────────────────────────────┘
```

2. **При подтверждении:**
   - Добавить все товары в корзину с указанным количеством
   - Сохранить план в профиль питомца
   - Показать уведомление "Товары добавлены в корзину"
   - Предложить "Перейти в корзину" или "Продолжить"

### 8.2 API добавления

```python
# POST /api/pets/{pet_id}/feeding-plan/add-to-cart/
{
    "plan_id": "uuid",
    "items": [
        {"product_id": 123, "quantity": 2},
        {"product_id": 456, "quantity": 30},
        {"product_id": 789, "quantity": 1},
        {"product_id": 101, "quantity": 1}
    ],
    "save_as_current": true  # Сохранить как текущий рацион
}
```

---

## 9. История питания

### 9.1 Структура хранения

```python
class PetFeedingHistory(models.Model):
    """История планов питания питомца."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    pet = models.ForeignKey('Pet', on_delete=models.CASCADE, related_name='feeding_history')
    
    # Данные плана
    plan_type = models.CharField(max_length=20)  # 'basic' | 'advanced'
    feeding_type = models.CharField(max_length=20)  # 'dry' | 'wet' | 'multi'
    period_days = models.IntegerField()
    daily_calories = models.IntegerField()
    
    # Компоненты (снимок на момент создания)
    components = models.JSONField()  # [{product_id, name, portion_g, price}, ...]
    supplements = models.JSONField(default=list)
    
    # Цены
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Период действия
    started_at = models.DateField()
    expected_end_at = models.DateField()
    
    # Оценка (заполняется после окончания периода)
    rating = models.IntegerField(null=True)  # 1-3 (плохо, нормально, отлично)
    rating_comment = models.TextField(blank=True)
    
    # Мета
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        # Хранить только за последний год
        # Реализуется через periodic cleanup task
```

### 9.2 Использование истории

```python
def get_personalized_recommendations(pet):
    """
    Использовать историю для улучшения рекомендаций.
    """
    history = PetFeedingHistory.objects.filter(
        pet=pet,
        created_at__gte=timezone.now() - timedelta(days=365)
    )
    
    insights = {
        'previously_tried': [],
        'low_rated': [],
        'high_rated': [],
        'avg_period': None,
        'preferred_type': None,
    }
    
    for plan in history:
        for component in plan.components:
            if plan.rating == 1:  # Плохая оценка
                insights['low_rated'].append(component['product_id'])
            elif plan.rating == 3:  # Отличная оценка
                insights['high_rated'].append(component['product_id'])
            
            insights['previously_tried'].append(component['product_id'])
    
    return insights

# При формировании выборки:
def filter_by_history(products, insights):
    # Понижаем приоритет кормов с плохой оценкой
    for product in products:
        if product.id in insights['low_rated']:
            product._match_score -= 20
        elif product.id in insights['high_rated']:
            product._match_score += 10
    
    return products
```

### 9.3 Напоминание об оценке

Через систему уведомлений:

```python
# Через N дней после expected_end_at
def create_rating_reminder(plan):
    Notification.objects.create(
        user=plan.pet.owner,
        type='feeding_plan_rating',
        title='Как прошёл план питания?',
        message=f'Оцените рацион для {plan.pet.name}',
        data={
            'plan_id': str(plan.id),
            'pet_id': str(plan.pet.id),
        },
        scheduled_at=plan.expected_end_at + timedelta(days=1)
    )
```

---

## 10. Модель данных

### 10.1 Расширение модели Product

```python
class Product(models.Model):
    # ... существующие поля ...
    
    # === НОВЫЕ ПОЛЯ ДЛЯ ПОДБОРА КОРМА ===
    
    # Приоритет бренда (0-10, где 10 — максимальный приоритет)
    priority = models.PositiveSmallIntegerField(
        default=0,
        validators=[MaxValueValidator(10)],
        help_text="Приоритет бренда для рекомендаций (0-10)"
    )
    
    # Калорийность (ккал на 100г) — ОБЯЗАТЕЛЬНОЕ ПОЛЕ
    # Должно быть заполнено для КАЖДОГО корма реальными данными
    kcal_per_100g = models.DecimalField(
        max_digits=6, 
        decimal_places=1,
        null=False,  # Обязательное!
        help_text="Калорийность (ккал/100г) — обязательное поле для расчёта порций"
    )
    
    # Возрастные ограничения (в месяцах)
    min_age_months = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Минимальный возраст (месяцев)"
    )
    max_age_months = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Максимальный возраст (месяцев). NULL = без ограничений"
    )
    
    # Размерные категории (для собак)
    size_categories = models.JSONField(
        default=list,
        blank=True,
        help_text="Подходящие размеры: ['toy', 'small', 'medium', 'large', 'giant']"
    )
    
    # Аллергены в составе
    allergens = models.JSONField(
        default=list,
        blank=True,
        help_text="Аллергены: ['chicken', 'beef', 'wheat', 'corn', ...]"
    )
    
    # Терапевтический/лечебный корм
    is_therapeutic = models.BooleanField(
        default=False,
        help_text="Лечебный/диетический корм по назначению ветеринара"
    )
    
    # Для каких состояний здоровья подходит
    health_conditions = models.JSONField(
        default=list,
        blank=True,
        help_text="Подходит для: ['obesity', 'diabetes', 'kidney_disease', ...]"
    )
    
    # Состав (для автоматического расчёта)
    nutrition_facts = models.JSONField(
        default=dict,
        blank=True,
        help_text="""{
            "protein_percent": 26,
            "fat_percent": 15,
            "fiber_percent": 3,
            "moisture_percent": 10,
            "ash_percent": 7
        }"""
    )
    
    # Ингредиенты (первые 5 в порядке убывания)
    main_ingredients = models.JSONField(
        default=list,
        blank=True,
        help_text="Основные ингредиенты: ['chicken', 'rice', 'corn', ...]"
    )
    
    class Meta:
        indexes = [
            # ... существующие индексы ...
            models.Index(fields=['priority', 'animal', 'category']),
            models.Index(fields=['is_therapeutic', 'animal']),
        ]
```

### 10.2 Автоматическое вычисление полей

```python
def calculate_kcal_from_nutrition(nutrition_facts):
    """
    Рассчитать калорийность по формуле Modified Atwater.
    
    ME (ккал/100г) = (3.5 × protein) + (8.5 × fat) + (3.5 × NFE)
    NFE = 100 - protein - fat - fiber - moisture - ash
    """
    protein = nutrition_facts.get('protein_percent', 0)
    fat = nutrition_facts.get('fat_percent', 0)
    fiber = nutrition_facts.get('fiber_percent', 0)
    moisture = nutrition_facts.get('moisture_percent', 0)
    ash = nutrition_facts.get('ash_percent', 0)
    
    nfe = 100 - protein - fat - fiber - moisture - ash
    
    kcal = (3.5 * protein) + (8.5 * fat) + (3.5 * nfe)
    
    return round(kcal, 1)

def detect_allergens_from_ingredients(main_ingredients):
    """
    Автоматически определить аллергены из списка ингредиентов.
    """
    INGREDIENT_ALLERGEN_MAP = {
        'chicken': 'chicken',
        'курица': 'chicken',
        'beef': 'beef',
        'говядина': 'beef',
        'wheat': 'wheat',
        'пшеница': 'wheat',
        'corn': 'corn',
        'кукуруза': 'corn',
        'soy': 'soy',
        'соя': 'soy',
        'fish': 'fish',
        'рыба': 'fish',
        'egg': 'eggs',
        'яйцо': 'eggs',
        'milk': 'dairy',
        'молоко': 'dairy',
    }
    
    allergens = set()
    for ingredient in main_ingredients:
        ingredient_lower = ingredient.lower()
        for key, allergen in INGREDIENT_ALLERGEN_MAP.items():
            if key in ingredient_lower:
                allergens.add(allergen)
    
    return list(allergens)
```

### 10.3 Модель плана питания

```python
class PetCurrentDiet(models.Model):
    """Текущий рацион питомца."""
    
    pet = models.OneToOneField(
        'Pet', 
        on_delete=models.CASCADE, 
        related_name='current_diet'
    )
    
    plan_type = models.CharField(max_length=20)  # 'basic' | 'advanced'
    feeding_type = models.CharField(max_length=20)  # 'dry' | 'wet' | 'multi'
    
    # Связь с продуктами
    dry_food = models.ForeignKey(
        'shop.Product', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='+'
    )
    dry_food_daily_grams = models.DecimalField(
        max_digits=6, decimal_places=1, null=True
    )
    
    wet_food = models.ForeignKey(
        'shop.Product', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='+'
    )
    wet_food_daily_grams = models.DecimalField(
        max_digits=6, decimal_places=1, null=True
    )
    
    treats = models.ForeignKey(
        'shop.Product', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='+'
    )
    treats_daily_grams = models.DecimalField(
        max_digits=6, decimal_places=1, null=True
    )
    
    # Добавки (M2M через промежуточную таблицу)
    supplements = models.ManyToManyField(
        'shop.Product',
        through='PetDietSupplement',
        related_name='pet_diets'
    )
    
    daily_calories = models.IntegerField()
    
    started_at = models.DateField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class PetDietSupplement(models.Model):
    """Добавки в рационе."""
    
    diet = models.ForeignKey(PetCurrentDiet, on_delete=models.CASCADE)
    product = models.ForeignKey('shop.Product', on_delete=models.CASCADE)
    daily_amount = models.CharField(max_length=50)  # "2 табл", "5 мл"
    
    class Meta:
        unique_together = ['diet', 'product']
```

---

## 11. API Endpoints

### 11.1 Получение рекомендаций

```
GET /api/pets/{pet_id}/food-recommendations/

Query params:
  - feeding_type: 'dry' | 'wet' | 'multi' (default: из PetID или 'multi')
  - plan_type: 'basic' | 'advanced' (default: 'basic')
  - period_days: int (default: 14)

Response:
{
  "pet": {
    "id": "uuid",
    "name": "Барон",
    "species": "dog",
    "breed": "Лабрадор",
    "weight_kg": 28,
    "age_months": 36,
    "size_category": "large",
    "allergies": ["chicken"],
    "health_conditions": ["joint_problems"]
  },
  
  "plan": {
    "feeding_type": "multi",
    "plan_type": "advanced",
    "period_days": 30,
    "daily_calories": 1250,
    
    "components": [
      {
        "type": "dry_food",
        "product": { /* Product object */ },
        "match_score": 95,
        "badges": ["recommended", "ideal_match"],
        "daily_portion_grams": 180,
        "daily_calories": 750,
        "package": {
          "size": "4 кг",
          "quantity": 2,
          "days_supply": 35,
          "price_total": 5700
        },
        "alternatives_count": 23
      },
      // ... wet_food, treats, supplements
    ],
    
    "regular_day": {
      "schedule": [
        {"time": "08:00", "items": [{"component": "dry_food", "portion": "180г"}]},
        {"time": "18:00", "items": [{"component": "wet_food", "portion": "1 пауч"}]}
      ]
    },
    
    "active_day": {
      "extra_percent": 15,
      "activities": ["Прогулка 2ч", "Тренировка"],
      "schedule": [/* ... */]
    },
    "active_days": ["monday", "wednesday", "friday"],
    
    "total_price": 9250,
    "price_per_day": 308,
    
    "savings": {
      "suggested_period": 60,
      "savings_percent": 18,
      "message": "План на 60 дней выгоднее на 18%!"
    }
  },
  
  "warnings": [
    {
      "type": "diet_change",
      "message": "Вы переходите с сухого корма на мультипитание...",
      "recommendation": "Постепенный переход 7-10 дней"
    }
  ]
}
```

### 11.2 Получение альтернатив для компонента

```
GET /api/pets/{pet_id}/food-recommendations/alternatives/

Query params:
  - component_type: 'dry_food' | 'wet_food' | 'treats' | 'supplement'
  - current_product_id: int (опционально, для определения позиции)
  - limit: int (default: 50)
  - offset: int (default: 0)

Response:
{
  "component_type": "dry_food",
  "total": 23,
  "current_index": 0,
  
  "products": [
    {
      "product": { /* Product object */ },
      "match_score": 95,
      "badges": ["recommended", "ideal_match"],
      "daily_portion_grams": 180,
      "is_compatible_with_current_plan": true
    },
    // ...
  ]
}
```

### 11.3 Пересчёт плана при замене

```
POST /api/pets/{pet_id}/food-recommendations/recalculate/

Body:
{
  "current_plan": { /* текущий план */ },
  "changed_component": "dry_food",
  "new_product_id": 456
}

Response:
{
  "plan": { /* обновлённый план */ },
  "changes": [
    {
      "component": "wet_food",
      "reason": "incompatibility",
      "old_product_id": 123,
      "new_product_id": 789,
      "message": "Влажный корм заменён на совместимый"
    }
  ]
}
```

### 11.4 Сохранение и добавление в корзину

```
POST /api/pets/{pet_id}/food-recommendations/save-and-add-to-cart/

Body:
{
  "plan": { /* план */ },
  "save_as_current_diet": true
}

Response:
{
  "success": true,
  "cart_items_added": 4,
  "cart_total": 9250,
  "diet_saved": true,
  "history_id": "uuid"
}
```

### 11.5 Экспорт PDF

```
GET /api/pets/{pet_id}/food-recommendations/export-pdf/

Query params:
  - plan_id: uuid (из сохранённой истории)
  - или plan: base64-encoded JSON (для несохранённого плана)

Response:
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="feeding-plan-baron-2026-02.pdf"
```

---

## 12. Специальные случаи

### 12.1 Беременность и лактация

```python
def handle_reproductive_state(pet, plan):
    """Обработка репродуктивного состояния."""
    
    if pet.reproductive_state not in ['pregnant', 'lactating']:
        return plan
    
    # Обязательные добавки
    required_supplements = ['calcium_folic']  # Кальций + фолиевая кислота
    
    if pet.reproductive_state == 'lactating':
        required_supplements.append('vitamin_complex')
    
    # Добавляем в план (даже для базового)
    for supplement_code in required_supplements:
        supplement_product = find_best_supplement(pet, supplement_code)
        if supplement_product:
            plan['supplements'].append({
                'product': supplement_product,
                'reason': 'reproductive_health',
                'required': True,  # Нельзя убрать
            })
    
    # Калорийность уже учтена в CalorieCalculatorService
    # (reproductive_state влияет на K_repro коэффициент)
    
    return plan
```

### 12.2 Множественные ограничения по здоровью

```python
# Приоритетность заболеваний для подбора корма
HEALTH_PRIORITY = {
    'kidney_disease': 100,  # Высший приоритет — почечная диета критична
    'diabetes': 90,
    'liver_disease': 85,
    'pancreatitis': 80,
    'food_allergies': 75,
    'ibd': 70,
    'obesity': 60,
    'urinary': 50,
    'joint_problems': 40,
    'skin_problems': 30,
    'dental_problems': 20,
}

def handle_multiple_health_conditions(pet):
    """
    Определить приоритетное состояние для подбора корма.
    """
    conditions = pet.health_conditions.all()
    
    if not conditions:
        return None
    
    # Сортируем по приоритету
    sorted_conditions = sorted(
        conditions,
        key=lambda c: HEALTH_PRIORITY.get(c.code, 0),
        reverse=True
    )
    
    primary_condition = sorted_conditions[0]
    secondary_conditions = sorted_conditions[1:]
    
    return {
        'primary': primary_condition,
        'secondary': secondary_conditions,
        'filter_strategy': 'primary_required',  # Корм ДОЛЖЕН подходить для primary
    }

def filter_products_by_health(products, health_info):
    """
    Фильтрация с учётом множественных ограничений.
    """
    primary = health_info['primary']
    
    # Сначала — только корма для primary condition
    primary_suitable = [
        p for p in products 
        if primary.code in (p.health_conditions or [])
    ]
    
    if not primary_suitable:
        # Нет подходящих — показываем предупреждение
        return {
            'products': [],
            'warning': f'Нет кормов для {primary.name}. Рекомендуем консультацию ветеринара.',
            'fallback_products': products[:5]  # Показать ближайшие альтернативы
        }
    
    return {
        'products': primary_suitable,
        'warning': None,
    }
```

### 12.3 Ранний возраст (до 2 месяцев)

```python
def handle_early_age(pet, plan):
    """Обработка раннего возраста."""
    
    if pet.age_months >= 2:
        return plan
    
    # Добавляем рекомендацию
    plan['warnings'].append({
        'type': 'early_age',
        'severity': 'info',
        'message': 'В возрасте до 2 месяцев рекомендуется грудное молоко матери или специальный заменитель молока.',
        'recommendation': 'Переход на твёрдую пищу — постепенно с 3-4 недель.'
    })
    
    # Фильтруем только корма для раннего возраста
    plan['filter_override'] = {
        'max_age_months': 2,
        'subcategories': ['starter', 'first_age', 'milk_replacer'],
    }
    
    return plan
```

### 12.4 Предупреждение о смене корма

```python
def check_diet_change_warning(pet, new_plan):
    """Проверить необходимость предупреждения о смене корма."""
    
    current_diet = getattr(pet, 'current_diet', None)
    
    if not current_diet:
        return None  # Нет текущего рациона — нет предупреждения
    
    warnings = []
    
    # 1. Смена типа питания
    if current_diet.feeding_type != new_plan['feeding_type']:
        warnings.append({
            'type': 'feeding_type_change',
            'from': current_diet.feeding_type,
            'to': new_plan['feeding_type'],
            'message': f'Смена типа питания: {FEEDING_TYPE_LABELS[current_diet.feeding_type]} → {FEEDING_TYPE_LABELS[new_plan["feeding_type"]]}',
        })
    
    # 2. Смена категории (обычный → терапевтический)
    current_therapeutic = any(
        p.is_therapeutic 
        for p in [current_diet.dry_food, current_diet.wet_food] 
        if p
    )
    new_therapeutic = any(
        c['product'].is_therapeutic 
        for c in new_plan['components']
    )
    
    if current_therapeutic != new_therapeutic:
        warnings.append({
            'type': 'therapeutic_change',
            'message': 'Переход на/с лечебного корма. Рекомендуем консультацию ветеринара.',
        })
    
    # 3. Смена бренда основного корма
    # ...
    
    if warnings:
        return {
            'has_warnings': True,
            'warnings': warnings,
            'recommendation': {
                'title': 'Постепенный переход (7-10 дней)',
                'steps': [
                    'Дни 1-3: 75% старого корма + 25% нового',
                    'Дни 4-6: 50% + 50%',
                    'Дни 7-9: 25% + 75%',
                    'День 10+: 100% нового корма',
                ]
            }
        }
    
    return None
```

---

## Следующие шаги

1. **Создать миграцию** для новых полей в Product
2. **Заполнить данные** (kcal_per_100g, allergens, health_conditions) для существующих кормов
3. **Реализовать FoodRecommendationPageService** — основную логику
4. **Создать React-компоненты** страницы
5. **Добавить API endpoints**
6. **Интегрировать с корзиной**
7. **Реализовать PDF-экспорт**
8. **Добавить уведомления** (оценка плана, напоминание о заказе)

---

*Документ создан: 18.01.2026*
*Версия: 1.0*
