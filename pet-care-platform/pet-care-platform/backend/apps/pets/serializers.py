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
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from .models import Pet, Breed, Vaccine, Medication, PetVaccination, PetMedication
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


# === ВАЛИДАЦИЯ ФОТО ===

ALLOWED_PHOTO_CONTENT_TYPES = ('image/jpeg', 'image/png', 'image/webp')
MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024  # 5 МБ


def validate_pet_photo(file):
    """
    Проверка загружаемого фото питомца.

    Допустимые форматы: JPEG / PNG / WEBP. Максимальный размер: 5 МБ.
    Бросает serializers.ValidationError при нарушении.
    """
    content_type = getattr(file, 'content_type', None)
    size = getattr(file, 'size', None)
    if content_type not in ALLOWED_PHOTO_CONTENT_TYPES or (size is not None and size > MAX_PHOTO_SIZE_BYTES):
        raise serializers.ValidationError(
            'Фото должно быть JPEG/PNG/WEBP и не больше 5 МБ'
        )
    return file


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
        required=False,
        min_value=0.1,
        max_value=200,
        help_text="Текущий вес в килограммах (0.1 - 200)"
    )

    weight_kg = serializers.FloatField(
        required=False,
        min_value=0.1,
        max_value=200,
        help_text="Алиас для weight (ТЗ: weight_kg)"
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

    breed_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Алиас для breed (ТЗ: breed_id)"
    )

    is_mixed_breed = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Метис / беспородный (без породы из справочника)"
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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        data = kwargs.get('data') or {}
        raw_is_draft = data.get('is_draft')
        is_draft = str(raw_is_draft).lower() in {'1', 'true', 'yes'} if raw_is_draft is not None else False
        if is_draft:
            for field_name in ('date_of_birth', 'sex', 'weight', 'weight_kg', 'is_neutered'):
                if field_name in self.fields:
                    self.fields[field_name].required = False
    
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

    def validate(self, attrs):
        """Поддержка алиасов weight_kg и breed_id + проверки веса по виду."""
        weight = attrs.get('weight')
        weight_kg = attrs.get('weight_kg')
        if weight is None and weight_kg is not None:
            attrs['weight'] = weight_kg
        attrs.pop('weight_kg', None)

        weight = attrs.get('weight')
        if weight is not None:
            try:
                weight_val = float(weight)
            except (TypeError, ValueError):
                raise serializers.ValidationError({'weight': 'Вес должен быть числом'})
            normalized_weight = self.validate_weight(weight_val)
            try:
                weight_decimal = Decimal(str(normalized_weight)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            except (InvalidOperation, ValueError):
                raise serializers.ValidationError({'weight': 'Вес должен быть числом'})
            attrs['weight'] = weight_decimal

        if not attrs.get('is_draft') and attrs.get('weight') is None:
            raise serializers.ValidationError({'weight': 'Вес обязателен для создания питомца'})

        weight = attrs.get('weight')
        species = attrs.get('species') or (self.initial_data.get('species') if hasattr(self, 'initial_data') else None)
        if weight is not None and species:
            if species == 'cat' and weight > 20:
                raise serializers.ValidationError({'weight': 'Максимум 20 кг для кошки'})
            if species == 'dog' and weight > 100:
                raise serializers.ValidationError({'weight': 'Максимум 100 кг для собаки'})

        breed = attrs.get('breed')
        breed_id = attrs.get('breed_id')
        if breed is None and breed_id is not None:
            attrs['breed'] = breed_id
        attrs.pop('breed_id', None)

        # Метис/беспородный: породы из справочника нет
        if attrs.get('is_mixed_breed'):
            attrs['breed'] = None

        # Проверка соответствия породы виду питомца (breed здесь — int id)
        breed_value = attrs.get('breed')
        if breed_value is not None:
            effective_species = attrs.get('species')
            breed_obj = Breed.objects.filter(id=breed_value).first()
            if breed_obj and effective_species and breed_obj.species != effective_species:
                raise serializers.ValidationError(
                    {'breed': 'Порода не соответствует виду питомца'}
                )

        return attrs


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
    
    breed = serializers.PrimaryKeyRelatedField(
        queryset=Breed.objects.all(),
        required=False,
        allow_null=True,
        help_text="ID породы"
    )

    breed_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Алиас для breed (ТЗ: breed_id)"
    )

    is_mixed_breed = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Метис / беспородный (без породы из справочника)"
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

    weight_kg = serializers.FloatField(
        required=False,
        allow_null=True,
        help_text="Алиас для weight (ТЗ: weight_kg)"
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
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text="Поведенческие проблемы (массив кодов)"
    )

    def validate_behavioral_problems(self, value):
        # Терпимо: молча отбрасываем неизвестные коды (например, из старого мастера
        # или расширённого словаря), вместо того чтобы заваливать весь PUT ошибкой 400
        # и терять ВСЕ правки профиля. Сохраняем валидное подмножество.
        allowed = {c[0] for c in BEHAVIORAL_PROBLEM_CHOICES}
        return [v for v in (value or []) if v in allowed]

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
    
    body_condition_score = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=9,
        allow_null=True,
        help_text="Оценка упитанности (BCS) 1-9"
    )

    heart_rate = serializers.IntegerField(
        required=False,
        min_value=1,
        allow_null=True,
        help_text="ЧСС (уд/мин)"
    )

    respiratory_rate = serializers.IntegerField(
        required=False,
        min_value=1,
        allow_null=True,
        help_text="ЧДД (дых/мин)"
    )

    temperature = serializers.DecimalField(
        required=False,
        max_digits=4,
        decimal_places=1,
        allow_null=True,
        help_text="Температура (°C)"
    )

    vet_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Заметки ветеринара"
    )

    def validate_vet_notes(self, value):
        # Колонка pets.vet_notes — NOT NULL (TextField без null=True). Пустые заметки
        # храним как '' , а не NULL, иначе клиентский null → IntegrityError при сохранении.
        return value or ''
    
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

    draft_step = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Шаг черновика"
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

    def validate_current_food(self, value):
        """Валидация структуры current_food по ТЗ."""
        if value is None:
            return None
        if value == {}:
            return None
        raw_is_draft = self.initial_data.get('is_draft') if hasattr(self, 'initial_data') else None
        is_draft = str(raw_is_draft).lower() in {'1', 'true', 'yes'} if raw_is_draft is not None else False
        if is_draft:
            return value

        if not isinstance(value, dict):
            raise serializers.ValidationError("current_food должен быть объектом")

        source = value.get('source')
        if source == 'recipe_ration':
            # Комбинация рациона (dry/wet) из нашей базы — пишется через POST /save-ration/.
            if not isinstance(value.get('components'), list) or not value.get('components'):
                raise serializers.ValidationError("current_food.components обязателен для source='recipe_ration'")
            return value
        if source not in ['catalog', 'other']:
            raise serializers.ValidationError("current_food.source должен быть 'catalog', 'other' или 'recipe_ration'")

        if source == 'catalog' and not value.get('food_id'):
            raise serializers.ValidationError("current_food.food_id обязателен для source='catalog'")

        if source == 'other':
            if not value.get('brand_name'):
                raise serializers.ValidationError("current_food.brand_name обязателен для source='other'")
            if not value.get('product_name'):
                raise serializers.ValidationError("current_food.product_name обязателен для source='other'")

        daily_amount = value.get('daily_amount_grams')
        if daily_amount is not None:
            try:
                daily_amount_val = float(daily_amount)
            except (TypeError, ValueError):
                raise serializers.ValidationError("current_food.daily_amount_grams должен быть числом")
            if daily_amount_val <= 0:
                raise serializers.ValidationError("current_food.daily_amount_grams должен быть положительным")

        return value

    def validate(self, attrs):
        """Поддержка алиасов weight_kg и breed_id."""
        # Алиас weight_kg → weight. Учитываем явное обнуление (weight_kg: null),
        # чтобы можно было очистить вес через алиас.
        raw = getattr(self, 'initial_data', {}) or {}
        weight = attrs.get('weight')
        weight_kg = attrs.get('weight_kg')
        if 'weight' not in attrs and 'weight_kg' in raw:
            # weight не передан, но weight_kg присутствует (в т.ч. явный null)
            attrs['weight'] = weight_kg
        elif weight is None and weight_kg is not None:
            attrs['weight'] = weight_kg
        attrs.pop('weight_kg', None)

        weight = attrs.get('weight')
        if weight is not None:
            try:
                weight_val = float(weight)
            except (TypeError, ValueError):
                raise serializers.ValidationError({'weight': 'Вес должен быть числом'})
            normalized_weight = self.validate_weight(weight_val)
            try:
                weight_decimal = Decimal(str(normalized_weight)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            except (InvalidOperation, ValueError):
                raise serializers.ValidationError({'weight': 'Вес должен быть числом'})
            attrs['weight'] = weight_decimal

        species = attrs.get('species') or (self.instance.species if self.instance else None)
        if attrs.get('weight') is not None and species:
            if species == 'cat' and attrs['weight'] > 20:
                raise serializers.ValidationError({'weight': 'Максимум 20 кг для кошки'})
            if species == 'dog' and attrs['weight'] > 100:
                raise serializers.ValidationError({'weight': 'Максимум 100 кг для собаки'})

        breed = attrs.get('breed')
        breed_id = attrs.get('breed_id')
        if breed is None and breed_id is not None:
            try:
                attrs['breed'] = Breed.objects.get(id=breed_id)
            except Breed.DoesNotExist:
                raise serializers.ValidationError({'breed_id': f'Порода с ID {breed_id} не найдена'})
        attrs.pop('breed_id', None)

        # Метис/беспородный: породы из справочника нет
        if attrs.get('is_mixed_breed'):
            attrs['breed'] = None

        # Проверка соответствия породы виду питомца.
        # Эффективная порода: новая из payload, иначе текущая у питомца
        # (если она не обнуляется явно).
        effective_species = attrs.get('species') or (self.instance.species if self.instance else None)
        if 'breed' in attrs:
            breed_obj = attrs.get('breed')
        else:
            breed_obj = self.instance.breed if self.instance else None
        if breed_obj is not None and effective_species and breed_obj.species != effective_species:
            raise serializers.ValidationError(
                {'breed': 'Порода не соответствует виду питомца'}
            )

        return attrs


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
    breed_display_name = serializers.CharField(read_only=True, allow_null=True)
    is_mixed_breed = serializers.BooleanField(read_only=True)
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
    body_condition_score = serializers.IntegerField(read_only=True, allow_null=True)
    activity_level = serializers.CharField(read_only=True, allow_null=True)
    
    # === ЖИЛЬЁ И УСЛОВИЯ ===
    housing_type = serializers.CharField(read_only=True, allow_null=True)
    has_yard = serializers.BooleanField(read_only=True)
    yard_size = serializers.CharField(read_only=True, allow_null=True)
    has_children = serializers.BooleanField(read_only=True)
    has_other_pets = serializers.BooleanField(read_only=True)
    
    # === ПИТАНИЕ ===
    diet_type = serializers.CharField(read_only=True, allow_null=True)
    feeding_frequency = serializers.IntegerField(read_only=True, allow_null=True)
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
    heart_rate = serializers.IntegerField(read_only=True, allow_null=True)
    respiratory_rate = serializers.IntegerField(read_only=True, allow_null=True)
    temperature = serializers.DecimalField(read_only=True, allow_null=True, max_digits=4, decimal_places=1)
    vet_notes = serializers.CharField(read_only=True, allow_blank=True, allow_null=True)
    
    # === КЛИМАТ ===
    living_climate = serializers.CharField(read_only=True, allow_null=True)
    walk_frequency = serializers.CharField(read_only=True, allow_null=True)
    walk_duration = serializers.CharField(read_only=True, allow_null=True)
    
    # === СЛУЖЕБНЫЕ ПОЛЯ ===
    is_extended_profile = serializers.BooleanField(read_only=True)
    is_draft = serializers.BooleanField(read_only=True)
    draft_step = serializers.IntegerField(read_only=True, allow_null=True)
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
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.photo.url)
                return obj.photo.url
            except (ValueError, AttributeError):
                pass
        return None


# =============================================================================
# СЕРИАЛИЗАТОРЫ ДОПОЛНИТЕЛЬНЫХ МЕДИЦИНСКИХ ЗАПИСЕЙ
# =============================================================================

class VaccineListSerializer(serializers.ModelSerializer):
    """Сериализатор справочника вакцин (для списков)."""

    class Meta:
        model = Vaccine
        fields = [
            'code', 'name_ru', 'name_en', 'species', 'vaccine_type',
            'booster_interval_months'
        ]


class VaccineDetailSerializer(serializers.ModelSerializer):
    """Сериализатор справочника вакцин (для карточки)."""

    class Meta:
        model = Vaccine
        fields = [
            'code', 'name_ru', 'name_en', 'species', 'vaccine_type',
            'protects_against', 'first_vaccination_age_weeks',
            'booster_interval_months', 'is_mandatory',
            'contraindications', 'side_effects', 'notes', 'created_at'
        ]


class VaccineShortSerializer(serializers.ModelSerializer):
    """Короткий сериализатор для отображения в записях."""

    class Meta:
        model = Vaccine
        fields = ['code', 'name_ru', 'name_en', 'species']


class MedicationListSerializer(serializers.ModelSerializer):
    """Сериализатор справочника медикаментов (для списков)."""

    class Meta:
        model = Medication
        fields = ['code', 'name_trade', 'name_active', 'species', 'category', 'form']


class MedicationDetailSerializer(serializers.ModelSerializer):
    """Сериализатор справочника медикаментов (для карточки)."""

    class Meta:
        model = Medication
        fields = [
            'code', 'name_trade', 'name_active', 'category', 'form', 'species',
            'indications', 'contraindications', 'side_effects', 'dosage_info',
            'typical_frequency', 'typical_duration_days',
            'interactions', 'storage_conditions', 'notes', 'created_at'
        ]


class MedicationShortSerializer(serializers.ModelSerializer):
    """Короткий сериализатор для отображения в записях."""

    class Meta:
        model = Medication
        fields = ['code', 'name_trade', 'name_active', 'species']


class PetVaccinationSerializer(serializers.ModelSerializer):
    """Сериализатор вакцинаций питомца."""

    vaccine_detail = VaccineShortSerializer(source='vaccine_code', read_only=True)

    class Meta:
        model = PetVaccination
        fields = [
            'id', 'pet', 'vaccine_code', 'vaccine_detail',
            'date_administered', 'next_due_date',
            'manufacturer', 'batch_number', 'administered_by', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'pet']

    def validate(self, attrs):
        pet = self.context.get('pet')
        vaccine = attrs.get('vaccine_code')
        if pet and vaccine and vaccine.species not in (pet.species, 'both'):
            raise serializers.ValidationError(
                {'vaccine_code': 'Вакцина не соответствует виду питомца.'}
            )
        return attrs


class PetMedicationSerializer(serializers.ModelSerializer):
    """Сериализатор препаратов питомца."""

    medication_detail = MedicationShortSerializer(source='medication_code', read_only=True)

    class Meta:
        model = PetMedication
        fields = [
            'id', 'pet', 'medication_code', 'medication_detail',
            'medication_name', 'dosage', 'frequency',
            'start_date', 'end_date', 'prescribed_for', 'prescribing_vet',
            'notes', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'pet']

    def validate(self, attrs):
        pet = self.context.get('pet')
        medication = attrs.get('medication_code')
        if pet and medication and medication.species not in (pet.species, 'both'):
            raise serializers.ValidationError(
                {'medication_code': 'Препарат не соответствует виду питомца.'}
            )
        if medication and not attrs.get('medication_name'):
            attrs['medication_name'] = medication.name_trade
        return attrs


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
