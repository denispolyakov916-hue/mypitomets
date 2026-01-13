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
    description = models.TextField(blank=True, null=True, verbose_name='Описание породы')
    short_description = models.TextField(blank=True, null=True, verbose_name='Краткое описание')
    
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
    independence = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='medium', verbose_name='Независимость')
    
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
            'independence': self.independence,
            'grooming_frequency': self.grooming_frequency,
            'shedding_level': self.shedding_level,
            'coat_type': self.coat_type,
            'health_risk_level': self.health_risk_level,
            'hypoallergenic': self.hypoallergenic,
            'brachycephalic': self.brachycephalic,
            'apartment_friendly': self.apartment_friendly,
            'good_for_novice': self.good_for_novice,
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
    Соответствует схеме migration 0009.
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
    
    AFFECTED_SYSTEM_CHOICES = [
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
    
    breed = models.ForeignKey(Breed, on_delete=models.CASCADE, related_name='health_risks', verbose_name='Порода')
    condition_name = models.CharField(max_length=200, verbose_name='Название заболевания')
    condition_type = models.CharField(max_length=20, choices=CONDITION_TYPE_CHOICES, default='genetic')
    affected_system = models.CharField(max_length=50, choices=AFFECTED_SYSTEM_CHOICES, db_index=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, db_index=True, verbose_name='Тяжесть')
    prevalence_percent = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='Распространённость %')
    age_of_onset = models.CharField(max_length=50, blank=True, verbose_name='Возраст проявления')
    prevention = models.TextField(verbose_name='Профилактика')
    screening = models.TextField(verbose_name='Рекомендуемые обследования')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Риск здоровья породы'
        verbose_name_plural = 'Риски здоровья пород'
        db_table = 'breed_health'
        ordering = ['breed', '-severity', '-prevalence_percent']
    
    def __str__(self):
        return f"{self.breed.name}: {self.condition_name}"
    
    def to_dict(self):
        return {
            'id': self.id,
            'condition_name': self.condition_name,
            'condition_type': self.condition_type,
            'affected_system': self.affected_system,
            'severity': self.severity,
            'prevalence_percent': float(self.prevalence_percent),
            'age_of_onset': self.age_of_onset,
            'prevention': self.prevention,
            'screening': self.screening,
        }


class BreedNutrition(models.Model):
    """
    Рекомендации по питанию для породы.
    Соответствует схеме migration 0009.
    """
    
    LEVEL_CHOICES = [
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
        primary_key=True,
        related_name='nutrition', 
        verbose_name='Порода'
    )
    protein_need = models.CharField(max_length=20, choices=LEVEL_CHOICES, verbose_name='Потребность в белке')
    calorie_density = models.CharField(max_length=20, choices=CALORIE_CHOICES, verbose_name='Калорийность')
    diet_type = models.CharField(max_length=20, choices=DIET_TYPE_CHOICES, verbose_name='Тип питания')
    feeding_frequency = models.CharField(max_length=50, verbose_name='Частота кормлений')
    special_considerations = models.TextField(blank=True, verbose_name='Особые рекомендации')
    common_allergens = models.JSONField(default=list, blank=True, verbose_name='Аллергены')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Питание породы'
        verbose_name_plural = 'Рекомендации по питанию'
        db_table = 'breed_nutrition'
    
    def __str__(self):
        return f"Питание: {self.breed.name}"
    
    def to_dict(self):
        return {
            'breed_id': self.breed_id,
            'protein_need': self.protein_need,
            'calorie_density': self.calorie_density,
            'diet_type': self.diet_type,
            'feeding_frequency': self.feeding_frequency,
            'special_considerations': self.special_considerations,
            'common_allergens': self.common_allergens,
        }


class BreedCare(models.Model):
    """
    Рекомендации по уходу за породой.
    Соответствует схеме migration 0009.
    """
    
    CARE_CATEGORY_CHOICES = [
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
    
    breed = models.ForeignKey(Breed, on_delete=models.CASCADE, related_name='care_procedures', verbose_name='Порода')
    care_category = models.CharField(max_length=20, choices=CARE_CATEGORY_CHOICES, db_index=True, verbose_name='Категория')
    procedure = models.CharField(max_length=200, verbose_name='Процедура')
    frequency = models.CharField(max_length=50, verbose_name='Частота')
    importance = models.CharField(max_length=20, choices=IMPORTANCE_CHOICES, db_index=True, verbose_name='Важность')
    season = models.CharField(max_length=20, choices=SEASON_CHOICES, default='all', verbose_name='Сезон')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Процедура ухода за породой'
        verbose_name_plural = 'Процедуры ухода за породами'
        db_table = 'breed_care'
        ordering = ['breed', '-importance', 'care_category']
    
    def __str__(self):
        return f"{self.breed.name}: {self.procedure}"
    
    def to_dict(self):
        return {
            'id': self.id,
            'care_category': self.care_category,
            'procedure': self.procedure,
            'frequency': self.frequency,
            'importance': self.importance,
            'season': self.season,
            'notes': self.notes,
        }


