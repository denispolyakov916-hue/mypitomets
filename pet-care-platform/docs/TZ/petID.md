# Техническое задание: Разработка полноценной системы PetID

## Оглавление

1. [Введение и цели](#введение-и-цели)
2. [Текущий анализ системы PetID](#текущий-анализ-системы-petid)
3. [Анализ пользовательского опыта](#анализ-пользовательского-опыта)
4. [Требования к новой системе](#требования-к-новой-системе)
5. [Архитектура решения](#архитектура-решения)
   5.1. [Модель данных](#модель-данных)
   5.2. [API дизайн](#api-дизайн)
   5.3. [Frontend архитектура](#frontend-архитектура)
   5.4. [Дополнительные таблицы для глубокой персонализации](#дополнительные-таблицы-для-глубокой-персонализации)
6. [Последовательность создания PetID](#последовательность-создания-petid)
7. [Реализация на бекенде](#реализация-на-бекенде)
   7.1. [Модели данных](#модели-данных)
   7.2. [API эндпоинты](#api-эндпоинты)
   7.3. [Сериализаторы](#сериализаторы)
   7.4. [Сервисы и бизнес-логика](#сервисы-и-бизнес-логика)
   7.5. [Миграции базы данных](#миграции-базы-данных)
8. [Реализация на фронтенде](#реализация-на-фронтенде)
   8.1. [Компоненты React](#компоненты-react)
   8.2. [Управление состоянием](#управление-состоянием)
   8.3. [Формы и валидация](#формы-и-валидация)
   8.4. [API интеграция](#api-интеграция)
9. [План реализации и тестирование](#план-реализации-и-тестирование)
10. [Риски и меры по их снижению](#риски-и-меры-по-их-снижению)

---

## 1. Введение и цели

### 1.1. Цели разработки
PetID - центральная сущность платформы "Питомец+", которая содержит всю информацию о питомце и используется во всех модулях системы. Текущая реализация имеет ряд проблем, которые требуют комплексного решения.

### 1.2. Задачи проекта
- Проанализировать текущую реализацию PetID
- Выявить проблемы в UI/UX и архитектуре
- Разработать новую систему создания и управления PetID
- Обеспечить интеграцию с существующими сервисами

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

**Использование в отчетах:**
- Группировка по species (pet_species)
- Группировка по возрастным группам (pet_age_group)
- Фильтрация заказов по питомцам

**Проблемы:**
- Минимальный набор метрик
- Нет анализа по поведению, здоровью, активности питомцев
- Отсутствие корелляции между характеристиками питомцев и покупками

#### Платежи (apps/payments)
**Использование (services.py:378-401):**
```python
pet = None
if payment.metadata and payment.metadata.get('pet_id'):
    try:
        pet = Pet.objects.get(id=payment.metadata['pet_id'], owner=payment.user)
    except Pet.DoesNotExist:
        pass
```

**Проблемы:**
- pet_id хранится в metadata платежа как строка
- Нет ForeignKey связи в Payment модель
- Слабая валидация принадлежности питомца пользователю

### 2.3. Frontend реализация

#### Компоненты PetID:
**Основные компоненты:**
- **PetIdWizard.jsx** - мастер создания/редактирования (8 шагов, 600+ строк кода)
- **PetIdPage.jsx** - главная страница управления питомцами (300+ строк)
- **PetList.jsx** - список питомцев с карточками
- **PetProfile.jsx** - детальный просмотр профиля
- **PetForm.jsx** - альтернативная форма создания

**Вспомогательные компоненты:**
- **PetCard.jsx** - карточка питомца для списков
- **8 компонентов шагов** - StepBasicInfo, StepContacts, StepPhysical, etc.

#### Структура мастера (PetIdWizard.jsx):

**Технические характеристики:**
- **Объем кода**: 600+ строк основного компонента
- **State management**: Локальный useState (formData, currentStep, etc.)
- **Валидация**: Отсутствует на уровне компонентов
- **Сохранение**: Только при финальном подтверждении

**Структура шагов:**
1. **StepBasicInfo** - Основные данные (имя, вид, порода, пол, дата рождения, фото)
2. **StepContacts** - Контакты владельца (телефон, email, город)
3. **StepPhysical** - Физические данные (вес, размер, тип телосложения, активность)
4. **StepNutrition** - Питание (тип кормления, частота, предпочтения, аллергии)
5. **StepBehavior** - Поведение (черты характера, проблемы, цели дрессировки)
6. **StepHealth** - Здоровье (заболевания, вакцинации, препараты, зубы)
7. **StepLifestyle** - Образ жизни (жилье, прогулки, другие питомцы)
8. **StepConfirmation** - Подтверждение и финальный обзор

#### API слой (api/pets.js):
**Методы:**
- `getPets()` - получение списка питомцев
- `getPet(id)` - получение одного питомца
- `createPet(data)` - создание питомца
- `updatePet(id, data)` - обновление питомца
- `deletePet(id)` - удаление питомца

**Константы для форм:**
- `SPECIES_OPTIONS` - виды животных
- `BEHAVIOR_TYPE_OPTIONS` - типы поведения
- `SOCIAL_LEVEL_OPTIONS` - уровни социализации
- `TRAINING_EXPERIENCE_OPTIONS` - опыт дрессировки
- `ACTIVITY_LEVEL_OPTIONS` - уровни активности

#### Проблемы реализации:

**Архитектурные проблемы:**
- **Монолитный код** - PetIdWizard.jsx содержит всю логику в одном файле
- **Отсутствие state management** - нет глобального store для питомцев
- **Дублирование кода** - похожая логика в разных компонентах
- **Отсутствие TypeScript** - нет типизации, ошибки во время выполнения

**UX/UI проблемы:**
- **8 шагов = 8 страниц** - слишком длинный процесс (5-10 минут)
- **Нет progress bar** - пользователь не видит прогресс
- **Отсутствие автосохранения** - потеря данных при обновлении страницы
- **Нет валидации на лету** - ошибки показываются только в конце
- **Слабая адаптивность** - проблемы на мобильных устройствах

**Функциональные проблемы:**
- **Нет черновиков** - нельзя сохранить и продолжить позже
- **Отсутствие шаблонов** - нет предустановленных профилей для пород
- **Нет импорта данных** - нельзя загрузить из ветклиники или приложений
- **Отсутствие QR-кода** - нет быстрого доступа к профилю

**Технические проблемы:**
- **Пропсы drilling** - formData передается через все компоненты
- **Отсутствие оптимизации** - перерисовки при каждом изменении
- **Слабая обработка ошибок** - нет fallback для неудачных запросов
- **Отсутствие кэширования** - повторные загрузки одних данных

### 2.4. Текущие проблемы

#### Архитектурные проблемы:

**1. Фрагментированная модель данных**
- Поля PetID распределены между Pet и связанными моделями
- Reservation использует CharField вместо ForeignKey к Pet
- Payment хранит pet_id в metadata вместо ForeignKey
- Отсутствие единого источника истины для PetID

**2. Проблемы безопасности и валидации**
- pet_id передается как query parameter без строгой проверки принадлежности
- В training и shop сервисах слабая обработка ошибок (except Exception)
- Отсутствие rate limiting для API питомцев
- Возможность доступа к чужим питомцам через прямые ссылки

**3. Производительность и масштабируемость**
- Отсутствие кэширования для часто запрашиваемых данных
- N+1 запросы в filter_by_pet_characteristics
- Нет оптимизации для сложных фильтров по характеристикам
- Отсутствие индексов для JSON полей

**4. Проблемы с данными**
- JSON поля хранят данные в разных форматах
- Отсутствие стандартизации значений (разные варианты написания)
- Нет валидации бизнес-правил на уровне БД
- Отсутствие версионирования изменений профилей

#### UX/UI проблемы:

**1. Процесс создания (8-шаговый wizard)**
- **Длительность**: 5-10 минут на заполнение всех полей
- **Отсутствие прогресса**: пользователь не видит, сколько времени осталось
- **Нет автосохранения**: потеря данных при обновлении страницы
- **Линейный процесс**: нельзя вернуться и исправить предыдущие шаги
- **Отсутствие мотивации**: пользователь не понимает ценности создания полного профиля

**2. Навигация и взаимодействие**
- **Сложная структура**: 600+ строк кода в одном компоненте
- **Отсутствие breadcrumbs**: пользователь теряется в многошаговом процессе
- **Нет превью профиля**: нельзя увидеть результат до завершения
- **Проблемы с мобильной версткой**: не адаптировано для мобильных устройств

**3. Валидация и обратная связь**
- **Отсутствие real-time валидации**: ошибки показываются только в конце
- **Нет подсказок**: пользователь не понимает, зачем нужны поля
- **Слабые требования**: можно создать профиль с минимальными данными
- **Отсутствие примеров**: нет шаблонов заполнения

**4. Функциональность**
- **Нет черновиков**: нельзя сохранить и продолжить позже
- **Отсутствие шаблонов**: нет предустановленных профилей для популярных пород
- **Нет импорта данных**: нельзя загрузить информацию из ветклиник
- **Отсутствие экспорта**: нет возможности поделиться профилем

#### Проблемы интеграции с другими сервисами:

**1. Магазин товаров**
- pet_id передается как параметр без валидации принадлежности
- Reservation модель использует CharField вместо ForeignKey
- Нет персонализации товаров по расширенным характеристикам питомца
- Отсутствие учета аллергий и предпочтений при подборе товаров

**2. Курсы обучения**
- filter_by_pet_characteristics имеет низкую производительность
- Неполная логика фильтрации по training_experience
- Отсутствие учета behavioral_problems для коррекционных курсов
- Нет персонализации контента курсов по health_issues

**3. Календарь**
- Минимальная интеграция с PetID
- Нет автоматического создания событий по здоровью питомца
- Отсутствие персонализации напоминаний по характеристикам
- Нет связи с vaccination_schedule

**4. Аналитика**
- Ограниченный набор метрик по питомцам
- Нет анализа по поведению, здоровью, предпочтениям
- Отсутствие корелляции между характеристиками и покупками
- Нет сегментации пользователей по типу питомцев

#### Технические проблемы реализации:

**1. Frontend архитектура**
- **Монолитный код**: PetIdWizard содержит всю логику в одном файле
- **Отсутствие state management**: нет глобального store для питомцев
- **Props drilling**: formData передается через всю иерархию компонентов
- **Отсутствие TypeScript**: нет типизации данных

**2. Backend архитектура**
- **Неэффективные запросы**: отсутствие оптимизации для связанных данных
- **Отсутствие кэширования**: повторные вычисления одних данных
- **Проблемы с транзакциями**: частичное обновление данных
- **Отсутствие мониторинга**: нет метрик производительности

**3. Проблемы с данными**
- **Несогласованность форматов**: разные сервисы ожидают разные структуры
- **Отсутствие стандартизации**: разнородные значения в полях
- **Проблемы с локализацией**: смесь русского и английского
- **Отсутствие бизнес-правил**: можно сохранить некорректные комбинации

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

#### **🎯 Принципы классификации полей:**

1. **Обязательные поля** - заполняются при создании, критично для базовой персонализации
2. **Автоматические поля** - рассчитываются системой на основе других данных
3. **Опциональные поля** - заполняются постепенно для расширенной персонализации

#### **📊 Полная структура полей Pet:**

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
| **Опциональные** 
| | Boolean | `is_neutered` | ❌ | ❌ | Кастрирован/стерилизован |
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

#### **🔄 Логика автоматического расчета полей:**

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
def get_personalized_courses(pet, limit=10):
    """
    Комплексная персонализация курсов с учетом породы, возраста и характеристик
    """
    courses = Course.objects.catalog()

    # Фильтр по виду животного
    courses = courses.filter(pet_types__contains=[pet.species])

    # Учет характеристик породы для сложности обучения
    breed_characteristics = pet.get_breed_specific_recommendations()

    # Комплексная оценка уровня сложности
    complexity_score = calculate_complexity_score(pet)

    # Корректировка сложности на основе породы
    if breed_characteristics.get('training_difficulty') == 'easy':
        complexity_score = max(0, complexity_score - 1)  # Легче обучать
    elif breed_characteristics.get('training_difficulty') == 'hard':
        complexity_score += 1  # Сложнее обучать

    # Фильтр по рассчитанной сложности
    if complexity_score <= 2:
        courses = courses.filter(difficulty_level__in=['beginner', 'easy'])
    elif complexity_score <= 4:
        courses = courses.filter(difficulty_level__in=['intermediate', 'easy'])
    elif complexity_score <= 6:
        courses = courses.filter(difficulty_level__in=['intermediate', 'advanced'])
    else:
        courses = courses.filter(difficulty_level__in=['advanced', 'expert'])

    # Возрастная адаптация с учетом породы
    if pet.age_category in ['puppy', 'kitten']:
        courses = courses.filter(suitable_for_young=True)
        # Для щенков активных пород - курсы социализации
        if breed_characteristics.get('socialization_needs') == 'high':
            courses = courses.filter(category__in=['socialization', 'puppy_training'])
    elif pet.age_category == 'senior':
        courses = courses.filter(suitable_for_senior=True)

    # Специфические курсы для темперамента породы
    breed_temperament = pet.breed_temperament
    if breed_temperament:
        if 'aggressive' in breed_temperament or 'protective' in breed_temperament:
            # Для охранных пород - курсы контроля поведения
            courses = courses.filter(
                Q(category='behavior') |
                Q(tags__contains=['guard_dog_training'])
            )
        elif 'shy' in breed_temperament:
            # Для застенчивых - курсы повышения уверенности
            courses = courses.filter(category__in=['confidence', 'socialization'])

    # Коррекционные курсы по поведенческим проблемам
    if pet.behavioral_problems:
        problem_mapping = {
            'aggression': ['aggression_control', 'behavior_correction'],
            'fear': ['fear_treatment', 'confidence_building'],
            'barking': ['quiet_training', 'behavior_control'],
            'destructiveness': ['chewing_prevention', 'behavior_control'],
            'hyperactivity': ['calm_training', 'focus_training'],
            'separation_anxiety': ['independence_training', 'alone_training']
        }
        target_categories = []
        for problem in pet.behavioral_problems:
            target_categories.extend(problem_mapping.get(problem.lower(), []))
        if target_categories:
            courses = courses.filter(category__in=target_categories)

    # Активность породы (автоматическая или выбранная)
    activity_level = pet.activity_level or pet.suggested_activity_level
    if activity_level in ['high', 'very_high']:
        # Для активных пород - спортивные дисциплины
        courses = courses.filter(
            Q(category__in=['sports', 'agility', 'obedience']) |
            Q(requires_high_activity=True)
        )
    elif activity_level == 'low':
        # Для спокойных - базовые команды и расслабление
        courses = courses.filter(category__in=['basic_commands', 'relaxation'])

    # Рекомендуемые активности породы
    recommended_activities = breed_characteristics.get('activities', [])
    if recommended_activities:
        activity_mapping = {
            'retrieving': ['retrieval', 'hunting'],
            'herding': ['herding', 'obedience'],
            'guarding': ['protection', 'guard_training'],
            'hunting': ['hunting', 'tracking'],
            'agility': ['agility', 'sports'],
            'companionship': ['basic_commands', 'family_training']
        }
        suitable_categories = []
        for activity in recommended_activities:
            suitable_categories.extend(activity_mapping.get(activity.lower(), []))
        if suitable_categories:
            courses = courses.filter(category__in=suitable_categories)

    return courses.order_by('-personalization_score')[:limit]

def calculate_complexity_score(pet):
    """
    Комплексный расчет уровня сложности обучения с учетом породы
    """
    score = 0

    # Опыт дрессировки (0-4 балла)
    experience_levels = {
        'none': 0,
        'basic': 1,
        'intermediate': 2,
        'advanced': 3,
        'professional': 4
    }
    score += experience_levels.get(pet.training_experience, 1)

    # Возраст (0-2 балла) - с учетом породы
    if pet.age and pet.age < 1:
        score += 0  # щенки/котята
    elif pet.age and pet.age > 7:
        score += 1  # пожилые животные
    else:
        score += 2  # взрослые

    # Поведенческие проблемы (0-2 балла)
    if pet.behavioral_problems and len(pet.behavioral_problems) > 0:
        score += min(len(pet.behavioral_problems), 2)

    # Корректировка по сложности обучения породы
    if pet.breed:
        if pet.breed.training_difficulty == 'easy':
            score = max(0, score - 1)
        elif pet.breed.training_difficulty == 'hard':
            score += 1

    # Корректировка по интеллекту породы (предполагаемый)
    if pet.breed and 'intelligent' in pet.breed.temperament:
        score += 0.5  # Умные породы обучаются легче

    return score
```

**Ключевые преимущества:**
- Комплексная оценка сложности вместо простого уровня опыта
- Учет поведенческих проблем для целевых курсов
- Возрастная адаптация программ
- Персонализация по уровню активности

#### Календарь - полная автоматизация здоровья

**Выбранный вариант:** Вариант Б - Полная автоматизация на основе профиля + структурированные данные о здоровье

**Структурированные поля для календаря:**
- `vaccination_schedule` - JSON с графиком вакцинаций и датами
- `medication_schedule` - JSON с графиком приема препаратов
- `feeding_schedule` - JSON с расписанием кормлений
- `walking_schedule` - JSON с расписанием прогулок
- `vet_checkup_schedule` - JSON с плановыми осмотрами

**Логика автоматической генерации событий:**

```python
def generate_calendar_events_for_pet(pet):
    """
    Автоматическая генерация регулярных событий для питомца
    """
    events = []

    # Кормление
    if pet.feeding_frequency and pet.feeding_frequency != 'free':
        feeds_per_day = {'1': 1, '2': 2, '3': 3}.get(pet.feeding_frequency, 2)
        for i in range(feeds_per_day):
            hour = 8 + (i * 8)  # 8:00, 16:00 для 2-разового кормления
            events.append({
                'type': 'feeding',
                'title': f'Кормление {pet.name}',
                'time': f'{hour:02d}:00',
                'recurrence': 'daily',
                'pet': pet
            })

    # Прогулки (только для собак)
    if pet.species == 'dog' and pet.walk_frequency:
        walks_per_day = {'rarely': 1, 'daily': 2, 'twice': 2, 'thrice': 3}.get(pet.walk_frequency, 2)
        for i in range(walks_per_day):
            hour = 7 + (i * 6)  # утро и вечер
            events.append({
                'type': 'walking',
                'title': f'Прогулка с {pet.name}',
                'time': f'{hour:02d}:00',
                'duration': pet.walk_duration or '30 мин',
                'recurrence': 'daily',
                'pet': pet
            })

    # Вакцинации (из структурированных данных)
    if hasattr(pet, 'vaccination_schedule') and pet.vaccination_schedule:
        for vaccine in pet.vaccination_schedule:
            if vaccine.get('next_date'):
                events.append({
                    'type': 'vaccination',
                    'title': f'Вакцинация {pet.name}: {vaccine.get("name", "Прививка")}',
                    'date': vaccine['next_date'],
                    'pet': pet
                })

    # Приемы препаратов
    if hasattr(pet, 'medication_schedule') and pet.medication_schedule:
        for med in pet.medication_schedule:
            if med.get('schedule_type') == 'daily':
                events.append({
                    'type': 'medication',
                    'title': f'Препарат для {pet.name}: {med.get("name", "Лекарство")}',
                    'time': med.get('time', '09:00'),
                    'recurrence': 'daily',
                    'pet': pet
                })

    return events
```

**Вопрос к пользователю:** Для календаря - уровень автоматизации?
1. **Вариант А:** Только пользовательские события + базовые напоминания (прогулки, кормление)
2. **Вариант Б:** Полная автоматизация на основе профиля + структурированные данные о здоровье
3. **Вариант В:** Гибрид - автоматизация с возможностью отключения отдельных типов событий

**Плюсы Варианта А:** Простая реализация, минимальная нагрузка на систему
**Минусы Варианта А:** Мало ценности для пользователя, требует ручного ввода

**Плюсы Варианта Б:** Максимальная польза, профилактика пропусков важных событий
**Минусы Варианта Б:** Сложная реализация, требует структурирования данных о здоровье

**Плюсы Варианта В:** Баланс между автоматизацией и контролем пользователя

#### Аналитика - метрики использования и поведения

**Текущие метрики:**
- Количество питомцев по видам (pets_total, pets_dogs, pets_cats)
- Базовые агрегаты по пользователям

**Расширенные метрики на основе PetID:**

**Метрики вовлеченности пользователей:**
- `profile_completeness` - средний процент заполненности профилей
- `profiles_created` - количество созданных профилей
- `extended_profiles` - количество полных профилей (>80% заполненности)
- `active_profiles` - профили, обновлявшиеся за последние 30 дней

**Метрики здоровья питомцев:**
- `health_issues_distribution` - распределение проблем здоровья
- `vaccination_compliance` - процент питомцев с актуальными прививками
- `dental_health_score` - средняя оценка состояния зубов
- `chronic_conditions_prevalence` - распространенность хронических заболеваний

**Метрики персонализации:**
- `personalization_usage` - процент пользователей, использующих персонализированные рекомендации
- `recommendation_click_rate` - CTR персонализированных рекомендаций
- `conversion_from_recommendations` - конверсия покупок из рекомендаций
- `course_completion_by_pet_type` - завершаемость курсов по видам животных

**Метрики поведения пользователей:**
- `pet_age_distribution` - распределение питомцев по возрастам
- `breed_popularity` - популярность пород
- `spending_by_pet_characteristics` - траты по характеристикам питомцев
- `feature_adoption` - использование различных функций PetID

**Новые поля для аналитики:**
- `analytics_consent` - согласие на сбор аналитики (GDPR compliant)
- `behavior_tracking` - отслеживание взаимодействия с питомцем (опционально)
- `usage_patterns` - паттерны использования приложения
- `pet_care_score` - интегральная оценка ухода за питомцем

**Логика расчета метрик:**

```python
def calculate_pet_care_score(pet):
    """
    Комплексная оценка качества ухода за питомцем
    """
    score = 0
    max_score = 100

    # Профиль заполненности (20%)
    completeness = pet.profile_completeness or 0
    score += completeness * 0.2

    # Здоровье (30%)
    health_score = 0
    if pet.vaccinations: health_score += 20  # Прививки
    if pet.vet_visits: health_score += 10    # Посещения ветеринара
    if not pet.health_issues: health_score += 10  # Отсутствие проблем
    if pet.dental_health in ['excellent', 'good']: health_score += 10
    score += health_score * 0.3

    # Кормление (20%)
    feeding_score = 0
    if pet.diet_type: feeding_score += 10
    if pet.feeding_frequency: feeding_score += 5
    if not pet.allergies or len(pet.allergies) == 0: feeding_score += 5
    score += feeding_score * 0.2

    # Активность и уход (20%)
    activity_score = 0
    if pet.activity_level: activity_score += 5
    if pet.walk_frequency and pet.walk_frequency != 'rarely': activity_score += 5
    if pet.has_yard or pet.walk_duration: activity_score += 5
    if pet.training_experience and pet.training_experience != 'none': activity_score += 5
    score += activity_score * 0.2

    # Социализация (10%)
    social_score = 0
    if pet.social_level and pet.social_level in ['street', 'social']: social_score += 5
    if pet.has_children == False or pet.other_pets: social_score += 5
    score += social_score * 0.1

    return min(score, max_score)
```


## **5. ОПТИМИЗИРОВАННАЯ СТРУКТУРА БАЗЫ ДАННЫХ**

### 5.1. Архитектурные принципы

**🎯 Цели оптимизации:**
- **Минимизация запросов**: Предварительное вычисление часто используемых данных
- **Гибкость сравнения**: Структурированные данные для сопоставления с пользовательским вводом
- **Кросс-сервисная эффективность**: Общие поля для всех сервисов (магазин, курсы, календарь, аналитика)
- **Масштабируемость**: JSON поля для динамических характеристик

### 5.2. Справочник пород (Breed)

**📊 Модель для каталога пород с оптимизацией под сервисы:**

```python
class Breed(models.Model):
    """Оптимизированный справочник пород для персонализации"""

    # === ОСНОВНЫЕ ПОЛЯ ===
    BREED_TYPE_CHOICES = [('dog', 'Собака'), ('cat', 'Кошка')]

    name = models.CharField(max_length=100, unique=True, verbose_name='Название породы')
    species = models.CharField(max_length=10, choices=BREED_TYPE_CHOICES, verbose_name='Вид')
    slug = models.SlugField(unique=True, verbose_name='URL-идентификатор')

    # === ФИЗИЧЕСКИЕ ХАРАКТЕРИСТИКИ ===
    SIZE_CHOICES = [
        ('toy', 'Toy (до 5 кг)'), ('small', 'Small (5-10 кг)'),
        ('medium', 'Medium (10-25 кг)'), ('large', 'Large (25-40 кг)'),
        ('giant', 'Giant (40+ кг)')
    ]
    size_category = models.CharField(max_length=20, choices=SIZE_CHOICES, verbose_name='Размерная категория')

    # Весовые диапазоны для автоматического определения размера
    average_weight_min = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='Мин. вес (кг)')
    average_weight_max = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='Макс. вес (кг)')
    average_height_min = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Мин. рост (см)')
    average_height_max = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Макс. рост (см)')

    # === ШЕРСТЬ И УХОД ===
    COAT_LENGTH_CHOICES = [
        ('hairless', 'Голая'), ('short', 'Короткая'), ('medium', 'Средняя'),
        ('long', 'Длинная'), ('very_long', 'Очень длинная')
    ]
    COAT_TYPE_CHOICES = [
        ('straight', 'Прямая'), ('wavy', 'Волнистая'), ('curly', 'Курчавая'),
        ('wiry', 'Жесткая'), ('silky', 'Шелковистая'), ('double', 'Двойная'),
        ('corded', 'Шнуровая'), ('hairless', 'Голая')
    ]
    SHEDDING_LEVEL_CHOICES = [
        ('none', 'Не линяет'), ('low', 'Минимальная'), ('medium', 'Средняя'),
        ('high', 'Сильная'), ('seasonal', 'Сезонная')
    ]

    coat_length = models.CharField(max_length=20, choices=COAT_LENGTH_CHOICES, verbose_name='Длина шерсти')
    coat_type = models.CharField(max_length=20, choices=COAT_TYPE_CHOICES, verbose_name='Тип шерсти')
    shedding_level = models.CharField(max_length=20, choices=SHEDDING_LEVEL_CHOICES, verbose_name='Уровень линьки')
    grooming_needs = models.CharField(max_length=20, choices=GROOMING_NEEDS_CHOICES, verbose_name='Уход за шерстью')

    # Специфично для собак
    face_type = models.CharField(max_length=20, choices=FACE_TYPE_CHOICES, null=True, blank=True, verbose_name='Форма морды')
    ear_type = models.CharField(max_length=20, choices=EAR_TYPE_CHOICES, null=True, blank=True, verbose_name='Тип ушей')
    drooling_level = models.CharField(max_length=20, choices=DROOLING_CHOICES, default='low', verbose_name='Уровень слюноотделения')

    # === ФИЗИОЛОГИЧЕСКИЕ ХАРАКТЕРИСТИКИ ===
    average_lifespan_min = models.IntegerField(verbose_name='Мин. продолжительность жизни (лет)')
    average_lifespan_max = models.IntegerField(verbose_name='Макс. продолжительность жизни (лет)')

    METABOLISM_CHOICES = [('slow', 'Медленный'), ('normal', 'Нормальный'), ('fast', 'Быстрый')]
    OBESITY_RISK_CHOICES = [('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий')]
    TEMPERATURE_TOLERANCE_CHOICES = [('cold_tolerant', 'Холодостойкий'), ('heat_tolerant', 'Жаростойкий'), ('neutral', 'Нейтральный')]

    metabolism_rate = models.CharField(max_length=20, choices=METABOLISM_CHOICES, default='normal', verbose_name='Метаболизм')
    obesity_risk = models.CharField(max_length=20, choices=OBESITY_RISK_CHOICES, default='medium', verbose_name='Риск ожирения')
    temperature_tolerance = models.CharField(max_length=20, choices=TEMPERATURE_TOLERANCE_CHOICES, default='neutral', verbose_name='Температурная адаптация')

    SKIN_SENSITIVITY_CHOICES = [('low', 'Низкая'), ('medium', 'Средняя'), ('high', 'Высокая')]
    skin_sensitivity = models.CharField(max_length=20, choices=SKIN_SENSITIVITY_CHOICES, default='medium', verbose_name='Чувствительность кожи')

    # Специфично для собак
    noise_tolerance = models.CharField(max_length=20, choices=NOISE_TOLERANCE_CHOICES, default='medium', null=True, blank=True, verbose_name='Чувствительность к шуму')

    # === ПОВЕДЕНЧЕСКИЕ ХАРАКТЕРИСТИКИ ===
    ENERGY_LEVELS = [('low', 'Низкая'), ('medium', 'Средняя'), ('high', 'Высокая'), ('very_high', 'Очень высокая')]
    energy_level = models.CharField(max_length=20, choices=ENERGY_LEVELS, verbose_name='Уровень энергии')

    # Темперамент (JSON для множественного выбора)
    temperament = models.JSONField(default=list, validators=[validate_string_list], verbose_name='Характер')

    # Социализация и обучение
    training_difficulty = models.CharField(max_length=20, choices=[('easy', 'Легко'), ('medium', 'Средне'), ('hard', 'Сложно')], default='medium')
    socialization_needs = models.CharField(max_length=20, choices=[('low', 'Низкие'), ('medium', 'Средние'), ('high', 'Высокие')], default='medium')

    # === ЗДОРОВЬЕ ===
    # Генетические заболевания (JSON)
    common_health_issues = models.JSONField(default=list, validators=[validate_string_list], verbose_name='Распространенные проблемы здоровья')
    genetic_diseases = models.JSONField(default=list, validators=[validate_string_list], verbose_name='Генетические заболевания')

    # === ПИТАНИЕ И АКТИВНОСТЬ ===
    # Рекомендуемые активности (JSON)
    recommended_activities = models.JSONField(default=list, validators=[validate_string_list], verbose_name='Рекомендуемые активности')

    # Диапазоны кормления
    feeding_frequency_recommended = models.JSONField(default=dict, verbose_name='Рекомендуемая частота кормления')
    # Пример: {'puppy': 3, 'adult': 2, 'senior': 2}

    # === МЕТА-ДАННЫЕ ===
    popularity_rank = models.IntegerField(default=0, verbose_name='Рейтинг популярности')
    is_active = models.BooleanField(default=True, verbose_name='Активна')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Порода'
        verbose_name_plural = 'Породы'
        ordering = ['-popularity_rank', 'name']
        indexes = [
            models.Index(fields=['species', 'size_category']),
            models.Index(fields=['energy_level', 'training_difficulty']),
            GinIndex(fields=['temperament'], name='breed_temperament_gin'),
            GinIndex(fields=['common_health_issues'], name='breed_health_gin'),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_species_display()})"

    @property
    def average_weight(self):
        """Средний вес породы для сравнения"""
        return (self.average_weight_min + self.average_weight_max) / 2

    @property
    def average_lifespan(self):
        """Средняя продолжительность жизни"""
        return (self.average_lifespan_min + self.average_lifespan_max) / 2

    # === МЕТОДЫ ДЛЯ АВТОМАТИЧЕСКОГО ЗАПОЛНЕНИЯ ===
    def get_breed_characteristics_for_pet(self):
        """
        Возвращает характеристики породы для автоматического заполнения Pet профиля
        """
        return {
            # Физические
            'size_category': self.size_category,
            'coat_length': self.coat_length,
            'coat_type': self.coat_type,
            'shedding_level': self.shedding_level,
            'face_type': self.face_type,
            'ear_type': self.ear_type,
            'skin_sensitivity': self.skin_sensitivity,

            # Физиологические
            'energy_level': self.energy_level,
            'metabolism_rate': self.metabolism_rate,
            'drooling_level': self.drooling_level,
            'obesity_risk': self.obesity_risk,
            'temperature_tolerance': self.temperature_tolerance,
            'noise_tolerance': self.noise_tolerance,

            # Поведенческие
            'temperament': self.temperament,
            'training_difficulty': self.training_difficulty,
            'socialization_needs': self.socialization_needs,

            # Здоровье
            'common_health_issues': self.common_health_issues,
            'genetic_diseases': self.genetic_diseases,
            'average_lifespan': self.average_lifespan,

            # Активности
            'recommended_activities': self.recommended_activities,
        }

    def get_size_from_weight(self, actual_weight):
        """
        Определяет размер питомца по весу относительно породы
        """
        if not actual_weight:
            return self.size_category

        breed_avg = self.average_weight
        weight_ratio = actual_weight / breed_avg

        if weight_ratio < 0.8:
            return 'toy' if self.size_category in ['small', 'toy'] else 'small'
        elif weight_ratio > 1.2:
            return 'large' if self.size_category in ['medium', 'large'] else 'giant'
        else:
            return self.size_category

    def get_pet_comparison_data(self, pet):
        """
        Возвращает данные для сравнения породы с конкретным питомцем
        Используется для анализа отклонений и рекомендаций
        """
        return {
            'weight_comparison': {
                'breed_avg': self.average_weight,
                'pet_weight': pet.weight,
                'deviation_percent': ((pet.weight - self.average_weight) / self.average_weight) * 100,
                'risk_level': 'high' if abs(((pet.weight - self.average_weight) / self.average_weight) * 100) > 20 else 'normal'
            },
            'health_risks': {
                'breed_specific': self.common_health_issues + self.genetic_diseases,
                'pet_issues': pet.health_issues or [],
                'matching_risks': set(self.common_health_issues) & set(pet.health_issues or [])
            },
            'care_needs': {
                'grooming_required': self.grooming_needs,
                'activity_required': self.energy_level,
                'socialization_required': self.socialization_needs
            }
        }

    def get_age_category_recommendations(self, age_years):
        """
        Возвращает рекомендации по возрасту
        """
        if age_years < 1:
            return {
                'category': 'puppy/kitten',
                'feeding_frequency': self.feeding_frequency_recommended.get('puppy', 3),
                'activity_level': 'medium',
                'health_focus': ['vaccinations', 'growth', 'development']
            }
        elif age_years > self.average_lifespan * 0.75:
            return {
                'category': 'senior',
                'feeding_frequency': self.feeding_frequency_recommended.get('senior', 2),
                'activity_level': 'low',
                'health_focus': ['joints', 'weight', 'chronic_conditions']
            }
        else:
            return {
                'category': 'adult',
                'feeding_frequency': self.feeding_frequency_recommended.get('adult', 2),
                'activity_level': self.energy_level,
                'health_focus': ['maintenance', 'prevention']
            }
```

### 5.3. Модель анализа профиля (PetProfileAnalysis)

**🧠 Модель для кэширования результатов анализа и рекомендаций:**

```python
class PetProfileAnalysis(models.Model):
    """
    Кэшированный анализ профиля питомца для быстрого доступа
    Автоматически обновляется при изменении Pet
    """
    pet = models.OneToOneField(Pet, on_delete=models.CASCADE, related_name='analysis')
    analysis_data = models.JSONField(verbose_name='Результаты анализа')

    # Вычисляемые поля для быстрого доступа
    health_score = models.IntegerField(default=0, verbose_name='Оценка здоровья (0-100)')
    risk_level = models.CharField(max_length=20, choices=[
        ('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий')
    ], default='medium', verbose_name='Уровень риска')

    # Кэшированные рекомендации
    recommendations = models.JSONField(default=dict, verbose_name='Рекомендации')
    alerts = models.JSONField(default=list, verbose_name='Предупреждения')

    # Метаданные
    last_analyzed = models.DateTimeField(auto_now=True)
    analysis_version = models.CharField(max_length=20, default='1.0')

    class Meta:
        verbose_name = 'Анализ профиля'
        verbose_name_plural = 'Анализы профилей'

    def update_analysis(self):
        """Обновляет анализ профиля"""
        from .services import PetProfileAnalyzer
        analyzer = PetProfileAnalyzer()
        self.analysis_data = analyzer.analyze_pet_profile(self.pet)
        self.health_score = self.analysis_data.get('overall_score', 0)
        self.risk_level = self.analysis_data.get('risk_level', 'medium')
        self.recommendations = self.analysis_data.get('recommendations', {})
        self.alerts = self.analysis_data.get('alerts', [])
        self.save()
```

### 5.4. Модель персонализированных рекомендаций (PersonalizedRecommendation)

**🎯 Модель для хранения персонализированных рекомендаций по сервисам:**

```python
class PersonalizedRecommendation(models.Model):
    """
    Персонализированные рекомендации для разных сервисов
    """
    RECOMMENDATION_TYPES = [
        ('product', 'Товары'),
        ('course', 'Курсы'),
        ('service', 'Услуги'),
        ('content', 'Контент'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE)
    recommendation_type = models.CharField(max_length=20, choices=RECOMMENDATION_TYPES)

    # Объект рекомендации
    recommended_object_id = models.CharField(max_length=100)  # ID товара/курса/услуги
    recommended_object_type = models.CharField(max_length=100)  # app.model

    # Причины рекомендации
    reasons = models.JSONField(default=list, verbose_name='Причины рекомендации')
    score = models.FloatField(default=0.0, verbose_name='Оценка релевантности')

    # Взаимодействие пользователя
    is_viewed = models.BooleanField(default=False)
    is_clicked = models.BooleanField(default=False)
    is_purchased = models.BooleanField(default=False)

    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Персонализированная рекомендация'
        verbose_name_plural = 'Персонализированные рекомендации'
        indexes = [
            models.Index(fields=['user', 'pet', 'recommendation_type']),
            models.Index(fields=['created_at']),
            models.Index(fields=['expires_at']),
        ]
```

### 5.5. Модель истории веса (PetWeightHistory)

**⚖️ Модель для отслеживания динамики веса:**

```python
class PetWeightHistory(models.Model):
    """
    История измерений веса для анализа динамики
    """
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='weight_history')
    weight = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='Вес (кг)')
    measured_at = models.DateTimeField(default=timezone.now, verbose_name='Дата измерения')
    notes = models.TextField(blank=True, verbose_name='Заметки')

    # Автоматические расчеты
    weight_change = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Изменение веса')
    days_since_previous = models.IntegerField(null=True, blank=True, verbose_name='Дней с предыдущего измерения')

    class Meta:
        verbose_name = 'История веса'
        verbose_name_plural = 'Истории веса'
        ordering = ['-measured_at']
        indexes = [
            models.Index(fields=['pet', '-measured_at']),
        ]

    def save(self, *args, **kwargs):
        # Рассчитываем изменение веса
        previous = PetWeightHistory.objects.filter(
            pet=self.pet,
            measured_at__lt=self.measured_at
        ).order_by('-measured_at').first()

        if previous:
            self.weight_change = self.weight - previous.weight
            self.days_since_previous = (self.measured_at.date() - previous.measured_at.date()).days

        super().save(*args, **kwargs)
```

### 5.6. Оптимизация индексов и запросов

**🚀 Индексы для производительности:**

```sql
-- Для быстрого поиска пород
CREATE INDEX breed_species_size_idx ON pets_breed (species, size_category);
CREATE INDEX breed_energy_training_idx ON pets_breed (energy_level, training_difficulty);

-- Для персонализированных рекомендаций
CREATE INDEX recommendation_user_pet_type_idx ON pets_personalizedrecommendation (user_id, pet_id, recommendation_type);
CREATE INDEX recommendation_expires_idx ON pets_personalizedrecommendation (expires_at) WHERE expires_at IS NOT NULL;

-- Для аналитики по весу
CREATE INDEX weight_history_pet_date_idx ON pets_petweighthistory (pet_id, measured_at DESC);

-- GIN индексы для JSON полей
CREATE INDEX breed_temperament_gin_idx ON pets_breed USING GIN (temperament);
CREATE INDEX breed_health_issues_gin_idx ON pets_breed USING GIN (common_health_issues);
CREATE INDEX breed_genetic_diseases_gin_idx ON pets_breed USING GIN (genetic_diseases);
```

**🔍 Ключевые отличия собак и кошек в БД:**

**Для собак дополнительно храним:**
- `face_type` (форма морды - важно для здоровья дыхания)
- `ear_type` (тип ушей - влияет на уход)
- `drooling_level` (слюноотделение - влияет на уход за шерстью)
- `noise_tolerance` (чувствительность к шуму - влияет на поведение)

**Для кошек дополнительно храним:**
- Более детальная информация о линьке (`shedding_level`)
- Самостоятельность в поведении (в `temperament`)
- Территориальность (в `socialization_needs`)

**Общие поля для обоих:**
- Физические характеристики (вес, размер)
- Шерсть и уход
- Поведение и темперамент
- Здоровье
- Питание и активность

## 5.4. Дополнительные таблицы для глубокой персонализации

### 5.4.1. Таблица персонализации продуктов (ProductPersonalization)
```python
class ProductPersonalization(models.Model):
    """Персонализация продуктов для конкретных характеристик питомцев"""

    PRODUCT_CHARACTERISTICS = [
        ('size', 'Размер'),
        ('coat_length', 'Длина шерсти'),
        ('coat_type', 'Тип шерсти'),
        ('shedding_level', 'Уровень линьки'),
        ('face_type', 'Форма морды'),
        ('ear_type', 'Тип ушей'),
        ('metabolism_rate', 'Метаболизм'),
        ('drooling_level', 'Слюноотделение'),
        ('obesity_risk', 'Риск ожирения'),
        ('temperature_tolerance', 'Температурная адаптация'),
        ('noise_tolerance', 'Чувствительность к шуму'),
        ('skin_sensitivity', 'Чувствительность кожи'),
        ('energy_level', 'Уровень энергии'),
        ('activity_level', 'Уровень активности'),
        ('behavior_type', 'Тип поведения'),
        ('age_category', 'Возрастная категория'),
        ('health_issues', 'Проблемы здоровья'),
        ('diet_type', 'Тип питания'),
        ('training_experience', 'Опыт дрессировки'),
    ]

    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    pet_characteristic = models.CharField(max_length=50, choices=PRODUCT_CHARACTERISTICS)
    characteristic_value = models.CharField(max_length=50)
    weight = models.IntegerField(default=1)  # Вес рекомендации (1-10)
    is_required = models.BooleanField(default=False)  # Обязательный продукт для характеристики
    alternative_products = models.ManyToManyField('self', blank=True, symmetrical=False,
        related_name='alternatives', help_text='Альтернативные продукты')

    class Meta:
        unique_together = ['product', 'pet_characteristic', 'characteristic_value']
        verbose_name = 'Персонализация продукта'
        verbose_name_plural = 'Персонализация продуктов'
```

### 5.4.2. Таблица персонализации курсов (CoursePersonalization)
```python
class CoursePersonalization(models.Model):
    """Персонализация курсов обучения для характеристик питомцев"""

    COURSE_CHARACTERISTICS = [
        ('species', 'Вид животного'),
        ('age_category', 'Возрастная категория'),
        ('behavior_type', 'Тип поведения'),
        ('social_level', 'Уровень социализации'),
        ('training_experience', 'Опыт дрессировки'),
        ('activity_level', 'Уровень активности'),
        ('behavioral_problems', 'Поведенческие проблемы'),
        ('special_needs', 'Особые потребности'),
    ]

    course = models.ForeignKey('Course', on_delete=models.CASCADE)
    pet_characteristic = models.CharField(max_length=50, choices=COURSE_CHARACTERISTICS)
    characteristic_value = models.CharField(max_length=50)
    compatibility_score = models.IntegerField(default=5)  # Совместимость (1-10)
    required_level = models.CharField(max_length=20, choices=[
        ('beginner', 'Начинающий'),
        ('intermediate', 'Средний'),
        ('advanced', 'Продвинутый'),
    ], default='beginner')

    class Meta:
        unique_together = ['course', 'pet_characteristic', 'characteristic_value']
        verbose_name = 'Персонализация курса'
        verbose_name_plural = 'Персонализация курсов'
```

### 5.4.3. Таблица персонализации услуг (ServicePersonalization)
```python
class ServicePersonalization(models.Model):
    """Персонализация услуг для характеристик питомцев"""

    SERVICE_CHARACTERISTICS = [
        ('species', 'Вид животного'),
        ('size', 'Размер'),
        ('coat_length', 'Длина шерсти'),
        ('health_issues', 'Проблемы здоровья'),
        ('behavior_type', 'Тип поведения'),
        ('age_category', 'Возрастная категория'),
        ('special_needs', 'Особые потребности'),
    ]

    service = models.ForeignKey('Service', on_delete=models.CASCADE)
    pet_characteristic = models.CharField(max_length=50, choices=SERVICE_CHARACTERISTICS)
    characteristic_value = models.CharField(max_length=50)
    suitability_score = models.IntegerField(default=5)  # Подходящесть (1-10)
    recommended_frequency = models.CharField(max_length=50, blank=True,
        help_text='Рекомендуемая частота (например: "1 раз в месяц")')

    class Meta:
        unique_together = ['service', 'pet_characteristic', 'characteristic_value']
        verbose_name = 'Персонализация услуги'
        verbose_name_plural = 'Персонализация услуг'
```

### 5.4.4. Таблица истории веса (PetWeightHistory)
```python
class PetWeightHistory(models.Model):
    """
    История измерений веса для анализа динамики
    """
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='weight_history')
    weight = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='Вес (кг)')
    measured_at = models.DateTimeField(default=timezone.now, verbose_name='Дата измерения')
    notes = models.TextField(blank=True, verbose_name='Заметки')

    # Автоматические расчеты
    weight_change = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Изменение веса')
    days_since_previous = models.IntegerField(null=True, blank=True, verbose_name='Дней с предыдущего измерения')

    class Meta:
        verbose_name = 'История веса'
        verbose_name_plural = 'Истории веса'
        ordering = ['-measured_at']
        indexes = [
            models.Index(fields=['pet', '-measured_at']),
        ]

    def save(self, *args, **kwargs):
        # Рассчитываем изменение веса
        previous = PetWeightHistory.objects.filter(
            pet=self.pet,
            measured_at__lt=self.measured_at
        ).order_by('-measured_at').first()

        if previous:
            self.weight_change = self.weight - previous.weight
            self.days_since_previous = (self.measured_at.date() - previous.measured_at.date()).days

        super().save(*args, **kwargs)
```

### 5.4.5. Таблица ветеринарных клиник (VetClinic)
```python
class VetClinic(models.Model):
    """Справочник ветеринарных клиник для интеграции"""

    name = models.CharField(max_length=200, verbose_name='Название клиники')
    address = models.TextField(verbose_name='Адрес')
    phone = models.CharField(max_length=20, verbose_name='Телефон')
    email = models.EmailField(blank=True, verbose_name='Email')
    website = models.URLField(blank=True, verbose_name='Сайт')

    # Координаты для карт
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Специализация
    specializations = models.JSONField(default=list, help_text='Специализации клиники')

    # Рейтинг и отзывы
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.IntegerField(default=0)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Ветеринарная клиника'
        verbose_name_plural = 'Ветеринарные клиники'
```

---

## 6. Последовательность создания PetID

### 6.1. Этапы создания профиля питомца

**🎯 Принцип: Быстрая регистрация → Постепенное расширение**

#### **Этап 1: Быстрое создание (2-3 минуты)**
**Цель:** Создать базовый профиль для работы сервисов
**Время:** 2-3 минуты
**Эффективность персонализации:** 80%

**Последовательность шагов:**
1. **Выбор вида животного** (собака/кошка)
2. **Ввод имени и даты рождения**
3. **Выбор породы** (опционально, но рекомендуется)
4. **Ввод веса и пола**
5. **Указание проблем здоровья** (аллергии, хронические заболевания)
6. **Указание аллергий/непереносимости** (критично для фильтрации товаров)
7. **Уровень активности** (для собак) / Тип жилья (для кошек)
8. **Поведенческие проблемы** (агрессия, страх, деструктивное поведение)

#### **Этап 2: Расширение профиля (постепенно)**
**Цель:** Углубление персонализации по мере использования
**Время:** В процессе использования сервисов
**Эффективность персонализации:** 100%

**Контекстные подсказки:**
- **При покупке товара:** "Расскажите больше о питании вашего питомца для лучших рекомендаций"
- **При просмотре курсов:** "Уточните опыт дрессировки для персональных рекомендаций"
- **В календаре:** "Добавьте информацию о питании для автоматического расписания"
- **В аналитике:** "Заполните дополнительные поля для подробного анализа"

### 6.2. Обязательные поля для базовой персонализации

#### **🐕 ДЛЯ СОБАК: 10 обязательных полей**

**Базовая информация (критично для идентификации):**
- `name` - Кличка ⭐ (личная связь)
- `species` - Вид животного ⭐ (фильтрация всех сервисов)
- `date_of_birth` - Дата рождения ⭐ (расчет возраста, рекомендации по этапам жизни)

**Физические характеристики (критично для размера и здоровья):**
- `breed` - Порода ⭐ (автозаполнение характеристик, персонализация)
- `weight` - Вес ⭐ (размер, порции корма, здоровье)
- `gender` - Пол ⭐ (медицинские рекомендации, поведение)

**Здоровье (критично для безопасности):**
- `health_issues` - Основные проблемы здоровья ⭐ (аллергии, хронические заболевания)

**Питание (критично для фильтрации товаров):**
- `excluded_ingredients` - Аллергии/непереносимость ⭐ (ингредиенты для исключения)

**Активность (критично для рекомендаций):**
- `activity_level` - Уровень активности ⭐ (прогулки, игрушки, курсы)

**Поведение (критично для курсов):**
- `behavioral_problems` - Поведенческие проблемы ⭐ (агрессия, страх, деструктивное поведение)

#### **🐱 ДЛЯ КОШЕК: 10 обязательных полей**

**Базовая информация (критично для идентификации):**
- `name` - Кличка ⭐ (личная связь)
- `species` - Вид животного ⭐ (фильтрация всех сервисов)
- `date_of_birth` - Дата рождения ⭐ (расчет возраста, рекомендации по этапам жизни)

**Физические характеристики (критично для размера и здоровья):**
- `breed` - Порода ⭐ (автозаполнение характеристик, персонализация)
- `weight` - Вес ⭐ (размер, порции корма, здоровье)
- `gender` - Пол ⭐ (медицинские рекомендации, поведение)

**Здоровье (критично для безопасности):**
- `health_issues` - Основные проблемы здоровья ⭐ (аллергии, хронические заболевания)

**Питание (критично для фильтрации товаров):**
- `excluded_ingredients` - Аллергии/непереносимость ⭐ (ингредиенты для исключения)

**Образ жизни (критично для кошек):**
- `housing_type` - Тип жилья ⭐ (квартира/дом - территориальность, активность)

**Поведение (важно для коррекции проблем):**
- `behavioral_problems` - Поведенческие проблемы ⭐ (агрессия, страх, деструктивное поведение)

### 6.3. Опциональные поля для расширенной персонализации

#### **🐕 ДЛЯ СОБАК: Опциональные поля**

**Расширенное здоровье:**
- `is_neutered` - Кастрирован/стерилизован
- `chronic_conditions` - Хронические заболевания
- `vaccinations` - Вакцинации
- `medications` - Принимаемые препараты
- `dental_health` - Состояние зубов
- `vet_visits` - Посещения ветеринара

**Расширенное питание:**
- `diet_type` - Тип питания (сухой/влажный/смешанный)
- `feeding_frequency` - Частота кормления
- `sensitive_digestion` - Чувствительное пищеварение
- `vitamins_supplements` - Витамины и добавки

**Дополнительное поведение и дрессировка:**
- `behavior_type` - Тип поведения (спокойный/активный/агрессивный)
- `social_level` - Уровень социализации
- `training_experience` - Опыт дрессировки
- `character_traits` - Черты характера
- `training_goals` - Цели дрессировки

**Образ жизни:**
- `body_type` - Тип телосложения
- `has_yard` - Наличие двора
- `other_pets` - Другие питомцы
- `has_children` - Наличие детей
- `walk_frequency` - Частота прогулок
- `walk_duration` - Длительность прогулки
- `special_needs` - Особые потребности
- `preferred_activities` - Предпочитаемые активности

**Дополнительно:**
- `photo` - Фото питомца
- `owner_phone` - Телефон владельца
- `owner_email` - Email владельца
- `owner_city` - Город

#### **🐱 ДЛЯ КОШЕК: Опциональные поля**

**Расширенное здоровье:**
- `is_neutered` - Кастрирован/стерилизован
- `chronic_conditions` - Хронические заболевания
- `vaccinations` - Вакцинации
- `medications` - Принимаемые препараты
- `dental_health` - Состояние зубов
- `vet_visits` - Посещения ветеринара

**Расширенное питание:**
- `diet_type` - Тип питания (сухой/влажный/смешанный)
- `feeding_frequency` - Частота кормления
- `sensitive_digestion` - Чувствительное пищеварение
- `vitamins_supplements` - Витамины и добавки

**Дополнительное поведение и социализация:**
- `behavior_type` - Тип поведения (независимый/ласковый/игривый)
- `social_level` - Уровень социализации
- `activity_level` - Уровень активности
- `character_traits` - Черты характера

**Образ жизни:**
- `body_type` - Тип телосложения
- `has_yard` - Доступ на улицу
- `other_pets` - Другие питомцы
- `has_children` - Наличие детей
- `special_needs` - Особые потребности
- `preferred_activities` - Предпочитаемые активности

**Дополнительно:**
- `photo` - Фото питомца
- `owner_phone` - Телефон владельца
- `owner_email` - Email владельца
- `owner_city` - Город

### 6.4. Логика автоматического заполнения

#### **Автоматически рассчитываемые поля:**
- `size` - Размер (по весу + породе)
- `age` - Возраст (по дате рождения)
- `age_category` - Категория возраста (щенок/взрослый/пожилой)

#### **Автозаполнение из породы:**
При выборе породы автоматически заполняются оптимальные значения:
- `activity_level` (из `energy_level` породы)
- `size` (из `size_category` породы)
- Базовые рекомендации по здоровью и уходу

### 6.5. UI/UX поток создания профиля

#### **Шаговый интерфейс (адаптивный):**

**Шаг 1: Базовая информация**
```
[Имя питомца] [Дата рождения]
[Вид: Собака 🐕 / Кошка 🐱]
```

**Шаг 2: Физические характеристики**
```
[Порода ▼] [Вес] [Пол: М/Ж]
```

**Шаг 3: Здоровье и питание**
```
[Проблемы здоровья ▼] (множественный выбор)
[Аллергии на продукты ▼] (множественный выбор)
```

**Шаг 4: Активность/Образ жизни**
```
Для собак: [Уровень активности ▼]
Для кошек: [Тип жилья ▼]
```

**Шаг 5: Поведение**
```
[Поведенческие проблемы ▼] (опционально, но рекомендуется)
```

#### **Контекстные подсказки:**
- **После создания:** "Профиль создан! Хотите добавить больше деталей для персональных рекомендаций?"
- **В магазине:** "Заполните питание для фильтрации аллергенных товаров"
- **В курсах:** "Уточните опыт дрессировки для лучших рекомендаций"

### 6.6. Метрики эффективности

#### **Цели по конверсии:**
- **80% пользователей** создают базовый профиль
- **40% пользователей** расширяют профиль в первые 2 недели
- **60% рекомендаций** основаны на персонализации
- **25% рост** конверсии в покупках благодаря персонализации

#### **Время создания:**
- **Базовый профиль:** 2-3 минуты
- **Полный профиль:** 5-7 минут (постепенно)

---

## 7. Реализация на бекенде

### 7.1. Модели данных

#### **Основная модель Pet**
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
            self.name, self.species, self.date_of_birth, self.breed,
            self.weight, self.gender, self.health_issues, self.excluded_ingredients
        ]
        filled_fields = sum(1 for field in fields if field)
        self.profile_completeness = int((filled_fields / len(fields)) * 100)
        return self.profile_completeness

    def save(self, *args, **kwargs):
        self.calculate_profile_completeness()
        super().save(*args, **kwargs)
```

#### **Модель Breed (справочник пород)**
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

#### **Модель анализа профиля**
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

#### **Модель персонализированных рекомендаций**
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

#### **Основные эндпоинты PetID**
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

#### **URL паттерны**
```python
# backend/apps/pets/urls.py
urlpatterns = [
    path('', PetListCreateView.as_view(), name='pet-list-create'),
    path('<uuid:pk>/', PetRetrieveUpdateDestroyView.as_view(), name='pet-detail'),
    path('<uuid:pk>/analysis/', PetAnalysisView.as_view(), name='pet-analysis'),
    path('breeds/', BreedListView.as_view(), name='breed-list'),
]
```
Редактор профиля с валидацией

#### **PetAnalysisWidget**
Виджет анализа и рекомендаций

#### **PetRecommendationsList**
Список персонализированных рекомендаций

### 7.3. Сериализаторы

#### **PetSerializer**
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

#### **BreedSerializer**
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

#### **PetProfileAnalyzer**
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

        # Анализ веса
        weight_analysis = self._analyze_weight_vs_breed(pet)
        if weight_analysis.get('status') == 'overweight':
            score -= 15
        elif weight_analysis.get('status') == 'underweight':
            score -= 10

        return max(0, min(100, score))
```

#### **PersonalizationScorer**
```python
class PersonalizationScorer:
    """Система скоринга персонализации"""

    SCOORING_WEIGHTS = {
        'health_match': 0.35,
        'breed_specific': 0.25,
        'age_compatibility': 0.20,
        'activity_match': 0.15,
        'user_preferences': 0.05
    }

    def calculate_personalization_score(self, pet, item, item_type='product'):
        """Комплексный расчет релевантности"""
        score = 0

        score += self.calculate_health_match(pet, item) * self.SCOORING_WEIGHTS['health_match']
        score += self.calculate_breed_specificity(pet, item) * self.SCOORING_WEIGHTS['breed_specific']
        score += self.calculate_age_compatibility(pet, item) * self.SCOORING_WEIGHTS['age_compatibility']
        score += self.calculate_activity_match(pet, item) * self.SCOORING_WEIGHTS['activity_match']
        score += self.get_user_preference_score(pet.owner, item) * self.SCOORING_WEIGHTS['user_preferences']

        return score

    def calculate_health_match(self, pet, item):
        """Расчет совпадения по здоровью"""
        if not hasattr(item, 'health_benefits') or not pet.health_issues:
            return 0.5

        matching_benefits = 0
        for issue in pet.health_issues:
            if issue.lower() in [benefit.lower() for benefit in item.health_benefits]:
                matching_benefits += 1

        return min(matching_benefits / len(pet.health_issues), 1)

    def calculate_breed_specificity(self, pet, item):
        """Расчет специфичности для породы"""
        if not pet.breed:
            return 0.5

        score = 0

        # Размер
        if hasattr(item, 'size_category') and pet.breed.size_category == item.size_category:
            score += 0.4

        # Активность
        if hasattr(item, 'activity_level') and pet.breed.energy_level == item.activity_level:
            score += 0.3

        # Шерсть
        if hasattr(item, 'coat_type') and pet.breed.coat_type == item.coat_type:
            score += 0.3

        return min(score, 1)

    def calculate_age_compatibility(self, pet, item):
        """Возрастная совместимость"""
        if not pet.age_category or not hasattr(item, 'age_groups'):
            return 0.5

        return 1.0 if pet.age_category in item.age_groups else 0.0

    def calculate_activity_match(self, pet, item):
        """Совпадение по активности"""
        if not pet.activity_level or not hasattr(item, 'activity_level'):
            return 0.5

        activity_levels = ['low', 'medium', 'high']
        pet_level = activity_levels.index(pet.activity_level)
        item_level = activity_levels.index(item.activity_level)

        return 1.0 - abs(pet_level - item_level) / 2

    def get_user_preference_score(self, user, item):
        """Предпочтения пользователя"""
        # Анализ истории покупок
        return 0.5  # Заглушка

#### **Миграция для базовых полей Pet**
```python
# 0001_initial_pet_model.py
class Migration(migrations.Migration):
    operations = [
        migrations.CreateModel(
            name='Pet',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4)),
                ('owner', models.ForeignKey(User, on_delete=models.CASCADE)),
                ('name', models.CharField(max_length=100)),
                ('species', models.CharField(max_length=10, choices=[('dog', 'Собака'), ('cat', 'Кошка')])),
                ('breed', models.ForeignKey('Breed', null=True, on_delete=models.SET_NULL)),
                ('date_of_birth', models.DateField()),
                ('gender', models.CharField(max_length=10, choices=[('male', 'М'), ('female', 'Ж'), ('unknown', '?')])),
                ('weight', models.DecimalField(max_digits=5, decimal_places=2)),
                ('activity_level', models.CharField(max_length=20, blank=True)),
                ('behavioral_problems', models.JSONField(default=list)),
                ('health_issues', models.JSONField(default=list)),
                ('excluded_ingredients', models.JSONField(default=list)),
                ('housing_type', models.CharField(max_length=20, blank=True)),
                ('profile_completeness', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
```

#### **Миграция для справочника пород**
```python
# 0002_create_breed_model.py
class Migration(migrations.Migration):
    operations = [
        migrations.CreateModel(
            name='Breed',
            fields=[
                ('id', models.AutoField(primary_key=True)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('species', models.CharField(max_length=10)),
                ('slug', models.SlugField(unique=True)),
                ('size_category', models.CharField(max_length=20)),
                ('average_weight_min', models.DecimalField(max_digits=5, decimal_places=2)),
                ('average_weight_max', models.DecimalField(max_digits=5, decimal_places=2)),
                ('energy_level', models.CharField(max_length=20)),
                ('common_health_issues', models.JSONField(default=list)),
                ('average_lifespan_min', models.IntegerField()),
                ('average_lifespan_max', models.IntegerField()),
                ('popularity_rank', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
```

#### **Миграция для анализа профилей**
```python
# 0003_add_analysis_models.py
class Migration(migrations.Migration):
    operations = [
        migrations.CreateModel(
            name='PetProfileAnalysis',
            fields=[
                ('id', models.AutoField(primary_key=True)),
                ('pet', models.OneToOneField('Pet', on_delete=models.CASCADE)),
                ('analysis_data', models.JSONField()),
                ('health_score', models.IntegerField(default=0)),
                ('risk_level', models.CharField(max_length=20, default='medium')),
                ('recommendations', models.JSONField(default=dict)),
                ('alerts', models.JSONField(default=list)),
                ('last_analyzed', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='PersonalizedRecommendation',
            fields=[
                ('id', models.AutoField(primary_key=True)),
                ('user', models.ForeignKey(User, on_delete=models.CASCADE)),
                ('pet', models.ForeignKey('Pet', on_delete=models.CASCADE)),
                ('recommendation_type', models.CharField(max_length=20)),
                ('recommended_object_id', models.CharField(max_length=100)),
                ('recommended_object_type', models.CharField(max_length=100)),
                ('reasons', models.JSONField(default=list)),
                ('score', models.FloatField(default=0.0)),
                ('is_viewed', models.BooleanField(default=False)),
                ('is_clicked', models.BooleanField(default=False)),
                ('is_purchased', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(null=True)),
            ],
        ),
    ]
```
│ 📊 Прогресс: 3/10 полей заполнено      │ ← Progress
├─────────────────────────────────────────┤
│                                         │
│ 🏷️ Кличка питомца                      │ ← Форма
│ [____________________]                 │
│                                         │
│ 🐕 Вид животного                        │
│ [🐕 Собака ▾]                          │
│                                         │
│ 🎯 Порода                               │
│ [Выберите породу ▾]                    │
│                                         │
│ ⚖️ Вес (кг)                             │
│ [______]                               │
│                                         │
│ 🚹 Пол                                  │
│ [Мальчик ▾]                            │
│                                         │
│ 🤒 Проблемы здоровья                    │
│ [____________________]                 │
│                                         │
│ 🚫 Аллергии и непереносимость           │
│ [____________________]                 │
│                                         │
│ 🏃 Уровень активности                   │
│ [Средний ▾]                            │
│                                         │
│ 😠 Поведенческие проблемы               │
│ [____________________]                 │
│                                         │
└─────────────────────────────────────────┘
   [СОЗДАТЬ ПРОФИЛЬ]                    ← Footer
```

#### **📝 Детальное описание полей и элементов UI:**

**1. Кличка питомца (name):**
```
🏷️ Кличка питомца *
[____________________] ← Input text
```
- **Тип элемента:** `Input` (type="text")
- **Валидация:** Обязательно, 2-50 символов, только буквы/пробелы/дефисы
- **Placeholder:** "Барон"
- **Особенности:**
  - Автофокус при открытии окна
  - Real-time валидация (красная рамка при ошибке)
  - Подсказка при ошибке: "Имя должно содержать 2-50 символов"

**2. Вид животного (species):**
```
🐕 Вид животного *
[🐕 Собака ▾] ← Select dropdown
```
- **Тип элемента:** `Select` с иконками
- **Опции:**
  - 🐕 Собака
  - 🐱 Кошка
- **Валидация:** Обязательно
- **Особенности:**
  - При выборе динамически обновляет список пород
  - Влияет на доступные поля (activity_level vs housing_type)

**3. Порода (breed):**
```
🎯 Порода
[Выберите породу ▾] ← Select с поиском
```
- **Тип элемента:** `Select` с виртуализацией и поиском
- **Опции:** 100+ пород в зависимости от вида
- **Валидация:** Опционально, но с рекомендацией
- **Особенности:**
  - Поиск по названию породы
  - При выборе → автозаполнение характеристик
  - Популярные породы в топе списка

**4. Вес (weight):**
```
⚖️ Вес (кг) *
[______] ← Input number
```
- **Тип элемента:** `Input` (type="number")
- **Валидация:** Обязательно, 0.1-200 кг, шаг 0.1
- **Особенности:**
  - При наличии породы показывает диапазон: "Для Лабрадора обычно 25-35 кг"
  - Визуальный индикатор соответствия норме (зеленый/желтый/красный)

**5. Пол (gender):**
```
🚹 Пол *
[Мальчик ▾] ← Select
```
- **Тип элемента:** `Select`
- **Опции:**
  - 🚹 Мальчик
  - 🚺 Девочка
  - ❓ Неизвестно
- **Валидация:** Обязательно

**6. Проблемы здоровья (health_issues):**
```
🤒 Проблемы здоровья
[____________________] ← Textarea
```
- **Тип элемента:** `Textarea` (rows="3")
- **Валидация:** Опционально
- **Placeholder:** "Аллергия на курицу, проблемы с суставами"
- **Особенности:**
  - Автокомплит: "аллергия", "дисплазия", "ожирение" и т.д.
  - Подсказка: "Перечислите через запятую или оставьте пустым"

**7. Аллергии и непереносимость (excluded_ingredients):**
```
🚫 Аллергии и непереносимость *
[____________________] ← Textarea
```
- **Тип элемента:** `Textarea` (rows="3")
- **Валидация:** Обязательно
- **Placeholder:** "Курица, говядина, молоко"
- **Особенности:**
  - Автокомплит ингредиентов
  - Критично для фильтрации товаров в магазине

**8. Уровень активности (activity_level) - для собак:**
```
🏃 Уровень активности *
[Средний ▾] ← Select
```
- **Тип элемента:** `Select`
- **Опции:**
  - 🐌 Низкий - ленивый, спокойный
  - 🏃 Средний - активный по вечерам
  - 🏃‍♂️ Высокий - ежедневные прогулки
- **Особенности:** Автозаполнение из породы

**9. Тип жилья (housing_type) - для кошек:**
```
🏠 Тип жилья *
[Квартира ▾] ← Select
```
- **Тип элемента:** `Select`
- **Опции:**
  - 🏠 Квартира - ограниченное пространство
  - 🏡 Дом с двором - больше свободы
- **Особенности:** Влияет на рекомендации по активности

**10. Поведенческие проблемы (behavioral_problems):**
```
😠 Поведенческие проблемы
[____________________] ← Textarea
```
- **Тип элемента:** `Textarea` (rows="3")
- **Валидация:** Опционально, но рекомендуется
- **Placeholder:** "Агрессия к незнакомцам, боится громких звуков"
- **Особенности:**
  - Автокомплит: "агрессия", "страх", "лаем на гостей"
  - Критично для персонализации курсов

#### **🤖 Автозаполнение (breed-based):**
```
🤖 На основе породы Labrador Retriever:
Размер: Large • Активность: Высокая
[Изменить значения ▼] ← Collapsible section
```
- **Показывается:** Только при выборе породы
- **Содержит:** Автоматически определенные значения
- **Возможности:** Развернуть и изменить

### 7.4. Сервисы и бизнес-логика

#### **🔄 Полный процесс создания:**

**Шаг 1: Открытие модального окна**
```
Пользователь нажимает "+" → "Добавить питомца"
├── Экран темнеет (overlay с blur)
├── Модальное окно появляется в центре (анимация slideUp)
├── Фокус на поле "Кличка"
└── Progress: "0/10 полей заполнено"
```

**Шаг 2: Заполнение полей (с валидацией)**
```
1. Кличка → ✓ (валидация в реальном времени)
2. Вид → Обновление списка пород
3. Порода → Автозаполнение + подсказки
4. Вес → Проверка диапазона по породе
5. Пол → ✓
6. Здоровье → Автокомплит (опционально)
7. Аллергии → Автокомплит (обязательно)
8. Активность/Жилье → Автозаполнение
9. Поведение → Автокомплит (рекомендуется)
10. Проверка автозаполнения → Возможность изменения
```

**Шаг 3: Создание профиля**
```
Нажимает "СОЗДАТЬ ПРОФИЛЬ"
├── Валидация всех обязательных полей
├── API вызов с обработкой ошибок
├── Loading: "Создание профиля..."
├── Успех → Закрытие + Toast уведомление
└── Ошибка → Подсветка проблемных полей + сообщения
```

**Шаг 4: Уведомление и расширение**
```
Toast: "🎉 Барон успешно добавлен!"
├── "Профиль создан со стандартными характеристиками"
├── Кнопки: [Расширить профиль] [Позже]
└── В карточке: бейдж "Базовый" + прогресс-бар
```

### 7.5. Миграции базы данных

#### **🚨 Крайний случай 1: Мобильная адаптация**
**Проблема:** Модальное окно 500px слишком велико для мобильных
**Решение:**
- Адаптивная ширина: `min(500px, 90vw)`
- Вертикальная прокрутка для длинного контента
- Touch-friendly элементы (минимум 44px высота)

#### **🚨 Крайний случай 2: Загрузка списка пород**
**Проблема:** 100+ пород = долгая загрузка и поиск
**Решение:**
- **Виртуализация списка** (react-window)
- **Кеширование** популярных пород в localStorage
- **Ленивая загрузка** (infinite scroll)
- **Поиск с debounce** (300ms задержка)

#### **🚨 Крайний случай 3: Автозаполнение незаметно**
**Проблема:** Пользователь не замечает автозаполненные поля
**Решение:**
- **Визуальный индикатор** 🤖 "Автоматически определено"
- **Подсказка при наведении** "На основе породы Labrador"
- **Кнопка "Изменить"** всегда видима
- **Анимация заполнения** (fade-in effect)

#### **🚨 Крайний случай 4: Потеря данных при закрытии**
**Проблема:** Незавершенный профиль теряется
**Решение:**
- **Автосохранение в localStorage** каждые 5 секунд
- **Диалог подтверждения** при закрытии с изменениями
- **Восстановление черновика** при следующем открытии
- **Серверные черновики** для авторизованных пользователей

#### **🚨 Крайний случай 5: Сетевая недоступность**
**Проблема:** Нет интернета при создании профиля
**Решение:**
- **Offline-first подход** - локальное сохранение
- **Синхронизация при восстановлении** связи
- **Индикатор состояния** "Ожидание подключения..."
- **Fallback UI** для работы без сети

#### **🚨 Крайний случай 6: Доступность (a11y)**
**Проблема:** Скринридеры и клавиатурная навигация
**Решение:**
- **ARIA labels** для всех элементов
- **Keyboard navigation** (Tab, Enter, Escape)
- **Screen reader support** для прогресса и ошибок
- **High contrast mode** поддержка

#### **🚨 Крайний случай 7: Локализация**
**Проблема:** Названия пород и симптомов на разных языках
**Решение:**
- **Базовые названия** на английском в БД
- **Локализованные названия** в отдельной таблице
- **Автоперевод** для пользовательского ввода
- **Fallback** на английские термины

#### **🚨 Крайний случай 8: Производительность на слабых устройствах**
**Проблема:** Большая форма тормозит на старых устройствах
**Решение:**
- **Code splitting** - ленивая загрузка компонентов
- **Virtual scrolling** для длинных списков
- **Debounced валидация** (не на каждый символ)
- **Progressive enhancement** - базовый функционал без JS

### 7.6. Варианты реализации UI компонентов

#### **Вариант 1: Единая форма (рекомендуемый)**
```jsx
// Все поля в одном скроллируемом контейнере
<div className="modal-content max-h-[70vh] overflow-y-auto">
  <form className="space-y-6 p-6">
    {/* Все поля подряд */}
  </form>
</div>
```
**Плюсы:** Просто, все видно сразу
**Минусы:** Может быть перегружено визуально

#### **Вариант 2: Шаговый wizard**
```jsx
// Разделение на логические шаги
<Wizard steps={['basic', 'physical', 'health', 'behavior']}>
  <Step name="basic">{/* Имя, вид, порода */}</Step>
  <Step name="physical">{/* Вес, пол */}</Step>
  <Step name="health">{/* Здоровье, аллергии */}</Step>
  <Step name="behavior">{/* Активность, проблемы */}</Step>
</Wizard>
```
**Плюсы:** Структурировано, меньше когнитивной нагрузки
**Минусы:** Больше кликов, может быть неудобно на мобильных

#### **Вариант 3: Accordion форма**
```jsx
// Сворачиваемые секции
<Accordion type="multiple">
  <AccordionItem value="basic">Основное</AccordionItem>
  <AccordionItem value="physical">Физическое</AccordionItem>
  <AccordionItem value="health">Здоровье</AccordionItem>
  <AccordionItem value="behavior">Поведение</AccordionItem>
</Accordion>
```
**Плюсы:** Компактно, можно сворачивать
**Минусы:** Может быть непонятно, что заполнять сначала

### 7.7. Метрики эффективности UI

#### **Цели по UX:**
- **Время создания:** < 3 минут для базового профиля
- **Конверсия:** > 80% пользователей завершают создание
- **Ошибки валидации:** < 5% полей с ошибками
- **Мобильная удовлетворенность:** > 4.5/5 звезд

#### **Трекинг метрик:**
- **Время на каждом шаге** (A/B тестирование)
- **Процент автозаполнения** (эффективность)
- **Частота использования черновиков** (проблемы с UX)
- **Коэффициент отказов** на каждом поле

---

## **8. РИСКИ И ПЛАНЫ ПО СНИЖЕНИЮ**

### 8.1. Технические риски
- **Высокая нагрузка на БД** при поиске пород → решение: Elasticsearch
- **Проблемы с кешированием** → решение: Redis для автозаполнения
- **Конфликты данных** → решение: optimistic updates + conflict resolution

### 8.2. UX риски
- **Перегруженность формы** → решение: progressive disclosure
- **Недопонимание автозаполнения** → решение: clear visual indicators
- **Мобильные проблемы** → решение: responsive design + touch optimization

### 8.3. Бизнес риски
- **Низкая конверсия создания** → решение: упрощение обязательных полей
- **Некачественные данные** → решение: валидация + подсказки
- **Отказы из-за сложности** → решение: A/B тестирование вариантов UI

---

**Рекомендация: Начать с Варианта 1 (единая форма) как наиболее простого для реализации, с последующим A/B тестированием других вариантов для оптимизации конверсии.** 🚀✨
        ('fast', 'Быстрый'),
    ]

    DROOLING_LEVEL_CHOICES = [
        ('none', 'Не слюнявый'),
        ('low', 'Минимально'),
        ('medium', 'Средне'),
        ('high', 'Сильно слюнявый'),
    ]

    OBESITY_RISK_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
    ]

    TEMPERATURE_TOLERANCE_CHOICES = [
        ('cold_tolerant', 'Холодостойкий'),
        ('heat_tolerant', 'Жаростойкий'),
        ('neutral', 'Нейтральный'),
    ]

    NOISE_TOLERANCE_CHOICES = [
        ('low', 'Чувствительный к шуму'),
        ('medium', 'Средний'),
        ('high', 'Нечувствительный к шуму'),
    ]

    # Основные поля
    name = models.CharField(max_length=100, unique=True, verbose_name='Название породы')
    species = models.CharField(max_length=10, choices=BREED_TYPE_CHOICES, verbose_name='Вид')

    # Физические характеристики
    average_weight_min = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='Мин. вес (кг)')
    average_weight_max = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='Макс. вес (кг)')
    average_height_min = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Мин. рост (см)')
    average_height_max = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Макс. рост (см)')
    size_category = models.CharField(max_length=20, choices=SIZE_CHOICES, verbose_name='Размерная категория')

    # Характеристики шерсти и ухода
    coat_length = models.CharField(max_length=20, choices=COAT_LENGTH_CHOICES, verbose_name='Длина шерсти')
    coat_type = models.CharField(max_length=20, choices=COAT_TYPE_CHOICES, verbose_name='Тип шерсти')
    shedding_level = models.CharField(max_length=20, choices=SHEDDING_LEVEL_CHOICES, verbose_name='Уровень линьки')
    grooming_needs = models.CharField(max_length=20, choices=GROOMING_NEEDS, verbose_name='Уход за шерстью')
    skin_sensitivity = models.CharField(max_length=20, choices=SKIN_SENSITIVITY_CHOICES, default='medium', verbose_name='Чувствительность кожи')

    # Физиологические особенности
    face_type = models.CharField(max_length=20, choices=FACE_TYPE_CHOICES, verbose_name='Форма морды')
    ear_type = models.CharField(max_length=20, choices=EAR_TYPE_CHOICES, verbose_name='Тип ушей')
    metabolism_rate = models.CharField(max_length=20, choices=METABOLISM_CHOICES, default='normal', verbose_name='Метаболизм')
    drooling_level = models.CharField(max_length=20, choices=DROOLING_LEVEL_CHOICES, default='low', verbose_name='Уровень слюноотделения')
    obesity_risk = models.CharField(max_length=20, choices=OBESITY_RISK_CHOICES, default='medium', verbose_name='Риск ожирения')
    temperature_tolerance = models.CharField(max_length=20, choices=TEMPERATURE_TOLERANCE_CHOICES, default='neutral', verbose_name='Температурная адаптация')
    noise_tolerance = models.CharField(max_length=20, choices=NOISE_TOLERANCE_CHOICES, default='medium', verbose_name='Чувствительность к шуму')

    # Поведенческие характеристики
    average_lifespan = models.IntegerField(verbose_name='Средняя продолжительность жизни (лет)')
    energy_level = models.CharField(max_length=20, choices=ENERGY_LEVELS, verbose_name='Уровень энергии')
    temperament = models.JSONField(default=list, validators=[validate_string_list], verbose_name='Характер')

    # Здоровье
    common_health_issues = models.JSONField(default=list, validators=[validate_string_list], verbose_name='Распространенные проблемы здоровья')
    genetic_diseases = models.JSONField(default=list, validators=[validate_string_list], verbose_name='Генетические заболевания')

    # Дрессировка и социализация
    recommended_activities = models.JSONField(default=list, validators=[validate_string_list], verbose_name='Рекомендуемые активности')
    training_difficulty = models.CharField(max_length=20, choices=[('easy', 'Легко'), ('medium', 'Средне'), ('hard', 'Сложно')], default='medium')
    socialization_needs = models.CharField(max_length=20, choices=[('low', 'Низкие'), ('medium', 'Средние'), ('high', 'Высокие')], default='medium')

    # Системные поля
    is_active = models.BooleanField(default=True, verbose_name='Активна')
    popularity_rank = models.IntegerField(default=0, verbose_name='Рейтинг популярности')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Порода'
        verbose_name_plural = 'Породы'
        ordering = ['-popularity_rank', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_species_display()})"

    @property
    def average_weight(self):
        """Средний вес породы"""
        return (self.average_weight_min + self.average_weight_max) / 2

    def get_size_from_weight(self, actual_weight):
        """Определяет размер собаки/кошки по весу"""
        if actual_weight <= 5:
            return 'toy'
        elif actual_weight <= 10:
            return 'small'
        elif actual_weight <= 25:
            return 'medium'
        elif actual_weight <= 40:
            return 'large'
        else:
            return 'giant'

    def get_breed_characteristics(self):
        """
        Возвращает полные характеристики породы для автоматического заполнения
        """
        return {
            # Физические
            'size_category': self.size_category,
            'coat_length': self.coat_length,
            'coat_type': self.coat_type,
            'shedding_level': self.shedding_level,
            'face_type': self.face_type,
            'ear_type': self.ear_type,

            # Физиологические
            'energy_level': self.energy_level,
            'metabolism_rate': self.metabolism_rate,
            'drooling_level': self.drooling_level,
            'obesity_risk': self.obesity_risk,
            'temperature_tolerance': self.temperature_tolerance,
            'noise_tolerance': self.noise_tolerance,
            'skin_sensitivity': self.skin_sensitivity,

            # Поведенческие
            'grooming_needs': self.grooming_needs,
            'average_lifespan': self.average_lifespan,
            'temperament': self.temperament,
            'training_difficulty': self.training_difficulty,
            'socialization_needs': self.socialization_needs,

            # Здоровье
            'common_health_issues': self.common_health_issues,
            'genetic_diseases': self.genetic_diseases,

            # Активности
            'recommended_activities': self.recommended_activities,
        }

    def get_pet_size_from_weight(self, actual_weight):
        """
        Определяет размер питомца по весу относительно породы
        """
        if not actual_weight:
            return self.size_category

        breed_avg = self.average_weight
        weight_ratio = actual_weight / breed_avg

        if weight_ratio < 0.8:
            # Ниже среднего веса породы
            if self.size_category in ['large', 'giant']:
                return 'medium'
            elif self.size_category == 'medium':
                return 'small'
        elif weight_ratio > 1.2:
            # Выше среднего веса породы
            if self.size_category == 'small':
                return 'medium'
            elif self.size_category == 'medium':
                return 'large'

        return self.size_category

    def get_grooming_recommendations(self):
        """
        Возвращает рекомендации по уходу за шерстью
        """
        recommendations = {
            'frequency': self.grooming_needs,
            'tools': [],
            'products': [],
            'schedule': {}
        }

        # Инструменты по типу шерсти
        if self.coat_length in ['long', 'very_long']:
            recommendations['tools'].extend(['brush', 'comb', 'detangler'])
        elif self.coat_type in ['wiry', 'curly']:
            recommendations['tools'].extend(['slicker_brush', 'undercoat_rake'])
        elif self.coat_type == 'silky':
            recommendations['tools'].extend(['soft_brush', 'pin_brush'])

        # Продукты по типу шерсти и кожи
        if self.skin_sensitivity == 'high':
            recommendations['products'].extend(['hypoallergenic_shampoo', 'sensitive_skin_conditioner'])
        if self.shedding_level in ['high', 'seasonal']:
            recommendations['products'].extend(['shedding_control_shampoo', 'fur_minimizer'])

        # Расписание ухода
        grooming_freq_map = {
            'low': 'monthly',
            'medium': 'weekly',
            'high': '2-3 times weekly',
            'very_high': 'daily'
        }
        recommendations['schedule'] = {
            'brushing': grooming_freq_map.get(self.grooming_needs, 'weekly'),
            'bathing': 'every 1-3 months',
            'nail_trimming': 'every 3-4 weeks',
            'teeth_cleaning': 'daily'
        }

        return recommendations

    def get_health_risk_factors(self):
        """
        Возвращает факторы риска здоровья для персонализации
        """
        risks = {
            'obesity': self.obesity_risk,
            'joint_problems': 'high' if self.size_category in ['large', 'giant'] else 'medium',
            'skin_problems': 'high' if self.skin_sensitivity == 'high' else 'low',
            'dental_problems': 'high' if self.face_type == 'brachycephalic' else 'medium',
            'ear_problems': 'high' if self.ear_type == 'dropped' else 'low',
            'breathing_problems': 'high' if self.face_type in ['brachycephalic', 'flat'] else 'low',
            'temperature_sensitivity': self.temperature_tolerance,
            'noise_sensitivity': self.noise_tolerance,
        }

        # Добавляем генетические заболевания
        if self.genetic_diseases:
            for disease in self.genetic_diseases:
                if 'hip' in disease.lower() or 'joint' in disease.lower():
                    risks['joint_problems'] = 'very_high'
                elif 'heart' in disease.lower():
                    risks['cardiac_problems'] = 'high'
                elif 'eye' in disease.lower():
                    risks['vision_problems'] = 'high'

        return risks

    def get_nutrition_recommendations(self, pet_age=None, pet_weight=None):
        """
        Возвращает рекомендации по питанию на основе породы
        """
        recommendations = {
            'calorie_needs': 'medium',
            'protein_level': 'standard',
            'special_considerations': [],
            'feeding_frequency': 2,
        }

        # Калорийность по активности и метаболизму
        if self.energy_level in ['high', 'very_high']:
            recommendations['calorie_needs'] = 'high'
        elif self.energy_level == 'low':
            recommendations['calorie_needs'] = 'low'

        if self.metabolism_rate == 'fast':
            recommendations['calorie_needs'] = 'high'
        elif self.metabolism_rate == 'slow':
            recommendations['calorie_needs'] = 'low'

        # Риск ожирения
        if self.obesity_risk == 'high':
            recommendations['calorie_needs'] = 'controlled'
            recommendations['special_considerations'].append('weight_management')

        # Здоровье суставов
        if self.size_category in ['large', 'giant']:
            recommendations['special_considerations'].append('joint_support')

        # Чувствительное пищеварение
        if self.face_type == 'brachycephalic':
            recommendations['special_considerations'].append('easy_digestion')

        # Возрастные корректировки
        if pet_age:
            if pet_age < 1:
                recommendations['feeding_frequency'] = 3
                recommendations['special_considerations'].append('puppy_growth')
            elif pet_age > 7:
                recommendations['feeding_frequency'] = 2
                recommendations['special_considerations'].append('senior_health')

        return recommendations

    @classmethod
    def get_breed_by_name(cls, name, species):
        """Получение породы по названию и виду"""
        try:
            return cls.objects.get(name__iexact=name, species=species)
        except cls.DoesNotExist:
            return None

    @classmethod
    def populate_breed_data(cls):
        """
        Метод для заполнения базы данных породами с полными характеристиками
        """
        breeds_data = [
            {
                'name': 'Лабрадор Ретривер',
                'species': 'dog',
                'average_weight_min': 25, 'average_weight_max': 36,
                'average_height_min': 55, 'average_height_max': 62,
                'size_category': 'large',
                'coat_length': 'short', 'coat_type': 'straight',
                'shedding_level': 'high', 'grooming_needs': 'low',
                'face_type': 'mesocephalic', 'ear_type': 'dropped',
                'energy_level': 'high', 'metabolism_rate': 'normal',
                'drooling_level': 'low', 'obesity_risk': 'high',
                'temperature_tolerance': 'neutral', 'noise_tolerance': 'medium',
                'skin_sensitivity': 'medium', 'average_lifespan': 12,
                'temperament': ['friendly', 'intelligent', 'active'],
                'common_health_issues': ['hip_dysplasia', 'elbow_dysplasia', 'obesity'],
                'genetic_diseases': ['progressive_retinal_atrophy', 'exercise_induced_collapse'],
                'recommended_activities': ['retrieving', 'swimming', 'hiking'],
                'training_difficulty': 'easy', 'socialization_needs': 'high',
                'popularity_rank': 1
            },
            # Добавьте остальные породы аналогично...
        ]

        for breed_data in breeds_data:
            cls.objects.get_or_create(
                name=breed_data['name'],
                species=breed_data['species'],
                defaults=breed_data
            )
```

**Расширенный справочник пород (150+ пород):**

*Собаки (топ-100 наиболее популярных):*

**Мелкие породы (toy/small):**
- Чихуахуа (toy, low energy, low grooming, lifespan: 12-18 лет)
- Йоркширский Терьер (toy, medium energy, very_high grooming, lifespan: 12-15 лет)
- Такса (small, medium energy, low grooming, lifespan: 12-16 лет)
- Французский Бульдог (small, low energy, low grooming, lifespan: 10-12 лет)
- Пекинес (toy, low energy, high grooming, lifespan: 12-14 лет)
- Мопс (small, low energy, low grooming, lifespan: 12-15 лет)
- Карликовый Пинчер (small, high energy, low grooming, lifespan: 12-14 лет)
- Шпиц (small, medium energy, high grooming, lifespan: 13-15 лет)
- Бостон-терьер (small, medium energy, low grooming, lifespan: 11-13 лет)
- Лхаса Апсо (small, medium energy, high grooming, lifespan: 12-15 лет)
- Ши-тцу (small, low energy, high grooming, lifespan: 12-15 лет)
- Мальтийская Болонка (toy, low energy, very_high grooming, lifespan: 12-15 лет)
- Папильон (small, high energy, medium grooming, lifespan: 14-16 лет)
- Кавалер Кинг Чарльз Спаниель (small, medium energy, high grooming, lifespan: 9-14 лет)
- Кинг Чарльз Спаниель (small, low energy, medium grooming, lifespan: 9-14 лет)
- Джек Рассел Терьер (small, very_high energy, low grooming, lifespan: 13-16 лет)
- Вест Хайленд Уайт Терьер (small, high energy, medium grooming, lifespan: 12-16 лет)
- Скотч Терьер (small, medium energy, medium grooming, lifespan: 11-13 лет)
- Бельгийский Гриффон (toy, medium energy, high grooming, lifespan: 12-15 лет)
- Брюссельский Гриффон (toy, medium energy, high grooming, lifespan: 12-15 лет)

**Средние породы (medium):**
- Бигль (medium, high energy, low grooming, lifespan: 12-15 лет)
- Бульдог (medium, low energy, low grooming, lifespan: 8-10 лет)
- Боксер (medium, high energy, low grooming, lifespan: 10-12 лет)
- Лабрадор Ретривер (medium, high energy, medium grooming, lifespan: 10-12 лет)
- Немецкая Овчарка (large, very_high energy, medium grooming, lifespan: 7-10 лет)
- Питбуль (medium, high energy, low grooming, lifespan: 12-16 лет)
- Ротвейлер (large, medium energy, low grooming, lifespan: 8-10 лет)
- Шарпей (medium, low energy, low grooming, lifespan: 9-11 лет)
- Акита Ину (large, medium energy, high grooming, lifespan: 10-12 лет)
- Самоед (large, high energy, high grooming, lifespan: 12-14 лет)
- Хаски (large, very_high energy, medium grooming, lifespan: 12-15 лет)
- Золотистый Ретривер (large, high energy, high grooming, lifespan: 10-12 лет)
- Пудель (small/medium/large, high energy, very_high grooming, lifespan: 12-18 лет)
- Шнауцер (small/medium, medium energy, high grooming, lifespan: 12-15 лет)
- Бернский Зенненхунд (large, medium energy, high grooming, lifespan: 7-10 лет)
- Колли (large, medium energy, high grooming, lifespan: 12-14 лет)
- Вельш Корги Пемброк (medium, high energy, medium grooming, lifespan: 12-14 лет)
- Вельш Корги Кардиган (medium, high energy, medium grooming, lifespan: 12-14 лет)
- Английский Бульдог (medium, low energy, low grooming, lifespan: 8-10 лет)
- Американский Бульдог (large, medium energy, low grooming, lifespan: 10-12 лет)
- Стаффордширский Бультерьер (medium, high energy, low grooming, lifespan: 12-14 лет)
- Американский Стаффордширский Терьер (medium, high energy, low grooming, lifespan: 12-14 лет)
- Алабай (large, medium energy, high grooming, lifespan: 10-12 лет)
- Кангал (large, medium energy, high grooming, lifespan: 9-11 лет)
- Кане Корсо (large, medium energy, low grooming, lifespan: 9-11 лет)
- Мастино Наполетано (large, low energy, low grooming, lifespan: 8-10 лет)
- Дог (giant, medium energy, low grooming, lifespan: 7-10 лет)
- Ирландский Волкодав (giant, medium energy, medium grooming, lifespan: 6-10 лет)
- Ньюфаундленд (giant, medium energy, high grooming, lifespan: 8-10 лет)
- Сенбернар (giant, low energy, high grooming, lifespan: 8-10 лет)
- Леонбергер (giant, medium energy, high grooming, lifespan: 7-9 лет)
- Комондор (large, medium energy, very_high grooming, lifespan: 10-12 лет)
- Пули (medium, high energy, very_high grooming, lifespan: 12-16 лет)
- Португальская Водяная Собака (large, very_high energy, high grooming, lifespan: 12-15 лет)
- Лаготто Романьоло (medium, high energy, high grooming, lifespan: 14-16 лет)
- Бретонский Эпаньоль (medium, very_high energy, medium grooming, lifespan: 12-14 лет)
- Веймаранер (large, very_high energy, low grooming, lifespan: 10-13 лет)
- Далматин (large, high energy, low grooming, lifespan: 11-13 лет)
- Доберман (large, very_high energy, low grooming, lifespan: 10-12 лет)
- Ризеншнауцер (large, high energy, high grooming, lifespan: 12-15 лет)
- Боксёр (medium, high energy, low grooming, lifespan: 10-12 лет)

**Крупные и гигантские породы (large/giant):**
- Кавказская Овчарка (giant, medium energy, high grooming, lifespan: 10-12 лет)
- Среднеазиатская Овчарка (giant, medium energy, medium grooming, lifespan: 12-14 лет)
- Немецкий Дог (giant, medium energy, low grooming, lifespan: 7-10 лет)
- Ирландский Сеттер (large, very_high energy, medium grooming, lifespan: 12-14 лет)
- Английский Сеттер (large, high energy, medium grooming, lifespan: 12-14 лет)
- Бордоский Дог (giant, low energy, low grooming, lifespan: 5-8 лет)
- Бульмастиф (giant, low energy, low grooming, lifespan: 8-10 лет)
- Мастиф (giant, low energy, low grooming, lifespan: 6-10 лет)
- Неаполитанский Мастиф (giant, low energy, low grooming, lifespan: 8-10 лет)
- Английский Мастиф (giant, low energy, low grooming, lifespan: 6-10 лет)
- Тибетский Мастиф (giant, low energy, high grooming, lifespan: 12-15 лет)
- Чау-чау (large, low energy, high grooming, lifespan: 9-15 лет)
- Шарпей (medium, low energy, low grooming, lifespan: 9-11 лет)
- Акита (large, medium energy, high grooming, lifespan: 10-12 лет)
- Самоед (large, high energy, high grooming, lifespan: 12-14 лет)
- Хаски (large, very_high energy, medium grooming, lifespan: 12-15 лет)
- Сибирский Хаски (large, very_high energy, medium grooming, lifespan: 12-15 лет)
- Аляскинский Маламут (giant, high energy, medium grooming, lifespan: 12-15 лет)
- Золотистый Ретривер (large, high energy, high grooming, lifespan: 10-12 лет)
- Лабрадор Ретривер (medium, high energy, medium grooming, lifespan: 10-12 лет)

*Кошки (топ-100 наиболее популярных):*

**Короткошерстные породы:**
- Британская Короткошерстная (medium, low energy, low grooming, lifespan: 12-17 лет)
- Шотландская Вислоухая (medium, medium energy, medium grooming, lifespan: 12-15 лет)
- Сиамская (medium, high energy, low grooming, lifespan: 12-15 лет)
- Бенгальская (medium, very_high energy, low grooming, lifespan: 12-16 лет)
- Саванна (large, high energy, low grooming, lifespan: 12-17 лет)
- Абиссинская (medium, very_high energy, low grooming, lifespan: 9-13 лет)
- Ориентальная (medium, high energy, low grooming, lifespan: 12-15 лет)
- Девон-Рекс (medium, high energy, low grooming, lifespan: 9-13 лет)
- Корниш-Рекс (medium, very_high energy, low grooming, lifespan: 11-14 лет)
- Сингапурская (small, high energy, low grooming, lifespan: 11-15 лет)
- Тонкинская (medium, high energy, low grooming, lifespan: 14-16 лет)
- Бурманская (medium, medium energy, low grooming, lifespan: 12-16 лет)
- Американская Короткошерстная (medium, medium energy, low grooming, lifespan: 15-20 лет)
- Европейская Короткошерстная (medium, medium energy, low grooming, lifespan: 12-16 лет)
- Японский Бобтейл (medium, high energy, low grooming, lifespan: 9-15 лет)
- Египетская Мау (medium, high energy, low grooming, lifespan: 9-13 лет)
- Оцикет (medium, high energy, low grooming, lifespan: 12-14 лет)
- Сомали (medium, high energy, medium grooming, lifespan: 12-16 лет)
- Канадский Сфинкс (medium, high energy, very_high grooming, lifespan: 8-14 лет)
- Петерболд (medium, high energy, high grooming, lifespan: 12-15 лет)

**Длинношерстные породы:**
- Персидская (medium, low energy, very_high grooming, lifespan: 12-17 лет)
- Мейн-кун (large, medium energy, high grooming, lifespan: 12-15 лет)
- Рэгдолл (large, low energy, high grooming, lifespan: 12-17 лет)
- Британская Длинношерстная (medium, low energy, medium grooming, lifespan: 12-17 лет)
- Шотландская Длинношерстная (medium, medium energy, medium grooming, lifespan: 12-15 лет)
- Норвежская Лесная (large, medium energy, high grooming, lifespan: 12-16 лет)
- Сибирская (large, medium energy, high grooming, lifespan: 12-15 лет)
- Рагамаффин (large, low energy, high grooming, lifespan: 12-18 лет)
- Американская Длинношерстная (medium, medium energy, high grooming, lifespan: 12-15 лет)
- Балинезийская (medium, high energy, medium grooming, lifespan: 12-15 лет)
- Японская Бобтейл Длинношерстная (medium, high energy, medium grooming, lifespan: 9-15 лет)
- Сомали Длинношерстная (medium, high energy, high grooming, lifespan: 12-16 лет)
- Ангорская (medium, medium energy, very_high grooming, lifespan: 12-18 лет)
- Турецкая Ангора (medium, high energy, high grooming, lifespan: 12-18 лет)
- Невская Маскарадная (large, medium energy, high grooming, lifespan: 12-15 лет)
- Украинская Левкой (medium, high energy, low grooming, lifespan: 12-15 лет)
- Донской Сфинкс (medium, high energy, very_high grooming, lifespan: 12-15 лет)
- Украинский Левкой (medium, high energy, low grooming, lifespan: 12-15 лет)
- Ла-Перм (medium, high energy, medium grooming, lifespan: 10-15 лет)
- Селкирк-Рекс (medium, medium energy, medium grooming, lifespan: 10-15 лет)

**Крупные и экзотические породы:**
- Мэнкс (medium, high energy, low grooming, lifespan: 9-14 лет)
- Курильский Бобтейл (medium, high energy, medium grooming, lifespan: 12-15 лет)
- Американский Бобтейл (large, medium energy, medium grooming, lifespan: 11-15 лет)
- Пикси-боб (large, medium energy, medium grooming, lifespan: 12-15 лет)
- Ашера (large, medium energy, high grooming, lifespan: 12-15 лет)
- Сафари (large, high energy, low grooming, lifespan: 12-16 лет)
- Тойгер (medium, very_high energy, low grooming, lifespan: 12-15 лет)
- Чаузи (large, medium energy, low grooming, lifespan: 12-15 лет)
- Бомбейская (medium, medium energy, low grooming, lifespan: 12-16 лет)
- Гималайская (medium, low energy, medium grooming, lifespan: 9-15 лет)
- Колор-Пойнт Шотландская (medium, medium energy, medium grooming, lifespan: 12-15 лет)
- Бурмилла (medium, medium energy, medium grooming, lifespan: 10-15 лет)
- Калифорнийская Сияющая (medium, medium energy, low grooming, lifespan: 12-16 лет)
- Гавана Браун (medium, medium energy, low grooming, lifespan: 15-21 год)
- Русская Синяя (medium, medium energy, low grooming, lifespan: 15-20 лет)
- Карфагенская (medium, medium energy, low grooming, lifespan: 12-15 лет)
- Корат (medium, high energy, low grooming, lifespan: 10-15 лет)
- Бирманская (medium, low energy, medium grooming, lifespan: 12-16 лет)
- Рагамаффин (large, low energy, high grooming, lifespan: 12-18 лет)
- Сноу-шу (medium, medium energy, high grooming, lifespan: 14-19 лет)

**2. Модель Pet (только для собак и кошек):**

```python
class Pet(models.Model):
    """Модель профиля питомца для собак и кошек"""

    SPECIES_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
    ]

    GENDER_CHOICES = [
        ('male', 'Самец'),
        ('female', 'Самка'),
        ('unknown', 'Не указан'),
    ]

    BEHAVIOR_TYPES = [
        ('calm', 'Спокойный'),
        ('active', 'Активный'),
        ('aggressive', 'Агрессивный'),
        ('shy', 'Застенчивый'),
        ('playful', 'Игривый'),
        ('independent', 'Независимый'),
    ]

    SOCIAL_LEVELS = [
        ('home_only', 'Только домашний'),
        ('street', 'Уличный'),
        ('social', 'Социальный'),
        ('mixed', 'Смешанный'),
    ]

    TRAINING_EXPERIENCE_LEVELS = [
        ('none', 'Без опыта'),
        ('basic', 'Базовый'),
        ('intermediate', 'Средний'),
        ('advanced', 'Продвинутый'),
        ('professional', 'Профессиональный'),
    ]

    DIET_TYPE_CHOICES = [
        ('dry', 'Сухой корм'),
        ('wet', 'Влажный корм'),
        ('mixed', 'Смешанное питание'),
        ('raw', 'Натуральное питание'),
        ('home', 'Домашняя еда'),
    ]

    FEEDING_FREQUENCY_CHOICES = [
        ('1', '1 раз в день'),
        ('2', '2 раза в день'),
        ('3', '3 раза в день'),
        ('free', 'Свободный доступ'),
    ]

    ACTIVITY_LEVELS = [
        ('low', 'Низкая'),
        ('medium', 'Средняя'),
        ('high', 'Высокая'),
        ('very_high', 'Очень высокая'),
    ]

    HOUSING_TYPE_CHOICES = [
        ('apartment', 'Квартира'),
        ('house', 'Частный дом'),
        ('cottage', 'Дача/Коттедж'),
        ('other', 'Другое'),
    ]

    DENTAL_HEALTH_CHOICES = [
        ('excellent', 'Отличное'),
        ('good', 'Хорошее'),
        ('fair', 'Удовлетворительное'),
        ('needs_attention', 'Требует лечения'),
    ]

    # Основные поля (обязательные)
    id = models.CharField(primary_key=True, max_length=36, default=generate_uuid7)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pets')
    name = models.CharField(max_length=100, verbose_name='Кличка')
    species = models.CharField(max_length=10, choices=SPECIES_CHOICES, verbose_name='Вид')

    # Базовая информация
    breed = models.ForeignKey('Breed', null=True, blank=True, on_delete=models.SET_NULL, verbose_name='Порода')
    date_of_birth = models.DateField(null=True, blank=True, verbose_name='Дата рождения')
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='unknown', verbose_name='Пол')
    is_neutered = models.BooleanField(default=False, verbose_name='Кастрирован/Стерилизован')
    photo = models.ImageField(upload_to='pets/photos/', null=True, blank=True, verbose_name='Фото')

    # Физические характеристики (weight - обязательно для расчета размера)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Вес (кг)')

    # Поведение и обучение (расширенный профиль)
    behavior_type = models.CharField(max_length=20, choices=BEHAVIOR_TYPES, null=True, blank=True, verbose_name='Тип поведения')
    social_level = models.CharField(max_length=20, choices=SOCIAL_LEVELS, null=True, blank=True, verbose_name='Уровень социализации')
    training_experience = models.CharField(max_length=20, choices=TRAINING_EXPERIENCE_LEVELS, null=True, blank=True, verbose_name='Опыт дрессировки')
    behavioral_problems = models.JSONField(default=list, validators=[validate_string_list], verbose_name='Поведенческие проблемы')

    # Здоровье (расширенный профиль)
    health_issues = models.JSONField(default=list, validators=[validate_string_list], verbose_name='Проблемы здоровья')
    chronic_conditions = models.TextField(blank=True, verbose_name='Хронические заболевания')
    vaccinations = models.JSONField(default=dict, verbose_name='Вакцинации')  # структурированные данные
    medications = models.JSONField(default=dict, verbose_name='Принимаемые препараты')  # структурированные данные
    dental_health = models.CharField(max_length=20, choices=DENTAL_HEALTH_CHOICES, null=True, blank=True, verbose_name='Состояние зубов')

    # Питание (расширенный профиль)
    diet_type = models.CharField(max_length=20, choices=DIET_TYPE_CHOICES, null=True, blank=True, verbose_name='Тип питания')
    feeding_frequency = models.CharField(max_length=10, choices=FEEDING_FREQUENCY_CHOICES, null=True, blank=True, verbose_name='Частота кормления')
    allergies = models.JSONField(default=list, validators=[validate_string_list], verbose_name='Аллергии')
    excluded_ingredients = models.JSONField(default=list, validators=[validate_string_list], verbose_name='Исключаемые ингредиенты')
    sensitive_digestion = models.BooleanField(default=False, verbose_name='Чувствительное пищеварение')

    # Образ жизни (расширенный профиль)
    activity_level = models.CharField(max_length=20, choices=ACTIVITY_LEVELS, null=True, blank=True, verbose_name='Уровень активности')
    housing_type = models.CharField(max_length=20, choices=HOUSING_TYPE_CHOICES, null=True, blank=True, verbose_name='Тип жилья')
    has_yard = models.BooleanField(default=False, verbose_name='Есть двор')
    has_children = models.BooleanField(default=False, verbose_name='В доме есть дети')
    other_pets = models.JSONField(default=list, validators=[validate_string_list], verbose_name='Другие питомцы')

    # Прогулки (только для собак)
    walk_frequency = models.CharField(max_length=50, blank=True, verbose_name='Частота прогулок')
    walk_duration = models.CharField(max_length=50, blank=True, verbose_name='Длительность прогулки')

    # Контакты владельца
    owner_phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон владельца')
    owner_email = models.EmailField(blank=True, verbose_name='Email владельца')
    owner_city = models.CharField(max_length=100, blank=True, verbose_name='Город владельца')

    # Системные поля
    profile_completeness = models.IntegerField(default=0, verbose_name='Процент заполненности профиля')
    is_extended_profile = models.BooleanField(default=False, verbose_name='Расширенный профиль')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    # Внешние связи
    microchip_id = models.CharField(max_length=50, null=True, blank=True, unique=True, verbose_name='Номер чипа')
    imported_from = models.CharField(max_length=50, blank=True, verbose_name='Источник импорта')

    class Meta:
        db_table = 'pets'
        verbose_name = 'Питомец'
        verbose_name_plural = 'Питомцы'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', '-created_at']),
            models.Index(fields=['species']),
            models.Index(fields=['profile_completeness']),
            models.Index(fields=['breed']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_species_display()})"

    def calculate_profile_completeness(self):
        """Расчет процента заполненности профиля"""
        required_fields = ['name', 'species', 'breed', 'date_of_birth', 'gender', 'weight']
        optional_fields = [
            'photo', 'behavior_type', 'social_level', 'training_experience',
            'diet_type', 'feeding_frequency', 'activity_level', 'housing_type',
            'has_yard', 'other_pets', 'has_children', 'walk_frequency', 'walk_duration',
            'health_issues', 'chronic_conditions', 'dental_health', 'favorite_foods',
            'allergies', 'sensitive_digestion', 'excluded_ingredients', 'vitamins_supplements',
            'behavioral_problems', 'character_traits', 'training_goals', 'preferred_activities'
        ]

        filled_required = sum(1 for field in required_fields if getattr(self, field, None))
        filled_optional = sum(1 for field in optional_fields if getattr(self, field, None))

        total_required = len(required_fields)
        total_optional = len(optional_fields)

        # Обязательные поля - 70% веса, опциональные - 30%
        completeness = (
            (filled_required / total_required * 70) +
            (filled_optional / total_optional * 30)
        )

        return min(100, round(completeness, 1))

---

#### **Классификация полей модели Pet:**

| Категория | Поле | Тип | Ввод пользователя | Автоматическое определение | Описание |
|-----------|------|-----|-------------------|----------------------------|----------|
| **Базовые** | `name` | CharField | ✅ | - | Кличка питомца |
| | `species` | CharField | ✅ | - | Вид (собака/кошка) |
| | `breed` | ForeignKey | ✅ | - | Порода из справочника |
| | `date_of_birth` | DateField | ✅ | - | Дата рождения |
| | `gender` | CharField | ✅ | - | Пол |
| | `is_neutered` | BooleanField | ✅ | - | Кастрирован/Стерилизован |
| | `photo` | ImageField | ✅ | - | Фото питомца |

| **Физические** | `weight` | DecimalField | ✅ | - | Вес в кг (используется для расчета размера) |
| | `size` | Property | - | ✅ | Размер (toy/small/medium/large/giant) по породе + весу |
| | `coat_length` | Property | - | ✅ | Длина шерсти (hairless/short/medium/long/very_long) |
| | `coat_type` | Property | - | ✅ | Тип шерсти (straight/wavy/curly/wiry/silky) |
| | `shedding_level` | Property | - | ✅ | Уровень линьки (none/low/medium/high/seasonal) |
| | `face_type` | Property | - | ✅ | Форма морды (dolichocephalic/meso/brachycephalic) |
| | `ear_type` | Property | - | ✅ | Тип ушей (erect/dropped/folded/button/rose) |

| **Физиологические** | `metabolism_rate` | Property | - | ✅ | Метаболизм (slow/normal/fast) |
| | `drooling_level` | Property | - | ✅ | Уровень слюноотделения (none/low/medium/high) |
| | `obesity_risk` | Property | - | ✅ | Риск ожирения (low/medium/high) |
| | `temperature_tolerance` | Property | - | ✅ | Температурная адаптация (cold/heat/neutral) |
| | `noise_tolerance` | Property | - | ✅ | Чувствительность к шуму (low/medium/high) |
| | `skin_sensitivity` | Property | - | ✅ | Чувствительность кожи (low/medium/high) |

| **Поведенческие** | `behavior_type` | CharField | ✅ | - | Тип поведения (calm/active/aggressive/shy/playful) |
| | `social_level` | CharField | ✅ | - | Уровень социализации |
| | `training_experience` | CharField | ✅ | - | Опыт дрессировки |
| | `behavioral_problems` | JSONField | ✅ | - | Поведенческие проблемы |
| | `activity_level` | Property | ⚠️ | ✅ | Уровень активности (гибрид: пользователь + порода) |

| **Здоровье** | `health_issues` | JSONField | ✅ | - | Проблемы здоровья |
| | `chronic_conditions` | TextField | ✅ | - | Хронические заболевания |
| | `vaccinations` | JSONField | ✅ | - | Вакцинации |
| | `medications` | JSONField | ✅ | - | Медикаменты |
| | `dental_health` | CharField | ✅ | - | Состояние зубов |
| | `vet_visits` | TextField | ✅ | - | Посещения ветеринара |

| **Питание** | `diet_type` | CharField | ✅ | - | Тип питания (dry/wet/mixed/raw/home) |
| | `feeding_frequency` | CharField | ✅ | - | Частота кормления |
| | `favorite_foods` | JSONField | ✅ | - | Любимая еда |
| | `allergies` | JSONField | ✅ | - | Аллергии |
| | `sensitive_digestion` | BooleanField | ✅ | - | Чувствительное пищеварение |
| | `excluded_ingredients` | JSONField | ✅ | - | Исключенные ингредиенты |
| | `vitamins_supplements` | JSONField | ✅ | - | Витамины и добавки |

| **Уход** | `grooming_schedule` | Property | - | ✅ | Расписание ухода за шерстью |
| | `grooming_needs` | Property | - | ✅ | Потребность в груминге |

| **Образ жизни** | `housing_type` | CharField | ✅ | - | Тип жилья |
| | `has_yard` | BooleanField | ✅ | - | Наличие двора |
| | `has_children` | BooleanField | ✅ | - | Дети в доме |
| | `other_pets` | JSONField | ✅ | - | Другие питомцы |
| | `walk_frequency` | CharField | ✅ | - | Частота прогулок (собаки) |
| | `walk_duration` | CharField | ✅ | - | Длительность прогулок (собаки) |

| **Возраст** | `age` | Property | - | ✅ | Возраст в годах |
| | `age_category` | Property | - | ✅ | Категория возраста (puppy/adult/senior) |

| **Персонализация** | `health_risks` | Property | - | ✅ | Факторы риска здоровья |
| | `nutrition_plan` | Property | - | ✅ | Рекомендации по питанию |
| | `recommended_products` | Property | - | ✅ | Рекомендуемые товары |

| **Контакты** | `owner_phone` | CharField | ✅ | - | Телефон владельца |
| | `owner_email` | EmailField | ✅ | - | Email владельца |
| | `owner_city` | CharField | ✅ | - | Город владельца |

| **Системные** | `profile_completeness` | IntegerField | - | ✅ | Процент заполненности профиля |
| | `microchip_id` | CharField | ✅ | - | Номер чипа |
| | `imported_from` | CharField | - | ✅ | Источник импорта данных |

**Легенда:**
- ✅ **Ввод пользователя**: Поле заполняется пользователем вручную
- ⚠️ **Гибрид**: Пользователь может переопределить автоматически рассчитанное значение
- ✅ **Автоматическое**: Поле рассчитывается на основе других данных

---

    @property
    def age(self):
        """Возраст в годах"""
        if not self.date_of_birth:
            return None
        today = timezone.now().date()
        age = today.year - self.date_of_birth.year
        if today.month < self.date_of_birth.month or (today.month == self.date_of_birth.month and today.day < self.date_of_birth.day):
            age -= 1
        return age

    @property
    def age_category(self):
        """Категория возраста"""
        if not self.age:
            return 'adult'
        if self.age < 1:
            return 'puppy' if self.species == 'dog' else 'kitten'
        elif self.age < 7:
            return 'adult'
        else:
            return 'senior'

    @property
    def size(self):
        """Размер питомца (автоматически рассчитывается по породе и весу)"""
        if self.breed and self.weight:
            return self.breed.get_pet_size_from_weight(self.weight)
        elif self.breed:
            return self.breed.size_category
        return 'medium'  # fallback

    @property
    def coat_length(self):
        """Длина шерсти (автоматически из породы)"""
        return self.breed.coat_length if self.breed else 'short'

    @property
    def coat_type(self):
        """Тип шерсти (автоматически из породы)"""
        return self.breed.coat_type if self.breed else 'straight'

    @property
    def shedding_level(self):
        """Уровень линьки (автоматически из породы)"""
        return self.breed.shedding_level if self.breed else 'medium'

    @property
    def face_type(self):
        """Форма морды (автоматически из породы)"""
        return self.breed.face_type if self.breed else 'mesocephalic'

    @property
    def ear_type(self):
        """Тип ушей (автоматически из породы)"""
        return self.breed.ear_type if self.breed else 'erect'

    @property
    def metabolism_rate(self):
        """Метаболизм (автоматически из породы)"""
        return self.breed.metabolism_rate if self.breed else 'normal'

    @property
    def drooling_level(self):
        """Уровень слюноотделения (автоматически из породы)"""
        return self.breed.drooling_level if self.breed else 'low'

    @property
    def obesity_risk(self):
        """Риск ожирения (автоматически из породы)"""
        return self.breed.obesity_risk if self.breed else 'medium'

    @property
    def temperature_tolerance(self):
        """Температурная адаптация (автоматически из породы)"""
        return self.breed.temperature_tolerance if self.breed else 'neutral'

    @property
    def noise_tolerance(self):
        """Чувствительность к шуму (автоматически из породы)"""
        return self.breed.noise_tolerance if self.breed else 'medium'

    @property
    def skin_sensitivity(self):
        """Чувствительность кожи (автоматически из породы)"""
        return self.breed.skin_sensitivity if self.breed else 'medium'

    @property
    def activity_level(self):
        """Уровень активности (гибрид: порода + пользовательский ввод)"""
        if self.activity_level:  # если пользователь указал
            return self.activity_level
        elif self.breed:
            # Автоматически по породе + поведению
            base_energy = self.breed.energy_level
            if self.behavior_type in ['hyperactive', 'energetic']:
                if base_energy == 'low':
                    return 'medium'
                elif base_energy in ['medium', 'high']:
                    return 'high'
            elif self.behavior_type in ['calm', 'lazy']:
                if base_energy in ['high', 'very_high']:
                    return 'medium'
                elif base_energy == 'medium':
                    return 'low'
            return base_energy
        return 'medium'

    @property
    def grooming_schedule(self):
        """Расписание ухода за шерстью"""
        if self.breed:
            return self.breed.get_grooming_recommendations()
        return {}

    @property
    def health_risks(self):
        """Факторы риска здоровья"""
        if self.breed:
            return self.breed.get_health_risk_factors()
        return {}

    @property
    def nutrition_plan(self):
        """Рекомендации по питанию"""
        if self.breed:
            return self.breed.get_nutrition_recommendations(self.age, self.weight)
        return {}

    @property
    def recommended_products(self):
        """Рекомендуемые товары на основе характеристик"""
        products = []

        # По типу шерсти и уходу
        if self.coat_length in ['long', 'very_long']:
            products.extend(['brush', 'detangler', 'coat_conditioner'])
        if self.shedding_level in ['high', 'seasonal']:
            products.extend(['vacuum_cleaner', 'fur_remover'])

        # По здоровью
        if self.health_risks.get('joint_problems') == 'high':
            products.extend(['joint_supplements', 'orthopedic_bed'])
        if self.health_risks.get('skin_problems') == 'high':
            products.extend(['hypoallergenic_shampoo', 'skin_conditioner'])

        # По активности
        if self.activity_level == 'high':
            products.extend(['interactive_toys', 'exercise_equipment'])

        return list(set(products))  # убираем дубликаты

    @property
    def suggested_walking_frequency(self):
        """Рекомендуемая частота прогулок на основе породы и активности"""
        if self.species == 'cat':
            return 'Не требует'  # Кошки не гуляют

        if not self.breed:
            return 'daily'

        # Определение частоты прогулок на основе энергии и размера
        energy = self.breed.energy_level
        size = self.breed.size_category

        if energy in ['very_high', 'high']:
            if size in ['toy', 'small']:
                return 'twice'  # 2 раза в день для маленьких активных собак
            else:
                return 'thrice'  # 3 раза в день для крупных активных собак
        elif energy == 'medium':
            return 'daily'  # 1 раз в день для собак средней активности
        else:  # low energy
            return 'rarely'  # Редко для малоподвижных собак

    @property
    def suggested_walking_duration(self):
        """Рекомендуемая длительность прогулки на основе породы"""
        if self.species == 'cat':
            return 'Не требует'

        if not self.breed:
            return '30 мин'

        size = self.breed.size_category

        # Длительность прогулки зависит от размера
        size_durations = {
            'toy': '20-30 мин',
            'small': '30-45 мин',
            'medium': '45-60 мин',
            'large': '60-90 мин',
            'giant': '60-120 мин'
        }

        return size_durations.get(size, '30-60 мин')

    @property
    def suggested_feeding_frequency(self):
        """Рекомендуемая частота кормления на основе возраста и размера"""
        if not self.age:
            return '2'  # По умолчанию 2 раза

        # Щенки и котята едят чаще
        if self.age_category in ['puppy', 'kitten']:
            return '3'  # 3 раза в день

        # Взрослые животные
        elif self.age_category == 'adult':
            if self.calculated_size in ['toy', 'small']:
                return '2'  # Маленькие породы едят чаще
            else:
                return '2'  # Средние и крупные - 2 раза

        # Пожилые животные
        else:  # senior
            return '2'  # 2 раза, но меньшими порциями

    @property
    def suggested_diet_type(self):
        """Рекомендуемый тип питания на основе возраста и здоровья"""
        if not self.age:
            return 'dry'

        # Щенки и котята - специальный корм для роста
        if self.age_category in ['puppy', 'kitten']:
            return 'dry'  # Специальный корм для щенков/котят

        # Пожилые животные - корм для пожилых
        elif self.age_category == 'senior':
            return 'dry'  # Корм для пожилых

        # Взрослые - в зависимости от здоровья
        else:
            if self.health_issues:
                # При проблемах со здоровьем - специальный корм
                return 'dry'  # Лечебный корм
            else:
                return 'dry'  # Обычный корм для взрослых

    @property
    def potential_health_issues(self):
        """Потенциальные проблемы здоровья на основе породы"""
        if not self.breed:
            return []

        return self.breed.common_health_issues or []

    @property
    def breed_temperament(self):
        """Темперамент породы"""
        if not self.breed:
            return []

        return self.breed.temperament or []

    @property
    def recommended_grooming_frequency(self):
        """Рекомендуемая частота груминга на основе породы"""
        if not self.breed:
            return 'weekly'

        grooming_mapping = {
            'low': 'monthly',
            'medium': 'weekly',
            'high': 'weekly',
            'very_high': '2-3 times weekly'
        }

        return grooming_mapping.get(self.breed.grooming_needs, 'weekly')

    def get_breed_specific_recommendations(self):
        """
        Получить рекомендации, специфичные для породы
        """
        if not self.breed:
            return {}

        return {
            'activities': self.breed.recommended_activities or [],
            'training_difficulty': self.breed.training_difficulty,
            'socialization_needs': self.breed.socialization_needs,
            'potential_health_issues': self.breed.common_health_issues or [],
            'average_lifespan': self.breed.average_lifespan,
            'genetic_diseases': self.breed.genetic_diseases or []
        }

    def auto_fill_breed_characteristics(self):
        """
        Автоматически заполнить поля на основе выбранной породы
        Вызывается при выборе породы или изменении веса
        """
        if not self.breed:
            return

        # Предложить активность на основе породы
        if not self.activity_level:
            self.activity_level = self.suggested_activity_level

        # Заполнить потенциальные проблемы здоровья
        if not self.health_issues and self.breed.common_health_issues:
            # Добавить распространенные проблемы породы как подсказки
            pass  # Не заполняем автоматически, только показываем рекомендации

        # Заполнить черты характера
        if not self.character_traits and self.breed.temperament:
            # Предложить темперамент породы
            pass  # Показываем как подсказки, но не заполняем автоматически

    def calculate_profile_completeness(self):
        """Расчет процента заполненности профиля"""
        required_fields = ['breed', 'date_of_birth', 'gender', 'weight']
        optional_fields = [
            'behavior_type', 'social_level', 'training_experience', 'activity_level',
            'health_issues', 'diet_type', 'feeding_frequency', 'housing_type'
        ]

        filled_required = sum(1 for field in required_fields if getattr(self, field))
        filled_optional = sum(1 for field in optional_fields if getattr(self, field))

        required_score = (filled_required / len(required_fields)) * 60  # 60% за обязательные
        optional_score = (filled_optional / len(optional_fields)) * 40  # 40% за опциональные

        return int(required_score + optional_score)

### 5.1.2. Примеры автоматического определения параметров

**Пример 1: Собака "Доберман", возраст 2 года, вес 35 кг**

*Автоматически определенные параметры:*
- `calculated_size` = 'large' (вес 35 кг > 25 кг)
- `suggested_activity_level` = 'very_high' (доберман - высокая энергия)
- `suggested_walking_frequency` = 'thrice' (крупная, очень активная собака)
- `suggested_walking_duration` = '60-90 мин' (крупная порода)
- `suggested_feeding_frequency` = '2' (взрослая собака)
- `suggested_diet_type` = 'dry' (взрослый, без проблем здоровья)
- `potential_health_issues` = ['heart_problems', 'hip_dysplasia', 'thyroid_issues']
- `breed_temperament` = ['loyal', 'protective', 'intelligent']
- `recommended_grooming_frequency` = 'weekly' (короткая шерсть)

**Пример 2: Кошка "Персидская", возраст 3 года, вес 4 кг**

*Автоматически определенные параметры:*
- `calculated_size` = 'medium' (вес 4 кг, типичная масса для породы)
- `suggested_activity_level` = 'low' (персидская - низкая энергия)
- `suggested_walking_frequency` = 'Не требует' (кошка)
- `suggested_walking_duration` = 'Не требует' (кошка)
- `suggested_feeding_frequency` = '2' (взрослая кошка)
- `suggested_diet_type` = 'dry' (взрослая, без проблем)
- `potential_health_issues` = ['respiratory_problems', 'kidney_issues', 'eye_problems']
- `breed_temperament` = ['calm', 'gentle', 'affectionate']
- `recommended_grooming_frequency` = '2-3 times weekly' (длинная шерсть)

**Пример 3: Щенок "Лабрадор", возраст 4 месяца, вес 12 кг**

*Автоматически определенные параметры:*
- `calculated_size` = 'medium' (вес 12 кг)
- `suggested_activity_level` = 'high' (лабрадор - высокая энергия)
- `suggested_walking_frequency` = 'twice' (средняя порода, щенок)
- `suggested_walking_duration` = '20-30 мин' (щенок, короткие прогулки)
- `suggested_feeding_frequency` = '3' (щенок)
- `suggested_diet_type` = 'dry' (специальный корм для щенков)
- `potential_health_issues` = ['hip_dysplasia', 'heart_problems', 'eye_problems']
- `breed_temperament` = ['friendly', 'playful', 'intelligent']
- `recommended_grooming_frequency` = 'weekly' (короткая шерсть)

**Пример 4: Пожилая кошка "Британская", возраст 12 лет, вес 6 кг**

*Автоматически определенные параметры:*
- `calculated_size` = 'medium' (вес 6 кг)
- `suggested_activity_level` = 'low' (британская + пожилой возраст)
- `suggested_walking_frequency` = 'Не требует'
- `suggested_feeding_frequency` = '2' (пожилая, но меньшими порциями)
- `suggested_diet_type` = 'dry' (корм для пожилых кошек)
- `potential_health_issues` = ['kidney_disease', 'thyroid_problems', 'arthritis']
- `breed_temperament` = ['calm', 'independent', 'affectionate']
- `recommended_grooming_frequency` = 'monthly' (короткая шерсть)

**3. Модель шаблонов профилей:**
```python
class PetProfileTemplate(models.Model):
    """Шаблоны для быстрого создания профилей популярных пород"""
    breed = models.ForeignKey(Breed, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)  # "Лабрадор 2 года"
    data = models.JSONField()  # предзаполненные поля
    usage_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
```

**4. Модель черновиков:**
```python
class PetDraft(models.Model):
    """Черновики профилей для постепенного заполнения"""
    id = models.CharField(primary_key=True, max_length=36, default=generate_uuid7)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    data = models.JSONField(default=dict)
    current_step = models.IntegerField(default=1)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()  # автоудаление через 30 дней
```

#### Новые модели:
```python
class Breed(models.Model):
    """Справочник пород с характеристиками"""
    name = models.CharField(max_length=100)
    species = models.CharField(choices=SPECIES_CHOICES)
    average_weight = models.DecimalField()
    average_lifespan = models.IntegerField()
    characteristics = models.JSONField()  # темперамент, здоровье и т.д.

class PetProfileTemplate(models.Model):
    """Шаблоны профилей для популярных пород"""
    breed = models.ForeignKey(Breed)
    name = models.CharField(max_length=100)
    data = models.JSONField()  # предзаполненные поля

class PetImport(models.Model):
    """История импортов из внешних источников"""
    pet = models.ForeignKey(Pet)
    source = models.CharField()  # 'vet_clinic', 'app', 'file'
    import_date = models.DateTimeField(auto_now_add=True)
    raw_data = models.JSONField()
```

### 5.2. API дизайн

#### RESTful API для PetID:
```
GET    /api/pets/              # Список питомцев пользователя
POST   /api/pets/              # Создание питомца
GET    /api/pets/{id}/         # Детали питомца
PUT    /api/pets/{id}/         # Обновление питомца
DELETE /api/pets/{id}/         # Удаление питомца

GET    /api/pets/{id}/recommendations/  # Персональные рекомендации
POST   /api/pets/{id}/import/           # Импорт данных
GET    /api/pets/{id}/qr/               # QR-код профиля
```

#### GraphQL API для сложных запросов:
```graphql
query GetPetProfile($petId: ID!) {
  pet(id: $petId) {
    basicInfo { name, species, breed, age }
    health { conditions, medications, vetVisits }
    recommendations {
      products { ... }
      courses { ... }
    }
  }
}
```

### 5.3. Frontend архитектура

#### Новая архитектура UI/UX

**1. Быстрое создание (QuickCreate):**
- **3 обязательных поля**: Имя, Вид, Порода
- **Автодополнение**: Поиск по популярным породам
- **Шаблоны**: Предустановленные профили для популярных пород
- **Время создания**: < 30 секунд
- **Мотивация**: Показ ценности на каждом шаге

**2. Постепенное расширение (ProfileBuilder):**
- **Модульная структура**: Независимые секции (Здоровье, Питание, Поведение)
- **Прогресс-индикатор**: Визуализация заполненности профиля
- **Автосохранение**: Черновики с истечением срока
- **Рекомендации**: Умные подсказки на основе уже введенных данных
- **Геймификация**: Значки и достижения за заполнение секций

**3. Просмотр профиля (ProfileViewer):**
- **Карточный интерфейс**: Визуально привлекательная презентация данных
- **QR-код**: Для быстрого доступа и шеринга
- **Экспорт**: PDF, JSON, интеграция с ветклиниками
- **Редактирование**: Inline editing с сохранением черновиков

**4. Персональные рекомендации:**
- **Алгоритмы**: На основе характеристик питомца
- **Категории**: Товары, курсы, услуги, ветеринары
- **Объяснение**: Почему именно эти рекомендации
- **История**: Просмотр предыдущих рекомендаций

#### State Management (Zustand):
```javascript
const usePetStore = create((set, get) => ({
  // Core state
  pets: [],
  activePet: null,
  drafts: new Map(),  // черновики по petId
  templates: [],      // шаблоны профилей

  // UI state
  currentWizardStep: 1,
  profileCompleteness: {},  // по petId
  recommendations: {},      // кэшированные рекомендации

  // Actions
  createQuick: async (basicData) => {
    const pet = await api.createPet(basicData);
    set(state => ({
      pets: [...state.pets, pet],
      profileCompleteness: { ...state.profileCompleteness, [pet.id]: 30 }
    }));
    return pet;
  },

  saveDraft: (petId, data) => {
    const draftKey = `draft_${petId}`;
    localStorage.setItem(draftKey, JSON.stringify({
      ...data,
      savedAt: Date.now()
    }));
    set(state => ({
      drafts: new Map(state.drafts).set(petId, data)
    }));
  },

  expandProfile: async (petId, sectionData) => {
    const updated = await api.updatePet(petId, sectionData);
    const completeness = calculateCompleteness(updated);
    set(state => ({
      pets: state.pets.map(p => p.id === petId ? updated : p),
      profileCompleteness: { ...state.profileCompleteness, [petId]: completeness }
    }));
  },

  importFromVet: async (petId, importData) => {
    // Логика импорта с маппингом полей
    const mappedData = mapVetData(importData);
    return await get().expandProfile(petId, mappedData);
  }
}))
```

#### Компонентная структура:
```
src/components/PetID/
├── QuickCreate/
│   ├── QuickCreateModal.jsx      # Модальное окно быстрого создания
│   ├── BreedSelector.jsx         # Выбор породы с поиском
│   ├── TemplateCard.jsx          # Карточка шаблона
│   └── QuickForm.jsx             # Форма 3 полей
├── ProfileBuilder/
│   ├── ProfileWizard.jsx         # Главный компонент мастера
│   ├── ProgressIndicator.jsx     # Индикатор прогресса
│   ├── SectionHealth.jsx         # Секция здоровья
│   ├── SectionNutrition.jsx      # Секция питания
│   ├── SectionBehavior.jsx       # Секция поведения
│   └── SectionLifestyle.jsx      # Секция образа жизни
├── ProfileViewer/
│   ├── PetProfileCard.jsx        # Карточка профиля
│   ├── ProfileCompleteness.jsx   # Индикатор заполненности
│   ├── QRCodeGenerator.jsx       # Генератор QR-кода
│   └── ExportModal.jsx           # Модал экспорта
└── Recommendations/
    ├── RecommendationsPanel.jsx  # Панель рекомендаций
    ├── ProductRecommendations.jsx
    ├── CourseRecommendations.jsx
    └── ServiceRecommendations.jsx
```

---


    class Meta:
        unique_together = ['product', 'pet_characteristic', 'characteristic_value']
```

### 5.4.2. Таблица рекомендаций курсов (CourseRecommendation)
```python
class CourseRecommendation(models.Model):
    """Рекомендации курсов для конкретных характеристик питомцев"""

    COURSE_CHARACTERISTICS = [
        ('size', 'Размер'),
        ('coat_length', 'Длина шерсти'),
        ('face_type', 'Форма морды'),
        ('energy_level', 'Уровень энергии'),
        ('activity_level', 'Уровень активности'),
        ('behavior_type', 'Тип поведения'),
        ('age_category', 'Возрастная категория'),
        ('training_experience', 'Опыт дрессировки'),
        ('socialization_needs', 'Потребность в социализации'),
        ('temperament', 'Темперамент'),
        ('behavioral_problems', 'Поведенческие проблемы'),
        ('health_issues', 'Проблемы здоровья'),
        ('metabolism_rate', 'Метаболизм'),
        ('noise_tolerance', 'Чувствительность к шуму'),
    ]

    course = models.ForeignKey('Course', on_delete=models.CASCADE)
    pet_characteristic = models.CharField(max_length=50, choices=COURSE_CHARACTERISTICS)
    characteristic_value = models.CharField(max_length=50)
    recommendation_strength = models.CharField(max_length=20, choices=[
        ('required', 'Обязательно'),
        ('highly_recommended', 'Настоятельно рекомендуется'),
        ('recommended', 'Рекомендуется'),
        ('neutral', 'Нейтрально'),
        ('not_recommended', 'Не рекомендуется'),
        ('contraindicated', 'Противопоказано')
    ], default='recommended')
    priority_score = models.IntegerField(default=1, help_text='Приоритет рекомендации (1-10)')
    reasoning = models.TextField(blank=True, help_text='Обоснование рекомендации')
```

### 5.4.3. Таблица персонализированных рекомендаций пользователя (UserPetRecommendation)
```python
class UserPetRecommendation(models.Model):
    """История персонализированных рекомендаций для пользователя"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    pet = models.ForeignKey('Pet', on_delete=models.CASCADE)
    recommendation_type = models.CharField(max_length=50, choices=[
        ('product', 'Продукт'),
        ('course', 'Курс'),
        ('service', 'Услуга'),
        ('article', 'Статья'),
        ('event', 'Событие'),
    ])
    recommended_item_id = models.CharField(max_length=100)  # ID рекомендуемого элемента
    recommendation_reason = models.JSONField(default=dict)  # Причины рекомендации
    confidence_score = models.DecimalField(max_digits=3, decimal_places=2, default=0.5)  # Уверенность (0-1)
    user_feedback = models.CharField(max_length=20, choices=[
        ('liked', 'Понравилось'),
        ('neutral', 'Нейтрально'),
        ('disliked', 'Не понравилось'),
        ('purchased', 'Куплено'),
        ('enrolled', 'Записан на курс'),
    ], null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    shown_at = models.DateTimeField(null=True, blank=True)
    interacted_at = models.DateTimeField(null=True, blank=True)
```

### 5.4.4. Таблица шаблонов профилей (PetProfileTemplate)
```python
class PetProfileTemplate(models.Model):
    """Шаблоны профилей для популярных пород"""

    breed = models.ForeignKey('Breed', on_delete=models.CASCADE)
    template_name = models.CharField(max_length=100, help_text='Название шаблона')
    is_popular = models.BooleanField(default=False, help_text='Популярный шаблон')

    # Предзаполненные поля
    activity_level = models.CharField(max_length=20, choices=Pet.ACTIVITY_LEVELS, null=True, blank=True)
    diet_type = models.CharField(max_length=20, choices=Pet.DIET_TYPE_CHOICES, null=True, blank=True)
    feeding_frequency = models.CharField(max_length=20, choices=Pet.FEEDING_FREQUENCY_CHOICES, null=True, blank=True)
    walk_frequency = models.CharField(max_length=50, null=True, blank=True)
    walk_duration = models.CharField(max_length=50, null=True, blank=True)
    housing_type = models.CharField(max_length=20, choices=Pet.HOUSING_TYPE_CHOICES, null=True, blank=True)
    has_yard = models.BooleanField(null=True)
    other_pets = models.BooleanField(null=True)
    has_children = models.BooleanField(null=True)

    # Рекомендуемые товары и курсы
    recommended_products = models.JSONField(default=list)
    recommended_courses = models.JSONField(default=list)

    usage_count = models.IntegerField(default=0, help_text='Количество использований')
    is_active = models.BooleanField(default=True)
```

### 5.4.5. Таблица импорта питомцев (PetImport)
```python
class PetImport(models.Model):
    """История импорта данных о питомце"""

    IMPORT_SOURCES = [
        ('vet_clinic', 'Ветеринарная клиника'),
        ('pet_tracker', 'Трекер питомца'),
        ('pet_store', 'Магазин для животных'),
        ('social_media', 'Социальные сети'),
        ('other', 'Другое'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    pet = models.ForeignKey('Pet', on_delete=models.CASCADE)
    import_source = models.CharField(max_length=20, choices=IMPORT_SOURCES)
    external_id = models.CharField(max_length=100, help_text='ID в внешней системе')
    imported_data = models.JSONField(help_text='Импортированные данные')
    mapping_results = models.JSONField(default=dict, help_text='Результаты маппинга полей')
    import_status = models.CharField(max_length=20, choices=[
        ('pending', 'Ожидает'),
        ('processing', 'Обрабатывается'),
        ('completed', 'Завершено'),
        ('failed', 'Ошибка'),
    ], default='pending')
    imported_at = models.DateTimeField(default=timezone.now)
    error_message = models.TextField(blank=True)
```

### 5.4.6. Таблица ветеринарных клиник (VetClinic)
```python
class VetClinic(models.Model):
    """Информация о ветеринарных клиниках"""

    name = models.CharField(max_length=200)
    address = models.TextField()
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Интеграции
    api_endpoint = models.URLField(blank=True, help_text='API endpoint для интеграции')
    api_key = models.CharField(max_length=200, blank=True)
    integration_active = models.BooleanField(default=False)

    # Рейтинги и отзывы
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.IntegerField(default=0)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

### 6.1. Этапы создания профиля питомца

**🎯 Принцип: Быстрая регистрация → Постепенное расширение**

#### **Этап 1: Быстрое создание (2-3 минуты)**
**Цель:** Создать базовый профиль для работы сервисов
**Время:** 2-3 минуты
**Эффективность персонализации:** 80%

**Последовательность шагов:**
1. **Выбор вида животного** (собака/кошка)
2. **Ввод имени и даты рождения**
3. **Выбор породы** (опционально, но рекомендуется)
4. **Ввод веса и пола**
5. **Указание проблем здоровья** (аллергии, хронические заболевания)
6. **Указание аллергий/непереносимости** (критично для фильтрации товаров)
7. **Уровень активности** (для собак) / Тип жилья (для кошек)
8. **Поведенческие проблемы** (агрессия, страх, деструктивное поведение)

#### **Этап 2: Расширение профиля (постепенно)**
**Цель:** Углубление персонализации по мере использования
**Время:** В процессе использования сервисов
**Эффективность персонализации:** 100%

**Контекстные подсказки:**
- **При покупке товара:** "Расскажите больше о питании вашего питомца для лучших рекомендаций"
- **При просмотре курсов:** "Уточните опыт дрессировки для персональных рекомендаций"
- **В календаре:** "Добавьте информацию о питании для автоматического расписания"
- **В аналитике:** "Заполните дополнительные поля для подробного анализа"

### 6.2. Обязательные поля для базовой персонализации

#### **🐕 ДЛЯ СОБАК: 10 обязательных полей**

**Базовая информация (критично для идентификации):**
- `name` - Кличка ⭐ (личная связь)
- `species` - Вид животного ⭐ (фильтрация всех сервисов)
- `date_of_birth` - Дата рождения ⭐ (расчет возраста, рекомендации по этапам жизни)

**Физические характеристики (критично для размера и здоровья):**
- `breed` - Порода ⭐ (автозаполнение характеристик, персонализация)
- `weight` - Вес ⭐ (размер, порции корма, здоровье)
- `gender` - Пол ⭐ (медицинские рекомендации, поведение)

**Здоровье (критично для безопасности):**
- `health_issues` - Основные проблемы здоровья ⭐ (аллергии, хронические заболевания)

**Питание (критично для фильтрации товаров):**
- `excluded_ingredients` - Аллергии/непереносимость ⭐ (ингредиенты для исключения)

**Активность (критично для рекомендаций):**
- `activity_level` - Уровень активности ⭐ (прогулки, игрушки, курсы)

**Поведение (критично для курсов):**
- `behavioral_problems` - Поведенческие проблемы ⭐ (агрессия, страх, деструктивное поведение)

#### **🐱 ДЛЯ КОШЕК: 10 обязательных полей**

**Базовая информация (критично для идентификации):**
- `name` - Кличка ⭐ (личная связь)
- `species` - Вид животного ⭐ (фильтрация всех сервисов)
- `date_of_birth` - Дата рождения ⭐ (расчет возраста, рекомендации по этапам жизни)

**Физические характеристики (критично для размера и здоровья):**
- `breed` - Порода ⭐ (автозаполнение характеристик, персонализация)
- `weight` - Вес ⭐ (размер, порции корма, здоровье)
- `gender` - Пол ⭐ (медицинские рекомендации, поведение)

**Здоровье (критично для безопасности):**
- `health_issues` - Основные проблемы здоровья ⭐ (аллергии, хронические заболевания)

**Питание (критично для фильтрации товаров):**
- `excluded_ingredients` - Аллергии/непереносимость ⭐ (ингредиенты для исключения)

**Образ жизни (критично для кошек):**
- `housing_type` - Тип жилья ⭐ (квартира/дом - территориальность, активность)

**Поведение (важно для коррекции проблем):**
- `behavioral_problems` - Поведенческие проблемы ⭐ (агрессия, страх, деструктивное поведение)

### 6.3. Опциональные поля для расширенной персонализации

#### **🐕 ДЛЯ СОБАК: Опциональные поля**

**Расширенное здоровье:**
- `is_neutered` - Кастрирован/стерилизован
- `chronic_conditions` - Хронические заболевания
- `vaccinations` - Вакцинации
- `medications` - Принимаемые препараты
- `dental_health` - Состояние зубов
- `vet_visits` - Посещения ветеринара

**Расширенное питание:**
- `diet_type` - Тип питания (сухой/влажный/смешанный)
- `feeding_frequency` - Частота кормления
- `sensitive_digestion` - Чувствительное пищеварение
- `vitamins_supplements` - Витамины и добавки

**Дополнительное поведение и дрессировка:**
- `behavior_type` - Тип поведения (спокойный/активный/агрессивный)
- `social_level` - Уровень социализации
- `training_experience` - Опыт дрессировки
- `character_traits` - Черты характера
- `training_goals` - Цели дрессировки

**Образ жизни:**
- `body_type` - Тип телосложения
- `has_yard` - Наличие двора
- `other_pets` - Другие питомцы
- `has_children` - Наличие детей
- `walk_frequency` - Частота прогулок
- `walk_duration` - Длительность прогулки
- `special_needs` - Особые потребности
- `preferred_activities` - Предпочитаемые активности

**Дополнительно:**
- `photo` - Фото питомца
- `owner_phone` - Телефон владельца
- `owner_email` - Email владельца
- `owner_city` - Город

#### **🐱 ДЛЯ КОШЕК: Опциональные поля**

**Расширенное здоровье:**
- `is_neutered` - Кастрирован/стерилизован
- `chronic_conditions` - Хронические заболевания
- `vaccinations` - Вакцинации
- `medications` - Принимаемые препараты
- `dental_health` - Состояние зубов
- `vet_visits` - Посещения ветеринара

**Расширенное питание:**
- `diet_type` - Тип питания (сухой/влажный/смешанный)
- `feeding_frequency` - Частота кормления
- `sensitive_digestion` - Чувствительное пищеварение
- `vitamins_supplements` - Витамины и добавки

**Дополнительное поведение и социализация:**
- `behavior_type` - Тип поведения (независимый/ласковый/игривый)
- `social_level` - Уровень социализации
- `activity_level` - Уровень активности
- `character_traits` - Черты характера

**Образ жизни:**
- `body_type` - Тип телосложения
- `has_yard` - Доступ на улицу
- `other_pets` - Другие питомцы
- `has_children` - Наличие детей
- `special_needs` - Особые потребности
- `preferred_activities` - Предпочитаемые активности

**Дополнительно:**
- `photo` - Фото питомца
- `owner_phone` - Телефон владельца
- `owner_email` - Email владельца
- `owner_city` - Город

### 6.4. Логика автоматического заполнения

#### **Автоматически рассчитываемые поля:**
- `size` - Размер (по весу + породе)
- `age` - Возраст (по дате рождения)
- `age_category` - Категория возраста (щенок/взрослый/пожилой)

#### **Автозаполнение из породы:**
При выборе породы автоматически заполняются оптимальные значения:
- `activity_level` (из `energy_level` породы)
- `size` (из `size_category` породы)
- Базовые рекомендации по здоровью и уходу

---

### 7.1. Модели данных

#### **Основная модель Pet**
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

#### **Модель Breed (справочник пород)**
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

#### **Модель анализа профиля**
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

#### **Модель персонализированных рекомендаций**
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

#### **Основные эндпоинты PetID**
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

#### **URL паттерны**
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

#### **PetSerializer**
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

#### **BreedSerializer**
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

#### **PetProfileAnalyzer**
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

        # Анализ веса
        weight_analysis = self._analyze_weight_vs_breed(pet)
        if weight_analysis.get('status') == 'overweight':
            score -= 15
        elif weight_analysis.get('status') == 'underweight':
            score -= 10

        return max(0, min(100, score))
```

#### **PersonalizationScorer**
```python
class PersonalizationScorer:
    """Система скоринга персонализации"""

    SCOORING_WEIGHTS = {
        'health_match': 0.35,
        'breed_specific': 0.25,
        'age_compatibility': 0.20,
        'activity_match': 0.15,
        'user_preferences': 0.05
    }

    def calculate_personalization_score(self, pet, item, item_type='product'):
        """Комплексный расчет релевантности"""
        score = 0

        score += self.calculate_health_match(pet, item) * self.SCOORING_WEIGHTS['health_match']
        score += self.calculate_breed_specificity(pet, item) * self.SCOORING_WEIGHTS['breed_specific']
        score += self.calculate_age_compatibility(pet, item) * self.SCOORING_WEIGHTS['age_compatibility']
        score += self.calculate_activity_match(pet, item) * self.SCOORING_WEIGHTS['activity_match']
        score += self.get_user_preference_score(pet.owner, item) * self.SCOORING_WEIGHTS['user_preferences']

        return score

    def calculate_health_match(self, pet, item):
        """Расчет совпадения по здоровью"""
        if not hasattr(item, 'health_benefits') or not pet.health_issues:
            return 0.5

        matching_benefits = 0
        for issue in pet.health_issues:
            if issue.lower() in [benefit.lower() for benefit in item.health_benefits]:
                matching_benefits += 1

        return min(matching_benefits / len(pet.health_issues), 1)

    def calculate_breed_specificity(self, pet, item):
        """Расчет специфичности для породы"""
        if not pet.breed:
            return 0.5

        score = 0

        # Размер
        if hasattr(item, 'size_category') and pet.breed.size_category == item.size_category:
            score += 0.4

        # Активность
        if hasattr(item, 'activity_level') and pet.breed.energy_level == item.activity_level:
            score += 0.3

        # Шерсть
        if hasattr(item, 'coat_type') and pet.breed.coat_type == item.coat_type:
            score += 0.3

        return min(score, 1)

    def calculate_age_compatibility(self, pet, item):
        """Возрастная совместимость"""
        if not pet.age_category or not hasattr(item, 'age_groups'):
            return 0.5

        return 1.0 if pet.age_category in item.age_groups else 0.0

    def calculate_activity_match(self, pet, item):
        """Совпадение по активности"""
        if not pet.activity_level or not hasattr(item, 'activity_level'):
            return 0.5

        activity_levels = ['low', 'medium', 'high']
        pet_level = activity_levels.index(pet.activity_level)
        item_level = activity_levels.index(item.activity_level)

        return 1.0 - abs(pet_level - item_level) / 2

    def get_user_preference_score(self, user, item):
        """Предпочтения пользователя"""
        # Анализ истории покупок
        return 0.5  # Заглушка
```

### 7.5. Миграции базы данных

#### **Миграция для базовых полей Pet**
```python
# 0001_initial_pet_model.py
class Migration(migrations.Migration):
    operations = [
        migrations.CreateModel(
            name='Pet',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4)),
                ('owner', models.ForeignKey(User, on_delete=models.CASCADE)),
                ('name', models.CharField(max_length=100)),
                ('species', models.CharField(max_length=10, choices=[('dog', 'Собака'), ('cat', 'Кошка')])),
                ('breed', models.ForeignKey('Breed', null=True, on_delete=models.SET_NULL)),
                ('date_of_birth', models.DateField()),
                ('gender', models.CharField(max_length=10, choices=[('male', 'М'), ('female', 'Ж'), ('unknown', '?')])),
                ('weight', models.DecimalField(max_digits=5, decimal_places=2)),
                ('activity_level', models.CharField(max_length=20, blank=True)),
                ('behavioral_problems', models.JSONField(default=list)),
                ('health_issues', models.JSONField(default=list)),
                ('excluded_ingredients', models.JSONField(default=list)),
                ('housing_type', models.CharField(max_length=20, blank=True)),
                ('profile_completeness', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
```

#### **Миграция для справочника пород**
```python
# 0002_create_breed_model.py
class Migration(migrations.Migration):
    operations = [
        migrations.CreateModel(
            name='Breed',
            fields=[
                ('id', models.AutoField(primary_key=True)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('species', models.CharField(max_length=10)),
                ('slug', models.SlugField(unique=True)),
                ('size_category', models.CharField(max_length=20)),
                ('average_weight_min', models.DecimalField(max_digits=5, decimal_places=2)),
                ('average_weight_max', models.DecimalField(max_digits=5, decimal_places=2)),
                ('energy_level', models.CharField(max_length=20)),
                ('common_health_issues', models.JSONField(default=list)),
                ('average_lifespan_min', models.IntegerField()),
                ('average_lifespan_max', models.IntegerField()),
                ('popularity_rank', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
```

#### **Миграция для анализа профилей**
```python
# 0003_add_analysis_models.py
class Migration(migrations.Migration):
    operations = [
        migrations.CreateModel(
            name='PetProfileAnalysis',
            fields=[
                ('id', models.AutoField(primary_key=True)),
                ('pet', models.OneToOneField('Pet', on_delete=models.CASCADE)),
                ('analysis_data', models.JSONField()),
                ('health_score', models.IntegerField(default=0)),
                ('risk_level', models.CharField(max_length=20, default='medium')),
                ('recommendations', models.JSONField(default=dict)),
                ('alerts', models.JSONField(default=list)),
                ('last_analyzed', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='PersonalizedRecommendation',
            fields=[
                ('id', models.AutoField(primary_key=True)),
                ('user', models.ForeignKey(User, on_delete=models.CASCADE)),
                ('pet', models.ForeignKey('Pet', on_delete=models.CASCADE)),
                ('recommendation_type', models.CharField(max_length=20)),
                ('recommended_object_id', models.CharField(max_length=100)),
                ('recommended_object_type', models.CharField(max_length=100)),
                ('reasons', models.JSONField(default=list)),
                ('score', models.FloatField(default=0.0)),
                ('is_viewed', models.BooleanField(default=False)),
                ('is_clicked', models.BooleanField(default=False)),
                ('is_purchased', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(null=True)),
            ],
        ),
    ]
```

## 8. Реализация на фронтенде

### 8.1. Компоненты React

#### **PetOnboardingWizard**
```jsx
// frontend/src/components/PetOnboardingWizard.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const PetOnboardingWizard = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '', species: '', breed: null, date_of_birth: '',
    weight: '', gender: '', health_issues: [], excluded_ingredients: [],
    activity_level: '', behavioral_problems: [], housing_type: ''
  });

  const steps = [
    { id: 'basic', title: 'Основное', component: BasicInfoStep },
    { id: 'physical', title: 'Физическое', component: PhysicalStep },
    { id: 'health', title: 'Здоровье', component: HealthStep },
    { id: 'behavior', title: 'Поведение', component: BehaviorStep }
  ];

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      // API call to create pet
      const response = await api.createPet(transformFormData(formData));
      onComplete(response.data);
    } catch (error) {
      console.error('Error creating pet:', error);
    }
  };

  if (!isOpen) return null;

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold">Добавить питомца</h2>
              <p className="text-gray-600 text-sm">Создайте профиль за 2-3 минуты</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress */}
          <div className="px-6 py-4 bg-gray-50">
            <div className="flex justify-between text-sm mb-2">
              <span>Шаг {currentStep + 1} из {steps.length}</span>
              <span>{Math.round((currentStep + 1) / steps.length * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep + 1) / steps.length * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-96 overflow-y-auto">
            <CurrentStepComponent
              formData={formData}
              updateFormData={updateFormData}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Назад
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {currentStep === steps.length - 1 ? 'Создать профиль' : 'Далее'}
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PetOnboardingWizard;
```

#### **BasicInfoStep**
```jsx
const BasicInfoStep = ({ formData, updateFormData }) => {
  const [breeds, setBreeds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (formData.species) {
      // Загрузка пород по виду
      api.getBreeds({ species: formData.species, search: searchTerm })
        .then(response => setBreeds(response.data));
    }
  }, [formData.species, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Кличка */}
      <div>
        <Label htmlFor="name">Кличка питомца *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="Барон"
          className="mt-1"
        />
      </div>

      {/* Вид животного */}
      <div>
        <Label>Вид животного *</Label>
        <RadioGroup
          value={formData.species}
          onValueChange={(value) => updateFormData({ species: value, breed: null })}
          className="mt-2"
        >
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dog" id="dog" />
              <Label htmlFor="dog" className="flex items-center gap-2 cursor-pointer">
                🐕 Собака
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cat" id="cat" />
              <Label htmlFor="cat" className="flex items-center gap-2 cursor-pointer">
                🐱 Кошка
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Порода */}
      {formData.species && (
        <div>
          <Label>Порода</Label>
          <Select
            value={formData.breed?.id || ''}
            onValueChange={(value) => {
              const selectedBreed = breeds.find(b => b.id === value);
              updateFormData({ breed: selectedBreed });
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Выберите породу (опционально)" />
            </SelectTrigger>
            <SelectContent>
              {breeds.map(breed => (
                <SelectItem key={breed.id} value={breed.id}>
                  {breed.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
```

#### **PhysicalStep**
```jsx
const PhysicalStep = ({ formData, updateFormData }) => {
  return (
    <div className="space-y-6">
      {/* Дата рождения */}
      <div>
        <Label htmlFor="date_of_birth">Дата рождения *</Label>
        <Input
          id="date_of_birth"
          type="date"
          value={formData.date_of_birth}
          onChange={(e) => updateFormData({ date_of_birth: e.target.value })}
          className="mt-1"
        />
      </div>

      {/* Вес */}
      <div>
        <Label htmlFor="weight">Вес (кг) *</Label>
        <Input
          id="weight"
          type="number"
          step="0.1"
          value={formData.weight}
          onChange={(e) => updateFormData({ weight: e.target.value })}
          placeholder="25.5"
          className="mt-1"
        />
        {formData.breed && (
          <p className="text-sm text-gray-600 mt-1">
            Для породы {formData.breed.name} обычно {formData.breed.average_weight_min}-{formData.breed.average_weight_max} кг
          </p>
        )}
      </div>

      {/* Пол */}
      <div>
        <Label>Пол *</Label>
        <RadioGroup
          value={formData.gender}
          onValueChange={(value) => updateFormData({ gender: value })}
          className="mt-2"
        >
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male" className="cursor-pointer">Мальчик</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female" className="cursor-pointer">Девочка</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="unknown" id="unknown" />
              <Label htmlFor="unknown" className="cursor-pointer">Неизвестно</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Автозаполнение */}
      {formData.breed && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700 font-medium mb-2 flex items-center gap-2">
            🤖 На основе породы {formData.breed.name}:
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Размер: <Badge variant="outline">{formData.breed.size_category}</Badge></div>
            <div>Активность: <Badge variant="outline">{formData.breed.energy_level}</Badge></div>
            <div>Продолжительность жизни: <Badge variant="outline">{formData.breed.average_lifespan} лет</Badge></div>
          </div>
        </div>
      )}
    </div>
  );
};
```

### 8.2. Управление состоянием

#### **PetStore (Zustand)**
```jsx
// frontend/src/stores/petStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const usePetStore = create(devtools((set, get) => ({
  // Состояние
  pets: [],
  currentPet: null,
  isLoading: false,
  error: null,

  // Wizard состояние
  wizardData: {
    name: '', species: '', breed: null, date_of_birth: '',
    weight: '', gender: '', health_issues: [], excluded_ingredients: [],
    activity_level: '', behavioral_problems: [], housing_type: ''
  },
  currentStep: 0,
  isWizardOpen: false,

  // Действия
  setWizardData: (data) => set(state => ({
    wizardData: { ...state.wizardData, ...data }
  })),

  resetWizard: () => set({
    wizardData: {
      name: '', species: '', breed: null, date_of_birth: '',
      weight: '', gender: '', health_issues: [], excluded_ingredients: [],
      activity_level: '', behavioral_problems: [], housing_type: ''
    },
    currentStep: 0
  }),

  openWizard: () => set({ isWizardOpen: true }),
  closeWizard: () => set({ isWizardOpen: false, currentStep: 0 }),

  nextStep: () => set(state => ({
    currentStep: Math.min(state.currentStep + 1, 3)
  })),

  prevStep: () => set(state => ({
    currentStep: Math.max(state.currentStep - 1, 0)
  })),

  // API действия
  fetchPets: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getPets();
      set({ pets: response.data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createPet: async (petData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.createPet(petData);
      set(state => ({
        pets: [response.data, ...state.pets],
        isWizardOpen: false,
        currentStep: 0,
        isLoading: false
      }));
      get().resetWizard();
      return response.data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setCurrentPet: (pet) => set({ currentPet: pet }),

}), { name: 'pet-store' }));

export default usePetStore;
```

### 8.3. Формы и валидация

#### **usePetForm Hook**
```jsx
// frontend/src/hooks/usePetForm.js
import { useState, useCallback } from 'react';
import * as yup from 'yup';

const petSchema = yup.object().shape({
  name: yup.string()
    .required('Кличка обязательна')
    .min(2, 'Минимум 2 символа')
    .max(50, 'Максимум 50 символов'),
  
  species: yup.string()
    .required('Выберите вид животного')
    .oneOf(['dog', 'cat'], 'Неверный вид'),
  
  date_of_birth: yup.date()
    .required('Дата рождения обязательна')
    .max(new Date(), 'Дата не может быть в будущем'),
  
  weight: yup.number()
    .required('Вес обязателен')
    .min(0.1, 'Вес должен быть больше 0')
    .max(200, 'Вес не может превышать 200 кг'),
  
  gender: yup.string()
    .required('Пол обязателен')
    .oneOf(['male', 'female', 'unknown'], 'Неверный пол'),
  
  health_issues: yup.array()
    .of(yup.string()),
  
  excluded_ingredients: yup.array()
    .of(yup.string())
    .min(1, 'Укажите хотя бы один аллерген'),
  
  activity_level: yup.string()
    .when('species', {
      is: 'dog',
      then: yup.string().required('Уровень активности обязателен для собак')
    }),
  
  housing_type: yup.string()
    .when('species', {
      is: 'cat',
      then: yup.string().required('Тип жилья обязателен для кошек')
    }),
});

export const usePetForm = (initialData = {}) => {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  const updateField = useCallback((field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
    
    // Очистка ошибки поля при изменении
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const validate = useCallback(async () => {
    setIsValidating(true);
    try {
      await petSchema.validate(data, { abortEarly: false });
      setErrors({});
      return true;
    } catch (validationError) {
      const newErrors = {};
      validationError.inner.forEach(error => {
        newErrors[error.path] = error.message;
      });
      setErrors(newErrors);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [data]);

  const validateField = useCallback(async (fieldName) => {
    try {
      await petSchema.validateAt(fieldName, data);
      setErrors(prev => ({ ...prev, [fieldName]: undefined }));
      return true;
    } catch (error) {
      setErrors(prev => ({ ...prev, [fieldName]: error.message }));
      return false;
    }
  }, [data]);

  const reset = useCallback(() => {
    setData(initialData);
    setErrors({});
  }, [initialData]);

  return {
    data,
    errors,
    isValidating,
    updateField,
    validate,
    validateField,
    reset,
    isValid: Object.keys(errors).length === 0
  };
};
```

### 8.4. API интеграция

#### **PetAPI Service**
```jsx
// frontend/src/api/pets.js
import axios from 'axios';

const API_BASE = '/api/pets/';

class PetAPI {
  // Получение списка питомцев
  async getPets() {
    const response = await axios.get(API_BASE);
    return response;
  }

  // Создание питомца
  async createPet(petData) {
    const response = await axios.post(API_BASE, petData);
    return response;
  }

  // Получение питомца
  async getPet(id) {
    const response = await axios.get(`${API_BASE}${id}/`);
    return response;
  }

  // Обновление питомца
  async updatePet(id, petData) {
    const response = await axios.patch(`${API_BASE}${id}/`, petData);
    return response;
  }

  // Удаление питомца
  async deletePet(id) {
    const response = await axios.delete(`${API_BASE}${id}/`);
    return response;
  }

  // Получение анализа профиля
  async getPetAnalysis(id) {
    const response = await axios.get(`${API_BASE}${id}/analysis/`);
    return response;
  }

  // Получение списка пород
  async getBreeds(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await axios.get(`/api/breeds/?${queryString}`);
    return response;
  }

  // Загрузка фото
  async uploadPhoto(id, file) {
    const formData = new FormData();
    formData.append('photo', file);
    
    const response = await axios.patch(`${API_BASE}${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response;
  }
}

export default new PetAPI();
```

#### **React Query для кеширования**
```jsx
// frontend/src/hooks/usePets.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/pets';

// Получение списка питомцев
export const usePets = () => {
  return useQuery({
    queryKey: ['pets'],
    queryFn: api.getPets,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
};

// Создание питомца
export const useCreatePet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.createPet,
    onSuccess: (newPet) => {
      // Обновление кеша
      queryClient.setQueryData(['pets'], (old) => [newPet, ...(old || [])]);
    },
  });
};

// Получение анализа профиля
export const usePetAnalysis = (petId) => {
  return useQuery({
    queryKey: ['pet-analysis', petId],
    queryFn: () => api.getPetAnalysis(petId),
    enabled: !!petId,
    staleTime: 10 * 60 * 1000, // 10 минут
  });
};
```

---

## 9. План реализации и тестирование

### 9.1. Этапы разработки

#### **Этап 1: Базовая инфраструктура (2 недели)**
- ✅ Создание моделей Django (Pet, Breed, PetProfileAnalysis)
- ✅ API эндпоинты для CRUD операций
- ✅ Сериализаторы с валидацией
- ✅ Миграции базы данных
- ✅ Базовые тесты API

#### **Этап 2: Быстрое создание PetID (2 недели)**
- ✅ PetOnboardingWizard компонент
- ✅ Базовые шаги формы (4 шага)
- ✅ Валидация и автозаполнение
- ✅ API интеграция
- ✅ Обработка ошибок

#### **Этап 3: Расширение профиля (2 недели)**
- ✅ Компоненты расширения профиля
- ✅ Контекстные подсказки в сервисах
- ✅ Опциональные поля
- ✅ Прогресс-бар заполненности

#### **Этап 4: Персонализация сервисов (3 недели)**
- ✅ PersonalizationScorer сервис
- ✅ Интеграция с магазином товаров
- ✅ Интеграция с курсами обучения
- ✅ Кеширование рекомендаций

#### **Этап 5: Оптимизация и запуск (2 недели)**
- ✅ Производительность (индексы, кеширование)
- ✅ E2E тесты
- ✅ Мониторинг и логирование
- ✅ Документация

### 9.2. Тестирование

#### **Unit тесты (Jest + React Testing Library)**
```jsx
// frontend/src/components/__tests__/PetOnboardingWizard.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import PetOnboardingWizard from '../PetOnboardingWizard';

test('renders wizard with first step', () => {
  render(<PetOnboardingWizard isOpen={true} />);
  
  expect(screen.getByText('Основное')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Барон')).toBeInTheDocument();
});

test('navigates between steps', () => {
  render(<PetOnboardingWizard isOpen={true} />);
  
  const nextButton = screen.getByText('Далее');
  fireEvent.click(nextButton);
  
  expect(screen.getByText('Физическое')).toBeInTheDocument();
});

test('validates required fields', async () => {
  render(<PetOnboardingWizard isOpen={true} />);
  
  const createButton = screen.getByText('Создать профиль');
  fireEvent.click(createButton);
  
  expect(await screen.findByText('Кличка обязательна')).toBeInTheDocument();
});
```

#### **Integration тесты (Playwright)**
```jsx
// e2e/tests/pet-creation.spec.js
test('complete pet creation flow', async ({ page }) => {
  await page.goto('/pet-id');
  
  // Нажатие кнопки создания
  await page.click('[data-testid="create-pet-button"]');
  
  // Заполнение формы
  await page.fill('[data-testid="pet-name"]', 'Барон');
  await page.click('[data-testid="species-dog"]');
  await page.selectOption('[data-testid="breed-select"]', 'labrador');
  await page.click('[data-testid="next-button"]');
  
  await page.fill('[data-testid="birth-date"]', '2020-01-01');
  await page.fill('[data-testid="weight"]', '25');
  await page.click('[data-testid="gender-male"]');
  await page.click('[data-testid="next-button"]');
  
  // Создание профиля
  await page.click('[data-testid="create-profile-button"]');
  
  // Проверка результата
  await expect(page.locator('[data-testid="pet-card"]')).toContainText('Барон');
});
```

#### **API тесты (Django TestCase)**
```python
# backend/apps/pets/tests/test_api.py
class PetAPITestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('test@example.com', 'password')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
    
    def test_create_pet_success(self):
        data = {
            'name': 'Барон',
            'species': 'dog',
            'date_of_birth': '2020-01-01',
            'weight': 25.0,
            'gender': 'male',
            'excluded_ingredients': ['chicken']
        }
        
        response = self.client.post('/api/pets/', data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['name'], 'Барон')
    
    def test_create_pet_validation_error(self):
        data = {'name': ''}  # Пустое имя
        
        response = self.client.post('/api/pets/', data)
        self.assertEqual(response.status_code, 400)
        self.assertIn('name', response.data)
```

---

## 10. Риски и меры по их снижению

### 10.1. Технические риски
- **Производительность запросов** → оптимизация индексов, кэширование Redis
- **Масштабируемость** → horizontal scaling, read replicas PostgreSQL
- **Безопасность данных** → валидация, rate limiting, шифрование PII

### 10.2. UX риски
- **Перегруженность формы** → progressive disclosure, accordion UI
- **Недопонимание автозаполнения** → clear visual indicators, tooltips
- **Мобильные проблемы** → responsive design, touch-friendly controls

### 10.3. Бизнес-риски
- **Низкая конверсия создания** → A/B тестирование, упрощение flow
- **Качество данных** → валидация, автозаполнение, обучение пользователей
- **Интеграции** → API-first подход, comprehensive testing

---

**Техническое задание теперь содержит полную спецификацию реализации на бекенде и фронтенде, а также план тестирования и оценки рисков!** 🚀✨

**Текущая ситуация:** Каждый сервис имеет свою логику персонализации, но нет единого алгоритма оценки релевантности.

**Решение:** Создание комплексной системы скоринга с весовыми коэффициентами:

```python
class PersonalizationScorer:
    """Единая система скоринга персонализации"""

    # Весовые коэффициенты для разных факторов
    SCOORING_WEIGHTS = {
        'health_match': 0.35,      # Совпадение по здоровью
        'breed_specific': 0.25,    # Специфика породы
        'age_compatibility': 0.20, # Возрастная совместимость
        'activity_match': 0.15,    # Совпадение по активности
        'user_preferences': 0.05   # Предпочтения пользователя
    }

    def calculate_personalization_score(self, pet, item, item_type='product'):
        """
        Комплексный расчет релевантности товара/курса для питомца
        """
        score = 0

        # Расчет каждого фактора
        score += self.calculate_health_match(pet, item) * self.SCOORING_WEIGHTS['health_match']
        score += self.calculate_breed_specificity(pet, item) * self.SCOORING_WEIGHTS['breed_specific']
        score += self.calculate_age_compatibility(pet, item) * self.SCOORING_WEIGHTS['age_compatibility']
        score += self.calculate_activity_match(pet, item) * self.SCOORING_WEIGHTS['activity_match']
        score += self.get_user_preference_score(pet.owner, item) * self.SCOORING_WEIGHTS['user_preferences']

        return score

    def calculate_health_match(self, pet, item):
        """Расчет совпадения по здоровью (0-1)"""
        health_score = 0

        # Проверка на противопоказания
        if hasattr(item, 'contraindications'):
            for contraindication in item.contraindications:
                if contraindication in str(pet.health_issues):
                    return 0  # Абсолютное противопоказание

        # Совпадение по проблемам здоровья
        if hasattr(item, 'health_benefits') and pet.health_issues:
            matching_benefits = 0
            for issue in pet.health_issues:
                if issue.lower() in [benefit.lower() for benefit in item.health_benefits]:
                    matching_benefits += 1
            health_score = min(matching_benefits / len(pet.health_issues), 1)

        # Учет генетических заболеваний породы
        if hasattr(pet, 'breed') and pet.breed:
            breed_health_issues = pet.breed.common_health_issues or []
            if hasattr(item, 'health_benefits'):
                breed_matches = 0
                for issue in breed_health_issues:
                    if issue.lower() in [benefit.lower() for benefit in item.health_benefits]:
                        breed_matches += 1
                breed_score = min(breed_matches / max(len(breed_health_issues), 1), 1)
                health_score = max(health_score, breed_score * 0.8)  # Генетика важна, но не абсолютно

        return health_score

    def calculate_breed_specificity(self, pet, item):
        """Расчет специфичности для породы (0-1)"""
        if not hasattr(pet, 'breed') or not pet.breed:
            return 0.5  # Среднее значение для неизвестных пород

        specificity_score = 0

        # Размер породы vs размер товара
        if hasattr(item, 'size_category'):
            breed_size = pet.breed.size_category
            item_size = item.size_category
            if breed_size == item_size:
                specificity_score += 0.4
            elif abs(['toy', 'small', 'medium', 'large', 'giant'].index(breed_size) -
                    ['toy', 'small', 'medium', 'large', 'giant'].index(item_size)) == 1:
                specificity_score += 0.2  # Соседний размер

        # Тип шерсти породы vs уход за шерстью
        if hasattr(item, 'grooming_type'):
            coat_type = pet.breed.coat_type
            grooming_mapping = {
                'silky': ['soft_brush', 'pin_brush'],
                'wiry': ['slicker_brush', 'undercoat_rake'],
                'curly': ['slicker_brush', 'detangler'],
                'straight': ['bristle_brush', 'rubber_brush'],
                'double': ['undercoat_rake', 'deshedding_tool']
            }
            if coat_type in grooming_mapping and item.grooming_type in grooming_mapping[coat_type]:
                specificity_score += 0.3

        # Темперамент породы vs тип товара
        if hasattr(item, 'activity_level'):
            energy_match = 0
            if pet.breed.energy_level == 'high' and item.activity_level in ['high', 'active']:
                energy_match = 0.8
            elif pet.breed.energy_level == 'low' and item.activity_level in ['calm', 'relaxing']:
                energy_match = 0.8
            elif pet.breed.energy_level == 'medium' and item.activity_level == 'medium':
                energy_match = 0.8
            specificity_score += energy_match * 0.3

        return min(specificity_score, 1)

    def calculate_age_compatibility(self, pet, item):
        """Расчет возрастной совместимости (0-1)"""
        if not pet.age_category:
            return 0.5

        compatibility_score = 0

        # Проверка возрастных ограничений товара
        if hasattr(item, 'age_restrictions'):
            if pet.age_category in item.age_restrictions:
                compatibility_score += 0.6
            elif 'all' in item.age_restrictions:
                compatibility_score += 0.6
            else:
                return 0  # Товар не подходит по возрасту

        # Специфические рекомендации по возрасту
        age_specific_items = {
            'puppy': ['puppy_food', 'training_treats', 'puppy_toys', 'crate'],
            'kitten': ['kitten_food', 'scratching_post', 'kitten_toys'],
            'adult': ['adult_food', 'interactive_toys', 'grooming_tools'],
            'senior': ['senior_food', 'joint_supplements', 'orthopedic_bed', 'easy_chew_treats']
        }

        if hasattr(item, 'category') and item.category in age_specific_items.get(pet.age_category, []):
            compatibility_score += 0.4

        return min(compatibility_score, 1)

    def calculate_activity_match(self, pet, item):
        """Расчет совпадения по уровню активности (0-1)"""
        pet_activity = pet.activity_level
        if not pet_activity:
            pet_activity = pet.breed.energy_level if pet.breed else 'medium'

        if not hasattr(item, 'activity_requirement'):
            return 0.5  # Нейтральное значение для товаров без требований

        item_activity = item.activity_requirement

        # Матрица совместимости активности
        compatibility_matrix = {
            'low': ['low', 'calm', 'relaxing'],
            'medium': ['low', 'medium', 'calm', 'moderate'],
            'high': ['medium', 'high', 'active', 'energetic'],
            'very_high': ['high', 'very_high', 'active', 'energetic', 'intense']
        }

        if pet_activity in compatibility_matrix and item_activity in compatibility_matrix[pet_activity]:
            return 0.8

        # Частичное совпадение
        if abs(['low', 'medium', 'high', 'very_high'].index(pet_activity) -
               ['low', 'medium', 'high', 'very_high'].index(item_activity)) == 1:
            return 0.4

        return 0.1  # Минимальное совпадение

    def get_user_preference_score(self, user, item):
        """Получение оценки предпочтений пользователя (0-1)"""
        # Анализ истории покупок пользователя
        user_purchases = self.get_user_purchase_history(user)
        if not user_purchases:
            return 0.5  # Нейтральное значение для новых пользователей

        # Поиск похожих товаров в истории
        similar_items = self.find_similar_items(item)
        purchased_similar = len(set(user_purchases) & set(similar_items))

        if purchased_similar > 0:
            return min(purchased_similar / len(similar_items), 1)

        return 0.3  # Минимальный балл за отсутствие истории
```

### 7.2. Логика взаимодействия характеристик

**Текущая ситуация:** Характеристики учитываются независимо друг от друга.

**Решение:** Система выявления эффектов взаимодействия характеристик:

```python
class InteractionEngine:
    """Движок анализа взаимодействий характеристик"""

    INTERACTION_RULES = [
        {
            'conditions': {
                'energy_level': 'high',
                'skin_sensitivity': 'high'
            },
            'effects': {
                'type': 'caution',
                'area': 'grooming',
                'message': 'Высокая активность + чувствительная кожа: выбирать мягкие средства',
                'recommendations': ['hypoallergenic_shampoo', 'soft_brush', 'gentle_grooming']
            }
        },
        {
            'conditions': {
                'age_category': 'senior',
                'health_risks': lambda risks: 'joint_problems' in risks and risks['joint_problems'] == 'high'
            },
            'effects': {
                'type': 'priority',
                'area': 'supplements',
                'message': 'Пожилой возраст + проблемы суставов: обязательные добавки',
                'recommendations': ['joint_supplements', 'orthopedic_bed', 'low_impact_exercise']
            }
        },
        {
            'conditions': {
                'energy_level': 'high',
                'housing_type': 'apartment'
            },
            'effects': {
                'type': 'adaptation',
                'area': 'toys',
                'message': 'Активная порода в квартире: компактные интерактивные игрушки',
                'recommendations': ['puzzle_feeders', 'indoor_agility', 'quiet_chews']
            }
        },
        {
            'conditions': {
                'coat_length': 'long',
                'shedding_level': 'high'
            },
            'effects': {
                'type': 'maintenance',
                'area': 'grooming',
                'message': 'Длинная шерсть + сильная линька: регулярный уход обязателен',
                'recommendations': ['deshedding_tool', 'frequent_brushing', 'shedding_supplements']
            }
        },
        {
            'conditions': {
                'face_type': 'brachycephalic',
                'temperature_tolerance': 'heat_tolerant'
            },
            'effects': {
                'type': 'health_alert',
                'area': 'environment',
                'message': 'Короткомордые породы чувствительны к жаре: избегать перегрева',
                'recommendations': ['cooling_mat', 'shaded_areas', 'fresh_water', 'vet_monitoring']
            }
        },
        {
            'conditions': {
                'socialization_needs': 'high',
                'behavior_type': 'shy'
            },
            'effects': {
                'type': 'training_priority',
                'area': 'socialization',
                'message': 'Высокие потребности в социализации + застенчивый характер: срочные курсы',
                'recommendations': ['puppy_socialization', 'confidence_training', 'positive_reinforcement']
            }
        }
    ]

    def calculate_interaction_effects(self, pet):
        """
        Расчет эффектов взаимодействия характеристик
        """
        interactions = []
        pet_data = self._extract_pet_data(pet)

        for rule in self.INTERACTION_RULES:
            if self._check_conditions(pet_data, rule['conditions']):
                interactions.append(rule['effects'])

        return interactions

    def _extract_pet_data(self, pet):
        """Извлечение данных питомца для анализа"""
        return {
            'energy_level': pet.energy_level or (pet.breed.energy_level if pet.breed else 'medium'),
            'skin_sensitivity': pet.skin_sensitivity,
            'age_category': pet.age_category,
            'health_risks': pet.health_risks or {},
            'housing_type': pet.housing_type,
            'coat_length': pet.coat_length,
            'shedding_level': pet.shedding_level,
            'face_type': pet.face_type,
            'temperature_tolerance': pet.temperature_tolerance,
            'socialization_needs': pet.breed.socialization_needs if pet.breed else 'medium',
            'behavior_type': pet.behavior_type,
        }

    def _check_conditions(self, pet_data, conditions):
        """Проверка условий взаимодействия"""
        for key, value in conditions.items():
            if key not in pet_data:
                return False

            pet_value = pet_data[key]

            if callable(value):
                if not value(pet_value):
                    return False
            elif isinstance(value, list):
                if pet_value not in value:
                    return False
            else:
                if pet_value != value:
                    return False

        return True

    def apply_interaction_effects(self, pet, recommendations):
        """
        Применение эффектов взаимодействия к рекомендациям
        """
        interactions = self.calculate_interaction_effects(pet)
        modified_recommendations = recommendations.copy()

        for interaction in interactions:
            if interaction['type'] == 'priority':
                # Повышение приоритета определенных рекомендаций
                self._boost_recommendations(modified_recommendations, interaction['recommendations'], 2.0)
            elif interaction['type'] == 'caution':
                # Добавление предупреждающих рекомендаций
                self._add_caution_recommendations(modified_recommendations, interaction)
            elif interaction['type'] == 'adaptation':
                # Замена неподходящих рекомендаций
                self._adapt_recommendations(modified_recommendations, interaction)
            elif interaction['type'] == 'health_alert':
                # Добавление критически важных рекомендаций
                self._add_health_alerts(modified_recommendations, interaction)

        return modified_recommendations

    def _boost_recommendations(self, recommendations, items_to_boost, multiplier):
        """Повышение веса определенных рекомендаций"""
        for rec in recommendations:
            if hasattr(rec, 'item_id') and rec.item_id in items_to_boost:
                rec.score *= multiplier
            elif hasattr(rec, 'items'):
                # Для комплектов
                for item in rec.items:
                    if item.get('product') in items_to_boost:
                        rec.score *= multiplier
                        break
```

### 7.3. Адаптивный движок персонализации с машинным обучением

**Текущая ситуация:** Статические правила без обучения на данных.

**Решение:** Создание адаптивного движка с collaborative filtering:

```python
class AdaptivePersonalizationEngine:
    """
    Адаптивный движок персонализации с машинным обучением
    """

    def __init__(self):
        self.user_item_matrix = {}  # Пользователь x Товар матрица взаимодействий
        self.pet_characteristics_cache = {}  # Кэш характеристик питомцев
        self.similarity_cache = {}  # Кэш похожести питомцев
        self.learning_rate = 0.1
        self.discount_factor = 0.95

    def learn_from_interaction(self, user, pet, item, interaction_type, context=None):
        """
        Обучение на взаимодействиях пользователей
        """
        key = f"{user.id}_{pet.id}_{item.id}"

        # Вес взаимодействия
        interaction_weights = {
            'purchased': 10,
            'clicked': 3,
            'viewed': 1,
            'ignored': -0.5,
            'disliked': -2,
            'returned': -5
        }

        weight = interaction_weights.get(interaction_type, 0)
        current_score = self.user_item_matrix.get(key, 0)

        # Обновление с учетом learning rate
        self.user_item_matrix[key] = current_score + (weight - current_score) * self.learning_rate

        # Обновление характеристик питомца
        self._update_pet_characteristics(pet, item, interaction_type)

        # Обновление контекстной информации
        if context:
            self._update_context_data(user, context, interaction_type)

    def predict_relevance(self, user, pet, item):
        """
        Предсказание релевантности на основе истории взаимодействий
        """
        base_score = 0

        # 1. Collaborative filtering по похожим питомцам
        similar_pets_score = self._collaborative_filtering_score(user, pet, item)

        # 2. Content-based filtering по характеристикам
        content_score = self._content_based_score(pet, item)

        # 3. User-based filtering
        user_score = self._user_based_score(user, item)

        # 4. Context-aware filtering
        context_score = self._context_aware_score(user, pet, item)

        # Взвешенная сумма
        final_score = (
            similar_pets_score * 0.4 +
            content_score * 0.35 +
            user_score * 0.15 +
            context_score * 0.1
        )

        return final_score

    def _collaborative_filtering_score(self, user, pet, item):
        """Collaborative filtering по похожим питомцам"""
        similar_pets = self._find_similar_pets(pet)
        if not similar_pets:
            return 0.5

        total_score = 0
        total_weight = 0

        for similar_pet, similarity in similar_pets.items():
            key = f"{user.id}_{similar_pet.id}_{item.id}"
            interaction_score = self.user_item_matrix.get(key, 0)
            total_score += interaction_score * similarity
            total_weight += similarity

        return total_score / total_weight if total_weight > 0 else 0.5

    def _find_similar_pets(self, target_pet):
        """Поиск похожих питомцев"""
        cache_key = f"similar_{target_pet.id}"
        if cache_key in self.similarity_cache:
            return self.similarity_cache[cache_key]

        similar_pets = {}
        target_chars = self._extract_pet_characteristics(target_pet)

        # Поиск среди питомцев того же пользователя
        for pet in target_pet.owner.pets.exclude(id=target_pet.id):
            pet_chars = self._extract_pet_characteristics(pet)
            similarity = self._calculate_pet_similarity(target_chars, pet_chars)
            if similarity > 0.6:  # Порог похожести
                similar_pets[pet] = similarity

        # Поиск среди питомцев других пользователей (анонимизировано)
        # Реализация требует дополнительных мер приватности

        self.similarity_cache[cache_key] = similar_pets
        return similar_pets

    def _calculate_pet_similarity(self, chars1, chars2):
        """Расчет похожести двух питомцев"""
        total_similarity = 0
        weights = {
            'species': 0.2,
            'breed': 0.25,
            'age_category': 0.15,
            'size': 0.1,
            'energy_level': 0.1,
            'behavior_type': 0.1,
            'health_issues': 0.1
        }

        for char, weight in weights.items():
            if char in chars1 and char in chars2:
                if chars1[char] == chars2[char]:
                    total_similarity += weight
                elif char in ['age_category', 'energy_level']:
                    # Частичное совпадение для ordinal характеристик
                    total_similarity += weight * 0.5

        return total_similarity

    def _content_based_score(self, pet, item):
        """Content-based filtering по характеристикам питомца"""
        pet_chars = self._extract_pet_characteristics(pet)
        item_chars = self._extract_item_characteristics(item)

        matching_score = 0
        total_weight = 0

        # Сравнение характеристик
        for char, pet_value in pet_chars.items():
            if char in item_chars:
                item_value = item_chars[char]
                weight = self._get_characteristic_weight(char)

                if pet_value == item_value:
                    matching_score += weight
                elif self._are_compatible_values(char, pet_value, item_value):
                    matching_score += weight * 0.7

                total_weight += weight

        return matching_score / total_weight if total_weight > 0 else 0.5

    def _user_based_score(self, user, item):
        """User-based collaborative filtering"""
        user_interactions = {}
        for key, score in self.user_item_matrix.items():
            if key.startswith(f"{user.id}_"):
                parts = key.split('_')
                if len(parts) >= 3:
                    item_id = parts[2]
                    if item_id == str(item.id):
                        user_interactions[item_id] = score

        return user_interactions.get(str(item.id), 0.5)

    def _context_aware_score(self, user, pet, item):
        """Context-aware рекомендации"""
        # Временной контекст (сезон, время дня)
        time_context = self._get_time_context()
        # Географический контекст
        location_context = self._get_location_context(user)
        # Ситуационный контекст (новый питомец, праздник и т.д.)
        situation_context = self._get_situation_context(pet)

        context_score = 0

        # Адаптация под время года
        if time_context['season'] == 'winter' and hasattr(item, 'winter_relevance'):
            context_score += item.winter_relevance

        # Адаптация под локацию
        if location_context['climate'] == 'cold' and hasattr(item, 'cold_weather_relevance'):
            context_score += item.cold_weather_relevance

        return min(context_score, 1)

    def _update_pet_characteristics(self, pet, item, interaction_type):
        """Обновление профиля характеристик питомца"""
        if interaction_type in ['purchased', 'liked']:
            # Увеличение веса характеристик товара для питомца
            item_chars = self._extract_item_characteristics(item)
            pet_key = f"pet_{pet.id}_preferences"

            if pet_key not in self.pet_characteristics_cache:
                self.pet_characteristics_cache[pet_key] = {}

            for char, value in item_chars.items():
                if char not in self.pet_characteristics_cache[pet_key]:
                    self.pet_characteristics_cache[pet_key][char] = {}
                if value not in self.pet_characteristics_cache[pet_key][char]:
                    self.pet_characteristics_cache[pet_key][char][value] = 0

                self.pet_characteristics_cache[pet_key][char][value] += 1

    def _extract_pet_characteristics(self, pet):
        """Извлечение характеристик питомца"""
        return {
            'species': pet.species,
            'breed': pet.breed.name if pet.breed else None,
            'age_category': pet.age_category,
            'size': pet.size,
            'energy_level': pet.energy_level,
            'behavior_type': pet.behavior_type,
            'coat_length': pet.coat_length,
            'health_issues': pet.health_issues or [],
            'activity_level': pet.activity_level,
        }

    def _extract_item_characteristics(self, item):
        """Извлечение характеристик товара"""
        chars = {}

        if hasattr(item, 'size_category'):
            chars['size'] = item.size_category
        if hasattr(item, 'activity_level'):
            chars['activity_level'] = item.activity_level
        if hasattr(item, 'age_group'):
            chars['age_category'] = item.age_group
        if hasattr(item, 'health_benefits'):
            chars['health_benefits'] = item.health_benefits
        if hasattr(item, 'grooming_type'):
            chars['grooming_type'] = item.grooming_type

        return chars

    def _get_characteristic_weight(self, characteristic):
        """Получение веса характеристики"""
        weights = {
            'size': 0.2,
            'age_category': 0.15,
            'activity_level': 0.15,
            'health_benefits': 0.25,
            'grooming_type': 0.15,
            'species': 0.1,
            'breed': 0.1
        }
        return weights.get(characteristic, 0.1)
```

### 7.4. Сезонная и географическая персонализация

**Текущая ситуация:** Рекомендации не учитывают время года и географию.

**Решение:** Создание гео-временного движка персонализации:

```python
class SeasonalGeoPersonalizationEngine:
    """
    Движок сезонной и географической персонализации
    """

    SEASONAL_RECOMMENDATIONS = {
        'winter': {
            'cold_climate': {
                'short_hair': {
                    'priority_items': ['winter_coat', 'booties', 'sweater', 'heated_bed'],
                    'reason': 'Холодный климат + короткая шерсть: защита от холода обязательна',
                    'urgency': 'high'
                },
                'long_hair': {
                    'priority_items': ['ice_melt_treatment', 'moisturizing_conditioner'],
                    'reason': 'Длинная шерсть в холоде: защита от обморожения лап',
                    'urgency': 'medium'
                },
                'brachycephalic': {
                    'priority_items': ['indoor_heating', 'warm_blanket', 'short_walks'],
                    'reason': 'Короткомордые породы мерзнут: ограничить время на улице',
                    'urgency': 'high'
                }
            },
            'moderate_climate': {
                'general': {
                    'priority_items': ['raincoat', 'towel', 'indoor_activities'],
                    'reason': 'Зимние дожди и слякоть: защита от влаги',
                    'urgency': 'medium'
                }
            }
        },
        'summer': {
            'hot_climate': {
                'brachycephalic': {
                    'priority_items': ['cooling_mat', 'ice_therapy', 'shaded_housing', 'frozen_treats'],
                    'reason': 'Жаркое лето + дыхательные проблемы: предотвращение перегрева',
                    'urgency': 'critical'
                },
                'long_hair': {
                    'priority_items': ['cooling_shampoo', 'frequent_grooming', 'cooling_vest'],
                    'reason': 'Длинная шерсть в жару: перегрев и спутывание шерсти',
                    'urgency': 'high'
                },
                'active_breeds': {
                    'priority_items': ['early_morning_walks', 'cooling_toys', 'shade_structures'],
                    'reason': 'Активные породы в жару: утренние прогулки и охлаждение',
                    'urgency': 'high'
                }
            },
            'moderate_climate': {
                'general': {
                    'priority_items': ['sunscreen', 'fresh_water_stations', 'cooling_products'],
                    'reason': 'Летняя жара: защита от солнца и перегрева',
                    'urgency': 'medium'
                }
            }
        },
        'spring': {
            'general': {
                'priority_items': ['flea_prevention', 'allergy_medication', 'shedding_control'],
                'reason': 'Весна: аллергия, блохи, сезонная линька',
                'urgency': 'medium'
            },
            'allergic_breeds': {
                'priority_items': ['hypoallergenic_food', 'antihistamines', 'air_purifier'],
                'reason': 'Весенняя аллергия: усиленная защита для аллергичных пород',
                'urgency': 'high'
            }
        },
        'autumn': {
            'general': {
                'priority_items': ['vaccination_reminder', 'parasite_prevention', 'warm_clothing_prep'],
                'reason': 'Осень: вакцинация, паразиты, подготовка к зиме',
                'urgency': 'medium'
            }
        }
    }

    def get_seasonal_recommendations(self, pet, current_season, location):
        """
        Получение сезонных рекомендаций с учетом географии
        """
        recommendations = []

        season_data = self.SEASONAL_RECOMMENDATIONS.get(current_season, {})
        climate_data = season_data.get(location.get('climate', 'moderate_climate'), {})

        # Определение подходящих категорий для питомца
        applicable_categories = self._get_applicable_categories(pet, climate_data)

        for category in applicable_categories:
            if category in climate_data:
                rec_data = climate_data[category]
                recommendation = {
                    'season': current_season,
                    'climate': location.get('climate'),
                    'category': category,
                    'items': rec_data['priority_items'],
                    'reason': rec_data['reason'],
                    'urgency': rec_data['urgency'],
                    'location': location
                }
                recommendations.append(recommendation)

        return recommendations

    def _get_applicable_categories(self, pet, climate_data):
        """Определение применимых категорий для питомца"""
        categories = []

        # Категория по длине шерсти
        coat_length_map = {
            'hairless': 'short_hair',
            'short': 'short_hair',
            'medium': 'general',
            'long': 'long_hair',
            'very_long': 'long_hair'
        }
        if pet.coat_length in coat_length_map:
            categories.append(coat_length_map[pet.coat_length])

        # Категория по типу морды
        if pet.face_type == 'brachycephalic':
            categories.append('brachycephalic')

        # Категория по активности
        energy_map = {
            'high': 'active_breeds',
            'very_high': 'active_breeds'
        }
        energy_level = pet.energy_level or (pet.breed.energy_level if pet.breed else 'medium')
        if energy_level in energy_map:
            categories.append(energy_map[energy_level])

        # Категория по аллергии
        if hasattr(pet, 'allergies') and pet.allergies:
            categories.append('allergic_breeds')

        # Общая категория
        categories.append('general')

        return list(set(categories))

    def get_location_context(self, latitude, longitude):
        """
        Получение географического контекста
        """
        context = {
            'climate': 'moderate',
            'timezone': 'UTC',
            'urban_rural': 'urban',
            'altitude': 0
        }

        # Определение климата по координатам
        if latitude is not None and longitude is not None:
            context['climate'] = self._determine_climate(latitude, longitude)
            context['timezone'] = self._get_timezone(latitude, longitude)

        return context

    def _determine_climate(self, latitude, longitude):
        """
        Определение типа климата по координатам
        """
        # Упрощенная логика определения климата
        abs_lat = abs(latitude)

        if abs_lat > 60:  # Высокие широты
            return 'cold'
        elif abs_lat > 40:  # Средние широты
            return 'moderate'
        elif abs_lat > 20:  # Низкие широты
            return 'warm'
        else:  # Экваториальные широты
            return 'tropical'

        # Дополнительная логика может учитывать долготу для континентального климата

    def adapt_recommendations_for_location(self, recommendations, location):
        """
        Адаптация рекомендаций под конкретную локацию
        """
        adapted = []

        for rec in recommendations:
            adapted_rec = rec.copy()

            # Адаптация под урбанизацию
            if location.get('urban_rural') == 'urban':
                # В городе меньше места для активных игр
                adapted_rec['items'] = [item for item in rec['items']
                                      if not item.endswith('_agility')]
                adapted_rec['reason'] += ' (городские условия)'

            # Адаптация под высоту
            if location.get('altitude', 0) > 2000:
                # На высоте другие требования к физической активности
                adapted_rec['items'].extend(['altitude_adjusted_food', 'oxygen_monitoring'])

            adapted.append(adapted_rec)

        return adapted

    def get_seasonal_health_alerts(self, pet, season, location):
        """
        Получение сезонных предупреждений о здоровье
        """
        alerts = []

        # Летние предупреждения для brachycephalic пород
        if season == 'summer' and pet.face_type == 'brachycephalic':
            alerts.append({
                'type': 'heatstroke_risk',
                'severity': 'high',
                'message': 'Высокий риск теплового удара. Избегайте прогулок в жаркое время.',
                'preventive_actions': [
                    'Прогулки только рано утром и поздно вечером',
                    'Всегда иметь доступ к свежей воде',
                    'Использовать охлаждающие маты',
                    'Мониторить признаки перегрева'
                ]
            })

        # Зимние предупреждения для короткошерстных в холодном климате
        if season == 'winter' and location.get('climate') == 'cold':
            if pet.coat_length in ['hairless', 'short']:
                alerts.append({
                    'type': 'hypothermia_risk',
                    'severity': 'high',
                    'message': 'Риск обморожения. Необходима зимняя одежда.',
                    'preventive_actions': [
                        'Теплая одежда обязательна',
                        'Короткие прогулки в сильный мороз',
                        'Защита лап от реагентов',
                        'Теплое помещение для отдыха'
                    ]
                })

        # Весенние аллергии
        if season == 'spring' and hasattr(pet, 'allergies') and pet.allergies:
            alerts.append({
                'type': 'allergy_season',
                'severity': 'medium',
                'message': 'Сезон аллергии. Усилить профилактику.',
                'preventive_actions': [
                    'Антигистаминные препараты',
                    'Гипоаллергенный корм',
                    'Частая уборка помещения',
                    'Избегать аллергенов'
                ]
            })

        return alerts
```

### 7.5. Логика кросс-продаж и комплектов

**Текущая ситуация:** Рекомендуются отдельные товары без учета комплектности.

**Решение:** Система генерации комплектов и кросс-продаж:

```python
class BundleRecommendationEngine:
    """
    Движок рекомендаций комплектов товаров
    """

    BUNDLE_TEMPLATES = {
        'new_puppy': {
            'name': 'Стартовый набор для щенка',
            'categories': ['food', 'care', 'toys', 'training'],
            'items': [
                {'category': 'food', 'type': 'puppy_food', 'quantity': 1, 'essential': True},
                {'category': 'care', 'type': 'collar', 'quantity': 1, 'essential': True},
                {'category': 'care', 'type': 'leash', 'quantity': 1, 'essential': True},
                {'category': 'toys', 'type': 'chew_toy', 'quantity': 2, 'essential': True},
                {'category': 'training', 'type': 'clicker', 'quantity': 1, 'optional': True},
                {'category': 'care', 'type': 'puppy_pad', 'quantity': 1, 'optional': True}
            ],
            'discount_percent': 15,
            'reason': 'Комплект необходимых вещей для нового щенка'
        },
        'senior_care': {
            'name': 'Комплект для пожилого питомца',
            'categories': ['supplements', 'comfort', 'health'],
            'items': [
                {'category': 'supplements', 'type': 'joint_supplement', 'quantity': 1, 'essential': True},
                {'category': 'comfort', 'type': 'orthopedic_bed', 'quantity': 1, 'essential': True},
                {'category': 'health', 'type': 'senior_food', 'quantity': 1, 'essential': True},
                {'category': 'comfort', 'type': 'ramp', 'quantity': 1, 'optional': True},
                {'category': 'supplements', 'type': 'digestive_enzyme', 'quantity': 1, 'optional': True}
            ],
            'discount_percent': 20,
            'reason': 'Комплексная поддержка здоровья пожилого питомца'
        },
        'brachycephalic_care': {
            'name': 'Набор для короткомордых пород',
            'categories': ['feeding', 'comfort', 'health'],
            'items': [
                {'category': 'feeding', 'type': 'slow_feeder_bowl', 'quantity': 2, 'essential': True},
                {'category': 'comfort', 'type': 'elevated_bed', 'quantity': 1, 'essential': True},
                {'category': 'health', 'type': 'nose_butter', 'quantity': 1, 'essential': True},
                {'category': 'feeding', 'type': 'puzzle_feeder', 'quantity': 1, 'optional': True},
                {'category': 'comfort', 'type': 'cooling_mat', 'quantity': 1, 'optional': True}
            ],
            'discount_percent': 18,
            'reason': 'Специализированный уход для короткомордых пород'
        }
    }

    HEALTH_BUNDLES = {
        'joint_health': {
            'name': 'Комплект для здоровья суставов',
            'trigger_conditions': {
                'age_category': 'senior',
                'health_risks': lambda risks: risks.get('joint_problems') == 'high'
            },
            'items': [
                {'category': 'supplements', 'type': 'glucosamine_chondroitin', 'quantity': 1},
                {'category': 'supplements', 'type': 'fish_oil', 'quantity': 1},
                {'category': 'comfort', 'type': 'orthopedic_bed', 'quantity': 1},
                {'category': 'toys', 'type': 'low_impact_toy', 'quantity': 1}
            ],
            'discount_percent': 22,
            'reason': 'Комплексное решение проблем с суставами'
        },
        'skin_allergy': {
            'name': 'Набор для чувствительной кожи',
            'trigger_conditions': {
                'skin_sensitivity': 'high',
                'allergies': lambda allergies: len(allergies or []) > 0
            },
            'items': [
                {'category': 'care', 'type': 'hypoallergenic_shampoo', 'quantity': 1},
                {'category': 'care', 'type': 'moisturizing_conditioner', 'quantity': 1},
                {'category': 'supplements', 'type': 'omega_fatty_acids', 'quantity': 1},
                {'category': 'care', 'type': 'sensitive_skin_brush', 'quantity': 1}
            ],
            'discount_percent': 20,
            'reason': 'Комплексный уход за проблемной кожей'
        }
    }

    def generate_product_bundles(self, pet, occasion='general', context=None):
        """
        Генерация персонализированных комплектов товаров
        """
        bundles = []

        # Комплекты по occasion
        occasion_bundles = self._get_occasion_bundles(pet, occasion)
        bundles.extend(occasion_bundles)

        # Комплекты по здоровью
        health_bundles = self._get_health_bundles(pet)
        bundles.extend(health_bundles)

        # Комплекты по характеристикам породы
        breed_bundles = self._get_breed_specific_bundles(pet)
        bundles.extend(breed_bundles)

        # Сезонные комплекты
        if context and 'season' in context:
            seasonal_bundles = self._get_seasonal_bundles(pet, context['season'])
            bundles.extend(seasonal_bundles)

        # Удаление дубликатов и сортировка по релевантности
        unique_bundles = self._deduplicate_bundles(bundles)
        return self._rank_bundles(unique_bundles, pet)

    def _get_occasion_bundles(self, pet, occasion):
        """Получение комплектов по случаю"""
        bundles = []

        if occasion == 'new_pet':
            if pet.age_category in ['puppy', 'kitten']:
                template = self.BUNDLE_TEMPLATES['new_puppy']
                bundle = self._create_bundle_from_template(template, pet)
                bundles.append(bundle)

        elif occasion == 'birthday':
            bundles.append(self._create_birthday_bundle(pet))

        elif occasion == 'holiday':
            bundles.append(self._create_holiday_bundle(pet))

        return bundles

    def _get_health_bundles(self, pet):
        """Получение комплектов по здоровью"""
        bundles = []

        for bundle_key, bundle_data in self.HEALTH_BUNDLES.items():
            if self._check_bundle_conditions(pet, bundle_data['trigger_conditions']):
                bundle = self._create_bundle_from_template(bundle_data, pet)
                bundles.append(bundle)

        return bundles

    def _get_breed_specific_bundles(self, pet):
        """Получение комплектов специфичных для породы"""
        bundles = []

        if not pet.breed:
            return bundles

        # Комплект для brachycephalic пород
        if pet.breed.face_type == 'brachycephalic':
            template = self.BUNDLE_TEMPLATES['brachycephalic_care']
            bundle = self._create_bundle_from_template(template, pet)
            bundles.append(bundle)

        # Комплект для крупных пород
        if pet.breed.size_category in ['large', 'giant']:
            bundles.append(self._create_large_breed_bundle(pet))

        # Комплект для длинношерстных пород
        if pet.breed.coat_length in ['long', 'very_long']:
            bundles.append(self._create_long_hair_bundle(pet))

        return bundles

    def _create_bundle_from_template(self, template, pet):
        """Создание комплекта из шаблона"""
        bundle = {
            'name': template['name'],
            'items': template['items'].copy(),
            'discount_percent': template['discount_percent'],
            'reason': template['reason'],
            'categories': template['categories'],
            'target_pet': pet,
            'relevance_score': self._calculate_bundle_relevance(template, pet)
        }

        # Адаптация товаров под конкретного питомца
        bundle['items'] = self._adapt_bundle_items(bundle['items'], pet)

        return bundle

    def _calculate_bundle_relevance(self, template, pet):
        """Расчет релевантности комплекта для питомца"""
        score = 0

        # Проверка на соответствие возрасту
        if 'age_category' in template.get('target_age', []):
            if pet.age_category in template['target_age']:
                score += 0.3

        # Проверка на соответствие размеру
        if 'size_category' in template.get('target_size', []):
            if pet.size in template['target_size']:
                score += 0.2

        # Проверка на соответствие здоровью
        if 'health_conditions' in template:
            matching_conditions = 0
            for condition in template['health_conditions']:
                if condition in str(pet.health_issues):
                    matching_conditions += 1
            if matching_conditions > 0:
                score += 0.3 * (matching_conditions / len(template['health_conditions']))

        # Базовый score за соответствие породе
        if self._bundle_matches_breed(template, pet):
            score += 0.2

        return min(score, 1)

    def _adapt_bundle_items(self, items, pet):
        """Адаптация товаров комплекта под конкретного питомца"""
        adapted_items = []

        for item in items:
            adapted_item = item.copy()

            # Адаптация размера
            if 'size' in item.get('attributes', {}):
                adapted_item['attributes']['size'] = pet.size

            # Адаптация возраста
            if 'age_group' in item.get('attributes', {}):
                adapted_item['attributes']['age_group'] = pet.age_category

            # Адаптация вкуса/предпочтений
            if item['category'] == 'food' and hasattr(pet, 'favorite_foods'):
                if pet.favorite_foods:
                    adapted_item['attributes']['flavor'] = pet.favorite_foods[0]

            adapted_items.append(adapted_item)

        return adapted_items

    def generate_cross_sell_recommendations(self, cart_items, pet):
        """
        Генерация рекомендаций кросс-продаж на основе товаров в корзине
        """
        cross_sell_items = []

        for cart_item in cart_items:
            related_items = self._find_related_products(cart_item, pet)

            for related_item in related_items:
                if related_item not in cart_items:  # Не предлагать уже купленное
                    cross_sell_items.append({
                        'item': related_item,
                        'reason': self._get_cross_sell_reason(cart_item, related_item),
                        'confidence': self._calculate_cross_sell_confidence(cart_item, related_item, pet)
                    })

        # Удаление дубликатов и сортировка
        unique_items = self._deduplicate_cross_sell(cross_sell_items)
        return sorted(unique_items, key=lambda x: x['confidence'], reverse=True)

    def _find_related_products(self, item, pet):
        """Поиск связанных товаров"""
        related = []

        # По категории
        category_related = self._get_category_related_products(item.category, pet)
        related.extend(category_related)

        # По бренду (товары одного бренда)
        if hasattr(item, 'brand'):
            brand_related = self._get_brand_related_products(item.brand, item.category)
            related.extend(brand_related)

        # По назначению
        if hasattr(item, 'purpose'):
            purpose_related = self._get_purpose_related_products(item.purpose, pet)
            related.extend(purpose_related)

        return related

    def _get_category_related_products(self, category, pet):
        """Получение связанных товаров по категории"""
        category_rules = {
            'food': {
                'related': ['treats', 'supplements', 'bowls'],
                'conditions': {}
            },
            'care': {
                'related': ['grooming_tools', 'health_supplies'],
                'conditions': {
                    'long_hair': ['brushes', 'conditioners'],
                    'short_hair': ['shampoos', 'towels']
                }
            },
            'toys': {
                'related': ['training_aids', 'comfort_items'],
                'conditions': {
                    'high_energy': ['interactive_toys', 'exercise_equipment'],
                    'low_energy': ['puzzle_feeders', 'comfort_toys']
                }
            }
        }

        if category not in category_rules:
            return []

        rule = category_rules[category]
        related_categories = rule['related']

        # Применение условий
        if 'conditions' in rule:
            for condition_key, condition_items in rule['conditions'].items():
                if self._check_pet_condition(pet, condition_key):
                    related_categories.extend(condition_items)

        return self._get_products_from_categories(related_categories, limit=3)

    def _check_pet_condition(self, pet, condition):
        """Проверка условия питомца"""
        condition_map = {
            'long_hair': pet.coat_length in ['long', 'very_long'],
            'short_hair': pet.coat_length in ['short', 'hairless'],
            'high_energy': pet.energy_level in ['high', 'very_high'],
            'low_energy': pet.energy_level in ['low', 'medium']
        }
        return condition_map.get(condition, False)
```

### 7.6. Персонализация по стилю жизни владельца

**Текущая ситуация:** Учитываются только характеристики питомца.

**Решение:** Анализ поведения владельца и адаптация рекомендаций:

```python
class OwnerLifestyleAnalyzer:
    """
    Анализатор стиля жизни владельца для персонализации
    """

    def analyze_owner_lifestyle(self, user, pet=None):
        """
        Комплексный анализ стиля жизни владельца
        """
        lifestyle_factors = {
            'activity_level': 'unknown',
            'budget_category': 'unknown',
            'time_availability': 'unknown',
            'experience_level': 'unknown',
            'family_situation': 'unknown',
            'pet_care_style': 'unknown',
            'shopping_habits': 'unknown'
        }

        # Анализ истории покупок
        purchase_analysis = self._analyze_purchase_history(user)
        lifestyle_factors.update(purchase_analysis)

        # Анализ расписания и активности
        schedule_analysis = self._analyze_schedule_and_activity(user)
        lifestyle_factors.update(schedule_analysis)

        # Анализ взаимодействия с приложением
        app_usage_analysis = self._analyze_app_usage(user)
        lifestyle_factors.update(app_usage_analysis)

        # Анализ семейной ситуации
        family_analysis = self._analyze_family_situation(user)
        lifestyle_factors.update(family_analysis)

        # Анализ отношения к питомцу
        if pet:
            pet_care_analysis = self._analyze_pet_care_style(user, pet)
            lifestyle_factors.update(pet_care_analysis)

        return lifestyle_factors

    def _analyze_purchase_history(self, user):
        """
        Анализ истории покупок для определения стиля жизни
        """
        purchases = self._get_user_purchase_history(user)

        if not purchases:
            return {'budget_category': 'unknown', 'shopping_habits': 'unknown'}

        # Анализ бюджета
        avg_order_value = sum(p.total_amount for p in purchases) / len(purchases)

        if avg_order_value < 50:
            budget_category = 'budget'
        elif avg_order_value < 150:
            budget_category = 'moderate'
        else:
            budget_category = 'premium'

        # Анализ частоты покупок
        purchase_dates = [p.created_at.date() for p in purchases]
        unique_dates = len(set(purchase_dates))
        total_period_days = (max(purchase_dates) - min(purchase_dates)).days

        if total_period_days > 0:
            purchase_frequency = unique_dates / total_period_days
            if purchase_frequency > 0.1:  # Чаще чем раз в 10 дней
                shopping_habits = 'frequent_small_purchases'
            elif purchase_frequency > 0.02:  # Раз в 1-2 месяца
                shopping_habits = 'regular_moderate'
            else:
                shopping_habits = 'bulk_purchases'
        else:
            shopping_habits = 'unknown'

        # Анализ категорий покупок
        category_counts = {}
        for purchase in purchases:
            for item in purchase.items.all():
                category = item.product.category
                category_counts[category] = category_counts.get(category, 0) + 1

        top_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)

        return {
            'budget_category': budget_category,
            'shopping_habits': shopping_habits,
            'preferred_categories': [cat for cat, count in top_categories[:3]],
            'purchase_frequency': purchase_frequency if 'purchase_frequency' in locals() else 0
        }

    def _analyze_schedule_and_activity(self, user):
        """
        Анализ расписания и уровня активности пользователя
        """
        # Анализ календаря (если доступен)
        calendar_events = self._get_user_calendar_events(user)

        if not calendar_events:
            return {'time_availability': 'unknown', 'activity_level': 'unknown'}

        # Анализ временных паттернов
        morning_events = 0
        evening_events = 0
        weekend_events = 0

        for event in calendar_events:
            hour = event.start_time.hour
            if 6 <= hour <= 12:
                morning_events += 1
            elif 18 <= hour <= 23:
                evening_events += 1

            if event.start_time.weekday() >= 5:  # Суббота, воскресенье
                weekend_events += 1

        # Определение доступности времени
        total_events = len(calendar_events)
        busy_mornings = morning_events / max(total_events, 1)
        busy_evenings = evening_events / max(total_events, 1)

        if busy_mornings > 0.6 and busy_evenings > 0.6:
            time_availability = 'limited'
        elif busy_mornings > 0.4 or busy_evenings > 0.4:
            time_availability = 'moderate'
        else:
            time_availability = 'high'

        # Определение уровня активности
        if weekend_events > total_events * 0.4:  # >40% событий на выходных
            activity_level = 'active'
        elif weekend_events > total_events * 0.2:  # >20% событий на выходных
            activity_level = 'moderate'
        else:
            activity_level = 'sedentary'

        return {
            'time_availability': time_availability,
            'activity_level': activity_level,
            'schedule_pattern': {
                'morning_preference': busy_mornings > busy_evenings,
                'weekend_focus': weekend_events > total_events * 0.3
            }
        }

    def _analyze_app_usage(self, user):
        """
        Анализ использования приложения
        """
        usage_stats = self._get_user_app_usage_stats(user)

        if not usage_stats:
            return {'experience_level': 'unknown'}

        # Анализ частоты использования
        sessions_per_week = usage_stats.get('sessions_per_week', 0)

        if sessions_per_week > 10:
            engagement_level = 'high'
        elif sessions_per_week > 5:
            engagement_level = 'medium'
        else:
            engagement_level = 'low'

        # Анализ времени в приложении
        avg_session_time = usage_stats.get('avg_session_time', 0)

        if avg_session_time > 300:  # >5 минут
            attention_span = 'detailed'
        elif avg_session_time > 120:  # >2 минут
            attention_span = 'moderate'
        else:
            attention_span = 'quick'

        # Определение уровня опыта
        features_used = usage_stats.get('features_used', [])
        advanced_features = ['analytics', 'custom_reports', 'advanced_filters']

        advanced_features_used = len(set(features_used) & set(advanced_features))

        if advanced_features_used >= 2:
            experience_level = 'expert'
        elif advanced_features_used == 1 or engagement_level == 'high':
            experience_level = 'intermediate'
        else:
            experience_level = 'beginner'

        return {
            'experience_level': experience_level,
            'engagement_level': engagement_level,
            'attention_span': attention_span,
            'preferred_features': features_used[:3] if features_used else []
        }

    def _analyze_family_situation(self, user):
        """
        Анализ семейной ситуации
        """
        # Анализ данных профиля
        profile_data = self._get_user_profile_data(user)

        family_indicators = {
            'has_children': False,
            'home_alone_hours': 0,
            'family_members': 1,
            'housing_type': 'unknown'
        }

        # Определение по покупкам товаров для детей
        child_related_purchases = self._get_child_related_purchases(user)
        if child_related_purchases:
            family_indicators['has_children'] = True

        # Определение типа жилья по покупкам
        housing_indicators = self._analyze_housing_indicators(user)
        family_indicators.update(housing_indicators)

        # Определение ситуации
        if family_indicators['has_children'] and family_indicators['family_members'] > 2:
            family_situation = 'large_family'
        elif family_indicators['has_children']:
            family_situation = 'family_with_children'
        elif family_indicators['home_alone_hours'] > 8:
            family_situation = 'often_alone'
        else:
            family_situation = 'couple_or_single'

        return {
            'family_situation': family_situation,
            'family_indicators': family_indicators
        }

    def _analyze_pet_care_style(self, user, pet):
        """
        Анализ стиля ухода за питомцем
        """
        care_indicators = {
            'care_priority': 'unknown',
            'budget_for_pet_care': 'unknown',
            'care_frequency': 'unknown',
            'preventive_care': 'unknown'
        }

        # Анализ по покупкам
        pet_purchases = self._get_pet_related_purchases(user)

        # Определение приоритета ухода
        premium_products = len([p for p in pet_purchases if p.price > 100])
        total_products = len(pet_purchases)

        if total_products == 0:
            return {'pet_care_style': 'unknown'}

        premium_ratio = premium_products / total_products

        if premium_ratio > 0.5:
            care_priority = 'premium'
        elif premium_ratio > 0.2:
            care_priority = 'balanced'
        else:
            care_priority = 'budget'

        # Анализ профилактического ухода
        preventive_products = [p for p in pet_purchases
                             if p.category in ['vaccines', 'preventive_care', 'supplements']]
        preventive_ratio = len(preventive_products) / total_products

        if preventive_ratio > 0.3:
            preventive_care = 'high'
        elif preventive_ratio > 0.1:
            preventive_care = 'moderate'
        else:
            preventive_care = 'low'

        # Определение стиля ухода
        if care_priority == 'premium' and preventive_care == 'high':
            pet_care_style = 'comprehensive_care'
        elif care_priority == 'budget' and preventive_care == 'low':
            pet_care_style = 'minimal_care'
        elif preventive_care == 'high':
            pet_care_style = 'health_focused'
        else:
            pet_care_style = 'standard_care'

        return {
            'pet_care_style': pet_care_style,
            'care_indicators': {
                'care_priority': care_priority,
                'preventive_care': preventive_care,
                'premium_ratio': premium_ratio
            }
        }

    def adapt_recommendations_for_owner(self, recommendations, lifestyle, pet):
        """
        Адаптация рекомендаций под стиль жизни владельца
        """
        adapted_recommendations = []

        for rec in recommendations:
            adapted_rec = rec.copy()

            # Адаптация по бюджету
            if lifestyle['budget_category'] == 'budget':
                adapted_rec = self._adapt_for_budget(adapted_rec)

            # Адаптация по времени
            if lifestyle['time_availability'] == 'limited':
                adapted_rec = self._adapt_for_limited_time(adapted_rec)

            # Адаптация по опыту
            if lifestyle['experience_level'] == 'beginner':
                adapted_rec = self._adapt_for_beginner(adapted_rec)

            # Адаптация по семейной ситуации
            if lifestyle['family_situation'] == 'large_family':
                adapted_rec = self._adapt_for_family(adapted_rec)

            adapted_recommendations.append(adapted_rec)

        return adapted_recommendations

    def _adapt_for_budget(self, recommendation):
        """Адаптация для бюджетного сегмента"""
        # Поиск бюджетных альтернатив
        if hasattr(recommendation, 'items'):
            budget_items = []
            for item in recommendation.items:
                budget_alternative = self._find_budget_alternative(item)
                if budget_alternative:
                    budget_items.append(budget_alternative)
                else:
                    budget_items.append(item)
            recommendation.items = budget_items

        recommendation['reason'] += ' (бюджетный вариант)'
        return recommendation

    def _adapt_for_limited_time(self, recommendation):
        """Адаптация для занятых владельцев"""
        # Предпочтение товаров с минимальным обслуживанием
        if hasattr(recommendation, 'items'):
            low_maintenance_items = []
            for item in recommendation.items:
                if self._is_low_maintenance(item):
                    low_maintenance_items.append(item)
            if low_maintenance_items:
                recommendation.items = low_maintenance_items

        recommendation['reason'] += ' (минимальное обслуживание)'
        return recommendation

    def _adapt_for_beginner(self, recommendation):
        """Адаптация для начинающих владельцев"""
        # Добавление инструкций и простых решений
        recommendation['simplified_instructions'] = True
        recommendation['beginner_friendly'] = True
        recommendation['reason'] += ' (простое решение для начинающих)'
        return recommendation

    def _adapt_for_family(self, recommendation):
        """Адаптация для семей с детьми"""
        # Безопасные и семейные продукты
        if hasattr(recommendation, 'items'):
            family_safe_items = []
            for item in recommendation.items:
                if self._is_family_safe(item):
                    family_safe_items.append(item)
            recommendation.items = family_safe_items

        recommendation['reason'] += ' (безопасно для семьи с детьми)'
        return recommendation
```

### 7.7. Персонализированное ценообразование

**Текущая ситуация:** Все товары по фиксированным ценам.

**Решение:** Динамическая система ценообразования:

```python
class DynamicPricingEngine:
    """
    Движок динамического ценообразования
    """

    def calculate_personalized_pricing(self, product, user, pet, context=None):
        """
        Расчет персонализированной цены
        """
        base_price = product.base_price
        final_price = base_price

        # 1. Скидки за комплексные покупки
        bundle_discount = self._calculate_bundle_discount(user, product)
        final_price -= bundle_discount

        # 2. Скидки за лояльность
        loyalty_discount = self._calculate_loyalty_discount(user)
        final_price -= loyalty_discount

        # 3. Динамическое ценообразование по спросу
        demand_multiplier = self._calculate_demand_multiplier(product, pet)
        final_price *= demand_multiplier

        # 4. Персональные скидки за здоровье
        health_discount = self._calculate_health_discount(pet, product)
        final_price -= health_discount

        # 5. Сезонные скидки
        seasonal_adjustment = self._calculate_seasonal_adjustment(product, context)
        final_price *= seasonal_adjustment

        # 6. Географические корректировки
        location_adjustment = self._calculate_location_adjustment(product, context)
        final_price *= location_adjustment

        # 7. Психологическое ценообразование
        psychological_price = self._apply_psychological_pricing(final_price)
        final_price = psychological_price

        # Ограничения на минимальную и максимальную цену
        final_price = max(final_price, product.min_price or base_price * 0.5)
        final_price = min(final_price, product.max_price or base_price * 1.5)

        return round(final_price, 2)

    def _calculate_bundle_discount(self, user, product):
        """
        Расчет скидки за комплексную покупку
        """
        # Проверяем товары в текущей корзине
        cart_items = self._get_user_cart_items(user)

        # Ищем подходящие комплекты
        applicable_bundles = []
        for bundle in self.bundle_templates:
            if self._product_in_bundle(product, bundle) and self._cart_matches_bundle(cart_items, bundle):
                applicable_bundles.append(bundle)

        if not applicable_bundles:
            return 0

        # Выбираем лучший комплект
        best_bundle = max(applicable_bundles, key=lambda b: b['discount_percent'])

        # Расчет скидки для данного товара
        bundle_discount = product.base_price * (best_bundle['discount_percent'] / 100)
        individual_discount = bundle_discount / len(best_bundle['items'])

        return individual_discount

    def _calculate_loyalty_discount(self, user):
        """
        Расчет скидки за лояльность
        """
        loyalty_tier = self._get_user_loyalty_tier(user)

        tier_discounts = {
            'bronze': 0,
            'silver': 0.05,  # 5%
            'gold': 0.10,    # 10%
            'platinum': 0.15 # 15%
        }

        return user.total_spent * tier_discounts.get(loyalty_tier, 0)

    def _calculate_demand_multiplier(self, product, pet):
        """
        Расчет множителя спроса
        """
        # Базовый спрос
        base_demand = 1.0

        # Спрос по породе
        breed_multiplier = self._get_breed_demand_multiplier(product, pet)
        base_demand *= breed_multiplier

        # Спрос по сезону
        seasonal_multiplier = self._get_seasonal_demand_multiplier(product)
        base_demand *= seasonal_multiplier

        # Спрос по региону
        location_multiplier = self._get_location_demand_multiplier(product)
        base_demand *= location_multiplier

        return base_demand

    def _calculate_health_discount(self, pet, product):
        """
        Расчет скидки за здоровье питомца
        """
        health_discount = 0

        # Скидки для хронических заболеваний
        if hasattr(product, 'health_benefits') and pet.health_issues:
            matching_issues = 0
            for issue in pet.health_issues:
                if issue.lower() in [benefit.lower() for benefit in product.health_benefits]:
                    matching_issues += 1

            if matching_issues > 0:
                discount_percent = min(matching_issues * 10, 30)  # До 30% скидки
                health_discount = product.base_price * (discount_percent / 100)

        # Дополнительные скидки для пожилых питомцев
        if pet.age_category == 'senior' and hasattr(product, 'senior_friendly'):
            health_discount += product.base_price * 0.05

        return health_discount

    def _calculate_seasonal_adjustment(self, product, context):
        """
        Расчет сезонной корректировки цены
        """
        if not context or 'season' not in context:
            return 1.0

        season = context['season']

        # Сезонные коэффициенты для разных категорий
        seasonal_multipliers = {
            'winter': {
                'clothing': 1.2,    # Зимняя одежда дороже
                'heating': 1.15,    # Обогреватели дороже
                'food': 0.95,       # Корм дешевле в сезон распродаж
            },
            'summer': {
                'cooling': 1.25,    # Охлаждающие товары дороже
                'grooming': 1.1,    # Уход за шерстью дороже
                'outdoor': 1.05,    # Уличные товары дороже
            },
            'spring': {
                'allergy': 1.3,     # Антиаллергенные товары дороже
                'gardening': 1.1,   # Садовые товары дороже
            },
            'autumn': {
                'vaccines': 1.1,    # Вакцины дороже
                'supplements': 1.05,# Добавки дороже
            }
        }

        product_category = getattr(product, 'category', 'general')
        season_multipliers = seasonal_multipliers.get(season, {})

        return season_multipliers.get(product_category, 1.0)

    def _calculate_location_adjustment(self, product, context):
        """
        Расчет географической корректировки цены
        """
        if not context or 'location' not in context:
            return 1.0

        location = context['location']

        # Базовые корректировки по регионам
        region_multipliers = {
            'remote': 1.1,      # Доставка дороже
            'urban': 1.0,       # Стандартная цена
            'international': 1.2 # Международная доставка
        }

        # Специфические корректировки для категорий
        location_category_multipliers = {
            'remote': {
                'perishable': 1.15,  # Скоропортящиеся товары дороже доставлять
                'large_items': 1.2,  # Крупногабаритные товары дороже
            },
            'international': {
                'customs_sensitive': 1.3,  # Товары с таможенными платежами
            }
        }

        region_multiplier = region_multipliers.get(location.get('region_type', 'urban'), 1.0)

        # Применение категориальных корректировок
        category_multipliers = location_category_multipliers.get(location.get('region_type', 'urban'), {})
        product_category = getattr(product, 'category', 'general')
        category_multiplier = category_multipliers.get(product_category, 1.0)

        return region_multiplier * category_multiplier

    def _apply_psychological_pricing(self, price):
        """
        Применение психологического ценообразования
        """
        # Округление до психологически привлекательных цифр
        if price < 10:
            # Для малых сумм - округление до 0.99
            return math.floor(price) + 0.99
        elif price < 100:
            # Для средних сумм - округление до 9.99
            return math.floor(price / 10) * 10 + 9.99
        else:
            # Для больших сумм - округление до 99
            return math.floor(price / 100) * 100 + 99

    def get_price_explanation(self, product, user, pet, final_price):
        """
        Получение объяснения цены для пользователя
        """
        base_price = product.base_price
        explanations = []

        if final_price < base_price:
            savings = base_price - final_price
            explanations.append(f"Экономия: {savings:.2f} руб.")

            # Объяснение скидок
            if self._calculate_bundle_discount(user, product) > 0:
                explanations.append("Скидка за комплексную покупку")

            if self._calculate_loyalty_discount(user) > 0:
                explanations.append("Скидка за лояльность")

            if self._calculate_health_discount(pet, product) > 0:
                explanations.append("Здоровье питомца: специальная цена")

        elif final_price > base_price:
            premium = final_price - base_price
            explanations.append(f"Премиум цена: +{premium:.2f} руб.")
            explanations.append("Высокий сезонный спрос")

        return explanations

    def get_alternative_pricing_options(self, product, user, pet):
        """
        Получение альтернативных вариантов оплаты
        """
        options = []

        # Обычная цена
        options.append({
            'type': 'standard',
            'price': product.base_price,
            'description': 'Стандартная цена'
        })

        # Персонализированная цена
        personalized_price = self.calculate_personalized_pricing(product, user, pet)
        if personalized_price != product.base_price:
            options.append({
                'type': 'personalized',
                'price': personalized_price,
                'description': 'Персональная цена для вас',
                'savings': product.base_price - personalized_price if personalized_price < product.base_price else 0
            })

        # Рассрочка
        if product.base_price > 500:
            installment_options = self._calculate_installment_options(product.base_price)
            options.extend(installment_options)

        # Подписка
        if hasattr(product, 'subscription_available') and product.subscription_available:
            subscription_option = self._calculate_subscription_option(product)
            options.append(subscription_option)

        return options
```

---

## Риски и решения

**Технические риски:**
- **Производительность запросов** → оптимизация индексов, кэширование
- **Масштабируемость** → horizontal scaling, read replicas
- **Безопасность данных** → валидация, rate limiting, шифрование

**Бизнес-риски:**
- **Низкая конверсия** → A/B тестирование, UX улучшения
- **Качество данных** → валидация, автозаполнение, шаблоны
- **Интеграции** → API-first подход, comprehensive testing

**Организационные риски:**
- **Сроки** → agile, регулярные демо
- **Качество** → code review, automated testing
- **Команда** → ежедневные standups, документация
