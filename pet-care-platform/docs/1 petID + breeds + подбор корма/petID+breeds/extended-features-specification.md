# Расширенные функции базы знаний (Фаза 2)

> **Статус:** Отложено для реализации в Фазе 2
> **Дата создания:** 18.01.2026

---

## Оглавление

- [1. Введение](#1-введение)
- [2. Таблица "Стандартные процедуры ухода" (care_procedures)](#2-таблица-стандартные-процедуры-ухода-care_procedures)
- [3. Таблица "Поведенческие особенности" (behavioral_traits)](#3-таблица-поведенческие-особенности-behavioral_traits)
- [4. Таблица "Профилактические мероприятия" (preventive_measures)](#4-таблица-профилактические-мероприятия-preventive_measures)
- [5. Таблица "Возрастные особенности" (age_characteristics)](#5-таблица-возрастные-особенности-age_characteristics)
- [6. Таблица "История проблем здоровья" (pet_health_history)](#6-таблица-история-проблем-здоровья-pet_health_history)
- [7. Справочник вакцин (vaccines)](#7-справочник-вакцин-vaccines)
- [8. Справочник медикаментов (medications)](#8-справочник-медикаментов-medications)
- [9. Связующие таблицы для Фазы 2](#9-связующие-таблицы-для-фазы-2)

---

## 1. Введение

Данный документ содержит спецификации таблиц и функций, которые **не входят в минимальную реализацию (MVP)** функционала PetID и подбора корма.

Эти функции будут реализованы в **Фазе 2** после запуска основного функционала:
- Создание PetID
- Расчёт калорийности питания
- Подбор корма по параметрам питомца

---

## 2. Таблица "Стандартные процедуры ухода" (care_procedures)

**Назначение:** База знаний по процедурам ухода, рекомендуемым для различных пород собак и кошек.

**Хранимые данные:**

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | INTEGER | NO | PK, уникальный идентификатор |
| `code` | VARCHAR(50) | NO | Уникальный код процедуры |
| `name_ru` | VARCHAR(200) | NO | Название процедуры |
| `category` | ENUM | NO | Категория процедуры |
| `species` | ENUM | NO | dog / cat / both |
| `frequency` | ENUM | NO | Частота выполнения |
| `duration_minutes` | INTEGER | YES | Время выполнения (минуты) |
| `difficulty` | ENUM | NO | Уровень сложности |
| `required_tools` | TEXT | YES | Необходимые инструменты |
| `instructions` | TEXT | NO | Инструкция по выполнению |
| `warnings` | TEXT | YES | Предупреждения и противопоказания |
| `created_at` | TIMESTAMP | NO | Дата создания |

**Enum значения:**

```
category: grooming, hygiene, dental, ear_care, nail_care, eye_care, bathing
frequency: daily, twice_weekly, weekly, biweekly, monthly, as_needed
difficulty: easy, moderate, difficult, professional_only
```

**Связи:**
- Многие ко многим с `breeds` — процедуры для каждой породы
- Многие ко многим с `pets` — история выполненных процедур

---

## 3. Таблица "Поведенческие особенности" (behavioral_traits)

**Назначение:** База знаний по характерным чертам поведения различных пород.

**Хранимые данные:**

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | INTEGER | NO | PK |
| `code` | VARCHAR(50) | NO | Уникальный код |
| `name_ru` | VARCHAR(200) | NO | Название особенности |
| `trait_type` | ENUM | NO | Тип: positive / neutral / problematic |
| `species` | ENUM | NO | dog / cat / both |
| `intensity` | ENUM | NO | Уровень выраженности |
| `typical_age_onset` | VARCHAR(50) | YES | Возраст проявления |
| `influencing_factors` | TEXT | YES | Влияющие факторы |
| `correction_methods` | TEXT | YES | Методы коррекции |
| `training_tips` | TEXT | YES | Рекомендации по дрессировке |
| `compatibility_children` | ENUM | YES | Совместимость с детьми |
| `compatibility_pets` | ENUM | YES | Совместимость с животными |
| `created_at` | TIMESTAMP | NO | Дата создания |

**Enum значения:**

```
trait_type: positive, neutral, problematic
intensity: low, moderate, high, very_high
compatibility_children: excellent, good, moderate, poor, not_recommended
compatibility_pets: excellent, good, moderate, poor, not_recommended
```

**Связи:**
- Многие ко многим с `breeds` — поведенческие черты пород

---

## 4. Таблица "Профилактические мероприятия" (preventive_measures)

**Назначение:** Рекомендации по профилактике заболеваний и проблем здоровья.

**Хранимые данные:**

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | INTEGER | NO | PK |
| `code` | VARCHAR(50) | NO | Уникальный код |
| `name_ru` | VARCHAR(200) | NO | Название мероприятия |
| `measure_type` | ENUM | NO | Тип профилактики |
| `species` | ENUM | NO | dog / cat / both |
| `age_groups` | ENUM[] | NO | Возрастные группы |
| `frequency` | VARCHAR(100) | NO | Частота выполнения |
| `seasonality` | VARCHAR(100) | YES | Сезонность |
| `description` | TEXT | NO | Описание |
| `contraindications` | TEXT | YES | Противопоказания |
| `related_conditions` | VARCHAR(50)[] | YES | Связанные заболевания |
| `created_at` | TIMESTAMP | NO | Дата создания |

**Enum значения:**

```
measure_type: vaccination, deworming, parasite_control, checkup, screening, dental_cleaning
age_groups: puppy, kitten, junior, adult, senior, geriatric
```

**Связи:**
- Многие ко многим с `breeds` — профилактика для пород
- Многие ко многим с `health_conditions` — профилактика заболеваний

---

## 5. Таблица "Возрастные особенности" (age_characteristics)

**Назначение:** Особенности развития и изменения на разных этапах жизни.

**Хранимые данные:**

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | INTEGER | NO | PK |
| `species` | ENUM | NO | dog / cat |
| `size_category` | ENUM | YES | Категория размера (для собак) |
| `life_stage` | ENUM | NO | Жизненная стадия |
| `age_from_months` | INTEGER | NO | Возраст от (месяцы) |
| `age_to_months` | INTEGER | NO | Возраст до (месяцы) |
| `physical_changes` | TEXT | NO | Физические изменения |
| `behavioral_changes` | TEXT | YES | Поведенческие изменения |
| `health_considerations` | TEXT | YES | Особенности здоровья |
| `nutrition_notes` | TEXT | YES | Особенности питания |
| `activity_level_typical` | ENUM | NO | Типичный уровень активности |
| `care_recommendations` | TEXT | YES | Рекомендации по уходу |
| `warning_signs` | TEXT | YES | Тревожные признаки |
| `created_at` | TIMESTAMP | NO | Дата создания |

**Enum значения:**

```
life_stage: neonate, puppy, kitten, junior, adult, senior, geriatric
size_category: toy, small, medium, large, giant (только для собак)
activity_level_typical: very_low, low, moderate, high, very_high
```

---

## 6. Таблица "История проблем здоровья" (pet_health_history)

**Назначение:** Медицинская история конкретного питомца.

**Хранимые данные:**

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `id` | UUID | NO | PK |
| `pet_id` | UUID | NO | FK → pets |
| `event_date` | DATE | NO | Дата события |
| `event_type` | ENUM | NO | Тип события |
| `condition_code` | VARCHAR(50) | YES | FK → health_conditions |
| `description` | TEXT | NO | Описание проблемы |
| `symptoms` | TEXT | YES | Симптомы |
| `diagnosis` | TEXT | YES | Диагноз |
| `treatment` | TEXT | YES | Назначенное лечение |
| `outcome` | ENUM | YES | Результат |
| `vet_clinic` | VARCHAR(200) | YES | Клиника |
| `vet_name` | VARCHAR(200) | YES | Ветеринар |
| `cost` | DECIMAL(10,2) | YES | Стоимость |
| `follow_up_date` | DATE | YES | Дата повторного визита |
| `notes` | TEXT | YES | Примечания |
| `attachments` | JSONB | YES | Прикреплённые файлы |
| `created_at` | TIMESTAMP | NO | Дата создания |
| `updated_at` | TIMESTAMP | NO | Дата обновления |

**Enum значения:**

```
event_type: illness, injury, surgery, emergency, checkup, vaccination, other
outcome: recovered, ongoing, chronic, managed, unknown
```

---

## 7. Справочник вакцин (vaccines)

**Назначение:** Справочник вакцин для собак и кошек.

**Хранимые данные:**

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `code` | VARCHAR(50) | NO | PK, уникальный код |
| `name_ru` | VARCHAR(200) | NO | Название на русском |
| `name_en` | VARCHAR(200) | NO | Название на английском |
| `species` | ENUM | NO | dog / cat / both |
| `vaccine_type` | ENUM | NO | Тип вакцины |
| `protects_against` | TEXT | NO | От каких заболеваний |
| `first_vaccination_age_weeks` | INTEGER | NO | Возраст первой вакцинации |
| `booster_interval_months` | INTEGER | NO | Интервал ревакцинации |
| `is_mandatory` | BOOLEAN | NO | Обязательная по закону |
| `contraindications` | TEXT | YES | Противопоказания |
| `side_effects` | TEXT | YES | Побочные эффекты |
| `notes` | TEXT | YES | Примечания |

**Стандартные вакцины:**

| Код | Название | Вид | Интервал | Обязательная |
|-----|----------|-----|----------|--------------|
| `rabies` | Бешенство | both | 12-36 мес | ✅ Да |
| `dhpp` | DHPP (чумка, гепатит, парвовирус) | dog | 12 мес | ❌ |
| `leptospirosis` | Лептоспироз | dog | 12 мес | ❌ |
| `bordetella` | Бордетеллёз | dog | 6-12 мес | ❌ |
| `fvrcp` | FVRCP (панлейкопения, ринотрахеит) | cat | 12-36 мес | ❌ |
| `felv` | Лейкемия кошек | cat | 12 мес | ❌ |

---

## 8. Справочник медикаментов (medications)

**Назначение:** Справочник лекарственных препаратов.

**Хранимые данные:**

| Поле | Тип | Nullable | Описание |
|------|-----|----------|----------|
| `code` | VARCHAR(50) | NO | PK |
| `name_trade` | VARCHAR(200) | NO | Торговое название |
| `name_active` | VARCHAR(200) | NO | Действующее вещество |
| `category` | ENUM | NO | Категория препарата |
| `form` | ENUM | NO | Форма выпуска |
| `species` | ENUM | NO | dog / cat / both |
| `indications` | TEXT | NO | Показания |
| `contraindications` | TEXT | YES | Противопоказания |
| `side_effects` | TEXT | YES | Побочные эффекты |
| `dosage_info` | JSONB | YES | Информация о дозировке |
| `typical_frequency` | ENUM[] | YES | Периодичность приёма |
| `interactions` | TEXT | YES | Взаимодействия |
| `notes` | TEXT | YES | Примечания |

**Категории препаратов:**

```
antiparasitic    — Антипаразитарные
antihistamine    — Антигистаминные
antibiotic       — Антибиотики
nsaid            — Противовоспалительные
analgesic        — Обезболивающие
cardiac          — Сердечные
gastrointestinal — ЖКТ
dermatological   — Дерматологические
hormonal         — Гормональные
supplement       — Добавки
other            — Другое
```

---

## 9. Связующие таблицы для Фазы 2

### 9.1 pet_vaccinations

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | PK |
| `pet_id` | UUID | FK → pets |
| `vaccine_code` | VARCHAR(50) | FK → vaccines |
| `date_administered` | DATE | Дата вакцинации |
| `next_due_date` | DATE | Следующая дата |
| `manufacturer` | VARCHAR(200) | Производитель |
| `batch_number` | VARCHAR(100) | Номер партии |
| `administered_by` | VARCHAR(200) | Кем проведена |
| `notes` | TEXT | Примечания |

### 9.2 pet_medications

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | PK |
| `pet_id` | UUID | FK → pets |
| `medication_code` | VARCHAR(50) | FK → medications |
| `dosage` | VARCHAR(100) | Дозировка |
| `frequency` | ENUM | Периодичность |
| `start_date` | DATE | Дата начала |
| `end_date` | DATE | Дата окончания |
| `prescribed_for` | VARCHAR(200) | Назначен для |
| `is_active` | BOOLEAN | Активный приём |

### 9.3 pet_care_procedures

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | PK |
| `pet_id` | UUID | FK → pets |
| `procedure_code` | VARCHAR(50) | FK → care_procedures |
| `performed_date` | DATE | Дата выполнения |
| `next_due_date` | DATE | Следующая дата |
| `notes` | TEXT | Примечания |

### 9.4 breed_care_procedures

| Поле | Тип | Описание |
|------|-----|----------|
| `breed_id` | INTEGER | FK → breeds |
| `procedure_code` | VARCHAR(50) | FK → care_procedures |
| `is_mandatory` | BOOLEAN | Обязательная |
| `recommended_frequency` | ENUM | Рекомендуемая частота |
| `breed_specific_notes` | TEXT | Особенности для породы |

---

## История изменений

| Дата | Версия | Изменения |
|------|--------|-----------|
| 18.01.2026 | 1.0 | Создание документа, вынос таблиц из основной спецификации |
