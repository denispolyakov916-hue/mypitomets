"""
Модели для профилей питомцев (PetID)

PetID - центральная сущность платформы Питомец+.
Содержит всю информацию о питомце.
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
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
    
    breed = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name='Порода',
        help_text="Порода (опционально)"
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
    vitamins_supplements = models.TextField(blank=True, verbose_name='Добавки и витамины')

    # ===== РАСШИРЕННОЕ ПОВЕДЕНИЕ =====
    character_traits = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Черты характера',
        validators=[validate_string_list]
    )
    training_goals = models.TextField(blank=True, verbose_name='Цели дрессировки')

    # ===== РАСШИРЕННОЕ ЗДОРОВЬЕ =====
    chronic_conditions = models.TextField(blank=True, verbose_name='Хронические заболевания')
    vaccinations = models.TextField(blank=True, verbose_name='Вакцинации')
    medications = models.TextField(blank=True, verbose_name='Принимаемые препараты')

    DENTAL_HEALTH_CHOICES = [
        ('excellent', 'Отличное'),
        ('good', 'Хорошее'),
        ('fair', 'Удовлетворительное'),
        ('needs_attention', 'Требует лечения'),
    ]
    dental_health = models.CharField(max_length=20, choices=DENTAL_HEALTH_CHOICES, blank=True, null=True, verbose_name='Состояние зубов')
    vet_visits = models.TextField(blank=True, verbose_name='Посещения ветеринара')

    # ===== ОБРАЗ ЖИЗНИ =====
    HOUSING_TYPE_CHOICES = [
        ('apartment', 'Квартира'),
        ('house', 'Частный дом'),
        ('cottage', 'Дача/Коттедж'),
        ('other', 'Другое'),
    ]
    housing_type = models.CharField(max_length=20, choices=HOUSING_TYPE_CHOICES, blank=True, null=True, verbose_name='Тип жилья')
    has_yard = models.BooleanField(default=False, verbose_name='Есть двор')
    other_pets = models.TextField(blank=True, verbose_name='Другие питомцы дома')
    has_children = models.BooleanField(default=False, verbose_name='В доме есть дети')
    walk_frequency = models.CharField(max_length=50, blank=True, verbose_name='Частота прогулок')
    walk_duration = models.CharField(max_length=50, blank=True, verbose_name='Длительность прогулки')

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
            'vitamins_supplements': self.vitamins_supplements,
            'character_traits': self.character_traits if self.character_traits else [],
            'training_goals': self.training_goals,
            'chronic_conditions': self.chronic_conditions,
            'vaccinations': self.vaccinations,
            'medications': self.medications,
            'dental_health': self.dental_health,
            'vet_visits': self.vet_visits,
            'housing_type': self.housing_type,
            'has_yard': self.has_yard,
            'other_pets': self.other_pets,
            'has_children': self.has_children,
            'walk_frequency': self.walk_frequency,
            'walk_duration': self.walk_duration,
            # Контакты владельца
            'owner_phone': self.owner_phone,
            'owner_email': self.owner_email,
            'owner_city': self.owner_city,
            'is_extended_profile': self.is_extended_profile,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


# Импортируем модель Reminder для регистрации в Django
from .reminder_models import Reminder, ReminderCategory, ReminderFrequency
