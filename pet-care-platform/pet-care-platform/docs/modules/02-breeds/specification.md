# База данных по породам - Техническая спецификация

## 1. Общее описание и назначение

### 1.1. Назначение системы
База знаний характеристик пород собак и кошек является центральным компонентом платформы "Питомец+", обеспечивающим персонализированные рекомендации во всех модулях системы.

### 1.2. Основные функции
- **Хранение эталонных характеристик** 128 пород (58 кошек, 66 собак)
- **API для доступа** к данным с фильтрацией и поиском
- **Сравнение параметров питомца** с эталоном породы
- **Генерация рекомендаций** по уходу, питанию, здоровью
- **Интеграция** со всеми модулями платформы

### 1.3. Технический стек
- **Backend**: Django 5.1.5 + Django REST Framework 3.15.2
- **База данных**: PostgreSQL с оптимизированными индексами
- **Кэширование**: Django Cache Framework + Redis
- **Документация данных**: JSON файлы в `/data_breeds/`

## 2. Архитектура и компоненты системы

### 2.1. Структура компонентов

```
📁 backend/apps/pets/
├── 📄 breed_models.py          # Django модели пород
├── 📄 breed_views.py           # API представления
├── 📄 serializers_breeds.py    # Сериализаторы
├── 📄 services_breeds.py       # Бизнес-логика
├── 📄 urls.py                  # Маршруты API
└── 📁 management/commands/
    └── 📄 load_breeds.py       # Загрузка данных

📁 frontend/src/components/PetID/
├── 📄 BreedComparisonWidget.jsx    # Виджет сравнения
├── 📄 BreedInfoWidget.jsx          # Информация о породе
└── 📄 DietCalculationWidget.jsx    # Расчет рациона

📁 data_breeds/
├── 📄 breeds.json              # Основные характеристики
├── 📄 breed_health.json        # Риски здоровья
├── 📄 breed_nutrition.json     # Питание
└── 📄 breed_care.json          # Уход
```

### 2.2. Связи с другими модулями

| Модуль | Тип интеграции | Назначение |
|--------|----------------|------------|
| **PetID** | ForeignKey Breed | Автозаполнение профиля |
| **Магазин** | Breed характеристики | Подбор товаров/корма |
| **Курсы** | Trainability уровень | Персонализация обучения |
| **Календарь** | Care процедуры | Генерация напоминаний |
| **Аналитика** | Статистика пород | Отчеты и метрики |

## 3. Модели данных

### 3.1. Breed - Основная модель породы

```python
class Breed(models.Model):
    # Основная информация
    id = models.IntegerField(primary_key=True)  # ID из JSON
    species = models.CharField(choices=[('dog', 'Собака'), ('cat', 'Кошка')])
    name = models.CharField(max_length=100, unique=True)
    name_en = models.CharField(max_length=100, blank=True)
    slug = models.SlugField(max_length=120, unique=True)

    # Описания
    description = models.TextField(blank=True)
    short_description = models.TextField(blank=True)

    # Физические характеристики
    size_category = models.CharField(choices=[
        ('tiny', 'Крошечный'), ('small', 'Маленький'),
        ('medium', 'Средний'), ('large', 'Крупный'), ('giant', 'Гигантский')
    ])
    weight_min = models.DecimalField(max_digits=5, decimal_places=2)
    weight_max = models.DecimalField(max_digits=5, decimal_places=2)
    height_min = models.IntegerField(null=True, blank=True)
    height_max = models.IntegerField(null=True, blank=True)
    lifespan_min = models.IntegerField()
    lifespan_max = models.IntegerField()

    # Поведение и характер
    energy_level = models.CharField(choices=[
        ('very_low', 'Очень низкий'), ('low', 'Низкий'),
        ('medium', 'Средний'), ('high', 'Высокий'), ('very_high', 'Очень высокий')
    ])
    trainability = models.CharField(choices=LEVEL_CHOICES)
    intelligence = models.CharField(choices=LEVEL_CHOICES)
    friendliness_to_children = models.CharField(choices=LEVEL_CHOICES)
    friendliness_to_pets = models.CharField(choices=LEVEL_CHOICES)
    friendliness_to_strangers = models.CharField(choices=LEVEL_CHOICES)
    independence = models.CharField(choices=LEVEL_CHOICES)

    # Уход
    grooming_frequency = models.CharField(choices=[
        ('minimal', 'Минимальный'), ('weekly', 'Еженедельный'),
        ('regular', 'Регулярный'), ('daily', 'Ежедневный'), ('professional', 'Профессиональный')
    ])
    shedding_level = models.CharField(choices=LEVEL_CHOICES)
    coat_type = models.CharField(choices=[
        ('hairless', 'Бесшерстная'), ('short', 'Короткая'), ('medium', 'Средняя'),
        ('long', 'Длинная'), ('wire', 'Жесткая'), ('curly', 'Кудрявая'), ('double', 'Двойная')
    ])

    # Здоровье
    health_risk_level = models.CharField(choices=LEVEL_CHOICES)
    hypoallergenic = models.BooleanField(default=False)
    brachycephalic = models.BooleanField(default=False)

    # Условия содержания
    apartment_friendly = models.BooleanField(default=True)
    good_for_novice = models.BooleanField(default=True)

    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Связи
    health_risks: BreedHealth[] via ForeignKey
    nutrition: BreedNutrition via OneToOneField
    care_procedures: BreedCare[] via ForeignKey
```

### 3.2. BreedHealth - Риски здоровья

```python
class BreedHealth(models.Model):
    CONDITION_TYPE_CHOICES = [
        ('genetic', 'Генетическое'),
        ('congenital', 'Врожденное')
    ]

    SEVERITY_CHOICES = [
        ('low', 'Низкая'), ('medium', 'Средняя'), ('high', 'Высокая')
    ]

    AFFECTED_SYSTEM_CHOICES = [
        ('musculoskeletal', 'Опорно-двигательная'),
        ('cardiovascular', 'Сердечно-сосудистая'),
        ('respiratory', 'Дыхательная'),
        ('digestive', 'Пищеварительная'),
        ('endocrine', 'Эндокринная'),
        ('nervous', 'Нервная'),
        ('integumentary', 'Кожа и шерсть'),
        ('ophthalmologic', 'Офтальмологическая'),
        ('dental', 'Стоматологическая')
    ]

    breed = models.ForeignKey(Breed, on_delete=models.CASCADE, related_name='health_risks')
    condition_name = models.CharField(max_length=200)
    condition_type = models.CharField(max_length=20, choices=CONDITION_TYPE_CHOICES)
    affected_system = models.CharField(max_length=50, choices=AFFECTED_SYSTEM_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    prevalence_percent = models.DecimalField(max_digits=5, decimal_places=2)
    age_of_onset = models.CharField(max_length=50, blank=True)
    prevention = models.TextField()
    screening = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
```

### 3.3. BreedNutrition - Рекомендации по питанию

```python
class BreedNutrition(models.Model):
    LEVEL_CHOICES = [('low', 'Низкая'), ('medium', 'Средняя'), ('high', 'Высокая'), ('very_high', 'Очень высокая')]
    CALORIE_CHOICES = [('low', 'Низкая'), ('medium', 'Средняя'), ('high', 'Высокая')]
    DIET_TYPE_CHOICES = [('dry', 'Сухой'), ('wet', 'Влажный'), ('mixed', 'Смешанный')]

    breed = models.OneToOneField(Breed, on_delete=models.CASCADE, primary_key=True, related_name='nutrition')
    protein_need = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    calorie_density = models.CharField(max_length=20, choices=CALORIE_CHOICES)
    diet_type = models.CharField(max_length=20, choices=DIET_TYPE_CHOICES)
    feeding_frequency = models.CharField(max_length=50)
    special_considerations = models.TextField(blank=True)
    common_allergens = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 3.4. BreedCare - Процедуры ухода

```python
class BreedCare(models.Model):
    CARE_CATEGORY_CHOICES = [
        ('coat', 'Шерсть'), ('skin', 'Кожа'), ('ears', 'Уши'),
        ('eyes', 'Глаза'), ('dental', 'Зубы'), ('nails', 'Когти')
    ]

    IMPORTANCE_CHOICES = [
        ('low', 'Низкая'), ('medium', 'Средняя'), ('high', 'Высокая'), ('critical', 'Критическая')
    ]

    SEASON_CHOICES = [
        ('all', 'Круглый год'), ('spring', 'Весна'), ('summer', 'Лето'),
        ('autumn', 'Осень'), ('winter', 'Зима')
    ]

    breed = models.ForeignKey(Breed, on_delete=models.CASCADE, related_name='care_procedures')
    care_category = models.CharField(max_length=20, choices=CARE_CATEGORY_CHOICES)
    procedure = models.CharField(max_length=200)
    frequency = models.CharField(max_length=50)
    importance = models.CharField(max_length=20, choices=IMPORTANCE_CHOICES)
    season = models.CharField(max_length=20, choices=SEASON_CHOICES, default='all')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 3.5. Индексы и оптимизации

```sql
-- Оптимизированные индексы для производительности
CREATE INDEX breeds_species_size_idx ON breeds (species, size_category);
CREATE INDEX breeds_energy_idx ON breeds (energy_level);
CREATE INDEX breeds_health_idx ON breeds (health_risk_level);
CREATE INDEX breeds_slug_idx ON breeds (slug);

-- Индексы для связанных таблиц
CREATE INDEX breed_health_breed_severity_idx ON breed_health (breed_id, severity);
CREATE INDEX breed_care_breed_importance_idx ON breed_care (breed_id, importance);
```

## 4. API эндпоинты

### 4.1. Основные эндпоинты

#### GET /api/pets/breeds/
**Список пород с фильтрацией**

**Параметры запроса:**
- `species` - dog/cat (опционально)
- `size` - tiny/small/medium/large/giant (опционально)
- `hypoallergenic` - true/false (опционально)
- `apartment_friendly` - true/false (опционально)
- `good_for_novice` - true/false (опционально)
- `search` - поиск по названию (опционально)

**Пример запроса:**
```
GET /api/pets/breeds/?species=dog&size=medium&hypoallergenic=true
```

**Структура ответа:**
```json
{
  "count": 25,
  "breeds": [
    {
      "id": 1,
      "species": "dog",
      "name": "Лабрадор",
      "slug": "labrador",
      "size_category": "large",
      "weight_min": 25.0,
      "weight_max": 36.0,
      "energy_level": "high",
      "health_risk_level": "medium",
      "hypoallergenic": false,
      "apartment_friendly": true
    }
  ]
}
```

#### GET /api/pets/breeds/{slug}/
**Детальная информация о породе**

**Пример запроса:**
```
GET /api/pets/breeds/labrador/
```

**Структура ответа:**
```json
{
  "id": 1,
  "species": "dog",
  "name": "Лабрадор",
  "name_en": "Labrador Retriever",
  "slug": "labrador",
  "description": "Описание породы...",
  "size_category": "large",
  "weight_min": 25.0,
  "weight_max": 36.0,
  "lifespan_min": 10,
  "lifespan_max": 14,
  "energy_level": "high",
  "trainability": "very_high",
  "health_risk_level": "medium",
  "hypoallergenic": false,
  "apartment_friendly": true,
  "health_risks": [...],
  "nutrition": {...},
  "care_procedures": [...]
}
```

#### GET /api/pets/{pet_id}/breed-comparison/
**Сравнение питомца с эталоном породы**

**Структура ответа:**
```json
{
  "pet": {
    "id": "uuid",
    "name": "Шарик",
    "weight": 32.5,
    "activity_level": "high"
  },
  "breed_standard": {
    "name": "Лабрадор",
    "weight_min": 25.0,
    "weight_max": 36.0,
    "energy_level": "high"
  },
  "analysis": {
    "weight": {
      "status": "normal",
      "current_weight": 32.5,
      "ideal_min": 25.0,
      "ideal_max": 36.0,
      "message": "Вес в пределах нормы",
      "score": 100
    },
    "activity": {
      "status": "normal",
      "message": "Активность соответствует породе",
      "score": 95
    }
  },
  "health_risks": [...],
  "recommendations": [...],
  "overall_score": 97
}
```

### 4.2. Дополнительные эндпоинты

#### GET /api/pets/breeds/{slug}/health/
**Риски здоровья породы**

#### GET /api/pets/breeds/{id}/suggestions/
**Подсказки для автозаполнения PetID**

## 5. Бизнес-логика

### 5.1. PetBreedComparisonService

#### Основные методы:

**compare_pet_with_breed(pet)**
- Комплексное сравнение параметров
- Возвращает анализ + рекомендации

**analyze_weight(pet, breed)**
- Сравнение веса: ±15% от эталона = норма
- ±15-30% = внимание
- >30% = проблема

**analyze_activity(pet, breed)**
- Маппинг уровней: low=1, medium=2, high=3
- Разница >1 уровня = несоответствие

**analyze_health(pet, breed)**
- Проверка хронических заболеваний
- Оценка рисков породы по возрасту
- Брахицефалы требуют особого внимания

#### Алгоритмы оценки:

**Общий скор соответствия:**
```python
weights = {
    'weight': 0.20,      # 20%
    'activity': 0.15,    # 15%
    'nutrition': 0.15,   # 15%
    'behavior': 0.15,    # 15%
    'health': 0.20,      # 20%
    'housing': 0.15      # 15%
}
```

**Критерии оценки веса:**
- < min_weight * 0.85: severely_underweight (30 очков)
- < min_weight * 0.95: underweight (60 очков)
- > max_weight * 1.05: overweight (55 очков)
- > max_weight * 1.2: obese (20 очков)
- Иначе: normal (100 очков)

### 5.2. Генерация рекомендаций

#### Логика формирования советов:
1. **По весу**: диета/набор веса при отклонениях
2. **По активности**: увеличение нагрузки при недостатке
3. **По здоровью**: регулярные осмотры, профилактика
4. **По поведению**: дрессировка, социализация
5. **По условиям**: оптимизация содержания

#### Приоритезация:
- high: немедленные действия требуются
- medium: рекомендуется обратить внимание
- low: профилактические меры

## 6. Производительность и оптимизация

### 6.1. Кэширование
- Популярные породы кэшируются на 1 час
- Результаты сравнения - на 30 минут
- Индексы на часто фильтруемые поля

### 6.2. Оптимизация запросов
- select_related для связанных данных
- prefetch_related для списков
- only() для необходимых полей

### 6.3. Масштабирование
- Read replicas для тяжелых запросов
- CDN для статических данных
- Elasticsearch для полнотекстового поиска

## 7. Мониторинг и метрики

### 7.1. Технические метрики
- Response time API эндпоинтов
- Cache hit ratio
- Database query performance
- Error rates

### 7.2. Бизнес-метрики
- Популярность пород (топ-10)
- Использование сравнения питомцев
- Конверсия рекомендаций в покупки
- Пользовательская удовлетворенность

## 8. План реализации

### 8.1. Текущий статус: ✅ 90% готово
- ✅ Модели Django созданы
- ✅ Данные загружены (124 породы)
- ✅ API эндпоинты реализованы
- ✅ Сервисы бизнес-логики написаны
- ✅ Frontend интеграция готова
- ✅ Кэширование настроено

### 8.2. Оставшиеся задачи
- 🔄 Дополнительные фильтры API
- 🔄 Валидация полноты данных
- 🔄 Оптимизация производительности
- 🔄 Мониторинг и алерты

### 8.3. Тестирование
- Unit тесты сервисов
- Integration тесты API
- Performance тесты
- E2E тесты сравнения пород