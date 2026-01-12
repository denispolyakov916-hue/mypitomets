"""
Модели для профилей питомцев (PetID)

PetID - центральная сущность платформы Питомец+.
Содержит всю информацию о питомце.
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from core.utils import generate_uuid7
from core.validators import validate_string_list


class Pet(models.Model):
    """
    Модель профиля питомца - ядро системы PetID.
    
    Хранит всю базовую информацию о питомце, которая используется
    во всех модулях платформы (рекомендации магазина, события календаря и т.д.)
    """
    
    SPECIES_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
        ('bird', 'Птица'),
        ('rodent', 'Грызун'),
        ('fish', 'Рыбка'),
        ('reptile', 'Рептилия'),
        ('other', 'Другое'),
    ]
    
    GENDER_CHOICES = [
        ('male', 'Самец'),
        ('female', 'Самка'),
        ('unknown', 'Не указан'),
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
    
    # Дополнительные поля базового паспорта
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        default='unknown',
        verbose_name='Пол'
    )
    is_neutered = models.BooleanField(default=False, verbose_name='Кастрирован/Стерилизован')
    photo = models.ImageField(
        upload_to='pets/photos/',
        blank=True,
        null=True,
        verbose_name='Фото'
    )
    
    # Вкусовые предпочтения и аллергии
    favorite_foods = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Любимые продукты/корма',
        help_text='Список названий продуктов или кормов, которые любит питомец',
        validators=[validate_string_list]
    )
    allergies = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Аллергии',
        help_text='Список продуктов или ингредиентов, на которые у питомца аллергия',
        validators=[validate_string_list]
    )
    
    # Проблемы здоровья для персонализированных рекомендаций
    health_issues = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Проблемы здоровья',
        help_text='Список проблем здоровья питомца (лишний вес, чувствительное пищеварение и т.д.)',
        validators=[validate_string_list]
    )
    
    # Активность питомца
    ACTIVITY_LEVELS = [
        ('low', 'Низкая'),
        ('medium', 'Средняя'),
        ('high', 'Высокая'),
    ]
    activity_level = models.CharField(
        max_length=10,
        choices=ACTIVITY_LEVELS,
        default='medium',
        verbose_name='Уровень активности',
        help_text='Уровень физической активности питомца'
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
        ('home_only', 'Только домашний'),
        ('street', 'Уличный'),
        ('social', 'Социальный'),
        ('mixed', 'Смешанный'),
    ]
    social_level = models.CharField(
        max_length=20,
        choices=SOCIAL_LEVELS,
        blank=True,
        null=True,
        verbose_name='Уровень социализации',
        help_text='Уровень социализации питомца (домашний/уличный/социальный)'
    )

    # Расширенные поля для глубокой персонализации (опциональные)
    TRAINING_EXPERIENCE_LEVELS = [
        ('none', 'Без опыта'),
        ('basic', 'Базовый'),
        ('intermediate', 'Средний'),
        ('advanced', 'Продвинутый'),
        ('professional', 'Профессиональный'),
    ]
    training_experience = models.CharField(
        max_length=20,
        choices=TRAINING_EXPERIENCE_LEVELS,
        blank=True,
        null=True,
        verbose_name='Опыт дрессировки',
        help_text='Уровень опыта дрессировки питомца'
    )

    special_needs = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Особые потребности',
        help_text='Особые потребности питомца (инвалидность, хронические заболевания и т.д.)',
        validators=[validate_string_list]
    )

    preferred_activities = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Предпочитаемые активности',
        help_text='Виды активностей, которые предпочитает питомец',
        validators=[validate_string_list]
    )

    behavioral_problems = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Поведенческие проблемы',
        help_text='Поведенческие проблемы питомца для персонализированных курсов коррекции',
        validators=[validate_string_list]
    )

    # ===== НОВЫЕ ПОЛЯ PETID =====

    # Физические параметры
    SIZE_CHOICES = [
        ('small', 'Маленький (до 10 кг)'),
        ('medium', 'Средний (10-25 кг)'),
        ('large', 'Крупный (более 25 кг)'),
    ]
    size = models.CharField(max_length=20, choices=SIZE_CHOICES, blank=True, null=True, verbose_name='Размер')

    BODY_TYPE_CHOICES = [
        ('slim', 'Недостаточный вес'),
        ('normal', 'Идеальный вес'),
        ('overweight', 'Избыточный вес'),
        ('obese', 'Ожирение'),
    ]
    body_type = models.CharField(max_length=20, choices=BODY_TYPE_CHOICES, blank=True, null=True, verbose_name='Тип телосложения')

    # Контакты владельца (переопределяемые)
    owner_phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон владельца')
    owner_email = models.EmailField(blank=True, verbose_name='Email владельца')
    owner_city = models.CharField(max_length=100, blank=True, verbose_name='Город владельца')

    # ===== РАСШИРЕННОЕ ПИТАНИЕ =====
    DIET_TYPE_CHOICES = [
        ('dry', 'Сухой корм'),
        ('wet', 'Влажный корм'),
        ('mixed', 'Смешанное питание'),
        ('raw', 'Натуральное питание'),
        ('home', 'Домашняя еда'),
    ]
    diet_type = models.CharField(max_length=20, choices=DIET_TYPE_CHOICES, blank=True, null=True, verbose_name='Тип питания')

    FEEDING_FREQUENCY_CHOICES = [
        ('1', '1 раз в день'),
        ('2', '2 раза в день'),
        ('3', '3 раза в день'),
        ('free', 'Свободный доступ'),
    ]
    feeding_frequency = models.CharField(max_length=10, choices=FEEDING_FREQUENCY_CHOICES, blank=True, null=True, verbose_name='Частота кормления')

    sensitive_digestion = models.BooleanField(default=False, verbose_name='Чувствительное пищеварение')
    excluded_ingredients = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Исключаемые ингредиенты',
        validators=[validate_string_list]
    )
    vitamins_supplements = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Добавки и витамины',
        help_text='Список витаминов и добавок из справочника',
        validators=[validate_string_list]
    )

    # ===== РАСШИРЕННОЕ ПОВЕДЕНИЕ =====
    character_traits = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Черты характера',
        validators=[validate_string_list]
    )
    training_goals = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Цели дрессировки',
        help_text='Список целей дрессировки из предопределённого списка',
        validators=[validate_string_list]
    )

    # ===== РАСШИРЕННОЕ ЗДОРОВЬЕ =====
    chronic_conditions = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Хронические заболевания',
        help_text='Список хронических заболеваний из справочника',
        validators=[validate_string_list]
    )
    vaccinations = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Вакцинации',
        help_text='Список вакцинаций с датами и следующими датами'
    )
    medications = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Принимаемые препараты',
        help_text='Список препаратов с дозировками и частотой приёма'
    )

    DENTAL_HEALTH_CHOICES = [
        ('excellent', 'Отличное'),
        ('good', 'Хорошее'),
        ('fair', 'Удовлетворительное'),
        ('needs_attention', 'Требует лечения'),
    ]
    dental_health = models.CharField(max_length=20, choices=DENTAL_HEALTH_CHOICES, blank=True, null=True, verbose_name='Состояние зубов')

    # ===== ОБРАЗ ЖИЗНИ =====
    HOUSING_TYPE_CHOICES = [
        ('apartment', 'Квартира'),
        ('house', 'Частный дом'),
        ('cottage', 'Дача/Коттедж'),
        ('other', 'Другое'),
    ]
    housing_type = models.CharField(max_length=20, choices=HOUSING_TYPE_CHOICES, blank=True, null=True, verbose_name='Тип жилья')
    has_yard = models.BooleanField(default=False, verbose_name='Есть двор')
    other_pets = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Другие питомцы дома',
        help_text='Список других питомцев с типом и кличкой'
    )
    has_children = models.BooleanField(default=False, verbose_name='В доме есть дети')
    
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
    body_condition_score = models.CharField(
        max_length=2,
        choices=BODY_CONDITION_SCORE_CHOICES,
        blank=True,
        null=True,
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
    def calculated_size(self):
        """Автоматический расчёт размера по весу."""
        if not self.weight:
            return self.size  # Возвращаем заданный размер
        
        weight = float(self.weight)
        if self.species == 'dog':
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
            if weight < 3:
                return 'small'
            elif weight < 6:
                return 'medium'
            else:
                return 'large'
        return self.size
    
    @property
    def profile_completeness(self):
        """Процент заполненности профиля (0-100)."""
        # Обязательные поля (базовый профиль) - 70% веса
        required_fields = [
            self.name,
            self.species,
            self.date_of_birth,
            self.breed,
            self.weight,
            self.gender != 'unknown',
        ]
        
        # Поля здоровья и питания - важны для персонализации
        health_fields = [
            bool(self.health_issues),
            bool(self.allergies) or bool(self.excluded_ingredients),
            self.activity_level,
        ]
        
        # Поведенческие поля - важны для курсов
        if self.species in ['dog', 'cat']:
            behavior_fields = [
                bool(self.behavioral_problems) or self.behavior_type,
            ]
        else:
            behavior_fields = []
        
        # Опциональные поля - дают дополнительные баллы
        optional_fields = [
            self.is_neutered is not None,
            bool(self.photo),
            self.behavior_type,
            self.social_level,
            self.training_experience,
            self.diet_type,
            self.housing_type,
            bool(self.owner_phone) or bool(self.owner_email),
        ]
        
        # Расчёт
        required_filled = sum(1 for f in required_fields if f)
        health_filled = sum(1 for f in health_fields if f)
        behavior_filled = sum(1 for f in behavior_fields if f)
        optional_filled = sum(1 for f in optional_fields if f)
        
        # Веса категорий
        required_weight = 50  # 50% за базовые поля
        health_weight = 20    # 20% за здоровье
        behavior_weight = 10  # 10% за поведение
        optional_weight = 20  # 20% за опциональные
        
        required_score = (required_filled / max(len(required_fields), 1)) * required_weight
        health_score = (health_filled / max(len(health_fields), 1)) * health_weight
        behavior_score = (behavior_filled / max(len(behavior_fields), 1)) * behavior_weight if behavior_fields else behavior_weight
        optional_score = (optional_filled / max(len(optional_fields), 1)) * optional_weight
        
        total = required_score + health_score + behavior_score + optional_score
        return min(100, int(total))
    
    def to_dict(self):
        """Сериализация для API."""
        # Обработка date_of_birth - может быть date объектом или строкой
        dob = None
        if self.date_of_birth:
            if hasattr(self.date_of_birth, 'isoformat'):
                dob = self.date_of_birth.isoformat()
            else:
                dob = str(self.date_of_birth)
        
        # Обработка фото - возвращаем URL если есть
        photo_url = None
        if self.photo:
            try:
                photo_url = self.photo.url
            except (ValueError, AttributeError):
                photo_url = None
        
        return {
            'id': str(self.id),
            'owner_id': str(self.owner_id),
            'name': self.name,
            'species': self.species,
            'breed': self.breed if self.breed else None,
            'date_of_birth': dob,
            'weight': float(self.weight) if self.weight is not None else None,
            'gender': self.gender,
            'is_neutered': self.is_neutered,
            'photo': photo_url,
            'favorite_foods': self.favorite_foods if self.favorite_foods else [],
            'allergies': self.allergies if self.allergies else [],
            'health_issues': self.health_issues if self.health_issues else [],
            'activity_level': self.activity_level,
            # Новые поля для персонализации курсов
            'behavior_type': self.behavior_type,
            'social_level': self.social_level,
            'training_experience': self.training_experience,
            'special_needs': self.special_needs if self.special_needs else [],
            'preferred_activities': self.preferred_activities if self.preferred_activities else [],
            'behavioral_problems': self.behavioral_problems if self.behavioral_problems else [],
            # Новые поля PetID
            'size': self.size,
            'body_type': self.body_type,
            'diet_type': self.diet_type,
            'feeding_frequency': self.feeding_frequency,
            'sensitive_digestion': self.sensitive_digestion,
            'excluded_ingredients': self.excluded_ingredients if self.excluded_ingredients else [],
            'vitamins_supplements': self.vitamins_supplements if self.vitamins_supplements else [],
            'character_traits': self.character_traits if self.character_traits else [],
            'training_goals': self.training_goals if self.training_goals else [],
            'chronic_conditions': self.chronic_conditions if self.chronic_conditions else [],
            'vaccinations': self.vaccinations if self.vaccinations else [],
            'medications': self.medications if self.medications else [],
            'dental_health': self.dental_health,
            'housing_type': self.housing_type,
            'has_yard': self.has_yard,
            'other_pets': self.other_pets if self.other_pets else [],
            'has_children': self.has_children,
            'walk_frequency': self.walk_frequency,
            'walk_duration': self.walk_duration,
            # Данные ветеринарного осмотра
            'last_vet_visit': self.last_vet_visit.isoformat() if self.last_vet_visit else None,
            'body_condition_score': self.body_condition_score,
            'heart_rate': self.heart_rate,
            'respiratory_rate': self.respiratory_rate,
            'temperature': float(self.temperature) if self.temperature else None,
            'vet_notes': self.vet_notes,
            # Контакты владельца
            'owner_phone': self.owner_phone,
            'owner_email': self.owner_email,
            'owner_city': self.owner_city,
            'is_extended_profile': self.is_extended_profile,
            # Вычисляемые поля PetID
            'age': self.age,
            'age_months': self.age_months,
            'age_category': self.age_category,
            'calculated_size': self.calculated_size,
            'profile_completeness': self.profile_completeness,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


# Импортируем модель Reminder для регистрации в Django
from .reminder_models import Reminder, ReminderCategory, ReminderFrequency

# Импортируем модель Breed (справочник пород)
# Breed модель определена в конце этого файла

# Модели календаря событий (перенесены из calendar app)
from django.core.validators import MinValueValidator, MaxValueValidator


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


# ============================================================================
# МОДЕЛИ СПРАВОЧНИКА ПОРОД
# ============================================================================

class Breed(models.Model):
    """
    Справочник пород собак и кошек.
    
    Загружается из data_breeds/breeds.json
    Используется для:
    - Автозаполнения PetID
    - Сравнения параметров питомца с эталоном
    - Подбора корма и товаров
    - Рекомендаций курсов
    """
    
    SPECIES_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
    ]
    
    SIZE_CHOICES = [
        ('toy', 'Toy (до 5 кг)'),
        ('small', 'Small (5-10 кг)'),
        ('medium', 'Medium (10-25 кг)'),
        ('large', 'Large (25-40 кг)'),
        ('giant', 'Giant (40+ кг)'),
    ]
    
    LEVEL_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('very_high', 'Очень высокий'),
    ]
    
    GROOMING_CHOICES = [
        ('daily', 'Ежедневно'),
        ('weekly', 'Еженедельно'),
        ('monthly', 'Ежемесячно'),
    ]
    
    COAT_CHOICES = [
        ('short', 'Короткая'),
        ('medium', 'Средняя'),
        ('long', 'Длинная'),
    ]
    
    # Основная информация
    id = models.IntegerField(primary_key=True, help_text="ID из breeds.json")
    species = models.CharField(max_length=10, choices=SPECIES_CHOICES, db_index=True)
    name = models.CharField(max_length=100, unique=True, verbose_name='Название')
    name_en = models.CharField(max_length=100, verbose_name='Название (EN)')
    slug = models.SlugField(max_length=120, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True, verbose_name='Описание')
    short_description = models.TextField(blank=True, null=True, verbose_name='Краткое описание')
    
    # Размеры
    size_category = models.CharField(max_length=20, choices=SIZE_CHOICES, db_index=True)
    weight_min = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0.1)],
        verbose_name='Минимальный вес (кг)'
    )
    weight_max = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0.1)],
        verbose_name='Максимальный вес (кг)'
    )
    height_min = models.IntegerField(
        null=True, blank=True,
        verbose_name='Минимальный рост (см)',
        help_text='Только для собак'
    )
    height_max = models.IntegerField(
        null=True, blank=True,
        verbose_name='Максимальный рост (см)',
        help_text='Только для собак'
    )
    lifespan_min = models.IntegerField(verbose_name='Мин. продолжительность жизни (лет)')
    lifespan_max = models.IntegerField(verbose_name='Макс. продолжительность жизни (лет)')
    
    # Поведение
    energy_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, db_index=True)
    trainability = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    intelligence = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    friendliness_to_children = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    friendliness_to_pets = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    friendliness_to_strangers = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    independence = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    
    # Уход
    grooming_frequency = models.CharField(max_length=20, choices=GROOMING_CHOICES)
    shedding_level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    coat_type = models.CharField(max_length=20, choices=COAT_CHOICES)
    
    # Здоровье
    health_risk_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, db_index=True)
    hypoallergenic = models.BooleanField(default=False)
    brachycephalic = models.BooleanField(default=False, db_index=True)
    
    # Другое
    apartment_friendly = models.BooleanField(default=True)
    good_for_novice = models.BooleanField(default=True)
    
    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'breeds'
        verbose_name = 'Порода'
        verbose_name_plural = 'Породы'
        ordering = ['species', 'name']
        indexes = [
            models.Index(fields=['species', 'size_category']),
            models.Index(fields=['energy_level']),
            models.Index(fields=['health_risk_level']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_species_display()})"
    
    @property
    def average_weight(self):
        """Средний вес породы"""
        return (self.weight_min + self.weight_max) / 2
    
    @property
    def average_lifespan(self):
        """Средняя продолжительность жизни"""
        return (self.lifespan_min + self.lifespan_max) / 2


class BreedHealth(models.Model):
    """
    Породоспецифичные риски здоровья.
    
    Загружается из data_breeds/breed_health.json
    Используется для:
    - Предупреждений в PetID
    - Рекомендаций скрининговых обследований
    - Подбора кормов для профилактики
    """
    
    CONDITION_TYPE_CHOICES = [
        ('genetic', 'Генетическое'),
        ('congenital', 'Врожденное'),
    ]
    
    SEVERITY_CHOICES = [
        ('low', 'Низкая'),
        ('medium', 'Средняя'),
        ('high', 'Высокая'),
    ]
    
    SYSTEM_CHOICES = [
        ('musculoskeletal', 'Опорно-двигательная'),
        ('cardiovascular', 'Сердечно-сосудистая'),
        ('respiratory', 'Дыхательная'),
        ('digestive', 'Пищеварительная'),
        ('urinary', 'Мочевыделительная'),
        ('reproductive', 'Репродуктивная'),
        ('endocrine', 'Эндокринная'),
        ('nervous', 'Нервная'),
        ('immune', 'Иммунная'),
        ('integumentary', 'Кожа и шерсть'),
        ('ophthalmologic', 'Офтальмологическая'),
        ('dental', 'Стоматологическая'),
        ('renal', 'Почечная'),
        ('neurological', 'Неврологическая'),
        ('general', 'Общая'),
    ]
    
    breed = models.ForeignKey(
        Breed,
        on_delete=models.CASCADE,
        related_name='health_risks',
        verbose_name='Порода'
    )
    
    condition_name = models.CharField(max_length=200, verbose_name='Название заболевания')
    condition_type = models.CharField(max_length=20, choices=CONDITION_TYPE_CHOICES)
    affected_system = models.CharField(max_length=50, choices=SYSTEM_CHOICES, db_index=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, db_index=True)
    prevalence_percent = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name='Распространенность (%)'
    )
    age_of_onset = models.CharField(
        max_length=50, blank=True,
        verbose_name='Возраст проявления'
    )
    prevention = models.TextField(verbose_name='Профилактика')
    screening = models.TextField(verbose_name='Рекомендуемые обследования')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'breed_health'
        verbose_name = 'Риск здоровья породы'
        verbose_name_plural = 'Риски здоровья пород'
        ordering = ['breed', '-severity', '-prevalence_percent']
        indexes = [
            models.Index(fields=['breed', 'severity']),
            models.Index(fields=['affected_system']),
        ]
    
    def __str__(self):
        return f"{self.breed.name}: {self.condition_name}"


class BreedNutrition(models.Model):
    """
    Рекомендации по питанию для пород.
    
    Загружается из data_breeds/breed_nutrition.json
    Используется для:
    - Расчета рациона и БЖУ
    - Подбора корма
    - Рекомендаций по кормлению
    """
    
    PROTEIN_CHOICES = [
        ('low', 'Низкая'),
        ('medium', 'Средняя'),
        ('high', 'Высокая'),
        ('very_high', 'Очень высокая'),
    ]
    
    CALORIE_CHOICES = [
        ('low', 'Низкая'),
        ('medium', 'Средняя'),
        ('high', 'Высокая'),
    ]
    
    DIET_TYPE_CHOICES = [
        ('dry', 'Сухой'),
        ('wet', 'Влажный'),
        ('mixed', 'Смешанный'),
    ]
    
    breed = models.OneToOneField(
        Breed,
        on_delete=models.CASCADE,
        related_name='nutrition',
        verbose_name='Порода',
        primary_key=True
    )
    
    protein_need = models.CharField(max_length=20, choices=PROTEIN_CHOICES)
    calorie_density = models.CharField(max_length=20, choices=CALORIE_CHOICES)
    diet_type = models.CharField(max_length=20, choices=DIET_TYPE_CHOICES)
    feeding_frequency = models.CharField(max_length=50, verbose_name='Частота кормлений')
    special_considerations = models.TextField(
        blank=True,
        verbose_name='Особые рекомендации'
    )
    common_allergens = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Породоспецифичные аллергены',
        help_text='Список аллергенов, характерных для породы'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'breed_nutrition'
        verbose_name = 'Рекомендации по питанию'
        verbose_name_plural = 'Рекомендации по питанию'
    
    def __str__(self):
        return f"{self.breed.name}: {self.diet_type}, белок {self.protein_need}"


class BreedCare(models.Model):
    """
    Породоспецифичные процедуры ухода.
    
    Загружается из data_breeds/breed_care.json
    Используется для:
    - Генерации персонализированных напоминаний
    - Рекомендаций товаров для ухода
    """
    
    CATEGORY_CHOICES = [
        ('coat', 'Шерсть'),
        ('skin', 'Кожа'),
        ('ears', 'Уши'),
        ('eyes', 'Глаза'),
        ('respiratory', 'Дыхание'),
        ('dental', 'Зубы'),
        ('nails', 'Когти'),
    ]
    
    IMPORTANCE_CHOICES = [
        ('low', 'Низкая'),
        ('medium', 'Средняя'),
        ('high', 'Высокая'),
        ('critical', 'Критическая'),
    ]
    
    SEASON_CHOICES = [
        ('all', 'Круглый год'),
        ('spring', 'Весна'),
        ('summer', 'Лето'),
        ('autumn', 'Осень'),
        ('winter', 'Зима'),
    ]
    
    breed = models.ForeignKey(
        Breed,
        on_delete=models.CASCADE,
        related_name='care_procedures',
        verbose_name='Порода'
    )
    
    care_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, db_index=True)
    procedure = models.CharField(max_length=200, verbose_name='Процедура')
    frequency = models.CharField(max_length=50, verbose_name='Частота')
    importance = models.CharField(max_length=20, choices=IMPORTANCE_CHOICES, db_index=True)
    season = models.CharField(max_length=20, choices=SEASON_CHOICES, default='all')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'breed_care'
        verbose_name = 'Процедура ухода за породой'
        verbose_name_plural = 'Процедуры ухода за породами'
        ordering = ['breed', '-importance', 'care_category']
        indexes = [
            models.Index(fields=['breed', 'importance']),
            models.Index(fields=['care_category']),
        ]
    
    def __str__(self):
        return f"{self.breed.name}: {self.procedure}"