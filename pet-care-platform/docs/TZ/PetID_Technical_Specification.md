# Техническое задание: Разработка полноценной системы PetID

## 1. Общая информация

### 1.1. Наименование проекта
Разработка полноценной системы PetID для платформы "Питомец+"

### 1.2. Заказчик
Команда разработки платформы "Питомец+"

### 1.3. Исполнитель
Команда разработки backend/frontend

### 1.4. Цели и задачи проекта

#### Основные цели:
- Проанализировать текущую реализацию PetID
- Выявить проблемы в UI/UX и архитектуре
- Разработать новую систему создания и управления PetID
- Обеспечить интеграцию с существующими сервисами платформы

#### Задачи проекта:
1. Анализ текущей системы PetID
2. Разработка новой архитектуры системы
3. Создание улучшенного пользовательского интерфейса
4. Реализация backend API
5. Интеграция с существующими сервисами
6. Тестирование и оптимизация производительности

### 1.5. Термины и определения

- **PetID** - уникальный профиль питомца, содержащий всю информацию о животном
- **Персонализация** - адаптация контента и рекомендаций под конкретного питомца
- **Профиль** - совокупность данных о питомце
- **Базовый профиль** - минимальный набор обязательных полей для создания PetID
- **Расширенный профиль** - полный набор полей для глубокой персонализации

---

## 2. Текущий анализ системы PetID

### 2.1. Структура базы данных

#### Модель Pet (backend/apps/pets/models.py)

**Основные поля (обязательные):**
- `id` - UUIDv7 идентификатор
- `owner` - ForeignKey к User (владелец)
- `name` - кличка питомца
- `species` - вид (dog/cat)
- `breed` - порода (опционально)
- `date_of_birth` - дата рождения
- `weight` - вес в кг
- `gender` - пол (male/female/unknown)
- `is_neutered` - кастрирован/стерилизован
- `photo` - изображение

**Расширенные поля (добавлены в миграции 0007_add_petid_fields.py):**

**Физические параметры:**
- `size` - размер (small/medium/large)
- `body_type` - тип телосложения (slim/normal/overweight/obese)

**Контакты владельца:**
- `owner_phone` - телефон владельца
- `owner_email` - email владельца
- `owner_city` - город владельца

**Питание:**
- `diet_type` - тип питания (dry/wet/mixed/raw/home)
- `feeding_frequency` - частота кормления (1/2/3/free)
- `sensitive_digestion` - чувствительное пищеварение
- `excluded_ingredients` - исключаемые ингредиенты (JSON array)

**Поведение и дрессировка:**
- `behavior_type` - тип поведения (calm/active/aggressive/shy/playful)
- `social_level` - уровень социализации (home_only/street/social/mixed)
- `training_experience` - опыт дрессировки (none/basic/intermediate/advanced/professional)
- `character_traits` - черты характера (JSON array)
- `training_goals` - цели дрессировки
- `behavioral_problems` - поведенческие проблемы (JSON array)

**Здоровье:**
- `health_issues` - проблемы здоровья (JSON array)
- `chronic_conditions` - хронические заболевания
- `vaccinations` - вакцинации
- `medications` - принимаемые препараты
- `dental_health` - состояние зубов (excellent/good/fair/needs_attention)
- `vet_visits` - посещения ветеринара

**Образ жизни:**
- `activity_level` - уровень активности (low/medium/high)
- `housing_type` - тип жилья (apartment/house/cottage/other)
- `has_yard` - есть двор
- `other_pets` - другие питомцы дома
- `has_children` - в доме есть дети
- `walk_frequency` - частота прогулок
- `walk_duration` - длительность прогулки

**Служебные поля:**
- `special_needs` - особые потребности (JSON array)
- `preferred_activities` - предпочитаемые активности (JSON array)
- `vitamins_supplements` - добавки и витамины
- `is_extended_profile` - флаг расширенного профиля
- `created_at`, `updated_at` - временные метки

#### Индексы и связи:
- Индекс по (owner, -created_at)
- Индекс по species
- ForeignKey к User (related_name='pets')

### 2.2. Использование в сервисах

#### Магазин товаров (apps/shop)
**Текущие поля PetID, используемые в сервисе:**
- `species` - определяет категорию товаров (dog/cat)
- `pet_id` - для связи заказов с питомцами

**Модели:**
- **CartItem.pet** - ForeignKey к Pet для связи товаров с питомцами
- **OrderItem.pet** - сохранение связи в истории заказов
- **Reservation.pet_id** - CharField для резервирования (не ForeignKey!)

**API использование (views.py:104-118):**
```python
pet_id = request.query_params.get('pet_id')
if pet_id and request.user.is_authenticated:
    try:
        pet = Pet.objects.select_related('owner').get(id=pet_id, owner=request.user)
        if pet.species in ['dog', 'cat']:
            animal = pet.species
    except (Pet.DoesNotExist, ValueError):
        pass
```

**Проблемы текущей реализации:**
- Используется только вид животного (species)
- Отсутствует персонализация по возрасту, размеру, здоровью
- Нет учета аллергий и предпочтений в питании
- pet_id передается как query parameter без строгой валидации
- Reservation использует CharField вместо ForeignKey

#### Курсы обучения (apps/training)
**Модели:**
- **Course.pet_types** - JSONField с массивом типов животных ['dog', 'cat', 'all']
- **Course.recommended_behavior_types** - рекомендации по поведению
- **Course.recommended_activity_levels** - рекомендации по активности

**API использование (views.py:89-131):**
```python
pet_id = request.query_params.get('pet_id')
if pet_id and request.user.is_authenticated:
    try:
        pet = Pet.objects.get(id=pet_id, owner=request.user)
        if pet.species in ['dog', 'cat']:
            pet_type = pet.species
    except Exception:
        pass
```

**Метод filter_by_pet_characteristics (managers.py:289-350):**
Фильтрует курсы по:
- behavior_type (спокойный/активный/агрессивный)
- activity_level (низкая/средняя/высокая)
- social_level (домашний/уличный/социальный)
- training_experience (none/basic/intermediate/advanced/professional)

**Проблемы:**
- Слабая обработка ошибок (пустой except Exception)
- Неэффективная логика фильтрации по опыту дрессировки
- Отсутствие кэширования результатов фильтрации

#### Календарь (apps/calendar)
**Текущие поля PetID, используемые в сервисе:**
- `id` - идентификатор питомца для связи событий
- `name` - отображение имени питомца в событиях

**Модели:**
- **CalendarEvent.pet** - ForeignKey к Pet (каждое событие привязано к питомцу)
- **CalendarEvent.user** - ForeignKey к User (владелец)

**Использование:**
- События календаря создаются для конкретных питомцев
- Админ-панель группирует события по питомцам
- Связь: user -> pet -> calendar_events

**Проблемы текущей реализации:**
- Минимальная интеграция с характеристиками питомца
- Нет автоматической генерации событий на основе профиля
- Отсутствие персонализации напоминаний (прогулки, кормление)

#### Аналитика (apps/analytics)
**Метрики по питомцам (services.py:235-244):**
- pets_total - общее количество питомцев
- pets_dogs - количество собак
- pets_cats - количество кошек
- pets_with_extended_profiles - питомцы с расширенными профилями
- pets_profile_completeness_avg - средняя заполненность профилей
- pets_breed_popularity - популярность пород
- pets_age_distribution - распределение по возрасту

**Проблемы:**
- Ограниченный набор метрик
- Нет детального анализа использования профилей
- Отсутствие сегментации пользователей

---

## 3. Анализ пользовательского опыта

### 3.1. Процесс создания PetID

**Текущий путь пользователя:**
1. Переход на страницу PetID
2. Нажатие "Создать питомца"
3. Прохождение 8-шагового мастера
4. Каждый шаг требует обязательного заполнения
5. Нет возможности пропустить шаги
6. После завершения - возврат к списку

**Проблемные моменты:**
- **Длительность процесса** - занимает 5-10 минут
- **Отсутствие мотивации** - пользователь не понимает ценности
- **Технические барьеры** - проблемы с загрузкой фото, валидацией
- **Отсутствие помощи** - нет подсказок, примеров, рекомендаций

### 3.2. UI/UX проблемы

#### Навигация:
- **Линейный процесс** - нельзя вернуться и исправить
- **Отсутствие breadcrumbs** - пользователь теряется
- **Нет превью профиля** - нельзя увидеть результат до завершения

#### Визуальный дизайн:
- **Устаревший интерфейс** - не соответствует современным стандартам
- **Плохая адаптивность** - проблемы на мобильных устройствах
- **Отсутствие анимаций** - статичный и скучный интерфейс

#### Функциональность:
- **Отсутствие автодополнения** - все поля заполняются вручную
- **Нет интеграции с ветклиниками** - нельзя импортировать данные
- **Отсутствие шаблонов** - нет предустановленных профилей для популярных пород

### 3.3. Проблемы с данными

#### Качество данных:
- **Неконсистентность** - разные пользователи заполняют поля по-разному
- **Отсутствие стандартов** - "средний" vs "medium", "мопс" vs "pug"
- **Пустые профили** - пользователи создают минимальные профили

#### Валидация:
- **Слабая проверка** - можно ввести некорректные данные
- **Отсутствие бизнес-правил** - нет проверки логической一致ности
- **Проблемы с форматами** - даты, вес, размеры в разных форматах

---

## 4. Требования к новой системе

### 4.1. Функциональные требования

#### Базовые функции:
- Создание PetID с базовой информацией (3-5 полей)
- Постепенное расширение профиля
- Импорт данных из ветклиник, приложений
- Экспорт PetID в различные форматы
- QR-код для быстрого доступа

#### Расширенные возможности:
- **Персонализация контента** - рекомендации товаров и курсов
- **Умные подсказки** - автодополнение на основе породы/возраста
- **Интеграция с ветеринарами** - синхронизация с клиниками
- **Семейные профили** - несколько питомцев в одной семье
- **История изменений** - версионирование профиля

#### Админ-функции:
- Управление шаблонами профилей
- Аналитика создания PetID
- Модерация контента
- Экспорт данных для маркетинга

### 4.2. Нефункциональные требования

#### Производительность:
- Время создания базового профиля < 30 секунд
- Загрузка страницы PetID < 2 секунд
- Поиск и фильтрация < 1 секунды

#### Масштабируемость:
- Поддержка 100k+ активных пользователей
- 1M+ PetID профилей
- Горизонтальное масштабирование

#### Безопасность:
- Валидация принадлежности PetID пользователю
- Шифрование чувствительных данных
- Аудит изменений профиля

#### Доступность:
- Поддержка мобильных устройств
- VoiceOver и screen readers
- Высокий контраст и крупный шрифт

---

## 5. Архитектура решения

### 5.1. Структура полей модели Pet

#### Принципы классификации полей:

1. **Обязательные поля** - заполняются при создании, критично для базовой персонализации
2. **Автоматические поля** - рассчитываются системой на основе других данных
3. **Опциональные поля** - заполняются постепенно для расширенной персонализации

#### Полная структура полей Pet:

| Категория | Тип | Поле | Обязательно | Автоматическое | Описание |
|-----------|-----|------|-------------|----------------|----------|
| **Базовая** | String | `name` | ✅ | ❌ | Кличка питомца |
| | String | `species` | ✅ | ❌ | Вид (dog/cat) |
| | Date | `date_of_birth` | ✅ | ❌ | Дата рождения |
| | ForeignKey | `breed` | ✅ | ❌ | Порода из справочника |
| | Decimal | `weight` | ✅ | ❌ | Вес в кг |
| | String | `gender` | ✅ | ❌ | Пол животного |
| | JSON | `health_issues` | ✅ | ❌ | Основные проблемы здоровья |
| | JSON | `excluded_ingredients` | ✅ | ❌ | Аллергии/непереносимость |
| | String | `activity_level` | ✅ (собаки) | ❌ | Уровень активности |
| | String | `housing_type` | ✅ (кошки) | ❌ | Тип жилья |
| | JSON | `behavioral_problems` | ✅ | ❌ | Поведенческие проблемы |
| | Image | `photo` | ❌ | ❌ | Фото питомца |

| Категория | Тип | Поле | Обязательно | Автоматическое | Описание |
|-----------|-----|------|-------------|----------------|----------|
| **Автоматические** | Integer | `age` | ❌ | ✅ | Возраст в годах (из date_of_birth) |
| | String | `age_category` | ❌ | ✅ | Категория возраста (puppy/adult/senior) |
| | String | `size` | ❌ | ✅ | Размер (из weight + breed) |
| | Integer | `profile_completeness` | ❌ | ✅ | Процент заполненности профиля |

| Категория | Тип | Поле | Обязательно | Автоматическое | Описание |
|-----------|-----|------|-------------|----------------|----------|
| **Опциональные** | Boolean | `is_neutered` | ❌ | ❌ | Кастрирован/стерилизован |
| | String | `behavior_type` | ❌ | ❌ | Тип поведения |
| | String | `social_level` | ❌ | ❌ | Уровень социализации |
| | String | `training_experience` | ❌ | ❌ | Опыт дрессировки |
| | JSON | `character_traits` | ❌ | ❌ | Черты характера |
| | String | `training_goals` | ❌ | ❌ | Цели дрессировки |
| | Text | `chronic_conditions` | ❌ | ❌ | Хронические заболевания |
| | JSON | `vaccinations` | ❌ | ❌ | Вакцинации |
| | JSON | `medications` | ❌ | ❌ | Принимаемые препараты |
| | String | `dental_health` | ❌ | ❌ | Состояние зубов |
| | Text | `vet_visits` | ❌ | ❌ | Посещения ветеринара |
| | String | `diet_type` | ❌ | ❌ | Тип питания |
| | String | `feeding_frequency` | ❌ | ❌ | Частота кормления |
| | Boolean | `sensitive_digestion` | ❌ | ❌ | Чувствительное пищеварение |
| | JSON | `vitamins_supplements` | ❌ | ❌ | Витамины и добавки |
| | String | `body_type` | ❌ | ❌ | Тип телосложения |
| | Boolean | `has_yard` | ❌ | ❌ | Наличие двора |
| | Boolean | `has_children` | ❌ | ❌ | Дети в доме |
| | JSON | `other_pets` | ❌ | ❌ | Другие питомцы |
| | String | `walk_frequency` | ❌ (только собаки) | ❌ | Частота прогулок |
| | String | `walk_duration` | ❌ (только собаки) | ❌ | Длительность прогулки |
| | JSON | `special_needs` | ❌ | ❌ | Особые потребности |
| | JSON | `preferred_activities` | ❌ | ❌ | Предпочитаемые активности |
| | String | `owner_phone` | ❌ | ❌ | Телефон владельца |
| | String | `owner_email` | ❌ | ❌ | Email владельца |
| | String | `owner_city` | ❌ | ❌ | Город владельца |

#### Логика автоматического расчета полей:

```python
class Pet(models.Model):
    # ... поля ...

    @property
    def age(self):
        """Возраст в годах"""
        if not self.date_of_birth:
            return None
        today = date.today()
        age = today.year - self.date_of_birth.year
        if today.month < self.date_of_birth.month or \
           (today.month == self.date_of_birth.month and today.day < self.date_of_birth.day):
            age -= 1
        return age

    @property
    def age_category(self):
        """Категория возраста"""
        if not self.age:
            return None
        if self.age < 1:
            return 'puppy' if self.species == 'dog' else 'kitten'
        elif self.age > 10:
            return 'senior'
        else:
            return 'adult'

    @property
    def size(self):
        """Размер питомца (автоматический расчет)"""
        if not self.weight or not self.breed:
            return None

        # Логика определения размера по весу относительно породы
        breed_avg = self.breed.average_weight
        weight_ratio = self.weight / breed_avg

        if weight_ratio < 0.8:
            return 'toy' if self.breed.size_category in ['small', 'toy'] else 'small'
        elif weight_ratio > 1.2:
            return 'large' if self.breed.size_category in ['medium', 'large'] else 'giant'
        else:
            return self.breed.size_category

    def calculate_profile_completeness(self):
        """Расчет процента заполненности профиля"""
        required_fields = [
            self.name, self.species, self.date_of_birth, self.breed,
            self.weight, self.gender, self.health_issues, self.excluded_ingredients
        ]

        # Дополнительные обязательные поля по виду
        if self.species == 'dog':
            required_fields.append(self.activity_level)
        elif self.species == 'cat':
            required_fields.append(self.housing_type)

        required_fields.append(self.behavioral_problems)

        filled_fields = sum(1 for field in required_fields if field)
        total_fields = len(required_fields)

        # Опциональные поля дают дополнительные баллы
        optional_fields = [
            self.is_neutered, self.behavior_type, self.social_level,
            self.training_experience, self.chronic_conditions, self.vaccinations,
            self.medications, self.diet_type, self.feeding_frequency,
            self.housing_type if self.species == 'dog' else self.activity_level,
            self.has_yard, self.has_children, self.other_pets,
            self.walk_frequency if self.species == 'dog' else None,
            self.walk_duration if self.species == 'dog' else None,
            self.photo, self.owner_phone, self.owner_email, self.owner_city
        ]

        optional_filled = sum(1 for field in optional_fields if field)
        optional_bonus = (optional_filled / len([f for f in optional_fields if f is not None])) * 30

        self.profile_completeness = min(100, int((filled_fields / total_fields) * 70 + optional_bonus))
        return self.profile_completeness
```

### 5.1.1. Реализованная логика персонализации по сервисам

#### Магазин товаров - комплексная персонализация

**Выбранный вариант:** Вариант Б - Сложные рекомендации (вид + порода + возраст + здоровье + аллергии + предпочтения)

**Алгоритм персонализации товаров с учетом породы:**

```python
def get_personalized_products(pet, category=None, limit=20):
    """
    Комплексная персонализация товаров с учетом породы, возраста и характеристик
    """
    products = Product.objects.catalog()

    # Базовая фильтрация по виду
    if pet.species == 'dog':
        products = products.for_animal('dog')
    elif pet.species == 'cat':
        products = products.for_animal('cat')

    # Персонализация по размеру (автоматический расчет по породе и весу)
    if pet.calculated_size:
        size_mapping = {
            'toy': ['small', 'mini', 'toy'],
            'small': ['small', 'mini'],
            'medium': ['medium', 'regular'],
            'large': ['large', 'big'],
            'giant': ['large', 'big', 'giant', 'extra_large']
        }
        suitable_sizes = size_mapping.get(pet.calculated_size, [])
        if suitable_sizes:
            products = products.filter(params__size__in=suitable_sizes)

    # Персонализация по породе (специфические товары)
    if pet.breed:
        # Специфические товары для породы (например, для пуделей - груминг товары)
        if 'poodle' in pet.breed.name.lower():
            products = products.filter(
                Q(category='care') | Q(subcategory__in=['grooming', 'brushes'])
            )
        # Для brachycephalic пород (короткомордых) - специальные миски
        elif pet.breed.name.lower() in ['bulldog', 'pug', 'persian']:
            products = products.filter(params__special_features__contains=['slow_feeder'])

    # Возрастная персонализация с учетом породы
    if pet.age_category:
        if pet.age_category in ['puppy', 'kitten']:
            products = products.filter(params__age_group__in=['puppy', 'kitten', 'junior'])
            # Для щенков активных пород - специальные игрушки
            if pet.breed and pet.breed.energy_level in ['high', 'very_high']:
                products = products.filter(params__activity_level__in=['puppy', 'playful'])
        elif pet.age_category == 'senior':
            products = products.filter(params__age_group__in=['senior', 'mature'])
            # Для пожилых - специальные добавки для суставов
            if pet.breed and 'joint' in str(pet.breed.common_health_issues):
                products = products.filter(params__health_benefits__contains=['joint'])

    # Здоровье и генетические проблемы породы
    breed_health_issues = pet.potential_health_issues
    if breed_health_issues:
        health_filters = []
        for issue in breed_health_issues:
            if 'hip' in issue.lower() or 'joint' in issue.lower():
                health_filters.extend(['joint', 'glucosamine', 'chondroitin'])
            elif 'heart' in issue.lower():
                health_filters.extend(['heart', 'cardiovascular'])
            elif 'skin' in issue.lower():
                health_filters.extend(['skin', 'coat', 'hypoallergenic'])
            elif 'thyroid' in issue.lower():
                health_filters.extend(['thyroid', 'metabolism'])
        if health_filters:
            products = products.filter(params__health_benefits__overlap=health_filters)

    # Дополнительные проблемы здоровья пользователя
    if pet.health_issues:
        user_health_filters = []
        for issue in pet.health_issues:
            if 'weight' in issue.lower():
                user_health_filters.extend(['light', 'diet', 'weight_control'])
            elif 'digest' in issue.lower():
                user_health_filters.extend(['digestive', 'probiotic'])
            elif 'urinary' in issue.lower():
                user_health_filters.extend(['urinary', 'cranberry'])
        if user_health_filters:
            products = products.filter(params__health_benefits__overlap=user_health_filters)

    # Аллергии и исключения
    if pet.allergies:
        allergy_ingredients = [allergy.lower() for allergy in pet.allergies]
        products = products.exclude(params__ingredients__overlap=allergy_ingredients)

    if pet.excluded_ingredients:
        excluded = [ing.lower() for ing in pet.excluded_ingredients]
        products = products.exclude(params__ingredients__overlap=excluded)

    # Чувствительное пищеварение
    if pet.sensitive_digestion:
        products = products.filter(params__digestive_health=True)

    # Тип питания (автоматически предлагаемый или выбранный)
    diet_type = pet.diet_type or pet.suggested_diet_type
    if diet_type == 'dry':
        products = products.filter(subcategory='dry')
    elif diet_type == 'wet':
        products = products.filter(subcategory__in=['wet', 'canned', 'pouch'])

    # Активность породы (автоматическая или выбранная)
    activity_level = pet.activity_level or pet.suggested_activity_level
    if activity_level in ['high', 'very_high']:
        # Для активных пород - калорийные лакомства и активные игрушки
        products = products.filter(
            Q(params__activity_level__in=['high', 'active']) |
            Q(params__calorie_content__gte=300)  # Высококалорийные лакомства
        )
    elif activity_level == 'low':
        # Для спокойных - низкокалорийные и успокаивающие товары
        products = products.filter(params__activity_level__in=['calm', 'relaxing'])

    # Уход за шерстью (на основе породы)
    if pet.breed and pet.breed.grooming_needs:
        grooming_mapping = {
            'very_high': ['brushes', 'combs', 'shampoos', 'conditioners'],
            'high': ['brushes', 'combs'],
            'medium': ['brushes'],
        }
        needed_grooming = grooming_mapping.get(pet.breed.grooming_needs, [])
        if needed_grooming and category == 'care':
            products = products.filter(subcategory__in=needed_grooming)

    # Фильтр по категории
    if category:
        products = products.in_category(category)

    return products.order_by('-relevance_score')[:limit]
```

**Ключевые преимущества:**
- Учитывает все аспекты профиля питомца
- Автоматический расчет размера без ручного ввода
- Комплексная фильтрация по здоровью и питанию
- Персонализация по активности и возрасту

#### Курсы обучения - комплексная оценка сложности

**Выбранный вариант:** Вариант Б - Комплексная оценка (опыт + возраст + проблемы поведения)

**Алгоритм персонализации курсов с учетом породы:**

```python
def get_personalized_courses(pet, category=None, limit=10):
    """
    Комплексная персонализация курсов с учетом породы, возраста и характеристик
    """
    courses = Course.objects.published()

    # Базовая фильтрация по виду
    if pet.species == 'dog':
        courses = courses.for_dogs()
    elif pet.species == 'cat':
        courses = courses.for_cats()

    # Персонализация по породе
    if pet.breed:
        # Для brachycephalic пород - специальные курсы по дыханию
        if pet.breed.name.lower() in ['bulldog', 'pug', 'persian']:
            courses = courses.filter(tags__contains=['breathing', 'brachycephalic'])
        # Для активных пород - курсы по контролю энергии
        elif pet.breed.energy_level in ['high', 'very_high']:
            courses = courses.filter(tags__contains=['energy_control', 'focus'])

    # Возрастная персонализация
    if pet.age_category:
        if pet.age_category in ['puppy', 'kitten']:
            courses = courses.filter(tags__contains=['puppy', 'socialization'])
            # Для щенков крупных пород - дополнительные курсы
            if pet.breed and pet.breed.size_category in ['large', 'giant']:
                courses = courses.filter(tags__contains=['large_breed'])
        elif pet.age_category == 'senior':
            courses = courses.filter(tags__contains=['senior', 'gentle'])

    # Персонализация по опыту дрессировки
    training_exp_mapping = {
        'none': ['beginner', 'basics'],
        'basic': ['intermediate', 'obedience'],
        'intermediate': ['advanced', 'specialized'],
        'advanced': ['expert', 'professional'],
        'professional': ['competition', 'therapy']
    }

    if pet.training_experience:
        suitable_levels = training_exp_mapping.get(pet.training_experience, [])
        if suitable_levels:
            courses = courses.filter(tags__overlap=suitable_levels)

    # Персонализация по поведению
    if pet.behavioral_problems:
        behavior_mapping = {
            'aggression': ['aggression_control', 'behavior_modification'],
            'fear': ['confidence_building', 'desensitization'],
            'separation_anxiety': ['independence', 'alone_training'],
            'hyperactivity': ['calm_training', 'focus'],
            'destructiveness': ['behavior_control', 'enrichment']
        }

        behavior_tags = []
        for problem in pet.behavioral_problems:
            problem_tags = behavior_mapping.get(problem.lower(), [])
            behavior_tags.extend(problem_tags)

        if behavior_tags:
            courses = courses.filter(tags__overlap=behavior_tags)

    # Персонализация по активности
    if pet.activity_level:
        activity_mapping = {
            'low': ['relaxed', 'indoor'],
            'medium': ['balanced', 'moderate'],
            'high': ['active', 'energetic', 'outdoor']
        }
        suitable_activity = activity_mapping.get(pet.activity_level, [])
        if suitable_activity:
            courses = courses.filter(tags__overlap=suitable_activity)

    # Персонализация по социализации
    if pet.social_level:
        social_mapping = {
            'home_only': ['basic_socialization', 'home_training'],
            'street': ['urban_training', 'street_smart'],
            'social': ['advanced_socialization', 'group_training'],
            'mixed': ['balanced_socialization']
        }
        suitable_social = social_mapping.get(pet.social_level, [])
        if suitable_social:
            courses = courses.filter(tags__overlap=suitable_social)

    # Здоровье и ограничения
    if pet.health_issues:
        health_restrictions = []
        for issue in pet.health_issues:
            if 'joint' in issue.lower():
                health_restrictions.extend(['low_impact', 'gentle'])
            elif 'heart' in issue.lower():
                health_restrictions.extend(['low_intensity', 'short_sessions'])
            elif 'obesity' in issue.lower():
                health_restrictions.extend(['weight_management'])

        if health_restrictions:
            courses = courses.filter(tags__overlap=health_restrictions)

    # Семейная ситуация
    if pet.has_children:
        courses = courses.filter(tags__contains=['family_friendly'])
    if pet.other_pets:
        courses = courses.filter(tags__contains=['multi_pet_household'])

    # Фильтр по категории
    if category:
        courses = courses.in_category(category)

    return courses.order_by('-relevance_score')[:limit]
```

**Ключевые преимущества:**
- Комплексная оценка сложности обучения
- Учет возрастных и поведенческих особенностей
- Персонализация по здоровью и семейной ситуации
- Адаптация под опыт владельца

#### Календарь - персонализированные напоминания

**Выбранный вариант:** Вариант Б - Комплексные напоминания (здоровье + питание + активность + уход)

**Алгоритм генерации персонализированных событий:**

```python
def generate_personalized_calendar_events(pet, days_ahead=30):
    """
    Генерация персонализированных событий календаря для питомца
    """
    events = []

    # Базовые события по питанию
    feeding_events = generate_feeding_schedule(pet, days_ahead)
    events.extend(feeding_events)

    # События по активности (для собак)
    if pet.species == 'dog':
        activity_events = generate_activity_schedule(pet, days_ahead)
        events.extend(activity_events)

    # Ветеринарные события
    vet_events = generate_vet_schedule(pet, days_ahead)
    events.extend(vet_events)

    # События по уходу
    care_events = generate_care_schedule(pet, days_ahead)
    events.extend(are_events)

    # События по здоровью
    health_events = generate_health_schedule(pet, days_ahead)
    events.extend(health_events)

    # События по дрессировке (если есть цели)
    if pet.training_goals:
        training_events = generate_training_schedule(pet, days_ahead)
        events.extend(training_events)

    return events

def generate_feeding_schedule(pet, days_ahead):
    """Генерация расписания кормления"""
    events = []

    # Определение частоты кормления
    feeding_freq = pet.feeding_frequency or get_default_feeding_frequency(pet)

    # Расчет времени кормления
    feeding_times = calculate_feeding_times(feeding_freq)

    for day in range(days_ahead):
        date = timezone.now().date() + timedelta(days=day)

        for feeding_time in feeding_times:
            event_datetime = datetime.combine(date, feeding_time)

            # Пропускаем прошедшие события
            if event_datetime < timezone.now():
                continue

            # Корректировка по породе и возрасту
            portion = calculate_portion(pet, feeding_time)

            event = CalendarEvent(
                pet=pet,
                user=pet.owner,
                title=f"Кормление {pet.name}",
                event_type='feeding',
                start_time=event_datetime,
                end_time=event_datetime + timedelta(minutes=15),
                description=f"Порция: {portion}г. Рекомендуемый корм: {get_recommended_food(pet)}",
                priority='medium',
                is_recurring=True,
                recurrence_pattern=f'FREQ=DAILY;INTERVAL=1;BYHOUR={feeding_time.hour};BYMINUTE={feeding_time.minute}'
            )
            events.append(event)

    return events

def generate_activity_schedule(pet, days_ahead):
    """Генерация расписания активности для собак"""
    events = []

    if pet.species != 'dog':
        return events

    # Определение частоты прогулок
    walk_freq = pet.walk_frequency or get_default_walk_frequency(pet)
    walk_duration = pet.walk_duration or get_default_walk_duration(pet)

    # Расчет времени прогулок
    walk_times = calculate_walk_times(walk_freq, pet)

    for day in range(days_ahead):
        date = timezone.now().date() + timedelta(days=day)

        for walk_time in walk_times:
            event_datetime = datetime.combine(date, walk_time)

            if event_datetime < timezone.now():
                continue

            # Корректировка по погоде и сезону
            duration = adjust_walk_duration_for_weather(walk_duration, date)

            event = CalendarEvent(
                pet=pet,
                user=pet.owner,
                title=f"Прогулка с {pet.name}",
                event_type='activity',
                start_time=event_datetime,
                end_time=event_datetime + timedelta(minutes=duration),
                description=f"Прогулка {duration} минут. Рекомендуемые активности: {get_recommended_activities(pet)}",
                priority='high',
                is_recurring=True,
                recurrence_pattern=f'FREQ=DAILY;INTERVAL=1;BYHOUR={walk_time.hour};BYMINUTE={walk_time.minute}'
            )
            events.append(event)

    return events

def generate_vet_schedule(pet, days_ahead):
    """Генерация ветеринарных событий"""
    events = []

    # Регулярные осмотры
    checkup_events = generate_regular_checkups(pet, days_ahead)
    events.extend(checkup_events)

    # Вакцинации
    vaccination_events = generate_vaccination_schedule(pet, days_ahead)
    events.extend(vaccination_events)

    # Обработка от паразитов
    parasite_events = generate_parasite_treatment_schedule(pet, days_ahead)
    events.extend(parasite_events)

    # Специфические для породы осмотры
    breed_specific_events = generate_breed_specific_vet_events(pet, days_ahead)
    events.extend(breed_specific_events)

    return events

def generate_care_schedule(pet, days_ahead):
    """Генерация событий по уходу"""
    events = []

    # Уход за шерстью
    grooming_events = generate_grooming_schedule(pet, days_ahead)
    events.extend(grooming_events)

    # Чистка зубов
    dental_events = generate_dental_care_schedule(pet, days_ahead)
    events.extend(dental_events)

    # Уход за когтями
    nail_events = generate_nail_care_schedule(pet, days_ahead)
    events.extend(nail_events)

    # Купание
    bathing_events = generate_bathing_schedule(pet, days_ahead)
    events.extend(bathing_events)

    return events

def generate_health_schedule(pet, days_ahead):
    """Генерация событий по здоровью"""
    events = []

    # Мониторинг веса
    weight_events = generate_weight_monitoring_schedule(pet, days_ahead)
    events.extend(weight_events)

    # Проверка на проблемы со здоровьем
    health_check_events = generate_health_check_schedule(pet, days_ahead)
    events.extend(health_check_events)

    # Прием медикаментов
    medication_events = generate_medication_schedule(pet, days_ahead)
    events.extend(medication_events)

    return events

def generate_training_schedule(pet, days_ahead):
    """Генерация событий по дрессировке"""
    events = []

    if not pet.training_goals:
        return events

    # Еженедельные тренировки
    training_days = get_training_schedule_days(pet)

    for day in range(0, days_ahead, 7):  # Каждую неделю
        for training_day in training_days:
            event_date = timezone.now().date() + timedelta(days=day + training_day)
            event_datetime = datetime.combine(event_date, time(19, 0))  # 19:00

            if event_datetime.date() < timezone.now().date():
                continue

            event = CalendarEvent(
                pet=pet,
                user=pet.owner,
                title=f"Тренировка {pet.name}",
                event_type='training',
                start_time=event_datetime,
                end_time=event_datetime + timedelta(minutes=30),
                description=f"Цели тренировки: {', '.join(pet.training_goals)}",
                priority='medium',
                is_recurring=True,
                recurrence_pattern=f'FREQ=WEEKLY;INTERVAL=1;BYDAY={get_weekday_abbr(training_day)}'
            )
            events.append(event)

    return events
```

**Ключевые преимущества:**
- Полная автоматизация создания расписания
- Учет всех аспектов жизни питомца
- Адаптация под индивидуальные особенности
- Интеграция с ветеринарными рекомендациями

---

## 6. Последовательность создания PetID

### 6.1. Базовое создание (3-5 полей)

#### Шаг 1: Выбор вида животного
- **UI**: Большая карточка выбора (собака/кошка)
- **Валидация**: Обязательный выбор
- **Логика**: Определяет дальнейший поток

#### Шаг 2: Основная информация
- **Поля**: name, breed, date_of_birth, weight, gender
- **Особенности**:
  - Автодополнение пород
  - Валидация возраста (1 месяц - 30 лет)
  - Автоматический расчет размера по весу
  - Опциональная загрузка фото

#### Шаг 3: Здоровье и питание
- **Поля**: health_issues, excluded_ingredients, activity_level/housing_type
- **Особенности**:
  - Множественный выбор проблем здоровья
  - Автодополнение аллергий
  - Умные подсказки по породе

#### Шаг 4: Поведение
- **Поля**: behavioral_problems
- **Особенности**:
  - Визуальный выбор проблем
  - Рекомендации по дрессировке

#### Шаг 5: Сохранение и активация
- **Действия**:
  - Расчет profile_completeness
  - Создание базового профиля
  - Перенаправление в дашборд

### 6.2. Опциональные этапы расширения

#### Этап 1: Расширенное здоровье
**Для собак:**
- vaccinations, medications, dental_health, vet_visits

**Для кошек:**
- chronic_conditions, is_neutered, vet_visits

#### Этап 2: Питание и уход
- diet_type, feeding_frequency, sensitive_digestion
- vitamins_supplements, body_type

#### Этап 3: Образ жизни
- has_yard, has_children, other_pets
- walk_frequency/duration (для собак)
- special_needs, preferred_activities

#### Этап 4: Дрессировка и поведение
- behavior_type, social_level, training_experience
- character_traits, training_goals

#### Этап 5: Контакты владельца
- owner_phone, owner_email, owner_city

### 6.3. Умные подсказки и автозаполнение

#### Автозаполнение из породы:
```python
def get_breed_suggestions(breed):
    """Получение подсказок на основе породы"""
    return {
        'activity_level': breed.energy_level,
        'size': breed.size_category,
        'common_health_issues': breed.common_health_issues,
        'grooming_needs': breed.grooming_needs,
        'diet_suggestions': breed.diet_recommendations,
        'training_characteristics': breed.training_characteristics
    }
```

#### Умные подсказки по возрасту:
```python
def get_age_based_suggestions(age_category, species):
    """Подсказки на основе возраста"""
    suggestions = {
        'puppy': {
            'feeding_frequency': '3-4 раза в день',
            'training_focus': 'социализация и базовые команды',
            'health_checks': 'еженедельные взвешивания'
        },
        'adult': {
            'feeding_frequency': '2 раза в день',
            'training_focus': 'специализированные навыки',
            'health_checks': 'ежегодные осмотры'
        },
        'senior': {
            'feeding_frequency': '2-3 раза в день',
            'training_focus': 'поддержание навыков',
            'health_checks': 'ежемесячные осмотры'
        }
    }
    return suggestions.get(age_category, {})
```

### 6.4. Логика автоматического заполнения

#### Автоматически рассчитываемые поля:
- `size` - Размер (по весу + породе)
- `age` - Возраст (по дате рождения)
- `age_category` - Категория возраста (щенок/взрослый/пожилой)

#### Автозаполнение из породы:
При выборе породы автоматически заполняются оптимальные значения:
- `activity_level` (из `energy_level` породы)
- `size` (из `size_category` породы)
- Базовые рекомендации по здоровью и уходу

---

## 7. Реализация на бекенде

### 7.1. Модели данных

#### Основная модель Pet
```python
# backend/apps/pets/models.py

class Pet(models.Model):
    """Основная модель профиля питомца"""

    # === ОСНОВНЫЕ ПОЛЯ ===
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pets')
    name = models.CharField(max_length=100, verbose_name='Кличка')
    species = models.CharField(max_length=10, choices=[('dog', 'Собака'), ('cat', 'Кошка')])
    breed = models.ForeignKey('Breed', on_delete=models.SET_NULL, null=True, blank=True)
    date_of_birth = models.DateField(verbose_name='Дата рождения')
    gender = models.CharField(max_length=10, choices=[('male', 'Мальчик'), ('female', 'Девочка'), ('unknown', 'Неизвестно')])
    is_neutered = models.BooleanField(default=False, verbose_name='Кастрирован/стерилизован')
    photo = models.ImageField(upload_to='pets/', null=True, blank=True)

    # === ФИЗИЧЕСКИЕ ХАРАКТЕРИСТИКИ ===
    weight = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='Вес (кг)')
    size = models.CharField(max_length=20, choices=[
        ('toy', 'Toy (до 5 кг)'), ('small', 'Small (5-10 кг)'),
        ('medium', 'Medium (10-25 кг)'), ('large', 'Large (25-40 кг)'),
        ('giant', 'Giant (40+ кг)')
    ], blank=True)

    # === ПОВЕДЕНИЕ ===
    activity_level = models.CharField(max_length=20, choices=[
        ('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий')
    ], blank=True)
    behavioral_problems = models.JSONField(default=list, validators=[validate_string_list])

    # === ЗДОРОВЬЕ ===
    health_issues = models.JSONField(default=list, validators=[validate_string_list])

    # === ПИТАНИЕ ===
    excluded_ingredients = models.JSONField(default=list, validators=[validate_string_list])

    # === ОБРАЗ ЖИЗНИ ===
    housing_type = models.CharField(max_length=20, choices=[
        ('apartment', 'Квартира'), ('house', 'Дом'), ('cottage', 'Дача')
    ], blank=True)

    # === МЕТАДАННЫЕ ===
    profile_completeness = models.IntegerField(default=0, verbose_name='Заполненность профиля (%)')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Питомец'
        verbose_name_plural = 'Питомцы'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'species']),
            models.Index(fields=['species', 'breed']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.name} ({self.owner.username})"

    # === СВОЙСТВА ===
    @property
    def age(self):
        """Возраст в годах"""
        if not self.date_of_birth:
            return None
        today = date.today()
        age = today.year - self.date_of_birth.year
        if today.month < self.date_of_birth.month or \
           (today.month == self.date_of_birth.month and today.day < self.date_of_birth.day):
            age -= 1
        return age

    @property
    def age_category(self):
        """Категория возраста"""
        if not self.age:
            return None
        if self.age < 1:
            return 'puppy' if self.species == 'dog' else 'kitten'
        elif self.age > 10:
            return 'senior'
        else:
            return 'adult'

    # === МЕТОДЫ ===
    def calculate_profile_completeness(self):
        """Расчет заполненности профиля"""
        fields = [
            self.name, self.species, self.date_of_birth, self.gender,
            self.breed, self.weight, self.activity_level, self.health_issues,
            self.excluded_ingredients, self.housing_type if self.species == 'cat' else True
        ]
        filled_fields = sum(1 for field in fields if field)
        self.profile_completeness = int((filled_fields / len(fields)) * 100)
        return self.profile_completeness

    def save(self, *args, **kwargs):
        self.calculate_profile_completeness()
        super().save(*args, **kwargs)
```

#### Модель Breed (справочник пород)
```python
class Breed(models.Model):
    """Справочник пород собак и кошек"""
    BREED_TYPE_CHOICES = [('dog', 'Собака'), ('cat', 'Кошка')]
    SIZE_CHOICES = [
        ('toy', 'Toy'), ('small', 'Small'), ('medium', 'Medium'),
        ('large', 'Large'), ('giant', 'Giant')
    ]

    name = models.CharField(max_length=100, unique=True)
    species = models.CharField(max_length=10, choices=BREED_TYPE_CHOICES)
    slug = models.SlugField(unique=True)

    # Физические характеристики
    size_category = models.CharField(max_length=20, choices=SIZE_CHOICES)
    average_weight_min = models.DecimalField(max_digits=5, decimal_places=2)
    average_weight_max = models.DecimalField(max_digits=5, decimal_places=2)

    # Поведенческие характеристики
    energy_level = models.CharField(max_length=20, choices=[
        ('low', 'Низкая'), ('medium', 'Средняя'), ('high', 'Высокая'), ('very_high', 'Очень высокая')
    ])

    # Здоровье
    common_health_issues = models.JSONField(default=list)
    average_lifespan_min = models.IntegerField()
    average_lifespan_max = models.IntegerField()

    # Метаданные
    popularity_rank = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Порода'
        verbose_name_plural = 'Породы'
        ordering = ['-popularity_rank', 'name']

    @property
    def average_weight(self):
        return (self.average_weight_min + self.average_weight_max) / 2

    @property
    def average_lifespan(self):
        return (self.average_lifespan_min + self.average_lifespan_max) / 2
```

#### Модель анализа профиля
```python
class PetProfileAnalysis(models.Model):
    """Кэшированный анализ профиля для быстрого доступа"""
    pet = models.OneToOneField(Pet, on_delete=models.CASCADE, related_name='analysis')
    analysis_data = models.JSONField(verbose_name='Результаты анализа')
    health_score = models.IntegerField(default=0)
    risk_level = models.CharField(max_length=20, default='medium')
    recommendations = models.JSONField(default=dict)
    alerts = models.JSONField(default=list)
    last_analyzed = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Анализ профиля'
        verbose_name_plural = 'Анализы профилей'
```

#### Модель персонализированных рекомендаций
```python
class PersonalizedRecommendation(models.Model):
    """Персонализированные рекомендации по сервисам"""
    RECOMMENDATION_TYPES = [
        ('product', 'Товары'), ('course', 'Курсы'),
        ('service', 'Услуги'), ('content', 'Контент')
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE)
    recommendation_type = models.CharField(max_length=20, choices=RECOMMENDATION_TYPES)
    recommended_object_id = models.CharField(max_length=100)
    recommended_object_type = models.CharField(max_length=100)
    reasons = models.JSONField(default=list)
    score = models.FloatField(default=0.0)
    is_viewed = models.BooleanField(default=False)
    is_clicked = models.BooleanField(default=False)
    is_purchased = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
```

### 7.2. API эндпоинты

#### Основные эндпоинты PetID
```python
# backend/apps/pets/views.py

class PetListCreateView(generics.ListCreateAPIView):
    """Список питомцев пользователя + создание нового"""
    serializer_class = PetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Pet.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class PetRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """Просмотр/редактирование/удаление питомца"""
    serializer_class = PetSerializer
    permission_classes = [IsAuthenticated, IsPetOwner]

    def get_queryset(self):
        return Pet.objects.filter(owner=self.request.user)

class BreedListView(generics.ListAPIView):
    """Список пород с фильтрацией и поиском"""
    serializer_class = BreedSerializer
    queryset = Breed.objects.filter(is_active=True)
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['species', 'size_category']
    search_fields = ['name']
    ordering_fields = ['popularity_rank', 'name']
    ordering = ['-popularity_rank']

class PetAnalysisView(generics.RetrieveAPIView):
    """Получение анализа профиля питомца"""
    serializer_class = PetAnalysisSerializer
    permission_classes = [IsAuthenticated, IsPetOwner]

    def get_object(self):
        pet = get_object_or_404(Pet, id=self.kwargs['pk'], owner=self.request.user)
        analysis, created = PetProfileAnalysis.objects.get_or_create(pet=pet)
        if created or analysis.needs_update():
            analysis.update_analysis()
        return analysis
```

#### URL паттерны
```python
# backend/apps/pets/urls.py
urlpatterns = [
    path('', PetListCreateView.as_view(), name='pet-list-create'),
    path('<uuid:pk>/', PetRetrieveUpdateDestroyView.as_view(), name='pet-detail'),
    path('<uuid:pk>/analysis/', PetAnalysisView.as_view(), name='pet-analysis'),
    path('breeds/', BreedListView.as_view(), name='breed-list'),
]
```

### 7.3. Сериализаторы

#### PetSerializer
```python
class PetSerializer(serializers.ModelSerializer):
    """Сериализатор для модели Pet"""
    age = serializers.ReadOnlyField()
    age_category = serializers.ReadOnlyField()
    profile_completeness = serializers.ReadOnlyField()
    breed_name = serializers.CharField(source='breed.name', read_only=True)

    class Meta:
        model = Pet
        fields = [
            'id', 'name', 'species', 'breed', 'breed_name', 'date_of_birth',
            'age', 'age_category', 'gender', 'is_neutered', 'photo', 'weight',
            'size', 'activity_level', 'behavioral_problems', 'health_issues',
            'excluded_ingredients', 'housing_type', 'profile_completeness',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'age', 'age_category', 'profile_completeness', 'created_at', 'updated_at']

    def validate_date_of_birth(self, value):
        """Валидация даты рождения"""
        if value > date.today():
            raise serializers.ValidationError("Дата рождения не может быть в будущем")
        return value

    def validate_weight(self, value):
        """Валидация веса"""
        if value <= 0 or value > 200:
            raise serializers.ValidationError("Вес должен быть от 0.1 до 200 кг")
        return value

    def create(self, validated_data):
        """Создание питомца с автозаполнением"""
        pet = super().create(validated_data)

        # Автозаполнение из породы
        if pet.breed:
            pet.size = pet.breed.size_category
            if not pet.activity_level:
                pet.activity_level = pet.breed.energy_level
            pet.save()

        return pet
```

#### BreedSerializer
```python
class BreedSerializer(serializers.ModelSerializer):
    """Сериализатор для модели Breed"""
    average_weight = serializers.ReadOnlyField()
    average_lifespan = serializers.ReadOnlyField()

    class Meta:
        model = Breed
        fields = [
            'id', 'name', 'species', 'slug', 'size_category',
            'average_weight_min', 'average_weight_max', 'average_weight',
            'energy_level', 'common_health_issues', 'average_lifespan_min',
            'average_lifespan_max', 'average_lifespan', 'popularity_rank'
        ]
```

### 7.4. Сервисы и бизнес-логика

#### PetProfileAnalyzer
```python
class PetProfileAnalyzer:
    """Сервис анализа профиля питомца"""

    def analyze_pet_profile(self, pet):
        """Комплексный анализ профиля"""
        return {
            'basic_info': self._analyze_basic_info(pet),
            'weight_analysis': self._analyze_weight_vs_breed(pet),
            'health_assessment': self._analyze_health(pet),
            'risks': self._analyze_risks(pet),
            'recommendations': self._generate_recommendations(pet),
            'alerts': self._generate_alerts(pet),
            'overall_score': self._calculate_overall_score(pet)
        }

    def _analyze_basic_info(self, pet):
        """Анализ базовой информации"""
        completeness = pet.profile_completeness
        return {
            'completeness': completeness,
            'completeness_level': 'high' if completeness > 80 else 'medium' if completeness > 50 else 'low'
        }

    def _analyze_weight_vs_breed(self, pet):
        """Анализ веса относительно породы"""
        if not pet.breed or not pet.weight:
            return {'status': 'insufficient_data'}

        breed_avg = pet.breed.average_weight
        ratio = pet.weight / breed_avg

        if ratio < 0.8:
            status = 'underweight'
            risk = 'medium'
        elif ratio > 1.2:
            status = 'overweight'
            risk = 'high'
        else:
            status = 'normal'
            risk = 'low'

        return {
            'current_weight': pet.weight,
            'breed_average': breed_avg,
            'ratio': ratio,
            'status': status,
            'risk_level': risk
        }

    def _analyze_health(self, pet):
        """Анализ здоровья"""
        issues = pet.health_issues or []
        breed_issues = pet.breed.common_health_issues if pet.breed else []

        return {
            'reported_issues': issues,
            'breed_specific_risks': breed_issues,
            'matching_risks': list(set(issues) & set(breed_issues)),
            'preventive_measures': self._get_preventive_measures(pet)
        }

    def _analyze_risks(self, pet):
        """Анализ рисков"""
        risks = []

        # Анализ веса
        weight_analysis = self._analyze_weight_vs_breed(pet)
        if weight_analysis.get('risk_level') == 'high':
            risks.append({
                'type': 'weight',
                'level': 'high',
                'message': f"Вес {pet.weight} кг отличается от нормы породы {pet.breed.name}"
            })

        # Анализ возраста
        if pet.age and pet.age > 10:
            risks.append({
                'type': 'age',
                'level': 'medium',
                'message': f"Питомец пожилого возраста ({pet.age} лет)"
            })

        return risks

    def _generate_recommendations(self, pet):
        """Генерация рекомендаций"""
        recommendations = {
            'products': [],
            'courses': [],
            'services': []
        }

        # Рекомендации по весу
        weight_analysis = self._analyze_weight_vs_breed(pet)
        if weight_analysis.get('status') == 'overweight':
            recommendations['products'].extend([
                'weight_control_food',
                'joint_supplements',
                'activity_trackers'
            ])
        elif weight_analysis.get('status') == 'underweight':
            recommendations['products'].extend([
                'high_calorie_food',
                'weight_gain_supplements'
            ])

        # Рекомендации по поведению
        if pet.behavioral_problems:
            recommendations['courses'].extend([
                'behavior_correction',
                'obedience_training'
            ])

        return recommendations

    def _generate_alerts(self, pet):
        """Генерация предупреждений"""
        alerts = []

        # Срочные проблемы
        if 'diabetes' in str(pet.health_issues).lower():
            alerts.append({
                'priority': 'urgent',
                'message': 'Диабет требует специального питания и ветеринарного контроля'
            })

        # Предупреждения
        if pet.age and pet.age > 12:
            alerts.append({
                'priority': 'warning',
                'message': 'Пожилой возраст - регулярные ветеринарные осмотры'
            })

        return alerts

    def _calculate_overall_score(self, pet):
        """Расчет общего скора здоровья"""
        score = 100

        # Штрафы за проблемы
        if pet.health_issues:
            score -= len(pet.health_issues) * 5

        if pet.behavioral_problems:
            score -= len(pet.behavioral_problems) * 3

        return max(0, score)
```

### 7.5. Миграции базы данных

#### Основная миграция для расширения модели Pet
```python
# 0008_extend_pet_model.py
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('pets', '0007_add_petid_fields'),
    ]

    operations = [
        # Добавление новых полей
        migrations.AddField(
            model_name='pet',
            name='behavior_type',
            field=models.CharField(blank=True, choices=[...], max_length=20, verbose_name='Тип поведения'),
        ),
        migrations.AddField(
            model_name='pet',
            name='social_level',
            field=models.CharField(blank=True, choices=[...], max_length=20, verbose_name='Уровень социализации'),
        ),
        migrations.AddField(
            model_name='pet',
            name='training_experience',
            field=models.CharField(blank=True, choices=[...], max_length=20, verbose_name='Опыт дрессировки'),
        ),
        migrations.AddField(
            model_name='pet',
            name='character_traits',
            field=models.JSONField(default=list, validators=[validate_string_list]),
        ),
        migrations.AddField(
            model_name='pet',
            name='training_goals',
            field=models.TextField(blank=True, verbose_name='Цели дрессировки'),
        ),
        migrations.AddField(
            model_name='pet',
            name='chronic_conditions',
            field=models.TextField(blank=True, verbose_name='Хронические заболевания'),
        ),
        migrations.AddField(
            model_name='pet',
            name='vaccinations',
            field=models.JSONField(default=list, validators=[validate_string_list]),
        ),
        migrations.AddField(
            model_name='pet',
            name='medications',
            field=models.JSONField(default=list, validators=[validate_string_list]),
        ),
        migrations.AddField(
            model_name='pet',
            name='dental_health',
            field=models.CharField(blank=True, choices=[...], max_length=20),
        ),
        migrations.AddField(
            model_name='pet',
            name='vet_visits',
            field=models.TextField(blank=True, verbose_name='Посещения ветеринара'),
        ),
        migrations.AddField(
            model_name='pet',
            name='diet_type',
            field=models.CharField(blank=True, choices=[...], max_length=20),
        ),
        migrations.AddField(
            model_name='pet',
            name='feeding_frequency',
            field=models.CharField(blank=True, choices=[...], max_length=20),
        ),
        migrations.AddField(
            model_name='pet',
            name='sensitive_digestion',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='pet',
            name='vitamins_supplements',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='pet',
            name='body_type',
            field=models.CharField(blank=True, choices=[...], max_length=20),
        ),
        migrations.AddField(
            model_name='pet',
            name='has_yard',
            field=models.BooleanField(default=False, verbose_name='Наличие двора'),
        ),
        migrations.AddField(
            model_name='pet',
            name='has_children',
            field=models.BooleanField(default=False, verbose_name='Дети в доме'),
        ),
        migrations.AddField(
            model_name='pet',
            name='other_pets',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='pet',
            name='walk_frequency',
            field=models.CharField(blank=True, choices=[...], max_length=20),
        ),
        migrations.AddField(
            model_name='pet',
            name='walk_duration',
            field=models.CharField(blank=True, choices=[...], max_length=20),
        ),
        migrations.AddField(
            model_name='pet',
            name='special_needs',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='pet',
            name='preferred_activities',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='pet',
            name='owner_phone',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='pet',
            name='owner_email',
            field=models.EmailField(blank=True),
        ),
        migrations.AddField(
            model_name='pet',
            name='owner_city',
            field=models.CharField(blank=True, max_length=100),
        ),

        # Добавление индексов
        migrations.AddIndex(
            model_name='pet',
            index=models.Index(fields=['behavior_type']),
        ),
        migrations.AddIndex(
            model_name='pet',
            index=models.Index(fields=['activity_level']),
        ),
        migrations.AddIndex(
            model_name='pet',
            index=models.Index(fields=['age_category']),
        ),
    ]
```

---

## 8. Реализация на фронтенде

### 8.1. Компоненты React

#### PetCreationWizard - мастер создания PetID
```jsx
// frontend/src/components/PetCreationWizard/PetCreationWizard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import StepIndicator from './StepIndicator';
import SpeciesSelection from './steps/SpeciesSelection';
import BasicInfoStep from './steps/BasicInfoStep';
import HealthStep from './steps/HealthStep';
import BehaviorStep from './steps/BehaviorStep';
import ReviewStep from './steps/ReviewStep';
import { createPet } from '../../store/slices/petSlice';
import './PetCreationWizard.css';

const PetCreationWizard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [currentStep, setCurrentStep] = useState(1);
  const [petData, setPetData] = useState({
    species: '',
    name: '',
    breed: null,
    date_of_birth: '',
    weight: '',
    gender: '',
    health_issues: [],
    excluded_ingredients: [],
    behavioral_problems: [],
    activity_level: '',
    housing_type: '',
    photo: null
  });

  const steps = [
    { id: 1, title: 'Вид животного', component: SpeciesSelection },
    { id: 2, title: 'Основная информация', component: BasicInfoStep },
    { id: 3, title: 'Здоровье и питание', component: HealthStep },
    { id: 4, title: 'Поведение', component: BehaviorStep },
    { id: 5, title: 'Проверка', component: ReviewStep }
  ];

  const handleNext = (stepData) => {
    setPetData(prev => ({ ...prev, ...stepData }));
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const result = await dispatch(createPet(petData)).unwrap();
      navigate(`/pets/${result.id}`);
    } catch (error) {
      console.error('Failed to create pet:', error);
    }
  };

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <div className="pet-creation-wizard">
      <div className="wizard-header">
        <h1>Создание профиля питомца</h1>
        <StepIndicator currentStep={currentStep} totalSteps={steps.length} />
      </div>

      <div className="wizard-content">
        <CurrentStepComponent
          data={petData}
          onNext={handleNext}
          onPrev={handlePrev}
          onSubmit={handleSubmit}
          isFirst={currentStep === 1}
          isLast={currentStep === steps.length}
        />
      </div>
    </div>
  );
};

export default PetCreationWizard;
```

#### PetProfileEditor - редактор профиля
```jsx
// frontend/src/components/PetProfileEditor/PetProfileEditor.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updatePet, fetchPetAnalysis } from '../../store/slices/petSlice';
import ProfileCompleteness from './ProfileCompleteness';
import BasicInfoSection from './sections/BasicInfoSection';
import HealthSection from './sections/HealthSection';
import NutritionSection from './sections/NutritionSection';
import BehaviorSection from './sections/BehaviorSection';
import LifestyleSection from './sections/LifestyleSection';
import ContactSection from './sections/ContactSection';
import RecommendationsWidget from '../RecommendationsWidget/RecommendationsWidget';
import './PetProfileEditor.css';

const PetProfileEditor = ({ petId }) => {
  const dispatch = useDispatch();
  const { currentPet, analysis, loading } = useSelector(state => state.pet);
  const [activeSection, setActiveSection] = useState('basic');

  useEffect(() => {
    if (petId) {
      dispatch(fetchPetAnalysis(petId));
    }
  }, [petId, dispatch]);

  const handleUpdate = async (sectionData) => {
    try {
      await dispatch(updatePet({ id: petId, data: sectionData })).unwrap();
      // Обновляем анализ после изменения
      dispatch(fetchPetAnalysis(petId));
    } catch (error) {
      console.error('Failed to update pet:', error);
    }
  };

  const sections = [
    { id: 'basic', title: 'Основная информация', component: BasicInfoSection },
    { id: 'health', title: 'Здоровье', component: HealthSection },
    { id: 'nutrition', title: 'Питание', component: NutritionSection },
    { id: 'behavior', title: 'Поведение', component: BehaviorSection },
    { id: 'lifestyle', title: 'Образ жизни', component: LifestyleSection },
    { id: 'contact', title: 'Контакты', component: ContactSection }
  ];

  if (loading || !currentPet) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="pet-profile-editor">
      <div className="editor-header">
        <div className="pet-info">
          <img src={currentPet.photo || '/default-pet-avatar.png'} alt={currentPet.name} />
          <div>
            <h1>{currentPet.name}</h1>
            <p>{currentPet.breed_name} • {currentPet.age} лет</p>
          </div>
        </div>
        <ProfileCompleteness percentage={currentPet.profile_completeness} />
      </div>

      <div className="editor-content">
        <div className="sections-nav">
          {sections.map(section => (
            <button
              key={section.id}
              className={`nav-button ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.title}
            </button>
          ))}
        </div>

        <div className="section-content">
          {sections.map(section => {
            const SectionComponent = section.component;
            return (
              <div
                key={section.id}
                className={`section ${activeSection === section.id ? 'active' : ''}`}
              >
                <SectionComponent
                  pet={currentPet}
                  onUpdate={handleUpdate}
                />
              </div>
            );
          })}
        </div>

        <div className="recommendations-sidebar">
          <RecommendationsWidget
            pet={currentPet}
            analysis={analysis}
          />
        </div>
      </div>
    </div>
  );
};

export default PetProfileEditor;
```

#### PetRecommendationsList - список рекомендаций
```jsx
// frontend/src/components/PetRecommendationsList/PetRecommendationsList.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRecommendations, markRecommendationViewed } from '../../store/slices/recommendationsSlice';
import ProductRecommendation from './ProductRecommendation';
import CourseRecommendation from './CourseRecommendation';
import ServiceRecommendation from './ServiceRecommendation';
import './PetRecommendationsList.css';

const PetRecommendationsList = ({ petId, type = 'all' }) => {
  const dispatch = useDispatch();
  const { recommendations, loading } = useSelector(state => state.recommendations);
  const [filter, setFilter] = useState(type);

  useEffect(() => {
    dispatch(fetchRecommendations({ petId, type: filter }));
  }, [petId, filter, dispatch]);

  const handleRecommendationClick = (recommendation) => {
    dispatch(markRecommendationViewed(recommendation.id));
    // Открываем соответствующую страницу
    if (recommendation.recommendation_type === 'product') {
      window.open(`/products/${recommendation.recommended_object_id}`, '_blank');
    } else if (recommendation.recommendation_type === 'course') {
      window.open(`/courses/${recommendation.recommended_object_id}`, '_blank');
    }
  };

  const renderRecommendation = (rec) => {
    const props = {
      key: rec.id,
      recommendation: rec,
      onClick: () => handleRecommendationClick(rec)
    };

    switch (rec.recommendation_type) {
      case 'product':
        return <ProductRecommendation {...props} />;
      case 'course':
        return <CourseRecommendation {...props} />;
      case 'service':
        return <ServiceRecommendation {...props} />;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="loading">Загружаем рекомендации...</div>;
  }

  return (
    <div className="pet-recommendations">
      <div className="recommendations-header">
        <h2>Персональные рекомендации</h2>
        <div className="filter-buttons">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            Все
          </button>
          <button
            className={filter === 'product' ? 'active' : ''}
            onClick={() => setFilter('product')}
          >
            Товары
          </button>
          <button
            className={filter === 'course' ? 'active' : ''}
            onClick={() => setFilter('course')}
          >
            Курсы
          </button>
          <button
            className={filter === 'service' ? 'active' : ''}
            onClick={() => setFilter('service')}
          >
            Услуги
          </button>
        </div>
      </div>

      <div className="recommendations-grid">
        {recommendations.map(renderRecommendation)}
      </div>
    </div>
  );
};

export default PetRecommendationsList;
```

### 8.2. Управление состоянием

#### Pet Slice (Redux)
```javascript
// frontend/src/store/slices/petSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { petAPI } from '../../services/api';

export const createPet = createAsyncThunk(
  'pet/createPet',
  async (petData, { rejectWithValue }) => {
    try {
      const response = await petAPI.createPet(petData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const updatePet = createAsyncThunk(
  'pet/updatePet',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await petAPI.updatePet(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const fetchPetAnalysis = createAsyncThunk(
  'pet/fetchPetAnalysis',
  async (petId, { rejectWithValue }) => {
    try {
      const response = await petAPI.getPetAnalysis(petId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const petSlice = createSlice({
  name: 'pet',
  initialState: {
    pets: [],
    currentPet: null,
    analysis: null,
    loading: false,
    error: null
  },
  reducers: {
    setCurrentPet: (state, action) => {
      state.currentPet = action.payload;
    },
    clearCurrentPet: (state) => {
      state.currentPet = null;
      state.analysis = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(createPet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPet.fulfilled, (state, action) => {
        state.loading = false;
        state.pets.push(action.payload);
        state.currentPet = action.payload;
      })
      .addCase(createPet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updatePet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePet.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.pets.findIndex(pet => pet.id === action.payload.id);
        if (index !== -1) {
          state.pets[index] = action.payload;
        }
        state.currentPet = action.payload;
      })
      .addCase(updatePet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchPetAnalysis.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPetAnalysis.fulfilled, (state, action) => {
        state.loading = false;
        state.analysis = action.payload;
      })
      .addCase(fetchPetAnalysis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { setCurrentPet, clearCurrentPet } = petSlice.actions;
export default petSlice.reducer;
```

#### Recommendations Slice
```javascript
// frontend/src/store/slices/recommendationsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { recommendationsAPI } from '../../services/api';

export const fetchRecommendations = createAsyncThunk(
  'recommendations/fetchRecommendations',
  async ({ petId, type }, { rejectWithValue }) => {
    try {
      const response = await recommendationsAPI.getRecommendations(petId, type);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const markRecommendationViewed = createAsyncThunk(
  'recommendations/markViewed',
  async (recommendationId, { rejectWithValue }) => {
    try {
      await recommendationsAPI.markViewed(recommendationId);
      return recommendationId;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const recommendationsSlice = createSlice({
  name: 'recommendations',
  initialState: {
    recommendations: [],
    loading: false,
    error: null
  },
  reducers: {
    clearRecommendations: (state) => {
      state.recommendations = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecommendations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.loading = false;
        state.recommendations = action.payload;
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markRecommendationViewed.fulfilled, (state, action) => {
        const index = state.recommendations.findIndex(r => r.id === action.payload);
        if (index !== -1) {
          state.recommendations[index].is_viewed = true;
        }
      });
  }
});

export const { clearRecommendations } = recommendationsSlice.actions;
export default recommendationsSlice.reducer;
```

### 8.3. Формы и валидация

#### BreedSelector - селектор пород с поиском
```jsx
// frontend/src/components/BreedSelector/BreedSelector.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBreeds } from '../../store/slices/breedSlice';
import './BreedSelector.css';

const BreedSelector = ({ species, value, onChange, placeholder = "Выберите породу" }) => {
  const dispatch = useDispatch();
  const { breeds, loading } = useSelector(state => state.breed);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (species) {
      dispatch(fetchBreeds({ species }));
    }
  }, [species, dispatch]);

  const filteredBreeds = useMemo(() => {
    if (!searchTerm) return breeds;
    return breeds.filter(breed =>
      breed.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [breeds, searchTerm]);

  const selectedBreed = breeds.find(breed => breed.id === value);

  const handleSelect = (breed) => {
    onChange(breed.id);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="breed-selector">
      <div className="selector-input" onClick={() => setIsOpen(!isOpen)}>
        <input
          type="text"
          value={searchTerm || (selectedBreed ? selectedBreed.name : '')}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={placeholder}
          readOnly={!isOpen}
        />
        <div className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
          ▼
        </div>
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          {loading ? (
            <div className="loading">Загрузка пород...</div>
          ) : (
            <div className="breeds-list">
              {filteredBreeds.map(breed => (
                <div
                  key={breed.id}
                  className={`breed-option ${value === breed.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(breed)}
                >
                  <div className="breed-info">
                    <span className="breed-name">{breed.name}</span>
                    <span className="breed-details">
                      {breed.size_category} • {breed.average_weight} кг
                    </span>
                  </div>
                  {breed.popularity_rank <= 10 && (
                    <span className="popular-badge">Популярная</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BreedSelector;
```

#### MultiSelect - компонент множественного выбора
```jsx
// frontend/src/components/MultiSelect/MultiSelect.jsx
import React, { useState } from 'react';
import './MultiSelect.css';

const MultiSelect = ({
  options,
  value = [],
  onChange,
  placeholder = "Выберите варианты",
  maxSelection = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (optionValue) => {
    let newValue;
    if (value.includes(optionValue)) {
      newValue = value.filter(v => v !== optionValue);
    } else {
      if (maxSelection && value.length >= maxSelection) {
        return; // Не позволяем выбрать больше максимального количества
      }
      newValue = [...value, optionValue];
    }
    onChange(newValue);
  };

  const selectedLabels = value.map(val =>
    options.find(opt => opt.value === val)?.label
  ).filter(Boolean);

  return (
    <div className="multi-select">
      <div className="select-input" onClick={() => setIsOpen(!isOpen)}>
        <div className="selected-items">
          {selectedLabels.length > 0 ? (
            selectedLabels.join(', ')
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
        </div>
        <div className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
          ▼
        </div>
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          <input
            type="text"
            className="search-input"
            placeholder="Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="options-list">
            {filteredOptions.map(option => (
              <div
                key={option.value}
                className={`option ${value.includes(option.value) ? 'selected' : ''}`}
                onClick={() => handleToggle(option.value)}
              >
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  readOnly
                />
                <span>{option.label}</span>
              </div>
            ))}
          </div>
          {maxSelection && (
            <div className="selection-info">
              Выбрано: {value.length} из {maxSelection}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
```

### 8.4. API интеграция

#### API Service для работы с PetID
```javascript
// frontend/src/services/petAPI.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

class PetAPI {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Добавляем токен авторизации
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Получение списка питомцев пользователя
  async getPets() {
    const response = await this.client.get('/pets/');
    return response;
  }

  // Создание нового питомца
  async createPet(petData) {
    const formData = new FormData();

    // Преобразуем данные для отправки
    Object.keys(petData).forEach(key => {
      if (Array.isArray(petData[key])) {
        formData.append(key, JSON.stringify(petData[key]));
      } else if (petData[key] !== null && petData[key] !== undefined) {
        formData.append(key, petData[key]);
      }
    });

    const response = await this.client.post('/pets/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  }

  // Получение питомца по ID
  async getPet(id) {
    const response = await this.client.get(`/pets/${id}/`);
    return response;
  }

  // Обновление питомца
  async updatePet(id, petData) {
    const formData = new FormData();

    Object.keys(petData).forEach(key => {
      if (Array.isArray(petData[key])) {
        formData.append(key, JSON.stringify(petData[key]));
      } else if (petData[key] !== null && petData[key] !== undefined) {
        formData.append(key, petData[key]);
      }
    });

    const response = await this.client.patch(`/pets/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  }

  // Удаление питомца
  async deletePet(id) {
    const response = await this.client.delete(`/pets/${id}/`);
    return response;
  }

  // Получение анализа профиля
  async getPetAnalysis(id) {
    const response = await this.client.get(`/pets/${id}/analysis/`);
    return response;
  }

  // Получение списка пород
  async getBreeds(params = {}) {
    const response = await this.client.get('/pets/breeds/', { params });
    return response;
  }

  // Поиск пород
  async searchBreeds(query, species) {
    const params = { search: query };
    if (species) {
      params.species = species;
    }
    const response = await this.client.get('/pets/breeds/', { params });
    return response;
  }
}

export default new PetAPI();
```

#### Recommendations API
```javascript
// frontend/src/services/recommendationsAPI.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

class RecommendationsAPI {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Получение рекомендаций для питомца
  async getRecommendations(petId, type = 'all') {
    const params = type !== 'all' ? { type } : {};
    const response = await this.client.get(`/pets/${petId}/recommendations/`, { params });
    return response;
  }

  // Отметить рекомендацию как просмотренную
  async markViewed(recommendationId) {
    const response = await this.client.post(`/recommendations/${recommendationId}/view/`);
    return response;
  }

  // Отметить рекомендацию как купленную
  async markPurchased(recommendationId) {
    const response = await this.client.post(`/recommendations/${recommendationId}/purchase/`);
    return response;
  }

  // Получение персонализированных товаров
  async getPersonalizedProducts(petId, category = null, limit = 20) {
    const params = { limit };
    if (category) {
      params.category = category;
    }
    const response = await this.client.get(`/pets/${petId}/products/`, { params });
    return response;
  }

  // Получение персонализированных курсов
  async getPersonalizedCourses(petId, category = null, limit = 10) {
    const params = { limit };
    if (category) {
      params.category = category;
    }
    const response = await this.client.get(`/pets/${petId}/courses/`, { params });
    return response;
  }
}

export default new RecommendationsAPI();
```

---

## 9. План реализации и тестирование

### 9.1. Этапы реализации

#### Этап 1: Подготовка (1 неделя)
- Анализ текущей системы PetID
- Проектирование новой архитектуры
- Создание технического задания
- Подготовка mock-данных

#### Этап 2: Backend разработка (3 недели)
- Расширение модели Pet новыми полями
- Создание модели Breed
- Разработка API эндпоинтов
- Создание сервисов анализа и рекомендаций
- Написание unit-тестов

#### Этап 3: Frontend разработка (4 недели)
- Создание компонентов мастера создания
- Разработка редактора профиля
- Интеграция с API
- Реализация форм валидации
- Написание компонентных тестов

#### Этап 4: Интеграция и тестирование (2 недели)
- Интеграция с существующими сервисами (магазин, курсы, календарь)
- Системное тестирование
- Performance тестирование
- Исправление багов

#### Этап 5: Оптимизация и запуск (1 неделя)
- Оптимизация производительности
- Финальное тестирование
- Подготовка документации
- Деплой в продакшн

### 9.2. Критерии приемки

#### Функциональные требования:
- [ ] Создание базового профиля PetID за < 30 секунд
- [ ] Расчет profile_completeness в реальном времени
- [ ] Автоматическое определение размера по весу и породе
- [ ] Персонализация рекомендаций товаров и курсов
- [ ] Генерация персонализированного календаря

#### Нефункциональные требования:
- [ ] Время загрузки страницы PetID < 2 секунд
- [ ] Поддержка 1000+ одновременных пользователей
- [ ] Адаптивность на мобильных устройствах
- [ ] WCAG 2.1 AA compliance

### 9.3. Тестирование

#### Unit тестирование:
```python
# backend/apps/pets/tests/test_models.py
import pytest
from django.test import TestCase
from ..models import Pet, Breed

class PetModelTest(TestCase):
    def setUp(self):
        self.breed = Breed.objects.create(
            name='Лабрадор',
            species='dog',
            size_category='large',
            average_weight_min=25,
            average_weight_max=35
        )

    def test_age_calculation(self):
        """Тест расчета возраста"""
        from datetime import date
        pet = Pet.objects.create(
            name='Тест',
            species='dog',
            breed=self.breed,
            date_of_birth=date(2020, 1, 1)
        )
        expected_age = date.today().year - 2020
        if date.today() < date(date.today().year, 1, 1):
            expected_age -= 1
        self.assertEqual(pet.age, expected_age)

    def test_size_calculation(self):
        """Тест расчета размера"""
        pet = Pet.objects.create(
            name='Тест',
            species='dog',
            breed=self.breed,
            weight=30
        )
        # Вес 30 кг для породы с средним весом 30 кг = размер medium
        self.assertEqual(pet.size, 'medium')

    def test_profile_completeness(self):
        """Тест расчета заполненности профиля"""
        pet = Pet.objects.create(
            name='Тест',
            species='dog',
            breed=self.breed,
            date_of_birth=date.today(),
            weight=30,
            gender='male'
        )
        # Обязательные поля заполнены
        self.assertGreaterEqual(pet.profile_completeness, 70)
```

#### Интеграционное тестирование:
```python
# backend/apps/pets/tests/test_api.py
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from ..models import Pet

class PetAPITest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

    def test_create_pet(self):
        """Тест создания питомца"""
        data = {
            'name': 'Бобик',
            'species': 'dog',
            'date_of_birth': '2020-01-01',
            'weight': 25,
            'gender': 'male'
        }
        response = self.client.post('/api/pets/', data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Pet.objects.count(), 1)
        pet = Pet.objects.first()
        self.assertEqual(pet.name, 'Бобик')
        self.assertEqual(pet.owner, self.user)

    def test_pet_analysis(self):
        """Тест получения анализа профиля"""
        pet = Pet.objects.create(
            owner=self.user,
            name='Бобик',
            species='dog',
            date_of_birth='2020-01-01',
            weight=25,
            gender='male'
        )
        response = self.client.get(f'/api/pets/{pet.id}/analysis/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('basic_info', response.data)
        self.assertIn('recommendations', response.data)
```

#### E2E тестирование:
```javascript
// frontend/cypress/integration/pet-creation.spec.js
describe('Pet Creation Flow', () => {
  beforeEach(() => {
    cy.login('testuser', 'testpass123');
    cy.visit('/pets/create');
  });

  it('should create a new pet successfully', () => {
    // Шаг 1: Выбор вида
    cy.get('[data-cy="species-dog"]').click();
    cy.get('[data-cy="next-button"]').click();

    // Шаг 2: Основная информация
    cy.get('[data-cy="pet-name"]').type('Бобик');
    cy.get('[data-cy="breed-selector"]').click();
    cy.get('[data-cy="breed-option"]').first().click();
    cy.get('[data-cy="date-of-birth"]').type('2020-01-01');
    cy.get('[data-cy="weight"]').type('25');
    cy.get('[data-cy="gender-male"]').click();
    cy.get('[data-cy="next-button"]').click();

    // Шаг 3: Здоровье
    cy.get('[data-cy="health-issue-none"]').click();
    cy.get('[data-cy="next-button"]').click();

    // Шаг 4: Поведение
    cy.get('[data-cy="behavior-problem-none"]').click();
    cy.get('[data-cy="next-button"]').click();

    // Шаг 5: Проверка и создание
    cy.get('[data-cy="create-button"]').click();

    // Проверка успешного создания
    cy.url().should('include', '/pets/');
    cy.get('[data-cy="pet-name"]').should('contain', 'Бобик');
  });
});
```

---

## 10. Риски и меры по их снижению

### Технические риски

#### Производительность запросов
**Риск:** Сложные запросы персонализации замедляют работу системы
**Вероятность:** Высокая
**Влияние:** Высокое

**Меры по снижению:**
- Кэширование результатов анализа (Redis)
- Оптимизация SQL запросов с индексами
- Асинхронная обработка тяжелых вычислений
- CDN для статических ресурсов

#### Масштабируемость
**Риск:** Рост нагрузки при увеличении количества пользователей
**Вероятность:** Средняя
**Влияние:** Высокое

**Меры по снижению:**
- Горизонтальное масштабирование (Kubernetes)
- Read replicas базы данных
- Кэширование на уровне приложения
- Оптимизация API (GraphQL)

#### Безопасность данных
**Риск:** Утечка персональных данных пользователей
**Вероятность:** Средняя
**Влияние:** Критическое

**Меры по снижению:**
- Шифрование чувствительных данных
- Валидация доступа к профилям
- Аудит изменений (Django Auditlog)
- Регулярные security аудиты

### Бизнес-риски

#### Низкая конверсия
**Риск:** Пользователи не будут заполнять расширенные профили
**Вероятность:** Высокая
**Влияние:** Высокое

**Меры по снижению:**
- Геймификация процесса заполнения
- Прогрессивное раскрытие (progressive disclosure)
- A/B тестирование UI/UX
- Аналитика поведения пользователей

#### Качество данных
**Риск:** Пользователи вводят некорректные данные
**Вероятность:** Высокая
**Влияние:** Среднее

**Меры по снижению:**
- Умные подсказки и автозаполнение
- Валидация на frontend и backend
- Обучение пользователей через подсказки
- Модерация и очистка данных

#### Интеграции
**Риск:** Проблемы интеграции с существующими сервисами
**Вероятность:** Средняя
**Влияние:** Высокое

**Меры по снижению:**
- API-first подход к разработке
- Comprehensive тестирование интеграций
- Постепенный rollout с feature flags
- Резервные механизмы (fallback)

### Организационные риски

#### Сроки
**Риск:** Задержки в разработке из-за сложности
**Вероятность:** Средняя
**Влияние:** Среднее

**Меры по снижению:**
- Agile подход с 2-недельными спринтами
- Регулярные демо заинтересованным сторонам
- Буфер времени в планировании
- Приоритизация MVP фич

#### Качество
**Риск:** Высокий уровень багов в продакшне
**Вероятность:** Средняя
**Влияние:** Высокое

**Меры по снижению:**
- Code review для всех изменений
- Автоматизированное тестирование (unit, integration, e2e)
- Статический анализ кода
- QA тестирование перед релизом

#### Команда
**Риск:** Отсутствие экспертизы в некоторых технологиях
**Вероятность:** Низкая
**Влияние:** Среднее

**Меры по снижению:**
- Ежедневные standups
- Документация архитектурных решений
- Кросс-обучение членов команды
- Внешние консультанты при необходимости

---

## Заключение

Данная техническая спецификация описывает комплексную систему PetID для платформы "Питомец+", которая обеспечит глубокую персонализацию сервисов и улучшенный пользовательский опыт.

### Ключевые преимущества новой системы:

1. **Комплексная персонализация** - учет всех аспектов профиля питомца
2. **Прогрессивное раскрытие** - постепенное заполнение профиля без перегрузки
3. **Умные подсказки** - автозаполнение и рекомендации на основе данных
4. **Аналитика профиля** - оценка здоровья и рекомендации по улучшению
5. **Интеграция сервисов** - единая система для магазина, курсов и календаря

### Ожидаемые результаты:
- Увеличение конверсии в персонализированных товарах на 30%
- Рост заполненности профилей с 40% до 80%
- Снижение времени создания базового профиля до 30 секунд
- Повышение удовлетворенности пользователей на 25%

### Следующие шаги:
1. Утверждение технического задания
2. Формирование команды разработки
3. Создание детального плана работ
4. Начало реализации с MVP версии
