# План развития полей товаров в магазине для подбора корма

## 📋 ПОЛНЫЙ СПИСОК ПОЛЕЙ ДЛЯ ПРОДУКТОВ В МАГАЗИНЕ

### 🔴 КРИТИЧЕСКИ ВАЖНЫЕ ПОЛЯ (для базового функционирования)

#### 1. **БАЗОВЫЕ ПОЛЯ ПРОДУКТА**
```python
# Уже есть в модели
external_id = models.CharField()          # ID из внешнего каталога
name = models.CharField()                 # Название товара
description = models.TextField()          # Полное описание
price = models.DecimalField()             # Цена
weight = models.DecimalField()            # Вес упаковки (кг)
vendor = models.CharField()               # Бренд/производитель
vendor_code = models.CharField()          # Артикул
barcode = models.CharField()              # Штрихкод

# ДОБАВИТЬ:
short_description = models.CharField(max_length=300)  # Краткое описание для карточек
product_form = models.CharField()        # Форма выпуска (гранулы, кусочки, палочки, паштет)
package_size = models.CharField()         # Размер упаковки (1кг, 400г, 85г пауч)
```

#### 2. **КАЛОРИЙНОСТЬ И ЭНЕРГЕТИЧЕСКАЯ ЦЕННОСТЬ** ✅
```python
# Уже есть
kcal_per_100g = models.DecimalField()     # ккал/100г - КРИТИЧЕСКИ ВАЖНО

# ДОБАВИТЬ:
kcal_per_kg = models.DecimalField()       # ккал/кг для больших расчётов
energy_density = models.CharField()       # Высокая/Средняя/Низкая калорийность
```

#### 3. **СОСТАВ И ПИТАТЕЛЬНЫЕ ВЕЩЕСТВА** ✅
```python
# БЖУ (уже есть)
nutrition_protein = models.DecimalField()  # Белок %
nutrition_fat = models.DecimalField()      # Жир %
nutrition_fiber = models.DecimalField()    # Клетчатка %
nutrition_moisture = models.DecimalField() # Влажность %
nutrition_ash = models.DecimalField()      # Зола %
nutrition_carbs = models.DecimalField()    # Углеводы % (ДОБАВИТЬ)

# ДОБАВИТЬ - БЖУ в абсолютных единицах (г/100г)
protein_g_per_100g = models.DecimalField()  # Белок г/100г
fat_g_per_100g = models.DecimalField()      # Жир г/100г
carbs_g_per_100g = models.DecimalField()    # Углеводы г/100г
fiber_g_per_100g = models.DecimalField()    # Клетчатка г/100г

# Минералы (уже есть базовые)
nutrition_calcium = models.DecimalField()   # Кальций %
nutrition_phosphorus = models.DecimalField() # Фосфор %
nutrition_omega3 = models.DecimalField()    # Омега-3 %
nutrition_omega6 = models.DecimalField()    # Омега-6 %

# ДОБАВИТЬ - Расширенные минералы (мг/кг)
magnesium_mg_per_kg = models.DecimalField()  # Магний мг/кг
potassium_mg_per_kg = models.DecimalField()  # Калий мг/кг
sodium_mg_per_kg = models.DecimalField()     # Натрий мг/кг
iron_mg_per_kg = models.DecimalField()       # Железо мг/кг
zinc_mg_per_kg = models.DecimalField()       # Цинк мг/кг
copper_mg_per_kg = models.DecimalField()     # Медь мг/кг
selenium_mg_per_kg = models.DecimalField()   # Селен мг/кг
iodine_mg_per_kg = models.DecimalField()     # Йод мг/кг

# ДОБАВИТЬ - Витамины (IU/кг или мг/кг)
vitamin_a_iu_per_kg = models.DecimalField()  # Витамин A IU/кг
vitamin_d_iu_per_kg = models.DecimalField()  # Витамин D IU/кг
vitamin_e_mg_per_kg = models.DecimalField()  # Витамин E мг/кг
vitamin_c_mg_per_kg = models.DecimalField()  # Витамин C мг/кг
vitamin_b1_mg_per_kg = models.DecimalField() # Витамин B1 мг/кг
vitamin_b2_mg_per_kg = models.DecimalField() # Витамин B2 мг/кг
vitamin_b6_mg_per_kg = models.DecimalField() # Витамин B6 мг/кг
vitamin_b12_mcg_per_kg = models.DecimalField() # Витамин B12 мкг/кг

# ДОБАВИТЬ - Аминокислоты (г/100г белка)
taurine_g_per_100g_protein = models.DecimalField()  # Таурин (важно для кошек)
methionine_g_per_100g_protein = models.DecimalField() # Метионин
cystine_g_per_100g_protein = models.DecimalField()    # Цистин
lysine_g_per_100g_protein = models.DecimalField()     # Лизин
arginine_g_per_100g_protein = models.DecimalField()   # Аргинин (важно для кошек)
```

---

## 🟡 ЭТАП 1: КРИТИЧЕСКИЕ ПОЛЯ (добавить в первую очередь)

### 4. **ИНГРЕДИЕНТЫ И СОСТАВ** ❌ (НЕТ в модели)
```python
# КРИТИЧЕСКИ ВАЖНО ДЛЯ АЛЛЕРГИЙ И ПОДБОРА
ingredients = models.JSONField()          # Полный список ингредиентов
                                         # [{"name": "курица", "percentage": 25.0, "source": "dehydrated"}, ...]

primary_protein_source = models.CharField() # Основной источник белка
secondary_protein_sources = models.JSONField() # Вторичные источники белка

# ДОБАВИТЬ - Детализация источников
protein_sources = models.JSONField()      # Все источники белка с %
carbs_sources = models.JSONField()        # Источники углеводов
fat_sources = models.JSONField()          # Источники жира
fiber_sources = models.JSONField()        # Источники клетчатки

# ДОБАВИТЬ - Качественные характеристики
grain_free = models.BooleanField(default=False)     # Беззерновой
limited_ingredient = models.BooleanField(default=False) # Ограниченный состав
single_protein = models.BooleanField(default=False) # Один источник белка
novel_protein = models.BooleanField(default=False)  # Новый источник белка
hydrolyzed_protein = models.BooleanField(default=False) # Гидролизованный белок
```

### 5. **ФИЗИЧЕСКИЕ ХАРАКТЕРИСТИКИ** ❌ (НЕТ в модели)
```python
# КРИТИЧЕСКИ ВАЖНО ДЛЯ ПОДБОРА
piece_size_mm = models.DecimalField()      # Размер кусочка (мм) - для щенков/котят
piece_weight_grams = models.DecimalField() # Вес одного кусочка (для лакомств)
pieces_per_100g = models.DecimalField()    # Количество кусочков в 100г

# ДОБАВИТЬ - Физические свойства
texture = models.CharField(choices=[
    ('dry_kibble', 'Сухие гранулы'),
    ('semi_moist', 'Полувлажные'),
    ('wet_pate', 'Влажный паштет'),
    ('wet_chunks', 'Влажные кусочки'),
    ('wet_jelly', 'Влажный в желе'),
    ('treats_dental', 'Лакомства для зубов'),
    ('treats_training', 'Дрессировочные лакомства'),
    ('treats_functional', 'Функциональные лакомства')
])

# ДОБАВИТЬ - Форма и размер
kibble_shape = models.CharField()          # Форма гранул (круглые, квадратные, треугольные)
kibble_size = models.CharField()           # Размер гранул (mini, small, medium, large)
```

### 6. **ДОЗА И ПРИМЕНЕНИЕ** ❌ (НЕТ в модели)
```python
# КРИТИЧЕСКИ ВАЖНО ДЛЯ ЛАКОМСТВ И ДОБАВОК
dosage_text = models.CharField()           # "1-2 таблетки в день"
intake_time = models.CharField()           # "утром с едой", "вечером"
intake_instructions = models.TextField()   # Подробные инструкции применения

# ДОБАВИТЬ - Для лакомств
max_daily_pieces = models.PositiveIntegerField()  # Максимум штук в день
max_daily_percentage = models.DecimalField()      # Максимум % от рациона

# ДОБАВИТЬ - Для добавок
supplement_type = models.CharField(choices=[
    ('vitamin', 'Витамин'),
    ('mineral', 'Минерал'),
    ('joint', 'Для суставов'),
    ('skin', 'Для кожи'),
    ('digestion', 'Для пищеварения'),
    ('immune', 'Иммунитет'),
    ('probiotic', 'Пробиотик'),
    ('omega', 'Омега жирные кислоты')
])

# ДОБАВИТЬ - Режим дозирования
dosing_frequency = models.CharField()      # "1 раз в день", "2 раза в день"
dosing_duration = models.CharField()       # "постоянно", "курсами по 30 дней"
```

---

## 🟡 ЭТАП 2: ВАЖНЫЕ ПОЛЯ (добавить во вторую очередь)

### 7. **ВОЗРАСТНЫЕ И РАЗМЕРНЫЕ ОГРАНИЧЕНИЯ** ✅ (расширить)
```python
# Уже есть
min_age_months = models.PositiveIntegerField() # Минимальный возраст
max_age_months = models.PositiveIntegerField() # Максимальный возраст
target_size = models.CharField()               # Целевой размер

# ДОБАВИТЬ - Более детальная категоризация
suitable_for_puppies = models.BooleanField(default=False)   # Для щенков
suitable_for_kittens = models.BooleanField(default=False)  # Для котят
suitable_for_juniors = models.BooleanField(default=False)  # Для юниоров
suitable_for_adults = models.BooleanField(default=False)   # Для взрослых
suitable_for_seniors = models.BooleanField(default=False)  # Для пожилых
suitable_for_giants = models.BooleanField(default=False)   # Для гигантов

# ДОБАВИТЬ - Специфические ограничения
max_daily_intake_grams = models.DecimalField() # Максимальная суточная доза
min_daily_intake_grams = models.DecimalField() # Минимальная суточная доза
```

### 8. **СПЕЦИАЛИЗАЦИЯ ПО СОСТОЯНИЮ ЗДОРОВЬЯ** ✅ (расширить)
```python
# Уже есть базовые
compatibility_group = models.CharField()   # Группа совместимости
allergens = models.JSONField()             # Аллергены в составе

# ДОБАВИТЬ - Детальные показания
indicated_for_obesity = models.BooleanField(default=False)    # Для ожирения
indicated_for_diabetes = models.BooleanField(default=False)   # Для диабета
indicated_for_kidney_disease = models.BooleanField(default=False) # Для почек
indicated_for_liver_disease = models.BooleanField(default=False)  # Для печени
indicated_for_pancreatitis = models.BooleanField(default=False)  # Для панкреатита
indicated_for_ibd = models.BooleanField(default=False)        # Для IBD
indicated_for_urinary = models.BooleanField(default=False)    # Для МКБ
indicated_for_skin = models.BooleanField(default=False)       # Для кожи
indicated_for_joints = models.BooleanField(default=False)     # Для суставов
indicated_for_dental = models.BooleanField(default=False)     # Для зубов
indicated_for_heart = models.BooleanField(default=False)      # Для сердца
indicated_for_thyroid = models.BooleanField(default=False)    # Для щитовидки

# ДОБАВИТЬ - Уровень доказательности
evidence_level = models.CharField(choices=[
    ('clinical_studies', 'Клинические исследования'),
    ('veterinary_recommendation', 'Рекомендация ветеринаров'),
    ('manufacturer_claim', 'Заявление производителя'),
    ('traditional', 'Традиционный подход')
])
```

---

## 📊 ПРИОРИТЕТЫ РЕАЛИЗАЦИИ

### Этап 1: Критические поля (сначала)
1. **Ингредиенты** (`ingredients`) - JSON с полным составом
2. **Физические характеристики** (`piece_size_mm`, `texture`, `kibble_shape`)
3. **Дозировка** (`dosage_text`, `max_daily_pieces`) - особенно для лакомств

### Этап 2: Важные поля (вторая очередь)
1. **Расширенные минералы** (8 дополнительных)
2. **Витамины** (8 витаминов)
3. **Показания по здоровью** (10+ специфических состояний)
4. **Абсолютные значения БЖУ** (г/100г)

---

## 💡 ВЫВОД

Для полноценной работы функции подбора корма **критически необходимо добавить минимум 15-20 полей**, особенно:

- **Ингредиенты** (полный состав для аллергий)
- **Физические характеристики** (размер кусочков для возраста)
- **Дозировка** (для лакомств и добавок)
- **Расширенные минералы и витамины**

Без этих полей алгоритм подбора будет работать в усечённом режиме и не сможет обеспечить **действительно персонализированные рекомендации**.

---

## 🔧 МИГРАЦИЯ БАЗЫ ДАННЫХ

```bash
# Создание миграции для новых полей
python manage.py makemigrations shop --name add_product_fields

# Применение миграции
python manage.py migrate shop
```

## 📝 ЗАПОЛНЕНИЕ ДАННЫХ

После добавления полей необходимо:
1. Создать скрипт импорта данных из внешних источников
2. Обновить существующие продукты
3. Проверить корректность расчётов в food_recommendation_service.py