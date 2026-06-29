"""
Модели для профилей питомцев (PetID)

PetID - центральная сущность платформы Питомец+.
Содержит всю информацию о питомце.
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.postgres.fields import ArrayField
from core.utils import generate_uuid7
from core.validators import validate_string_list


class Pet(models.Model):
    """
    Модель профиля питомца - ядро системы PetID.
    
    Хранит всю базовую информацию о питомце, которая используется
    во всех модулях платформы (рекомендации магазина, события календаря и т.д.)
    
    Принципы работы (по документации Integration_PetID_Breeds_Calculator.md):
    1. Минимальный ввод — пользователь заполняет только базовые поля (Этап 1)
    2. Автозаполнение — сервис дополняет поля из данных о породе
    3. Редактирование — пользователь может уточнить любое автозаполненное поле (Этап 2)
    4. Расчёт всегда — калькулятор работает с любым объёмом данных
    """
    
    # === ENUM-ТИПЫ ПО ДОКУМЕНТАЦИИ ===
    
    SPECIES_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
    ]
    
    SEX_CHOICES = [
        ('male', 'Самец'),
        ('female', 'Самка'),
    ]
    
    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False,
        help_text="UUIDv7 идентификатор питомца"
    )
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pets',
        verbose_name='Владелец',
        help_text="Владелец питомца"
    )
    
    name = models.CharField(
        max_length=100,
        verbose_name='Кличка',
        help_text="Кличка питомца"
    )
    
    species = models.CharField(
        max_length=50,
        choices=SPECIES_CHOICES,
        verbose_name='Вид',
        help_text="Вид животного (собака, кошка, птица и т.д.)"
    )
    
    breed = models.ForeignKey(
        'pets.Breed',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pets',
        verbose_name='Порода',
        help_text="Порода из справочника"
    )
    
    date_of_birth = models.DateField(
        null=True,
        blank=True,
        verbose_name='Дата рождения',
        help_text="Дата рождения для расчёта возраста и календаря"
    )
    
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Вес (кг)',
        help_text="Вес в кг для рекомендаций по питанию"
    )
    
    # Дополнительные поля базового паспорта (Этап 1)
    sex = models.CharField(
        max_length=10,
        choices=SEX_CHOICES,
        default='male',
        verbose_name='Пол',
        help_text='Пол питомца: male / female'
    )
    is_neutered = models.BooleanField(default=False, verbose_name='Кастрирован/Стерилизован')
    is_mixed_breed = models.BooleanField(default=False, verbose_name='Метис / беспородный')
    photo = models.ImageField(
        upload_to='pets/photos/',
        blank=True,
        null=True,
        verbose_name='Фото'
    )
    
    # === СВЯЗИ M2M (через отдельные таблицы в nutrition_models.py) ===
    # Аллергии: PetAllergy (pet_id → allergy_id)
    # Заболевания: PetHealthCondition (pet_id → condition_id)
    # Исключения продуктов: PetFoodExclusion (pet_id → excluded_item)
    
    # Активность питомца
    ACTIVITY_LEVELS = [
        ('very_low', 'Очень низкая'),
        ('low', 'Низкая'),
        ('moderate', 'Умеренная'),
        ('high', 'Высокая'),
        ('very_high', 'Очень высокая'),
    ]
    activity_level = models.CharField(
        max_length=15,
        choices=ACTIVITY_LEVELS,
        default='moderate',
        verbose_name='Уровень активности',
        help_text='Уровень физической активности питомца'
    )
    
    # ===== ПОЛЯ ДЛЯ КАЛЬКУЛЯТОРА ПИТАНИЯ =====
    COAT_TYPE_CHOICES = [
        ('hairless', 'Бесшёрстный'),
        ('short', 'Короткая'),
        ('medium', 'Средняя'),
        ('long', 'Длинная'),
        ('double', 'Двойная (с подшёрстком)'),
        ('wire', 'Жёсткая'),
        ('curly', 'Курчавая'),
    ]
    coat_type = models.CharField(
        max_length=15,
        choices=COAT_TYPE_CHOICES,
        blank=True,
        null=True,
        verbose_name='Тип шерсти',
        help_text='Автозаполняется из породы или указывается вручную для дворняг'
    )
    
    ideal_weight_kg = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Идеальный вес (кг)',
        help_text='Рассчитывается из породы или указывается вручную'
    )
    
    # === РЕПРОДУКЦИЯ (Этап 2, условно) ===
    
    neutering_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Дата кастрации/стерилизации',
        help_text='Дата операции (если is_neutered=True)'
    )
    
    REPRODUCTIVE_STATE_CHOICES = [
        ('none', 'Обычное состояние'),
        ('heat', 'Течка'),
        ('pregnant', 'Беременность'),
        ('lactating', 'Лактация'),
    ]
    reproductive_state = models.CharField(
        max_length=15,
        choices=REPRODUCTIVE_STATE_CHOICES,
        default='none',
        verbose_name='Репродуктивное состояние',
        help_text='Только для некастрированных самок'
    )
    
    pregnancy_week = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name='Неделя беременности',
        help_text='Неделя беременности (1-9), если reproductive_state=pregnant'
    )
    
    litter_size = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name='Количество детёнышей',
        help_text='Для расчёта калорий при лактации'
    )
    
    lactation_week = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name='Неделя лактации',
        help_text='Неделя лактации, если reproductive_state=lactating'
    )
    
    CLIMATE_CHOICES = [
        ('hot', 'Жаркий'),
        ('warm', 'Тёплый'),
        ('cool', 'Прохладный'),
        ('cold', 'Холодный'),
        ('very_cold', 'Очень холодный'),
    ]
    living_climate = models.CharField(
        max_length=15,
        choices=CLIMATE_CHOICES,
        default='warm',
        verbose_name='Климат проживания'
    )

    # ===== ПЕРСОНАЛИЗАЦИЯ ДЛЯ КУРСОВ ОБУЧЕНИЯ =====

    # Базовые поля для персонализации курсов (обязательные)
    BEHAVIOR_TYPES = [
        ('calm', 'Спокойный'),
        ('active', 'Активный'),
        ('aggressive', 'Агрессивный'),
        ('shy', 'Трусливый'),
        ('playful', 'Игривый'),
    ]
    behavior_type = models.CharField(
        max_length=20,
        choices=BEHAVIOR_TYPES,
        blank=True,
        null=True,
        verbose_name='Тип поведения',
        help_text='Основной тип поведения питомца для персонализации курсов'
    )

    SOCIAL_LEVELS = [
        ('antisocial', 'Избегает контактов'),
        ('reserved', 'Сдержанный'),
        ('friendly', 'Дружелюбный'),
        ('very_social', 'Очень общительный'),
    ]
    social_level = models.CharField(
        max_length=20,
        choices=SOCIAL_LEVELS,
        blank=True,
        null=True,
        verbose_name='Уровень социализации',
        help_text='Уровень социализации питомца (Этап 2)'
    )
    
    # Темперамент по документации
    TEMPERAMENT_CHOICES = [
        ('calm', 'Спокойный'),
        ('balanced', 'Уравновешенный'),
        ('active', 'Активный'),
        ('hyperactive', 'Гиперактивный'),
    ]
    temperament = models.CharField(
        max_length=20,
        choices=TEMPERAMENT_CHOICES,
        blank=True,
        null=True,
        verbose_name='Темперамент',
        help_text='Темперамент питомца (Этап 2)'
    )

    # === ПОВЕДЕНЧЕСКИЕ ПРОБЛЕМЫ (ENUM массив по документации) ===
    # Хранится как JSONField с валидацией по allowed values
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
    behavioral_problems = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Поведенческие проблемы',
        help_text='Массив кодов проблем из BEHAVIORAL_PROBLEM_CHOICES'
    )

    # ===== АВТОЗАПОЛНЯЕМЫЕ ПОЛЯ (Триггер/Сервис) =====

    # Категория размера — по документации 5 значений
    SIZE_CATEGORY_CHOICES = [
        ('toy', 'Той (до 5 кг)'),
        ('small', 'Маленький (5-10 кг)'),
        ('medium', 'Средний (10-25 кг)'),
        ('large', 'Крупный (25-45 кг)'),
        ('giant', 'Гигантский (более 45 кг)'),
    ]
    size_category = models.CharField(
        max_length=20, 
        choices=SIZE_CATEGORY_CHOICES, 
        blank=True, 
        null=True, 
        verbose_name='Категория размера',
        help_text='Автозаполняется из породы или рассчитывается по весу/возрасту'
    )

    # ===== РАСШИРЕННОЕ ПИТАНИЕ =====
    DIET_TYPE_CHOICES = [
        ('dry', 'Сухой корм'),
        ('wet', 'Влажный корм'),
        ('mixed', 'Смешанное питание'),
        ('raw', 'Натуральное питание'),
        ('homemade', 'Домашняя еда'),
    ]
    diet_type = models.CharField(max_length=20, choices=DIET_TYPE_CHOICES, blank=True, null=True, verbose_name='Тип питания')

    feeding_frequency = models.PositiveSmallIntegerField(
        blank=True,
        null=True,
        validators=[MinValueValidator(1), MaxValueValidator(6)],
        verbose_name='Частота кормления'
    )

    sensitive_digestion = models.BooleanField(default=False, verbose_name='Чувствительное пищеварение')
    # Исключаемые ингредиенты → M2M таблица PetFoodExclusion
    
    # Текущий корм (структура по документации)
    current_food = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Текущий корм',
        help_text='{"source": "catalog"|"other", "food_id": "uuid", "brand_name": "", "product_name": "", "daily_amount_grams": 250}'
    )

    # ===== ЗДОРОВЬЕ (Этап 2) =====
    # Хронические заболевания → M2M таблица PetHealthCondition
    chronic_conditions_notes = models.TextField(
        blank=True,
        verbose_name='Дополнительные заметки по здоровью',
        help_text='Свободный текст для дополнительных заметок врача/владельца'
    )
    # last_vet_visit, body_condition_score и др. → секция "ДАННЫЕ ВЕТЕРИНАРНОГО ОСМОТРА"
    # Вакцинации и препараты — Phase 2 (extended-features-specification.md)

    # ===== ЖИЛЬЁ И УСЛОВИЯ (Этап 2) =====
    HOUSING_TYPE_CHOICES = [
        ('apartment', 'Квартира'),
        ('house', 'Частный дом'),
        ('farm', 'Ферма/сельская местность'),
        ('outdoor', 'Вольерное содержание'),
    ]
    housing_type = models.CharField(max_length=20, choices=HOUSING_TYPE_CHOICES, blank=True, null=True, verbose_name='Тип жилья')
    
    has_yard = models.BooleanField(default=False, verbose_name='Есть двор', help_text='Зависит от housing_type')
    
    YARD_SIZE_CHOICES = [
        ('small', 'Маленький (до 100 м²)'),
        ('medium', 'Средний (100-500 м²)'),
        ('large', 'Большой (более 500 м²)'),
    ]
    yard_size = models.CharField(
        max_length=20, 
        choices=YARD_SIZE_CHOICES, 
        blank=True, 
        null=True, 
        verbose_name='Размер двора',
        help_text='Отображается только если has_yard=True'
    )
    
    has_children = models.BooleanField(default=False, verbose_name='Есть дети в доме')
    has_other_pets = models.BooleanField(default=False, verbose_name='Есть другие питомцы')
    # Детали других питомцев хранятся в M2M таблице pet_other_pets
    
    WALK_FREQUENCY_CHOICES = [
        ('none', 'Не гуляет'),
        ('1_day', '1 раз в день'),
        ('2_day', '2 раза в день'),
        ('3_day', '3 раза в день'),
        ('4_plus', '4+ раз в день'),
        ('free_access', 'Свободный выгул'),
    ]
    walk_frequency = models.CharField(
        max_length=20, 
        choices=WALK_FREQUENCY_CHOICES, 
        blank=True, 
        null=True, 
        verbose_name='Частота прогулок'
    )
    
    WALK_DURATION_CHOICES = [
        ('under_15', 'Менее 15 минут'),
        ('15_30', '15-30 минут'),
        ('30_60', '30-60 минут'),
        ('60_90', '1-1.5 часа'),
        ('90_120', '1.5-2 часа'),
        ('over_120', 'Более 2 часов'),
    ]
    walk_duration = models.CharField(
        max_length=20, 
        choices=WALK_DURATION_CHOICES, 
        blank=True, 
        null=True, 
        verbose_name='Длительность прогулки'
    )
    
    # ===== ДАННЫЕ ВЕТЕРИНАРНОГО ОСМОТРА =====
    last_vet_visit = models.DateField(
        null=True, 
        blank=True, 
        verbose_name='Дата последнего осмотра'
    )
    
    BODY_CONDITION_SCORE_CHOICES = [(str(i), f'{i} - ' + {
        1: 'Истощение', 2: 'Очень худой', 3: 'Худой', 
        4: 'Недостаток веса', 5: 'Идеальный вес', 6: 'Избыток веса',
        7: 'Полнота', 8: 'Ожирение', 9: 'Тяжёлое ожирение'
    }[i]) for i in range(1, 10)]
    body_condition_score = models.PositiveSmallIntegerField(
        blank=True,
        null=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name='Оценка упитанности (BCS)',
        help_text='Шкала от 1 до 9'
    )
    
    heart_rate = models.PositiveIntegerField(
        null=True, 
        blank=True, 
        verbose_name='ЧСС (уд/мин)',
        help_text='Частота сердечных сокращений'
    )
    respiratory_rate = models.PositiveIntegerField(
        null=True, 
        blank=True, 
        verbose_name='ЧДД (дых/мин)',
        help_text='Частота дыхательных движений'
    )
    temperature = models.DecimalField(
        max_digits=4, 
        decimal_places=1, 
        null=True, 
        blank=True, 
        verbose_name='Температура (°C)'
    )
    vet_notes = models.TextField(
        blank=True, 
        verbose_name='Заметки ветеринара',
        help_text='Дополнительные наблюдения и рекомендации врача'
    )

    # Флаг заполненности расширенного профиля
    is_extended_profile = models.BooleanField(
        default=False,
        verbose_name='Расширенный профиль заполнен',
        help_text='Показывает, заполнены ли расширенные поля профиля PetID'
    )

    # Черновики профиля (для частичного сохранения)
    is_draft = models.BooleanField(
        default=False,
        verbose_name='Черновик профиля',
        help_text='Флаг незавершенного профиля PetID'
    )
    draft_step = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name='Шаг черновика',
        help_text='Последний шаг заполнения для продолжения'
    )
    
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Дата создания',
        help_text="Когда был создан профиль питомца"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления',
        help_text="Временная метка последнего изменения"
    )
    
    class Meta:
        verbose_name = 'Питомец'
        verbose_name_plural = 'Питомцы'
        db_table = 'pets'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', '-created_at']),
            models.Index(fields=['species']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_species_display()})"
    
    # ===== ВЫЧИСЛЯЕМЫЕ СВОЙСТВА PetID =====
    
    @property
    def age(self):
        """Возраст питомца в годах (вычисляется из date_of_birth)."""
        if not self.date_of_birth:
            return None
        from datetime import date
        today = date.today()
        age = today.year - self.date_of_birth.year
        # Проверяем, был ли уже день рождения в этом году
        if today.month < self.date_of_birth.month or \
           (today.month == self.date_of_birth.month and today.day < self.date_of_birth.day):
            age -= 1
        return max(0, age)
    
    @property
    def age_months(self):
        """Возраст питомца в месяцах (для щенков/котят)."""
        if not self.date_of_birth:
            return None
        from datetime import date
        today = date.today()
        months = (today.year - self.date_of_birth.year) * 12 + today.month - self.date_of_birth.month
        if today.day < self.date_of_birth.day:
            months -= 1
        return max(0, months)
    
    @property
    def age_category(self):
        """Категория возраста: puppy/kitten, adult, senior."""
        age = self.age
        if age is None:
            return None
        
        if self.species == 'dog':
            if age < 1:
                return 'puppy'
            elif age >= 7:
                return 'senior'
            else:
                return 'adult'
        elif self.species == 'cat':
            if age < 1:
                return 'kitten'
            elif age >= 10:
                return 'senior'
            else:
                return 'adult'
        else:
            # Для других видов
            if age < 1:
                return 'young'
            elif age >= 7:
                return 'senior'
            else:
                return 'adult'
    
    @property
    def calculated_size_category(self):
        """
        Автоматический расчёт категории размера по весу и возрасту.
        По документации: toy (<5кг), small (5-10), medium (10-25), large (25-45), giant (>45)
        """
        if not self.weight:
            return self.size_category  # Возвращаем заданную категорию
        
        weight = float(self.weight)
        age_months = self.age_months or 24  # По умолчанию взрослый
        
        if self.species == 'dog':
            # Для щенков корректируем ожидаемый взрослый размер
            if age_months < 12:
                # Грубая оценка: щенок в 6 мес = ~60% взрослого веса
                estimated_adult_weight = weight * (24 / max(age_months, 3))
                weight = estimated_adult_weight
            
            if weight < 5:
                return 'toy'
            elif weight < 10:
                return 'small'
            elif weight < 25:
                return 'medium'
            elif weight < 45:
                return 'large'
            else:
                return 'giant'
        elif self.species == 'cat':
            # Кошки: small (<4кг), medium (4-6кг), large (>6кг)
            if weight < 4:
                return 'small'
            elif weight < 6:
                return 'medium'
            else:
                return 'large'
        return self.size_category
    
    @property
    def breed_display_name(self):
        """Отображаемое название породы с учётом метисов/беспородных."""
        if self.breed:
            return self.breed.name
        if self.is_mixed_breed:
            return 'Дворняга / Метис' if self.species == 'dog' else 'Беспородная / Метис'
        return None

    @property
    def profile_completeness(self):
        """
        Процент заполненности профиля (0-100).
        Базовый профиль (Этап 1) = 60%, Расширенный профиль (Этап 2) = 40%
        """
        # Обязательные поля базового профиля (Этап 1)
        required_fields = [
            self.name,
            self.species,
            self.date_of_birth,
            # Требование породы выполнено, если выбрана порода ИЛИ отмечен метис/беспородный
            (self.breed_id is not None) or self.is_mixed_breed,
            self.weight,
            self.sex,  # Обязательное поле
            self.is_neutered is not None,
        ]
        
        # Автозаполняемые поля (из породы или расчёт)
        autofill_fields = [
            self.size_category,
            self.coat_type,
            self.activity_level,
        ]
        
        # Расширенные поля (Этап 2) - опциональные
        extended_fields = [
            self.housing_type,
            self.diet_type,
            self.temperament,
            self.social_level,
            bool(self.photo),
        ]
        
        # Расчёт заполненности
        required_filled = sum(1 for f in required_fields if f)
        autofill_filled = sum(1 for f in autofill_fields if f)
        extended_filled = sum(1 for f in extended_fields if f)
        
        # Веса категорий
        required_weight = 60  # 60% за базовый профиль (Этап 1)
        autofill_weight = 20  # 20% за автозаполняемые поля
        extended_weight = 20  # 20% за расширенный профиль (Этап 2)
        
        required_score = (required_filled / max(len(required_fields), 1)) * required_weight
        autofill_score = (autofill_filled / max(len(autofill_fields), 1)) * autofill_weight
        extended_score = (extended_filled / max(len(extended_fields), 1)) * extended_weight
        
        total = required_score + autofill_score + extended_score
        return min(100, int(total))
    
    def to_dict(self):
        """
        Сериализация для API.
        Структура соответствует документации Integration_PetID_Breeds_Calculator.md
        """
        # Обработка date_of_birth
        dob = None
        if self.date_of_birth:
            if hasattr(self.date_of_birth, 'isoformat'):
                dob = self.date_of_birth.isoformat()
            else:
                dob = str(self.date_of_birth)
        
        # Обработка фото
        photo_url = None
        if self.photo:
            try:
                photo_url = self.photo.url
            except (ValueError, AttributeError):
                photo_url = None
        
        return {
            # === ИДЕНТИФИКАЦИЯ ===
            'id': str(self.id),
            'user_id': str(self.owner_id),  # По документации user_id
            'name': self.name,
            'species': self.species,
            'breed_id': self.breed_id,
            'breed_name': self.breed.name if self.breed else None,
            'photo': photo_url,
            
            # === БАЗОВЫЕ ДАННЫЕ (Этап 1) ===
            'date_of_birth': dob,
            'sex': self.sex,
            'weight_kg': float(self.weight) if self.weight is not None else None,
            'is_neutered': self.is_neutered,
            
            # === АВТОЗАПОЛНЯЕМЫЕ ПОЛЯ (Триггер) ===
            'size_category': self.size_category,
            'coat_type': self.coat_type,
            'ideal_weight_kg': float(self.ideal_weight_kg) if self.ideal_weight_kg else None,
            'body_condition_score': self.body_condition_score,
            'activity_level': self.activity_level,
            
            # === ЖИЛЬЁ И УСЛОВИЯ (Этап 2) ===
            'housing_type': self.housing_type,
            'has_yard': self.has_yard,
            'yard_size': self.yard_size,
            'has_children': self.has_children,
            'has_other_pets': self.has_other_pets,
            
            # === ПИТАНИЕ (Этап 2) ===
            'diet_type': self.diet_type,
            'feeding_frequency': self.feeding_frequency,
            'current_food': self.current_food if self.current_food else None,
            'sensitive_digestion': self.sensitive_digestion,
            
            # === РЕПРОДУКЦИЯ (Этап 2) ===
            'neutering_date': self.neutering_date.isoformat() if self.neutering_date else None,
            'reproductive_state': self.reproductive_state,
            'pregnancy_week': self.pregnancy_week,
            'litter_size': self.litter_size,
            'lactation_week': self.lactation_week,
            
            # === ПОВЕДЕНИЕ (Этап 2) ===
            'temperament': self.temperament,
            'social_level': self.social_level,
            
            # === ЗДОРОВЬЕ (Этап 2) ===
            'chronic_conditions_notes': self.chronic_conditions_notes,
            'last_vet_visit': self.last_vet_visit.isoformat() if self.last_vet_visit else None,
            
            # === КЛИМАТ ===
            'living_climate': self.living_climate,
            
            # === СЛУЖЕБНЫЕ ПОЛЯ ===
            'is_extended_profile': self.is_extended_profile,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            
            # === ВЫЧИСЛЯЕМЫЕ ПОЛЯ ===
            'age': self.age,
            'age_months': self.age_months,
            'age_category': self.age_category,
            'calculated_size_category': self.calculated_size_category,
            'profile_completeness': self.profile_completeness,
        }


# ============================================================================
# ДОПОЛНИТЕЛЬНЫЕ ТАБЛИЦЫ PetID (M2M/History) ПО ТЗ
# ============================================================================

class Vaccine(models.Model):
    """Справочник вакцин для собак и кошек."""

    SPECIES_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
        ('both', 'Оба'),
    ]

    VACCINE_TYPE_CHOICES = [
        ('live', 'Live (живые)'),
        ('inactivated', 'Inactivated (инактивированные)'),
        ('recombinant', 'Recombinant (рекомбинантные)'),
    ]

    code = models.CharField(max_length=50, primary_key=True, verbose_name='Код вакцины')
    name_ru = models.CharField(max_length=200, verbose_name='Название (рус)')
    name_en = models.CharField(max_length=200, blank=True, verbose_name='Название (англ)')
    species = models.CharField(max_length=10, choices=SPECIES_CHOICES, verbose_name='Вид')
    vaccine_type = models.CharField(max_length=20, choices=VACCINE_TYPE_CHOICES, verbose_name='Тип вакцины')
    protects_against = models.TextField(verbose_name='От каких заболеваний')
    first_vaccination_age_weeks = models.PositiveIntegerField(verbose_name='Возраст первой вакцинации (недели)')
    booster_interval_months = models.PositiveIntegerField(verbose_name='Интервал ревакцинации (месяцы)')
    is_mandatory = models.BooleanField(default=False, verbose_name='Обязательная')
    contraindications = models.TextField(blank=True, verbose_name='Противопоказания')
    side_effects = models.TextField(blank=True, verbose_name='Побочные эффекты')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vaccines'
        ordering = ['species', 'name_ru']

    def __str__(self):
        return f"{self.name_ru} ({self.code})"


class Medication(models.Model):
    """Справочник медикаментов для собак и кошек."""

    SPECIES_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
        ('both', 'Оба'),
    ]

    CATEGORY_CHOICES = [
        ('antiparasitic', 'Антипаразитарные'),
        ('antihistamine', 'Антигистаминные'),
        ('antibiotic', 'Антибиотики'),
        ('nsaid', 'НПВС'),
        ('analgesic', 'Обезболивающие'),
        ('cardiac', 'Сердечные'),
        ('gastrointestinal', 'ЖКТ'),
        ('dermatological', 'Дерматологические'),
        ('ophthalmic', 'Офтальмологические'),
        ('hormonal', 'Гормональные'),
        ('immunosuppressant', 'Иммунодепрессанты'),
        ('supplement', 'Добавки'),
        ('other', 'Другое'),
    ]

    FORM_CHOICES = [
        ('tablets', 'Таблетки'),
        ('drops', 'Капли'),
        ('injection', 'Инъекции'),
        ('ointment', 'Мазь'),
        ('suspension', 'Суспензия'),
        ('spray', 'Спрей'),
        ('other', 'Другое'),
    ]

    code = models.CharField(max_length=50, primary_key=True, verbose_name='Код препарата')
    name_trade = models.CharField(max_length=200, verbose_name='Торговое название')
    name_active = models.CharField(max_length=200, verbose_name='Действующее вещество')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, verbose_name='Категория')
    form = models.CharField(max_length=20, choices=FORM_CHOICES, verbose_name='Форма выпуска')
    species = models.CharField(max_length=10, choices=SPECIES_CHOICES, verbose_name='Вид')
    indications = models.TextField(verbose_name='Показания')
    contraindications = models.TextField(blank=True, verbose_name='Противопоказания')
    side_effects = models.TextField(blank=True, verbose_name='Побочные эффекты')
    dosage_info = models.JSONField(blank=True, null=True, verbose_name='Информация о дозировке')
    typical_frequency = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        verbose_name='Типичная периодичность'
    )
    typical_duration_days = models.PositiveIntegerField(blank=True, null=True, verbose_name='Типичная длительность (дни)')
    interactions = models.TextField(blank=True, verbose_name='Взаимодействия')
    storage_conditions = models.TextField(blank=True, verbose_name='Условия хранения')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'medications'
        ordering = ['species', 'name_trade']

    def __str__(self):
        return f"{self.name_trade} ({self.code})"


class PetVaccination(models.Model):
    """История вакцинаций питомца."""

    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False
    )
    pet = models.ForeignKey(
        Pet,
        on_delete=models.CASCADE,
        related_name='vaccinations',
        verbose_name='Питомец'
    )
    vaccine_code = models.ForeignKey(
        Vaccine,
        to_field='code',
        db_column='vaccine_code',
        on_delete=models.PROTECT,
        related_name='pet_vaccinations',
        verbose_name='Код вакцины'
    )
    date_administered = models.DateField(verbose_name='Дата вакцинации')
    next_due_date = models.DateField(null=True, blank=True, verbose_name='Следующая вакцинация')
    manufacturer = models.CharField(max_length=200, blank=True, verbose_name='Производитель')
    batch_number = models.CharField(max_length=100, blank=True, verbose_name='Номер партии')
    administered_by = models.CharField(max_length=200, blank=True, verbose_name='Кем проведена')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pet_vaccinations'
        ordering = ['-date_administered']

    def __str__(self):
        return f"{self.pet.name}: {self.vaccine_code.name_ru} ({self.date_administered})"


class PetMedication(models.Model):
    """Принимаемые препараты питомца."""

    FREQUENCY_CHOICES = [
        ('three_times_daily', '3 раза в день'),
        ('twice_daily', '2 раза в день'),
        ('once_daily', '1 раз в день'),
        ('every_other_day', 'Через день'),
        ('weekly', 'Раз в неделю'),
        ('monthly', 'Раз в месяц'),
    ]

    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False
    )
    pet = models.ForeignKey(
        Pet,
        on_delete=models.CASCADE,
        related_name='medications',
        verbose_name='Питомец'
    )
    medication_code = models.ForeignKey(
        Medication,
        to_field='code',
        db_column='medication_code',
        on_delete=models.PROTECT,
        related_name='pet_medications',
        verbose_name='Код препарата'
    )
    medication_name = models.CharField(max_length=200, verbose_name='Название препарата')
    dosage = models.CharField(max_length=100, blank=True, verbose_name='Дозировка')
    frequency = models.CharField(max_length=30, choices=FREQUENCY_CHOICES, verbose_name='Периодичность')
    start_date = models.DateField(verbose_name='Дата начала')
    end_date = models.DateField(null=True, blank=True, verbose_name='Дата окончания')
    prescribed_for = models.CharField(max_length=200, blank=True, verbose_name='Для чего назначен')
    prescribing_vet = models.CharField(max_length=200, blank=True, verbose_name='Назначивший ветеринар')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    is_active = models.BooleanField(default=True, verbose_name='Активный приём')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pet_medications'
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.pet.name}: {self.medication_code.name_trade}"


class PetActivity(models.Model):
    """Активности питомца."""

    ACTIVITY_TYPE_CHOICES = [
        ('walking', 'Прогулка'),
        ('running', 'Бег'),
        ('swimming', 'Плавание'),
        ('training', 'Тренировка'),
        ('playing', 'Активные игры'),
        ('hiking', 'Походы'),
        ('agility', 'Аджилити'),
        ('hunting', 'Охота'),
        ('guarding', 'Служебная работа'),
    ]

    FREQUENCY_CHOICES = [
        ('three_times_daily', '3 раза в день'),
        ('twice_daily', '2 раза в день'),
        ('once_daily', '1 раз в день'),
        ('every_other_day', 'Через день'),
        ('twice_weekly', '2 раза в неделю'),
        ('weekly', 'Раз в неделю'),
        ('twice_monthly', '2 раза в месяц'),
        ('monthly', 'Раз в месяц'),
        ('seasonal', 'Сезонно'),
    ]

    INTENSITY_CHOICES = [
        ('low', 'Низкая'),
        ('moderate', 'Умеренная'),
        ('high', 'Высокая'),
    ]

    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False
    )
    pet = models.ForeignKey(
        Pet,
        on_delete=models.CASCADE,
        related_name='activities',
        verbose_name='Питомец'
    )
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPE_CHOICES, verbose_name='Тип активности')
    duration_minutes = models.PositiveIntegerField(verbose_name='Продолжительность (мин)')
    frequency = models.CharField(max_length=30, choices=FREQUENCY_CHOICES, verbose_name='Периодичность')
    intensity = models.CharField(
        max_length=10,
        choices=INTENSITY_CHOICES,
        null=True,
        blank=True,
        verbose_name='Интенсивность'
    )
    notes = models.TextField(blank=True, verbose_name='Примечания')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pet_activities'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.pet.name}: {self.activity_type}"


class PetOtherPet(models.Model):
    """Другие питомцы, живущие вместе."""

    OTHER_PET_TYPE_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
        ('bird', 'Птица'),
        ('rodent', 'Грызун'),
        ('fish', 'Рыба'),
        ('reptile', 'Рептилия'),
        ('other', 'Другое'),
    ]

    RELATIONSHIP_CHOICES = [
        ('friendly', 'Дружелюбные'),
        ('neutral', 'Нейтральные'),
        ('tense', 'Напряжённые'),
    ]

    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False
    )
    pet = models.ForeignKey(
        Pet,
        on_delete=models.CASCADE,
        related_name='other_pets',
        verbose_name='Питомец'
    )
    other_pet_type = models.CharField(max_length=20, choices=OTHER_PET_TYPE_CHOICES, verbose_name='Тип питомца')
    linked_pet = models.ForeignKey(
        Pet,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_other_pets',
        verbose_name='Связанный питомец'
    )
    other_pet_name = models.CharField(max_length=100, blank=True, verbose_name='Имя питомца')
    relationship = models.CharField(
        max_length=20,
        choices=RELATIONSHIP_CHOICES,
        null=True,
        blank=True,
        verbose_name='Отношение'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pet_other_pets'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.pet.name}: {self.other_pet_type}"


class PetAnalysisHistory(models.Model):
    """История анализов питомца."""

    STATUS_CHOICES = [
        ('good', 'Хорошо'),
        ('attention', 'Требует внимания'),
        ('warning', 'Предупреждение'),
        ('critical', 'Критично'),
    ]

    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False
    )
    pet = models.ForeignKey(
        Pet,
        on_delete=models.CASCADE,
        related_name='analysis_history',
        verbose_name='Питомец'
    )
    analysis_date = models.DateTimeField(verbose_name='Дата анализа')
    analysis_result = models.JSONField(verbose_name='Результат анализа')
    overall_status = models.CharField(max_length=20, choices=STATUS_CHOICES, verbose_name='Общий статус')
    warnings_count = models.PositiveIntegerField(default=0, verbose_name='Количество предупреждений')
    recommendations_count = models.PositiveIntegerField(default=0, verbose_name='Количество рекомендаций')
    weight_at_analysis = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Вес на момент анализа'
    )
    bcs_at_analysis = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name='BCS на момент анализа')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pet_analysis_history'
        ordering = ['-analysis_date']

    def __str__(self):
        return f"{self.pet.name}: {self.analysis_date}"

# Импортируем модели для регистрации в Django
from .reminder_models import Reminder, ReminderCategory, ReminderFrequency
from .breed_models import Breed, BreedHealth, BreedNutrition, BreedCare
from .nutrition_models import HealthCondition, Allergy, PetHealthCondition, PetAllergy, PetFoodExclusion
from .food_recipe_models import FoodRecipe, Supplier, SupplierOffer, SupplierRawItem, FoodBrandRule  # noqa: F401  (база питания)
# ============================================================================
# МОДЕЛИ КАЛЕНДАРЯ СОБЫТИЙ (перенесены из calendar app)
# ============================================================================

class CalendarEvent(models.Model):
    """
    Событие в календаре питомца.

    Перенесено из calendar app для объединения с pets.
    """

    EVENT_TYPES = [
        ('veterinary', 'Ветеринарный визит'),
        ('vaccination', 'Прививка'),
        ('grooming', 'Уход за шерстью'),
        ('birthday', 'День рождения'),
        ('medication', 'Приём лекарств'),
        ('training', 'Тренировка'),
        ('walking', 'Прогулка'),
        ('feeding', 'Кормление'),
        ('other', 'Другое'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('urgent', 'Срочный'),
    ]

    STATUS_CHOICES = [
        ('scheduled', 'Запланировано'),
        ('completed', 'Выполнено'),
        ('cancelled', 'Отменено'),
        ('missed', 'Пропущено'),
    ]

    # Основная информация
    title = models.CharField('Название события', max_length=200)
    description = models.TextField('Описание', blank=True)

    # Связи
    pet = models.ForeignKey(
        Pet,
        on_delete=models.CASCADE,
        related_name='calendar_events',
        verbose_name='Питомец'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='calendar_events',
        verbose_name='Владелец'
    )

    # Тип и приоритет
    event_type = models.CharField(
        'Тип события',
        max_length=20,
        choices=EVENT_TYPES,
        default='other'
    )
    priority = models.CharField(
        'Приоритет',
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium'
    )

    # Дата и время
    start_date = models.DateField('Дата начала')
    start_time = models.TimeField('Время начала', null=True, blank=True)
    end_date = models.DateField('Дата окончания', null=True, blank=True)
    end_time = models.TimeField('Время окончания', null=True, blank=True)

    # Статус и напоминания
    status = models.CharField(
        'Статус',
        max_length=10,
        choices=STATUS_CHOICES,
        default='scheduled'
    )
    is_recurring = models.BooleanField('Повторяющееся событие', default=False)
    recurrence_rule = models.CharField('Правило повторения', max_length=100, blank=True)

    # Уведомления
    notify_before = models.PositiveIntegerField(
        'Напомнить за (минут)',
        default=60,
        validators=[MinValueValidator(0), MaxValueValidator(1440)]
    )
    email_notification = models.BooleanField('Уведомление по email', default=True)
    push_notification = models.BooleanField('Push-уведомление', default=True)

    # Дополнительная информация
    location = models.CharField('Место проведения', max_length=200, blank=True)
    cost = models.DecimalField(
        'Стоимость',
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    notes = models.TextField('Заметки', blank=True)

    # Системные поля
    created_at = models.DateTimeField('Создано', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлено', auto_now=True)
    completed_at = models.DateTimeField('Завершено', null=True, blank=True)

    class Meta:
        verbose_name = 'Событие календаря'
        verbose_name_plural = 'События календаря'
        ordering = ['start_date', 'start_time']

    def __str__(self):
        return f"{self.pet.name}: {self.title}"

    @property
    def is_past(self):
        """Проверка, прошло ли событие."""
        now = timezone.now()
        if self.start_time:
            event_datetime = timezone.datetime.combine(self.start_date, self.start_time)
            event_datetime = timezone.make_aware(event_datetime)
            return event_datetime < now
        return self.start_date < now.date()

    @property
    def is_today(self):
        """Проверка, происходит ли событие сегодня."""
        return self.start_date == timezone.now().date()

    @property
    def is_upcoming(self):
        """Проверка, предстоящее ли событие."""
        return not self.is_past and self.status == 'scheduled'

    def mark_completed(self):
        """Отметить событие как выполненное."""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()

    def cancel_event(self):
        """Отменить событие."""
        self.status = 'cancelled'
        self.save()


class EventReminder(models.Model):
    """
    Напоминание о событии.

    Перенесено из calendar app для объединения с pets.
    """

    REMINDER_TYPES = [
        ('email', 'Email'),
        ('push', 'Push-уведомление'),
        ('sms', 'SMS'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Ожидает'),
        ('sent', 'Отправлено'),
        ('failed', 'Ошибка'),
    ]

    event = models.ForeignKey(
        CalendarEvent,
        on_delete=models.CASCADE,
        related_name='reminders',
        verbose_name='Событие'
    )

    reminder_type = models.CharField(
        'Тип напоминания',
        max_length=10,
        choices=REMINDER_TYPES
    )

    scheduled_at = models.DateTimeField('Запланировано на')
    sent_at = models.DateTimeField('Отправлено', null=True, blank=True)

    status = models.CharField(
        'Статус',
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending'
    )

    error_message = models.TextField('Ошибка', blank=True)

    created_at = models.DateTimeField('Создано', auto_now_add=True)

    class Meta:
        verbose_name = 'Напоминание'
        verbose_name_plural = 'Напоминания'
        ordering = ['scheduled_at']
    
    def __str__(self):
        return f"{self.event.title} - {self.get_reminder_type_display()}"
        
