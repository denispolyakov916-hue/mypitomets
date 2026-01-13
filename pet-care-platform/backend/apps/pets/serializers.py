"""
Сериализаторы для модуля управления питомцами (PetID)

Этот модуль содержит сериализаторы DRF для валидации и сериализации
данных питомцев. Обрабатывает операции создания и обновления питомцев.

Классы сериализаторов:
    - PetCreateSerializer: Валидация данных для создания нового питомца
    - PetUpdateSerializer: Валидация данных для обновления существующего питомца
    - PetSerializer: Сериализация данных питомца для API ответов

Допустимые виды животных:
    - dog (собака)
    - cat (кошка)
    - bird (птица)
    - rodent (грызун)
    - fish (рыбка)
    - reptile (рептилия)
    - other (другое)
"""

from rest_framework import serializers
from datetime import datetime

# Допустимые виды животных
SPECIES_CHOICES = [
    ('dog', 'Собака'),
    ('cat', 'Кошка'),
    ('bird', 'Птица'),
    ('rodent', 'Грызун'),
    ('fish', 'Рыбка'),
    ('reptile', 'Рептилия'),
    ('other', 'Другое'),
]

# Извлечение только ключей для валидации
VALID_SPECIES = [choice[0] for choice in SPECIES_CHOICES]


class PetCreateSerializer(serializers.Serializer):
    """
    Сериализатор для создания нового питомца.
    
    Валидирует все данные, необходимые для создания нового профиля питомца (PetID).
    Обязательные поля: name, species.
    Опциональные поля: breed, date_of_birth, weight.
    
    Поля:
        name (str): Кличка питомца - обязательное, 1-100 символов
        species (str): Вид животного - обязательное, одно из VALID_SPECIES
        breed (str): Порода - опционально, до 100 символов
        date_of_birth (str): Дата рождения в формате ISO (YYYY-MM-DD) - опционально
        weight (float): Вес в кг - опционально, положительное число
    
    Пример валидного ввода:
        {
            "name": "Барсик",
            "species": "cat",
            "breed": "Персидская",
            "date_of_birth": "2020-05-15",
            "weight": 5.2
        }
    
    Ошибки валидации:
        - name: пустое значение, превышение длины
        - species: невалидное значение
        - date_of_birth: неверный формат, дата в будущем
        - weight: отрицательное или нулевое значение
    """
    
    name = serializers.CharField(
        required=True,
        max_length=100,
        help_text="Кличка питомца (обязательно, до 100 символов)"
    )
    
    species = serializers.ChoiceField(
        required=True,
        choices=SPECIES_CHOICES,
        help_text="Вид животного (dog, cat, bird, rodent, fish, reptile, other)"
    )
    
    breed = serializers.CharField(
        required=False,
        max_length=100,
        allow_blank=True,
        allow_null=True,
        help_text="Порода питомца (опционально)"
    )
    
    date_of_birth = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Дата рождения в формате YYYY-MM-DD (опционально)"
    )
    
    weight = serializers.FloatField(
        required=False,
        allow_null=True,
        help_text="Вес в килограммах (опционально)"
    )
    
    gender = serializers.ChoiceField(
        required=False,
        choices=[('male', 'Самец'), ('female', 'Самка'), ('unknown', 'Не указан')],
        default='unknown',
        help_text="Пол питомца (опционально)"
    )
    
    is_neutered = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Кастрирован/Стерилизован (опционально)"
    )
    
    favorite_foods = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list,
        help_text="Список любимых продуктов/кормов (опционально)"
    )
    
    allergies = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list,
        help_text="Список аллергенов (опционально)"
    )

    # ===== ПОЛЯ ДЛЯ ПЕРСОНАЛИЗАЦИИ КУРСОВ =====

    # Базовые поля для персонализации (обязательные при создании)
    behavior_type = serializers.ChoiceField(
        required=False,  # Пока опционально, станет обязательным позже
        choices=[
            ('calm', 'Спокойный'),
            ('active', 'Активный'),
            ('aggressive', 'Агрессивный'),
            ('shy', 'Трусливый'),
            ('playful', 'Игривый'),
        ],
        allow_null=True,
        help_text="Тип поведения питомца для персонализации курсов"
    )

    social_level = serializers.ChoiceField(
        required=False,  # Пока опционально, станет обязательным позже
        choices=[
            ('home_only', 'Только домашний'),
            ('street', 'Уличный'),
            ('social', 'Социальный'),
            ('mixed', 'Смешанный'),
        ],
        allow_null=True,
        help_text="Уровень социализации питомца"
    )
    
    def validate_name(self, value):
        """
        Валидация клички питомца.
        
        Выполняет очистку и проверку клички:
        - Удаление пробелов по краям
        - Проверка на непустое значение
        
        Аргументы:
            value (str): Введённая кличка
            
        Возвращает:
            str: Очищенная кличка
            
        Исключения:
            ValidationError: Если кличка пустая после очистки
        """
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Кличка питомца обязательна")
        return value
    
    def validate_date_of_birth(self, value):
        """
        Валидация даты рождения питомца.
        
        Проверки:
        - Корректный формат ISO даты (YYYY-MM-DD)
        - Дата не в будущем
        
        Аргументы:
            value (str): Строка с датой
            
        Возвращает:
            str: Валидированная строка даты или None
            
        Исключения:
            ValidationError: Неверный формат или дата в будущем
        """
        if not value:
            return None
        
        try:
            date_obj = datetime.strptime(value, '%Y-%m-%d').date()
            
            # Проверка, что дата не в будущем
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
        """
        Валидация веса питомца.
        
        Проверки:
        - Вес должен быть положительным числом
        - Разумный диапазон (0.01 - 500 кг)
        
        Аргументы:
            value (float): Значение веса
            
        Возвращает:
            float: Валидированный вес или None
            
        Исключения:
            ValidationError: Если вес отрицательный или вне разумного диапазона
        """
        if value is None:
            return None
        
        if value <= 0:
            raise serializers.ValidationError(
                "Вес должен быть положительным числом"
            )
        
        if value > 500:
            raise serializers.ValidationError(
                "Вес не может превышать 500 кг"
            )
        
        return round(value, 2)

    # Новые поля PetID
    size = serializers.ChoiceField(
        choices=[
            ('small', 'Маленький (до 10 кг)'),
            ('medium', 'Средний (10-25 кг)'),
            ('large', 'Крупный (более 25 кг)'),
        ],
        required=False,
        allow_null=True,
        help_text="Размер питомца"
    )

    body_type = serializers.ChoiceField(
        choices=[
            ('slim', 'Недостаточный вес'),
            ('normal', 'Идеальный вес'),
            ('overweight', 'Избыточный вес'),
            ('obese', 'Ожирение'),
        ],
        required=False,
        allow_null=True,
        help_text="Тип телосложения"
    )

    activity_level = serializers.ChoiceField(
        choices=[
            ('low', 'Низкая'),
            ('medium', 'Средняя'),
            ('high', 'Высокая'),
        ],
        required=False,
        help_text="Уровень активности"
    )

    owner_phone = serializers.CharField(required=False, allow_blank=True, max_length=20, help_text="Телефон владельца")
    owner_email = serializers.EmailField(required=False, allow_blank=True, help_text="Email владельца")
    owner_city = serializers.CharField(required=False, allow_blank=True, max_length=100, help_text="Город владельца")

    # Расширенные поля для глубокой персонализации (опциональные)
    training_experience = serializers.ChoiceField(
        required=False,
        choices=[
            ('none', 'Без опыта'),
            ('basic', 'Базовый'),
            ('intermediate', 'Средний'),
            ('advanced', 'Продвинутый'),
            ('professional', 'Профессиональный'),
        ],
        allow_null=True,
        help_text="Уровень опыта дрессировки питомца"
    )

    special_needs = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list,
        help_text="Особые потребности питомца"
    )

    preferred_activities = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list,
        help_text="Предпочитаемые активности питомца"
    )

    behavioral_problems = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list,
        help_text="Поведенческие проблемы питомца"
    )

    health_issues = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list,
        help_text="Проблемы здоровья"
    )

    # Питание
    diet_type = serializers.ChoiceField(
        choices=[('dry', 'Сухой корм'), ('wet', 'Влажный корм'), ('mixed', 'Смешанное питание'),
                ('raw', 'Натуральное питание'), ('home', 'Домашняя еда')],
        required=False, allow_null=True, help_text="Тип питания"
    )
    feeding_frequency = serializers.ChoiceField(
        choices=[('1', '1 раз в день'), ('2', '2 раза в день'), ('3', '3 раза в день'), ('free', 'Свободный доступ')],
        required=False, allow_null=True, help_text="Частота кормления"
    )
    sensitive_digestion = serializers.BooleanField(required=False, default=False, help_text="Чувствительное пищеварение")
    excluded_ingredients = serializers.ListField(child=serializers.CharField(), required=False, default=list, help_text="Исключаемые ингредиенты")
    vitamins_supplements = serializers.CharField(required=False, allow_blank=True, help_text="Добавки и витамины")

    # Поведение
    character_traits = serializers.ListField(child=serializers.CharField(), required=False, default=list, help_text="Черты характера")
    training_goals = serializers.CharField(required=False, allow_blank=True, help_text="Цели дрессировки")

    # Здоровье
    chronic_conditions = serializers.CharField(required=False, allow_blank=True, help_text="Хронические заболевания")
    vaccinations = serializers.CharField(required=False, allow_blank=True, help_text="Вакцинации")
    medications = serializers.CharField(required=False, allow_blank=True, help_text="Принимаемые препараты")
    dental_health = serializers.ChoiceField(
        choices=[('excellent', 'Отличное'), ('good', 'Хорошее'), ('fair', 'Удовлетворительное'), ('needs_attention', 'Требует лечения')],
        required=False, allow_null=True, help_text="Состояние зубов"
    )
    vet_visits = serializers.CharField(required=False, allow_blank=True, help_text="Посещения ветеринара")

    # Образ жизни
    housing_type = serializers.ChoiceField(
        choices=[('apartment', 'Квартира'), ('house', 'Частный дом'), ('cottage', 'Дача/Коттедж'), ('other', 'Другое')],
        required=False, allow_null=True, help_text="Тип жилья"
    )
    has_yard = serializers.BooleanField(required=False, default=False, help_text="Есть двор")
    other_pets = serializers.CharField(required=False, allow_blank=True, help_text="Другие питомцы дома")
    has_children = serializers.BooleanField(required=False, default=False, help_text="В доме есть дети")
    walk_frequency = serializers.CharField(required=False, allow_blank=True, help_text="Частота прогулок")
    walk_duration = serializers.CharField(required=False, allow_blank=True, help_text="Длительность прогулки")


class PetUpdateSerializer(serializers.Serializer):
    """
    Сериализатор для обновления существующего питомца.
    
    Все поля опциональны для поддержки частичного обновления.
    Обновляются только предоставленные поля.
    
    Поля:
        name (str): Кличка питомца - опционально
        species (str): Вид животного - опционально
        breed (str): Порода - опционально
        date_of_birth (str): Дата рождения - опционально
        weight (float): Вес в кг - опционально
    
    Пример частичного обновления:
        {
            "weight": 5.8
        }
    
    Примечание:
        Если поле передано как null или пустая строка, оно будет
        обновлено соответствующим образом в хранилище.
    """
    
    name = serializers.CharField(
        required=False,
        max_length=100,
        allow_blank=False,
        allow_null=True,
        help_text="Новая кличка питомца"
    )
    
    species = serializers.ChoiceField(
        required=False,
        choices=SPECIES_CHOICES,
        allow_null=True,
        help_text="Новый вид животного"
    )
    
    breed = serializers.CharField(
        required=False,
        max_length=100,
        allow_blank=True,
        allow_null=True,
        help_text="Новая порода"
    )
    
    date_of_birth = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Новая дата рождения (YYYY-MM-DD)"
    )
    
    weight = serializers.FloatField(
        required=False,
        allow_null=True,
        help_text="Новый вес в килограммах"
    )
    
    gender = serializers.ChoiceField(
        required=False,
        choices=[('male', 'Самец'), ('female', 'Самка'), ('unknown', 'Не указан')],
        allow_null=True,
        help_text="Пол питомца"
    )
    
    is_neutered = serializers.BooleanField(
        required=False,
        allow_null=True,
        help_text="Кастрирован/Стерилизован"
    )
    
    favorite_foods = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        allow_null=True,
        help_text="Список любимых продуктов/кормов"
    )
    
    allergies = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        allow_null=True,
        help_text="Список аллергенов"
    )

    # ===== ПОЛЯ ДЛЯ ПЕРСОНАЛИЗАЦИИ КУРСОВ =====

    # Базовые поля для персонализации
    behavior_type = serializers.ChoiceField(
        required=False,
        choices=[
            ('calm', 'Спокойный'),
            ('active', 'Активный'),
            ('aggressive', 'Агрессивный'),
            ('shy', 'Трусливый'),
            ('playful', 'Игривый'),
        ],
        allow_null=True,
        help_text="Тип поведения питомца для персонализации курсов"
    )

    social_level = serializers.ChoiceField(
        required=False,
        choices=[
            ('home_only', 'Только домашний'),
            ('street', 'Уличный'),
            ('social', 'Социальный'),
            ('mixed', 'Смешанный'),
        ],
        allow_null=True,
        help_text="Уровень социализации питомца"
    )

    # Расширенные поля для глубокой персонализации
    training_experience = serializers.ChoiceField(
        required=False,
        choices=[
            ('none', 'Без опыта'),
            ('basic', 'Базовый'),
            ('intermediate', 'Средний'),
            ('advanced', 'Продвинутый'),
            ('professional', 'Профессиональный'),
        ],
        allow_null=True,
        help_text="Уровень опыта дрессировки питомца"
    )

    special_needs = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        allow_null=True,
        help_text="Особые потребности питомца"
    )

    preferred_activities = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        allow_null=True,
        help_text="Предпочитаемые активности питомца"
    )

    behavioral_problems = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        allow_null=True,
        help_text="Поведенческие проблемы питомца"
    )

    # Новые поля PetID
    size = serializers.ChoiceField(
        choices=[
            ('small', 'Маленький (до 10 кг)'),
            ('medium', 'Средний (10-25 кг)'),
            ('large', 'Крупный (более 25 кг)'),
        ],
        required=False,
        allow_null=True,
        help_text="Размер питомца"
    )

    body_type = serializers.ChoiceField(
        choices=[
            ('slim', 'Недостаточный вес'),
            ('normal', 'Идеальный вес'),
            ('overweight', 'Избыточный вес'),
            ('obese', 'Ожирение'),
        ],
        required=False,
        allow_null=True,
        help_text="Тип телосложения"
    )

    activity_level = serializers.ChoiceField(
        choices=[
            ('low', 'Низкая'),
            ('medium', 'Средняя'),
            ('high', 'Высокая'),
        ],
        required=False,
        help_text="Уровень активности"
    )

    owner_phone = serializers.CharField(required=False, allow_blank=True, max_length=20, help_text="Телефон владельца")
    owner_email = serializers.EmailField(required=False, allow_blank=True, help_text="Email владельца")
    owner_city = serializers.CharField(required=False, allow_blank=True, max_length=100, help_text="Город владельца")

    # Новые поля PetID - полные данные
    # Физические параметры (уже есть: size, body_type)

    # Питание
    diet_type = serializers.ChoiceField(
        choices=[('dry', 'Сухой корм'), ('wet', 'Влажный корм'), ('mixed', 'Смешанное питание'),
                ('raw', 'Натуральное питание'), ('home', 'Домашняя еда')],
        required=False, allow_null=True, help_text="Тип питания"
    )
    feeding_frequency = serializers.ChoiceField(
        choices=[('1', '1 раз в день'), ('2', '2 раза в день'), ('3', '3 раза в день'), ('free', 'Свободный доступ')],
        required=False, allow_null=True, help_text="Частота кормления"
    )
    sensitive_digestion = serializers.BooleanField(required=False, default=False, help_text="Чувствительное пищеварение")
    excluded_ingredients = serializers.ListField(child=serializers.CharField(), required=False, default=list, help_text="Исключаемые ингредиенты")
    vitamins_supplements = serializers.CharField(required=False, allow_blank=True, help_text="Добавки и витамины")

    # Поведение
    character_traits = serializers.ListField(child=serializers.CharField(), required=False, default=list, help_text="Черты характера")
    training_goals = serializers.CharField(required=False, allow_blank=True, help_text="Цели дрессировки")
    behavioral_problems = serializers.ListField(child=serializers.CharField(), required=False, default=list, help_text="Поведенческие проблемы")

    # Здоровье
    chronic_conditions = serializers.CharField(required=False, allow_blank=True, help_text="Хронические заболевания")
    vaccinations = serializers.CharField(required=False, allow_blank=True, help_text="Вакцинации")
    medications = serializers.CharField(required=False, allow_blank=True, help_text="Принимаемые препараты")
    dental_health = serializers.ChoiceField(
        choices=[('excellent', 'Отличное'), ('good', 'Хорошее'), ('fair', 'Удовлетворительное'), ('needs_attention', 'Требует лечения')],
        required=False, allow_null=True, help_text="Состояние зубов"
    )
    vet_visits = serializers.CharField(required=False, allow_blank=True, help_text="Посещения ветеринара")

    # Образ жизни
    housing_type = serializers.ChoiceField(
        choices=[('apartment', 'Квартира'), ('house', 'Частный дом'), ('cottage', 'Дача/Коттедж'), ('other', 'Другое')],
        required=False, allow_null=True, help_text="Тип жилья"
    )
    has_yard = serializers.BooleanField(required=False, default=False, help_text="Есть двор")
    other_pets = serializers.CharField(required=False, allow_blank=True, help_text="Другие питомцы дома")
    has_children = serializers.BooleanField(required=False, default=False, help_text="В доме есть дети")
    walk_frequency = serializers.CharField(required=False, allow_blank=True, help_text="Частота прогулок")
    walk_duration = serializers.CharField(required=False, allow_blank=True, help_text="Длительность прогулки")

    def validate_name(self, value):
        """Валидация клички при обновлении."""
        if value is None:
            return None
        
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Кличка не может быть пустой")
        return value
    
    def validate_date_of_birth(self, value):
        """Валидация даты рождения при обновлении."""
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
        """Валидация веса при обновлении."""
        if value is None:
            return None
        
        if value <= 0:
            raise serializers.ValidationError(
                "Вес должен быть положительным числом"
            )
        
        if value > 500:
            raise serializers.ValidationError(
                "Вес не может превышать 500 кг"
            )
        
        return round(value, 2)

    # Новые поля PetID - полные данные для PetUpdateSerializer
    # Физические параметры (уже есть: size, body_type)

    # Питание
    diet_type = serializers.ChoiceField(
        choices=[('dry', 'Сухой корм'), ('wet', 'Влажный корм'), ('mixed', 'Смешанное питание'),
                ('raw', 'Натуральное питание'), ('home', 'Домашняя еда')],
        required=False, allow_null=True, help_text="Тип питания"
    )
    feeding_frequency = serializers.ChoiceField(
        choices=[('1', '1 раз в день'), ('2', '2 раза в день'), ('3', '3 раза в день'), ('free', 'Свободный доступ')],
        required=False, allow_null=True, help_text="Частота кормления"
    )
    sensitive_digestion = serializers.BooleanField(required=False, default=False, help_text="Чувствительное пищеварение")
    excluded_ingredients = serializers.ListField(child=serializers.CharField(), required=False, default=list, help_text="Исключаемые ингредиенты")
    vitamins_supplements = serializers.CharField(required=False, allow_blank=True, help_text="Добавки и витамины")

    # Поведение
    character_traits = serializers.ListField(child=serializers.CharField(), required=False, default=list, help_text="Черты характера")
    training_goals = serializers.CharField(required=False, allow_blank=True, help_text="Цели дрессировки")

    # Здоровье
    chronic_conditions = serializers.CharField(required=False, allow_blank=True, help_text="Хронические заболевания")
    vaccinations = serializers.CharField(required=False, allow_blank=True, help_text="Вакцинации")
    medications = serializers.CharField(required=False, allow_blank=True, help_text="Принимаемые препараты")
    dental_health = serializers.ChoiceField(
        choices=[('excellent', 'Отличное'), ('good', 'Хорошее'), ('fair', 'Удовлетворительное'), ('needs_attention', 'Требует лечения')],
        required=False, allow_null=True, help_text="Состояние зубов"
    )
    vet_visits = serializers.CharField(required=False, allow_blank=True, help_text="Посещения ветеринара")

    # Образ жизни
    housing_type = serializers.ChoiceField(
        choices=[('apartment', 'Квартира'), ('house', 'Частный дом'), ('cottage', 'Дача/Коттедж'), ('other', 'Другое')],
        required=False, allow_null=True, help_text="Тип жилья"
    )
    has_yard = serializers.BooleanField(required=False, default=False, help_text="Есть двор")
    other_pets = serializers.CharField(required=False, allow_blank=True, help_text="Другие питомцы дома")
    has_children = serializers.BooleanField(required=False, default=False, help_text="В доме есть дети")
    walk_frequency = serializers.CharField(required=False, allow_blank=True, help_text="Частота прогулок")
    walk_duration = serializers.CharField(required=False, allow_blank=True, help_text="Длительность прогулки")


class PetSerializer(serializers.Serializer):
    """
    Сериализатор для вывода данных питомца в API ответах.
    
    Используется для сериализации объектов питомца при возврате данных клиенту.
    Все поля только для чтения.
    
    Поля:
        id (str): Уникальный идентификатор питомца (UUIDv7)
        owner_id (str): UUIDv7 ID владельца питомца
        name (str): Кличка питомца
        species (str): Вид животного
        breed (str): Порода
        date_of_birth (str): Дата рождения
        weight (float): Вес в кг
        created_at (str): Дата создания профиля
        updated_at (str): Дата последнего обновления
        
    Заметка по идентификаторам:
        Используется UUIDv7 - сортируемый по времени UUID, обеспечивающий
        глобальную уникальность и оптимальную производительность индексов в PostgreSQL.
    """
    
    id = serializers.CharField(read_only=True, help_text="UUIDv7 идентификатор питомца")
    owner_id = serializers.CharField(read_only=True, help_text="UUIDv7 идентификатор владельца")
    name = serializers.CharField(read_only=True)
    species = serializers.CharField(read_only=True)
    breed = serializers.CharField(read_only=True, allow_null=True)
    date_of_birth = serializers.CharField(read_only=True, allow_null=True)
    weight = serializers.FloatField(read_only=True, allow_null=True)
    gender = serializers.CharField(read_only=True)
    is_neutered = serializers.BooleanField(read_only=True)
    photo = serializers.CharField(read_only=True, allow_null=True)
    favorite_foods = serializers.ListField(child=serializers.CharField(), read_only=True)
    allergies = serializers.ListField(child=serializers.CharField(), read_only=True)
    created_at = serializers.CharField(read_only=True)
    updated_at = serializers.CharField(read_only=True)

    # ===== ПОЛЯ ДЛЯ ПЕРСОНАЛИЗАЦИИ КУРСОВ =====
    behavior_type = serializers.CharField(read_only=True, allow_null=True)
    social_level = serializers.CharField(read_only=True, allow_null=True)
    training_experience = serializers.CharField(read_only=True, allow_null=True)
    special_needs = serializers.ListField(child=serializers.CharField(), read_only=True)
    preferred_activities = serializers.ListField(child=serializers.CharField(), read_only=True)
    behavioral_problems = serializers.ListField(child=serializers.CharField(), read_only=True)
    is_extended_profile = serializers.BooleanField(read_only=True)
