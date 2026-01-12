# Алгоритм подбора корма и формирования рациона

**Дата:** 12 января 2026  
**Версия:** 1.0

---

## Содержание
1. [Общие принципы](#общие-принципы)
2. [Расчет калорий](#расчет-калорий)
3. [Расчет БЖУ](#расчет-бжу)
4. [Алгоритм подбора корма](#алгоритм-подбора-корма)
5. [Расчет порций](#расчет-порций)
6. [Примеры для разных сценариев](#примеры-для-разных-сценариев)

---

## 1. Общие принципы

### 1.1. Факторы, влияющие на питание

| Фактор | Влияние | Пример |
|--------|---------|--------|
| **Возраст** | Высокое | Щенки требуют в 2 раза больше калорий |
| **Вес** | Критическое | Основа расчета базовых калорий |
| **Активность** | Высокое | Активные собаки: +40% калорий |
| **Стерилизация** | Среднее | Стерилизованные: -20% калорий |
| **Здоровье** | Высокое | Диабет, почечная недостаточность |
| **Порода** | Среднее | Генетическая предрасположенность |
| **Размер** | Высокое | Крупные породы: другой метаболизм |
| **Аллергии** | Критическое | Исключение ингредиентов |

### 1.2. Физиология пищеварения

#### Собаки:
- **Тип**: Факультативные хищники (всеядные с уклоном в хищников)
- **Белок**: 18-25% от рациона (минимум), оптимально 25-30%
- **Жир**: 10-15% (минимум), оптимально 15-20%
- **Углеводы**: 30-50%
- **Переваривание**: 12-24 часа

#### Кошки:
- **Тип**: Облигатные хищники (строгие хищники)
- **Белок**: 26-40% от рациона (минимум), оптимально 35-45%
- **Жир**: 9-15% (минимум), оптимально 15-25%
- **Углеводы**: 5-15% (минимальная потребность)
- **Переваривание**: 10-20 часов
- **Критично**: Таурин (незаменимая аминокислота)

---

## 2. Расчет калорий

### 2.1. Формула базовых калорий (RER)

**RER (Resting Energy Requirement)** - энергия покоя, необходимая для базового метаболизма.

```python
def calculate_rer(weight_kg):
    """
    Расчет базовых калорий (RER)
    
    Формула: RER = 70 * (вес в кг)^0.75
    
    Альтернативная формула для весов 2-45 кг:
    RER = 30 * вес + 70
    """
    if weight_kg < 2 or weight_kg > 45:
        # Универсальная формула
        rer = 70 * (weight_kg ** 0.75)
    else:
        # Упрощенная формула для типичных весов
        rer = 30 * weight_kg + 70
    
    return round(rer)

# Примеры:
# 5 кг (маленькая собака): RER = 234 ккал
# 30 кг (средняя собака): RER = 970 ккал
# 4 кг (кошка): RER = 190 ккал
```

### 2.2. Расчет дневных калорий (DER)

**DER (Daily Energy Requirement)** - дневная потребность с учетом активности и других факторов.

```python
def calculate_der(pet, breed_data):
    """
    Расчет дневной потребности в калориях (DER)
    
    DER = RER * коэффициент
    """
    rer = calculate_rer(pet.weight)
    
    # 1. БАЗОВЫЙ КОЭФФИЦИЕНТ ПО ВОЗРАСТУ
    age_years = calculate_age_years(pet.date_of_birth)
    
    if age_years < 0.3:  # До 4 месяцев
        age_multiplier = 3.0
    elif age_years < 1:  # 4 месяца - 1 год
        age_multiplier = 2.0
    elif age_years > 7:  # Пожилые
        age_multiplier = 1.2
    else:  # Взрослые
        age_multiplier = 1.6
    
    # 2. КОРРЕКЦИЯ ПО АКТИВНОСТИ
    activity_multiplier = {
        'low': 1.0,      # Домашние кошки, малоактивные собаки
        'medium': 1.2,   # Стандартная активность
        'high': 1.4      # Рабочие собаки, очень активные
    }
    
    activity_factor = activity_multiplier.get(pet.activity_level, 1.2)
    
    # 3. КОРРЕКЦИЯ ПО СТЕРИЛИЗАЦИИ
    if pet.is_neutered:
        neuter_multiplier = 0.8  # Метаболизм на 20% ниже
    else:
        neuter_multiplier = 1.0
    
    # 4. КОРРЕКЦИЯ ПО ВЕСУ (целевой вес vs текущий)
    ideal_weight = (breed_data.weight_min + breed_data.weight_max) / 2
    weight_ratio = pet.weight / ideal_weight
    
    if weight_ratio > 1.15:  # Избыточный вес (>15% от нормы)
        weight_multiplier = 0.7  # Диета
        target_weight = ideal_weight
    elif weight_ratio < 0.85:  # Недостаточный вес (<15% от нормы)
        weight_multiplier = 1.3  # Набор веса
        target_weight = ideal_weight
    else:
        weight_multiplier = 1.0
        target_weight = pet.weight
    
    # 5. КОРРЕКЦИЯ ПО ПОРОДЕ (специфика метаболизма)
    breed_metabolic_rate = {
        'giant': 0.9,    # Крупные породы: медленный метаболизм
        'large': 0.95,
        'medium': 1.0,
        'small': 1.1,    # Маленькие породы: быстрый метаболизм
        'toy': 1.2
    }
    
    breed_factor = breed_metabolic_rate.get(breed_data.size_category, 1.0)
    
    # ИТОГОВЫЙ РАСЧЕТ
    der = rer * age_multiplier * activity_factor * neuter_multiplier * weight_multiplier * breed_factor
    
    return {
        'rer': rer,
        'der': round(der),
        'target_weight': target_weight,
        'factors': {
            'age': age_multiplier,
            'activity': activity_factor,
            'neutered': neuter_multiplier,
            'weight_adjustment': weight_multiplier,
            'breed': breed_factor
        }
    }

# Пример:
# Лабрадор, 8 лет, 40 кг (избыток), стерилизован, низкая активность
# RER = 1156 ккал
# DER = 1156 * 1.2 (возраст) * 1.0 (активность) * 0.8 (стерилизация) * 0.7 (диета) * 0.95 (порода)
# DER = 734 ккал/день
```

---

## 3. Расчет БЖУ

### 3.1. Потребность в белке

```python
def calculate_protein_needs(pet, breed_data, nutrition_data):
    """
    Расчет потребности в белке
    """
    age_years = calculate_age_years(pet.date_of_birth)
    
    # БАЗОВАЯ ПОТРЕБНОСТЬ
    if pet.species == 'dog':
        if age_years < 1:  # Щенки
            protein_min_percent = 22  # Минимум 22%
            protein_optimal_percent = 28
        elif age_years > 7:  # Пожилые
            protein_min_percent = 18
            protein_optimal_percent = 24
        else:  # Взрослые
            protein_min_percent = 18
            protein_optimal_percent = 25
    
    elif pet.species == 'cat':
        if age_years < 1:  # Котята
            protein_min_percent = 30
            protein_optimal_percent = 40
        else:  # Взрослые и пожилые
            protein_min_percent = 26
            protein_optimal_percent = 35
    
    # КОРРЕКЦИЯ ПО АКТИВНОСТИ
    if pet.activity_level == 'high':
        protein_optimal_percent += 5  # +5% для активных
    
    # КОРРЕКЦИЯ ПО ПОРОДЕ
    if nutrition_data and nutrition_data.protein_need == 'very_high':
        protein_optimal_percent += 5
    elif nutrition_data and nutrition_data.protein_need == 'high':
        protein_optimal_percent += 2
    
    # КОРРЕКЦИЯ ПО ЗДОРОВЬЮ
    if 'почечная недостаточность' in pet.health_issues:
        # При почечных проблемах - СНИЖАЕМ белок
        protein_optimal_percent = protein_min_percent
    
    if 'потеря мышечной массы' in pet.health_issues:
        # При саркопении - ПОВЫШАЕМ белок
        protein_optimal_percent += 5
    
    return {
        'min_percent': protein_min_percent,
        'optimal_percent': protein_optimal_percent,
        'max_percent': min(protein_optimal_percent + 10, 45)  # Не более 45%
    }
```

### 3.2. Потребность в жире

```python
def calculate_fat_needs(pet):
    """
    Расчет потребности в жире
    """
    age_years = calculate_age_years(pet.date_of_birth)
    
    # БАЗОВАЯ ПОТРЕБНОСТЬ
    if pet.species == 'dog':
        if age_years < 1:  # Щенки
            fat_min_percent = 8
            fat_optimal_percent = 15
        else:
            fat_min_percent = 5
            fat_optimal_percent = 12
    
    elif pet.species == 'cat':
        fat_min_percent = 9
        fat_optimal_percent = 18
    
    # КОРРЕКЦИЯ ПО АКТИВНОСТИ
    if pet.activity_level == 'high':
        fat_optimal_percent += 3  # Активным нужно больше энергии
    elif pet.activity_level == 'low':
        fat_optimal_percent -= 2  # Малоактивным - меньше
    
    # КОРРЕКЦИЯ ПО ВЕСУ
    if 'лишний вес' in pet.health_issues:
        fat_optimal_percent = max(fat_min_percent, fat_optimal_percent - 5)
    
    # КОРРЕКЦИЯ ПО ЗДОРОВЬЮ
    if 'панкреатит' in pet.health_issues:
        fat_optimal_percent = max(fat_min_percent, 8)  # Низкожировая диета
    
    if 'проблемы с кожей' in pet.health_issues:
        # Омега-3 и Омега-6 важны
        fat_optimal_percent += 2
    
    return {
        'min_percent': fat_min_percent,
        'optimal_percent': fat_optimal_percent,
        'max_percent': min(fat_optimal_percent + 8, 25)
    }
```

### 3.3. Расчет граммов БЖУ

```python
def calculate_macros_grams(der, protein_percent, fat_percent):
    """
    Расчет граммов БЖУ на основе калорий и процентов
    
    Калорийность:
    - Белки: 4 ккал/г
    - Жиры: 9 ккал/г
    - Углеводы: 4 ккал/г
    """
    
    # Калории из белка
    protein_calories = der * (protein_percent / 100)
    protein_grams = protein_calories / 4
    
    # Калории из жира
    fat_calories = der * (fat_percent / 100)
    fat_grams = fat_calories / 9
    
    # Оставшиеся калории - углеводы
    carbs_calories = der - protein_calories - fat_calories
    carbs_grams = carbs_calories / 4
    carbs_percent = (carbs_calories / der) * 100
    
    return {
        'protein': {
            'grams': round(protein_grams, 1),
            'calories': round(protein_calories),
            'percent': protein_percent
        },
        'fat': {
            'grams': round(fat_grams, 1),
            'calories': round(fat_calories),
            'percent': fat_percent
        },
        'carbs': {
            'grams': round(carbs_grams, 1),
            'calories': round(carbs_calories),
            'percent': round(carbs_percent, 1)
        }
    }

# Пример:
# DER = 1000 ккал, белок 28%, жир 15%
# Белок: 280 ккал / 4 = 70г
# Жир: 150 ккал / 9 = 16.7г
# Углеводы: 570 ккал / 4 = 142.5г
```

---

## 4. Алгоритм подбора корма

### 4.1. Фильтрация кормов

```python
def filter_suitable_foods(pet, breed_data, nutrition_data, der_data, macro_data):
    """
    Многоступенчатая фильтрация кормов
    """
    
    # ШАГ 1: БАЗОВАЯ ФИЛЬТРАЦИЯ
    foods = Product.objects.filter(
        category='food',
        animal=pet.species,
        is_active=True,
        in_stock=True
    )
    
    # ШАГ 2: ПО ВОЗРАСТУ
    age_category = calculate_age_category(pet.date_of_birth)
    foods = foods.filter(
        Q(nutrition_params__age_group=age_category) |
        Q(nutrition_params__age_group='all')
    )
    
    # ШАГ 3: ПО РАЗМЕРУ ПОРОДЫ
    foods = foods.filter(
        Q(nutrition_params__size_category=breed_data.size_category) |
        Q(nutrition_params__size_category='all')
    )
    
    # ШАГ 4: ИСКЛЮЧЕНИЕ АЛЛЕРГЕНОВ (КРИТИЧНО!)
    if pet.allergies:
        for allergen in pet.allergies:
            foods = foods.exclude(
                nutrition_params__ingredients__icontains=allergen.lower()
            )
    
    # ШАГ 5: ПО ПРОБЛЕМАМ ЗДОРОВЬЯ
    if pet.health_issues:
        health_filters = []
        
        if 'чувствительное пищеварение' in pet.health_issues:
            health_filters.append('digestive_health')
        if 'лишний вес' in pet.health_issues:
            health_filters.append('weight_management')
        if 'проблемы с суставами' in pet.health_issues:
            health_filters.append('joint_support')
        if 'мочекаменная болезнь' in pet.health_issues:
            health_filters.append('urinary_health')
        if 'проблемы с кожей' in pet.health_issues:
            health_filters.append('skin_coat')
        if 'диабет' in pet.health_issues:
            health_filters.append('diabetes_management')
        
        if health_filters:
            foods = foods.filter(
                nutrition_params__health_benefits__overlap=health_filters
            )
    
    # ШАГ 6: ПО ПОРОДОСПЕЦИФИЧНЫМ РИСКАМ
    breed_health_risks = get_breed_health_risks(pet.breed)
    breed_filters = []
    
    for risk in breed_health_risks:
        condition_lower = risk['condition_name'].lower()
        if 'дисплазия' in condition_lower or 'сустав' in condition_lower:
            breed_filters.append('joint_support')
        elif 'сердц' in condition_lower or 'кардио' in condition_lower:
            breed_filters.append('cardiac_health')
        elif 'кож' in condition_lower or 'дерматит' in condition_lower:
            breed_filters.append('skin_coat')
    
    if breed_filters:
        foods = foods.filter(
            Q(nutrition_params__health_benefits__overlap=breed_filters) |
            Q(nutrition_params__supplements__overlap=['glucosamine', 'chondroitin', 'omega_3'])
        )
    
    # ШАГ 7: ПО КАЛОРИЙНОСТИ
    target_calorie_density = calculate_target_calorie_density(
        pet, breed_data, der_data
    )
    
    if target_calorie_density == 'low':
        # Для диеты
        foods = foods.filter(
            nutrition_params__calories_per_100g__lte=340
        )
    elif target_calorie_density == 'high':
        # Для активных / набора веса
        foods = foods.filter(
            nutrition_params__calories_per_100g__gte=370
        )
    
    # ШАГ 8: ПО СОДЕРЖАНИЮ БЕЛКА
    optimal_protein = macro_data['protein']['percent']
    foods = foods.filter(
        nutrition_params__protein_percent__gte=optimal_protein - 5,
        nutrition_params__protein_percent__lte=optimal_protein + 5
    )
    
    # ШАГ 9: ДЛЯ БРАХИЦЕФАЛОВ
    if breed_data.brachycephalic:
        foods = foods.filter(
            Q(nutrition_params__brachycephalic_friendly=True) |
            Q(nutrition_params__features__contains=['small_kibble'])
        )
    
    # ШАГ 10: ПРЕДПОЧТЕНИЯ ПО ТИПУ КОРМА
    if nutrition_data and nutrition_data.diet_type:
        foods = foods.filter(
            nutrition_params__food_type=nutrition_data.diet_type
        )
    
    return foods


def calculate_target_calorie_density(pet, breed_data, der_data):
    """
    Определение целевой калорийности корма
    """
    ideal_weight = (breed_data.weight_min + breed_data.weight_max) / 2
    weight_ratio = pet.weight / ideal_weight
    
    if weight_ratio > 1.15:  # Избыточный вес
        return 'low'
    elif weight_ratio < 0.85:  # Недостаточный вес
        return 'high'
    elif pet.activity_level == 'high':
        return 'high'
    else:
        return 'medium'
```

### 4.2. Скоринг и ранжирование

```python
def rank_foods_by_relevance(foods, pet, breed_data, macro_data):
    """
    Расчет релевантности каждого корма
    """
    
    scored_foods = []
    
    for food in foods:
        score = 0
        reasons = []
        
        # +30 баллов: ТОЧНОЕ СОВПАДЕНИЕ ПО БЕЛКУ
        protein_diff = abs(
            food.nutrition_params['protein_percent'] - macro_data['protein']['percent']
        )
        if protein_diff <= 2:
            score += 30
            reasons.append("Идеальное содержание белка")
        elif protein_diff <= 5:
            score += 15
        
        # +25 баллов: ЕСТЬ ВСЕ НУЖНЫЕ ДОБАВКИ
        required_supplements = determine_required_supplements(pet, breed_data)
        food_supplements = food.nutrition_params.get('supplements', [])
        
        matching_supplements = set(required_supplements) & set(food_supplements)
        if len(matching_supplements) == len(required_supplements):
            score += 25
            reasons.append(f"Содержит все нужные добавки: {', '.join(matching_supplements)}")
        elif len(matching_supplements) > 0:
            score += 10 * len(matching_supplements)
        
        # +20 баллов: СПЕЦИАЛИЗИРОВАННЫЙ КОРМ
        if food.nutrition_params.get('diet_type') != 'standard':
            score += 20
            reasons.append(f"Специализированный: {food.nutrition_params['diet_type']}")
        
        # +15 баллов: ВЫСОКОЕ КАЧЕСТВО
        quality_scores = {
            'holistic': 15,
            'super_premium': 12,
            'premium': 8,
            'economy': 0
        }
        quality = food.nutrition_params.get('quality_class', 'premium')
        score += quality_scores.get(quality, 0)
        
        if quality in ['holistic', 'super_premium']:
            reasons.append(f"Высокое качество: {quality}")
        
        # +10 баллов: БЕЗЗЕРНОВОЙ (если аллергии)
        if food.nutrition_params.get('grain_free') and pet.allergies:
            score += 10
            reasons.append("Беззерновой корм")
        
        # +10 баллов: ОДИН ИСТОЧНИК БЕЛКА (при аллергиях)
        if 'single_protein' in food.nutrition_params.get('features', []):
            if pet.allergies:
                score += 10
                reasons.append("Один источник белка")
        
        # +10 баллов: ПОРОДОСПЕЦИФИЧНЫЙ
        if food.nutrition_params.get('breed_specific'):
            recommended_breeds = food.nutrition_params.get('recommended_breeds', [])
            if pet.breed in recommended_breeds:
                score += 10
                reasons.append(f"Специально для породы {breed_data.name}")
        
        # +5 баллов: НАТУРАЛЬНЫЙ СОСТАВ
        if food.nutrition_params.get('natural'):
            score += 5
        
        # +5 баллов: БЕЗ ИСКУССТВЕННЫХ ДОБАВОК
        features = food.nutrition_params.get('features', [])
        if 'no_artificial_colors' in features and 'no_preservatives' in features:
            score += 5
        
        # ШТРАФЫ
        
        # -20 баллов: КАЛОРИЙНОСТЬ НЕ ТА
        target_density = calculate_target_calorie_density(pet, breed_data, None)
        actual_density = food.nutrition_params.get('calorie_density', 'medium')
        
        if target_density == 'low' and actual_density == 'high':
            score -= 20
        elif target_density == 'high' and actual_density == 'low':
            score -= 20
        
        # -15 баллов: НИЗКОЕ КАЧЕСТВО
        if quality == 'economy':
            score -= 15
        
        # -10 баллов: СОДЕРЖИТ АЛЛЕРГЕНЫ (не должно попасть после фильтрации, но проверим)
        if pet.allergies:
            ingredients = food.nutrition_params.get('ingredients', [])
            if any(allergen.lower() in ingredients for allergen in pet.allergies):
                score -= 50  # Критический штраф
                reasons.append("⚠️ СОДЕРЖИТ АЛЛЕРГЕН!")
        
        scored_foods.append({
            'food': food,
            'score': score,
            'reasons': reasons
        })
    
    # Сортировка по убыванию релевантности
    scored_foods.sort(key=lambda x: x['score'], reverse=True)
    
    return scored_foods


def determine_required_supplements(pet, breed_data):
    """
    Определение необходимых добавок
    """
    supplements = []
    
    # По возрасту
    age_years = calculate_age_years(pet.date_of_birth)
    if age_years > 7:
        supplements.extend(['glucosamine', 'chondroitin'])  # Суставы для пожилых
    
    # По здоровью
    if 'проблемы с суставами' in pet.health_issues:
        supplements.extend(['glucosamine', 'chondroitin'])
    
    if 'проблемы с кожей' in pet.health_issues:
        supplements.extend(['omega_3', 'omega_6'])
    
    if 'чувствительное пищеварение' in pet.health_issues:
        supplements.append('probiotics')
    
    if 'лишний вес' in pet.health_issues:
        supplements.append('l_carnitine')
    
    # По породе
    breed_risks = get_breed_health_risks(pet.breed)
    for risk in breed_risks:
        condition_lower = risk['condition_name'].lower()
        if 'дисплазия' in condition_lower or 'сустав' in condition_lower:
            supplements.extend(['glucosamine', 'chondroitin'])
        elif 'сердц' in condition_lower:
            supplements.extend(['taurine', 'omega_3'])
    
    # Для кошек таурин обязателен
    if pet.species == 'cat':
        supplements.append('taurine')
    
    return list(set(supplements))  # Убираем дубликаты
```

---

## 5. Расчет порций

### 5.1. Базовый расчет порции

```python
def calculate_daily_portion(pet, food, der):
    """
    Расчет дневной порции корма в граммах
    """
    
    # Калорийность корма (ккал на 100г)
    food_calories_per_100g = food.nutrition_params['calories_per_100g']
    
    # Дневная порция в граммах
    daily_portion_grams = (der / food_calories_per_100g) * 100
    
    return round(daily_portion_grams)

# Пример:
# DER = 800 ккал
# Корм = 360 ккал/100г
# Порция = (800 / 360) * 100 = 222г в день
```

### 5.2. Разбивка на приемы пищи

```python
def calculate_feeding_schedule(pet, daily_portion_grams):
    """
    Расчет частоты и размера порций
    """
    age_years = calculate_age_years(pet.date_of_birth)
    
    # ОПРЕДЕЛЕНИЕ ЧАСТОТЫ КОРМЛЕНИЯ
    if age_years < 0.25:  # До 3 месяцев
        meals_per_day = 4
    elif age_years < 0.5:  # 3-6 месяцев
        meals_per_day = 3
    elif age_years < 1:  # 6-12 месяцев
        meals_per_day = 2-3
    else:  # Взрослые
        if pet.species == 'cat':
            meals_per_day = 2  # Кошки: 2 раза в день
        else:  # Собаки
            if daily_portion_grams > 400:
                meals_per_day = 2  # Крупные собаки: 2 раза
            else:
                meals_per_day = 2  # Все собаки: 2 раза
    
    # РАСЧЕТ РАЗМЕРА ПОРЦИИ ЗА РАЗ
    portion_per_meal = daily_portion_grams / meals_per_day
    
    # РЕКОМЕНДУЕМОЕ ВРЕМЯ КОРМЛЕНИЯ
    if meals_per_day == 2:
        feeding_times = ['08:00', '18:00']
    elif meals_per_day == 3:
        feeding_times = ['08:00', '14:00', '20:00']
    elif meals_per_day == 4:
        feeding_times = ['07:00', '12:00', '17:00', '21:00']
    
    return {
        'meals_per_day': meals_per_day,
        'portion_per_meal_grams': round(portion_per_meal),
        'feeding_times': feeding_times,
        'daily_total_grams': daily_portion_grams
    }
```

### 5.3. Корректировка порций

```python
def adjust_portion_for_weight_goal(pet, breed_data, daily_portion):
    """
    Корректировка порции для достижения целевого веса
    """
    ideal_weight = (breed_data.weight_min + breed_data.weight_max) / 2
    current_weight = pet.weight
    
    if current_weight > ideal_weight * 1.15:
        # Избыточный вес: снижение порции
        target_weight_loss_kg = current_weight - ideal_weight
        weeks_to_goal = target_weight_loss_kg / 0.5  # Безопасно: 0.5 кг в неделю
        
        # Снижаем порцию на 25%
        adjusted_portion = daily_portion * 0.75
        
        return {
            'adjusted_portion': round(adjusted_portion),
            'goal': 'weight_loss',
            'target_weight': ideal_weight,
            'current_weight': current_weight,
            'estimated_weeks': round(weeks_to_goal),
            'recommendation': f"Снижение веса с {current_weight} кг до {ideal_weight} кг за {round(weeks_to_goal)} недель"
        }
    
    elif current_weight < ideal_weight * 0.85:
        # Недостаточный вес: увеличение порции
        target_weight_gain_kg = ideal_weight - current_weight
        weeks_to_goal = target_weight_gain_kg / 0.3  # Безопасно: 0.3 кг в неделю
        
        # Увеличиваем порцию на 30%
        adjusted_portion = daily_portion * 1.3
        
        return {
            'adjusted_portion': round(adjusted_portion),
            'goal': 'weight_gain',
            'target_weight': ideal_weight,
            'current_weight': current_weight,
            'estimated_weeks': round(weeks_to_goal),
            'recommendation': f"Набор веса с {current_weight} кг до {ideal_weight} кг за {round(weeks_to_goal)} недель"
        }
    
    else:
        # Вес в норме: поддержание
        return {
            'adjusted_portion': daily_portion,
            'goal': 'maintain',
            'target_weight': current_weight,
            'current_weight': current_weight,
            'recommendation': "Вес в норме, поддерживаем текущую порцию"
        }
```

---

## 6. Примеры для разных сценариев

### Пример 1: Щенок Лабрадора (4 месяца, 15 кг)

```python
pet = {
    'species': 'dog',
    'breed': 'Labrador Retriever',
    'date_of_birth': '2025-09-12',  # 4 месяца назад
    'weight': 15,
    'activity_level': 'high',
    'is_neutered': False,
    'health_issues': [],
    'allergies': []
}

breed_data = {
    'size_category': 'large',
    'weight_min': 25,
    'weight_max': 35,
    'energy_level': 'high'
}

# РАСЧЕТ:
# 1. RER = 70 * (15^0.75) = 550 ккал
# 2. DER = 550 * 2.0 (щенок) * 1.4 (активность) * 1.0 (не стерилизован) * 0.95 (крупная порода) = 1463 ккал
# 3. Белок: 28%, Жир: 15%
# 4. Порция: Корм 380 ккал/100г → 385г в день
# 5. Кормление: 3 раза по 128г (08:00, 14:00, 20:00)

recommended_food = {
    'name': 'Royal Canin Labrador Puppy',
    'nutrition_params': {
        'age_group': 'puppy',
        'size_category': 'large',
        'protein_percent': 30,
        'fat_percent': 14,
        'calories_per_100g': 380,
        'health_benefits': ['bone_development', 'immune_support'],
        'quality_class': 'super_premium'
    }
}
```

### Пример 2: Взрослая кошка с аллергией (5 лет, 4.5 кг)

```python
pet = {
    'species': 'cat',
    'breed': 'British Shorthair',
    'date_of_birth': '2021-03-10',
    'weight': 4.5,
    'activity_level': 'low',
    'is_neutered': True,
    'health_issues': ['чувствительное пищеварение'],
    'allergies': ['курица', 'пшеница']
}

breed_data = {
    'size_category': 'medium',
    'weight_min': 4,
    'weight_max': 8,
    'energy_level': 'medium'
}

# РАСЧЕТ:
# 1. RER = 70 * (4.5^0.75) = 194 ккал
# 2. DER = 194 * 1.6 (взрослая) * 1.0 (низкая активность) * 0.8 (стерилизована) = 248 ккал
# 3. Белок: 35%, Жир: 16%
# 4. Порция: Корм 390 ккал/100г → 64г в день
# 5. Кормление: 2 раза по 32г (08:00, 18:00)

recommended_food = {
    'name': 'Hill\'s Prescription Diet z/d',
    'nutrition_params': {
        'age_group': 'adult',
        'size_category': 'all',
        'protein_percent': 36,
        'fat_percent': 17,
        'calories_per_100g': 390,
        'diet_type': 'hypoallergenic',
        'health_benefits': ['digestive_health', 'allergy_management'],
        'features': ['single_protein', 'grain_free', 'limited_ingredients'],
        'main_protein_source': 'hydrolyzed_chicken',  # Гидролизованный - не аллерген
        'grain_free': True,
        'quality_class': 'super_premium'
    }
}
```

### Пример 3: Пожилая собака с избыточным весом (10 лет, 40 кг, дисплазия)

```python
pet = {
    'species': 'dog',
    'breed': 'Labrador Retriever',
    'date_of_birth': '2016-05-20',
    'weight': 40,
    'activity_level': 'low',
    'is_neutered': True,
    'health_issues': ['лишний вес', 'проблемы с суставами'],
    'allergies': []
}

breed_data = {
    'size_category': 'large',
    'weight_min': 25,
    'weight_max': 35,
    'energy_level': 'high'
}

# РАСЧЕТ:
# 1. RER = 70 * (40^0.75) = 1156 ккал
# 2. DER = 1156 * 1.2 (пожилая) * 1.0 (низкая активность) * 0.8 (стерилизована) * 0.7 (диета) * 0.95 (крупная) = 734 ккал
# 3. Белок: 26%, Жир: 10%
# 4. Целевой вес: 30 кг (снижение на 10 кг за 20 недель)
# 5. Порция: Корм 310 ккал/100г → 237г в день
# 6. Кормление: 2 раза по 118г (08:00, 18:00)

recommended_food = {
    'name': 'Royal Canin Labrador Adult 5+ Light',
    'nutrition_params': {
        'age_group': 'senior',
        'size_category': 'large',
        'protein_percent': 27,
        'fat_percent': 10,
        'calories_per_100g': 310,
        'diet_type': 'weight_control',
        'health_benefits': ['weight_management', 'joint_support', 'cardiac_health'],
        'supplements': ['glucosamine', 'chondroitin', 'l_carnitine', 'omega_3'],
        'features': ['high_protein', 'low_fat', 'senior_formula'],
        'quality_class': 'super_premium'
    }
}
```

---

## Выводы

### Ключевые принципы подбора корма:

1. ✅ **Индивидуальный подход** - учет всех факторов (возраст, вес, активность, здоровье)
2. ✅ **Исключение аллергенов** - критический фактор безопасности
3. ✅ **Целевые проблемы здоровья** - специализированные корма
4. ✅ **Качество состава** - приоритет на натуральные ингредиенты
5. ✅ **Контроль веса** - корректировка калорийности и порций
6. ✅ **Породоспецифичность** - учет генетических рисков

### Минимальные требования к данным товаров:

Для работы алгоритма **каждый корм** должен иметь в `nutrition_params`:
- `age_group` (puppy/adult/senior)
- `size_category` (toy/small/medium/large/giant)
- `protein_percent`, `fat_percent`, `calories_per_100g`
- `ingredients` (полный список для исключения аллергенов)
- `diet_type` (standard/weight_control/sensitive/hypoallergenic)
- `health_benefits` (массив целевых проблем)

Без этих данных персонализированный подбор корма **невозможен**.

---

**Дата:** 12 января 2026  
**Версия:** 1.0

