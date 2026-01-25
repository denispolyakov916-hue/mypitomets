# Интеграция PetID, Breeds и Калькулятора калорий

## Оглавление

- [1. Общая архитектура](#1-общая-архитектура)
  - [1.1 Принцип работы](#11-принцип-работы)
  - [1.2 Диаграмма взаимодействия](#12-диаграмма-взаимодействия)
- [2. Структура таблицы PetID](#2-структура-таблицы-petid)
  - [2.1 Полный список полей](#21-полный-список-полей)
  - [2.2 Enum-типы](#22-enum-типы)
- [3. Этапы создания PetID](#3-этапы-создания-petid)
  - [3.1 Этап 1: Базовый профиль](#31-этап-1-базовый-профиль)
  - [3.2 Этап 2: Расширенный профиль (Паспорт питомца)](#32-этап-2-расширенный-профиль-паспорт-питомца)
- [4. Триггер автозаполнения](#4-триггер-автозаполнения)
  - [4.1 Логика триггера](#41-логика-триггера)
  - [4.2 Алгоритм определения размера](#42-алгоритм-определения-размера)
- [5. Связующие таблицы (M2M)](#5-связующие-таблицы-m2m)
  - [5.1 pet_health_conditions](#51-pet_health_conditions)
  - [5.2 pet_allergies](#52-pet_allergies)
  - [5.3 pet_food_exclusions](#53-pet_food_exclusions)
  - [5.4 pet_vaccinations](#54-pet_vaccinations)
  - [5.5 pet_medications](#55-pet_medications)
  - [5.6 pet_activities](#56-pet_activities)
  - [5.7 pet_other_pets](#57-pet_other_pets)
  - [5.8 pet_analysis_history](#58-pet_analysis_history)
- [6. Функция "Анализ питомца"](#6-функция-анализ-питомца)
  - [6.1 Назначение](#61-назначение)
  - [6.2 Структура анализа](#62-структура-анализа)
  - [6.3 Алгоритм анализа](#63-алгоритм-анализа)
- [7. Интеграция с калькулятором калорий](#7-интеграция-с-калькулятором-калорий)
  - [7.1 Минимальные данные для расчёта](#71-минимальные-данные-для-расчёта)
  - [7.2 Принцип расчёта по неполным данным](#72-принцип-расчёта-по-неполным-данным)
- [8. Экспорт данных](#8-экспорт-данных)
  - [8.1 Паспорт питомца (PDF)](#81-паспорт-питомца-pdf)
  - [8.2 Анализ питомца (PDF)](#82-анализ-питомца-pdf)

---

## 1. Общая архитектура

### 1.1 Принцип работы

Система построена на принципе **денормализации** — таблица `pet` (PetID) содержит все необходимые параметры для расчётов, избегая множественных JOIN при каждом запросе.

**Ключевые принципы:**

1. **Минимальный ввод** — пользователь заполняет только базовые поля (Этап 1)
2. **Автозаполнение** — триггер БД дополняет поля из данных о породе
3. **Редактирование** — пользователь может уточнить/переопределить любое автозаполненное поле (Этап 2)
4. **Расчёт всегда** — калькулятор работает с любым объёмом данных
5. **Анализ рисков** — система выявляет отклонения и породные риски

### 1.2 Диаграмма взаимодействия

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ПОЛЬЗОВАТЕЛЬ                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      ЭТАП 1: БАЗОВЫЙ ПРОФИЛЬ                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ name, species, breed_id, date_of_birth, sex, weight_kg,         │   │
│  │ is_neutered, photo                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ [Сохранение]
┌─────────────────────────────────────────────────────────────────────────┐
│                      ТРИГГЕР АВТОЗАПОЛНЕНИЯ                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ IF breed_id != NULL:                                            │    │
│  │   → size_category ← breeds.size                                 │    │
│  │   → coat_type ← breeds.coat_type                                │    │
│  │   → ideal_weight_kg ← breeds.breed_specificity                  │    │
│  │   → activity_level ← breeds.activity_level + age                │    │
│  │ ELSE:                                                           │    │
│  │   → size_category ← calculate_by_weight_age()                   │    │
│  │   → coat_type ← NULL (ввод пользователя)                        │    │
│  │   → ideal_weight_kg ← NULL                                      │    │
│  │   → activity_level ← 'moderate' (default)                       │    │
│  │                                                                 │    │
│  │ body_condition_score ← calculate_bcs()                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               ЭТАП 2: РАСШИРЕННЫЙ ПРОФИЛЬ (ПАСПОРТ ПИТОМЦА)            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Отображаются ВСЕ поля с автозаполненными значениями            │   │
│  │ Пользователь может редактировать/уточнять любое поле           │   │
│  │ Форма разбита на логические блоки                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
┌─────────────────────────────┐         ┌─────────────────────────────┐
│    АНАЛИЗ ПИТОМЦА           │         │    КАЛЬКУЛЯТОР КАЛОРИЙ      │
│  ┌───────────────────────┐  │         │  ┌───────────────────────┐  │
│  │ • Жизненная стадия    │  │         │  │ RER = 70 × BW^0.75    │  │
│  │ • Отклонение веса     │  │         │  │ MER = RER × K_total   │  │
│  │ • Породные риски      │  │         │  │                       │  │
│  │ • Риски аллергий      │  │         │  │ → Калорийность        │  │
│  │ • Вакцинация          │  │         │  │ → План питания        │  │
│  │ • Сводка рисков       │  │         │  │ → Подбор корма        │  │
│  └───────────────────────┘  │         │  └───────────────────────┘  │
└─────────────────────────────┘         └─────────────────────────────┘
              │                                           │
              ▼                                           ▼
┌─────────────────────────────┐         ┌─────────────────────────────┐
│   📄 Экспорт анализа (PDF)  │         │   🍽️ Рекомендации по корму  │
└─────────────────────────────┘         └─────────────────────────────┘

```

---

## 2. Структура таблицы PetID

### 2.1 Полный список полей

#### Идентификация

| Поле | Тип | Nullable | Источник | Описание |
|------|-----|----------|----------|----------|
| `id` | UUID | NO | Генерация | Первичный ключ |
| `user_id` | UUID | NO | FK → users | Владелец питомца |
| `name` | VARCHAR(100) | NO | Этап 1 | Кличка питомца |
| `species` | ENUM | NO | Этап 1 | Вид: dog / cat |
| `breed_id` | INTEGER | YES | Этап 1 | FK → breeds (NULL для дворняг) |
| `photo` | VARCHAR(500) | YES | Этап 1 | URL фото питомца |

#### Базовые данные (Этап 1)

| Поле | Тип | Nullable | Источник | Описание |
|------|-----|----------|----------|----------|
| `date_of_birth` | DATE | NO | Этап 1 | Дата рождения |
| `sex` | ENUM | NO | Этап 1 | Пол: male / female |
| `weight_kg` | DECIMAL(5,2) | NO | Этап 1 | Текущий вес (кг) |
| `is_neutered` | BOOLEAN | NO | Этап 1 | Кастрирован / стерилизована |

#### Автозаполняемые поля (Триггер)

| Поле | Тип | Nullable | Источник | Описание |
|------|-----|----------|----------|----------|
| `size_category` | ENUM | NO | Триггер: breeds или расчёт | Размер: toy / small / medium / large / giant |
| `coat_type` | ENUM | YES | Триггер: breeds или ввод | Тип шерсти (NULL для дворняг — ввод пользователя) |
| `ideal_weight_kg` | DECIMAL(5,2) | YES | Триггер: breeds | Идеальный вес по породе (NULL для дворняг) |
| `body_condition_score` | INTEGER | YES | Триггер: расчёт | Оценка кондиции тела (1-9) |
| `activity_level` | ENUM | YES | Триггер: breeds + возраст | Уровень активности |

#### Жильё и условия (Этап 2)

| Поле | Тип | Nullable | Источник | Описание |
|------|-----|----------|----------|----------|
| `housing_type` | ENUM | YES | Этап 2 | Тип жилья: apartment / house / farm / outdoor |
| `has_yard` | BOOLEAN | YES | Этап 2 | Есть двор (зависит от housing_type) |
| `yard_size` | ENUM | YES | Этап 2 | Размер двора: small / medium / large |
| `has_children` | BOOLEAN | YES | Этап 2 | Есть дети в доме |
| `has_other_pets` | BOOLEAN | YES | Этап 2 | Есть другие питомцы |

#### Здоровье (Этап 2)

| Поле | Тип | Nullable | Источник | Описание |
|------|-----|----------|----------|----------|
| `chronic_conditions_notes` | TEXT | YES | Этап 2 | Дополнительные заметки по здоровью |
| `last_vet_visit` | DATE | YES | Этап 2 | Дата последнего визита к ветеринару |

#### Питание (Этап 2)

| Поле | Тип | Nullable | Источник | Описание |
|------|-----|----------|----------|----------|
| `diet_type` | ENUM | YES | Этап 2 | Тип питания: dry / wet / mixed / raw / homemade |
| `feeding_frequency` | INTEGER | YES | Этап 2 | Количество кормлений в день (1-6) |
| `current_food` | JSONB | YES | Этап 2 | Текущий корм (структура ниже) |

**Структура `current_food`:**
```json
{
  "source": "catalog",           // "catalog" | "other"
  "food_id": "uuid",             // если source = "catalog"
  "brand_name": "Royal Canin",   // если source = "other"
  "product_name": "Medium Adult",
  "daily_amount_grams": 250
}
```

#### Репродукция (Этап 2, условно)

| Поле | Тип | Nullable | Источник | Описание |
|------|-----|----------|----------|----------|
| `neutering_date` | DATE | YES | Этап 2 | Дата кастрации/стерилизации |
| `reproductive_state` | ENUM | YES | Этап 2 | Состояние: none / heat / pregnant / lactating |
| `pregnancy_week` | INTEGER | YES | Этап 2 | Неделя беременности (1-9) |
| `litter_size` | INTEGER | YES | Этап 2 | Количество детёнышей в помёте |
| `lactation_week` | INTEGER | YES | Этап 2 | Неделя лактации |

#### Поведение (Этап 2)

| Поле | Тип | Nullable | Источник | Описание |
|------|-----|----------|----------|----------|
| `temperament` | ENUM | YES | Этап 2 | Темперамент: calm / balanced / active / hyperactive |
| `social_level` | ENUM | YES | Этап 2 | Социализация: antisocial / reserved / friendly / very_social |
| `behavioral_problems` | ENUM[] | YES | Этап 2 | Проблемы поведения (массив enum) |

#### Служебные поля

| Поле | Тип | Nullable | Источник | Описание |
|------|-----|----------|----------|----------|
| `is_extended_profile` | BOOLEAN | NO | Авто | Заполнен ли расширенный профиль |
| `created_at` | TIMESTAMP | NO | Авто | Дата создания |
| `updated_at` | TIMESTAMP | NO | Авто | Дата последнего обновления |

### 2.2 Enum-типы

#### species
```
dog | cat
```

#### sex
```
male | female
```

#### size_category
```
toy      — до 5 кг (взрослый)
small    — 5-10 кг
medium   — 10-25 кг
large    — 25-45 кг
giant    — более 45 кг
```

#### coat_type
```
hairless    — Бесшёрстный
short       — Короткая шерсть
medium      — Средняя шерсть
long        — Длинная шерсть
double      — Двойная шерсть (подшёрсток)
wire        — Жёсткая шерсть
curly       — Курчавая шерсть
```

#### activity_level
```
very_low    — Очень низкая (пожилые, больные)
low         — Низкая (домосед)
moderate    — Умеренная (стандарт)
high        — Высокая (активная порода)
very_high   — Очень высокая (рабочие собаки, спортсмены)
```

#### housing_type
```
apartment   — Квартира
house       — Частный дом
farm        — Ферма/сельская местность
outdoor     — Вольерное содержание
```

#### yard_size
```
small       — Маленький (до 100 м²)
medium      — Средний (100-500 м²)
large       — Большой (более 500 м²)
```

#### diet_type
```
dry         — Сухой корм
wet         — Влажный корм
mixed       — Комбинированный (сухой + влажный)
raw         — Натуральное питание (BARF)
homemade    — Домашняя еда
```

#### reproductive_state
```
none        — Обычное состояние
heat        — Течка
pregnant    — Беременность
lactating   — Лактация (кормление)
```

#### temperament
```
calm        — Спокойный
balanced    — Уравновешенный
active      — Активный
hyperactive — Гиперактивный
```

#### social_level
```
antisocial  — Избегает контактов
reserved    — Сдержанный
friendly    — Дружелюбный
very_social — Очень общительный
```

#### behavioral_problem
```
aggression_dogs       — Агрессия к собакам (dog)
aggression_people     — Агрессия к людям (dog, cat)
aggression_cats       — Агрессия к кошкам (dog)
separation_anxiety    — Тревога разлуки (dog, cat)
excessive_barking     — Чрезмерный лай (dog)
destructive_behavior  — Деструктивное поведение (dog, cat)
fear_phobias          — Страхи/фобии (dog, cat)
marking_territory     — Метки территории (dog, cat)
excessive_licking     — Чрезмерное вылизывание (dog, cat)
food_aggression       — Агрессия за еду (dog, cat)
leash_pulling         — Тянет поводок (dog)
jumping_on_people     — Прыгает на людей (dog)
none                  — Нет проблем (dog, cat)
```

---

## 3. Этапы создания PetID

### 3.1 Этап 1: Базовый профиль

**Обязательные поля для создания PetID:**

| Поле | Тип ввода | Валидация | Описание для пользователя |
|------|-----------|-----------|---------------------------|
| `name` | Текст | 1-100 символов | Как зовут вашего питомца? |
| `species` | Выбор | dog / cat | Это собака или кошка? |
| `breed_id` | Автокомплит + "Дворняга" | Из справочника | Порода питомца |
| `date_of_birth` | Дата / "Не знаю" | Не в будущем | Дата рождения (можно примерную) |
| `sex` | Выбор | male / female | Пол питомца |
| `weight_kg` | Число | 0.1 - 200 кг | Текущий вес |
| `is_neutered` | Да/Нет | — | Кастрирован/стерилизована? |
| `photo` | Загрузка | Опционально | Фото питомца |

**Если дата рождения неизвестна:**
- Пользователь указывает примерный возраст (месяцев/лет)
- Система рассчитывает `date_of_birth` от текущей даты

**После сохранения:** → Триггер автозаполнения → Переход к Этапу 2

### 3.2 Этап 2: Расширенный профиль (Паспорт питомца)

**Концепция:** Полная форма с логическими блоками. Может быть экспортирована как "Паспорт питомца" для ветеринара.

#### Блок 1: Физические параметры

| Поле | Отображается | Редактируемое | Подсказка |
|------|--------------|---------------|-----------|
| Вес | ✅ Всегда | ✅ Да | — |
| Размер | ✅ Всегда | ✅ Да | Автоопределён по породе/весу |
| Тип шерсти | ✅ Всегда | ✅ Для дворняг | Автоопределён по породе |
| BCS (кондиция) | ✅ Всегда | ✅ Да | Визуальная шкала 1-9 с картинками |
| Идеальный вес | ❌ Скрыто | ❌ Нет | Отображается как подсказка при отклонении |

**Подсказка при отклонении веса:**
```
⚠️ Текущий вес (35 кг) превышает норму для породы (27-32 кг).
   Источник: FCI стандарт породы Лабрадор-ретривер
```

#### Блок 2: Жильё и условия

| Поле | Отображается | Редактируемое | Зависимость |
|------|--------------|---------------|-------------|
| Тип жилья | ✅ Всегда | ✅ Да | — |
| Есть двор | ✅ Если house/farm | ✅ Да | housing_type ≠ apartment |
| Размер двора | ✅ Если has_yard=true | ✅ Да | has_yard = true |
| Есть дети | ✅ Всегда | ✅ Да | — |
| Есть другие питомцы | ✅ Всегда | ✅ Да | → Блок "Другие питомцы" |

#### Блок 3: Другие питомцы

**Отображается если:** `has_other_pets = true`

| Поле | Описание |
|------|----------|
| Тип питомца | dog / cat / bird / rodent / fish / reptile / other |
| Связь с PetID | Если питомец уже в системе — выбор из списка |
| Имя | Если питомец не в системе — свободный ввод |

**Возможность добавить несколько питомцев.**

#### Блок 4: Активность питомца

| Поле | Отображается | Редактируемое | Описание |
|------|--------------|---------------|----------|
| Общий уровень активности | ✅ Всегда | ✅ Да | Автозаполнен из породы, можно переопределить |
| Список активностей | ✅ Всегда | ✅ Да | Добавление/удаление активностей |

**Добавление активности:**
```
┌─────────────────────────────────────────────────────────────┐
│ + Добавить активность                                       │
├─────────────────────────────────────────────────────────────┤
│ Тип активности:    [▼ Прогулка                           ]  │
│ Продолжительность: [30] минут                               │
│ Периодичность:     [▼ 2 раза в день                      ]  │
│ Интенсивность:     [▼ Умеренная                          ]  │
│                                                [Добавить]   │
└─────────────────────────────────────────────────────────────┘
```

**Типы активностей:**

| Тип | Название RU | Доступно | Периодичность |
|-----|-------------|----------|---------------|
| walking | Прогулка | dog | 1-3 раза в день |
| running | Бег | dog | ежедневно / через день / еженедельно |
| swimming | Плавание | dog, cat | еженедельно / 2 раза в неделю / ежемесячно |
| training | Тренировка | dog, cat | ежедневно / через день / еженедельно |
| playing | Активные игры | dog, cat | ежедневно / 2 раза в день |
| hiking | Походы | dog | еженедельно / ежемесячно |
| agility | Аджилити | dog | еженедельно / 2 раза в неделю |
| hunting | Охота | dog, cat | ежемесячно / сезонно |
| guarding | Служебная работа | dog | ежедневно |

**Периодичность (frequency):**

| Код | Название RU |
|-----|-------------|
| three_times_daily | 3 раза в день |
| twice_daily | 2 раза в день |
| once_daily | 1 раз в день |
| every_other_day | Через день |
| twice_weekly | 2 раза в неделю |
| weekly | Раз в неделю |
| twice_monthly | 2 раза в месяц |
| monthly | Раз в месяц |
| seasonal | Сезонно |

#### Блок 5: Здоровье

| Поле | Отображается | Редактируемое | Описание |
|------|--------------|---------------|----------|
| Заболевания | ✅ Всегда | ✅ Да | M2M выбор из справочника |
| Аллергии | ✅ Всегда | ✅ Да | M2M выбор из справочника |
| Исключения продуктов | ✅ Всегда | ✅ Да | M2M выбор из справочника |
| Заметки по здоровью | ✅ Всегда | ✅ Да | Свободный текст |
| Последний визит к ветеринару | ✅ Всегда | ✅ Да | Дата |

#### Блок 6: Вакцинация

| Поле | Отображается | Редактируемое | Описание |
|------|--------------|---------------|----------|
| Список вакцинаций | ✅ Всегда | ✅ Да | Добавление записей |

**Добавление вакцинации:**
```
┌─────────────────────────────────────────────────────────────┐
│ + Добавить вакцинацию                                       │
├─────────────────────────────────────────────────────────────┤
│ Вакцина:           [▼ Бешенство (Rabies)                 ]  │
│ Дата вакцинации:   [15.03.2025]                             │
│ Производитель:     [Nobivac                              ]  │
│ Номер партии:      [ABC123                               ]  │
│                                                [Добавить]   │
└─────────────────────────────────────────────────────────────┘
```

**Система автоматически рассчитывает `next_due_date` на основе интервала ревакцинации из справочника.**

#### Блок 7: Медикаменты

| Поле | Отображается | Редактируемое | Описание |
|------|--------------|---------------|----------|
| Принимаемые препараты | ✅ Всегда | ✅ Да | Добавление записей |

**Добавление медикамента:**
```
┌─────────────────────────────────────────────────────────────┐
│ + Добавить препарат                                         │
├─────────────────────────────────────────────────────────────┤
│ Препарат:          [▼ Апоквел (Apoquel)                  ]  │
│                    [  Другой препарат...                 ]  │
│ Дозировка:         [16 мг                                ]  │
│ Периодичность:     [▼ 1 раз в день                       ]  │
│ Дата начала:       [01.01.2025]                             │
│ Дата окончания:    [  ] Бессрочно                           │
│ Примечание:        [От зуда                              ]  │
│                                                [Добавить]   │
└─────────────────────────────────────────────────────────────┘
```

#### Блок 8: Питание

| Поле | Отображается | Редактируемое | Описание |
|------|--------------|---------------|----------|
| Тип питания | ✅ Всегда | ✅ Да | dry / wet / mixed / raw / homemade |
| Кормлений в день | ✅ Всегда | ✅ Да | 1-6 |
| Текущий корм | ✅ Всегда | ✅ Да | Из каталога или "Другой" |

**Выбор текущего корма:**
```
┌─────────────────────────────────────────────────────────────┐
│ Текущий корм                                                │
├─────────────────────────────────────────────────────────────┤
│ ○ Из нашего каталога                                        │
│   [▼ Поиск корма...                                      ]  │
│                                                             │
│ ○ Другой корм                                               │
│   Бренд:    [Royal Canin                                 ]  │
│   Название: [Medium Adult                                ]  │
│                                                             │
│ Суточная порция: [250] грамм                               │
└─────────────────────────────────────────────────────────────┘
```

#### Блок 9: Репродукция (условный)

**Логика отображения:**

| Условие | Отображаемые поля |
|---------|-------------------|
| `is_neutered = true` | Только `neutering_date` |
| `is_neutered = false` AND `sex = male` | Ничего |
| `is_neutered = false` AND `sex = female` | `reproductive_state` + зависимые |

**Зависимые поля:**

| reproductive_state | Дополнительные поля |
|--------------------|---------------------|
| none | — |
| heat | — |
| pregnant | pregnancy_week (1-9) |
| lactating | litter_size, lactation_week |

#### Блок 10: Поведение

| Поле | Отображается | Редактируемое | Описание |
|------|--------------|---------------|----------|
| Темперамент | ✅ Всегда | ✅ Да | calm / balanced / active / hyperactive |
| Социализация | ✅ Всегда | ✅ Да | antisocial / reserved / friendly / very_social |
| Проблемы поведения | ✅ Всегда | ✅ Да | Множественный выбор из enum |

---

## 4. Триггер автозаполнения

### 4.1 Логика триггера

**Момент срабатывания:** После INSERT или UPDATE в таблицу `pet`

```sql
-- Псевдокод триггера
CREATE TRIGGER pet_autofill_trigger
AFTER INSERT OR UPDATE ON pet
FOR EACH ROW
EXECUTE FUNCTION pet_autofill();
```

**Алгоритм функции `pet_autofill()`:**

```
FUNCTION pet_autofill(NEW pet_record):
    
    # 1. Получение данных о породе
    IF NEW.breed_id IS NOT NULL:
        breed = SELECT * FROM breeds WHERE id = NEW.breed_id
        
        # 2. Автозаполнение size_category
        IF NEW.size_category IS NULL:
            NEW.size_category = breed.size
        
        # 3. Автозаполнение coat_type
        IF NEW.coat_type IS NULL:
            NEW.coat_type = breed.coat_type
        
        # 4. Автозаполнение ideal_weight_kg
        IF NEW.ideal_weight_kg IS NULL:
            specificity = get_breed_specificity(breed.id, NEW.sex, NEW.age_months)
            NEW.ideal_weight_kg = (specificity.weight_min + specificity.weight_max) / 2
        
        # 5. Автозаполнение activity_level с учётом возраста
        IF NEW.activity_level IS NULL:
            base_activity = breed.activity_level
            NEW.activity_level = adjust_activity_by_age(base_activity, NEW.age_months, NEW.species)
    
    ELSE:  # Дворняга (breed_id = NULL)
        
        # 6. Определение размера по весу и возрасту
        IF NEW.size_category IS NULL:
            NEW.size_category = calculate_size_by_weight_age(
                NEW.species, 
                NEW.weight_kg, 
                NEW.age_months
            )
        
        # 7. coat_type = NULL (пользователь введёт на Этапе 2)
        # 8. ideal_weight_kg = NULL (невозможно определить)
        
        # 9. activity_level = moderate (по умолчанию)
        IF NEW.activity_level IS NULL:
            NEW.activity_level = 'moderate'
    
    # 10. Расчёт BCS (Body Condition Score)
    IF NEW.ideal_weight_kg IS NOT NULL AND NEW.body_condition_score IS NULL:
        NEW.body_condition_score = calculate_bcs(NEW.weight_kg, NEW.ideal_weight_kg)
    
    RETURN NEW
```

### 4.2 Алгоритм определения размера

**Для дворняг без указания породы:**

```python
def calculate_size_by_weight_age(species: str, weight_kg: float, age_months: int) -> str:
    """
    Определяет size_category по весу с учётом возраста питомца.
    
    Args:
        species: 'dog' или 'cat'
        weight_kg: Текущий вес
        age_months: Возраст в месяцах
    
    Returns:
        size_category: toy/small/medium/large/giant
    """
    
    if species == 'cat':
        # Кошки: рост завершается к 12 месяцам
        if age_months < 12:
            # Экстраполяция взрослого веса
            growth_factor = 12 / max(age_months, 1) * 0.7
            estimated_adult_weight = weight_kg * growth_factor
        else:
            estimated_adult_weight = weight_kg
        
        # Категории для кошек
        if estimated_adult_weight < 3:
            return 'small'
        elif estimated_adult_weight < 6:
            return 'medium'
        else:
            return 'large'
    
    elif species == 'dog':
        # Собаки: рост завершается в 12-24 мес (зависит от размера)
        
        # Коэффициенты экстраполяции по возрасту
        growth_factors = {
            (0, 3): 4.0,    # 0-3 мес: очень ранний возраст
            (3, 6): 3.0,    # 3-6 мес: активный рост
            (6, 9): 2.0,    # 6-9 мес: продолжение роста
            (9, 12): 1.5,   # 9-12 мес: замедление роста
            (12, 18): 1.2,  # 12-18 мес: только крупные породы
            (18, 999): 1.0  # 18+ мес: рост завершён
        }
        
        growth_factor = 1.0
        for (min_age, max_age), factor in growth_factors.items():
            if min_age <= age_months < max_age:
                growth_factor = factor
                break
        
        estimated_adult_weight = weight_kg * growth_factor
        
        # Категории для собак
        if estimated_adult_weight < 5:
            return 'toy'
        elif estimated_adult_weight < 10:
            return 'small'
        elif estimated_adult_weight < 25:
            return 'medium'
        elif estimated_adult_weight < 45:
            return 'large'
        else:
            return 'giant'
```

**Таблица коэффициентов роста (для документации):**

| Возраст (мес) | Коэффициент | Примечание |
|---------------|-------------|------------|
| 0-3 | 4.0 | Очень ранний возраст, высокая неопределённость |
| 3-6 | 3.0 | Активный рост |
| 6-9 | 2.0 | Продолжение роста |
| 9-12 | 1.5 | Замедление роста |
| 12-18 | 1.2 | Только крупные породы ещё растут |
| 18+ | 1.0 | Рост завершён |

### 4.3 Динамическое вычисление breed_specificity

> **ВАЖНО:** Данные `breed_specificity` (идеальный вес, рост, активность по возрасту) НЕ хранятся в таблице `pets`. Они вычисляются динамически при каждом обращении на основе возраста питомца. Это позволяет автоматически корректировать параметры по мере взросления питомца.

**Функция для получения параметров breed_specificity:**

```python
def get_pet_specificity(pet_id: UUID) -> dict:
    """
    Динамически вычисляет параметры breed_specificity для питомца.
    
    Вызывается:
    - При отображении профиля питомца
    - При расчёте калорийности
    - При подборе корма
    - В ежедневном cron-job для обновления BCS и уведомлений
    
    Returns:
        {
            "age_category": "adult",
            "ideal_weight_kg": {"min": 25, "max": 32},
            "ideal_height_cm": {"min": 54, "max": 60},  # если порода известна
            "recommended_activity_level": "moderate",
            "life_stage_nutrition": "maintenance",
            "recommended_kcal_per_day": 1420,
            "weight_status": "normal",  # underweight / normal / overweight / obese
            "bcs_estimated": 5,
            "growth_complete": true,
            "age_adjustments": {
                "activity_modifier": 1.0,
                "protein_needs": "normal",
                "calcium_needs": "normal"
            }
        }
    """
    
    pet = get_pet(pet_id)
    age_months = calculate_age_months(pet.date_of_birth)
    
    result = {
        "age_months": age_months,
        "age_years": age_months / 12,
    }
    
    # 1. Определение возрастной категории
    result["age_category"] = get_age_category(pet.species, age_months, pet.size_category)
    result["life_stage_nutrition"] = get_nutrition_life_stage(pet.species, age_months)
    
    # 2. Идеальный вес
    if pet.breed_id:
        # Из данных породы
        breed = get_breed(pet.breed_id)
        result["ideal_weight_kg"] = breed.ideal_weight[pet.sex]
        result["ideal_height_cm"] = breed.ideal_height.get(pet.sex)  # если есть
    else:
        # Для дворняги - по размерной категории
        result["ideal_weight_kg"] = get_ideal_weight_by_size(pet.size_category, pet.sex)
        result["ideal_height_cm"] = None
    
    # 3. Оценка весового статуса
    if result["ideal_weight_kg"]:
        ideal_mid = (result["ideal_weight_kg"]["min"] + result["ideal_weight_kg"]["max"]) / 2
        weight_ratio = pet.weight_kg / ideal_mid
        
        if weight_ratio < 0.85:
            result["weight_status"] = "underweight"
            result["bcs_estimated"] = max(1, int(5 * weight_ratio))
        elif weight_ratio < 1.10:
            result["weight_status"] = "normal"
            result["bcs_estimated"] = 5
        elif weight_ratio < 1.20:
            result["weight_status"] = "overweight"
            result["bcs_estimated"] = 6
        elif weight_ratio < 1.30:
            result["weight_status"] = "obese_1"
            result["bcs_estimated"] = 7
        else:
            result["weight_status"] = "obese_2_3"
            result["bcs_estimated"] = 8 if weight_ratio < 1.40 else 9
    
    # 4. Рекомендуемая активность с учётом возраста
    base_activity = pet.activity_level or (breed.base_activity_level if pet.breed_id else "moderate")
    result["recommended_activity_level"] = adjust_activity_by_age(
        base_activity, age_months, pet.species
    )
    
    # 5. Возрастные корректировки для питания
    result["age_adjustments"] = get_age_nutrition_adjustments(
        pet.species, age_months, pet.size_category
    )
    
    # 6. Статус завершения роста
    result["growth_complete"] = is_growth_complete(pet.species, age_months, pet.size_category)
    
    return result


def get_age_category(species: str, age_months: int, size_category: str = None) -> str:
    """
    Определяет возрастную категорию питомца.
    
    Для собак учитывается размерная категория (крупные стареют раньше).
    """
    
    if species == "cat":
        if age_months < 4:
            return "kitten"
        elif age_months < 12:
            return "junior"
        elif age_months < 84:  # 7 лет
            return "adult"
        elif age_months < 132:  # 11 лет
            return "senior"
        else:
            return "geriatric"
    
    elif species == "dog":
        # Границы зависят от размера
        senior_start = {
            "toy": 120,     # 10 лет
            "small": 108,   # 9 лет
            "medium": 96,   # 8 лет
            "large": 72,    # 6 лет
            "giant": 60     # 5 лет
        }
        
        geriatric_start = {
            "toy": 180,     # 15 лет
            "small": 156,   # 13 лет
            "medium": 132,  # 11 лет
            "large": 108,   # 9 лет
            "giant": 84     # 7 лет
        }
        
        size = size_category or "medium"
        
        if age_months < 4:
            return "puppy"
        elif age_months < 12:
            return "junior"
        elif age_months < senior_start[size]:
            return "adult"
        elif age_months < geriatric_start[size]:
            return "senior"
        else:
            return "geriatric"


def get_nutrition_life_stage(species: str, age_months: int) -> str:
    """
    Определяет стадию жизни для расчёта питания по AAFCO.
    """
    if species == "cat":
        if age_months < 12:
            return "growth"
        else:
            return "maintenance"
    else:  # dog
        if age_months < 12:
            return "growth"
        elif age_months < 14:
            return "growth_large"  # Только для large/giant
        else:
            return "maintenance"


def get_ideal_weight_by_size(size_category: str, sex: str) -> dict:
    """
    Возвращает диапазон идеального веса по размерной категории.
    Используется для дворняг.
    """
    weight_ranges = {
        "toy": {"male": {"min": 1.5, "max": 4}, "female": {"min": 1, "max": 3.5}},
        "small": {"male": {"min": 5, "max": 10}, "female": {"min": 4, "max": 9}},
        "medium": {"male": {"min": 11, "max": 25}, "female": {"min": 9, "max": 22}},
        "large": {"male": {"min": 26, "max": 45}, "female": {"min": 22, "max": 38}},
        "giant": {"male": {"min": 45, "max": 90}, "female": {"min": 38, "max": 70}}
    }
    return weight_ranges.get(size_category, weight_ranges["medium"])[sex]


def get_age_nutrition_adjustments(species: str, age_months: int, size_category: str) -> dict:
    """
    Возвращает возрастные корректировки для питания.
    """
    adjustments = {
        "activity_modifier": 1.0,
        "protein_needs": "normal",
        "calcium_needs": "normal",
        "phosphorus_needs": "normal",
        "fat_needs": "normal"
    }
    
    age_category = get_age_category(species, age_months, size_category)
    
    if age_category in ["puppy", "kitten", "junior"]:
        adjustments["protein_needs"] = "high"
        adjustments["calcium_needs"] = "high"
        adjustments["fat_needs"] = "high"
        adjustments["activity_modifier"] = 1.2
    elif age_category in ["senior", "geriatric"]:
        adjustments["protein_needs"] = "moderate_high"  # Поддержка мышечной массы
        adjustments["phosphorus_needs"] = "reduced"     # Защита почек
        adjustments["activity_modifier"] = 0.8 if age_category == "senior" else 0.6
    
    return adjustments


def is_growth_complete(species: str, age_months: int, size_category: str) -> bool:
    """
    Определяет, завершён ли рост питомца.
    """
    if species == "cat":
        return age_months >= 12
    
    # Для собак зависит от размера
    growth_complete_months = {
        "toy": 10,
        "small": 12,
        "medium": 14,
        "large": 18,
        "giant": 24
    }
    
    return age_months >= growth_complete_months.get(size_category, 14)
```

### 4.4 Ежедневный cron-job для обновления данных

> Для поддержания актуальности данных рекомендуется ежедневный cron-job:

```python
# cron: 0 3 * * *  (ежедневно в 3:00)

async def daily_pets_update():
    """
    Ежедневное обновление данных питомцев.
    """
    
    pets = await get_all_active_pets()
    
    for pet in pets:
        # 1. Пересчёт возраста
        age_months = calculate_age_months(pet.date_of_birth)
        
        # 2. Обновление age_months в кеше (Redis)
        await cache_pet_age(pet.id, age_months)
        
        # 3. Проверка значимых изменений
        specificity = get_pet_specificity(pet.id)
        
        # 4. Уведомления о важных событиях
        if is_birthday(pet):
            await create_notification(pet.owner_id, "birthday", pet)
        
        if specificity["age_category"] != pet.cached_age_category:
            # Изменилась возрастная категория
            await create_notification(
                pet.owner_id, 
                "life_stage_change", 
                pet, 
                new_stage=specificity["age_category"]
            )
            await update_pet_cached_category(pet.id, specificity["age_category"])
        
        # 5. Обновление рекомендаций по питанию
        if specificity["weight_status"] in ["overweight", "obese_1", "obese_2_3"]:
            await create_or_update_weight_alert(pet.id, specificity["weight_status"])
```

**Функция корректировки активности по возрасту:**

```python
def adjust_activity_by_age(base_activity: str, age_months: int, species: str) -> str:
    """
    Корректирует уровень активности породы с учётом возраста.
    
    Молодые животные более активны, пожилые — менее.
    """
    
    activity_levels = ['very_low', 'low', 'moderate', 'high', 'very_high']
    base_index = activity_levels.index(base_activity)
    
    if species == 'dog':
        # Щенки до 2 лет: +1 уровень (если не максимум)
        if age_months < 24:
            adjusted_index = min(base_index + 1, 4)
        # Взрослые 2-7 лет: базовый уровень
        elif age_months < 84:
            adjusted_index = base_index
        # Пожилые 7-10 лет: -1 уровень
        elif age_months < 120:
            adjusted_index = max(base_index - 1, 0)
        # Старые 10+ лет: -2 уровня
        else:
            adjusted_index = max(base_index - 2, 0)
    
    elif species == 'cat':
        # Котята до 1 года: +1 уровень
        if age_months < 12:
            adjusted_index = min(base_index + 1, 4)
        # Взрослые 1-10 лет: базовый уровень
        elif age_months < 120:
            adjusted_index = base_index
        # Пожилые 10-15 лет: -1 уровень
        elif age_months < 180:
            adjusted_index = max(base_index - 1, 0)
        # Старые 15+ лет: -2 уровня
        else:
            adjusted_index = max(base_index - 2, 0)
    
    return activity_levels[adjusted_index]
```

---
## 5. Связующие таблицы (M2M)

### 5.1 pet_health_conditions

**Назначение:** Связь питомца с диагностированными заболеваниями.

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | UUID | NO | PK |
| `pet_id` | UUID | NO | FK → pet |
| `condition_code` | VARCHAR(50) | NO | FK → health_conditions |
| `is_breed_risk` | BOOLEAN | NO | Породный риск (авто из breeds) или диагноз |
| `breed_risk_level` | ENUM | YES | low / moderate / high (если is_breed_risk) |
| `diagnosis_date` | DATE | YES | Дата постановки диагноза |
| `severity` | ENUM | YES | mild / moderate / severe |
| `notes` | TEXT | YES | Примечания |
| `created_at` | TIMESTAMP | NO | — |

### 5.2 pet_allergies

**Назначение:** Связь питомца с аллергиями.

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | UUID | NO | PK |
| `pet_id` | UUID | NO | FK → pet |
| `allergen_code` | VARCHAR(50) | NO | FK → allergies |
| `allergen_type` | ENUM | NO | food / contact / inhalant / drug / parasitic |
| `is_breed_risk` | BOOLEAN | NO | Породный риск или диагноз |
| `diagnosis_date` | DATE | YES | Дата выявления |
| `severity` | ENUM | YES | mild / moderate / severe |
| `reaction_description` | TEXT | YES | Описание реакции |
| `created_at` | TIMESTAMP | NO | — |

### 5.3 pet_food_exclusions

**Назначение:** Исключения продуктов для питомца.

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | UUID | NO | PK |
| `pet_id` | UUID | NO | FK → pet |
| `food_code` | VARCHAR(50) | NO | Код продукта |
| `food_name` | VARCHAR(200) | NO | Название продукта |
| `exclusion_reason` | ENUM | NO | allergy / intolerance / preference / vet_recommendation |
| `severity` | ENUM | YES | mild / moderate / severe |
| `is_breed_risk` | BOOLEAN | NO | Породная непереносимость |
| `notes` | TEXT | YES | Примечания |
| `created_at` | TIMESTAMP | NO | — |

### 5.4 pet_vaccinations

**Назначение:** История вакцинаций питомца.

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | UUID | NO | PK |
| `pet_id` | UUID | NO | FK → pet |
| `vaccine_code` | VARCHAR(50) | NO | FK → vaccines |
| `date_administered` | DATE | NO | Дата вакцинации |
| `next_due_date` | DATE | YES | Дата следующей (авторасчёт) |
| `manufacturer` | VARCHAR(200) | YES | Производитель |
| `batch_number` | VARCHAR(100) | YES | Номер партии |
| `administered_by` | VARCHAR(200) | YES | Кем проведена (клиника/врач) |
| `notes` | TEXT | YES | Примечания |
| `created_at` | TIMESTAMP | NO | — |

### 5.5 pet_medications

**Назначение:** Принимаемые препараты.

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | UUID | NO | PK |
| `pet_id` | UUID | NO | FK → pet |
| `medication_code` | VARCHAR(50) | NO | FK → medications (или "other") |
| `medication_name` | VARCHAR(200) | NO | Название препарата |
| `dosage` | VARCHAR(100) | YES | Дозировка |
| `frequency` | ENUM | NO | Периодичность приёма |
| `start_date` | DATE | NO | Дата начала |
| `end_date` | DATE | YES | Дата окончания (NULL = бессрочно) |
| `prescribed_for` | VARCHAR(200) | YES | Для чего назначен |
| `prescribing_vet` | VARCHAR(200) | YES | Назначивший ветеринар |
| `notes` | TEXT | YES | Примечания |
| `is_active` | BOOLEAN | NO | Активный приём |
| `created_at` | TIMESTAMP | NO | — |

### 5.6 pet_activities

**Назначение:** Активности питомца.

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | UUID | NO | PK |
| `pet_id` | UUID | NO | FK → pet |
| `activity_type` | ENUM | NO | walking/running/swimming/training/playing/hiking/agility/hunting/guarding |
| `duration_minutes` | INTEGER | NO | Продолжительность (минуты) |
| `frequency` | ENUM | NO | Периодичность |
| `intensity` | ENUM | YES | low / moderate / high |
| `notes` | TEXT | YES | Примечания |
| `created_at` | TIMESTAMP | NO | — |

### 5.7 pet_other_pets

**Назначение:** Другие питомцы, живущие вместе.

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | UUID | NO | PK |
| `pet_id` | UUID | NO | FK → pet (текущий питомец) |
| `other_pet_type` | ENUM | NO | dog/cat/bird/rodent/fish/reptile/other |
| `linked_pet_id` | UUID | YES | FK → pet (если в системе) |
| `other_pet_name` | VARCHAR(100) | YES | Имя (если не в системе) |
| `relationship` | ENUM | YES | friendly / neutral / tense |
| `created_at` | TIMESTAMP | NO | — |

### 5.8 pet_analysis_history

**Назначение:** История анализов питомца.

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | UUID | NO | PK |
| `pet_id` | UUID | NO | FK → pet |
| `analysis_date` | TIMESTAMP | NO | Дата анализа |
| `analysis_result` | JSONB | NO | Полный результат анализа |
| `overall_status` | ENUM | NO | good / attention / warning / critical |
| `warnings_count` | INTEGER | NO | Количество предупреждений |
| `recommendations_count` | INTEGER | NO | Количество рекомендаций |
| `weight_at_analysis` | DECIMAL(5,2) | YES | Вес на момент анализа |
| `bcs_at_analysis` | INTEGER | YES | BCS на момент анализа |
| `created_at` | TIMESTAMP | NO | — |

---

## 6. Функция "Анализ питомца"

### 6.1 Назначение

Функция "Анализ питомца" — **режим только для чтения**, который:

- ✅ Выявляет риски на основе данных PetID и Breeds
- ✅ Показывает отклонения от норм породы
- ✅ Отображает породные предрасположенности
- ✅ Напоминает о вакцинации
- ✅ Формирует сводку рисков и рекомендаций
- ❌ НЕ позволяет редактировать данные
- ❌ НЕ даёт рекомендации по питанию (это в подборе корма)
- ❌ НЕ даёт рекомендации по уходу

**Внизу страницы уведомление:**
```
ℹ️ Если какие-то данные не заполнены или требуют уточнения, 
   отредактируйте профиль питомца в разделе "Паспорт питомца".
```

### 6.2 Структура анализа

```
═══════════════════════════════════════════════════════════════
           АНАЛИЗ ПИТОМЦА: {Кличка} ({Порода})
           Дата анализа: 15.01.2026
═══════════════════════════════════════════════════════════════

📊 ОБЩИЙ СТАТУС: [🟡 Требует внимания]
   Выявлено: 2 предупреждения, 5 рекомендаций

═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│ 🎂 ЖИЗНЕННАЯ СТАДИЯ                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Возраст:           3 года 2 месяца                        │
│  Жизненная стадия:  🟢 Взрослый (Adult)                    │
│  Ожидаемая продолжительность жизни породы: 10-12 лет       │
│                                                             │
│  [До стадии Senior осталось: ~4-5 лет]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚖️ ОТКЛОНЕНИЕ ВЕСА                       [🟡 Внимание]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Текущий вес:       35 кг                                  │
│  Норма для породы:  27-32 кг (самец, взрослый)             │
│  Отклонение:        +12.5% от верхней границы              │
│                                                             │
│  Оценка кондиции:   BCS 6/9 (избыточный вес)               │
│                                                             │
│  ⚠️ Риск: ожирение 1 степени                               │
│                                                             │
│  📈 Динамика (если есть история):                          │
│     3 мес назад: 33 кг → сейчас: 35 кг (+2 кг)            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🏥 ПОРОДНЫЕ РИСКИ                         [🟡 Внимание]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Указанные заболевания: Нет                                │
│                                                             │
│  ⚠️ ПОРОДНЫЕ РИСКИ ЗДОРОВЬЯ (Лабрадор-ретривер):           │
│                                                             │
│  🔴 ВЫСОКИЙ РИСК:                                          │
│  • Дисплазия тазобедренного сустава                        │
│    Типичный возраст проявления: 1-2 года                   │
│    Рекомендуется консультация ветеринара                   │
│                                                             │
│  • Ожирение                                                │
│    ⚠️ ВОЗМОЖНО АКТУАЛЬНО (см. блок "Отклонение веса")     │
│    Рекомендуется консультация ветеринара                   │
│                                                             │
│  🟡 УМЕРЕННЫЙ РИСК:                                        │
│  • Прогрессирующая атрофия сетчатки                        │
│    Рекомендуется консультация ветеринара                   │
│                                                             │
│  🟢 НИЗКИЙ РИСК:                                           │
│  • Эпилепсия — наблюдение                                  │
│                                                             │
│  ⚠️ ПОРОДНЫЕ РИСКИ АЛЛЕРГИЙ:                               │
│  • Пищевая аллергия на курицу — риск COMMON                │
│    Рекомендуется консультация ветеринара при симптомах     │
│                                                             │
│  ⚠️ ПОРОДНЫЕ НЕПЕРЕНОСИМОСТИ:                              │
│  • Непереносимость пшеницы — риск UNCOMMON                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🏃 АКТИВНОСТЬ                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Указанный уровень:      Moderate-High                     │
│  Норма для породы:       High                              │
│  Соответствие:           🟢 Близко к норме                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 💉 ВАКЦИНАЦИЯ                              [🟡 Внимание]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Бешенство (Rabies)                                      │
│     Последняя: 15.03.2025                                  │
│     Следующая: 15.03.2026 (через 2 месяца)                 │
│                                                             │
│  ⚠️ DHPP (чумка, гепатит, парвовирус)                      │
│     Последняя: 10.01.2025                                  │
│     Следующая: 10.01.2026 — ПРОСРОЧЕНА                     │
│     Рекомендуется консультация ветеринара                  │
│                                                             │
│  ❓ Лептоспироз — нет данных                               │
│     Рекомендуется консультация ветеринара                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
📋 СВОДКА РИСКОВ
═══════════════════════════════════════════════════════════════

🔴 ТРЕБУЮТ ВНИМАНИЯ:
   1. Вакцина DHPP просрочена — рекомендуется ревакцинация
   2. Вес выше нормы (+12.5%) — риск ожирения

🟡 РЕКОМЕНДУЕТСЯ ПРОВЕРИТЬ:
   3. Породный риск: Дисплазия ТБС — скрининг
   4. Породный риск: Прогрессирующая атрофия сетчатки — осмотр
   5. Вакцина Лептоспироз — данные отсутствуют

🟢 В НОРМЕ:
   • Возраст и жизненная стадия
   • Уровень активности

═══════════════════════════════════════════════════════════════
   
ℹ️ Данный анализ носит информационный характер.
   Для уточнения рисков рекомендуется консультация ветеринара.
   
   Если данные неполные — отредактируйте профиль питомца.

═══════════════════════════════════════════════════════════════
   [📄 Скачать анализ (PDF)]
═══════════════════════════════════════════════════════════════
```

### 6.3 Алгоритм анализа

```python
def analyze_pet(pet_id: UUID) -> PetAnalysisResult:
    """
    Выполняет полный анализ питомца.
    
    Returns:
        PetAnalysisResult с блоками анализа и сводкой
    """
    
    pet = get_pet_with_relations(pet_id)
    breed = get_breed(pet.breed_id) if pet.breed_id else None
    
    result = PetAnalysisResult()
    
    # 1. Анализ жизненной стадии
    result.life_stage = analyze_life_stage(
        date_of_birth=pet.date_of_birth,
        species=pet.species,
        breed_lifespan=breed.average_lifespan if breed else None
    )
    
    # 2. Анализ веса
    result.weight_analysis = analyze_weight(
        current_weight=pet.weight_kg,
        ideal_weight=pet.ideal_weight_kg,
        bcs=pet.body_condition_score,
        weight_history=get_weight_history(pet_id)
    )
    
    # 3. Породные риски здоровья
    if breed:
        result.breed_health_risks = get_breed_health_risks(breed.id)
        result.breed_allergy_risks = get_breed_allergy_risks(breed.id)
        result.breed_food_intolerances = get_breed_food_intolerances(breed.id)
        
        # Проверка актуальности рисков
        for risk in result.breed_health_risks:
            if is_risk_possibly_actual(risk, pet, result.weight_analysis):
                risk.is_possibly_actual = True
    
    # 4. Анализ активности
    result.activity_analysis = analyze_activity(
        current_level=pet.activity_level,
        breed_level=breed.activity_level if breed else None,
        age_months=pet.age_months
    )
    
    # 5. Анализ вакцинации
    result.vaccination_analysis = analyze_vaccinations(
        pet_vaccinations=get_pet_vaccinations(pet_id),
        species=pet.species,
        breed_id=pet.breed_id
    )
    
    # 6. Формирование сводки
    result.summary = generate_summary(result)
    result.overall_status = calculate_overall_status(result.summary)
    
    # 7. Сохранение в историю
    save_analysis_history(pet_id, result)
    
    return result
```

---

## 7. Интеграция с калькулятором калорий

### 7.1 Минимальные данные для расчёта

Калькулятор **ВСЕГДА** работает, даже с минимальными данными.

**Обязательные поля (из Этапа 1):**

| Поле | Используется для | Без этого поля |
|------|------------------|----------------|
| `species` | Выбор формулы | ❌ Расчёт невозможен |
| `weight_kg` | RER = 70 × BW^0.75 | ❌ Расчёт невозможен |
| `date_of_birth` | K_age (жизненная стадия) | ⚠️ Принимаем "взрослый" |
| `is_neutered` | K_base | ⚠️ Принимаем false |

**Автозаполняемые поля:**

| Поле | Используется для | Если NULL |
|------|------------------|-----------|
| `activity_level` | K_activity | Принимаем "moderate" |
| `size_category` | K_size (для собак) | Рассчитываем по весу |

**Опциональные поля (улучшают точность):**

| Поле | Используется для | Если NULL |
|------|------------------|-----------|
| `health_conditions` | K_health | K_health = 1.0 |
| `reproductive_state` | K_reproductive | K_reproductive = 1.0 |
| `housing_type` | K_environment | K_environment = 1.0 |
| `activities` | Extra calories | Не добавляем extra |

### 7.2 Принцип расчёта по неполным данным

```python
def calculate_daily_calories(pet_id: UUID) -> CalorieResult:
    """
    Рассчитывает суточную калорийность.
    
    ПРИНЦИП: Расчёт ВСЕГДА выполняется по имеющимся данным.
    Недостающие поля заменяются значениями по умолчанию.
    """
    
    pet = get_pet(pet_id)
    warnings = []
    
    # 1. Базовые обязательные данные
    if not pet.species or not pet.weight_kg:
        raise CalculationError("Недостаточно данных: требуется вид и вес")
    
    # 2. RER (всегда рассчитывается)
    rer = calculate_rer(pet.weight_kg, pet.species)
    
    # 3. K_base (кастрация)
    k_base = get_k_base(pet.is_neutered or False, pet.species)
    if pet.is_neutered is None:
        warnings.append("Статус кастрации не указан, принято: не кастрирован")
    
    # 4. K_age (возраст)
    if pet.date_of_birth:
        k_age = get_k_age(pet.age_months, pet.species)
    else:
        k_age = 1.0  # Взрослый по умолчанию
        warnings.append("Возраст не указан, принято: взрослый")
    
    # 5. K_activity
    activity_level = pet.activity_level or 'moderate'
    k_activity = get_k_activity(activity_level, pet.species)
    if pet.activity_level is None:
        warnings.append("Уровень активности не указан, принято: умеренный")
    
    # 6. K_health (заболевания)
    health_conditions = get_pet_health_conditions(pet.id)
    if health_conditions:
        k_health = calculate_k_health(health_conditions)
    else:
        k_health = 1.0
    
    # 7. K_reproductive
    if pet.reproductive_state and pet.reproductive_state != 'none':
        k_reproductive = get_k_reproductive(
            pet.reproductive_state, 
            pet.pregnancy_week,
            pet.lactation_week,
            pet.litter_size
        )
    else:
        k_reproductive = 1.0
    
    # 8. Итоговый расчёт
    k_total = k_base * k_age * k_activity * k_health * k_reproductive
    mer = rer * k_total
    
    # 9. Дополнительные калории от активностей
    activities = get_pet_activities(pet.id)
    extra_calories = calculate_activity_calories(activities, pet.weight_kg)
    
    total_daily_calories = mer + extra_calories
    
    return CalorieResult(
        rer=rer,
        mer=mer,
        extra_calories=extra_calories,
        total=total_daily_calories,
        coefficients={
            'k_base': k_base,
            'k_age': k_age,
            'k_activity': k_activity,
            'k_health': k_health,
            'k_reproductive': k_reproductive,
            'k_total': k_total
        },
        warnings=warnings,
        data_completeness=calculate_completeness(pet)
    )
```

**Уровни полноты данных:**

| Уровень | Заполнено | Точность |
|---------|-----------|----------|
| 🟢 Полный | Все поля | Максимальная |
| 🟡 Базовый | Этап 1 + автозаполнение | Хорошая |
| 🔴 Минимальный | Только вид + вес | Приблизительная |

**Уведомление при расчёте:**
```
⚠️ Расчёт выполнен на основе имеющихся данных.
   Для повышения точности заполните профиль питомца полностью.
   
   Не указано: уровень активности, заболевания, тип жилья
   
   Наши рекомендации основаны на передовых ветеринарных данных.
   Для детализации плана питания рекомендуем консультацию ветеринара.
```

---

## 8. Экспорт данных

### 8.1 Паспорт питомца (PDF)

**Содержимое:**
- Фото питомца
- Основные данные (кличка, порода, возраст, пол, вес)
- Физические параметры
- История вакцинаций
- Принимаемые препараты
- Заболевания и аллергии
- QR-код для быстрого доступа к профилю

**Формат:** A4, официальный стиль для предъявления ветеринару.

### 8.2 Анализ питомца (PDF)

**Содержимое:**
- Дата анализа
- Все блоки анализа
- Сводка рисков и рекомендаций
- Историческая динамика (если есть)
- QR-код для быстрого доступа

**Формат:** A4, официальный стиль для предъявления ветеринару.

---

## История изменений

| Дата | Версия | Изменения |
|------|--------|-----------|
| 15.01.2026 | 1.0 | Создание документа |
