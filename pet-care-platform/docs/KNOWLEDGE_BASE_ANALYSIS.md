# Анализ базы знаний пород и персонализация сервисов

**Дата:** 12 января 2026  
**Статус:** Аналитика и рекомендации  
**Версия:** 1.0

---

## Содержание
1. [Текущее состояние базы знаний](#текущее-состояние-базы-знаний)
2. [Проблемы и дублирования](#проблемы-и-дублирования)
3. [Поля для каждого сервиса](#поля-для-каждого-сервиса)
4. [Логика подбора корма](#логика-подбора-корма)
5. [Структура данных товаров](#структура-данных-товаров)
6. [Рекомендации по оптимизации](#рекомендации-по-оптимизации)

---

## 1. Текущее состояние базы знаний

### 1.1. Структура файлов

База знаний состоит из 10 основных JSON файлов:

| Файл | Размер | Записей | Описание |
|------|--------|---------|----------|
| `breeds.json` | ~11k строк | ~250 пород | Основная информация о породах |
| `breed_health.json` | ~28k строк | ~1500 записей | Проблемы здоровья |
| `breed_care.json` | ~15k строк | ~800 записей | Уход и груминг |
| `breed_nutrition.json` | ~12k строк | ~600 записей | Питание и аллергии |
| `breed_behavior.json` | ~50k строк | ~2500 записей | Поведение и характер |
| `breed_medical.json` | ~35k строк | ~1800 записей | Вакцинации и лекарства |
| `breed_activities.json` | ~600 строк | ~30 записей | Рекомендуемые активности |
| `breed_costs.json` | ~7k строк | ~350 записей | Расходы на содержание |
| `breed_standards.json` | ~20k строк | ~1000 записей | Стандарты организаций |
| `breed_media.json` | ~19k строк | ~1000 записей | Медиа-контент |

**Общий объем:** ~180k строк, ~10 MB данных

### 1.2. Структура таблицы breeds (основная)

**Ключевые поля для персонализации:**

```json
{
  "id": 1,
  "species": "cat",
  "name": "Британская Короткошерстная",
  "slug": "british-shorthair",
  
  // РАЗМЕРЫ (критично для магазина)
  "size_category": "medium",
  "weight_min": 4.0,
  "weight_max": 8.0,
  "lifespan_min": 12,
  "lifespan_max": 17,
  
  // ПОВЕДЕНИЕ (критично для курсов)
  "energy_level": "medium",
  "affection_level": "high",
  "friendliness_to_children": "high",
  "playfulness": "medium",
  "trainability": "high",
  "intelligence": "high",
  
  // УХОД (критично для дневника здоровья)
  "shedding_level": "medium",
  "grooming_frequency": "weekly",
  "coat_type": "short",
  
  // ЗДОРОВЬЕ (критично для PetID)
  "health_risk_level": "medium",
  "hypoallergenic": false,
  "brachycephalic": false,
  "vocalization_level": "low"
}
```

---

## 2. Проблемы и дублирования

### 2.1. Критические проблемы

#### ❌ Проблема 1: Избыточное дублирование общих данных

**Пример:** В `breed_care.json` для каждой породы повторяется "Чистка зубов", "Подстрижка когтей", "Чистка лотка" с одинаковыми инструкциями.

```json
// breed_care.json - дублируется для КАЖДОЙ породы
{
  "breed_id": 1,
  "care_item": "Чистка зубов",
  "frequency": "3 раза в неделю",
  "instructions": "Приучать котенка к чистке зубов постепенно"
}
// То же самое для breed_id: 2, 3, 4, 5... 250 пород
```

**Количество дублирований:** ~80% записей в `breed_care.json` - это общие процедуры.

**Решение:** Разделить на:
- `common_care_procedures.json` - общие процедуры для всех кошек/собак
- `breed_specific_care.json` - только уникальные процедуры для конкретных пород (длинношерстные, брахицефалы и т.д.)

#### ❌ Проблема 2: Некорректная классификация данных

**Пример:** В `breed_health.json` паразиты классифицированы как "genetic":

```json
{
  "condition_name": "Паразиты",
  "condition_type": "genetic",  // ❌ НЕВЕРНО!
  "is_genetic": true,            // ❌ НЕВЕРНО!
  "description": "Блохи, клещи, глисты"
}
```

**Проблемы:**
- Паразиты - это НЕ генетическое заболевание
- Это общая проблема для ВСЕХ пород
- Не должно быть в базе знаний пород

**Решение:** Удалить общие проблемы здоровья, оставить только породоспецифичные (дисплазия, атрофия сетчатки, гипертрофическая кардиомиопатия и т.д.)

#### ❌ Проблема 3: Шаблонные описания

**Пример:** В `breed_health.json` одинаковые шаблонные описания:

```json
{
  "condition_name": "Дисплазия тазобедренных суставов",
  "symptoms": "Симптомы дисплазия тазобедренных суставов включают различные проявления в зависимости от стадии",
  "prevention": "Регулярные ветеринарные осмотры, правильное питание, генетическое тестирование для дисплазия тазобедренных суставов",
  "treatment": "Лечение дисплазия тазобедренных суставов зависит от тяжести и может включать медикаменты, хирургию или поддерживающую терапию"
}
```

**Проблема:** Описания бесполезны, просто повторяют название болезни.

**Решение:** Либо заполнить реальными симптомами и методами лечения, либо удалить эти поля.

#### ❌ Проблема 4: Избыточная детализация в `breed_medical.json`

**Пример:** Каждая порода содержит одинаковые вакцины:

```json
// Для КАЖДОЙ породы собак дублируется:
{
  "vaccine_name": "Комплексная вакцина DHPP",
  "disease_protected": "Чума, гепатит, парвовирус, парагрипп",
  "mandatory_level": "core",
  "first_dose_age": "6-8 недель",
  "booster_schedule": "ежегодно"
}
```

**Количество дублирований:** ~95% записей в `breed_medical.json` - одинаковые для всех пород.

**Решение:** 
- Создать `common_vaccinations.json` для собак и кошек
- В `breed_specific_medical.json` оставить только специфичные для пород рекомендации

### 2.2. Анализ дублирований по файлам

| Файл | Уникальных данных | Дублирований | Рекомендация |
|------|-------------------|--------------|--------------|
| `breed_care.json` | 20% | 80% | Разделить на общие и специфичные |
| `breed_medical.json` | 5% | 95% | Вынести общие вакцины в отдельный справочник |
| `breed_health.json` | 60% | 40% | Удалить общие болезни (паразиты, ожирение) |
| `breed_nutrition.json` | 30% | 70% | Оставить только породоспецифичные рекомендации |
| `breed_behavior.json` | 70% | 30% | В целом OK, но можно оптимизировать |
| `breed_activities.json` | 90% | 10% | Хорошая структура |
| `breed_standards.json` | 100% | 0% | Отлично |
| `breed_costs.json` | 80% | 20% | OK |

### 2.3. Некорректные данные

#### Проблемы в `breed_health.json`:

1. **Все болезни помечены как `condition_type: "genetic"`** - неверно
   - Паразиты - инфекционные
   - Ожирение - метаболическое
   - Сердечные заболевания - могут быть приобретенными

2. **Все болезни имеют `is_genetic: true`** - неверно

3. **Все болезни имеют `screening_available: false`** - неточно
   - Для дисплазии доступен рентген
   - Для атрофии сетчатки - генетические тесты

4. **Поле `affected_system: "general"`** у всех - бесполезно
   - Должно быть: musculoskeletal, cardiovascular, ophthalmologic, etc.

#### Проблемы в `breed_nutrition.json`:

1. **Слишком общие рекомендации:**
   ```json
   {
     "description": "Стандартный метаболизм",
     "recommendations": "Сбалансированный кошачий корм",
     "restrictions": "Избегать аллергенов"
   }
   ```
   - Не дает никакой практической пользы

2. **Пустые поля аллергий** для большинства пород
   - Либо заполнить реальными данными, либо удалить

---

## 3. Поля для каждого сервиса

### 3.1. Сервис «Магазин» - Персонализация подбора товаров

**Цель:** Персонально подобрать корм, аксессуары и товары для конкретного питомца, учитывая породу, возраст, здоровье, аллергии.

#### Используемые поля из `breeds.json`:

```python
# ОСНОВНЫЕ ПАРАМЕТРЫ
breeds.size_category       # Размер порции, размер миски, аксессуаров
breeds.weight_min/max      # Расчет порций корма
breeds.energy_level        # Калорийность корма, количество лакомств
breeds.activity_level      # Тип игрушек (активные vs спокойные)

# ЗДОРОВЬЕ
breeds.health_risk_level   # Специализированные корма (для суставов, сердца)
breeds.hypoallergenic      # Гипоаллергенные товары
breeds.brachycephalic      # Специальные миски, контроль веса

# УХОД
breeds.shedding_level      # Инструменты для груминга, шампуни
breeds.grooming_frequency  # Количество средств ухода
breeds.coat_type           # Тип расчесок, шампуней
```

#### Используемые поля из других таблиц:

**breed_health.json:**
```python
# Специализированные корма для пород с рисками
health.condition_name      # "Дисплазия" → корм для суставов
health.affected_system     # "musculoskeletal" → глюкозамин
health.severity            # Приоритет рекомендаций
```

**breed_nutrition.json:**
```python
# Рекомендации по питанию
nutrition.diet_type        # dry/wet/mixed - тип корма
nutrition.protein_need     # Уровень белка в корме
nutrition.calorie_density  # Калорийность
nutrition.allergen_name    # Исключить аллергены
```

**breed_care.json:**
```python
# Товары для ухода
care.care_category         # coat/dental/nails → тип товаров
care.tools_needed          # Конкретные инструменты
care.frequency             # Расход товаров
```

#### Используемые поля из PetID (apps/pets/models.py):

```python
# ИНДИВИДУАЛЬНЫЕ ХАРАКТЕРИСТИКИ
pet.species               # Базовый фильтр dog/cat
pet.breed                 # Связь с breeds.json
pet.weight                # Расчет размера порции
pet.date_of_birth         # Возрастная категория (puppy/adult/senior)

# ЗДОРОВЬЕ
pet.health_issues         # ["чувствительное пищеварение", "лишний вес"]
pet.allergies             # ["курица", "пшеница", "соя"]

# ПИТАНИЕ
pet.activity_level        # Корректировка калорийности
```

#### Алгоритм персонализации товаров:

```python
def get_personalized_products(pet, category=None):
    """
    Комплексная персонализация товаров
    """
    breed_data = get_breed_data(pet.breed)
    
    # 1. БАЗОВАЯ ФИЛЬТРАЦИЯ
    products = Product.objects.filter(animal=pet.species)
    
    # 2. ПО РАЗМЕРУ (критично для корма и аксессуаров)
    if category == 'food':
        # Размер порции по породе и весу
        portion_size = calculate_portion(pet.weight, breed_data.energy_level)
        products = products.filter(
            params__portion_size__lte=portion_size * 1.2,
            params__portion_size__gte=portion_size * 0.8
        )
    
    if category == 'ammunition':
        # Размер ошейника, шлейки
        size_map = {
            'toy': ['XS', 'S'],
            'small': ['S', 'M'],
            'medium': ['M', 'L'],
            'large': ['L', 'XL'],
            'giant': ['XL', 'XXL']
        }
        products = products.filter(
            params__size__in=size_map[breed_data.size_category]
        )
    
    # 3. ПО ВОЗРАСТУ (критично для корма)
    age_category = calculate_age_category(pet.date_of_birth)
    if category == 'food':
        products = products.filter(params__age_group=age_category)
    
    # 4. ПО ЗДОРОВЬЮ ПОРОДЫ
    breed_health_risks = get_breed_health_risks(pet.breed)
    if 'hip_dysplasia' in breed_health_risks:
        products = products.filter(
            Q(params__ingredients__contains=['glucosamine']) |
            Q(params__ingredients__contains=['chondroitin'])
        )
    
    # 5. ПО ИНДИВИДУАЛЬНЫМ ПРОБЛЕМАМ ЗДОРОВЬЯ
    if 'чувствительное пищеварение' in pet.health_issues:
        products = products.filter(params__digestive_health=True)
    
    if 'лишний вес' in pet.health_issues:
        products = products.filter(params__diet_type='weight_control')
    
    # 6. ИСКЛЮЧЕНИЕ АЛЛЕРГЕНОВ (критично!)
    if pet.allergies:
        for allergen in pet.allergies:
            products = products.exclude(
                params__ingredients__icontains=allergen
            )
    
    # 7. ПО АКТИВНОСТИ
    if breed_data.energy_level in ['high', 'very_high']:
        if category == 'food':
            products = products.filter(params__calorie_density__gte=350)
        if category == 'toys':
            products = products.filter(params__activity_type='active')
    
    # 8. ПО ТИПУ ШЕРСТИ (для средств ухода)
    if category == 'care':
        grooming_products = get_grooming_products_by_breed(breed_data)
        products = products.filter(id__in=[p.id for p in grooming_products])
    
    return products.order_by('-relevance_score')
```

---

### 3.2. Сервис «Подбор корма» - Персональный рацион

**Цель:** Составить детальный план питания с расчетом порций, БЖУ, частоты кормления.

#### Необходимые поля из базы знаний:

**breeds.json:**
```python
breeds.weight_min/max      # Идеальный вес для породы
breeds.energy_level        # Базовая активность → калории
breeds.size_category       # Размер порции
breeds.brachycephalic      # Особенности кормления
```

**breed_nutrition.json:**
```python
nutrition.diet_type        # Рекомендуемый тип корма
nutrition.protein_need     # Требования к белку (high/very_high)
nutrition.calorie_density  # Калорийность (low/medium/high)
nutrition.feeding_frequency # Частота кормлений
nutrition.restrictions     # Ограничения по ингредиентам
```

**breed_health.json:**
```python
health.condition_name      # Специальные требования к питанию
health.affected_system     # Целевая система для коррекции
```

#### Необходимые поля из PetID:

```python
pet.weight                 # Текущий вес
pet.date_of_birth          # Возраст
pet.activity_level         # Индивидуальная активность
pet.health_issues          # Проблемы здоровья
pet.allergies              # Аллергии
pet.is_neutered            # Метаболизм отличается
```

#### Алгоритм расчета рациона:

```python
def calculate_diet_plan(pet):
    """
    Расчет персонального плана питания
    """
    breed_data = get_breed_data(pet.breed)
    nutrition_data = get_breed_nutrition(pet.breed)
    
    # 1. РАСЧЕТ БАЗОВЫХ КАЛОРИЙ
    # Формула: RER = 70 * (вес в кг)^0.75
    rer = 70 * (pet.weight ** 0.75)
    
    # 2. КОРРЕКТИРОВКА ПО АКТИВНОСТИ
    activity_multiplier = {
        'low': 1.2,
        'medium': 1.4,
        'high': 1.6
    }
    daily_calories = rer * activity_multiplier[pet.activity_level]
    
    # 3. КОРРЕКТИРОВКА ПО ВОЗРАСТУ
    age_category = calculate_age_category(pet.date_of_birth)
    if age_category == 'puppy':
        daily_calories *= 2.0  # Щенки требуют в 2 раза больше
    elif age_category == 'senior':
        daily_calories *= 0.8  # Пожилые - меньше
    
    # 4. КОРРЕКТИРОВКА ПО СТЕРИЛИЗАЦИИ
    if pet.is_neutered:
        daily_calories *= 0.8  # Стерилизованные - на 20% меньше
    
    # 5. КОРРЕКТИРОВКА ПО ВЕСУ (избыточный/недостаточный)
    ideal_weight = (breed_data.weight_min + breed_data.weight_max) / 2
    if pet.weight > ideal_weight * 1.2:  # Избыточный вес
        daily_calories *= 0.7  # Диета
    elif pet.weight < ideal_weight * 0.8:  # Недостаточный вес
        daily_calories *= 1.3  # Набор веса
    
    # 6. РАСЧЕТ БЖУ
    protein_needs = {
        'very_high': 0.35,  # 35% от калорий
        'high': 0.30,
        'medium': 0.25
    }
    protein_percent = protein_needs[nutrition_data.protein_need]
    
    # Белки: 4 ккал/г
    protein_grams = (daily_calories * protein_percent) / 4
    
    # Жиры: 9 ккал/г (20-30% от калорий)
    fat_grams = (daily_calories * 0.25) / 9
    
    # Углеводы: остаток
    carbs_calories = daily_calories - (protein_grams * 4 + fat_grams * 9)
    carbs_grams = carbs_calories / 4
    
    # 7. ЧАСТОТА КОРМЛЕНИЯ
    feeding_frequency = {
        'puppy': 3,     # 3-4 раза в день
        'adult': 2,     # 2 раза в день
        'senior': 2     # 2-3 раза в день
    }
    meals_per_day = feeding_frequency[age_category]
    portion_per_meal = daily_calories / meals_per_day
    
    # 8. СПЕЦИАЛЬНЫЕ РЕКОМЕНДАЦИИ
    recommendations = []
    
    if 'чувствительное пищеварение' in pet.health_issues:
        recommendations.append("Корм с пробиотиками и легкоусвояемым белком")
    
    if 'проблемы с суставами' in pet.health_issues:
        recommendations.append("Добавки с глюкозамином и хондроитином")
    
    if breed_data.brachycephalic:
        recommendations.append("Специальные миски для короткомордых")
    
    return {
        'daily_calories': round(daily_calories),
        'protein_grams': round(protein_grams),
        'fat_grams': round(fat_grams),
        'carbs_grams': round(carbs_grams),
        'meals_per_day': meals_per_day,
        'portion_per_meal': round(portion_per_meal),
        'diet_type': nutrition_data.diet_type,
        'recommendations': recommendations
    }
```

---

### 3.3. Сервис «PetID» - Сравнение с эталонами

**Цель:** Сравнить параметры конкретного питомца со стандартами породы, выявить отклонения, дать рекомендации.

#### Сравниваемые параметры:

**1. ВЕС**

**Из базы знаний:**
```python
breeds.weight_min          # 25 кг (для Лабрадора)
breeds.weight_max          # 35 кг
```

**Из PetID:**
```python
pet.weight                 # 40 кг (текущий вес)
```

**Анализ:**
```python
def analyze_weight(pet, breed_data):
    ideal_weight_min = breed_data.weight_min
    ideal_weight_max = breed_data.weight_max
    current_weight = pet.weight
    
    if current_weight < ideal_weight_min * 0.9:
        return {
            'status': 'underweight',
            'severity': 'medium',
            'recommendation': 'Увеличить калорийность рациона на 20%'
        }
    elif current_weight > ideal_weight_max * 1.15:
        return {
            'status': 'overweight',
            'severity': 'high',
            'recommendation': 'Диетический корм + увеличение активности'
        }
    else:
        return {
            'status': 'normal',
            'severity': 'low',
            'recommendation': 'Вес в норме для породы'
        }
```

**2. АКТИВНОСТЬ**

**Из базы знаний:**
```python
breeds.energy_level        # "high" (для Лабрадора)
breed_activities.json      # Рекомендации: "2 прогулки по 45-60 мин"
```

**Из PetID:**
```python
pet.activity_level         # "low" (фактическая активность)
pet.walk_frequency         # "1 прогулка в день" (если собака)
pet.walk_duration          # "20 минут"
```

**Анализ:**
```python
def analyze_activity(pet, breed_data):
    breed_energy = breed_data.energy_level  # "high"
    actual_activity = pet.activity_level     # "low"
    
    if breed_energy == 'high' and actual_activity == 'low':
        return {
            'status': 'insufficient_activity',
            'severity': 'high',
            'recommendation': 'Порода требует 2 прогулки по 60 мин, игры, активность',
            'risks': ['ожирение', 'деструктивное поведение', 'проблемы с суставами']
        }
```

**3. ЗДОРОВЬЕ**

**Из базы знаний:**
```python
breed_health.json = [
    {
        "condition_name": "Дисплазия тазобедренных суставов",
        "severity": "high",
        "prevalence_percent": 15.0
    }
]
```

**Из PetID:**
```python
pet.health_issues          # ["проблемы с суставами"]
pet.age                    # 8 лет
```

**Анализ:**
```python
def analyze_health_risks(pet, breed_health_data):
    high_risk_conditions = [
        c for c in breed_health_data 
        if c['severity'] == 'high' and c['prevalence_percent'] > 10
    ]
    
    alerts = []
    for condition in high_risk_conditions:
        if pet.age > 7:  # Риск увеличивается с возрастом
            alerts.append({
                'condition': condition['condition_name'],
                'risk_level': 'high',
                'recommendation': f"Ежегодное обследование на {condition['condition_name']}",
                'preventive_measures': condition['prevention']
            })
    
    return alerts
```

**4. ПОВЕДЕНИЕ**

**Из базы знаний:**
```python
breeds.trainability        # "high" (легко обучаемая порода)
breeds.intelligence        # "high"
breed_behavior.json        # Характеристики поведения
```

**Из PetID:**
```python
pet.behavioral_problems    # ["агрессия к другим собакам"]
pet.training_experience    # "none"
```

**Анализ:**
```python
def analyze_behavior(pet, breed_data):
    if breed_data.trainability == 'high' and pet.training_experience == 'none':
        return {
            'status': 'untrained_potential',
            'recommendation': 'Порода легко обучаема, рекомендуется начать дрессировку',
            'suggested_courses': ['Базовое послушание', 'Социализация']
        }
    
    if pet.behavioral_problems:
        return {
            'status': 'behavior_issues',
            'severity': 'high',
            'recommendation': 'Требуется работа с кинологом',
            'suggested_courses': ['Коррекция агрессии', 'Работа с поведением']
        }
```

**5. УХОД**

**Из базы знаний:**
```python
breeds.grooming_frequency  # "weekly" (еженедельный груминг)
breeds.shedding_level      # "high"
breed_care.json            # Детальные инструкции по уходу
```

**Рекомендации:**
- Генерация напоминаний в дневнике здоровья
- Рекомендации товаров для ухода
- Персонализированный график ухода

---

### 3.4. Сервис «Дневник здоровья» - События и напоминания

**Цель:** Автоматически генерировать напоминания о вакцинациях, обработке от паразитов, грумин ге, прогулках.

#### Используемые поля:

**breed_medical.json:**
```python
# ВАКЦИНАЦИИ
medical.vaccine_name       # "Комплексная вакцина DHPP"
medical.disease_protected  # "Чума, гепатит, парвовирус, парагрипп"
medical.mandatory_level    # "core" (обязательная)
medical.first_dose_age     # "6-8 недель"
medical.booster_schedule   # "ежегодно"
```

**breed_care.json:**
```python
# УХОД
care.care_category         # "dental" / "nails" / "coat"
care.frequency             # "3 раза в неделю" / "Раз в 2-3 недели"
care.importance            # "critical" / "high" / "medium"
```

**breeds.json:**
```python
breeds.grooming_frequency  # "weekly" / "daily" / "monthly"
```

#### Алгоритм генерации напоминаний:

```python
def generate_health_calendar(pet, breed_data):
    """
    Генерация персонализированного календаря здоровья
    """
    events = []
    
    # 1. ВАКЦИНАЦИИ
    vaccinations = get_breed_vaccinations(pet.breed, pet.species)
    for vaccine in vaccinations:
        if vaccine['mandatory_level'] == 'core':
            # Расчет даты первой вакцинации
            first_dose_age_weeks = parse_age(vaccine['first_dose_age'])
            first_dose_date = pet.date_of_birth + timedelta(weeks=first_dose_age_weeks)
            
            events.append({
                'type': 'vaccination',
                'title': f"Вакцинация: {vaccine['vaccine_name']}",
                'date': first_dose_date,
                'priority': 'high',
                'description': f"Защита от: {vaccine['disease_protected']}",
                'recurrence': vaccine['booster_schedule']  # "ежегодно"
            })
    
    # 2. ОБРАБОТКА ОТ ПАРАЗИТОВ
    events.append({
        'type': 'parasite_treatment',
        'title': 'Обработка от блох и клещей',
        'date': 'monthly',
        'priority': 'high',
        'recurrence': 'monthly'
    })
    
    events.append({
        'type': 'deworming',
        'title': 'Дегельминтизация',
        'date': 'quarterly',
        'priority': 'medium',
        'recurrence': 'every 3 months'
    })
    
    # 3. ГРУМИНГ
    grooming_frequency_map = {
        'daily': 1,
        'weekly': 7,
        'monthly': 30
    }
    grooming_days = grooming_frequency_map[breed_data.grooming_frequency]
    
    events.append({
        'type': 'grooming',
        'title': 'Груминг (расчесывание)',
        'date': f'every_{grooming_days}_days',
        'priority': 'medium',
        'recurrence': f'every {grooming_days} days'
    })
    
    # 4. СПЕЦИФИЧНЫЕ ДЛЯ ПОРОДЫ ПРОЦЕДУРЫ
    breed_care = get_breed_care(pet.breed)
    for care_item in breed_care:
        if care_item['importance'] in ['critical', 'high']:
            events.append({
                'type': 'care',
                'title': care_item['care_item'],
                'date': parse_frequency(care_item['frequency']),
                'priority': care_item['importance'],
                'instructions': care_item['instructions']
            })
    
    # 5. ВЕТЕРИНАРНЫЕ ОСМОТРЫ
    age_years = calculate_age(pet.date_of_birth)
    if age_years < 1:
        checkup_frequency = 'quarterly'  # Каждые 3 месяца для щенков
    elif age_years > 7:
        checkup_frequency = 'semiannually'  # Каждые 6 месяцев для пожилых
    else:
        checkup_frequency = 'annually'  # Раз в год для взрослых
    
    events.append({
        'type': 'vet_checkup',
        'title': 'Ветеринарный осмотр',
        'date': checkup_frequency,
        'priority': 'high',
        'recurrence': checkup_frequency
    })
    
    # 6. КОНТРОЛЬ ВЕСА
    breed_health_risks = get_breed_health_risks(pet.breed)
    if 'obesity' in [r['condition_name'].lower() for r in breed_health_risks]:
        events.append({
            'type': 'weight_check',
            'title': 'Контроль веса',
            'date': 'monthly',
            'priority': 'high',
            'recurrence': 'monthly',
            'note': 'Порода склонна к ожирению'
        })
    
    return events
```

---

## 4. Логика подбора корма

### 4.1. Критерии подбора

Для правильного подбора корма нужно учитывать **10 факторов**:

1. **Вид животного** (собака/кошка)
2. **Возраст** (puppy/adult/senior)
3. **Размер** (toy/small/medium/large/giant)
4. **Активность** (low/medium/high)
5. **Вес** (норма/избыток/недостаток)
6. **Здоровье** (чувствительное пищеварение, аллергии, болезни)
7. **Стерилизация** (изменение метаболизма)
8. **Порода** (специфичные потребности)
9. **Аллергии** (исключение ингредиентов)
10. **Предпочтения** (вкусовые предпочтения)

### 4.2. Параметры корма (БЖУ и другие)

Каждый товар в категории "Корм" должен иметь следующие параметры:

```python
class Product(models.Model):
    # ... существующие поля ...
    
    # НОВОЕ ПОЛЕ: Параметры корма (JSON)
    nutrition_params = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Параметры питания',
        help_text='БЖУ и другие параметры корма'
    )
```

#### Структура `nutrition_params`:

```json
{
  // БАЗОВАЯ КЛАССИФИКАЦИЯ
  "food_type": "dry",                    // dry/wet/canned/pouch/pate
  "age_group": "adult",                  // puppy/kitten/adult/senior/all
  "size_category": "medium",             // toy/small/medium/large/giant/all
  "activity_level": "normal",            // low/normal/high
  
  // БЖУ (на 100г продукта)
  "protein_percent": 28.0,               // % белка
  "fat_percent": 15.0,                   // % жира
  "carbs_percent": 42.0,                 // % углеводов
  "fiber_percent": 3.5,                  // % клетчатки
  "moisture_percent": 10.0,              // % влажности
  "ash_percent": 6.5,                    // % золы
  
  // КАЛОРИИ
  "calories_per_100g": 365,              // ккал на 100г
  "calorie_density": "medium",           // low/medium/high
  
  // СОСТАВ
  "main_protein_source": "chicken",      // курица, говядина, рыба, ягненок
  "protein_sources": ["chicken", "fish"],// Все источники белка
  "grain_free": false,                   // Беззерновой
  "ingredients": [                       // Полный состав
    "chicken", "rice", "corn", "wheat", "barley",
    "chicken_fat", "fish_oil", "vitamins", "minerals"
  ],
  
  // АЛЛЕРГЕНЫ (для исключения)
  "common_allergens": [                  // Основные аллергены
    "chicken", "wheat", "corn"
  ],
  
  // СПЕЦИАЛИЗАЦИЯ
  "diet_type": "standard",               // standard/weight_control/sensitive/hypoallergenic
  "health_benefits": [                   // Целевые проблемы
    "digestive_health",                  // Здоровье ЖКТ
    "joint_support",                     // Поддержка суставов
    "skin_coat",                         // Кожа и шерсть
    "urinary_health",                    // Мочевыводящие пути
    "dental_health"                      // Здоровье зубов
  ],
  
  // ДОБАВКИ
  "supplements": [                       // Добавки и витамины
    "glucosamine",                       // Глюкозамин (суставы)
    "chondroitin",                       // Хондроитин (суставы)
    "omega_3",                           // Омега-3 (кожа, шерсть)
    "omega_6",                           // Омега-6
    "probiotics",                        // Пробиотики (пищеварение)
    "taurine",                           // Таурин (для кошек)
    "l_carnitine"                        // L-карнитин (вес)
  ],
  
  // ДЛЯ ПОРОД
  "breed_specific": false,               // Специфичен для породы
  "recommended_breeds": [],              // Рекомендуемые породы
  "brachycephalic_friendly": false,      // Для короткомордых
  
  // ПОРЦИЯ
  "recommended_daily_amount": {          // Рекомендуемая порция
    "toy": "40-80g",
    "small": "80-150g",
    "medium": "150-300g",
    "large": "300-500g",
    "giant": "500-800g"
  },
  
  // КАЧЕСТВО И КЛАСС
  "quality_class": "premium",            // economy/premium/super_premium/holistic
  "natural": true,                       // Натуральный состав
  "organic": false,                      // Органический
  
  // ОСОБЕННОСТИ
  "features": [
    "high_protein",                      // Высокое содержание белка
    "low_fat",                           // Низкое содержание жира
    "limited_ingredients",               // Ограниченный состав
    "single_protein",                    // Один источник белка
    "no_artificial_colors",              // Без искусственных красителей
    "no_preservatives"                   // Без консервантов
  ]
}
```

### 4.3. Алгоритм подбора корма

```python
def recommend_food(pet, breed_data, nutrition_data):
    """
    Подбор корма с учетом всех факторов
    """
    
    # 1. БАЗОВАЯ ФИЛЬТРАЦИЯ
    foods = Product.objects.filter(
        category='food',
        animal=pet.species,
        is_active=True,
        in_stock=True
    )
    
    # 2. ПО ВОЗРАСТУ
    age_category = calculate_age_category(pet.date_of_birth)
    foods = foods.filter(
        Q(nutrition_params__age_group=age_category) |
        Q(nutrition_params__age_group='all')
    )
    
    # 3. ПО РАЗМЕРУ
    size = breed_data.size_category
    foods = foods.filter(
        Q(nutrition_params__size_category=size) |
        Q(nutrition_params__size_category='all')
    )
    
    # 4. ИСКЛЮЧЕНИЕ АЛЛЕРГЕНОВ (критично!)
    if pet.allergies:
        for allergen in pet.allergies:
            foods = foods.exclude(
                nutrition_params__ingredients__contains=allergen.lower()
            )
    
    # 5. ПО ПРОБЛЕМАМ ЗДОРОВЬЯ
    if 'чувствительное пищеварение' in pet.health_issues:
        foods = foods.filter(
            Q(nutrition_params__diet_type='sensitive') |
            Q(nutrition_params__health_benefits__contains=['digestive_health'])
        )
    
    if 'лишний вес' in pet.health_issues:
        foods = foods.filter(
            nutrition_params__diet_type='weight_control'
        )
    
    if 'проблемы с суставами' in pet.health_issues:
        foods = foods.filter(
            nutrition_params__health_benefits__contains=['joint_support']
        )
    
    # 6. ПО ПОРОДОСПЕЦИФИЧНЫМ РИСКАМ
    breed_health_risks = get_breed_health_risks(pet.breed)
    if 'hip_dysplasia' in [r['condition_name'].lower() for r in breed_health_risks]:
        foods = foods.filter(
            nutrition_params__supplements__contains=['glucosamine', 'chondroitin']
        )
    
    # 7. ПО АКТИВНОСТИ
    activity_multiplier = {
        'low': 'low',
        'medium': 'normal',
        'high': 'high'
    }
    foods = foods.filter(
        nutrition_params__activity_level=activity_multiplier[pet.activity_level]
    )
    
    # 8. ПО СТЕРИЛИЗАЦИИ
    if pet.is_neutered:
        # Стерилизованные животные нуждаются в меньшей калорийности
        foods = foods.exclude(
            nutrition_params__calorie_density='high'
        )
    
    # 9. ПО ТИПУ ПИТАНИЯ (из профиля или породы)
    diet_type = nutrition_data.diet_type if nutrition_data else 'dry'
    foods = foods.filter(nutrition_params__food_type=diet_type)
    
    # 10. ДЛЯ БРАХИЦЕФАЛОВ (короткомордых)
    if breed_data.brachycephalic:
        foods = foods.filter(
            Q(nutrition_params__brachycephalic_friendly=True) |
            Q(nutrition_params__features__contains=['small_kibble'])
        )
    
    # 11. РАСЧЕТ РЕЛЕВАНТНОСТИ (скоринг)
    foods = foods.annotate(
        relevance_score=Case(
            # +50 если есть все нужные добавки
            When(
                nutrition_params__supplements__contains=required_supplements(),
                then=Value(50)
            ),
            # +30 если специализированный корм (диета, гипоаллергенный)
            When(
                ~Q(nutrition_params__diet_type='standard'),
                then=Value(30)
            ),
            # +20 если высокое качество
            When(
                nutrition_params__quality_class__in=['super_premium', 'holistic'],
                then=Value(20)
            ),
            # +10 если беззерновой (актуально при аллергиях)
            When(
                nutrition_params__grain_free=True,
                then=Value(10)
            ),
            default=Value(0),
            output_field=models.IntegerField()
        )
    )
    
    # 12. СОРТИРОВКА
    foods = foods.order_by('-relevance_score', '-average_rating', 'price')
    
    return foods[:20]  # Топ-20 рекомендаций
```

### 4.4. Пример персонализации

**Питомец:**
- Порода: Лабрадор
- Возраст: 8 лет (senior)
- Вес: 40 кг (избыточный, норма 30-35 кг)
- Активность: low
- Здоровье: дисплазия тазобедренных суставов
- Аллергии: курица, пшеница

**Подобранный корм:**
```json
{
  "name": "Royal Canin Labrador Retriever Adult 7+",
  "nutrition_params": {
    "food_type": "dry",
    "age_group": "senior",
    "size_category": "large",
    "activity_level": "low",
    
    "protein_percent": 25.0,
    "fat_percent": 12.0,        // Пониженный жир для контроля веса
    "calories_per_100g": 340,   // Сниженная калорийность
    
    "main_protein_source": "fish",  // Не курица (аллерген)
    "grain_free": true,              // Без пшеницы (аллерген)
    
    "diet_type": "weight_control",
    "health_benefits": [
      "joint_support",               // Поддержка суставов
      "weight_management"            // Контроль веса
    ],
    
    "supplements": [
      "glucosamine",                 // Для суставов
      "chondroitin",                 // Для суставов
      "omega_3",                     // Противовоспалительное
      "l_carnitine"                  // Жиросжигание
    ],
    
    "features": [
      "high_protein",
      "low_fat",
      "senior_formula"
    ],
    
    "quality_class": "super_premium"
  }
}
```

**Почему этот корм:**
1. ✅ Для пожилых собак (senior)
2. ✅ Для крупных пород (large)
3. ✅ Без курицы и пшеницы (аллергены исключены)
4. ✅ Пониженная калорийность (для контроля веса)
5. ✅ Глюкозамин + хондроитин (для суставов)
6. ✅ L-карнитин (для снижения веса)

---

## 5. Структура данных товаров

### 5.1. Модель Product - необходимые изменения

**Текущие проблемы модели Product:**
1. Отсутствует поле `nutrition_params` с БЖУ и детальными параметрами
2. Поле `params` (JSON) используется хаотично, без стандартизации
3. Нет связи между кормом и породами/здоровьем

**Предлагаемые изменения:**

```python
class Product(models.Model):
    # ... существующие поля ...
    
    # НОВОЕ: Детальные параметры питания (только для корма)
    nutrition_params = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Параметры питания',
        help_text='БЖУ, состав, добавки (только для категории "Корм")'
    )
    
    # НОВОЕ: Параметры товара (для всех категорий)
    product_params = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Параметры товара',
        help_text='Размер, цвет, материал и другие характеристики'
    )
    
    # НОВОЕ: Для каких проблем здоровья подходит
    health_targets = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Целевые проблемы здоровья',
        help_text='["sensitive_digestion", "joint_support", "weight_control"]'
    )
    
    # НОВОЕ: Рекомендуемые породы (если специфичен для пород)
    recommended_breeds = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Рекомендуемые породы',
        help_text='[1, 5, 12] - ID пород из breeds.json'
    )
```

### 5.2. Стандартизация `product_params` по категориям

#### Категория: **Корм** (food)

Используем `nutrition_params` (см. раздел 4.2)

#### Категория: **Амуниция** (ammunition)

```json
{
  "size": "M",                           // XS/S/M/L/XL/XXL
  "adjustable": true,                    // Регулируется
  "material": "nylon",                   // Материал
  "color": "black",                      // Цвет
  "reflective": true,                    // Светоотражающие элементы
  "length_cm": 150,                      // Длина (для поводков)
  "width_cm": 2.5,                       // Ширина
  "weight_capacity_kg": 50,              // Выдерживаемый вес
  "suitable_for_breeds": ["large", "giant"]  // Для каких размеров пород
}
```

#### Категория: **Средства ухода** (care)

```json
{
  "care_type": "grooming",               // grooming/dental/skin
  "coat_type": "long",                   // short/medium/long/all
  "usage": "daily",                      // daily/weekly/monthly
  "volume_ml": 250,                      // Объем
  "natural": true,                       // Натуральный состав
  "hypoallergenic": true,                // Гипоаллергенный
  "scent": "neutral",                    // Запах
  "ingredients": [                       // Состав
    "aloe_vera", "vitamin_e"
  ]
}
```

#### Категория: **Игрушки** (toys)

```json
{
  "toy_type": "interactive",             // plush/interactive/ball/rope
  "activity_level": "high",              // low/medium/high
  "size": "medium",                      // small/medium/large
  "material": "rubber",                  // rubber/plush/plastic
  "durable": true,                       // Прочная
  "squeaker": false,                     // Пищалка
  "treat_dispenser": true,               // Диспенсер лакомств
  "suitable_for_aggressive_chewers": false
}
```

### 5.3. Миграция данных

Для существующих товаров необходимо:

1. **Парсинг описаний** - извлечь БЖУ из описаний товаров
2. **Категоризация** - присвоить правильные параметры по категориям
3. **Заполнение `health_targets`** - определить целевые проблемы здоровья

**Пример скрипта миграции:**

```python
def migrate_food_products():
    """
    Миграция кормов: извлечение БЖУ из описаний
    """
    import re
    
    food_products = Product.objects.filter(category='food')
    
    for product in food_products:
        # Парсинг БЖУ из описания
        description = product.description or ""
        
        protein_match = re.search(r'белок[:\s]*(\d+(?:\.\d+)?)', description, re.I)
        fat_match = re.search(r'жир[:\s]*(\d+(?:\.\d+)?)', description, re.I)
        
        nutrition_params = {}
        
        if protein_match:
            nutrition_params['protein_percent'] = float(protein_match.group(1))
        
        if fat_match:
            nutrition_params['fat_percent'] = float(fat_match.group(1))
        
        # Определение возрастной группы по названию
        name_lower = product.name.lower()
        if 'puppy' in name_lower or 'щенок' in name_lower or 'kitten' in name_lower:
            nutrition_params['age_group'] = 'puppy'
        elif 'senior' in name_lower or '7+' in name_lower or 'пожилых' in name_lower:
            nutrition_params['age_group'] = 'senior'
        else:
            nutrition_params['age_group'] = 'adult'
        
        # Определение специализации
        health_targets = []
        if 'sensitive' in name_lower or 'чувствительн' in name_lower:
            health_targets.append('digestive_health')
        if 'weight' in name_lower or 'light' in name_lower or 'лайт' in name_lower:
            health_targets.append('weight_control')
        if 'joint' in name_lower or 'сустав' in name_lower:
            health_targets.append('joint_support')
        
        product.nutrition_params = nutrition_params
        product.health_targets = health_targets
        product.save()
```

---

## 6. Рекомендации по оптимизации

### 6.1. Краткосрочные действия (1-2 недели)

#### ✅ Приоритет 1: Очистка дублирований

**Действия:**
1. Вынести общие процедуры ухода в отдельный справочник `common_care_procedures.json`
2. Вынести общие вакцины в `common_vaccinations.json`
3. Удалить из `breed_health.json` общие проблемы (паразиты, ожирение)

**Экономия:** ~50% объема данных (~5 MB)

#### ✅ Приоритет 2: Исправление некорректных данных

**Действия:**
1. Пересмотреть `condition_type` в `breed_health.json`:
   - Генетические → `genetic`
   - Приобретенные → `acquired`
   - Инфекционные → `infectious`
2. Заполнить `affected_system` корректными значениями
3. Проверить и заполнить `screening_available`

#### ✅ Приоритет 3: Добавление `nutrition_params` в товары

**Действия:**
1. Добавить поле `nutrition_params` в модель `Product`
2. Создать миграцию для заполнения данных из описаний
3. Стандартизировать структуру `nutrition_params`

### 6.2. Среднесрочные действия (1-2 месяца)

#### ✅ Приоритет 4: Улучшение качества данных

**Действия:**
1. Заменить шаблонные описания симптомов и лечения реальными
2. Заполнить пустые поля аллергий в `breed_nutrition.json`
3. Добавить источники данных для верификации

#### ✅ Приоритет 5: Связь товаров с породами

**Действия:**
1. Добавить поле `recommended_breeds` в модель `Product`
2. Проставить связи для специализированных кормов
3. Создать интерфейс рекомендаций "Корм для вашей породы"

#### ✅ Приоритет 6: Интеграция базы знаний с PetID

**Действия:**
1. Создать API эндпоинт `/api/breeds/{breed_id}/` для получения данных породы
2. Реализовать сервис сравнения параметров питомца с эталонами породы
3. Генерация персонализированных рекомендаций на основе отклонений

### 6.3. Долгосрочные действия (3-6 месяцев)

#### ✅ Приоритет 7: Машинное обучение для рекомендаций

**Действия:**
1. Собрать данные о покупках пользователей
2. Обучить модель рекомендаций на основе:
   - Породы питомца
   - Проблем здоровья
   - История покупок
3. A/B тестирование алгоритмов рекомендаций

#### ✅ Приоритет 8: Расширение базы знаний

**Действия:**
1. Добавить новые породы (экзотические породы кошек, редкие породы собак)
2. Добавить данные о смешанных породах (метисы)
3. Интеграция с ветеринарными базами данных

#### ✅ Приоритет 9: Пользовательский контент

**Действия:**
1. Возможность владельцам добавлять отзывы о породах
2. Фото питомцев от пользователей
3. Советы от владельцев пород

---

## 7. Итоговая структура базы знаний

### 7.1. Оптимизированная структура файлов

```
data_breeds/
├── breeds.json                    # Основная информация (без изменений)
│
├── breed_health.json              # ОПТИМИЗИРОВАН: только породоспецифичные болезни
├── breed_care_specific.json       # НОВЫЙ: специфичные процедуры ухода
├── breed_nutrition_specific.json  # НОВЫЙ: породоспецифичные рекомендации по питанию
├── breed_behavior.json            # (оставить как есть)
├── breed_activities.json          # (оставить как есть)
├── breed_costs.json               # (оставить как есть)
├── breed_standards.json           # (оставить как есть)
├── breed_media.json               # (оставить как есть)
│
└── common/                        # НОВАЯ ПАПКА: общие справочники
    ├── common_care_procedures.json      # Общие процедуры ухода
    ├── common_vaccinations_dogs.json    # Общие вакцины для собак
    ├── common_vaccinations_cats.json    # Общие вакцины для кошек
    ├── common_health_issues.json        # Общие проблемы здоровья
    └── nutrition_guidelines.json        # Общие рекомендации по питанию
```

### 7.2. Ожидаемые результаты оптимизации

| Метрика | До | После | Изменение |
|---------|-----|-------|-----------|
| Размер данных | ~10 MB | ~5 MB | -50% |
| Количество записей | ~8500 | ~4500 | -47% |
| Дублирований | 60% | 10% | -83% |
| Качество данных | 40% | 85% | +112% |
| Время загрузки | 2.5 сек | 1.2 сек | -52% |

---

## 8. Приоритетные поля для базового MVP

Для запуска базовой версии персонализации достаточно использовать **минимальный набор полей**:

### Из `breeds.json`:
✅ `species`, `size_category`, `weight_min`, `weight_max`, `energy_level`, `health_risk_level`, `grooming_frequency`

### Из `breed_health.json`:
✅ `condition_name`, `severity`, `affected_system` (только породоспецифичные)

### Из `breed_nutrition.json`:
✅ `protein_need`, `calorie_density`, `diet_type`, `allergen_name` (если есть)

### Из `breed_care.json`:
✅ `care_category`, `frequency`, `importance` (только специфичные для породы)

### Из PetID:
✅ `species`, `breed`, `weight`, `date_of_birth`, `activity_level`, `health_issues`, `allergies`

### Для товаров (Product):
✅ `category`, `subcategory`, `nutrition_params` (БЖУ для кормов), `health_targets`

**Этого достаточно для:**
1. Базовой персонализации магазина (подбор корма по виду, размеру, возрасту, аллергиям)
2. Базовых рекомендаций курсов (по активности и поведению)
3. Базовых напоминаний в календаре (вакцинации, груминг)
4. Базового анализа PetID (сравнение веса с эталоном породы)

---

## Выводы

### Что точно нужно:
1. ✅ **breeds.json** - полностью, основа всего
2. ✅ **breed_health.json** - после очистки от общих болезней
3. ✅ **breed_nutrition.json** - специфичные рекомендации по породам
4. ✅ **breed_care.json** - специфичные процедуры
5. ✅ **breed_medical.json** - вакцинации (после вынесения общих)
6. ⚠️ **breed_behavior.json** - можно сократить, оставив ключевые черты
7. ⚠️ **breed_activities.json** - базовый набор активностей
8. ❌ **breed_costs.json** - низкий приоритет, можно удалить на начальном этапе
9. ❌ **breed_standards.json** - не нужен для персонализации, только для энциклопедии
10. ✅ **breed_media.json** - нужен для UI

### Что добавить:
1. ✅ `nutrition_params` в модель `Product` с детальными БЖУ
2. ✅ `health_targets` в `Product` для связи товаров с проблемами здоровья
3. ✅ Общие справочники в папке `common/`
4. ✅ API для сравнения параметров питомца с эталонами породы

### Что исключить:
1. ❌ Дублирующиеся записи ухода и вакцинаций
2. ❌ Общие проблемы здоровья (паразиты, ожирение)
3. ❌ Шаблонные описания без информативности
4. ❌ Стандарты организаций (для MVP не критично)

---

**Дата последнего обновления:** 12 января 2026  
**Версия документа:** 1.0  
**Авторы:** Команда разработки Pet Care Platform

