"""
Модели для калькулятора питания и подбора корма.

Содержит:
- NutritionCoefficient - справочник коэффициентов для расчёта калорий
- HealthCondition - справочник заболеваний с коэффициентами
- Allergy - справочник аллергий
- PetHealthCondition - M2M заболевания питомца
- PetAllergy - M2M аллергии питомца
- PetFoodExclusion - M2M исключения продуктов

Данные загружаются из:
- coefficients_nutrition.json
- health_conditions.json
- allergies.json
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class NutritionCoefficient(models.Model):
    """
    Справочник коэффициентов для расчёта суточной калорийности.
    
    Данные загружаются из coefficients_nutrition.json
    Формула: MER = RER × K_age × K_neutering × K_activity × K_size × K_coat × K_climate × K_housing
    """
    
    SPECIES_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
    ]
    
    COEFFICIENT_TYPE_CHOICES = [
        ('size_category', 'Размер'),
        ('age', 'Возраст'),
        ('activity_level', 'Активность'),
        ('neutering', 'Кастрация'),
        ('coat_type', 'Тип шерсти'),
        ('climate', 'Климат'),
        ('housing', 'Тип жилья'),
        ('reproductive', 'Репродуктивное состояние'),
    ]
    
    # Первичный ключ - составной
    code = models.CharField(
        max_length=50, 
        verbose_name='Код',
        help_text='Уникальный код: dog_toy, cat_kitten_weaning, и т.д.'
    )
    species = models.CharField(max_length=10, choices=SPECIES_CHOICES, verbose_name='Вид')
    coefficient_type = models.CharField(
        max_length=20, choices=COEFFICIENT_TYPE_CHOICES, 
        db_index=True, verbose_name='Тип коэффициента'
    )
    
    # Значения
    name_ru = models.CharField(max_length=100, verbose_name='Название (рус)')
    coefficient = models.DecimalField(
        max_digits=4, decimal_places=2,
        validators=[MinValueValidator(0.1), MaxValueValidator(5.0)],
        verbose_name='Коэффициент'
    )
    coefficient_min = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True,
        verbose_name='Мин. коэффициент'
    )
    coefficient_max = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True,
        verbose_name='Макс. коэффициент'
    )
    
    # Диапазоны применения
    weight_min_kg = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True,
        verbose_name='Мин. вес (кг)'
    )
    weight_max_kg = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True,
        verbose_name='Макс. вес (кг)'
    )
    age_from_months = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='Возраст от (мес)'
    )
    age_to_months = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='Возраст до (мес)'
    )
    daily_activity_hours_max = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
        verbose_name='Макс. часов активности в день'
    )
    
    # Дополнительно
    description = models.TextField(blank=True, verbose_name='Описание')
    examples = models.TextField(blank=True, verbose_name='Примеры пород')
    source = models.CharField(max_length=50, blank=True, verbose_name='Источник')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Коэффициент питания'
        verbose_name_plural = 'Коэффициенты питания'
        db_table = 'nutrition_coefficients'
        unique_together = ['species', 'coefficient_type', 'code']
        ordering = ['coefficient_type', 'species', 'code']
        indexes = [
            models.Index(fields=['species', 'coefficient_type']),
        ]
    
    def __str__(self):
        return f"{self.get_coefficient_type_display()} ({self.species}): {self.name_ru} = {self.coefficient}"


class NutritionFactorRule(models.Model):
    """
    Правила влияния факторов на MER (priority+caps модель).
    Хранит приоритет и допустимую коррекцию факторов.
    """

    SCOPE_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
        ('both', 'Оба'),
    ]

    factor_key = models.CharField(
        max_length=50,
        verbose_name='Ключ фактора',
        help_text='Например: activity, neutering, bcs, disease, size, coat, climate'
    )
    priority = models.PositiveSmallIntegerField(
        default=1,
        verbose_name='Приоритет',
        help_text='0=base, 1=cap, 2=secondary'
    )
    max_delta_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name='Макс. коррекция (%)',
        help_text='Ограничение влияния фактора, например 15.0 = ±15%'
    )
    scope = models.CharField(
        max_length=10,
        choices=SCOPE_CHOICES,
        default='both',
        verbose_name='Вид'
    )
    notes = models.TextField(blank=True, verbose_name='Заметки')
    is_active = models.BooleanField(default=True, verbose_name='Активно')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Правило фактора MER'
        verbose_name_plural = 'Правила факторов MER'
        db_table = 'nutrition_factor_rules'
        ordering = ['priority', 'factor_key']
        indexes = [
            models.Index(fields=['scope', 'factor_key']),
        ]

    def __str__(self):
        return f"{self.factor_key} (prio={self.priority})"


class NutritionCapRule(models.Model):
    """
    Правила ограничений MER/RER по контекстам (BCS, критические состояния, рост и т.п.).
    """

    SCOPE_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
        ('both', 'Оба'),
    ]

    context_key = models.CharField(
        max_length=50,
        verbose_name='Контекст',
        help_text='Например: weight_loss_obesity_2_3, growth, lactation, critical'
    )
    min_mer_rer = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(0.1)],
        verbose_name='Мин. MER/RER'
    )
    max_mer_rer = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(0.1)],
        verbose_name='Макс. MER/RER'
    )
    scope = models.CharField(
        max_length=10,
        choices=SCOPE_CHOICES,
        default='both',
        verbose_name='Вид'
    )
    notes = models.TextField(blank=True, verbose_name='Заметки')
    is_active = models.BooleanField(default=True, verbose_name='Активно')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Кап MER/RER'
        verbose_name_plural = 'Капы MER/RER'
        db_table = 'nutrition_cap_rules'
        ordering = ['context_key']
        indexes = [
            models.Index(fields=['scope', 'context_key']),
        ]

    def __str__(self):
        return f"{self.context_key} [{self.min_mer_rer}-{self.max_mer_rer}]"


class MacroTargetRule(models.Model):
    """
    Целевые диапазоны БЖУ по контекстам (вид, возраст, здоровье, репродукция, активность).
    Приоритет определяет, какое правило применяется при конфликте.
    """

    SCOPE_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
        ('both', 'Оба'),
    ]

    CONTEXT_TYPE_CHOICES = [
        ('disease', 'Заболевание'),
        ('reproductive', 'Репродукция'),
        ('growth', 'Рост'),
        ('age', 'Возраст'),
        ('activity', 'Активность'),
        ('bcs', 'BCS/Вес'),
        ('baseline', 'Базовый'),
    ]

    context_key = models.CharField(
        max_length=80,
        verbose_name='Контекст',
        help_text='Например: ckd_early, lactation, growth_early, senior, high_activity, baseline'
    )
    context_type = models.CharField(
        max_length=20,
        choices=CONTEXT_TYPE_CHOICES,
        default='baseline',
        db_index=True,
        verbose_name='Тип контекста'
    )
    priority = models.PositiveSmallIntegerField(
        default=10,
        verbose_name='Приоритет',
        help_text='0=highest (disease), 10=baseline'
    )
    scope = models.CharField(
        max_length=10,
        choices=SCOPE_CHOICES,
        default='both',
        verbose_name='Вид'
    )

    # Диапазоны БЖУ (% DM — dry matter basis)
    protein_min = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
        verbose_name='Белок мин (%)'
    )
    protein_max = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
        verbose_name='Белок макс (%)'
    )
    fat_min = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
        verbose_name='Жир мин (%)'
    )
    fat_max = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
        verbose_name='Жир макс (%)'
    )
    fiber_min = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
        verbose_name='Клетчатка мин (%)'
    )
    fiber_max = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
        verbose_name='Клетчатка макс (%)'
    )

    # Возрастные границы (опционально)
    age_from_months = models.PositiveIntegerField(null=True, blank=True, verbose_name='Возраст от (мес)')
    age_to_months = models.PositiveIntegerField(null=True, blank=True, verbose_name='Возраст до (мес)')

    # Связь с заболеванием (опционально)
    disease_code = models.CharField(max_length=50, blank=True, verbose_name='Код заболевания')

    notes = models.TextField(blank=True, verbose_name='Заметки/Источник')
    is_active = models.BooleanField(default=True, verbose_name='Активно')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Правило БЖУ'
        verbose_name_plural = 'Правила БЖУ'
        db_table = 'macro_target_rules'
        ordering = ['priority', 'context_type', 'context_key']
        indexes = [
            models.Index(fields=['scope', 'context_type']),
            models.Index(fields=['priority']),
        ]

    def __str__(self):
        return f"{self.context_key} (prio={self.priority}): P{self.protein_min}-{self.protein_max} F{self.fat_min}-{self.fat_max}"


class SupplementRule(models.Model):
    """
    Правила приоритетного подбора витаминов и добавок по контексту питомца.
    """

    SCOPE_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
        ('both', 'Оба'),
    ]

    CONTEXT_TYPE_CHOICES = [
        ('growth', 'Рост'),
        ('age', 'Возраст'),
        ('reproductive', 'Репродукция'),
        ('disease', 'Заболевание'),
        ('activity', 'Активность'),
        ('breed_risk', 'Породный риск'),
        ('baseline', 'Базовый'),
    ]

    context_key = models.CharField(
        max_length=50,
        verbose_name='Контекст',
        help_text='Например: growth_puppy_early, senior_dog, lactation, arthritis'
    )
    context_type = models.CharField(
        max_length=20,
        choices=CONTEXT_TYPE_CHOICES,
        default='baseline',
        db_index=True,
        verbose_name='Тип контекста'
    )
    priority = models.PositiveSmallIntegerField(
        default=5,
        verbose_name='Приоритет',
        help_text='0=highest (критически важно), 10=baseline'
    )
    scope = models.CharField(
        max_length=10,
        choices=SCOPE_CHOICES,
        default='both',
        verbose_name='Вид'
    )

    supplement_type = models.CharField(
        max_length=30,
        verbose_name='Тип добавки',
        help_text='calcium, omega3, joint, vitamins, probiotics, taurine, senior и др.'
    )
    reason_ru = models.TextField(
        verbose_name='Причина рекомендации',
        help_text='Текст для UI: "Для роста костей и зубов"'
    )

    dosage_factor = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=1.0,
        verbose_name='Множитель дозы',
        help_text='Множитель к стандартной дозе (1.0 = норма, 1.5 = повышенная)'
    )

    # Возрастные границы
    age_from_months = models.PositiveIntegerField(null=True, blank=True, verbose_name='Возраст от (мес)')
    age_to_months = models.PositiveIntegerField(null=True, blank=True, verbose_name='Возраст до (мес)')

    # Связь с заболеванием (опционально)
    disease_code = models.CharField(max_length=50, blank=True, verbose_name='Код заболевания')

    # Связь с размером (для крупных пород)
    size_category = models.CharField(max_length=20, blank=True, verbose_name='Размер (large, giant и т.д.)')

    notes = models.TextField(blank=True, verbose_name='Заметки')
    is_active = models.BooleanField(default=True, verbose_name='Активно')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Правило добавки'
        verbose_name_plural = 'Правила добавок'
        db_table = 'supplement_rules'
        ordering = ['priority', 'context_type', 'supplement_type']
        indexes = [
            models.Index(fields=['scope', 'context_type']),
            models.Index(fields=['priority']),
            models.Index(fields=['supplement_type']),
        ]

    def __str__(self):
        return f"{self.context_key}: {self.supplement_type} (prio={self.priority})"


class HealthCondition(models.Model):
    """
    Справочник заболеваний с коэффициентами для расчёта калорийности.
    
    Данные загружаются из health_conditions.json
    """
    
    SPECIES_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
        ('both', 'Оба'),
    ]
    
    CATEGORY_CHOICES = [
        ('metabolic', 'Метаболические'),
        ('endocrine', 'Эндокринные'),
        ('renal', 'Почечные'),
        ('hepatic', 'Печёночные'),
        ('gastrointestinal', 'ЖКТ'),
        ('cardiovascular', 'Сердечно-сосудистые'),
        ('musculoskeletal', 'Опорно-двигательные'),
        ('immune', 'Иммунные'),
        ('oncology', 'Онкология'),
        ('urinary', 'Мочевыводящие'),
        ('dental', 'Стоматологические'),
        ('recovery', 'Восстановление'),
        ('other', 'Другое'),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Низкий'),
        ('MEDIUM', 'Средний'),
        ('HIGH', 'Высокий'),
        ('CRITICAL', 'Критический'),
    ]
    
    DIRECTION_CHOICES = [
        ('INCREASE', 'Увеличение калорий'),
        ('DECREASE', 'Уменьшение калорий'),
        ('NEUTRAL', 'Без изменений'),
    ]
    
    code = models.CharField(
        max_length=50, 
        primary_key=True,
        verbose_name='Код заболевания',
        help_text='Уникальный код, например: obesity_1, diabetes, ckd_1_2'
    )
    name_ru = models.CharField(max_length=200, verbose_name='Название (рус)')
    name_en = models.CharField(max_length=200, blank=True, verbose_name='Название (англ)')
    species = models.CharField(
        max_length=10, 
        choices=SPECIES_CHOICES, 
        default='both',
        verbose_name='Вид животного'
    )
    category = models.CharField(
        max_length=30, 
        choices=CATEGORY_CHOICES,
        db_index=True,
        verbose_name='Категория'
    )
    
    # Коэффициенты для калькулятора
    coefficient_min = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        default=1.0,
        validators=[MinValueValidator(0.1), MaxValueValidator(3.0)],
        verbose_name='Мин. коэффициент'
    )
    coefficient_max = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        default=1.0,
        validators=[MinValueValidator(0.1), MaxValueValidator(3.0)],
        verbose_name='Макс. коэффициент'
    )
    priority = models.CharField(
        max_length=10, 
        choices=PRIORITY_CHOICES,
        default='MEDIUM',
        verbose_name='Приоритет'
    )
    direction = models.CharField(
        max_length=10, 
        choices=DIRECTION_CHOICES,
        default='NEUTRAL',
        verbose_name='Направление изменения'
    )
    
    # Дополнительные данные
    symptoms = models.JSONField(default=list, blank=True, verbose_name='Симптомы')
    dietary_recommendations = models.JSONField(
        default=dict, 
        blank=True,
        verbose_name='Рекомендации по питанию'
    )
    contraindicated_ingredients = models.JSONField(
        default=list, 
        blank=True,
        verbose_name='Противопоказанные ингредиенты'
    )
    
    # BCS диапазон (для ожирения/недобора)
    bcs_range_min = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name='BCS мин')
    bcs_range_max = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name='BCS макс')
    
    source = models.CharField(max_length=100, blank=True, verbose_name='Источник')
    clinical_notes = models.TextField(blank=True, verbose_name='Клинические заметки')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Заболевание'
        verbose_name_plural = 'Заболевания'
        db_table = 'health_conditions'
        ordering = ['category', 'name_ru']
    
    def __str__(self):
        return f"{self.name_ru} ({self.code})"
    
    @property
    def coefficient(self):
        """Средний коэффициент."""
        return (float(self.coefficient_min) + float(self.coefficient_max)) / 2


class Allergy(models.Model):
    """
    Справочник аллергий.
    
    Данные загружаются из allergies.json
    """
    
    SPECIES_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
        ('both', 'Оба'),
    ]
    
    ALLERGEN_TYPE_CHOICES = [
        ('Environmental', 'Окружающая среда'),
        ('Food', 'Пищевая'),
        ('Flea', 'Блохи'),
        ('Contact', 'Контактная'),
        ('Drug', 'Лекарственная'),
        ('Seasonal', 'Сезонная'),
    ]
    
    PREVALENCE_CHOICES = [
        ('Rare', 'Редкая'),
        ('Uncommon', 'Нечастая'),
        ('Common', 'Частая'),
        ('Very Common', 'Очень частая'),
    ]
    
    code = models.CharField(
        max_length=50, 
        primary_key=True,
        verbose_name='Код аллергии',
        help_text='Уникальный код, например: dog_beef_protein, chicken_protein'
    )
    animal_type = models.CharField(
        max_length=10, 
        choices=SPECIES_CHOICES,
        verbose_name='Вид животного'
    )
    allergen_type = models.CharField(
        max_length=20, 
        choices=ALLERGEN_TYPE_CHOICES,
        db_index=True,
        verbose_name='Тип аллергена'
    )
    specific_allergen = models.CharField(max_length=200, verbose_name='Аллерген')
    display_name = models.CharField(max_length=200, verbose_name='Отображаемое название')
    prevalence_rate = models.CharField(
        max_length=20, 
        choices=PREVALENCE_CHOICES,
        default='Common',
        verbose_name='Распространённость'
    )
    
    typical_symptoms = models.TextField(blank=True, verbose_name='Типичные симптомы')
    diagnostic_approach = models.TextField(blank=True, verbose_name='Диагностика')
    management_strategies = models.TextField(blank=True, verbose_name='Управление')
    seasonal_pattern = models.CharField(max_length=100, blank=True, null=True, verbose_name='Сезонность')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Аллергия'
        verbose_name_plural = 'Аллергии'
        db_table = 'allergies'
        ordering = ['allergen_type', 'display_name']
    
    def __str__(self):
        return f"{self.display_name} ({self.code})"


class PetHealthCondition(models.Model):
    """
    Связь питомца с заболеваниями (M2M).
    """
    
    SEVERITY_CHOICES = [
        ('mild', 'Лёгкая'),
        ('moderate', 'Умеренная'),
        ('severe', 'Тяжёлая'),
    ]
    
    pet = models.ForeignKey(
        'pets.Pet',
        on_delete=models.CASCADE,
        related_name='pet_health_conditions',
        verbose_name='Питомец'
    )
    condition = models.ForeignKey(
        HealthCondition,
        on_delete=models.CASCADE,
        related_name='pet_conditions',
        verbose_name='Заболевание'
    )
    
    # Породный риск или диагноз
    is_breed_risk = models.BooleanField(
        default=False, 
        verbose_name='Породный риск',
        help_text='Автоматически добавлено из базы знаний пород'
    )
    breed_risk_level = models.CharField(
        max_length=20, 
        blank=True,
        verbose_name='Уровень породного риска'
    )
    
    # Данные диагноза
    diagnosis_date = models.DateField(null=True, blank=True, verbose_name='Дата диагноза')
    severity = models.CharField(
        max_length=20, 
        choices=SEVERITY_CHOICES,
        blank=True,
        verbose_name='Тяжесть'
    )
    is_active = models.BooleanField(default=True, verbose_name='Активно')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Заболевание питомца'
        verbose_name_plural = 'Заболевания питомцев'
        db_table = 'pet_health_conditions'
        unique_together = ['pet', 'condition']
        ordering = ['-is_active', '-created_at']
    
    def __str__(self):
        return f"{self.pet.name}: {self.condition.name_ru}"


class PetAllergy(models.Model):
    """
    Связь питомца с аллергиями (M2M).
    """
    
    SEVERITY_CHOICES = [
        ('mild', 'Лёгкая'),
        ('moderate', 'Умеренная'),
        ('severe', 'Тяжёлая'),
    ]
    
    pet = models.ForeignKey(
        'pets.Pet',
        on_delete=models.CASCADE,
        related_name='pet_allergies',
        verbose_name='Питомец'
    )
    allergy = models.ForeignKey(
        Allergy,
        on_delete=models.CASCADE,
        related_name='pet_allergies',
        verbose_name='Аллергия'
    )
    
    # Породный риск или диагноз
    is_breed_risk = models.BooleanField(
        default=False, 
        verbose_name='Породный риск',
        help_text='Автоматически добавлено из базы знаний пород'
    )
    
    diagnosis_date = models.DateField(null=True, blank=True, verbose_name='Дата выявления')
    severity = models.CharField(
        max_length=20, 
        choices=SEVERITY_CHOICES,
        blank=True,
        verbose_name='Тяжесть'
    )
    is_active = models.BooleanField(default=True, verbose_name='Активна')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Аллергия питомца'
        verbose_name_plural = 'Аллергии питомцев'
        db_table = 'pet_allergies'
        unique_together = ['pet', 'allergy']
        ordering = ['-is_active', '-created_at']
    
    def __str__(self):
        return f"{self.pet.name}: {self.allergy.display_name}"


class PetFoodExclusion(models.Model):
    """
    Исключения продуктов/ингредиентов для питомца (M2M).
    
    Используется для подбора корма - исключаем корма с этими ингредиентами.
    """
    
    REASON_CHOICES = [
        ('allergy', 'Аллергия'),
        ('intolerance', 'Непереносимость'),
        ('preference', 'Предпочтение владельца'),
        ('medical', 'Медицинские показания'),
        ('other', 'Другое'),
    ]
    
    pet = models.ForeignKey(
        'pets.Pet',
        on_delete=models.CASCADE,
        related_name='food_exclusions',
        verbose_name='Питомец'
    )
    
    ingredient_code = models.CharField(
        max_length=50,
        verbose_name='Код ингредиента',
        help_text='Код из справочника: chicken_protein, wheat_protein и т.д.'
    )
    ingredient_name = models.CharField(
        max_length=200, 
        verbose_name='Название ингредиента'
    )
    
    reason = models.CharField(
        max_length=20, 
        choices=REASON_CHOICES,
        default='allergy',
        verbose_name='Причина исключения'
    )
    
    # Связь с аллергией (если причина - аллергия)
    related_allergy = models.ForeignKey(
        Allergy,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='food_exclusions',
        verbose_name='Связанная аллергия'
    )
    
    notes = models.TextField(blank=True, verbose_name='Примечания')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Исключение продукта'
        verbose_name_plural = 'Исключения продуктов'
        db_table = 'pet_food_exclusions'
        unique_together = ['pet', 'ingredient_code']
        ordering = ['ingredient_name']
    
    def __str__(self):
        return f"{self.pet.name}: исключён {self.ingredient_name}"
