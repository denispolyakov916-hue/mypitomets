"""
Модели базы знаний о породах собак и кошек.

Содержит:
- Breed - основная информация о породе
- BreedHealth - генетические риски здоровья
- BreedNutrition - рекомендации по питанию
- BreedCare - рекомендации по уходу
"""

from django.db import models


class Breed(models.Model):
    """
    Справочник пород собак и кошек.
    
    Содержит стандартные характеристики породы для:
    - Сравнения параметров питомца с эталоном
    - Персонализированных рекомендаций
    - Подбора корма и товаров
    """
    
    SPECIES_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
    ]
    
    SIZE_CHOICES = [
        ('tiny', 'Миниатюрный'),
        ('small', 'Маленький'),
        ('medium', 'Средний'),
        ('large', 'Крупный'),
        ('giant', 'Гигантский'),
    ]
    
    ENERGY_CHOICES = [
        ('very_low', 'Очень низкая'),
        ('low', 'Низкая'),
        ('medium', 'Средняя'),
        ('high', 'Высокая'),
        ('very_high', 'Очень высокая'),
    ]
    
    LEVEL_CHOICES = [
        ('very_low', 'Очень низкий'),
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('very_high', 'Очень высокий'),
    ]
    
    COAT_CHOICES = [
        ('hairless', 'Бесшёрстная'),
        ('short', 'Короткая'),
        ('medium', 'Средняя'),
        ('long', 'Длинная'),
        ('wire', 'Жесткая'),
        ('curly', 'Кудрявая'),
        ('double', 'Двойная'),
    ]
    
    GROOMING_CHOICES = [
        ('minimal', 'Минимальный'),
        ('weekly', 'Еженедельный'),
        ('regular', 'Регулярный'),
        ('daily', 'Ежедневный'),
        ('professional', 'Профессиональный'),
    ]
    
    # Основная информация
    species = models.CharField(max_length=10, choices=SPECIES_CHOICES, verbose_name='Вид')
    name = models.CharField(max_length=100, verbose_name='Название породы')
    name_en = models.CharField(max_length=100, blank=True, verbose_name='Название (англ)')
    slug = models.SlugField(max_length=100, unique=True, verbose_name='URL-имя')
    
    # Описания
    description = models.TextField(blank=True, verbose_name='Описание породы')
    short_description = models.CharField(max_length=300, blank=True, verbose_name='Краткое описание')
    origin_country = models.CharField(max_length=100, blank=True, verbose_name='Страна происхождения')
    
    # Физические характеристики
    size_category = models.CharField(max_length=20, choices=SIZE_CHOICES, verbose_name='Размер')
    weight_min = models.DecimalField(max_digits=5, decimal_places=1, verbose_name='Мин. вес (кг)')
    weight_max = models.DecimalField(max_digits=5, decimal_places=1, verbose_name='Макс. вес (кг)')
    height_min = models.PositiveIntegerField(null=True, blank=True, verbose_name='Мин. рост (см)')
    height_max = models.PositiveIntegerField(null=True, blank=True, verbose_name='Макс. рост (см)')
    lifespan_min = models.PositiveIntegerField(verbose_name='Мин. продолжительность жизни')
    lifespan_max = models.PositiveIntegerField(verbose_name='Макс. продолжительность жизни')
    
    # Характер и поведение
    energy_level = models.CharField(max_length=20, choices=ENERGY_CHOICES, verbose_name='Энергичность')
    trainability = models.CharField(max_length=20, choices=LEVEL_CHOICES, verbose_name='Обучаемость')
    intelligence = models.CharField(max_length=20, choices=LEVEL_CHOICES, verbose_name='Интеллект')
    
    # Социальные характеристики
    friendliness_to_children = models.CharField(max_length=20, choices=LEVEL_CHOICES, verbose_name='Отношение к детям')
    friendliness_to_pets = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='medium', verbose_name='Отношение к другим животным')
    friendliness_to_strangers = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='medium', verbose_name='Отношение к незнакомцам')
    
    # Уход
    grooming_frequency = models.CharField(max_length=20, choices=GROOMING_CHOICES, verbose_name='Частота груминга')
    shedding_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, verbose_name='Линька')
    coat_type = models.CharField(max_length=20, choices=COAT_CHOICES, verbose_name='Тип шерсти')
    
    # Здоровье
    health_risk_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, verbose_name='Уровень риска здоровья')
    hypoallergenic = models.BooleanField(default=False, verbose_name='Гипоаллергенная')
    brachycephalic = models.BooleanField(default=False, verbose_name='Брахицефал')
    
    # Условия содержания
    apartment_friendly = models.BooleanField(default=True, verbose_name='Подходит для квартиры')
    good_for_novice = models.BooleanField(default=True, verbose_name='Подходит новичкам')
    exercise_needs = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='medium', verbose_name='Потребность в нагрузках')
    
    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Порода'
        verbose_name_plural = 'Породы'
        db_table = 'breeds'
        ordering = ['species', 'name']
        indexes = [
            models.Index(fields=['species', 'name']),
            models.Index(fields=['slug']),
            models.Index(fields=['size_category']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_species_display()})"
    
    def to_dict(self):
        return {
            'id': self.id,
            'species': self.species,
            'name': self.name,
            'name_en': self.name_en,
            'slug': self.slug,
            'description': self.description,
            'short_description': self.short_description,
            'origin_country': self.origin_country,
            'size_category': self.size_category,
            'weight_min': float(self.weight_min),
            'weight_max': float(self.weight_max),
            'height_min': self.height_min,
            'height_max': self.height_max,
            'lifespan_min': self.lifespan_min,
            'lifespan_max': self.lifespan_max,
            'energy_level': self.energy_level,
            'trainability': self.trainability,
            'intelligence': self.intelligence,
            'friendliness_to_children': self.friendliness_to_children,
            'friendliness_to_pets': self.friendliness_to_pets,
            'friendliness_to_strangers': self.friendliness_to_strangers,
            'grooming_frequency': self.grooming_frequency,
            'shedding_level': self.shedding_level,
            'coat_type': self.coat_type,
            'health_risk_level': self.health_risk_level,
            'hypoallergenic': self.hypoallergenic,
            'brachycephalic': self.brachycephalic,
            'apartment_friendly': self.apartment_friendly,
            'good_for_novice': self.good_for_novice,
            'exercise_needs': self.exercise_needs,
        }
    
    @property
    def ideal_weight(self):
        """Возвращает идеальный диапазон веса."""
        return (float(self.weight_min), float(self.weight_max))
    
    @property
    def average_lifespan(self):
        """Средняя продолжительность жизни."""
        return (self.lifespan_min + self.lifespan_max) / 2


class BreedHealth(models.Model):
    """
    Генетические риски здоровья породы.
    """
    
    SEVERITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('critical', 'Критический'),
    ]
    
    breed = models.ForeignKey(Breed, on_delete=models.CASCADE, related_name='health_risks')
    condition_name = models.CharField(max_length=200, verbose_name='Название заболевания')
    condition_name_en = models.CharField(max_length=200, blank=True)
    
    description = models.TextField(blank=True, verbose_name='Описание')
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, verbose_name='Тяжесть')
    prevalence_percent = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='Распространённость %')
    
    symptoms = models.JSONField(default=list, blank=True, verbose_name='Симптомы')
    prevention = models.TextField(blank=True, verbose_name='Профилактика')
    treatment = models.TextField(blank=True, verbose_name='Лечение')
    
    affected_system = models.CharField(max_length=100, blank=True, verbose_name='Поражаемая система')
    age_of_onset = models.CharField(max_length=50, blank=True, verbose_name='Возраст проявления')
    screening_recommended = models.BooleanField(default=False, verbose_name='Рекомендован скрининг')
    
    class Meta:
        verbose_name = 'Риск здоровья породы'
        verbose_name_plural = 'Риски здоровья пород'
        db_table = 'breed_health_risks'
        ordering = ['-prevalence_percent']
    
    def __str__(self):
        return f"{self.breed.name}: {self.condition_name}"
    
    def to_dict(self):
        return {
            'id': self.id,
            'condition_name': self.condition_name,
            'description': self.description,
            'severity': self.severity,
            'prevalence_percent': float(self.prevalence_percent),
            'symptoms': self.symptoms,
            'prevention': self.prevention,
            'treatment': self.treatment,
            'affected_system': self.affected_system,
            'age_of_onset': self.age_of_onset,
            'screening_recommended': self.screening_recommended,
        }


class BreedNutrition(models.Model):
    """
    Рекомендации по питанию для породы.
    """
    
    breed = models.ForeignKey(Breed, on_delete=models.CASCADE, related_name='nutrition_recommendations')
    
    # Калории
    calories_per_kg_puppy = models.PositiveIntegerField(null=True, blank=True, verbose_name='Ккал/кг (щенок/котёнок)')
    calories_per_kg_adult = models.PositiveIntegerField(verbose_name='Ккал/кг (взрослый)')
    calories_per_kg_senior = models.PositiveIntegerField(null=True, blank=True, verbose_name='Ккал/кг (пожилой)')
    
    # Макронутриенты
    protein_min_percent = models.PositiveIntegerField(default=25, verbose_name='Мин. белок %')
    protein_max_percent = models.PositiveIntegerField(default=35, verbose_name='Макс. белок %')
    fat_min_percent = models.PositiveIntegerField(default=10, verbose_name='Мин. жиры %')
    fat_max_percent = models.PositiveIntegerField(default=20, verbose_name='Макс. жиры %')
    
    # Рекомендации
    recommended_ingredients = models.JSONField(default=list, blank=True, verbose_name='Рекомендуемые ингредиенты')
    avoid_ingredients = models.JSONField(default=list, blank=True, verbose_name='Избегать ингредиенты')
    
    feeding_notes = models.TextField(blank=True, verbose_name='Примечания по кормлению')
    supplements = models.JSONField(default=list, blank=True, verbose_name='Рекомендуемые добавки')
    
    class Meta:
        verbose_name = 'Питание породы'
        verbose_name_plural = 'Питание пород'
        db_table = 'breed_nutrition'
    
    def __str__(self):
        return f"Питание: {self.breed.name}"
    
    def to_dict(self):
        return {
            'id': self.id,
            'calories_per_kg_puppy': self.calories_per_kg_puppy,
            'calories_per_kg_adult': self.calories_per_kg_adult,
            'calories_per_kg_senior': self.calories_per_kg_senior,
            'protein_min_percent': self.protein_min_percent,
            'protein_max_percent': self.protein_max_percent,
            'fat_min_percent': self.fat_min_percent,
            'fat_max_percent': self.fat_max_percent,
            'recommended_ingredients': self.recommended_ingredients,
            'avoid_ingredients': self.avoid_ingredients,
            'feeding_notes': self.feeding_notes,
            'supplements': self.supplements,
        }


class BreedCare(models.Model):
    """
    Рекомендации по уходу за породой.
    """
    
    FREQUENCY_CHOICES = [
        ('daily', 'Ежедневно'),
        ('weekly', 'Еженедельно'),
        ('biweekly', 'Раз в 2 недели'),
        ('monthly', 'Ежемесячно'),
        ('quarterly', 'Раз в квартал'),
        ('yearly', 'Ежегодно'),
        ('as_needed', 'По необходимости'),
    ]
    
    breed = models.ForeignKey(Breed, on_delete=models.CASCADE, related_name='care_procedures')
    
    procedure_name = models.CharField(max_length=100, verbose_name='Процедура')
    category = models.CharField(max_length=50, verbose_name='Категория')  # grooming, dental, exercise, vet
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, verbose_name='Частота')
    
    description = models.TextField(blank=True, verbose_name='Описание')
    tips = models.TextField(blank=True, verbose_name='Советы')
    duration_minutes = models.PositiveIntegerField(null=True, blank=True, verbose_name='Длительность (мин)')
    
    importance = models.CharField(max_length=20, choices=[
        ('optional', 'Опционально'),
        ('recommended', 'Рекомендуется'),
        ('required', 'Обязательно'),
    ], default='recommended', verbose_name='Важность')
    
    class Meta:
        verbose_name = 'Уход за породой'
        verbose_name_plural = 'Уход за породами'
        db_table = 'breed_care'
        ordering = ['breed', 'category', 'procedure_name']
    
    def __str__(self):
        return f"{self.breed.name}: {self.procedure_name}"
    
    def to_dict(self):
        return {
            'id': self.id,
            'procedure_name': self.procedure_name,
            'category': self.category,
            'frequency': self.frequency,
            'description': self.description,
            'tips': self.tips,
            'duration_minutes': self.duration_minutes,
            'importance': self.importance,
        }


