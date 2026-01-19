"""
Сериализаторы для модуля управления питомцами (PetID)

Этот модуль содержит сериализаторы DRF для валидации и сериализации
данных питомцев согласно документации Integration_PetID_Breeds_Calculator.md

Классы сериализаторов:
    - PetCreateSerializer: Валидация данных для создания нового питомца (Этап 1)
    - PetUpdateSerializer: Валидация данных для обновления существующего питомца
    - PetSerializer: Сериализация данных питомца для API ответов
    - BreedSerializer: Сериализация данных пород для справочника
    - BreedListSerializer: Упрощённый сериализатор для списка пород

Допустимые виды животных (по документации):
    - dog (собака)
    - cat (кошка)
"""

from rest_framework import serializers
from datetime import datetime
from .models import Pet, Breed
from .models import CalendarEvent


# === КОНСТАНТЫ ПО ДОКУМЕНТАЦИИ ===

SPECIES_CHOICES = [
    ('dog', 'Собака'),
    ('cat', 'Кошка'),
]

SEX_CHOICES = [
    ('male', 'Самец'),
    ('female', 'Самка'),
]

SIZE_CATEGORY_CHOICES = [
    ('toy', 'Той (до 5 кг)'),
    ('small', 'Маленький (5-10 кг)'),
    ('medium', 'Средний (10-25 кг)'),
    ('large', 'Крупный (25-45 кг)'),
    ('giant', 'Гигантский (более 45 кг)'),
]

ACTIVITY_LEVEL_CHOICES = [
    ('very_low', 'Очень низкая'),
    ('low', 'Низкая'),
    ('moderate', 'Умеренная'),
    ('high', 'Высокая'),
    ('very_high', 'Очень высокая'),
]

COAT_TYPE_CHOICES = [
    ('hairless', 'Бесшёрстный'),
    ('short', 'Короткая'),
    ('medium', 'Средняя'),
    ('long', 'Длинная'),
    ('double', 'Двойная'),
    ('wire', 'Жёсткая'),
    ('curly', 'Курчавая'),
]

HOUSING_TYPE_CHOICES = [
    ('apartment', 'Квартира'),
    ('house', 'Частный дом'),
    ('farm', 'Ферма/сельская местность'),
    ('outdoor', 'Вольерное содержание'),
]

DIET_TYPE_CHOICES = [
    ('dry', 'Сухой корм'),
    ('wet', 'Влажный корм'),
    ('mixed', 'Комбинированный'),
    ('raw', 'Натуральное питание (BARF)'),
    ('homemade', 'Домашняя еда'),
]

REPRODUCTIVE_STATE_CHOICES = [
    ('none', 'Обычное состояние'),
    ('heat', 'Течка'),
    ('pregnant', 'Беременность'),
    ('lactating', 'Лактация'),
]

TEMPERAMENT_CHOICES = [
    ('calm', 'Спокойный'),
    ('balanced', 'Уравновешенный'),
    ('active', 'Активный'),
    ('hyperactive', 'Гиперактивный'),
]

SOCIAL_LEVEL_CHOICES = [
    ('antisocial', 'Избегает контактов'),
    ('reserved', 'Сдержанный'),
    ('friendly', 'Дружелюбный'),
    ('very_social', 'Очень общительный'),
]

BEHAVIORAL_PROBLEM_CHOICES = [
    ('aggression_dogs', 'Агрессия к собакам'),
    ('aggression_people', 'Агрессия к людям'),
    ('aggression_cats', 'Агрессия к кошкам'),
    ('separation_anxiety', 'Тревога разлуки'),
    ('excessive_barking', 'Чрезмерный лай'),
    ('destructive_behavior', 'Деструктивное поведение'),
    ('fear_phobias', 'Страхи/фобии'),
    ('marking_territory', 'Метки территории'),
    ('excessive_licking', 'Чрезмерное вылизывание'),
    ('food_aggression', 'Агрессия за еду'),
    ('leash_pulling', 'Тянет поводок'),
    ('jumping_on_people', 'Прыгает на людей'),
    ('none', 'Нет проблем'),
]


# =============================================================================
# СЕРИАЛИЗАТОРЫ ПИТОМЦЕВ
# =============================================================================

class PetCreateSerializer(serializers.Serializer):
    """
    Сериализатор для создания нового питомца (Этап 1 - Базовый профиль).
    
    Обязательные поля по документации:
        - name: Кличка питомца
        - species: dog / cat
        - date_of_birth: Дата рождения
        - sex: male / female
        - weight_kg: Текущий вес
        - is_neutered: Кастрирован/стерилизована
    
    Опциональные поля:
        - breed: ID породы из справочника (NULL для дворняг)
        - photo: Фото питомца
    """
    
    # === ОБЯЗАТЕЛЬНЫЕ ПОЛЯ ЭТАПА 1 ===
    
    name = serializers.CharField(
        required=True,
        max_length=100,
        help_text="Кличка питомца (обязательно, 1-100 символов)"
    )
    
    species = serializers.ChoiceField(
        required=True,
        choices=SPECIES_CHOICES,
        help_text="Вид животного: dog или cat"
    )
    
    date_of_birth = serializers.CharField(
        required=True,
        help_text="Дата рождения в формате YYYY-MM-DD"
    )
    
    sex = serializers.ChoiceField(
        required=True,
        choices=SEX_CHOICES,
        help_text="Пол: male или female"
    )
    
    weight = serializers.FloatField(
        required=True,
        min_value=0.1,
        max_value=200,
        help_text="Текущий вес в килограммах (0.1 - 200)"
    )
    
    is_neutered = serializers.BooleanField(
        required=True,
        help_text="Кастрирован/Стерилизована"
    )
    
    # === ОПЦИОНАЛЬНЫЕ ПОЛЯ ЭТАПА 1 ===
    
    breed = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID породы из справочника (NULL для дворняг)"
    )
    
    # === ПОЛЯ ДЛЯ ЧЕРНОВИКОВ ===
    
    is_draft = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Флаг черновика"
    )
    
    draft_step = serializers.IntegerField(
        required=False,
        default=1,
        help_text="Шаг wizard'а при сохранении черновика"
    )
    
    def validate_name(self, value):
        """Валидация клички питомца."""
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Кличка питомца обязательна")
        if len(value) < 1:
            raise serializers.ValidationError("Кличка должна содержать минимум 1 символ")
        return value
    
    def validate_date_of_birth(self, value):
        """Валидация даты рождения."""
        if not value:
            return None
        
        try:
            date_obj = datetime.strptime(value, '%Y-%m-%d').date()
            
            if date_obj > datetime.now().date():
                raise serializers.ValidationError(
                    "Дата рождения не может быть в будущем"
                )
            
            return value
            
        except ValueError:
            raise serializers.ValidationError(
                "Неверный формат даты. Используйте формат YYYY-MM-DD"
            )
    
    def validate_weight(self, value):
        """Валидация веса."""
        if value is None:
            return None
        
        if value <= 0:
            raise serializers.ValidationError("Вес должен быть положительным числом")
        
        if value > 200:
            raise serializers.ValidationError("Вес не может превышать 200 кг")
        
        return round(value, 2)


class PetUpdateSerializer(serializers.Serializer):
    """
    Сериализатор для обновления питомца (Этап 2 - Расширенный профиль).
    
    Все поля опциональны для поддержки частичного обновления.
    """
    
    # === БАЗОВЫЕ ПОЛЯ (могут быть обновлены) ===
    
    name = serializers.CharField(
        required=False,
        max_length=100,
        allow_null=True,
        help_text="Кличка питомца"
    )
    
    species = serializers.ChoiceField(
        required=False,
        choices=SPECIES_CHOICES,
        allow_null=True,
        help_text="Вид животного"
    )
    
    breed = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID породы"
    )
    
    date_of_birth = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Дата рождения (YYYY-MM-DD)"
    )
    
    sex = serializers.ChoiceField(
        required=False,
        choices=SEX_CHOICES,
        allow_null=True,
        help_text="Пол"
    )
    
    weight = serializers.FloatField(
        required=False,
        allow_null=True,
        help_text="Вес в кг"
    )
    
    is_neutered = serializers.BooleanField(
        required=False,
        allow_null=True,
        help_text="Кастрирован/Стерилизована"
    )
    
    # === АВТОЗАПОЛНЯЕМЫЕ ПОЛЯ (могут быть переопределены пользователем) ===
    
    size_category = serializers.ChoiceField(
        required=False,
        choices=SIZE_CATEGORY_CHOICES,
        allow_null=True,
        help_text="Категория размера"
    )
    
    coat_type = serializers.ChoiceField(
        required=False,
        choices=COAT_TYPE_CHOICES,
        allow_null=True,
        help_text="Тип шерсти"
    )
    
    ideal_weight_kg = serializers.FloatField(
        required=False,
        allow_null=True,
        help_text="Идеальный вес"
    )
    
    activity_level = serializers.ChoiceField(
        required=False,
        choices=ACTIVITY_LEVEL_CHOICES,
        allow_null=True,
        help_text="Уровень активности"
    )
    
    # === ЖИЛЬЁ И УСЛОВИЯ ===
    
    housing_type = serializers.ChoiceField(
        required=False,
        choices=HOUSING_TYPE_CHOICES,
        allow_null=True,
        help_text="Тип жилья"
    )
    
    has_yard = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Есть двор"
    )
    
    yard_size = serializers.ChoiceField(
        required=False,
        choices=[
            ('small', 'Маленький'),
            ('medium', 'Средний'),
            ('large', 'Большой'),
        ],
        allow_null=True,
        help_text="Размер двора"
    )
    
    has_children = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Есть дети в доме"
    )
    
    has_other_pets = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Есть другие питомцы"
    )
    
    # === ПИТАНИЕ ===
    
    diet_type = serializers.ChoiceField(
        required=False,
        choices=DIET_TYPE_CHOICES,
        allow_null=True,
        help_text="Тип питания"
    )
    
    feeding_frequency = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=6,
        allow_null=True,
        help_text="Количество кормлений в день (1-6)"
    )
    
    current_food = serializers.JSONField(
        required=False,
        allow_null=True,
        help_text="Текущий корм {source, food_id, brand_name, product_name, daily_amount_grams}"
    )
    
    sensitive_digestion = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Чувствительное пищеварение"
    )
    
    # === РЕПРОДУКЦИЯ ===
    
    neutering_date = serializers.DateField(
        required=False,
        allow_null=True,
        help_text="Дата кастрации/стерилизации"
    )
    
    reproductive_state = serializers.ChoiceField(
        required=False,
        choices=REPRODUCTIVE_STATE_CHOICES,
        allow_null=True,
        help_text="Репродуктивное состояние"
    )
    
    pregnancy_week = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=9,
        allow_null=True,
        help_text="Неделя беременности (1-9)"
    )
    
    litter_size = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Количество детёнышей"
    )
    
    lactation_week = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Неделя лактации"
    )
    
    # === ПОВЕДЕНИЕ ===
    
    temperament = serializers.ChoiceField(
        required=False,
        choices=TEMPERAMENT_CHOICES,
        allow_null=True,
        help_text="Темперамент"
    )
    
    social_level = serializers.ChoiceField(
        required=False,
        choices=SOCIAL_LEVEL_CHOICES,
        allow_null=True,
        help_text="Уровень социализации"
    )
    
    behavioral_problems = serializers.ListField(
        child=serializers.ChoiceField(choices=BEHAVIORAL_PROBLEM_CHOICES),
        required=False,
        default=list,
        help_text="Поведенческие проблемы (массив кодов)"
    )
    
    # === ЗДОРОВЬЕ ===
    
    chronic_conditions_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Заметки по здоровью"
    )
    
    last_vet_visit = serializers.DateField(
        required=False,
        allow_null=True,
        help_text="Дата последнего визита к ветеринару"
    )
    
    body_condition_score = serializers.ChoiceField(
        required=False,
        choices=[(str(i), str(i)) for i in range(1, 10)],
        allow_null=True,
        help_text="Оценка упитанности (BCS) 1-9"
    )
    
    # === КЛИМАТ ===
    
    living_climate = serializers.ChoiceField(
        required=False,
        choices=[
            ('hot', 'Жаркий'),
            ('warm', 'Тёплый'),
            ('cool', 'Прохладный'),
            ('cold', 'Холодный'),
            ('very_cold', 'Очень холодный'),
        ],
        allow_null=True,
        help_text="Климат проживания"
    )
    
    # === ПРОГУЛКИ ===
    
    walk_frequency = serializers.ChoiceField(
        required=False,
        choices=[
            ('none', 'Не гуляет'),
            ('1_day', '1 раз в день'),
            ('2_day', '2 раза в день'),
            ('3_day', '3 раза в день'),
            ('4_plus', '4+ раз в день'),
            ('free_access', 'Свободный выгул'),
        ],
        allow_null=True,
        help_text="Частота прогулок"
    )
    
    walk_duration = serializers.ChoiceField(
        required=False,
        choices=[
            ('under_15', 'Менее 15 минут'),
            ('15_30', '15-30 минут'),
            ('30_60', '30-60 минут'),
            ('60_90', '1-1.5 часа'),
            ('90_120', '1.5-2 часа'),
            ('over_120', 'Более 2 часов'),
        ],
        allow_null=True,
        help_text="Длительность прогулки"
    )
    
    # === ФЛАГИ ===
    
    is_extended_profile = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Расширенный профиль заполнен"
    )
    
    is_draft = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Флаг черновика"
    )
    
    def validate_date_of_birth(self, value):
        """Валидация даты рождения при обновлении."""
        if not value:
            return None
        
        try:
            if isinstance(value, str):
                date_obj = datetime.strptime(value, '%Y-%m-%d').date()
            else:
                date_obj = value
            
            if date_obj > datetime.now().date():
                raise serializers.ValidationError(
                    "Дата рождения не может быть в будущем"
                )
            
            return value
            
        except ValueError:
            raise serializers.ValidationError(
                "Неверный формат даты. Используйте формат YYYY-MM-DD"
            )
    
    def validate_weight(self, value):
        """Валидация веса при обновлении."""
        if value is None:
            return None
        
        if value <= 0:
            raise serializers.ValidationError("Вес должен быть положительным числом")
        
        if value > 200:
            raise serializers.ValidationError("Вес не может превышать 200 кг")
        
        return round(value, 2)


class PetSerializer(serializers.Serializer):
    """
    Сериализатор для вывода данных питомца в API ответах.
    Структура соответствует документации Integration_PetID_Breeds_Calculator.md
    """
    
    # === ИДЕНТИФИКАЦИЯ ===
    id = serializers.CharField(read_only=True)
    user_id = serializers.CharField(read_only=True, source='owner_id')
    name = serializers.CharField(read_only=True)
    species = serializers.CharField(read_only=True)
    breed_id = serializers.IntegerField(read_only=True, allow_null=True)
    breed_name = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    
    # === БАЗОВЫЕ ДАННЫЕ ===
    date_of_birth = serializers.DateField(read_only=True, allow_null=True)
    sex = serializers.CharField(read_only=True)
    weight_kg = serializers.FloatField(read_only=True, source='weight', allow_null=True)
    is_neutered = serializers.BooleanField(read_only=True)
    
    # === АВТОЗАПОЛНЯЕМЫЕ ПОЛЯ ===
    size_category = serializers.CharField(read_only=True, allow_null=True)
    coat_type = serializers.CharField(read_only=True, allow_null=True)
    ideal_weight_kg = serializers.FloatField(read_only=True, allow_null=True)
    body_condition_score = serializers.CharField(read_only=True, allow_null=True)
    activity_level = serializers.CharField(read_only=True, allow_null=True)
    
    # === ЖИЛЬЁ И УСЛОВИЯ ===
    housing_type = serializers.CharField(read_only=True, allow_null=True)
    has_yard = serializers.BooleanField(read_only=True)
    yard_size = serializers.CharField(read_only=True, allow_null=True)
    has_children = serializers.BooleanField(read_only=True)
    has_other_pets = serializers.BooleanField(read_only=True)
    
    # === ПИТАНИЕ ===
    diet_type = serializers.CharField(read_only=True, allow_null=True)
    feeding_frequency = serializers.CharField(read_only=True, allow_null=True)
    current_food = serializers.JSONField(read_only=True, allow_null=True)
    sensitive_digestion = serializers.BooleanField(read_only=True)
    
    # === РЕПРОДУКЦИЯ ===
    neutering_date = serializers.DateField(read_only=True, allow_null=True)
    reproductive_state = serializers.CharField(read_only=True, allow_null=True)
    pregnancy_week = serializers.IntegerField(read_only=True, allow_null=True)
    litter_size = serializers.IntegerField(read_only=True, allow_null=True)
    lactation_week = serializers.IntegerField(read_only=True, allow_null=True)
    
    # === ПОВЕДЕНИЕ ===
    temperament = serializers.CharField(read_only=True, allow_null=True)
    social_level = serializers.CharField(read_only=True, allow_null=True)
    behavioral_problems = serializers.ListField(read_only=True)
    
    # === ЗДОРОВЬЕ ===
    chronic_conditions_notes = serializers.CharField(read_only=True, allow_blank=True)
    last_vet_visit = serializers.DateField(read_only=True, allow_null=True)
    
    # === КЛИМАТ ===
    living_climate = serializers.CharField(read_only=True, allow_null=True)
    
    # === СЛУЖЕБНЫЕ ПОЛЯ ===
    is_extended_profile = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    
    # === ВЫЧИСЛЯЕМЫЕ ПОЛЯ ===
    age = serializers.IntegerField(read_only=True, allow_null=True)
    age_months = serializers.IntegerField(read_only=True, allow_null=True)
    age_category = serializers.CharField(read_only=True, allow_null=True)
    calculated_size_category = serializers.CharField(read_only=True, allow_null=True)
    profile_completeness = serializers.IntegerField(read_only=True)
    
    def get_breed_name(self, obj):
        """Получение названия породы."""
        return obj.breed.name if obj.breed else None
    
    def get_photo(self, obj):
        """Получение URL фото."""
        if obj.photo:
            try:
                return obj.photo.url
            except (ValueError, AttributeError):
                pass
        return None


# =============================================================================
# СЕРИАЛИЗАТОРЫ СПРАВОЧНИКА ПОРОД
# =============================================================================

class BreedListSerializer(serializers.ModelSerializer):
    """
    Краткий сериализатор породы для списков.
    Используется в выпадающих списках и автодополнении.
    """
    weight_min = serializers.FloatField(read_only=True)
    weight_max = serializers.FloatField(read_only=True)
    min_weight = serializers.FloatField(read_only=True)
    max_weight = serializers.FloatField(read_only=True)
    energy_level = serializers.CharField(source='base_activity_level', read_only=True)
    
    class Meta:
        model = Breed
        fields = [
            'id', 'name', 'slug', 'species',
            'size_category', 'weight_min', 'weight_max', 'min_weight', 'max_weight',
            'energy_level', 'trainability'
        ]


class BreedSerializer(serializers.ModelSerializer):
    """
    Полный сериализатор породы.
    Включает все характеристики для автозаполнения PetID.
    """
    weight_min = serializers.FloatField(read_only=True)
    weight_max = serializers.FloatField(read_only=True)
    min_weight = serializers.FloatField(read_only=True)
    max_weight = serializers.FloatField(read_only=True)
    average_weight = serializers.SerializerMethodField()
    energy_level = serializers.CharField(source='base_activity_level', read_only=True)
    suggestions = serializers.SerializerMethodField()
    
    class Meta:
        model = Breed
        fields = [
            # Основные
            'id', 'name', 'name_en', 'slug', 'species', 
            'short_description',
            # Размеры
            'size_category', 'weight_min', 'weight_max', 'min_weight', 'max_weight', 
            'average_weight', 'average_lifespan',
            # Поведение
            'energy_level', 'trainability', 'base_activity_level',
            # Уход
            'grooming_needs', 'coat_type',
            # Мета
            'suggestions'
        ]
    
    def get_average_weight(self, obj):
        """Возвращает средний вес породы."""
        if obj.weight_min and obj.weight_max:
            return float((obj.weight_min + obj.weight_max) / 2)
        return None
    
    def get_suggestions(self, obj):
        """
        Возвращает рекомендуемые значения для автозаполнения Pet.
        Используется триггером автозаполнения.
        """
        avg_weight = None
        if obj.weight_min and obj.weight_max:
            avg_weight = float((obj.weight_min + obj.weight_max) / 2)
        return {
            'activity_level': obj.base_activity_level,
            'size_category': obj.size_category,
            'coat_type': obj.coat_type,
            'ideal_weight_kg': avg_weight,
            'trainability': obj.trainability,
        }


class BreedSuggestionsSerializer(serializers.Serializer):
    """
    Сериализатор для подсказок при выборе породы.
    Возвращает данные для автозаполнения формы создания PetID.
    """
    activity_level = serializers.CharField()
    size_category = serializers.CharField()
    coat_type = serializers.CharField()
    ideal_weight_kg = serializers.FloatField()
    health_risks = serializers.ListField(child=serializers.CharField())
    diet_recommendations = serializers.CharField()
    grooming_needs = serializers.CharField()


# =============================================================================
# СЕРИАЛИЗАТОРЫ КАЛЕНДАРЯ СОБЫТИЙ
# =============================================================================

class CalendarEventSerializer(serializers.ModelSerializer):
    """
    Сериализатор для полной информации о событии календаря.
    """

    pet_name = serializers.CharField(source='pet.name', read_only=True)
    pet_species = serializers.CharField(source='pet.species', read_only=True)
    pet_photo = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'title', 'description',
            'pet', 'pet_name', 'pet_species', 'pet_photo', 'user',
            'event_type', 'priority', 'status',
            'start_date', 'start_time', 'end_date', 'end_time',
            'is_recurring', 'recurrence_rule',
            'notify_before', 'email_notification', 'push_notification',
            'location', 'cost', 'notes',
            'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at']

    def get_pet_photo(self, obj):
        """Получение URL фото питомца."""
        if obj.pet.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pet.photo.url)
        return None

    def validate(self, data):
        """Валидация данных события."""
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({
                'end_date': 'Дата окончания не может быть раньше даты начала.'
            })

        return data


class CalendarEventListSerializer(serializers.ModelSerializer):
    """
    Сериализатор для списка событий календаря.
    """

    pet_name = serializers.CharField(source='pet.name', read_only=True)
    pet_species = serializers.CharField(source='pet.species', read_only=True)

    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'title', 'event_type', 'priority', 'status',
            'start_date', 'start_time', 'end_date', 'end_time',
            'pet_name', 'pet_species', 'location', 'cost'
        ]


class CalendarEventCreateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для создания нового события календаря.
    """

    class Meta:
        model = CalendarEvent
        fields = [
            'title', 'description', 'pet', 'event_type', 'priority',
            'start_date', 'start_time', 'end_date', 'end_time',
            'is_recurring', 'recurrence_rule',
            'notify_before', 'email_notification', 'push_notification',
            'location', 'cost', 'notes'
        ]

    def validate_pet(self, value):
        """Проверка, что питомец принадлежит пользователю."""
        request = self.context.get('request')
        if request and value.owner_id != request.user.id:
            raise serializers.ValidationError(
                "Вы не можете создавать события для чужих питомцев."
            )
        return value

    def create(self, validated_data):
        """Создание события с установкой пользователя."""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
