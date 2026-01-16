# Структура базы данных пород собак и кошек по FCI и CFA

## Оглавление

- [1. Основные принципы построения базы данных](#1-основные-принципы-построения-базы-данных)
- [2. Таблицы для собак (Dogs)](#2-таблицы-для-собак-dogs)
  - [2.1 Основная таблица: `dog_breeds`](#21-основная-таблица-dog_breeds)
  - [2.2 Таблица размеров и активности: `breed_specificity`](#22-таблица-размеров-и-активности-breed_specificity)
  - [2.3 Связь с заболеваниями: `breed_health_issues`](#23-связь-с-заболеваниями-breed_health_issues)
  - [2.4 Связь с аллергиями: `breed_allergies`](#24-связь-с-аллергиями-breed_allergies)
  - [2.5 Связь с пищевыми непереносимостями: `breed_food_intolerances`](#25-связь-с-пищевыми-непереносимостями-breed_food_intolerances)
  - [2.6 Связь с проблемами воспитания: `breed_training_issues`](#26-связь-с-проблемами-воспитания-breed_training_issues)
- [3. Таблицы для кошек (Cats)](#3-таблицы-для-кошек-cats)
  - [3.1 Структура таблиц для кошек](#31-структура-таблиц-для-кошек)
- [4. Общие справочники (References)](#4-общие-справочники-references)
  - [4.1 Справочник заболеваний: `health_issues`](#41-справочник-заболеваний-health_issues)
  - [4.2 Справочник аллергий: `allergies`](#42-справочник-аллергий-allergies)
  - [4.3 Справочник пищевых непереносимостей: `food_intolerances`](#43-справочник-пищевых-непереносимостей-food_intolerances)
  - [4.4 Справочник проблем воспитания: `training_issues`](#44-справочник-проблем-воспитания-training_issues)
- [5. Примеры и рекомендации](#5-примеры-и-рекомендации)

## 1. Основные принципы построения базы данных

1. **Единая запись на породу**: Каждая порода имеет только одну запись в основной таблице
2. **Отдельные таблицы для изменяемых характеристик**: Характеристики, зависящие от возраста и пола, вынесены в отдельные связанные таблицы
3. **Иерархическая классификация**: Соблюдение официальной классификации FCI (для собак) и CFA/TICA (для кошек)
4. **Универсальные справочники**: Общие справочники для собак и кошек с полем `animal_type`
5. **Избежание дублирования**: Все общие данные хранятся в справочниках, связанные таблицы содержат только ссылки и специфические данные

[К оглавлению](#оглавление)

## 2. Таблицы для собак (Dogs)

### 2.1 Основная таблица: `dog_breeds`

### Постоянные характеристики породы (не зависят от возраста/пола)

| Поле | Тип | Ограничения | Источник данных | Описание |
|------|-----|-------------|----------------|----------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Генерируется БД | Уникальный идентификатор породы |
| `name_ru` | String(255) | NOT NULL | Перевод названий с английского/оригинального | Название породы на русском |
| `fci_number` | Integer |NOT NULL, CHECK (fci_number > 0) | Официальный сайт FCI (http://www.fci.be) | Официальный номер породы по FCI |
| `fci_group` | Integer | NOT NULL, CHECK (fci_group BETWEEN 1 AND 10) | Официальный сайт FCI | Группа FCI (1-10) |
| `fci_section` | Integer | NULL, CHECK (fci_section > 0) | Официальный сайт FCI | Секция внутри группы |
| `fci_subsection` | Integer | NULL, CHECK (fci_subsection > 0) | Официальный сайт FCI | Подсекция |
| `country_origin` | String(100) | NOT NULL | Официальный стандарт FCI породы | Страна происхождения |
| `purpose` | String(100) | NOT NULL, CHECK (purpose IN ('Hunting', 'Herding', 'Guarding', 'Companion', 'Working', 'Sporting', 'Sled', 'Terrier', 'Scent Hound', 'Sighthound', 'Pointing', 'Retrieving', 'Water Dog', 'Toy', 'Primitive')) | Официальный стандарт FCI породы | Предназначение породы по классификации FCI (Hunting=охота, Herding=пастушья, Guarding=охрана, Companion=компаньон, Working=рабочий, Sporting=спортивный, Sled=ездовой, Terrier=терьер, Scent Hound=гончий, Sighthound=борзой, Pointing=легавая, Retrieving=ретривер, Water Dog=водяной, Toy=декоративный, Primitive=примитивный) |
| `short_description` | Text | NOT NULL | Официальный стандарт FCI породы | Краткое описание породы |
| `coat_type` | String(50) | NOT NULL, CHECK (coat_type IN ('Short/Smooth', 'Medium', 'Long', 'Wire/Wiry', 'Curly', 'Wavy', 'Silky', 'Double Coat', 'Single Coat', 'Hairless', 'Combination')) | Официальный стандарт FCI породы | Тип шерсти по классификации груминга (Short/Smooth=короткая, Medium=средняя, Long=длинная, Wire/Wiry=жесткая, Curly=кудрявая, Wavy=волнистая, Silky=шелковистая, Double Coat=двойная, Single Coat=одинарная, Hairless=без шерсти, Combination=комбинированная) |
| `size_category` | String(20) | NOT NULL, CHECK (size_category IN ('Toy', 'Small', 'Medium', 'Large', 'Giant')) | Расчет на основе веса взрослой особи по стандарту FCI | Базовая категория размера породы (Toy=до 3кг, Small=3-10кг, Medium=10-25кг, Large=25-45кг, Giant=45кг+).|
| `average_lifespan` | Integer | NOT NULL, CHECK (average_lifespan BETWEEN 5 AND 18) | Ветеринарные исследования, базы данных (AKC, KC, Purina, страховые компании). FCI не предоставляет официальные данные о продолжительности жизни | Средняя продолжительность жизни (лет).|
| `activity_level` | String(20) | NOT NULL, CHECK (activity_level IN ('Low', 'Moderate', 'High', 'Very High')) | Экспертная оценка на основе стандартов FCI | Базовый уровень активности породы. Реальная активность рассчитывается с учетом возраста|
| `trainability` | String(20) | NOT NULL, CHECK (trainability IN ('Easy', 'Moderate', 'Difficult')) | Экспертная оценка на основе характера породы | Обучаемость (Easy, Moderate, Difficult) |
| `created_at` | DateTime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Генерируется БД | Дата создания записи |
| `updated_at` | DateTime | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Генерируется БД | Дата последнего обновления |

### 2.2 Таблица размеров и активности: `breed_specificity`

### Характеристики размера, зависящие от возраста и пола

| Поле | Тип | Ограничения | Источник данных | Описание |
|------|-----|-------------|----------------|----------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Генерируется БД | Уникальный идентификатор |
| `breed_id` | Foreign Key (dog_breeds.id) | NOT NULL, FOREIGN KEY, INDEX | Ссылка на dog_breeds | Ссылка на породу |
| `gender` | String(10) | NOT NULL, CHECK (gender IN ('Male', 'Female')) | Расчет на основе биологических данных | Пол (Male, Female) |
| `age_category` | String(20) | NOT NULL, CHECK (age_category IN ('Puppy', 'Juvenile', 'Adult', 'Senior')) | Расчет на основе возраста | Категория возраста (Puppy, Juvenile, Adult, Senior) |
| `height_min_cm` | Decimal(5,1) | NOT NULL, CHECK (height_min_cm > 0 AND height_min_cm < 200) | Официальный стандарт FCI породы | Минимальный рост (см) |
| `height_max_cm` | Decimal(5,1) | NOT NULL, CHECK (height_max_cm > height_min_cm AND height_max_cm < 200) | Официальный стандарт FCI породы | Максимальный рост (см) |
| `weight_min_kg` | Decimal(5,2) | NOT NULL, CHECK (weight_min_kg > 0 AND weight_min_kg < 200) | Официальный стандарт FCI породы | Минимальный вес (кг) |
| `weight_max_kg` | Decimal(5,2) | NOT NULL, CHECK (weight_max_kg > weight_min_kg AND weight_max_kg < 200) | Официальный стандарт FCI породы | Максимальный вес (кг) |
| `activity_level` | String(20) | NOT NULL, CHECK (activity_level IN ('Low', 'Moderate', 'High', 'Very High')) | Расчет на основе возраста и базового уровня породы | Уровень активности с учетом возраста (Low=низкий, Moderate=умеренный, High=высокий, Very High=очень высокий) |

### 2.3 Связь с заболеваниями: `breed_health_issues`

### Связь пород с характерными заболеваниями (многие ко многим)

| Поле | Тип | Ограничения | Источник данных | Описание |
|------|-----|-------------|----------------|----------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Генерируется БД | Уникальный идентификатор связи |
| `breed_id` | Foreign Key (dog_breeds.id) | NOT NULL, FOREIGN KEY, INDEX | Ссылка на dog_breeds | Ссылка на породу |
| `health_issue_id` | Foreign Key (health_issues.id) | NOT NULL, FOREIGN KEY, INDEX | Ссылка на общий справочник health_issues | Ссылка на заболевание |
| `risk_level` | String(20) | NOT NULL, CHECK (risk_level IN ('Very Low', 'Low', 'Moderate', 'High', 'Very High')) | Ветеринарные исследования, статистика | Уровень риска для данной породы |
| `typical_age_onset` | String(50) | NULL | Ветеринарные данные | Типичный возраст проявления |
| `genetic_marker` | String(100) | NULL | Генетические исследования | Генетические маркеры (если применимо) |
| `screening_recommended` | Boolean | NOT NULL, DEFAULT FALSE | Ветеринарные рекомендации | Рекомендуется ли скрининг |
| `preventive_measures` | Text | NULL | Профилактические рекомендации | Меры профилактики для данной породы |
| `created_at` | DateTime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Генерируется БД | Дата создания связи |

### 2.4 Связь с аллергиями: `breed_allergies`

### Характерные аллергии пород

| Поле | Тип | Ограничения | Источник данных | Описание |
|------|-----|-------------|----------------|----------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Генерируется БД | Уникальный идентификатор аллергии |
| `breed_id` | Foreign Key (dog_breeds.id) | NOT NULL, FOREIGN KEY, INDEX | Ссылка на dog_breeds | Ссылка на породу |
| `allergy_id` | Foreign Key (allergies.id) | NOT NULL, FOREIGN KEY, INDEX | Ссылка на общий справочник allergies | Ссылка на аллергию |
| `prevalence_rate` | String(20) | NOT NULL, CHECK (prevalence_rate IN ('Rare', 'Uncommon', 'Common', 'Very Common')) | Статистика заболеваемости для данной породы | Частота встречаемости у данной породы (Rare=редко, Uncommon=нечасто, Common=часто, Very Common=очень часто) |
| `breed_specific_symptoms` | Text | NULL | Особенности проявления у породы | Особенности симптомов для данной породы |
| `breed_specific_management` | Text | NULL | Особенности лечения для породы | Особенности управления аллергией для данной породы |
| `created_at` | DateTime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Генерируется БД | Дата создания записи |

### 2.5 Связь с пищевыми непереносимостями: `breed_food_intolerances`

### Характерные пищевые непереносимости пород

| Поле | Тип | Ограничения | Источник данных | Описание |
|------|-----|-------------|----------------|----------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Генерируется БД | Уникальный идентификатор непереносимости |
| `breed_id` | Foreign Key (dog_breeds.id) | NOT NULL, FOREIGN KEY, INDEX | Ссылка на dog_breeds | Ссылка на породу |
| `food_intolerance_id` | Foreign Key (food_intolerances.id) | NOT NULL, FOREIGN KEY, INDEX | Ссылка на общий справочник food_intolerances | Ссылка на пищевую непереносимость |
| `prevalence_rate` | String(20) | NOT NULL, CHECK (prevalence_rate IN ('Rare', 'Uncommon', 'Common', 'Very Common')) | Статистика заболеваемости для данной породы | Частота встречаемости у данной породы |
| `breed_specific_symptoms` | Text | NULL | Особенности проявления у породы | Особенности симптомов для данной породы |
| `breed_specific_alternatives` | Text | NULL | Альтернативы для данной породы | Особые рекомендации по альтернативным продуктам для породы |
| `created_at` | DateTime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Генерируется БД | Дата создания записи |


## 4. Общие справочники (References)

### Справочник заболеваний: `health_issues` (расширенный)

| Поле | Тип | Ограничения | Источник данных | Описание |
|------|-----|-------------|----------------|----------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Генерируется БД | Уникальный идентификатор заболевания |
| `animal_type` | String(20) | NOT NULL, CHECK (animal_type IN ('Dog', 'Cat', 'Both')) | Классификация по видам | Вид животного (Dog=собака, Cat=кошка, Both=оба вида) |
| `name` | String(100) | NOT NULL | Ветеринарная литература, исследования | Название заболевания |
| `category` | String(50) | NOT NULL, CHECK (category IN ('Genetic', 'Age-related', 'Environmental', 'Infectious', 'Traumatic', 'Metabolic', 'Dental', 'Skin', 'Cardiovascular', 'Respiratory')) | Классификация по причинам | Категория заболевания |
| `severity_level` | String(20) | NOT NULL, CHECK (severity_level IN ('Low', 'Moderate', 'High', 'Critical')) | Оценка ветеринаров | Уровень серьезности |
| `common_symptoms` | Text | NOT NULL | Ветеринарные источники | Распространенные симптомы |
| `diagnostic_methods` | Text | NOT NULL | Ветеринарные протоколы | Методы диагностики заболевания |
| `treatment_options` | Text | NULL | Ветеринарные рекомендации | Варианты лечения |
| `prevention_tips` | Text | NULL | Профилактические меры | Советы по профилактике |
| `created_at` | DateTime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Генерируется БД | Дата создания записи |

### Справочник аллергий: `allergies`

| Поле | Тип | Ограничения | Источник данных | Описание |
|------|-----|-------------|----------------|----------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Генерируется БД | Уникальный идентификатор аллергии |
| `animal_type` | String(20) | NOT NULL, CHECK (animal_type IN ('Dog', 'Cat', 'Both')) | Классификация по видам | Вид животного (Dog=собака, Cat=кошка, Both=оба вида) |
| `allergen_type` | String(50) | NOT NULL, CHECK (allergen_type IN ('Environmental', 'Food', 'Flea', 'Contact', 'Drug', 'Seasonal')) | Тип аллергена | Тип аллергена |
| `specific_allergen` | String(100) | NOT NULL | Конкретный аллерген | Конкретный аллерген (Pollen, Chicken protein, Fleas, Dust mites, etc.) |
| `prevalence_rate` | String(20) | NOT NULL, CHECK (prevalence_rate IN ('Rare', 'Uncommon', 'Common', 'Very Common')) | Статистика заболеваемости | Частота встречаемости |
| `typical_symptoms` | Text | NOT NULL | Симптомы аллергии | Типичные симптомы аллергии |
| `diagnostic_approach` | Text | NOT NULL | Методы диагностики | Подход к диагностике |
| `management_strategies` | Text | NOT NULL | Стратегии управления | Способы управления аллергией |
| `seasonal_pattern` | String(50) | NULL | Сезонность проявления | Сезонные паттерны |
| `created_at` | DateTime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Генерируется БД | Дата создания записи |

### Справочник пищевых непереносимостей: `food_intolerances`

| Поле | Тип | Ограничения | Источник данных | Описание |
|------|-----|-------------|----------------|----------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Генерируется БД | Уникальный идентификатор непереносимости |
| `animal_type` | String(20) | NOT NULL, CHECK (animal_type IN ('Dog', 'Cat', 'Both')) | Классификация по видам | Вид животного (Dog=собака, Cat=кошка, Both=оба вида) |
| `food_component` | String(100) | NOT NULL | Пищевой компонент | Пищевой компонент, вызывающий непереносимость |
| `intolerance_type` | String(50) | NOT NULL, CHECK (intolerance_type IN ('Digestive', 'Metabolic', 'Immune', 'Genetic', 'Enzyme')) | Тип непереносимости | Тип непереносимости |
| `severity_level` | String(20) | NOT NULL, CHECK (severity_level IN ('Mild', 'Moderate', 'Severe')) | Степень выраженности | Уровень серьезности |
| `common_symptoms` | Text | NOT NULL | Симптомы непереносимости | Распространенные симптомы |
| `diagnostic_methods` | Text | NOT NULL | Методы диагностики | Способы диагностики |
| `alternative_foods` | Text | NOT NULL | Альтернативные продукты | Рекомендуемые альтернативные продукты |
| `prevention_tips` | Text | NULL | Профилактика | Советы по профилактике |
| `genetic_basis` | Boolean | NOT NULL, DEFAULT FALSE | Генетические исследования | Имеет ли генетическую основу |
| `created_at` | DateTime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Генерируется БД | Дата создания записи |

### Связанные таблицы для разных видов животных

### Связанные таблицы для разных видов животных:

#### **Для собак:**
- `breed_health_issues` - Связь пород собак с заболеваниями
- `breed_allergies` - Характерные аллергии пород собак
- `breed_food_intolerances` - Пищевые непереносимости пород собак

#### **Для кошек:**
- `cat_breed_health_issues` - Связь пород кошек с заболеваниями
- `cat_breed_allergies` - Характерные аллергии пород кошек
- `cat_breed_food_intolerances` - Пищевые непереносимости пород кошек

### Структура таблиц для кошек аналогична собачьим:

| Таблица | Описание | Особенности для кошек |
|---------|----------|----------------------|
| `cat_breeds` | Основная информация о породах кошек | Аналог dog_breeds, но с feline-спецификой |
| `cat_breed_health_issues` | Заболевания характерные для пород кошек | Высокий риск мочекаменной болезни, кардиомиопатии |
| `cat_breed_allergies` | Аллергии у кошек | Чаще пищевые и контактные аллергии |
| `cat_breed_food_intolerances` | Непереносимости у кошек | Чувствительность к углеводам, пуринам |


### 4.4 Справочник проблем воспитания: `training_issues`

### Стандартные проблемы поведения и воспитания

| Поле | Тип | Ограничения | Источник данных | Описание |
|------|-----|-------------|----------------|----------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Генерируется БД | Уникальный идентификатор проблемы |
| `animal_type` | String(20) | NOT NULL, CHECK (animal_type IN ('Dog', 'Cat', 'Both')) | Классификация по видам | Вид животного (Dog=собака, Cat=кошка, Both=оба вида) |
| `name` | String(100) | UNIQUE, NOT NULL | Кинологические источники | Название проблемы поведения |
| `category` | String(50) | NOT NULL, CHECK (category IN ('Aggression', 'Anxiety', 'Hyperactivity', 'Independence', 'Destructiveness', 'Hygiene', 'Socialization', 'Training', 'Hunting', 'Territorial')) | Классификация проблем | Категория проблемы (Aggression=агрессия, Anxiety=тревога, Hyperactivity=гиперактивность, Independence=независимость, Destructiveness=разрушительность, Hygiene=гигиена, Socialization=социализация, Training=обучение, Hunting=охота, Territorial=территориальность) |
| `severity_level` | String(20) | NOT NULL, CHECK (severity_level IN ('Low', 'Moderate', 'High', 'Critical')) | Оценка специалистов | Уровень серьезности проблемы |
| `description` | Text | NOT NULL | Поведенческие исследования | Описание проблемы и ее проявлений |
| `common_causes` | Text | NOT NULL | Этиология поведения | Распространенные причины возникновения |
| `behavioral_signs` | Text | NOT NULL | Наблюдения специалистов | Признаки и симптомы проблемы |
| `correction_methods` | Text | NOT NULL | Методы дрессировки | Способы коррекции поведения |
| `prevention_tips` | Text | NULL | Профилактические меры | Советы по профилактике |
| `professional_help` | Boolean | NOT NULL, DEFAULT FALSE | Рекомендации специалистов | Требуется ли помощь профессионала |
| `created_at` | DateTime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Генерируется БД | Дата создания записи |


### 2.6 Связь с проблемами воспитания: `breed_training_issues`

### Связь пород собак с проблемами воспитания

| Поле | Тип | Ограничения | Источник данных | Описание |
|------|-----|-------------|----------------|----------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Генерируется БД | Уникальный идентификатор связи |
| `breed_id` | Foreign Key (dog_breeds.id) | NOT NULL, FOREIGN KEY, INDEX | Ссылка на dog_breeds | Ссылка на породу собаки |
| `training_issue_id` | Foreign Key (training_issues.id) | NOT NULL, FOREIGN KEY, INDEX | Ссылка на training_issues | Ссылка на проблему воспитания |
| `risk_level` | String(20) | NOT NULL, CHECK (risk_level IN ('Very Low', 'Low', 'Moderate', 'High', 'Very High')) | Статистика по породе | Уровень риска проявления проблемы |
| `typical_age_onset` | String(50) | NULL | Наблюдения кинологов | Типичный возраст проявления |
| `genetic_influence` | String(20) | NOT NULL, CHECK (genetic_influence IN ('None', 'Low', 'Moderate', 'High', 'Very High')) | Генетические исследования | Степень генетического влияния |
| `breed_specific_notes` | Text | NULL | Специфика породы | Особенности проявления проблемы у данной породы |
| `correction_difficulty` | String(20) | NOT NULL, CHECK (correction_difficulty IN ('Easy', 'Moderate', 'Difficult', 'Very Difficult')) | Опыт дрессировщиков | Сложность коррекции для данной породы |
| `created_at` | DateTime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Генерируется БД | Дата создания связи |

[К оглавлению](#оглавление)

## 3. Таблицы для кошек (Cats)

### 3.1 Структура таблиц для кошек

**Примечание**: Таблицы для кошек имеют аналогичную структуру с таблицами для собак, но с префиксом `cat_` вместо `breed_`. Сами таблицы пока не созданы, но их структура будет идентична собачьим:

- `cat_breeds` - основная таблица пород кошек (аналог `dog_breeds`)
- `cat_breed_health_issues` - связь пород кошек с заболеваниями
- `cat_breed_allergies` - аллергии пород кошек
- `cat_breed_food_intolerances` - пищевые непереносимости пород кошек
- `cat_breed_training_issues` - проблемы воспитания пород кошек

Все таблицы кошек ссылаются на те же общие справочники (`health_issues`, `allergies`, `food_intolerances`, `training_issues`).

[К оглавлению](#оглавление)

## 5. Примеры и рекомендации

### 5.1 Примеры связей в базе данных

#### Заболевания:
- **Лабрадор**: Дисплазия тазобедренного сустава (High risk, диагностика: рентген, генетический тест)
- **Немецкая овчарка**: Дисплазия локтевого сустава (Very High risk, диагностика: рентген, OFA screening)

#### Аллергии:
- **Лабрадор**: Пищевая аллергия на курицу (Common, симптомы: зуд, диарея)
- **Золотистый ретривер**: Аллергия на блох (Very Common, симптомы: интенсивный зуд)

#### Пищевые непереносимости:
- **Немецкая овчарка**: Непереносимость глютена (Genetic, симптомы: диарея, вздутие)
- **Бульдог**: Непереносимость лактозы (Digestive, симптомы: диарея, газы)

#### Проблемы воспитания:
- **Лабрадор**: Hyperactivity (High risk), Destructiveness (Moderate)
- **Чихуахуа**: Aggression (High risk), Territorial (Very High)
- **Хаски**: Independence (Very High), Hunting (High)

### 5.2 Рекомендации по использованию

1. **Заполнение справочников**: Сначала заполняются общие справочники, затем создаются связи с породами
2. **Валидация данных**: Все CHECK constraints обеспечивают целостность данных
3. **Индексы**: Foreign keys автоматически индексируются для производительности
4. **Кэширование**: Часто используемые данные справочников кэшируются
5. **Аудит**: Все изменения логируются для отслеживания

[К оглавлению](#оглавление)

## 4. Общие справочники (References)
